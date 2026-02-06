# Test Plan: Cell Editing

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Blue outline on selection | TC-2.1 | sorting-filtering.cy.ts: "Row selection preserves color" | Partial |
| AC-2 | Selection preserves color | TC-2.1 | sorting-filtering.cy.ts: row color tests | Covered |
| AC-3 | Single-click edit mode | TC-2.2 | - | Gap |
| AC-4 | Text saved on blur | TC-2.2 | - | Gap |
| AC-5 | Save indicator | TC-2.2 | Toolbar.test.tsx: save indicator tests | Partial |
| AC-6 | Flexible date input | TC-2.4 | - | Gap |
| AC-7 | Date normalization | TC-2.3 | - | Gap |
| AC-8 | Invalid date error | TC-2.5 | - | Gap |
| AC-9 | Status bar unchanged | TC-2.1 | - | Gap |

## Automated Test Inventory

### Cypress E2E Tests
**File**: `frontend/cypress/e2e/sorting-filtering.cy.ts`
- Test: "Row selection preserves color" - Verifies blue outline + color preservation
- Related row color tests

**Total**: ~5 tests related to row selection

### Vitest Component Tests
**File**: `frontend/src/components/layout/Toolbar.test.tsx`
- Save indicator state tests (shows/hides correctly)

**Total**: 3-4 tests for save indicator

## Manual Test Cases

### TC-2.1: Row Selection with Status Colors
**Objective**: Verify row selection shows blue outline without removing status colors

**Prerequisites**:
- Grid loaded with rows of different statuses (green, red, yellow, etc.)

**Steps**:
1. Observe a green row (Completed status)
2. Click the row
3. Verify blue outline appears
4. Verify green background is still visible
5. Click a red row (Overdue)
6. Verify blue outline moves to red row
7. Verify red background preserved

**Expected Result**:
- Blue outline visible on selected row
- Background status color (green/red/yellow) remains visible
- Only one row selected at a time

**Status**: Automated (sorting-filtering.cy.ts)

---

### TC-2.2: Text Cell Editing
**Objective**: Verify editing text cells (Notes column)

**Prerequisites**: Grid loaded

**Steps**:
1. Click a row to select it
2. Single-click on Notes cell
3. Observe cell enters edit mode (cursor visible)
4. Type "Test note content"
5. Press Tab key
6. Observe toolbar for save indicator
7. Verify new text appears in cell

**Expected Result**:
- Single-click enters edit mode
- Cursor positioned in cell
- Toolbar shows "Saving..." then "Saved"
- Cell displays new text after save
- Cell exits edit mode

**Status**: NOT automated - HIGH PRIORITY GAP

---

### TC-2.3: Date Normalization
**Objective**: Verify dates normalize to MM/DD/YYYY

**Prerequisites**: Grid loaded

**Steps**:
1. Select a row
2. Click Status Date cell
3. Enter "1/5/25" (M/D/YY format)
4. Press Tab
5. Verify display shows "01/05/2025"
6. Click Due Date cell
7. Enter "2025-12-25" (YYYY-MM-DD format)
8. Press Tab
9. Verify display shows "12/25/2025"

**Expected Result**:
- All date formats convert to MM/DD/YYYY
- Leading zeros added to month/day if needed
- 2-digit year expands to 4-digit

**Status**: NOT automated - HIGH PRIORITY GAP

---

### TC-2.4: Flexible Date Input Formats
**Objective**: Verify all accepted date formats work

**Prerequisites**: Grid loaded

**Steps**:
1. Test each format in separate cells:
   - Enter "12/25/2025" → Should save
   - Enter "1/5/25" → Should save
   - Enter "1.5.2025" → Should save
   - Enter "2025-01-05" → Should save
2. Verify all save successfully
3. Verify all display as MM/DD/YYYY

**Expected Result**:
- All 4 formats accepted
- No error messages
- All normalize to MM/DD/YYYY

**Status**: NOT automated - HIGH PRIORITY GAP

---

### TC-2.5: Invalid Date Error Handling
**Objective**: Verify invalid dates show error and revert

**Prerequisites**:
- Grid loaded
- Status Date has value "12/15/2025"

**Steps**:
1. Select row
2. Click Status Date cell
3. Enter "13/45/2025" (invalid month/day)
4. Press Tab
5. Observe error popup
6. Click OK on popup
7. Verify cell shows original value "12/15/2025"
8. Repeat with "abc" (non-date text)

**Expected Result**:
- Error popup appears: "Invalid date format"
- Cell reverts to previous value
- No data saved to database
- Same behavior for all invalid inputs

**Status**: NOT automated - HIGH PRIORITY GAP

---

### TC-2.6: Rapid Sequential Edits
**Objective**: Verify multiple edits save correctly

**Prerequisites**: Grid loaded

**Steps**:
1. Select row
2. Edit Notes cell, Tab immediately
3. Edit Tracking #1 cell, Tab immediately
4. Edit Status Date cell, Tab immediately
5. Wait for all saves to complete
6. Refresh page
7. Verify all 3 edits persisted

**Expected Result**:
- All edits queue and save
- No data loss
- Save indicators appear for each
- All values persist after refresh

**Status**: NOT automated - Medium priority

---

### TC-2.7: Save Indicator Timing
**Objective**: Verify save indicator displays correctly

**Prerequisites**: Grid loaded

**Steps**:
1. Edit a cell
2. Press Tab to trigger save
3. Observe toolbar immediately
4. Verify "Saving..." appears
5. Wait for save to complete
6. Verify "Saved" appears
7. Wait 2 seconds
8. Verify indicator disappears

**Expected Result**:
- "Saving..." visible during API call
- "Saved" appears on success for 2 seconds
- Indicator clears after timeout
- No indicator if no changes made

**Status**: Partially automated (Toolbar.test.tsx - unit test only)

---

## Test Coverage Gaps

### Gap 1: Cell Editing Workflow (CRITICAL)
**Priority**: HIGH
**Requirements**: AC-3, AC-4, AC-6, AC-7, AC-8
**Current Coverage**: 0% E2E automation
**Impact**: Core data entry functionality not tested end-to-end
**Recommendation**: Create Cypress test suite `cell-editing.cy.ts` with:
- Text cell edit + save
- Date cell edit with all formats
- Invalid date handling
- Save indicator E2E flow

**Estimated Tests**: 15-20 tests

---

### Gap 2: Date Input Flexibility
**Priority**: HIGH
**Requirements**: AC-6, AC-7
**Current Coverage**: Manual testing only
**Impact**: Data entry UX relies on this - failures cause user frustration
**Recommendation**: Cypress test with data-driven approach:
```javascript
const dateFormats = [
  { input: '12/25/2025', expected: '12/25/2025' },
  { input: '1/5/25', expected: '01/05/2025' },
  { input: '1.5.2025', expected: '01/05/2025' },
  { input: '2025-01-05', expected: '01/05/2025' }
];
dateFormats.forEach(test => { /* ... */ });
```

**Estimated Tests**: 5-8 tests

---

### Gap 3: Invalid Date Handling
**Priority**: MEDIUM
**Requirements**: AC-8
**Current Coverage**: Manual only
**Impact**: Data quality - prevents bad dates from saving
**Recommendation**: Cypress test for error popup + revert behavior

**Estimated Tests**: 3-4 tests

---

### Gap 4: Save Indicator E2E
**Priority**: MEDIUM
**Requirements**: AC-5
**Current Coverage**: Component test only (mocked)
**Impact**: User feedback mechanism
**Recommendation**: Add save indicator checks to cell editing tests

**Estimated Tests**: Integrated into Gap 1 tests

---

### Gap 5: Status Bar Unchanged
**Priority**: LOW
**Requirements**: AC-9
**Current Coverage**: None
**Impact**: Low - status bar rarely changes on selection
**Recommendation**: Add assertion to row selection test

**Estimated Tests**: 1 test

---

## Recommended Test Plan

### Phase 1: Critical Path (HIGH Priority)
**File**: `frontend/cypress/e2e/cell-editing.cy.ts`

1. **Text Cell Editing** (5 tests)
   - Click to edit Notes cell
   - Type and save with Tab
   - Type and save with click-away
   - Save indicator flow
   - Verify persistence

2. **Date Normalization** (8 tests)
   - Test each date format (4 formats)
   - Verify MM/DD/YYYY display
   - Verify leading zeros
   - Test 2-digit year expansion

3. **Invalid Date Error** (4 tests)
   - Invalid month (13/01/2025)
   - Invalid day (01/45/2025)
   - Non-date text (abc)
   - Verify revert + error popup

**Total**: ~17 tests, estimated 4-6 hours to implement

---

### Phase 2: Edge Cases (MEDIUM Priority)
4. **Rapid Edits** (3 tests)
   - Sequential cell edits
   - Verify all save
   - Check queue behavior

5. **Special Characters** (2 tests)
   - Quotes, apostrophes in Notes
   - SQL injection prevention

**Total**: ~5 tests, estimated 2 hours

---

## Test Execution Summary

**Current Automated Tests**: ~8 (selection + save indicator)
**Coverage Level**: ~25% of acceptance criteria
**Critical Gaps**: Cell editing workflow (AC-3, AC-4, AC-6, AC-7, AC-8)
**Recommended New Tests**: 22 tests (17 high priority + 5 medium)

## Success Criteria
- All date formats tested with automation
- Invalid date error handling verified
- Text editing + auto-save E2E tested
- Coverage reaches 80%+ of acceptance criteria
