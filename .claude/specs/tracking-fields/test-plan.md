# Test Plan: Tracking Fields

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Tracking #1 dropdown options | TC-11.1 | cascading-dropdowns.cy.ts: "Screening test ordered shows Tracking #1 options" | Covered |
| AC-2 | N/A display | TC-11.2 | - | Gap |
| AC-3 | N/A not editable | TC-11.2 | - | Gap |
| AC-4 | HgbA1c free text prompt | TC-11.4 | - | Gap |
| AC-5 | HgbA1c month dropdown | TC-11.3 | - | Gap |
| AC-6 | BP reading free text | TC-11.5 | - | Gap |
| AC-7 | Cervical month options | TC-11.6 | - | Gap |
| AC-8 | Month selection sets due date | TC-11.6 | dueDateCalculator.test.ts: cervical tests | Partial |
| AC-9 | Chronic attestation options | TC-11.7 | cascading-dropdowns.cy.ts: "attestation options" | Covered |
| AC-10 | Tracking #3 editable | - | - | Gap |

## Automated Test Inventory
- Cypress: cascading-dropdowns.cy.ts - Tracking #1 dropdown options, attestation options
- Jest: dueDateCalculator.test.ts - tracking-dependent due date calculation

## Gaps & Recommendations
- Gap 1: N/A display and editability (AC-2, AC-3) not tested - Priority: MEDIUM
- Gap 2: Free text prompts (AC-4, AC-5, AC-6) not tested - Priority: MEDIUM
- Gap 3: Cervical month options (AC-7) not tested E2E - Priority: LOW
- Gap 4: Tracking #3 editable (AC-10) not tested - Priority: LOW
- Note: Tracking fields have significant test coverage gaps across the board
