import type { FlameState } from './flame';

export interface CourseGameState {
  // Lock
  lockAmount: number;
  lockDuration: 30 | 60 | 90;
  lockStartDate: string | null;
  extensionDays: number;

  // Gauntlet
  gauntletActive: boolean;
  gauntletDay: number; // 1-7, 0 if complete

  // Streak
  currentStreak: number;
  longestStreak: number;
  saverCount: number; // 0-3
  lastCompletedDate: string | null;
  todayCompleted: boolean;

  // Brew
  brewStatus: 'IDLE' | 'BREWING';
  brewModeId: string | null;
  brewStartedAt: string | null;
  brewEndsAt: string | null;
  ichorBalance: number;
  totalIchorProduced: number;

  // Yield
  yieldAccrued: number;
  yieldForfeited: number;
  apy: number;

  // Flame (visual state, derived from streak)
  flameState: FlameState;
  lightIntensity: number;
}

export const DEFAULT_COURSE_STATE: CourseGameState = {
  lockAmount: 0,
  lockDuration: 30,
  lockStartDate: null,
  extensionDays: 0,
  gauntletActive: true,
  gauntletDay: 1,
  currentStreak: 0,
  longestStreak: 0,
  saverCount: 0,
  lastCompletedDate: null,
  todayCompleted: false,
  brewStatus: 'IDLE',
  brewModeId: null,
  brewStartedAt: null,
  brewEndsAt: null,
  ichorBalance: 0,
  totalIchorProduced: 0,
  yieldAccrued: 0,
  yieldForfeited: 0,
  apy: 8.0,
  flameState: 'COLD',
  lightIntensity: 0.05,
};
