# Test Plan: Cascading Dropdowns

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | 4 Request Type options | TC-6.1 | cascading-dropdowns.cy.ts: "Request Type dropdown has 4 options" | Covered |
| AC-2 | AWV auto-fill | TC-6.1 | cascading-dropdowns.cy.ts: "AWV auto-fills" | Covered |
| AC-3 | Chronic DX auto-fill | TC-6.5 | cascading-dropdowns.cy.ts: "Chronic DX auto-fills" | Covered |
| AC-4 | Quality 8 options | TC-6.7 | cascading-dropdowns.cy.ts: "Quality shows 8 options" | Covered |
| AC-5 | Screening 3 options | TC-6.6 | cascading-dropdowns.cy.ts: "Screening shows 3 options" | Covered |
| AC-6 | Measure Status filtered | TC-6.3 | cascading-dropdowns.cy.ts: AWV/Breast Cancer/Chronic status tests | Covered |
| AC-7 | Request Type cascade clear | TC-6.8 | cascading-dropdowns.cy.ts: "Changing Request Type clears" | Covered |
| AC-8 | Quality Measure cascade clear | TC-6.9 | cascading-dropdowns.cy.ts: "Changing Quality Measure clears" | Covered |
| AC-9 | Measure Status cascade clear | TC-6.10 | - | Gap |
| AC-10 | Notes preserved on cascade | TC-6.8, TC-6.9, TC-6.10 | - | Gap |

## Automated Test Inventory
- Cypress: cascading-dropdowns.cy.ts (30 tests) - all dropdown cascading, auto-fill, status options, row colors, field clearing

## Gaps & Recommendations
- Gap 1: Measure Status cascade clear (AC-9) not automated - Priority: LOW (covered by AC-7, AC-8 pattern)
- Gap 2: Notes preservation during cascade not tested - Priority: MEDIUM (data integrity concern)
