import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '@/stores/userStore';

describe('userStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Remove cookie
    document.cookie = 'locked-in-tutorial-done=; path=/; max-age=0';
    // Reset store to initial state
    useUserStore.setState({
      walletAddress: null,
      walletAuthToken: null,
      displayName: null,
      avatarUrl: null,
      onboardingPhase: 'auth',
      createdAt: null,
      dungeonTourCompleted: false,
      tutorialCompleted: false,
      authToken: null,
      refreshToken: null,
    });
  });

  describe('setWallet', () => {
    it('sets walletAddress and transitions from auth to onboarding', () => {
      useUserStore.getState().setWallet('Wallet123');

      const state = useUserStore.getState();
      expect(state.walletAddress).toBe('Wallet123');
      expect(state.onboardingPhase).toBe('onboarding');
    });

    it('stores walletAuthToken and authToken if provided', () => {
      useUserStore.getState().setWallet('Wallet123', 'wal-token', 'auth-token', 'refresh-token');

      const state = useUserStore.getState();
      expect(state.walletAuthToken).toBe('wal-token');
      expect(state.authToken).toBe('auth-token');
      expect(state.refreshToken).toBe('refresh-token');
    });

    it('with different address resets display data', () => {
      useUserStore.getState().setWallet('Wallet123');
      useUserStore.getState().setDisplayName('Alice');
      useUserStore.getState().completeTutorial();

      // Switch wallet
      useUserStore.getState().setWallet('DifferentWallet');

      const state = useUserStore.getState();
      expect(state.walletAddress).toBe('DifferentWallet');
      expect(state.displayName).toBeNull();
      expect(state.tutorialCompleted).toBe(false);
    });

    it('does not reset data when same wallet is set again', () => {
      useUserStore.getState().setWallet('Wallet123');
      useUserStore.getState().setDisplayName('Alice');

      useUserStore.getState().setWallet('Wallet123');

      expect(useUserStore.getState().displayName).toBe('Alice');
    });

    it('does not downgrade onboardingPhase if already past onboarding', () => {
      useUserStore.getState().setWallet('Wallet123');
      useUserStore.getState().setOnboardingPhase('main');

      // Re-set same wallet
      useUserStore.getState().setWallet('Wallet123');

      expect(useUserStore.getState().onboardingPhase).toBe('main');
    });
  });

  describe('disconnect', () => {
    it('clears wallet and auth data', () => {
      useUserStore.getState().setWallet('Wallet123', 'wal', 'auth', 'refresh');
      useUserStore.getState().disconnect();

      const state = useUserStore.getState();
      expect(state.walletAddress).toBeNull();
      expect(state.walletAuthToken).toBeNull();
      expect(state.authToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.onboardingPhase).toBe('auth');
    });

    it('preserves tutorial flags', () => {
      useUserStore.getState().setWallet('Wallet123');
      useUserStore.setState({ tutorialCompleted: true, dungeonTourCompleted: true });
      useUserStore.getState().disconnect();

      const state = useUserStore.getState();
      expect(state.tutorialCompleted).toBe(true);
      expect(state.dungeonTourCompleted).toBe(true);
    });
  });

  describe('completeTutorial', () => {
    it('sets tutorialCompleted to true', () => {
      useUserStore.getState().completeTutorial();
      expect(useUserStore.getState().tutorialCompleted).toBe(true);
    });

    it('persists via Zustand store (no direct localStorage write)', () => {
      useUserStore.getState().completeTutorial();
      // Tutorial flag is persisted through Zustand persist middleware in 'locked-in-user' key,
      // not via a separate 'locked-in-tutorial-done' localStorage entry
      expect(useUserStore.getState().tutorialCompleted).toBe(true);
    });

    it('writes to cookie', () => {
      useUserStore.getState().completeTutorial();
      expect(document.cookie).toContain('locked-in-tutorial-done=1');
    });
  });

  describe('setAuthSession', () => {
    it('sets both tokens', () => {
      useUserStore.getState().setAuthSession('access123', 'refresh456');

      const state = useUserStore.getState();
      expect(state.authToken).toBe('access123');
      expect(state.refreshToken).toBe('refresh456');
    });

    it('can clear tokens with null', () => {
      useUserStore.getState().setAuthSession('access', 'refresh');
      useUserStore.getState().setAuthSession(null, null);

      const state = useUserStore.getState();
      expect(state.authToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });
  });

  describe('completeDungeonTour', () => {
    it('sets dungeonTourCompleted to true', () => {
      useUserStore.getState().completeDungeonTour();
      expect(useUserStore.getState().dungeonTourCompleted).toBe(true);
    });
  });

  describe('setOnboardingPhase', () => {
    it('updates onboardingPhase', () => {
      useUserStore.getState().setOnboardingPhase('main');
      expect(useUserStore.getState().onboardingPhase).toBe('main');
    });
  });

  describe('setDisplayName', () => {
    it('updates displayName', () => {
      useUserStore.getState().setDisplayName('TestUser');
      expect(useUserStore.getState().displayName).toBe('TestUser');
    });
  });

  describe('persist migration (v0 → v1)', () => {
    it('marks pre-existing users (stored version < 1) as having completed the dungeon tour', async () => {
      localStorage.setItem(
        'locked-in-user',
        JSON.stringify({
          state: {
            walletAddress: 'PreExistingWallet',
            walletAuthToken: null,
            displayName: 'Existing',
            avatarUrl: null,
            onboardingPhase: 'main',
            createdAt: '2025-01-01T00:00:00.000Z',
            tutorialCompleted: true,
            dungeonTourCompleted: false,
            authToken: null,
            refreshToken: null,
          },
          version: 0,
        }),
      );

      await useUserStore.persist.rehydrate();

      const state = useUserStore.getState();
      expect(state.dungeonTourCompleted).toBe(true);
      expect(state.walletAddress).toBe('PreExistingWallet');
      expect(state.tutorialCompleted).toBe(true);
    });

    it('also backfills pre-existing users whose persisted state lacks the field entirely', async () => {
      localStorage.setItem(
        'locked-in-user',
        JSON.stringify({
          state: {
            walletAddress: 'VeryOldWallet',
            onboardingPhase: 'main',
            tutorialCompleted: true,
          },
          version: 0,
        }),
      );

      await useUserStore.persist.rehydrate();

      expect(useUserStore.getState().dungeonTourCompleted).toBe(true);
    });

    it('leaves post-migration users (version 1) at whatever they persisted', async () => {
      localStorage.setItem(
        'locked-in-user',
        JSON.stringify({
          state: {
            walletAddress: 'NewUserWallet',
            walletAuthToken: null,
            displayName: null,
            avatarUrl: null,
            onboardingPhase: 'onboarding',
            createdAt: '2026-04-18T00:00:00.000Z',
            tutorialCompleted: false,
            dungeonTourCompleted: false,
            authToken: null,
            refreshToken: null,
          },
          version: 1,
        }),
      );

      await useUserStore.persist.rehydrate();

      expect(useUserStore.getState().dungeonTourCompleted).toBe(false);
    });
  });
});
