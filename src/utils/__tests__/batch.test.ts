import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BatchTransactionBuilder, createBatchBuilder, MultiCallClient } from '../../utils/batch';
import type { MultiCallOperation } from '../../utils/batch';
import { SorobanRpc, TransactionBuilder, Networks } from '@stellar/stellar-sdk';
import type { xdr } from '@stellar/stellar-sdk';

describe('BatchTransactionBuilder', () => {
  let builder: BatchTransactionBuilder;

  beforeEach(() => {
    builder = new BatchTransactionBuilder({
      networkPassphrase: Networks.PUBLIC,
      fee: '100',
    });
  });

  describe('addOperation', () => {
    it('should add a single operation', () => {
      const mockParams = [{} as xdr.ScVal];
      builder.addOperation('CABC...', 'method1', mockParams);

      expect(builder.getOperationCount()).toBe(1);
      const ops = builder.getOperations();
      expect(ops).toHaveLength(1);
      expect(ops[0]?.contractId).toBe('CABC...');
      expect(ops[0]?.method).toBe('method1');
    });

    it('should chain operations', () => {
      builder.addOperation('CABC...', 'method1', []).addOperation('CDEF...', 'method2', []);

      expect(builder.getOperationCount()).toBe(2);
    });
  });

  describe('addOperations', () => {
    it('should add multiple operations at once', () => {
      const operations = [
        { contractId: 'CABC...', method: 'method1', params: [] },
        { contractId: 'CDEF...', method: 'method2', params: [] },
      ];
      builder.addOperations(operations);

      expect(builder.getOperationCount()).toBe(2);
    });
  });

  describe('clear', () => {
    it('should clear all operations', () => {
      builder.addOperation('CABC...', 'method1', []);
      builder.clear();

      expect(builder.getOperationCount()).toBe(0);
    });
  });

  describe('build', () => {
    it('should throw when no operations', () => {
      const mockSource = 'GABC...';
      expect(() => builder.build(mockSource)).toThrow('no operations added');
    });

    it('should build transaction with operations', () => {
      builder.addOperation('CABC...', 'method1', []);
      const mockSource = {} as any;
      const tx = builder.build(mockSource);

      expect(tx).toBeDefined();
      expect(TransactionBuilder).toHaveBeenCalled();
    });
  });

  describe('createBatchBuilder', () => {
    it('should create builder with default config', () => {
      const b = createBatchBuilder();
      expect(b).toBeInstanceOf(BatchTransactionBuilder);
    });

    it('should create builder with custom config', () => {
      const b = createBatchBuilder({ fee: '200', networkPassphrase: Networks.TESTNET });
      expect(b).toBeInstanceOf(BatchTransactionBuilder);
    });
  });
});

describe('MultiCallClient', () => {
  let client: MultiCallClient;
  let mockServer: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockServer = {
      getAccount: vi.fn(),
      sendTransaction: vi.fn(),
      simulateTransaction: vi.fn(),
    };

    // Use the global mock server from setup.ts
    const { SorobanRpc } = await import('@stellar/stellar-sdk');
    (SorobanRpc.Server as any).mockImplementation(() => mockServer);

    client = new MultiCallClient({ rpcUrl: 'https://rpc.example.com' }, mockServer);
  });

  describe('constructor', () => {
    it('should create client with default network passphrase', () => {
      expect(client).toBeDefined();
    });

    it('should create client with custom network passphrase', () => {
      const c = new MultiCallClient({
        rpcUrl: 'https://rpc.example.com',
        networkPassphrase: Networks.TESTNET,
      });
      expect(c).toBeDefined();
    });
  });

  describe('executeBatch', () => {
    it('should execute batch operations', async () => {
      const mockScVal = {} as xdr.ScVal;
      const operations: MultiCallOperation[] = [
        { contractId: 'CABC...', method: 'method1', args: [mockScVal] },
        { contractId: 'CDEF...', method: 'method2', args: [mockScVal] },
      ];

      const mockSigner = {
        getPublicKey: vi.fn().mockResolvedValue('GABC...'),
        signTransaction: vi.fn().mockResolvedValue('signed-xdr'),
      };

      const mockSourceAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockSourceAccount);
      mockServer.sendTransaction.mockResolvedValue({ status: 'SUCCESS', hash: 'tx-hash-123' });

      (TransactionBuilder.fromXDR as any).mockReturnValue({});

      const hash = await client.executeBatch(operations, mockSigner);

      expect(mockSigner.getPublicKey).toHaveBeenCalled();
      expect(mockSigner.signTransaction).toHaveBeenCalled();
      expect(mockServer.sendTransaction).toHaveBeenCalled();
      expect(hash).toBe('tx-hash-123');
    });

    it('should throw on transaction error', async () => {
      const mockScVal = {} as xdr.ScVal;
      const operations: MultiCallOperation[] = [
        { contractId: 'CABC...', method: 'method1', args: [mockScVal] },
      ];

      const mockSigner = {
        getPublicKey: vi.fn().mockResolvedValue('GABC...'),
        signTransaction: vi.fn().mockResolvedValue('signed-xdr'),
      };

      const mockSourceAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockSourceAccount);
      mockServer.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        errorResult: { toXDR: vi.fn().mockReturnValue('error-xdr') },
      });

      (TransactionBuilder.fromXDR as any).mockReturnValue({});

      await expect(client.executeBatch(operations, mockSigner)).rejects.toThrow(
        'Batch transaction failed'
      );
    });
  });

  describe('simulateBatch', () => {
    it('should simulate batch operations', async () => {
      const mockScVal = {} as xdr.ScVal;
      const operations: MultiCallOperation[] = [
        { contractId: 'CABC...', method: 'method1', args: [mockScVal] },
      ];

      const mockSourceAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockSourceAccount);
      mockServer.simulateTransaction.mockResolvedValue({
        result: { retval: 'mock-result' },
        minResourceFee: '1000',
        events: [],
      });
      (SorobanRpc.Api.isSimulationError as any).mockReturnValue(false);

      const result = await client.simulateBatch(operations, 'GABC...');

      expect(mockServer.getAccount).toHaveBeenCalledWith('GABC...');
      expect(mockServer.simulateTransaction).toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.fee).toBe(1000n);
    });
  });
});
