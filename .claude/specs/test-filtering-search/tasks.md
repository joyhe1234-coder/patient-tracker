# Implementation Plan: test-filtering-search

## Task Overview

Write 21 new tests across 8 task groups to fill coverage gaps in Module 7: Filtering & Search. This spec adds tests only -- no production code changes. Each task produces one file (new or extended) and is independently executable unless dependencies are noted.

**Test distribution:**
- T1-1: 5 Cypress tests -- HIGH priority combined filter & chip count gaps (`filter-roles-combined.cy.ts`)
- T1-2: 3 Cypress tests -- MEDIUM priority search behavior gaps (`patient-name-search.cy.ts`)
- T1-3: 1 Cypress test -- MEDIUM priority multi-select exclusivity sequence (`multi-select-filter.cy.ts`)
- T1-4: 2 Cypress tests -- MEDIUM priority compact filter bar gaps (`compact-filter-bar.cy.ts`)
- T1-5: 3 Cypress tests -- MEDIUM priority sort/pinned row state gaps (`sorting-filtering.cy.ts`)
- T1-6: 1 Cypress test -- MEDIUM priority insurance summary gap (`insurance-group-filter.cy.ts`)
- T2-1: 1 Playwright test -- MEDIUM priority API failure fallback (`compact-filter-bar.spec.ts`)
- T3-1: 5 Playwright tests -- LOW priority accessibility & viewport (`filter-accessibility.spec.ts`, new file)

## Steering Document Compliance

- Cypress files follow the pattern established in `frontend/cypress/e2e/*.cy.ts`
- Playwright files follow the pattern in `frontend/e2e/*.spec.ts`
- All Cypress tests use custom commands: `cy.login()`, `cy.waitForAgGrid()`, `cy.addTestRow()`, `cy.selectAgGridDropdown()`, `cy.getAgGridCell()`
- Row counts use `.ag-center-cols-container .ag-row` -- NOT `data-testid="row-count"` (that only exists in Vitest mocks)
- Seed accounts: `ko037291@gmail.com` (admin), `phy1@gmail.com`, `staff1@gmail.com` (password: `welcome100`)
- Insurance group filter is a native `<select>` -- use `cy.get('select[aria-label="Filter by insurance group"]').select('value')` and `.should('have.value', 'value')` per CON-M7-5
- New Cypress tests go into existing files per INT-M7-3 / INT-M7-4 (all additions < 30 tests per file)
- New Playwright accessibility tests go into a new `filter-accessibility.spec.ts` per INT-M7-5

## Atomic Task Requirements

Each task meets these criteria:
- **File Scope**: 1 file created or 1 file extended
- **Time Boxing**: 15-30 minutes
- **Single Purpose**: One test file, one behavioral area
- **Specific Files**: Exact paths listed
- **Agent-Friendly**: Includes run command to verify passing

---

## Tasks

### Task T1-1: HIGH Priority -- Combined Filters & Chip Counts (filter-roles-combined.cy.ts)

- **Priority**: HIGH
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/filter-roles-combined.cy.ts` (extend)
- **Tests to Write**: 5
- **Description**: Fill the four HIGH priority gaps plus one MEDIUM gap, all targeting the same file. These cover the most critical real-world scenarios: chip count accuracy after edits, filter state preservation across data refresh, Duplicates triple-AND combination, triple filter summary in status bar, and physician-insurance filter independence.
- **Test list**:
  1. **`chip count decrements source and increments target after status edit`** (GAP-2.2, AC-M7-2.5) -- Read current chip counts for two colors (e.g., "Not Addressed" white and "Completed" green). Edit a row's `measureStatus` to change its color from source to target using `cy.selectAgGridDropdown()`. After edit completes, verify source chip count decremented by 1 and target chip count incremented by 1. Use data-driven assertions (read counts before/after, not hardcoded values).
  2. **`data refresh preserves active filter selections`** (GAP-7.5, AC-M7-7.5) -- Select a specific quality measure from dropdown. Click a color chip to activate it. Note the search input is empty. Edit any cell in a visible row (e.g., change `notes` field). After the edit triggers a data refresh, verify: (a) the measure dropdown still shows the selected measure, (b) the color chip is still active (`aria-pressed="true"`), (c) the grid still shows only rows matching both filters.
  3. **`Duplicates + measure + search triple AND filter`** (GAP-6.4, AC-M7-6.4) -- Click the Duplicates chip. Select a quality measure from the dropdown. Type a search term that matches at least one duplicate row for that measure (or use a nonexistent search to verify zero results). Verify the grid shows only rows matching all three criteria (or zero rows if no match). Verify status bar row count matches visible rows.
  4. **`triple filter summary shows insurance, color, and measure`** (GAP-8.6, AC-M7-8.6) -- Set insurance group to a non-"All" value (e.g., keep default "Hill"). Click a color chip (e.g., "Completed"). Select a quality measure (e.g., "Annual Wellness Visit"). Verify the status bar filter summary text contains all three parts separated by pipes: "Insurance: Hill", "Color: Completed", "Measure: Annual Wellness Visit".
  5. **`physician selector change preserves insurance group filter`** (GAP-7.2, AC-M7-7.3) -- Login as admin. Change the insurance group dropdown to "All". Change the physician selector in the header to a different physician. Verify the insurance group dropdown still shows "All" (not reset to "Hill" default). Verify chip counts updated for the new physician's data but insurance selection preserved.
- **Acceptance Criteria**:
  - [ ] All 5 tests written inside a new `describe('Coverage gap tests')` block appended to the existing file
  - [ ] All 5 tests pass with `--headed`
  - [ ] No regressions in existing 24 tests in this file
- **Dependencies**: None (extends existing file with existing test infrastructure)
- **Estimated Effort**: L (5 tests, most require multi-step interactions)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/filter-roles-combined.cy.ts --headed`
- **Gap traceability**: GAP-2.2, GAP-7.5, GAP-6.4, GAP-8.6, GAP-7.2

---

### Task T1-2: MEDIUM Priority -- Patient Name Search Gaps (patient-name-search.cy.ts)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/patient-name-search.cy.ts` (extend)
- **Tests to Write**: 3
- **Description**: Add E2E coverage for multi-word search, whitespace handling, and search text preservation when color filter changes. These behaviors are unit-tested in Vitest but lack E2E validation.
- **Test list**:
  1. **`multi-word search matches "lastname firstname" order`** (GAP-4.1, AC-M7-4.4) -- Read the text of a visible row's member name cell (e.g., "Williams, Robert"). Extract the last name and first name parts. Type them in reverse order (e.g., "Robert Williams") into the search input. Verify the row still appears in the filtered grid. Clear and verify all rows return.
  2. **`search with extra whitespace filters correctly`** (GAP-4.3, AC-M7-4.4) -- Read a patient name from the grid. Type the name with leading spaces, trailing spaces, and double spaces between words (e.g., "  Williams   Robert  "). Verify the grid filters to show matching rows (same result as trimmed search).
  3. **`search text preserved when color filter changes`** (GAP-4.4, AC-M7-6.2) -- Type a search term that matches multiple rows. Note the search input value. Click a color chip. Verify: (a) search input still contains the search term, (b) grid shows only rows matching BOTH the search term AND the selected color (AND logic), (c) clear the color filter back to "All", search text still present.
- **Acceptance Criteria**:
  - [ ] All 3 tests written inside a new `describe('Search edge cases')` block appended to the existing file
  - [ ] All 3 tests pass with `--headed`
  - [ ] No regressions in existing 14 tests in this file
- **Dependencies**: None
- **Estimated Effort**: M (3 tests, straightforward search interactions)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/patient-name-search.cy.ts --headed`
- **Gap traceability**: GAP-4.1, GAP-4.3, GAP-4.4

---

### Task T1-3: MEDIUM Priority -- Multi-Select Exclusivity Sequence (multi-select-filter.cy.ts)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/multi-select-filter.cy.ts` (extend)
- **Tests to Write**: 1
- **Description**: Add a single comprehensive E2E test that exercises the full multi-select + Duplicates exclusivity sequence as one continuous flow, covering transitions that are currently tested only in isolation.
- **Test list**:
  1. **`combined multi-select and Duplicates exclusivity full toggle sequence`** (GAP-1.1, AC-M7-1.4/1.9/1.10/1.11) -- Step 1: Click two color chips (e.g., "In Progress" and "Completed"), verify both have `aria-pressed="true"` and grid shows OR results. Step 2: Click "Duplicates" chip, verify both color chips are deselected (`aria-pressed="false"`) and Duplicates is active. Step 3: Click a color chip (e.g., "Not Addressed"), verify Duplicates is deselected and the color chip is active. Step 4: Toggle off the last active color chip, verify "All" becomes active (fallback). This tests the full cycle in one flow.
- **Acceptance Criteria**:
  - [ ] 1 test written inside a new `describe('Exclusivity sequence')` block appended to the existing file
  - [ ] Test passes with `--headed`
  - [ ] No regressions in existing 18 tests in this file
- **Dependencies**: None
- **Estimated Effort**: S (1 test, multi-step but well-defined)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/multi-select-filter.cy.ts --headed`
- **Gap traceability**: GAP-1.1

---

### Task T1-4: MEDIUM Priority -- Compact Filter Bar Gaps (compact-filter-bar.cy.ts)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/compact-filter-bar.cy.ts` (extend)
- **Tests to Write**: 2
- **Description**: Add E2E coverage for measure dropdown option count validation and zero-count chip click showing empty grid. Both are currently only tested at the Vitest level.
- **Test list**:
  1. **`measure dropdown shows 15 options (All Measures + 14 quality measures)`** (GAP-5.3, AC-M7-5.3) -- Locate the quality measure dropdown by `aria-label="Filter by quality measure"`. Count the `<option>` elements inside the dropdown. Verify exactly 15 options exist. Optionally verify the first option is "All Measures".
  2. **`zero-count chip click selects chip and shows empty grid`** (GAP-2.4, AC-M7-2.10) -- Select a quality measure that causes at least one color chip to have a count of zero (read chip counts to find one with "(0)"). Click that zero-count chip. Verify: (a) chip becomes selected (`aria-pressed="true"`), (b) grid shows zero rows (`.ag-center-cols-container .ag-row` count is 0 or AG Grid empty overlay is visible), (c) chip still displays with dashed border styling or active styling.
- **Acceptance Criteria**:
  - [ ] Both tests written inside a new `describe('Dropdown and zero-count')` block appended to the existing file
  - [ ] Both tests pass with `--headed`
  - [ ] No regressions in existing 3 tests in this file
- **Dependencies**: None
- **Estimated Effort**: S (2 tests, simple assertions)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/compact-filter-bar.cy.ts --headed`
- **Gap traceability**: GAP-5.3, GAP-2.4

---

### Task T1-5: MEDIUM Priority -- Sort & Pinned Row State Gaps (sorting-filtering.cy.ts)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/sorting-filtering.cy.ts` (extend)
- **Tests to Write**: 3
- **Description**: Add E2E coverage for pinned row filter bypass, pinned row badge clearing on filter change, and sort order preservation when a filter is applied. These test filter state management behaviors currently only covered at the Vitest layer.
- **Test list**:
  1. **`pinned row remains visible despite non-matching filter`** (GAP-7.3, AC-M7-7.7) -- Add a new row using `cy.addTestRow('PinTest, Bypass')` which creates a pinned row. Select a quality measure from the dropdown that does not match the new row's default measure (or select a color chip that does not match the new row's default color). Verify the pinned row (containing "PinTest") is still visible in the grid despite the filter mismatch. Then change any filter (e.g., click a different chip) to clear the pin, and verify the row disappears if it does not match.
  2. **`filter change clears pinned row badge`** (GAP-7.4, AC-M7-7.6) -- Add a new row using `cy.addTestRow('PinBadge, Clear')`. Verify the pinned row badge/indicator is visible (look for a badge element or highlighted row). Click a color chip to change the active filter. Verify the pinned badge is no longer visible (pinnedRowId cleared). The row itself may or may not be visible depending on filter match.
  3. **`sort order preserved when color filter applied`** (GAP-7.6, AC-M7-7.5) -- Click a column header (e.g., `memberName`) to sort ascending. Read the first few cell values to confirm ascending order. Click a color chip to apply a filter. Read the remaining visible rows' values in the same column. Verify they are still in ascending order (filtered subset maintains sort).
- **Acceptance Criteria**:
  - [ ] All 3 tests written inside a new `describe('Filter state management')` block appended to the existing file
  - [ ] All 3 tests pass with `--headed`
  - [ ] No regressions in existing 56 tests in this file
- **Dependencies**: None
- **Estimated Effort**: M (3 tests, pinned row tests require add-row setup)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/sorting-filtering.cy.ts --headed`
- **Gap traceability**: GAP-7.3, GAP-7.4, GAP-7.6

---

### Task T1-6: MEDIUM Priority -- Insurance Filter Summary (insurance-group-filter.cy.ts)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/insurance-group-filter.cy.ts` (extend)
- **Tests to Write**: 1
- **Description**: Add E2E verification that the status bar shows "Insurance: Hill" (or appropriate text) when the insurance group filter is set to a non-"All" value. Currently only tested at the Vitest level.
- **Test list**:
  1. **`status bar shows insurance filter in summary text`** (GAP-8.4, AC-M7-8.4) -- Verify the insurance group dropdown defaults to "Hill". Locate the status bar area. Verify the filter summary text includes "Insurance: Hill". Change the insurance group to "All". Verify the filter summary no longer includes "Insurance:" text.
- **Acceptance Criteria**:
  - [ ] 1 test written inside a new `describe('Filter summary')` block appended to the existing file
  - [ ] Test passes with `--headed`
  - [ ] No regressions in existing 12 tests in this file
- **Dependencies**: None
- **Estimated Effort**: S (1 test, simple assertion)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/insurance-group-filter.cy.ts --headed`
- **Gap traceability**: GAP-8.4

---

### Task T2-1: MEDIUM Priority -- API Failure Fallback (compact-filter-bar.spec.ts)

- **Priority**: MEDIUM
- **Framework**: Playwright
- **Target File**: `frontend/e2e/compact-filter-bar.spec.ts` (extend)
- **Tests to Write**: 1
- **Description**: Add E2E verification that the insurance group dropdown falls back to hardcoded options ("All", "Hill", "No Insurance") when the `/api/import/systems` API call fails. Currently only tested at the Vitest level.
- **Test list**:
  1. **`insurance dropdown falls back to hardcoded options on API failure`** (GAP-3.3, AC-M7-3.10) -- Use `page.route()` to intercept `**/api/import/systems` and return a 500 error response. Navigate to the main page. Wait for grid to load. Locate the insurance group dropdown by `aria-label="Filter by insurance group"`. Verify it contains at least 3 options: "All", "Hill", and "No Insurance". Verify it does NOT contain any system names that would come from the API (e.g., "Sutter" should not appear if it was only returned by the API).
- **Acceptance Criteria**:
  - [ ] 1 test written inside a new `test.describe('API failure fallback')` block appended to the existing file
  - [ ] Test passes with `npx playwright test`
  - [ ] No regressions in existing 5 tests in this file
- **Dependencies**: None
- **Estimated Effort**: S (1 test, route interception is straightforward in Playwright)
- **Run command**: `cd frontend && npx playwright test e2e/compact-filter-bar.spec.ts`
- **Gap traceability**: GAP-3.3

---

### Task T3-1: LOW Priority -- Accessibility & Viewport Tests (filter-accessibility.spec.ts, new)

- **Priority**: LOW
- **Framework**: Playwright
- **Target File**: `frontend/e2e/filter-accessibility.spec.ts` (new file)
- **Tests to Write**: 5
- **Description**: Create a new Playwright test file for keyboard accessibility and responsive viewport tests. These cover the remaining LOW priority gaps: Tab order, keyboard-only chip toggle, keyboard-only dropdown operation, and viewport overflow checks.
- **Test list**:
  1. **`all chips and controls accessible without overflow at 1280px viewport`** (GAP-9.2, AC-M7-9.5) -- Set viewport to 1280x720. Navigate to the main page. Wait for grid load. Locate the filter bar container. Verify all 10 chip buttons are visible (not clipped or hidden). Verify the measure dropdown, insurance dropdown, and search input are all visible. Check that the filter bar's `scrollWidth` does not exceed its `clientWidth` (no horizontal overflow).
  2. **`filter bar elements accessible at 1024px narrow viewport`** (GAP-9.1, AC-M7-9.5) -- Set viewport to 1024x768. Navigate to the main page. Wait for grid load. Verify all 10 chip buttons, both dropdowns, and the search input are visible and interactable (can click a chip and it toggles). This tests wrapping/responsive behavior at a narrower viewport.
  3. **`Tab order moves through chips, measure dropdown, insurance dropdown, search input`** (GAP-10.1, AC-M7-10.1) -- Navigate to the main page. Wait for grid load. Press Tab repeatedly. Track which elements receive focus. Verify focus moves through the chip buttons in order (All, Duplicates, Not Addressed, ..., N/A), then to the measure dropdown, then to the insurance dropdown, then to the search input. Use `page.evaluate(() => document.activeElement?.getAttribute('aria-label') || document.activeElement?.textContent)` to identify the focused element.
  4. **`Enter and Space keys toggle chip selected state`** (GAP-10.3, AC-M7-1.15, AC-M7-10.2) -- Tab to the first non-All chip (e.g., "Not Addressed"). Press Enter. Verify the chip's `aria-pressed` attribute changes to "true". Press Enter again. Verify `aria-pressed` changes to "false" (and "All" becomes active as fallback). Tab to another chip. Press Space. Verify `aria-pressed` toggles.
  5. **`keyboard-only measure dropdown operation`** (GAP-10.2, AC-M7-10.3, AC-M7-10.4) -- Tab to the measure dropdown (identified by `aria-label="Filter by quality measure"`). Verify it has focus. Use keyboard to open the dropdown and select an option (native `<select>` elements respond to arrow keys to change value). Verify the selected value changes and the grid updates accordingly (row count changes or chip counts update).
- **Acceptance Criteria**:
  - [ ] New file `frontend/e2e/filter-accessibility.spec.ts` created following existing Playwright patterns
  - [ ] All 5 tests pass with `npx playwright test`
  - [ ] Tests use proper page object or helper patterns consistent with existing `e2e/` files
- **Dependencies**: None
- **Estimated Effort**: L (5 tests in a new file, keyboard focus tracking can be tricky)
- **Run command**: `cd frontend && npx playwright test e2e/filter-accessibility.spec.ts`
- **Gap traceability**: GAP-9.1, GAP-9.2, GAP-10.1, GAP-10.2, GAP-10.3

---

## Task T-FINAL: Regression Verification

- **Priority**: HIGH (run after all other tasks)
- **Framework**: All
- **Target Files**: All files modified or created in T1-1 through T3-1
- **Tests to Write**: 0 (verification only)
- **Description**: Run the full Module 7 test suite to verify no regressions were introduced by the new tests. This includes all Vitest, Cypress, and Playwright files in scope.
- **Verification steps**:
  1. Run Vitest component tests (no changes expected, but verify no side effects):
     ```bash
     cd frontend && npx vitest run src/components/layout/StatusFilterBar.test.tsx src/components/layout/StatusBar.test.tsx src/pages/MainPage.test.tsx
     ```
  2. Run all Cypress filter-related tests:
     ```bash
     cd frontend && npx cypress run --spec "cypress/e2e/multi-select-filter.cy.ts,cypress/e2e/patient-name-search.cy.ts,cypress/e2e/insurance-group-filter.cy.ts,cypress/e2e/compact-filter-bar.cy.ts,cypress/e2e/sorting-filtering.cy.ts,cypress/e2e/filter-roles-combined.cy.ts" --headed
     ```
  3. Run all Playwright filter-related tests:
     ```bash
     cd frontend && npx playwright test e2e/compact-filter-bar.spec.ts e2e/filter-accessibility.spec.ts
     ```
- **Acceptance Criteria**:
  - [ ] All ~266 existing Vitest tests in scope pass (181 + 18 + 67)
  - [ ] All ~131 existing Cypress tests in scope pass (18 + 14 + 12 + 3 + 56 + 24 + 4 new = ~131 + 15 new = ~146)
  - [ ] All ~11 Playwright tests pass (5 existing + 1 new + 5 new = 11)
  - [ ] Total Module 7 test count reaches ~419 (398 existing + 21 new)
  - [ ] No flaky tests (run twice if needed)
- **Dependencies**: All tasks T1-1 through T3-1 completed
- **Estimated Effort**: M (running and verifying, no writing)

---

## Execution Order

| Order | Task | Priority | Framework | New Tests | Target File |
|-------|------|----------|-----------|-----------|-------------|
| 1 | T1-1 | HIGH | Cypress | 5 | `filter-roles-combined.cy.ts` |
| 2 | T1-2 | MEDIUM | Cypress | 3 | `patient-name-search.cy.ts` |
| 3 | T1-3 | MEDIUM | Cypress | 1 | `multi-select-filter.cy.ts` |
| 4 | T1-4 | MEDIUM | Cypress | 2 | `compact-filter-bar.cy.ts` |
| 5 | T1-5 | MEDIUM | Cypress | 3 | `sorting-filtering.cy.ts` |
| 6 | T1-6 | MEDIUM | Cypress | 1 | `insurance-group-filter.cy.ts` |
| 7 | T2-1 | MEDIUM | Playwright | 1 | `compact-filter-bar.spec.ts` |
| 8 | T3-1 | LOW | Playwright | 5 | `filter-accessibility.spec.ts` (new) |
| 9 | T-FINAL | HIGH | All | 0 | All files (regression verification) |

## Summary

| Metric | Value |
|--------|-------|
| Total new tests | 21 |
| HIGH priority tests | 4 (in T1-1, tests 1-4) |
| MEDIUM priority tests | 12 (in T1-1 test 5, T1-2, T1-3, T1-4, T1-5, T1-6, T2-1) |
| LOW priority tests | 5 (in T3-1) |
| Files extended | 7 |
| Files created | 1 (`filter-accessibility.spec.ts`) |
| Gaps addressed | 21 OPEN gaps |
| Expected post-implementation total | ~419 tests in Module 7 scope |

### Gap-to-Task Traceability

| Gap ID | Priority | Task | Test # |
|--------|----------|------|--------|
| GAP-2.2 | HIGH | T1-1 | 1 |
| GAP-7.5 | HIGH | T1-1 | 2 |
| GAP-6.4 | HIGH | T1-1 | 3 |
| GAP-8.6 | HIGH | T1-1 | 4 |
| GAP-7.2 | MEDIUM | T1-1 | 5 |
| GAP-4.1 | MEDIUM | T1-2 | 1 |
| GAP-4.3 | MEDIUM | T1-2 | 2 |
| GAP-4.4 | MEDIUM | T1-2 | 3 |
| GAP-1.1 | MEDIUM | T1-3 | 1 |
| GAP-5.3 | MEDIUM | T1-4 | 1 |
| GAP-2.4 | MEDIUM | T1-4 | 2 |
| GAP-7.3 | MEDIUM | T1-5 | 1 |
| GAP-7.4 | MEDIUM | T1-5 | 2 |
| GAP-7.6 | MEDIUM | T1-5 | 3 |
| GAP-8.4 | MEDIUM | T1-6 | 1 |
| GAP-3.3 | MEDIUM | T2-1 | 1 |
| GAP-9.2 | LOW | T3-1 | 1 |
| GAP-9.1 | LOW | T3-1 | 2 |
| GAP-10.1 | LOW | T3-1 | 3 |
| GAP-10.3 | LOW | T3-1 | 4 |
| GAP-10.2 | LOW | T3-1 | 5 |
