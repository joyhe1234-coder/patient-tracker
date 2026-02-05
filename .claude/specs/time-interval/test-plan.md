# Test Plan: Time Interval

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Displays calculated days | TC-12.1 | - | Gap |
| AC-2 | Editable for baseDueDays statuses | TC-12.1 | - | Gap |
| AC-3 | Editable for test type dropdowns | TC-12.2 | - | Gap |
| AC-4 | Manual edit recalculates due date | TC-7.3 | - | Gap |
| AC-5 | Override saved to database | TC-12.2 | - | Gap |
| AC-6 | NOT editable for dropdown statuses | - | - | Gap |
| AC-7 | Default from DueDayRule/baseDueDays | TC-12.1 | dueDateCalculator.test.ts | Partial |

## Automated Test Inventory
- Jest: dueDateCalculator.test.ts - calculation logic covers default intervals

## Gaps & Recommendations
- Gap 1: ALL time interval E2E tests are missing - Priority: HIGH
- Gap 2: Editability matrix not tested (which statuses allow edit) - Priority: HIGH
- Gap 3: Manual override → due date recalculation not tested - Priority: HIGH
- Gap 4: Non-editable status enforcement not tested - Priority: MEDIUM
- Note: This is one of the HIGHEST gap areas in the test suite
