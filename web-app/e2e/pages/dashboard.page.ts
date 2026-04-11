import type { Page, Locator } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly progressHeading: Locator;
  readonly statsGrid: Locator;
  readonly earningsCard: Locator;
  readonly lockStatusCard: Locator;
  readonly continueLessonButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.progressHeading = page.getByText('Your Progress');
    this.statsGrid = page.locator('.grid.grid-cols-2');
    this.earningsCard = page.getByText('Earnings Overview');
    this.lockStatusCard = page.getByText('Lock Status');
    this.continueLessonButton = page.getByRole('button', { name: /continue lesson/i });
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async waitForContent() {
    await this.page.waitForSelector('text=Your Progress', { timeout: 10_000 });
  }
}
