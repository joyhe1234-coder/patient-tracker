# Test Gap Analysis: Requirement Area 11 -- Status Bar

**Date:** 2026-03-02
**Spec:** `.claude/specs/status-bar/requirements.md`
**Source Files:**
- `frontend/src/components/layout/StatusBar.tsx` (row count display, connection status, presence indicator, filter summary)

**Test Files:**
- `frontend/src/components/layout/StatusBar.test.tsx` (Vitest -- 18 tests)
- `frontend/cypress/e2e/ux-improvements.cy.ts` (Cypress -- 3 status bar tests)
- `frontend/cypress/e2e/sorting-filtering.cy.ts` (Cypress -- 2 status bar tests)
- `frontend/cypress/e2e/multi-select-filter.cy.ts` (Cypress -- 2 status bar tests)
- `frontend/cypress/e2e/patient-name-search.cy.ts` (Cypress -- 1 status bar test)
- `frontend/cypress/e2e/insurance-group-filter.cy.ts` (Cypress -- 1 status bar test)
- `frontend/cypress/e2e/parallel-editing-row-operations.cy.ts` (Cypress -- 2 count update tests)
- `frontend/e2e/smoke.spec.ts` (Playwright -- 0 status bar tests, despite regression plan claiming one)

**Regression Plan:** Section TC-10.1, TC-10.2

---

## Summary

The status bar has **29 tests across 2 frameworks** (18 Vitest component tests, 11 Cypress E2E tests). The Vitest tests provide excellent component-level coverage of the StatusBar component, including all connection states, presence indicator behavior, and row count formatting. The Cypress tests provide good E2E validation that the status bar displays correctly with real data.

**Coverage highlights:**
- "Showing X of Y rows" format: WELL COVERED (Vitest + Cypress)
- Locale number formatting (commas for large numbers): COVERED (Vitest)
- Count updates after filter: COVERED (Cypress, multiple test files)
- Connected/Disconnected/Reconnecting/Offline indicator: WELL COVERED (Vitest, all 5 states)
- Presence indicator (N others online): COVERED (Vitest)
- Tooltip with user names on hover: COVERED (Vitest)
- Filter summary display: COVERED (Vitest)
- Insurance filter label display: COVERED (Cypress)
- Zero rows: COVERED (Vitest)

**Critical gaps:**
1. Count updates after add/delete -- no test verifies status bar TEXT changes (grid DOM row count is tested, not status bar)
2. Playwright has zero status bar tests (regression plan incorrectly claims `smoke.spec.ts` tests status bar)
3. No E2E test for Disconnected/Reconnecting states (only unit tested)
4. No E2E test for presence indicator (only unit tested)
5. "Showing 0 of X rows" when all rows filtered out -- only unit tested, no E2E

---

## Use Cases & Per-Framework Coverage

### UC-1: Shows "Showing X of Y rows" where X is displayed/filtered count and Y is total (AC-1, AC-3, AC-4)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | No backend status bar logic |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows Showing X of Y rows when filtered" (rowCount=25, totalRowCount=100), "shows Showing X of X rows when not filtered" |
| **Playwright** | No | `smoke.spec.ts` does NOT test status bar despite regression plan claim |
| **Cypress** | Yes | `ux-improvements.cy.ts`: "should always show Showing X of Y rows format", "should show filtered count when filter is active" |

### UC-2: Locale number formatting (commas for thousands)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "formats large numbers with locale separators" (1,500 of 10,000) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**Note:** Unit test coverage is sufficient here since `.toLocaleString()` is a standard API. No E2E gap.**

### UC-3: Count updates after filter applied

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: via prop-based rendering (25 of 100, 0 of 100) |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should update status bar count when filtering", "should show filtered count in status bar"; `multi-select-filter.cy.ts`: "should show correct count for multi-filter selection"; `patient-name-search.cy.ts`: "should update row count when search is active" |
| **Playwright** | No | -- |

### UC-4: Count updates after filter cleared -- returns to total (AC-5)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Partial | Tests show both filtered and unfiltered states but no single test transitions from filtered to unfiltered |
| **Playwright** | No | -- |
| **Cypress** | Partial | `ux-improvements.cy.ts`: "should show filtered count when filter is active" (tests filter applied, not filter cleared) |

**GAP: No test explicitly applies a filter, verifies "Showing X of Y", then clears the filter and verifies it returns to "Showing Y of Y". Priority: LOW (implicit in filter toggle tests).**

### UC-5: Count updates after add row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | StatusBar tests are pure component tests with fixed props |
| **Playwright** | No | -- |
| **Cypress** | Partial | `parallel-editing-row-operations.cy.ts`: "should update row count after Add Row" -- verifies `.ag-row` DOM count, NOT status bar text |

**GAP: No test reads the status bar text before add, performs add, then reads status bar text after. Priority: LOW.**

### UC-6: Count updates after delete row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `parallel-editing-row-operations.cy.ts`: "should update row count after Delete Row" -- verifies DOM row count, NOT status bar text |

**GAP: Same as UC-5 but for delete. Priority: LOW.**

### UC-7: "Connected" indicator in green when backend is reachable (AC-2)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows green Connected when status is connected" (verifies text + `bg-green-500` dot class + `text-green-700` label) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `ux-improvements.cy.ts`: "should show Connected status indicator" |

### UC-8: "Disconnected" indicator in red

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows red Disconnected when status is disconnected" (verifies text + `bg-red-500` dot + `text-red-700` label) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: No E2E test for disconnected state. Priority: LOW (would require simulating network failure or socket disconnect, which is complex in E2E).**

### UC-9: "Reconnecting..." indicator in yellow

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows yellow Reconnecting... when status is reconnecting" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: No E2E test. Same priority/reasoning as UC-8.**

### UC-10: "Offline mode" indicator in gray

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows gray Offline mode when status is offline" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-11: No indicator when status is "connecting" (transitional state)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows no indicator when status is connecting" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-12: Insurance filter label display in status bar

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows filter summary when provided" (e.g., "Color: In Progress | Measure: Diabetic Eye Exam"), "shows combined summary with pipe separator" |
| **Playwright** | No | -- |
| **Cypress** | Yes | `insurance-group-filter.cy.ts`: "status bar displays insurance filter text when active" |

### UC-13: Filter summary not shown when no filter active

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "does not show filter summary when undefined" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-14: Status bar with zero rows

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows zero rows correctly" (0 of 100) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**No E2E gap -- zero rows is an edge case well covered by unit test.**

### UC-15: Presence indicator shows "N others online"

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows presence indicator when roomUsers has entries" (1 other), "pluralizes others for multiple users" (2 others) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-16: Presence indicator hidden when no other users

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "hides presence indicator when roomUsers is empty" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-17: Presence tooltip shows user names on hover

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows tooltip with user names on hover", "hides tooltip on mouse leave" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-18: Pinned row indicator "(new row pinned)" in status bar

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | StatusBar.test.tsx does not test the `pinnedRowId` prop rendering |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: The StatusBar component accepts a `pinnedRowId` prop and renders "(new row pinned)" text with `data-testid="status-bar-pinned"`, but no test verifies this behavior. Priority: LOW (visual indicator only).**

### UC-19: "Showing X of Y rows" consistent format (always shows X of Y, even when unfiltered)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `StatusBar.test.tsx`: "shows Showing X of X rows when not filtered (consistent format)", "shows Showing X of X rows when totalRowCount is undefined" |
| **Playwright** | No | -- |
| **Cypress** | Yes | `ux-improvements.cy.ts`: "should always show Showing X of Y rows format" |

---

## Gap Summary

| # | Gap | AC | Priority | Recommendation |
|---|-----|----|----------|----------------|
| 1 | Status bar text update after add row | -- | LOW | Add Cypress test: read status bar, add row, verify count incremented in status bar text |
| 2 | Status bar text update after delete row | AC-9 | LOW | Add Cypress test: read status bar, delete row, verify count decremented |
| 3 | Filter clear returns to total count | AC-5 | LOW | Add Cypress test: apply filter, verify Showing X of Y, clear filter, verify Showing Y of Y |
| 4 | Pinned row indicator text | -- | LOW | Add Vitest test: render StatusBar with pinnedRowId, verify "(new row pinned)" visible |
| 5 | E2E test for Disconnected/Reconnecting | AC-2 | LOW | Complex to set up; unit tests provide sufficient coverage |
| 6 | Regression plan says smoke.spec.ts tests status bar | -- | INFO | Regression plan TC-10.1 references `smoke.spec.ts: "should display the status bar"` but that test does NOT exist. Update regression plan. |
| 7 | E2E presence indicator test | -- | LOW | Complex setup requiring multiple concurrent users |

---

## Test Counts by Framework

| Framework | Test Count | Files |
|-----------|-----------|-------|
| Vitest | 18 | StatusBar.test.tsx (18) |
| Playwright | 0 | (smoke.spec.ts has 0 status bar tests) |
| Cypress | 11 | ux-improvements.cy.ts (3), sorting-filtering.cy.ts (2), multi-select-filter.cy.ts (2), patient-name-search.cy.ts (1), insurance-group-filter.cy.ts (1), parallel-editing-row-operations.cy.ts (2) |
| **Total** | **29** | |

---

## Regression Plan Accuracy Issues

1. **TC-10.1 references a non-existent Playwright test**: The regression plan states `smoke.spec.ts: "should display the status bar"` is automated, but `smoke.spec.ts` contains no status bar test. The test only checks for grid visibility, toolbar buttons, filter bar, and row count (via `getRowCount()` which counts AG Grid rows, not status bar text).

2. **TC-11.2 says N/A display is "Manual"** but Cypress `cascading-dropdowns.cy.ts` has 2 automated tests for this (TC-11.2 section). The regression plan needs updating to reflect this.
