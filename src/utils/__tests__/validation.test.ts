import { describe, it, expect } from 'vitest';
import {
  validateStellarAddress,
  validateContractId,
  validateAccountId,
  validatePositiveBigInt,
  validateNonNegativeBigInt,
  validateNumberRange,
  validateStringLength,
  validateRequired,
  assertValid,
  validateAll,
  createConfigValidator,
  STELLAR_ADDRESS_REGEX,
} from '../../utils/validation';

describe('Validation Utilities', () => {
  describe('STELLAR_ADDRESS_REGEX', () => {
    it('should match valid G addresses', () => {
      expect(
        STELLAR_ADDRESS_REGEX.test('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789')
      ).toBe(true);
    });

    it('should match valid C addresses', () => {
      expect(
        STELLAR_ADDRESS_REGEX.test('CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789')
      ).toBe(true);
    });

    it('should not match invalid addresses', () => {
      expect(STELLAR_ADDRESS_REGEX.test('invalid')).toBe(false);
      expect(STELLAR_ADDRESS_REGEX.test('GABC')).toBe(false);
      expect(
        STELLAR_ADDRESS_REGEX.test('XABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789')
      ).toBe(false);
      expect(STELLAR_ADDRESS_REGEX.test('')).toBe(false);
    });
  });

  describe('validateStellarAddress', () => {
    it('should return valid for correct G address', () => {
      const result = validateStellarAddress(
        'GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789'
      );
      expect(result.valid).toBe(true);
      expect(result.value).toBe('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789');
    });

    it('should return valid for correct C address', () => {
      const result = validateStellarAddress(
        'CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789'
      );
      expect(result.valid).toBe(true);
    });

    it('should return invalid for empty string', () => {
      const result = validateStellarAddress('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return invalid for non-string', () => {
      const result = validateStellarAddress(123 as any);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong format', () => {
      const result = validateStellarAddress('invalid');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong length', () => {
      const result = validateStellarAddress('GABC');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for wrong prefix', () => {
      const result = validateStellarAddress(
        'XABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789'
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('validateContractId', () => {
    it('should return valid for C address', () => {
      const result = validateContractId('CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for G address', () => {
      const result = validateContractId('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toContain("must start with 'C'");
    });
  });

  describe('validateAccountId', () => {
    it('should return valid for G address', () => {
      const result = validateAccountId('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for C address', () => {
      const result = validateAccountId('CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789');
      expect(result.valid).toBe(false);
      expect(result.error?.message).toContain("must start with 'G'");
    });
  });

  describe('validatePositiveBigInt', () => {
    it('should return valid for positive bigint', () => {
      const result = validatePositiveBigInt(10n, 'amount');
      expect(result.valid).toBe(true);
      expect(result.value).toBe(10n);
    });

    it('should return invalid for zero', () => {
      const result = validatePositiveBigInt(0n, 'amount');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for negative', () => {
      const result = validatePositiveBigInt(-1n, 'amount');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateNonNegativeBigInt', () => {
    it('should return valid for positive bigint', () => {
      const result = validateNonNegativeBigInt(10n, 'amount');
      expect(result.valid).toBe(true);
    });

    it('should return valid for zero', () => {
      const result = validateNonNegativeBigInt(0n, 'amount');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for negative', () => {
      const result = validateNonNegativeBigInt(-1n, 'amount');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateNumberRange', () => {
    it('should return valid for value in range', () => {
      const result = validateNumberRange(5, 0, 10, 'level');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for value below range', () => {
      const result = validateNumberRange(-1, 0, 10, 'level');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for value above range', () => {
      const result = validateNumberRange(11, 0, 10, 'level');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateStringLength', () => {
    it('should return valid for correct length', () => {
      const result = validateStringLength('hello', 3, 10, 'name');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for too short', () => {
      const result = validateStringLength('hi', 3, 10, 'name');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for too long', () => {
      const result = validateStringLength('hello world', 3, 10, 'name');
      expect(result.valid).toBe(false);
    });
  });

  describe('validateRequired', () => {
    it('should return valid for defined value', () => {
      const result = validateRequired('value', 'field');
      expect(result.valid).toBe(true);
    });

    it('should return invalid for null', () => {
      const result = validateRequired(null, 'field');
      expect(result.valid).toBe(false);
    });

    it('should return invalid for undefined', () => {
      const result = validateRequired(undefined, 'field');
      expect(result.valid).toBe(false);
    });
  });

  describe('assertValid', () => {
    it('should return value for valid result', () => {
      const result = validatePositiveBigInt(10n, 'amount');
      const value = assertValid(result);
      expect(value).toBe(10n);
    });

    it('should throw for invalid result', () => {
      const result = validatePositiveBigInt(0n, 'amount');
      expect(() => assertValid(result)).toThrow('amount must be a positive number');
    });
  });

  describe('validateAll', () => {
    it('should return valid when all pass', () => {
      const obj = { a: 10, b: 'hello' };
      const validators = {
        a: (v: unknown) => validatePositiveBigInt(v as bigint, 'a'),
        b: (v: unknown) => validateStringLength(v as string, 3, 10, 'b'),
      };
      const result = validateAll(obj, validators);
      expect(result.valid).toBe(true);
      expect(result.value).toEqual({ a: 10, b: 'hello' });
    });

    it('should return invalid when any fails', () => {
      const obj = { a: 0, b: 'hello' };
      const validators = {
        a: (v: unknown) => validatePositiveBigInt(v as bigint, 'a'),
        b: (v: unknown) => validateStringLength(v as string, 3, 10, 'b'),
      };
      const result = validateAll(obj, validators);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createConfigValidator', () => {
    it('should create validator object with expected methods', () => {
      const validator = createConfigValidator();

      expect(typeof validator.rpcUrl).toBe('function');
      expect(typeof validator.contractId).toBe('function');
      expect(typeof validator.accountId).toBe('function');
      expect(typeof validator.positiveAmount).toBe('function');
      expect(typeof validator.nonNegativeAmount).toBe('function');
    });

    it('should validate rpcUrl', () => {
      const validator = createConfigValidator();
      expect(validator.rpcUrl('https://example.com').valid).toBe(true);
      expect(validator.rpcUrl('').valid).toBe(false);
    });

    it('should validate contractId', () => {
      const validator = createConfigValidator();
      expect(
        validator.contractId('CABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789').valid
      ).toBe(true);
      expect(
        validator.contractId('GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678901234567890123456789').valid
      ).toBe(false);
    });
  });
});
