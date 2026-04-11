import { describe, it, expect, beforeEach } from 'vitest';
import { useFlameStore } from '@/stores/flameStore';

describe('flameStore', () => {
  beforeEach(() => {
    useFlameStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts in COLD state', () => {
      const state = useFlameStore.getState();
      expect(state.flameState).toBe('COLD');
      expect(state.fuelRemaining).toBe(0);
      expect(state.lightIntensity).toBe(0.15);
    });
  });

  describe('updateFromStreak', () => {
    it('streak 0 results in COLD state', () => {
      useFlameStore.getState().updateFromStreak(0);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('COLD');
      expect(state.lightIntensity).toBe(0.15);
    });

    it('streak 1 results in LIT state', () => {
      useFlameStore.getState().updateFromStreak(1);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('LIT');
      expect(state.lightIntensity).toBe(0.6);
    });

    it('streak 2 results in LIT state', () => {
      useFlameStore.getState().updateFromStreak(2);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('LIT');
      expect(state.lightIntensity).toBe(0.6);
    });

    it('streak 3 results in BURNING state', () => {
      useFlameStore.getState().updateFromStreak(3);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('BURNING');
      expect(state.lightIntensity).toBe(1.0);
    });

    it('streak 10 results in BURNING state', () => {
      useFlameStore.getState().updateFromStreak(10);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('BURNING');
      expect(state.lightIntensity).toBe(1.0);
    });

    it('stores streak as fuelRemaining for backward compat', () => {
      useFlameStore.getState().updateFromStreak(5);
      expect(useFlameStore.getState().fuelRemaining).toBe(5);
    });
  });

  describe('feedFlame', () => {
    it('adds fuel and transitions from COLD to LIT', () => {
      useFlameStore.getState().feedFlame(1);

      const state = useFlameStore.getState();
      expect(state.fuelRemaining).toBe(1);
      expect(state.flameState).toBe('LIT');
    });

    it('transitions from LIT to BURNING at fuel >= 3', () => {
      useFlameStore.getState().feedFlame(3);

      const state = useFlameStore.getState();
      expect(state.fuelRemaining).toBe(3);
      expect(state.flameState).toBe('BURNING');
    });

    it('negative fuel decreases fuelRemaining', () => {
      useFlameStore.getState().feedFlame(5);
      useFlameStore.getState().feedFlame(-3);

      const state = useFlameStore.getState();
      expect(state.fuelRemaining).toBe(2);
      expect(state.flameState).toBe('LIT');
    });

    it('fuel does not go below 0', () => {
      useFlameStore.getState().feedFlame(-10);

      const state = useFlameStore.getState();
      expect(state.fuelRemaining).toBe(0);
      expect(state.flameState).toBe('COLD');
    });

    it('transitions from BURNING to COLD when all fuel removed', () => {
      useFlameStore.getState().feedFlame(5);
      useFlameStore.getState().feedFlame(-5);

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('COLD');
      expect(state.lightIntensity).toBe(0.15);
    });

    it('sets lastTickAt timestamp', () => {
      useFlameStore.getState().feedFlame(1);
      expect(useFlameStore.getState().lastTickAt).not.toBeNull();
    });
  });

  describe('getLightIntensity', () => {
    it('returns current lightIntensity', () => {
      useFlameStore.getState().updateFromStreak(3);
      expect(useFlameStore.getState().getLightIntensity()).toBe(1.0);
    });
  });

  describe('reset', () => {
    it('returns to initial state', () => {
      useFlameStore.getState().feedFlame(5);
      useFlameStore.getState().reset();

      const state = useFlameStore.getState();
      expect(state.flameState).toBe('COLD');
      expect(state.fuelRemaining).toBe(0);
      expect(state.lightIntensity).toBe(0.15);
      expect(state.lastTickAt).toBeNull();
    });
  });
});
