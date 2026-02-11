/**
 * Parallel Editing - Reconnection Behavior E2E Tests
 *
 * Tests Socket.IO reconnection behavior when network is disrupted,
 * using Playwright's route interception to simulate network issues.
 */

import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Reconnection Behavior', () => {
  test('status shows Reconnecting when Socket.IO is blocked', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    // Verify initially connected
    const statusBar = page.locator('.bg-gray-100.border-t');
    await expect(statusBar).toContainText('Connected', { timeout: 10000 });

    // Block Socket.IO requests to simulate network disruption
    await page.route('**/socket.io/**', route => route.abort());

    // Wait for Socket.IO to detect disconnection
    await page.waitForTimeout(5000);

    // Status should change to Reconnecting or Disconnected
    const statusText = await statusBar.innerText();
    const isReconnecting = statusText.includes('Reconnecting') || statusText.includes('Disconnected');
    expect(isReconnecting).toBe(true);
  });

  test('status returns to Connected after network restored', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    const statusBar = page.locator('.bg-gray-100.border-t');
    await expect(statusBar).toContainText('Connected', { timeout: 10000 });

    // Block Socket.IO
    await page.route('**/socket.io/**', route => route.abort());
    await page.waitForTimeout(5000);

    // Unblock Socket.IO
    await page.unroute('**/socket.io/**');

    // Wait for reconnection
    await page.waitForTimeout(10000);

    // Status should return to Connected
    await expect(statusBar).toContainText('Connected', { timeout: 15000 });
  });
});
