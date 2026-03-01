import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

/**
 * Auth Edge Case E2E Tests
 *
 * Tests for auth flows that are hard to trigger naturally in E2E:
 * - Force password change modal (requires mustChangePassword flag)
 * - Account lockout warning and lock messages
 * - Logout → protected route denied
 *
 * Uses Playwright route interception to mock backend responses.
 */

test.describe('Force Password Change', () => {
  test('shows force-change modal when mustChangePassword is true', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Intercept login API to return mustChangePassword: true
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 99,
              email: 'mustchange@test.com',
              displayName: 'Must Change User',
              roles: ['PHYSICIAN'],
              isActive: true,
            },
            token: 'fake-jwt-token-for-test',
            assignments: null,
            mustChangePassword: true,
          },
        }),
      });
    });

    // Also intercept /auth/me so ProtectedRoute's checkAuth succeeds
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 99,
              email: 'mustchange@test.com',
              displayName: 'Must Change User',
              roles: ['PHYSICIAN'],
              isActive: true,
            },
            assignments: null,
          },
        }),
      });
    });

    // Login
    await loginPage.login('mustchange@test.com', 'password123');

    // Should see the force password change modal
    await expect(page.getByText('Password Change Required')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('You must change your password before continuing')).toBeVisible();
    await expect(page.locator('#new-password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /change password/i })).toBeVisible();
  });

  test('validates minimum password length in force-change modal', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock login with mustChangePassword
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            token: 'fake-jwt-token',
            assignments: null,
            mustChangePassword: true,
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            assignments: null,
          },
        }),
      });
    });

    await loginPage.login('test@test.com', 'password123');
    await expect(page.getByText('Password Change Required')).toBeVisible({ timeout: 5000 });

    // Type short password and submit
    await page.locator('#new-password').fill('short');
    await page.locator('#confirm-password').fill('short');
    await page.getByRole('button', { name: /change password/i }).click();

    // Should show validation error
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 3000 });
  });

  test('validates password mismatch in force-change modal', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            token: 'fake-jwt-token',
            assignments: null,
            mustChangePassword: true,
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            assignments: null,
          },
        }),
      });
    });

    await loginPage.login('test@test.com', 'password123');
    await expect(page.getByText('Password Change Required')).toBeVisible({ timeout: 5000 });

    // Type mismatched passwords
    await page.locator('#new-password').fill('newpassword123');
    await page.locator('#confirm-password').fill('different456');
    await page.getByRole('button', { name: /change password/i }).click();

    // Should show mismatch error
    await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 3000 });
  });

  test('successful force-change redirects to login', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            token: 'fake-jwt-token',
            assignments: null,
            mustChangePassword: true,
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: { id: 99, email: 'test@test.com', displayName: 'Test', roles: ['PHYSICIAN'], isActive: true },
            assignments: null,
          },
        }),
      });
    });

    // Mock force-change-password API to succeed
    await page.route('**/api/auth/force-change-password', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Password changed successfully. Please log in again.',
        }),
      });
    });

    // Mock logout API
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Logged out successfully' }),
      });
    });

    await loginPage.login('test@test.com', 'password123');
    await expect(page.getByText('Password Change Required')).toBeVisible({ timeout: 5000 });

    // Fill valid matching passwords and submit
    await page.locator('#new-password').fill('newpassword123');
    await page.locator('#confirm-password').fill('newpassword123');
    await page.getByRole('button', { name: /change password/i }).click();

    // Should redirect to login page after password change + logout
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Account Lockout', () => {
  test('shows warning message after 3 failed attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock the 3rd failed attempt response (includes warning)
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            warning: 'Having trouble logging in? You can reset your password using the "Forgot your password?" link below.',
          },
        }),
      });
    });

    await loginPage.login('user@example.com', 'wrongpassword');

    // Should show the error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    // Should show the yellow warning box with "trouble logging in" + reset link
    const warningBox = page.locator('.bg-yellow-50');
    await expect(warningBox).toBeVisible({ timeout: 3000 });
    await expect(warningBox.getByText(/trouble logging in/i)).toBeVisible();

    // Warning should contain a reset password link
    const resetLink = warningBox.getByRole('link', { name: /reset your password/i });
    await expect(resetLink).toBeVisible();
  });

  test('warning reset-link navigates to forgot-password page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock response with warning
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password',
            warning: 'Having trouble logging in? You can reset your password using the "Forgot your password?" link below.',
          },
        }),
      });
    });

    await loginPage.login('user@example.com', 'wrongpassword');

    // Click the reset link in the warning
    const warningBox = page.locator('.bg-yellow-50');
    await expect(warningBox).toBeVisible({ timeout: 5000 });
    await warningBox.getByRole('link', { name: /reset your password/i }).click();

    // Should navigate to forgot-password
    await expect(page).toHaveURL(/\/forgot-password/);
  });

  test('shows account locked message after too many failed attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mock ACCOUNT_LOCKED response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes or reset your password.',
          },
        }),
      });
    });

    await loginPage.login('locked@example.com', 'wrongpassword');

    // Should show the locked error message
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });
    const errorText = await loginPage.getErrorMessage();
    expect(errorText).toContain('temporarily locked');
    expect(errorText).toContain('15 minutes');
  });
});

test.describe('Post-Logout Protection', () => {
  test('cannot access protected route after logout', async ({ page }) => {
    // First login with real credentials
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect('phy1@gmail.com', 'welcome100');

    // Verify we're logged in
    await expect(page.locator('.ag-theme-alpine')).toBeVisible({ timeout: 10000 });

    // Logout via user menu
    const userMenuButton = page.locator('header button:has(svg)').last();
    await userMenuButton.click();
    await page.getByText('Logout').click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Now try to access protected route directly
    await page.goto('/');

    // Should redirect back to login (no valid session)
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
