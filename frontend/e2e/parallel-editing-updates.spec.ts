/**
 * Parallel Editing - Real-Time Updates E2E Tests
 *
 * Tests that changes by one user appear in real-time for another user
 * without requiring a page refresh.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { MainPage } from './pages/main-page';

const USER_A = { email: 'ko037291@gmail.com', password: 'welcome100' };
const USER_B = { email: 'staff1@clinic.com', password: 'welcome100' };

async function loginAndNavigate(page: Page, email: string, password: string): Promise<MainPage> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 10000 });

  const mainPage = new MainPage(page);
  await page.goto('/');
  await mainPage.waitForGridLoad();
  return mainPage;
}

test.describe('Real-Time Updates', () => {
  test('User A cell edit appears on User B grid', async ({ browser }) => {
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      const mainPageA = await loginAndNavigate(pageA, USER_A.email, USER_A.password);
      const mainPageB = await loginAndNavigate(pageB, USER_B.email, USER_B.password);

      // Wait for socket connections
      await pageA.waitForTimeout(3000);

      const testValue = `RealTime ${Date.now()}`;

      // User A edits notes on first row
      await mainPageA.editCell(0, 'notes', testValue);
      await mainPageA.waitForSave();

      // Wait for broadcast to reach User B
      await pageB.waitForTimeout(3000);

      // User B should see the updated value without refreshing
      const cellValueB = await mainPageB.getCellValue(0, 'notes');
      expect(cellValueB).toContain(testValue);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('User A adds row and User B sees it appear', async ({ browser }) => {
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      const mainPageA = await loginAndNavigate(pageA, USER_A.email, USER_A.password);
      const mainPageB = await loginAndNavigate(pageB, USER_B.email, USER_B.password);

      await pageA.waitForTimeout(3000);

      // Get initial row count for User B
      const initialCountB = await mainPageB.getRowCount();

      // User A adds a new row
      const testName = `NewPatient ${Date.now()}`;
      await mainPageA.addTestRow(testName);

      // Wait for broadcast
      await pageB.waitForTimeout(3000);

      // User B should see the new row
      const newCountB = await mainPageB.getRowCount();
      expect(newCountB).toBeGreaterThan(initialCountB);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('User A deletes row and User B sees it disappear', async ({ browser }) => {
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      const mainPageA = await loginAndNavigate(pageA, USER_A.email, USER_A.password);
      const mainPageB = await loginAndNavigate(pageB, USER_B.email, USER_B.password);

      await pageA.waitForTimeout(3000);

      // First add a row so we have something to delete
      const testName = `DeleteMe ${Date.now()}`;
      await mainPageA.addTestRow(testName);
      await pageA.waitForTimeout(2000);

      const countBeforeDelete = await mainPageB.getRowCount();

      // User A selects and deletes the new row
      const rowIndex = await mainPageA.findRowByMemberName(testName);
      if (rowIndex >= 0) {
        await mainPageA.selectRow(rowIndex);
        await mainPageA.deleteButton.click();

        // Confirm deletion if modal appears
        const confirmBtn = pageA.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Wait for broadcast
        await pageB.waitForTimeout(3000);

        // User B should see one fewer row
        const countAfterDelete = await mainPageB.getRowCount();
        expect(countAfterDelete).toBeLessThan(countBeforeDelete);
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
