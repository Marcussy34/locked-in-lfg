import { test, expect } from '../fixtures/auth.fixture';

/**
 * Responsive layout tests — the most valuable E2E tests.
 * Runs on all 3 viewport projects automatically via Playwright config.
 * Verifies that sidebar/bottom-nav visibility adapts to viewport.
 */

test.describe('Responsive layout', () => {
  test('desktop shows sidebar, hides bottom nav', async ({ authenticatedPage: page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth < 768) {
      test.skip();
      return;
    }

    await page.goto('/courses');
    await page.waitForSelector('h1', { timeout: 15_000 });

    // Desktop sidebar: fixed left nav, hidden md:flex — uses w-[240px]
    const sidebar = page.locator('nav.hidden.md\\:flex');
    await expect(sidebar).toBeVisible({ timeout: 5_000 });

    // Bottom nav should be hidden on desktop (md:hidden class)
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeHidden();
  });

  test('mobile shows bottom nav, hides sidebar', async ({ authenticatedPage: page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth >= 768) {
      test.skip();
      return;
    }

    await page.goto('/courses');
    await page.waitForSelector('h1', { timeout: 15_000 });

    // Bottom nav: fixed bottom-0, md:hidden — visible on mobile
    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible({ timeout: 5_000 });

    // Sidebar should be hidden on mobile (hidden md:flex)
    const sidebar = page.locator('nav.hidden.md\\:flex');
    await expect(sidebar).toBeHidden();
  });

  test('bottom nav contains expected tabs', async ({ authenticatedPage: page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth >= 768) {
      test.skip();
      return;
    }

    await page.goto('/courses');
    await page.waitForSelector('h1', { timeout: 15_000 });

    const bottomNav = page.locator('nav.md\\:hidden');
    await expect(bottomNav).toBeVisible();

    // Bottom nav has 5 tabs: Courses, Dashboard, Alchemy, Rewards, Profile
    await expect(bottomNav.getByText('Courses')).toBeVisible();
    await expect(bottomNav.getByText('Dashboard')).toBeVisible();
    await expect(bottomNav.getByText('Profile')).toBeVisible();
  });

  test('sidebar contains navigation groups', async ({ authenticatedPage: page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth < 768) {
      test.skip();
      return;
    }

    await page.goto('/courses');
    await page.waitForSelector('h1', { timeout: 15_000 });

    const sidebar = page.locator('nav.hidden.md\\:flex');
    await expect(sidebar).toBeVisible();

    // Sidebar shows LOCKED-IN brand
    await expect(sidebar.getByText('LOCKED-IN')).toBeVisible();

    // Has key nav items
    await expect(sidebar.getByText('Courses')).toBeVisible();
    await expect(sidebar.getByText('Dashboard')).toBeVisible();
    await expect(sidebar.getByText('Leaderboard')).toBeVisible();
    await expect(sidebar.getByText('Profile')).toBeVisible();
  });

  test('main content has left margin on desktop for sidebar', async ({ authenticatedPage: page }) => {
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (viewportWidth < 768) {
      test.skip();
      return;
    }

    await page.goto('/courses');
    await page.waitForSelector('h1', { timeout: 15_000 });

    // Main element should have margin for sidebar
    const main = page.locator('main');
    await expect(main).toBeVisible();
    const marginLeft = await main.evaluate((el) => getComputedStyle(el).marginLeft);
    expect(parseInt(marginLeft)).toBeGreaterThanOrEqual(200);
  });
});
