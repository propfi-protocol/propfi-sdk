import {
  Account,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  scValToNative,
  type xdr,
} from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { Transaction } from '@stellar/stellar-sdk';
import { SimulationError, TransactionError, ContractError } from '../errors';
import { parseContractEvents, type ParsedEvent } from '../utils/events';

/** Minimal interface for transaction status response */
interface TxStatusResponse {
  status: string;
  hash: string;
  errorResult?: xdr.TransactionResult;
  events?: xdr.DiagnosticEvent[];
}

/** Interface for diagnostic event that can be parsed */
interface DiagnosticEventLike {
  topics(): xdr.ScVal[];
  data(): xdr.ScVal;
}

/**
 * Interface for transaction signers.
 */
export interface SorobanSigner {
  /**
   * Sign a transaction XDR.
   * @param txXdr - Transaction XDR to sign
   * @returns Signed transaction XDR
   */
  signTransaction(txXdr: string): Promise<string>;

  /**
   * Get the public key of the signer.
   * @returns Public key (Stellar address)
   */
  getPublicKey(): Promise<string>;
}

/**
 * Result of a transaction execution with parsed events.
 */
export interface TransactionResult {
  /** Transaction hash */
  hash: string;
  /** Parsed events from the transaction */
  events: ParsedEvent[];
  /** Raw transaction response */
  response: SorobanRpc.Api.SendTransactionResponse;
}

/**
 * Base client for interacting with Soroban smart contracts.
 */
export class SorobanClient {
  /** Soroban RPC server instance */
  protected server: SorobanRpc.Server;
  /** Contract instance */
  protected contract: Contract;
  /** Network passphrase */
  protected networkPassphrase: string;
  /** Dummy address for view simulations */
  private static readonly DUMMY_ADDRESS = 'GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4';

  /**
   * Create a new SorobanClient.
   * @param rpcUrl - RPC endpoint URL
   * @param contractId - Contract ID to interact with
   * @param networkPassphrase - Network passphrase (default: PUBLIC)
   */
  constructor(rpcUrl: string, contractId: string, networkPassphrase?: string) {
    this.server = new SorobanRpc.Server(rpcUrl);
    this.contract = new Contract(contractId);
    this.networkPassphrase = networkPassphrase ?? Networks.PUBLIC;
  }

  /**
   * Simulate a view (read-only) contract call.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @returns Decoded simulation result
   * @throws SimulationError if simulation fails
   */
  async simulateView(method: string, params: xdr.ScVal[]): Promise<any> {
    const tx = new TransactionBuilder(new Account(SorobanClient.DUMMY_ADDRESS, '0'), {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(this.contract.call(method, ...params))
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new SimulationError(`Simulation error for ${method}: ${result.error}`);
    }

    if (!result.result) {
      throw new SimulationError(`No result from simulation for ${method}`);
    }

    return scValToNative(result.result.retval);
  }

  /**
   * Prepare a transaction for signing.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @param source - Source account address
   * @param options - Transaction options
   * @returns Prepared transaction
   * @throws ContractError if preparation fails
   */
  async prepareTransaction(
    method: string,
    params: xdr.ScVal[],
    source: string,
    options?: TxOptions
  ): Promise<Transaction> {
    try {
      const account = await this.server.getAccount(source);
      const tx = new TransactionBuilder(account, {
        fee: String(options?.fee ?? '100'),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(this.contract.call(method, ...params))
        .setTimeout(options?.timeoutInSeconds ?? 30)
        .build();

      return this.server.prepareTransaction(tx);
    } catch (error) {
      throw new ContractError(
        `Failed to prepare transaction for ${method}`,
        this.contract.contractId(),
        method,
        error as Error
      );
    }
  }

  /**
   * Prepare, sign, and send a transaction.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @param signer - Signer to sign the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   * @throws TransactionError if transaction fails
   * @throws SignerError if signing fails
   */
  async signAndSend(
    method: string,
    params: xdr.ScVal[],
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    const result = await this.signAndSendWithEvents(method, params, signer, options);
    return result.hash;
  }

  /**
   * Prepare, sign, and send a transaction with event parsing.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @param signer - Signer to sign the transaction
   * @param options - Transaction options
   * @returns Transaction result with hash and parsed events
   * @throws TransactionError if transaction fails
   * @throws SignerError if signing fails
   */
  async signAndSendWithEvents(
    method: string,
    params: xdr.ScVal[],
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<TransactionResult> {
    const source = await signer.getPublicKey();
    const prepared = await this.prepareTransaction(method, params, source, options);
    const txXdr = prepared.toXDR();

    let signedXdr: string;
    try {
      signedXdr = await signer.signTransaction(txXdr);
    } catch (error) {
      throw new TransactionError(
        `Failed to sign transaction for ${method}`,
        undefined,
        undefined,
        error as Error
      );
    }

    const signedTx = TransactionBuilder.fromXDR(signedXdr, this.networkPassphrase) as Transaction;
    const resp = await this.server.sendTransaction(signedTx);

    // SendTransactionResponse has status: 'PENDING' | 'ERROR'
    if (resp.status === 'ERROR') {
      throw new TransactionError(
        `Transaction failed for ${method}: ${resp.errorResult ? resp.errorResult.toXDR('base64') : 'unknown'}`,
        resp.hash,
        resp.errorResult ? resp.errorResult.toXDR('base64') : undefined
      );
    }

    // Wait for transaction to be confirmed and get events
    const txStatus = await this.waitForTransaction(resp.hash);

    if (txStatus.status === 'FAILED') {
      throw new TransactionError(
        `Transaction failed for ${method}: ${txStatus.errorResult ? txStatus.errorResult.toXDR('base64') : 'unknown'}`,
        txStatus.hash,
        txStatus.errorResult ? txStatus.errorResult.toXDR('base64') : undefined
      );
    }

    const events = parseContractEvents(this.toDiagnosticEventLike(txStatus.events ?? []));

    return {
      hash: resp.hash,
      events,
      response: resp,
    };
  }

  /**
   * Wait for a transaction to be confirmed and return its status.
   * @param hash - Transaction hash
   * @param maxRetries - Maximum number of polling retries (default: 30)
   * @param retryIntervalMs - Interval between retries in ms (default: 2000)
   * @returns Transaction status response
   * @throws TransactionError if transaction fails or times out
   */
  async waitForTransaction(
    hash: string,
    maxRetries = 30,
    retryIntervalMs = 2000
  ): Promise<TxStatusResponse> {
    for (let i = 0; i < maxRetries; i++) {
      const status = await this.server.getTransaction(hash);

      // Status can be: NOT_FOUND, SUCCESS, FAILED
      const statusStr = status.status;

      if (statusStr === 'SUCCESS') {
        const successStatus = status as SorobanRpc.Api.GetSuccessfulTransactionResponse;
        return {
          status: 'SUCCESS',
          hash,
          events: successStatus.diagnosticEventsXdr ?? [],
        };
      }

      if (statusStr === 'FAILED') {
        const failedStatus = status as SorobanRpc.Api.GetFailedTransactionResponse;
        return {
          status: 'FAILED',
          hash,
          errorResult: failedStatus.resultXdr as unknown as xdr.TransactionResult,
        };
      }

      if (statusStr !== 'NOT_FOUND') {
        return {
          status: statusStr,
          hash,
        };
      }

      await new Promise(resolve => setTimeout(resolve, retryIntervalMs));
    }

    throw new TransactionError(`Transaction confirmation timed out`, hash);
  }

  /**
   * Convert DiagnosticEvent array to DiagnosticEventLike array for parsing.
   * @param events - Diagnostic events
   * @returns DiagnosticEventLike array
   */
  private toDiagnosticEventLike(events: xdr.DiagnosticEvent[]): DiagnosticEventLike[] {
    return events.map(event => ({
      topics: () => (event as any).topics(),
      data: () => (event as any).data(),
    }));
  }

  /**
   * Find a specific event in the transaction events by topic.
   * @param events - Parsed events from transaction
   * @param topic - Event topic to search for
   * @returns Matching event or undefined
   */
  static findEvent(events: ParsedEvent[], topic: string): ParsedEvent | undefined {
    return events.find(event => event.topics[0] === topic);
  }

  /**
   * Find all events matching a topic.
   * @param events - Parsed events from transaction
   * @param topic - Event topic to search for
   * @returns Array of matching events
   */
  static findEvents(events: ParsedEvent[], topic: string): ParsedEvent[] {
    return events.filter(event => event.topics[0] === topic);
  }

  /**
   * Get the status of a transaction by hash.
   * @param hash - Transaction hash
   * @returns Transaction status response
   * @throws ContractError if lookup fails
   */
  async getTransactionStatus(hash: string): Promise<SorobanRpc.Api.GetTransactionResponse> {
    try {
      return this.server.getTransaction(hash);
    } catch (error) {
      throw new ContractError(
        `Failed to get transaction status for ${hash}`,
        this.contract.contractId(),
        'getTransaction',
        error as Error
      );
    }
  }
}
