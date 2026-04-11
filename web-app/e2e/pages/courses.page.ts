import type { Page, Locator } from '@playwright/test';

export class CoursesPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly courseCards: Locator;
  readonly signInButton: Locator;
  readonly disconnectButton: Locator;
  readonly loadingIndicator: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.locator('h1');
    // Course cards use h3 for titles inside ParchmentCard divs
    this.courseCards = page.locator('h3');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.disconnectButton = page.getByRole('button', { name: /disconnect/i });
    this.loadingIndicator = page.getByText('Syncing course catalog...');
    this.errorMessage = page.getByRole('button', { name: /retry/i });
  }

  async goto() {
    await this.page.goto('/courses');
  }

  async waitForContent() {
    // Wait for either courses to appear or empty state
    await this.page.waitForSelector('h1', { timeout: 10_000 });
  }
}
