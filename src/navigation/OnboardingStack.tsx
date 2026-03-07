import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from './types';
import { CourseSelectionScreen } from '@/screens/onboarding/CourseSelectionScreen';
import { DepositScreen } from '@/screens/onboarding/DepositScreen';
import { GauntletRoomScreen } from '@/screens/onboarding/GauntletRoomScreen';
import { useCourseStore } from '@/stores/courseStore';
import { useUserStore } from '@/stores';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingStack() {
  const phase = useUserStore((s) => s.onboardingPhase);
  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const courseStates = useCourseStore((s) => s.courseStates);
  const hasActiveGauntlet = activeCourseIds.some(
    (courseId) =>
      Boolean(courseStates[courseId]?.lockAccountAddress) &&
      courseStates[courseId]?.gauntletActive,
  );
  const initialRouteName =
    phase === 'gauntlet' || hasActiveGauntlet ? 'GauntletRoom' : 'CourseSelection';

  return (
    <Stack.Navigator
      key={initialRouteName}
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="CourseSelection" component={CourseSelectionScreen} />
      <Stack.Screen name="Deposit" component={DepositScreen} />
      <Stack.Screen name="GauntletRoom" component={GauntletRoomScreen} />
    </Stack.Navigator>
  );
}
