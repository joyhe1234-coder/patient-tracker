# Test Plan: Status Bar

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Row count display | TC-10.1 | smoke.spec.ts: "should display the status bar" | Covered |
| AC-2 | Connected status | TC-10.1 | - | Gap |
| AC-3 | Filtered count display | TC-10.2 | sorting-filtering.cy.ts: "Status bar updates" (2 tests) | Covered |
| AC-4 | X of Y format | TC-10.2 | sorting-filtering.cy.ts: filtered count verification | Covered |
| AC-5 | Returns to total on clear | TC-10.2 | sorting-filtering.cy.ts: filter toggle tests | Covered |

## Automated Test Inventory
- Playwright: smoke.spec.ts - status bar visible with row count
- Cypress: sorting-filtering.cy.ts - 2 status bar tests (total count, filtered count)

## Gaps & Recommendations
- Gap 1: Connection status indicator not tested - Priority: LOW (static indicator)
- Gap 2: Count after add/delete not tested - Priority: LOW
