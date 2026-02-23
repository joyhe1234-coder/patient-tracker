/**
 * Comprehensive Import E2E Tests — All Roles & Both Systems
 *
 * Tests the full import flow for Hill Healthcare and Sutter/SIP systems,
 * verifying role-based behavior:
 *   - Admin: sees interactive conflict resolution form with dropdowns
 *   - Physician: sees read-only ConflictBanner with "contact administrator"
 *   - Staff: sees read-only ConflictBanner with "contact administrator"
 *
 * Valid imports: file uploads through to preview page for all roles.
 * Conflict imports: role-based UI verified for both systems.
 */

import { test, expect, Page } from '@playwright/test';
import { ImportPage } from './pages/import-page';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Run tests serially — they share backend state (DB, preview cache)
test.describe.configure({ mode: 'serial' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Timeout constants — avoid magic numbers throughout tests
// ---------------------------------------------------------------------------
const TIMEOUT = {
  /** Max wait for file upload processing + API response */
  FILE_UPLOAD: 20_000,
  /** Max wait for page navigation (e.g., redirect to /preview/) */
  NAVIGATION: 20_000,
  /** Max wait for UI elements to appear after state change */
  UI_RENDER: 15_000,
  /** Max wait after selecting dropdown/sheet for dependent UI */
  DEPENDENT_UI: 10_000,
  /** Brief delay between sequential dropdown selections */
  DROPDOWN_SETTLE: 200,
  /** Max wait for button state changes (enabled/disabled) */
  BUTTON_STATE: 5_000,
} as const;

/**
 * Wait for at least one of several Playwright locators to become visible.
 * Uses Promise.any for better error reporting than Promise.race — if ALL
 * fail, the AggregateError lists each locator's failure reason.
 */
async function waitForAnyVisible(
  locators: { locator: import('@playwright/test').Locator; label: string }[],
  timeout: number,
): Promise<string> {
  const result = await Promise.any(
    locators.map(async ({ locator, label }) => {
      await locator.waitFor({ state: 'visible', timeout });
      return label;
    }),
  ).catch((aggregateError: AggregateError) => {
    const labels = locators.map(l => l.label).join(', ');
    throw new Error(
      `None of the expected UI elements became visible within ${timeout}ms: [${labels}].\n` +
      `Individual errors: ${aggregateError.errors.map((e: Error) => e.message).join('; ')}`,
    );
  });
  return result;
}

// ---------------------------------------------------------------------------
// Test users (from seed data — passwords fixed via DB update)
// ---------------------------------------------------------------------------
const ADMIN = { email: 'admin@gmail.com', password: 'welcome100' };
const PHYSICIAN = { email: 'phy1@gmail.com', password: 'welcome100' };
const STAFF = { email: 'staff1@gmail.com', password: 'welcome100' };
const ADMIN_PHY = { email: 'adminphy@gmail.com', password: 'welcome100' };

// ---------------------------------------------------------------------------
// Test data file paths
// ---------------------------------------------------------------------------
const HILL_VALID_FILE = path.resolve(__dirname, '..', '..', 'backend', 'test-data', 'test-hill-valid.xlsx');
const SUTTER_VALID_FILE = path.resolve(__dirname, '..', '..', 'test-data', 'test-sutter-valid.xlsx');

// Validate test data files exist before tests run
for (const [label, filePath] of [['Hill valid', HILL_VALID_FILE], ['Sutter valid', SUTTER_VALID_FILE]]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Test data file not found: ${label} → ${filePath}`);
  }
}

// ---------------------------------------------------------------------------
// XLSX helper — reuse from backend node_modules
// ---------------------------------------------------------------------------
function getXLSX(): any {
  try {
    return require('xlsx');
  } catch {
    const backendXlsx = path.resolve(__dirname, '..', '..', 'backend', 'node_modules', 'xlsx');
    return require(backendXlsx);
  }
}

// ---------------------------------------------------------------------------
// Fixture generators — create conflict files on demand
// ---------------------------------------------------------------------------

/**
 * Hill conflict fixture: keeps required columns (Patient, DOB, at least 1 measure)
 * exact to pass sheet validation, but renames Phone → "Phone Number" and
 * Address → "Home Address" to trigger CHANGED conflicts during preview.
 * Also adds an unknown column "Extra Notes" to trigger a NEW conflict.
 */
function getHillConflictFixturePath(): string {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
  const filePath = path.join(fixturesDir, 'hill-conflict-renamed.xlsx');
  // Always regenerate to ensure correctness
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  // Need enough exact-match columns to pass WRONG_FILE_THRESHOLD (10% of ~73 config columns = 8+).
  // Include real measure & skip columns alongside AMBIGUOUS conflict-triggering columns.
  // AMBIGUOUS conflicts require fuzzy match scores ABOVE 0.80 with top 2 within 0.05.
  // These match MEASURE columns → BLOCKING severity (not WARNING like skip columns).
  const headers = [
    'Patient',                   // exact match (required patient column)
    'DOB',                       // exact match (required patient column)
    'Phone',                     // exact match (patient column)
    'Address',                   // exact match (patient column)
    'Annual Wellness Visit',     // exact match (measure column)
    'Eye Exam',                  // exact match (measure column)
    'BP Control',                // exact match (measure column)
    'Age',                       // exact match (skip column)
    'Sex',                       // exact match (skip column)
    'MembID',                    // exact match (skip column)
    'Kidney Health Evaluation for Patients With Diabetes',  // AMBIGUOUS BLOCKING (0.934 x2)
    'Breast Cancer Screening Years E',                      // AMBIGUOUS BLOCKING (0.899 x2)
  ];

  const data = [
    headers,
    ['Doe, Jane', '01/15/1960', '555-1234', '100 Main St', 'Compliant', 'Compliant', 'Compliant', '65', 'F', '12345', 'Compliant', 'Compliant'],
    ['Smith, Bob', '03/20/1975', '555-5678', '200 Oak Ave', 'Non Compliant', '', '', '50', 'M', '67890', 'Non Compliant', ''],
  ];

  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
  xlsx.writeFile(wb, filePath);
  return filePath;
}

/**
 * Sutter conflict fixture: keeps required columns exact to pass sheet validation.
 * Uses DUPLICATE headers to trigger BLOCKING conflicts during preview.
 * The "Health Plans" column appears twice → DUPLICATE BLOCKING conflict.
 * Sutter config columns are too distinct for AMBIGUOUS fuzzy matches above 0.80.
 */
function getSutterConflictFixturePath(): string {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir, { recursive: true });
  const filePath = path.join(fixturesDir, 'sutter-conflict-duplicate.xlsx');
  // Always regenerate to ensure correctness
  const xlsx = getXLSX();
  const wb = xlsx.utils.book_new();

  // Must have 3 non-blank title rows so headers land on row 3 (0-indexed)
  // when blankrows: false skips empty rows in sheet_to_json
  const titleRows: (string | undefined)[][] = [
    ['Sutter Independent Physicians - Quality Report'],
    ['Report Date: 01/15/2025'],
    ['Generated by: Quality Reporting System'],
  ];

  const headers = [
    'Member Name',             // exact match (required patient column)
    'Member DOB',              // exact match (required patient column)
    'Member Telephone',        // exact match (patient column)
    'Member Home Address',     // exact match (patient column)
    'Health Plans',            // exact match (data column) — FIRST occurrence
    'Race-Ethnicity',          // exact match (data column)
    'Possible Actions Needed', // exact match (data column)
    'Request Type',            // exact match (data column)
    'Measure Details',         // exact match (data column)
    'High Priority',           // exact match (data column)
    'Health Plans',            // DUPLICATE → BLOCKING conflict
  ];

  const data = [
    ...titleRows,
    headers,
    ['Doe, Jane', '01/15/1960', '(555) 123-4567', '123 Main St', 'Plan A', 'White', 'Mammogram in 2024', 'Quality', '', 'N', 'Plan X'],
    ['Smith, Bob', '03/20/1975', '(555) 987-6543', '456 Oak Ave', 'Plan B', 'Hispanic', '', 'AWV', '', 'N', 'Plan Y'],
  ];

  const ws = xlsx.utils.aoa_to_sheet(data);
  xlsx.utils.book_append_sheet(wb, ws, 'Physician One');

  xlsx.writeFile(wb, filePath);
  return filePath;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Upload a file and click Preview Import.
 *
 * Handles all role permutations:
 *   - Physician: sheet & physician auto-assigned (no dropdowns)
 *   - Staff: sheet may be auto-selected, physician dropdown shown
 *   - Admin/Admin+Physician: both dropdowns shown
 *
 * Also handles single-sheet (auto-selected) vs multi-sheet (dropdown).
 */
async function uploadAndClickPreview(
  importPage: ImportPage,
  page: Page,
  filePath: string,
  systemId: 'hill' | 'sutter',
) {
  await importPage.selectSystem(systemId);
  await importPage.uploadFile(filePath);

  const phyDropdown = page.locator('select#physician-selector');
  const phyAutoAssign = page.locator('text=Importing for:');
  const sheetSelect = page.locator('select#sheet-selector');
  const sheetStatus = page.locator('#sheet-selector[role="status"]');

  // Wait for sheet section to render. For multi-sheet files (Sutter), a tab
  // dropdown appears. For single-sheet files (Hill), auto-selected status text.
  // For physician-only roles, physician auto-assign may render immediately.
  await waitForAnyVisible([
    { locator: sheetSelect, label: 'sheet-selector dropdown' },
    { locator: sheetStatus, label: 'sheet auto-selected status' },
    { locator: phyDropdown, label: 'physician-selector dropdown' },
    { locator: phyAutoAssign, label: 'physician auto-assign text' },
  ], TIMEOUT.FILE_UPLOAD);

  // Select sheet/tab if dropdown exists (multi-sheet: Sutter tabs)
  if (await sheetSelect.isVisible().catch(() => false)) {
    const opts = await sheetSelect.locator('option').allInnerTexts();
    const validOpts = opts.filter(o => !o.startsWith('--'));
    if (validOpts.length > 0) {
      const preferred = validOpts.find(o => o.toLowerCase().includes('physician')) ?? validOpts[0];
      await sheetSelect.selectOption({ label: preferred });
    }
    // After selecting a tab, wait for physician section to render
    await waitForAnyVisible([
      { locator: phyDropdown, label: 'physician-selector dropdown' },
      { locator: phyAutoAssign, label: 'physician auto-assign text' },
    ], TIMEOUT.DEPENDENT_UI);
  }

  // Select physician if dropdown exists (admin/staff see a <select>)
  if (await phyDropdown.isVisible().catch(() => false)) {
    const opts = await phyDropdown.locator('option').all();
    for (const opt of opts) {
      const val = await opt.getAttribute('value');
      if (val !== null && val !== '') {
        await phyDropdown.selectOption(val);
        break;
      }
    }
  }

  // Wait for Preview button to be enabled, then click
  await expect(importPage.previewButton).toBeEnabled({ timeout: TIMEOUT.BUTTON_STATE });
  await importPage.clickPreview();
}

// ============================================================================
// TESTS
// ============================================================================

test.describe('Import Flow — Hill Healthcare', () => {

  // ---------- Valid Import (no conflicts → preview page) ----------

  test.describe('Valid Hill Import', () => {

    test('admin uploads valid Hill file and reaches preview page', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(ADMIN.email, ADMIN.password);

      await uploadAndClickPreview(importPage, page, HILL_VALID_FILE, 'hill');

      await page.waitForURL(/\/preview\//, { timeout: TIMEOUT.NAVIGATION });
      await expect(page.locator('text=Import Preview')).toBeVisible({ timeout: TIMEOUT.UI_RENDER });
      await expect(page.locator('button:has-text("Apply")')).toBeVisible();
    });

    test('physician uploads valid Hill file and reaches preview page', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(PHYSICIAN.email, PHYSICIAN.password);

      await uploadAndClickPreview(importPage, page, HILL_VALID_FILE, 'hill');

      await page.waitForURL(/\/preview\//, { timeout: TIMEOUT.NAVIGATION });
      await expect(page.locator('text=Import Preview')).toBeVisible({ timeout: TIMEOUT.UI_RENDER });
    });

    test('staff uploads valid Hill file and reaches preview page', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(STAFF.email, STAFF.password);

      await uploadAndClickPreview(importPage, page, HILL_VALID_FILE, 'hill');

      await page.waitForURL(/\/preview\//, { timeout: TIMEOUT.NAVIGATION });
      await expect(page.locator('text=Import Preview')).toBeVisible({ timeout: TIMEOUT.UI_RENDER });
    });
  });

  // ---------- Conflict Import (role-based UI) ----------

  test.describe('Hill Conflict Import', () => {

    test('admin sees interactive resolution form with dropdowns', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(ADMIN.email, ADMIN.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      // Should show conflict resolution step, NOT navigate to preview
      await page.locator('text=Column mapping conflicts detected').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });
      expect(page.url()).not.toContain('/preview/');

      // Admin should see resolution dropdowns
      const resolutionDropdowns = page.locator('select[aria-label^="Resolution for"]');
      const dropdownCount = await resolutionDropdowns.count();
      expect(dropdownCount).toBeGreaterThan(0);

      // Should see "Save & Continue" button (admin can resolve)
      await expect(page.locator('button:has-text("Save & Continue")')).toBeVisible();

      // Should see progress text (use span to avoid sr-only duplicate)
      await expect(page.locator('span', { hasText: /0 of \d+ conflicts resolved/ })).toBeVisible();

      // Should see conflict type labels (New, Renamed, Missing, Duplicate, Ambiguous)
      const typeLabels = page.locator('span').filter({
        hasText: /^(New|Renamed|Missing|Duplicate|Ambiguous)$/,
      });
      expect(await typeLabels.count()).toBeGreaterThan(0);
    });

    test('admin resolves all conflicts and Save & Continue enables', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(ADMIN.email, ADMIN.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      await page.locator('text=Column mapping conflicts detected').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Save should be disabled initially
      const saveButton = page.locator('button:has-text("Save & Continue")');
      await expect(saveButton).toBeDisabled();

      // Resolve all conflicts by selecting the first non-empty option
      const resolutionDropdowns = page.locator('select[aria-label^="Resolution for"]');
      const dropdownCount = await resolutionDropdowns.count();

      for (let i = 0; i < dropdownCount; i++) {
        const dropdown = resolutionDropdowns.nth(i);
        const opts = await dropdown.locator('option').all();
        for (const opt of opts) {
          const val = await opt.getAttribute('value');
          if (val !== null && val !== '') {
            await dropdown.selectOption(val);
            break;
          }
        }
        await page.waitForTimeout(TIMEOUT.DROPDOWN_SETTLE);
      }

      // Save should now be enabled
      await expect(saveButton).toBeEnabled({ timeout: TIMEOUT.BUTTON_STATE });

      // Progress should show all resolved (use span to avoid sr-only duplicate)
      await expect(page.locator('span', { hasText: new RegExp(`${dropdownCount} of ${dropdownCount} conflicts resolved`) })).toBeVisible();
    });

    test('physician sees read-only banner with "contact administrator" message', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(PHYSICIAN.email, PHYSICIAN.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      // Should see conflict banner with role="alert"
      const alertBanner = page.locator('[role="alert"]');
      await alertBanner.waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Should see "contact your administrator" message
      await expect(page.locator('text=Please contact your administrator')).toBeVisible();

      // Should NOT see resolution dropdowns
      expect(await page.locator('select[aria-label^="Resolution for"]').count()).toBe(0);

      // Should NOT see "Save & Continue" button
      await expect(page.locator('button:has-text("Save & Continue")')).not.toBeVisible();

      // SHOULD see "Cancel" and "Copy Details" buttons
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Copy Details")')).toBeVisible();

      // Should see conflict heading
      await expect(page.locator('text=Column mapping conflicts detected')).toBeVisible();
    });

    test('physician sees conflict details but no way to modify mappings', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(PHYSICIAN.email, PHYSICIAN.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      await page.locator('[role="alert"]').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Should see grouped conflict list with items
      const conflictItems = page.locator('[role="alert"] li');
      expect(await conflictItems.count()).toBeGreaterThan(0);

      // Should see at least one conflict type label (Renamed, New, etc.)
      const typeLabels = page.locator('[role="alert"] span').filter({
        hasText: /^(New|Renamed|Missing|Duplicate|Ambiguous)$/,
      });
      expect(await typeLabels.count()).toBeGreaterThan(0);

      // Verify still on import page (not navigated to preview)
      expect(page.url()).not.toContain('/preview/');
    });

    test('staff sees read-only banner with "contact administrator" message', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(STAFF.email, STAFF.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      // Should see alert banner
      const alertBanner = page.locator('[role="alert"]');
      await alertBanner.waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Should see "contact your administrator"
      await expect(page.locator('text=Please contact your administrator')).toBeVisible();

      // Should NOT see admin-only controls
      expect(await page.locator('select[aria-label^="Resolution for"]').count()).toBe(0);
      await expect(page.locator('button:has-text("Save & Continue")')).not.toBeVisible();

      // Should see Cancel and Copy Details
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Copy Details")')).toBeVisible();
    });

    test('staff can click Cancel to return to file upload', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(STAFF.email, STAFF.password);

      const conflictFile = getHillConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

      await page.locator('[role="alert"]').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Click Cancel
      await page.locator('[role="alert"] button:has-text("Cancel")').click();

      // Conflict banner should disappear
      await expect(page.locator('[role="alert"]')).not.toBeVisible({ timeout: TIMEOUT.BUTTON_STATE });

      // Should see the Upload File step again
      await expect(page.locator('text=Upload File')).toBeVisible();
    });
  });
});

test.describe('Import Flow — Sutter/SIP', () => {

  // ---------- Valid Sutter Import ----------

  test.describe('Valid Sutter Import', () => {

    test('admin uploads valid Sutter file and reaches preview page', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(ADMIN.email, ADMIN.password);

      await uploadAndClickPreview(importPage, page, SUTTER_VALID_FILE, 'sutter');

      await page.waitForURL(/\/preview\//, { timeout: TIMEOUT.NAVIGATION });
      await expect(page.locator('text=Import Preview')).toBeVisible({ timeout: TIMEOUT.UI_RENDER });
    });
  });

  // ---------- Sutter Conflict Import ----------

  test.describe('Sutter Conflict Import', () => {

    test('admin sees interactive resolution form for Sutter conflicts', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(ADMIN.email, ADMIN.password);

      const conflictFile = getSutterConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'sutter');

      // Should show conflict resolution step
      await page.locator('text=Column mapping conflicts detected').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      // Admin should see resolution dropdowns
      const resolutionDropdowns = page.locator('select[aria-label^="Resolution for"]');
      expect(await resolutionDropdowns.count()).toBeGreaterThan(0);

      // Should see Save & Continue
      await expect(page.locator('button:has-text("Save & Continue")')).toBeVisible();
    });

    test('physician sees read-only banner for Sutter conflicts', async ({ page }) => {
      const importPage = new ImportPage(page);
      await importPage.goto(PHYSICIAN.email, PHYSICIAN.password);

      const conflictFile = getSutterConflictFixturePath();
      await uploadAndClickPreview(importPage, page, conflictFile, 'sutter');

      // Non-admin: should see alert banner with "contact administrator"
      const alertBanner = page.locator('[role="alert"]');
      await alertBanner.waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

      await expect(page.locator('text=Please contact your administrator')).toBeVisible();

      // Should NOT see admin controls
      expect(await page.locator('select[aria-label^="Resolution for"]').count()).toBe(0);
      await expect(page.locator('button:has-text("Save & Continue")')).not.toBeVisible();

      // Should see Cancel and Copy Details
      await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
      await expect(page.locator('button:has-text("Copy Details")')).toBeVisible();
    });
  });
});

test.describe('Import Flow — Admin+Physician Dual Role', () => {

  test('admin+physician sees admin resolution form (not read-only banner)', async ({ page }) => {
    const importPage = new ImportPage(page);
    await importPage.goto(ADMIN_PHY.email, ADMIN_PHY.password);

    const conflictFile = getHillConflictFixturePath();
    await uploadAndClickPreview(importPage, page, conflictFile, 'hill');

    // Should show conflict resolution step
    await page.locator('text=Column mapping conflicts detected').waitFor({ state: 'visible', timeout: TIMEOUT.UI_RENDER });

    // ADMIN+PHYSICIAN should see the admin form (resolution dropdowns), NOT the read-only banner
    const resolutionDropdowns = page.locator('select[aria-label^="Resolution for"]');
    expect(await resolutionDropdowns.count()).toBeGreaterThan(0);

    // Should see Save & Continue (admin privilege)
    await expect(page.locator('button:has-text("Save & Continue")')).toBeVisible();

    // Should NOT see "contact your administrator" (admin can resolve)
    await expect(page.locator('text=Please contact your administrator')).not.toBeVisible();
  });
});
