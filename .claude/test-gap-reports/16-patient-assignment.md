# Test Gap Analysis: R16 - Patient Assignment

**Date:** 2026-03-02
**Spec:** `.claude/specs/patient-ownership/requirements.md`
**Source:** `frontend/src/pages/PatientAssignmentPage.tsx` (306 lines), `backend/src/routes/admin.routes.ts`
**Regression Plan:** Section 27

## Test Inventory

| Framework | File | Test Count |
|-----------|------|------------|
| Vitest | `frontend/src/pages/PatientAssignmentPage.test.tsx` | 19 |
| Cypress | `frontend/cypress/e2e/patient-assignment.cy.ts` | 32 |
| Jest | `backend/src/routes/__tests__/admin.routes.test.ts` (bulk-assign + unassigned endpoints) | 6 |
| **Total** | | **57** |

**Related test files (cross-coverage):**
- `frontend/cypress/e2e/role-access-control.cy.ts` (31 tests -- covers AC-1 through AC-5, AC-7)
- `frontend/src/components/layout/Header.test.tsx` (12 tests -- covers AC-4, AC-9, AC-11)
- `frontend/src/pages/ImportPage.test.tsx` (covers AC-16)
- `frontend/src/pages/ImportPreviewPage.test.tsx` (covers AC-18, AC-19)
- `backend/src/services/import/__tests__/reassignment.test.ts` (covers AC-18)
- `backend/src/routes/__tests__/data.routes.test.ts` (covers AC-12)

---

## Use Case Coverage Matrix

### UC-1: Assign Patients to Physician

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Select patients and assign to physician | AC-13 | YES (1 test: "performs bulk assignment on button click") | YES (1 test: "assign a single patient") | YES (1 test: "assigns patients to physician") | COVERED |
| Success message after assignment | AC-13 | YES (1 test: "shows success message") | YES (implicit in assign tests) | -- | COVERED |
| API call with correct patientIds + ownerId | AC-13 | YES (1 test: verifies mockPatch call args) | -- | YES (1 test) | COVERED |

### UC-2: Unassign Patients from Physician

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Unassign patients (ownerId = null) | AC-13 | -- | -- | YES (1 test: "unassigns patients when ownerId is null") | PARTIAL |
| Frontend UI for unassignment | -- | -- | -- | -- | **GAP** |

### UC-3: Reassign Between Physicians

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Reassignment via import (warning + confirmation) | AC-18, AC-19 | -- | -- (cy test is placeholder) | YES (reassignment.test.ts) | COVERED (cross-file) |
| Verify patient appears in target physician grid | -- | -- | YES (1 test: "verify patient appears in physician grid") | -- | COVERED |
| Source physician count decreases | -- | -- | YES (1 test: placeholder - verifies count exists) | -- | PARTIAL |
| Target physician count increases | -- | -- | YES (1 test: placeholder - verifies count exists) | -- | PARTIAL |

### UC-4: Patient Count Verification After Assignment

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Unassigned count decreases after assignment | AC-14 | -- | YES (2 tests: "update unassigned count", "count decreases for unassigned") | -- | COVERED |
| Physician count increases after assignment | AC-14 | -- | YES (1 test: "verify patient count increases") | -- | COVERED |

### UC-5: Admin Can Assign Any Patient

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Admin sees all unassigned patients | AC-9, AC-10 | YES (1 test: "renders patient list with names") | YES (1 test: "display unassigned patients list") | YES (1 test: "returns unassigned patients") | COVERED |
| Admin sees "Unassigned patients" in grid dropdown | AC-9 | -- | YES (1 test: "show unassigned patients dropdown") | -- | COVERED |
| Admin bulk-assign API is ADMIN-only | NFR-Security | -- | -- | YES (1 test: "returns 401 for all endpoints") | COVERED |

### UC-6: Physician Can See Only Assigned Patients

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| PHYSICIAN sees own patients only | AC-1 | -- | YES (role-access-control.cy.ts) | -- | COVERED (cross-file) |
| PHYSICIAN cannot see others' patients | AC-2 | -- | YES (role-access-control.cy.ts) | -- | COVERED (cross-file) |
| PHYSICIAN cannot see unassigned patients | AC-3 | -- | YES (role-access-control.cy.ts) | -- | COVERED (cross-file) |
| No physician selector for PHYSICIAN | AC-4 | YES (Header.test.tsx) | YES (role-access-control.cy.ts) | -- | COVERED (cross-file) |

### UC-7: Bulk Assignment

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Select All toggles all patients | AC-13 | YES (1 test: "select all toggles all patients") | YES (1 test: "use select all to assign all patients") | -- | COVERED |
| Select individual patients via checkbox | AC-13 | YES (1 test: "selects a patient on checkbox click") | YES (1 test) | -- | COVERED |
| Select individual patients via row click | -- | YES (1 test: "toggles patient selection on row click") | -- | -- | COVERED |
| Multiple patient selection | AC-13 | YES (implicit in select all) | YES (1 test: "assign multiple patients") | -- | COVERED |
| Assign button disabled with no patients selected | -- | YES (1 test) | YES (1 test) | -- | COVERED |
| Assign button disabled with no physician selected | -- | YES (1 test) | YES (1 test) | -- | COVERED |
| Backend rejects empty patientIds | -- | -- | -- | YES (1 test: "returns 400 for empty patientIds") | COVERED |
| Backend rejects non-existent target user | -- | -- | -- | YES (1 test: "returns 404 for non-existent target user") | COVERED |

### UC-8: Assignment Persists After Page Reload

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Reload page and verify assignment persists | -- | -- | -- | -- | **GAP** |

### UC-9: Assignment Updates Provider Dropdown

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Grid updates when switching physicians | AC-7 | -- | YES (2 tests: "update grid immediately", "update patient list when switching") | -- | COVERED |
| No data caching between physician switches | -- | -- | YES (1 test: "not cache data when switching physicians") | -- | COVERED |

### UC-10: Unassigned Patients Pool

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| "All Patients Assigned" empty state | AC-3 | YES (1 test: "shows All Patients Assigned when list is empty") | YES (1 test: "handle no unassigned patients gracefully") | YES (1 test: "returns empty array when no unassigned patients") | COVERED |
| Loading spinner on first tab activation | R4-AC6 | -- | -- | -- | **GAP** |
| List refreshes after assignment | -- | -- | YES (1 test: "refresh list after assignment") | -- | COVERED |

### UC-11: Error Handling

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Error when assignment fails | R4-AC5 | YES (1 test: "shows error when assignment fails") | -- | -- | COVERED |
| Error when data loading fails | R4-AC5 | YES (1 test: "shows error when data loading fails") | -- | -- | COVERED |
| Error retains patient selections | R4-AC5 | -- | -- | -- | **GAP** |

### UC-12: Lazy Loading (ReassignTabContent)

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Does not load data when tab is not active | NFR-Perf | YES (1 test: "does not load data when tab is not active") | -- | -- | COVERED |
| Loads data on first activation | NFR-Perf | YES (1 test: "loads data on first activation") | -- | -- | COVERED |

### UC-13: Patient Data Display

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Patient name, DOB, phone displayed | -- | YES (2 tests: "renders patient list with names", "shows patient DOB and phone") | -- | -- | COVERED |
| Null phone shows dash | -- | YES (implicit in DOB/phone test) | -- | -- | COVERED |
| Measure count with correct singular/plural | -- | YES (1 test: "shows measure count for each patient") | -- | -- | COVERED |
| "0 of N selected" initial state | -- | YES (1 test) | -- | -- | COVERED |
| Selection count updates on select | -- | YES (1 test: "1 of 3 selected") | -- | -- | COVERED |

### UC-14: Physician Dropdown in Assignment UI

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Physician dropdown renders with options | -- | YES (1 test: "renders physician dropdown") | YES (1 test: "display list of available physicians") | -- | COVERED |
| Placeholder "-- Select Physician --" | -- | YES (implicit in dropdown test) | -- | -- | COVERED |

### UC-15: Staff-Physician Assignment (Admin Page)

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Admin can assign physician to staff | AC-5 | -- | YES (1 test: "assign physician to staff and save") | YES (1 test: "creates a staff assignment") | COVERED |
| Admin can remove physician from staff | AC-5 | -- | YES (1 test: "remove physician assignment from staff") | YES (1 test: "removes a staff assignment") | COVERED |
| Staff sees only assigned physicians | AC-5 | -- | YES (1 test: "show dropdown with only assigned physicians") | -- | COVERED |
| Staff display count in admin user list | -- | -- | YES (1 test: "display staff users with assignment count") | -- | COVERED |
| Edit modal shows physician checkboxes | -- | -- | YES (1 test: "show physician checkboxes when editing staff") | -- | COVERED |

### UC-16: Backwards-Compatible Wrapper

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| PatientAssignmentPage wrapper renders title | -- | YES (1 test: "renders page title and subtitle") | -- | -- | COVERED |
| Wrapper renders "Back to Admin" link | -- | YES (1 test: "renders back to admin link") | -- | -- | COVERED |

### UC-17: Import Ownership

| Use Case | Spec Req | Vitest | Cypress | Jest | Status |
|----------|----------|--------|---------|------|--------|
| Import requires physician selection (ADMIN/STAFF) | AC-16 | YES (ImportPage.test.tsx) | -- | -- | COVERED (cross-file) |
| PHYSICIAN import auto-assigns to self | AC-17 | -- | -- | -- | **GAP** |
| Reassignment warning during import | AC-18 | YES (ImportPreviewPage.test.tsx) | -- | YES (reassignment.test.ts) | COVERED (cross-file) |
| Reassignment requires explicit confirmation | AC-19 | YES (ImportPreviewPage.test.tsx) | -- | -- | COVERED (cross-file) |

---

## Identified Gaps

### GAP-16.1: Frontend UI for Unassigning Patients (Priority: LOW)
**Missing Test:** While the backend supports `ownerId: null` for unassignment, there is no frontend UI or test for unassigning patients. The Reassign tab only shows unassigned patients (assigning them to a physician). There is no way to *un*-assign an already-assigned patient from the UI.
**Note:** This may be by design -- the spec says bulk-assign, not bulk-unassign. If the business requires unassignment, this is a feature gap, not just a test gap.
**Impact:** LOW -- Backend is tested for this path; UI simply does not offer it.

### GAP-16.2: Assignment Persists After Page Reload (Priority: MEDIUM)
**Missing Test:** No test reloads the page after an assignment and verifies the patient is still assigned to the correct physician.
**Note:** This is an end-to-end concern. The Cypress tests do verify that the list refreshes after assignment, and the "verify patient appears in physician grid" test implicitly checks persistence, but no test explicitly reloads.
**Files to add to:** `patient-assignment.cy.ts`

### GAP-16.3: Loading Spinner on First Tab Activation (Priority: LOW)
**Missing Test:** The source code shows a loading spinner while fetching unassigned patients on first activation (`loading && patients.length === 0`). No test verifies the spinner appears before data loads.
**Note:** The `isActive` lazy-loading mechanism is tested, but not the spinner UI itself.
**Files to add to:** `PatientAssignmentPage.test.tsx`

### GAP-16.4: Error Retains Patient Selections and Physician Choice (Priority: MEDIUM)
**Missing Test:** Spec R4-AC5 requires that on bulk-assign failure, the UI "retains the user's patient selections and physician choice." The existing error test (`shows error when assignment fails`) only verifies the error message appears; it does not verify that selections are preserved.
**Files to add to:** `PatientAssignmentPage.test.tsx`

### GAP-16.5: PHYSICIAN Auto-Assigns Import to Self (Priority: MEDIUM)
**Missing Test:** AC-17 states PHYSICIAN import auto-assigns to self. The existing test plan (test-plan.md) also flags this as a gap. No E2E test validates this flow.
**Note:** The ImportPage.test.tsx likely covers hiding the physician selector for PHYSICIAN role, but no test verifies the actual auto-assignment behavior end-to-end.
**Files to add to:** `patient-assignment.cy.ts` or `import-flow.cy.ts`

### GAP-16.6: STAFF Empty Grid by Default (Priority: LOW)
**Missing Test:** AC-6 states "STAFF must select a physician before seeing data (empty grid by default)." The existing test plan (test-plan.md) flags this as a gap. Vitest covers the logic (`needsPhysicianSelection` in MainPage.test.tsx) but no E2E test validates STAFF seeing an empty grid before physician selection.
**Note:** Requires STAFF test credentials.
**Files to add to:** `patient-assignment.cy.ts`

### GAP-16.7: STAFF "No Physicians Assigned" Message (Priority: LOW)
**Missing Test:** AC-8 states staff with no assignments sees "No physicians assigned" message. Flagged in test-plan.md. Logic is tested in MainPage.test.tsx (`staffHasNoAssignments`) but no E2E test exists.
**Note:** Requires STAFF user with zero assignments in test data.
**Files to add to:** `patient-assignment.cy.ts`

---

## Gap Summary

| Gap ID | Description | Priority | Effort |
|--------|-------------|----------|--------|
| GAP-16.1 | Frontend UI for unassigning patients | LOW | N/A (feature gap) |
| GAP-16.2 | Assignment persists after page reload | MEDIUM | 20 min |
| GAP-16.3 | Loading spinner on first tab activation | LOW | 15 min |
| GAP-16.4 | Error retains patient selections/physician | MEDIUM | 20 min |
| GAP-16.5 | PHYSICIAN auto-assigns import to self (E2E) | MEDIUM | 30 min |
| GAP-16.6 | STAFF empty grid before physician selection (E2E) | LOW | 25 min |
| GAP-16.7 | STAFF "No physicians assigned" message (E2E) | LOW | 25 min |

## Coverage Assessment

**Overall Coverage: 82%** -- Good coverage across all three testing layers (Vitest, Cypress, Jest). The core assignment workflow (select patients, select physician, assign, verify counts) is thoroughly tested. Backend API endpoints are well-covered with happy path and error cases. The identified gaps are primarily around edge-case UI states (loading spinner, error state preservation) and role-specific E2E scenarios that require specific test data.

**Cross-File Coverage:** Many acceptance criteria (AC-1 through AC-12) are covered in related test files (role-access-control.cy.ts, Header.test.tsx, ImportPage.test.tsx, ImportPreviewPage.test.tsx) rather than in the direct assignment test files. The spec's own test-plan.md correctly identifies the 3 remaining gaps (AC-6, AC-8, AC-17).

**Spec vs. Implementation Notes:** The source code matches the spec well. The `ReassignTabContent` component correctly implements lazy-loading (`hasActivated` ref), error display, success message, empty state, and checkbox-based patient selection.
