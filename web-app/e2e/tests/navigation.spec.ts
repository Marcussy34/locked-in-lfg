import { test, expect } from '../fixtures/auth.fixture';

/**
 * Navigation tests — verifies that nav links work correctly.
 * Uses authenticated fixture since nav is only shown for authenticated users.
 */

test.describe('Navigation', () => {
  test.describe('Bottom nav (mobile)', () => {
    test('navigates to Dashboard via bottom nav', async ({ authenticatedPage: page }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      if (viewportWidth >= 768) {
        test.skip();
        return;
      }

      await page.goto('/courses');
      await page.waitForSelector('h1', { timeout: 15_000 });

      const bottomNav = page.locator('nav.md\\:hidden');
      await expect(bottomNav).toBeVisible();

      await bottomNav.getByText('Dashboard').click();
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      expect(page.url()).toContain('/dashboard');
    });

    test('navigates to Profile via bottom nav', async ({ authenticatedPage: page }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      if (viewportWidth >= 768) {
        test.skip();
        return;
      }

      await page.goto('/courses');
      await page.waitForSelector('h1', { timeout: 15_000 });

      const bottomNav = page.locator('nav.md\\:hidden');
      await bottomNav.getByText('Profile').click();
      await page.waitForURL('**/profile', { timeout: 10_000 });
      expect(page.url()).toContain('/profile');
    });
  });

  test.describe('Sidebar (desktop)', () => {
    test('navigates to Leaderboard via sidebar', async ({ authenticatedPage: page }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      if (viewportWidth < 768) {
        test.skip();
        return;
      }

      await page.goto('/courses');
      await page.waitForSelector('h1', { timeout: 15_000 });

      const sidebar = page.locator('nav.hidden.md\\:flex');
      await expect(sidebar).toBeVisible();

      await sidebar.getByText('Leaderboard').click();
      await page.waitForURL('**/leaderboard', { timeout: 10_000 });
      expect(page.url()).toContain('/leaderboard');
    });

    test('navigates to Dashboard via sidebar', async ({ authenticatedPage: page }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      if (viewportWidth < 768) {
        test.skip();
        return;
      }

      await page.goto('/courses');
      await page.waitForSelector('h1', { timeout: 15_000 });

      const sidebar = page.locator('nav.hidden.md\\:flex');
      await sidebar.getByText('Dashboard').click();
      await page.waitForURL('**/dashboard', { timeout: 10_000 });
      expect(page.url()).toContain('/dashboard');
    });

    test('navigates to Profile via sidebar', async ({ authenticatedPage: page }) => {
      const viewportWidth = page.viewportSize()?.width ?? 0;
      if (viewportWidth < 768) {
        test.skip();
        return;
      }

      await page.goto('/courses');
      await page.waitForSelector('h1', { timeout: 15_000 });

      const sidebar = page.locator('nav.hidden.md\\:flex');
      await sidebar.getByText('Profile').click();
      await page.waitForURL('**/profile', { timeout: 10_000 });
      expect(page.url()).toContain('/profile');
    });
  });
});
