import { ValidationError } from '../errors';

export const STELLAR_ADDRESS_REGEX = /^[GC][A-Z0-9]{55}$/;

export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: ValidationError;
}

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

export function assertValid<T>(result: ValidationResult<T>): T {
  if (!result.valid) {
    throw result.error!;
  }
  return result.value!;
}

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
