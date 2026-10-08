export class PropFiError extends Error {
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

export class SimulationError extends PropFiError {
  constructor(message: string, cause?: Error) {
    super(message, 'SIMULATION_ERROR', cause);
    this.name = 'SimulationError';
  }
}

export class TransactionError extends PropFiError {
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

export class ContractError extends PropFiError {
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

export class ValidationError extends PropFiError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NetworkError extends PropFiError {
  constructor(
    message: string,
    public readonly endpoint: string,
    cause?: Error
  ) {
    super(message, 'NETWORK_ERROR', cause);
    this.name = 'NetworkError';
  }
}

export class SignerError extends PropFiError {
  constructor(
    message: string,
    public readonly operation: string,
    cause?: Error
  ) {
    super(message, 'SIGNER_ERROR', cause);
    this.name = 'SignerError';
  }
}

export class ConfigurationError extends PropFiError {
  constructor(
    message: string,
    public readonly configKey: string
  ) {
    super(message, 'CONFIGURATION_ERROR');
    this.name = 'ConfigurationError';
  }
}

export function isPropFiError(error: unknown): error is PropFiError {
  return error instanceof PropFiError;
}

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

export function assertPositiveBigInt(value: bigint, field: string): void {
  if (value <= 0n) {
    throw new ValidationError(`${field} must be a positive number`, field, value.toString());
  }
}

export function assertNonNegativeBigInt(value: bigint, field: string): void {
  if (value < 0n) {
    throw new ValidationError(`${field} must be a non-negative number`, field, value.toString());
  }
}
