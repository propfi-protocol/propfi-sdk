import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionSimulator, createTransactionSimulator } from '../../utils/simulation';
import { Networks } from '@stellar/stellar-sdk';

describe('TransactionSimulator', () => {
  let simulator: TransactionSimulator;
  let mockServer: any;
  let mockContract: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      getAccount: vi.fn(),
      simulateTransaction: vi.fn(),
      prepareTransaction: vi.fn(),
    };
    mockContract = { call: vi.fn().mockReturnValue('mock-operation') };

    vi.doMock('@stellar/stellar-sdk', () => ({
      SorobanRpc: {
        Server: vi.fn(() => mockServer),
        Api: {
          isSimulationError: vi.fn(),
        },
      },
      Contract: vi.fn(() => mockContract),
      TransactionBuilder: vi.fn().mockImplementation(() => ({
        addOperation: vi.fn().mockReturnThis(),
        setTimeout: vi.fn().mockReturnThis(),
        build: vi.fn().mockReturnThis(),
      })),
      Account: vi.fn(),
      Networks: {
        PUBLIC: 'Public Global Stellar Network ; September 2015',
        TESTNET: 'Test SDF Network ; September 2015',
      },
    }));

    simulator = new TransactionSimulator(mockServer, 'CABC...', Networks.PUBLIC);
  });

  describe('constructor', () => {
    it('should create simulator with provided parameters', () => {
      expect(simulator).toBeDefined();
    });
  });

  describe('estimateFee', () => {
    it('should estimate fee based on minResourceFee', () => {
      const fee = simulator.estimateFee(1000n);
      expect(fee).toBe(1000n + 100n);
    });

    it('should use default fee when minResourceFee is 0', () => {
      const fee = simulator.estimateFee(0n);
      expect(fee).toBe(100n * 10n + 100n);
    });
  });

  describe('getFeeEstimate', () => {
    it('should return fee estimate object', () => {
      const estimate = simulator.getFeeEstimate(500n);
      expect(estimate).toEqual({
        minFee: 500n,
        recommendedFee: 1500n,
        maxFee: 1000n,
        resourceFee: 500n,
      });
    });

    it('should use default resource fee when 0', () => {
      const estimate = simulator.getFeeEstimate(0n);
      expect(estimate.resourceFee).toBe(1000n);
    });
  });
});

describe('createTransactionSimulator', () => {
  it('should create simulator with default network passphrase', () => {
    const sim = createTransactionSimulator('https://rpc.example.com', 'CABC...');
    expect(sim).toBeInstanceOf(TransactionSimulator);
  });

  it('should create simulator with custom network passphrase', () => {
    const sim = createTransactionSimulator('https://rpc.example.com', 'CABC...', Networks.TESTNET);
    expect(sim).toBeInstanceOf(TransactionSimulator);
  });
});
