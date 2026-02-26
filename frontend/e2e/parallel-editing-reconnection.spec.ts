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

    // Wait for status bar to reflect disconnection (Reconnecting or Disconnected)
    await expect(async () => {
      const statusText = await statusBar.innerText();
      const isReconnecting = statusText.includes('Reconnecting') || statusText.includes('Disconnected');
      expect(isReconnecting).toBe(true);
    }).toPass({ timeout: 15000 });
  });

  test('status returns to Connected after network restored', async ({ page }) => {
    const mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();

    const statusBar = page.locator('.bg-gray-100.border-t');
    await expect(statusBar).toContainText('Connected', { timeout: 10000 });

    // Block Socket.IO
    await page.route('**/socket.io/**', route => route.abort());

    // Wait for status to show disconnection before unblocking
    await expect(async () => {
      const statusText = await statusBar.innerText();
      const isDisconnected = statusText.includes('Reconnecting') || statusText.includes('Disconnected');
      expect(isDisconnected).toBe(true);
    }).toPass({ timeout: 15000 });

    // Unblock Socket.IO
    await page.unroute('**/socket.io/**');

    // Status should return to Connected after reconnection
    await expect(statusBar).toContainText('Connected', { timeout: 30000 });
  });
});
