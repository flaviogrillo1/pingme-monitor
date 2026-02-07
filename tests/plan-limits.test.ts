import { expect, beforeEach } from 'vitest';
import { enforcePlanLimits } from '@/lib/validators/monitors';

describe('enforcePlanLimits', () => {
  describe('FREE plan', () => {
    it('should allow creating first monitor', () => {
      const result = enforcePlanLimits('FREE', 0, 0, 360, 1);
      expect(result.allowed).toBe(true);
    });

    it('should allow creating second monitor', () => {
      const result = enforcePlanLimits('FREE', 1, 0, 360, 1);
      expect(result.allowed).toBe(true);
    });

    it('should reject creating third monitor', () => {
      const result = enforcePlanLimits('FREE', 2, 0, 360, 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maximum 2');
    });

    it('should reject interval below minimum', () => {
      const result = enforcePlanLimits('FREE', 0, 0, 30, 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('minimum interval');
    });

    it('should allow minimum interval', () => {
      const result = enforcePlanLimits('FREE', 0, 0, 360, 1);
      expect(result.allowed).toBe(true);
    });

    it('should reject more than 1 condition per monitor', () => {
      const result = enforcePlanLimits('FREE', 0, 0, 360, 2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maximum 1 conditions');
    });

    it('should allow exactly 1 condition', () => {
      const result = enforcePlanLimits('FREE', 0, 0, 360, 1);
      expect(result.allowed).toBe(true);
    });
  });

  describe('PRO plan', () => {
    it('should allow creating up to 20 monitors', () => {
      const result = enforcePlanLimits('PRO', 19, 0, 30, 2);
      expect(result.allowed).toBe(true);
    });

    it('should reject creating 21st monitor', () => {
      const result = enforcePlanLimits('PRO', 20, 0, 30, 2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maximum 20');
    });

    it('should reject interval below 30 minutes', () => {
      const result = enforcePlanLimits('PRO', 0, 0, 15, 1);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('minimum interval');
    });

    it('should allow 30 minute interval', () => {
      const result = enforcePlanLimits('PRO', 0, 0, 30, 1);
      expect(result.allowed).toBe(true);
    });

    it('should allow up to 2 conditions per monitor', () => {
      const result = enforcePlanLimits('PRO', 0, 0, 30, 2);
      expect(result.allowed).toBe(true);
    });

    it('should reject more than 2 conditions', () => {
      const result = enforcePlanLimits('PRO', 0, 0, 30, 3);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('maximum 2 conditions');
    });
  });
});
