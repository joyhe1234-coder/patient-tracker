# M2 Patient Grid & Cell Editing — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.1
**Spec:** `.claude/specs/test-patient-grid/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `PatientGrid.test.tsx` | Vitest | 58 | Column defs, row class rules, member info toggle, socket integration |
| `Toolbar.test.tsx` | Vitest | 15 | Button rendering, callbacks, save indicator |
| `useGridCellUpdate.test.ts` | Vitest | 15 | Cell save, cascading, 409 conflict, 404, error handling |
| `AutoOpenSelectEditor.test.tsx` | Vitest | 22 | Dropdown editor rendering, selection, keyboard |
| `DateCellEditor.test.tsx` | Vitest | 9 | Date editor rendering, format parsing |
| `StatusDateRenderer.test.tsx` | Vitest | 13 | Status date display, prompt text |
| `ConflictModal.test.tsx` | Vitest | 14 | Conflict modal rendering, buttons, callbacks |
| `AddRowModal.test.tsx` | Vitest | 21 | Add row modal rendering, validation, submission |
| `cascadingFields.test.ts` | Vitest | 16 | Cascading update payload logic |
| `data.routes.test.ts` | Jest | 50 | Data CRUD endpoints, role-based filtering, insurance group |
| `data.routes.version.test.ts` | Jest | 6 | Version check in PUT endpoint |
| `data.routes.socket.test.ts` | Jest | ~8 | Socket broadcast after CRUD |
| `versionCheck.test.ts` | Jest | 12 | Optimistic concurrency service |
| `duplicateDetector.test.ts` | Jest | 38 | Duplicate detection service (all 4 public methods) |
| `cell-editing.cy.ts` | Cypress | 23 | Row selection, text/date editing, save indicator |
| `duplicate-detection.cy.ts` | Cypress | 16 | Duplicate visual indicator, 409, flag clearing |
| `sorting-filtering.cy.ts` | Cypress | 56 | Column sorting, status filter bar |
| `add-row.spec.ts` | Playwright | 9 | Add row flow |
| `delete-row.spec.ts` | Playwright | 9 | Delete row flow |
| `duplicate-member.spec.ts` | Playwright | 7 | Duplicate member flow |
| `parallel-editing-conflict.spec.ts` | Playwright | 3 | Conflict resolution E2E |
| **Total** | | **~460** | |

---

## Planned New Tests (~27 tests)

### Tier 1 — Must Have (17 tests)

#### T1-1: 409 Conflict Recovery After Edit (8 Cypress tests)

**Gap:** The conflict modal flow (trigger → display → resolve) has unit coverage in `ConflictModal.test.tsx` and `useGridCellUpdate.test.ts`, but no E2E test verifies the full lifecycle: edit → 409 → modal → Keep Mine/Keep Theirs/Cancel → grid state correct.

**Spec refs:** TPG-R11-AC12 through AC15, AC18

**File:** `frontend/cypress/e2e/cell-editing-conflict.cy.ts` (new)

| # | Test Name | What It Verifies | Roles |
|---|-----------|-----------------|-------|
| 1 | `shows conflict modal when 409 VERSION_CONFLICT returned` | Edit a cell → intercept PUT to return 409 with mock serverRow → modal appears with correct field name, values | Admin |
| 2 | `Keep Mine sends forceOverwrite PUT and updates grid` | Click "Keep Mine" → verify PUT with forceOverwrite=true → grid cell shows user's value | Admin |
| 3 | `Keep Mine handles server error gracefully` | Intercept forceOverwrite PUT with 500 → error indicator shows, grid remains usable | Admin |
| 4 | `Keep Theirs reverts cell to server value` | Click "Keep Theirs" → grid cell shows server value, row has fresh updatedAt | Admin |
| 5 | `Cancel restores server row data including updatedAt` | Click "Cancel" → cell shows server value, subsequent edit does NOT trigger another 409 | Admin |
| 6 | `next edit after Keep Theirs uses fresh updatedAt` | Resolve with Keep Theirs → edit same cell again → PUT includes fresh expectedVersion → succeeds | Admin |
| 7 | `conflict modal shows all cascaded fields` | Edit requestType (triggers cascade) → mock 409 with multiple conflictFields → modal shows all fields | Admin |
| 8 | `conflict resolution works as Physician` | Login as Physician → trigger conflict → resolve with Keep Mine → verify success | Physician |

**Implementation pattern:**
```typescript
// Use cy.intercept to mock 409 responses
cy.intercept('PUT', '/api/data/*', (req) => {
  req.reply(409, {
    code: 'VERSION_CONFLICT',
    serverRow: { ...mockServerRow },
    conflictFields: [{ field: 'measureStatus', serverValue: 'AWV completed', clientValue: 'AWV scheduled' }],
    changedBy: 'other@gmail.com'
  });
}).as('conflictPut');

// Edit cell to trigger the intercepted 409
cy.selectAgGridDropdown(0, 'measureStatus', 'AWV scheduled');
cy.wait('@conflictPut');

// Verify modal appears (real component uses data-testid="conflict-backdrop")
cy.get('[data-testid="conflict-backdrop"]').should('be.visible');
cy.contains('Edit Conflict').should('be.visible');
```

---

#### T1-2: Row Add/Delete via Toolbar E2E (6 Cypress tests)

**Gap:** Playwright tests cover add/delete flows but Cypress provides better AG Grid interaction reliability. No Cypress test verifies the full add/delete lifecycle through the toolbar buttons.

**Spec refs:** TPG-R6-AC6 through AC10, TPG-R7-AC4 through AC7

**File:** `frontend/cypress/e2e/row-operations.cy.ts` (new)

| # | Test Name | What It Verifies | Roles |
|---|-----------|-----------------|-------|
| 1 | `Add Row button opens modal and creates row` | Click Add Row → fill form (Last, First, DOB) → submit → row appears in grid, count increases | Admin |
| 2 | `new row has null request type, quality measure, measure status` | After add → verify requestType, qualityMeasure, measureStatus cells are empty | Admin |
| 3 | `Delete button disabled when no row selected` | On load → Delete button has `disabled` attribute | Admin |
| 4 | `Delete button enabled after selecting a row, confirmation works` | Select row → click Delete → confirmation modal → Confirm → row removed, count decreases | Admin |
| 5 | `Cancel delete preserves the row` | Select row → click Delete → Cancel → row still present, count unchanged | Admin |
| 6 | `Add and delete work as Staff` | Login as staff1 → add row → delete row → verify both operations succeed | Staff |

**Implementation pattern:**
```typescript
it('Add Row button opens modal and creates row', () => {
  // Count rows using AG Grid DOM (data-testid="row-count" only exists in Vitest mocks)
  cy.get('.ag-center-cols-container .ag-row').then(($rows) => {
    const countBefore = $rows.length;
    cy.addTestRow('TestAdd, E2E');
    cy.wait(500);
    // Verify row count increased
    cy.get('.ag-center-cols-container .ag-row').should('have.length', countBefore + 1);
  });
});
```

---

#### T1-3: Toolbar Interaction Edge Cases (3 Vitest tests)

**Gap:** `Toolbar.test.tsx` has 15 tests covering button rendering, enabled/disabled states, callbacks, and save indicator. These are role-agnostic (Toolbar has no role prop — it receives `canDelete`, `canDuplicate` booleans from the parent). The existing tests already cover: Add Row always enabled, Delete/Copy disabled when false, enabled when true, and all 4 save status variants.

**Remaining gaps:** Button click handlers when disabled (does click propagate?), Member Info toggle state reflection, and the combined state "all enabled with selection".

**Spec refs:** TPG-R6, TPG-R7, TPG-R8

**File:** `frontend/src/components/layout/Toolbar.test.tsx` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `all 4 buttons enabled simultaneously when canDelete=true and canDuplicate=true` | Combined state: Add Row + Delete Row + Copy Member + Member Info all enabled at once |
| 2 | `Delete button click does NOT call onDeleteRow when canDelete=false` | Disabled button click protection (supplements existing "calls when enabled" test) |
| 3 | `Member Info button reflects showMemberInfo toggle state` | showMemberInfo=true → button has active/pressed visual state |

**Already covered (15 existing tests):** Add Row always enabled, Delete/Copy disabled states, Delete/Copy enabled states, Add Row callback, save indicator (idle/saving/saved/error), button rendering.

**Note:** Toolbar is role-agnostic by design. Role-based behavior is verified via T2-2 (Cypress grid editing per role) which tests the actual grid experience per login.

**Implementation pattern:**
```typescript
it('all 4 buttons enabled simultaneously when canDelete=true and canDuplicate=true', () => {
  render(<Toolbar {...baseProps} canDelete={true} canDuplicate={true} />);
  expect(screen.getByRole('button', { name: /add row/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /delete row/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /copy member/i })).toBeEnabled();
  expect(screen.getByRole('button', { name: /member info/i })).toBeEnabled();
});
```

---

### Tier 2 — Should Have (10 tests)

#### T2-1: Duplicate Detection Edge Cases (4 Jest tests)

**Gap:** `duplicateDetector.test.ts` has 38 tests across 4 methods (checkForDuplicate, detectAllDuplicates, updateDuplicateFlags, syncAllDuplicateFlags). Existing tests cover null/empty fields, pairs/triples detection, and different patientIds. Missing: deletion-triggered flag recalculation and whitespace/case edge cases.

**Spec refs:** TPG-R9-AC7, AC9, AC10, AC11

**File:** `backend/src/services/__tests__/duplicateDetector.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `deleting one of two duplicates clears flag on remaining` | Delete row A from pair → syncAllDuplicateFlags → row B.isDuplicate = false |
| 2 | `three-way duplicate: deleting one leaves two still flagged` | 3 rows match → delete 1 → remaining 2 still isDuplicate=true |
| 3 | `duplicate check with whitespace-padded requestType` | " AWV " should match "AWV" after trim (or should it not? Test current behavior) |
| 4 | `duplicate flag recalculated when qualityMeasure edited from match to non-match` | Edit row B's QM → no longer matches row A → both isDuplicate=false |

**Already covered:** Cross-physician detection (detectAllDuplicates tests different patientIds). Case sensitivity (Prisma default behavior, not a code concern).

---

#### T2-2: Grid Editing Permissions Per Role (6 Cypress tests)

**Gap:** No test verifies which columns each role can actually edit in the live grid. The execution plan decision says all roles can edit, but this should be verified.

**Spec refs:** TPG-R2, TPG-R4 (role variants)

**File:** `frontend/cypress/e2e/grid-editing-roles.cy.ts` (new)

| # | Test Name | What It Verifies | Role |
|---|-----------|-----------------|------|
| 1 | `Admin can edit requestType dropdown` | Login admin → double-click requestType → dropdown opens → select value → saves | Admin |
| 2 | `Admin can edit notes text field` | Login admin → double-click notes → type text → blur → saves | Admin |
| 3 | `Physician can edit measureStatus dropdown` | Login phy1 → edit measureStatus → saves successfully | Physician |
| 4 | `Physician can edit member name` | Login phy1 → edit memberName → saves | Physician |
| 5 | `Staff can edit requestType dropdown` | Login staff1 → edit requestType → saves | Staff |
| 6 | `Staff can edit notes text field` | Login staff1 → edit notes → saves | Staff |

**Implementation pattern:**
```typescript
describe('Grid editing as Physician', () => {
  beforeEach(() => {
    cy.login('phy1@gmail.com', 'welcome100');
    cy.waitForAgGrid();
  });

  it('can edit measureStatus dropdown', () => {
    cy.selectAgGridDropdown(0, 'measureStatus', 'AWV completed');
    cy.wait(500);
    cy.getAgGridCell(0, 'measureStatus').should('contain.text', 'AWV completed');
  });
});
```

---

## Tests NOT Planned (Deferred to Tier 3)

These gaps from the M2 requirements spec are deprioritized because they are low-risk or already partially covered:

| Gap | Reason Deferred |
|-----|----------------|
| Column width assertions (TPG-R1-AC13) | Low risk — visual, not functional |
| Phone formatting (TPG-R1-AC14-15) | Low risk — cosmetic |
| cellEditorParams callbacks (TPG-R2-AC8-9) | Covered by Cypress cascading-dropdowns tests |
| cellEditorSelector logic (TPG-R2-AC10-13) | Covered by Cypress row-color-comprehensive tests |
| Date format variants in valueSetter (TPG-R3-AC7-9) | Covered by Cypress cell-editing tests |
| Tab navigation between cells (TPG-R4-AC8) | Nice-to-have, low defect risk |
| Special character handling (TPG-R4-AC9) | Low risk for internal app |
| Sort three-click cycle (TPG-R10-AC7) | Already tested in sorting-filtering.cy.ts |
| Remote row handlers (TPG-R13-AC6-12) | Deferred to M6 Realtime module |
| Performance NFRs (TPG-NFR-P1-4) | Separate performance testing phase |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `frontend/cypress/e2e/cell-editing-conflict.cy.ts` | New | 8 | TODO |
| `frontend/cypress/e2e/row-operations.cy.ts` | New | 6 | TODO |
| `frontend/src/components/layout/Toolbar.test.tsx` | Extend | +3 | TODO |
| `backend/src/services/__tests__/duplicateDetector.test.ts` | Extend | +4 | TODO |
| `frontend/cypress/e2e/grid-editing-roles.cy.ts` | New | 6 | TODO |
| **Total** | | **27** | |

---

## Done Criteria

- [ ] All 27 tests written and passing
- [ ] No regressions in existing M2 tests (~460 baseline)
- [ ] 409 conflict recovery works for Admin + Physician (8 tests green)
- [ ] Row add/delete works for Admin + Staff (6 tests green)
- [ ] Toolbar edge cases pass (3 tests green)
- [ ] Duplicate edge cases pass (4 tests green)
- [ ] Grid editing verified for all 3 roles (6 tests green)
- [ ] Full 4-layer pyramid passes
- [ ] REGRESSION_TEST_PLAN.md updated with new test cases
- [ ] TESTING.md inventory updated with new files
