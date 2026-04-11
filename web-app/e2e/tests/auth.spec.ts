import { test, expect } from '@playwright/test';

/**
 * Auth flow tests — verifies access control.
 *
 * The app uses a flow guard (AppShell):
 * - PUBLIC_ROUTES: /, /courses — accessible without auth
 * - Protected routes redirect to /courses when unauthenticated
 *
 * Note: Authenticated access tests require a real Privy session which can't
 * be mocked in E2E. Those are covered by Vitest component tests instead.
 */

test.describe('Unauthenticated access', () => {
  test.beforeEach(async ({ page }) => {
    // Skip splash screen
    await page.addInitScript(() => {
      sessionStorage.setItem('splash-shown', '1');
    });
    // Keep Privy in loading state
    await page.route('**/api.privy.io/**', () => {});
    await page.route('**/localhost:3001/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
  });

  test('/courses is accessible without auth', async ({ page }) => {
    await page.goto('/courses');

    // Should show the courses heading
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 15_000 });
    const text = await heading.textContent();
    expect(text).toContain('Choose Your');
  });

  test('protected route /dashboard shows courses content after redirect', async ({ page }) => {
    await page.goto('/dashboard');
    // Flow guard redirects unauth users — they end up seeing courses content
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 15_000 });
    const text = await heading.textContent();
    // Should see "Choose Your Path" (courses page), not dashboard content
    expect(text).toContain('Choose Your');
  });

  test('protected route /profile shows courses content after redirect', async ({ page }) => {
    await page.goto('/profile');
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 15_000 });
    const text = await heading.textContent();
    expect(text).toContain('Choose Your');
  });

  test('shows Sign In button on courses page', async ({ page }) => {
    await page.goto('/courses');
    const signIn = page.getByRole('button', { name: /sign in/i });
    await expect(signIn).toBeVisible({ timeout: 15_000 });
  });
});
