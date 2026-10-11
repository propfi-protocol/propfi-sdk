import { nativeToScVal } from '@stellar/stellar-sdk';
import { SorobanClient, type SorobanSigner } from './base';
import type { FractionInfo, TxOptions } from '../types';
import {
  validateAccountId,
  validateContractId,
  validatePositiveBigInt,
  validateRequired,
  assertValid,
} from '../utils/validation';

/**
 * Client for interacting with the FractionVault contract.
 * Manages property fractionalization, fraction trading, and rent distribution.
 */
export class FractionVaultClient extends SorobanClient {
  /**
   * Create a new FractionVaultClient.
   * @param rpcUrl - RPC endpoint URL
   * @param contractId - FractionVault contract ID
   */
  constructor(rpcUrl: string, contractId: string) {
    super(rpcUrl, contractId);
  }

  /**
   * Initialize the fraction vault with an admin.
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
   * Fractionalize a property into tradable fractions.
   * @param propId - Property ID to fractionalize
   * @param totalSupply - Total fraction supply in base units
   * @param price - Price per fraction in base units
   * @param paymentToken - Payment token contract address
   * @param propertyRegistry - Property registry contract address
   * @param complianceRegistry - Compliance registry contract address
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async fractionalize(
    propId: number,
    totalSupply: bigint,
    price: bigint,
    paymentToken: string,
    propertyRegistry: string,
    complianceRegistry: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(totalSupply, 'totalSupply'));
    assertValid(validatePositiveBigInt(totalSupply, 'totalSupply'));
    assertValid(validateRequired(price, 'price'));
    assertValid(validatePositiveBigInt(price, 'price'));
    assertValid(validateRequired(paymentToken, 'paymentToken'));
    assertValid(validateContractId(paymentToken, 'paymentToken'));
    assertValid(validateRequired(propertyRegistry, 'propertyRegistry'));
    assertValid(validateContractId(propertyRegistry, 'propertyRegistry'));
    assertValid(validateRequired(complianceRegistry, 'complianceRegistry'));
    assertValid(validateContractId(complianceRegistry, 'complianceRegistry'));
    return this.signAndSend(
      'fractionalize',
      [
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(totalSupply, { type: 'u128' }),
        nativeToScVal(price, { type: 'i128' }),
        nativeToScVal(paymentToken, { type: 'address' }),
        nativeToScVal(propertyRegistry, { type: 'address' }),
        nativeToScVal(complianceRegistry, { type: 'address' }),
      ],
      signer,
      options
    );
  }

  /**
   * Buy fractions of a property.
   * @param buyer - Buyer account address
   * @param propId - Property ID
   * @param amount - Amount of fractions to buy in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async buyFraction(
    buyer: string,
    propId: number,
    amount: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(buyer, 'buyer'));
    assertValid(validateAccountId(buyer, 'buyer'));
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    return this.signAndSend(
      'buy_fraction',
      [
        nativeToScVal(buyer, { type: 'address' }),
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(amount, { type: 'u128' }),
      ],
      signer,
      options
    );
  }

  /**
   * Sell fractions of a property.
   * @param seller - Seller account address
   * @param propId - Property ID
   * @param amount - Amount of fractions to sell in base units
   * @param minPrice - Minimum price per fraction in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async sellFraction(
    seller: string,
    propId: number,
    amount: bigint,
    minPrice: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(seller, 'seller'));
    assertValid(validateAccountId(seller, 'seller'));
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    assertValid(validateRequired(minPrice, 'minPrice'));
    assertValid(validatePositiveBigInt(minPrice, 'minPrice'));
    return this.signAndSend(
      'sell_fraction',
      [
        nativeToScVal(seller, { type: 'address' }),
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(amount, { type: 'u128' }),
        nativeToScVal(minPrice, { type: 'i128' }),
      ],
      signer,
      options
    );
  }

  /**
   * Get the fraction balance of an investor for a property.
   * @param investor - Investor account address
   * @param propId - Property ID
   * @returns Fraction balance in base units
   */
  async getBalance(investor: string, propId: number): Promise<bigint> {
    assertValid(validateRequired(investor, 'investor'));
    assertValid(validateAccountId(investor, 'investor'));
    assertValid(validateRequired(propId, 'propId'));
    const result = await this.simulateView('get_balance', [
      nativeToScVal(investor, { type: 'address' }),
      nativeToScVal(propId, { type: 'u64' }),
    ]);
    return BigInt(result as number);
  }

  /**
   * Get the total number of fraction holders for a property.
   * @param propId - Property ID
   * @returns Number of holders
   */
  async totalHolders(propId: number): Promise<number> {
    assertValid(validateRequired(propId, 'propId'));
    const result = await this.simulateView('total_holders', [
      nativeToScVal(propId, { type: 'u64' }),
    ]);
    return result as number;
  }

  /**
   * Get fraction info for a property.
   * @param propId - Property ID
   * @returns Fraction info including supply, price, and registry addresses
   */
  async getFractionInfo(propId: number): Promise<FractionInfo> {
    assertValid(validateRequired(propId, 'propId'));
    const result = await this.simulateView('get_fraction_info', [
      nativeToScVal(propId, { type: 'u64' }),
    ]);
    const arr = result as any[];
    return {
      total_supply: BigInt(arr[0]),
      price: BigInt(arr[1]),
      payment_token: arr[2] as string,
      property_registry: arr[3] as string,
      compliance_registry: arr[4] as string,
    };
  }

  /**
   * Set the rent distributor address.
   * @param distributor - Distributor account address
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async setRentDistributor(
    distributor: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(distributor, 'distributor'));
    assertValid(validateAccountId(distributor, 'distributor'));
    return this.signAndSend(
      'set_rent_distributor',
      [nativeToScVal(distributor, { type: 'address' })],
      signer,
      options
    );
  }
}
