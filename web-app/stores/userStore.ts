import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { webStorageAdapter } from './storage';
import type { OnboardingPhase, UserProfile } from '@/types';

interface UserStore extends UserProfile {
  setWallet: (
    address: string,
    walletAuthToken?: string,
    authToken?: string,
    refreshToken?: string,
  ) => void;
  setAuthToken: (authToken: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setAuthSession: (authToken: string | null, refreshToken: string | null) => void;
  disconnect: () => void;
  setOnboardingPhase: (phase: OnboardingPhase) => void;
  setDisplayName: (name: string) => void;
  completeDungeonTour: () => void;
}

const initialState: UserProfile = {
  walletAddress: null,
  walletAuthToken: null,
  displayName: null,
  avatarUrl: null,
  onboardingPhase: 'auth',
  createdAt: null,
  dungeonTourCompleted: false,
  authToken: null,
  refreshToken: null,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...initialState,

      setWallet: (address, walletAuthToken, authToken, refreshToken) =>
        set((state) => ({
          ...(state.walletAddress && state.walletAddress !== address
            ? {
                onboardingPhase: 'onboarding',
                displayName: null,
                avatarUrl: null,
                createdAt: new Date().toISOString(),
              }
            : {
                // Any successful wallet connect should leave auth gate.
                onboardingPhase:
                  state.onboardingPhase === 'auth' ? 'onboarding' : state.onboardingPhase,
                createdAt: state.createdAt ?? new Date().toISOString(),
              }),
          walletAddress: address,
          walletAuthToken:
            state.walletAddress && state.walletAddress !== address
              ? walletAuthToken ?? null
              : walletAuthToken ?? state.walletAuthToken ?? null,
          authToken:
            state.walletAddress && state.walletAddress !== address
              ? authToken ?? null
              : authToken ?? state.authToken ?? null,
          refreshToken:
            state.walletAddress && state.walletAddress !== address
              ? refreshToken ?? null
              : refreshToken ?? state.refreshToken ?? null,
        })),

      setAuthToken: (authToken) => set({ authToken }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setAuthSession: (authToken, refreshToken) => set({ authToken, refreshToken }),

      disconnect: () => set(initialState),

      setOnboardingPhase: (phase) => set({ onboardingPhase: phase }),

      setDisplayName: (name) => set({ displayName: name }),

      completeDungeonTour: () => set({ dungeonTourCompleted: true }),
    }),
    {
      name: 'locked-in-user',
      storage: createJSONStorage(() => webStorageAdapter),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<UserStore>) };
        // Migrate legacy 'gauntlet' phase to 'main'
        if ((merged.onboardingPhase as string) === 'gauntlet') {
          merged.onboardingPhase = 'main';
        }
        return merged;
      },
    },
  ),
);
