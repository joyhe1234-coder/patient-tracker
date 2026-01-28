# UI Testing Implementation Plan

This document outlines the implementation plan for comprehensive UI testing using both React Testing Library (component tests) and Playwright (E2E tests).

---

## Overview

| Approach | Tool | Scope | Run When |
|----------|------|-------|----------|
| **Component Testing** | React Testing Library + Vitest | Isolated components, unit behavior | Every commit (fast) |
| **E2E Testing** | Playwright | Full user flows, browser automation | On release (slower) |

---

## Phase 1: React Testing Library Setup

**Goal:** Set up component-level testing infrastructure

### 1.1 Install Dependencies

```bash
cd frontend
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @vitest/coverage-v8
```

### 1.2 Configuration Files

**`frontend/vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
});
```

**`frontend/src/test/setup.ts`**
```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});
```

### 1.3 Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 1.4 Test File Structure

```
frontend/src/
├── components/
│   ├── grid/
│   │   ├── PatientGrid.tsx
│   │   └── PatientGrid.test.tsx
│   ├── layout/
│   │   ├── StatusFilterBar.tsx
│   │   ├── StatusFilterBar.test.tsx
│   │   ├── Toolbar.tsx
│   │   └── Toolbar.test.tsx
│   └── modals/
│       ├── AddRowModal.tsx
│       ├── AddRowModal.test.tsx
│       ├── ConfirmModal.tsx
│       └── ConfirmModal.test.tsx
└── test/
    ├── setup.ts
    └── mocks/
        ├── gridData.ts
        └── api.ts
```

### 1.5 Component Test Cases

| Component | Test Cases |
|-----------|------------|
| **StatusFilterBar** | Renders all chips, click selects/deselects, counts display correctly |
| **Toolbar** | Buttons render, disabled states, click handlers fire |
| **AddRowModal** | Form renders, validation, submit handler, cancel closes modal |
| **ConfirmModal** | Message displays, confirm/cancel buttons work |

---

## Phase 2: Playwright E2E Setup

**Goal:** Set up browser automation testing for full user flows

### 2.1 Install Dependencies

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium  # Only Chromium for faster CI
```

### 2.2 Configuration File

**`frontend/playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start dev servers before running tests
  webServer: [
    {
      command: 'cd ../backend && npm run dev',
      url: 'http://localhost:3000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
```

### 2.3 Package.json Scripts

```json
{
  "scripts": {
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:headed": "playwright test --headed",
    "e2e:report": "playwright show-report"
  }
}
```

### 2.4 Test File Structure

```
frontend/e2e/
├── fixtures/
│   ├── test-data.ts          # Shared test data and helpers
│   └── test-files/           # Excel/CSV files for import testing
│       ├── valid-import.xlsx
│       ├── invalid-dates.xlsx
│       ├── duplicate-patients.xlsx
│       └── empty-measures.xlsx
├── pages/
│   ├── main-page.ts          # Page Object Model - Main grid page
│   └── import-page.ts        # Page Object Model - Import page
├── add-row.spec.ts           # Add Row functionality
├── duplicate-member.spec.ts  # Duplicate row functionality
├── delete-row.spec.ts        # Delete row functionality
├── grid-editing.spec.ts      # Cell editing, auto-save
├── cascading-dropdowns.spec.ts
├── time-interval.spec.ts
├── duplicate-detection.spec.ts
├── row-colors.spec.ts
├── filtering.spec.ts
├── import-excel.spec.ts      # Excel/CSV import functionality
└── toolbar-actions.spec.ts
```

### 2.5 Page Object Models

**`frontend/e2e/pages/main-page.ts`**
```typescript
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

  constructor(page: Page) {
    this.page = page;
    this.grid = page.locator('.ag-theme-alpine');
    this.toolbar = page.locator('[data-testid="toolbar"]');
    this.filterBar = page.locator('[data-testid="filter-bar"]');
    this.addRowButton = page.locator('button:has-text("Add Row")');
    this.duplicateButton = page.locator('button:has-text("Duplicate")');
    this.deleteButton = page.locator('button:has-text("Delete")');
    this.saveIndicator = page.locator('[data-testid="save-indicator"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.grid.waitFor({ state: 'visible' });
  }

  async getRowCount(): Promise<number> {
    return await this.page.locator('.ag-row').count();
  }

  async getCell(rowIndex: number, colId: string): Promise<Locator> {
    return this.page.locator(`[row-index="${rowIndex}"] [col-id="${colId}"]`);
  }

  async getCellValue(rowIndex: number, colId: string): Promise<string> {
    const cell = await this.getCell(rowIndex, colId);
    return await cell.innerText();
  }

  async editCell(rowIndex: number, colId: string, value: string) {
    const cell = await this.getCell(rowIndex, colId);
    await cell.dblclick();
    await this.page.keyboard.fill(value);
    await this.page.keyboard.press('Enter');
  }

  async selectDropdownValue(rowIndex: number, colId: string, value: string) {
    const cell = await this.getCell(rowIndex, colId);
    await cell.click();
    await this.page.locator(`[role="option"]:has-text("${value}")`).click();
  }

  async selectRow(rowIndex: number) {
    const row = this.page.locator(`[row-index="${rowIndex}"]`);
    await row.click();
  }

  async getRowColor(rowIndex: number): Promise<string> {
    const row = this.page.locator(`[row-index="${rowIndex}"]`);
    return await row.evaluate(el => getComputedStyle(el).backgroundColor);
  }

  async hasOrangeStripe(rowIndex: number): Promise<boolean> {
    const row = this.page.locator(`[row-index="${rowIndex}"]`);
    const borderLeft = await row.evaluate(el => getComputedStyle(el).borderLeft);
    return borderLeft.includes('rgb(249, 115, 22)'); // Orange #F97316
  }

  async clickFilterChip(chipName: string) {
    await this.filterBar.locator(`button:has-text("${chipName}")`).click();
  }

  async waitForSave() {
    await this.saveIndicator.waitFor({ state: 'visible' });
    await this.page.waitForFunction(() => {
      const indicator = document.querySelector('[data-testid="save-indicator"]');
      return indicator?.textContent?.includes('Saved');
    });
  }
}
```

**`frontend/e2e/pages/import-page.ts`**
```typescript
import { Page, Locator } from '@playwright/test';
import path from 'path';

export class ImportPage {
  readonly page: Page;
  readonly fileInput: Locator;
  readonly uploadButton: Locator;
  readonly previewTable: Locator;
  readonly importButton: Locator;
  readonly cancelButton: Locator;
  readonly errorList: Locator;
  readonly warningList: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.fileInput = page.locator('input[type="file"]');
    this.uploadButton = page.locator('button:has-text("Upload")');
    this.previewTable = page.locator('[data-testid="preview-table"]');
    this.importButton = page.locator('button:has-text("Import")');
    this.cancelButton = page.locator('button:has-text("Cancel")');
    this.errorList = page.locator('[data-testid="error-list"]');
    this.warningList = page.locator('[data-testid="warning-list"]');
    this.successMessage = page.locator('[data-testid="success-message"]');
  }

  async goto() {
    await this.page.goto('/import-test');
  }

  async uploadFile(fileName: string) {
    const filePath = path.join(__dirname, '../fixtures/test-files', fileName);
    await this.fileInput.setInputFiles(filePath);
  }

  async getPreviewRowCount(): Promise<number> {
    return await this.previewTable.locator('tbody tr').count();
  }

  async getErrorCount(): Promise<number> {
    return await this.errorList.locator('li').count();
  }

  async getWarningCount(): Promise<number> {
    return await this.warningList.locator('li').count();
  }
}
```

---

## Phase 3: CI Integration (GitHub Actions)

**Goal:** Run E2E tests on every release

### 3.1 E2E Tests Workflow (On Release)

**`.github/workflows/e2e-tests.yml`**
```yaml
name: E2E Tests

on:
  release:
    types: [published]
  workflow_dispatch:  # Allow manual trigger

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: patient_tracker_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: |
            backend/package-lock.json
            frontend/package-lock.json

      - name: Install Backend Dependencies
        working-directory: backend
        run: npm ci

      - name: Install Frontend Dependencies
        working-directory: frontend
        run: npm ci

      - name: Install Playwright Browsers
        working-directory: frontend
        run: npx playwright install chromium --with-deps

      - name: Setup Database
        working-directory: backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/patient_tracker_test
        run: |
          npx prisma migrate deploy
          npx prisma db seed

      - name: Run E2E Tests
        working-directory: frontend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/patient_tracker_test
        run: npm run e2e

      - name: Upload Test Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 30

      - name: Upload Test Screenshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: test-screenshots
          path: frontend/test-results/
          retention-days: 7
```

### 3.2 Component Tests Workflow (Every PR)

**`.github/workflows/test.yml`**
```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  component-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install Dependencies
        working-directory: frontend
        run: npm ci

      - name: Run Component Tests
        working-directory: frontend
        run: npm run test:run

      - name: Upload Coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: frontend/coverage/
          retention-days: 7

  backend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        working-directory: backend
        run: npm ci

      - name: Run Backend Tests
        working-directory: backend
        run: npm test
```

---

## Phase 4: Write Component Tests

**Goal:** Implement React Testing Library tests for isolated components

### 4.1 Priority Order

1. **StatusFilterBar** - Simple, stateless, good starting point
2. **Toolbar** - Button states and click handlers
3. **AddRowModal** - Form validation
4. **ConfirmModal** - Simple confirm/cancel

### 4.2 Example: StatusFilterBar Test

**`frontend/src/components/layout/StatusFilterBar.test.tsx`**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StatusFilterBar } from './StatusFilterBar';

describe('StatusFilterBar', () => {
  const defaultCounts = {
    all: 100, duplicate: 5, white: 20, yellow: 15,
    blue: 25, green: 10, purple: 5, orange: 5, gray: 10, red: 5,
  };

  it('renders all filter chips', () => {
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
      />
    );

    expect(screen.getByText(/All/)).toBeInTheDocument();
    expect(screen.getByText(/Duplicates/)).toBeInTheDocument();
    expect(screen.getByText(/Not Started/)).toBeInTheDocument();
  });

  it('displays correct counts on chips', () => {
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={() => {}}
        rowCounts={defaultCounts}
      />
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onFilterChange when chip clicked', () => {
    const handleChange = vi.fn();
    render(
      <StatusFilterBar
        activeFilters={['all']}
        onFilterChange={handleChange}
        rowCounts={defaultCounts}
      />
    );

    fireEvent.click(screen.getByText(/Duplicates/));
    expect(handleChange).toHaveBeenCalledWith(['duplicate']);
  });
});
```

---

## Phase 5: Write E2E Tests - Core CRUD Operations

**Goal:** Test Add Row, Duplicate Member, Delete Row functionality

### 5.1 Add Row Tests

**`frontend/e2e/add-row.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Add Row', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
  });

  test('Add Row button opens modal', async ({ page }) => {
    await mainPage.addRowButton.click();

    const modal = page.locator('[data-testid="add-row-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('h2')).toContainText('Add New Row');
  });

  test('modal has required fields', async ({ page }) => {
    await mainPage.addRowButton.click();

    await expect(page.locator('input[name="memberName"]')).toBeVisible();
    await expect(page.locator('input[name="memberDob"]')).toBeVisible();
    await expect(page.locator('input[name="memberTelephone"]')).toBeVisible();
    await expect(page.locator('input[name="memberAddress"]')).toBeVisible();
  });

  test('submitting valid data creates new row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();

    await mainPage.addRowButton.click();

    await page.fill('input[name="memberName"]', 'Test Patient E2E');
    await page.fill('input[name="memberDob"]', '01/15/1980');
    await page.fill('input[name="memberTelephone"]', '5551234567');
    await page.fill('input[name="memberAddress"]', '123 Test Street');

    await page.click('button:has-text("Add")');

    // Wait for modal to close and row to appear
    await expect(page.locator('[data-testid="add-row-modal"]')).not.toBeVisible();

    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount + 1);

    // Verify new row is first row with correct data
    const memberName = await mainPage.getCellValue(0, 'memberName');
    expect(memberName).toBe('Test Patient E2E');
  });

  test('new row has empty request type, quality measure, measure status', async ({ page }) => {
    await mainPage.addRowButton.click();

    await page.fill('input[name="memberName"]', 'Empty Fields Test');
    await page.fill('input[name="memberDob"]', '01/01/1990');

    await page.click('button:has-text("Add")');

    // Verify fields are empty
    const requestType = await mainPage.getCellValue(0, 'requestType');
    const qualityMeasure = await mainPage.getCellValue(0, 'qualityMeasure');
    const measureStatus = await mainPage.getCellValue(0, 'measureStatus');

    expect(requestType.trim()).toBe('');
    expect(qualityMeasure.trim()).toBe('');
    expect(measureStatus.trim()).toBe('');
  });

  test('new row Request Type cell is auto-focused', async ({ page }) => {
    await mainPage.addRowButton.click();

    await page.fill('input[name="memberName"]', 'Focus Test');
    await page.fill('input[name="memberDob"]', '01/01/1990');

    await page.click('button:has-text("Add")');

    // Wait for grid to update
    await page.waitForTimeout(500);

    // Request Type cell in first row should be focused/selected
    const requestTypeCell = await mainPage.getCell(0, 'requestType');
    await expect(requestTypeCell).toHaveClass(/ag-cell-focus/);
  });

  test('cancel button closes modal without creating row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();

    await mainPage.addRowButton.click();
    await page.fill('input[name="memberName"]', 'Should Not Be Created');

    await page.click('button:has-text("Cancel")');

    await expect(page.locator('[data-testid="add-row-modal"]')).not.toBeVisible();

    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount);
  });

  test('validation error for missing member name', async ({ page }) => {
    await mainPage.addRowButton.click();

    await page.fill('input[name="memberDob"]', '01/01/1990');
    await page.click('button:has-text("Add")');

    // Modal should still be visible with error
    await expect(page.locator('[data-testid="add-row-modal"]')).toBeVisible();
    await expect(page.locator('.error-message')).toContainText('Member name is required');
  });
});
```

### 5.2 Duplicate Member Tests

**`frontend/e2e/duplicate-member.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Duplicate Member', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
  });

  test('Duplicate button is disabled when no row selected', async () => {
    await expect(mainPage.duplicateButton).toBeDisabled();
  });

  test('Duplicate button is enabled when row selected', async () => {
    await mainPage.selectRow(0);
    await expect(mainPage.duplicateButton).toBeEnabled();
  });

  test('clicking Duplicate creates new row with same patient data', async ({ page }) => {
    // Get original row data
    const originalName = await mainPage.getCellValue(0, 'memberName');
    const originalDob = await mainPage.getCellValue(0, 'memberDob');
    const initialRowCount = await mainPage.getRowCount();

    // Select and duplicate
    await mainPage.selectRow(0);
    await mainPage.duplicateButton.click();

    // Verify new row created
    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount + 1);

    // New row should be at index 1 (below selected row)
    const newName = await mainPage.getCellValue(1, 'memberName');
    const newDob = await mainPage.getCellValue(1, 'memberDob');

    expect(newName).toBe(originalName);
    expect(newDob).toBe(originalDob);
  });

  test('duplicated row has empty measure fields', async ({ page }) => {
    await mainPage.selectRow(0);
    await mainPage.duplicateButton.click();

    // New row (index 1) should have empty measure fields
    const requestType = await mainPage.getCellValue(1, 'requestType');
    const qualityMeasure = await mainPage.getCellValue(1, 'qualityMeasure');
    const measureStatus = await mainPage.getCellValue(1, 'measureStatus');

    expect(requestType.trim()).toBe('');
    expect(qualityMeasure.trim()).toBe('');
    expect(measureStatus.trim()).toBe('');
  });

  test('duplicated row copies phone and address', async ({ page }) => {
    const originalPhone = await mainPage.getCellValue(0, 'memberTelephone');
    const originalAddress = await mainPage.getCellValue(0, 'memberAddress');

    await mainPage.selectRow(0);
    await mainPage.duplicateButton.click();

    const newPhone = await mainPage.getCellValue(1, 'memberTelephone');
    const newAddress = await mainPage.getCellValue(1, 'memberAddress');

    expect(newPhone).toBe(originalPhone);
    expect(newAddress).toBe(originalAddress);
  });

  test('duplicated row is selected and Request Type focused', async ({ page }) => {
    await mainPage.selectRow(0);
    await mainPage.duplicateButton.click();

    await page.waitForTimeout(500);

    // New row should be selected
    const newRow = page.locator('[row-index="1"]');
    await expect(newRow).toHaveClass(/ag-row-selected/);

    // Request Type cell should be focused
    const requestTypeCell = await mainPage.getCell(1, 'requestType');
    await expect(requestTypeCell).toHaveClass(/ag-cell-focus/);
  });
});
```

### 5.3 Delete Row Tests

**`frontend/e2e/delete-row.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Delete Row', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
  });

  test('Delete button is disabled when no row selected', async () => {
    await expect(mainPage.deleteButton).toBeDisabled();
  });

  test('Delete button is enabled when row selected', async () => {
    await mainPage.selectRow(0);
    await expect(mainPage.deleteButton).toBeEnabled();
  });

  test('clicking Delete shows confirmation dialog', async ({ page }) => {
    await mainPage.selectRow(0);
    await mainPage.deleteButton.click();

    const confirmModal = page.locator('[data-testid="confirm-modal"]');
    await expect(confirmModal).toBeVisible();
    await expect(confirmModal).toContainText('delete');
  });

  test('confirming delete removes the row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();
    const deletedName = await mainPage.getCellValue(0, 'memberName');

    await mainPage.selectRow(0);
    await mainPage.deleteButton.click();

    // Confirm deletion
    await page.click('button:has-text("Confirm")');

    // Wait for row to be removed
    await page.waitForTimeout(500);

    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount - 1);

    // First row should now be different
    if (newRowCount > 0) {
      const newFirstName = await mainPage.getCellValue(0, 'memberName');
      expect(newFirstName).not.toBe(deletedName);
    }
  });

  test('canceling delete keeps the row', async ({ page }) => {
    const initialRowCount = await mainPage.getRowCount();
    const originalName = await mainPage.getCellValue(0, 'memberName');

    await mainPage.selectRow(0);
    await mainPage.deleteButton.click();

    // Cancel deletion
    await page.click('button:has-text("Cancel")');

    // Row should still exist
    const newRowCount = await mainPage.getRowCount();
    expect(newRowCount).toBe(initialRowCount);

    const stillThere = await mainPage.getCellValue(0, 'memberName');
    expect(stillThere).toBe(originalName);
  });

  test('deleting duplicate row removes orange stripe from remaining', async ({ page }) => {
    // First, create a duplicate
    await mainPage.selectRow(0);
    await mainPage.duplicateButton.click();

    // Set same Request Type and Quality Measure to trigger duplicate
    await mainPage.selectDropdownValue(1, 'requestType', 'AWV');
    await mainPage.selectDropdownValue(1, 'qualityMeasure', 'Annual Wellness Visit');

    // Wait for duplicate detection
    await page.waitForTimeout(500);

    // Both rows should have orange stripe
    expect(await mainPage.hasOrangeStripe(0)).toBe(true);
    expect(await mainPage.hasOrangeStripe(1)).toBe(true);

    // Delete one duplicate
    await mainPage.selectRow(1);
    await mainPage.deleteButton.click();
    await page.click('button:has-text("Confirm")');

    await page.waitForTimeout(500);

    // Remaining row should NOT have orange stripe
    expect(await mainPage.hasOrangeStripe(0)).toBe(false);
  });
});
```

---

## Phase 6: Write E2E Tests - Import Excel

**Goal:** Test Excel/CSV import functionality

### 6.1 Test Files Setup

Create test files in `frontend/e2e/fixtures/test-files/`:

| File | Purpose |
|------|---------|
| `valid-import.xlsx` | 10 patients with valid data |
| `invalid-dates.xlsx` | Contains invalid date formats |
| `duplicate-patients.xlsx` | Same patient appears multiple times |
| `empty-measures.xlsx` | Patients with no measure data |
| `mixed-errors.xlsx` | Combination of errors and warnings |

### 6.2 Import Excel Tests

**`frontend/e2e/import-excel.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';
import { ImportPage } from './pages/import-page';

test.describe('Import Excel', () => {
  let mainPage: MainPage;
  let importPage: ImportPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    importPage = new ImportPage(page);
  });

  test('navigate to import page', async ({ page }) => {
    await mainPage.goto();
    await page.click('a:has-text("Import")');

    await expect(page).toHaveURL(/import/);
  });

  test('upload valid Excel file shows preview', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');

    // Should show preview table
    await expect(importPage.previewTable).toBeVisible();

    const rowCount = await importPage.getPreviewRowCount();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('upload valid file shows no errors', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');

    const errorCount = await importPage.getErrorCount();
    expect(errorCount).toBe(0);
  });

  test('upload file with invalid dates shows errors', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('invalid-dates.xlsx');

    await expect(importPage.errorList).toBeVisible();

    const errorCount = await importPage.getErrorCount();
    expect(errorCount).toBeGreaterThan(0);

    // Error should mention date format
    await expect(importPage.errorList).toContainText('date');
  });

  test('upload file with duplicate patients shows warning', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('duplicate-patients.xlsx');

    await expect(importPage.warningList).toBeVisible();
    await expect(importPage.warningList).toContainText('duplicate');
  });

  test('import button disabled when errors exist', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('invalid-dates.xlsx');

    await expect(importPage.importButton).toBeDisabled();
  });

  test('import button enabled when no errors', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');

    await expect(importPage.importButton).toBeEnabled();
  });

  test('successful import shows success message', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');

    await importPage.importButton.click();

    await expect(importPage.successMessage).toBeVisible();
    await expect(importPage.successMessage).toContainText('imported');
  });

  test('successful import adds rows to grid', async ({ page }) => {
    // Get initial count
    await mainPage.goto();
    const initialCount = await mainPage.getRowCount();

    // Do import
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');
    await importPage.importButton.click();

    // Navigate back to grid
    await mainPage.goto();

    const newCount = await mainPage.getRowCount();
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('cancel import returns to main page', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('valid-import.xlsx');

    await importPage.cancelButton.click();

    await expect(page).toHaveURL('/');
  });

  test('empty measures file shows warning', async ({ page }) => {
    await importPage.goto();
    await importPage.uploadFile('empty-measures.xlsx');

    await expect(importPage.warningList).toBeVisible();
    await expect(importPage.warningList).toContainText('no measures');
  });

  test('file size limit enforced', async ({ page }) => {
    // Create a large file programmatically or use a pre-made one
    await importPage.goto();

    // Attempt to upload file > limit
    // Should show error
  });

  test('only xlsx and csv files accepted', async ({ page }) => {
    await importPage.goto();

    // The file input should have accept attribute
    const acceptAttr = await importPage.fileInput.getAttribute('accept');
    expect(acceptAttr).toContain('.xlsx');
    expect(acceptAttr).toContain('.csv');
  });
});
```

---

## Phase 7: Write E2E Tests - Grid Editing & Business Logic

**Goal:** Test cell editing, cascading dropdowns, time interval rules, row colors

### 7.1 Test Files to Create

| File | Test Cases |
|------|------------|
| **grid-editing.spec.ts** | Edit text cell, edit date cell, auto-save indicator, invalid input rejection |
| **cascading-dropdowns.spec.ts** | Request Type filters Quality Measure, Quality Measure filters Status, field clearing on parent change |
| **time-interval.spec.ts** | Editable for fixed intervals, NOT editable for 5 time-period statuses, Due Date recalculation |
| **row-colors.spec.ts** | Status-based colors, overdue red, color preserved on selection |
| **duplicate-detection.spec.ts** | Orange stripe on duplicate, filter chip, stripe removed when no longer duplicate |
| **filtering.spec.ts** | Filter chip click, row count updates, clear filter |

### 7.2 Time Interval Tests (Example)

**`frontend/e2e/time-interval.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Time Interval Editability', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
  });

  // Statuses where interval IS editable (fixed default or test type dropdown)
  const editableStatuses = [
    { status: 'Screening test ordered', tracking1: 'Mammogram', expectedInterval: '14' },
    { status: 'Screening test ordered', tracking1: 'Breast MRI', expectedInterval: '21' },
    { status: 'Colon cancer screening ordered', tracking1: 'Colonoscopy', expectedInterval: '42' },
    { status: 'AWV scheduled', tracking1: null, expectedInterval: '1' },
    { status: 'Vaccination discussed', tracking1: null, expectedInterval: '7' },
  ];

  // Statuses where interval is NOT editable (time period dropdown)
  const nonEditableStatuses = [
    'Screening discussed',
    'HgbA1c at goal',
    'HgbA1c NOT at goal',
    'Scheduled call back - BP not at goal',
    'Scheduled call back - BP at goal',
  ];

  for (const { status, tracking1, expectedInterval } of editableStatuses) {
    test(`interval IS editable for "${status}"`, async ({ page }) => {
      // Create a row with this status
      // ... setup code ...

      // Time Interval cell should allow editing
      const intervalCell = await mainPage.getCell(0, 'timeIntervalDays');
      await intervalCell.dblclick();

      // Input should appear
      const input = page.locator('.ag-cell-edit-input');
      await expect(input).toBeVisible();

      // Can type new value
      await page.keyboard.fill('30');
      await page.keyboard.press('Enter');

      // Value should update
      const newValue = await mainPage.getCellValue(0, 'timeIntervalDays');
      expect(newValue).toBe('30');
    });
  }

  for (const status of nonEditableStatuses) {
    test(`interval NOT editable for "${status}"`, async ({ page }) => {
      // Create a row with this status
      // ... setup code ...

      // Time Interval cell should NOT allow editing
      const intervalCell = await mainPage.getCell(0, 'timeIntervalDays');
      await intervalCell.click();

      // Input should NOT appear
      const input = page.locator('.ag-cell-edit-input');
      await expect(input).not.toBeVisible();
    });
  }

  test('editing interval updates Due Date', async ({ page }) => {
    // Create row with editable status and status date
    // ... setup code ...

    // Status Date = 01/15/2026, Interval = 14
    // Due Date should be 01/29/2026

    // Edit interval to 30
    await mainPage.editCell(0, 'timeIntervalDays', '30');

    // Due Date should now be 02/14/2026
    const dueDate = await mainPage.getCellValue(0, 'dueDate');
    expect(dueDate).toBe('02/14/2026');
  });
});
```

---

## Phase 8: Test Data Management

**Goal:** Consistent test data for reliable tests

### 8.1 E2E Seed Script

**`backend/prisma/e2e-seed.ts`**
```typescript
// Creates specific test scenarios:
// - Patient with each status type
// - Duplicate rows
// - Overdue rows
// - Rows with all tracking combinations
```

### 8.2 API Mocking for Component Tests

**`frontend/src/test/mocks/api.ts`**
```typescript
import { vi } from 'vitest';

export const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../api/axios', () => ({
  api: mockApi,
}));
```

---

## Implementation Timeline

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| **Phase 1** | React Testing Library setup | 1-2 hours |
| **Phase 2** | Playwright setup | 1-2 hours |
| **Phase 3** | CI workflow files | 1 hour |
| **Phase 4** | Component tests (4 components) | 2-3 hours |
| **Phase 5** | E2E tests - CRUD (Add/Duplicate/Delete) | 3-4 hours |
| **Phase 6** | E2E tests - Import Excel | 2-3 hours |
| **Phase 7** | E2E tests - Grid editing & business logic | 4-6 hours |
| **Phase 8** | Test data management | 1-2 hours |

**Total: 15-23 hours**

---

## Test Coverage Summary

| Feature | Component Tests | E2E Tests |
|---------|-----------------|-----------|
| StatusFilterBar | ✅ | ✅ |
| Toolbar | ✅ | ✅ |
| AddRowModal | ✅ | - |
| ConfirmModal | ✅ | - |
| **Add Row** | - | ✅ |
| **Duplicate Member** | - | ✅ |
| **Delete Row** | - | ✅ |
| **Import Excel** | - | ✅ |
| Grid cell editing | - | ✅ |
| Cascading dropdowns | - | ✅ |
| Time Interval rules | - | ✅ |
| Duplicate detection | - | ✅ |
| Row colors | - | ✅ |
| Filtering | - | ✅ |

---

## Commands Reference

```bash
# Component Tests (React Testing Library)
cd frontend
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage

# E2E Tests (Playwright)
cd frontend
npm run e2e           # Headless
npm run e2e:ui        # Interactive UI
npm run e2e:headed    # Watch browser
npm run e2e:report    # View HTML report

# CI Trigger
# E2E tests run automatically on GitHub Release
# Or manually via GitHub Actions "Run workflow" button
```

---

## Last Updated

January 26, 2026
