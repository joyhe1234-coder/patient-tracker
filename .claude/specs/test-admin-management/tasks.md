# Tasks: Test Admin Management (M5)

## Overview

This task breakdown implements the 16 new tests + 1 code fix identified in the [requirements spec](requirements.md). There are 13 coverage gaps (GAP-01 through GAP-13) across 4 test frameworks plus one production code fix.

**Scope**: 16 new tests + 1 code fix, organized into 9 tasks across 4 frameworks.

### Task Summary

| Task | Priority | Framework | Tests | Gaps Covered | Effort |
|------|----------|-----------|-------|--------------|--------|
| T1 | HIGH | Jest | 3 | GAP-01, GAP-02, GAP-12 | M |
| T2 | HIGH | Jest | 1 (code fix + test) | GAP-04 | M |
| T3 | MEDIUM | Jest | 3 | GAP-05, GAP-07, GAP-08 | S |
| T4 | LOW | Vitest | 1 | GAP-09 | S |
| T5 | MEDIUM | Vitest | 2 | GAP-06, GAP-10 | S |
| T6 | HIGH | Playwright | 3 | GAP-01, GAP-02, GAP-03 | L |
| T7 | MEDIUM | Cypress | 2 | GAP-06, GAP-10 | M |
| T8 | MEDIUM | Cypress | 1 | GAP-11 | M |
| T9 | -- | All | 0 | -- | S |

**Total: 16 new tests + 1 code fix across 8 implementation tasks + 1 regression verification task.**

### Execution Order

```
Phase 1 - Backend (Jest):  T2 (code fix) -> T1 -> T3
Phase 2 - Frontend (Vitest): T4 -> T5
Phase 3 - E2E (Playwright + Cypress): T6 -> T7 -> T8
Phase 4 - Regression: T9
```

T2 is first because the code fix (GAP-04) must land before any tests that touch role-change behavior. Within each phase, HIGH priority tasks come first.

---

## Phase 1: Backend Jest Tests

### Task T2-1: CODE FIX -- StaffAssignment cleanup on role change (TDD)

- **Priority**: HIGH
- **Framework**: Jest (RED/GREEN/REFACTOR) + production code fix
- **Target File (test)**: `backend/src/routes/__tests__/admin.routes.test.ts`
- **Target File (fix)**: `backend/src/routes/handlers/userHandlers.ts`
- **Tests to Write**: 1 (TAM-T04-FIX via TAM-FIX-01)
- **Gap**: GAP-04 (TAM-R02:AC05)
- **Description**: The `updateUser` handler in `userHandlers.ts` does NOT clean up `StaffAssignment` records when a user's role changes from STAFF to a non-STAFF role (e.g., PHYSICIAN). Only `deleteUser` currently performs this cleanup (L347-349). This is a production bug that leaves orphaned StaffAssignment rows.
- **Acceptance Criteria**:
  - [ ] **RED**: Write a failing Jest test in `admin.routes.test.ts` that:
    1. Creates a STAFF user with a StaffAssignment to a physician
    2. PUTs to `/api/admin/users/:id` changing roles from `[STAFF]` to `[PHYSICIAN]`
    3. Asserts that the StaffAssignment records for that user are deleted (count === 0)
    4. Test MUST FAIL before the code fix is applied
  - [ ] **GREEN**: Fix `userHandlers.ts` `updateUser()` handler (around L276-282) to add StaffAssignment cleanup when the new roles do not include STAFF but the old roles did. Model after the cleanup logic in `deleteUser()` (L347-349):
    ```typescript
    // After role update, cleanup StaffAssignment if no longer STAFF
    if (!newRoles.includes('STAFF') && oldRoles.includes('STAFF')) {
      await prisma.staffAssignment.deleteMany({ where: { staffId: userId } });
    }
    ```
  - [ ] **GREEN**: Test MUST PASS after the fix
  - [ ] **REFACTOR**: Verify no regressions in existing admin.routes tests (34 tests)
- **Dependencies**: None (first task)
- **Estimated Effort**: M

---

### Task T1-1: Backend tests for own-role protection, user reactivation, and audit detail content

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/routes/__tests__/admin.routes.test.ts`
- **Tests to Write**: 3 (TAM-T01, TAM-T06, TAM-T07)
- **Description**: Three backend API tests covering gaps in user CRUD operations: (1) admin cannot change own roles, (2) admin can reactivate a deactivated user, (3) update audit log includes field-level change details.
- **Acceptance Criteria**:
  - [ ] **TAM-T01 (GAP-01, TAM-R01:AC08)**: Test that `PUT /api/admin/users/:id` returns 400 with error code `CANNOT_CHANGE_OWN_ROLE` when the authenticated admin (e.g., userId=1) attempts to change their own roles (e.g., from `[ADMIN]` to `[ADMIN, PHYSICIAN]`). The test should use the admin's own ID as the `:id` parameter.
  - [ ] **TAM-T06 (GAP-02, TAM-R01:AC13)**: Test that `PUT /api/admin/users/:id` with `{ isActive: true }` on a previously deactivated user returns 200 and the response body shows `isActive: true`. Requires a deactivated user to exist in the test setup (create then deactivate, or mock Prisma to return a deactivated user).
  - [ ] **TAM-T07 (GAP-12, TAM-R01:AC07)**: Test that `PUT /api/admin/users/:id` with `{ displayName: "New Name" }` creates an audit log entry whose `changes` JSON includes a `fields` array containing `{ field: "displayName", old: "<original>", new: "New Name" }`. Assert the audit log was created with the correct content via the Prisma mock.
  - [ ] All 3 tests pass
  - [ ] No regressions in existing 34 admin.routes tests
- **Dependencies**: T2-1 (code fix must land first to avoid test interference with role-change logic)
- **Estimated Effort**: M

---

### Task T3-1: Backend tests for isValidRoleCombination, audit log filtering, and limit cap

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target File**: `backend/src/routes/__tests__/admin.routes.test.ts`
- **Tests to Write**: 3 (TAM-T02, TAM-T03 as one describe block, TAM-T04, TAM-T05)
- **Description**: Three test groups covering: (1-2) direct unit tests for the exported `isValidRoleCombination()` pure function with 8 assertions, (3) audit log filter parameters, (4) audit log limit cap at 100. Note: TAM-T02 and TAM-T03 are logically one `describe` block with 8 assertions but count as 2 test IDs per the requirements.
- **Acceptance Criteria**:
  - [ ] **TAM-T02 + TAM-T03 (GAP-05, TAM-R02:AC07-08)**: Import `isValidRoleCombination` from `admin.routes.ts` and test:
    - Returns `true` for: `['PHYSICIAN']`, `['ADMIN']`, `['STAFF']`, `['ADMIN', 'PHYSICIAN']`
    - Returns `false` for: `['STAFF', 'PHYSICIAN']`, `['STAFF', 'ADMIN']`, `['STAFF', 'ADMIN', 'PHYSICIAN']`, `[]`
    - These can be in a single `describe('isValidRoleCombination')` block with individual `it` calls or a single `it.each`
  - [ ] **TAM-T04 (GAP-07, TAM-R04:AC05)**: Test that `GET /api/admin/audit-log?action=LOGIN&userId=1&startDate=2026-01-01&endDate=2026-02-01` returns only matching entries. Mock Prisma `auditLog.findMany` and verify the `where` clause includes the correct filter conditions.
  - [ ] **TAM-T05 (GAP-08, TAM-R04:AC07)**: Test that `GET /api/admin/audit-log?limit=200` caps the result at 100 entries. Verify the response pagination metadata shows `limit: 100` (not 200).
  - [ ] All tests pass
  - [ ] No regressions in existing admin.routes tests
- **Dependencies**: None (independent of T1-1 and T2-1)
- **Estimated Effort**: S

---

## Phase 2: Frontend Vitest Tests

### Task T4-1: Empty audit log UI state

- **Priority**: LOW
- **Framework**: Vitest
- **Target File**: `frontend/src/pages/AdminPage.test.tsx`
- **Tests to Write**: 1 (TAM-T08)
- **Gap**: GAP-09 (TAM-R04:AC10)
- **Description**: Test that the AdminPage Audit Log tab renders an appropriate empty state message when the API returns zero entries. Currently there are 21 AdminPage tests but none mock an empty audit log response.
- **Acceptance Criteria**:
  - [ ] **TAM-T08 (GAP-09)**: Add a test in `AdminPage.test.tsx` that:
    1. Mocks the audit log API to return `{ entries: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }`
    2. Renders AdminPage, switches to the Audit Log tab
    3. Asserts that a "No audit log entries" (or similar) empty state message is displayed
    4. If the component does NOT currently render an empty state, a small component change may be needed (add conditional rendering)
  - [ ] Test passes
  - [ ] No regressions in existing 21 AdminPage tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T5-1: STAFF empty-state UI tests (no assignments + no physician selected)

- **Priority**: MEDIUM
- **Framework**: Vitest
- **Target File**: `frontend/src/components/layout/Header.test.tsx` and/or `frontend/src/pages/MainPage.test.tsx`
- **Tests to Write**: 2 (TAM-T09, TAM-T10)
- **Gaps**: GAP-06 (TAM-R03:AC07 + TAM-R07:AC07), GAP-10 (TAM-R07:AC06)
- **Description**: Two frontend component tests for STAFF user empty states: (1) STAFF with zero physician assignments sees "No physicians assigned" message, (2) STAFF with assignments but no physician selected yet sees an empty grid / prompt.
- **Acceptance Criteria**:
  - [ ] **TAM-T09 (GAP-06)**: Test that when a STAFF user has an empty `assignedPhysicians` array in the auth store, the Header or MainPage renders "No physicians assigned" (or equivalent). Mock the auth store with `user.roles: ['STAFF']` and `assignedPhysicians: []`.
  - [ ] **TAM-T10 (GAP-10)**: Test that when a STAFF user has physician assignments but `selectedPhysicianId` is null/undefined, the grid area shows an empty state or "Select a physician" prompt rather than loading all data. Mock the auth store with assignments present but no selection made.
  - [ ] Both tests pass
  - [ ] No regressions in existing Header tests (22) or MainPage tests
- **Dependencies**: None
- **Estimated Effort**: S

---

## Phase 3: E2E Tests

### Task T6-1: Playwright E2E -- admin self-edit protection, user reactivation, role change effects

- **Priority**: HIGH
- **Framework**: Playwright
- **Target File**: `frontend/e2e/admin-management.spec.ts`
- **Tests to Write**: 3 (TAM-T11, TAM-T12, TAM-T13)
- **Gaps**: GAP-01 (TAM-R01:AC08), GAP-02 (TAM-R01:AC13), GAP-03 (TAM-R02:AC04)
- **Description**: Three end-to-end tests using Playwright that exercise multi-step admin workflows requiring real browser interaction and multi-user login flows. These are the highest-value E2E tests because they cover gaps that cannot be adequately tested at the unit/component level.
- **Acceptance Criteria**:
  - [ ] **TAM-T13 (GAP-01)**: Admin opens their own Edit User modal, changes their own role checkboxes (e.g., adds PHYSICIAN), clicks Save, and expects an error message containing "cannot change your own role" or error code `CANNOT_CHANGE_OWN_ROLE`. The modal should remain open with the error displayed.
  - [ ] **TAM-T11 (GAP-02)**: Admin deactivates a user via the Edit User modal (uncheck Active checkbox, save), verifies the user list shows "Inactive" status, then reactivates the same user (check Active, save), and verifies the user can log in again. This requires:
    1. Admin login -> open Edit modal for target user
    2. Uncheck Active -> Save -> Verify "Inactive" in user list
    3. Open Edit modal again -> Check Active -> Save -> Verify "Active" in user list
    4. Logout admin -> Login as reactivated user -> Verify successful login
  - [ ] **TAM-T12 (GAP-03)**: Admin changes a user's role from PHYSICIAN to STAFF via the Edit User modal, then the affected user logs in and sees STAFF-level access. This requires:
    1. Admin login -> Edit target PHYSICIAN user -> Change role to STAFF (+ assign at least one physician) -> Save
    2. Logout admin -> Login as the now-STAFF user
    3. Verify: physician selector dropdown is visible, "Admin" nav link is NOT visible, grid does not auto-load data
  - [ ] All 3 tests pass in `npm run e2e`
  - [ ] No regressions in existing 8 Playwright admin-management tests
  - [ ] Use existing `LoginPage` POM for login/logout flows
- **Dependencies**: T2-1 (code fix for StaffAssignment cleanup must be in place before role-change E2E tests)
- **Estimated Effort**: L

---

### Task T7-1: Cypress E2E -- STAFF empty states (no assignments + no selection)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/role-access-control.cy.ts`
- **Tests to Write**: 2 (TAM-T14, TAM-T15)
- **Gaps**: GAP-06 (TAM-R03:AC07), GAP-10 (TAM-R07:AC06)
- **Description**: Two Cypress E2E tests for STAFF user empty-state scenarios that complement the Vitest component tests in T5-1. These run in a real browser against the seeded database, verifying the full stack behavior.
- **Acceptance Criteria**:
  - [ ] **TAM-T14 (GAP-06)**: Create or use a STAFF user with zero physician assignments. Login as that user. Verify the page displays "No physicians assigned" (or equivalent message) instead of the patient grid. The physician selector dropdown should either not appear or be empty.
  - [ ] **TAM-T15 (GAP-10)**: Login as a STAFF user who HAS physician assignments. Before selecting any physician from the dropdown, verify the grid area is empty or shows a "Select a physician" prompt. No API call to fetch patient data should occur until a physician is selected.
  - [ ] Both tests pass in `npm run cypress:run`
  - [ ] No regressions in existing 42 role-access-control tests
  - [ ] Tests use API-level seeding or existing seed data users
- **Dependencies**: None (can run in parallel with T6-1 if test infrastructure allows)
- **Estimated Effort**: M

---

### Task T8-1: Cypress E2E -- PHYSICIAN auto-assign during import

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/patient-assignment.cy.ts`
- **Tests to Write**: 1 (TAM-T16)
- **Gap**: GAP-11 (TAM-R09:AC05)
- **Description**: A cross-feature Cypress E2E test verifying that when a PHYSICIAN imports patient data, the imported patients are automatically assigned to that physician (no physician selector shown) and appear in the physician's grid afterward.
- **Acceptance Criteria**:
  - [ ] **TAM-T16 (GAP-11)**: Login as a PHYSICIAN user. Navigate to the Import page. Verify the physician selector is NOT shown (auto-assigns to self). Upload a test import file. Complete the import flow. Navigate back to the patient grid. Verify at least one newly imported patient appears in the grid (assigned to the logged-in physician).
  - [ ] Test passes in `npm run cypress:run`
  - [ ] No regressions in existing 32 patient-assignment tests
  - [ ] Uses a small test import file (e.g., test-sutter.xlsx or similar fixture)
- **Dependencies**: None
- **Estimated Effort**: M

---

## Phase 4: Regression Verification

### Task T9-1: Full regression verification across all 4 test layers

- **Priority**: HIGH (gate task -- must pass before commit)
- **Framework**: All (Jest + Vitest + Playwright + Cypress)
- **Target File**: N/A (runs all test suites)
- **Tests to Write**: 0 (verification only)
- **Description**: Run the complete 4-layer test pyramid to ensure all new tests pass and no existing tests have regressed. This is the final gate before committing.
- **Acceptance Criteria**:
  - [ ] `cd backend && npm test` -- all tests pass (expected: 527 existing + 7 new = 534+)
  - [ ] `cd frontend && npm run test:run` -- all tests pass (expected: 296 existing + 3 new = 299+)
  - [ ] `cd frontend && npm run e2e` -- all tests pass (expected: 35 existing + 3 new = 38+)
  - [ ] `cd frontend && npm run cypress:run` -- all tests pass (expected: 283 existing + 3 new = 286+)
  - [ ] Zero test failures across all layers
  - [ ] No skipped tests (unless pre-existing and documented)
  - [ ] Test count totals recorded for commit message
- **Dependencies**: T1-1, T2-1, T3-1, T4-1, T5-1, T6-1, T7-1, T8-1 (all tasks complete)
- **Estimated Effort**: S

---

## Traceability Matrix

| Gap ID | Req:AC | Priority | Tasks | Test IDs |
|--------|--------|----------|-------|----------|
| GAP-01 | TAM-R01:AC08 | HIGH | T1-1, T6-1 | TAM-T01, TAM-T13 |
| GAP-02 | TAM-R01:AC13 | HIGH | T1-1, T6-1 | TAM-T06, TAM-T11 |
| GAP-03 | TAM-R02:AC04 | HIGH | T6-1 | TAM-T12 |
| GAP-04 | TAM-R02:AC05 | HIGH | T2-1 | TAM-FIX-01 + test |
| GAP-05 | TAM-R02:AC07-08 | MEDIUM | T3-1 | TAM-T02, TAM-T03 |
| GAP-06 | TAM-R03:AC07 + TAM-R07:AC07 | MEDIUM | T5-1, T7-1 | TAM-T09, TAM-T14 |
| GAP-07 | TAM-R04:AC05 | MEDIUM | T3-1 | TAM-T04 |
| GAP-08 | TAM-R04:AC07 | LOW | T3-1 | TAM-T05 |
| GAP-09 | TAM-R04:AC10 | LOW | T4-1 | TAM-T08 |
| GAP-10 | TAM-R07:AC06 | MEDIUM | T5-1, T7-1 | TAM-T10, TAM-T15 |
| GAP-11 | TAM-R09:AC05 | MEDIUM | T8-1 | TAM-T16 |
| GAP-12 | TAM-R01:AC07 | LOW | T1-1 | TAM-T07 |
| GAP-13 | TAM-R05:AC08 | LOW | -- | Deferred (edge case, low risk; current mount-level test is sufficient) |

> **Note on GAP-13**: Tab state preservation (TAM-R05:AC08) is deferred. The current Vitest test verifies that both tab contents are mounted simultaneously (CSS toggle pattern), which means React state is inherently preserved. A test for form input values surviving tab switch would add minimal value. If prioritized later, it would go into `PatientManagementPage.test.tsx` (Vitest) or a new Cypress test.

---

## Test Count Impact

| Layer | Before | New | After |
|-------|--------|-----|-------|
| Backend Jest (admin-scoped) | 34 | +8 | 42 |
| Frontend Vitest (admin-scoped) | 93 | +3 | 96 |
| Playwright E2E | 8 | +3 | 11 |
| Cypress E2E (admin-scoped) | 74 | +3 | 77 |
| **Total (admin scope)** | **209** | **+17** | **226** |
| **Total (all scopes incl. auth)** | **363** | **+17** | **380** |

> The +1 difference from requirements (+16) is because T2-1 adds a test for the code fix (GAP-04) which was listed as "Code Fix Required (Not a Test)" in requirements but requires a corresponding regression test.

---

## Risk Notes

- **T6-1 (Playwright E2E)** is the highest-effort task due to multi-user login flows. If the seeded database lacks the required users (e.g., a PHYSICIAN user that an admin can change to STAFF), test data setup must be added.
- **T2-1 (code fix)** modifies production code. The fix is straightforward (mirror deleteUser cleanup logic) but must be carefully scoped to avoid breaking existing update flows.
- **T7-1 and T8-1 (Cypress)** depend on specific seed data. If the seeded database doesn't include a STAFF user with zero assignments, the test setup in Cypress must create one via API calls in `beforeEach`.
