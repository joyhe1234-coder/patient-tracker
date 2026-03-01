# Requirements Document: Module 3 — Quality Measures, Row Colors & Cascading Test Plan

## Introduction

This specification consolidates all testable behaviors from six existing feature specs — row-colors, cascading-dropdowns, due-date, time-interval, tracking-fields, and depression-screening — into a unified, comprehensive test plan for Module 3. The goal is to map every testable behavior to acceptance criteria, identify coverage gaps versus current automated tests, and propose new test cases to fill those gaps. This is a test-only module; no production code changes are required.

### Current Test Inventory (Module 3 scope)

*Counts verified by `it()` call analysis on commit 6e5730a (2026-02-27).*

| Layer | File | it() Count | Effective Tests | Coverage Area |
|-------|------|-----------|-----------------|---------------|
| Vitest | `statusColors.test.ts` | 54 | 54 | Status arrays, isChronicDxAttestationSent, isRowOverdue, getRowStatusColor (incl. Depression Screening) |
| Vitest | `dropdownConfig.test.ts` | 52 | 52 | Cascading mappings, helper functions, Depression Screening config, chain integrity |
| Vitest | `StatusFilterBar.test.tsx` | 115 | 115 | Filter chip rendering, counts, selection, color counting, measure dropdown |
| Jest | `dueDateCalculator.test.ts` | 26 | 26 | Due date calculation, HgbA1c tracking2 (1/3/6/12 months), DueDayRule, baseDueDays (incl. Depression baseDueDays=7, baseDueDays=null) |
| Jest | `statusDatePromptResolver.test.ts` | 63 | 63 | Date prompt resolution for ~40 statuses, tracking1 overrides, case sensitivity |
| Cypress | `row-color-comprehensive.cy.ts` | 166 | 166 | All 14 QMs x statuses, tracking types, date/overdue, time interval, transitions, Depression Screening colors + overdue |
| Cypress | `row-color-roles.cy.ts` | 8 | 24 (8 x 3 roles) | 8 core scenarios x 3 roles (Admin, Physician, Staff) via `ROLES.forEach()` |
| Cypress | `cascading-dropdowns.cy.ts` | 53 | 53 | Dropdown cascading, auto-fill, field clearing, status options, Depression Screening (7 statuses, N/A tracking, colors), Measure Status cascade clear with Notes preservation |
| Cypress | `sorting-filtering.cy.ts` | 56 | 56 | Column sorting, filter chip display, filter-by-color (all 7 colors), overdue filter, sort+filter combo, row color verification |
| Cypress | `time-interval.cy.ts` | 15 | 15 | Editability (3 of 6 non-editable), override, validation (0, >1000, non-numeric, empty), dropdown-controlled intervals |
| Cypress | `compact-filter-bar.cy.ts` | 3 | 3 | Quality measure dropdown filter, chip count updates, measure+color AND filter |
| **TOTAL** | | **611** | **627** | |

**Note:** The previous spec listed ~542 tests. The actual count is 627 effective tests (611 `it()` blocks, with row-color-roles multiplied by 3 roles). Key corrections:
- `dueDateCalculator.test.ts` now has 26 tests (was listed as 17) -- Depression Screening baseDueDays tests were added
- `StatusFilterBar.test.tsx` (115 tests) was not previously included in the M3 scope but is relevant to color counting
- `row-color-comprehensive.cy.ts` has 166 tests (was listed as 179)
- `cascading-dropdowns.cy.ts` has 53 tests (was listed as 55) -- includes Measure Status cascade clear with Notes preservation (TC-6.10) and Depression Screening section

### Source Specifications

- `.claude/specs/row-colors/requirements.md` (AC-1 through AC-24)
- `.claude/specs/cascading-dropdowns/requirements.md` (AC-1 through AC-10)
- `.claude/specs/due-date/requirements.md` (AC-1 through AC-8)
- `.claude/specs/time-interval/requirements.md` (AC-1 through AC-7)
- `.claude/specs/tracking-fields/requirements.md` (AC-1 through AC-10)
- `.claude/specs/depression-screening/requirements.md` (REQ-DS-1 through REQ-DS-10)
- `.claude/specs/row-color-e2e/test-plan.md` (95 scenarios across 4 sections)
- `.claude/ROW_COLOR_LOGIC.md` (complete truth tables)

## Alignment with Product Vision

This test plan directly supports the product vision by ensuring the correctness of the core patient tracking grid — the primary interface for all three user roles (Physician, Staff, Admin). The color-coding system provides "real-time compliance visibility" (product.md success metric), and the cascading dropdowns enforce valid clinical data combinations. Gaps in test coverage here represent risks to the core value proposition. Depression Screening (the 14th quality measure) was recently added and needs comprehensive test coverage integrated alongside the existing 13 measures.

---

## Requirements

### REQ-M3-1: Status-to-Color Mapping for All 14 Quality Measures

**User Story:** As a QA engineer, I want every combination of Quality Measure and Measure Status to be verified against its expected row color, so that no status/color mapping regression can go undetected.

#### Acceptance Criteria

1. **AC-M3-1.1:** WHEN a row has any of the 6 YELLOW_STATUSES (`Patient called to schedule AWV`, `Diabetic eye exam discussed`, `Screening discussed`, `Patient contacted for screening`, `Vaccination discussed`, `Visit scheduled`), THEN the row SHALL display CSS class `row-status-yellow` with background #FFF9E6.
2. **AC-M3-1.2:** WHEN a row has any of the 19 BLUE_STATUSES (`AWV scheduled`, `Will call later to schedule`, `Diabetic eye exam scheduled`, `Diabetic eye exam referral made`, `Colon cancer screening ordered`, `Screening test ordered`, `Screening appt made`, `Test ordered`, `Urine microalbumin ordered`, `Appointment scheduled`, `ACE/ARB prescribed`, `Vaccination scheduled`, `HgbA1c ordered`, `Lab ordered`, `Obtaining outside records`, `HgbA1c NOT at goal`, `Scheduled call back - BP not at goal`, `Scheduled call back - BP at goal`, `Called to schedule`), THEN the row SHALL display CSS class `row-status-blue` with background #CCE5FF.
3. **AC-M3-1.3:** WHEN a row has any of the 14 GREEN_STATUSES (`AWV completed`, `Diabetic eye exam completed`, `Colon cancer screening completed`, `Screening test completed`, `Screening completed`, `GC/Clamydia screening completed`, `Urine microalbumin completed`, `Blood pressure at goal`, `Lab completed`, `Vaccination completed`, `HgbA1c at goal`, `Chronic diagnosis confirmed`, `Patient on ACE/ARB`, `Screening complete`), THEN the row SHALL display CSS class `row-status-green` with background #D4EDDA.
4. **AC-M3-1.4:** WHEN a row has any of the 5 PURPLE_STATUSES (`Patient declined AWV`, `Patient declined`, `Patient declined screening`, `Declined BP control`, `Contraindicated`), THEN the row SHALL display CSS class `row-status-purple` with background #E5D9F2.
5. **AC-M3-1.5:** WHEN a row has either of the 2 ORANGE_STATUSES (`Chronic diagnosis resolved`, `Chronic diagnosis invalid`) AND Tracking #1 is NOT `Attestation sent`, THEN the row SHALL display CSS class `row-status-orange` with background #FFE8CC.
6. **AC-M3-1.6:** WHEN a row has any of the 2 GRAY_STATUSES (`No longer applicable`, `Screening unnecessary`), THEN the row SHALL display CSS class `row-status-gray` with background #E9EBF3.
7. **AC-M3-1.7:** WHEN a row has `Not Addressed`, null, empty, or any unrecognized Measure Status, THEN the row SHALL display CSS class `row-status-white` with background #FFFFFF.
8. **AC-M3-1.8:** WHEN `getRowStatusColor()` is called, THEN no status string SHALL appear in more than one color array (mutual exclusivity).

#### Coverage Gap Analysis (REQ-M3-1)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-1.1 | Not all 14 GREEN_STATUSES individually verified in Vitest `getRowStatusColor()` | Vitest checks 6 of 14: `AWV completed`, `HgbA1c at goal`, `Lab completed`, `Patient on ACE/ARB`, `Screening complete`, `Screening completed` (via Depression section) | OPEN | Add parameterized `getRowStatusColor()` assertions for remaining 8: `Diabetic eye exam completed`, `Colon cancer screening completed`, `Screening test completed`, `GC/Clamydia screening completed`, `Urine microalbumin completed`, `Blood pressure at goal`, `Vaccination completed`, `Chronic diagnosis confirmed` |
| GAP-1.2 | Not all 19 BLUE_STATUSES individually verified in Vitest `getRowStatusColor()` | Vitest checks 5 of 19: `AWV scheduled`, `HgbA1c ordered`, `HgbA1c NOT at goal`, `Obtaining outside records` (via status array test), `Called to schedule` | OPEN | Add parameterized assertions for remaining 14: `Diabetic eye exam scheduled`, `Diabetic eye exam referral made`, `Colon cancer screening ordered`, `Screening test ordered`, `Screening appt made`, `Test ordered`, `Urine microalbumin ordered`, `Appointment scheduled`, `ACE/ARB prescribed`, `Vaccination scheduled`, `Lab ordered`, `Scheduled call back - BP not at goal`, `Scheduled call back - BP at goal`, `Will call later to schedule` |
| GAP-1.3 | Not all 6 YELLOW_STATUSES individually verified in Vitest `getRowStatusColor()` | Vitest checks 4 of 6: `Patient called to schedule AWV`, `Screening discussed`, `Patient contacted for screening` (via status array), `Visit scheduled` | OPEN | Add assertions for remaining 2: `Diabetic eye exam discussed`, `Vaccination discussed` |
| GAP-1.4 | Depression Screening `Not Addressed` not explicitly tested for white | `getRowStatusColor()` test covers `'Not Addressed'` returning `'white'` (line 321) | **RESOLVED** | No action needed -- already tested via generic `Not Addressed` case |
| GAP-1.5 | Not all 5 PURPLE_STATUSES individually verified in Vitest `getRowStatusColor()` | Vitest checks 3 of 5: `Patient declined AWV`, `Patient declined`, `Contraindicated` | OPEN | Add assertions for remaining 2: `Patient declined screening`, `Declined BP control` |

---

### REQ-M3-2: Depression Screening Color Mapping (AC-15 through AC-24)

**User Story:** As a QA engineer, I want Depression Screening's 7 statuses to be verified for correct row colors at all test layers (Vitest unit, Cypress E2E, and multi-role E2E), so that the newly added 14th quality measure has the same test depth as existing measures.

#### Acceptance Criteria

1. **AC-M3-2.1:** WHEN a Depression Screening row has `Called to schedule`, THEN it SHALL display blue (#CCE5FF). Tests SHALL exist at Vitest (getRowStatusColor) and Cypress (E2E grid) layers.
2. **AC-M3-2.2:** WHEN a Depression Screening row has `Visit scheduled`, THEN it SHALL display yellow (#FFF9E6). Tests SHALL exist at Vitest and Cypress layers.
3. **AC-M3-2.3:** WHEN a Depression Screening row has `Screening complete`, THEN it SHALL display green (#D4EDDA). Tests SHALL verify this is distinct from `Screening completed` (Cervical Cancer).
4. **AC-M3-2.4:** WHEN a Depression Screening row has `Patient declined`, THEN it SHALL display purple (#E5D9F2).
5. **AC-M3-2.5:** WHEN a Depression Screening row has `Screening unnecessary`, THEN it SHALL display gray (#E9EBF3).
6. **AC-M3-2.6:** WHEN a Depression Screening row has `No longer applicable`, THEN it SHALL display gray (#E9EBF3).
7. **AC-M3-2.7:** WHEN a Depression Screening row has `Not Addressed`, THEN it SHALL display white (#FFFFFF).
8. **AC-M3-2.8:** WHEN `Called to schedule` has `dueDate < today`, THEN the row SHALL turn red (#FFCDD2), overriding blue.
9. **AC-M3-2.9:** WHEN `Visit scheduled` has `dueDate < today`, THEN the row SHALL turn red (#FFCDD2), overriding yellow.
10. **AC-M3-2.10:** WHEN `Screening complete` has no due date (baseDueDays=null), THEN the row SHALL never turn red.
11. **AC-M3-2.11:** WHEN `Patient declined` or `Screening unnecessary` or `No longer applicable` has any due date in the past, THEN the row SHALL NOT turn red (terminal status exclusion).

#### Coverage Gap Analysis (REQ-M3-2)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-2.1 | Depression Screening not in multi-role E2E (row-color-roles.cy.ts) | row-color-roles.cy.ts runs 8 scenarios x 3 roles, none for Depression Screening | OPEN | Add Depression Screening scenario to multi-role suite (e.g., Called to schedule + overdue per role) |
| GAP-2.2 | Depression Screening overdue boundary (7-day timer for Called to schedule, 1-day for Visit scheduled) not tested E2E | Vitest has boundary tests (statusColors.test.ts lines 256-291: 7-day and 1-day boundary tests). Cypress `row-color-comprehensive.cy.ts` tests `Called to schedule + PAST_DATE` (line 1094) but not the exact boundary. | OPEN | Add Cypress test: set status date 8 days ago for Called to schedule, verify red; set status date 7 days ago, verify NOT red |
| GAP-2.3 | `Screening complete` vs `Screening completed` coexistence not tested E2E | Vitest has both (statusColors.test.ts lines 454-459). Cypress `row-color-comprehensive.cy.ts` tests both: `Screening completed` in 1D Cervical Cancer (line 307) and `Screening complete` in 1E Depression Screening (line 348). | **RESOLVED** | No action needed -- both are verified green independently in Cypress E2E |
| GAP-2.4 | Depression Screening `No longer applicable` overdue exclusion not tested in Vitest | Vitest tests `No longer applicable` non-overdue (line 185-186) but generically -- no Depression Screening-specific context | **RESOLVED** | The generic `No longer applicable` test is sufficient since `isRowOverdue()` checks status string, not quality measure |
| GAP-2.5 | Depression Screening `Screening complete` with baseDueDays=null never becoming red not tested in Vitest | Only implicit via "no dueDate" test. Jest dueDateCalculator.test.ts has explicit `baseDueDays=null` test for `Screening complete` (line 465-481) returning null dueDate. | OPEN (LOW) | Add Vitest test: `Screening complete` + past dueDate = red (proving it CAN be red if somehow a dueDate exists); but add Jest test confirming baseDueDays=null ensures no dueDate ever created |

---

### REQ-M3-3: Overdue (Red) Detection Logic

**User Story:** As a QA engineer, I want the overdue detection logic tested for every relevant status category, including boundary conditions (day-of, day-after), terminal status exclusions, and the Chronic DX attestation cascade, so that overdue color overrides are provably correct.

#### Acceptance Criteria

1. **AC-M3-3.1:** WHEN a row has `dueDate < today` AND the status is in {white, yellow, blue, green, orange-without-attestation}, THEN `isRowOverdue()` SHALL return true and the row SHALL display red (#FFCDD2).
2. **AC-M3-3.2:** WHEN a row has `dueDate < today` AND the status is in {purple (all 5), gray (both)}, THEN `isRowOverdue()` SHALL return false and the row SHALL keep its status color.
3. **AC-M3-3.3:** WHEN a row has `dueDate === today`, THEN `isRowOverdue()` SHALL return false (strict less-than comparison).
4. **AC-M3-3.4:** WHEN a row has `dueDate === yesterday`, THEN `isRowOverdue()` SHALL return true.
5. **AC-M3-3.5:** WHEN a green status (e.g., `AWV completed`) has `dueDate < today`, THEN the row SHALL turn red (annual renewal overdue).
6. **AC-M3-3.6:** WHEN `Chronic diagnosis resolved` or `Chronic diagnosis invalid` has `Tracking #1 = 'Attestation sent'`, THEN the row SHALL be green regardless of due date (never overdue).
7. **AC-M3-3.7:** WHEN `Chronic diagnosis resolved` or `Chronic diagnosis invalid` has `Tracking #1 = 'Attestation not sent'` or null AND `dueDate < today`, THEN the row SHALL turn red.
8. **AC-M3-3.8:** WHEN `Chronic diagnosis resolved` or `Chronic diagnosis invalid` has `Tracking #1 = 'Attestation not sent'` AND `dueDate >= today`, THEN the row SHALL be orange.
9. **AC-M3-3.9:** WHEN a row has no `dueDate` (null), THEN `isRowOverdue()` SHALL return false regardless of status.
10. **AC-M3-3.10:** WHEN Depression Screening `Called to schedule` is set with status date 8+ days ago (baseDueDays=7), THEN the row SHALL be red.
11. **AC-M3-3.11:** WHEN Depression Screening `Visit scheduled` is set with status date 2+ days ago (baseDueDays=1), THEN the row SHALL be red.

#### Coverage Gap Analysis (REQ-M3-3)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-3.1 | Overdue for ALL green statuses not individually tested | Vitest `getRowStatusColor()` tests `AWV completed` overdue (line 399-405). No parameterized test for all 14 green statuses. | OPEN | Add parameterized Vitest test: each of 14 GREEN_STATUSES + past dueDate = red |
| GAP-3.2 | Overdue for ALL blue statuses not individually tested | Vitest tests `AWV scheduled` overdue (line 393-397). No parameterized test for all 19 blue statuses. | OPEN | Add parameterized Vitest test: each of 19 BLUE_STATUSES + past dueDate = red |
| GAP-3.3 | Overdue for ALL yellow statuses not individually tested | Not tested at all for yellow statuses (only tested for `Called to schedule` which is blue). | OPEN | Add parameterized Vitest test: each of 6 YELLOW_STATUSES + past dueDate = red |
| GAP-3.4 | Terminal status non-overdue not tested for ALL 5 purple statuses | Vitest `isRowOverdue()` tests 3 of 5: `Patient declined AWV`, `Patient declined`, `Contraindicated` (lines 195-203). Missing: `Patient declined screening`, `Declined BP control`. | OPEN | Add `isRowOverdue()` assertions for `Patient declined screening` and `Declined BP control` |
| GAP-3.5 | Chronic DX attestation cascade boundary not tested E2E | `row-color-comprehensive.cy.ts` has CDX resolved + Attestation not sent + past date = overdue (line 1140) and CDX resolved + Attestation sent + past date = green (line 1231). But no boundary test (dueDate = today). | OPEN (LOW) | Add Cypress boundary test: attestation-not-sent with dueDate = today (not overdue) vs yesterday (overdue) |
| GAP-3.6 | `dueDate === today` boundary not tested in Cypress E2E | Vitest has boundary tests (lines 240-246). Cypress `row-color-comprehensive.cy.ts` tests Today button scenarios (section 5B) which implicitly test this since baseDueDays >= 1 means dueDate >= tomorrow. | **PARTIALLY RESOLVED** | The Today button tests are indirect. Add explicit Cypress boundary test if needed, but Vitest boundary coverage is sufficient for unit-level confidence. |
| GAP-3.7 | Overdue for orange status (without attestation) not individually tested | Vitest `isRowOverdue()` tests `Chronic diagnosis resolved` + `Attestation not sent` (line 218-228) but only via `isRowOverdue()`, not `getRowStatusColor()`. | OPEN (LOW) | Add `getRowStatusColor()` assertion: `Chronic diagnosis resolved` + `Attestation not sent` + past dueDate = red |

---

### REQ-M3-4: Cascading Dropdown Clearing

**User Story:** As a QA engineer, I want cascading dropdown clear behavior tested at all three cascade levels (Request Type, Quality Measure, Measure Status) across all request types, so that invalid data combinations are provably prevented.

#### Acceptance Criteria

1. **AC-M3-4.1:** WHEN a user changes Request Type, THEN Quality Measure (unless auto-fill), Measure Status, Status Date, Tracking 1/2/3, Due Date, and Time Interval SHALL be cleared.
2. **AC-M3-4.2:** WHEN a user changes Quality Measure, THEN Measure Status, Status Date, Tracking 1/2/3, Due Date, and Time Interval SHALL be cleared.
3. **AC-M3-4.3:** WHEN a user changes Measure Status, THEN Status Date, Tracking 1/2/3, Due Date, and Time Interval SHALL be cleared.
4. **AC-M3-4.4:** WHEN any cascading clear occurs, THEN the Notes field SHALL be preserved (never cleared).
5. **AC-M3-4.5:** WHEN Request Type is changed to AWV, THEN Quality Measure SHALL auto-fill to `Annual Wellness Visit`.
6. **AC-M3-4.6:** WHEN Request Type is changed to Chronic DX, THEN Quality Measure SHALL auto-fill to `Chronic Diagnosis Code`.
7. **AC-M3-4.7:** WHEN Request Type is changed to Quality or Screening, THEN Quality Measure SHALL NOT auto-fill.
8. **AC-M3-4.8:** WHEN cascading clear fires on a row with Depression Screening data, THEN the same clearing rules SHALL apply identically to all other quality measures.
9. **AC-M3-4.9:** WHEN a status change triggers cascade clear, THEN the row color SHALL update to white (because measureStatus becomes null after Quality Measure or Request Type change).

#### Coverage Gap Analysis (REQ-M3-4)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-4.1 | Measure Status cascade clear (clearing Status Date, Tracking, Due Date, Time Interval) not automated | **RESOLVED** -- `cascading-dropdowns.cy.ts` TC-6.10 (lines 657-723) tests: set full row with Colon Cancer + Colonoscopy + date + notes, change Measure Status to Patient declined, verify Tracking #1 cleared, Due Date cleared, Time Interval cleared, Notes PRESERVED. Also tests BP status change clearing dueDate and interval (line 359). | **RESOLVED** | No action needed |
| GAP-4.2 | Notes preservation during cascade not tested | **RESOLVED** -- `cascading-dropdowns.cy.ts` TC-6.10 (line 686-691, 720-722) explicitly sets a note "Test note preserved", triggers MS cascade, and verifies note is preserved. | **RESOLVED** | No action needed |
| GAP-4.3 | Depression Screening cascade clear not tested | `cascading-dropdowns.cy.ts` Depression Screening section (lines 945-1043) tests 7 statuses and color mappings, but does NOT test cascade clearing FROM Depression Screening (e.g., change QM away from Depression Screening). However, cascade logic is measure-agnostic in the source code. | OPEN (LOW) | Add test: set Depression Screening `Called to schedule`, change Request Type to AWV, verify QM auto-fills and old status is cleared |
| GAP-4.4 | Row color change to white after cascade not tested | `row-color-comprehensive.cy.ts` section 8 (Color Transitions, line 1312) explicitly tests White -> Blue -> Green -> Purple -> Gray transition. Request Type change in `cascading-dropdowns.cy.ts` (line 512) clears QM and MS but does not assert `row-status-white`. | OPEN | Add explicit assertion after RT cascade clear: verify `row-status-white` class |

---

### REQ-M3-5: Due Date Calculation

**User Story:** As a QA engineer, I want due date calculation logic tested for all four priority paths (special tracking values, DueDayRule lookup, baseDueDays fallback, and null fallback), so that every due date computation path is verified.

#### Acceptance Criteria

1. **AC-M3-5.1:** WHEN a status has `baseDueDays` configured AND a status date is set, THEN Due Date SHALL equal Status Date + baseDueDays.
2. **AC-M3-5.2:** WHEN a DueDayRule exists for a status+tracking1 combination (e.g., Colonoscopy = 42 days), THEN the DueDayRule SHALL override baseDueDays.
3. **AC-M3-5.3:** WHEN an HgbA1c status has Tracking #2 selected (e.g., `3 months`), THEN Due Date SHALL be calculated as Status Date + N months.
4. **AC-M3-5.4:** WHEN an HgbA1c status has no Tracking #2 selected, THEN Due Date SHALL be null (no baseDueDays fallback).
5. **AC-M3-5.5:** WHEN `Screening discussed` has Tracking #1 = `In N Months`, THEN Due Date SHALL be Status Date + N*30 days (approximate month).
6. **AC-M3-5.6:** WHEN `AWV completed` has a status date, THEN Due Date SHALL be Status Date + 365 days (annual renewal).
7. **AC-M3-5.7:** WHEN status date is null, THEN Due Date SHALL be null regardless of other fields.
8. **AC-M3-5.8:** WHEN status date changes, THEN Due Date SHALL recalculate immediately.
9. **AC-M3-5.9:** WHEN Depression Screening `Called to schedule` has a status date, THEN Due Date SHALL be Status Date + 7 days.
10. **AC-M3-5.10:** WHEN Depression Screening `Visit scheduled` has a status date, THEN Due Date SHALL be Status Date + 1 day.
11. **AC-M3-5.11:** WHEN Depression Screening `Screening complete`, `Patient declined`, `Screening unnecessary`, `No longer applicable`, or `Not Addressed` has a status date, THEN Due Date SHALL be null (baseDueDays=null).

#### Coverage Gap Analysis (REQ-M3-5)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-5.1 | Due date appearing in grid after status change not tested E2E | `dueDateCalculator.test.ts` covers logic. `time-interval.cy.ts` (line 239-267) verifies due date IS set after AWV completed + status date, and changes when interval is overridden. But no test verifies the EXACT date value (365 days later). | OPEN (MEDIUM) | Add Cypress test: set AWV completed + today's date, verify dueDate cell shows date 365 days later (formatted) |
| GAP-5.2 | Status date change triggering recalculation not tested E2E | `time-interval.cy.ts` (line 501-536) tests changing tracking2 updates interval, which implies recalculation. But no test changes the status date itself and verifies dueDate updates. | OPEN (MEDIUM) | Add Cypress test: set AWV completed + date1, verify dueDate1; change to date2, verify dueDate2 differs |
| GAP-5.3 | Depression Screening baseDueDays not tested in Jest | **RESOLVED** -- `dueDateCalculator.test.ts` lines 427-443 test `Called to schedule` with baseDueDays=7 (Feb 1 + 7 = Feb 8). Lines 465-481 test `Screening complete` with baseDueDays=null returning null dueDate. | **RESOLVED** | No action needed |
| GAP-5.4 | BP call-back DueDayRule (Call every N wks) partially tested | `dueDateCalculator.test.ts` tests one BP case (`Call every 2 wks` = 14 days, line 292-308). The other 7 intervals are not tested. | OPEN (LOW) | Add parameterized Jest test for remaining 7 BP week intervals (1, 3, 4, 5, 6, 7, 8 wks) |
| GAP-5.5 | Chronic DX attestation DueDayRule (14 days) not tested | Not in `dueDateCalculator.test.ts`. The attestation tracking1 (`Attestation not sent`) should trigger a DueDayRule lookup. | OPEN | Add Jest test: `Chronic diagnosis resolved` + tracking1=`Attestation not sent` → DueDayRule returns 14 days |
| GAP-5.6 | Depression Screening `Visit scheduled` baseDueDays=1 not tested in Jest | Only `Called to schedule` baseDueDays=7 is tested (line 427). `Visit scheduled` baseDueDays=1 is tested indirectly via `AWV scheduled` baseDueDays=1 (line 408-424) but not for Depression Screening specifically. | OPEN (LOW) | Add Jest test: `Visit scheduled` with baseDueDays=1 |

---

### REQ-M3-6: Time Interval Field Behavior

**User Story:** As a QA engineer, I want time interval editability, validation, and override behavior tested for both editable and non-editable status categories, so that the time interval field always behaves correctly for the 6 dropdown-controlled statuses vs all other statuses.

#### Acceptance Criteria

1. **AC-M3-6.1:** WHEN Measure Status is one of the 6 TIME_PERIOD_DROPDOWN_STATUSES (`Screening discussed`, `HgbA1c ordered`, `HgbA1c at goal`, `HgbA1c NOT at goal`, `Scheduled call back - BP not at goal`, `Scheduled call back - BP at goal`), THEN the Time Interval cell SHALL NOT be editable (no edit wrapper on double-click).
2. **AC-M3-6.2:** WHEN Measure Status is any other status with a baseDueDays value, THEN the Time Interval cell SHALL be editable.
3. **AC-M3-6.3:** WHEN a user manually edits Time Interval to a valid integer (1-1000), THEN Due Date SHALL recalculate as Status Date + new interval.
4. **AC-M3-6.4:** WHEN a user enters 0, a negative number, a value > 1000, or non-numeric text, THEN the system SHALL reject the input, show an alert (for 0 and >1000), and revert to the previous value.
5. **AC-M3-6.5:** WHEN a user clears the Time Interval cell (empty), THEN the system SHALL revert to the previous value (no empty values allowed).
6. **AC-M3-6.6:** WHEN Time Interval is calculated from a DueDayRule or baseDueDays, THEN the displayed value SHALL equal `dueDate - statusDate` in days.
7. **AC-M3-6.7:** WHEN Depression Screening `Called to schedule` is set with a status date, THEN Time Interval SHALL display 7 (baseDueDays) and SHALL be editable.
8. **AC-M3-6.8:** WHEN Depression Screening `Visit scheduled` is set with a status date, THEN Time Interval SHALL display 1 (baseDueDays) and SHALL be editable.

#### Coverage Gap Analysis (REQ-M3-6)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-6.1 | Non-editability for all 6 dropdown statuses not fully tested | `time-interval.cy.ts` tests 3 of 6: `Screening discussed` (line 55), `HgbA1c ordered` (line 102), `Scheduled call back - BP not at goal` (line 134). Missing: `HgbA1c at goal`, `HgbA1c NOT at goal`, `Scheduled call back - BP at goal`. | OPEN | Add Cypress tests for remaining 3 non-editable statuses |
| GAP-6.2 | Depression Screening time interval editability not tested | Not covered in `time-interval.cy.ts`. `Called to schedule` has baseDueDays=7 and should be editable. | OPEN | Add Cypress test: set Depression Screening `Called to schedule` + today's date, verify interval=7, verify editable (edit wrapper exists on dblclick) |
| GAP-6.3 | Time interval override persistence after page reload not tested | Not covered at any layer. `time-interval.cy.ts` tests override within a session but not after `cy.reload()`. | OPEN (LOW) | Add Cypress test: override interval to 45, `cy.reload()`, verify persisted value is still 45 |
| GAP-6.4 | Negative number input validation not tested | `time-interval.cy.ts` tests 0 (line 340), >1000 (line 371), non-numeric (line 315), and empty (line 402). Negative numbers (-5) are NOT tested. | OPEN (LOW) | Add Cypress test: enter -5, verify rejection and revert to original value |

---

### REQ-M3-7: Tracking Field Behavior

**User Story:** As a QA engineer, I want tracking field types (dropdown, free text, N/A) to be verified for every applicable status, including dropdown option counts, free text prompts, and N/A non-editability, so that clinical data entry works correctly for all measure/status combinations.

#### Acceptance Criteria

1. **AC-M3-7.1:** WHEN a status has predefined Tracking #1 options (e.g., Colonoscopy/Sigmoidoscopy/Cologuard/FOBT for `Colon cancer screening ordered`), THEN clicking Tracking #1 SHALL show a dropdown with those exact options.
2. **AC-M3-7.2:** WHEN a status has no predefined Tracking #1 options AND is not a free text status, THEN Tracking #1 SHALL display "N/A" with italic styling and diagonal stripe overlay, and SHALL NOT be editable.
3. **AC-M3-7.3:** WHEN a status is an HgbA1c status, THEN Tracking #1 SHALL be a free text field with "HgbA1c value" prompt.
4. **AC-M3-7.4:** WHEN a status is an HgbA1c status, THEN Tracking #2 SHALL be a dropdown with 12 month options (1-12 months).
5. **AC-M3-7.5:** WHEN a status is a BP call-back status, THEN Tracking #1 SHALL be a dropdown with 8 week options (Call every 1-8 wks), AND Tracking #2 SHALL be a free text field with "BP reading" prompt.
6. **AC-M3-7.6:** WHEN `Screening discussed` is selected (Cervical Cancer), THEN Tracking #1 SHALL show 11 month options (In 1 Month through In 11 Months).
7. **AC-M3-7.7:** WHEN `Chronic diagnosis resolved` or `Chronic diagnosis invalid` is selected, THEN Tracking #1 SHALL show attestation options (`Attestation not sent`, `Attestation sent`).
8. **AC-M3-7.8:** Tracking #3 SHALL always be an editable free text field regardless of status.
9. **AC-M3-7.9:** WHEN any Depression Screening status is selected, THEN Tracking #1 SHALL NOT have predefined options (no dropdown, no entry). `getTracking1OptionsForStatus()` SHALL return null for all 7 Depression Screening statuses.
10. **AC-M3-7.10:** WHEN a user switches between statuses with different tracking types (e.g., from dropdown to N/A), THEN the tracking field SHALL update its type immediately.

#### Coverage Gap Analysis (REQ-M3-7)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-7.1 | N/A display and non-editability not tested | **PARTIALLY RESOLVED** -- `cascading-dropdowns.cy.ts` TC-11.2 (line 726-755) tests: AWV completed shows N/A or empty in Tracking #1. Depression Screening section (line 1033-1042) verifies no "Select" prompt. But: does NOT verify the italic styling / diagonal stripe overlay, and does NOT verify click does not open editor. | OPEN (MEDIUM) | Add Cypress test: verify N/A cell has italic class and does NOT enter edit mode on dblclick |
| GAP-7.2 | HgbA1c free text prompt (Tracking #1) verified | **RESOLVED** -- `cascading-dropdowns.cy.ts` (line 645-653) tests: `HgbA1c ordered` shows "HgbA1c value" prompt in tracking1. | **RESOLVED** | No action needed |
| GAP-7.3 | BP reading free text prompt (Tracking #2) not verified | `row-color-comprehensive.cy.ts` enters BP text via `setTracking2Text()` but does not verify the prompt label "BP reading". `cascading-dropdowns.cy.ts` does not have a BP tracking2 prompt test. | OPEN (MEDIUM) | Add Cypress test: set BP not at goal, verify Tracking #2 shows "BP reading" prompt |
| GAP-7.4 | Cervical Cancer month options (In 1-11 Months) not tested E2E | `dropdownConfig.test.ts` has Vitest coverage (line 159-163). `cascading-dropdowns.cy.ts` (line 620-641) tests `Screening discussed` shows "Select time period" prompt. `row-color-comprehensive.cy.ts` uses `setTracking1Dropdown('In 1 Month')` etc. but does not verify the complete option list. | OPEN (LOW) | Add Cypress test: set Cervical Cancer > Screening discussed, open tracking1 dropdown, verify 11 options from "In 1 Month" to "In 11 Months" |
| GAP-7.5 | Tracking #3 always-editable not tested | Not automated at any layer. Tracking #3 is always free text but no test verifies editability across status types. | OPEN (MEDIUM) | Add Cypress test: verify Tracking #3 is editable (edit wrapper exists on dblclick) for: (a) N/A tracking status, (b) dropdown tracking status, (c) free text tracking status |
| GAP-7.6 | Depression Screening tracking field no-options verified only in Vitest | **PARTIALLY RESOLVED** -- `dropdownConfig.test.ts` (lines 118-123) tests all 7 Depression statuses return null from `getTracking1OptionsForStatus()`. `cascading-dropdowns.cy.ts` (line 1033-1042) tests `Called to schedule` does not show "Select" prompt in E2E. But only 1 of 7 Depression statuses tested E2E. | OPEN (LOW) | Add Cypress test: verify Tracking #1 shows N/A for `Visit scheduled`, `Screening complete`, and `Patient declined` (representative sample) |
| GAP-7.7 | Switching between tracking types (dropdown -> N/A -> free text) not tested | Not automated. Row-color-comprehensive tests individual statuses but never switches on the same row. | OPEN (MEDIUM) | Add Cypress test: on same row, set CCS ordered (dropdown tracking), then AWV completed (N/A tracking), then HgbA1c ordered (free text tracking), verify tracking1 type changes each time |

---

### REQ-M3-8: Color Priority and Interaction Rules

**User Story:** As a QA engineer, I want the color priority system (duplicate indicator > overdue > status-based) and selection behavior tested, so that layered visual indicators work correctly when multiple conditions are active simultaneously.

#### Acceptance Criteria

1. **AC-M3-8.1:** WHEN a row has `isDuplicate === true`, THEN it SHALL show a 4px solid orange left border (#F97316) in addition to whatever background color is applied.
2. **AC-M3-8.2:** WHEN a row is selected (clicked), THEN it SHALL show a blue outline but SHALL NOT override the background color.
3. **AC-M3-8.3:** WHEN a row is both duplicate and overdue, THEN it SHALL show both the orange left border AND the red background.
4. **AC-M3-8.4:** WHEN a row color changes due to Measure Status edit, THEN the new color SHALL appear immediately without page refresh.
5. **AC-M3-8.5:** WHEN multiple rapid status changes occur on the same row, THEN each change SHALL trigger a cascade and the final color SHALL reflect the last status set.

#### Coverage Gap Analysis (REQ-M3-8)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-8.1 | Color priority (duplicate + overdue simultaneously) not tested | Not automated at any layer. `getRowStatusColor()` does not return 'duplicate' (duplicate is a separate CSS class via `isDuplicate` flag). No test verifies orange border AND red background coexist. | OPEN (MEDIUM) | Add Cypress test: import duplicate rows, set past due date, verify `row-status-duplicate` AND `row-status-overdue` classes coexist |
| GAP-8.2 | Selection preserves color tested only for green | `sorting-filtering.cy.ts` (line 817-830) tests: filter to Completed (green), click row, verify still has `row-status-green`. No test for blue, yellow, purple, or red selection behavior. | OPEN (LOW) | Add Cypress test: select rows in blue, yellow, and purple categories, verify background color class preserved |
| GAP-8.3 | Rapid sequential status changes not tested | `row-color-comprehensive.cy.ts` section 8 (line 1313-1329) tests White -> Blue -> Green -> Purple -> Gray transitions, but with `cy.wait(500)` between each change. Not "rapid" but sequential. | **PARTIALLY RESOLVED** | The existing color transition test provides functional coverage. Rapid-fire testing would be a stress/performance test rather than a correctness test. LOW priority. |
| GAP-8.4 | Immediate color change without page refresh not tested | `row-color-comprehensive.cy.ts` section 8 implicitly tests this (assertions follow status changes without reload). But no test explicitly verifies color updates without `cy.reload()`. | **RESOLVED** | The color transition tests (section 8) verify immediate visual updates |

---

### REQ-M3-9: Dropdown Configuration Integrity

**User Story:** As a QA engineer, I want the cascading dropdown configuration (Request Type to Quality Measure to Measure Status to Tracking) verified for completeness and correctness, so that no broken chain can allow invalid data entry.

#### Acceptance Criteria

1. **AC-M3-9.1:** WHEN Request Type is `AWV`, THEN Quality Measure SHALL have exactly 1 option: `Annual Wellness Visit`.
2. **AC-M3-9.2:** WHEN Request Type is `Chronic DX`, THEN Quality Measure SHALL have exactly 1 option: `Chronic Diagnosis Code`.
3. **AC-M3-9.3:** WHEN Request Type is `Quality`, THEN Quality Measure SHALL have exactly 8 options.
4. **AC-M3-9.4:** WHEN Request Type is `Screening`, THEN Quality Measure SHALL have exactly 4 options in alphabetical order: Breast Cancer Screening, Cervical Cancer Screening, Colon Cancer Screening, Depression Screening.
5. **AC-M3-9.5:** WHEN any Quality Measure is selected, THEN Measure Status SHALL have `Not Addressed` as the first option.
6. **AC-M3-9.6:** WHEN Depression Screening is selected, THEN Measure Status SHALL have exactly 7 options in the specified order.
7. **AC-M3-9.7:** Every status in `STATUS_TO_TRACKING1` SHALL be a valid status in at least one quality measure (referential integrity).
8. **AC-M3-9.8:** Every status in every color array (GREEN, BLUE, YELLOW, PURPLE, GRAY, ORANGE) SHALL be a valid status in at least one quality measure.

#### Coverage Gap Analysis (REQ-M3-9)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-9.1 | Color array / dropdown cross-reference integrity not tested | `dropdownConfig.test.ts` cascade chain integrity test (line 343-349) verifies every status in `STATUS_TO_TRACKING1` appears in at least one quality measure. But does NOT cross-reference the color arrays (`GREEN_STATUSES`, `BLUE_STATUSES`, etc.) against `QUALITY_MEASURE_TO_STATUS`. | OPEN | Add Vitest test in `dropdownConfig.test.ts`: every status in GREEN/BLUE/YELLOW/PURPLE/GRAY/ORANGE arrays must appear in at least one quality measure's status list |
| GAP-9.2 | ~~Screening count assertion~~ | **RESOLVED** -- `cascading-dropdowns.cy.ts` (line 71-85) asserts 4 screening options including Depression Screening. | **RESOLVED** | No action needed |

---

### REQ-M3-10: Date Prompt Resolution

**User Story:** As a QA engineer, I want every Measure Status to have its date prompt label verified, including both the in-memory fallback (`getDefaultDatePrompt()`) and the database-backed resolver, so that users always see the correct date label when entering status dates.

#### Acceptance Criteria

1. **AC-M3-10.1:** WHEN any of the approximately 45 distinct Measure Status values is passed to `getDefaultDatePrompt()`, THEN it SHALL return the correct date prompt label (or null for `Not Addressed`).
2. **AC-M3-10.2:** WHEN Depression Screening `Called to schedule` is passed, THEN `getDefaultDatePrompt()` SHALL return `Date Called`.
3. **AC-M3-10.3:** WHEN Depression Screening `Visit scheduled` is passed, THEN `getDefaultDatePrompt()` SHALL return `Date Scheduled`.
4. **AC-M3-10.4:** WHEN Depression Screening `Screening complete` is passed, THEN `getDefaultDatePrompt()` SHALL return `Date Completed`.
5. **AC-M3-10.5:** WHEN `resolveStatusDatePrompt()` is called with Tracking #1 = `Patient deceased`, THEN it SHALL return `Date of Death` regardless of Measure Status.
6. **AC-M3-10.6:** WHEN `resolveStatusDatePrompt()` is called with Tracking #1 = `Patient in hospice`, THEN it SHALL return `Date Reported` regardless of Measure Status.
7. **AC-M3-10.7:** `getDefaultDatePrompt()` SHALL be case-sensitive (lowercase input returns null).

#### Coverage Gap Analysis (REQ-M3-10)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-10.1 | Depression Screening date prompts not tested in Jest | `statusDatePromptResolver.test.ts` has `getDefaultDatePrompt()` tests for ~40 statuses but does NOT include Depression Screening statuses (`Called to schedule`, `Visit scheduled`, `Screening complete`). Source code `statusDatePromptResolver.ts` lines 74-76 DOES map these. | OPEN (HIGH) | Add Jest describe block "Depression Screening statuses": `Called to schedule`->`Date Called`, `Visit scheduled`->`Date Scheduled`, `Screening complete`->`Date Completed` |
| GAP-10.2 | Date prompt shown in grid UI not tested E2E | No Cypress/Playwright test verifies the prompt label text in the status date cell editor. | OPEN (LOW) | Add Cypress test: set AWV completed, verify status date column header or tooltip shows "Date Completed" prompt |

---

### REQ-M3-11: Multi-Role Verification

**User Story:** As a QA engineer, I want the core quality measure and color behaviors verified for all three user roles (Admin, Physician, Staff), so that role-based access control does not interfere with color rendering, cascading, or due date logic.

#### Acceptance Criteria

1. **AC-M3-11.1:** WHEN an Admin user sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
2. **AC-M3-11.2:** WHEN a Physician user sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
3. **AC-M3-11.3:** WHEN a Staff user (with assigned physician) sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
4. **AC-M3-11.4:** The multi-role E2E suite SHALL cover at minimum: one baseDueDays overdue scenario, one DueDayRule overdue scenario, one tracking-controlled overdue scenario, and one Depression Screening scenario per role.

#### Coverage Gap Analysis (REQ-M3-11)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-11.1 | Multi-role suite has no Depression Screening scenario | `row-color-roles.cy.ts` runs 8 scenarios x 3 roles = 24 tests. Scenarios cover: AWV (baseDueDays overdue, today), CCS (DueDayRule), HgbA1c (tracking2), BP (tracking1), Screening discussed (tracking1). No Depression Screening. | OPEN (HIGH) | Add 9th scenario per role: Screening > Depression Screening > Called to schedule + past date = overdue |
| GAP-11.2 | Multi-role suite does not test Chronic DX attestation cascade | Not in current 8 scenarios. Chronic DX is tested in `row-color-comprehensive.cy.ts` (section 8, line 1332-1338) but only as admin. | OPEN (MEDIUM) | Add 10th scenario per role: Chronic DX > resolved + Attestation sent + past date = stays green (never overdue) |

---

### REQ-M3-12: Status Filter Bar Color Counting

**User Story:** As a QA engineer, I want the status filter bar to correctly count rows per color, including Depression Screening rows, so that color-based filtering is accurate.

#### Acceptance Criteria

1. **AC-M3-12.1:** WHEN the status filter bar calculates row counts per color, THEN Depression Screening rows SHALL be counted in the correct color bucket.
2. **AC-M3-12.2:** WHEN a user clicks the "Blue" filter pill, THEN Depression Screening rows with `Called to schedule` SHALL be visible.
3. **AC-M3-12.3:** WHEN a user clicks the "Yellow" filter pill, THEN Depression Screening rows with `Visit scheduled` SHALL be visible.
4. **AC-M3-12.4:** WHEN a user clicks the "Green" filter pill, THEN Depression Screening rows with `Screening complete` SHALL be visible.
5. **AC-M3-12.5:** WHEN a user clicks the "Red" (Overdue) filter pill, THEN overdue Depression Screening rows SHALL be visible.

#### Coverage Gap Analysis (REQ-M3-12)

| Gap ID | Description | Current State | Status | Proposed Test |
|--------|------------|---------------|--------|---------------|
| GAP-12.1 | Depression Screening filter counting not tested | `compact-filter-bar.cy.ts` (3 tests) only tests quality measure dropdown filter with AWV. `sorting-filtering.cy.ts` tests filter-by-color for all 7 color categories generically. `StatusFilterBar.test.tsx` (115 tests) covers rendering and counting logic. But no test verifies Depression Screening rows specifically appear under correct color filter. | OPEN (MEDIUM) | Add Cypress test: set up Depression Screening rows with `Called to schedule`, click "In Progress" (blue) filter, verify Depression Screening row is visible |
| GAP-12.2 | Filter counting after status change not tested (stale count risk) | Known edge case in ROW_COLOR_LOGIC.md section 9d. No test verifies count updates after inline status edit. | OPEN (LOW) | Add Cypress test: note "All" count, change a row's status from white to green, verify count changes on Completed chip |

---

## Non-Functional Requirements

### Performance

- **NFR-M3-1:** All Vitest test suites in this module SHALL complete in under 5 seconds total.
- **NFR-M3-2:** Each individual Cypress E2E test SHALL complete in under 30 seconds (including grid load).
- **NFR-M3-3:** The full Cypress row-color-comprehensive suite SHALL complete in under 15 minutes.

### Reliability

- **NFR-M3-4:** Tests SHALL be deterministic — no flaky tests due to timing, animation, or data ordering. All Cypress tests SHALL use `cy.wait()` or custom `cy.waitForAgGrid()` only for data-dependent waits, not arbitrary delays.
- **NFR-M3-5:** Tests SHALL use unique patient names per test case (e.g., `{runId}{counter}-{prefix}, E2E`) to prevent cross-test data pollution.
- **NFR-M3-6:** Vitest overdue tests SHALL use `vi.useFakeTimers()` / `vi.setSystemTime()` for deterministic date comparisons (no dependency on the current date).

### Maintainability

- **NFR-M3-7:** All new test cases SHALL follow the existing patterns in their respective test files (e.g., `baseRow` fixture in statusColors.test.ts, `addRow` / `setupRow` helpers in row-color-comprehensive.cy.ts).
- **NFR-M3-8:** Test data tables (status -> expected color) SHALL use parameterized test patterns (`forEach`, `it.each`, or `describe.each`) where more than 3 similar assertions exist.

### Usability

- **NFR-M3-9:** All Cypress E2E tests SHALL be runnable with `--headed` for visual debugging per project conventions.
- **NFR-M3-10:** Test file organization SHALL follow existing naming conventions: `*.test.ts` for Vitest, `*.test.ts` for Jest, `*.cy.ts` for Cypress.

---

## Integration Requirements

- **INT-M3-1:** New Vitest tests SHALL extend existing files (`statusColors.test.ts`, `dropdownConfig.test.ts`) rather than creating new test files, unless the additions exceed 100 lines.
- **INT-M3-2:** New Jest tests SHALL extend existing files (`dueDateCalculator.test.ts`, `statusDatePromptResolver.test.ts`) for consistency.
- **INT-M3-3:** New Cypress tests for Depression Screening coverage gaps SHALL be added to `row-color-comprehensive.cy.ts` (color tests) and `cascading-dropdowns.cy.ts` (cascade tests).
- **INT-M3-4:** Multi-role additions SHALL extend `row-color-roles.cy.ts`.
- **INT-M3-5:** Time interval additions SHALL extend `time-interval.cy.ts`.
- **INT-M3-6:** All tests SHALL use the existing Cypress custom commands (`cy.login`, `cy.waitForAgGrid`, `cy.addTestRow`, `cy.selectAgGridDropdown`, `cy.selectAgGridDropdownAndVerify`, `cy.getAgGridCell`, `cy.getAgGridCellWithScroll`).
- **INT-M3-7:** All tests SHALL login as admin (`admin@gmail.com` / `welcome100`) unless specifically testing role-based behavior.

---

## Assumptions and Constraints

- **ASM-M3-1:** No production code changes are required for this module. All work is test-only (new tests + updates to existing test files).
- **ASM-M3-2:** The seeded test database contains sample patients for all 14 quality measures including Depression Screening (per `seed.ts` updates from the depression-screening feature).
- **ASM-M3-3:** All identified coverage gaps are based on file analysis as of the current commit (6e5730a). Gaps may change if tests are added between now and implementation.
- **ASM-M3-4:** Cypress tests require the application to be running locally (`docker-compose up` or `npx vite dev --host` for frontend + backend).
- **ASM-M3-5:** The verified test counts (by `it()` call analysis, 2026-02-27) are: 166 in row-color-comprehensive.cy.ts, 8 (x3 roles = 24 effective) in row-color-roles.cy.ts, 53 in cascading-dropdowns.cy.ts, 15 in time-interval.cy.ts, 56 in sorting-filtering.cy.ts, 3 in compact-filter-bar.cy.ts, 54 in statusColors.test.ts, 52 in dropdownConfig.test.ts, 115 in StatusFilterBar.test.tsx, 26 in dueDateCalculator.test.ts, 63 in statusDatePromptResolver.test.ts.
- **ASM-M3-6:** Depression Screening tracking fields show N/A for Tracking #1 (no dropdown options per ASM-1 in the depression-screening spec). This differs from most screening measures that have dropdown options for certain statuses.

---

---

## Coverage Matrix

The following matrix maps every acceptance criterion to existing test coverage and identifies the gap status.

### Legend
- FULL = Covered by one or more automated tests at the specified layer
- PARTIAL = Some but not all sub-cases covered
- NONE = No automated test exists
- N/A = Not applicable to this test layer

### REQ-M3-1: Status-to-Color Mapping

| AC | Description | Vitest | Cypress | Gap Status |
|----|------------|--------|---------|------------|
| AC-M3-1.1 | 6 YELLOW_STATUSES -> yellow | PARTIAL (4/6 in `getRowStatusColor()`) | FULL (all 6 in row-color-comprehensive 1A-1N) | GAP-1.3 (Vitest) |
| AC-M3-1.2 | 19 BLUE_STATUSES -> blue | PARTIAL (5/19 in `getRowStatusColor()`) | FULL (all 19 in row-color-comprehensive 1A-1N) | GAP-1.2 (Vitest) |
| AC-M3-1.3 | 14 GREEN_STATUSES -> green | PARTIAL (6/14 in `getRowStatusColor()`) | FULL (all 14 in row-color-comprehensive 1A-1N) | GAP-1.1 (Vitest) |
| AC-M3-1.4 | 5 PURPLE_STATUSES -> purple | PARTIAL (3/5 in `getRowStatusColor()`) | FULL (all 5 in row-color-comprehensive 1A-1N) | GAP-1.5 (Vitest) |
| AC-M3-1.5 | 2 ORANGE_STATUSES w/o attestation -> orange | FULL | FULL (row-color-comprehensive 1M) | -- |
| AC-M3-1.6 | 2 GRAY_STATUSES -> gray | FULL | FULL | -- |
| AC-M3-1.7 | Not Addressed/null/empty -> white | FULL | FULL | -- |
| AC-M3-1.8 | Mutual exclusivity of color arrays | FULL (status array test) | N/A | -- |

### REQ-M3-2: Depression Screening Color Mapping

| AC | Description | Vitest | Cypress (comprehensive) | Cypress (roles) | Gap Status |
|----|------------|--------|-------------------------|-----------------|------------|
| AC-M3-2.1 | Called to schedule -> blue | FULL | FULL (1E) | NONE | GAP-2.1 |
| AC-M3-2.2 | Visit scheduled -> yellow | FULL | FULL (1E) | NONE | GAP-2.1 |
| AC-M3-2.3 | Screening complete -> green (distinct from Screening completed) | FULL | FULL (1E + 1D) | N/A | -- |
| AC-M3-2.4 | Patient declined -> purple | FULL | FULL (1E) | N/A | -- |
| AC-M3-2.5 | Screening unnecessary -> gray | FULL | FULL (1E) | N/A | -- |
| AC-M3-2.6 | No longer applicable -> gray | FULL | FULL (1E) | N/A | -- |
| AC-M3-2.7 | Not Addressed -> white | FULL | FULL (1E) | N/A | -- |
| AC-M3-2.8 | Called to schedule + overdue -> red | FULL | FULL (section 5A) | NONE | GAP-2.1 |
| AC-M3-2.9 | Visit scheduled + overdue -> red | FULL | NONE (only Called to schedule tested) | NONE | GAP-2.2 |
| AC-M3-2.10 | Screening complete never red (baseDueDays=null) | NONE (indirect) | NONE | N/A | GAP-2.5 |
| AC-M3-2.11 | Terminal Depression statuses never red | FULL (generic) | FULL (section 5C) | N/A | -- |

### REQ-M3-3: Overdue Detection

| AC | Description | Vitest | Cypress | Gap Status |
|----|------------|--------|---------|------------|
| AC-M3-3.1 | dueDate < today + non-terminal -> red | PARTIAL (tested for blue, green) | FULL (section 5A) | GAP-3.1/3.2/3.3 (Vitest) |
| AC-M3-3.2 | dueDate < today + terminal -> keep color | PARTIAL (3/5 purple, 2/2 gray) | FULL (section 5C) | GAP-3.4 (Vitest) |
| AC-M3-3.3 | dueDate === today -> NOT overdue | FULL | FULL (section 5B, indirect via Today button) | -- |
| AC-M3-3.4 | dueDate === yesterday -> overdue | FULL | N/A | -- |
| AC-M3-3.5 | Green + overdue -> red | FULL (AWV completed) | FULL (section 5A) | GAP-3.1 (parameterized) |
| AC-M3-3.6 | Chronic DX + attestation sent -> green (never overdue) | FULL | FULL (section 5C) | -- |
| AC-M3-3.7 | Chronic DX + attestation not sent + overdue -> red | FULL | FULL (section 5A) | -- |
| AC-M3-3.8 | Chronic DX + attestation not sent + not overdue -> orange | FULL | FULL (section 7/8) | -- |
| AC-M3-3.9 | No dueDate -> NOT overdue | FULL | FULL (section 5D) | -- |
| AC-M3-3.10 | Depression Called to schedule + 8 days -> red | FULL (boundary tests) | FULL (section 5A) | -- |
| AC-M3-3.11 | Depression Visit scheduled + 2 days -> red | FULL (boundary tests) | NONE | GAP-2.2 |

### REQ-M3-4: Cascading Dropdown Clearing

| AC | Description | Vitest | Cypress | Gap Status |
|----|------------|--------|---------|------------|
| AC-M3-4.1 | RT change clears downstream | N/A | FULL (cascading-dropdowns) | -- |
| AC-M3-4.2 | QM change clears downstream | N/A | FULL (cascading-dropdowns) | -- |
| AC-M3-4.3 | MS change clears downstream | N/A | FULL (cascading-dropdowns TC-6.10) | -- |
| AC-M3-4.4 | Notes preserved during cascade | N/A | FULL (cascading-dropdowns TC-6.10) | -- |
| AC-M3-4.5 | AWV auto-fills QM | FULL | FULL | -- |
| AC-M3-4.6 | Chronic DX auto-fills QM | FULL | FULL | -- |
| AC-M3-4.7 | Quality/Screening no auto-fill | FULL | FULL | -- |
| AC-M3-4.8 | Depression cascade identical to others | N/A | NONE | GAP-4.3 |
| AC-M3-4.9 | Color -> white after cascade | N/A | NONE | GAP-4.4 |

### REQ-M3-5: Due Date Calculation

| AC | Description | Jest | Cypress | Gap Status |
|----|------------|------|---------|------------|
| AC-M3-5.1 | baseDueDays + statusDate = dueDate | FULL (365, 7, 1) | PARTIAL (interval shown) | -- |
| AC-M3-5.2 | DueDayRule overrides baseDueDays | FULL (Colonoscopy=42) | N/A | -- |
| AC-M3-5.3 | HgbA1c + Tracking #2 = N months | FULL (1,3,6,12 months) | FULL (time-interval) | -- |
| AC-M3-5.4 | HgbA1c + no Tracking #2 = null | FULL | FULL (section 5D) | -- |
| AC-M3-5.5 | Screening discussed + In N Months | FULL (1,3,11 months) | FULL (time-interval) | -- |
| AC-M3-5.6 | AWV completed = 365 days | FULL | FULL (time-interval) | -- |
| AC-M3-5.7 | statusDate null = dueDate null | FULL | N/A | -- |
| AC-M3-5.8 | statusDate change -> recalculate | NONE | NONE | GAP-5.2 |
| AC-M3-5.9 | Depression Called to schedule = 7 days | FULL | NONE (overdue tested, not interval) | -- |
| AC-M3-5.10 | Depression Visit scheduled = 1 day | NONE (tested indirectly via AWV scheduled baseDueDays=1) | NONE | GAP-5.6 |
| AC-M3-5.11 | Depression terminal = null dueDate | FULL (Screening complete) | N/A | -- |

### REQ-M3-6: Time Interval

| AC | Description | Cypress | Gap Status |
|----|------------|---------|------------|
| AC-M3-6.1 | 6 dropdown statuses not editable | PARTIAL (3/6) | GAP-6.1 |
| AC-M3-6.2 | Other statuses editable | FULL | -- |
| AC-M3-6.3 | Valid integer recalculates dueDate | FULL | -- |
| AC-M3-6.4 | Invalid input rejected | PARTIAL (0, >1000, text, empty; not negatives) | GAP-6.4 |
| AC-M3-6.5 | Empty reverts to previous | FULL | -- |
| AC-M3-6.6 | Displayed value = dueDate - statusDate | FULL | -- |
| AC-M3-6.7 | Depression Called to schedule interval=7 | NONE | GAP-6.2 |
| AC-M3-6.8 | Depression Visit scheduled interval=1 | NONE | GAP-6.2 |

### REQ-M3-7: Tracking Fields

| AC | Description | Vitest | Cypress | Gap Status |
|----|------------|--------|---------|------------|
| AC-M3-7.1 | Predefined dropdown options | FULL | FULL (row-color-comprehensive section 2) | -- |
| AC-M3-7.2 | N/A display + non-editable | NONE | PARTIAL (cascading-dropdowns TC-11.2; no style check) | GAP-7.1 |
| AC-M3-7.3 | HgbA1c Tracking #1 free text prompt | N/A | FULL (cascading-dropdowns) | -- |
| AC-M3-7.4 | HgbA1c Tracking #2 dropdown 12 months | FULL | FULL (time-interval) | -- |
| AC-M3-7.5 | BP Tracking #1 dropdown 8 weeks | FULL | FULL (row-color-comprehensive) | -- |
| AC-M3-7.6 | Cervical Cancer Screening discussed 11 months | FULL | NONE (individual options not verified) | GAP-7.4 |
| AC-M3-7.7 | Chronic DX attestation options | FULL | FULL | -- |
| AC-M3-7.8 | Tracking #3 always editable | NONE | NONE | GAP-7.5 |
| AC-M3-7.9 | Depression Tracking #1 null | FULL | PARTIAL (1/7 statuses E2E) | GAP-7.6 |
| AC-M3-7.10 | Switching tracking types | NONE | NONE | GAP-7.7 |

### REQ-M3-10: Date Prompt Resolution

| AC | Description | Jest | Gap Status |
|----|------------|------|------------|
| AC-M3-10.1 | All ~45 statuses mapped | FULL (~40 tested) | -- |
| AC-M3-10.2 | Depression Called to schedule -> Date Called | NONE | GAP-10.1 |
| AC-M3-10.3 | Depression Visit scheduled -> Date Scheduled | NONE | GAP-10.1 |
| AC-M3-10.4 | Depression Screening complete -> Date Completed | NONE | GAP-10.1 |
| AC-M3-10.5 | Patient deceased -> Date of Death | FULL | -- |
| AC-M3-10.6 | Patient in hospice -> Date Reported | FULL | -- |
| AC-M3-10.7 | Case-sensitive | FULL | -- |

### REQ-M3-11: Multi-Role

| AC | Description | Cypress | Gap Status |
|----|------------|---------|------------|
| AC-M3-11.1 | Admin role | FULL (8 scenarios) | -- |
| AC-M3-11.2 | Physician role | FULL (8 scenarios) | -- |
| AC-M3-11.3 | Staff role | FULL (8 scenarios) | -- |
| AC-M3-11.4 | Depression Screening per role | NONE | GAP-11.1 |

### REQ-M3-12: Filter Bar

| AC | Description | Vitest | Cypress | Gap Status |
|----|------------|--------|---------|------------|
| AC-M3-12.1 | Depression rows in correct color bucket | FULL (StatusFilterBar unit) | NONE (E2E) | GAP-12.1 |
| AC-M3-12.2 | Blue filter shows Called to schedule | N/A | NONE | GAP-12.1 |
| AC-M3-12.3 | Yellow filter shows Visit scheduled | N/A | NONE | GAP-12.1 |
| AC-M3-12.4 | Green filter shows Screening complete | N/A | NONE | GAP-12.1 |
| AC-M3-12.5 | Red filter shows overdue Depression rows | N/A | NONE | GAP-12.1 |

---

## Proposed New Test Case Summary

### Resolved Gaps (No Action Needed)

The following gaps from the original analysis were found to be already covered by existing tests:

| Gap ID | Original Description | Resolution |
|--------|---------------------|------------|
| GAP-1.4 | Depression `Not Addressed` white | Covered by generic `Not Addressed` test in statusColors.test.ts |
| GAP-2.3 | Screening complete vs completed E2E | Both tested green independently in row-color-comprehensive.cy.ts (1D, 1E) |
| GAP-2.4 | Depression No longer applicable non-overdue | Generic `No longer applicable` test is sufficient |
| GAP-3.6 | dueDate === today boundary E2E | Vitest boundary tests sufficient; Cypress Today button tests indirect |
| GAP-4.1 | Measure Status cascade clear | Covered by cascading-dropdowns.cy.ts TC-6.10 |
| GAP-4.2 | Notes preservation during cascade | Covered by cascading-dropdowns.cy.ts TC-6.10 |
| GAP-5.3 | Depression baseDueDays in Jest | Covered by dueDateCalculator.test.ts (baseDueDays=7 and =null tests) |
| GAP-7.2 | HgbA1c free text prompt | Covered by cascading-dropdowns.cy.ts |
| GAP-8.3 | Rapid sequential status changes | Existing color transition test provides functional coverage |
| GAP-8.4 | Immediate color change without refresh | Existing tests implicitly verify this |
| GAP-9.2 | Screening count assertion | Already asserts 4 options in cascading-dropdowns.cy.ts |

### Open Gaps by Priority

| Priority | Gap IDs | Test Layer | Est. New Tests | Description |
|----------|---------|------------|---------------:|-------------|
| **HIGH** | GAP-10.1 | Jest (statusDatePromptResolver) | 3 | Depression Screening date prompts: `Called to schedule`->`Date Called`, `Visit scheduled`->`Date Scheduled`, `Screening complete`->`Date Completed` |
| **HIGH** | GAP-11.1 | Cypress (row-color-roles) | 3 (x3 roles = 9 effective) | Depression Screening Called to schedule + past date = overdue per role |
| **HIGH** | GAP-3.1, GAP-3.2, GAP-3.3 | Vitest (statusColors) | ~39 | Parameterized `getRowStatusColor()` overdue test: each of 14 GREEN + 19 BLUE + 6 YELLOW statuses with past dueDate = red |
| **HIGH** | GAP-3.4 | Vitest (statusColors) | 2 | `isRowOverdue()` returns false for `Patient declined screening` and `Declined BP control` |
| **HIGH** | GAP-5.5 | Jest (dueDateCalculator) | 1 | Chronic DX resolved + Attestation not sent = DueDayRule 14 days |
| **MEDIUM** | GAP-1.1, GAP-1.2, GAP-1.3, GAP-1.5 | Vitest (statusColors) | ~24 | Parameterized `getRowStatusColor()` for all missing statuses: 8 green + 14 blue + 2 yellow + 2 purple |
| **MEDIUM** | GAP-11.2 | Cypress (row-color-roles) | 3 (x3 roles = 9 effective) | Chronic DX attestation sent + past date = green per role |
| **MEDIUM** | GAP-6.1 | Cypress (time-interval) | 3 | Non-editable for: `HgbA1c at goal`, `HgbA1c NOT at goal`, `Scheduled call back - BP at goal` |
| **MEDIUM** | GAP-6.2 | Cypress (time-interval) | 2 | Depression `Called to schedule` interval=7 editable; `Visit scheduled` interval=1 editable |
| **MEDIUM** | GAP-9.1 | Vitest (dropdownConfig) | 1 | Color array / dropdown cross-reference integrity |
| **MEDIUM** | GAP-7.1 | Cypress (cascading-dropdowns) | 1 | N/A cell italic styling + non-editable on dblclick |
| **MEDIUM** | GAP-7.3 | Cypress (cascading-dropdowns) | 1 | BP Tracking #2 shows "BP reading" prompt |
| **MEDIUM** | GAP-7.5 | Cypress (row-color-comprehensive) | 3 | Tracking #3 editable for N/A status, dropdown status, free text status |
| **MEDIUM** | GAP-7.7 | Cypress (row-color-comprehensive) | 1 | Switching tracking types: dropdown -> N/A -> free text on same row |
| **MEDIUM** | GAP-8.1 | Cypress (row-color-comprehensive) | 1 | Duplicate + overdue: orange border AND red background coexist |
| **MEDIUM** | GAP-12.1 | Cypress (compact-filter-bar) | 1 | Depression Screening row visible under correct color filter |
| **MEDIUM** | GAP-5.1, GAP-5.2 | Cypress (row-color-comprehensive) | 2 | Due date exact value verification; status date change triggers recalculation |
| **MEDIUM** | GAP-2.2 | Cypress (row-color-comprehensive) | 1 | Depression Visit scheduled + past date = overdue E2E |
| **LOW** | GAP-4.3 | Cypress (cascading-dropdowns) | 1 | Depression Screening cascade clear when RT changes |
| **LOW** | GAP-4.4 | Cypress (cascading-dropdowns) | 1 | Row color -> white assertion after RT cascade clear |
| **LOW** | GAP-5.4 | Jest (dueDateCalculator) | 7 | All 8 BP week intervals parameterized (7 remaining) |
| **LOW** | GAP-5.6 | Jest (dueDateCalculator) | 1 | Depression `Visit scheduled` baseDueDays=1 |
| **LOW** | GAP-6.3 | Cypress (time-interval) | 1 | Override persistence after page reload |
| **LOW** | GAP-6.4 | Cypress (time-interval) | 1 | Negative number (-5) rejection |
| **LOW** | GAP-7.4 | Cypress (cascading-dropdowns) | 1 | Cervical Cancer Screening discussed: verify 11 month options |
| **LOW** | GAP-7.6 | Cypress (cascading-dropdowns) | 3 | Depression Screening Tracking #1 N/A for 3 more statuses |
| **LOW** | GAP-8.2 | Cypress (sorting-filtering) | 3 | Selection preserves color for blue, yellow, purple categories |
| **LOW** | GAP-12.2 | Cypress (compact-filter-bar) | 1 | Filter count updates after inline status change |
| **LOW** | GAP-2.5 | Jest (dueDateCalculator) | 1 | Depression `Screening complete` baseDueDays=null explicit test |
| **LOW** | GAP-3.5 | Cypress (row-color-comprehensive) | 2 | CDX attestation boundary: dueDate=today vs yesterday |
| **LOW** | GAP-3.7 | Vitest (statusColors) | 1 | `getRowStatusColor()`: CDX resolved + no attestation + past due = red |
| **LOW** | GAP-10.2 | Cypress (new) | 1 | Date prompt label visible in grid UI |

### Totals by Layer

| Layer | Target File | New Tests (static) | New Tests (effective) |
|-------|------------|-------------------:|---------------------:|
| Vitest | `statusColors.test.ts` | ~66 | ~66 |
| Vitest | `dropdownConfig.test.ts` | 1 | 1 |
| Jest | `dueDateCalculator.test.ts` | 10 | 10 |
| Jest | `statusDatePromptResolver.test.ts` | 3 | 3 |
| Cypress | `row-color-comprehensive.cy.ts` | 10 | 10 |
| Cypress | `row-color-roles.cy.ts` | 6 | 18 (x3 roles) |
| Cypress | `cascading-dropdowns.cy.ts` | 7 | 7 |
| Cypress | `time-interval.cy.ts` | 7 | 7 |
| Cypress | `compact-filter-bar.cy.ts` | 2 | 2 |
| Cypress | `sorting-filtering.cy.ts` | 3 | 3 |
| **GRAND TOTAL** | | **~115** | **~127** |

### Post-Implementation Expected Totals

| Category | Current | New (effective) | Expected Total |
|----------|--------:|----------------:|---------------:|
| Vitest (M3 scope) | 221 | 67 | 288 |
| Jest (M3 scope) | 89 | 13 | 102 |
| Cypress (M3 scope) | 317 | 47 | 364 |
| **Module 3 Total** | **627** | **127** | **754** |

---

## Edge Cases

- **EDGE-M3-1:** `Screening complete` (no "d") vs `Screening completed` (with "d") must coexist in GREEN_STATUSES. Both must render green independently. Tests must verify no collision.
- **EDGE-M3-2:** `Called to schedule` (Depression Screening, blue) vs `Patient called to schedule AWV` (AWV, yellow). Despite similar names, they map to different colors. Tests must verify each maps to the correct color.
- **EDGE-M3-3:** `Visit scheduled` (Depression Screening, yellow) vs `Vaccination scheduled` (Vaccination, blue) vs `AWV scheduled` (AWV, blue). Similar naming patterns, different colors. Tests must verify each.
- **EDGE-M3-4:** Overdue boundary at exactly `dueDate === today` (strict less-than means NOT overdue). Must be tested with fake timers at both Vitest and Cypress layers.
- **EDGE-M3-5:** Chronic DX with null Tracking #1 should behave the same as Tracking #1 = `Attestation not sent` (orange, can become red when overdue).
- **EDGE-M3-6:** HgbA1c with no Tracking #2 selected: no due date, no overdue, no time interval. Row stays blue (or green for `at goal`) indefinitely.
- **EDGE-M3-7:** Depression Screening `Screening complete` with `baseDueDays=null`: no due date is ever created, row can never become red. Verify this explicitly.
- **EDGE-M3-8:** Row with only Request Type set (no Quality Measure, no Measure Status): should be white with no due date.
- **EDGE-M3-9:** Filter chip counts may be stale after inline edits until next full data reload (documented limitation in ROW_COLOR_LOGIC.md section 9d). Tests should acknowledge this.
