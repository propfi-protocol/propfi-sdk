import { ValidationError } from '../errors';

/** Regex pattern for validating Stellar addresses (both G... and C... formats) */
export const STELLAR_ADDRESS_REGEX = /^[GC][A-Z0-9]{55}$/;

/**
 * Result of a validation check.
 * @template T - The validated value type
 */
export interface ValidationResult<T> {
  /** Whether validation passed */
  valid: boolean;
  /** The validated value (if valid) */
  value?: T;
  /** The validation error (if invalid) */
  error?: ValidationError;
}

/**
 * Validate a Stellar address (account or contract).
 * @param address - Address to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated address or error
 */
export function validateStellarAddress(
  address: string,
  fieldName = 'address'
): ValidationResult<string> {
  if (!address || typeof address !== 'string') {
    return {
      valid: false,
      error: new ValidationError(
        `Invalid ${fieldName}: must be a non-empty string`,
        fieldName,
        address
      ),
    };
  }

  if (!STELLAR_ADDRESS_REGEX.test(address)) {
    return {
      valid: false,
      error: new ValidationError(
        `Invalid ${fieldName}: must be a valid Stellar address (G... or C...) - got ${address}`,
        fieldName,
        address
      ),
    };
  }

  return { valid: true, value: address };
}

/**
 * Validate a contract ID (must start with 'C').
 * @param contractId - Contract ID to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated contract ID or error
 */
export function validateContractId(
  contractId: string,
  fieldName = 'contractId'
): ValidationResult<string> {
  const result = validateStellarAddress(contractId, fieldName);
  if (!result.valid) {
    return result;
  }

  if (!contractId.startsWith('C')) {
    return {
      valid: false,
      error: new ValidationError(
        `Invalid ${fieldName}: contract IDs must start with 'C' - got ${contractId}`,
        fieldName,
        contractId
      ),
    };
  }

  return { valid: true, value: contractId };
}

/**
 * Validate an account ID (must start with 'G').
 * @param accountId - Account ID to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated account ID or error
 */
export function validateAccountId(
  accountId: string,
  fieldName = 'accountId'
): ValidationResult<string> {
  const result = validateStellarAddress(accountId, fieldName);
  if (!result.valid) {
    return result;
  }

  if (!accountId.startsWith('G')) {
    return {
      valid: false,
      error: new ValidationError(
        `Invalid ${fieldName}: account IDs must start with 'G' - got ${accountId}`,
        fieldName,
        accountId
      ),
    };
  }

  return { valid: true, value: accountId };
}

/**
 * Validate that a bigint is positive (> 0).
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated value or error
 */
export function validatePositiveBigInt(value: bigint, fieldName: string): ValidationResult<bigint> {
  if (value <= 0n) {
    return {
      valid: false,
      error: new ValidationError(
        `${fieldName} must be a positive number`,
        fieldName,
        value.toString()
      ),
    };
  }
  return { valid: true, value };
}

/**
 * Validate that a bigint is non-negative (>= 0).
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated value or error
 */
export function validateNonNegativeBigInt(
  value: bigint,
  fieldName: string
): ValidationResult<bigint> {
  if (value < 0n) {
    return {
      valid: false,
      error: new ValidationError(
        `${fieldName} must be a non-negative number`,
        fieldName,
        value.toString()
      ),
    };
  }
  return { valid: true, value };
}

/**
 * Validate that a number is within a range.
 * @param value - Value to validate
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated value or error
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult<number> {
  if (value < min || value > max) {
    return {
      valid: false,
      error: new ValidationError(
        `${fieldName} must be between ${min} and ${max}`,
        fieldName,
        value
      ),
    };
  }
  return { valid: true, value };
}

/**
 * Validate that a string length is within a range.
 * @param value - String to validate
 * @param minLength - Minimum allowed length (inclusive)
 * @param maxLength - Maximum allowed length (inclusive)
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated value or error
 */
export function validateStringLength(
  value: string,
  minLength: number,
  maxLength: number,
  fieldName: string
): ValidationResult<string> {
  if (value.length < minLength || value.length > maxLength) {
    return {
      valid: false,
      error: new ValidationError(
        `${fieldName} must be between ${minLength} and ${maxLength} characters`,
        fieldName,
        value
      ),
    };
  }
  return { valid: true, value };
}

/**
 * Validate that a value is not null or undefined.
 * @template T - The value type
 * @param value - Value to validate
 * @param fieldName - Field name for error messages
 * @returns ValidationResult with the validated value or error
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string
): ValidationResult<T> {
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: new ValidationError(`${fieldName} is required`, fieldName, value),
    };
  }
  return { valid: true, value };
}

/**
 * Assert that a validation result is valid, throwing if not.
 * @template T - The validated value type
 * @param result - Validation result to assert
 * @returns The validated value
 * @throws ValidationError if validation failed
 */
export function assertValid<T>(result: ValidationResult<T>): T {
  if (!result.valid) {
    throw result.error!;
  }
  return result.value!;
}

/**
 * Validate multiple fields on an object at once.
 * @template T - The object type
 * @param obj - Object to validate
 * @param validators - Map of field names to validator functions
 * @returns ValidationResult with the validated object or combined error
 */
export function validateAll<T extends Record<string, unknown>>(
  obj: T,
  validators: Record<keyof T, (value: unknown) => ValidationResult<unknown>>
): ValidationResult<T> {
  const errors: ValidationError[] = [];
  const validated: Partial<T> = {};

  for (const [key, validator] of Object.entries(validators)) {
    const result = validator(obj[key]);
    if (!result.valid) {
      errors.push(result.error!);
    } else {
      validated[key as keyof T] = result.value as T[keyof T];
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: new ValidationError(
        `Validation failed: ${errors.map(e => e.message).join(', ')}`,
        'multiple',
        errors
      ),
    };
  }

  return { valid: true, value: validated as T };
}

/**
 * Create a set of validators for common SDK configuration fields.
 * @returns Object with validator functions for rpcUrl, contractId, accountId, positiveAmount, nonNegativeAmount
 */
export function createConfigValidator() {
  return {
    rpcUrl: (value: unknown) =>
      validateRequired(value, 'rpcUrl').valid
        ? validateStringLength(value as string, 1, 500, 'rpcUrl')
        : validateRequired(value, 'rpcUrl'),
    contractId: (value: unknown) => validateContractId(value as string),
    accountId: (value: unknown) => validateAccountId(value as string),
    positiveAmount: (value: unknown) => validatePositiveBigInt(value as bigint, 'amount'),
    nonNegativeAmount: (value: unknown) => validateNonNegativeBigInt(value as bigint, 'amount'),
  };
}
