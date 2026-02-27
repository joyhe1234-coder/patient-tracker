# Requirements Document: Module 3 — Quality Measures, Row Colors & Cascading Test Plan

## Introduction

This specification consolidates all testable behaviors from six existing feature specs — row-colors, cascading-dropdowns, due-date, time-interval, tracking-fields, and depression-screening — into a unified, comprehensive test plan for Module 3. The goal is to map every testable behavior to acceptance criteria, identify coverage gaps versus current automated tests, and propose new test cases to fill those gaps. This is a test-only module; no production code changes are required.

### Current Test Inventory (Module 3 scope)

| Layer | File | Test Count | Coverage Area |
|-------|------|-----------|---------------|
| Vitest | `statusColors.test.ts` | 54 | Status arrays, isChronicDxAttestationSent, isRowOverdue, getRowStatusColor |
| Vitest | `dropdownConfig.test.ts` | 52 | Cascading mappings, helper functions, Depression Screening config |
| Jest | `dueDateCalculator.test.ts` | 17 | Due date calculation, HgbA1c tracking2, DueDayRule, baseDueDays |
| Jest | `statusDatePromptResolver.test.ts` | 63 | Date prompt resolution for all statuses |
| Cypress | `row-color-comprehensive.cy.ts` | 179 | All 14 QMs x statuses, tracking types, date/overdue, time interval, transitions |
| Cypress | `row-color-roles.cy.ts` | 43 | 8 core scenarios x 3 roles (Admin, Physician, Staff) |
| Cypress | `cascading-dropdowns.cy.ts` | 55 | Dropdown cascading, auto-fill, field clearing, status options |
| Cypress | `sorting-filtering.cy.ts` | 63 | Row color verification subset, overdue filter |
| Cypress | `time-interval.cy.ts` | 16 | Editability, override, validation, dropdown-controlled intervals |
| **TOTAL** | | **~542** | |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-1.1 | Not all 14 GREEN_STATUSES individually verified in Vitest | Vitest checks 6 of 14 green statuses | Add individual `getRowStatusColor()` assertions for all 14 |
| GAP-1.2 | Not all 19 BLUE_STATUSES individually verified in Vitest | Vitest checks 4 of 19 blue statuses via `getRowStatusColor()` | Add individual assertions for remaining 15 |
| GAP-1.3 | Not all 6 YELLOW_STATUSES individually verified in Vitest | Vitest checks 3 of 6 yellow statuses via `getRowStatusColor()` | Add assertions for remaining 3 |
| GAP-1.4 | Depression Screening `Not Addressed` not explicitly tested for white | Implicit via null test | Add explicit `'Not Addressed'` test with Depression Screening context |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-2.1 | Depression Screening not in multi-role E2E (row-color-roles.cy.ts) | row-color-roles.cy.ts runs 8 scenarios x 3 roles, none for Depression Screening | Add Depression Screening scenario to multi-role suite (e.g., Called to schedule + overdue per role) |
| GAP-2.2 | Depression Screening overdue boundary (7-day timer for Called to schedule, 1-day for Visit scheduled) not tested E2E | Vitest has boundary tests but no Cypress E2E | Add Cypress test: set status date 8 days ago for Called to schedule, verify red |
| GAP-2.3 | `Screening complete` vs `Screening completed` coexistence not tested E2E | Vitest test exists; no Cypress test | Add Cypress test verifying both render green independently |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-3.1 | Overdue for ALL green statuses not individually tested | Vitest tests AWV completed overdue; not other green statuses | Add parameterized Vitest test: each green status + past dueDate = red |
| GAP-3.2 | Overdue for ALL blue statuses not individually tested | Vitest tests AWV scheduled overdue; not others | Add parameterized Vitest test: each blue status + past dueDate = red |
| GAP-3.3 | Overdue for ALL yellow statuses not individually tested | Not tested | Add parameterized Vitest test: each yellow status + past dueDate = red |
| GAP-3.4 | Terminal status non-overdue not tested for ALL 5 purple statuses | Vitest tests 3 of 5 purple statuses | Add remaining 2 (`Patient declined screening`, `Declined BP control`) |
| GAP-3.5 | Chronic DX attestation cascade not tested end-to-end with date entry | row-color-comprehensive.cy.ts has this; but no boundary date test | Add boundary test: attestation-not-sent with dueDate = today (not overdue) vs yesterday (overdue) |
| GAP-3.6 | `dueDate === today` boundary not tested in Cypress E2E | Only Vitest boundary tests exist | Add Cypress test: set status date so dueDate = today, verify NOT red |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-4.1 | Measure Status cascade clear (clearing Status Date, Tracking, Due Date, Time Interval) not automated | cascading-dropdowns.cy.ts tests RT and QM clears but not MS clear | Add Cypress test: set full row, change Measure Status, verify downstream fields cleared |
| GAP-4.2 | Notes preservation during cascade not tested | Not automated at any layer | Add Cypress test: set Notes, trigger RT cascade, verify Notes preserved |
| GAP-4.3 | Depression Screening cascade clear not tested | No Depression Screening in cascading-dropdowns.cy.ts | Add test: set Depression Screening row, change QM away, verify all fields cleared |
| GAP-4.4 | Row color change to white after cascade not tested | Implicit in some tests, not explicit | Add explicit assertion: after cascade clear, verify `row-status-white` |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-5.1 | Due date appearing in grid after status change not tested E2E | dueDateCalculator.test.ts covers logic; no Cypress verifies grid cell | Add Cypress test: set AWV completed + date, verify dueDate cell shows date 365 days later |
| GAP-5.2 | Status date change triggering recalculation not tested E2E | Not automated | Add Cypress test: change status date, verify dueDate cell updates |
| GAP-5.3 | Depression Screening baseDueDays not tested in Jest | dueDateCalculator.test.ts has no Depression Screening-specific tests | Add Jest test: `Called to schedule` with baseDueDays=7, `Visit scheduled` with baseDueDays=1 |
| GAP-5.4 | BP call-back DueDayRule (Call every N wks) partially tested | dueDateCalculator.test.ts tests one BP case; not all 8 intervals | Add parameterized Jest test for all 8 BP week intervals |
| GAP-5.5 | Chronic DX attestation DueDayRule (14 days) not tested | Not in dueDateCalculator.test.ts | Add Jest test: `Chronic diagnosis resolved` + `Attestation not sent` = 14 days |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-6.1 | Non-editability for all 6 dropdown statuses not fully tested | time-interval.cy.ts tests 3 of 6 | Add Cypress tests for remaining 3: `HgbA1c at goal`, `HgbA1c NOT at goal`, `Scheduled call back - BP at goal` |
| GAP-6.2 | Depression Screening time interval editability not tested | Not covered | Add Cypress test: `Called to schedule` + date, verify interval=7, verify editable |
| GAP-6.3 | Time interval override persistence after page reload not tested | Not covered at any layer | Add Cypress test: override interval, reload page, verify persisted value |
| GAP-6.4 | Negative number input validation not tested | time-interval.cy.ts tests 0 and >1000, but not negatives | Add Cypress test: enter -5, verify rejection |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-7.1 | N/A display and non-editability not tested | Not automated at any layer | Add Cypress test: set a status with no tracking options, verify N/A display and click does not open editor |
| GAP-7.2 | HgbA1c free text prompt (Tracking #1) not verified | row-color-comprehensive.cy.ts enters HgbA1c text but does not verify prompt label | Add Cypress test: verify placeholder/prompt text on Tracking #1 for HgbA1c status |
| GAP-7.3 | BP reading free text prompt (Tracking #2) not verified | row-color-comprehensive.cy.ts enters BP text but does not verify prompt | Add Cypress test: verify placeholder/prompt text on Tracking #2 for BP status |
| GAP-7.4 | Cervical Cancer month options (In 1-11 Months) not tested E2E | dropdownConfig.test.ts has Vitest coverage; no Cypress test for actual dropdown | Add Cypress test: set Cervical Cancer Screening discussed, verify 11 month options in Tracking #1 dropdown |
| GAP-7.5 | Tracking #3 always-editable not tested | Not automated | Add Cypress test: verify Tracking #3 is editable for N/A status, dropdown status, and free text status |
| GAP-7.6 | Depression Screening tracking field no-options verified only in Vitest | dropdownConfig.test.ts covers this; no Cypress test | Add Cypress test: set Depression Screening status, verify Tracking #1 shows N/A or is empty |
| GAP-7.7 | Switching between tracking types (dropdown -> N/A -> free text) not tested | Not automated | Add Cypress test: change measure status from one with dropdown to one with N/A to one with free text, verify type changes |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-8.1 | Color priority (duplicate + overdue simultaneously) not tested | Not automated | Add Cypress test: create duplicate rows, set past due date, verify orange border + red background |
| GAP-8.2 | Selection preserves color tested only for one status | sorting-filtering.cy.ts tests one case | Add Cypress test: select rows in each color category, verify outline + background preserved |
| GAP-8.3 | Rapid sequential status changes not tested | Not automated | Add Cypress test: change status 3 times rapidly, verify final color is correct |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-9.1 | Color array / dropdown cross-reference integrity not tested | dropdownConfig.test.ts has chain integrity test but does not cross-reference color arrays | Add Vitest test: every status in every color array must appear in at least one quality measure's status list |
| GAP-9.2 | ~~Screening count assertion~~ | **RESOLVED** — `cascading-dropdowns.cy.ts` already asserts 4 screening options (line 71) | No action needed |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-10.1 | Depression Screening date prompts not tested in Jest | statusDatePromptResolver.test.ts does not have Depression Screening section | Add Jest describe block: `Called to schedule`->`Date Called`, `Visit scheduled`->`Date Scheduled`, `Screening complete`->`Date Completed` |
| GAP-10.2 | Date prompt shown in grid UI not tested E2E | No Cypress/Playwright test verifies the prompt label in the date cell editor | Add Cypress test: set a Measure Status, click status date cell, verify prompt label text |

---

### REQ-M3-11: Multi-Role Verification

**User Story:** As a QA engineer, I want the core quality measure and color behaviors verified for all three user roles (Admin, Physician, Staff), so that role-based access control does not interfere with color rendering, cascading, or due date logic.

#### Acceptance Criteria

1. **AC-M3-11.1:** WHEN an Admin user sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
2. **AC-M3-11.2:** WHEN a Physician user sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
3. **AC-M3-11.3:** WHEN a Staff user (with assigned physician) sets a Measure Status and status date, THEN the row color and overdue logic SHALL behave identically to the business rules.
4. **AC-M3-11.4:** The multi-role E2E suite SHALL cover at minimum: one baseDueDays overdue scenario, one DueDayRule overdue scenario, one tracking-controlled overdue scenario, and one Depression Screening scenario per role.

#### Coverage Gap Analysis (REQ-M3-11)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-11.1 | Multi-role suite only has 8 scenarios per role; no Depression Screening | row-color-roles.cy.ts: 8 scenarios x 3 roles = 24 tests | Add 9th scenario per role: Depression Screening Called to schedule + overdue |
| GAP-11.2 | Multi-role suite does not test Chronic DX attestation cascade | Not in current 8 scenarios | Add 10th scenario per role: Chronic DX resolved + Attestation sent = green (not overdue) |

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

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-12.1 | Depression Screening filter counting not tested | compact-filter-bar.cy.ts does not include Depression Screening scenarios | Add Cypress test: verify Depression Screening rows appear under correct color filter |
| GAP-12.2 | Filter counting after status change not tested (stale count risk) | Known edge case in ROW_COLOR_LOGIC.md section 9d | Add Cypress test: change a Depression Screening status, verify filter count updates |

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
- **ASM-M3-5:** The current test counts are: ~179 in row-color-comprehensive.cy.ts, ~43 in row-color-roles.cy.ts, ~55 in cascading-dropdowns.cy.ts, ~16 in time-interval.cy.ts, ~54 in statusColors.test.ts, ~52 in dropdownConfig.test.ts, ~17 in dueDateCalculator.test.ts, ~63 in statusDatePromptResolver.test.ts.
- **ASM-M3-6:** Depression Screening tracking fields show N/A for Tracking #1 (no dropdown options per ASM-1 in the depression-screening spec). This differs from most screening measures that have dropdown options for certain statuses.

---

## Proposed New Test Case Summary

### By Gap Priority

| Priority | Gap IDs | Test Layer | Estimated New Tests | Description |
|----------|---------|------------|--------------------:|-------------|
| HIGH | GAP-2.1, GAP-11.1, GAP-11.2 | Cypress (row-color-roles) | 6 | Depression Screening + Chronic DX attestation in multi-role suite |
| HIGH | GAP-3.1, GAP-3.2, GAP-3.3, GAP-3.4 | Vitest (statusColors) | ~40 | Parameterized overdue tests for ALL statuses in each color category |
| HIGH | GAP-4.1, GAP-4.2, GAP-4.3, GAP-4.4 | Cypress (cascading-dropdowns) | 4 | Measure Status cascade clear + Notes preservation + Depression Screening cascade |
| HIGH | GAP-5.3, GAP-5.5 | Jest (dueDateCalculator) | 4 | Depression Screening baseDueDays + Chronic DX attestation DueDayRule |
| HIGH | GAP-10.1 | Jest (statusDatePromptResolver) | 3 | Depression Screening date prompts |
| MEDIUM | GAP-1.1, GAP-1.2, GAP-1.3 | Vitest (statusColors) | ~25 | Individual getRowStatusColor for ALL statuses in each color array |
| MEDIUM | GAP-5.1, GAP-5.2 | Cypress (row-color-comprehensive) | 2 | Due date grid cell verification + recalculation on date change |
| MEDIUM | GAP-6.1, GAP-6.2 | Cypress (time-interval) | 4 | Remaining non-editable statuses + Depression Screening editability |
| MEDIUM | GAP-7.1, GAP-7.2, GAP-7.3, GAP-7.5, GAP-7.6, GAP-7.7 | Cypress (row-color-comprehensive or new) | 7 | N/A display, prompts, Tracking #3, Depression Screening tracking, type switching |
| MEDIUM | GAP-8.1, GAP-8.2 | Cypress (row-color-comprehensive) | 2 | Duplicate + overdue combo, selection preserves color for multiple categories |
| MEDIUM | GAP-9.1 | Vitest (dropdownConfig) | 1 | Color array / dropdown cross-reference integrity |
| MEDIUM | GAP-12.1, GAP-12.2 | Cypress (compact-filter-bar or sorting-filtering) | 2 | Depression Screening filter counting |
| LOW | GAP-2.2, GAP-2.3, GAP-3.5, GAP-3.6 | Cypress (row-color-comprehensive) | 4 | Depression Screening overdue boundary, Screening complete vs completed E2E, Chronic DX boundary |
| LOW | GAP-5.4 | Jest (dueDateCalculator) | 7 | All 8 BP week intervals parameterized |
| LOW | GAP-6.3, GAP-6.4 | Cypress (time-interval) | 2 | Override persistence, negative number validation |
| LOW | GAP-7.4 | Cypress (new or existing) | 1 | Cervical Cancer month dropdown verification |
| LOW | GAP-8.3 | Cypress (row-color-comprehensive) | 1 | Rapid sequential status changes |
| LOW | GAP-9.2 | Cypress (cascading-dropdowns) | 1 | Screening count 4 assertion update |
| LOW | GAP-10.2 | Cypress (new) | 1 | Date prompt label in grid UI |

### Totals

| Layer | Estimated New Tests |
|-------|--------------------:|
| Vitest (statusColors.test.ts) | ~65 |
| Vitest (dropdownConfig.test.ts) | ~1 |
| Jest (dueDateCalculator.test.ts) | ~14 |
| Jest (statusDatePromptResolver.test.ts) | ~3 |
| Cypress (row-color-comprehensive.cy.ts) | ~10 |
| Cypress (row-color-roles.cy.ts) | ~6 |
| Cypress (cascading-dropdowns.cy.ts) | ~5 |
| Cypress (time-interval.cy.ts) | ~6 |
| Cypress (compact-filter-bar / sorting-filtering) | ~2 |
| Cypress (new tracking-fields E2E) | ~8 |
| **GRAND TOTAL** | **~120** |

Post-implementation expected totals: ~542 existing + ~120 new = ~662 tests in Module 3 scope.

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
