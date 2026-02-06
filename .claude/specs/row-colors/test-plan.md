# Test Plan: Row Status Colors

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Status-based colors | TC-5.1 | sorting-filtering.cy.ts: "Row Color Verification" (10 tests), cascading-dropdowns.cy.ts: row color tests | Covered |
| AC-2 | Overdue red | TC-5.2 | sorting-filtering.cy.ts: "Overdue" filter test | Partial |
| AC-3 | Overdue for pending+completed | TC-5.2b | - | Gap |
| AC-4 | Completed turns red on expiry | TC-5.2d | - | Gap |
| AC-5 | Declined never red | TC-5.2c | - | Gap |
| AC-6 | Selection outline preserves color | TC-5.3 | sorting-filtering.cy.ts: "Row selection preserves color" | Covered |
| AC-7 | Real-time color update | TC-5.4 | cascading-dropdowns.cy.ts: color after status change | Covered |
| AC-8 | Color priority | TC-5.1 | - | Gap |

## Automated Test Inventory
- Cypress: sorting-filtering.cy.ts - 10 row color tests (green, blue, yellow, purple statuses + selection)
- Cypress: cascading-dropdowns.cy.ts - 5 color tests (AWV green/blue/purple, Breast Cancer green, Chronic orange)
- Vitest: StatusFilterBar.test.tsx - getRowStatusColor unit tests

## Gaps & Recommendations
- Gap 1: Overdue color logic (AC-3, AC-4, AC-5) not automated - Priority: MEDIUM (complex date-dependent scenarios)
- Gap 2: Color priority (duplicate > overdue > status) not tested - Priority: LOW
- Gap 3: Completed row turning red on annual expiry not tested - Priority: MEDIUM
