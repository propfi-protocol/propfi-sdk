import {
  Account,
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  scValToNative,
} from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { xdr, Transaction } from '@stellar/stellar-sdk';
import { SimulationError, TransactionError, ContractError } from '../errors';

export interface SorobanSigner {
  signTransaction(txXdr: string): Promise<string>;
  getPublicKey(): Promise<string>;
}

export class SorobanClient {
  protected server: SorobanRpc.Server;
  protected contract: Contract;
  protected networkPassphrase: string;
  private static readonly DUMMY_ADDRESS = 'GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4';

  constructor(rpcUrl: string, contractId: string, networkPassphrase?: string) {
    this.server = new SorobanRpc.Server(rpcUrl);
    this.contract = new Contract(contractId);
    this.networkPassphrase = networkPassphrase ?? Networks.PUBLIC;
  }

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

  async signAndSend(
    method: string,
    params: xdr.ScVal[],
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
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

    if (resp.status === 'ERROR') {
      throw new TransactionError(
        `Transaction failed for ${method}: ${resp.errorResult ? resp.errorResult.toXDR('base64') : 'unknown'}`,
        resp.hash,
        resp.errorResult ? resp.errorResult.toXDR('base64') : undefined
      );
    }

    return resp.hash;
  }

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
