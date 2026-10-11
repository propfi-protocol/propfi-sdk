import { TransactionBuilder, Networks, Contract, SorobanRpc } from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { Transaction, xdr } from '@stellar/stellar-sdk';
import { ContractError, SimulationError } from '../errors';

/**
 * Single operation in a batch transaction.
 */
export interface BatchOperation {
  /** Contract ID to call */
  contractId: string;
  /** Method name to call */
  method: string;
  /** Method parameters as XDR ScVal array */
  params: xdr.ScVal[];
}

/**
 * Configuration for batch transactions.
 */
export interface BatchConfig {
  /** Network passphrase (default: PUBLIC) */
  networkPassphrase?: string;
  /** Base fee in stroops (default: '100') */
  fee?: string;
  /** Transaction timeout in seconds (default: 30) */
  timeoutInSeconds?: number;
}

/**
 * Builder for creating batch transactions with multiple contract calls.
 */
export class BatchTransactionBuilder {
  private operations: BatchOperation[] = [];
  private config: Required<BatchConfig>;

  /**
   * Create a new BatchTransactionBuilder.
   * @param config - Batch configuration options
   */
  constructor(config: BatchConfig = {}) {
    this.config = {
      networkPassphrase: config.networkPassphrase ?? Networks.PUBLIC,
      fee: config.fee ?? '100',
      timeoutInSeconds: config.timeoutInSeconds ?? 30,
    };
  }

  /**
   * Add a single operation to the batch.
   * @param contractId - Contract ID to call
   * @param method - Method name to call
   * @param params - Method parameters
   * @returns This builder for chaining
   */
  addOperation(contractId: string, method: string, params: xdr.ScVal[]): this {
    this.operations.push({ contractId, method, params });
    return this;
  }

  /**
   * Add multiple operations to the batch.
   * @param operations - Array of operations to add
   * @returns This builder for chaining
   */
  addOperations(operations: BatchOperation[]): this {
    this.operations.push(...operations);
    return this;
  }

  /**
   * Clear all operations from the batch.
   * @returns This builder for chaining
   */
  clear(): this {
    this.operations = [];
    return this;
  }

  /**
   * Get all operations in the batch.
   * @returns Copy of the operations array
   */
  getOperations(): BatchOperation[] {
    return [...this.operations];
  }

  /**
   * Get the number of operations in the batch.
   * @returns Operation count
   */
  getOperationCount(): number {
    return this.operations.length;
  }

  /**
   * Build the batch transaction from a source account.
   * @param sourceAccount - Source account for the transaction
   * @returns Built transaction ready for signing
   * @throws ContractError if no operations have been added
   */
  build(sourceAccount: any): Transaction {
    if (this.operations.length === 0) {
      throw new ContractError('Cannot build batch transaction: no operations added', '', 'batch');
    }

    const tx = new TransactionBuilder(sourceAccount, {
      fee: this.config.fee!,
      networkPassphrase: this.config.networkPassphrase!,
    });

    for (const op of this.operations) {
      const params = op.params ?? [];
      tx.addOperation(new Contract(op.contractId).call(op.method, ...params));
    }

    return tx.setTimeout(this.config.timeoutInSeconds!).build();
  }

  /**
   * Simulate the batch transaction.
   * @param server - Soroban RPC server
   * @param sourceAccount - Source account for simulation
   * @returns Simulation results with fees and events
   * @throws SimulationError if simulation fails
   */
  async simulate(
    server: SorobanRpc.Server,
    sourceAccount: any
  ): Promise<{ results: any[]; fee: bigint; events: xdr.DiagnosticEvent[] }> {
    const tx = this.build(sourceAccount);
    const result = await server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new SimulationError(`Batch simulation error: ${result.error}`);
    }

    return {
      results: result.result?.retval ? [result.result.retval] : [],
      fee: BigInt(result.minResourceFee ?? '0'),
      events: result.events ?? [],
    };
  }
}

/**
 * Factory function to create a BatchTransactionBuilder.
 * @param config - Optional batch configuration
 * @returns New BatchTransactionBuilder instance
 */
export function createBatchBuilder(config?: BatchConfig): BatchTransactionBuilder {
  return new BatchTransactionBuilder(config);
}

/**
 * Operation for multi-contract calls.
 */
export interface MultiCallOperation {
  /** Contract ID to call */
  contractId: string;
  /** Method name to call */
  method: string;
  /** Method arguments as XDR ScVal array */
  args: xdr.ScVal[];
}

/**
 * Configuration for MultiCallClient.
 */
export interface MultiCallConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Network passphrase (default: PUBLIC) */
  networkPassphrase?: string;
  /** Default fee in stroops (default: '100') */
  defaultFee?: string;
}

/**
 * Client for executing multi-contract batch transactions.
 */
export class MultiCallClient {
  private server: SorobanRpc.Server;
  private config: Required<Pick<MultiCallConfig, 'networkPassphrase' | 'defaultFee'>> &
    Pick<MultiCallConfig, 'rpcUrl'>;

  /**
   * Create a new MultiCallClient.
   * @param config - MultiCall configuration
   * @param server - Optional pre-configured RPC server
   */
  constructor(config: MultiCallConfig, server?: SorobanRpc.Server) {
    this.server = server ?? new SorobanRpc.Server(config.rpcUrl);
    this.config = {
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase ?? Networks.PUBLIC,
      defaultFee: config.defaultFee ?? '100',
    };
  }

  /**
   * Execute a batch of operations as a single transaction.
   * @param operations - Operations to execute
   * @param signer - Signer to sign the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   * @throws ContractError if transaction fails
   */
  async executeBatch(
    operations: MultiCallOperation[],
    signer: any,
    _options?: TxOptions
  ): Promise<string> {
    const batchBuilder = new BatchTransactionBuilder({
      networkPassphrase: this.config.networkPassphrase,
      fee: this.config.defaultFee,
    });

    batchBuilder.addOperations(
      operations.map(op => ({
        contractId: op.contractId,
        method: op.method,
        params: op.args,
      }))
    );

    const source = await signer.getPublicKey();
    const sourceAccount = await this.server.getAccount(source);
    const tx = batchBuilder.build(sourceAccount);
    const txXdr = tx.toXDR();
    const signedXdr = await signer.signTransaction(txXdr);
    const signedTx = TransactionBuilder.fromXDR(
      signedXdr,
      this.config.networkPassphrase!
    ) as Transaction;

    const resp = await this.server.sendTransaction(signedTx);

    if (resp.status === 'ERROR') {
      throw new ContractError(
        `Batch transaction failed: ${resp.errorResult ? resp.errorResult.toXDR('base64') : 'unknown'}`,
        operations[0]?.contractId ?? 'unknown',
        'batch'
      );
    }

    return resp.hash;
  }

  /**
   * Simulate a batch of operations without executing.
   * @param operations - Operations to simulate
   * @param source - Source account address
   * @returns Simulation results with fees
   */
  async simulateBatch(
    operations: MultiCallOperation[],
    source: string
  ): Promise<{ results: any[]; fee: bigint }> {
    const batchBuilder = new BatchTransactionBuilder({
      networkPassphrase: this.config.networkPassphrase,
      fee: this.config.defaultFee,
    });

    batchBuilder.addOperations(
      operations.map(op => ({
        contractId: op.contractId,
        method: op.method,
        params: op.args,
      }))
    );

    const sourceAccount = await this.server.getAccount(source);
    const result = await batchBuilder.simulate(this.server, sourceAccount);
    return { results: result.results, fee: result.fee };
  }
}
