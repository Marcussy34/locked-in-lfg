import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from './storage';
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
  startGauntlet: () => void;
  completeGauntlet: () => void;
}

const initialState: UserProfile = {
  walletAddress: null,
  walletAuthToken: null,
  displayName: null,
  avatarUrl: null,
  onboardingPhase: 'auth',
  createdAt: null,
  gauntletStartDate: null,
  gauntletCompleted: false,
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
                gauntletCompleted: false,
                gauntletStartDate: null,
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

      startGauntlet: () =>
        set((state) => ({
          onboardingPhase: 'gauntlet',
          gauntletStartDate: state.gauntletStartDate ?? new Date().toISOString(),
        })),

      completeGauntlet: () =>
        set({ gauntletCompleted: true, onboardingPhase: 'main' }),
    }),
    {
      name: 'locked-in-user',
      storage: createJSONStorage(() => asyncStorageAdapter),
    },
  ),
);
