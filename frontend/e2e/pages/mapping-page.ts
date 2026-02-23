import { Page, Locator } from '@playwright/test';

/**
 * Page Object for the Admin Import Column Mapping Management page.
 *
 * Route: /admin/import-mapping
 *
 * Provides selectors and helpers for navigating, viewing, editing,
 * and resetting column mappings in the admin mapping management UI.
 */
export class MappingPage {
  readonly page: Page;

  // Header
  readonly heading: Locator;

  // System selector
  readonly systemSelector: Locator;

  // Last modified info
  readonly lastModifiedInfo: Locator;

  // Sections
  readonly patientColumnsSection: Locator;
  readonly measureColumnsSection: Locator;
  readonly ignoredColumnsSection: Locator;
  readonly actionPatternSection: Locator;

  // Action buttons
  readonly addMappingButton: Locator;
  readonly resetToDefaultsButton: Locator;
  readonly editMappingsButton: Locator;

  // Loading spinner
  readonly loadingSpinner: Locator;

  // Error display
  readonly errorDisplay: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page heading
    this.heading = page.locator('h2:has-text("Import Column Mapping")');

    // System selector dropdown
    this.systemSelector = page.locator('#system-selector');

    // Last modified metadata
    this.lastModifiedInfo = page.locator('text=Last modified:');

    // Table sections (identified by their h2 headings)
    this.patientColumnsSection = page.locator('section:has(h2:has-text("Patient Column Mappings"))');
    this.measureColumnsSection = page.locator('section:has(h2:has-text("Measure Column Mappings"))');
    this.ignoredColumnsSection = page.locator('section:has(h2:has-text("Ignored Columns"))');
    this.actionPatternSection = page.locator('section:has(h2:has-text("Action Pattern Configuration"))');

    // Action buttons
    this.addMappingButton = page.locator('button:has-text("Add Mapping")');
    this.resetToDefaultsButton = page.locator('button:has-text("Reset to Defaults")');
    this.editMappingsButton = page.locator('button:has-text("Edit Mappings")');

    // Loading
    this.loadingSpinner = page.locator('.animate-spin');

    // Error display
    this.errorDisplay = page.locator('.bg-red-50:has-text("Error")');
  }

  /**
   * Navigate to the mapping management page.
   * Handles login if redirected.
   */
  async goto(email = 'ko037291@gmail.com', password = 'welcome100') {
    await this.page.goto('/admin/import-mapping');

    // Handle login redirect if needed
    const emailInput = this.page.locator('input[name="email"]');
    const needsLogin = await emailInput.isVisible({ timeout: 3000 }).catch(() => false);
    if (needsLogin) {
      await emailInput.fill(email);
      await this.page.locator('input[name="password"]').fill(password);
      await this.page.locator('button[type="submit"]').click();

      // After login, app redirects to '/' — navigate to the admin page explicitly
      await this.page.waitForURL(
        (url) => !url.pathname.includes('/login'),
        { timeout: 15000 },
      );
      await this.page.goto('/admin/import-mapping');
    }

    // Wait for the page to load
    await this.heading.waitFor({ state: 'visible', timeout: 15000 });
  }

  /**
   * Wait for mappings data to finish loading.
   */
  async waitForLoad() {
    // Wait for loading spinner to disappear
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    // The system selector should be enabled once data loads
    await this.systemSelector.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Select a system from the system selector dropdown.
   */
  async selectSystem(systemId: string) {
    await this.systemSelector.selectOption(systemId);
    // Wait for the new config to load
    await this.page.waitForTimeout(300);
    await this.loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }

  /**
   * Get all options from the system selector.
   */
  async getSystemOptions(): Promise<string[]> {
    const options = await this.systemSelector.locator('option').allInnerTexts();
    return options.filter((o) => !o.startsWith('No systems'));
  }

  /**
   * Get the currently selected system value.
   */
  async getSelectedSystem(): Promise<string> {
    return await this.systemSelector.inputValue();
  }

  /**
   * Click the "Edit Mappings" or "Done Editing" button.
   */
  async toggleEditMode() {
    const editBtn = this.page.locator('button:has-text("Edit Mappings"), button:has-text("Done Editing")');
    await editBtn.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Click the "Reset to Defaults" button.
   */
  async clickResetToDefaults() {
    await this.resetToDefaultsButton.click();
  }

  /**
   * Check if the Reset to Defaults confirmation modal is visible.
   */
  async isResetModalVisible(): Promise<boolean> {
    return await this.page.locator('text=Reset to Default Mappings').isVisible().catch(() => false);
  }

  /**
   * Confirm the reset in the confirmation modal.
   */
  async confirmReset() {
    // Find the modal's confirm button (the red-styled one)
    const confirmBtn = this.page.locator('.bg-red-600:has-text("Reset to Defaults"), button.bg-red-600');
    await confirmBtn.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Cancel the reset in the confirmation modal.
   */
  async cancelReset() {
    const cancelBtn = this.page.locator('button:has-text("Cancel")').last();
    await cancelBtn.click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if the patient columns table is visible.
   */
  async isPatientColumnTableVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Patient Column Mappings")').isVisible().catch(() => false);
  }

  /**
   * Check if the measure columns table is visible.
   */
  async isMeasureColumnTableVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Measure Column Mappings")').isVisible().catch(() => false);
  }

  /**
   * Check if the action pattern section is visible (Sutter only).
   */
  async isActionPatternSectionVisible(): Promise<boolean> {
    return await this.page.locator('h2:has-text("Action Pattern Configuration")').isVisible().catch(() => false);
  }

  /**
   * Check if the "No Measure Columns" warning is visible.
   */
  async isNoMeasureWarningVisible(): Promise<boolean> {
    return await this.page.locator('text=No Measure Columns Configured').isVisible().catch(() => false);
  }

  /**
   * Get error text from the error banner.
   */
  async getErrorText(): Promise<string> {
    if (await this.errorDisplay.isVisible().catch(() => false)) {
      return await this.errorDisplay.innerText();
    }
    return '';
  }

  /**
   * Check if the "Using Default Configuration" banner is visible.
   */
  async isDefaultConfigBannerVisible(): Promise<boolean> {
    return await this.page.locator('text=Using Default Configuration').isVisible().catch(() => false);
  }
}
