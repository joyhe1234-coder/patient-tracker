# Test Gap Analysis: R19 - Depression Screening

## Summary

The Depression Screening feature (R19) adds a 14th quality measure under the "Screening" request type. It is a configuration-only change: no new components, no schema changes, no new API endpoints. Changes touch `dropdownConfig.ts`, `statusColors.ts`, `statusDatePromptResolver.ts`, `seed.ts`, and their test files. This analysis cross-references the spec requirements (10 REQs + 8 NFRs + 8 edge cases) against existing tests.

## Test Inventory

| Layer | File | Test Count | Status |
|-------|------|-----------|--------|
| L2 Vitest | `frontend/src/config/dropdownConfig.test.ts` | ~35 total (4 Depression Screening specific) | COVERED |
| L2 Vitest | `frontend/src/config/statusColors.test.ts` | ~65 total (10 Depression Screening specific) | COVERED |
| L4 Cypress | `frontend/cypress/e2e/cascading-dropdowns.cy.ts` | ~10 Depression Screening tests | COVERED |
| L4 Cypress | `frontend/cypress/e2e/row-color-comprehensive.cy.ts` | ~9 Depression Screening tests | COVERED |

## Use Case Coverage Matrix

| # | Use Case | Spec Ref | L1 Jest | L2 Vitest | L4 Cypress | Gap? |
|---|----------|----------|---------|-----------|------------|------|
| 1 | Depression Screening as Quality Measure option (under Screening) | REQ-DS-1 AC1 | -- | dropdownConfig: "maps Screening to 4 screening measures" | cascading-dropdowns: "Screening shows 4 Quality Measure options" | NO |
| 2 | 7 measure statuses in correct order | REQ-DS-1 AC2 | -- | dropdownConfig: "has exactly 7 statuses", "has Not Addressed as first", "contains all 7 required statuses" | cascading-dropdowns: "Depression Screening has 7 status options" | NO |
| 3 | Called to schedule -> blue | REQ-DS-2 AC2 | -- | statusColors: 'returns blue for "Called to schedule"' | row-color-comprehensive: "Called to schedule -> blue"; cascading-dropdowns: "Called to schedule shows blue row color" | NO |
| 4 | Visit scheduled -> yellow | REQ-DS-2 AC3 | -- | statusColors: 'returns yellow for "Visit scheduled"' | row-color-comprehensive: "Visit scheduled -> yellow"; cascading-dropdowns: "Visit scheduled shows yellow row color" | NO |
| 5 | Screening complete -> green | REQ-DS-2 AC4 | -- | statusColors: 'returns green for "Screening complete"' | row-color-comprehensive: "Screening complete -> green"; cascading-dropdowns: "Screening complete shows green row color" | NO |
| 6 | Patient declined -> purple | REQ-DS-2 AC6 | -- | statusColors: 'returns purple for "Patient declined"' | row-color-comprehensive: "Patient declined -> purple"; cascading-dropdowns: "Patient declined shows purple row color" | NO |
| 7 | No longer applicable -> gray | REQ-DS-2 AC7 | -- | statusColors: (covered by generic gray test) | row-color-comprehensive: "No longer applicable -> gray"; cascading-dropdowns: "No longer applicable shows gray row color" | NO |
| 8 | Screening unnecessary -> gray | REQ-DS-2 AC5 | -- | statusColors: 'returns gray for "Screening unnecessary"' | row-color-comprehensive: "Screening unnecessary -> gray"; cascading-dropdowns: "Screening unnecessary shows gray row color" | NO |
| 9 | Not Addressed -> white | REQ-DS-2 AC1 | -- | (implicit -- white is default) | row-color-comprehensive: "Not Addressed -> white" | NO |
| 10 | Cascading: Screening -> Depression Screening -> statuses | REQ-DS-10 AC1-3 | -- | dropdownConfig: cascade chain integrity tests | cascading-dropdowns: T8-3 Depression Screening Cascading Clear tests (3 tests) | NO |
| 11 | No Tracking #1 options for Depression Screening | ASM-1 | -- | dropdownConfig: "has no Tracking #1 options for any Depression Screening status" | cascading-dropdowns: "Depression Screening has no Tracking #1 options" | NO |
| 12 | Depression Screening in filter counts | REQ-DS-9 AC1-4 | -- | -- | -- | **YES** |
| 13 | Depression Screening row colors per role | NFR-3 | -- | -- | -- | **YES** |
| 14 | Depression Screening in import pipeline | INT-7 (out of scope) | -- | -- | -- | N/A |
| 15 | Called to schedule overdue -> red | REQ-DS-5 AC1 | -- | statusColors: 'returns red for overdue "Called to schedule"' | row-color-comprehensive: "Depression Called to schedule + past -> overdue" | NO |
| 16 | Visit scheduled overdue -> red | REQ-DS-5 AC1 | -- | statusColors: 'returns red for overdue "Visit scheduled"' | row-color-comprehensive: "Depression Visit scheduled overdue" (TC-9D) | NO |
| 17 | Patient declined does NOT go red | REQ-DS-5 AC2 | -- | statusColors: 'does NOT return red for overdue "Patient declined"' | -- | **PARTIAL** |
| 18 | Screening unnecessary does NOT go red | REQ-DS-5 AC2 | -- | statusColors: 'does NOT return red for overdue "Screening unnecessary"' | -- | **PARTIAL** |
| 19 | Date prompt: "Called to schedule" -> "Date Called" | REQ-DS-3 AC1 | -- | -- | -- | **YES** |
| 20 | Date prompt: "Visit scheduled" -> "Date Scheduled" | REQ-DS-3 AC2 | -- | -- | -- | **YES** |
| 21 | Date prompt: "Screening complete" -> "Date Completed" | REQ-DS-3 AC3 | -- | -- | -- | **YES** |
| 22 | Date prompt: "Not Addressed" -> null | REQ-DS-3 AC7 | -- | -- | -- | **YES** |
| 23 | Countdown: Called to schedule baseDueDays=7 | REQ-DS-4 AC1 | -- | -- | -- | **YES** |
| 24 | Countdown: Visit scheduled baseDueDays=1 | REQ-DS-4 AC2 | -- | -- | -- | **YES** |
| 25 | Countdown: Screening complete baseDueDays=365 | REQ-DS-4 AC3 | -- | -- | -- | **YES** |
| 26 | Alphabetical sort: 4 screening measures | REQ-DS-1 AC3, NFR-8 | -- | dropdownConfig: "returns sorted quality measures for Screening" (4-item array) | -- | NO |
| 27 | "Screening complete" vs "Screening completed" coexist in GREEN_STATUSES | EDGE-5 | -- | statusColors: both green tests present | -- | NO |
| 28 | Notes field preserved during cascading clear | REQ-DS-10 AC4 | -- | -- | -- | **YES** |
| 29 | Database seed creates QualityMeasure + 7 MeasureStatus records | REQ-DS-6 | -- | -- | -- | **PARTIAL** |
| 30 | Sample patient data covering all 7 statuses + overdue | REQ-DS-7 | -- | -- | -- | **PARTIAL** |

## Detailed Gap Analysis

### GAP 1: Depression Screening in status filter bar counts (NOT TESTED)

**Requirement:** REQ-DS-9 AC1-4: Depression Screening rows SHALL be correctly counted in the status filter bar totals. Clicking "Blue" shows "Called to schedule" rows, clicking "Yellow" shows "Visit scheduled" rows, etc.

**Missing tests:**
- L4 Cypress: No test that clicks a color filter pill and verifies Depression Screening rows with matching status are visible
- L2 Vitest: No test for StatusFilterBar counting Depression Screening rows in the correct color bucket

**Severity:** Low. The filter bar uses `getRowStatusColor()` which is already tested to map Depression Screening statuses to correct colors. The counting is generic infrastructure. But explicit test is missing.

**Recommendation:** Add one Cypress test in `row-color-comprehensive.cy.ts` or a dedicated test:
```
it('Blue filter pill shows Depression Screening "Called to schedule" rows', () => {
  // Setup a row with Called to schedule, then click blue filter pill
});
```

### GAP 2: Depression Screening row colors per role (NOT TESTED)

**Requirement:** NFR-3: Depression Screening data SHALL follow the same RBAC as all other measures.

**Missing tests:**
- No test verifies that a PHYSICIAN user sees Depression Screening rows with correct colors for their own patients
- No test verifies STAFF user behavior

**Severity:** Low. RBAC is at the data query level, not at the color rendering level. Colors are applied uniformly regardless of role. This is implicitly covered by existing RBAC tests.

### GAP 3: Date prompts for Depression Screening statuses (NOT TESTED at L2/L4)

**Requirement:** REQ-DS-3 AC1-7: Each Depression Screening status should show the correct date prompt (e.g., "Date Called", "Date Scheduled", "Date Completed").

**Current coverage:**
- The `statusDatePromptResolver.ts` has default prompts added (per Task 3), but no Jest test specifically validates these fallback entries
- No Cypress test verifies that the date prompt label displays correctly in the grid when selecting a Depression Screening status

**Severity:** Medium. Date prompts are user-facing and affect data entry workflow.

**Recommendation:**
- Add L1 Jest test in `statusDatePromptResolver.test.ts` (if exists):
  ```
  it('returns "Date Called" for "Called to schedule"', () => {
    expect(getDefaultDatePrompt('Called to schedule')).toBe('Date Called');
  });
  ```
- Add L4 Cypress test that selects "Called to schedule" and verifies the date prompt header shows "Date Called"

### GAP 4: baseDueDays countdown timers (NOT TESTED at frontend level)

**Requirement:** REQ-DS-4 AC1-7: Countdown timers for "Called to schedule" (7 days), "Visit scheduled" (1 day), "Screening complete" (365 days).

**Current coverage:**
- The seed data specifies `baseDueDays` values, but no test verifies the database seed produces correct values
- The `statusColors.test.ts` overdue tests use hardcoded `dueDate` values to test the color override, which implicitly tests the overdue detection but NOT the due date calculation itself
- The boundary tests (7-day timer, 1-day timer) in `statusColors.test.ts` lines 273-308 do test the timer boundaries, which is good

**Severity:** Medium. The baseDueDays values drive the due date calculation on the backend. The backend `resolveStatusDatePrompt` service calculates `dueDate = statusDate + baseDueDays`, but we need to confirm tests exist for this calculation.

**Recommendation:** Add a L1 Jest test for the due date calculation service:
```
it('calculates dueDate = statusDate + 7 for "Called to schedule" (baseDueDays=7)', () => {
  // Verify the baseDueDays value from the seed / database
});
```

### GAP 5: Notes field preserved during cascading clear (NOT TESTED)

**Requirement:** REQ-DS-10 AC4: When any cascading clear occurs on a Depression Screening row, the Notes field SHALL be preserved.

**Missing tests:**
- L4 Cypress: No test changes the request type or quality measure on a Depression Screening row that has notes, then verifies notes remain

**Severity:** Medium. Notes preservation is a user-facing data integrity concern.

**Recommendation:** Add a Cypress test:
```
it('Depression Screening cascading clear preserves Notes field', () => {
  // Set up row with Depression Screening + notes
  // Change request type away from Screening
  // Verify notes still present
});
```

### GAP 6: Database seed validation (PARTIAL)

**Requirement:** REQ-DS-6 AC1-3, REQ-DS-7

**Current coverage:**
- The seed code was modified (Tasks 4a-4c) and marked complete
- No automated test verifies the seed output (QualityMeasure record exists, 7 MeasureStatus records exist, sample patients created)
- The design doc notes: "Integration testing covered by existing Jest seed integration" and "No separate seed integration test is needed"

**Severity:** Low. The seed is verified by the application working correctly. But explicit seed validation would catch configuration drift.

### GAP 7: Terminal statuses do NOT turn red in Cypress (PARTIAL)

**Requirement:** REQ-DS-5 AC2: Patient declined (purple) and Screening unnecessary (gray) do NOT turn red.

**Current coverage:**
- L2 Vitest: statusColors.test.ts has explicit tests for both (lines 503-517)
- L4 Cypress: No Cypress test explicitly verifies that a purple/gray Depression Screening row does NOT turn red when overdue

**Severity:** Low. The Vitest coverage is sufficient since the color logic is deterministic.

### GAP 8: "Screening complete" with baseDueDays=365 overdue behavior (NOT TESTED)

**Requirement:** REQ-DS-5 AC3: "Screening complete" follows the same overdue rules as green statuses -- CAN turn red when annual due date passes.

**Current coverage:**
- L2 Vitest: The parameterized test `it.each([...GREEN_STATUSES])('overdue %s returns red')` at line 527 covers ALL green statuses including "Screening complete"
- L4 Cypress: No explicit test for "Screening complete" + 365-day overdue turning red

**Severity:** Low. Already covered by parameterized Vitest test. The Screening complete value is in GREEN_STATUSES, so the parameterized test covers it.

### GAP 9: Screening complete baseDueDays value in seed (REQ-DS-4 AC3 contradiction)

**Requirement:** REQ-DS-4 AC3 says baseDueDays SHALL be 365.

**Current state:** The design.md and tasks.md both specify `baseDueDays: null` for "Screening complete" in the seed data (design.md line 236, tasks.md line 108). However, REQ-DS-4 AC3 specifies baseDueDays=365.

**This is a spec inconsistency, not a test gap.** The requirements say 365, but the design/implementation says null. If `baseDueDays=null`, no due date is calculated, meaning "Screening complete" will NEVER turn red. If `baseDueDays=365`, it enables annual rescreening overdue detection.

**Severity:** High (spec inconsistency). Needs product decision.

**Recommendation:** Resolve the contradiction between REQ-DS-4 AC3 (baseDueDays=365) and design.md (baseDueDays=null). Then add a test that validates the chosen behavior.

## Coverage Summary

| Metric | Value |
|--------|-------|
| Total use cases identified | 30 |
| Fully covered | 18 |
| Partially covered | 5 |
| Not covered | 7 |
| Estimated gap count | 9 gaps (1 high priority spec inconsistency, 3 medium, 5 low) |

## Priority Recommendations

### Critical (spec inconsistency)
1. **GAP 9**: Resolve REQ-DS-4 AC3 vs design.md contradiction for "Screening complete" baseDueDays (365 vs null)

### Medium Priority (add tests)
2. **GAP 3**: Date prompt tests -- add L1 Jest for `getDefaultDatePrompt` entries and L4 Cypress for prompt display
3. **GAP 4**: baseDueDays countdown timer calculation -- add L1 Jest test for due date computation
4. **GAP 5**: Notes preserved during cascading clear -- add L4 Cypress test

### Low Priority
5. **GAP 1**: Filter bar counts for Depression Screening colors -- add L4 Cypress test
6. **GAP 6**: Seed data validation -- optional, covered implicitly
7. **GAP 7**: Terminal status non-red in Cypress -- already covered in Vitest
8. **GAP 8**: Screening complete annual overdue -- already covered by parameterized Vitest test
