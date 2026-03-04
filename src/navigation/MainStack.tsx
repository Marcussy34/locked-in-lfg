import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from './types';
import { UndergroundHubScreen } from '@/screens/main/UndergroundHubScreen';
import { CourseBrowserScreen } from '@/screens/main/CourseBrowserScreen';
import { LessonScreen } from '@/screens/main/LessonScreen';
import { LessonResultScreen } from '@/screens/main/LessonResultScreen';
import { FlameDashboardScreen } from '@/screens/main/FlameDashboardScreen';
import { AlchemyScreen } from '@/screens/main/AlchemyScreen';
import { LeaderboardScreen } from '@/screens/main/LeaderboardScreen';
import { useCourseStore } from '@/stores/courseStore';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  // Ensure mock data is loaded before determining initial screen
  useCourseStore.getState().initializeMockData();

  const activeCourseIds = useCourseStore((s) => s.activeCourseIds);
  const initialRoute = activeCourseIds.length > 0 ? 'DungeonHome' : 'CourseBrowser';

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen name="DungeonHome" component={UndergroundHubScreen} />
      <Stack.Screen
        name="CourseBrowser"
        component={CourseBrowserScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="LessonResult"
        component={LessonResultScreen}
        options={{ animation: 'fade' }}
      />
      <Stack.Screen
        name="FlameDashboard"
        component={FlameDashboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Alchemy"
        component={AlchemyScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
