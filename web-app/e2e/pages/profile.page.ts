import type { Page, Locator } from '@playwright/test';

export class ProfilePage {
  readonly page: Page;
  readonly walletAddress: Locator;
  readonly displayName: Locator;

  constructor(page: Page) {
    this.page = page;
    // Profile page shows wallet address in truncated form
    this.walletAddress = page.getByText(/Test\.\.\.1111/i);
    this.displayName = page.getByText('Test User');
  }

  async goto() {
    await this.page.goto('/profile');
  }
}
