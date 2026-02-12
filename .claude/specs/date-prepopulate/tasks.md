# Implementation Tasks: Date Prepopulate (Status Date Auto-Fill on Edit)

## Task Overview

This implementation adds automatic prepopulation of today's date when editing an empty `statusDate` cell. The feature is entirely frontend with no backend, database, or API changes. It introduces one new component (`DateCellEditor`) and modifies one existing component (`PatientGrid.tsx`) to use it.

**Key Components:**
- 1 new component: `DateCellEditor`
- 1 modified component: `PatientGrid.tsx` (statusDate column def)
- 1 optional CSS addition: `index.css`
- 0 backend changes
- 0 database schema changes

**Dependency Strategy:**
Tasks are ordered for minimal blocking:
1. Create the `DateCellEditor` component
2. Wire it into `PatientGrid.tsx`
3. Add CSS (if needed)
4. Write unit tests (Vitest)
5. Write E2E tests (Cypress)
6. Visual review (MCP Playwright)

## Steering Document Compliance

**structure.md conventions followed:**
- New component in `frontend/src/components/grid/` (PascalCase: `DateCellEditor.tsx`)
- Test co-located: `DateCellEditor.test.tsx` in same directory
- Cypress E2E in `frontend/cypress/e2e/` (kebab-case: `date-prepopulate.cy.ts`)

**tech.md patterns followed:**
- TypeScript with explicit interfaces for AG Grid cell editor
- ESM imports (`import`/`export`)
- React 18 `forwardRef` + `useImperativeHandle` (same as `AutoOpenSelectEditor`)
- Vitest (frontend unit), Cypress (AG Grid interactions), MCP Playwright (visual review)

## Atomic Task Requirements

**Each task meets these criteria:**
- **File Scope**: Touches 1-2 related files maximum
- **Time Boxing**: Completable in 10-20 minutes by an experienced developer
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Exact files to create/modify specified
- **Agent-Friendly**: Clear input/output with minimal context switching

---

## Phase 1: Core Implementation

### Task 1: Create DateCellEditor component

- [ ] **Create** `frontend/src/components/grid/DateCellEditor.tsx`
- **Description**: Custom AG Grid cell editor for the `statusDate` column that prepopulates today's date when the cell is empty.
- **Implementation Details**:
  - Import `forwardRef`, `useRef`, `useImperativeHandle`, `useEffect`, `useMemo` from React
  - Import `ICellEditorParams` from `ag-grid-community`
  - Create `DateCellEditor` as a `forwardRef` component accepting `ICellEditorParams`
  - Add `isPrepopulated` ref to track whether the value was auto-filled
  - In `useMemo` for `initialValue`:
    - If `value` is falsy or empty string: set `isPrepopulated.current = true`, return today's date formatted as `M/D/YYYY` (using `new Date()`, local timezone)
    - If `value` is non-empty: return `value` as-is
  - Expose via `useImperativeHandle`:
    - `getValue()`: return `inputRef.current?.value || ''`
    - `isPopup()`: return `false` (inline editor)
    - `isCancelAfterEnd()`: return `false`
  - In `useEffect` (mount):
    - Focus the input element
    - If `isPrepopulated.current` is true, call `inputRef.current.select()` to select all text
  - Render: `<input ref={inputRef} type="text" defaultValue={initialValue} className="date-cell-editor" />`
  - Add `displayName = 'DateCellEditor'`
- **Acceptance Criteria**: Component file exists, exports default `DateCellEditor`, follows `AutoOpenSelectEditor` structural pattern.
- _Requirements: DP-R1-AC1, DP-R1-AC2, DP-R1-AC4, DP-R3-AC4_

### Task 2: Add CSS for DateCellEditor

- [ ] **Modify** `frontend/src/index.css`
- **Description**: Add minimal CSS for the date cell editor input to match AG Grid's inline editing style.
- **Implementation Details**:
  - Add `.date-cell-editor` class after the existing `.ag-theme-alpine .ag-cell-inline-editing` block:
    ```css
    .date-cell-editor {
      width: 100%;
      height: 100%;
      border: none;
      outline: none;
      padding: 0 12px;
      font-size: inherit;
      font-family: inherit;
      background: transparent;
      box-sizing: border-box;
    }
    ```
  - The padding (`0 12px`) matches AG Grid's default cell padding for consistent text alignment.
- **Acceptance Criteria**: CSS class exists, editor input visually matches other inline-editing cells.
- _Requirements: DP-R1-AC1_

### Task 3: Wire DateCellEditor into PatientGrid statusDate column

- [ ] **Modify** `frontend/src/components/grid/PatientGrid.tsx`
- **Description**: Replace the default text editor on the `statusDate` column with the new `DateCellEditor`.
- **Implementation Details**:
  - Add import: `import DateCellEditor from './DateCellEditor';`
  - In the `columnDefs` array, find the `statusDate` column definition (around line 996)
  - Add `cellEditor: DateCellEditor` property to the column def
  - No other changes needed -- `valueGetter`, `valueSetter`, `valueFormatter`, `cellClass`, and `comparator` all remain as-is
- **Acceptance Criteria**: The `statusDate` column uses `DateCellEditor`. Double-clicking an empty cell shows today's date. Double-clicking a non-empty cell shows the existing date. Tab/Enter confirm the value. Escape cancels.
- _Requirements: DP-R1-AC1, DP-R1-AC3, DP-R1-AC5, DP-R2-AC1, DP-R2-AC2, DP-R2-AC3, DP-R2-AC4_

---

## Phase 2: Unit Tests (Vitest)

### Task 4: Write DateCellEditor unit tests

- [ ] **Create** `frontend/src/components/grid/DateCellEditor.test.tsx`
- **Description**: Vitest unit tests for the `DateCellEditor` component.
- **Test Cases**:
  1. **renders an input element**: Mount with `value=''`, verify `<input>` is in the DOM
  2. **prepopulates today's date when value is empty**: Mount with `value=''`, verify input value matches today's date in M/D/YYYY format
  3. **does not prepopulate when value exists**: Mount with `value='1/15/2026'`, verify input value is `'1/15/2026'`
  4. **selects all text when prepopulated**: Mount with `value=''`, verify `input.select()` was called (spy on HTMLInputElement.prototype.select)
  5. **does not select all when value exists**: Mount with `value='1/15/2026'`, verify `input.select()` was NOT called
  6. **getValue returns current input value**: Mount, change input value, call `getValue()`, verify return
  7. **isPopup returns false**: Call `isPopup()`, verify returns `false`
  8. **isCancelAfterEnd returns false**: Call `isCancelAfterEnd()`, verify returns `false`
  9. **formats today's date without leading zeros**: Mock `Date` to return a date like Jan 5 2026, verify format is `1/5/2026` not `01/05/2026`
  10. **input receives focus on mount**: Mount with `value=''`, verify input has focus
- **Implementation Pattern**: Follow `AutoOpenSelectEditor.test.tsx` patterns. Use `vi.fn()` for `stopEditing`. Use `render()` with `forwardRef` wrapper to access `getValue()`, `isPopup()`.
- **Acceptance Criteria**: All 10 tests pass. `npm run test:run -- --reporter=verbose DateCellEditor` shows green.
- _Requirements: DP-R1-AC1, DP-R1-AC2, DP-R1-AC3, DP-R1-AC4_

### Task 5: Update PatientGrid unit tests for DateCellEditor

- [ ] **Modify** `frontend/src/components/grid/PatientGrid.test.tsx`
- **Description**: Add assertion that the `statusDate` column uses `DateCellEditor`.
- **Test Cases**:
  1. **statusDate column uses DateCellEditor**: Find the statusDate column def, assert `cellEditor` is `DateCellEditor`
- **Implementation Pattern**: Follow the existing pattern in `PatientGrid.test.tsx` where column defs are extracted and individual properties are asserted (see existing tests for `AutoOpenSelectEditor` assertions).
- **Acceptance Criteria**: Test passes. Existing PatientGrid tests remain green.
- _Requirements: DP-R1-AC5_

---

## Phase 3: E2E Tests (Cypress)

### Task 6: Write Cypress E2E tests for date prepopulation

- [ ] **Create** `frontend/cypress/e2e/date-prepopulate.cy.ts`
- **Description**: Cypress E2E tests verifying the full date prepopulation workflow in a real browser with AG Grid.
- **Test Cases**:
  1. **empty statusDate shows today's date on double-click edit**: Find a row with empty statusDate, double-click the cell, verify the input contains today's date
  2. **Tab confirms prepopulated date and saves**: Double-click empty statusDate, press Tab, verify cell shows today's date, verify save indicator fires
  3. **Enter confirms prepopulated date and saves**: Double-click empty statusDate, press Enter, verify cell shows today's date
  4. **Escape cancels prepopulated date**: Double-click empty statusDate, press Escape, verify cell returns to empty/prompt state
  5. **typing a digit replaces prepopulated date**: Double-click empty statusDate, type "3", verify input shows "3" (not "3" appended to today's date)
  6. **non-empty statusDate shows existing date on edit**: Find a row with a date, double-click, verify input shows the existing date (not today's date)
  7. **confirmed date triggers due date recalculation**: Confirm prepopulated date on a row with a measureStatus that has baseDueDays, verify dueDate column populates
- **Prerequisites**:
  - Need at least one row with an empty statusDate and a measureStatus set (so the statusDate prompt is visible)
  - Need at least one row with a non-empty statusDate
  - Test data setup may need to use the existing cascading dropdown Cypress helpers to set up a row
- **Implementation Pattern**: Follow `cell-editing.cy.ts` patterns for AG Grid cell interaction. Use `cy.get('[col-id="statusDate"]')` to target cells. Use `cy.get('.ag-text-field-input')` or `cy.get('.date-cell-editor')` to interact with the editor input.
- **Acceptance Criteria**: All 7 tests pass. `npm run cypress:run -- --spec cypress/e2e/date-prepopulate.cy.ts` shows green.
- _Requirements: DP-R1-AC1, DP-R1-AC3, DP-R2-AC1, DP-R2-AC2, DP-R2-AC4, DP-R3-AC1_

---

## Phase 4: Visual Review (MCP Playwright)

### Task 7: Visual browser review of date prepopulation

- [ ] **MCP Playwright visual review** (ui-ux-reviewer agent)
- **Description**: Open the application in a real browser, manually test the date prepopulation behavior, and take screenshots.
- **Steps**:
  1. Navigate to the patient grid (login, select a physician if needed)
  2. Locate a row with an empty statusDate cell (should show gray prompt text like "Date Completed")
  3. Screenshot: the grid with the empty statusDate cell visible
  4. Double-click the empty statusDate cell
  5. Screenshot: the cell in edit mode showing today's date prepopulated
  6. Press Enter to confirm
  7. Screenshot: the cell showing the saved date, verify save indicator
  8. Verify due date was calculated (if applicable)
  9. Locate a row with an existing statusDate
  10. Double-click the existing date cell
  11. Screenshot: the cell in edit mode showing the existing date (no prepopulation)
  12. Press Escape to cancel
  13. Screenshot: the cell returned to its original value
- **Acceptance Criteria**: All screenshots show expected behavior. Prepopulated date matches today. Existing dates are not modified. Save indicator works. Visual alignment is correct (text not clipped, padding matches other cells).
- _Requirements: DP-R1-AC1, DP-R1-AC2, DP-R1-AC3, DP-R2-AC1, DP-R2-AC4_

---

## Task Dependency Graph

```
Task 1 (DateCellEditor component)
  │
  ├──▶ Task 2 (CSS) ──▶ Task 3 (Wire into PatientGrid)
  │                         │
  │                         ├──▶ Task 4 (Unit tests)
  │                         ├──▶ Task 5 (PatientGrid test update)
  │                         ├──▶ Task 6 (Cypress E2E tests)
  │                         └──▶ Task 7 (Visual review)
  │
  └── (Task 2 and 3 depend on Task 1)
```

Tasks 4, 5, 6, and 7 can run in parallel after Tasks 1-3 are complete. Tasks 4 and 5 can also run in parallel with each other.

---

## Summary

| Phase | Tasks | New Files | Modified Files | Test Count |
|-------|-------|-----------|----------------|------------|
| 1. Core Implementation | 1-3 | `DateCellEditor.tsx` | `PatientGrid.tsx`, `index.css` | 0 |
| 2. Unit Tests | 4-5 | `DateCellEditor.test.tsx` | `PatientGrid.test.tsx` | ~11 |
| 3. E2E Tests | 6 | `date-prepopulate.cy.ts` | - | ~7 |
| 4. Visual Review | 7 | - | - | - |
| **Total** | **7** | **3** | **3** | **~18** |

**Estimated effort:** 1-2 hours for an experienced developer familiar with the codebase.

**Risk assessment:** Low. The feature is additive and isolated to one column. The existing `valueSetter` and `onCellValueChanged` pipelines handle all downstream logic (validation, API save, due date recalculation, row color update). The only new code is the `DateCellEditor` component, which is straightforward.
