# Test Gap Analysis: Requirement Area 10 -- Row Operations (Add/Delete/Duplicate)

**Date:** 2026-03-02
**Spec:** `.claude/specs/row-operations/requirements.md`
**Source Files:**
- `frontend/src/components/modals/AddRowModal.tsx` (add row modal form, validation, name concatenation)
- `frontend/src/components/modals/ConfirmModal.tsx` (delete confirmation dialog)
- `frontend/src/components/layout/Toolbar.tsx` (Add Row, Copy Member, Delete Row buttons)
- `frontend/src/pages/MainPage.tsx` (row operation orchestration, API calls, grid refresh)

**Test Files:**
- `frontend/src/components/modals/AddRowModal.test.tsx` (Vitest -- 21 tests)
- `frontend/src/components/modals/ConfirmModal.test.tsx` (Vitest -- 11 tests)
- `frontend/src/components/layout/Toolbar.test.tsx` (Vitest -- 18 tests)
- `frontend/e2e/add-row.spec.ts` (Playwright -- 9 tests)
- `frontend/e2e/delete-row.spec.ts` (Playwright -- 9 tests, 0 skipped)
- `frontend/e2e/duplicate-member.spec.ts` (Playwright -- 8 tests, 1 skipped)
- `frontend/cypress/e2e/row-operations.cy.ts` (Cypress -- 6 tests)
- `frontend/cypress/e2e/parallel-editing-row-operations.cy.ts` (Cypress -- 4 tests)
- `frontend/cypress/e2e/cell-editing.cy.ts` (Cypress -- row selection tests, 3 relevant)

**Regression Plan:** Sections TC-9.0 through TC-9.3, TC-51.1, TC-51.2

---

## Summary

Row operations have **76 tests across 3 frameworks** (50 Vitest, 17 Playwright, 9 Cypress). This is one of the better-covered areas with strong modal unit tests and good E2E coverage for the happy path flows.

**Coverage highlights:**
- Add Row modal rendering, validation, name concatenation: WELL COVERED (Vitest, 21 tests)
- Add Row E2E flow (open modal, fill, submit, verify row at top): COVERED (Playwright + Cypress)
- Delete Row E2E flow (select, confirm, verify removal): COVERED (Playwright + Cypress)
- Duplicate/Copy Member E2E flow (copies patient data, empty measures): COVERED (Playwright)
- Toolbar button enable/disable state: WELL COVERED (Vitest, 18 tests)
- Confirm modal rendering and interactions: COVERED (Vitest, 11 tests)
- Add row with Staff role: COVERED (Cypress)

**Critical gaps:**
1. Request Type auto-focused after add (AC-4) -- zero tests in any framework
2. Column sort cleared on add (AC-5) -- zero tests
3. Persistence after page refresh for add (AC-6) and duplicate (AC-14) -- zero tests
4. Status bar row count update after delete (AC-9) -- partially covered in parallel-editing tests but not status bar text verification
5. Add row when grid is empty -- zero tests
6. Delete last row in grid -- zero tests
7. Duplicate when sort is active -- zero tests
8. Keyboard shortcut for operations -- zero tests
9. Add row with provider/insurance filter active -- partially covered via pinned row tests but no direct test
10. Multi-row delete -- zero tests (current UI is single-delete only, but no guard test)

---

## Use Cases & Per-Framework Coverage

### UC-1: Add Row button opens modal

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | No backend add row logic in scope |
| **Vitest** | Yes | `Toolbar.test.tsx`: "calls onAddRow when clicked" |
| **Playwright** | Yes | `add-row.spec.ts`: "Add Row button opens modal" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Add Row button opens modal and creates row" |

### UC-2: Add Row modal shows required fields (Last Name, First Name, DOB, Telephone, Address)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "renders all form fields", "shows required indicator for last name, first name, and DOB" |
| **Playwright** | Partial | `add-row.spec.ts`: "modal has required form fields" (checks Member Name, DOB, Telephone, Address) |
| **Cypress** | No | -- |

**Note:** The Playwright test references a single "Member Name" field but the actual component uses separate Last Name, First Name, MI fields. The Playwright test may be checking outdated field structure (placeholder "Enter patient name" vs actual "Last name"/"First name"). This is a potential test accuracy issue.

### UC-3: Form validation -- Member Name required

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "shows error when submitting without last name", "shows error when submitting without first name", "does not call onAdd when validation fails" |
| **Playwright** | Partial | `add-row.spec.ts`: "validation error shows for missing member name" (references "Enter patient name" placeholder) |
| **Cypress** | No | -- |

### UC-4: Form validation -- DOB required

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "shows error when submitting without date of birth" |
| **Playwright** | Yes | `add-row.spec.ts`: "validation error shows for missing date of birth" |
| **Cypress** | No | -- |

### UC-5: Error clears when field is edited

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "clears last name error when field is edited", "clears first name error when field is edited" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-6: Valid submit creates row and resets form

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "calls onAdd with form data when valid", "resets form after successful submission" |
| **Playwright** | Yes | `add-row.spec.ts`: "submitting valid data creates new row" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Add Row button opens modal and creates row" |

### UC-7: Form NOT reset when onAdd returns false (e.g., duplicate detected)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "does not reset form when onAdd returns false" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-8: Name concatenation ("Last, First" and "Last, First Middle")

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "concatenates as Last, First without middle name", "concatenates as Last, First Middle with middle name", "trims whitespace from name fields", "ignores whitespace-only middle name" (4 tests) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-9: New row appears as FIRST row in grid (AC-2)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `add-row.spec.ts`: "new row appears as first row" |
| **Cypress** | Partial | `row-operations.cy.ts`: uses `cy.findRowByMemberName()` to verify existence but does not assert position |

### UC-10: New row has empty requestType, qualityMeasure, measureStatus (AC-3)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `add-row.spec.ts`: "new row has empty request type, quality measure, measure status" |
| **Cypress** | Yes | `row-operations.cy.ts`: "new row has null request type, quality measure, measure status" |

### UC-11: Request Type cell auto-focused after add (AC-4)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. Spec requires Request Type cell to be auto-focused. Priority: LOW (UX polish).**

### UC-12: Column sort cleared when adding new row (AC-5)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. Spec requires sort to be cleared so new row appears at top. Priority: MEDIUM (functional correctness when sort is active).**

### UC-13: New row persists after page refresh (AC-6)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. API persistence is indirectly verified by successful add, but no test explicitly refreshes the page and checks. Priority: MEDIUM (data integrity).**

### UC-14: Cancel button closes modal without creating row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "calls onClose when Cancel button is clicked" |
| **Playwright** | Yes | `add-row.spec.ts`: "cancel button closes modal without creating row" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Cancel delete preserves the row" (delete cancel) |

### UC-15: X button closes modal

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "calls onClose when X button is clicked" |
| **Playwright** | Yes | `add-row.spec.ts`: "X button closes modal" |
| **Cypress** | No | -- |

### UC-16: Backdrop click closes modal

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `AddRowModal.test.tsx`: "calls onClose when backdrop is clicked" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-17: Delete button disabled when no row selected (AC-7)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `Toolbar.test.tsx`: "is disabled when canDelete is false", "Delete button click does NOT call onDeleteRow when canDelete=false" |
| **Playwright** | Yes | `delete-row.spec.ts`: "Delete button is disabled when no row selected" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Delete button disabled when no row selected" |

### UC-18: Delete button enabled when row selected

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `Toolbar.test.tsx`: "is enabled when canDelete is true" |
| **Playwright** | Yes | `delete-row.spec.ts`: "Delete button is enabled when row is selected" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Delete button enabled after selecting a row, confirmation works" |

### UC-19: Delete shows confirmation modal (AC-8)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: rendering and button action tests (7 tests) |
| **Playwright** | Yes | `delete-row.spec.ts`: "clicking Delete shows confirmation dialog", "confirmation dialog shows warning message" |
| **Cypress** | Yes | `row-operations.cy.ts`: confirmation modal shown in "Delete button enabled" test |

### UC-20: Confirming delete removes the row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: "calls onConfirm when confirm button is clicked" |
| **Playwright** | Yes | `delete-row.spec.ts`: "confirming delete removes the row" |
| **Cypress** | Yes | `row-operations.cy.ts`: delete confirmation test |

### UC-21: Cancel delete preserves the row

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: "calls onCancel when cancel button is clicked" |
| **Playwright** | Yes | `delete-row.spec.ts`: "canceling delete keeps the row" |
| **Cypress** | Yes | `row-operations.cy.ts`: "Cancel delete preserves the row" |

### UC-22: Delete decreases row count in status bar (AC-9)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Partial | `delete-row.spec.ts`: verifies getRowCount() decreases (grid row count, not status bar text) |
| **Cypress** | Partial | `parallel-editing-row-operations.cy.ts`: "should update row count after Delete Row" (grid DOM rows, not status bar text) |

**GAP: No test verifies status bar text "Showing X of Y rows" updates after delete. Priority: LOW (the row count change is verified, just not in the status bar display).**

### UC-23: Backdrop click closes delete confirmation without deleting

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: "calls onCancel when backdrop is clicked" |
| **Playwright** | Yes | `delete-row.spec.ts`: "clicking backdrop closes confirmation without deleting" |
| **Cypress** | No | -- |

### UC-24: Delete button becomes disabled after deletion

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `delete-row.spec.ts`: "Delete button becomes disabled after deletion" |
| **Cypress** | No | -- |

### UC-25: Can select and delete another row after first deletion

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `delete-row.spec.ts`: "can select and delete another row after first deletion" |
| **Cypress** | No | -- |

### UC-26: Copy Member button disabled when no row selected (AC-10)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `Toolbar.test.tsx`: "is disabled when canDuplicate is false", "does not call onDuplicateRow when disabled" |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "Duplicate button is disabled when no row selected" |
| **Cypress** | No | -- |

### UC-27: Copy Member enabled when row selected

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `Toolbar.test.tsx`: "is enabled when canDuplicate is true" |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "Duplicate button is enabled when row is selected" |
| **Cypress** | No | -- |

### UC-28: Duplicate creates copy below selected row (AC-11)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "clicking Duplicate creates new row with same patient data" |
| **Cypress** | No | -- |

### UC-29: Duplicate copies memberName, DOB, phone, address only (AC-12)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "clicking Duplicate creates new row with same patient data", "duplicated row copies phone and address" |
| **Cypress** | No | -- |

### UC-30: Duplicated row has empty requestType, qualityMeasure, measureStatus (AC-13)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "duplicated row has empty measure fields" |
| **Cypress** | No | -- |

### UC-31: Duplicated row persists after refresh (AC-14)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. Same as UC-13 but for duplicated rows. Priority: MEDIUM.**

### UC-32: Duplicated row is selected after creation

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "duplicated row is selected after creation" |
| **Cypress** | No | -- |

### UC-33: Can duplicate multiple times consecutively

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | Yes | `duplicate-member.spec.ts`: "can duplicate multiple times" |
| **Cypress** | No | -- |

### UC-34: Add row updates status bar count

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `parallel-editing-row-operations.cy.ts`: "should update row count after Add Row" (verifies grid DOM row count, not status bar text) |

**GAP: No test verifies status bar text updates after add. Priority: LOW.**

### UC-35: Add row with provider/insurance filter active

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Partial | `MainPage.test.tsx`: Pinned row behavior tests (7 tests cover row visibility during filters) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**Partial coverage via pinned row unit tests. No E2E test for add with filter active.**

### UC-36: Add and delete work as Staff role

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `row-operations.cy.ts`: "Add and delete work as Staff" |

### UC-37: Confirm modal button styling (red/blue variants)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: "applies red color to confirm button by default", "applies blue color when confirmColor is blue" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-38: Confirm modal custom button text

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `ConfirmModal.test.tsx`: "uses custom button text when provided" |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

### UC-39: Save status indicator (Saving/Saved/Error states)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `Toolbar.test.tsx`: "shows nothing when status is idle", "shows Saving...", "shows Saved", "shows Save failed" (4 tests) |
| **Playwright** | No | -- |
| **Cypress** | Partial | `cell-editing.cy.ts`: "should show save indicator in toolbar after editing", "should show Saved after save completes" |

### UC-40: Add row when grid is empty

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. Edge case from spec. Priority: LOW (unlikely in production).**

### UC-41: Delete last row in grid

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Zero tests. Edge case from spec. Priority: LOW.**

### UC-42: Pinned row on add/duplicate (filter bypass)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `MainPage.test.tsx`: Pinned row behavior (7 tests), `StatusFilterBar.test.tsx`: Pinned Row Badge (5 tests) |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

---

## Gap Summary

| # | Gap | AC | Priority | Recommendation |
|---|-----|----|----------|----------------|
| 1 | Request Type auto-focused after add | AC-4 | LOW | Add Cypress test: after add, verify `tracking1` or `requestType` cell has editing focus |
| 2 | Sort cleared on add | AC-5 | MEDIUM | Add Cypress test: sort by column, add row, verify sort indicator cleared and row at top |
| 3 | Persistence after refresh (add) | AC-6 | MEDIUM | Add Playwright test: add row, `page.reload()`, verify row still at top |
| 4 | Persistence after refresh (duplicate) | AC-14 | MEDIUM | Add Playwright test: duplicate row, reload, verify duplicate still below original |
| 5 | Status bar text update after add/delete | AC-9 | LOW | Add Cypress test: read status bar text, add row, verify count incremented in text |
| 6 | Add row when grid is empty | Edge | LOW | Would require test database setup or mock |
| 7 | Delete last row | Edge | LOW | Would require deleting all rows first |
| 8 | Duplicate when sort is active | Edge | LOW | Add Cypress test: sort, select, duplicate, verify position |
| 9 | Playwright test accuracy for add-row modal fields | -- | MEDIUM | `add-row.spec.ts` tests reference `input[placeholder="Enter patient name"]` but the actual component has separate Last Name/First Name/MI fields. Tests may be failing or testing stale selectors. |

---

## Test Counts by Framework

| Framework | Test Count | Files |
|-----------|-----------|-------|
| Vitest | 50 | AddRowModal.test.tsx (21), ConfirmModal.test.tsx (11), Toolbar.test.tsx (18) |
| Playwright | 26 | add-row.spec.ts (9), delete-row.spec.ts (9), duplicate-member.spec.ts (8) |
| Cypress | 13 | row-operations.cy.ts (6), parallel-editing-row-operations.cy.ts (4), cell-editing.cy.ts (3 relevant) |
| **Total** | **89** | |

---

## Potential Test Accuracy Issues

1. **Playwright add-row.spec.ts uses stale selectors**: Tests reference `input[placeholder="Enter patient name"]` but the actual AddRowModal component uses separate `input[placeholder="Last name"]`, `input[placeholder="First name"]`, and `input[placeholder="Middle"]` fields. This means Playwright add-row tests 3-8 may fail when run. These tests need to be updated to match the current component structure.

2. **Cypress parallel-editing-row-operations.cy.ts uses stale selectors**: Similarly references `input[placeholder="Enter patient name"]` which does not match the current modal structure.

3. **Regression plan TC-11.2 says N/A display is "Manual"** but Cypress `cascading-dropdowns.cy.ts` has TC-11.2 tests that do automate this. The regression plan needs updating.
