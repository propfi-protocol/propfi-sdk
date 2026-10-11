/**
 * Base error class for all PropFi SDK errors.
 */
export class PropFiError extends Error {
  /**
   * Create a new PropFiError.
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param cause - Optional underlying error that caused this error
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PropFiError';
    const captureStackTrace = (
      Error as unknown as { captureStackTrace?: (target: object, constructor: Function) => void }
    ).captureStackTrace;
    if (captureStackTrace) {
      captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a transaction simulation fails.
 */
export class SimulationError extends PropFiError {
  /**
   * Create a new SimulationError.
   * @param message - Error message
   * @param cause - Optional underlying error
   */
  constructor(message: string, cause?: Error) {
    super(message, 'SIMULATION_ERROR', cause);
    this.name = 'SimulationError';
  }
}

/**
 * Error thrown when a transaction submission fails.
 */
export class TransactionError extends PropFiError {
  /**
   * Create a new TransactionError.
   * @param message - Error message
   * @param txHash - Optional transaction hash
   * @param errorResult - Optional error result XDR
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly txHash?: string,
    public readonly errorResult?: string,
    cause?: Error
  ) {
    super(message, 'TRANSACTION_ERROR', cause);
    this.name = 'TransactionError';
  }
}

/**
 * Error thrown when a contract call fails.
 */
export class ContractError extends PropFiError {
  /**
   * Create a new ContractError.
   * @param message - Error message
   * @param contractId - Contract ID that failed
   * @param method - Method that was called
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly contractId: string,
    public readonly method: string,
    cause?: Error
  ) {
    super(message, 'CONTRACT_ERROR', cause);
    this.name = 'ContractError';
  }
}

/**
 * Error thrown when input validation fails.
 */
export class ValidationError extends PropFiError {
  /**
   * Create a new ValidationError.
   * @param message - Error message
   * @param field - Field that failed validation
   * @param value - Value that failed validation
   */
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

/**
 * Error thrown when a network request fails.
 */
export class NetworkError extends PropFiError {
  /**
   * Create a new NetworkError.
   * @param message - Error message
   * @param endpoint - Endpoint that failed
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly endpoint: string,
    cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
  }
}

/**
 * Error thrown when a signer operation fails.
 */
export class SignerError extends PropFiError {
  /**
   * Create a new SignerError.
   * @param message - Error message
   * @param operation - Operation that failed
   * @param cause - Optional underlying error
   */
  constructor(
    message: string,
    public readonly operation: string,
    cause?: Error
  ) {
    super(message, 'SIGNER_ERROR', cause);
    this.name = 'SignerError';
  }
}

/**
 * Error thrown when configuration is invalid.
 */
export class ConfigurationError extends PropFiError {
  /**
   * Create a new ConfigurationError.
   * @param message - Error message
   * @param configKey - Configuration key that is invalid
   */
  constructor(
    message: string,
    public readonly configKey: string
  ) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

/**
 * Type guard to check if an error is a PropFiError.
 * @param error - Error to check
 * @returns True if the error is a PropFiError
 */
export function isPropFiError(error: unknown): error is PropFiError {
  return error instanceof PropFiError;
}

/**
 * Assert that an address is a valid Stellar address.
 * @param address - Address to validate
 * @param field - Field name for error messages
 * @throws ValidationError if address is invalid
 */
export function assertValidAddress(address: string, field: string): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError(`Invalid ${field}: must be a non-empty string`, field, address);
  }
  if (!address.match(/^G[A-Z0-9]{55}$/) && !address.match(/^C[A-Z0-9]{55}$/)) {
    throw new ValidationError(
      `Invalid ${field}: must be a valid Stellar address (G... or C...)`,
      field,
      address
    );
  }
}

/**
 * Assert that a value is a positive bigint.
 * @param value - Value to validate
 * @param field - Field name for error messages
 * @throws ValidationError if value is not positive
 */
export function assertPositiveBigInt(value: bigint, field: string): void {
  if (value <= 0n) {
    throw new ValidationError(`${field} must be a positive number`, field, value.toString());
  }
}

/**
 * Assert that a value is a non-negative bigint.
 * @param value - Value to validate
 * @param field - Field name for error messages
 * @throws ValidationError if value is negative
 */
export function assertNonNegativeBigInt(value: bigint, field: string): void {
  if (value < 0n) {
    throw new ValidationError(`${field} must be a non-negative number`, field, value.toString());
  }
}
