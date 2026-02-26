import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

/**
 * B12.9: Password Reset + Force-Change-Password E2E Tests
 *
 * Tests the forgot-password flow (UI submission + success state)
 * and the reset-password page (invalid token handling).
 *
 * NOTE: Full end-to-end forgot → email → reset → login cannot be tested
 * in E2E because we can't intercept SMTP emails. The backend API paths
 * for these flows are fully covered by Jest unit tests (auth.routes.test.ts).
 */

test.describe('Password Flows', () => {
  test.describe('Forgot Password Page', () => {
    test('displays form and submits email successfully', async ({ page }) => {
      await page.goto('/forgot-password');

      // Page renders with expected elements
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
      await expect(page.getByText('Enter your email to receive a reset link')).toBeVisible();

      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toBeVisible();

      const submitButton = page.getByRole('button', { name: /send reset link/i });
      await expect(submitButton).toBeVisible();

      // Fill email and submit
      await emailInput.fill('phy1@gmail.com');
      await submitButton.click();

      // Should show success message (API returns 200 regardless of whether email exists)
      await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/password reset link has been sent/i)).toBeVisible();
      await expect(page.getByText('phy1@gmail.com')).toBeVisible();

      // Back to login link should be available
      const backLink = page.getByRole('link', { name: /back to login/i });
      await expect(backLink).toBeVisible();
    });

    test('has back to login link from form', async ({ page }) => {
      await page.goto('/forgot-password');

      const backLink = page.getByRole('link', { name: /back to login/i });
      await expect(backLink).toBeVisible();
      await backLink.click();

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Reset Password Page', () => {
    test('shows invalid link when no token provided', async ({ page }) => {
      await page.goto('/reset-password');

      // Should show "Invalid Reset Link" message
      await expect(page.getByRole('heading', { name: /invalid reset link/i })).toBeVisible({ timeout: 5000 });
    });

    test('shows error for invalid token when submitting', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token-12345');

      // Page should render form
      await expect(page.getByRole('heading', { name: /reset password|reset your password/i })).toBeVisible();

      // Fill in passwords
      const passwordFields = page.locator('input[type="password"]');
      await passwordFields.first().fill('newpassword123');
      await passwordFields.last().fill('newpassword123');

      // Submit
      const submitButton = page.getByRole('button', { name: /reset password/i });
      await submitButton.click();

      // Should show error (invalid token)
      await expect(page.locator('.bg-red-50, [class*="error"]').first()).toBeVisible({ timeout: 5000 });
    });

    test('validates password length', async ({ page }) => {
      await page.goto('/reset-password?token=some-token');

      const passwordFields = page.locator('input[type="password"]');
      await passwordFields.first().fill('short');
      await passwordFields.last().fill('short');

      const submitButton = page.getByRole('button', { name: /reset password/i });
      await submitButton.click();

      // Should show client-side validation error
      await expect(page.getByText(/at least 8 characters/i)).toBeVisible({ timeout: 3000 });
    });

    test('validates passwords match', async ({ page }) => {
      await page.goto('/reset-password?token=some-token');

      const passwordFields = page.locator('input[type="password"]');
      await passwordFields.first().fill('password123');
      await passwordFields.last().fill('different456');

      const submitButton = page.getByRole('button', { name: /reset password/i });
      await submitButton.click();

      // Should show mismatch error
      await expect(page.getByText(/do not match/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Login → Forgot Password Link', () => {
    test('forgot password link on login page navigates correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Find and click "Forgot Password?" link
      const forgotLink = page.getByRole('link', { name: /forgot.*password/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();

      // Should navigate to forgot-password page
      await expect(page).toHaveURL(/\/forgot-password/);
      await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible();
    });
  });
});
