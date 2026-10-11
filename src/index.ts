export * from './types';
export * from './errors';
export * from './utils';
export {
  SorobanClient,
  ComplianceRegistryClient,
  PropertyRegistryClient,
  FractionVaultClient,
  MortgagePoolClient,
  type SorobanSigner,
  type TransactionResult,
} from './clients';

/**
 * Main PropFi SDK interface providing access to all contract clients.
 */
export interface PropFiSDK {
  /** RPC endpoint URL */
  rpcUrl: string;

  /** Compliance registry client */
  complianceRegistry: ComplianceRegistryClient;
  /** Property registry client */
  propertyRegistry: PropertyRegistryClient;
  /** Fraction vault client */
  fractionVault: FractionVaultClient;
  /** Mortgage pool client */
  mortgagePool: MortgagePoolClient;

  /** Get compliance registry client */
  getComplianceRegistry(): ComplianceRegistryClient;
  /** Get property registry client */
  getPropertyRegistry(): PropertyRegistryClient;
  /** Get fraction vault client */
  getFractionVault(): FractionVaultClient;
  /** Get mortgage pool client */
  getMortgagePool(): MortgagePoolClient;
}

import {
  ComplianceRegistryClient,
  PropertyRegistryClient,
  FractionVaultClient,
  MortgagePoolClient,
} from './clients';

/**
 * Configuration for creating a PropFi SDK instance.
 */
export interface PropFiConfig {
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Compliance registry contract ID */
  complianceRegistryId: string;
  /** Property registry contract ID */
  propertyRegistryId: string;
  /** Fraction vault contract ID */
  fractionVaultId: string;
  /** Mortgage pool contract ID */
  mortgagePoolId: string;
}

/**
 * Create a new PropFi SDK instance with all contract clients configured.
 * @param config - SDK configuration with RPC URL and contract IDs
 * @returns PropFiSDK instance with all clients
 * @example
 * ```typescript
 * const sdk = createPropFi({
 *   rpcUrl: 'https://soroban-testnet.stellar.org',
 *   complianceRegistryId: 'CABC...',
 *   propertyRegistryId: 'CDEF...',
 *   fractionVaultId: 'CGHI...',
 *   mortgagePoolId: 'CJKL...',
 * });
 * ```
 */
export function createPropFi(config: PropFiConfig): PropFiSDK {
  const { rpcUrl } = config;

  const complianceRegistry = new ComplianceRegistryClient(rpcUrl, config.complianceRegistryId);
  const propertyRegistry = new PropertyRegistryClient(rpcUrl, config.propertyRegistryId);
  const fractionVault = new FractionVaultClient(rpcUrl, config.fractionVaultId);
  const mortgagePool = new MortgagePoolClient(rpcUrl, config.mortgagePoolId);

  return {
    rpcUrl,

    complianceRegistry,
    propertyRegistry,
    fractionVault,
    mortgagePool,

    getComplianceRegistry() {
      return complianceRegistry;
    },
    getPropertyRegistry() {
      return propertyRegistry;
    },
    getFractionVault() {
      return fractionVault;
    },
    getMortgagePool() {
      return mortgagePool;
    },
  };
}
