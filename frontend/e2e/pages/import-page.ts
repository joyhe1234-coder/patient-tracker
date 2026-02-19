import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Patient Management Import flow.
 *
 * Encapsulates navigation, file upload, system/mode selection, sheet selection,
 * physician selection, and the preview/execute steps for E2E tests.
 */
export class ImportPage {
  readonly page: Page;

  // System selector
  readonly systemDropdown: Locator;

  // File upload area
  readonly browseFilesButton: Locator;
  readonly fileInput: Locator;
  readonly removeFileButton: Locator;

  // Sheet selector (Sutter only)
  readonly sheetDropdown: Locator;
  readonly physicianDropdown: Locator;

  // Submit
  readonly previewButton: Locator;

  // Error display
  readonly errorDisplay: Locator;
  readonly sheetErrorDisplay: Locator;

  // Loading indicators
  readonly sheetLoadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;

    // Healthcare system select (Step 1)
    this.systemDropdown = page.locator('select').first();

    // File upload
    this.browseFilesButton = page.locator('text=Browse Files');
    this.fileInput = page.locator('input[type="file"]');
    this.removeFileButton = page.locator('button[title="Remove file"]');

    // Sheet selector dropdowns (rendered inside SheetSelector component)
    this.sheetDropdown = page.locator('#sheet-selector');
    this.physicianDropdown = page.locator('#physician-selector');

    // Preview button
    this.previewButton = page.locator('button:has-text("Preview Import")');

    // Error areas
    this.errorDisplay = page.locator('.bg-red-50:has-text("Error")');
    this.sheetErrorDisplay = page.locator('.bg-red-50:has-text("Sheet Discovery")');

    // Loading
    this.sheetLoadingIndicator = page.locator('text=Discovering workbook tabs...');
  }

  /**
   * Navigate to the Patient Management page (Import tab).
   * Handles login if needed.
   */
  async goto(email = 'ko037291@gmail.com', password = 'welcome100') {
    await this.page.goto('/patient-management');

    // Handle login redirect if needed
    const emailInput = this.page.locator('input[name="email"]');
    const needsLogin = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (needsLogin) {
      await emailInput.fill(email);
      await this.page.locator('input[name="password"]').fill(password);
      await this.page.locator('button[type="submit"]').click();
      await this.page.waitForURL(/\/patient-management/, { timeout: 10000 });
    }

    // Ensure we're on the Import tab
    await this.page.locator('text=Select Healthcare System').waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Select a healthcare system from the Step 1 dropdown.
   */
  async selectSystem(systemId: 'hill' | 'sutter') {
    await this.systemDropdown.selectOption(systemId);
  }

  /**
   * Upload a file using the hidden file input.
   * Playwright's setInputFiles is used to programmatically set the file.
   */
  async uploadFile(filePath: string) {
    await this.fileInput.setInputFiles(filePath);
  }

  /**
   * Remove the currently uploaded file.
   */
  async removeFile() {
    await this.removeFileButton.click();
  }

  /**
   * Wait for sheet discovery to complete (loading spinner disappears).
   */
  async waitForSheetDiscovery() {
    // Wait for loading to appear then disappear
    await this.sheetLoadingIndicator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    await this.sheetLoadingIndicator.waitFor({ state: 'hidden', timeout: 15000 });
  }

  /**
   * Select a sheet/tab from the SheetSelector dropdown.
   */
  async selectSheet(sheetName: string) {
    await this.sheetDropdown.selectOption(sheetName);
  }

  /**
   * Select a physician from the SheetSelector physician dropdown.
   */
  async selectPhysician(physicianId: string) {
    await this.physicianDropdown.selectOption(physicianId);
  }

  /**
   * Get all available sheet options from the dropdown.
   */
  async getSheetOptions(): Promise<string[]> {
    const options = await this.sheetDropdown.locator('option').allInnerTexts();
    // Filter out the placeholder option
    return options.filter((o) => !o.startsWith('--'));
  }

  /**
   * Get the currently selected sheet value.
   */
  async getSelectedSheet(): Promise<string> {
    return await this.sheetDropdown.inputValue();
  }

  /**
   * Get the currently selected physician value.
   */
  async getSelectedPhysician(): Promise<string> {
    return await this.physicianDropdown.inputValue();
  }

  /**
   * Check if the physician dropdown shows "(suggested)" for a specific physician.
   */
  async hasSuggestedLabel(): Promise<boolean> {
    const options = await this.physicianDropdown.locator('option').allInnerTexts();
    return options.some((o) => o.includes('(suggested)'));
  }

  /**
   * Get the auto-match info text below physician dropdown.
   */
  async getAutoMatchText(): Promise<string> {
    const autoMatchInfo = this.page.locator('text=Auto-matched from tab name');
    if (await autoMatchInfo.isVisible().catch(() => false)) {
      return await autoMatchInfo.innerText();
    }
    return '';
  }

  /**
   * Click the "Preview Import" button.
   */
  async clickPreview() {
    await this.previewButton.click();
  }

  /**
   * Check if the Preview Import button is disabled.
   */
  async isPreviewDisabled(): Promise<boolean> {
    return await this.previewButton.isDisabled();
  }

  /**
   * Get the error message text displayed on the page.
   */
  async getErrorText(): Promise<string> {
    // Look for error text in both error display areas
    const errorBg = this.page.locator('.bg-red-50');
    if (await errorBg.first().isVisible().catch(() => false)) {
      return await errorBg.first().innerText();
    }
    return '';
  }

  /**
   * Get the sheet discovery error text.
   */
  async getSheetErrorText(): Promise<string> {
    const errorEl = this.page.locator('.bg-red-50:has-text("Sheet Discovery Failed")');
    if (await errorEl.isVisible().catch(() => false)) {
      return await errorEl.innerText();
    }
    return '';
  }

  /**
   * Check if the "Select Tab & Physician" step is visible.
   */
  async isSheetSelectorStepVisible(): Promise<boolean> {
    return await this.page.locator('text=Select Tab & Physician').isVisible().catch(() => false);
  }

  /**
   * Get the step number for a given step heading.
   */
  async getStepNumber(stepHeading: string): Promise<string> {
    const stepContainer = this.page.locator(`.bg-white.rounded-lg:has-text("${stepHeading}")`);
    const stepBadge = stepContainer.locator('.rounded-full.bg-blue-100');
    if (await stepBadge.isVisible().catch(() => false)) {
      return (await stepBadge.innerText()).trim();
    }
    return '';
  }

  /**
   * Get the tab count text from SheetSelector (e.g., "2 physician tabs found in workbook").
   */
  async getTabCountText(): Promise<string> {
    const tabCountEl = this.page.locator('text=/\\d+ physician tab/');
    if (await tabCountEl.isVisible().catch(() => false)) {
      return await tabCountEl.innerText();
    }
    return '';
  }

  /**
   * Check if the "please select a physician" warning is visible.
   */
  async isPhysicianWarningVisible(): Promise<boolean> {
    return await this.page.locator('text=Please select a physician to continue').isVisible().catch(() => false);
  }
}

/**
 * Page Object for the Import Preview page.
 */
export class PreviewPage {
  readonly page: Page;

  // Header elements
  readonly heading: Locator;
  readonly sheetNameDisplay: Locator;
  readonly physicianNameDisplay: Locator;

  // Unmapped actions banner
  readonly unmappedBanner: Locator;
  readonly showDetailsButton: Locator;
  readonly hideDetailsButton: Locator;

  // Action buttons
  readonly applyButton: Locator;
  readonly cancelButton: Locator;

  // Loading
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;

    this.heading = page.locator('text=Import Preview');
    this.sheetNameDisplay = page.locator('text=/Tab:.*$/');
    this.physicianNameDisplay = page.locator('text=/Physician:.*$/');

    // UnmappedActionsBanner uses role="status"
    this.unmappedBanner = page.locator('[role="status"]');
    this.showDetailsButton = page.locator('button:has-text("Show details")');
    this.hideDetailsButton = page.locator('button:has-text("Hide details")');

    // Action buttons
    this.applyButton = page.locator('button:has-text("Apply")');
    this.cancelButton = page.locator('button:has-text("Cancel")');

    this.loadingSpinner = page.locator('text=Loading preview...');
  }

  /**
   * Wait for the preview page to fully load.
   */
  async waitForLoad() {
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 30000 });
    await this.heading.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Get the sheet name displayed in the header.
   */
  async getSheetName(): Promise<string> {
    if (await this.sheetNameDisplay.isVisible().catch(() => false)) {
      const text = await this.sheetNameDisplay.innerText();
      // Extract the value after "Tab: "
      const match = text.match(/Tab:\s*(.+)/);
      return match ? match[1].trim() : '';
    }
    return '';
  }

  /**
   * Get the physician name displayed in the header.
   */
  async getPhysicianName(): Promise<string> {
    if (await this.physicianNameDisplay.isVisible().catch(() => false)) {
      const text = await this.physicianNameDisplay.innerText();
      const match = text.match(/Physician:\s*(.+)/);
      return match ? match[1].trim() : '';
    }
    return '';
  }

  /**
   * Check if the unmapped actions banner is visible.
   */
  async isUnmappedBannerVisible(): Promise<boolean> {
    return await this.unmappedBanner.isVisible().catch(() => false);
  }

  /**
   * Get the unmapped actions banner summary text.
   */
  async getUnmappedBannerText(): Promise<string> {
    if (await this.isUnmappedBannerVisible()) {
      return await this.unmappedBanner.innerText();
    }
    return '';
  }

  /**
   * Expand the unmapped actions details section.
   */
  async expandDetails() {
    await this.showDetailsButton.click();
  }

  /**
   * Collapse the unmapped actions details section.
   */
  async collapseDetails() {
    await this.hideDetailsButton.click();
  }

  /**
   * Get the number of modifying records text from the action bar.
   */
  async getModifyingCountText(): Promise<string> {
    const el = this.page.locator('text=/\\d+ records will be modified/');
    if (await el.isVisible().catch(() => false)) {
      return await el.innerText();
    }
    return '';
  }

  /**
   * Click the Apply Changes button.
   */
  async clickApply() {
    await this.applyButton.click();
  }

  /**
   * Click the Cancel button.
   */
  async clickCancel() {
    await this.cancelButton.click();
  }

  /**
   * Check if the import results display is showing (after execution).
   */
  async isImportResultVisible(): Promise<boolean> {
    return await this.page.locator('text=Import Complete').isVisible({ timeout: 5000 }).catch(() => false);
  }
}
