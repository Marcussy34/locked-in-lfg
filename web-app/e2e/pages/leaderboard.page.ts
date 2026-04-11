import type { Page, Locator } from '@playwright/test';

export class LeaderboardPage {
  readonly page: Page;
  readonly entries: Locator;
  readonly loadingState: Locator;

  constructor(page: Page) {
    this.page = page;
    // Leaderboard entries are rendered inside ParchmentCard components
    this.entries = page.locator('[class*="ParchmentCard"], [class*="parchment"]');
    this.loadingState = page.locator('.animate-spin');
  }

  async goto() {
    await this.page.goto('/leaderboard');
  }
}
