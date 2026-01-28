# Testing Guide

This document describes all testing infrastructure, implemented tests, and requirements for adding tests when implementing new features.

---

## IMPORTANT: Testing Requirements for New Features

**When implementing ANY new feature, you MUST:**

1. **Add test cases to `.claude/REGRESSION_TEST_PLAN.md`** before or during implementation
2. **Implement automated tests** for the feature (unit, component, or E2E as appropriate)
3. **Run all existing tests** to ensure no regressions
4. **Document test coverage** in the commit message

### Test-First Workflow

```
1. Define test cases in REGRESSION_TEST_PLAN.md
2. Implement the feature
3. Write automated tests
4. Run tests to verify
5. Update REGRESSION_TEST_PLAN.md to mark tests as automated
6. Commit with test summary in message
```

### Pre-Commit Test Checklist

Before committing any feature implementation:

```bash
# Backend tests
cd backend && npm test

# Frontend component tests
cd frontend && npm run test:run

# Frontend E2E tests (start dev server first: npm run dev)
cd frontend && npm run e2e

# Frontend AG Grid tests (start dev server first)
cd frontend && npm run cypress:run
```

---

## Test Frameworks Overview

| Framework | Purpose | Location | Command |
|-----------|---------|----------|---------|
| **Jest** | Backend unit tests | `backend/src/**/__tests__/*.test.ts` | `cd backend && npm test` |
| **Vitest** | Frontend component tests | `frontend/src/**/*.test.ts(x)` | `cd frontend && npm run test` |
| **Playwright** | Frontend E2E (general UI) | `frontend/e2e/*.spec.ts` | `cd frontend && npm run e2e` |
| **Cypress** | Frontend E2E (AG Grid) | `frontend/cypress/e2e/*.cy.ts` | `cd frontend && npm run cypress:run` |

### When to Use Each Framework

| Scenario | Framework | Reason |
|----------|-----------|--------|
| Backend service logic | Jest | Fast, isolated unit tests |
| Backend API endpoints | Jest | Integration tests with supertest |
| React component logic | Vitest + RTL | Tests component behavior |
| Form validation, modals | Vitest + RTL | Unit-level UI testing |
| Page navigation, basic UI | Playwright | Cross-browser, reliable |
| **AG Grid dropdown selection** | **Cypress** | Better native event handling |
| AG Grid cell editing | Cypress | Reliable AG Grid interaction |
| Complex multi-step workflows | Playwright or Cypress | E2E coverage |

**Note:** Playwright has issues committing AG Grid dropdown selections. Use Cypress for any AG Grid dropdown tests.

---

## All Implemented Tests

### Backend Tests (130 tests)

**Location:** `backend/src/services/import/__tests__/`

| File | Tests | Description |
|------|-------|-------------|
| `fileParser.test.ts` | 16 | CSV parsing, title row detection, column validation |
| `columnMapper.test.ts` | 13 | Column mapping, Q1/Q2 grouping, skip columns |
| `dataTransformer.test.ts` | 17 | Wide-to-long transformation, date parsing |
| `validator.test.ts` | 23 | Validation rules, error deduplication, duplicates |
| `configLoader.test.ts` | 22 | System config loading, registry, validation |
| `errorReporter.test.ts` | 25 | Error report generation, formatting |
| `integration.test.ts` | 14 | Full pipeline tests, edge cases |

**Running Backend Tests:**

```bash
cd backend

npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm test -- fileParser      # Specific file
npm test -- -t "should parse CSV"  # Specific test
```

### Frontend Component Tests (45 tests)

**Location:** `frontend/src/components/**/*.test.tsx`

| File | Tests | Description |
|------|-------|-------------|
| `StatusFilterBar.test.tsx` | 4 | Filter chip rendering, click behavior, counts |
| `Toolbar.test.tsx` | 15 | Button states, save indicator, member info toggle |
| `AddRowModal.test.tsx` | 15 | Form validation, submission, field handling |
| `ConfirmModal.test.tsx` | 11 | Modal display, confirm/cancel actions |

**Running Component Tests:**

```bash
cd frontend

npm run test              # Watch mode
npm run test:run          # Single run (CI)
npm run test:coverage     # With coverage report
```

### Playwright E2E Tests (26 passing, 4 skipped)

**Location:** `frontend/e2e/*.spec.ts`

| File | Tests | Description |
|------|-------|-------------|
| `smoke.spec.ts` | 4 | Page load, grid display, toolbar, status bar |
| `add-row.spec.ts` | 9 | Add Row modal, validation, form submission |
| `duplicate-member.spec.ts` | 8 (3 skip) | Duplicate Mbr button, row creation |
| `delete-row.spec.ts` | 10 (4 skip) | Delete confirmation, cancel, backdrop |

**Page Object Model:** `frontend/e2e/pages/main-page.ts`

**Skipped Tests (AG Grid limitations):**
- Confirming delete removes the row (modal timing issues)
- Delete button disabled after deletion (depends on above)
- Delete multiple rows (depends on above)
- Duplicate button disabled after deselection (AG Grid doesn't support deselection via click/escape)

**Running Playwright Tests:**

```bash
cd frontend

npm run e2e               # Headless (CI)
npm run e2e:headed        # With browser visible
npm run e2e:ui            # Interactive UI mode
npm run e2e:report        # View HTML report
```

### Cypress E2E Tests (19 passing)

**Location:** `frontend/cypress/e2e/*.cy.ts`

| File | Tests | Description |
|------|-------|-------------|
| `cascading-dropdowns.cy.ts` | 19 | Dropdown cascading, auto-fill, row colors |

**Test Categories:**

**Request Type Selection (4 tests):**
- Request Type dropdown has 4 options (AWV, Chronic DX, Quality, Screening)
- AWV auto-fills Quality Measure with "Annual Wellness Visit"
- Chronic DX auto-fills Quality Measure with "Chronic Diagnosis Code"
- Quality shows 8 Quality Measure options
- Screening shows 3 Quality Measure options

**AWV Measure Status (5 tests):**
- AWV has 7 status options
- Can select AWV completed status
- AWV completed shows green row color
- AWV scheduled shows blue row color
- Patient declined AWV shows purple row color

**Breast Cancer Screening (5 tests):**
- Breast Cancer Screening has 8 status options
- Screening test ordered shows Tracking #1 options (Mammogram, Breast Ultrasound, Breast MRI)
- Can select Mammogram tracking
- Screening test completed shows green row

**Chronic Diagnosis Code (3 tests):**
- Chronic Diagnosis Code has 5 status options
- Chronic diagnosis resolved shows attestation options
- Chronic diagnosis resolved shows orange row

**Cascading Field Clearing (2 tests):**
- Changing Request Type clears Quality Measure and downstream
- Changing Quality Measure clears Measure Status

**Custom AG Grid Commands:** `frontend/cypress/support/commands.ts`

```typescript
cy.waitForAgGrid()                              // Wait for grid to load
cy.getAgGridCell(rowIndex, colId)               // Get cell by row index and column
cy.openAgGridDropdown(rowIndex, colId)          // Open dropdown for editing
cy.selectAgGridDropdown(rowIndex, colId, value) // Select dropdown value
cy.getAgGridDropdownOptions()                   // Get all options from open dropdown
cy.findRowByMemberName(name)                    // Find row index by patient name
cy.addTestRow(name)                             // Add row via modal
```

**Running Cypress Tests:**

```bash
cd frontend

npm run cypress           # Open Cypress Test Runner (interactive)
npm run cypress:run       # Headless (CI)
npm run cypress:headed    # With browser visible
```

### CLI Test Script (7 test files)

**Location:** `backend/scripts/test-transform.ts`

Tests the full import transformation pipeline with real CSV files.

**Test Data:** `test-data/*.csv`

| File | Rows | Purpose |
|------|------|---------|
| `test-valid.csv` | 10 | Happy path, all valid data |
| `test-dates.csv` | 8 | Date format variations |
| `test-multi-column.csv` | 8 | Multiple columns → same measure |
| `test-validation-errors.csv` | 10 | Missing/invalid fields |
| `test-duplicates.csv` | 8 | Duplicate detection |
| `test-no-measures.csv` | 10 | Empty measure columns |
| `test-warnings.csv` | 10 | Warnings only (missing phone) |

**Running CLI Tests:**

```bash
cd backend

npm run test:cli              # Run all test files
npm run test:cli -- --compare # Compare against baselines
npm run test:cli -- --save    # Save new baselines
```

---

## Test Coverage Summary

| Area | Framework | Tests | Status |
|------|-----------|-------|--------|
| Backend import services | Jest | 130 | Complete |
| Frontend components | Vitest | 45 | 4 components |
| CRUD operations | Playwright | 26 (4 skip) | Complete |
| Cascading dropdowns | Cypress | 19 | Complete |
| Row colors | Cypress | 5 | In cascading tests |
| Grid editing | - | 0 | Planned |
| Time intervals | - | 0 | Planned |
| Import UI flow | - | 0 | Planned |

**Total Automated Tests: ~220**

---

## Writing New Tests

### Backend Test Pattern (Jest)

```typescript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '../myModule.js';

describe('myModule', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => {
      const result = myFunction(validInput);
      expect(result.success).toBe(true);
    });

    it('should handle edge case', () => {
      const result = myFunction(null);
      expect(result.errors).toHaveLength(1);
    });
  });
});
```

### Component Test Pattern (Vitest)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles click', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Playwright E2E Pattern

```typescript
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('Feature Name', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();
  });

  test('should do something', async () => {
    await mainPage.clickButton('Action');
    await expect(mainPage.someElement).toBeVisible();
  });
});
```

### Cypress E2E Pattern (AG Grid)

```typescript
describe('Feature Name', () => {
  const testRowIndex = 0;

  beforeEach(() => {
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('should select dropdown value', () => {
    cy.selectAgGridDropdown(testRowIndex, 'columnId', 'Value');
    cy.wait(300);

    cy.getAgGridCell(testRowIndex, 'columnId')
      .should('contain.text', 'Value');
  });

  it('should verify row color', () => {
    cy.selectAgGridDropdown(testRowIndex, 'measureStatus', 'Completed');
    cy.wait(500);

    cy.get(`[row-index="${testRowIndex}"]`).first()
      .should('have.class', 'row-status-green');
  });
});
```

---

## Test Configuration Files

| File | Purpose |
|------|---------|
| `backend/jest.config.js` | Jest configuration |
| `frontend/vitest.config.ts` | Vitest configuration |
| `frontend/vitest.setup.ts` | Test setup, mocks, matchers |
| `frontend/playwright.config.ts` | Playwright configuration |
| `frontend/cypress.config.ts` | Cypress configuration |
| `frontend/cypress/support/e2e.ts` | Cypress support/setup |
| `frontend/cypress/support/commands.ts` | Custom Cypress commands |

---

## CI/CD Integration

### GitHub Actions Workflows

| Workflow | File | Tests |
|----------|------|-------|
| test.yml | `.github/workflows/test.yml` | Component tests |
| e2e-tests.yml | `.github/workflows/e2e-tests.yml` | Playwright E2E |

### CI Commands

```yaml
# Backend
- run: cd backend && npm test

# Frontend component tests
- run: cd frontend && npm run test:run

# Playwright E2E
- run: cd frontend && npx playwright install --with-deps
- run: cd frontend && npm run e2e

# Cypress E2E
- run: cd frontend && npm run cypress:run
```

---

## Troubleshooting

### Playwright: Dropdown selection not working
- Use Cypress instead for AG Grid dropdowns
- Playwright's click events don't always trigger AG Grid's change handlers

### Cypress: AG Grid popup not opening
- Ensure extra click on dropdown wrapper after double-click
- See `openAgGridDropdown` command in `commands.ts`

### Cypress: Virtual scrolling issues
- Use row index 0 (always visible) for tests
- Or scroll cell into view before interaction

### Jest: Module not found
- Ensure imports use `.js` extension for ESM
- Check jest.config.js moduleNameMapper

---

## Last Updated

January 28, 2026 - Consolidated all test documentation (backend + frontend)
