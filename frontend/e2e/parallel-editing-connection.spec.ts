/**
 * Parallel Editing - Connection Status & Presence E2E Tests
 *
 * Tests Socket.IO connection status indicators and multi-user presence
 * using Playwright's multi-context feature to simulate two users.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';
import { MainPage } from './pages/main-page';

const USER_A = { email: 'ko037291@gmail.com', password: 'welcome100' };
const USER_B = { email: 'staff1@clinic.com', password: 'welcome100' };

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 10000 });
}

test.describe('Connection Status & Presence', () => {
  test('connection status shows Connected after login', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    // Status bar should show "Connected" with green dot
    const statusBar = page.locator('.bg-gray-100.border-t');
    await expect(statusBar).toContainText('Connected', { timeout: 10000 });
  });

  test('presence indicator shows when second user joins', async ({ browser }) => {
    // Create two browser contexts for two users
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      // User A logs in
      await loginAs(pageA, USER_A.email, USER_A.password);
      await pageA.goto('/');
      await pageA.waitForSelector('.ag-row[row-index]', { timeout: 15000 });

      // User B logs in
      await loginAs(pageB, USER_B.email, USER_B.password);
      await pageB.goto('/');
      await pageB.waitForSelector('.ag-row[row-index]', { timeout: 15000 });

      // Wait for Socket.IO connections to be established on both pages
      await expect(pageA.locator('.bg-gray-100.border-t')).toContainText('Connected', { timeout: 10000 });
      await expect(pageB.locator('.bg-gray-100.border-t')).toContainText('Connected', { timeout: 10000 });

      // User A should see presence indicator showing another user
      const statusBarA = pageA.locator('.bg-gray-100.border-t');
      await expect(statusBarA).toContainText(/\d+ other/, { timeout: 10000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('presence updates when second user leaves', async ({ browser }) => {
    const contextA: BrowserContext = await browser.newContext();
    const contextB: BrowserContext = await browser.newContext();

    const pageA: Page = await contextA.newPage();
    const pageB: Page = await contextB.newPage();

    try {
      // Both users log in
      await loginAs(pageA, USER_A.email, USER_A.password);
      await pageA.goto('/');
      await pageA.waitForSelector('.ag-row[row-index]', { timeout: 15000 });

      await loginAs(pageB, USER_B.email, USER_B.password);
      await pageB.goto('/');
      await pageB.waitForSelector('.ag-row[row-index]', { timeout: 15000 });

      // Wait for socket connections and presence to show
      await expect(pageA.locator('.bg-gray-100.border-t')).toContainText('Connected', { timeout: 10000 });
      await expect(pageB.locator('.bg-gray-100.border-t')).toContainText('Connected', { timeout: 10000 });
      const statusBarA = pageA.locator('.bg-gray-100.border-t');
      await expect(statusBarA).toContainText(/\d+ other/, { timeout: 10000 });

      // User B leaves (close context)
      await contextB.close();

      // Presence indicator should disappear or show 0 others
      // The "others online" text should no longer be visible
      const presenceText = pageA.locator('text=/\\d+ other/');
      await expect(presenceText).toBeHidden({ timeout: 10000 });
    } finally {
      await contextA.close().catch(() => {});
    }
  });
});
