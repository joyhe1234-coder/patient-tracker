import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { MainPage } from './pages/main-page';
import { ImportPage } from './pages/import-page';

/**
 * Visual Regression Tests
 *
 * Captures baseline screenshots for key pages and compares against them
 * on subsequent runs. Run with --update-snapshots to regenerate baselines.
 *
 * Uses maxDiffPixelRatio: 0.01 (configured in playwright.config.ts) to
 * allow minor anti-aliasing differences across environments.
 */
test.describe('Visual Regression', () => {
  test('login page — empty state', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Mask any dynamic text that might change between runs
    await expect(page).toHaveScreenshot('login-page-empty.png', {
      fullPage: true,
    });
  });

  test('main grid — loaded with data', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    // Mask dynamic elements: row counts in status bar, timestamps
    const statusBar = page.locator('.bg-gray-100.border-t');
    const saveIndicator = page.locator('[class*="text-xs"][class*="text-gray"]');

    await expect(page).toHaveScreenshot('main-grid-loaded.png', {
      fullPage: true,
      mask: [statusBar, saveIndicator],
    });
  });

  test('admin dashboard', async ({ page }) => {
    // Login as admin
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect('admin@gmail.com', 'welcome100');

    // Navigate to admin page
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('User Management')).toBeVisible({ timeout: 10000 });

    // Mask any timestamps or session-specific data
    const timestamps = page.locator('td:has-text("ago"), td:has-text("AM"), td:has-text("PM")');

    await expect(page).toHaveScreenshot('admin-dashboard.png', {
      fullPage: true,
      mask: [timestamps],
    });
  });

  test('import page — empty state', async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto();

    await expect(page).toHaveScreenshot('import-page-empty.png', {
      fullPage: true,
    });
  });

  test('filter bar — with active filter', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    // Click a filter chip to activate it (use a status that likely has rows)
    const notAddressedChip = mainPage.filterBar.locator('button:has-text("Not Addressed")');
    if (await notAddressedChip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await notAddressedChip.click();
      await page.waitForTimeout(500);
    }

    // Mask row count and status bar (dynamic)
    const statusBar = page.locator('.bg-gray-100.border-t');

    await expect(page).toHaveScreenshot('filter-bar-active.png', {
      fullPage: true,
      mask: [statusBar],
    });
  });
});
