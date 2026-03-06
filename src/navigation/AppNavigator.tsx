import { useUserStore } from '@/stores';
import { AuthStack } from './AuthStack';
import { OnboardingStack } from './OnboardingStack';
import { MainStack } from './MainStack';

export function AppNavigator() {
  const phase = useUserStore((s) => s.onboardingPhase);
  const walletAddress = useUserStore((s) => s.walletAddress);
  const walletAuthToken = useUserStore((s) => s.walletAuthToken);

  // Hard auth gate: main/onboarding screens require a cached wallet session.
  if (!walletAddress || !walletAuthToken) {
    return <AuthStack />;
  }

  switch (phase) {
    case 'auth':
      return <AuthStack />;
    case 'onboarding':
    case 'gauntlet':
      return <OnboardingStack />;
    case 'main':
      return <MainStack />;
  }
}
