import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login-page';

// Admin credentials (from seed data)
const ADMIN_EMAIL = 'ko037291@gmail.com';
const ADMIN_PASSWORD = 'welcome100';
// Physician credentials (from seed data)
const PHYSICIAN_EMAIL = 'dr.smith@hillclinic.com';
const PHYSICIAN_PASSWORD = 'password123';

test.describe('Patient Management Page', () => {
  test.describe('Navigation & Tab Display (ADMIN)', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test('header shows "Patient Mgmt" nav link', async ({ page }) => {
      const navLink = page.locator('a:has-text("Patient Mgmt")');
      await expect(navLink).toBeVisible();
    });

    test('navigating to /patient-management shows Import tab by default', async ({ page }) => {
      await page.goto('/patient-management');
      await expect(page.locator('text=Patient Management')).toBeVisible();
      await expect(page.locator('button:has-text("Import Patients")')).toBeVisible();
      // Import tab content should be visible (has file upload area)
      await expect(page.locator('text=Select Healthcare System')).toBeVisible();
    });

    test('ADMIN sees both Import and Reassign tabs', async ({ page }) => {
      await page.goto('/patient-management');
      await expect(page.locator('button:has-text("Import Patients")')).toBeVisible();
      await expect(page.locator('button:has-text("Reassign Patients")')).toBeVisible();
    });

    test('clicking Reassign tab shows reassign content', async ({ page }) => {
      await page.goto('/patient-management');
      await page.locator('button:has-text("Reassign Patients")').click();

      // URL should update
      await expect(page).toHaveURL(/tab=reassign/);

      // Reassign content should become visible (loading or empty state or patient list)
      await expect(
        page.locator('text=All Patients Assigned').or(page.locator('text=Loading unassigned patients')).or(page.locator('text=Assign to:'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('"Patient Mgmt" nav link highlights when on patient-management page', async ({ page }) => {
      await page.goto('/patient-management');
      const navLink = page.locator('a:has-text("Patient Mgmt")');
      await expect(navLink).toHaveClass(/text-blue-600/);
    });
  });

  test.describe('Redirects', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(ADMIN_EMAIL, ADMIN_PASSWORD);
    });

    test('/import redirects to /patient-management', async ({ page }) => {
      await page.goto('/import');
      await expect(page).toHaveURL(/\/patient-management/, { timeout: 5000 });
    });

    test('/admin/patient-assignment redirects to /patient-management?tab=reassign', async ({ page }) => {
      await page.goto('/admin/patient-assignment');
      await expect(page).toHaveURL(/\/patient-management\?tab=reassign/, { timeout: 5000 });
    });
  });

  test.describe('Non-admin role (PHYSICIAN)', () => {
    test.beforeEach(async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.loginAndWaitForRedirect(PHYSICIAN_EMAIL, PHYSICIAN_PASSWORD);
    });

    test('PHYSICIAN does not see Reassign tab', async ({ page }) => {
      await page.goto('/patient-management');
      await expect(page.locator('button:has-text("Import Patients")')).toBeVisible();
      await expect(page.locator('button:has-text("Reassign Patients")')).not.toBeVisible();
    });

    test('?tab=reassign falls back to Import for PHYSICIAN', async ({ page }) => {
      await page.goto('/patient-management?tab=reassign');
      // Should show import tab content, not reassign
      await expect(page.locator('text=Select Healthcare System')).toBeVisible();
    });
  });
});
