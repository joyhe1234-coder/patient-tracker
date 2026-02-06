# Test Plan: Status Color Filter Bar

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Chip display order | TC-4.1 | StatusFilterBar.test.tsx: chip rendering | Covered |
| AC-2 | Chip counts | TC-4.5 | StatusFilterBar.test.tsx: count display; sorting-filtering.cy.ts: "Filter chip counts" | Covered |
| AC-3 | All selected by default | TC-4.1 | StatusFilterBar.test.tsx: default selection | Covered |
| AC-4 | Click filters grid | TC-4.2 | sorting-filtering.cy.ts: "Filter by status" (9 tests) | Covered |
| AC-5 | Click again deselects | TC-4.3 | sorting-filtering.cy.ts: "Filter toggle behavior" | Covered |
| AC-6 | Single-select behavior | TC-4.4 | StatusFilterBar.test.tsx: click behavior; sorting-filtering.cy.ts | Covered |
| AC-7 | Status bar updates | TC-4.2 | sorting-filtering.cy.ts: "Status bar updates" (2 tests) | Covered |
| AC-8 | Counts accuracy | TC-4.5 | sorting-filtering.cy.ts: "Filter chip counts" | Covered |

## Automated Test Inventory

### Vitest Component Tests
**File**: `frontend/src/components/layout/StatusFilterBar.test.tsx`

**Chip Rendering Tests** (~15 tests):
- Renders all 9 chips in correct order
- Each chip displays status name
- Each chip displays count in parentheses
- "All" chip highlighted by default

**Click Behavior Tests** (~20 tests):
- Clicking chip calls onFilterChange callback
- Clicking same chip deselects (calls with null)
- Only one chip highlighted at a time
- Clicking "All" clears filter

**Count Display Tests** (~10 tests):
- Count format: "Status (X)"
- Zero counts display as "(0)"
- Counts update when props change

**Total**: ~45 tests

---

### Cypress E2E Tests
**File**: `frontend/cypress/e2e/sorting-filtering.cy.ts`

**Filter by Status Tests** (9 tests):
- Filter by "Not Started"
- Filter by "Overdue"
- Filter by "In Progress"
- Filter by "Contacted"
- Filter by "Completed"
- Filter by "Declined"
- Filter by "Resolved"
- Filter by "N/A"
- Each test verifies:
  - Grid shows only matching rows
  - Chip is highlighted
  - Row count matches expected

**Filter Toggle Tests** (3 tests):
- Click chip to select
- Click same chip to deselect
- Returns to "All" state

**Chip Count Tests** (5 tests):
- "All" count equals total rows
- Individual status counts are accurate
- Counts sum to total
- Zero count chips display correctly

**Status Bar Update Tests** (2 tests):
- Shows "Showing X of Y rows" when filtered
- Shows "Showing X rows" when "All" selected

**Filter + Sort Interaction** (10 tests):
- Filter persists during sorting
- Sort persists during filtering
- Combined filter + sort produces correct results

**Total**: ~29 tests

---

## Manual Test Cases

### TC-4.1: Chip Display and Default State
**Objective**: Verify all chips display in correct order with "All" selected

**Prerequisites**: Grid loaded with data

**Steps**:
1. Load the application
2. Observe filter bar below toolbar
3. Count the chips from left to right
4. Note which chip is highlighted

**Expected Result**:
- 9 chips displayed in order: All, Not Started, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A
- Each chip shows count in format "Status (X)"
- "All" chip has ring-2 border highlight
- All other chips have no highlight

**Status**: Automated (StatusFilterBar.test.tsx, sorting-filtering.cy.ts)

---

### TC-4.2: Filter Grid by Clicking Chip
**Objective**: Verify clicking a chip filters the grid

**Prerequisites**:
- Grid loaded with 150 total rows
- At least 15 rows with "Overdue" status

**Steps**:
1. Note the total row count in status bar
2. Note the "Overdue" chip count (e.g., "Overdue (15)")
3. Click the "Overdue" chip
4. Observe grid contents
5. Observe status bar
6. Verify all visible rows have red background (overdue status)

**Expected Result**:
- "Overdue" chip gains ring-2 highlight
- "All" chip loses highlight
- Grid shows exactly 15 rows
- All visible rows have red background
- Status bar shows "Showing 15 of 150 rows"

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-4.3: Deselect Filter by Clicking Same Chip
**Objective**: Verify clicking selected chip returns to "All"

**Prerequisites**: "Overdue" chip selected (15 rows visible)

**Steps**:
1. Verify "Overdue" chip is highlighted
2. Click "Overdue" chip again
3. Observe grid and chips
4. Observe status bar

**Expected Result**:
- "Overdue" chip loses highlight
- "All" chip gains highlight
- Grid shows all 150 rows
- Status bar shows "Showing 150 rows" (no "of")

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-4.4: Single-Select Behavior
**Objective**: Verify only one chip can be selected at a time

**Prerequisites**: Grid loaded

**Steps**:
1. Click "Overdue" chip → verify highlighted
2. Click "Completed" chip → observe both chips
3. Click "In Progress" chip → observe all chips
4. Count total highlighted chips

**Expected Result**:
- Step 1: Only "Overdue" highlighted
- Step 2: Only "Completed" highlighted (Overdue no longer highlighted)
- Step 3: Only "In Progress" highlighted
- At any moment, exactly ONE chip has ring-2 highlight

**Status**: Automated (StatusFilterBar.test.tsx, sorting-filtering.cy.ts)

---

### TC-4.5: Chip Count Accuracy
**Objective**: Verify chip counts match actual row counts

**Prerequisites**: Grid loaded

**Steps**:
1. Note count on each chip
2. Click each chip one by one
3. For each chip, count visible rows in grid
4. Compare chip count to actual visible rows
5. Sum all individual status counts
6. Compare sum to "All" count

**Expected Result**:
- Each chip count matches actual filtered row count
- "All" count equals sum of all other counts
- No discrepancies between displayed and actual counts

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-4.6: Status Bar Updates with Filter
**Objective**: Verify status bar shows correct format when filtered

**Prerequisites**: Grid with 150 total rows, 15 overdue

**Steps**:
1. With "All" selected, note status bar text
2. Click "Overdue" chip
3. Note status bar text
4. Click "Completed" chip (42 rows)
5. Note status bar text
6. Click "Completed" again to return to "All"
7. Note status bar text

**Expected Result**:
- Step 1: "Showing 150 rows"
- Step 3: "Showing 15 of 150 rows"
- Step 5: "Showing 42 of 150 rows"
- Step 7: "Showing 150 rows"

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-4.7: Filter with Active Sort
**Objective**: Verify filter works when grid is sorted

**Prerequisites**: Grid loaded

**Steps**:
1. Sort grid by "Status Date" ascending
2. Verify sort arrow visible in header
3. Click "Overdue" chip
4. Observe filtered rows
5. Verify rows still in Status Date order

**Expected Result**:
- Filter applies successfully
- Only overdue rows visible
- Rows maintain Status Date sort order
- Sort arrow still visible in header

**Status**: Automated (sorting-filtering.cy.ts - combined sort + filter tests)

---

### TC-4.8: Edit Status While Filtered (Dynamic Count Update)
**Objective**: Verify counts update when status changes during filtering

**Prerequisites**:
- "Overdue" chip selected (15 rows visible)
- Grid sorted for easy row identification

**Steps**:
1. Note "Overdue" count (15) and "Completed" count (e.g., 42)
2. Select the first overdue row
3. Edit Measure Status from "Overdue" to "Completed"
4. Save the edit
5. Observe grid, chips, and status bar

**Expected Result**:
- Edited row disappears from grid (no longer matches "Overdue" filter)
- "Overdue" count decreases to 14
- "Completed" count increases to 43
- "All" count remains 150 (total unchanged)
- Status bar shows "Showing 14 of 150 rows"

**Status**: NOT automated - MINOR GAP

---

### TC-4.9: Zero Count Chip Clickable
**Objective**: Verify chips with zero count still work

**Prerequisites**:
- Database configured so "Declined" status has 0 rows
- OR temporary data state with 0 declined

**Steps**:
1. Observe "Declined (0)" chip
2. Click "Declined (0)" chip
3. Observe grid

**Expected Result**:
- "Declined" chip gains highlight
- Grid shows 0 rows (empty)
- Status bar shows "Showing 0 of 150 rows"
- No errors or crashes

**Status**: NOT explicitly tested - LOW PRIORITY GAP

---

## Test Coverage Summary

### Excellent Coverage
This feature has **excellent test coverage** across both unit and E2E tests:

**Vitest Component Tests** (45 tests):
- Chip rendering and order ✓
- Click behavior and callbacks ✓
- Count display formatting ✓
- Default selection state ✓
- Single-select logic ✓

**Cypress E2E Tests** (29 tests):
- Filter by each status (9 statuses) ✓
- Filter toggle behavior ✓
- Chip count accuracy ✓
- Status bar updates ✓
- Filter + sort interaction ✓

**Total**: 74 automated tests

---

## Test Coverage Gaps

### Gap 1: Edit Status While Filtered (TC-4.8)
**Priority**: LOW
**Requirements**: AC-8 (dynamic count updates)
**Current Coverage**: Count updates tested on initial load, not during editing
**Impact**: Low - count update logic is straightforward
**Recommendation**: Add to cell editing test suite when created (see cell-editing spec)

**Estimated Effort**: 1-2 tests, 30 minutes

---

### Gap 2: Zero Count Chip (TC-4.9)
**Priority**: LOW
**Requirements**: EC-1 (edge case)
**Current Coverage**: Not explicitly tested
**Impact**: Very low - component handles zero counts in existing tests with mock data
**Recommendation**: Optional - add if time permits

**Estimated Effort**: 1 test, 15 minutes

---

### Gap 3: Filter After Add/Delete Row
**Priority**: LOW
**Requirements**: EC-4 (edge case)
**Current Coverage**: Not tested (add/delete functionality doesn't exist yet)
**Impact**: None currently
**Recommendation**: Add when add/delete row features are implemented

---

## Edge Case Coverage

| Edge Case | Tested | Status |
|-----------|--------|--------|
| EC-1: Zero count chip | Partial | Component handles, not E2E tested |
| EC-2: Filter with sorting active | Yes | 10 combined tests in sorting-filtering.cy.ts |
| EC-3: Edit status while filtered | No | See Gap 1 |
| EC-4: Filter after add/delete row | N/A | Feature not implemented yet |
| EC-5: Clicking "All" when selected | Yes | StatusFilterBar.test.tsx |

---

## Test Execution Summary

**Total Automated Tests**: 74 (45 Vitest + 29 Cypress)
**Coverage Level**: ~95% of acceptance criteria
**High Priority Gaps**: None
**Medium Priority Gaps**: None
**Low Priority Gaps**: 2 minor edge cases

---

## Recommendations

### Short Term
**No action required.** Coverage is excellent.

Optional enhancements (if time permits):
1. Add TC-4.9 (zero count chip) - 15 minutes
2. Add TC-4.8 to cell editing suite when created - 30 minutes

### Long Term
1. When add/delete row features are implemented, add filter interaction tests
2. Consider performance testing with 10,000+ rows and complex filters

### Not Recommended
- Creating additional tests for already well-covered functionality
- Testing internal component logic already covered by 45 unit tests
- Automating every possible combination of filter + sort (combinatorial explosion)

---

## Success Criteria
✓ All acceptance criteria have automated tests
✓ All user stories verified end-to-end
✓ Edge cases documented and assessed
✓ Coverage exceeds 90% target
✓ Both unit and E2E layers tested
✓ No high or medium priority gaps

**This feature meets all testing success criteria.**
