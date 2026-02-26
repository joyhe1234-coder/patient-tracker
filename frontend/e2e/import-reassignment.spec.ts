import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

/**
 * B12.10: Import Reassignment Confirmation E2E Tests
 *
 * Tests the reassignment warning banner and confirmation modal that appears
 * when importing patients that already belong to a different physician.
 *
 * Uses Playwright route interception to mock the preview response with
 * reassignment data, ensuring reliable test isolation.
 */

test.describe('Import Reassignment Confirmation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin (has access to physician selector)
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.loginAndWaitForRedirect('ko037291@gmail.com', 'welcome100');
  });

  test('shows reassignment warning banner and confirmation modal on execute', async ({ page }) => {
    // Mock the preview API to return reassignment data
    const mockPreviewId = 'test-reassign-preview-123';
    const mockPreviewResponse = {
      success: true,
      data: {
        previewId: mockPreviewId,
        system: 'hill',
        mode: 'merge',
        fileName: 'test-reassignment.csv',
        stats: {
          totalRows: 5,
          newPatients: 0,
          updatedMeasures: 3,
          newMeasures: 0,
          unchangedMeasures: 2,
          skippedRows: 0,
          errors: [],
          warnings: [],
        },
        changes: [
          { action: 'update', memberName: 'Smith, John', qualityMeasure: 'Annual Wellness Visit', fields: { measureStatus: { old: 'Pending', new: 'AWV completed' } } },
          { action: 'update', memberName: 'Doe, Jane', qualityMeasure: 'Diabetes Control', fields: { measureStatus: { old: 'Pending', new: 'HgbA1c ordered' } } },
          { action: 'update', memberName: 'Brown, Bob', qualityMeasure: 'Breast Cancer Screening', fields: { measureStatus: { old: 'Pending', new: 'Screening discussed' } } },
          { action: 'unchanged', memberName: 'Wilson, Mary', qualityMeasure: 'Annual Wellness Visit' },
          { action: 'unchanged', memberName: 'Davis, Tom', qualityMeasure: 'Hypertension' },
        ],
        reassignments: {
          count: 2,
          requiresConfirmation: true,
          items: [
            {
              patientId: 101,
              memberName: 'Smith, John',
              memberDob: '1990-01-15',
              currentOwnerId: 2,
              currentOwnerName: 'Dr. Physician 1',
              newOwnerId: 3,
              newOwnerName: 'Dr. Physician 2',
            },
            {
              patientId: 102,
              memberName: 'Doe, Jane',
              memberDob: '1985-05-20',
              currentOwnerId: 2,
              currentOwnerName: 'Dr. Physician 1',
              newOwnerId: 3,
              newOwnerName: 'Dr. Physician 2',
            },
          ],
        },
      },
    };

    // Intercept the preview API response
    await page.route('**/api/import/preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPreviewResponse),
      });
    });

    // Intercept the execute API — require confirmReassign=true
    await page.route('**/api/import/execute/**', async (route) => {
      const url = route.request().url();
      if (url.includes('confirmReassign=true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              created: 0,
              updated: 3,
              unchanged: 2,
              errors: 0,
              reassigned: 2,
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: {
              code: 'REASSIGNMENT_REQUIRES_CONFIRMATION',
              message: 'This import would reassign 2 patient(s). Set confirmReassign=true to proceed.',
            },
          }),
        });
      }
    });

    // Navigate to import page
    await page.goto('/patient-management');
    await page.locator('text=Select Healthcare System').waitFor({ state: 'visible', timeout: 15000 });

    // Select Hill system
    await page.locator('select').first().selectOption('hill');

    // Upload a file (create a minimal test file)
    const fileContent = 'Member Name,DOB\nSmith John,01/15/1990';
    const buffer = Buffer.from(fileContent, 'utf-8');
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test-reassignment.csv',
      mimeType: 'text/csv',
      buffer,
    });

    // Select physician and click preview
    const physicianDropdown = page.locator('#physician-selector');
    await physicianDropdown.waitFor({ state: 'visible', timeout: 10000 });
    // Select first available physician option (skip placeholder)
    const options = await physicianDropdown.locator('option').allInnerTexts();
    const validOption = options.find(o => !o.startsWith('--') && !o.startsWith('Select'));
    if (validOption) {
      await physicianDropdown.selectOption({ label: validOption });
    }

    await page.locator('button:has-text("Preview Import")').click();

    // Wait for preview page to load
    await page.locator('text=Import Preview').waitFor({ state: 'visible', timeout: 15000 });

    // 1. Verify reassignment warning banner is visible
    const reassignBanner = page.locator('text=/\\d+ Patient.*Will Be Reassigned/');
    await expect(reassignBanner).toBeVisible({ timeout: 5000 });

    // 2. Verify reassignment details (patient names and arrows)
    await expect(page.getByText('Smith, John')).toBeVisible();
    await expect(page.getByText('Doe, Jane')).toBeVisible();
    await expect(page.getByText('Dr. Physician 1').first()).toBeVisible();
    await expect(page.getByText('Dr. Physician 2').first()).toBeVisible();

    // 3. Click "Apply X Changes" — should show confirmation modal
    const applyButton = page.locator('button:has-text("Apply")');
    await applyButton.click();

    // 4. Verify confirmation modal appears
    const confirmModal = page.locator('text=Confirm Patient Reassignment');
    await expect(confirmModal).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/will reassign.*2 patient/i)).toBeVisible();

    // 5. Click "Yes, Reassign & Import" to confirm
    const confirmButton = page.locator('button:has-text("Reassign")');
    await confirmButton.click();

    // 6. Import should complete (the mocked execute returns success)
    await expect(page.getByText(/Import Complete|import completed/i)).toBeVisible({ timeout: 10000 });
  });
});
