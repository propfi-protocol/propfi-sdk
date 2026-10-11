import { nativeToScVal } from '@stellar/stellar-sdk';
import { SorobanClient, type SorobanSigner } from './base';
import type { JurisdictionRules, TxOptions } from '../types';
import {
  validateAccountId,
  validateRequired,
  validateNumberRange,
  assertValid,
} from '../utils/validation';

export class ComplianceRegistryClient extends SorobanClient {
  constructor(rpcUrl: string, contractId: string) {
    super(rpcUrl, contractId);
  }

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

  async attest(
    user: string,
    proofHash: string,
    jurisdiction: string,
    durationDays: number,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(user, 'user'));
    assertValid(validateAccountId(user, 'user'));
    assertValid(validateRequired(proofHash, 'proofHash'));
    assertValid(validateRequired(jurisdiction, 'jurisdiction'));
    assertValid(validateRequired(durationDays, 'durationDays'));
    assertValid(validateNumberRange(durationDays, 1, 3650, 'durationDays'));
    return this.signAndSend(
      'attest',
      [
        nativeToScVal(user, { type: 'address' }),
        nativeToScVal(proofHash, { type: 'bytes' }),
        nativeToScVal(jurisdiction, { type: 'symbol' }),
        nativeToScVal(durationDays, { type: 'u64' }),
      ],
      signer,
      options
    );
  }

  async isCompliant(user: string, jurisdiction: string): Promise<boolean> {
    assertValid(validateRequired(user, 'user'));
    assertValid(validateAccountId(user, 'user'));
    assertValid(validateRequired(jurisdiction, 'jurisdiction'));
    const result = await this.simulateView('is_compliant', [
      nativeToScVal(user, { type: 'address' }),
      nativeToScVal(jurisdiction, { type: 'symbol' }),
    ]);
    return result as boolean;
  }

  async revoke(user: string, signer: SorobanSigner, options?: TxOptions): Promise<string> {
    assertValid(validateRequired(user, 'user'));
    assertValid(validateAccountId(user, 'user'));
    return this.signAndSend('revoke', [nativeToScVal(user, { type: 'address' })], signer, options);
  }

  async setJurisdictionRules(
    jurisdiction: string,
    rules: JurisdictionRules,
    signer: SorobanSigner,
    options?: TxOptions
  ): Promise<string> {
    assertValid(validateRequired(jurisdiction, 'jurisdiction'));
    assertValid(validateRequired(rules, 'rules'));
    assertValid(validateRequired(rules.min_attestation_days, 'min_attestation_days'));
    assertValid(validateNumberRange(rules.min_attestation_days, 1, 3650, 'min_attestation_days'));
    assertValid(validateRequired(rules.required_level, 'required_level'));
    assertValid(validateNumberRange(rules.required_level, 1, 5, 'required_level'));
    return this.signAndSend(
      'set_jurisdiction_rules',
      [
        nativeToScVal(jurisdiction, { type: 'symbol' }),
        nativeToScVal({
          min_attestation_days: rules.min_attestation_days,
          required_level: rules.required_level,
        }),
      ],
      signer,
      options
    );
  }

  async attestationExpiry(user: string): Promise<bigint> {
    assertValid(validateRequired(user, 'user'));
    assertValid(validateAccountId(user, 'user'));
    const result = await this.simulateView('attestation_expiry', [
      nativeToScVal(user, { type: 'address' }),
    ]);
    return BigInt(result as number);
  }
}
