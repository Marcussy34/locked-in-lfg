import { describe, it, expect, beforeEach } from 'vitest';
import { useYieldStore } from '@/stores/yieldStore';

describe('yieldStore', () => {
  beforeEach(() => {
    useYieldStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts inactive with zero balances', () => {
      const state = useYieldStore.getState();
      expect(state.totalAccrued).toBe(0);
      expect(state.forfeited).toBe(0);
      expect(state.apy).toBe(8.0);
      expect(state.lockedAmount).toBe(0);
      expect(state.isActive).toBe(false);
    });
  });

  describe('setLockedAmount', () => {
    it('with positive amount sets isActive to true', () => {
      useYieldStore.getState().setLockedAmount(100);

      const state = useYieldStore.getState();
      expect(state.lockedAmount).toBe(100);
      expect(state.isActive).toBe(true);
    });

    it('with 0 sets isActive to false', () => {
      useYieldStore.getState().setLockedAmount(100);
      useYieldStore.getState().setLockedAmount(0);

      const state = useYieldStore.getState();
      expect(state.lockedAmount).toBe(0);
      expect(state.isActive).toBe(false);
    });
  });

  describe('calculateYield', () => {
    it('accrues daily yield based on lockedAmount and apy', () => {
      useYieldStore.getState().setLockedAmount(1000);
      useYieldStore.getState().calculateYield();

      const state = useYieldStore.getState();
      // dailyYield = 1000 * (8/100) / 365 ≈ 0.2192
      const expectedDailyYield = (1000 * (8 / 100)) / 365;
      expect(state.totalAccrued).toBeCloseTo(expectedDailyYield, 4);
    });

    it('does not accrue when inactive', () => {
      useYieldStore.getState().calculateYield();

      expect(useYieldStore.getState().totalAccrued).toBe(0);
    });

    it('does not accrue when lockedAmount is 0', () => {
      useYieldStore.setState({ isActive: true, lockedAmount: 0 });
      useYieldStore.getState().calculateYield();

      expect(useYieldStore.getState().totalAccrued).toBe(0);
    });

    it('accumulates over multiple calls', () => {
      useYieldStore.getState().setLockedAmount(1000);
      useYieldStore.getState().calculateYield();
      useYieldStore.getState().calculateYield();

      const expectedDailyYield = (1000 * (8 / 100)) / 365;
      expect(useYieldStore.getState().totalAccrued).toBeCloseTo(expectedDailyYield * 2, 4);
    });
  });

  describe('forfeit', () => {
    it('increases forfeited amount', () => {
      useYieldStore.getState().forfeit(10);
      expect(useYieldStore.getState().forfeited).toBe(10);
    });

    it('accumulates over multiple calls', () => {
      useYieldStore.getState().forfeit(10);
      useYieldStore.getState().forfeit(5);
      expect(useYieldStore.getState().forfeited).toBe(15);
    });
  });

  describe('getPenalty', () => {
    it('saverCount 0 returns tier 0, 0% redirect', () => {
      const penalty = useYieldStore.getState().getPenalty(0);
      expect(penalty.tier).toBe(0);
      expect(penalty.redirectPercent).toBe(0);
    });

    it('saverCount 1 returns tier 1, 10% redirect', () => {
      const penalty = useYieldStore.getState().getPenalty(1);
      expect(penalty.tier).toBe(1);
      expect(penalty.redirectPercent).toBe(10);
    });

    it('saverCount 2 returns tier 2, 20% redirect', () => {
      const penalty = useYieldStore.getState().getPenalty(2);
      expect(penalty.tier).toBe(2);
      expect(penalty.redirectPercent).toBe(20);
    });

    it('saverCount 3 returns tier 3, 100% redirect', () => {
      const penalty = useYieldStore.getState().getPenalty(3);
      expect(penalty.tier).toBe(3);
      expect(penalty.redirectPercent).toBe(100);
    });

    it('saverCount >= 4 returns tier 3, 100% redirect', () => {
      const penalty = useYieldStore.getState().getPenalty(4);
      expect(penalty.tier).toBe(3);
      expect(penalty.redirectPercent).toBe(100);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      useYieldStore.getState().setLockedAmount(500);
      useYieldStore.getState().calculateYield();
      useYieldStore.getState().forfeit(10);

      useYieldStore.getState().reset();

      const state = useYieldStore.getState();
      expect(state.totalAccrued).toBe(0);
      expect(state.forfeited).toBe(0);
      expect(state.lockedAmount).toBe(0);
      expect(state.isActive).toBe(false);
    });
  });
});
