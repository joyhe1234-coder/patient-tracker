# Test Plan: Role-Based Access Control

## Coverage Matrix

### STAFF Restrictions
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Cannot access /admin | TC-28.1 | role-access-control.cy.ts: "STAFF Cannot Access Admin" | Covered |
| AC-2 | No Admin link | TC-28.1 | role-access-control.cy.ts: "No admin link" | Covered |
| AC-3 | No Unassigned option | TC-28.2 | role-access-control.cy.ts: "No unassigned option", Header.test.tsx | Covered |
| AC-4 | Only assigned physicians | TC-28.3 | role-access-control.cy.ts: "Only assigned physicians" | Covered |
| AC-5 | Can access grid/import | - | role-access-control.cy.ts | Covered |

### PHYSICIAN Restrictions
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-6 | No physician selector | TC-28.4 | role-access-control.cy.ts: "PHYSICIAN auto-filters" | Covered |
| AC-7 | Auto-filtered to own | TC-28.4 | role-access-control.cy.ts | Covered |
| AC-8 | Cannot access /admin | TC-28.5 | role-access-control.cy.ts: "PHYSICIAN no admin" | Covered |
| AC-9 | No Admin link | TC-28.5 | role-access-control.cy.ts | Covered |
| AC-10 | API forces own physicianId | TC-28.6 | role-access-control.cy.ts: "API ignores physicianId" | Covered |
| AC-11 | Cannot view unassigned | TC-28.7 | role-access-control.cy.ts | Covered |

### ADMIN Capabilities
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-12 | Full page access | TC-28.8 | role-access-control.cy.ts: "ADMIN Full Access" | Covered |
| AC-13 | View any physician | TC-28.8 | patient-assignment.cy.ts | Covered |
| AC-14 | View unassigned | TC-28.8 | patient-assignment.cy.ts: unassigned tests | Covered |
| AC-15 | Admin link visible | TC-28.8 | role-access-control.cy.ts | Covered |
| AC-16 | Patient assignment access | TC-28.8 | patient-assignment.cy.ts | Covered |

### API Protection
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-17 | 401 without token | TC-28.9 | role-access-control.cy.ts: "API 401" | Covered |
| AC-18 | 401 for admin without auth | TC-28.10 | role-access-control.cy.ts: "Admin API 401" | Covered |
| AC-19 | 403 for non-admin | - | role-access-control.cy.ts | Covered |
| AC-20 | Redirect to login | TC-28.11 | role-access-control.cy.ts: "Navigation redirects" | Covered |

## Automated Test Inventory
- Cypress: role-access-control.cy.ts (31 tests) - comprehensive role restriction tests
- Vitest: Header.test.tsx (12 tests) - UI element visibility per role
- Jest: auth.test.ts middleware (14 tests) - requireAuth, requireRole
- Jest: admin.routes.test.ts (13 tests) - admin endpoint protection
- Jest: data.routes.test.ts (9 tests) - data endpoint protection
- Jest: import.routes.test.ts (11 tests) - import endpoint protection
- Total: ~90 RBAC-related tests

## Gaps & Recommendations
- No significant gaps. RBAC is one of the most thoroughly tested features.
- Minor: User with ADMIN+PHYSICIAN dual role behavior not explicitly tested - Priority: LOW
