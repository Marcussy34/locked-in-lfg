import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { asyncStorageAdapter } from './storage';
import type { OnboardingPhase, UserProfile } from '@/types';

interface UserStore extends UserProfile {
  setWallet: (address: string, authToken?: string) => void;
  disconnect: () => void;
  setOnboardingPhase: (phase: OnboardingPhase) => void;
  setDisplayName: (name: string) => void;
  completeGauntlet: () => void;
}

const initialState: UserProfile = {
  walletAddress: null,
  displayName: null,
  avatarUrl: null,
  onboardingPhase: 'auth',
  createdAt: null,
  gauntletStartDate: null,
  gauntletCompleted: false,
  authToken: null,
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      ...initialState,

      setWallet: (address, authToken) =>
        set({
          walletAddress: address,
          authToken: authToken ?? null,
          onboardingPhase: 'onboarding',
          createdAt: new Date().toISOString(),
        }),

      disconnect: () => set(initialState),

      setOnboardingPhase: (phase) => set({ onboardingPhase: phase }),

      setDisplayName: (name) => set({ displayName: name }),

      completeGauntlet: () =>
        set({ gauntletCompleted: true, onboardingPhase: 'main' }),
    }),
    {
      name: 'locked-in-user',
      storage: createJSONStorage(() => asyncStorageAdapter),
    },
  ),
);
