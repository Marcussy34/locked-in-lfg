import { test as base, type Page } from '@playwright/test';

/**
 * Authenticated page fixture.
 *
 * Seeds localStorage with Zustand persisted state (user + course stores)
 * and handles Privy SDK by keeping it in a loading state (never resolving
 * API calls), which prevents the cleanup effect from wiping seeded auth state.
 *
 * The flow guard checks walletAddress from userStore and isAuthenticated
 * (!!accessToken), both of which are seeded via localStorage.
 */
interface AuthFixtures {
  authenticatedPage: Page;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Zustand persist wraps state in { state: {...}, version: 0 }
    const userState = {
      state: {
        walletAddress: 'TestWa11etAddress1111111111111111111111111',
        walletAuthToken: 'mock-wallet-auth-token',
        displayName: 'Test User',
        avatarUrl: null,
        onboardingPhase: 'main' as const,
        createdAt: '2025-01-01T00:00:00.000Z',
        dungeonTourCompleted: true,
        tutorialCompleted: true,
        authToken: 'mock-jwt-access-token',
        refreshToken: 'mock-jwt-refresh-token',
      },
      version: 0,
    };

    const courseState = {
      state: {
        courses: [
          {
            id: 'solana-101',
            title: 'Solana 101',
            description: 'Learn the fundamentals of Solana development',
            totalLessons: 10,
            totalModules: 3,
            difficulty: 'beginner',
            category: 'solana',
            completedLessons: 3,
          },
        ],
        modules: {},
        lessons: {
          'solana-101': [
            { id: 'lesson-1', courseId: 'solana-101', title: 'Introduction', order: 1, moduleId: 'mod-1' },
            { id: 'lesson-2', courseId: 'solana-101', title: 'Accounts', order: 2, moduleId: 'mod-1' },
            { id: 'lesson-3', courseId: 'solana-101', title: 'Transactions', order: 3, moduleId: 'mod-1' },
          ],
        },
        lessonProgress: {},
        enrolledCourseIds: ['solana-101'],
        activeCourseId: 'solana-101',
        activeCourseIds: ['solana-101'],
        courseStates: {
          'solana-101': {
            lockAccountAddress: 'LockAcct1111111111111111111111111111111111',
            lockAmount: 50,
            lockDuration: 30,
            extensionDays: 0,
            lockStartDate: '2025-01-01T00:00:00.000Z',
            currentStreak: 5,
            longestStreak: 7,
            saverCount: 0,
            fuelCounter: 3,
            fuelCap: 7,
            fuelFragmentsToday: 0.4,
            ichorBalance: 12,
          },
        },
        contentReleaseId: '1',
        contentPublishedAt: '2025-01-01T00:00:00.000Z',
        contentLoading: false,
        contentError: null,
        contentInitialized: true,
        boundWalletAddress: 'TestWa11etAddress1111111111111111111111111',
      },
      version: 0,
    };

    await page.addInitScript((data) => {
      // Skip the animated splash screen
      sessionStorage.setItem('splash-shown', '1');
      // Seed Zustand persisted stores
      localStorage.setItem('locked-in-user', JSON.stringify(data.userState));
      localStorage.setItem('locked-in-courses', JSON.stringify(data.courseState));
      // Tutorial completion flag
      localStorage.setItem('locked-in-tutorial-done', '1');
      // Auth cookie for server-side checks
      document.cookie = 'locked-in-auth=1; path=/; max-age=604800; samesite=lax';
      document.cookie = 'locked-in-tutorial-done=1; path=/; max-age=31536000; samesite=lax';
    }, { userState, courseState });

    // CRITICAL: Keep Privy in loading state by never resolving its API calls.
    // This prevents the useAuth cleanup effect from detecting "privy not
    // authenticated" and wiping the seeded localStorage state.
    await page.route('**/api.privy.io/**', () => {
      // Intentionally never respond — Privy SDK stays in "loading" state
    });

    // Mock backend API calls
    await page.route('**/localhost:3001/**', (route) => {
      const url = route.request().url();
      if (url.includes('/health')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
      } else if (url.includes('/v1/courses')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'solana-101', title: 'Solana 101', description: 'Learn Solana fundamentals', totalLessons: 10, totalModules: 3, difficulty: 'beginner', category: 'solana' },
          ]),
        });
      } else if (url.includes('/v1/content/version')) {
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ releaseId: '1' }) });
      } else if (url.includes('/v1/progress/enrollments')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ enrollments: [{ courseId: 'solana-101', runtime: { currentStreak: 5 } }] }),
        });
      } else if (url.includes('/v1/progress/xp')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ xpTotal: 750, xpLevel: 2, levelThresholds: [0, 500, 1500, 3500, 7000, 12000, 20000] }),
        });
      } else if (url.includes('/v1/progress/leaderboard')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries: [
              { rank: 1, walletAddress: 'Wallet111', displayName: 'Alice', xpTotal: 2000, currentStreak: 10 },
              { rank: 2, walletAddress: 'Wallet222', displayName: 'Bob', xpTotal: 1500, currentStreak: 7 },
            ],
            totalEntries: 2,
            page: 1,
            pageSize: 10,
          }),
        });
      } else if (url.includes('/v1/progress/yield-history')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ totalGrossYieldUi: '1.2345', totalRedirectedUi: '0.1000', totalPlatformFeeUi: '0.0500' }),
        });
      } else {
        route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      }
    });

    await use(page);
  },
});

export { expect } from '@playwright/test';
