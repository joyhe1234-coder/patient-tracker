import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Add Row', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
  });

  test('Add Row button opens modal', async ({ page }) => {
    await mainPage.addRowButton.click();

    const modal = page.locator('text=Add New Patient');
    await expect(modal).toBeVisible();
  });

  test('modal has required form fields', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Use more specific selectors inside the modal
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await expect(modal.locator('text=Member Name')).toBeVisible();
    await expect(modal.locator('text=Date of Birth')).toBeVisible();
    await expect(modal.locator('text=Telephone')).toBeVisible();
    await expect(modal.locator('text=Address')).toBeVisible();
  });

  test('submitting valid data creates new row', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Wait for modal
    await page.waitForSelector('input[placeholder="Enter patient name"]');

    // Use unique name for this test
    const uniqueName = `E2E Test ${Date.now()}`;

    // Fill in the form
    await page.fill('input[placeholder="Enter patient name"]', uniqueName);
    await page.fill('input[type="date"]', '1985-06-15');
    await page.fill('input[placeholder="(555) 123-4567"]', '5559876543');
    await page.fill('input[placeholder="123 Main St, City, State ZIP"]', '456 Test Ave');

    // Submit using modal's Add Row button
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    // Wait for modal to close
    await expect(page.locator('text=Add New Patient')).not.toBeVisible({ timeout: 5000 });

    // Wait for grid to update
    await page.waitForTimeout(500);

    // Verify the new row exists in the grid
    const firstRowName = await mainPage.getCellValue(0, 'memberName');
    expect(firstRowName).toBe(uniqueName);
  });

  test('new row appears as first row', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Wait for modal
    await page.waitForSelector('input[placeholder="Enter patient name"]');

    await page.fill('input[placeholder="Enter patient name"]', 'First Row Test');
    await page.fill('input[type="date"]', '1990-01-01');

    // Submit using modal's Add Row button
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    // Wait for modal to close and grid to update
    await expect(page.locator('text=Add New Patient')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // First row should have our new patient
    const firstRowName = await mainPage.getCellValue(0, 'memberName');
    expect(firstRowName).toBe('First Row Test');
  });

  test('new row has empty request type, quality measure, measure status', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Wait for modal
    await page.waitForSelector('input[placeholder="Enter patient name"]');

    await page.fill('input[placeholder="Enter patient name"]', 'Empty Fields Test');
    await page.fill('input[type="date"]', '1995-03-20');

    // Submit using modal's Add Row button
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    await expect(page.locator('text=Add New Patient')).not.toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify measure fields are empty
    const requestType = await mainPage.getCellValue(0, 'requestType');
    const qualityMeasure = await mainPage.getCellValue(0, 'qualityMeasure');
    const measureStatus = await mainPage.getCellValue(0, 'measureStatus');

    expect(requestType.trim()).toBe('');
    expect(qualityMeasure.trim()).toBe('');
    expect(measureStatus.trim()).toBe('');
  });

  test('cancel button closes modal without creating row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();

    await mainPage.addRowButton.click();

    await page.fill('input[placeholder="Enter patient name"]', 'Should Not Exist');
    await page.fill('input[type="date"]', '2000-01-01');

    // Click Cancel
    await page.click('button:has-text("Cancel")');

    // Modal should close
    await expect(page.locator('text=Add New Patient')).not.toBeVisible();

    // Row count should be unchanged
    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount);
  });

  test('validation error shows for missing member name', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Wait for modal to fully render
    await page.waitForSelector('input[type="date"]');

    // Only fill DOB, not name
    await page.fill('input[type="date"]', '1990-01-01');

    // Click Add Row button inside modal
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    // Error message should appear
    await expect(page.locator('text=Member name is required')).toBeVisible();

    // Modal should still be open
    await expect(page.locator('text=Add New Patient')).toBeVisible();
  });

  test('validation error shows for missing date of birth', async ({ page }) => {
    await mainPage.addRowButton.click();

    // Wait for modal
    await page.waitForSelector('input[placeholder="Enter patient name"]');

    // Only fill name, not DOB
    await page.fill('input[placeholder="Enter patient name"]', 'Test Patient');

    // Click Add Row button inside modal
    const modal = page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    // Error message should appear
    await expect(page.locator('text=Date of birth is required')).toBeVisible();
  });

  test('X button closes modal', async ({ page }) => {
    await mainPage.addRowButton.click();

    await expect(page.locator('text=Add New Patient')).toBeVisible();

    // Click the X button (SVG icon button in header)
    await page.locator('button:has(svg.lucide-x)').click();

    await expect(page.locator('text=Add New Patient')).not.toBeVisible();
  });
});
