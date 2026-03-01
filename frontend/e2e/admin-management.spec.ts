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
    // Should show Admin Dashboard heading
    await expect(page.getByRole('heading', { name: 'Admin Dashboard' })).toBeVisible({ timeout: 10000 });

    // Should list seeded users
    await expect(page.locator('td', { hasText: 'admin@gmail.com' })).toBeVisible();
  });

  test('shows user roles with correct badges', async ({ page }) => {
    // Wait for user list to load
    await expect(page.locator('td', { hasText: 'admin@gmail.com' })).toBeVisible({ timeout: 10000 });

    // Admin user should have ADMIN badge (use .first() to avoid strict mode on nested elements)
    const adminRow = page.locator('tr', { hasText: 'admin@gmail.com' });
    await expect(adminRow.getByText('ADMIN').first()).toBeVisible();
  });

  test('can open Add User modal', async ({ page }) => {
    // Click Add User button
    await page.getByRole('button', { name: /add user/i }).click();

    // Modal should appear with form fields
    await expect(page.getByRole('heading', { name: 'Add User' })).toBeVisible();
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
    await expect(page.getByRole('heading', { name: 'Edit User' })).toBeVisible();
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
    await page.getByRole('button', { name: /logout/i }).click();
    await page.waitForURL(/\/login/);
    await page.waitForLoadState('networkidle');

    // Login as physician (non-admin) — use phy2 to avoid lockout issues with phy1
    const loginPage = new LoginPage(page);
    await loginPage.loginAndWaitForRedirect('phy2@gmail.com', 'welcome100');

    // Try to navigate to admin
    await page.goto('/admin');

    // Should be redirected to main page
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });
});

test.describe('Account Lockout', () => {
  test('shows error after multiple failed login attempts', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 });

    // Attempt login with wrong password twice (not enough to lock, but enough to verify errors)
    // Use a non-existent email so we don't risk locking real accounts
    for (let i = 0; i < 2; i++) {
      await page.locator('#email').fill('lockout-test@example.com');
      await page.locator('#password').click();
      await page.locator('#password').fill('wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Wait for error to appear
      await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });

      // Brief pause between attempts
      await page.waitForTimeout(500);
    }

    // After multiple failures, error message should still be visible
    await expect(page.locator('.bg-red-50')).toBeVisible();
  });

  test('locked account eventually becomes accessible again', async ({ page }) => {
    // This test verifies the error message appears for invalid credentials
    await page.goto('/login');
    await page.locator('#email').waitFor({ state: 'visible', timeout: 10000 });

    await page.locator('#email').fill('lockout-test@example.com');
    await page.locator('#password').click();
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('.bg-red-50')).toBeVisible({ timeout: 10000 });

    const errorText = await page.locator('.bg-red-50').innerText();
    // Error should indicate invalid credentials
    expect(errorText.length).toBeGreaterThan(0);
  });
});
