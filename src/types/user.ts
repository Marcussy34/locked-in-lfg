export type OnboardingPhase = 'auth' | 'onboarding' | 'gauntlet' | 'main';

export interface UserProfile {
  walletAddress: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  onboardingPhase: OnboardingPhase;
  createdAt: string | null;
  gauntletStartDate: string | null;
  gauntletCompleted: boolean;
  /** MWA auth token for session reuse (auto-reconnect) */
  authToken: string | null;
}
