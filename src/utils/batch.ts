import { TransactionBuilder, Networks, Contract, SorobanRpc } from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { Transaction, xdr } from '@stellar/stellar-sdk';
import { ContractError, SimulationError } from '../errors';

export interface BatchOperation {
  contractId: string;
  method: string;
  params: xdr.ScVal[];
}

export interface BatchConfig {
  networkPassphrase?: string;
  fee?: string;
  timeoutInSeconds?: number;
}

export class BatchTransactionBuilder {
  private operations: BatchOperation[] = [];
  private config: BatchConfig;

  constructor(config: BatchConfig = {}) {
    this.config = {
      networkPassphrase: config.networkPassphrase ?? Networks.PUBLIC,
      fee: config.fee ?? '100',
      timeoutInSeconds: config.timeoutInSeconds ?? 30,
    };
  }

  addOperation(contractId: string, method: string, params: xdr.ScVal[]): this {
    this.operations.push({ contractId, method, params });
    return this;
  }

  addOperations(operations: BatchOperation[]): this {
    this.operations.push(...operations);
    return this;
  }

  clear(): this {
    this.operations = [];
    return this;
  }

  getOperations(): BatchOperation[] {
    return [...this.operations];
  }

  getOperationCount(): number {
    return this.operations.length;
  }

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

export function createBatchBuilder(config?: BatchConfig): BatchTransactionBuilder {
  return new BatchTransactionBuilder(config);
}

export interface MultiCallOperation {
  contractId: string;
  method: string;
  args: xdr.ScVal[];
}

export interface MultiCallConfig {
  rpcUrl: string;
  networkPassphrase?: string;
  defaultFee?: string;
}

export class MultiCallClient {
  private server: SorobanRpc.Server;
  private config: MultiCallConfig;

  constructor(config: MultiCallConfig, server?: SorobanRpc.Server) {
    this.server = server ?? new SorobanRpc.Server(config.rpcUrl);
    this.config = {
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase ?? Networks.PUBLIC,
      defaultFee: config.defaultFee ?? '100',
    };
  }

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
