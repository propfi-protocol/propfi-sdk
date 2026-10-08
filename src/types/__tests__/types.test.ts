import { describe, it, expect } from 'vitest';
import { PropertyStatus, LoanStatus } from '../../types';

describe('Types', () => {
  describe('PropertyStatus', () => {
    it('should have correct enum values', () => {
      expect(PropertyStatus.Active).toBe('Active');
      expect(PropertyStatus.Inactive).toBe('Inactive');
      expect(PropertyStatus.UnderMaintenance).toBe('UnderMaintenance');
    });
  });

  describe('LoanStatus', () => {
    it('should have correct enum values', () => {
      expect(LoanStatus.Active).toBe('Active');
      expect(LoanStatus.Repaid).toBe('Repaid');
      expect(LoanStatus.Liquidated).toBe('Liquidated');
    });
  });
});