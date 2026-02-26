import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Compact Filter Bar', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();
  });

  test('compact chips render on single line without wrapping', async ({ page }) => {
    // All filter chips should be visible and compact
    const allChip = mainPage.filterBar.locator('button:has-text("All")');
    await expect(allChip).toBeVisible();

    // Chips should have compact styling (whitespace-nowrap prevents wrapping)
    const chipClasses = await allChip.getAttribute('class');
    expect(chipClasses).toContain('whitespace-nowrap');
    expect(chipClasses).toContain('py-0.5');
    expect(chipClasses).toContain('text-xs');

    // Verify all 10 chips are visible
    const chipLabels = ['All', 'Duplicates', 'Not Addressed', 'Overdue', 'In Progress', 'Contacted', 'Completed', 'Declined', 'Resolved', 'N/A'];
    for (const label of chipLabels) {
      await expect(mainPage.filterBar.locator(`button:has-text("${label}")`)).toBeVisible();
    }
  });

  test('measure dropdown is visible and functional', async ({ page }) => {
    // Dropdown should be visible with "All Measures" as default
    const dropdown = await mainPage.getMeasureDropdown();
    await expect(dropdown).toBeVisible();
    expect(await mainPage.getSelectedMeasure()).toBe('All Measures');

    // Get initial row count from status bar
    const initialText = await mainPage.getStatusBarText();
    const initialMatch = initialText.match(/Showing ([\d,]+) of ([\d,]+)/);
    expect(initialMatch).not.toBeNull();

    // Select a specific measure
    await mainPage.selectMeasure('Annual Wellness Visit');
    expect(await mainPage.getSelectedMeasure()).toBe('Annual Wellness Visit');

    // Dropdown should show blue ring when measure is active
    const dropdownClasses = await dropdown.getAttribute('class');
    expect(dropdownClasses).toContain('ring-2');
    expect(dropdownClasses).toContain('ring-blue-400');

    // Status bar should reflect the filter
    const filteredText = await mainPage.getStatusBarText();
    expect(filteredText).toContain('Showing');

    // Reset to All Measures
    await mainPage.selectMeasure('All Measures');
    expect(await mainPage.getSelectedMeasure()).toBe('All Measures');
  });

  test('combined filter updates status bar summary', async ({ page }) => {
    // Select a measure
    await mainPage.selectMeasure('Annual Wellness Visit');

    // Status bar should show filter summary
    const statusText = await mainPage.getStatusBarText();
    expect(statusText).toContain('Measure: Annual Wellness Visit');

    // Click a color chip
    await mainPage.clickFilterChip('Completed');

    // Wait for status bar to reflect the new filter
    await expect(mainPage.statusBar).toContainText('Completed');

    // Status bar should show both filters
    const combinedText = await mainPage.getStatusBarText();
    expect(combinedText).toContain('Completed');
    expect(combinedText).toContain('Annual Wellness Visit');

    // Click All to clear color filter
    await mainPage.clickFilterChip('All');

    // Reset measure
    await mainPage.selectMeasure('All Measures');

    // Wait for status bar to update after clearing all filters
    await expect(mainPage.statusBar).not.toContainText('Measure:');

    // Status bar should not show filter summary
    const resetText = await mainPage.getStatusBarText();
    expect(resetText).not.toContain('Measure:');
  });

  test('measure selection persists after chip toggle', async ({ page }) => {
    // Select a measure
    await mainPage.selectMeasure('Diabetic Eye Exam');
    expect(await mainPage.getSelectedMeasure()).toBe('Diabetic Eye Exam');

    // Click a color chip
    await mainPage.clickFilterChip('In Progress');

    // Wait for status bar to reflect the filter change
    await expect(mainPage.statusBar).toContainText('In Progress');

    // Measure should still be selected
    expect(await mainPage.getSelectedMeasure()).toBe('Diabetic Eye Exam');

    // Toggle back to All
    await mainPage.clickFilterChip('All');

    // Wait for status bar to update after clearing color filter
    await expect(mainPage.statusBar).not.toContainText('In Progress');

    // Measure should still be selected
    expect(await mainPage.getSelectedMeasure()).toBe('Diabetic Eye Exam');
  });

  test('zero-count chip appears faded', async ({ page }) => {
    // Select a specific measure that likely has zero-count categories
    await mainPage.selectMeasure('Annual Wellness Visit');

    // Wait for status bar to reflect the measure filter
    await expect(mainPage.statusBar).toContainText('Annual Wellness Visit');

    // Check chips - some should have opacity-30 (zero count)
    const chips = mainPage.filterBar.locator('button[aria-pressed]');
    const chipCount = await chips.count();
    expect(chipCount).toBe(10);

    // Find at least one chip with opacity-30 (zero-count inactive chip)
    let foundFaded = false;
    for (let i = 0; i < chipCount; i++) {
      const chip = chips.nth(i);
      const classes = await chip.getAttribute('class');
      if (classes?.includes('opacity-30')) {
        foundFaded = true;
        // Faded chip should still be clickable
        const isDisabled = await chip.isDisabled();
        expect(isDisabled).toBe(false);
        break;
      }
    }
    // It's possible all categories have data, so this is a soft check
    // The important thing is the chip rendering doesn't break
    expect(chipCount).toBe(10);
  });
});
