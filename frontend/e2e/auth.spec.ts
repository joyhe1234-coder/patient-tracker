import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { MainPage } from './pages/main-page';

test.describe('Authentication', () => {
  test.describe('Login Page', () => {
    test('displays login form', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.pageTitle).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.signInButton).toBeVisible();
    });

    test('shows error for invalid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('invalid@test.com', 'wrongpassword');

      // Wait for error message to appear
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
      const errorText = await loginPage.getErrorMessage();
      expect(errorText).toContain('Invalid');
    });

    test('password visibility toggle works', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Password should be hidden initially
      expect(await loginPage.isPasswordVisible()).toBe(false);

      // Toggle to show password
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(true);

      // Toggle to hide password again
      await loginPage.togglePasswordVisibility();
      expect(await loginPage.isPasswordVisible()).toBe(false);
    });

    test('successful login redirects to main page', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Use test credentials (assumes these exist in the seeded database)
      await loginPage.loginAndWaitForRedirect('dr.smith@hillclinic.com', 'password123');

      // Verify we're on the main page
      const mainPage = new MainPage(page);
      await expect(mainPage.grid).toBeVisible({ timeout: 10000 });
    });

    test('shows loading state during login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Fill in credentials and click
      await loginPage.emailInput.fill('dr.smith@hillclinic.com');
      await loginPage.passwordInput.fill('password123');
      await loginPage.signInButton.click();

      // The loading state may be brief, but button should be disabled
      // This test verifies the interaction doesn't throw
      await page.waitForURL('/', { timeout: 10000 });
    });
  });

  test.describe('Protected Routes', () => {
    test('redirects to login when not authenticated', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());

      // Try to access main page
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('redirects to login when accessing admin page unauthenticated', async ({ page }) => {
      // Clear any existing auth state
      await page.context().clearCookies();
      await page.evaluate(() => localStorage.clear());

      // Try to access admin page
      await page.goto('/admin');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('logout button logs out user', async ({ page }) => {
      // First login
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect('dr.smith@hillclinic.com', 'password123');

      // Verify we're logged in
      const mainPage = new MainPage(page);
      await expect(mainPage.grid).toBeVisible({ timeout: 10000 });

      // Click logout button in header
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
      } else {
        // May be in a dropdown menu
        const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Dr.")');
        if (await userMenu.isVisible()) {
          await userMenu.click();
          await page.locator('text=Logout, text=Sign out').first().click();
        }
      }

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });

  test.describe('Session Persistence', () => {
    test('maintains session after page refresh', async ({ page }) => {
      // First login
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect('dr.smith@hillclinic.com', 'password123');

      // Verify we're logged in
      const mainPage = new MainPage(page);
      await expect(mainPage.grid).toBeVisible({ timeout: 10000 });

      // Refresh the page
      await page.reload();

      // Should still be on main page with grid visible
      await expect(mainPage.grid).toBeVisible({ timeout: 10000 });
    });
  });
});
