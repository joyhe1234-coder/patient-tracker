# Test Plan: Add/Delete/Duplicate Row Operations

## Coverage Matrix

| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Add Row modal fields | TC-9.1 | add-row.spec.ts: modal form tests (9 tests) | Covered |
| AC-2 | New row at top | TC-9.1 | add-row.spec.ts: "new row appears first" | Covered |
| AC-3 | Empty measure fields | TC-9.1 | add-row.spec.ts: field verification | Covered |
| AC-4 | Request Type auto-focused | TC-9.1 | - | Gap |
| AC-5 | Sort cleared on add | TC-9.1b | - | Gap |
| AC-6 | Persists after refresh | TC-9.1c | - | Gap |
| AC-7 | Delete requires selection | TC-9.3 | delete-row.spec.ts: "disabled without selection" | Covered |
| AC-8 | Delete confirmation | TC-9.2 | delete-row.spec.ts: confirmation modal tests | Covered |
| AC-9 | Row count decreases | TC-9.2 | - | Gap |
| AC-10 | Duplicate requires selection | TC-9.0 | duplicate-member.spec.ts: "disabled without selection" | Covered |
| AC-11 | Duplicate below selected | TC-9.0b | duplicate-member.spec.ts: "creates copy below" | Covered |
| AC-12 | Copies patient data only | TC-9.0b | duplicate-member.spec.ts: patient data tests | Covered |
| AC-13 | Empty measure fields | TC-9.0b | duplicate-member.spec.ts: empty fields | Covered |
| AC-14 | Persists after refresh | TC-9.0c | - | Gap |

## Automated Test Inventory
- Playwright: add-row.spec.ts (9 tests) - modal, validation, row creation
- Playwright: delete-row.spec.ts (10 tests, 4 skipped) - confirmation, cancel
- Playwright: duplicate-member.spec.ts (8 tests, 3 skipped) - copy behavior

## Gaps & Recommendations
- Gap 1: Request Type auto-focus after add (AC-4) not tested - Priority: LOW
- Gap 2: Sort clearing on add (AC-5) not tested - Priority: LOW
- Gap 3: Persistence after refresh (AC-6, AC-14) not tested - Priority: MEDIUM
- Gap 4: Row count update after delete (AC-9) not tested - Priority: LOW
