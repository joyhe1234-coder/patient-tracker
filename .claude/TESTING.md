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
| **MCP Playwright** | Visual/UX/accessibility review | `.claude/agent-memory/ui-ux-reviewer/` | ui-ux-reviewer agent via Task tool |

### When to Use Each Framework

| Scenario | Framework | Reason |
|----------|-----------|--------|
| Backend service logic | Jest | Fast, isolated unit tests |
| Backend API endpoints | Jest | Integration tests with supertest |
| React component logic | Vitest + RTL | Tests component behavior |
| Form validation, modals | Vitest + RTL + userEvent | Unit-level UI testing |
| Page navigation, basic UI | Playwright | Cross-browser, reliable |
| **AG Grid dropdown selection** | **Cypress** | Better native event handling |
| AG Grid cell editing | Cypress | Reliable AG Grid interaction |
| Complex multi-step workflows | Playwright or Cypress | E2E coverage |
| **ANY UI change (visual review)** | **MCP Playwright** | **MANDATORY** — real browser clicks, screenshots, visual verification |
| Role-specific UI behavior | MCP Playwright | Tests each role sees correct UI |

**Note:** Playwright has issues committing AG Grid dropdown selections. Use Cypress for any AG Grid dropdown tests.

**Cypress Retention for AG Grid:** Cypress is intentionally retained (not consolidated into Playwright) because AG Grid dropdown selection has known issues in Playwright, and 10+ custom Cypress commands exist specifically for AG Grid interactions. Do NOT attempt to migrate Cypress AG Grid tests to Playwright.

### userEvent Convention (Vitest + RTL)

**`userEvent` is the preferred interaction API** for all Vitest component tests. Do NOT use `fireEvent` for new tests.

```typescript
// CORRECT — use userEvent
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

it('handles form submission', async () => {
  render(<MyForm />);
  await user.type(screen.getByLabelText('Name'), 'John');
  await user.click(screen.getByRole('button', { name: 'Submit' }));
  expect(screen.getByText('Success')).toBeInTheDocument();
});

// WRONG — do NOT use fireEvent for new tests
fireEvent.click(button);  // ← use user.click(button) instead
fireEvent.change(input, { target: { value: 'x' } });  // ← use user.type(input, 'x')
```

**Migration reference:**
| fireEvent | userEvent |
|-----------|-----------|
| `fireEvent.click(el)` | `await user.click(el)` |
| `fireEvent.change(input, { target: { value: 'x' } })` | `await user.clear(input); await user.type(input, 'x')` |
| `fireEvent.change(select, { target: { value: 'x' } })` | `await user.selectOptions(select, 'x')` |
| `fireEvent.keyDown(el, { key: 'Escape' })` | `await user.keyboard('{Escape}')` |
| `fireEvent.mouseEnter(el)` | `await user.hover(el)` |
| `fireEvent.mouseLeave(el)` | `await user.unhover(el)` |

**Fake timers:** When using `vi.useFakeTimers()`, configure userEvent:
```typescript
const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
```

### MANDATORY: Visual Browser Review (Layer 5)

**Every feature that changes the UI MUST include a visual browser review task.** This is not optional.

The ui-ux-reviewer agent opens a real browser via MCP Playwright, navigates the app, and **exhaustively tests every interactive element and use case**. This catches issues that automated tests miss:
- Layout/spacing problems
- Color contrast issues
- Text overflow or wrapping
- Responsive behavior at different viewport sizes
- Visual state mismatches (hover, active, disabled)
- Interaction bugs only visible in a real browser

**CRITICAL: No cherry-picking.** The visual review must exercise **ALL** use cases, not just a few happy paths. Click every button, try every dropdown option, test every combination of filters, verify every state transition. The goal is to simulate a real user exploring the feature thoroughly.

**When creating task breakdowns (`/jh-3-tasks`)**, always include a final task:
```
- [ ] N. Visual browser review using ui-ux-reviewer agent (Layer 5)
  - Launch ui-ux-reviewer agent to open running app in MCP Playwright browser
  - EXHAUSTIVELY test every interactive element:
    - Click EVERY button, tab, chip, toggle in the feature
    - Try EVERY dropdown option (not just one or two)
    - Test EVERY combination of interacting controls
    - Verify EVERY state: default, active, disabled, error, empty, loading
    - Check ALL edge cases: zero results, max data, long text, null values
  - Take screenshots at each meaningful state
  - Verify at standard viewport (1280px+) and narrow viewport
  - Report any visual or interaction issues found
```

**When to run:** After all implementation and automated tests pass, before commit.

---

## All Implemented Tests

### Backend Tests (1,387 tests)

**Location:** `backend/src/services/`, `backend/src/middleware/`, `backend/src/routes/`

| File | Tests | Description |
|------|-------|-------------|
| **Import Service Tests** | | `backend/src/services/import/__tests__/` |
| `fileParser.test.ts` | 16 | CSV parsing, title row detection, column validation |
| `columnMapper.test.ts` | 13 | Column mapping, Q1/Q2 grouping, skip columns |
| `dataTransformer.test.ts` | 17 | Wide-to-long transformation, date parsing |
| `validator.test.ts` | 39 | Validation rules, error deduplication, duplicates, date edge cases |
| `configLoader.test.ts` | 22 | System config loading, registry, validation |
| `errorReporter.test.ts` | 25 | Error report generation, formatting |
| `diffCalculator.test.ts` | 17 | Status categorization, merge logic, replace mode edge cases |
| `reassignment.test.ts` | 21 | PatientReassignment interface, scenarios, display formatting |
| `integration.test.ts` | 14 | Full pipeline tests, edge cases |
| **Service Tests** | | `backend/src/services/__tests__/` |
| `authService.test.ts` | 20 | Password hashing, JWT tokens, toAuthUser |
| `emailService.test.ts` | 20 | SMTP configuration, reset URL, email content, admin reset notification |
| `duplicateDetector.test.ts` | 38 | checkForDuplicate, detectAllDuplicates, updateDuplicateFlags, syncAllDuplicateFlags |
| `statusDatePromptResolver.test.ts` | 59 | getDefaultDatePrompt (40+ statuses), resolveStatusDatePrompt (tracking1 overrides, DB lookup) |
| `dueDateCalculator.test.ts` | 24 | Due date calculation, priority system, time interval override |
| **Auth Middleware Tests** | | `backend/src/middleware/__tests__/` |
| `auth.test.ts` | 13 | requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| **Route Tests** | | `backend/src/routes/__tests__/` |
| `auth.routes.test.ts` | 16 | Login validation, SMTP status, forgot/reset password |
| `admin.routes.test.ts` | 12 | Admin endpoint auth requirements (users, assignments, audit, bulk-assign) |
| `data.routes.test.ts` | 6 | Data endpoint auth requirements (GET, POST, PUT, DELETE, duplicate) |
| `users.routes.test.ts` | 4 | Physician endpoint auth requirements (Phase 12) |
| `import.routes.test.ts` | 11 | Import endpoint auth requirements (systems, parse, preview, execute) |
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

### Frontend Component Tests (1,152 tests)

**Location:** `frontend/src/components/**/*.test.tsx`, `frontend/src/pages/*.test.tsx`, `frontend/src/stores/*.test.ts`

| File | Tests | Description |
|------|-------|-------------|
| **Component Tests** | | `frontend/src/components/` |
| `StatusFilterBar.test.tsx` | 52 | Filter chip rendering, click behavior, row colors, search input UI, accessibility (focus-visible) |
| `StatusBar.test.tsx` | 6 | Consistent "Showing X of Y rows" display, locale formatting, Connected status |
| `Toolbar.test.tsx` | 15 | Button states, save indicator, member info toggle |
| `AddRowModal.test.tsx` | 15 | Form validation, submission, field handling |
| `ConfirmModal.test.tsx` | 11 | Modal display, confirm/cancel actions |
| `Header.test.tsx` | 16 | Provider dropdown, unassigned patients, change password modal, visibility toggles, helper text |
| `PatientGrid.test.tsx` | 44 | Column defs, row class rules, headerTooltip, DOB aria-label, grid config |
| **Page Tests** | | `frontend/src/pages/` |
| `LoginPage.test.tsx` | 17 | Login form, validation, password toggle, auth flow |
| `ForgotPasswordPage.test.tsx` | 14 | SMTP check, email form, success/error states |
| `ResetPasswordPage.test.tsx` | 18 | Token validation, password form, reset flow, helper text |
| `ImportPage.test.tsx` | 27 | Import workflow UI, mode selection, file upload, warning icon, max file size |
| `ImportPreviewPage.test.tsx` | 23 | Preview display, summary cards, changes table |
| `PatientManagementPage.test.tsx` | 18 | Tab visibility by role, URL param handling, tab switching, content mounting |
| `MainPage.test.tsx` | 33 | Search filtering logic (word-based matching, AND logic, null handling) |
| **Store Tests** | | `frontend/src/stores/` |
| `authStore.test.ts` | 25 | Login/logout, token storage, session persistence |

**Running Component Tests:**

```bash
cd frontend

npm run test              # Watch mode
npm run test:run          # Single run (CI)
npm run test:coverage     # With coverage report
```

### Playwright E2E Tests (43 passing, 4 skipped)

**Location:** `frontend/e2e/*.spec.ts`

| File | Tests | Description |
|------|-------|-------------|
| `smoke.spec.ts` | 4 | Page load, grid display, toolbar, status bar |
| `add-row.spec.ts` | 9 | Add Row modal, validation, form submission |
| `duplicate-member.spec.ts` | 8 (3 skip) | Duplicate Mbr button, row creation |
| `delete-row.spec.ts` | 10 (4 skip) | Delete confirmation, cancel, backdrop |
| `auth.spec.ts` | 9 | Login form, credentials, session, logout, protected routes |
| `patient-management.spec.ts` | 8 | Tab display, navigation, redirects, role-based access |

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

### Playwright Visual Regression Tests

**Location:** `frontend/e2e/visual-regression.spec.ts`

Automated screenshot comparison tests that detect unintended visual changes. Uses Playwright's `toHaveScreenshot()` with baseline images stored in `frontend/e2e/visual-regression.spec.ts-snapshots/`.

**Configuration** (in `playwright.config.ts`):
- `maxDiffPixelRatio: 0.01` — allows 1% pixel difference (anti-aliasing tolerance)
- `animations: 'disabled'` — prevents flaky diffs from CSS transitions

**Covered Pages:**
| Test | What It Captures |
|------|-----------------|
| Login page (empty state) | Full-page screenshot of unauthenticated login form |
| Main grid (loaded) | Grid with data, toolbar, filter bar (status bar masked) |
| Admin dashboard | User management table (timestamps masked) |
| Import page (empty) | Import workflow with system selector, upload zone |
| Filter bar (active filter) | Grid with a status filter active (status bar masked) |

**Running Visual Regression:**

```bash
cd frontend

# Run visual regression tests (compares against baselines)
npx playwright test visual-regression

# Update baselines after intentional UI changes
npx playwright test visual-regression --update-snapshots
```

**Workflow:**
1. Baselines are generated once and committed to the repo
2. On each test run, new screenshots are compared against baselines
3. If a diff exceeds `maxDiffPixelRatio`, the test fails
4. After intentional UI changes, run `--update-snapshots` to regenerate baselines
5. Review the new baselines visually before committing

**Note:** Baselines may differ between Windows/Linux due to font rendering. Generate baselines on the same OS used for CI.

---

### Cypress E2E Tests (293 tests)

**Location:** `frontend/cypress/e2e/*.cy.ts`

| File | Tests | Description |
|------|-------|-------------|
| `cascading-dropdowns.cy.ts` | 30 | Dropdown cascading, auto-fill, row colors |
| `cell-editing.cy.ts` | 18 | Row selection, text/date/name editing, save indicator |
| `duplicate-detection.cy.ts` | 15 | Visual indicators, 409 errors, flag clearing, null handling |
| `import-flow.cy.ts` | 57 | Import workflow, preview, execution, modes, navigation |
| `patient-assignment.cy.ts` | 32 | Patient/staff assignment, count verification |
| `role-access-control.cy.ts` | 31 | STAFF/PHYSICIAN/ADMIN access restrictions |
| `sorting-filtering.cy.ts` | 55 | Column sorting, status filter bar, row colors |
| `time-interval.cy.ts` | 14 | Dropdown-controlled statuses, manual override, validation |
| `patient-name-search.cy.ts` | 13 | Search input UI, filtering, AND logic, keyboard shortcuts |
| `multi-select-filter.cy.ts` | 18 | Multi-select toggle, duplicates exclusivity, checkmark visual, search combo |
| `ux-improvements.cy.ts` | 10 | Status bar, filter accessibility, import UX, password toggles |

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

**Import Flow Tests (57 tests):**

**Import Page (13 tests):**
- Displays three steps (system, mode, upload)
- Hill Healthcare selected by default
- Merge mode selected by default with recommended badge
- Replace All warning modal when selecting replace mode
- File upload (CSV acceptance, invalid type rejection, file removal)
- Preview button disabled without file
- Cancel link navigation

**Import Preview Flow (1 test):**
- Navigation from upload to preview

**Import Preview Page (6 tests):**
- Summary cards display (INSERT, UPDATE, SKIP, BOTH, DELETE, Warnings, Total)
- Patient counts (new, existing, total)
- Changes table display
- Filter by action type
- Cancel returns to import page
- Apply Changes button shows record count

**Import Execution (7 tests):**
- Loading state during import
- Success message after import
- Import statistics (inserted, updated, deleted, skipped, bothKept)
- Navigation buttons (Import More, Go to Patient Grid)

**Error Handling (4 tests):**
- Error display for invalid file format
- Preview not found for expired/invalid preview ID
- Start New Import from error page
- Empty CSV file error

**Merge Mode Behavior (2 tests):**
- Imports without deleting existing records
- Mode indicator on preview page

**Preview Page Details (5 tests):**
- File info in header
- Expiration time display
- Changes table columns
- INSERT card filters to INSERT actions only
- Total card shows all actions

**Import with Warnings (1 test):**
- Warnings section displays when file has validation warnings

**Multiple File Imports (2 tests):**
- Same file imported twice shows different results (inserts vs skips)

**Cancel and Navigation (3 tests):**
- Cancel at import page returns home
- Cancel at preview page returns to import
- Browser back works from preview page

**Test Data:** `frontend/cypress/fixtures/test-hill-import.csv`

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

### MCP Playwright Visual Review (on-demand)

**Location:** `.claude/agent-memory/ui-ux-reviewer/`

MCP Playwright is a **browser-based visual review** layer that uses the `ui-ux-reviewer` agent to launch a real browser, navigate the app as different roles, take screenshots, and analyze visual design, UX patterns, and accessibility.

**What It Tests:**
- Visual design consistency (layout, spacing, typography, color)
- UX patterns (interaction feedback, error states, empty states, cognitive load)
- Accessibility (color contrast, keyboard navigation, focus indicators, ARIA labels)
- Role-specific UI behavior (ADMIN vs STAFF vs PHYSICIAN see correct UI)
- Responsive design across breakpoints (desktop, tablet, mobile)

**How to Invoke:**

Launch the `ui-ux-reviewer` agent via the Task tool, specifying the page and role to review:

```
Task tool → subagent_type: "ui-ux-reviewer"
Prompt: "Review the [page name] as [role]. The dev server is running at http://localhost:5173"
```

**Page Guides Available:**

| Page | Guide | Key Review Points |
|------|-------|-------------------|
| Patient Grid | `page-guides/patient-grid.md` | AG Grid layout, row colors, dropdowns, role-based columns |
| Auth Flow | `page-guides/auth-flow.md` | Login form, password reset, change password modal |

Page guides define all use cases, interactions, role-based behaviors, and expected states. The agent uses them as a review checklist.

**Where Reports Go:**
- Reviews are saved to `.claude/agent-memory/ui-ux-reviewer/reviews/`
- Named by page and date: e.g., `patient-grid-2026-02-06.md`
- Reports include severity-rated findings with screenshots

**How Bugs Are Logged:**
- **Confirmed Bugs** (code doesn't match spec) → `TODO.md` "Confirmed Bugs" section with `BUG-N` format
- **UX Suggestions** (works but could be better) → `TODO.md` "UI/UX Review Findings" section
- Each entry includes: severity, affected file, root cause, fix hint

**When to Run:**
- After implementing new UI features or pages
- After fixing UX bugs (to verify the fix)
- As periodic audit (e.g., before a release)
- When a user reports a visual or UX issue

---

### CLI Test Script (7 test files)

**Location:** `backend/scripts/test-transform.ts`

Tests the full import transformation pipeline with real CSV files.

**Test Data:** `test-data/*.csv`

| File | Rows | Purpose |
|------|------|---------|
| `test-hill-valid.csv` | 10 | Happy path, all valid data |
| `test-hill-dates.csv` | 8 | Date format variations |
| `test-hill-multi-column.csv` | 8 | Multiple columns → same measure |
| `test-hill-validation-errors.csv` | 10 | Missing/invalid fields |
| `test-hill-duplicates.csv` | 8 | Duplicate detection |
| `test-hill-no-measures.csv` | 10 | Empty measure columns |
| `test-hill-warnings.csv` | 10 | Warnings only (missing phone) |

**Running CLI Tests:**

```bash
cd backend

npm run test:cli              # Run all test files
npm run test:cli -- --compare # Compare against baselines
npm run test:cli -- --save    # Save new baselines
```

---

### Sutter Integration Tests (67 tests)

**Location:** `backend/src/services/import/__tests__/sutter-integration.test.ts`

Tests the full Sutter pipeline (parse → map → transform → validate → diff) using programmatically-generated Excel fixture files.

**Fixture Generator:** `test-data/create-sutter-fixtures.ts`

```bash
# Generate fixtures (required before running tests)
cd backend && npx tsx ../test-data/create-sutter-fixtures.ts

# Run integration tests
cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js sutter-integration --no-coverage
```

**Test Data:** `test-data/test-sutter-*.xlsx` (8 files)

| File | Tests | Purpose |
|------|-------|---------|
| `test-sutter-valid.xlsx` | 13 | All 10 action patterns, AWV/APV merge, HCC notes, stats |
| `test-sutter-duplicates.xlsx` | 6 | Duplicate merging (latest date, concat notes/actions) |
| `test-sutter-edge-cases.xlsx` | 10 | Special chars, date formats, BP readings, missing fields |
| `test-sutter-errors.xlsx` | 8 | Missing name/DOB, unknown request type, headers-only tab |
| `test-sutter-skip-actions.xlsx` | 5 | 11 skip actions filtered, 2 valid mapped |
| `test-sutter-unmapped.xlsx` | 5 | Unmapped aggregation, sorting, zero errors |
| `test-sutter-merge.xlsx` | 8 | INSERT/SKIP/UPDATE diff against existing records |
| `test-sutter-measure-details.xlsx` | 12 | All 12 parsing strategies (semicolon, comma, embedded, BP) |

---

### Sutter Import Visual Tests (22 tests)

**Location:** `frontend/e2e/sutter-import-visual.spec.ts`

Visual review tests for the Sutter import UI workflow with screenshots.

**Fixture Helpers:** `frontend/e2e/fixtures/sutter-fixture-helper.ts`

```bash
cd frontend && npx playwright test sutter-import-visual
```

| Group | Tests | Covers |
|-------|-------|--------|
| System & Upload | 4 | Dropdown, file input, sheet selector, tab count |
| Sheet & Physician | 4 | Tab filtering, auto-match, manual override, warnings |
| Preview | 4 | Header info, unmapped banner, details toggle, changes table |
| Role-Based Access | 4 | ADMIN, PHYSICIAN, ADMIN+PHY, STAFF |
| Responsive | 3 | Mobile 375px, tablet 768px, desktop 1920px |
| Error States | 3 | No valid tabs, empty tab, missing physician |

---

## Test Coverage Summary

| Area | Framework | Tests | Status |
|------|-----------|-------|--------|
| Backend import services | Jest | 130 | Complete |
| Backend auth services | Jest | 50 | Complete |
| Backend API routes | Jest | ~137 | Complete |
| Frontend components | Vitest | 159 | Complete |
| Frontend pages | Vitest | 133 | Complete |
| Frontend stores | Vitest | 25 | Complete |
| Authentication E2E | Playwright | 9 | Complete |
| CRUD operations | Playwright | 26 (4 skip) | Complete |
| Cascading dropdowns | Cypress | 30 | Complete |
| Row colors | Cypress | 5 | In cascading tests |
| Import UI flow | Cypress | 29 | Complete |
| Patient assignment | Cypress | 32 | Complete |
| Role access control | Cypress | 31 | Complete |
| Sorting & filtering | Cypress | 55 | Complete |
| Multi-select filter | Cypress | 18 | Complete |
| Patient name search | Vitest + Cypress | 38 | Complete |
| Cell editing | Cypress | 18 | Complete |
| Time intervals | Cypress | 14 | Complete |
| Duplicate detection | Cypress | 15 | Complete |
| Multi-select filter | Cypress | 18 | Complete |
| UX improvements | Cypress | 10 | Complete |
| Sutter file-based integration | Jest | 67 | Complete |
| Sutter import visual | Playwright | 22 | Complete |
| Visual/UX review | MCP Playwright | - | On-demand |

**Total Automated Tests: ~2,548** (1,165 Jest + 1,025 Vitest + ~65 Playwright + ~293 Cypress)

---

## Code Coverage Results (Phase 9-10 Audit, Feb 12, 2026)

### Backend Coverage (Jest)

Run via: `cd backend && node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage`

| File | % Stmts | % Branch | % Funcs | % Lines | Notes |
|------|---------|----------|---------|---------|-------|
| **All files** | **82.77** | **75.23** | **87.61** | **82.97** | |
| columnMapper.ts | 96.72 | 90.00 | 100 | 98.24 | |
| configLoader.ts | 88.46 | 66.66 | 100 | 88.00 | |
| dataTransformer.ts | 74.25 | 65.90 | 62.50 | 74.48 | Lines 301, 327-348, 366-404 uncovered |
| diffCalculator.ts | 57.81 | 58.82 | 64.28 | 57.25 | Lines 157-245, 463, 536-615 uncovered |
| errorReporter.ts | 100 | 100 | 100 | 100 | |
| fileParser.ts | 94.59 | 85.45 | 100 | 95.45 | |
| importExecutor.ts | 93.93 | 76.66 | 100 | 93.75 | |
| previewCache.ts | 91.17 | 87.87 | 92.85 | 91.17 | |
| validator.ts | 86.74 | 81.48 | 80 | 86.58 | |
| dateParser.ts (utils) | 72.46 | 66.66 | 75 | 74.62 | |
| logger.ts (utils) | 72.22 | 50 | 87.50 | 72.22 | |

**Files below 70% line coverage:**
- `diffCalculator.ts` (57.25%) - Uncovered: replace mode edge cases, some merge scenarios

**Notes:**
- Backend tests use `node --experimental-vm-modules` for ESM support
- `npx jest --coverage` (without VM modules flag) fails with TS1378/TS1343 errors for ESM test files
- The 82.97% overall coverage exceeds the 70% target for backend services

### Frontend Coverage (Vitest + v8)

Run via: `cd frontend && npx vitest run --coverage`

| File | % Stmts | % Branch | % Funcs | % Lines | Notes |
|------|---------|----------|---------|---------|-------|
| **All files** | **65.40** | **57.93** | **64.35** | **65.72** | |
| ProtectedRoute.tsx | 100 | 100 | 100 | 100 | |
| AutoOpenSelectEditor.tsx | 100 | 92.30 | 100 | 100 | |
| DateCellEditor.tsx | 100 | 75 | 100 | 100 | |
| PatientGrid.tsx | 16.80 | 11.01 | 27.39 | 16.71 | AG Grid dependency limits unit testing |
| StatusDateRenderer.tsx | 100 | 100 | 100 | 100 | |
| useGridCellUpdate.ts | 88.04 | 67.85 | 44.44 | 88.63 | |
| useRemoteEditClass.ts | 90 | 87.50 | 100 | 100 | |
| cascadingFields.ts | 100 | 100 | 100 | 100 | |
| Header.tsx | 52.30 | 66.21 | 55 | 51.56 | Complex multi-role logic |
| StatusBar.tsx | 94.11 | 95.83 | 100 | 93.33 | |
| StatusFilterBar.tsx | 100 | 100 | 100 | 100 | |
| Toolbar.tsx | 90 | 81.25 | 100 | 90 | |
| AddRowModal.tsx | 100 | 100 | 100 | 100 | |
| ConfirmModal.tsx | 100 | 100 | 100 | 100 | |
| ConflictModal.tsx | 100 | 100 | 100 | 100 | |
| ResetPasswordModal.tsx | 0 | 0 | 0 | 0 | No tests yet |
| UserModal.tsx | 0 | 0 | 0 | 0 | No tests yet |
| dropdownConfig.ts | 100 | 100 | 100 | 100 | |
| statusColors.ts | 100 | 100 | 100 | 100 | |
| useSocket.ts | 96.42 | 100 | 91.30 | 95.74 | |
| AdminPage.tsx | 59.18 | 57.14 | 35.71 | 59.37 | |
| ForgotPasswordPage.tsx | 100 | 100 | 100 | 100 | |
| ImportPage.tsx | 64.60 | 48.45 | 57.14 | 64.60 | |
| ImportPreviewPage.tsx | 72.15 | 57.73 | 64.28 | 74.02 | |
| LoginPage.tsx | 78.78 | 80.76 | 100 | 80.64 | |
| PatientAssignmentPage.tsx | 98.36 | 88.13 | 100 | 100 | |
| PatientManagementPage.tsx | 100 | 100 | 100 | 100 | |
| ResetPasswordPage.tsx | 100 | 100 | 100 | 100 | |
| socketService.ts | 73.33 | 80 | 52.17 | 73.33 | |
| authStore.ts | 81.17 | 60.71 | 56.25 | 82.71 | |
| realtimeStore.ts | 100 | 100 | 100 | 100 | |
| agGridMocks.ts | 81.81 | 100 | 71.42 | 81.81 | |
| apiError.ts | 100 | 100 | 100 | 100 | |
| dateFormatter.ts | 100 | 100 | 100 | 100 | |
| dateParser.ts | 98.14 | 97.50 | 100 | 100 | |
| logger.ts | 90 | 50 | 100 | 90 | |

**Files below 60% line coverage:**
- `PatientGrid.tsx` (16.71%) - AG Grid requires real DOM; covered by Cypress E2E tests instead
- `Header.tsx` (51.56%) - Complex multi-role dropdown logic; partially tested
- `ResetPasswordModal.tsx` (0%) - Admin modal, no tests yet
- `UserModal.tsx` (0%) - Admin modal, no tests yet
- `SummaryCards.tsx` (42.85%) - Import preview component, partially tested
- `AdminPage.tsx` (59.37%) - Complex admin dashboard, partially tested

**Notes:**
- `PatientGrid.tsx` low coverage is expected: AG Grid rendering is tested via Cypress E2E (283+ tests)
- `ResetPasswordModal.tsx` and `UserModal.tsx` are admin-only modals with low risk
- Overall frontend coverage includes significant E2E coverage not reflected in Vitest numbers

### Bundle Size Analysis (Vite Build)

Run via: `cd frontend && npx vite build`

| Chunk | Size | Gzip | Notes |
|-------|------|------|-------|
| index.html | 0.49 KB | 0.32 KB | |
| index.css | 299.37 KB | 43.46 KB | AG Grid styles + app styles |
| index.js | 1,551.64 KB | 411.09 KB | Single chunk (no code-splitting) |

**Findings:**
- Vite warns about chunk > 500 KB after minification
- Primary contributors: AG Grid Community (~600KB min), React + React-DOM (~130KB), Socket.IO client (~50KB)
- No tree-shaking failures found - all imports use named/specific imports
- No barrel imports from large libraries (lodash, date-fns, etc.)
- Code-splitting the grid page would require lazy loading and is out of scope for this refactor
- Gzip size (411 KB) is acceptable for an internal enterprise application

### Cypress cy.wait() Analysis

**Total cy.wait() calls: 420 across 15 files**

| File | Count | Primary Pattern |
|------|-------|----------------|
| cascading-dropdowns.cy.ts | 71 | AG Grid dropdown open/close timing |
| sorting-filtering.cy.ts | 52 | AG Grid sort/filter transitions |
| time-interval.cy.ts | 49 | AG Grid cell edit + API save timing |
| patient-assignment.cy.ts | 47 | API response + DOM update timing |
| cell-editing.cy.ts | 41 | AG Grid cell transition timing |
| duplicate-detection.cy.ts | 34 | AG Grid + API save timing |
| multi-select-filter.cy.ts | 35 | Filter chip + grid re-render timing |
| date-prepopulate.cy.ts | 24 | DateCellEditor + Today button timing |
| patient-name-search.cy.ts | 14 | Search input debounce timing |
| hover-reveal-dropdown.cy.ts | 12 | Hover + dropdown open timing |
| role-access-control.cy.ts | 12 | Page navigation + API load timing |
| ux-improvements.cy.ts | 11 | Mixed UI transition timing |
| parallel-editing-row-operations.cy.ts | 9 | Socket.IO event timing |
| compact-filter-bar.cy.ts | 7 | Filter bar transitions |
| parallel-editing-grid-updates.cy.ts | 2 | Socket.IO event timing |

**Wait duration breakdown:**
| Duration | Count | Category |
|----------|-------|----------|
| 200ms | 21 | Short UI transitions |
| 300ms | 163 | AG Grid cell transitions, dropdown close |
| 500ms | 171 | API saves, AG Grid re-renders |
| 1000ms | 55 | Heavy API operations, grid refreshes |
| 1500ms | 6 | Import execution, bulk operations |

**Existing cy.intercept usage:** Only 3 calls across 3 files (duplicate-detection, patient-assignment, role-access-control).

**Categorization of cy.wait() calls:**
1. **AG Grid internal timing (300ms waits):** ~163 calls. These wait for AG Grid cell transitions (edit mode open/close, dropdown popup, cell value commit). AG Grid does not expose reliable events for these transitions, making `.should()` assertions the only alternative - but this can be flaky.
2. **API save completion (500ms waits):** ~171 calls. These wait for PUT/POST API calls to complete and the grid to reflect updated data. These are prime candidates for `cy.intercept` + `cy.wait('@alias')` replacement.
3. **Heavy operations (1000ms+ waits):** ~61 calls. Import execution, bulk assignment, page loads. Some could use intercept, others are necessary.

**Recommendation (documented only - no modifications per instructions):**
- ~171 of the 500ms waits could potentially be replaced with `cy.intercept('PUT', '/api/data/*').as('save')` + `cy.wait('@save')` for deterministic waiting
- The 300ms AG Grid timing waits are risky to change without interactive testing - AG Grid internal animations vary
- Decision: Do NOT modify Cypress tests in this refactor (too risky without running them interactively)

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
- cell-editing.cy.ts: 18 tests
- duplicate-detection.cy.ts: 15 tests
- import-flow.cy.ts: 57 tests
- patient-assignment.cy.ts: 32 tests
- role-access-control.cy.ts: 31 tests
- sorting-filtering.cy.ts: 55 tests
- time-interval.cy.ts: 14 tests
- patient-name-search.cy.ts: 13 tests
- multi-select-filter.cy.ts: 18 tests
- ux-improvements.cy.ts: 10 tests
- **Total: 293 tests** (when run with fresh seed data)

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

February 12, 2026 - Phase 9-10 code quality audit: coverage analysis, bundle review, cy.wait analysis
- Backend coverage: 82.97% lines (701 tests), frontend coverage: 65.72% lines (856 tests)
- Bundle: 1,551 KB (411 KB gzip) - AG Grid is dominant factor, no tree-shaking issues
- Cypress cy.wait(): 420 calls across 15 files, documented categories and replacement candidates
- Test counts: Jest 701, Vitest 856, Playwright ~43, Cypress ~293, total ~1,893

February 6, 2026 - Row numbers removed, search improvements, test updates
- Removed row numbers: PatientGrid.test.tsx (-2, now 44), ux-improvements.cy.ts (-5, now 10)
- Word-based search: MainPage.test.tsx (+5, now 33) - multi-word, any order, partial words
- Test counts: Vitest 335, Playwright 43, Cypress 293, total ~1198

February 6, 2026 - 8 UX quick-win fixes (batch 2): 18 new Vitest + 10 new Cypress tests
- NEW: StatusBar.test.tsx (6 tests) - consistent display, locale formatting
- Updated: Header.test.tsx (+4, now 16) - change password modal, visibility toggles, helper text
- Updated: PatientGrid.test.tsx (+4, now 46) - headerTooltip, DOB aria-label
- Updated: ResetPasswordPage.test.tsx (+1, now 18) - password helper text
- Updated: ImportPage.test.tsx (+1, now 27) - warning icon
- Updated: StatusFilterBar.test.tsx (+1, now 52) - focus-visible accessibility
- NEW: ux-improvements.cy.ts (10 tests) - status bar, filter accessibility, import UX, password toggles

February 6, 2026 - Added MCP Playwright Visual Review as 5th test layer:
- Documented MCP Playwright visual review workflow (page guides, reports, bug logging)
- Updated test counts: Vitest 296, Cypress 283, total ~1141
- Added "When to Use" entries for visual/UX and role-specific testing
- Updated Test Coverage Summary table with current Cypress test files

February 5, 2026 - Added Patient Name Search tests:
- Vitest: MainPage.test.tsx (20 tests) - Search filtering logic, AND logic, null handling
- Vitest: StatusFilterBar.test.tsx updated (+10 search UI tests, now 39 total)
- Cypress: patient-name-search.cy.ts (13 tests) - Search input, filtering, keyboard shortcuts
- Vitest tests: 265 (was 245)
- Cypress tests: 265 (was 252)
- Total tests: ~1092

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
