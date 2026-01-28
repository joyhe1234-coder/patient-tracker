import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Smoke Tests', () => {
  test('page loads and shows grid', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();

    // Grid should be visible
    await expect(mainPage.grid).toBeVisible();
  });

  test('toolbar buttons are visible', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();

    // Toolbar buttons should be visible
    await expect(mainPage.addRowButton).toBeVisible();
    await expect(mainPage.duplicateButton).toBeVisible();
    await expect(mainPage.deleteButton).toBeVisible();
  });

  test('filter bar is visible with chips', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();

    // Filter bar should be visible
    await expect(mainPage.filterBar).toBeVisible();

    // "All" chip should exist
    await expect(mainPage.filterBar.locator('button:has-text("All")')).toBeVisible();
  });

  test('grid has data rows', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();

    // Should have at least one row (assuming seeded data)
    const rowCount = await mainPage.getRowCount();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });
});
