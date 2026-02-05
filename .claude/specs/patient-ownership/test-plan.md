# Test Plan: Patient Ownership

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | PHYSICIAN sees own patients | TC-26.7 | role-access-control.cy.ts: "PHYSICIAN auto-filters" | Covered |
| AC-2 | Cannot see others' patients | TC-26.7 | role-access-control.cy.ts: "PHYSICIAN only own patients" | Covered |
| AC-3 | Cannot see unassigned | TC-27.10 | role-access-control.cy.ts | Covered |
| AC-4 | No selector for PHYSICIAN | TC-28.4 | Header.test.tsx: "PHYSICIAN no dropdown" | Covered |
| AC-5 | STAFF sees assigned physicians | TC-26.8 | role-access-control.cy.ts: "STAFF assigned physicians" | Covered |
| AC-6 | STAFF empty by default | TC-26.8 | - | Gap |
| AC-7 | Grid shows selected physician | TC-26.9 | patient-assignment.cy.ts: physician switching | Covered |
| AC-8 | No assignments message | TC-26.10 | - | Gap |
| AC-9 | ADMIN all physicians + Unassigned | TC-27.1 | Header.test.tsx: "Unassigned option for ADMIN" | Covered |
| AC-10 | View unassigned patients | TC-27.1 | patient-assignment.cy.ts: unassigned tests | Covered |
| AC-11 | Dropdown only on grid page | TC-27.9 | Header.test.tsx: "dropdown only on grid page" | Covered |
| AC-12 | physicianId=unassigned API | TC-27.1 | data.routes.test.ts | Covered |
| AC-13 | Bulk patient assignment | TC-27.2, 27.3 | patient-assignment.cy.ts: "Assign patients" | Covered |
| AC-14 | Count updates after assign | TC-27.4 | patient-assignment.cy.ts: "Count updates" | Covered |
| AC-15 | Assignment page | TC-27.2 | patient-assignment.cy.ts | Covered |
| AC-16 | Import physician selection | TC-26.22 | ImportPage.test.tsx: physician dropdown | Covered |
| AC-17 | PHYSICIAN auto-assigns | TC-26.21 | - | Gap |
| AC-18 | Reassignment warning | - | ImportPreviewPage.test.tsx: reassignment tests, reassignment.test.ts | Covered |
| AC-19 | Reassignment confirmation | - | ImportPreviewPage.test.tsx | Covered |

## Automated Test Inventory
- Cypress: patient-assignment.cy.ts (32 tests) - assignment workflow, counts, switching
- Cypress: role-access-control.cy.ts (31 tests) - ownership filtering
- Vitest: Header.test.tsx (12 tests) - dropdown visibility, unassigned option
- Vitest: ImportPage.test.tsx - physician selection
- Vitest: ImportPreviewPage.test.tsx - reassignment warnings
- Jest: data.routes.test.ts, users.routes.test.ts, reassignment.test.ts (19 tests)

## Gaps & Recommendations
- Gap 1: STAFF empty grid by default (AC-6) not tested - Priority: LOW
- Gap 2: No assignments message (AC-8) not tested - Priority: LOW
- Gap 3: PHYSICIAN auto-import-assign (AC-17) not E2E tested - Priority: MEDIUM
- Note: Generally well-covered feature
