# Test Gap Analysis: R18 - Insurance Group Filter

## Summary

The Insurance Group Filter feature (R18) adds an `insuranceGroup` field to patients, extends the import pipeline to persist it, adds server-side filtering to the data API, and provides a dropdown filter in the StatusFilterBar. This analysis cross-references the spec requirements (8 REQs + 14 NFRs + 10 edge cases) against existing tests across all five layers.

## Test Inventory

| Layer | File | Test Count | Status |
|-------|------|-----------|--------|
| L1 Jest (Backend) | `backend/src/services/import/__tests__/importExecutor.test.ts` | Existing (extended) | Assumed covered via Task 16 |
| L1 Jest (Backend) | `backend/src/routes/__tests__/data.routes.test.ts` | Existing (extended) | Assumed covered via Task 17 |
| L1 Jest (Backend) | `backend/src/services/__tests__/versionCheck.test.ts` | Existing (extended) | Assumed covered via Task 18 |
| L2 Vitest (Frontend) | `frontend/src/components/layout/StatusFilterBar.test.tsx` | ~20+ insurance tests | COVERED |
| L2 Vitest (Frontend) | `frontend/src/pages/MainPage.test.tsx` | Existing (extended) | Unknown coverage |
| L4 Cypress | `frontend/cypress/e2e/insurance-group-filter.cy.ts` | 13 tests | COVERED |
| L4 Cypress | `frontend/cypress/e2e/sorting-filtering.cy.ts` | Separate | Partial |

## Use Case Coverage Matrix

| # | Use Case | Spec Ref | L1 Jest | L2 Vitest | L4 Cypress | L5 Visual | Gap? |
|---|----------|----------|---------|-----------|------------|-----------|------|
| 1 | Insurance dropdown shows all groups (Hill, Sutter/SIP, No Insurance) | REQ-IG-3 AC2, REQ-IG-7 | -- | StatusFilterBar: options test | insurance-group-filter: system options test | -- | NO |
| 2 | Select insurance group filters grid to only that group | REQ-IG-3 AC6, REQ-IG-4 AC1 | data.routes: `?insuranceGroup=hill` | -- | insurance-group-filter: "Hill" default shows patients | -- | NO |
| 3 | "All" option shows all insurance groups | REQ-IG-3 AC8, REQ-IG-4 AC3 | data.routes: `?insuranceGroup=all` | -- | insurance-group-filter: "All" shows all patients | -- | NO |
| 4 | Insurance filter + status filter combination | REQ-IG-3 AC10 | -- | -- | insurance-group-filter: combined with quality measure filter | -- | NO |
| 5 | Insurance filter + search combination | -- | -- | -- | -- | -- | **YES** |
| 6 | Insurance filter + quality measure filter | REQ-IG-3 AC10 | -- | -- | insurance-group-filter: combined with QM filter | -- | NO |
| 7 | Insurance label in status bar | NFR-IG-13 | -- | MainPage: filterSummary includes "Insurance: Hill" | insurance-group-filter: status bar displays insurance filter text | -- | NO |
| 8 | Insurance filter state persists across edits | -- | -- | -- | -- | -- | **YES** |
| 9 | Insurance filter state after provider switch | REQ-IG-5 AC5 | -- | -- | insurance-group-filter: persists when QM changes | -- | **PARTIAL** |
| 10 | Import respects insurance scoping | REQ-IG-2 AC1-6, REQ-IG-6 | importExecutor: systemId sets insuranceGroup | -- | -- | -- | **PARTIAL** |
| 11 | Insurance filter counts update correctly | REQ-IG-3 AC10 | -- | -- | insurance-group-filter: (not explicitly tested) | -- | **YES** |

## Detailed Gap Analysis

### GAP 1: Insurance filter + search combination (NOT TESTED)

**Requirement:** When both insurance filter and search are active, they should combine with AND logic.

**Missing tests:**
- L4 Cypress: No test for selecting an insurance group AND typing a search term, then verifying only matching rows appear
- L2 Vitest: No unit test for getQueryParams including both `insuranceGroup` and search text

**Severity:** Low. Search is client-side filtering on the already insurance-filtered data, so the combination is implicit. But no explicit test exists.

**Recommendation:** Add a Cypress test in `insurance-group-filter.cy.ts`:
```
it('should combine insurance group filter with search text', () => {
  cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
  cy.get('input[placeholder*="Search"]').type('Smith');
  cy.get('.ag-center-cols-container .ag-row').each(($row) => {
    cy.wrap($row).should('contain.text', 'Smith');
  });
});
```

### GAP 2: Insurance filter state persists across cell edits (NOT TESTED)

**Requirement:** When a user edits a cell value (e.g., changes measure status), the insurance filter should remain active with the same selection.

**Missing tests:**
- L4 Cypress: No test for editing a cell while insurance filter is active, then verifying filter remains
- L2 Vitest: No test for insurance group state surviving re-render after data mutation

**Severity:** Low. The filter state is in React useState, which is unaffected by data mutations. But explicit coverage is missing.

**Recommendation:** Add a Cypress test:
```
it('should persist insurance group filter after cell edit', () => {
  cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
  cy.selectAgGridDropdown(0, 'measureStatus', 'AWV completed');
  cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
});
```

### GAP 3: Insurance filter state after physician switch (PARTIAL COVERAGE)

**Requirement:** REQ-IG-5 AC5: Changing the physician selector should preserve the current insurance group filter selection.

**Current coverage:** The Cypress test checks that insurance filter persists when **quality measure** changes (line 87-100), but not when the **physician selector** changes.

**Missing tests:**
- L4 Cypress: No test for changing the physician/provider dropdown and verifying insurance group remains unchanged
- L2 Vitest: No explicit test for independence of `selectedInsuranceGroup` and `selectedPhysicianId`

**Severity:** Medium. This is a specific requirement (REQ-IG-5 AC5) with no direct test.

**Recommendation:** Add a Cypress test specifically for physician selector change:
```
it('should persist insurance group filter when physician selector changes', () => {
  cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
  // Change physician selector (admin view)
  cy.get('[data-testid="physician-selector"]').select('All Physicians');
  cy.get('select[aria-label="Filter by insurance group"]').should('have.value', 'hill');
});
```

### GAP 4: Import pipeline sets insuranceGroup on patient records (PARTIAL COVERAGE)

**Requirement:** REQ-IG-2 AC1-6, REQ-IG-6 AC1-4

**Current coverage:** Task 16 in the spec calls for importExecutor tests (5 test cases). These tests are referenced as "[x] completed" in tasks.md, but the actual test file (`importExecutor.test.ts`) was not read to confirm exact test presence for insuranceGroup.

**Missing/Unconfirmed tests:**
- L1 Jest: Cannot confirm whether the importExecutor tests specifically validate `insuranceGroup` field on patient create/update
- L1 Jest: No confirmed test for backward compatibility (missing systemId defaults to 'hill')
- L1 Jest: No confirmed test for re-import from different system changing insuranceGroup

**Severity:** Medium. The import pipeline is a critical path.

**Recommendation:** Audit `importExecutor.test.ts` to confirm these test cases exist:
1. Import creates patient with `insuranceGroup` matching `systemId`
2. Re-import from different system updates `insuranceGroup`
3. Missing `systemId` in preview cache defaults to `'hill'`
4. Other patient fields preserved during insuranceGroup update

### GAP 5: Status color chip counts update correctly when insurance filter changes (NOT TESTED)

**Requirement:** REQ-IG-3 AC10: When the insurance group filter changes, status color chip counts SHALL update to reflect only the visible (filtered) rows.

**Current coverage:** The Cypress test `status bar displays insurance filter text when active` (line 120-135) checks the status bar text but does NOT verify that the color chip counts change numerically.

**Missing tests:**
- L4 Cypress: No test that captures chip count values before and after insurance filter change, then asserts they differ

**Severity:** Medium. This is a specific acceptance criterion.

**Recommendation:** Add a Cypress test:
```
it('should update status color chip counts when insurance filter changes', () => {
  cy.get('[data-testid="chip-count-all"]').invoke('text').then((allCount) => {
    cy.get('select[aria-label="Filter by insurance group"]').select('none');
    cy.get('[data-testid="chip-count-all"]').invoke('text').should('not.equal', allCount);
  });
});
```

### GAP 6: Server-side validation of invalid insuranceGroup parameter (PARTIAL)

**Requirement:** NFR-IG-6: The `insuranceGroup` query parameter SHALL be validated. REQ-IG-4: Invalid values return 400.

**Current coverage:** Task 17 specifies a test for `?insuranceGroup=invalid` returning 400. This is in `data.routes.test.ts`. The Cypress tests do NOT test sending invalid values.

**Severity:** Low. Backend unit test is sufficient for validation logic.

### GAP 7: "No Insurance" filter shows only null-group patients (PARTIAL)

**Requirement:** REQ-IG-3 AC7, REQ-IG-4 AC2

**Current coverage:**
- L1 Jest: `data.routes: ?insuranceGroup=none` returns null-group patients
- L4 Cypress: `insurance-group-filter: filter to zero or more rows when selecting "No Insurance"` -- this test only checks the body viewport exists, does NOT verify that shown rows actually have null insuranceGroup

**Severity:** Medium. The Cypress test is too weak -- it does not validate that the displayed rows are actually "No Insurance" patients.

**Recommendation:** Strengthen the Cypress test to validate row content or count change.

### GAP 8: Edge cases not tested

The following edge cases from the requirements have no explicit tests:

| Edge Case | Spec Ref | Coverage |
|-----------|----------|----------|
| EC-IG-1: Patient imported then manually added row (insuranceGroup preserved) | EC-IG-1 | NOT TESTED |
| EC-IG-2: Manual row then import (insuranceGroup updated from null to 'hill') | EC-IG-2 | NOT TESTED |
| EC-IG-3: Concurrent imports from different systems (last write wins) | EC-IG-3 | NOT TESTED |
| EC-IG-4: Filter active during import (new system patients hidden) | EC-IG-4 | NOT TESTED |
| EC-IG-5: Unknown insuranceGroup value (appears only in "All") | EC-IG-5 | NOT TESTED |
| EC-IG-6: Empty database (dropdown renders, counts show 0) | EC-IG-6 | NOT TESTED |
| EC-IG-7: All patients have null insuranceGroup + "Hill" filter shows 0 rows | EC-IG-7 | NOT TESTED |
| EC-IG-8: Patient ownership change via import AND insurance group change | EC-IG-8 | NOT TESTED |
| EC-IG-9: Replace mode import (recreated patients get new insuranceGroup) | EC-IG-9 | NOT TESTED |
| EC-IG-10: Duplicate row inherits insuranceGroup | EC-IG-10 | NOT TESTED |

**Severity:** Low-Medium. These are edge cases that are less likely to occur but are explicitly specified in requirements.

### GAP 9: Systems endpoint fallback (REQ-IG-7 AC4) (UNCONFIRMED)

**Requirement:** When `/api/import/systems` fails, dropdown falls back to hardcoded `[{ id: 'hill', name: 'Hill' }]`.

**Current coverage:** Task 20 specifies a MainPage.test.tsx test for this. Need to confirm it exists.

**Severity:** Medium. Fallback behavior is important for reliability.

### GAP 10: NFR-IG-3: Systems endpoint cached for session (NOT TESTED)

**Requirement:** The insurance group dropdown options SHALL be cached on the frontend after initial load.

**Current coverage:** No test verifies that the `/import/systems` API is called only once per session even when the component re-renders.

**Severity:** Low. This is a performance optimization, not a functional requirement.

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total use cases identified | 11 primary + 10 edge cases |
| Fully covered | 6 primary use cases |
| Partially covered | 3 primary use cases |
| Not covered | 2 primary use cases, 10 edge cases |
| Estimated gap count | 10 gaps (2 high priority, 5 medium, 3 low) |

## Priority Recommendations

### High Priority (add tests)
1. **GAP 3**: Insurance filter persists after physician switch (REQ-IG-5 AC5) -- add L4 Cypress test
2. **GAP 4**: Audit importExecutor.test.ts for insuranceGroup test presence -- confirm L1 Jest coverage

### Medium Priority
3. **GAP 5**: Status color chip counts update with filter change -- add L4 Cypress test
4. **GAP 7**: Strengthen "No Insurance" filter Cypress test to validate row content
5. **GAP 9**: Confirm systems endpoint fallback test in MainPage.test.tsx

### Low Priority
6. **GAP 1**: Insurance filter + search combination -- add L4 Cypress test
7. **GAP 2**: Insurance filter persists after cell edit -- add L4 Cypress test
8. **GAP 8**: Edge case tests (EC-IG-1 through EC-IG-10) -- add L1 Jest tests for import edge cases
9. **GAP 10**: Systems endpoint session caching -- add L2 Vitest test
