import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;
  readonly showPasswordButton: Locator;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.signInButton = page.getByRole('button', { name: /sign in/i });
    this.errorMessage = page.locator('.bg-red-50');
    this.loadingSpinner = page.locator('text=Signing in...');
    this.showPasswordButton = page.locator('button[tabindex="-1"]');
    this.pageTitle = page.locator('text=Patient Quality Measure Tracker');
  }

  async goto() {
    await this.page.goto('/login');
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async loginAndWaitForRedirect(email: string, password: string) {
    await this.login(email, password);
    // Wait for redirect to main page
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  async isPasswordVisible(): Promise<boolean> {
    const type = await this.passwordInput.getAttribute('type');
    return type === 'text';
  }

  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  async getErrorMessage(): Promise<string> {
    if (await this.errorMessage.isVisible()) {
      return await this.errorMessage.innerText();
    }
    return '';
  }
}
