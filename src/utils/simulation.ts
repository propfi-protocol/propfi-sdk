import { SorobanRpc, TransactionBuilder, Networks, Contract } from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { xdr } from '@stellar/stellar-sdk';
import { SimulationError } from '../errors';

/**
 * Result of a transaction simulation.
 */
export interface SimulationResult {
  /** Decoded simulation result */
  result: any;
  /** Events emitted during simulation */
  events: xdr.DiagnosticEvent[];
  /** Latest ledger sequence at time of simulation */
  latestLedger: number;
  /** Minimum resource fee required */
  minResourceFee: bigint;
  /** Estimated fee for transaction execution */
  estimatedFee: bigint;
}

/**
 * Fee estimation breakdown.
 */
export interface FeeEstimate {
  /** Minimum fee required */
  minFee: bigint;
  /** Recommended fee for reliable execution */
  recommendedFee: bigint;
  /** Maximum fee for high-priority execution */
  maxFee: bigint;
  /** Resource fee component */
  resourceFee: bigint;
}

/**
 * Transaction simulator for estimating fees and testing contract calls.
 */
export class TransactionSimulator {
  /**
   * Create a new TransactionSimulator.
   * @param server - Soroban RPC server instance
   * @param contractId - Contract ID to simulate calls for
   * @param networkPassphrase - Network passphrase (default: PUBLIC)
   */
  constructor(
    protected server: SorobanRpc.Server,
    protected contractId: string,
    protected networkPassphrase: string
  ) {}

  /**
   * Simulate a contract call with a source account.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @param source - Source account address
   * @param options - Transaction options
   * @returns Simulation result with fee estimates
   */
  async simulate(
    method: string,
    params: xdr.ScVal[],
    source: string,
    options?: TxOptions
  ): Promise<SimulationResult> {
    const account = await this.server.getAccount(source);
    const tx = new TransactionBuilder(account, {
      fee: String(options?.fee ?? '100'),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(new Contract(this.contractId).call(method, ...params))
      .setTimeout(options?.timeoutInSeconds ?? 30)
      .build();

    const result = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new SimulationError(`Simulation error for ${method}: ${result.error}`);
    }

    if (!result.result) {
      throw new SimulationError(`No result from simulation for ${method}`);
    }

    const minResourceFee = result.minResourceFee ? BigInt(result.minResourceFee) : 0n;
    const estimatedFee = this.estimateFee(minResourceFee);

    return {
      result: result.result.retval,
      events: result.events ?? [],
      latestLedger: result.latestLedger ?? 0,
      minResourceFee,
      estimatedFee,
    };
  }

  /**
   * Simulate a view (read-only) contract call without a source account.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @returns Simulation result
   */
  async simulateView(method: string, params: xdr.ScVal[]): Promise<SimulationResult> {
    const tx = new TransactionBuilder(
      new (await import('@stellar/stellar-sdk')).Account(
        'GBZC6Y2Y7Q3ZQ2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4QZJ2XZ3Z5YXZ6Z7Z2Y4',
        '0'
      ),
      {
        fee: '100',
        networkPassphrase: this.networkPassphrase,
      }
    )
      .addOperation(new Contract(this.contractId).call(method, ...params))
      .setTimeout(30)
      .build();

    const result = await this.server.simulateTransaction(tx);

    if (SorobanRpc.Api.isSimulationError(result)) {
      throw new SimulationError(`Simulation error for ${method}: ${result.error}`);
    }

    if (!result.result) {
      throw new SimulationError(`No result from simulation for ${method}`);
    }

    const minResourceFee = result.minResourceFee ? BigInt(result.minResourceFee) : 0n;
    const estimatedFee = this.estimateFee(minResourceFee);

    return {
      result: result.result.retval,
      events: result.events ?? [],
      latestLedger: result.latestLedger ?? 0,
      minResourceFee,
      estimatedFee,
    };
  }

  /**
   * Estimate transaction fee based on resource fee.
   * @param minResourceFee - Minimum resource fee from simulation
   * @returns Estimated fee
   */
  estimateFee(minResourceFee: bigint): bigint {
    const baseFee = 100n;
    const resourceFee = minResourceFee > 0n ? minResourceFee : baseFee * 10n;
    return resourceFee + baseFee;
  }

  /**
   * Get a detailed fee estimate.
   * @param minResourceFee - Minimum resource fee from simulation
   * @returns Fee estimate breakdown
   */
  getFeeEstimate(minResourceFee: bigint): FeeEstimate {
    const resourceFee = minResourceFee > 0n ? minResourceFee : 1000n;
    return {
      minFee: resourceFee,
      recommendedFee: resourceFee + 1000n,
      maxFee: resourceFee * 2n,
      resourceFee,
    };
  }

  /**
   * Prepare a transaction and simulate it in one call.
   * @param method - Contract method to call
   * @param params - Method parameters as XDR ScVal array
   * @param source - Source account address
   * @param options - Transaction options
   * @returns Prepared transaction and simulation result
   */
  async prepareAndSimulate(
    method: string,
    params: xdr.ScVal[],
    source: string,
    options?: TxOptions
  ): Promise<{ transaction: any; simulation: SimulationResult }> {
    const simulation = await this.simulate(method, params, source, options);

    const account = await this.server.getAccount(source);
    const tx = new TransactionBuilder(account, {
      fee: String(options?.fee ?? simulation.estimatedFee.toString()),
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(new Contract(this.contractId).call(method, ...params))
      .setTimeout(options?.timeoutInSeconds ?? 30)
      .build();

    const prepared = await this.server.prepareTransaction(tx);

    return { transaction: prepared, simulation };
  }
}

/**
 * Factory function to create a TransactionSimulator.
 * @param rpcUrl - RPC endpoint URL
 * @param contractId - Contract ID to simulate
 * @param networkPassphrase - Network passphrase (default: PUBLIC)
 * @returns TransactionSimulator instance
 */
export function createTransactionSimulator(
  rpcUrl: string,
  contractId: string,
  networkPassphrase?: string
): TransactionSimulator {
  const server = new SorobanRpc.Server(rpcUrl);
  return new TransactionSimulator(server, contractId, networkPassphrase ?? Networks.PUBLIC);
}
