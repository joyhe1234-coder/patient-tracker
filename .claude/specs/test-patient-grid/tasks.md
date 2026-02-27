# Implementation Plan: test-patient-grid

## Task Overview

Write 27 new tests across 5 task groups to fill coverage gaps in the Patient Grid and Cell Editing module. This spec adds tests only — no production code changes. Each task produces one file (new or extended) and is independently executable.

**Test distribution:**
- T1-1: 8 Cypress tests — 409 conflict recovery lifecycle (new file)
- T1-2: 6 Cypress tests — Row add/delete via Toolbar (new file)
- T1-3: 3 Vitest tests — Toolbar edge cases (extend existing file)
- T2-1: 4 Jest tests — Duplicate detection edge cases (extend existing file)
- T2-2: 6 Cypress tests — Grid editing per role (new file)

## Steering Document Compliance

- Cypress files follow the pattern established in `frontend/cypress/e2e/*.cy.ts`
- Vitest files follow the pattern in `frontend/src/components/layout/Toolbar.test.tsx`
- Jest files follow the ESM pattern in `backend/src/services/__tests__/duplicateDetector.test.ts` (jest.unstable_mockModule + dynamic import)
- All Cypress tests use the custom commands: `cy.login()`, `cy.waitForAgGrid()`, `cy.selectAgGridDropdown()`, `cy.addTestRow()`, `cy.getAgGridCell()`
- Row counts use `.ag-center-cols-container .ag-row` — NOT `data-testid="row-count"` (that only exists in Vitest mocks)
- ConflictModal is identified by `data-testid="conflict-backdrop"` — NOT `conflict-modal`
- Seed accounts used: `ko037291@gmail.com` (admin), `phy1@gmail.com`, `staff1@gmail.com` (password: `welcome100`)

## Atomic Task Requirements

Each task meets these criteria:
- **File Scope**: 1 file created or 1 file extended
- **Time Boxing**: 15-30 minutes
- **Single Purpose**: One test file, one behavioral area
- **Specific Files**: Exact paths listed
- **Agent-Friendly**: Includes run command to verify passing

---

## Tasks

- [ ] 1. Create Cypress test file for 409 conflict recovery lifecycle
  - File to create: `frontend/cypress/e2e/cell-editing-conflict.cy.ts`
  - Write 8 tests covering the full conflict modal lifecycle: trigger → display → resolve → grid state correct
  - Test list:
    1. `shows conflict modal when 409 VERSION_CONFLICT returned` — intercept PUT → return 409 with mock serverRow → `[data-testid="conflict-backdrop"]` visible, "Edit Conflict" text visible, correct field name and values shown
    2. `Keep Mine sends forceOverwrite PUT and updates grid` — click "Keep Mine" button → intercept second PUT to verify `forceOverwrite=true` in body → grid cell shows user's selected value
    3. `Keep Mine handles server error gracefully` — intercept forceOverwrite PUT with 500 response → error indicator visible, grid remains interactive (no frozen state)
    4. `Keep Theirs reverts cell to server value` — click "Keep Theirs" button → grid cell shows the `serverRow` value from the 409 body, not the user's attempted value
    5. `Cancel restores server row data including updatedAt` — click "Cancel" button → cell shows server value; edit same cell again → second PUT does NOT trigger another 409 (uses fresh `updatedAt`)
    6. `next edit after Keep Theirs uses fresh updatedAt` — resolve with Keep Theirs → immediately edit same cell → second PUT succeeds (no 409), grid shows new value
    7. `conflict modal shows all cascaded fields` — edit `requestType` (triggers cascade) → mock 409 with multiple `conflictFields` → modal lists all conflicting fields
    8. `conflict resolution works as Physician` — `cy.login('phy1@gmail.com', 'welcome100')` → trigger conflict → click "Keep Mine" → verify PUT with `forceOverwrite=true` → success
  - Intercept pattern: `cy.intercept('PUT', '/api/data/*', (req) => { req.reply(409, { code: 'VERSION_CONFLICT', serverRow: {...}, conflictFields: [{field, serverValue, clientValue}], changedBy: 'other@gmail.com' }); }).as('conflictPut');`
  - ConflictModal buttons to click: `cy.contains('button', 'Keep Mine')`, `cy.contains('button', 'Keep Theirs')`, `cy.contains('button', 'Cancel')`
  - Each test uses `cy.login('ko037291@gmail.com', 'welcome100')` then `cy.visit('/')` then `cy.waitForAgGrid()` in `beforeEach` (test 8 uses `phy1@gmail.com`)
  - Verify modal visible: `cy.get('[data-testid="conflict-backdrop"]').should('be.visible')`
  - Run command to verify: `cd frontend && npx cypress run --spec cypress/e2e/cell-editing-conflict.cy.ts --headed`
  - _Leverage: `frontend/cypress/e2e/cell-editing.cy.ts`, `frontend/cypress/e2e/duplicate-detection.cy.ts`, `frontend/cypress/support/commands.ts`_
  - _Requirements: TPG-R11-AC12, AC13, AC14, AC15, AC18_

- [ ] 2. Create Cypress test file for row add/delete via Toolbar
  - File to create: `frontend/cypress/e2e/row-operations.cy.ts`
  - Write 6 tests covering the full add and delete row lifecycle through Toolbar buttons
  - Test list:
    1. `Add Row button opens modal and creates row` — count rows before with `.ag-center-cols-container .ag-row`; call `cy.addTestRow('TestAdd, E2E')`; assert row count is `countBefore + 1`
    2. `new row has null request type, quality measure, measure status` — after `cy.addTestRow('TestNull, Fields')` → use `cy.findRowByMemberName('TestNull')` to get rowIndex → assert `cy.getAgGridCell(rowIndex, 'requestType')` text is empty/blank, same for `qualityMeasure` and `measureStatus`
    3. `Delete button disabled when no row selected` — on `beforeEach` load (no selection) → `cy.contains('button', 'Delete Row').should('be.disabled')`
    4. `Delete button enabled after selecting a row, confirmation works` — click row 0 → Delete Row button becomes enabled → click Delete Row → confirmation modal appears → click Confirm → row count decreases by 1
    5. `Cancel delete preserves the row` — select row → click Delete Row → click Cancel in confirmation modal → row count unchanged, row still in grid
    6. `Add and delete work as Staff` — `cy.login('staff1@gmail.com', 'welcome100')` → `cy.addTestRow('StaffAdd, E2E')` → find and select that row → delete it → verify row gone
  - Row count selector (not `data-testid="row-count"`): `cy.get('.ag-center-cols-container .ag-row')`
  - Delete confirmation modal: look for a confirmation dialog with "Confirm" or "Delete" button and "Cancel" button (inspect existing parallel-editing-row-operations.cy.ts for pattern)
  - Run command to verify: `cd frontend && npx cypress run --spec cypress/e2e/row-operations.cy.ts --headed`
  - _Leverage: `frontend/cypress/e2e/parallel-editing-row-operations.cy.ts`, `frontend/cypress/support/commands.ts` (cy.addTestRow, cy.findRowByMemberName, cy.getAgGridCell)_
  - _Requirements: TPG-R6-AC6 through AC10, TPG-R7-AC4 through AC7_

- [ ] 3. Extend Toolbar.test.tsx with 3 edge case tests
  - File to extend: `frontend/src/components/layout/Toolbar.test.tsx`
  - Append 3 new tests inside a new `describe('Edge cases')` block at the end of the file, after the existing `Save status indicator` describe block
  - Test list:
    1. `all 4 buttons enabled simultaneously when canDelete=true and canDuplicate=true` — render `<Toolbar {...defaultProps} canDelete={true} canDuplicate={true} />`; assert `screen.getByRole('button', { name: /add row/i })` is enabled; assert `screen.getByRole('button', { name: /delete row/i })` is enabled; assert `screen.getByRole('button', { name: /copy member/i })` is enabled; assert `screen.getByRole('button', { name: /member info/i })` is enabled — verifies no button accidentally disables another
    2. `Delete button click does NOT call onDeleteRow when canDelete=false` — render with `canDelete={false}`; `await user.click(screen.getByText('Delete Row'))`; assert `onDeleteRow` mock was NOT called (supplements existing "calls when enabled" test with disabled-click protection)
    3. `Member Info button reflects showMemberInfo toggle state via aria or class` — render with `showMemberInfo={true}` → button should have `bg-gray-100` class (active state per Toolbar.tsx line 67); render with `showMemberInfo={false}` → button should have `border-gray-300` class (inactive state per Toolbar.tsx line 69) — validates the visual state toggle
  - Use existing `defaultProps` and `user` (userEvent) already defined in the file — no new imports needed
  - Note: `screen.getByRole('button', { name: /add row/i })` works because the button text is "Add Row" (with icon); verify with `screen.getByText('Add Row').closest('button')` if role query fails due to icon
  - Run command to verify: `cd frontend && npm run test:run -- --reporter=verbose 2>&1 | grep -A5 "Toolbar"`
  - _Leverage: `frontend/src/components/layout/Toolbar.test.tsx` (existing defaultProps, user, describe structure), `frontend/src/components/layout/Toolbar.tsx` (CSS class names for active/inactive states)_
  - _Requirements: TPG-R6, TPG-R7, TPG-R8_

- [ ] 4. Extend duplicateDetector.test.ts with 4 deletion and edit edge case tests
  - File to extend: `backend/src/services/__tests__/duplicateDetector.test.ts`
  - Append 4 new tests inside a new `describe('Deletion and edit edge cases')` block at the end of the file, after all existing describe blocks
  - Test list:
    1. `deleting one of two duplicates clears flag on remaining` — `mockFindMany` returns only 1 row after deletion (simulating deleted row removed from DB); call `syncAllDuplicateFlags(patientId)`; assert `mockUpdateMany` or `mockUpdate` sets `isDuplicate: false` on the remaining row — verifies pair dissolution triggers unflagging
    2. `three-way duplicate: deleting one leaves two still flagged` — `mockFindMany` returns 3 rows for `detectAllDuplicates`; call `syncAllDuplicateFlags(patientId)`; assert all 3 rows get `isDuplicate: true`; then simulate deletion by having `mockFindMany` return 2 rows on second call; call `syncAllDuplicateFlags` again; assert both remaining rows still `isDuplicate: true`
    3. `duplicate check with whitespace-padded requestType` — call `checkForDuplicate(1, ' AWV ', 'Annual Wellness Visit')`; verify whether `mockFindMany` was called or not (whitespace-only guard uses `.trim()` check); document actual behavior as the test assertion — if `' AWV '.trim()` is non-empty, `mockFindMany` WILL be called; if the code does not trim, it will use padded string in query; test current behavior to lock it in
    4. `duplicate flag recalculated when qualityMeasure edited from match to non-match` — set up `mockFindMany` to return empty array (no matches after QM change); call `checkForDuplicate(rowId, 'AWV', 'Changed Measure')`; assert `result.isDuplicate === false` and `result.duplicateIds` is empty; then call `updateDuplicateFlags(rowId, false, [])` to clear flags; assert `mockUpdate` called with `{ where: { id: rowId }, data: { isDuplicate: false } }` — verifies edit-to-non-match path
  - ESM pattern: do NOT add new import statements — use the existing dynamic imports already present at the top of the file (`const { checkForDuplicate, updateDuplicateFlags, detectAllDuplicates, syncAllDuplicateFlags } = await import('../duplicateDetector.js')`)
  - Mock reset: the existing `beforeEach(() => { jest.clearAllMocks(); })` covers new tests automatically
  - Run command to verify: `cd backend && npm test -- --testPathPattern=duplicateDetector 2>&1 | tail -20`
  - _Leverage: `backend/src/services/__tests__/duplicateDetector.test.ts` (existing mock setup, dynamic imports, beforeEach, describe structure), `backend/src/services/duplicateDetector.ts` (to understand syncAllDuplicateFlags behavior)_
  - _Requirements: TPG-R9-AC7, AC9, AC10, AC11_

- [ ] 5. Create Cypress test file for grid editing permissions per role
  - File to create: `frontend/cypress/e2e/grid-editing-roles.cy.ts`
  - Write 6 tests (2 per role: Admin, Physician, Staff) verifying that each role can edit the expected columns
  - Test structure — 3 describe blocks, each with its own `beforeEach`:
    - `describe('Grid editing as Admin')` → `beforeEach: cy.login('ko037291@gmail.com', 'welcome100'); cy.visit('/'); cy.waitForAgGrid()`
    - `describe('Grid editing as Physician')` → `beforeEach: cy.login('phy1@gmail.com', 'welcome100'); cy.visit('/'); cy.waitForAgGrid()`
    - `describe('Grid editing as Staff')` → `beforeEach: cy.login('staff1@gmail.com', 'welcome100'); cy.visit('/'); cy.waitForAgGrid()`
  - Test list:
    1. (Admin) `Admin can edit requestType dropdown` — `cy.selectAgGridDropdown(0, 'requestType', 'AWV')` → `cy.wait(500)` → `cy.getAgGridCell(0, 'requestType').invoke('text').should('include', 'AWV')`; intercept PUT to assert `cy.wait('@putRequest').its('response.statusCode').should('eq', 200)` (alias the intercept before the action)
    2. (Admin) `Admin can edit notes text field` — `cy.getAgGridCell(0, 'notes').dblclick()` → `cy.focused().clear().type('Admin note test')` → `cy.get('body').click(0, 0)` → `cy.wait(500)` → `cy.getAgGridCell(0, 'notes').should('contain.text', 'Admin note test')`
    3. (Physician) `Physician can edit measureStatus dropdown` — `cy.selectAgGridDropdown(0, 'measureStatus', 'AWV completed')` → `cy.wait(500)` → `cy.getAgGridCell(0, 'measureStatus').invoke('text').should('include', 'AWV completed')`
    4. (Physician) `Physician can edit member name` — `cy.getAgGridCell(0, 'memberName').dblclick()` → `cy.focused().clear().type('Physician Updated Name')` → `cy.get('body').click(0, 0)` → `cy.wait(500)` → `cy.getAgGridCell(0, 'memberName').should('contain.text', 'Physician Updated Name')`
    5. (Staff) `Staff can edit requestType dropdown` — `cy.selectAgGridDropdown(0, 'requestType', 'AWV')` → `cy.wait(500)` → `cy.getAgGridCell(0, 'requestType').invoke('text').should('include', 'AWV')`
    6. (Staff) `Staff can edit notes text field` — `cy.getAgGridCell(0, 'notes').dblclick()` → `cy.focused().clear().type('Staff note test')` → `cy.get('body').click(0, 0)` → `cy.wait(500)` → `cy.getAgGridCell(0, 'notes').should('contain.text', 'Staff note test')`
  - For dropdown tests, add `cy.intercept('PUT', '/api/data/*').as('putRequest')` before the action and assert status 200 after
  - Notes column requires double-click (singleClickEdit=false — same pattern as cell-editing.cy.ts)
  - Run command to verify: `cd frontend && npx cypress run --spec cypress/e2e/grid-editing-roles.cy.ts --headed`
  - _Leverage: `frontend/cypress/e2e/role-access-control.cy.ts` (ACCOUNTS object pattern, login per describe block), `frontend/cypress/e2e/cell-editing.cy.ts` (double-click text edit pattern), `frontend/cypress/support/commands.ts` (selectAgGridDropdown, getAgGridCell)_
  - _Requirements: TPG-R2, TPG-R4 (role variants)_

---

## Execution Order

Tasks are independent and can be executed in any order. Suggested order for logical grouping:

1. Task 3 (Toolbar Vitest) — fastest, no network, pure unit test
2. Task 4 (duplicateDetector Jest) — pure unit test, no browser needed
3. Task 1 (409 conflict Cypress) — most complex, validates critical conflict flow
4. Task 2 (row operations Cypress) — moderate complexity, validates CRUD flow
5. Task 5 (role editing Cypress) — moderate complexity, requires 3 login sessions

## Done Criteria

- [ ] All 27 tests written and passing (8 + 6 + 3 + 4 + 6)
- [ ] No regressions in existing M2 tests (~460 baseline): `cd backend && npm test` and `cd frontend && npm run test:run` pass
- [ ] 409 conflict recovery verified for Admin + Physician (Task 1 — 8 tests green)
- [ ] Row add/delete verified for Admin + Staff (Task 2 — 6 tests green)
- [ ] Toolbar edge cases pass (Task 3 — 3 tests green)
- [ ] Duplicate detection edge cases pass (Task 4 — 4 tests green)
- [ ] Grid editing verified for Admin, Physician, Staff (Task 5 — 6 tests green)
- [ ] Full 4-layer pyramid still passes after additions
- [ ] `.claude/REGRESSION_TEST_PLAN.md` updated with new test case IDs
- [ ] `.claude/TESTING.md` inventory updated with 3 new Cypress file entries
