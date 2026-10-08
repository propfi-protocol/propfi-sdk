import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPropFi } from '../index';
import { ComplianceRegistryClient } from '../clients/ComplianceRegistry';
import { PropertyRegistryClient } from '../clients/PropertyRegistry';
import { FractionVaultClient } from '../clients/FractionVault';
import { MortgagePoolClient } from '../clients/MortgagePool';

vi.mock('../clients/ComplianceRegistry');
vi.mock('../clients/PropertyRegistry');
vi.mock('../clients/FractionVault');
vi.mock('../clients/MortgagePool');

describe('createPropFi', () => {
  const config = {
    rpcUrl: 'https://soroban-testnet.stellar.org',
    complianceRegistryId: 'CABC...',
    propertyRegistryId: 'CDEF...',
    fractionVaultId: 'CGHI...',
    mortgagePoolId: 'CJKL...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create SDK instance with all clients', () => {
    const sdk = createPropFi(config);

    expect(sdk).toBeDefined();
    expect(sdk.rpcUrl).toBe(config.rpcUrl);
    expect(sdk.complianceRegistry).toBeInstanceOf(ComplianceRegistryClient);
    expect(sdk.propertyRegistry).toBeInstanceOf(PropertyRegistryClient);
    expect(sdk.fractionVault).toBeInstanceOf(FractionVaultClient);
    expect(sdk.mortgagePool).toBeInstanceOf(MortgagePoolClient);
  });

  it('should pass rpcUrl and contract IDs to each client', () => {
    createPropFi(config);

    expect(ComplianceRegistryClient).toHaveBeenCalledWith(config.rpcUrl, config.complianceRegistryId);
    expect(PropertyRegistryClient).toHaveBeenCalledWith(config.rpcUrl, config.propertyRegistryId);
    expect(FractionVaultClient).toHaveBeenCalledWith(config.rpcUrl, config.fractionVaultId);
    expect(MortgagePoolClient).toHaveBeenCalledWith(config.rpcUrl, config.mortgagePoolId);
  });

  it('should have getter methods for each client', () => {
    const sdk = createPropFi(config);

    expect(typeof sdk.getComplianceRegistry).toBe('function');
    expect(typeof sdk.getPropertyRegistry).toBe('function');
    expect(typeof sdk.getFractionVault).toBe('function');
    expect(typeof sdk.getMortgagePool).toBe('function');

    expect(sdk.getComplianceRegistry()).toBe(sdk.complianceRegistry);
    expect(sdk.getPropertyRegistry()).toBe(sdk.propertyRegistry);
    expect(sdk.getFractionVault()).toBe(sdk.fractionVault);
    expect(sdk.getMortgagePool()).toBe(sdk.mortgagePool);
  });
});