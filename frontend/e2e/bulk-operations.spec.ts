import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

// Credentials from seed data
const ADMIN_EMAIL = 'ko037291@gmail.com';
const ADMIN_PASSWORD = 'welcome100';
const PHYSICIAN_EMAIL = 'phy1@gmail.com';
const PHYSICIAN_PASSWORD = 'welcome100';

const BULK_OPS_URL = '/patient-management?tab=bulk-ops';

/**
 * Helper: login as admin and navigate to the Bulk Operations tab.
 * Waits for the table to have at least one row before returning.
 */
async function loginAndGoToBulkOps(page: import('@playwright/test').Page) {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.loginAndWaitForRedirect(ADMIN_EMAIL, ADMIN_PASSWORD);
  await page.goto(BULK_OPS_URL);
  // Wait for loading spinner to disappear and at least one table row to appear
  await page.locator('table tbody tr').first().waitFor({ timeout: 30000 });
}

test.describe('Bulk Operations Tab', () => {
  // ---------------------------------------------------------------
  // Navigation & Visibility
  // ---------------------------------------------------------------
  test.describe('Navigation & Visibility', () => {
    test('ADMIN can navigate to Bulk Operations tab', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto(BULK_OPS_URL);

      // The "Bulk Operations" tab button should be visible and have the active style
      const tabBtn = page.locator('button:has-text("Bulk Operations")');
      await expect(tabBtn).toBeVisible();
      // Active tab has blue text styling
      await expect(tabBtn).toHaveClass(/text-blue-600/);
    });

    test('page title updates to "Patient Management - Bulk Operations"', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(ADMIN_EMAIL, ADMIN_PASSWORD);
      await page.goto(BULK_OPS_URL);

      await expect(page).toHaveTitle('Patient Management - Bulk Operations');
    });

    test('PHYSICIAN does not see Bulk Operations tab', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(PHYSICIAN_EMAIL, PHYSICIAN_PASSWORD);
      await page.goto('/patient-management');

      await expect(page.locator('button:has-text("Import Patients")')).toBeVisible();
      await expect(page.locator('button:has-text("Bulk Operations")')).not.toBeVisible();
    });

    test('?tab=bulk-ops falls back to Import for PHYSICIAN', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(PHYSICIAN_EMAIL, PHYSICIAN_PASSWORD);
      await page.goto(BULK_OPS_URL);

      // Should show Import tab content instead
      await expect(page.locator('text=Select Healthcare System')).toBeVisible();
      // Bulk Operations content (summary cards) should NOT be visible
      await expect(page.locator('text=Total Patients')).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------
  // Data Loading
  // ---------------------------------------------------------------
  test.describe('Data Loading', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('shows summary cards with patient counts', async ({ page }) => {
      // Four summary cards should be visible
      await expect(page.locator('text=Total Patients')).toBeVisible();
      await expect(page.locator('text=Assigned')).toBeVisible();
      await expect(page.locator('text=Unassigned')).toBeVisible();
      await expect(page.locator('text=Insurance Systems')).toBeVisible();

      // Total Patients value should be > 0 (the card shows a large number)
      // The value is rendered as a sibling <p> with text-2xl class
      const totalCard = page.locator('text=Total Patients').locator('..');
      const totalValue = totalCard.locator('p.text-2xl');
      const valueText = await totalValue.textContent();
      // Parse the localized number (e.g. "9,361") to verify it's positive
      const numericValue = parseInt((valueText || '0').replace(/,/g, ''), 10);
      expect(numericValue).toBeGreaterThan(0);
    });

    test('patient table renders with correct column headers', async ({ page }) => {
      const headers = page.locator('table thead th');
      // 8 columns: checkbox + 7 data columns
      await expect(headers).toHaveCount(8);

      // Verify column header text (skipping checkbox column)
      await expect(page.locator('th:has-text("Patient Name")')).toBeVisible();
      await expect(page.locator('th:has-text("DOB")')).toBeVisible();
      await expect(page.locator('th:has-text("Physician")')).toBeVisible();
      await expect(page.locator('th:has-text("Insurance")')).toBeVisible();
      await expect(page.locator('th:has-text("Measure")')).toBeVisible();
      await expect(page.locator('th:has-text("Status")')).toBeVisible();
      await expect(page.locator('th:has-text("Measures")')).toBeVisible();
    });

    test('patient table has at least one data row', async ({ page }) => {
      const rows = page.locator('table tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test('table footer shows patient count', async ({ page }) => {
      // Footer contains text like "9,361 patients"
      const footer = page.locator('text=/\\d[\\d,]* patients?/');
      await expect(footer).toBeVisible();
    });
  });

  // ---------------------------------------------------------------
  // Selection & Toolbar
  // ---------------------------------------------------------------
  test.describe('Selection & Toolbar', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('action buttons are disabled when no selection', async ({ page }) => {
      // Assign, Unassign, Delete buttons should all be disabled initially
      const assignBtn = page.locator('button:has-text("Assign")').first();
      const unassignBtn = page.locator('button:has-text("Unassign")');
      const deleteBtn = page.locator('button:has-text("Delete")');

      await expect(assignBtn).toBeDisabled();
      await expect(unassignBtn).toBeDisabled();
      await expect(deleteBtn).toBeDisabled();
    });

    test('clicking a row checkbox selects it and enables action buttons', async ({ page }) => {
      // Click the first row's checkbox
      const firstRowCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
      await firstRowCheckbox.click();

      // The row should get the selected background
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toHaveClass(/bg-blue-50/);

      // Action buttons should now be enabled and show count "(1)"
      const assignBtn = page.locator('button:has-text("Assign (1)")');
      await expect(assignBtn).toBeEnabled();
    });

    test('clicking a row (not checkbox) also selects it', async ({ page }) => {
      // Click on the row itself (not the checkbox)
      const firstRow = page.locator('table tbody tr').first();
      // Click the patient name cell to trigger row selection
      await firstRow.locator('td').nth(1).click();

      await expect(firstRow).toHaveClass(/bg-blue-50/);
    });

    test('Select All selects all visible patients', async ({ page }) => {
      // Click "Select All" button (text includes count in parens)
      const selectAllBtn = page.locator('button:has-text("Select All")');
      await selectAllBtn.click();

      // Deselect All button should appear
      await expect(page.locator('button:has-text("Deselect All")')).toBeVisible();

      // Action buttons should show a count matching the total filtered patients
      const assignBtn = page.locator('button:has-text("Assign")').first();
      await expect(assignBtn).toBeEnabled();
      const btnText = await assignBtn.textContent();
      // The button text should contain a number in parentheses, e.g. "Assign (9,361)"
      expect(btnText).toMatch(/Assign\s*\(\d[\d,]*\)/);
    });

    test('Deselect All clears the selection', async ({ page }) => {
      // Select all first
      await page.locator('button:has-text("Select All")').click();
      await expect(page.locator('button:has-text("Deselect All")')).toBeVisible();

      // Deselect all
      await page.locator('button:has-text("Deselect All")').click();

      // Select All should reappear, action buttons disabled
      await expect(page.locator('button:has-text("Select All")')).toBeVisible();
      const assignBtn = page.locator('button:has-text("Assign")').first();
      await expect(assignBtn).toBeDisabled();
    });

    test('header checkbox toggles all visible', async ({ page }) => {
      // The thead checkbox selects/deselects all
      const headerCheckbox = page.locator('table thead input[type="checkbox"]');
      await headerCheckbox.click();

      // Deselect All should appear
      await expect(page.locator('button:has-text("Deselect All")')).toBeVisible();

      // Click again to deselect
      await headerCheckbox.click();
      await expect(page.locator('button:has-text("Select All")')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------
  // Assign Modal
  // ---------------------------------------------------------------
  test.describe('Assign Modal', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('assign modal opens with patient preview', async ({ page }) => {
      // Select first patient
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      // Click Assign button
      await page.locator('button:has-text("Assign (1)")').click();

      // Modal should appear
      await expect(page.locator('h3:has-text("Assign Patients")')).toBeVisible();
      // Physician dropdown exists
      await expect(page.locator('#physician-select')).toBeVisible();
      // Patient preview section
      await expect(page.locator('text=Affected patients')).toBeVisible();
    });

    test('assign confirm button is disabled until physician selected', async ({ page }) => {
      // Select first patient
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Assign (1)")').click();

      // Wait for modal
      await expect(page.locator('h3:has-text("Assign Patients")')).toBeVisible();

      // The confirm "Assign" button inside the modal should be disabled (no physician selected)
      // The modal's confirm button is the last button with text "Assign" inside the fixed overlay
      const confirmBtn = page.locator('.fixed button:has-text("Assign")').last();
      await expect(confirmBtn).toBeDisabled();

      // Select a physician from the dropdown
      const dropdown = page.locator('#physician-select');
      // Pick the first non-empty option
      const options = dropdown.locator('option');
      const optionCount = await options.count();
      // Option 0 is "Select a physician...", pick option 1
      if (optionCount > 1) {
        const firstPhysicianValue = await options.nth(1).getAttribute('value');
        await dropdown.selectOption(firstPhysicianValue!);
        // Now confirm button should be enabled
        await expect(confirmBtn).toBeEnabled();
      }
    });

    test('assign modal can be closed via Cancel button', async ({ page }) => {
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Assign (1)")').click();
      await expect(page.locator('h3:has-text("Assign Patients")')).toBeVisible();

      // Click Cancel
      await page.locator('.fixed button:has-text("Cancel")').click();

      // Modal should be gone
      await expect(page.locator('h3:has-text("Assign Patients")')).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------
  // Delete Modal
  // ---------------------------------------------------------------
  test.describe('Delete Modal', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('delete modal opens and shows warning', async ({ page }) => {
      // Select first patient
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      // Click Delete button
      await page.locator('button:has-text("Delete (1)")').click();

      // Modal should show the danger warning
      await expect(page.locator('h3:has-text("Delete Patients")')).toBeVisible();
      await expect(page.locator('text=cannot be undone')).toBeVisible();
    });

    test('delete modal requires typing DELETE to confirm', async ({ page }) => {
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Delete (1)")').click();

      await expect(page.locator('h3:has-text("Delete Patients")')).toBeVisible();

      // Confirm button should be disabled initially
      const confirmBtn = page.locator('.fixed button:has-text("Delete Patients")');
      await expect(confirmBtn).toBeDisabled();

      // Type "delete" (lowercase) - should still be disabled
      const confirmInput = page.locator('#delete-confirm');
      await confirmInput.fill('delete');
      await expect(confirmBtn).toBeDisabled();

      // Clear and type "DELETE" (uppercase) - should become enabled
      await confirmInput.fill('DELETE');
      await expect(confirmBtn).toBeEnabled();
    });

    test('delete modal can be closed via Cancel', async ({ page }) => {
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Delete (1)")').click();
      await expect(page.locator('h3:has-text("Delete Patients")')).toBeVisible();

      await page.locator('.fixed button:has-text("Cancel")').click();
      await expect(page.locator('h3:has-text("Delete Patients")')).not.toBeVisible();
    });

    // SKIP: Do not actually delete — would destroy seed data
    test.skip('confirming delete removes selected patients', async () => {
      // This test is intentionally skipped to avoid mutating seed data.
      // In a CI environment with disposable data, remove .skip.
    });
  });

  // ---------------------------------------------------------------
  // Unassign Modal
  // ---------------------------------------------------------------
  test.describe('Unassign Modal', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('unassign modal opens with patient preview', async ({ page }) => {
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Unassign (1)")').click();

      // The unassign modal should be visible
      await expect(page.locator('text=Unassign Patients').first()).toBeVisible();
      // Patient preview should exist
      await expect(page.locator('text=Affected patients')).toBeVisible();
    });

    test('unassign modal can be closed via Cancel', async ({ page }) => {
      await page.locator('table tbody tr').first().locator('input[type="checkbox"]').click();
      await page.locator('button:has-text("Unassign (1)")').click();
      await expect(page.locator('text=Unassign Patients').first()).toBeVisible();

      await page.locator('.fixed button:has-text("Cancel")').click();
      await expect(page.locator('text=Unassign Patients')).not.toBeVisible();
    });

    // SKIP: Do not actually unassign — would mutate seed data
    test.skip('confirming unassign removes physician from selected patients', async () => {
      // Intentionally skipped to preserve seed data.
    });
  });

  // ---------------------------------------------------------------
  // Filter Interactions
  // ---------------------------------------------------------------
  test.describe('Filter interactions', () => {
    test.beforeEach(async ({ page }) => {
      await loginAndGoToBulkOps(page);
    });

    test('search by patient name filters the table', async ({ page }) => {
      const initialCount = await page.locator('table tbody tr').count();

      // Type a search term in the search box
      const searchInput = page.locator('input[aria-label="Search patients"]');
      await searchInput.fill('Smith');
      // Wait for debounce / filter to apply
      await page.waitForTimeout(500);

      // Either the count changed or the "No patients match" message appears
      const filteredCount = await page.locator('table tbody tr').count();
      const noMatchMsg = page.locator('text=No patients match your filters');

      if (await noMatchMsg.isVisible()) {
        // Search returned no results — valid outcome
        expect(filteredCount).toBe(0);
      } else {
        // Search returned some results — count should differ or be same if all match
        expect(filteredCount).toBeGreaterThan(0);
        expect(filteredCount).toBeLessThanOrEqual(initialCount);
      }
    });

    test('physician filter dropdown has options', async ({ page }) => {
      const dropdown = page.locator('select[aria-label="Filter by physician"]');
      const options = dropdown.locator('option');
      // At minimum: "All Physicians" + "Unassigned" = 2, plus any physician names
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('physician filter "Unassigned" shows only unassigned patients', async ({ page }) => {
      const dropdown = page.locator('select[aria-label="Filter by physician"]');
      await dropdown.selectOption('__unassigned__');
      await page.waitForTimeout(500);

      // If any rows are visible, verify the Physician column shows "Unassigned"
      const rows = page.locator('table tbody tr');
      const rowCount = await rows.count();

      if (rowCount > 0) {
        // Check first row's physician cell (4th td, index 3)
        const firstPhysicianCell = rows.first().locator('td').nth(3);
        await expect(firstPhysicianCell).toContainText('Unassigned');
      } else {
        // No unassigned patients — the "No patients match" message should show
        await expect(page.locator('text=No patients match your filters')).toBeVisible();
      }
    });

    test('insurance filter dropdown has options', async ({ page }) => {
      const dropdown = page.locator('select[aria-label="Filter by insurance"]');
      const options = dropdown.locator('option');
      // At minimum: "All Insurance" = 1
      const count = await options.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('Clear filters resets all filters', async ({ page }) => {
      // Apply a search filter
      const searchInput = page.locator('input[aria-label="Search patients"]');
      await searchInput.fill('test-filter-xyz-no-match');
      await page.waitForTimeout(500);

      // "Clear filters" link should appear
      const clearBtn = page.locator('text=Clear filters').first();
      await expect(clearBtn).toBeVisible();
      await clearBtn.click();

      // Search input should be empty
      await expect(searchInput).toHaveValue('');
      // Table should show rows again
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10000 });
    });

    test('selection persists after filtering', async ({ page }) => {
      // Select first patient
      const firstRowCheckbox = page.locator('table tbody tr').first().locator('input[type="checkbox"]');
      await firstRowCheckbox.click();

      // Note the selected patient name
      const selectedName = await page.locator('table tbody tr').first().locator('td').nth(1).textContent();

      // Apply a filter that still includes the selected patient (search by their name)
      const searchInput = page.locator('input[aria-label="Search patients"]');
      await searchInput.fill(selectedName?.trim().split(' ')[0] || '');
      await page.waitForTimeout(500);

      // The selected row should still show as selected (bg-blue-50)
      const matchedRow = page.locator('table tbody tr').filter({ hasText: selectedName?.trim() || '' }).first();
      if (await matchedRow.isVisible()) {
        await expect(matchedRow).toHaveClass(/bg-blue-50/);
      }
    });
  });
});
