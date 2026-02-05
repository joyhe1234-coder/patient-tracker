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

### Backend Tests (347 tests)

**Location:** `backend/src/services/`, `backend/src/middleware/`, `backend/src/routes/`

| File | Tests | Description |
|------|-------|-------------|
| **Import Service Tests** | | `backend/src/services/import/__tests__/` |
| `fileParser.test.ts` | 16 | CSV parsing, title row detection, column validation |
| `columnMapper.test.ts` | 13 | Column mapping, Q1/Q2 grouping, skip columns |
| `dataTransformer.test.ts` | 17 | Wide-to-long transformation, date parsing |
| `validator.test.ts` | 23 | Validation rules, error deduplication, duplicates |
| `configLoader.test.ts` | 22 | System config loading, registry, validation |
| `errorReporter.test.ts` | 25 | Error report generation, formatting |
| `integration.test.ts` | 14 | Full pipeline tests, edge cases |
| **Auth Service Tests** | | `backend/src/services/__tests__/` |
| `authService.test.ts` | 19 | Password hashing, JWT tokens, toAuthUser |
| `emailService.test.ts` | 20 | SMTP configuration, reset URL, email content, admin reset notification |
| **Auth Middleware Tests** | | `backend/src/middleware/__tests__/` |
| `auth.test.ts` | 13 | requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| **Route Tests** | | `backend/src/routes/__tests__/` |
| `auth.routes.test.ts` | 16 | Login validation, SMTP status, forgot/reset password |
| `admin.routes.test.ts` | 12 | Admin endpoint auth requirements (users, assignments, audit, bulk-assign) |
| `data.routes.test.ts` | 6 | Data endpoint auth requirements (GET, POST, PUT, DELETE, duplicate) |
| `users.routes.test.ts` | 4 | Physician endpoint auth requirements (Phase 12) |
| **API Tests** | | Various |
| Patient, Measure routes | ~137 | Patient CRUD, measure operations |

**Running Backend Tests:**

```bash
cd backend

npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage
npm test -- fileParser      # Specific file
npm test -- -t "should parse CSV"  # Specific test
```

### Frontend Component Tests (203 tests)

**Location:** `frontend/src/components/**/*.test.tsx`, `frontend/src/pages/*.test.tsx`, `frontend/src/stores/*.test.ts`

| File | Tests | Description |
|------|-------|-------------|
| **Component Tests** | | `frontend/src/components/` |
| `StatusFilterBar.test.tsx` | 29 | Filter chip rendering, click behavior, row colors |
| `Toolbar.test.tsx` | 15 | Button states, save indicator, member info toggle |
| `AddRowModal.test.tsx` | 14 | Form validation, submission, field handling |
| `ConfirmModal.test.tsx` | 11 | Modal display, confirm/cancel actions |
| `Header.test.tsx` | 12 | Provider dropdown visibility, unassigned patients option |
| **Page Tests** | | `frontend/src/pages/` |
| `LoginPage.test.tsx` | 17 | Login form, validation, password toggle, auth flow |
| `ForgotPasswordPage.test.tsx` | 14 | SMTP check, email form, success/error states |
| `ResetPasswordPage.test.tsx` | 17 | Token validation, password form, reset flow |
| `ImportPage.test.tsx` | 26 | Import workflow UI, mode selection, file upload |
| `ImportPreviewPage.test.tsx` | 23 | Preview display, summary cards, changes table |
| **Store Tests** | | `frontend/src/stores/` |
| `authStore.test.ts` | 25 | Login/logout, token storage, session persistence |

**Running Component Tests:**

```bash
cd frontend

npm run test              # Watch mode
npm run test:run          # Single run (CI)
npm run test:coverage     # With coverage report
```

### Playwright E2E Tests (35 passing, 4 skipped)

**Location:** `frontend/e2e/*.spec.ts`

| File | Tests | Description |
|------|-------|-------------|
| `smoke.spec.ts` | 4 | Page load, grid display, toolbar, status bar |
| `add-row.spec.ts` | 9 | Add Row modal, validation, form submission |
| `duplicate-member.spec.ts` | 8 (3 skip) | Duplicate Mbr button, row creation |
| `delete-row.spec.ts` | 10 (4 skip) | Delete confirmation, cancel, backdrop |
| `auth.spec.ts` | 9 | Login form, credentials, session, logout, protected routes |

**Page Object Model:** `frontend/e2e/pages/main-page.ts`, `frontend/e2e/pages/login-page.ts`

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

### Cypress E2E Tests (177 tests)

**Location:** `frontend/cypress/e2e/*.cy.ts`

| File | Tests | Description |
|------|-------|-------------|
| `cascading-dropdowns.cy.ts` | 30 | Dropdown cascading, auto-fill, row colors |
| `import-flow.cy.ts` | 29 | Import workflow, preview, execution |
| `patient-assignment.cy.ts` | 32 | Patient/staff assignment, count verification |
| `role-access-control.cy.ts` | 31 | STAFF/PHYSICIAN/ADMIN access restrictions |
| `sorting-filtering.cy.ts` | 55 | Column sorting, status filter bar, row colors |

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

**Import Flow Tests (29 tests):**

**Import Page (13 tests):**
- Displays three steps (system, mode, upload)
- Hill Healthcare selected by default
- Merge mode selected by default with recommended badge
- Replace All warning modal when selecting replace mode
- File upload (CSV acceptance, invalid type rejection, file removal)
- Preview button disabled without file
- Cancel link navigation

**Import Preview Page (7 tests):**
- Navigation from upload to preview
- Summary cards display (INSERT, UPDATE, SKIP, BOTH, DELETE, Warnings, Total)
- Patient counts (new, existing, total)
- Changes table display
- Filter by action type
- Cancel returns to import page
- Apply Changes button shows record count

**Import Execution (6 tests):**
- Loading state during import
- Success message after import
- Import statistics (inserted, updated, deleted, skipped, bothKept)
- Navigation buttons (Import More, Go to Patient Grid)

**Error Handling (3 tests):**
- Error display for invalid file format
- Preview not found for expired/invalid preview ID
- Start New Import from error page

**Test Data:** `frontend/cypress/fixtures/test-import.csv`

**Sorting & Filtering Tests (55 tests):**

**Column Sorting (16 tests):**
- Status Date sorting (ascending, descending, chronological not alphabetical, empty values)
- Due Date sorting (ascending, descending, empty values)
- Member Name sorting (ascending, descending, alphabetical order verification)
- Request Type, Quality Measure, Measure Status sorting
- Time Interval sorting (numeric)
- Sort indicator behavior (clear on third click, single indicator)

**Status Filter Bar (29 tests):**
- Filter chip display (All, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A, Duplicates)
- Filter chip counts
- Filter by status (Not Addressed, Completed, In Progress, Contacted, Declined, Resolved, N/A, Overdue, Duplicates)
- Filter toggle behavior (deselect, switch filters, highlight active)
- Filter with sorting (maintains filter during sort, maintains sort when filtering)
- Status bar updates (total count, filtered count)

**Row Color Verification (10 tests):**
- Green status (AWV completed, Screening test completed, Blood pressure at goal, HgbA1c at goal)
- Blue status (AWV scheduled, Screening test ordered, Colon cancer screening ordered)
- Yellow status (contacted statuses)
- Purple status (declined statuses)
- Row selection preserves color

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
| Backend auth services | Jest | 50 | Complete |
| Backend API routes | Jest | ~137 | Complete |
| Frontend components | Vitest | 82 | Complete |
| Frontend pages | Vitest | 96 | Complete |
| Frontend stores | Vitest | 25 | Complete |
| Authentication E2E | Playwright | 9 | Complete |
| CRUD operations | Playwright | 26 (4 skip) | Complete |
| Cascading dropdowns | Cypress | 30 | Complete |
| Row colors | Cypress | 5 | In cascading tests |
| Import UI flow | Cypress | 29 | Complete |
| Patient assignment | Cypress | 32 | Complete |
| Role access control | Cypress | 31 | Complete |
| Sorting & filtering | Cypress | 55 | Complete |
| Grid editing | - | 0 | Planned |
| Time intervals | - | 0 | Planned |

**Total Automated Tests: ~735+**

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

## Test Isolation Notes

### Cypress Test Order

**IMPORTANT:** The import-flow tests modify the database when executing imports (Replace mode deletes all data). This can affect subsequent test runs.

**Recommended approach:**
1. Reseed database before running cascading-dropdowns tests:
   ```bash
   cd backend && npx tsx prisma/seed.ts
   ```
2. Run tests individually or reseed between runs:
   ```bash
   npm run cypress:run -- --spec "cypress/e2e/cascading-dropdowns.cy.ts"
   npm run cypress:run -- --spec "cypress/e2e/import-flow.cy.ts"
   ```

**Current test counts:**
- cascading-dropdowns.cy.ts: 30 tests
- import-flow.cy.ts: 29 tests
- patient-assignment.cy.ts: 32 tests
- role-access-control.cy.ts: 31 tests
- sorting-filtering.cy.ts: 55 tests
- **Total: 177 tests** (when run with fresh seed data)

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

February 4, 2026 - Added Sorting & Filtering tests:
- Cypress: sorting-filtering.cy.ts (55 tests) - Column sorting, status filter bar, row colors
- Fixed Status Date/Due Date chronological sorting (custom comparator)
- Cypress tests: 177 (was 122)
- Total tests: ~735+

February 4, 2026 - Added Phase 12 UI tests:
- Frontend: Header.test.tsx (12 tests) - Provider dropdown visibility, unassigned patients option
- Backend tests: 360 (stable)
- Frontend tests: 203 (was 191)

February 2, 2026 - Added Authentication tests:
- Backend: authService.test.ts (19), auth.test.ts middleware (13), auth.routes.test.ts (8), admin.routes.test.ts (10)
- Frontend: LoginPage.test.tsx (17), authStore.test.ts (25)
- E2E: auth.spec.ts (9 Playwright tests)
