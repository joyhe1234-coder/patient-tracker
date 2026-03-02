# Test Gap Analysis: Requirement Area 4 -- Sorting Behavior

**Date:** 2026-03-02
**Spec:** `.claude/specs/sorting/requirements.md`
**Source Files:**
- `frontend/src/components/grid/PatientGrid.tsx` (sort config, postSortRows, deltaSort, defaultColDef)
- `frontend/src/components/grid/hooks/useGridCellUpdate.ts` (sort suppression on edit, frozenRowOrder)
- `frontend/src/pages/MainPage.tsx` (sort state management via row data, filter interactions)

**Test Files:**
- `frontend/src/components/grid/PatientGrid.test.tsx` (Vitest -- 65 tests total, ~6 sorting-related)
- `frontend/src/components/grid/hooks/__tests__/useGridCellUpdate.test.ts` (Vitest -- 17 tests, 0 sort-specific)
- `frontend/cypress/e2e/sorting-filtering.cy.ts` (Cypress -- 22 sorting tests)
- `frontend/src/pages/MainPage.test.tsx` (Vitest -- 60 tests, 0 sort-specific)
- `frontend/e2e/*.spec.ts` (Playwright -- 0 sorting tests)

---

## Summary

The sorting requirement area has **22 Cypress E2E tests** and **~6 Vitest unit tests** covering grid configuration properties related to sorting. Total sorting-specific test coverage is approximately **28 tests across 2 frameworks**.

**Coverage highlights:**
- Three-click sort cycle (asc/desc/clear): COVERED (Cypress)
- Sort indicator behavior: COVERED (Cypress)
- Date chronological sort: COVERED (Cypress, with empty-value edge case)
- Numeric sort: COVERED (Cypress, conditional on viewport visibility)
- Post-edit sort suppression (row stays in place): COVERED (Cypress, 3 tests added for TC-3.2--3.4)
- Sort indicator cleared on edit: NOT COVERED (no automated test verifies the arrow disappears after edit)
- Sort + filter interaction: COVERED (Cypress, 3 tests)

**Critical gaps:**
1. Sort indicator cleared on edit (AC-4) -- no test verifies the arrow disappears after a cell edit
2. Sort suppression logic in `useGridCellUpdate` hook -- zero unit tests for sort freeze / frozenRowOrder logic
3. `postSortRows` callback -- zero unit tests for the frozen order maintenance algorithm
4. Custom date/due date comparator -- zero unit tests (only tested via Cypress sort order)
5. Multi-column sort (shift-click) -- zero tests in any framework
6. Sort persistence across provider/insurance group switch -- zero tests
7. N/A values in tracking columns during sort -- zero tests
8. Sort after add/delete row -- zero tests
9. Sort performance with large datasets -- zero tests

---

## Use Cases & Per-Framework Coverage

### UC-1: Click column header to sort ascending

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | No backend sorting logic |
| **Vitest** | Partial | `PatientGrid.test.tsx`: verifies `defaultColDef.sortable = true` |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "Status Date sorting - ascending", "Member Name ascending", "Request Type", "Quality Measure", "Measure Status", "Time Interval" |

### UC-2: Click column header again for descending sort

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "Status Date descending", "Due Date descending", "Member Name descending" |

### UC-3: Third click clears sort (returns to original order)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should clear sort on third click" (verifies `ag-sort-none-icon` appears) |

### UC-4: Sort indicator (arrow) appears in column header

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: multiple tests check `.ag-sort-ascending-icon` and `.ag-sort-descending-icon` visibility |

### UC-5: Sort indicator disappears on clear

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should clear sort on third click" -- checks `ag-sort-none-icon` |

### UC-6: Sort by text columns (Member Name, Quality Measure, Measure Status, Request Type)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "Member Name sorting" (3 tests), "Request Type sorting" (1 test), "Quality Measure sorting" (1 test), "Measure Status sorting" (1 test). Also verifies alphabetical order for Member Name. |

### UC-7: Sort by date columns (Status Date, Due Date) -- chronological not alphabetical

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | Custom comparator on `statusDate` and `dueDate` columns not unit-tested |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should sort dates chronologically not alphabetically" -- collects dates from rows and verifies `Date` object ordering |

### UC-8: Sort by numeric column (Time Interval Days) -- numeric not alphabetical

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `sorting-filtering.cy.ts`: "should sort Time Interval column numerically" -- conditional test that skips if column not in viewport. Does NOT verify numeric order (1, 2, 10, 20 vs 1, 10, 2, 20). |

### UC-9: Editing a value does NOT reposition the row (AC-3 -- post-edit sort suppression)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | `useGridCellUpdate.test.ts` does NOT test the sort freeze logic (frozenRowOrderRef, getColumnState, applyColumnState). `PatientGrid.test.tsx` verifies `postSortRows` prop exists but does not test the callback logic. |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "TC-3.2: row should stay in place after edit while sorted" -- sorts by Quality Measure, edits requestType on row 0, verifies memberName stays the same. "TC-3.3: row should preserve position after edit clears sort" -- sorts by Member Name, edits requestType on row 0, verifies name persists. |

### UC-10: Sort indicator cleared after cell edit to sorted column (AC-4)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | **No** | The TC-3.2/3.3 tests verify row position but do NOT assert that the sort arrow disappears from the header after the edit. This is a **GAP**. |

### UC-11: Row selection preserved during edits (AC-5)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | The TC-3.2/3.3 tests do not assert row selection (blue outline) is preserved after edit. |

### UC-12: Multi-cell edits maintain row position (AC-6)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "TC-3.4: multi-cell edits should not re-sort rows" -- sorts by Measure Status, edits row 1 requestType twice, verifies memberName stays same after each edit. |

### UC-13: Multi-column sort (shift-click)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test uses `{shiftKey: true}` click to test multi-column sort behavior. |

**Implementation note:** AG Grid's `defaultColDef` has `sortable: true` which enables multi-column sort with shift-click by default. However, no tests verify this behavior.

### UC-14: Sort with filtered data (sort + status color filter)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should maintain filter when sorting" (filter Completed, sort by Member Name, verify count stable), "should maintain sort when changing filter" (sort first, then filter, verify sort icon persists), "sort order is preserved when applying a filter" (sorts, filters, removes filter, verifies first row still same) |

### UC-15: Sort with empty cells (nulls first/last)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | Custom comparator unit test not written (comparator returns 1 for null dateA, -1 for null dateB) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should handle empty Status Date values in sorting" (verifies all empty values sort to end in ascending), "should handle empty Due Date values in sorting" (same for Due Date) |

### UC-16: Sort persistence across provider switch

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test switches physician/provider while a sort is active to see if sort persists or resets. |

**Implementation note:** When `selectedPhysicianId` changes, `MainPage` triggers a full `loadData()` which replaces `rowData`. AG Grid's sort state is maintained on the grid instance, so the sort indicator and order should persist across data refreshes. However, this is untested.

### UC-17: Sort persistence across insurance group switch

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | Same situation as UC-16. Insurance group change triggers `loadData()` but sort state is on the grid instance. Untested. |

### UC-18: Default sort order on page load

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test verifies the initial row order when the page first loads (insertion order / rowOrder from database). |

**Implementation note:** There is no explicit default sort configured. Rows display in the order returned by the API (database `rowOrder`). No test confirms this.

### UC-19: Sort after adding a new row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test adds a row while a sort is active and verifies the new row appears without re-sorting (per BR-2, adding rows should not trigger re-sort). |

**Implementation note:** `PatientGrid.tsx` line 296 clears sort when a new row is added (`api.applyColumnState({ defaultState: { sort: null } })`). This behavior is untested.

### UC-20: Sort after deleting a row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test deletes a row while a sort is active and verifies remaining rows maintain their sort order. Per BR-2, deletion should not trigger re-sort. |

### UC-21: Sort with N/A values in tracking columns

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | Tracking #1 and #2 display "N/A" when not applicable. No test verifies how "N/A" values sort relative to actual values or empty cells. |

### UC-22: Sort indicator only on one column at a time (single-column sort)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `sorting-filtering.cy.ts`: "should only show one sort indicator at a time" -- sorts Member Name, then sorts Status Date, verifies only Status Date shows sort icon |

### UC-23: Sort performance with 11,000+ rows

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No performance test for sorting large datasets. This is an AG Grid built-in concern but untested. |

### UC-24: `postSortRows` callback maintains frozen row order

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | `PatientGrid.test.tsx` only verifies `capturedGridProps.postSortRows` is defined. Does NOT test the callback's sorting logic (orderMap, `params.nodes.sort()`). |
| **Playwright** | No | -- |
| **Cypress** | Implicit | The TC-3.2--3.4 tests indirectly verify this works (row stays in place after edit), but the callback itself is not unit-tested. |

### UC-25: `deltaSort: false` configuration

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `PatientGrid.test.tsx`: "disables deltaSort" -- `expect(capturedGridProps.deltaSort).toBe(false)` |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-26: `useGridCellUpdate` sort freeze logic (frozenRowOrderRef + applyColumnState)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | `useGridCellUpdate.test.ts` has 17 tests covering save, conflict, and error handling, but ZERO tests for the sort freeze block (lines 103-121 of `useGridCellUpdate.ts`). The mock `getColumnState` returns `[]` (empty array), so the `editedColumnState?.sort` branch is never entered. |
| **Playwright** | No | -- |
| **Cypress** | Implicit | TC-3.2--3.4 indirectly exercise this path in the real browser. |

### UC-27: Custom date comparator for Status Date column

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | The comparator function on the `statusDate` column definition (PatientGrid.tsx lines 685-694) is not unit tested. It compares ISO strings via `localeCompare`, handles null/empty with sort-to-end logic. |
| **Playwright** | No | -- |
| **Cypress** | Implicit | "should sort dates chronologically" test exercises this comparator. |

### UC-28: Custom date comparator for Due Date column

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | The comparator on `dueDate` column (PatientGrid.tsx lines 862-869) is not unit tested. Same logic as Status Date comparator. |
| **Playwright** | No | -- |
| **Cypress** | Implicit | "should handle empty Due Date values in sorting" test exercises this. |

### UC-29: New row clears sort (PatientGrid.tsx line 296)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | No test verifies that adding a new row clears the active sort indicator. |

---

## Gap Summary

### HIGH PRIORITY GAPS (Core sorting logic with no automated verification)

| # | Gap | Req | Risk | Effort |
|---|-----|-----|------|--------|
| G1 | Sort indicator cleared on edit (AC-4) -- Cypress tests verify row position but NOT that the sort arrow disappears from the header | AC-4 | Medium -- visual regression risk | 1 hour -- add `.should('not.be.visible')` assertion to existing TC-3.2/3.3 tests |
| G2 | `useGridCellUpdate` sort freeze logic -- zero unit tests for `frozenRowOrderRef`, `getColumnState`, `applyColumnState` branch | AC-3, AC-4 | Medium -- refactoring could break sort suppression with no unit test to catch it | 2-3 hours -- mock `getColumnState` to return sorted column, verify `applyColumnState` called and `frozenRowOrderRef` set |
| G3 | `postSortRows` callback logic -- zero unit tests for the frozen order sort algorithm | AC-3 | Medium -- algorithm correctness untested | 1-2 hours -- extract and test the sort function with mock `PostSortRowsParams` |

### MEDIUM PRIORITY GAPS (Edge cases and interactions)

| # | Gap | Req | Risk | Effort |
|---|-----|-----|------|--------|
| G4 | Row selection preserved during edits (AC-5) -- no assertion that selected row stays selected after sort-clearing edit | AC-5 | Low -- `node.setSelected(true)` is called in code, but no visual verification | 30 min -- add `.should('have.class', 'ag-row-selected')` to TC-3.2 |
| G5 | Custom date comparators not unit-tested -- `statusDate` and `dueDate` comparator functions | AC-7 | Low -- logic is simple `localeCompare` on ISO strings | 1 hour -- extract comparators, test with null/empty/valid date combinations |
| G6 | Multi-column sort (shift-click) -- zero tests | N/A | Low -- AG Grid built-in feature | 1-2 hours -- Cypress test with `{shiftKey: true}` |
| G7 | Sort persistence across provider/insurance group switch | BR-3 | Low -- framework handles this, but untested | 2 hours -- Cypress test: sort, switch physician, verify sort icon persists |
| G8 | New row clears sort (line 296) -- untested | EC-4 | Low -- known behavior, may surprise users | 1 hour -- Cypress test: sort active, add row, verify sort indicator cleared |
| G9 | Numeric sort order verification -- Time Interval test skips if column not in viewport and does NOT verify numeric ordering | AC-8 | Medium -- test provides false confidence | 1 hour -- scroll to column, verify 1,2,10,20 not 1,10,2,20 |

### LOW PRIORITY GAPS (Nice-to-have coverage)

| # | Gap | Req | Risk | Effort |
|---|-----|-----|------|--------|
| G10 | Sort after deleting a row | BR-2 | Very low | 1 hour |
| G11 | Sort with N/A values in tracking columns | EC-5 | Very low -- text sort handles this naturally | 1 hour |
| G12 | Default sort order on page load | N/A | Very low -- no default sort configured | 30 min |
| G13 | Sort performance with 11,000+ rows | NFR | Low -- AG Grid handles this | 2-3 hours for perf test setup |
| G14 | Multi-cell edit sort indicator only cleared once (first edit) | AC-6 | Very low -- TC-3.4 implicitly covers row position; just missing explicit indicator check | 30 min -- add assertion to TC-3.4 |

---

## Coverage Statistics

| Framework | Sorting Tests | Notes |
|-----------|--------------|-------|
| **Vitest (PatientGrid.test.tsx)** | 6 | `defaultColDef.sortable`, `deltaSort=false`, `postSortRows` exists, `animateRows`, `singleClickEdit=false`, column header names |
| **Vitest (useGridCellUpdate.test.ts)** | 0 | No tests for sort freeze logic despite it being in this hook |
| **Vitest (MainPage.test.tsx)** | 0 | No sort state management tests |
| **Cypress (sorting-filtering.cy.ts)** | 22 | 4 Status Date, 3 Due Date, 3 Member Name, 1 Request Type, 1 Quality Measure, 1 Measure Status, 1 Time Interval, 2 Sort Indicator, 3 TC-3.2/3.3/3.4 post-edit, 3 sort+filter |
| **Playwright** | 0 | No sorting tests in any Playwright spec |
| **TOTAL** | 28 | |

### Requirements Coverage

| Requirement | Automated? | Framework | Notes |
|-------------|------------|-----------|-------|
| AC-1: Three-click sort cycle | Yes | Cypress | Full cycle tested |
| AC-2: Sort indicator arrow | Yes | Cypress | Ascending + descending checked |
| AC-3: No re-sort during edit | Yes | Cypress | TC-3.2, TC-3.3 verify row position preserved |
| AC-4: Sort indicator cleared on edit | **No** | -- | **GAP** -- arrow removal not asserted |
| AC-5: Row selection preserved | **No** | -- | **GAP** -- selection not checked after edit |
| AC-6: Multi-cell edit no re-sort | Yes | Cypress | TC-3.4 verifies row stays in place |
| AC-7: Date chronological sort | Yes | Cypress | Ascending order verified with Date comparison |
| AC-8: Numeric sort | Partial | Cypress | Conditional test, no order verification |
| BR-1: Post-edit sort suppression | Yes | Cypress | TC-3.2--3.4 |
| BR-2: Sort only on header click | Partial | Cypress | Edit does not re-sort (tested), add/delete not tested |
| BR-3: Sort persists across filters | Yes | Cypress | 3 tests verify sort + filter interaction |
| EC-1: Empty cells in sorted column | Yes | Cypress | Status Date and Due Date empty handling tested |
| EC-2: Editing multiple cells rapidly | Yes | Cypress | TC-3.4 |
| EC-3: Sort during active filter | Yes | Cypress | Combined sort + filter tests |
| EC-4: Sort after adding row | **No** | -- | **GAP** |
| EC-5: Sort with mixed data types | Implicit | Cypress | Text columns all use default string comparison |

---

## Recommendations

### Immediate (before next commit touching sorting)

1. **G1: Add sort indicator assertion to TC-3.2/3.3** -- In `sorting-filtering.cy.ts`, after the edit that preserves row position, add:
   ```typescript
   // Verify sort indicator is cleared after edit
   cy.get('.ag-header-cell[col-id="qualityMeasure"]')
     .find('.ag-sort-ascending-icon')
     .should('not.be.visible');
   ```
   This covers AC-4 with minimal effort (~30 min).

2. **G9: Fix Time Interval numeric sort test** -- The current test conditionally skips and never verifies numeric order. Scroll the grid viewport to show the Time Interval column, sort, and verify 1 < 2 < 10 < 20 ordering.

### Short-term (within next sprint)

3. **G2: Unit test sort freeze in `useGridCellUpdate`** -- Mock `getColumnState` to return `[{ colId: 'notes', sort: 'asc' }]` and verify:
   - `forEachNodeAfterFilterAndSort` is called to capture row IDs
   - `frozenRowOrderRef.current` is set with correct order
   - `applyColumnState` is called with `{ state: [{ colId: 'notes', sort: null }] }`

4. **G3: Unit test `postSortRows` callback** -- Test the sorting algorithm in isolation:
   ```typescript
   const postSortRows = capturedGridProps.postSortRows;
   // Set frozenRowOrderRef to [3, 1, 2]
   // Call postSortRows with nodes in [1, 2, 3] order
   // Verify nodes are reordered to [3, 1, 2]
   // Verify frozenRowOrderRef is cleared to null
   ```

5. **G5: Unit test date comparators** -- Extract or test inline:
   - `comparator(null, null)` returns 0
   - `comparator(null, '2025-01-01')` returns 1 (null sorts to end)
   - `comparator('2025-01-01', null)` returns -1
   - `comparator('2024-12-25', '2025-01-05')` returns negative (earlier < later)

### Long-term (nice-to-have)

6. **G6: Multi-column sort test** -- Shift-click two columns, verify combined sort order
7. **G7: Sort persistence across provider switch** -- Sort, switch physician, verify sort icon remains
8. **G8: New row clears sort** -- Activate sort, add row, verify sort indicator cleared
9. **G10-G14: Low priority edge cases** -- Add as capacity allows

### NOT Recommended

- Creating Playwright sorting tests -- Cypress already covers the critical E2E paths well; adding Playwright would be duplication
- Performance testing for sorting -- AG Grid's built-in virtual scrolling handles this; not a custom code concern
- Automating every sort indicator state transition -- diminishing returns for visual indicator tests
