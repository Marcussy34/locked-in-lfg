import type { NavigatorScreenParams } from '@react-navigation/native';

// --- Auth Stack ---
export type AuthStackParamList = {
  WalletConnect: undefined;
};

// --- Onboarding Stack ---
export type OnboardingStackParamList = {
  CourseSelection: undefined;
  Deposit: undefined;
  GauntletRoom: undefined;
};

// --- Main Stack (flat, dungeon-first) ---
export type MainStackParamList = {
  DungeonHome: undefined;
  CourseBrowser: undefined;
  Lesson: { lessonId: string; courseId: string };
  LessonResult: { lessonId: string; courseId: string; score: number; totalQuestions: number };
  FlameDashboard: undefined;
  Alchemy: undefined;
  Leaderboard: undefined;
  ProfileMenu: undefined;
};

// --- Root ---
export type RootParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  Main: NavigatorScreenParams<MainStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootParamList {}
  }
}
