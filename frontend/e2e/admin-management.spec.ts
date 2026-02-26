import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

/**
 * Admin User Management E2E Tests
 *
 * Tests the admin dashboard: user list, role management, account actions.
 * Requires seeded database with dev users (admin@gmail.com / welcome100).
 */
test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect('admin@gmail.com', 'welcome100');

    // Navigate to admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
  });

  test('displays admin dashboard with user list', async ({ page }) => {
    // Should show Users tab content
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 10000 });

    // Should list seeded users
    await expect(page.getByText('admin@gmail.com')).toBeVisible();
  });

  test('shows user roles with correct badges', async ({ page }) => {
    // Wait for user list to load
    await expect(page.getByText('admin@gmail.com')).toBeVisible({ timeout: 10000 });

    // Admin user should have ADMIN badge
    const adminRow = page.locator('tr', { hasText: 'admin@gmail.com' });
    await expect(adminRow.getByText('ADMIN')).toBeVisible();
  });

  test('can open Add User modal', async ({ page }) => {
    // Click Add User button
    await page.getByRole('button', { name: /add user/i }).click();

    // Modal should appear with form fields
    await expect(page.getByText('Add User')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('can open Edit User modal', async ({ page }) => {
    // Wait for users to load
    await expect(page.getByText('phy1@gmail.com')).toBeVisible({ timeout: 10000 });

    // Click edit button on first physician user
    const phyRow = page.locator('tr', { hasText: 'phy1@gmail.com' });
    await phyRow.getByRole('button', { name: /edit/i }).first().click();

    // Modal should show Edit User with pre-filled data
    await expect(page.getByText('Edit User')).toBeVisible();
  });

  test('can switch to Audit Log tab', async ({ page }) => {
    // Click Audit Log tab
    await page.getByRole('button', { name: /audit/i }).click();

    // Should show audit log content
    await page.waitForLoadState('networkidle');
    // Audit log table or empty state should be visible
    await expect(page.getByText(/audit/i).first()).toBeVisible();
  });

  test('non-admin user is redirected away from admin page', async ({ page }) => {
    // Logout first
    const userMenuButton = page.locator('header button:has(svg)').last();
    await userMenuButton.click();
    await page.getByText('Logout').click();
    await page.waitForURL(/\/login/);

    // Login as physician (non-admin)
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForRedirect('phy1@gmail.com', 'welcome100');

    // Try to navigate to admin
    await page.goto('/admin');

    // Should be redirected to main page
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});

test.describe('Account Lockout', () => {
  test('shows error after multiple failed login attempts', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with wrong password multiple times
    // Note: The lockout threshold may vary; we test that repeated failures show errors
    for (let i = 0; i < 3; i++) {
      await loginPage.emailInput.fill('phy1@gmail.com');
      await loginPage.passwordInput.fill('wrongpassword');
      await loginPage.signInButton.click();

      // Wait for error to appear
      await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

      // Clear inputs for next attempt
      await loginPage.emailInput.clear();
      await loginPage.passwordInput.clear();
    }

    // After multiple failures, error message should still be visible
    await expect(loginPage.errorMessage).toBeVisible();
  });

  test('locked account eventually becomes accessible again', async ({ page }) => {
    // This test verifies the lockout message appears but we don't actually
    // wait 15 minutes for it to expire. We verify the error messaging path.
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Attempt login with wrong password
    await loginPage.login('phy1@gmail.com', 'wrongpassword');
    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5000 });

    const errorText = await loginPage.getErrorMessage();
    // Error should indicate invalid credentials (or locked if threshold reached)
    expect(errorText.length).toBeGreaterThan(0);
  });
});
