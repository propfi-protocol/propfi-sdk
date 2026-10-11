import { NetworkError } from '../errors';
import { SorobanRpc } from '@stellar/stellar-sdk';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: ((error: Error) => boolean) | string[];
  onRetry?: (error: Error, attempt: number) => void;
}

export interface RetryResult<T> {
  success: boolean;
  value?: T;
  error?: Error;
  attempts: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'timeout',
    'network',
    'connection',
  ],
};

function isRetryableError(error: Error, retryableErrors: RetryOptions['retryableErrors']): boolean {
  if (Array.isArray(retryableErrors)) {
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(e => errorMessage.includes(e.toLowerCase()));
  }
  return retryableErrors(error);
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = Math.min(
    options.baseDelayMs * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelayMs
  );
  return delay + Math.random() * 100;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const value = await operation();
      return { success: true, value, attempts: attempt + 1 };
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxRetries) {
        break;
      }

      if (!isRetryableError(lastError, opts.retryableErrors)) {
        break;
      }

      if (opts.onRetry) {
        opts.onRetry(lastError, attempt + 1);
      }

      const delay = calculateDelay(attempt, opts);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: lastError, attempts: opts.maxRetries + 1 };
}

export function createRetryableClient<T extends object>(
  client: T,
  methodNames: (keyof T)[],
  retryOptions: Partial<RetryOptions> = {}
): T {
  const proxy = new Proxy(client, {
    get(target, prop) {
      const value = target[prop as keyof T];
      if (typeof value === 'function' && methodNames.includes(prop as keyof T)) {
        return async (...args: any[]) => {
          const result = await withRetry(() => value.apply(target, args), retryOptions);
          if (!result.success) {
            throw result.error;
          }
          return result.value;
        };
      }
      return value;
    },
  });
  return proxy;
}

export class RetryableRpcClient {
  private server: SorobanRpc.Server;
  private retryOptions: RetryOptions;

  constructor(rpcUrl: string, retryOptions: Partial<RetryOptions> = {}) {
    this.server = new SorobanRpc.Server(rpcUrl);
    this.retryOptions = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  }

  async getAccount(accountId: string) {
    return this.callWithRetry(() => this.server.getAccount(accountId), 'getAccount');
  }

  async simulateTransaction(tx: any) {
    return this.callWithRetry(() => this.server.simulateTransaction(tx), 'simulateTransaction');
  }

  async prepareTransaction(tx: any) {
    return this.callWithRetry(() => this.server.prepareTransaction(tx), 'prepareTransaction');
  }

  async sendTransaction(tx: any) {
    return this.callWithRetry(() => this.server.sendTransaction(tx), 'sendTransaction');
  }

  async getTransaction(hash: string) {
    return this.callWithRetry(() => this.server.getTransaction(hash), 'getTransaction');
  }

  private async callWithRetry<T>(operation: () => Promise<T>, methodName: string): Promise<T> {
    const result = await withRetry(operation, {
      ...this.retryOptions,
      onRetry: (error, attempt) => {
        console.warn(`Retry ${attempt} for ${methodName}: ${error.message}`);
      },
    });

    if (!result.success) {
      throw new NetworkError(
        `${methodName} failed after ${result.attempts} attempts: ${result.error?.message}`,
        'soroban-rpc'
      );
    }

    return result.value!;
  }
}
