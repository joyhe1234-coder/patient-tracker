# M5 Admin & User Management — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.6
**Spec:** `.claude/specs/test-admin-management/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `admin.routes.test.ts` | Jest | 34 | User CRUD, staff assignments, audit log, bulk assign, unassigned patients, send temp password |
| `users.routes.test.ts` | Jest | 11 | Physician list endpoint, role-based filtering |
| `auth.test.ts` (middleware) | Jest | 15 | requireAuth, requireRole, optionalAuth |
| `data.routes.test.ts` | Jest | 49 | Data endpoints including ownership filtering |
| `AdminPage.test.tsx` | Vitest | 21 | Dashboard rendering, tabs, user list, role badges, audit log, send temp password, error/loading |
| `PatientAssignmentPage.test.tsx` | Vitest | 19 | Reassign tab: patient list, selection, bulk assign, empty state, errors |
| `PatientManagementPage.test.tsx` | Vitest | 21 | Tab visibility by role, default tab, tab switching, URL param handling |
| `Header.test.tsx` | Vitest | 21 | Physician dropdown visibility, unassigned option, role-based display |
| `ProtectedRoute.test.tsx` | Vitest | 9 | Auth guard: loading, redirect, role checks |
| `admin-management.spec.ts` | Playwright | 8 | Admin dashboard display, add/edit user modals, audit log tab, non-admin redirect, lockout |
| `patient-assignment.cy.ts` | Cypress | 32 | Assignment workflow, counts, physician switching, staff assignments |
| `role-access-control.cy.ts` | Cypress | 42 | Role-based page access, dropdown visibility, API auth, unassigned patients |
| **Total** | | **~282** | |

---

## Planned New Tests (~11 tests)

### Tier 2 — Should Have (11 tests)

#### T2-1: User Deactivation Cascading Effects (5 Jest + Playwright tests)

**Gap:** Deactivation sets `isActive=false`, unassigns patients, removes staff assignments, and creates an audit entry — but no test verifies the full cascade atomically. Reactivation (TAM-R01-AC13) has zero test coverage at any layer. Role change cleanup (TAM-R02-AC05) is also untested.

**Spec refs:** TAM-R01-AC09, TAM-R01-AC11, TAM-R01-AC13, TAM-R02-AC05, GAP-02, GAP-04

**Files:**
- `backend/src/routes/__tests__/admin.routes.test.ts` (extend)
- `frontend/e2e/admin-management.spec.ts` (extend)

| # | Test Name | Framework | What It Verifies |
|---|-----------|-----------|-----------------|
| 1 | `DELETE /admin/users/:id cascades: isActive=false, patients unassigned, staff assignments removed` | Jest | Transaction atomicity: user.update + patient.updateMany + staffAssignment.deleteMany all called |
| 2 | `PUT /admin/users/:id with isActive:true reactivates deactivated user` | Jest | User isActive set to true, 200 returned, audit log "UPDATE" entry created |
| 3 | `PUT /admin/users/:id role change STAFF→PHYSICIAN cleans up StaffAssignment records` | Jest | orphaned StaffAssignment records deleted when role no longer includes STAFF |
| 4 | `Admin deactivates user → user appears Inactive → deactivated user cannot log in` | Playwright | Full E2E: deactivate via admin UI, verify Inactive badge, logout, login as deactivated user fails |
| 5 | `Admin reactivates user → user can log in again` | Playwright | Full E2E: reactivate via admin UI, login as reactivated user succeeds |

**Implementation pattern (Jest):**
```typescript
it('DELETE /admin/users/:id cascades: isActive, patients, staff assignments', async () => {
  // Setup: create physician with patients and staff assignment
  mockPrisma.user.findUnique.mockResolvedValue({ id: 10, roles: ['PHYSICIAN'], isActive: true });
  mockPrisma.user.update.mockResolvedValue({ id: 10, isActive: false });
  mockPrisma.patient.updateMany.mockResolvedValue({ count: 3 });
  mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 1 });
  mockPrisma.auditLog.create.mockResolvedValue({});

  const res = await request(app)
    .delete('/api/admin/users/10')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(res.status).toBe(200);
  expect(mockPrisma.user.update).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ isActive: false }) })
  );
  expect(mockPrisma.patient.updateMany).toHaveBeenCalled();
  expect(mockPrisma.staffAssignment.deleteMany).toHaveBeenCalled();
  expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ action: 'DELETE' }) })
  );
});
```

---

#### T2-2: Audit Log Filtering & Limits (3 Jest tests)

**Gap:** The audit log API supports filter parameters (`action`, `entity`, `startDate`, `endDate`) and caps `limit` at 100, but neither has test coverage.

**Spec refs:** TAM-R04-AC05, TAM-R04-AC07, GAP-07, GAP-08

**File:** `backend/src/routes/__tests__/admin.routes.test.ts` (extend)

| # | Test Name | What It Verifies |
|---|-----------|--------------------|
| 1 | `GET /admin/audit-log?action=LOGIN_FAILED filters by action` | Only LOGIN_FAILED entries returned |
| 2 | `GET /admin/audit-log?startDate&endDate filters by date range` | Only entries within date range returned |
| 3 | `GET /admin/audit-log?limit=200 caps at 100` | Response limit never exceeds 100 regardless of request |

---

#### T2-3: Role Validation Pure Function (3 Jest tests)

**Gap:** `isValidRoleCombination()` is a pure function tested indirectly via API calls but has no direct unit test coverage.

**Spec refs:** TAM-R02-AC07, TAM-R02-AC08, GAP-05

**File:** `backend/src/routes/__tests__/admin.routes.test.ts` (extend, or inline test if function is exported)

| # | Test Name | What It Verifies |
|---|-----------|--------------------|
| 1 | `isValidRoleCombination returns true for [PHYSICIAN], [ADMIN], [STAFF], [ADMIN,PHYSICIAN]` | All 4 valid combos |
| 2 | `isValidRoleCombination returns false for [STAFF,PHYSICIAN], [STAFF,ADMIN]` | Invalid combos rejected |
| 3 | `isValidRoleCombination returns false for empty array` | Edge case: no roles |

---

## Tests NOT Planned (Deferred to Tier 3)

| Gap | Reason Deferred |
|-----|----------------|
| Add/Edit User modal Vitest tests (GAP-14, GAP-15) | Functional flow tested via Playwright E2E; component tests are polish |
| Empty audit log UI state (GAP-10) | Low risk — Vitest already covers loading and populated states |
| Send temp password E2E (GAP-17) | Existing backend + Vitest tests cover logic; E2E is polish |
| Patient management bulk operations | Cypress patient-assignment.cy.ts has 32 tests already |
| Staff-physician reassignment edge cases (GAP-06, GAP-12) | Low frequency; Cypress role-access-control covers the happy path |
| PHYSICIAN auto-assign during import (GAP-13) | Import module (M4) covers import flows comprehensively |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `backend/src/routes/__tests__/admin.routes.test.ts` | Extend | +8 | TODO |
| `frontend/e2e/admin-management.spec.ts` | Extend | +2 | TODO |
| `backend/src/routes/__tests__/admin.routes.unit.test.ts` | New (optional) | +3 | TODO |
| **Total** | | **11** | |

---

## Done Criteria

- [ ] All 11 tests written and passing
- [ ] No regressions in existing M5 tests (~282 baseline)
- [ ] Deactivation cascade verified: isActive, patient unassign, staff assignment cleanup
- [ ] Reactivation flow verified: deactivated user can log in after reactivation
- [ ] Role change cleanup verified: STAFF→PHYSICIAN removes orphaned assignments
- [ ] Audit log filtering and limit cap tested
- [ ] isValidRoleCombination unit-tested directly
- [ ] Full 4-layer pyramid passes
