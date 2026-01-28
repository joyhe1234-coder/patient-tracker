import { Page, Locator } from '@playwright/test';

export class MainPage {
  readonly page: Page;
  readonly grid: Locator;
  readonly toolbar: Locator;
  readonly filterBar: Locator;
  readonly addRowButton: Locator;
  readonly duplicateButton: Locator;
  readonly deleteButton: Locator;
  readonly saveIndicator: Locator;
  readonly statusBar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.grid = page.locator('.ag-theme-alpine');
    this.toolbar = page.locator('.flex.items-center.gap-2.p-2');
    this.filterBar = page.locator('.flex.items-center.gap-2.px-4.py-2.bg-gray-50');
    this.addRowButton = page.locator('button:has-text("Add Row")');
    this.duplicateButton = page.locator('button:has-text("Duplicate Mbr")');
    this.deleteButton = page.locator('button:has-text("Delete Row")');
    this.saveIndicator = page.locator('text=Saving, text=Saved, text=Error');
    this.statusBar = page.locator('.bg-gray-100.border-t');
  }

  async goto() {
    await this.page.goto('/');
    await this.grid.waitFor({ state: 'visible', timeout: 10000 });
  }

  async waitForGridLoad() {
    // Wait for grid to be visible and have rows loaded
    await this.grid.waitFor({ state: 'visible', timeout: 10000 });
    await this.page.waitForSelector('.ag-row[row-index]', { timeout: 10000 });
  }

  async getRowCount(): Promise<number> {
    // Wait for grid to load
    await this.page.waitForSelector('.ag-row', { timeout: 5000 }).catch(() => {});
    return await this.page.locator('.ag-row[row-index]').count();
  }

  async getCell(rowIndex: number, colId: string): Promise<Locator> {
    // Simple selector that works with AG Grid's row and column structure
    return this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();
  }

  async getCellValue(rowIndex: number, colId: string): Promise<string> {
    const cell = await this.getCell(rowIndex, colId);
    return await cell.innerText();
  }

  async clickCell(rowIndex: number, colId: string) {
    const cell = await this.getCell(rowIndex, colId);
    await cell.click();
  }

  async doubleClickCell(rowIndex: number, colId: string) {
    const cell = await this.getCell(rowIndex, colId);
    await cell.dblclick();
  }

  async openDropdown(rowIndex: number, colId: string): Promise<void> {
    // Open a dropdown cell for editing and wait for the popup
    const cell = this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();

    // First click to select/focus
    await cell.click();
    await this.page.waitForTimeout(100);

    // Double-click to open editor
    await cell.dblclick();
    await this.page.waitForTimeout(400);

    // Check if popup appeared (AG Grid uses various selectors)
    let popupVisible = await this.page.locator('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]').count() > 0;

    if (!popupVisible) {
      // Try clicking on the dropdown arrow/button within the cell
      const wrapper = cell.locator('.ag-cell-edit-wrapper, .ag-select, .ag-wrapper').first();
      if (await wrapper.count() > 0) {
        await wrapper.click();
        await this.page.waitForTimeout(300);
      } else {
        // Try pressing Enter/Space to open dropdown
        await this.page.keyboard.press('Space');
        await this.page.waitForTimeout(300);
      }
    }

    // Wait for dropdown list items
    await this.page.waitForSelector('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item', { state: 'attached', timeout: 5000 });
  }

  async openDropdownByMemberName(memberName: string, colId: string): Promise<void> {
    const rowIndex = await this.findRowByMemberName(memberName);
    if (rowIndex < 0) {
      throw new Error(`Could not find row for member: ${memberName}`);
    }
    await this.openDropdown(rowIndex, colId);
  }

  async getDropdownOptions(): Promise<string[]> {
    // Get all options from the currently open dropdown (AG Grid uses various selectors)
    const listItems = this.page.locator('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]');
    const count = await listItems.count();
    const options: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await listItems.nth(i).innerText();
      options.push(text.trim());
    }
    return options;
  }

  async editCell(rowIndex: number, colId: string, value: string) {
    await this.doubleClickCell(rowIndex, colId);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(value);
    await this.page.keyboard.press('Enter');
  }

  async selectDropdownValue(rowIndex: number, colId: string, value: string) {
    // Get the cell - could be in any container (pinned left, center, or pinned right)
    const cell = this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();

    // Single click to select/focus the row
    await cell.click();
    await this.page.waitForTimeout(150);

    // Double-click to open the dropdown editor
    await cell.dblclick();
    await this.page.waitForTimeout(300);

    // Wait for popup to appear
    await this.page.waitForSelector('.ag-popup', { state: 'visible', timeout: 3000 }).catch(() => {});

    // Find and click the option in the visible list
    const listItems = this.page.locator('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item');
    const itemCount = await listItems.count();

    if (itemCount > 0) {
      // Find the index of our target value
      for (let i = 0; i < itemCount; i++) {
        const itemText = await listItems.nth(i).innerText();
        if (itemText.trim() === value) {
          // Click this item directly
          await listItems.nth(i).click();
          await this.page.waitForTimeout(300);
          return;
        }
      }
    }

    // Fallback: type first character to filter/jump and use keyboard
    await this.page.keyboard.type(value.charAt(0));
    await this.page.waitForTimeout(100);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(300);
  }

  async selectRow(rowIndex: number) {
    // Use first() because AG Grid may have multiple row containers (pinned left/right/center)
    const row = this.page.locator(`[row-index="${rowIndex}"]`).first();
    await row.click();
  }

  async getRowBackgroundColor(rowIndex: number): Promise<string> {
    const row = this.page.locator(`[row-index="${rowIndex}"] .ag-cell`).first();
    return await row.evaluate(el => getComputedStyle(el).backgroundColor);
  }

  async hasOrangeStripe(rowIndex: number): Promise<boolean> {
    const row = this.page.locator(`[row-index="${rowIndex}"]`);
    const borderLeft = await row.evaluate(el => {
      const cells = el.querySelectorAll('.ag-cell');
      if (cells.length > 0) {
        return getComputedStyle(cells[0]).borderLeftColor;
      }
      return '';
    });
    return borderLeft.includes('249, 115, 22') || borderLeft.includes('f97316');
  }

  async clickFilterChip(chipName: string) {
    await this.filterBar.locator(`button:has-text("${chipName}")`).click();
  }

  async getFilterChipCount(chipName: string): Promise<string> {
    const chip = this.filterBar.locator(`button:has-text("${chipName}")`);
    const text = await chip.innerText();
    const match = text.match(/\((\d+)\)/);
    return match ? match[1] : '0';
  }

  async waitForSave() {
    // Wait for "Saved" indicator
    await this.page.waitForFunction(() => {
      const el = document.body.innerText;
      return el.includes('Saved');
    }, { timeout: 5000 }).catch(() => {});
  }

  async addTestRow(name: string = `Test ${Date.now()}`): Promise<void> {
    // Add a new row using the Add Row modal
    await this.addRowButton.click();
    await this.page.waitForSelector('input[placeholder="Enter patient name"]');

    await this.page.fill('input[placeholder="Enter patient name"]', name);
    await this.page.fill('input[type="date"]', '1990-01-01');

    // Submit using modal's Add Row button
    const modal = this.page.locator('.bg-white.rounded-lg.shadow-xl');
    await modal.locator('button:has-text("Add Row")').click();

    // Wait for modal to close and grid to update
    await this.page.locator('text=Add New Patient').waitFor({ state: 'hidden', timeout: 5000 });
    await this.page.waitForTimeout(500);
  }

  async findRowByMemberName(name: string): Promise<number> {
    // Find a row by member name and return its row index
    // The memberName column could be in any container (pinned left, center, etc.)
    const memberNameCells = this.page.locator('[col-id="memberName"]');
    const cellCount = await memberNameCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = memberNameCells.nth(i);
      const cellText = await cell.innerText().catch(() => '');
      if (cellText.includes(name)) {
        // Get the row-index from the parent row element
        const rowIndex = await cell.evaluate(el => {
          let current = el.parentElement;
          while (current) {
            const idx = current.getAttribute('row-index');
            if (idx !== null) return idx;
            current = current.parentElement;
          }
          return null;
        });
        if (rowIndex !== null) {
          return parseInt(rowIndex);
        }
      }
    }
    return -1;
  }

  async getCellByMemberName(memberName: string, colId: string): Promise<Locator | null> {
    // Find cell by member name - more reliable than row index
    const rowIndex = await this.findRowByMemberName(memberName);
    if (rowIndex < 0) return null;
    return this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();
  }

  async selectDropdownByMemberName(memberName: string, colId: string, value: string) {
    // Find the row index for this member
    const rowIndex = await this.findRowByMemberName(memberName);
    if (rowIndex < 0) {
      throw new Error(`Could not find row for member: ${memberName}`);
    }

    // Get the cell - it could be in any container (pinned left, center, or pinned right)
    const cell = this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`).first();

    // Click to focus
    await cell.click();
    await this.page.waitForTimeout(100);

    // Double-click to open editor
    await cell.dblclick();
    await this.page.waitForTimeout(400);

    // Wait for popup list items (AG Grid uses various selectors)
    await this.page.waitForSelector('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]', { state: 'attached', timeout: 5000 }).catch(() => {});

    // Try to click directly on the option (AG Grid uses different selectors)
    const listItems = this.page.locator('.ag-popup .ag-list-item, .ag-popup .ag-select-list-item, .ag-popup [role="option"], [role="listbox"] [role="option"]');
    const itemCount = await listItems.count();

    // Find and click the matching option
    for (let i = 0; i < itemCount; i++) {
      const itemText = await listItems.nth(i).innerText();
      if (itemText.trim() === value) {
        // Try clicking with force
        await listItems.nth(i).click({ force: true });
        await this.page.waitForTimeout(500);
        return;
      }
    }

    // Fallback: type first character to jump to the option
    await this.page.keyboard.type(value.charAt(0));
    await this.page.waitForTimeout(200);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(400);
  }

  async getCellValueByMemberName(memberName: string, colId: string): Promise<string> {
    const cell = await this.getCellByMemberName(memberName, colId);
    if (!cell) return '';
    return await cell.innerText();
  }

  async toggleMemberInfo() {
    // Click the "Member Info" toggle button in the toolbar
    const memberInfoButton = this.page.locator('button:has-text("Member Info")');
    await memberInfoButton.click();
    await this.page.waitForTimeout(300);
  }

  async deselectAllRows() {
    // Click on the status bar to deselect all rows (outside grid)
    await this.statusBar.click();
    await this.page.waitForTimeout(200);
  }

  async isMemberInfoVisible(): Promise<boolean> {
    // Check if Member Info columns are visible
    const telephoneHeader = this.page.locator('.ag-header-cell[col-id="memberTelephone"]');
    return await telephoneHeader.isVisible();
  }
}
