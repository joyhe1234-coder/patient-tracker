# Requirements Document: Module 2 — Patient Grid & Cell Editing Comprehensive Test Plan

## Introduction

This feature consolidates all testable behaviors from the Patient Grid and Cell Editing module (Module 2) into a single, authoritative test requirements specification. It maps every testable behavior to acceptance criteria, identifies coverage gaps versus the current test suites (~527 backend Jest, ~296 frontend Vitest, ~283 Cypress, ~35 Playwright), and proposes new test cases to fill those gaps. The scope covers: AG Grid display, cell editing, auto-save, row CRUD, duplicate detection, sorting, and version conflict (409) resolution.

The goal is NOT to create new product functionality, but to ensure the existing functionality is exhaustively tested across all layers of the test pyramid (Jest, Vitest, Cypress, Playwright) with no behavioral gaps.

## Alignment with Product Vision

The product vision identifies the AG Grid-based patient data grid as the core user interface, replacing Excel-based workflows. The grid's reliability is foundational -- every feature (cell editing, auto-save, cascading dropdowns, row CRUD, duplicate detection, version conflict resolution, sorting, status colors) must be rigorously tested to ensure data integrity and a smooth user experience. This test plan directly supports the success metric of "Replace Excel tracking for medical offices" by ensuring the grid behaves correctly under all conditions.

## Existing Test Inventory (Baseline)

### Current Test Counts Relevant to Patient Grid

| Test File | Framework | Count | Covers |
|-----------|-----------|-------|--------|
| `PatientGrid.test.tsx` | Vitest | 58 | Column defs, rendering, row class rules, member info toggle, config |
| `useGridCellUpdate.test.ts` | Vitest | 15 | Cell save, cascading, 409 conflict, 404, error handling |
| `AutoOpenSelectEditor.test.tsx` | Vitest | 22 | Dropdown editor rendering, selection, keyboard nav |
| `DateCellEditor.test.tsx` | Vitest | 9 | Date editor rendering, format parsing |
| `StatusDateRenderer.test.tsx` | Vitest | 13 | Status date display, prompt text |
| `ConflictModal.test.tsx` | Vitest | 14 | Conflict modal rendering, buttons, callbacks |
| `AddRowModal.test.tsx` | Vitest | 21 | Add row modal rendering, validation, submission |
| `cascadingFields.test.ts` | Vitest | ~10 | Cascading update payload logic |
| `data.routes.test.ts` | Jest | 49 | Data CRUD endpoints (auth, happy path) |
| `data.routes.version.test.ts` | Jest | 6 | Version check in PUT endpoint |
| `data.routes.socket.test.ts` | Jest | ~8 | Socket broadcast after CRUD |
| `versionCheck.test.ts` | Jest | 12 | Optimistic concurrency service |
| `duplicateDetector.test.ts` | Jest | 38 | Duplicate detection service |
| `cell-editing.cy.ts` | Cypress | 23 | Row selection, text/date editing, save indicator |
| `sorting-filtering.cy.ts` | Cypress | 56 | Column sorting, filter bar, status filters |
| `duplicate-detection.cy.ts` | Cypress | 16 | Duplicate visual indicator, edit creates duplicate |
| `parallel-editing-*.cy.ts` | Cypress | 11 | Edit indicators, grid updates, row ops (parallel) |
| `add-row.spec.ts` | Playwright | 9 | Add row flow |
| `delete-row.spec.ts` | Playwright | 9 | Delete row flow |
| `duplicate-member.spec.ts` | Playwright | 7 | Duplicate member flow |
| `parallel-editing-conflict.spec.ts` | Playwright | 3 | Conflict resolution flow |

**Total relevant tests: ~449 across all frameworks**

---

## Requirements

### Requirement 1: AG Grid Data Display

**ID:** TPG-R1

**User Story:** As a QA engineer, I want every aspect of the AG Grid data display to be tested, so that column definitions, header labels, column widths, row rendering, and scroll behavior are verified to match the product specification.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R1-AC1: WHEN the grid renders, THEN exactly 13 column definitions SHALL be present (requestType, memberName, memberDob, memberTelephone, memberAddress, qualityMeasure, measureStatus, statusDate, tracking1, tracking2, dueDate, timeIntervalDays, notes). *[Covered: PatientGrid.test.tsx]*
2. TPG-R1-AC2: WHEN the grid renders, THEN each column SHALL have the correct headerName (e.g., "Request Type", "Member Name", "Quality Measure", "Possible Actions Needed & Notes"). *[Covered: PatientGrid.test.tsx]*
3. TPG-R1-AC3: WHEN the grid renders, THEN requestType and memberName columns SHALL be pinned to the left. *[Covered: PatientGrid.test.tsx]*
4. TPG-R1-AC4: WHEN the grid renders, THEN all columns SHALL have a headerTooltip set with non-empty text. *[Covered: PatientGrid.test.tsx]*
5. TPG-R1-AC5: WHEN showMemberInfo is false (default), THEN memberDob, memberTelephone, and memberAddress columns SHALL be hidden. *[Covered: PatientGrid.test.tsx]*
6. TPG-R1-AC6: WHEN showMemberInfo is true, THEN memberDob, memberTelephone, and memberAddress columns SHALL be visible. *[Covered: PatientGrid.test.tsx]*
7. TPG-R1-AC7: WHEN the DOB column is visible, THEN the valueFormatter SHALL mask the date as "###". *[Covered: PatientGrid.test.tsx]*
8. TPG-R1-AC8: WHEN the DOB column receives a null value, THEN the valueFormatter SHALL return an empty string. *[Covered: PatientGrid.test.tsx]*
9. TPG-R1-AC9: WHEN the grid renders with an empty rowData array, THEN the grid SHALL display with 0 rows and no errors. *[Covered: PatientGrid.test.tsx]*
10. TPG-R1-AC10: WHEN the grid renders inside a container, THEN the container SHALL have the class "ag-theme-alpine". *[Covered: PatientGrid.test.tsx]*
11. TPG-R1-AC11: WHEN the notes column is defined, THEN it SHALL have flex=1 to fill remaining horizontal space. *[Covered: PatientGrid.test.tsx]*
12. TPG-R1-AC12: WHEN rowClassRules are applied, THEN CSS classes for all 9 status states (green, blue, yellow, purple, orange, gray, white, overdue, duplicate) SHALL be available. *[Covered: PatientGrid.test.tsx]*

**Gap — New Tests Required:**

13. TPG-R1-AC13: WHEN the grid renders, THEN each column SHALL have the correct width property (requestType: 130, memberName: 180, memberDob: 130, memberTelephone: 140, memberAddress: 220, qualityMeasure: 200, measureStatus: 220, statusDate: 140, tracking1: 160, tracking2: 150, dueDate: 120, timeIntervalDays: 150, notes: 300). *[Gap: column width values not asserted]*
14. TPG-R1-AC14: WHEN the telephone column has a 10-digit phone number, THEN the valueFormatter SHALL format it as "(XXX) XXX-XXXX". *[Gap: phone formatting not tested in Vitest]*
15. TPG-R1-AC15: WHEN the telephone column has a non-10-digit value, THEN the valueFormatter SHALL return the raw value unchanged. *[Gap: phone formatting edge case]*
16. TPG-R1-AC16: WHEN the grid has 100+ rows, THEN AG Grid's row virtualization SHALL prevent rendering all DOM rows simultaneously (Cypress/Playwright only). *[Gap: virtualization not tested]*
17. TPG-R1-AC17: WHEN the grid renders, THEN the getRowId function SHALL return the string representation of data.id for each row. *[Covered: PatientGrid.test.tsx]*
18. TPG-R1-AC18: WHEN a row has insuranceGroup data, THEN the grid SHALL include an insuranceGroup field in GridRow (verify type interface, even if no dedicated column). *[Gap: insuranceGroup presence in GridRow not tested]*
19. TPG-R1-AC19: WHEN the grid renders with rowData, THEN the Cypress E2E test SHALL verify that the grid displays the expected number of AG Grid DOM rows matching the rowData count. *[Gap: Cypress row count verification]*

---

### Requirement 2: Cell Editing — Dropdown Editors

**ID:** TPG-R2

**User Story:** As a QA engineer, I want every dropdown editor behavior tested, so that AutoOpenSelectEditor rendering, option population, cascading dependencies, and single-click activation are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R2-AC1: WHEN the requestType column is defined, THEN it SHALL use AutoOpenSelectEditor with cellEditorPopup=true. *[Covered: PatientGrid.test.tsx]*
2. TPG-R2-AC2: WHEN the qualityMeasure column is defined, THEN it SHALL use AutoOpenSelectEditor with cellEditorPopup=true. *[Covered: PatientGrid.test.tsx]*
3. TPG-R2-AC3: WHEN the measureStatus column is defined, THEN it SHALL use AutoOpenSelectEditor with cellEditorPopup=true. *[Covered: PatientGrid.test.tsx]*
4. TPG-R2-AC4: WHEN AutoOpenSelectEditor renders, THEN it SHALL display a scrollable list of options from the values prop. *[Covered: AutoOpenSelectEditor.test.tsx]*
5. TPG-R2-AC5: WHEN a user clicks a dropdown cell, THEN the dropdown editor SHALL auto-open (single-click activation via onCellClicked handler). *[Covered: Cypress cell-editing.cy.ts]*
6. TPG-R2-AC6: WHEN a dropdown cell is empty, THEN the first option in the values array SHALL be an empty string (allowing deselection). *[Covered: PatientGrid.test.tsx - values array includes '']*

**Gap — New Tests Required:**

7. TPG-R2-AC7: WHEN the user selects a requestType value, THEN the qualityMeasure dropdown SHALL be populated with quality measures for that request type (cascading dependency). *[Gap: cascading option population not tested in Vitest. Partially tested in Cypress cascading-dropdowns.cy.ts but not linked to this test plan]*
8. TPG-R2-AC8: WHEN the qualityMeasure column editor opens, THEN its cellEditorParams function SHALL call getQualityMeasuresForRequestType with the current requestType. *[Gap: dynamic cellEditorParams callback not unit-tested]*
9. TPG-R2-AC9: WHEN the measureStatus column editor opens, THEN its cellEditorParams function SHALL call getMeasureStatusesForQualityMeasure with the current qualityMeasure. *[Gap: dynamic cellEditorParams callback not unit-tested]*
10. TPG-R2-AC10: WHEN the tracking1 column has a measureStatus with dropdown options, THEN cellEditorSelector SHALL return AutoOpenSelectEditor with those options. *[Gap: cellEditorSelector logic not unit-tested]*
11. TPG-R2-AC11: WHEN the tracking1 column has a HgbA1c measureStatus with no dropdown options, THEN cellEditorSelector SHALL return the agTextCellEditor. *[Gap: tracking1 text fallback not tested]*
12. TPG-R2-AC12: WHEN the tracking2 column has a HgbA1c measureStatus, THEN cellEditorSelector SHALL return AutoOpenSelectEditor with month options (1-12 months). *[Gap: tracking2 HgbA1c dropdown not tested]*
13. TPG-R2-AC13: WHEN the tracking2 column has a BP measureStatus, THEN cellEditorSelector SHALL return the agTextCellEditor for free-text BP reading entry. *[Gap: tracking2 BP text editor not tested]*
14. TPG-R2-AC14: WHEN a dropdown cell value is null, THEN the valueGetter SHALL return empty string '' (not null) for the dropdown to work correctly. *[Gap: valueGetter null-to-empty conversion not explicitly tested]*
15. TPG-R2-AC15: WHEN a dropdown cell value is set to empty string '', THEN the valueSetter SHALL convert it to null for database storage. *[Gap: valueSetter empty-to-null conversion not tested]*
16. TPG-R2-AC16: WHEN another user is remotely editing a dropdown cell, THEN onCellClicked SHALL NOT open the editor for that cell. *[Gap: remote edit blocking not tested]*
17. TPG-R2-AC17: WHEN a dropdown cell renders, THEN the dropdownCellRenderer SHALL show a dropdown arrow indicator (unicode downward triangle). *[Gap: dropdown arrow rendering not tested]*
18. TPG-R2-AC18: WHEN a non-dropdown cell renders (e.g., tracking1 N/A), THEN the dropdownCellRenderer SHALL render the plain display value without the arrow. *[Gap: non-dropdown rendering not tested]*

---

### Requirement 3: Cell Editing — Date Editors

**ID:** TPG-R3

**User Story:** As a QA engineer, I want every date editor behavior tested, so that DateCellEditor rendering, multi-format parsing, validation, and error handling are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R3-AC1: WHEN the statusDate column is defined, THEN it SHALL use DateCellEditor as the cell editor. *[Covered: PatientGrid.test.tsx]*
2. TPG-R3-AC2: WHEN the statusDate column is defined, THEN it SHALL use StatusDateRenderer for display. *[Covered: PatientGrid.test.tsx]*
3. TPG-R3-AC3: WHEN the user enters a date in MM/DD/YYYY format, THEN it SHALL be accepted and saved. *[Covered: DateCellEditor.test.tsx]*
4. TPG-R3-AC4: WHEN the user enters an invalid date, THEN the valueSetter SHALL reject the change and show a format error. *[Covered: DateCellEditor.test.tsx]*
5. TPG-R3-AC5: WHEN the statusDate has no value but has a statusDatePrompt, THEN the renderer SHALL display the prompt text. *[Covered: StatusDateRenderer.test.tsx]*
6. TPG-R3-AC6: WHEN the user double-clicks a date cell and edits the value, THEN the Cypress E2E test SHALL verify the save completes. *[Covered: cell-editing.cy.ts]*

**Gap — New Tests Required:**

7. TPG-R3-AC7: WHEN the user enters a date in M/D/YY format (e.g., "1/5/25"), THEN the valueSetter SHALL accept and convert it to ISO format. *[Gap: short date format not tested in Vitest valueSetter]*
8. TPG-R3-AC8: WHEN the user enters a date in M.D.YYYY format (e.g., "1.5.2025"), THEN the valueSetter SHALL accept and convert it to ISO format. *[Gap: dot-separated format not tested]*
9. TPG-R3-AC9: WHEN the user enters a date in YYYY-MM-DD format (e.g., "2025-01-05"), THEN the valueSetter SHALL accept and convert it to ISO format. *[Gap: ISO format input not tested]*
10. TPG-R3-AC10: WHEN the user clears the statusDate (empty input), THEN the valueSetter SHALL set the value to null. *[Gap: statusDate null clearing not tested]*
11. TPG-R3-AC11: WHEN the user clears the memberDob, THEN the valueSetter SHALL reject the change with an alert "Date of Birth is required and cannot be empty." *[Gap: DOB required validation not tested]*
12. TPG-R3-AC12: WHEN the statusDate valueGetter is called, THEN it SHALL return the date in edit-friendly format (via formatDateForEdit). *[Gap: valueGetter transformation not tested]*
13. TPG-R3-AC13: WHEN the statusDate comparator sorts rows, THEN null/empty dates SHALL sort to the end in ascending order and to the beginning in descending order. *[Gap: custom date comparator not unit-tested]*
14. TPG-R3-AC14: WHEN the dueDate comparator sorts rows, THEN null/empty dates SHALL sort to the end in ascending order. *[Gap: dueDate comparator not tested]*
15. TPG-R3-AC15: WHEN StatusDateRenderer displays a date with a statusDatePrompt, THEN the cell SHALL have CSS classes "stripe-overlay" and "cell-prompt". *[Gap: cellClass for statusDate prompt not tested]*

---

### Requirement 4: Cell Editing — Text Editors and Tab Navigation

**ID:** TPG-R4

**User Story:** As a QA engineer, I want text cell editing and tab navigation between cells tested, so that notes editing, member name editing, and keyboard-driven workflows are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R4-AC1: WHEN the notes column is defined, THEN it SHALL be editable (editable=true). *[Covered: PatientGrid.test.tsx]*
2. TPG-R4-AC2: WHEN the memberName column is defined, THEN it SHALL be editable. *[Covered: PatientGrid.test.tsx]*
3. TPG-R4-AC3: WHEN the dueDate column is defined, THEN it SHALL NOT be editable (calculated field). *[Covered: PatientGrid.test.tsx]*
4. TPG-R4-AC4: WHEN the user double-clicks a text cell, THEN the cell SHALL enter edit mode. *[Covered: cell-editing.cy.ts]*
5. TPG-R4-AC5: WHEN the user types a new value and presses Tab, THEN the cell SHALL exit edit mode and the change SHALL be auto-saved. *[Covered: cell-editing.cy.ts]*

**Gap — New Tests Required:**

6. TPG-R4-AC6: WHEN the grid is configured, THEN singleClickEdit SHALL be false (requiring double-click for text cells). *[Covered: PatientGrid.test.tsx, but not tested in isolation with a click-then-verify-no-edit test]*
7. TPG-R4-AC7: WHEN the grid is configured, THEN stopEditingWhenCellsLoseFocus SHALL be true (blur exits edit mode). *[Covered: PatientGrid.test.tsx]*
8. TPG-R4-AC8: WHEN the user presses Tab while editing a cell, THEN the focus SHALL move to the next editable cell in the same row (Cypress E2E). *[Gap: tab navigation between cells not E2E tested]*
9. TPG-R4-AC9: WHEN the user enters text with special characters (quotes, apostrophes, angle brackets) in the Notes field, THEN the characters SHALL be saved correctly without XSS or SQL injection. *[Gap: special character handling not tested]*
10. TPG-R4-AC10: WHEN the user enters a very long string (1000+ characters) in Notes, THEN the value SHALL either be accepted and saved or truncated to the field limit. *[Gap: long text boundary not tested]*
11. TPG-R4-AC11: WHEN the timeIntervalDays column is editable (has statusDate and timeIntervalDays), THEN the valueSetter SHALL accept integers between 1 and 1000. *[Gap: timeIntervalDays validation not unit-tested]*
12. TPG-R4-AC12: WHEN the timeIntervalDays valueSetter receives a non-numeric value, THEN it SHALL reject the change and display an alert. *[Gap: timeIntervalDays invalid input not tested]*
13. TPG-R4-AC13: WHEN the timeIntervalDays valueSetter receives 0 or a negative number, THEN it SHALL reject the change. *[Gap: timeIntervalDays boundary not tested]*
14. TPG-R4-AC14: WHEN the timeIntervalDays column has a measureStatus in TIME_PERIOD_DROPDOWN_STATUSES, THEN the column SHALL NOT be editable. *[Gap: isTimeIntervalEditable logic not unit-tested]*

---

### Requirement 5: Auto-Save — onCellValueChanged Pipeline

**ID:** TPG-R5

**User Story:** As a QA engineer, I want the entire auto-save pipeline tested (from cell change to API call to status indicator), so that optimistic updates, error rollbacks, and cascading field management are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R5-AC1: WHEN a cell value changes, THEN the hook SHALL call PUT /api/data/:id with the correct payload including expectedVersion. *[Covered: useGridCellUpdate.test.ts]*
2. TPG-R5-AC2: WHEN a cell value changes, THEN applyCascadingUpdates SHALL be called to compute cascading field clears. *[Covered: useGridCellUpdate.test.ts]*
3. TPG-R5-AC3: WHEN the API call succeeds, THEN the hook SHALL call node.setData with the server response data. *[Covered: useGridCellUpdate.test.ts]*
4. TPG-R5-AC4: WHEN a save begins, THEN onSaveStatusChange SHALL be called with "saving". *[Covered: useGridCellUpdate.test.ts]*
5. TPG-R5-AC5: WHEN a save completes successfully, THEN onSaveStatusChange SHALL be called with "saved" and then "idle" after 2 seconds. *[Covered: useGridCellUpdate.test.ts]*
6. TPG-R5-AC6: WHEN the newValue equals the oldValue, THEN no API call SHALL be made. *[Covered: useGridCellUpdate.test.ts]*
7. TPG-R5-AC7: WHEN data is undefined or colDef.field is empty, THEN no API call SHALL be made. *[Covered: useGridCellUpdate.test.ts]*
8. TPG-R5-AC8: WHEN isCascadingUpdateRef is true, THEN no API call SHALL be made (prevents recursive saves). *[Covered: useGridCellUpdate.test.ts]*
9. TPG-R5-AC9: WHEN query params include a physicianId, THEN the API call URL SHALL include the query string. *[Covered: useGridCellUpdate.test.ts]*
10. TPG-R5-AC10: WHEN a non-conflict error occurs (500), THEN the cell value SHALL revert to oldValue. *[Covered: useGridCellUpdate.test.ts]*

**Gap — New Tests Required:**

11. TPG-R5-AC11: WHEN a cell value changes and the edited column is currently sorted, THEN the hook SHALL capture the current row order, freeze it, and clear the sort indicator. *[Gap: sort freeze on edit not tested in useGridCellUpdate.test.ts]*
12. TPG-R5-AC12: WHEN the API call succeeds, THEN gridApi.redrawRows SHALL be called to re-evaluate rowClassRules (status colors). *[Gap: redrawRows call not asserted]*
13. TPG-R5-AC13: WHEN the API call succeeds, THEN node.setSelected(true) SHALL be called to maintain row selection after update. *[Gap: selection preservation after save not tested]*
14. TPG-R5-AC14: WHEN the API call succeeds, THEN onRowUpdated SHALL be called to sync React state with grid state. *[Covered: useGridCellUpdate.test.ts]*
15. TPG-R5-AC15: WHEN a save error occurs, THEN isCascadingUpdateRef SHALL be reset to false in the finally block. *[Covered: useGridCellUpdate.test.ts]*
16. TPG-R5-AC16: WHEN the save indicator shows "Saving...", THEN a Cypress E2E test SHALL verify the toolbar text transitions from "Saving..." to "Saved" to idle. *[Gap: full lifecycle not E2E tested with assertions]*
17. TPG-R5-AC17: WHEN the user edits multiple cells rapidly, THEN each PUT request SHALL include the correct expectedVersion for that row at the time of edit. *[Gap: rapid sequential edit version tracking not tested]*
18. TPG-R5-AC18: WHEN a 409 duplicate error occurs on requestType, THEN the field SHALL reset to null and downstream fields (qualityMeasure, measureStatus) SHALL also reset to null. *[Covered: useGridCellUpdate.test.ts]*
19. TPG-R5-AC19: WHEN a 409 duplicate error occurs on qualityMeasure, THEN the field SHALL reset to null and measureStatus SHALL reset to null. *[Covered: useGridCellUpdate.test.ts]*
20. TPG-R5-AC20: WHEN a non-Axios error occurs (e.g., TypeError), THEN the cell value SHALL revert to oldValue and a toast SHALL be shown. *[Gap: non-Axios error path not fully tested]*

---

### Requirement 6: Row CRUD — Add Row

**ID:** TPG-R6

**User Story:** As a QA engineer, I want the Add Row functionality tested end-to-end, so that the modal form, validation, server creation, grid insertion, and post-add focus behavior are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R6-AC1: WHEN the AddRowModal renders, THEN it SHALL display fields for Last Name, First Name, MI, Date of Birth, Telephone, and Address. *[Covered: AddRowModal.test.tsx]*
2. TPG-R6-AC2: WHEN the AddRowModal renders, THEN Last Name, First Name, and DOB SHALL be marked as required (with * indicator). *[Covered: AddRowModal.test.tsx]*
3. TPG-R6-AC3: WHEN the user submits without a Last Name, THEN a validation error SHALL be displayed. *[Covered: AddRowModal.test.tsx]*
4. TPG-R6-AC4: WHEN the user successfully adds a row, THEN the new row SHALL appear in the grid. *[Covered: add-row.spec.ts (Playwright)]*
5. TPG-R6-AC5: WHEN a new row is added, THEN column sort SHALL be cleared. *[Spec'd in row-operations requirements]*

**Gap — New Tests Required:**

6. TPG-R6-AC6: WHEN a new row is created, THEN its rowOrder SHALL be 0 (all other rows' rowOrder increments). *[Gap: rowOrder assignment not tested]*
7. TPG-R6-AC7: WHEN a new row is added, THEN the Request Type cell SHALL auto-focus and enter edit mode. *[Gap: auto-focus post-add not tested in Vitest. Partially covered in Playwright]*
8. TPG-R6-AC8: WHEN a new row is added, THEN requestType, qualityMeasure, and measureStatus SHALL be null (no defaults). *[Gap: default field values not tested]*
9. TPG-R6-AC9: WHEN a new row is added, THEN the status bar row count SHALL increase by 1. *[Gap: status bar count update not E2E tested for add]*
10. TPG-R6-AC10: WHEN the grid is empty and a new row is added, THEN the row SHALL appear and the grid SHALL transition from the empty state. *[Gap: empty grid add not tested]*
11. TPG-R6-AC11: WHEN the user submits without a Date of Birth, THEN a validation error SHALL be displayed. *[Gap: DOB required validation in modal not tested]*
12. TPG-R6-AC12: WHEN the user submits with an invalid DOB format, THEN a validation error SHALL be displayed. *[Gap: DOB format validation not tested]*
13. TPG-R6-AC13: WHEN the newRowId prop changes on PatientGrid, THEN the grid SHALL find the row node, select it, and startEditingCell on requestType. *[Gap: newRowId effect not unit-tested]*
14. TPG-R6-AC14: WHEN a new row is persisted via POST /api/data, THEN a page refresh SHALL still show the row. *[Gap: persistence after refresh not E2E tested]*

---

### Requirement 7: Row CRUD — Delete Row

**ID:** TPG-R7

**User Story:** As a QA engineer, I want the Delete Row functionality tested end-to-end, so that confirmation, API deletion, grid removal, and status bar update are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R7-AC1: WHEN no row is selected, THEN the Delete button SHALL be disabled. *[Covered: Playwright delete-row.spec.ts]*
2. TPG-R7-AC2: WHEN a row is selected and Delete is clicked, THEN a confirmation modal SHALL appear. *[Covered: Playwright delete-row.spec.ts]*
3. TPG-R7-AC3: WHEN the user confirms deletion, THEN the row SHALL be removed from the grid. *[Covered: Playwright delete-row.spec.ts]*

**Gap — New Tests Required:**

4. TPG-R7-AC4: WHEN the user clicks Cancel on the confirmation modal, THEN the row SHALL remain in the grid. *[Gap: cancel deletion not tested]*
5. TPG-R7-AC5: WHEN a row is deleted, THEN the status bar row count SHALL decrease by 1. *[Gap: status bar count update not tested]*
6. TPG-R7-AC6: WHEN the last row is deleted, THEN the grid SHALL display the empty state with 0 rows. *[Gap: delete last row not tested]*
7. TPG-R7-AC7: WHEN a DELETE /api/data/:id fails with 500, THEN an error message SHALL be shown and the row SHALL remain. *[Gap: server error on delete not tested]*
8. TPG-R7-AC8: WHEN another user deletes a row being viewed, THEN the row SHALL be removed via Socket.IO broadcast with a toast notification. *[Partially covered: parallel-editing-row-operations.cy.ts, but edge cases not tested]*
9. TPG-R7-AC9: WHEN the deleted row was a duplicate, THEN the remaining copy SHALL have its isDuplicate flag cleared. *[Gap: duplicate flag cleanup on delete not E2E tested]*

---

### Requirement 8: Row CRUD — Duplicate Row

**ID:** TPG-R8

**User Story:** As a QA engineer, I want the Duplicate Row functionality tested, so that demographic copying, measure clearing, and grid positioning are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R8-AC1: WHEN no row is selected, THEN the Duplicate button SHALL be disabled. *[Covered: Playwright duplicate-member.spec.ts]*
2. TPG-R8-AC2: WHEN a row is duplicated, THEN the new row SHALL copy memberName, memberDob, phone, and address from the source row. *[Covered: Playwright duplicate-member.spec.ts]*

**Gap — New Tests Required:**

3. TPG-R8-AC3: WHEN a row is duplicated, THEN the new row SHALL have empty requestType, qualityMeasure, and measureStatus. *[Gap: measure clearing not tested]*
4. TPG-R8-AC4: WHEN a row is duplicated, THEN the new row SHALL appear immediately below the source row. *[Gap: row positioning not tested]*
5. TPG-R8-AC5: WHEN a row is duplicated while the grid is sorted, THEN the new row SHALL still appear below the source row and the sort SHALL be cleared. *[Gap: duplicate with active sort not tested]*
6. TPG-R8-AC6: WHEN a row is duplicated, THEN the Request Type cell of the new row SHALL auto-focus. *[Gap: auto-focus after duplicate not tested]*
7. TPG-R8-AC7: WHEN a row is duplicated, THEN the POST /api/data/duplicate endpoint SHALL be called and the response persisted. *[Gap: API call verification not unit-tested]*

---

### Requirement 9: Duplicate Detection

**ID:** TPG-R9

**User Story:** As a QA engineer, I want duplicate detection tested at all layers, so that backend fuzzy matching, frontend visual indicators, creation blocking, and flag synchronization are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R9-AC1: WHEN two rows have the same memberName + memberDob + requestType + qualityMeasure, THEN both SHALL be flagged as isDuplicate=true. *[Covered: duplicateDetector.test.ts]*
2. TPG-R9-AC2: WHEN requestType or qualityMeasure is null/empty, THEN the duplicate check SHALL be skipped. *[Covered: duplicateDetector.test.ts]*
3. TPG-R9-AC3: WHEN a row has isDuplicate=true, THEN the row-status-duplicate CSS class SHALL be applied (orange left border #F97316). *[Covered: PatientGrid.test.tsx, duplicate-detection.cy.ts]*
4. TPG-R9-AC4: WHEN creating a duplicate via Add Row, THEN an error modal SHALL prevent creation. *[Covered: duplicate-detection.cy.ts]*
5. TPG-R9-AC5: WHEN editing creates a duplicate (409), THEN the edited field SHALL reset to null (not revert to old value). *[Covered: useGridCellUpdate.test.ts]*

**Gap — New Tests Required:**

6. TPG-R9-AC6: WHEN an edit creates a duplicate on requestType, THEN downstream fields (qualityMeasure, measureStatus) SHALL also reset to null. *[Covered: useGridCellUpdate.test.ts, but Cypress E2E gap]*
7. TPG-R9-AC7: WHEN one of two duplicate rows is deleted, THEN the remaining row SHALL have isDuplicate set to false. *[Gap: flag removal on delete not E2E tested]*
8. TPG-R9-AC8: WHEN the Duplicates filter chip is clicked, THEN only rows with isDuplicate=true SHALL be visible. *[Covered: duplicate-detection.cy.ts]*
9. TPG-R9-AC9: WHEN no duplicate rows exist, THEN the Duplicates filter chip count SHALL show "(0)". *[Gap: zero-count display not tested]*
10. TPG-R9-AC10: WHEN a row has isDuplicate=true AND a color status (e.g., green), THEN both the orange left border AND the green background SHALL be applied simultaneously (additive). *[Gap: combined duplicate+status color not tested]*
11. TPG-R9-AC11: WHEN the backend updateDuplicateFlags function runs, THEN it SHALL correctly flag all rows matching the duplicate criteria and unflag rows that no longer match. *[Covered: duplicateDetector.test.ts, but edge cases around partial matches not tested]*

---

### Requirement 10: Sorting

**ID:** TPG-R10

**User Story:** As a QA engineer, I want all sorting behaviors tested, so that sort cycles, sort indicators, sort suppression on edit, date comparators, and post-sort row freezing are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R10-AC1: WHEN the user clicks a column header once, THEN the column SHALL sort ascending with a visible sort indicator. *[Covered: sorting-filtering.cy.ts]*
2. TPG-R10-AC2: WHEN the user clicks a column header twice, THEN the column SHALL sort descending. *[Covered: sorting-filtering.cy.ts]*
3. TPG-R10-AC3: WHEN the Status Date column sorts ascending, THEN dates SHALL be in chronological order (not alphabetical). *[Covered: sorting-filtering.cy.ts]*
4. TPG-R10-AC4: WHEN the grid defaultColDef is set, THEN sortable SHALL be true. *[Covered: PatientGrid.test.tsx]*
5. TPG-R10-AC5: WHEN the grid is configured, THEN deltaSort SHALL be false. *[Covered: PatientGrid.test.tsx]*
6. TPG-R10-AC6: WHEN postSortRows is configured, THEN it SHALL be a function passed to AG Grid. *[Covered: PatientGrid.test.tsx]*

**Gap — New Tests Required:**

7. TPG-R10-AC7: WHEN the user clicks a column header a third time, THEN the sort SHALL be cleared (return to original row order). *[Gap: three-click cycle not E2E tested in Cypress]*
8. TPG-R10-AC8: WHEN the user edits a cell value in a sorted column, THEN the row SHALL NOT reposition (stays in place). *[Gap: sort suppression on edit not E2E tested]*
9. TPG-R10-AC9: WHEN the user edits a cell in a sorted column, THEN the sort indicator (arrow) SHALL be removed from the header. *[Gap: sort indicator clearing on edit not E2E tested]*
10. TPG-R10-AC10: WHEN frozenRowOrderRef has a frozen order, THEN postSortRows SHALL reorder nodes to match the frozen order. *[Gap: postSortRows logic not unit-tested]*
11. TPG-R10-AC11: WHEN postSortRows applies a frozen order, THEN it SHALL clear frozenRowOrderRef.current to null afterward. *[Gap: frozen order cleanup not tested]*
12. TPG-R10-AC12: WHEN sorting ascending and some rows have empty Status Date, THEN empty dates SHALL sort to the bottom. *[Gap: null date sort position not tested]*
13. TPG-R10-AC13: WHEN a new row is added while a sort is active, THEN the sort SHALL be cleared and the new row SHALL appear at the top. *[Gap: add row + sort interaction not tested]*
14. TPG-R10-AC14: WHEN Time Interval (Days) column sorts, THEN it SHALL sort numerically (1, 2, 10, 20) NOT alphabetically (1, 10, 2, 20). *[Gap: numeric sort for timeIntervalDays not tested]*
15. TPG-R10-AC15: WHEN sorting persists across filter operations, THEN applying a status filter SHALL maintain the current sort order among visible rows. *[Gap: sort+filter interaction not tested]*

---

### Requirement 11: Version Conflict (409) Resolution

**ID:** TPG-R11

**User Story:** As a QA engineer, I want the entire version conflict flow tested end-to-end, so that expectedVersion checking, ConflictModal rendering, Keep Mine/Keep Theirs/Cancel actions, forceOverwrite, auto-merge, and error recovery are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R11-AC1: WHEN a PUT /api/data/:id includes expectedVersion, THEN the backend SHALL compare it against the current updatedAt in the database. *[Covered: versionCheck.test.ts]*
2. TPG-R11-AC2: WHEN expectedVersion does NOT match updatedAt, THEN the backend SHALL return 409 with VERSION_CONFLICT code, serverRow, conflictFields, and changedBy. *[Covered: versionCheck.test.ts, data.routes.version.test.ts]*
3. TPG-R11-AC3: WHEN a 409 VERSION_CONFLICT is received, THEN the ConflictModal SHALL open with the correct patientName, changedBy, and conflict field details. *[Covered: useGridCellUpdate.test.ts]*
4. TPG-R11-AC4: WHEN the ConflictModal renders, THEN it SHALL display "Edit Conflict" title, field name, Original/Their Version/Your Version columns. *[Covered: ConflictModal.test.tsx]*
5. TPG-R11-AC5: WHEN the ConflictModal renders, THEN three buttons SHALL be available: Keep Mine, Keep Theirs, Cancel. *[Covered: ConflictModal.test.tsx]*
6. TPG-R11-AC6: WHEN Keep Mine is clicked, THEN onKeepMine SHALL be called. *[Covered: ConflictModal.test.tsx]*
7. TPG-R11-AC7: WHEN Keep Theirs is clicked, THEN onKeepTheirs SHALL be called. *[Covered: ConflictModal.test.tsx]*
8. TPG-R11-AC8: WHEN Cancel is clicked, THEN onCancel SHALL be called. *[Covered: ConflictModal.test.tsx]*
9. TPG-R11-AC9: WHEN the backdrop is clicked, THEN onCancel SHALL be called. *[Covered: ConflictModal.test.tsx]*
10. TPG-R11-AC10: WHEN conflict fields have null values, THEN "(empty)" SHALL be displayed. *[Covered: ConflictModal.test.tsx]*
11. TPG-R11-AC11: WHEN multiple fields conflict, THEN all fields SHALL be shown in a single dialog. *[Covered: ConflictModal.test.tsx]*

**Gap — New Tests Required:**

12. TPG-R11-AC12: WHEN the user clicks "Keep Mine", THEN a PUT /api/data/:id with forceOverwrite=true SHALL be sent, and the grid SHALL update with the server response. *[Gap: handleConflictKeepMine end-to-end not tested]*
13. TPG-R11-AC13: WHEN the "Keep Mine" force save fails (e.g., 500), THEN an error toast SHALL be displayed and the save status SHALL show "error". *[Gap: forceOverwrite error path not tested]*
14. TPG-R11-AC14: WHEN the user clicks "Keep Theirs", THEN the grid cell SHALL revert to the serverRow data via node.setData (not setDataValue, to avoid triggering another save). *[Gap: Keep Theirs setData (not setDataValue) behavior not tested]*
15. TPG-R11-AC15: WHEN the user clicks "Cancel", THEN the grid SHALL restore the serverRow data (including fresh updatedAt) to prevent cascading 409s on subsequent edits. *[Gap: Cancel restoring updatedAt not tested]*
16. TPG-R11-AC16: WHEN two users edit DIFFERENT fields of the same row (e.g., User A edits notes, User B edits measureStatus), THEN the backend SHALL auto-merge without a 409 conflict. *[Gap: auto-merge path not tested]*
17. TPG-R11-AC17: WHEN a 404 is returned during a PUT (row deleted by another user), THEN the row SHALL be removed from the grid and a toast SHALL notify the user. *[Covered: useGridCellUpdate.test.ts]*
18. TPG-R11-AC18: WHEN the user edits a row after resolving a conflict with "Keep Theirs", THEN the next PUT SHALL include the fresh updatedAt from the server row (not the stale one). *[Gap: post-resolution version freshness not tested]*
19. TPG-R11-AC19: WHEN a conflict occurs during a cascading update (changing requestType cascades clearing qualityMeasure, measureStatus), THEN the conflict dialog SHALL show all cascaded fields. *[Gap: cascading conflict scenario not tested]*
20. TPG-R11-AC20: WHEN the ConflictModal is open, THEN the user SHALL still be able to scroll the grid behind the modal (modal is non-blocking for viewing). *[Gap: modal non-blocking behavior not tested]*
21. TPG-R11-AC21: WHEN the forceOverwrite flag is set on a PUT request, THEN the backend SHALL bypass the version check and save successfully, AND an audit log entry SHALL record the force-override. *[Gap: forceOverwrite audit logging not tested]*
22. TPG-R11-AC22: WHEN a version conflict occurs immediately after a previous conflict resolution, THEN the system SHALL handle sequential conflicts correctly without state corruption. *[Gap: sequential conflict scenario not tested]*

---

### Requirement 12: Row Class Rules and Status Colors

**ID:** TPG-R12

**User Story:** As a QA engineer, I want the row class rules comprehensively tested, so that all 8 status color mappings, overdue priority, duplicate additive behavior, and chronic diagnosis special cases are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R12-AC1: WHEN a row has a green status (AWV completed, Screening completed, etc.), THEN row-status-green SHALL be applied. *[Covered: PatientGrid.test.tsx]*
2. TPG-R12-AC2: WHEN a row has a blue status (AWV scheduled, HgbA1c ordered, etc.), THEN row-status-blue SHALL be applied. *[Covered: PatientGrid.test.tsx]*
3. TPG-R12-AC3: WHEN a row has a gray status (No longer applicable, etc.), THEN row-status-gray SHALL be applied. *[Covered: PatientGrid.test.tsx]*
4. TPG-R12-AC4: WHEN a row has a purple status (Patient declined, Contraindicated), THEN row-status-purple SHALL be applied. *[Covered: PatientGrid.test.tsx]*
5. TPG-R12-AC5: WHEN a row has a yellow status (Screening discussed, etc.), THEN row-status-yellow SHALL be applied. *[Covered: PatientGrid.test.tsx]*
6. TPG-R12-AC6: WHEN a row has an orange status (Chronic diagnosis resolved/invalid without attestation sent), THEN row-status-orange SHALL be applied. *[Covered: PatientGrid.test.tsx]*
7. TPG-R12-AC7: WHEN a row has chronic diagnosis with tracking1="Attestation sent", THEN row-status-green SHALL be applied (not orange). *[Covered: PatientGrid.test.tsx]*
8. TPG-R12-AC8: WHEN a row has an unmatched status (e.g., "Not Addressed", null, ""), THEN row-status-white SHALL be applied. *[Covered: PatientGrid.test.tsx]*
9. TPG-R12-AC9: WHEN a row has a past due date and an overdue-eligible status, THEN row-status-overdue SHALL take priority over the status color. *[Covered: PatientGrid.test.tsx]*
10. TPG-R12-AC10: WHEN a row has a declined (purple) status with a past due date, THEN row-status-overdue SHALL NOT be applied (purple is immune to overdue). *[Covered: PatientGrid.test.tsx]*
11. TPG-R12-AC11: WHEN a row has a gray status with a past due date, THEN row-status-overdue SHALL NOT be applied (gray is immune to overdue). *[Covered: PatientGrid.test.tsx]*
12. TPG-R12-AC12: WHEN a row has isDuplicate=true, THEN row-status-duplicate SHALL be applied. *[Covered: PatientGrid.test.tsx]*

**Gap — New Tests Required:**

13. TPG-R12-AC13: WHEN a Cypress E2E test changes the measureStatus of a row, THEN the visible background color of the row SHALL change to match the new status color. *[Gap: visual color change after edit not E2E tested]*
14. TPG-R12-AC14: WHEN a row has isDuplicate=true AND a green status, THEN BOTH row-status-duplicate AND row-status-green SHALL be applied simultaneously. *[Gap: combined class application not tested]*
15. TPG-R12-AC15: WHEN a row transitions from overdue (past due date) to completed, THEN the row SHALL change from red to green. *[Gap: color transition not tested]*

---

### Requirement 13: Remote Editing and Parallel Editing Integration

**ID:** TPG-R13

**User Story:** As a QA engineer, I want the remote editing indicators and parallel editing integration tested, so that cell-level edit indicators, remote edit blocking, out-of-order protection, and cascading edit conflicts are verified.

#### Acceptance Criteria

**Existing Coverage (Tested):**

1. TPG-R13-AC1: WHEN another user is editing a cell, THEN the cellClass callback SHALL return "cell-remote-editing" for that specific cell. *[Covered: PatientGrid.test.tsx]*
2. TPG-R13-AC2: WHEN no remote edit matches a cell, THEN the cellClass callback SHALL NOT include "cell-remote-editing". *[Covered: PatientGrid.test.tsx]*
3. TPG-R13-AC3: WHEN a remote edit targets a different row, THEN the cellClass for the current row SHALL NOT include "cell-remote-editing". *[Covered: PatientGrid.test.tsx]*
4. TPG-R13-AC4: WHEN onCellEditingStarted fires, THEN the component SHALL call emitEditingStart with the row ID and field. *[Covered: PatientGrid.test.tsx (callback existence)]*
5. TPG-R13-AC5: WHEN onCellEditingStopped fires, THEN the component SHALL call emitEditingStop with the row ID and field. *[Covered: PatientGrid.test.tsx (callback existence)]*

**Gap — New Tests Required:**

6. TPG-R13-AC6: WHEN a remote row update is received (handleRemoteRowUpdate), THEN the grid SHALL update the row data in place without changing scroll position. *[Gap: handleRemoteRowUpdate not tested]*
7. TPG-R13-AC7: WHEN a remote update has an updatedAt older than or equal to the local row's updatedAt, THEN the update SHALL be discarded (out-of-order protection). *[Gap: out-of-order protection not tested]*
8. TPG-R13-AC8: WHEN a remote update arrives for a row the user is currently editing, THEN the edit SHALL be cancelled and a warning toast SHALL appear. *[Gap: cascading edit conflict on remote update not tested]*
9. TPG-R13-AC9: WHEN a remote row is created (handleRemoteRowCreate), THEN the grid SHALL add the row via applyTransaction. *[Gap: handleRemoteRowCreate not tested]*
10. TPG-R13-AC10: WHEN a remote row create arrives for a row that already exists, THEN it SHALL be ignored (dedup). *[Gap: remote create dedup not tested]*
11. TPG-R13-AC11: WHEN a remote row is deleted (handleRemoteRowDelete), THEN the grid SHALL remove the row and show a toast notification. *[Gap: handleRemoteRowDelete not tested]*
12. TPG-R13-AC12: WHEN a remote delete arrives for a row the user is editing, THEN the edit SHALL be cancelled first. *[Gap: remote delete during edit not tested]*
13. TPG-R13-AC13: WHEN handleDataRefresh is called, THEN it SHALL invoke the onDataRefresh callback. *[Gap: data refresh handler not tested]*

---

## Non-Functional Requirements

### Performance

- TPG-NFR-P1: The grid SHALL render 500 rows in under 2 seconds on a modern browser (measured via Playwright performance timing).
- TPG-NFR-P2: Cell editing start (double-click to cursor visible) SHALL complete in under 300ms.
- TPG-NFR-P3: Auto-save round-trip (cell change to "Saved" indicator) SHALL complete in under 1 second on local network.
- TPG-NFR-P4: Sort operation on 500 rows SHALL complete in under 500ms.

### Security

- TPG-NFR-S1: All PUT /api/data/:id requests SHALL include authentication (401 without valid JWT). *[Covered: data.routes.test.ts]*
- TPG-NFR-S2: Special characters in text fields (Notes, Address) SHALL be safely handled without XSS or SQL injection.
- TPG-NFR-S3: The forceOverwrite flag SHALL only be accepted when accompanied by a valid JWT token (not exploitable by unauthenticated users).

### Reliability

- TPG-NFR-R1: If the API returns an error during auto-save, the grid SHALL remain in a usable state (no frozen UI or lost data).
- TPG-NFR-R2: If Socket.IO disconnects during editing, HTTP-based saves SHALL continue to function.
- TPG-NFR-R3: If a version conflict occurs, the ConflictModal SHALL always present actionable options (no dead-end state).

### Usability

- TPG-NFR-U1: The "Saving..." indicator SHALL be visible for at least 200ms (not flash imperceptibly for fast saves).
- TPG-NFR-U2: The ConflictModal SHALL use human-readable field names ("Measure Status") not technical names ("measureStatus").
- TPG-NFR-U3: Dropdown cells SHALL have a visible hover arrow indicator to distinguish them from text cells.

---

## Edge Cases

### EC-1: Rapid Sequential Edits
**Scenario:** User edits 5 cells in rapid succession (tab-through).
**Expected:** Each edit triggers a separate PUT with the correct expectedVersion. No version conflicts with the user's own edits.
**Test layer:** Cypress E2E

### EC-2: Edit During Active Filter
**Scenario:** Grid is filtered to "Overdue" rows. User edits a cell that changes the row's status to "Completed".
**Expected:** Edit saves successfully. Row may disappear from filtered view (status no longer matches filter).
**Test layer:** Cypress E2E

### EC-3: Concurrent Edit — Same Cell, Two Users
**Scenario:** User A and User B both edit the Notes field of the same row. User A saves first.
**Expected:** User A's save succeeds. User B's save triggers 409. ConflictModal shows both versions.
**Test layer:** Jest (backend version check), Vitest (useGridCellUpdate 409 handler), Playwright (E2E conflict flow)

### EC-4: Concurrent Edit — Different Fields, Same Row
**Scenario:** User A edits Notes. User B edits measureStatus on the same row. Both save.
**Expected:** Auto-merge. No conflict dialog for either user (different fields).
**Test layer:** Jest (versionCheck auto-merge logic)

### EC-5: Edit After "Keep Theirs" Resolution
**Scenario:** User resolves a conflict by choosing "Keep Theirs". Then immediately edits the same cell again.
**Expected:** Next PUT includes the fresh updatedAt from the server row. Save succeeds.
**Test layer:** Vitest (useGridCellUpdate), Cypress E2E

### EC-6: Delete Row While Conflict Modal is Open
**Scenario:** User has ConflictModal open for row #42. Meanwhile, another user deletes row #42.
**Expected:** Row disappears from grid. If user clicks "Keep Mine", the PUT returns 404. Frontend handles gracefully.
**Test layer:** Vitest (mocked scenario)

### EC-7: Force Overwrite Failure
**Scenario:** User clicks "Keep Mine" but the forceOverwrite PUT request fails (500 server error).
**Expected:** Error toast displayed. Grid remains in usable state. ConflictData is cleared.
**Test layer:** Vitest (handleConflictKeepMine error path)

### EC-8: Cascading Edit Creates Version Conflict
**Scenario:** User A changes requestType (cascades clear of qualityMeasure, measureStatus, etc.). The cascading PUT includes expectedVersion. Another user modified the row between load and save.
**Expected:** 409 returned. Conflict dialog shows the cascaded fields.
**Test layer:** Vitest, Jest

### EC-9: Add Row to Empty Grid
**Scenario:** Grid has 0 rows. User clicks "Add Row" and fills form.
**Expected:** Row appears as the only row. Status bar shows "1 row".
**Test layer:** Playwright E2E

### EC-10: Sort Three-Click Cycle with Date Column
**Scenario:** User clicks Status Date header 3 times in succession.
**Expected:** Ascending -> Descending -> Cleared (original order).
**Test layer:** Cypress E2E

### EC-11: Duplicate Detection After Delete
**Scenario:** Two duplicate rows exist (Row A and Row B). User deletes Row A.
**Expected:** Row B's isDuplicate flag becomes false. Orange left border is removed.
**Test layer:** Cypress E2E, Jest (backend duplicate flag sync)

### EC-12: Time Interval Validation Boundary
**Scenario:** User enters 0, -1, 1001, "abc", or empty string in Time Interval (Days).
**Expected:** All rejected with validation alert. Cell reverts to previous value.
**Test layer:** Vitest (valueSetter), Cypress E2E

### EC-13: Remote Update Out-of-Order
**Scenario:** Two remote updates for the same row arrive. The second-emitted update arrives first.
**Expected:** Both are applied if timestamps are ascending. If the older one arrives second, it is discarded.
**Test layer:** Vitest (handleRemoteRowUpdate)

### EC-14: Phone Number Edge Cases
**Scenario:** Phone number has 7 digits, 11 digits, or non-numeric characters.
**Expected:** Non-10-digit numbers display as-is (no formatting). 10-digit numbers format as (XXX) XXX-XXXX.
**Test layer:** Vitest (formatPhone)

---

## Assumptions and Constraints

### Assumptions

- ASM-1: The existing test infrastructure (Jest, Vitest, Cypress, Playwright) is functional and all current tests pass before new tests are written.
- ASM-2: Test data (seed data) is available in the development database for Cypress and Playwright E2E tests.
- ASM-3: The backend API endpoints (GET /api/data, PUT /api/data/:id, POST /api/data, DELETE /api/data/:id, POST /api/data/duplicate) are stable and will not change during test writing.
- ASM-4: AG Grid v31 Community Edition APIs (getRowNode, applyTransaction, setData, startEditingCell, etc.) are available and behave as documented.
- ASM-5: Mocking AG Grid in Vitest tests (via vi.mock('ag-grid-react')) provides sufficient access to captured props for column definition and configuration testing.

### Constraints

- CON-1: Vitest tests cannot test AG Grid rendering or interaction directly (AG Grid requires a real DOM). AG Grid-specific interaction tests must use Cypress or Playwright.
- CON-2: Cypress is required for AG Grid dropdown selection (Playwright cannot commit AG Grid select editor selections).
- CON-3: Jest backend tests use ESM with `--experimental-vm-modules` and `jest.unstable_mockModule`, which limits mock flexibility compared to CommonJS.
- CON-4: The ConflictModal E2E flow requires two concurrent sessions, which is complex to set up in Cypress. Playwright with multiple browser contexts is preferred for multi-user conflict scenarios.
- CON-5: Performance tests (NFR-P1 through NFR-P4) require a running application and are best implemented as Playwright tests with timing assertions, not unit tests.

---

## Coverage Gap Summary

### High-Priority Gaps (Untested Critical Paths)

| Gap ID | Description | Proposed Layer | Req ID |
|--------|-------------|----------------|--------|
| GAP-01 | handleConflictKeepMine — forceOverwrite PUT, grid update, error path | Vitest | TPG-R11-AC12, AC13 |
| GAP-02 | handleConflictKeepTheirs — setData (not setDataValue), updatedAt freshness | Vitest | TPG-R11-AC14 |
| GAP-03 | handleConflictCancel — serverRow restoration including updatedAt | Vitest | TPG-R11-AC15 |
| GAP-04 | handleRemoteRowUpdate — out-of-order protection, cascading edit cancellation | Vitest | TPG-R13-AC6-AC8 |
| GAP-05 | handleRemoteRowCreate/Delete — dedup, edit cancellation | Vitest | TPG-R13-AC9-AC12 |
| GAP-06 | Sort suppression on edit — frozen row order, indicator clearing | Vitest + Cypress | TPG-R10-AC8-AC11 |
| GAP-07 | Auto-merge for non-overlapping fields | Jest | TPG-R11-AC16 |
| GAP-08 | Sequential conflict resolution (conflict after conflict) | Vitest | TPG-R11-AC22 |
| GAP-09 | Post-conflict edit version freshness | Vitest + Cypress | TPG-R11-AC18, EC-5 |
| GAP-10 | forceOverwrite audit logging | Jest | TPG-R11-AC21 |

### Medium-Priority Gaps (Untested Important Behaviors)

| Gap ID | Description | Proposed Layer | Req ID |
|--------|-------------|----------------|--------|
| GAP-11 | Column width values not asserted | Vitest | TPG-R1-AC13 |
| GAP-12 | Phone formatting (10-digit, non-10-digit) | Vitest | TPG-R1-AC14-AC15 |
| GAP-13 | cellEditorParams callbacks (dynamic dropdown population) | Vitest | TPG-R2-AC8-AC9 |
| GAP-14 | cellEditorSelector logic (tracking1, tracking2 editor selection) | Vitest | TPG-R2-AC10-AC13 |
| GAP-15 | valueGetter/valueSetter null-to-empty and empty-to-null conversion | Vitest | TPG-R2-AC14-AC15 |
| GAP-16 | Date format variants (M/D/YY, M.D.YYYY, YYYY-MM-DD) in valueSetter | Vitest | TPG-R3-AC7-AC9 |
| GAP-17 | Custom date comparators (null date sort position) | Vitest | TPG-R3-AC13-AC14 |
| GAP-18 | timeIntervalDays validation (boundary, non-numeric) | Vitest | TPG-R4-AC11-AC14 |
| GAP-19 | isTimeIntervalEditable logic (TIME_PERIOD_DROPDOWN_STATUSES) | Vitest | TPG-R4-AC14 |
| GAP-20 | Tab navigation between cells (E2E) | Cypress | TPG-R4-AC8 |

### Low-Priority Gaps (Edge Cases and Polish)

| Gap ID | Description | Proposed Layer | Req ID |
|--------|-------------|----------------|--------|
| GAP-21 | Add row to empty grid | Playwright | EC-9 |
| GAP-22 | Delete last row | Playwright | TPG-R7-AC6 |
| GAP-23 | Edit during active filter | Cypress | EC-2 |
| GAP-24 | Three-click sort cycle E2E | Cypress | TPG-R10-AC7 |
| GAP-25 | Duplicate + sort interaction | Cypress | TPG-R8-AC5 |
| GAP-26 | Very long text in Notes | Cypress | TPG-R4-AC10 |
| GAP-27 | Special characters in text fields | Cypress | TPG-R4-AC9 |
| GAP-28 | Row count in status bar after add/delete | Cypress | TPG-R6-AC9, TPG-R7-AC5 |
| GAP-29 | Grid virtualization (100+ rows) | Cypress | TPG-R1-AC16 |
| GAP-30 | Dropdown arrow rendering vs plain text rendering | Vitest | TPG-R2-AC17-AC18 |

---

## Proposed New Test Count Estimate

| Framework | Existing Tests | New Tests (to fill gaps) | Total |
|-----------|---------------|--------------------------|-------|
| Vitest | ~137 (grid-related) | ~55 | ~192 |
| Jest | ~113 (data/version/duplicate) | ~12 | ~125 |
| Cypress | ~106 (cell/sort/dup/parallel) | ~20 | ~126 |
| Playwright | ~28 (add/delete/dup/conflict) | ~8 | ~36 |
| **Total** | **~384** | **~95** | **~479** |

---

## Coverage Matrix (Post-Analysis)

This section maps every testable behavior category to its coverage status across all 4 test layers. Coverage is rated as:
- **FULL**: All significant behaviors tested with assertions
- **PARTIAL**: Some behaviors tested but key scenarios missing
- **NONE**: No automated tests exist for this behavior

### Category 1: Cell Editing (Inline Edit, Dropdown, Date, Free Text)

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Dropdown single-click opens editor | PatientGrid.test (config) | -- | cell-editing.cy | -- | FULL |
| Dropdown option rendering & selection | AutoOpenSelectEditor.test (22) | -- | cascading-dropdowns.cy | -- | FULL |
| Dropdown keyboard nav (arrow, enter, tab, escape) | AutoOpenSelectEditor.test (8) | -- | -- | -- | FULL (Vitest only) |
| Dropdown type-ahead search | AutoOpenSelectEditor.test (1) | -- | -- | -- | FULL (Vitest only) |
| Date MM/DD/YYYY input | DateCellEditor.test (4) | -- | cell-editing.cy (1) | -- | FULL |
| Date M/D/YY short format | -- | -- | cell-editing.cy (1) | -- | PARTIAL (no Vitest valueSetter test) |
| Date M.D.YYYY dot format | -- | -- | cell-editing.cy (1) | -- | PARTIAL (no Vitest valueSetter test) |
| Date YYYY-MM-DD ISO format | -- | -- | cell-editing.cy (1) | -- | PARTIAL (no Vitest valueSetter test) |
| Date invalid input rejection | DateCellEditor.test (basic) | -- | cell-editing.cy (2) | -- | FULL |
| Date clearing to null (statusDate) | -- | -- | cell-editing.cy (1) | -- | PARTIAL (no Vitest valueSetter test) |
| DOB required — cannot be empty | -- | -- | -- | -- | **NONE** |
| Text double-click edit (notes/memberName) | -- | -- | cell-editing.cy (4) | -- | FULL (Cypress) |
| Text save on Enter | -- | -- | cell-editing.cy (1) | -- | FULL |
| Text save on blur (click elsewhere) | -- | -- | cell-editing.cy (1) | -- | FULL |
| Tab navigation between cells | -- | -- | -- | -- | **NONE** |
| Special characters in text fields | -- | -- | -- | -- | **NONE** |
| Long text in notes (1000+ chars) | -- | -- | -- | -- | **NONE** |
| timeIntervalDays validation (1-1000) | -- | -- | -- | -- | **NONE** |
| timeIntervalDays non-numeric rejection | -- | -- | -- | -- | **NONE** |
| timeIntervalDays non-editable for TIME_PERIOD_DROPDOWN statuses | -- | -- | -- | -- | **NONE** |

### Category 2: Dropdown Cascading Dependencies

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| requestType change clears downstream | cascadingFields.test (7) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| AWV auto-fills qualityMeasure | cascadingFields.test (1) | -- | cascading-dropdowns.cy (1) | -- | FULL |
| Chronic DX auto-fills qualityMeasure | cascadingFields.test (1) | -- | cascading-dropdowns.cy (1) | -- | FULL |
| Quality/Screening clears qualityMeasure | cascadingFields.test (2) | -- | cascading-dropdowns.cy | -- | FULL |
| qualityMeasure change clears downstream | cascadingFields.test (3) | -- | cascading-dropdowns.cy (1) | -- | FULL |
| measureStatus change clears downstream | cascadingFields.test (3) | -- | cascading-dropdowns.cy (1) | -- | FULL |
| cellEditorParams dynamic QM population | -- | -- | cascading-dropdowns.cy (implicit) | -- | PARTIAL (no Vitest unit test) |
| cellEditorParams dynamic MS population | -- | -- | cascading-dropdowns.cy (implicit) | -- | PARTIAL (no Vitest unit test) |
| cellEditorSelector tracking1 dropdown vs text | -- | -- | cascading-dropdowns.cy (yes) | -- | PARTIAL (no Vitest unit test) |
| cellEditorSelector tracking2 HgbA1c months | -- | -- | cascading-dropdowns.cy (1) | -- | PARTIAL (no Vitest unit test) |
| cellEditorSelector tracking2 BP free text | -- | -- | cascading-dropdowns.cy (1) | -- | PARTIAL (no Vitest unit test) |
| valueGetter null-to-empty conversion | -- | -- | -- | -- | **NONE** |
| valueSetter empty-to-null conversion | -- | -- | -- | -- | **NONE** |
| dropdownCellRenderer shows arrow indicator | -- | -- | -- | -- | **NONE** |
| dropdownCellRenderer shows plain text for non-dropdown | -- | -- | -- | -- | **NONE** |
| Remote edit blocks dropdown open | -- | -- | -- | -- | **NONE** |

### Category 3: Auto-Save Pipeline (onCellValueChanged)

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| PUT called with correct payload + expectedVersion | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| applyCascadingUpdates called | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| node.setData on success | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| Save status: saving -> saved -> idle (2s) | useGridCellUpdate.test (2) | -- | cell-editing.cy (3) | -- | FULL |
| No-op when newValue === oldValue | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| No-op when data undefined | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| No-op when colDef.field empty | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| No-op when isCascadingUpdate true | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| Query params in API URL | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| Revert to oldValue on 500 error | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| Sort freeze on edit (capture order + clear sort indicator) | -- | -- | sorting-filtering.cy (3) | -- | PARTIAL (no Vitest unit test) |
| gridApi.redrawRows after success | -- | -- | -- | -- | **NONE** (assertion missing in Vitest) |
| node.setSelected(true) after success | -- | -- | -- | -- | **NONE** (assertion missing in Vitest) |
| onRowUpdated called after success | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| isCascadingUpdateRef reset in finally | useGridCellUpdate.test (1) | -- | -- | -- | FULL |
| Rapid sequential edits version tracking | -- | -- | -- | -- | **NONE** |
| Non-Axios error revert | useGridCellUpdate.test (partial) | -- | -- | -- | PARTIAL |

### Category 4: 409 Conflict Resolution

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Backend version check (expectedVersion) | -- | versionCheck.test (12), data.routes.version.test (6) | -- | -- | FULL |
| 409 response with VERSION_CONFLICT code | -- | data.routes.version.test (1) | -- | -- | FULL |
| ConflictModal renders with title/fields/buttons | ConflictModal.test (14) | -- | -- | -- | FULL |
| Frontend detects 409 and opens modal | useGridCellUpdate.test (1) | -- | cell-editing-conflict.cy (1) | -- | FULL |
| Keep Mine sends forceOverwrite PUT | -- | -- | cell-editing-conflict.cy (1) | -- | FULL |
| Keep Mine error (500 on forceOverwrite) | -- | -- | cell-editing-conflict.cy (1) | -- | FULL |
| Keep Theirs reverts to server value | -- | -- | cell-editing-conflict.cy (1) | -- | PARTIAL (no Vitest test for setData vs setDataValue) |
| Cancel restores server row + updatedAt | -- | -- | cell-editing-conflict.cy (1) | -- | PARTIAL (no Vitest test) |
| Next edit after Keep Theirs uses fresh updatedAt | -- | -- | cell-editing-conflict.cy (1) | -- | PARTIAL (no Vitest test) |
| Multi-field conflict shows all fields | -- | -- | cell-editing-conflict.cy (1) | -- | FULL |
| Conflict resolution as Physician | -- | -- | cell-editing-conflict.cy (1) | -- | FULL |
| forceOverwrite bypass version check | -- | data.routes.version.test (1) | -- | -- | FULL |
| forceOverwrite audit log | -- | data.routes.version.test (1) | -- | -- | FULL |
| Auto-merge non-overlapping fields | -- | data.routes.version.test (1) | -- | -- | FULL |
| handleConflictKeepMine (full lifecycle in Vitest) | -- | -- | -- | -- | **NONE** (only Cypress) |
| handleConflictKeepTheirs (setData not setDataValue) | -- | -- | -- | -- | **NONE** |
| handleConflictCancel (restore updatedAt) | -- | -- | -- | -- | **NONE** |
| Sequential conflicts (conflict after conflict) | -- | -- | -- | -- | **NONE** |
| 404 during conflict resolution | -- | -- | -- | -- | **NONE** |
| ConflictModal non-blocking scroll | -- | -- | -- | -- | **NONE** |

### Category 5: Row Operations (Add/Delete/Duplicate)

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| AddRowModal renders fields (Last, First, MI, DOB, Phone, Address) | AddRowModal.test (6) | -- | -- | -- | FULL |
| AddRowModal required field validation (Last, First, DOB) | AddRowModal.test (5) | -- | -- | -- | FULL |
| AddRowModal name concatenation | AddRowModal.test (4) | -- | -- | -- | FULL |
| AddRowModal form submission + reset | AddRowModal.test (3) | -- | -- | -- | FULL |
| Add row E2E — row appears in grid | -- | -- | row-operations.cy (1) | add-row.spec.ts (PW) | FULL |
| New row has null requestType/QM/MS | -- | -- | row-operations.cy (1) | -- | FULL |
| Delete button disabled when no selection | -- | -- | row-operations.cy (1) | delete-row.spec.ts (PW) | FULL |
| Delete confirmation modal | -- | -- | row-operations.cy (1) | delete-row.spec.ts (PW) | FULL |
| Cancel delete preserves row | -- | -- | row-operations.cy (1) | -- | FULL |
| Add/delete as Staff | -- | -- | row-operations.cy (1) | -- | FULL |
| Duplicate row copies demographics | -- | -- | -- | duplicate-member.spec.ts (PW) | FULL |
| Duplicate button disabled when no selection | -- | -- | -- | duplicate-member.spec.ts (PW) | FULL |
| New row auto-focus requestType cell | -- | -- | -- | -- | **NONE** (newRowId effect untested) |
| New row rowOrder = 0 | -- | -- | -- | -- | **NONE** |
| Duplicate clears measures (RT/QM/MS) | -- | -- | -- | -- | **NONE** |
| Duplicate row positioning below source | -- | -- | -- | -- | **NONE** |
| Delete last row shows empty state | -- | -- | -- | -- | **NONE** |
| Delete error (500) shows error + preserves row | -- | -- | -- | -- | **NONE** |
| DOB format validation in AddRowModal | -- | -- | -- | -- | **NONE** |
| Add row to empty grid | -- | -- | -- | -- | **NONE** |

### Category 6: Duplicate Detection

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Backend: same patient+RT+QM = duplicate | -- | duplicateDetector.test (12) | -- | -- | FULL |
| Backend: null/empty RT or QM = never duplicate | -- | duplicateDetector.test (8) | -- | -- | FULL |
| Backend: different patients = not duplicate | -- | duplicateDetector.test (1) | -- | -- | FULL |
| Backend: updateDuplicateFlags per patient | -- | duplicateDetector.test (8) | -- | -- | FULL |
| Backend: syncAllDuplicateFlags global | -- | duplicateDetector.test (2) | -- | -- | FULL |
| Backend: deletion clears flag on remaining | -- | duplicateDetector.test (1) | -- | -- | FULL |
| Backend: 3-way duplicate, delete one leaves 2 flagged | -- | duplicateDetector.test (1) | -- | -- | FULL |
| Backend: whitespace-padded requestType | -- | duplicateDetector.test (1) | -- | -- | FULL |
| Backend: QM edit from match to non-match | -- | duplicateDetector.test (1) | -- | -- | FULL |
| Frontend: row-status-duplicate CSS class | PatientGrid.test (1) | -- | duplicate-detection.cy (3) | -- | FULL |
| Frontend: 409 duplicate resets to null | useGridCellUpdate.test (2) | -- | duplicate-detection.cy (2) | -- | FULL |
| Duplicates filter chip with count | -- | -- | duplicate-detection.cy (2) | -- | FULL |
| Duplicate flag cleared when fields changed | -- | -- | duplicate-detection.cy (1) | -- | FULL |
| Null fields never flagged as duplicate | -- | -- | duplicate-detection.cy (3) | -- | FULL |
| Duplicate + status color combined | -- | -- | duplicate-detection.cy (2) | -- | FULL |
| Duplicate count shows "(0)" when none | -- | -- | -- | -- | **NONE** |
| Delete one of pair clears flag (E2E) | -- | -- | -- | -- | **NONE** |

### Category 7: Sorting

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Ascending sort on 1st click | -- | -- | sorting-filtering.cy (5) | -- | FULL |
| Descending sort on 2nd click | -- | -- | sorting-filtering.cy (3) | -- | FULL |
| Clear sort on 3rd click | -- | -- | sorting-filtering.cy (1) | -- | FULL |
| Status Date chronological sort | -- | -- | sorting-filtering.cy (1) | -- | FULL |
| Sort indicator cleared on edit | -- | -- | sorting-filtering.cy (3) | -- | FULL |
| Row stays in place after edit | -- | -- | sorting-filtering.cy (3) | -- | FULL |
| defaultColDef.sortable = true | PatientGrid.test (1) | -- | -- | -- | FULL |
| deltaSort = false | PatientGrid.test (1) | -- | -- | -- | FULL |
| postSortRows callback provided | PatientGrid.test (1) | -- | -- | -- | FULL |
| postSortRows frozen order logic | -- | -- | -- | -- | **NONE** (unit test) |
| postSortRows clears frozen ref after apply | -- | -- | -- | -- | **NONE** (unit test) |
| Null date sort position (end) | -- | -- | sorting-filtering.cy (2) | -- | FULL (Cypress) |
| timeIntervalDays numeric sort | -- | -- | sorting-filtering.cy (1) | -- | FULL |
| Add row clears sort | -- | -- | -- | -- | **NONE** |
| Sort + filter interaction | -- | -- | sorting-filtering.cy (2) | -- | FULL |

### Category 8: Column Display & Configuration

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| 13 column definitions | PatientGrid.test (2) | -- | -- | -- | FULL |
| Correct header names | PatientGrid.test (1) | -- | -- | -- | FULL |
| requestType + memberName pinned left | PatientGrid.test (1) | -- | -- | -- | FULL |
| headerTooltip on all columns | PatientGrid.test (1) | -- | -- | -- | FULL |
| Member info columns hidden by default | PatientGrid.test (1) | -- | -- | -- | FULL |
| Member info columns visible when toggled | PatientGrid.test (1) | -- | -- | -- | FULL |
| DOB masked as "###" | PatientGrid.test (2) | -- | -- | -- | FULL |
| notes flex=1 | PatientGrid.test (1) | -- | -- | -- | FULL |
| ag-theme-alpine container | PatientGrid.test (1) | -- | -- | -- | FULL |
| getRowId returns string(data.id) | PatientGrid.test (1) | -- | -- | -- | FULL |
| Column widths (130, 180, etc.) | -- | -- | -- | -- | **NONE** |
| Phone (XXX) XXX-XXXX formatting (10-digit) | -- | -- | -- | -- | **NONE** |
| Phone non-10-digit passthrough | -- | -- | -- | -- | **NONE** |
| insuranceGroup field in GridRow | -- | -- | -- | -- | **NONE** |
| Cypress row count verification | -- | -- | -- | -- | **NONE** |
| Grid virtualization (100+ rows) | -- | -- | -- | -- | **NONE** |

### Category 9: Row Class Rules & Status Colors

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Green (completed) | PatientGrid.test (1) | -- | cascading-dropdowns.cy (5) | -- | FULL |
| Blue (in-progress) | PatientGrid.test (1) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| Gray (N/A) | PatientGrid.test (1) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| Purple (declined) | PatientGrid.test (1) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| Yellow (discussed) | PatientGrid.test (1) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| Orange (chronic DX no attestation) | PatientGrid.test (2) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| Green for chronic DX + attestation sent | PatientGrid.test (2) | -- | cascading-dropdowns.cy (2) | -- | FULL |
| White (unmatched/null/"") | PatientGrid.test (1) | -- | -- | -- | FULL |
| Overdue priority over colors | PatientGrid.test (2) | -- | sorting-filtering.cy (2) | -- | FULL |
| Declined immune to overdue | PatientGrid.test (1) | -- | sorting-filtering.cy (1) | -- | FULL |
| Gray immune to overdue | PatientGrid.test (1) | -- | -- | -- | FULL |
| Duplicate class (isDuplicate) | PatientGrid.test (1) | -- | duplicate-detection.cy (3) | -- | FULL |
| Visual color change after measureStatus edit (E2E) | -- | -- | cascading-dropdowns.cy (yes) | -- | FULL |
| Combined duplicate + green | -- | -- | duplicate-detection.cy (1) | -- | PARTIAL |
| Color transition overdue -> completed | -- | -- | -- | -- | **NONE** |

### Category 10: Toolbar Buttons & Save Indicator

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| 4 buttons render | Toolbar.test (1) | -- | -- | -- | FULL |
| Add Row always enabled | Toolbar.test (1) | -- | -- | -- | FULL |
| Delete disabled when canDelete=false | Toolbar.test (1) | -- | row-operations.cy (1) | -- | FULL |
| Delete enabled when canDelete=true | Toolbar.test (1) | -- | row-operations.cy (1) | -- | FULL |
| Duplicate disabled/enabled | Toolbar.test (2) | -- | -- | -- | FULL |
| Member Info toggle visual state | Toolbar.test (1) | -- | -- | -- | FULL |
| Save indicator: idle (nothing) | Toolbar.test (1) | -- | -- | -- | FULL |
| Save indicator: saving | Toolbar.test (1) | -- | -- | -- | FULL |
| Save indicator: saved | Toolbar.test (1) | -- | -- | -- | FULL |
| Save indicator: error | Toolbar.test (1) | -- | -- | -- | FULL |
| All 4 buttons enabled simultaneously | Toolbar.test (1) | -- | -- | -- | FULL |
| Delete click does nothing when disabled | Toolbar.test (1) | -- | -- | -- | FULL |

### Category 11: Remote/Parallel Editing

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| cellClass "cell-remote-editing" when active edit matches | PatientGrid.test (1) | -- | parallel-editing-edit-indicators.cy | -- | FULL |
| cellClass not applied when no match | PatientGrid.test (2) | -- | -- | -- | FULL |
| onCellEditingStarted emits | PatientGrid.test (1) | -- | -- | -- | PARTIAL (callback exists, no emit test) |
| onCellEditingStopped emits | PatientGrid.test (1) | -- | -- | -- | PARTIAL |
| handleRemoteRowUpdate (setData + redraw) | -- | -- | parallel-editing-grid-updates.cy | -- | PARTIAL (no Vitest unit test) |
| Out-of-order protection (discard older update) | -- | -- | -- | -- | **NONE** |
| Remote update cancels active edit | -- | -- | -- | -- | **NONE** |
| handleRemoteRowCreate (applyTransaction + dedup) | -- | -- | -- | -- | **NONE** |
| handleRemoteRowDelete (remove + toast) | -- | -- | -- | -- | **NONE** |
| Remote delete cancels active edit | -- | -- | -- | -- | **NONE** |
| handleDataRefresh | -- | -- | -- | -- | **NONE** |

### Category 12: Role-Based Editing Permissions

| Behavior | Vitest | Jest | Cypress | Playwright | Status |
|----------|--------|------|---------|------------|--------|
| Admin can edit requestType dropdown | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Admin can edit notes text | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Physician can edit measureStatus | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Physician can edit memberName | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Staff can edit requestType | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Staff can edit notes | -- | -- | grid-editing-roles.cy (1) | -- | FULL |
| Physician selector (Admin sees all) | -- | -- | role-access-control.cy | -- | FULL |
| Staff sees assigned physicians only | -- | -- | role-access-control.cy | -- | FULL |

---

## Gap Analysis (Post-Analysis)

### Summary: Tasks.md Coverage vs. Actual State

The tasks.md file describes 5 implementation tasks (T1-1 through T2-2) totaling 27 tests. After analysis of the actual codebase, **all 27 tasks.md tests have been implemented and exist in the codebase**:

| Task | File | Tests Planned | Tests Found | Status |
|------|------|--------------|-------------|--------|
| T1-1 | `cell-editing-conflict.cy.ts` | 8 | 8 | DONE |
| T1-2 | `row-operations.cy.ts` | 6 | 6 | DONE |
| T1-3 | `Toolbar.test.tsx` (Edge cases) | 3 | 3 | DONE |
| T2-1 | `duplicateDetector.test.ts` (Deletion edge cases) | 4 | 4 | DONE |
| T2-2 | `grid-editing-roles.cy.ts` | 6 | 6 | DONE |

### Remaining Gaps Not Addressed by Tasks.md

The following gaps from the Coverage Gap Summary (GAP-01 through GAP-30) remain untested even after the 27 tasks.md tests. These are organized by priority.

#### HIGH PRIORITY — Untested Critical Business Logic (Vitest)

| Gap ID | Description | Req ID | Proposed Framework | Why Critical |
|--------|-------------|--------|-------------------|-------------|
| GAP-01a | `handleConflictKeepMine` — forceOverwrite PUT lifecycle, grid update, error path | TPG-R11-AC12, AC13 | Vitest | Only tested in Cypress (network-mocked). No Vitest unit test for the `useCallback` function in PatientGrid.tsx. |
| GAP-02 | `handleConflictKeepTheirs` — uses `setData` (not `setDataValue`) to avoid triggering additional onCellValueChanged | TPG-R11-AC14 | Vitest | Prevents cascading 409s. Only Cypress covers "Keep Theirs" but doesn't verify setData vs setDataValue. |
| GAP-03 | `handleConflictCancel` — restores server row including fresh `updatedAt` | TPG-R11-AC15 | Vitest | Without restoring updatedAt, all future edits fail with VERSION_CONFLICT. |
| GAP-04 | `handleRemoteRowUpdate` — out-of-order protection (discard older update) | TPG-R13-AC7 | Vitest | Source code has `new Date(row.updatedAt) <= new Date(localUpdatedAt)` guard. Zero tests. |
| GAP-05a | `handleRemoteRowCreate` — dedup check (skip if row already exists) | TPG-R13-AC9, AC10 | Vitest | Source code has `if (existing) return`. Zero tests. |
| GAP-05b | `handleRemoteRowDelete` — cancel active edit + remove + toast | TPG-R13-AC11, AC12 | Vitest | Source code stops editing if user is editing the deleted row. Zero tests. |
| GAP-08 | Sequential conflict resolution (conflict immediately after resolving a previous conflict) | TPG-R11-AC22 | Vitest | State corruption risk — conflictData clearing must be verified. |

#### MEDIUM PRIORITY — Untested Functional Behaviors (Vitest + Cypress)

| Gap ID | Description | Req ID | Proposed Framework | Why Important |
|--------|-------------|--------|-------------------|--------------|
| GAP-06a | `postSortRows` frozen order logic (reorder nodes then clear ref) | TPG-R10-AC10, AC11 | Vitest | Cypress tests sort suppression end-to-end, but the postSortRows callback logic is not unit-tested. |
| GAP-11 | Column width values not asserted (requestType:130, memberName:180, etc.) | TPG-R1-AC13 | Vitest | Regressions could shrink columns. Easy to add. |
| GAP-12 | Phone number formatting — 10-digit `(XXX) XXX-XXXX` + non-10-digit passthrough | TPG-R1-AC14, AC15 | Vitest | `formatPhone` function exists in PatientGrid.tsx but zero tests. |
| GAP-13 | `cellEditorParams` callbacks for qualityMeasure and measureStatus columns | TPG-R2-AC8, AC9 | Vitest | The params are functions `(params) => ({values: getQMForRT(...)})`. Not unit-tested. |
| GAP-14 | `cellEditorSelector` for tracking1 (dropdown vs text) and tracking2 (HgbA1c months vs BP text) | TPG-R2-AC10-AC13 | Vitest | The selector logic chooses between AutoOpenSelectEditor and agTextCellEditor. Not unit-tested. |
| GAP-15 | `valueGetter` null-to-empty and `valueSetter` empty-to-null for dropdown columns | TPG-R2-AC14, AC15 | Vitest | Conversion logic exists in column defs. No isolated tests. |
| GAP-16 | Date valueSetter for M/D/YY, M.D.YYYY, YYYY-MM-DD formats | TPG-R3-AC7-AC9 | Vitest | Cypress tests these formats E2E. No Vitest unit test for the `valueSetter` function itself. |
| GAP-17 | Custom date comparators: null dates sort to end | TPG-R3-AC13, AC14 | Vitest | `comparator` functions exist in statusDate and dueDate column defs. Not unit-tested. |
| GAP-18 | `timeIntervalDays` valueSetter: validates 1-1000, rejects non-numeric | TPG-R4-AC11-AC13 | Vitest | Source code at line 877-888 shows validation. Zero tests. |
| GAP-19 | `isTimeIntervalEditable` function: returns false for TIME_PERIOD_DROPDOWN_STATUSES | TPG-R4-AC14 | Vitest | Function exists at line 51-67. Not unit-tested. |
| GAP-20 | Tab navigation between editable cells (E2E) | TPG-R4-AC8 | Cypress | Tab key pressing to move between cells. |
| GAP-30 | `dropdownCellRenderer` shows arrow for dropdown cells, plain text for non-dropdown | TPG-R2-AC17, AC18 | Vitest | `dropdownCellRenderer` callback at line 472-488. Not tested. |
| GAP-5c | `handleRemoteRowUpdate` cancels active edit when remote update affects same cell | TPG-R13-AC8 | Vitest | Source code at line 206-222 has `gridApi.stopEditing(true)` + toast. Not tested. |

#### LOW PRIORITY — Edge Cases & Polish

| Gap ID | Description | Req ID | Proposed Framework |
|--------|-------------|--------|-------------------|
| GAP-21 | Add row to empty grid (0 rows -> 1 row) | EC-9 | Playwright |
| GAP-22 | Delete last row (1 row -> 0 rows, empty state) | TPG-R7-AC6 | Playwright |
| GAP-23 | Edit during active filter (row may disappear from filtered view) | EC-2 | Cypress |
| GAP-25 | Duplicate row while grid is sorted (sort cleared, row below source) | TPG-R8-AC5 | Cypress |
| GAP-26 | Very long text in Notes (1000+ characters) | TPG-R4-AC10 | Cypress |
| GAP-27 | Special characters in text fields (quotes, angle brackets) | TPG-R4-AC9 | Cypress |
| GAP-28 | Status bar row count after add/delete | TPG-R6-AC9, TPG-R7-AC5 | Cypress |
| GAP-29 | Grid virtualization (100+ rows not all in DOM) | TPG-R1-AC16 | Cypress |
| GAP-09 | Post-conflict edit version freshness (after "Keep Theirs") | TPG-R11-AC18 | Vitest |
| GAP-5d | `handleDataRefresh` invokes onDataRefresh callback | TPG-R13-AC13 | Vitest |
| GAP-R1-18 | `insuranceGroup` field presence in GridRow interface | TPG-R1-AC18 | Vitest |
| GAP-R3-15 | cellClass for statusDate prompt includes "stripe-overlay" + "cell-prompt" | TPG-R3-AC15 | Vitest |
| GAP-R7-7 | DELETE /api/data/:id returns 500 — error shown, row preserved | TPG-R7-AC7 | Cypress |
| GAP-R9-9 | Duplicates filter chip shows "(0)" when no duplicates | TPG-R9-AC9 | Cypress |
| GAP-R12-15 | Row transitions from overdue (red) to completed (green) | TPG-R12-AC15 | Cypress |
| GAP-R6-13 | newRowId effect — selects row, starts editing requestType | TPG-R6-AC13 | Vitest |

---

## Proposed New Tests (Post-Analysis)

### HIGH PRIORITY — 14 tests

| # | Test Name | Framework | Target File | Req ID | Description |
|---|-----------|-----------|-------------|--------|-------------|
| 1 | `handleConflictKeepMine sends forceOverwrite PUT and updates grid` | Vitest | `PatientGrid.test.tsx` or new `useConflictResolution.test.ts` | TPG-R11-AC12 | Render PatientGrid with conflictData. Simulate handleConflictKeepMine. Assert: api.put called with forceOverwrite=true, node.setData called with response, redrawRows called, conflictData cleared. |
| 2 | `handleConflictKeepMine shows error toast on 500` | Vitest | same as #1 | TPG-R11-AC13 | Mock api.put to reject with 500. Assert: showToast called with error, saveStatus set to 'error', grid remains interactive. |
| 3 | `handleConflictKeepTheirs uses setData not setDataValue` | Vitest | same as #1 | TPG-R11-AC14 | Assert: node.setData called (not setDataValue), redrawRows called, onRowUpdated called, conflictData cleared, saveStatus set to 'idle'. |
| 4 | `handleConflictCancel restores server row including updatedAt` | Vitest | same as #1 | TPG-R11-AC15 | Assert: node.setData called with serverRow data, redrawRows called, conflictData cleared, saveStatus 'idle'. |
| 5 | `handleRemoteRowUpdate discards older update (out-of-order)` | Vitest | new `PatientGrid.remoteHandlers.test.ts` | TPG-R13-AC7 | Create rowNode with updatedAt="2026-01-02". Call handleRemoteRowUpdate with updatedAt="2026-01-01" (older). Assert: setData NOT called. |
| 6 | `handleRemoteRowUpdate accepts newer update` | Vitest | same as #5 | TPG-R13-AC6 | Create rowNode with updatedAt="2026-01-01". Call with updatedAt="2026-01-02". Assert: setData called, redrawRows called. |
| 7 | `handleRemoteRowUpdate cancels edit when remote update affects same cell` | Vitest | same as #5 | TPG-R13-AC8 | Mock getEditingCells to return cell editing row with matching ID. Assert: stopEditing(true) called, showToast called. |
| 8 | `handleRemoteRowCreate adds row via applyTransaction` | Vitest | same as #5 | TPG-R13-AC9 | Call with new row ID. Assert: applyTransaction called with {add: [row]}, onRowAdded called. |
| 9 | `handleRemoteRowCreate ignores existing row (dedup)` | Vitest | same as #5 | TPG-R13-AC10 | Mock getRowNode to return existing. Assert: applyTransaction NOT called. |
| 10 | `handleRemoteRowDelete removes row and shows toast` | Vitest | same as #5 | TPG-R13-AC11 | Call with existing row ID. Assert: applyTransaction called with {remove: [data]}, showToast called, onRowDeleted called. |
| 11 | `handleRemoteRowDelete cancels edit if user editing that row` | Vitest | same as #5 | TPG-R13-AC12 | Mock getEditingCells to return matching row. Assert: stopEditing(true) called before remove. |
| 12 | `sequential conflict resolution — no state corruption` | Vitest | same as #1 | TPG-R11-AC22 | Trigger conflict 1, resolve with Keep Mine. Immediately trigger conflict 2. Assert: second conflict modal opens correctly with new data. |
| 13 | `gridApi.redrawRows called after successful save` | Vitest | `useGridCellUpdate.test.ts` | TPG-R5-AC12 | After successful PUT, assert: event.api.redrawRows called with { rowNodes: [node] }. |
| 14 | `node.setSelected(true) called after successful save` | Vitest | `useGridCellUpdate.test.ts` | TPG-R5-AC13 | After successful PUT, assert: event.node.setSelected called with true. |

### MEDIUM PRIORITY — 20 tests

| # | Test Name | Framework | Target File | Req ID | Description |
|---|-----------|-----------|-------------|--------|-------------|
| 15 | `column widths match spec (13 columns)` | Vitest | `PatientGrid.test.tsx` | TPG-R1-AC13 | Assert capturedGridProps.columnDefs[i].width for each column. |
| 16 | `formatPhone formats 10-digit as (XXX) XXX-XXXX` | Vitest | `PatientGrid.test.tsx` or new `formatPhone.test.ts` | TPG-R1-AC14 | Call formatPhone('5551234567'). Assert: '(555) 123-4567'. |
| 17 | `formatPhone returns raw value for non-10-digit` | Vitest | same as #16 | TPG-R1-AC15 | Call formatPhone('12345'). Assert: '12345'. Also test 11-digit, with dashes, null. |
| 18 | `qualityMeasure cellEditorParams calls getQMForRT` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC8 | Get QM column cellEditorParams. Invoke as function({data: {requestType: 'AWV'}}). Assert: values array includes QM options. |
| 19 | `measureStatus cellEditorParams calls getMSForQM` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC9 | Get MS column cellEditorParams. Invoke as function({data: {qualityMeasure: 'Annual Wellness Visit'}}). Assert: values array includes MS options. |
| 20 | `tracking1 cellEditorSelector returns AutoOpenSelectEditor when options exist` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC10 | Get tracking1 cellEditorSelector. Invoke with status that has options. Assert: component is AutoOpenSelectEditor. |
| 21 | `tracking1 cellEditorSelector returns agTextCellEditor for HgbA1c status` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC11 | Get tracking1 cellEditorSelector. Invoke with HgbA1c status. Assert: component is 'agTextCellEditor'. |
| 22 | `tracking2 cellEditorSelector returns AutoOpenSelectEditor with 12 month options for HgbA1c` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC12 | Get tracking2 cellEditorSelector. Invoke with HgbA1c status. Assert: 12 month strings in values. |
| 23 | `tracking2 cellEditorSelector returns agTextCellEditor for BP status` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC13 | Invoke with BP status. Assert: component is 'agTextCellEditor'. |
| 24 | `requestType valueGetter returns '' for null` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC14 | Get requestType valueGetter. Call with data.requestType=null. Assert: returns ''. |
| 25 | `requestType valueSetter converts '' to null` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC15 | Get requestType valueSetter. Call with newValue=''. Assert: data.requestType set to null. |
| 26 | `statusDate comparator: null dates sort to end` | Vitest | `PatientGrid.test.tsx` | TPG-R3-AC13 | Get statusDate comparator. Call with (null, "2025-01-01"). Assert: returns 1 (null goes after). |
| 27 | `dueDate comparator: null dates sort to end` | Vitest | `PatientGrid.test.tsx` | TPG-R3-AC14 | Get dueDate comparator. Call with (null, "2025-01-01"). Assert: returns 1. |
| 28 | `timeIntervalDays valueSetter accepts valid integer (1-1000)` | Vitest | `PatientGrid.test.tsx` | TPG-R4-AC11 | Get valueSetter. Call with newValue='30'. Assert: returns true, data.timeIntervalDays=30. |
| 29 | `timeIntervalDays valueSetter rejects non-numeric` | Vitest | `PatientGrid.test.tsx` | TPG-R4-AC12 | Call with newValue='abc'. Assert: returns false, alert called. |
| 30 | `timeIntervalDays valueSetter rejects 0 and negative` | Vitest | `PatientGrid.test.tsx` | TPG-R4-AC13 | Call with 0, -1. Assert: returns false. |
| 31 | `isTimeIntervalEditable returns false for TIME_PERIOD_DROPDOWN_STATUSES` | Vitest | `PatientGrid.test.tsx` or new | TPG-R4-AC14 | Call with data.measureStatus='Screening discussed'. Assert: false. |
| 32 | `postSortRows reorders nodes by frozen order then clears ref` | Vitest | `PatientGrid.test.tsx` | TPG-R10-AC10, AC11 | Set frozenRowOrderRef to [3,1,2]. Call postSortRows with 3 nodes. Assert: nodes sorted [3,1,2], ref cleared to null. |
| 33 | `dropdownCellRenderer shows arrow for requestType` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC17 | Invoke dropdownCellRenderer with field='requestType'. Assert: renders div with '.cell-dropdown-arrow'. |
| 34 | `dropdownCellRenderer shows plain text for tracking1 N/A` | Vitest | `PatientGrid.test.tsx` | TPG-R2-AC18 | Invoke with field='tracking1', data with non-dropdown status. Assert: renders plain text, no arrow. |

### LOW PRIORITY — 12 tests

| # | Test Name | Framework | Target File | Req ID | Description |
|---|-----------|-----------|-------------|--------|-------------|
| 35 | `Tab key moves focus to next editable cell` | Cypress | new `cell-navigation.cy.ts` | TPG-R4-AC8 | Double-click notes, press Tab. Assert: next editable cell enters edit mode. |
| 36 | `Special characters saved correctly (quotes, angle brackets)` | Cypress | extend `cell-editing.cy.ts` | TPG-R4-AC9 | Type `<script>"test" & O'Brien`. Save. Assert: text preserved without encoding. |
| 37 | `Long text (1000 chars) saved in Notes` | Cypress | extend `cell-editing.cy.ts` | TPG-R4-AC10 | Generate 1000-char string, type into notes, save, verify persisted. |
| 38 | `DOB required — empty rejected in valueSetter` | Vitest | `PatientGrid.test.tsx` | TPG-R3-AC11 | Get memberDob valueSetter. Call with empty newValue. Assert: returns false, alert called. |
| 39 | `insuranceGroup field exists in GridRow interface` | Vitest | `PatientGrid.test.tsx` | TPG-R1-AC18 | Create mock row with insuranceGroup. Assert: field accessible. |
| 40 | `statusDate cellClass includes stripe-overlay + cell-prompt when no value but has prompt` | Vitest | `PatientGrid.test.tsx` | TPG-R3-AC15 | Get statusDate cellClass. Call with value=null, data.statusDatePrompt='Date Ordered'. Assert: includes 'stripe-overlay', 'cell-prompt'. |
| 41 | `handleDataRefresh calls onDataRefresh` | Vitest | new remote handlers file | TPG-R13-AC13 | Call handleDataRefresh. Assert: onDataRefresh called. |
| 42 | `newRowId effect selects row and starts editing requestType` | Vitest | `PatientGrid.test.tsx` | TPG-R6-AC13 | Render with newRowId prop. Assert: gridApi.setFocusedCell called, startEditingCell called with requestType. |
| 43 | `Delete API 500 shows error and preserves row` | Cypress | extend `row-operations.cy.ts` | TPG-R7-AC7 | Intercept DELETE with 500. Click delete+confirm. Assert: error visible, row still in grid. |
| 44 | `Edit during active filter — row disappears from filtered view` | Cypress | new `filter-edit-interaction.cy.ts` | EC-2 | Filter to "Not Addressed". Edit measureStatus to "AWV completed". Assert: row disappears from filtered view. |
| 45 | `Add row to empty grid` | Playwright | extend `add-row.spec.ts` | EC-9 | Delete all rows first (or use empty test DB). Add row. Assert: 1 row appears. |
| 46 | `Duplicate count shows (0) when no duplicates exist` | Cypress | extend `duplicate-detection.cy.ts` | TPG-R9-AC9 | Ensure no duplicates. Check Duplicates chip text matches "Duplicates (0)". |

### Summary of Proposed Tests

| Priority | Count | Frameworks |
|----------|-------|------------|
| High | 14 | Vitest (14) |
| Medium | 20 | Vitest (20) |
| Low | 12 | Vitest (5), Cypress (5), Playwright (1), Cypress/Vitest (1) |
| **Total** | **46** | Vitest: 39, Cypress: 5, Playwright: 1, Mixed: 1 |

---

## Dependencies

### Depends On (Existing, Completed)

- **Authentication system** -- User must be logged in for all grid operations
- **Patient ownership filtering** -- Physicians see only their patients
- **Cascading dropdowns configuration** -- dropdownConfig.ts provides option lists
- **Status color configuration** -- statusColors.ts provides status-to-color mappings
- **Due date calculation** -- Backend dueDateCalculator computes dueDate from statusDate + rules
- **Socket.IO infrastructure** -- Real-time broadcasts for parallel editing tests
- **Seed data** -- Test database must have predictable patient rows for E2E tests

### Integration Points

| Component | File | Relevance to Test Plan |
|-----------|------|------------------------|
| PatientGrid | `frontend/src/components/grid/PatientGrid.tsx` | Primary component under test |
| useGridCellUpdate | `frontend/src/components/grid/hooks/useGridCellUpdate.ts` | Auto-save pipeline hook |
| AutoOpenSelectEditor | `frontend/src/components/grid/AutoOpenSelectEditor.tsx` | Dropdown editor |
| DateCellEditor | `frontend/src/components/grid/DateCellEditor.tsx` | Date editor |
| StatusDateRenderer | `frontend/src/components/grid/StatusDateRenderer.tsx` | Date display renderer |
| ConflictModal | `frontend/src/components/modals/ConflictModal.tsx` | Conflict resolution UI |
| AddRowModal | `frontend/src/components/modals/AddRowModal.tsx` | Add row UI |
| cascadingFields | `frontend/src/components/grid/utils/cascadingFields.ts` | Cascading update logic |
| useRemoteEditClass | `frontend/src/components/grid/hooks/useRemoteEditClass.ts` | Remote edit indicator |
| versionCheck | `backend/src/services/versionCheck.ts` | Backend optimistic concurrency |
| duplicateDetector | `backend/src/services/duplicateDetector.ts` | Backend duplicate detection |
| data.routes | `backend/src/routes/data.routes.ts` | CRUD API endpoints |
| dropdownConfig | `frontend/src/config/dropdownConfig.ts` | Dropdown option definitions |
| statusColors | `frontend/src/config/statusColors.ts` | Status color mappings |
