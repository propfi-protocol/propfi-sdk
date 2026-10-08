import { SorobanRpc, TransactionBuilder, Networks, Contract } from '@stellar/stellar-sdk';
import type { TxOptions } from '../types';
import type { xdr } from '@stellar/stellar-sdk';
import { SimulationError } from '../errors';

export interface SimulationResult {
  result: any;
  events: xdr.DiagnosticEvent[];
  latestLedger: number;
  minResourceFee: bigint;
  estimatedFee: bigint;
}

export interface FeeEstimate {
  minFee: bigint;
  recommendedFee: bigint;
  maxFee: bigint;
  resourceFee: bigint;
}

export class TransactionSimulator {
  constructor(
    protected server: SorobanRpc.Server,
    protected contractId: string,
    protected networkPassphrase: string
  ) {}

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

  estimateFee(minResourceFee: bigint): bigint {
    const baseFee = 100n;
    const resourceFee = minResourceFee > 0n ? minResourceFee : baseFee * 10n;
    return resourceFee + baseFee;
  }

  getFeeEstimate(minResourceFee: bigint): FeeEstimate {
    const resourceFee = minResourceFee > 0n ? minResourceFee : 1000n;
    return {
      minFee: resourceFee,
      recommendedFee: resourceFee + 1000n,
      maxFee: resourceFee * 2n,
      resourceFee,
    };
  }

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

export function createTransactionSimulator(
  rpcUrl: string,
  contractId: string,
  networkPassphrase?: string
): TransactionSimulator {
  const server = new SorobanRpc.Server(rpcUrl);
  return new TransactionSimulator(server, contractId, networkPassphrase ?? Networks.PUBLIC);
}
