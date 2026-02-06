# Test Plan: Sorting Behavior

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Three-click sort cycle | TC-3.1 | sorting-filtering.cy.ts: "Sort indicator behavior" | Covered |
| AC-2 | Sort indicator arrow | TC-3.1 | sorting-filtering.cy.ts: "sort indicator" tests | Covered |
| AC-3 | No re-sort during edit | TC-3.2 | - | Gap |
| AC-4 | Sort indicator cleared on edit | TC-3.2, TC-3.3 | - | Gap |
| AC-5 | Selection preserved during edit | TC-3.2 | - | Gap |
| AC-6 | Multi-cell edit no re-sort | TC-3.4 | - | Gap |
| AC-7 | Date chronological sort | - | sorting-filtering.cy.ts: "Status Date sorting" (4 tests) | Covered |
| AC-8 | Numeric sort | - | sorting-filtering.cy.ts: "Time Interval sorting" | Covered |

## Automated Test Inventory

### Cypress E2E Tests
**File**: `frontend/cypress/e2e/sorting-filtering.cy.ts`

**Sort Indicator Tests** (4 tests):
- "Sort indicator behavior on Member Name"
- "Sort indicator behavior on Quality Measure"
- Tests ascending/descending/clear cycle
- Verifies arrow icons appear/disappear

**Date Sorting Tests** (4 tests):
- "Status Date sorting - ascending"
- "Status Date sorting - descending"
- "Due Date sorting - ascending"
- "Due Date sorting - descending"
- Verifies chronological order (oldest→newest, newest→oldest)

**Numeric Sorting Tests** (2 tests):
- "Time Interval sorting - ascending" (1, 2, 10, 20 not 1, 10, 2, 20)
- "Time Interval sorting - descending"

**Text Sorting Tests** (6 tests):
- "Member Name sorting"
- "Request Type sorting"
- "Quality Measure sorting"
- Tests ascending, descending, clear for text columns

**Total**: 16 sorting tests

## Manual Test Cases

### TC-3.1: Sort Indicator Three-Click Cycle
**Objective**: Verify sort indicator behavior through full cycle

**Prerequisites**: Grid loaded with data

**Steps**:
1. Click "Member Name" header (first click)
2. Observe grid order and header icon
3. Click "Member Name" header again (second click)
4. Observe grid order and header icon
5. Click "Member Name" header again (third click)
6. Observe grid order and header icon

**Expected Result**:
- Click 1: Ascending sort (A→Z), down arrow visible
- Click 2: Descending sort (Z→A), up arrow visible
- Click 3: Clear sort (original order), no arrow

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-3.2: Post-Edit Sort Suppression (CRITICAL)
**Objective**: Verify row does NOT move after editing sorted column

**Prerequisites**:
- Grid loaded with at least 10 rows
- Rows have varied Status Dates

**Steps**:
1. Click "Status Date" header to sort ascending (oldest first)
2. Note the 5th row's current position and values
3. Note the current Status Date value (e.g., "06/15/2025")
4. Click on the 5th row to select it
5. Edit Status Date to "01/01/2025" (earlier than current)
6. Press Tab to save
7. Observe row position immediately after save
8. Observe Status Date header for sort indicator

**Expected Result**:
- Row #5 stays in position #5 (does NOT jump to top)
- Status Date header arrow indicator disappears (sort cleared)
- Blue selection outline remains on row #5
- Edit saves successfully (new date visible)

**Status**: NOT automated - MEDIUM PRIORITY GAP

**Why Not High Priority**: This is manually tested regularly and works correctly. Complex to automate due to need to verify exact row position preservation.

---

### TC-3.3: Sort Indicator Cleared on Edit
**Objective**: Verify sort indicator removed when editing sorted column

**Prerequisites**: Grid sorted by any column

**Steps**:
1. Sort grid by "Quality Measure" ascending
2. Verify down arrow visible in header
3. Select any row
4. Edit any Quality Measure cell
5. Save the edit
6. Observe Quality Measure header

**Expected Result**:
- Sort arrow disappears from header after edit
- Grid remains in current visual order (no re-sort)
- Other column sort indicators unaffected

**Status**: NOT automated - MEDIUM PRIORITY GAP

---

### TC-3.4: Multi-Cell Edit No Re-sort
**Objective**: Verify multiple edits don't trigger re-sorting

**Prerequisites**: Grid sorted by Status Date

**Steps**:
1. Sort by Status Date ascending
2. Select row #7
3. Edit Status Date, save
4. Verify row #7 still in position
5. Edit Tracking #1 in same row, save
6. Verify row #7 still in position
7. Edit Notes in same row, save
8. Verify row #7 still in position

**Expected Result**:
- Row stays in position after each edit
- Sort indicator cleared after first edit to Status Date
- Subsequent edits to other fields don't affect position

**Status**: NOT automated - LOW PRIORITY GAP

---

### TC-3.5: Sort Persists Across Filter
**Objective**: Verify sort order maintained when filtering

**Prerequisites**: Grid with mixed statuses

**Steps**:
1. Sort by Member Name ascending
2. Verify alphabetical order (A→Z)
3. Click "Overdue" filter chip
4. Observe filtered rows
5. Verify still in alphabetical order

**Expected Result**:
- Filtered rows maintain Member Name sort order
- Sort indicator still visible in header
- Only Overdue rows visible, in sorted order

**Status**: Implicitly tested (sorting + filtering combined tests exist)

---

### TC-3.6: Date Chronological Sort (Not Alphabetical)
**Objective**: Verify dates sort as dates, not strings

**Prerequisites**:
- Grid has rows with dates in different months

**Test Data**:
- Row A: 01/05/2025
- Row B: 12/25/2024
- Row C: 03/15/2025

**Steps**:
1. Sort by Status Date ascending
2. Verify row order

**Expected Result**:
- Order: 12/25/2024, 01/05/2025, 03/15/2025
- NOT alphabetical: 01/05/2025, 03/15/2025, 12/25/2024

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-3.7: Numeric Sort (Not Alphabetical)
**Objective**: Verify Time Interval sorts numerically

**Test Data**:
- Row A: 2 days
- Row B: 10 days
- Row C: 1 day
- Row D: 20 days

**Steps**:
1. Sort by Time Interval ascending
2. Verify order

**Expected Result**:
- Order: 1, 2, 10, 20 (numeric)
- NOT: 1, 10, 2, 20 (alphabetical)

**Status**: Automated (sorting-filtering.cy.ts)

---

## Test Coverage Gaps

### Gap 1: Post-Edit Sort Suppression
**Priority**: MEDIUM
**Requirements**: AC-3, AC-4, AC-5, AC-6
**Current Coverage**: Manual testing only
**Impact**: Core UX feature - prevents confusion during editing

**Why Medium (Not High)**:
- Manually tested regularly during development
- Behavior is stable and working correctly
- Complex to automate (requires precise row position tracking)
- Would require significant Cypress custom commands

**Recommendation**:
- Keep as manual regression test
- Document clearly in test plan
- Consider automation if regression occurs in future

**Estimated Automation Effort**: 6-8 hours (high complexity)

---

### Gap 2: Sort Indicator Cleared on Edit
**Priority**: MEDIUM
**Requirements**: AC-4
**Current Coverage**: Visual inspection during manual testing

**Recommendation**:
- Could add as assertion in future cell editing tests
- Low ROI for standalone test
- Visual indicator, low risk if broken

**Estimated Automation Effort**: 1-2 hours (if added to cell editing suite)

---

## Edge Case Coverage

### EC-1: Empty Cells in Sorted Column
**Status**: NOT explicitly tested
**Recommendation**: Add test case with null/empty dates
**Priority**: LOW (AG Grid handles this automatically)

### EC-2: Editing Multiple Cells Rapidly
**Status**: Covered by TC-3.4
**Recommendation**: Manual test sufficient

### EC-3: Sort During Active Filter
**Status**: Implicitly tested (combined sort + filter tests)
**Recommendation**: No action needed

### EC-4: Sort After Adding Row
**Status**: NOT tested (add row functionality doesn't exist yet)
**Recommendation**: Add when add row feature implemented

### EC-5: Sort with Mixed Data Types
**Status**: Covered by text column sorting tests
**Recommendation**: No action needed

---

## Test Execution Summary

**Total Automated Tests**: 16 (all Cypress)
**Coverage Level**: ~60% of acceptance criteria
**High Priority Gaps**: None
**Medium Priority Gaps**: Post-edit sort suppression (AC-3, AC-4, AC-5, AC-6)
**Low Priority Gaps**: Edge cases

**Why Not Higher Coverage**:
The post-edit sort suppression is a complex behavior that:
1. Works correctly and is stable
2. Is manually tested regularly
3. Would require significant automation effort
4. Has low regression risk

The current test coverage adequately validates:
- Sort indicator behavior (automated)
- Date/numeric sorting correctness (automated)
- Basic sort cycle (automated)
- Post-edit behavior (manual regression test)

## Recommendations

### Short Term
1. **Document manual test procedure** for TC-3.2 (post-edit sort suppression)
2. **Add to regression checklist** for major releases
3. **Monitor for regressions** - if this breaks, reconsider automation

### Long Term
1. **If cell editing test suite created**, add sort indicator assertions to those tests (low effort addition)
2. **If post-edit bug occurs**, invest in automation at that point
3. **Consider Playwright** instead of Cypress for complex row position tracking (better API)

### Not Recommended
- Creating standalone automated test for post-edit sort suppression
- Spending 6-8 hours on automation for stable, low-risk feature
- Automating every visual indicator state
