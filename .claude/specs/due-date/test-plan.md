# Test Plan: Due Date Calculation

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Due Date = Status Date + interval | TC-7.1 | dueDateCalculator.test.ts (20 tests) | Covered |
| AC-2 | DueDayRule tracking-dependent | TC-7.2 | dueDateCalculator.test.ts: tracking rule tests | Covered |
| AC-3 | baseDueDays fallback | TC-7.1 | dueDateCalculator.test.ts: fallback tests | Covered |
| AC-4 | Time Interval display | TC-7.1 | - | Gap |
| AC-5 | Status Date change recalculates | TC-7.1 | - | Gap |
| AC-6 | HgbA1c requires Tracking #2 | - | dueDateCalculator.test.ts: HgbA1c tests | Covered |
| AC-7 | Screening discussed month logic | - | dueDateCalculator.test.ts: cervical tests | Covered |
| AC-8 | AWV completed 365 days | - | dueDateCalculator.test.ts | Covered |

## Automated Test Inventory
- Jest: dueDateCalculator.test.ts (20 tests) - calculation logic, tracking rules, fallbacks, edge cases

## Gaps & Recommendations
- Gap 1: E2E test for due date appearing in grid after status change - Priority: MEDIUM
- Gap 2: Time Interval display in grid not tested E2E - Priority: LOW
- Gap 3: Status Date change triggering recalculation not tested E2E - Priority: MEDIUM
