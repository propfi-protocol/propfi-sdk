import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SorobanClient, SorobanSigner } from '../../clients/base';
import { SorobanRpc, Contract, TransactionBuilder, Account, nativeToScVal, scValToNative, Networks } from '@stellar/stellar-sdk';

describe('SorobanClient', () => {
  let client: SorobanClient;
  let mockServer: any;
  let mockContract: any;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SorobanClient('https://rpc.example.com', 'CABC...');
    mockServer = (SorobanRpc.Server as any).mock.results[0].value;
    mockContract = Contract.mock.results[0].value;
  });

  describe('constructor', () => {
    it('should initialize with default network passphrase', () => {
      const c = new SorobanClient('https://rpc.example.com', 'CABC...');
      expect(SorobanRpc.Server).toHaveBeenCalledWith('https://rpc.example.com');
      expect(Contract).toHaveBeenCalledWith('CABC...');
    });

    it('should accept custom network passphrase', () => {
      const c = new SorobanClient('https://rpc.example.com', 'CABC...', Networks.TESTNET);
      expect(c).toBeDefined();
    });
  });

  describe('simulateView', () => {
    it('should simulate a view call and return result', async () => {
      const mockResult = { retval: 'mock-retval' };
      mockServer.simulateTransaction.mockResolvedValue({ result: mockResult });
      (SorobanRpc.Api.isSimulationError as any).mockReturnValue(false);
      (scValToNative as any).mockReturnValue('parsed-result');

      const result = await client.simulateView('test_method', []);

      expect(TransactionBuilder).toHaveBeenCalled();
      expect(mockServer.simulateTransaction).toHaveBeenCalled();
      expect(scValToNative).toHaveBeenCalledWith('mock-retval');
      expect(result).toBe('parsed-result');
    });

    it('should throw on simulation error', async () => {
      mockServer.simulateTransaction.mockResolvedValue({ error: 'simulation failed' });
      (SorobanRpc.Api.isSimulationError as any).mockReturnValue(true);

      await expect(client.simulateView('test_method', [])).rejects.toThrow('Simulation error: simulation failed');
    });

    it('should throw when no result', async () => {
      mockServer.simulateTransaction.mockResolvedValue({});
      (SorobanRpc.Api.isSimulationError as any).mockReturnValue(false);

      await expect(client.simulateView('test_method', [])).rejects.toThrow('No result from simulation');
    });
  });

  describe('prepareTransaction', () => {
    it('should prepare a transaction', async () => {
      const mockAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockAccount);
      const mockPreparedTx = { toXDR: vi.fn().mockReturnValue('prepared-xdr') };
      mockServer.prepareTransaction.mockResolvedValue(mockPreparedTx);

      const mockSigner: SorobanSigner = {
        getPublicKey: vi.fn().mockResolvedValue('GABC...'),
        signTransaction: vi.fn().mockResolvedValue('signed-xdr'),
      };

      const tx = await client.prepareTransaction('test_method', [], 'GABC...');

      expect(mockServer.getAccount).toHaveBeenCalledWith('GABC...');
      expect(TransactionBuilder).toHaveBeenCalled();
      expect(mockServer.prepareTransaction).toHaveBeenCalled();
      expect(tx).toBe(mockPreparedTx);
    });

    it('should use custom fee and timeout', async () => {
      const mockAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockAccount);
      const mockPreparedTx = { toXDR: vi.fn().mockReturnValue('prepared-xdr') };
      mockServer.prepareTransaction.mockResolvedValue(mockPreparedTx);

      await client.prepareTransaction('test_method', [], 'GABC...', { fee: '200', timeoutInSeconds: 60 });

      expect(TransactionBuilder).toHaveBeenCalledWith(
        mockAccount,
        expect.objectContaining({ fee: '200', networkPassphrase: Networks.PUBLIC })
      );
    });
  });

  describe('signAndSend', () => {
    it('should sign and send a transaction', async () => {
      const mockAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockAccount);
      const mockPreparedTx = { toXDR: vi.fn().mockReturnValue('prepared-xdr') };
      mockServer.prepareTransaction.mockResolvedValue(mockPreparedTx);
      mockServer.sendTransaction.mockResolvedValue({ status: 'SUCCESS', hash: 'tx-hash-123' });
      (TransactionBuilder.fromXDR as any).mockReturnValue({});

      const mockSigner: SorobanSigner = {
        getPublicKey: vi.fn().mockResolvedValue('GABC...'),
        signTransaction: vi.fn().mockResolvedValue('signed-xdr'),
      };

      const hash = await client.signAndSend('test_method', [], mockSigner);

      expect(mockSigner.getPublicKey).toHaveBeenCalled();
      expect(mockSigner.signTransaction).toHaveBeenCalledWith('prepared-xdr');
      expect(mockServer.sendTransaction).toHaveBeenCalled();
      expect(hash).toBe('tx-hash-123');
    });

    it('should throw on transaction error', async () => {
      const mockAccount = { accountId: 'GABC...' };
      mockServer.getAccount.mockResolvedValue(mockAccount);
      const mockPreparedTx = { toXDR: vi.fn().mockReturnValue('prepared-xdr') };
      mockServer.prepareTransaction.mockResolvedValue(mockPreparedTx);
      mockServer.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        errorResult: { toXDR: vi.fn().mockReturnValue('error-xdr') },
      });
      (TransactionBuilder.fromXDR as any).mockReturnValue({});

      const mockSigner: SorobanSigner = {
        getPublicKey: vi.fn().mockResolvedValue('GABC...'),
        signTransaction: vi.fn().mockResolvedValue('signed-xdr'),
      };

      await expect(client.signAndSend('test_method', [], mockSigner)).rejects.toThrow('Transaction error');
    });
  });

  describe('getTransactionStatus', () => {
    it('should get transaction status', async () => {
      const mockStatus = { status: 'SUCCESS', hash: 'tx-hash-123' };
      mockServer.getTransaction.mockResolvedValue(mockStatus);

      const status = await client.getTransactionStatus('tx-hash-123');

      expect(mockServer.getTransaction).toHaveBeenCalledWith('tx-hash-123');
      expect(status).toBe(mockStatus);
    });
  });
});