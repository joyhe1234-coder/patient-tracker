import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Delete Row', () => {
  // Run tests serially to avoid race conditions with shared database
  test.describe.configure({ mode: 'serial' });

  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();
  });

  test('Delete button is disabled when no row selected', async () => {
    await expect(mainPage.deleteButton).toBeDisabled();
  });

  test('Delete button is enabled when row is selected', async () => {
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
  });

  test('clicking Delete shows confirmation dialog', async ({ page }) => {
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    // Confirmation modal should appear - look for the modal structure
    await expect(page.locator('.bg-white.rounded-lg.shadow-xl')).toBeVisible();
  });

  test('confirmation dialog shows warning message', async ({ page }) => {
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    // Should show some confirmation text
    await expect(page.locator('.bg-white.rounded-lg.shadow-xl')).toBeVisible();
  });

  test('confirming delete removes the row', async ({ page }) => {
    const countBeforeAdd = await mainPage.getRowCount();

    // Add a test row so we have something safe to delete
    await mainPage.addTestRow(`DeleteTest_${Date.now()}`);
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(countBeforeAdd + 1);
    }).toPass({ timeout: 5000 });

    const countAfterAdd = await mainPage.getRowCount();
    expect(countAfterAdd).toBe(countBeforeAdd + 1);

    // Select the first row (the newly added one should be at top or findable)
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    // Wait for confirmation modal
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    // Click the Delete confirm button (scoped to modal)
    await modal.getByRole('button', { name: 'Delete' }).click();

    // Wait for modal to close and grid to refresh
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(countBeforeAdd);
    }).toPass({ timeout: 5000 });

    const finalRowCount = await mainPage.getRowCount();
    expect(finalRowCount).toBe(countBeforeAdd);
  });

  test('canceling delete keeps the row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();
    const originalName = await mainPage.getCellValue(0, 'memberName');

    await mainPage.selectRow(0);
    await mainPage.deleteButton.click();

    // Click Cancel button
    await page.click('button:has-text("Cancel")');

    // Modal should close
    await expect(page.locator('text=Are you sure')).not.toBeVisible();

    // Row should still exist
    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount);

    const stillThere = await mainPage.getCellValue(0, 'memberName');
    expect(stillThere).toBe(originalName);
  });

  test('clicking backdrop closes confirmation without deleting', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();

    await mainPage.selectRow(0);
    await mainPage.deleteButton.click();

    // Click on the backdrop
    const backdrop = page.locator('.bg-black.bg-opacity-50');
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Modal should close
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await expect(modal).toBeHidden({ timeout: 5000 });

    // Row count should be unchanged
    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount);
  });

  test('Delete button becomes disabled after deletion', async ({ page }) => {
    const countBefore = await mainPage.getRowCount();
    await mainPage.addTestRow(`DeleteDisableTest_${Date.now()}`);
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(countBefore + 1);
    }).toPass({ timeout: 5000 });

    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.waitFor({ state: 'visible', timeout: 5000 });

    await modal.getByRole('button', { name: 'Delete' }).click();

    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // After deletion, no row is selected → delete button should be disabled
    await expect(mainPage.deleteButton).toBeDisabled();
  });

  test('can select and delete another row after first deletion', async ({ page }) => {
    const ts = Date.now();
    const countBefore = await mainPage.getRowCount();
    await mainPage.addTestRow(`MultiDelete1_${ts}`);
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(countBefore + 1);
    }).toPass({ timeout: 5000 });

    await mainPage.addTestRow(`MultiDelete2_${ts}`);
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(countBefore + 2);
    }).toPass({ timeout: 5000 });

    const initialRowCount = await mainPage.getRowCount();

    // Delete first row
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    let modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await modal.getByRole('button', { name: 'Delete' }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(initialRowCount - 1);
    }).toPass({ timeout: 5000 });

    // Select and delete second row
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
    await mainPage.deleteButton.click();

    modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.waitFor({ state: 'visible', timeout: 5000 });
    await modal.getByRole('button', { name: 'Delete' }).click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });
    await expect(async () => {
      const count = await mainPage.getRowCount();
      expect(count).toBe(initialRowCount - 2);
    }).toPass({ timeout: 5000 });

    const finalRowCount = await mainPage.getRowCount();
    expect(finalRowCount).toBe(initialRowCount - 2);
  });
});
