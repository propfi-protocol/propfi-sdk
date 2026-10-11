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
