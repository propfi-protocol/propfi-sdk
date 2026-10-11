import { nativeToScVal } from '@stellar/stellar-sdk';
import { SorobanClient, type SorobanSigner } from './base';
import type { PropertyData, PropertyStatus, TxOptions } from '../types';
import {
  validateAccountId,
  validateContractId,
  validatePositiveBigInt,
  validateRequired,
  assertValid,
} from '../utils/validation';

/**
 * Client for interacting with the PropertyRegistry contract.
 * Manages property registration, ownership, valuations, and status.
 */
export class PropertyRegistryClient extends SorobanClient {
  /**
   * Create a new PropertyRegistryClient.
   * @param rpcUrl - RPC endpoint URL
   * @param contractId - PropertyRegistry contract ID
   */
  constructor(rpcUrl: string, contractId: string) {
    super(rpcUrl, contractId);
  }

  /**
   * Initialize the property registry with an admin.
   * @param admin - Admin account address
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async initialize(admin: string, signer: SorobanSigner, options?: TxOptions): Promise<string> {
    assertValid(validateRequired(admin, 'admin'));
    assertValid(validateAccountId(admin, 'admin'));
    return this.signAndSend(
      'initialize',
      [nativeToScVal(admin, { type: 'address' })],
      signer,
      options
    );
  }

  /**
   * Register a new property in the registry.
   * @param owner - Property owner address
   * @param valuation - Initial property valuation in base units
   * @param docHash - Hash of property documentation
   * @param jurisdiction - Legal jurisdiction symbol
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async registerProperty(
    owner: string,
    valuation: bigint,
    docHash: string,
    jurisdiction: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(owner, 'owner'));
    assertValid(validateAccountId(owner, 'owner'));
    assertValid(validateRequired(valuation, 'valuation'));
    assertValid(validatePositiveBigInt(valuation, 'valuation'));
    assertValid(validateRequired(docHash, 'docHash'));
    assertValid(validateRequired(jurisdiction, 'jurisdiction'));
    return this.signAndSend(
      'register_property',
      [
        nativeToScVal(owner, { type: 'address' }),
        nativeToScVal(valuation, { type: 'i128' }),
        nativeToScVal(docHash, { type: 'bytes' }),
        nativeToScVal(jurisdiction, { type: 'symbol' }),
      ],
      signer,
      options
    );
  }

  /**
   * Update the valuation of a property.
   * @param propId - Property ID
   * @param newVal - New valuation in base units
   * @param oracleContract - Oracle contract address
   * @param asset - Asset symbol for the valuation
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async updateValuation(
    propId: number,
    newVal: bigint,
    oracleContract: string,
    asset: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(newVal, 'newVal'));
    assertValid(validatePositiveBigInt(newVal, 'newVal'));
    assertValid(validateRequired(oracleContract, 'oracleContract'));
    assertValid(validateContractId(oracleContract, 'oracleContract'));
    assertValid(validateRequired(asset, 'asset'));
    return this.signAndSend(
      'update_valuation',
      [
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(newVal, { type: 'i128' }),
        nativeToScVal(oracleContract, { type: 'address' }),
        nativeToScVal(asset, { type: 'symbol' }),
      ],
      signer,
      options
    );
  }

  /**
   * Transfer ownership of a property.
   * @param propId - Property ID
   * @param to - New owner address
   * @param complianceContract - Compliance registry contract address
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async transferOwnership(
    propId: number,
    to: string,
    complianceContract: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(to, 'to'));
    assertValid(validateAccountId(to, 'to'));
    assertValid(validateRequired(complianceContract, 'complianceContract'));
    assertValid(validateContractId(complianceContract, 'complianceContract'));
    return this.signAndSend(
      'transfer_ownership',
      [
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(to, { type: 'address' }),
        nativeToScVal(complianceContract, { type: 'address' }),
      ],
      signer,
      options
    );
  }

  /**
   * Get property data by ID.
   * @param propId - Property ID
   * @returns Property data
   */
  async getProperty(propId: number): Promise<PropertyData> {
    assertValid(validateRequired(propId, 'propId'));
    const result = await this.simulateView('get_property', [
      nativeToScVal(propId, { type: 'u64' }),
    ]);
    return result as PropertyData;
  }

  /**
   * Set the status of a property.
   * @param propId - Property ID
   * @param status - New property status
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async setStatus(
    propId: number,
    status: PropertyStatus,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(status, 'status'));
    return this.signAndSend(
      'set_status',
      [nativeToScVal(propId, { type: 'u64' }), nativeToScVal(status, { type: 'symbol' })],
      signer,
      options
    );
  }

  /**
   * Get the jurisdiction of a property.
   * @param propId - Property ID
   * @returns Jurisdiction symbol
   */
  async getPropertyJurisdiction(propId: number): Promise<string> {
    assertValid(validateRequired(propId, 'propId'));
    const result = await this.simulateView('get_property_jurisdiction', [
      nativeToScVal(propId, { type: 'u64' }),
    ]);
    return result as string;
  }
}
