# Test Plan: Admin Dashboard

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | User list display | TC-26.12 | patient-assignment.cy.ts: user management tests | Covered |
| AC-2 | Create user | TC-26.13 | patient-assignment.cy.ts: "Create user" | Covered |
| AC-3 | Edit user | TC-26.14 | patient-assignment.cy.ts: "Edit user" | Covered |
| AC-4 | Deactivate user | TC-26.15 | - | Gap |
| AC-5 | Reset password | TC-26.16 | - | Gap |
| AC-6 | Staff assignment checkboxes | TC-26.17 | patient-assignment.cy.ts: "Staff assignments" | Covered |
| AC-7 | Add/remove assignments | TC-26.17 | patient-assignment.cy.ts | Covered |
| AC-8 | Updated physician list | TC-27.6 | patient-assignment.cy.ts: "Staff sees assigned" | Covered |
| AC-9 | Audit log viewer | TC-26.18 | - | Gap |
| AC-10 | Audit entry details | TC-26.18 | - | Gap |
| AC-11 | Audit actions | TC-26.18 | - | Gap |
| AC-12 | Assign Patients button | - | patient-assignment.cy.ts | Covered |
| AC-13 | Assignment page | TC-27.2 | patient-assignment.cy.ts (32 tests) | Covered |

## Automated Test Inventory
- Cypress: patient-assignment.cy.ts (32 tests) - user CRUD, staff assignments, patient assignment
- Jest: admin.routes.test.ts (13 tests) - endpoint auth requirements

## Gaps & Recommendations
- Gap 1: User deactivation (AC-4) not E2E tested - Priority: MEDIUM
- Gap 2: Password reset via admin (AC-5) not E2E tested - Priority: LOW
- Gap 3: Audit log display (AC-9, AC-10, AC-11) not tested - Priority: MEDIUM
- Note: Audit log has 0 automated tests for viewing functionality
