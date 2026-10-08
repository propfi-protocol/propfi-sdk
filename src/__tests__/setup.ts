import { beforeEach, vi } from 'vitest';

const mockServer = {
  simulateTransaction: vi.fn(),
  getAccount: vi.fn(),
  prepareTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
};

const MockContract = vi.fn().mockImplementation(() => ({
  call: vi.fn().mockReturnValue('mock-operation'),
}));

const MockTransactionBuilder = vi.fn().mockImplementation(() => ({
  addOperation: vi.fn().mockReturnThis(),
  setTimeout: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnThis(),
  toXDR: vi.fn().mockReturnValue('mock-xdr'),
}));

MockTransactionBuilder.fromXDR = vi.fn();
MockTransactionBuilder.prototype = {
  addOperation: vi.fn().mockReturnThis(),
  setTimeout: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnThis(),
  toXDR: vi.fn().mockReturnValue('mock-xdr'),
};

vi.mock('@stellar/stellar-sdk', () => ({
  SorobanRpc: {
    Server: vi.fn(() => mockServer),
    Api: {
      isSimulationError: vi.fn(),
    },
  },
  Contract: MockContract,
  TransactionBuilder: MockTransactionBuilder,
  Account: vi.fn(),
  Networks: {
    PUBLIC: 'Public Global Stellar Network ; September 2015',
    TESTNET: 'Test SDF Network ; September 2015',
  },
  nativeToScVal: vi.fn(),
  scValToNative: vi.fn(),
  xdr: {},
  Keypair: {
    fromSecret: vi.fn(),
    random: vi.fn(),
  },
}));