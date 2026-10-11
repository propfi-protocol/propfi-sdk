import { nativeToScVal } from '@stellar/stellar-sdk';
import { SorobanClient, type SorobanSigner } from './base';
import type { HealthFactor, TxOptions } from '../types';
import {
  validateAccountId,
  validateContractId,
  validatePositiveBigInt,
  validateRequired,
  assertValid,
} from '../utils/validation';

/**
 * Client for interacting with the MortgagePool contract.
 * Manages lending, borrowing, liquidity provision, and loan health.
 */
export class MortgagePoolClient extends SorobanClient {
  /**
   * Create a new MortgagePoolClient.
   * @param rpcUrl - RPC endpoint URL
   * @param contractId - MortgagePool contract ID
   */
  constructor(rpcUrl: string, contractId: string) {
    super(rpcUrl, contractId);
  }

  /**
   * Initialize the mortgage pool.
   * @param admin - Admin account address
   * @param token - Lending token contract address
   * @param propertyReg - Property registry contract address
   * @param oracle - Oracle contract address
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async initialize(
    admin: string,
    token: string,
    propertyReg: string,
    oracle: string,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(admin, 'admin'));
    assertValid(validateAccountId(admin, 'admin'));
    assertValid(validateRequired(token, 'token'));
    assertValid(validateContractId(token, 'token'));
    assertValid(validateRequired(propertyReg, 'propertyReg'));
    assertValid(validateContractId(propertyReg, 'propertyReg'));
    assertValid(validateRequired(oracle, 'oracle'));
    assertValid(validateContractId(oracle, 'oracle'));
    return this.signAndSend(
      'initialize',
      [
        nativeToScVal(admin, { type: 'address' }),
        nativeToScVal(token, { type: 'address' }),
        nativeToScVal(propertyReg, { type: 'address' }),
        nativeToScVal(oracle, { type: 'address' }),
      ],
      signer,
      options
    );
  }

  /**
   * Open a new loan against a property.
   * @param borrower - Borrower account address
   * @param propId - Property ID to use as collateral
   * @param amount - Loan amount in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async openLoan(
    borrower: string,
    propId: number,
    amount: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(borrower, 'borrower'));
    assertValid(validateAccountId(borrower, 'borrower'));
    assertValid(validateRequired(propId, 'propId'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    return this.signAndSend(
      'open_loan',
      [
        nativeToScVal(borrower, { type: 'address' }),
        nativeToScVal(propId, { type: 'u64' }),
        nativeToScVal(amount, { type: 'i128' }),
      ],
      signer,
      options
    );
  }

  /**
   * Repay a loan.
   * @param borrower - Borrower account address
   * @param loanId - Loan ID to repay
   * @param amount - Repayment amount in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async repay(
    borrower: string,
    loanId: number,
    amount: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(borrower, 'borrower'));
    assertValid(validateAccountId(borrower, 'borrower'));
    assertValid(validateRequired(loanId, 'loanId'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    return this.signAndSend(
      'repay',
      [
        nativeToScVal(borrower, { type: 'address' }),
        nativeToScVal(loanId, { type: 'u64' }),
        nativeToScVal(amount, { type: 'i128' }),
      ],
      signer,
      options
    );
  }

  /**
   * Liquidate an undercollateralized loan.
   * @param liquidator - Liquidator account address
   * @param loanId - Loan ID to liquidate
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async liquidate(
    liquidator: string,
    loanId: number,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(liquidator, 'liquidator'));
    assertValid(validateAccountId(liquidator, 'liquidator'));
    assertValid(validateRequired(loanId, 'loanId'));
    return this.signAndSend(
      'liquidate',
      [nativeToScVal(liquidator, { type: 'address' }), nativeToScVal(loanId, { type: 'u64' })],
      signer,
      options
    );
  }

  /**
   * Deposit liquidity into the pool.
   * @param lp - Liquidity provider account address
   * @param amount - Amount to deposit in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async depositLiquidity(
    lp: string,
    amount: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(lp, 'lp'));
    assertValid(validateAccountId(lp, 'lp'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    return this.signAndSend(
      'deposit_liquidity',
      [nativeToScVal(lp, { type: 'address' }), nativeToScVal(amount, { type: 'i128' })],
      signer,
      options
    );
  }

  /**
   * Withdraw liquidity from the pool.
   * @param lp - Liquidity provider account address
   * @param amount - Amount to withdraw in base units
   * @param signer - Signer to authorize the transaction
   * @param options - Transaction options
   * @returns Transaction hash
   */
  async withdrawLiquidity(
    lp: string,
    amount: bigint,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(lp, 'lp'));
    assertValid(validateAccountId(lp, 'lp'));
    assertValid(validateRequired(amount, 'amount'));
    assertValid(validatePositiveBigInt(amount, 'amount'));
    return this.signAndSend(
      'withdraw_liquidity',
      [nativeToScVal(lp, { type: 'address' }), nativeToScVal(amount, { type: 'i128' })],
      signer,
      options
    );
  }

  /**
   * Get the health factor of a loan.
   * @param loanId - Loan ID
   * @returns Health factor with ratio and health status
   */
  async loanHealth(loanId: number): Promise<HealthFactor> {
    assertValid(validateRequired(loanId, 'loanId'));
    const result = await this.simulateView('loan_health', [nativeToScVal(loanId, { type: 'u64' })]);
    return result as HealthFactor;
  }
}
