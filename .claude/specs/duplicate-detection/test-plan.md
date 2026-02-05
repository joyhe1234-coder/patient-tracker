# Test Plan: Duplicate Detection

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Duplicate definition | TC-8.1 | add-row.spec.ts: duplicate detection tests | Partial |
| AC-2 | Skip check on null fields | TC-8.3 | - | Gap |
| AC-3 | Error modal on add duplicate | TC-8.1 | add-row.spec.ts: "should show duplicate error" | Covered |
| AC-4 | Error on edit creating duplicate | TC-8.5 | - | Gap |
| AC-5 | Dependent field reset on error | TC-8.5b | - | Gap |
| AC-6 | Orange stripe indicator | TC-8.4 | sorting-filtering.cy.ts: "Duplicates" filter | Partial |
| AC-7 | Delete removes duplicate flag | TC-8.6 | - | Gap |
| AC-8 | Backend validation | TC-8.1 | Backend API tests | Covered |
| AC-9 | Flag synchronization | TC-8.6 | - | Gap |

## Automated Test Inventory
- Playwright: add-row.spec.ts - duplicate error on add
- Cypress: sorting-filtering.cy.ts - duplicate filter chip
- Jest: Backend API tests - duplicate check endpoint

## Gaps & Recommendations
- Gap 1: Edit-creates-duplicate flow (AC-4, AC-5) not automated - Priority: HIGH (data integrity)
- Gap 2: Delete-removes-duplicate (AC-7) not automated - Priority: MEDIUM
- Gap 3: Null field skip logic (AC-2) not automated - Priority: LOW
- Gap 4: Backend flag sync (AC-9) not unit tested - Priority: MEDIUM
