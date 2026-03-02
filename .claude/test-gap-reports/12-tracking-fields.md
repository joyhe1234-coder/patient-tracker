# Test Gap Analysis: Requirement Area 12 -- Tracking Fields

**Date:** 2026-03-02
**Spec:** `.claude/specs/tracking-fields/requirements.md`
**Source Files:**
- `frontend/src/config/dropdownConfig.ts` (STATUS_TO_TRACKING1, HGBA1C_STATUSES, BP_STATUSES, getTracking1OptionsForStatus)
- `frontend/src/components/grid/PatientGrid.tsx` (tracking column definitions, N/A rendering, prompt text, cell editability logic, dropdown vs text input determination)

**Test Files:**
- `frontend/src/config/dropdownConfig.test.ts` (Vitest -- 53 tests, ~15 tracking-specific)
- `frontend/cypress/e2e/cascading-dropdowns.cy.ts` (Cypress -- ~30 tracking-specific tests across TC-11.x, T8-x sections)
- `frontend/cypress/e2e/row-color-comprehensive.cy.ts` (Cypress -- ~45 T1/T2 combination tests for color verification)
- `frontend/e2e/*.spec.ts` (Playwright -- 0 tracking tests)

**Regression Plan:** Section TC-11.1 through TC-11.7

---

## Summary

Tracking fields have **~90 tests across 2 frameworks** (53 Vitest configuration tests, ~30 Cypress cascading-dropdown tests, ~45 Cypress row-color tests that exercise T1/T2 values). This is actually better covered than the spec's own test-plan.md suggests, because many tests were added after the test plan was written.

**Coverage highlights:**
- T1 dropdown options for all measure statuses (Colon/Breast/BP/Cervical/Chronic): WELL COVERED (Vitest config + Cypress E2E)
- N/A display for statuses without tracking options: COVERED (Cypress TC-11.2, T8-1)
- N/A cell not editable: COVERED (Cypress TC-11.2, T8-1)
- HgbA1c free text T1 input: COVERED (Cypress TC-11.4)
- HgbA1c T2 month dropdown: COVERED (Cypress TC-11.3)
- BP T2 free text input: COVERED (Cypress TC-11.5)
- BP T1 call interval dropdown: COVERED (Cypress TC-11.5)
- Cervical Cancer month options: COVERED (Cypress TC-11.6, T8-2)
- Chronic diagnosis attestation: COVERED (Cypress + Vitest)
- Cascading clear on status change: COVERED (Cypress TC-6.10)
- Depression Screening no tracking: COVERED (Cypress + Vitest)
- T1/T2 with row color verification: COVERED (Cypress row-color-comprehensive, ~45 tests)
- Tracking prompt text labels: COVERED (Cypress -- "Select screening type", "Select test type", "Select status", "Select time period", "HgbA1c value")

**Critical gaps:**
1. Tracking #3 does NOT exist in the codebase (spec AC-10 mentions it but it was never implemented)
2. T1/T2 value persistence on save -- no explicit test (implicit in row-color tests that set and verify values)
3. T1/T2 clearing on status change -- only the TC-6.10 test covers this; no dedicated tracking-clear-only test
4. Text input for BP T2 "BP reading" prompt display -- covered but assertion is weak (accepts empty or "bp")
5. Switching between statuses with different tracking types -- partial coverage
6. Due date recalculation from tracking selection -- covered in row-color-comprehensive but not isolated
7. No Playwright tests for any tracking behavior

---

## Use Cases & Per-Framework Coverage

### UC-1: Tracking #1 shows dropdown for Colon Cancer Screening ordered/completed (AC-1)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps colon cancer screening statuses to test types" (Colonoscopy, Sigmoidoscopy, Cologuard, FOBT) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts`: "Screening test ordered shows Tracking #1 options" (verifies dropdown options), "Colon cancer screening shows Select screening type prompt" (prompt text) |

### UC-2: Tracking #1 shows dropdown for Breast Cancer Screening ordered/completed

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps breast cancer screening statuses to imaging types" (Mammogram, Breast Ultrasound, Breast MRI) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts`: "can select Mammogram tracking", "Breast Cancer Screening test ordered shows Select test type prompt"; `row-color-comprehensive.cy.ts`: 2C/2D sections (Mammogram, Breast Ultrasound, Breast MRI T1 selection + color) |

### UC-3: Tracking #1 shows "N/A" for statuses without tracking options (AC-2)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "returns null for statuses without tracking options" (Not Addressed, AWV completed, Patient declined) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.2: "Tracking #1 shows N/A for statuses without tracking options" (AWV completed), T8-1: "tracking field shows N/A and is non-editable" |

### UC-4: N/A cells are NOT editable (AC-3)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No unit test for cell editability check (isDropdownCell logic in PatientGrid) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.2: "Tracking #1 N/A cell is not editable (no dropdown opens)" -- clicks cell, asserts `.ag-popup` does not exist; T8-1: same test with `cy.wait(300)` for timing |

### UC-5: Tracking #1 shows free text input with "HgbA1c value" prompt (AC-4)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No unit test for HgbA1c prompt text rendering |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.4: "Tracking #1 accepts free text (HgbA1c value)" -- sets up Diabetes Control > HgbA1c at goal, double-clicks tracking1, types "6.5", verifies value saved; "HgbA1c ordered shows HgbA1c value prompt in tracking1" (verifies prompt text display) |

### UC-6: Tracking #2 shows month dropdown for HgbA1c statuses (AC-5)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No unit test for T2 month dropdown options |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.3: "Tracking #2 shows month options" -- opens T2 dropdown, verifies options contain "month"; `row-color-comprehensive.cy.ts` section 3: "HgbA1c ordered + T2=3 months" etc. (12+ tests exercising T2 month selection) |

### UC-7: Tracking #2 shows free text with "BP reading" prompt for Hypertension (AC-6)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.5: "Tracking #2 accepts BP reading free text" -- types "145/92", verifies; T8-2: "BP tracking #2 shows correct prompt label" -- asserts text is empty or contains "bp" or "reading" |

**Note:** The T8-2 BP prompt test has a weak assertion: `expect(text === '' || text.toLowerCase().includes('bp') || text.toLowerCase().includes('reading')).to.be.true`. An empty string would pass this test, so the prompt display is not firmly asserted.

### UC-8: Cervical Cancer "Screening discussed" T1 shows "In 1 Month" through "In 11 Months" (AC-7)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps Screening discussed to month intervals" (11 options, In 1 Month to In 11 Months) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.6: "Cervical Cancer Screening discussed Tracking #1 shows month options"; T8-2: "Cervical Cancer tracking shows month options"; `row-color-comprehensive.cy.ts` 2E: Screening discussed T1 month selection (4+ tests) |

### UC-9: Selecting month option sets due date (statusDate + N*30 days) (AC-8)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | Yes | `backend/src/services/__tests__/dueDateCalculator.test.ts` covers cervical month calculations |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `row-color-comprehensive.cy.ts` 2E: sets T1=In N Months and verifies row color (which depends on due date), but does not directly assert the due date value |

### UC-10: Chronic Diagnosis "resolved"/"invalid" T1 shows attestation options (AC-9)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps chronic diagnosis resolved/invalid to attestation options" (Attestation not sent, Attestation sent) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts`: "Chronic diagnosis resolved shows attestation options"; "Chronic diagnosis resolved shows Select status prompt"; `row-color-comprehensive.cy.ts` 2H: 8 tests for Chronic DX attestation selections and colors |

### UC-11: Tracking #3 is always editable free text (AC-10)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: Tracking #3 does NOT exist in the codebase. The spec references AC-10 for "Tracking #3 is always editable free text" but the PatientGrid.tsx only defines `tracking1` and `tracking2` columns. There is no `tracking3` field anywhere in the frontend source. This is a spec-to-implementation mismatch, not a test gap.**

### UC-12: T1 dropdown options for BP callback statuses (call intervals)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps BP callback statuses to weekly call intervals" (8 options, Call every 1 wk through Call every 8 wks) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-11.5: "Hypertension BP not at goal Tracking #1 shows call interval dropdown"; `row-color-comprehensive.cy.ts` 2F/2G: BP T1 call interval selection (16+ tests) |

### UC-13: T1/T2 clearing on status change

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` TC-6.10: "changing Measure Status clears Status Date, Tracking, Due Date, and Interval but preserves Notes" -- comprehensive test that sets up Colon Cancer screening ordered with Colonoscopy tracking, status date, and notes, then changes status to "Patient declined" and verifies tracking1 cleared to N/A, dueDate cleared, interval cleared, notes preserved |

### UC-14: Depression Screening has no tracking options

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "has no Tracking #1 options for any Depression Screening status" (iterates all 7 statuses) |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts`: "Depression Screening has no Tracking #1 options" (verifies cell does not contain "Select") |

### UC-15: Depression terminal statuses set tracking to N/A

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` T8-4: "Depression Patient declined sets tracking1 to N/A", "Depression Screening unnecessary sets tracking1 to N/A", "Depression No longer applicable sets tracking1 to N/A" (3 tests) |

### UC-16: Depression Screening cascading clear on status change

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` T8-3: "Depression Screening status change clears cascaded tracking fields" -- changes from Called to schedule (blue) to Not Addressed (white), verifies tracking1 cleared; "Depression Screening Not Addressed shows white row after clearing" |

### UC-17: Tracking prompt text display for each measure type

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No unit test for prompt text rendering |
| **Playwright** | No | -- |
| **Cypress** | Yes | `cascading-dropdowns.cy.ts` "Tracking #1 Prompt Text" section: "Colon cancer screening shows Select screening type", "Breast Cancer shows Select test type", "Chronic diagnosis resolved shows Select status", "Screening discussed shows Select time period", "HgbA1c ordered shows HgbA1c value" (5 tests) |

### UC-18: T1/T2 with row color interaction (comprehensive combinations)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Yes | `row-color-comprehensive.cy.ts`: Sections 2A-2H (colon, breast, cervical, BP, chronic DX with various T1 values + color), Section 3 (HgbA1c T1+T2 + color), Section 4 (BP T1+T2 + color), Section 5 (overdue with various T1/T2 combos) -- approximately 45 tests |

### UC-19: Due date calculation based on tracking selection

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | Yes | `dueDateCalculator.test.ts`: comprehensive due date calculation tests for all tracking combinations |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `row-color-comprehensive.cy.ts`: overdue tests verify due date indirectly (past date + tracking -> overdue color), but do not assert the actual due date value |

### UC-20: HgbA1c T2 month intervals (1-12 months)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No explicit test for all 12 month options (only tests that tracking2 dropdown exists for HgbA1c) |
| **Playwright** | No | -- |
| **Cypress** | Partial | `cascading-dropdowns.cy.ts` TC-11.3: verifies "month" text appears in options but does not enumerate all 12; `row-color-comprehensive.cy.ts` section 3: uses specific month values (1, 3, 6, 12 months) |

### UC-21: BP T1 week intervals (1-8 weeks)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | Yes | `dropdownConfig.test.ts`: "maps BP callback statuses to weekly call intervals" -- verifies 8 options, first="Call every 1 wk", last="Call every 8 wks" |
| **Playwright** | No | -- |
| **Cypress** | Yes | `row-color-comprehensive.cy.ts` 2F/2G: exercises Call every 1 wk through Call every 8 wks |

### UC-22: Switch between statuses with different tracking types

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Partial | `cascading-dropdowns.cy.ts` TC-6.10: switches from Colon screening ordered (dropdown tracking) to Patient declined (N/A tracking), but does not test switching FROM text input TO dropdown or vice versa |

**GAP: No test covers switching from a free-text tracking field (e.g., HgbA1c T1) to a dropdown tracking field (e.g., Colon screening T1) or the reverse. Priority: MEDIUM.**

### UC-23: Enter free text then switch to dropdown status

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | No | -- |

**GAP: No test enters a free text value in tracking1 (e.g., HgbA1c value "6.5"), then switches to a dropdown status (e.g., Colon screening ordered), and verifies the old value is cleared and dropdown works. Priority: MEDIUM.**

### UC-24: Tracking value persistence on save

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | -- |
| **Playwright** | No | -- |
| **Cypress** | Implicit | `cascading-dropdowns.cy.ts` TC-11.4: types "6.5" in HgbA1c tracking1 and verifies it contains "6.5"; TC-11.5: types "145/92" in BP tracking2 and verifies |

**Note:** These tests verify the value is displayed after entry but do not explicitly test that it persists after a page refresh. The row-color-comprehensive tests use cy.editAgGridCell which saves values, providing implicit persistence testing.**

### UC-25: isDropdownCell logic (determines dropdown vs text vs disabled)

| Framework | Covered? | Test Location |
|-----------|----------|---------------|
| **Jest** | N/A | -- |
| **Vitest** | No | No unit test for the isDropdownCell function in PatientGrid.tsx |
| **Playwright** | No | -- |
| **Cypress** | Implicit | Covered indirectly via E2E tests that verify dropdown appears for some statuses and does not for others |

**GAP: No unit test for the `isDropdownCell` function. This is a key piece of business logic that determines whether tracking1 shows a dropdown, text input, or is disabled. Priority: MEDIUM. Should be extracted and unit tested.**

---

## Gap Summary

| # | Gap | AC | Priority | Recommendation |
|---|-----|----|----------|----------------|
| 1 | Tracking #3 not implemented (spec mismatch) | AC-10 | INFO | Spec references Tracking #3 but it does not exist in the codebase. Either update spec to remove AC-10, or implement the feature. |
| 2 | Switch from free text to dropdown tracking type | -- | MEDIUM | Add Cypress test: set HgbA1c status (text tracking), enter value, switch to Colon screening (dropdown tracking), verify old value cleared |
| 3 | Enter free text then switch to dropdown status | -- | MEDIUM | Add Cypress test: enter HgbA1c value "6.5", change qualityMeasure to Colon Cancer, set ordered status, verify tracking1 is now dropdown with Colonoscopy options |
| 4 | isDropdownCell unit test | -- | MEDIUM | Extract isDropdownCell logic from PatientGrid.tsx and add Vitest unit tests for all branches |
| 5 | Tracking value persistence across page refresh | -- | LOW | Add Cypress or Playwright test: set tracking value, reload page, verify value persists |
| 6 | BP T2 prompt text assertion is weak | AC-6 | LOW | Tighten T8-2 BP prompt test to assert `text.toLowerCase().includes('bp')` without accepting empty string |
| 7 | HgbA1c T2 all 12 month options enumerated | AC-5 | LOW | Config test already covers first/last; E2E tests use representative values. Full enumeration is overkill. |
| 8 | No Playwright tracking tests | -- | LOW | All tracking E2E is in Cypress. Adding Playwright duplicates is not necessary unless Cypress coverage is insufficient. |
| 9 | Regression plan says TC-11.2-TC-11.5 are "Manual" | -- | INFO | These are now automated in `cascading-dropdowns.cy.ts`. Update regression plan to mark as "Automated". |

---

## Test Counts by Framework

| Framework | Test Count | Files |
|-----------|-----------|-------|
| Vitest | ~15 (tracking-specific of 53 total) | dropdownConfig.test.ts (STATUS_TO_TRACKING1 tests, getTracking1OptionsForStatus tests, HGBA1C/BP_STATUSES tests, Depression no-tracking tests) |
| Jest | ~9 (due date calculator) | dueDateCalculator.test.ts (tracking-dependent calculation tests) |
| Playwright | 0 | -- |
| Cypress | ~75 | cascading-dropdowns.cy.ts (~30 tracking tests across TC-11.x, T8-x, prompt text), row-color-comprehensive.cy.ts (~45 T1/T2 color tests) |
| **Total** | **~99** | |

---

## Spec-to-Implementation Mismatches

1. **Tracking #3 (AC-10)**: The spec states "Tracking #3 is always editable free text" but the codebase only implements `tracking1` and `tracking2`. There is no `tracking3` column in PatientGrid.tsx, no `tracking3` field in the data model, and no tests for it. This is a spec feature that was never built.

2. **Regression plan TC-11.2-TC-11.5 marked as "Manual"**: These are now automated in Cypress `cascading-dropdowns.cy.ts` (TC-11.2 N/A state, TC-11.3 HgbA1c month dropdown, TC-11.4 HgbA1c free text, TC-11.5 BP reading). The regression plan is stale and should be updated.

3. **Spec test-plan.md is stale**: The test plan in `.claude/specs/tracking-fields/test-plan.md` shows many items as "Gap" that are now automated. For example, AC-2/AC-3 (N/A display/editability) and AC-4/AC-5/AC-6 (free text prompts) are all tested in Cypress.
