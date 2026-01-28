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
    this.statusBar = page.locator('.text-sm.text-gray-600');
  }

  async goto() {
    await this.page.goto('/');
    await this.grid.waitFor({ state: 'visible', timeout: 10000 });
  }

  async getRowCount(): Promise<number> {
    // Wait for grid to load
    await this.page.waitForSelector('.ag-row', { timeout: 5000 }).catch(() => {});
    return await this.page.locator('.ag-row[row-index]').count();
  }

  async getCell(rowIndex: number, colId: string): Promise<Locator> {
    return this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`);
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

  async editCell(rowIndex: number, colId: string, value: string) {
    await this.doubleClickCell(rowIndex, colId);
    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.type(value);
    await this.page.keyboard.press('Enter');
  }

  async selectDropdownValue(rowIndex: number, colId: string, value: string) {
    const cell = await this.getCell(rowIndex, colId);
    await cell.click();
    // Wait for dropdown to appear
    await this.page.waitForSelector('.ag-popup', { timeout: 2000 }).catch(() => {});
    await this.page.locator(`.ag-popup .ag-list-item:has-text("${value}")`).click();
  }

  async selectRow(rowIndex: number) {
    const row = this.page.locator(`[row-index="${rowIndex}"]`);
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
}
