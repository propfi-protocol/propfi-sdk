import { describe, it, expect } from 'vitest';
import {
  PropFiError,
  SimulationError,
  TransactionError,
  ContractError,
  ValidationError,
  NetworkError,
  SignerError,
  ConfigurationError,
  isPropFiError,
  assertValidAddress,
  assertPositiveBigInt,
  assertNonNegativeBigInt,
} from '../errors';

describe('Errors', () => {
  describe('PropFiError', () => {
    it('should create error with code and cause', () => {
      const cause = new Error('original');
      const error = new PropFiError('test message', 'TEST_CODE', cause);

      expect(error.message).toBe('test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.cause).toBe(cause);
      expect(error.name).toBe('PropFiError');
    });
  });

  describe('SimulationError', () => {
    it('should create error with correct code', () => {
      const error = new SimulationError('simulation failed');
      expect(error.code).toBe('SIMULATION_ERROR');
      expect(error.name).toBe('SimulationError');
    });
  });

  describe('TransactionError', () => {
    it('should create error with txHash and errorResult', () => {
      const error = new TransactionError('tx failed', 'tx-hash', 'error-result');
      expect(error.code).toBe('TRANSACTION_ERROR');
      expect(error.txHash).toBe('tx-hash');
      expect(error.errorResult).toBe('error-result');
      expect(error.name).toBe('TransactionError');
    });
  });

  describe('ContractError', () => {
    it('should create error with contractId and method', () => {
      const error = new ContractError('contract call failed', 'CABC...', 'myMethod');
      expect(error.code).toBe('CONTRACT_ERROR');
      expect(error.contractId).toBe('CABC...');
      expect(error.method).toBe('myMethod');
      expect(error.name).toBe('ContractError');
    });
  });

  describe('ValidationError', () => {
    it('should create error with field and value', () => {
      const error = new ValidationError('invalid value', 'amount', -1);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBe('amount');
      expect(error.value).toBe(-1);
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('NetworkError', () => {
    it('should create error with endpoint', () => {
      const error = new NetworkError('network failed', 'https://rpc.example.com');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.endpoint).toBe('https://rpc.example.com');
      expect(error.name).toBe('NetworkError');
    });
  });

  describe('SignerError', () => {
    it('should create error with operation', () => {
      const error = new SignerError('signing failed', 'signTransaction');
      expect(error.code).toBe('SIGNER_ERROR');
      expect(error.operation).toBe('signTransaction');
      expect(error.name).toBe('SignerError');
    });
  });

  describe('ConfigurationError', () => {
    it('should create error with configKey', () => {
      const error = new ConfigurationError('missing config', 'rpcUrl');
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.configKey).toBe('rpcUrl');
      expect(error.name).toBe('ConfigurationError');
    });
  });

  describe('isPropFiError', () => {
    it('should return true for PropFiError instances', () => {
      expect(isPropFiError(new PropFiError('test', 'CODE'))).toBe(true);
      expect(isPropFiError(new SimulationError('test'))).toBe(true);
      expect(isPropFiError(new TransactionError('test'))).toBe(true);
      expect(isPropFiError(new ContractError('test', 'C...', 'm'))).toBe(true);
      expect(isPropFiError(new ValidationError('test', 'f', 'v'))).toBe(true);
      expect(isPropFiError(new NetworkError('test', 'e'))).toBe(true);
      expect(isPropFiError(new SignerError('test', 'o'))).toBe(true);
      expect(isPropFiError(new ConfigurationError('test', 'k'))).toBe(true);
    });

    it('should return false for non-PropFiError', () => {
      expect(isPropFiError(new Error('test'))).toBe(false);
      expect(isPropFiError('string')).toBe(false);
      expect(isPropFiError(null)).toBe(false);
      expect(isPropFiError(undefined)).toBe(false);
      expect(isPropFiError({})).toBe(false);
    });
  });

  describe('assertValidAddress', () => {
    it('should pass for valid G address', () => {
      expect(() =>
        assertValidAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789', 'address')
      ).not.toThrow();
    });

    it('should pass for valid C address', () => {
      expect(() =>
        assertValidAddress('CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789', 'address')
      ).not.toThrow();
    });

    it('should throw for empty string', () => {
      expect(() => assertValidAddress('', 'address')).toThrow(ValidationError);
    });

    it('should throw for invalid format', () => {
      expect(() => assertValidAddress('invalid', 'address')).toThrow(ValidationError);
    });

    it('should throw for non-string', () => {
      expect(() => assertValidAddress(123 as any, 'address')).toThrow(ValidationError);
    });
  });

  describe('assertPositiveBigInt', () => {
    it('should pass for positive bigint', () => {
      expect(() => assertPositiveBigInt(10n, 'amount')).not.toThrow();
    });

    it('should throw for zero', () => {
      expect(() => assertPositiveBigInt(0n, 'amount')).toThrow(ValidationError);
    });

    it('should throw for negative', () => {
      expect(() => assertPositiveBigInt(-1n, 'amount')).toThrow(ValidationError);
    });
  });

  describe('assertNonNegativeBigInt', () => {
    it('should pass for positive bigint', () => {
      expect(() => assertNonNegativeBigInt(10n, 'amount')).not.toThrow();
    });

    it('should pass for zero', () => {
      expect(() => assertNonNegativeBigInt(0n, 'amount')).not.toThrow();
    });

    it('should throw for negative', () => {
      expect(() => assertNonNegativeBigInt(-1n, 'amount')).toThrow(ValidationError);
    });
  });
});
