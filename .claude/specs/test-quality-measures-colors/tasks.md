# Task Breakdown: Module 3 — Quality Measures, Row Colors & Cascading Test Plan

**Spec**: `.claude/specs/test-quality-measures-colors/requirements.md`
**Total New Tests**: ~115 static / ~127 effective (across 10 target files)
**Current Test Count (M3 scope)**: 627 effective tests across 11 files
**Target Test Count**: ~754 effective tests

---

## Task Summary

| Task | Title | Priority | Framework | Tests | Effort | Target File |
|------|-------|----------|-----------|------:|--------|-------------|
| T1-1 | Depression Screening date prompts (Jest) | HIGH | Jest | 3 | S | statusDatePromptResolver.test.ts |
| T1-2 | Chronic DX attestation DueDayRule (Jest) | HIGH | Jest | 1 | S | dueDateCalculator.test.ts |
| T2-1 | Parameterized overdue for all color categories (Vitest) | HIGH | Vitest | ~39 | M | statusColors.test.ts |
| T2-2 | Terminal status non-overdue completeness (Vitest) | HIGH | Vitest | 2 | S | statusColors.test.ts |
| T3-1 | Depression Screening multi-role E2E (Cypress) | HIGH | Cypress | 3 (x3=9) | M | row-color-roles.cy.ts |
| T4-1 | Missing status-to-color unit assertions (Vitest) | MEDIUM | Vitest | ~24 | M | statusColors.test.ts |
| T4-2 | Orange overdue via getRowStatusColor (Vitest) | LOW | Vitest | 1 | S | statusColors.test.ts |
| T5-1 | Color array / dropdown cross-reference integrity (Vitest) | MEDIUM | Vitest | 1 | S | dropdownConfig.test.ts |
| T6-1 | Chronic DX attestation multi-role E2E (Cypress) | MEDIUM | Cypress | 3 (x3=9) | M | row-color-roles.cy.ts |
| T7-1 | Time interval non-editable completeness (Cypress) | MEDIUM | Cypress | 3 | S | time-interval.cy.ts |
| T7-2 | Depression Screening time interval (Cypress) | MEDIUM | Cypress | 2 | S | time-interval.cy.ts |
| T7-3 | Time interval edge cases (Cypress) | LOW | Cypress | 2 | S | time-interval.cy.ts |
| T8-1 | Tracking field N/A styling + non-editability (Cypress) | MEDIUM | Cypress | 1 | S | cascading-dropdowns.cy.ts |
| T8-2 | BP Tracking #2 prompt + Cervical Cancer month options (Cypress) | MEDIUM/LOW | Cypress | 2 | S | cascading-dropdowns.cy.ts |
| T8-3 | Depression Screening cascade clear + color-to-white (Cypress) | LOW | Cypress | 2 | S | cascading-dropdowns.cy.ts |
| T8-4 | Depression Screening Tracking #1 N/A for additional statuses (Cypress) | LOW | Cypress | 3 | S | cascading-dropdowns.cy.ts |
| T9-1 | Tracking #3 always-editable + type switching (Cypress) | MEDIUM | Cypress | 4 | M | row-color-comprehensive.cy.ts |
| T9-2 | Duplicate + overdue coexistence (Cypress) | MEDIUM | Cypress | 1 | S | row-color-comprehensive.cy.ts |
| T9-3 | Due date exact value + recalculation (Cypress) | MEDIUM | Cypress | 2 | M | row-color-comprehensive.cy.ts |
| T9-4 | Depression Visit scheduled overdue E2E (Cypress) | MEDIUM | Cypress | 1 | S | row-color-comprehensive.cy.ts |
| T9-5 | CDX attestation boundary (Cypress) | LOW | Cypress | 2 | S | row-color-comprehensive.cy.ts |
| T10-1 | Depression Screening filter bar (Cypress) | MEDIUM | Cypress | 1 | S | compact-filter-bar.cy.ts |
| T10-2 | Filter count after inline edit (Cypress) | LOW | Cypress | 1 | S | compact-filter-bar.cy.ts |
| T10-3 | Selection preserves color for multiple categories (Cypress) | LOW | Cypress | 3 | S | sorting-filtering.cy.ts |
| T11-1 | BP week intervals completeness (Jest) | LOW | Jest | 7 | S | dueDateCalculator.test.ts |
| T11-2 | Depression Visit scheduled baseDueDays=1 + Screening complete baseDueDays=null (Jest) | LOW | Jest | 2 | S | dueDateCalculator.test.ts |
| T11-3 | Date prompt label in grid UI (Cypress) | LOW | Cypress | 1 | S | row-color-comprehensive.cy.ts |
| T12-1 | Regression verification | -- | All | 0 | M | (all files) |

---

## HIGH Priority Tasks

### Task T1-1: Depression Screening Date Prompts (Jest)

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/__tests__/statusDatePromptResolver.test.ts`
- **Tests to Write**: 3
- **Gap IDs**: GAP-10.1
- **Requirements**: REQ-M3-10 (AC-M3-10.2, AC-M3-10.3, AC-M3-10.4)
- **Description**: Add a `describe('Depression Screening statuses')` block to the existing `statusDatePromptResolver.test.ts`. The source code (`statusDatePromptResolver.ts` lines 74-76) maps these prompts but the tests skip all 3 Depression Screening statuses. Each test calls `getDefaultDatePrompt()` with the Depression status and asserts the correct prompt label.
- **Tests**:
  1. `getDefaultDatePrompt('Called to schedule')` returns `'Date Called'`
  2. `getDefaultDatePrompt('Visit scheduled')` returns `'Date Scheduled'`
  3. `getDefaultDatePrompt('Screening complete')` returns `'Date Completed'`
- **Acceptance Criteria**:
  - [ ] 3 new tests written inside `statusDatePromptResolver.test.ts`
  - [ ] All 3 pass (`cd backend && npm test -- statusDatePromptResolver`)
  - [ ] No regressions in existing 63 tests in the same file
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T1-2: Chronic DX Attestation DueDayRule (Jest)

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/__tests__/dueDateCalculator.test.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-5.5
- **Requirements**: REQ-M3-5 (AC-M3-5.2)
- **Description**: Add a test verifying that `Chronic diagnosis resolved` with `tracking1='Attestation not sent'` triggers the DueDayRule lookup returning 14 days. This is a missing path in the due date calculator -- all other DueDayRule paths (Colonoscopy=42, BP weeks) are tested but the Chronic DX attestation one is not.
- **Tests**:
  1. `calculateDueDate({ measureStatus: 'Chronic diagnosis resolved', tracking1: 'Attestation not sent', statusDate: '2026-02-01' })` returns `'2026-02-15'` (14 days later)
- **Acceptance Criteria**:
  - [ ] 1 new test written inside `dueDateCalculator.test.ts`
  - [ ] Test passes (`cd backend && npm test -- dueDateCalculator`)
  - [ ] No regressions in existing 26 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T2-1: Parameterized Overdue Tests for All Color Categories (Vitest)

- **Priority**: HIGH
- **Framework**: Vitest
- **Target File**: `frontend/src/components/statusColors.test.ts`
- **Tests to Write**: ~39 (14 green + 19 blue + 6 yellow)
- **Gap IDs**: GAP-3.1, GAP-3.2, GAP-3.3
- **Requirements**: REQ-M3-3 (AC-M3-3.1, AC-M3-3.5)
- **Description**: Add three parameterized `describe.each` / `it.each` blocks to `statusColors.test.ts` that test `getRowStatusColor()` returns `'red'` for every GREEN, BLUE, and YELLOW status when `dueDate < today`. Currently only `AWV completed` (green) and `AWV scheduled` (blue) are individually tested for overdue. This closes the largest gap in the module.
- **Tests**:
  1. **Green overdue block (14 tests)**: For each of the 14 `GREEN_STATUSES`, call `getRowStatusColor({ ...baseRow, measureStatus: status, dueDate: PAST_DATE })` and assert `'red'`.
  2. **Blue overdue block (19 tests)**: For each of the 19 `BLUE_STATUSES`, same pattern.
  3. **Yellow overdue block (6 tests)**: For each of the 6 `YELLOW_STATUSES`, same pattern.
- **Pattern**: Use `it.each(GREEN_STATUSES)('overdue %s returns red', (status) => { ... })` matching existing parameterized style in the file.
- **Acceptance Criteria**:
  - [ ] ~39 new parameterized tests in `statusColors.test.ts`
  - [ ] All pass (`cd frontend && npm run test:run -- statusColors`)
  - [ ] No regressions in existing 54 tests
  - [ ] Uses `vi.useFakeTimers()` / `vi.setSystemTime()` per NFR-M3-6
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T2-2: Terminal Status Non-Overdue Completeness (Vitest)

- **Priority**: HIGH
- **Framework**: Vitest
- **Target File**: `frontend/src/components/statusColors.test.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-3.4
- **Requirements**: REQ-M3-3 (AC-M3-3.2)
- **Description**: Add `isRowOverdue()` assertions for the 2 missing purple statuses. Currently 3 of 5 purple statuses are tested (`Patient declined AWV`, `Patient declined`, `Contraindicated`). This task adds the missing `Patient declined screening` and `Declined BP control`.
- **Tests**:
  1. `isRowOverdue({ measureStatus: 'Patient declined screening', dueDate: PAST_DATE })` returns `false`
  2. `isRowOverdue({ measureStatus: 'Declined BP control', dueDate: PAST_DATE })` returns `false`
- **Acceptance Criteria**:
  - [ ] 2 new tests in the existing terminal-status section of `statusColors.test.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 54 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T3-1: Depression Screening Multi-Role E2E (Cypress)

- **Priority**: HIGH
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-roles.cy.ts`
- **Tests to Write**: 3 (x3 roles = 9 effective tests)
- **Gap IDs**: GAP-2.1, GAP-11.1
- **Requirements**: REQ-M3-2 (AC-M3-2.1, AC-M3-2.8), REQ-M3-11 (AC-M3-11.4)
- **Description**: Add a 9th scenario to the `ROLES.forEach()` loop in `row-color-roles.cy.ts`. The scenario should set up a Depression Screening row with `Called to schedule` + a past status date (8+ days ago) and verify the row turns red (overdue). This provides per-role coverage for Depression Screening -- the only quality measure currently missing from the multi-role suite.
- **Tests** (each runs 3x for Admin, Physician, Staff):
  1. Set up Depression Screening `Called to schedule` with status date 8 days ago
  2. Verify row shows `row-status-overdue` (red)
  3. Verify the overdue behavior is identical across all 3 roles
- **Pattern**: Follow the existing scenario pattern in `row-color-roles.cy.ts` (add a new `it()` inside the `ROLES.forEach()` block).
- **Acceptance Criteria**:
  - [ ] 1 new `it()` block added per role iteration (3 total per the forEach loop)
  - [ ] All 9 effective tests pass (`cd frontend && npm run cypress:run -- --spec cypress/e2e/row-color-roles.cy.ts --headed`)
  - [ ] No regressions in existing 24 effective tests
  - [ ] Uses unique patient name with `runId` prefix per NFR-M3-5
- **Dependencies**: None
- **Estimated Effort**: M

---

## MEDIUM Priority Tasks

### Task T4-1: Missing Status-to-Color Unit Assertions (Vitest)

- **Priority**: MEDIUM
- **Framework**: Vitest
- **Target File**: `frontend/src/components/statusColors.test.ts`
- **Tests to Write**: ~24 (8 green + 14 blue + 2 yellow + 2 purple, but many overlap with T2-1's overdue tests; these test non-overdue color)
- **Gap IDs**: GAP-1.1, GAP-1.2, GAP-1.3, GAP-1.5
- **Requirements**: REQ-M3-1 (AC-M3-1.1 through AC-M3-1.4)
- **Description**: Add parameterized `getRowStatusColor()` assertions verifying the correct non-overdue color for statuses not currently individually tested. T2-1 tests overdue (past dueDate); this task tests normal color mapping (no dueDate or future dueDate). The gaps are:
  - **8 green statuses**: `Diabetic eye exam completed`, `Colon cancer screening completed`, `Screening test completed`, `GC/Clamydia screening completed`, `Urine microalbumin completed`, `Blood pressure at goal`, `Vaccination completed`, `Chronic diagnosis confirmed`
  - **14 blue statuses**: `Diabetic eye exam scheduled`, `Diabetic eye exam referral made`, `Colon cancer screening ordered`, `Screening test ordered`, `Screening appt made`, `Test ordered`, `Urine microalbumin ordered`, `Appointment scheduled`, `ACE/ARB prescribed`, `Vaccination scheduled`, `Lab ordered`, `Scheduled call back - BP not at goal`, `Scheduled call back - BP at goal`, `Will call later to schedule`
  - **2 yellow statuses**: `Diabetic eye exam discussed`, `Vaccination discussed`
  - **2 purple statuses**: `Patient declined screening`, `Declined BP control`
- **Tests**: Parameterized `it.each` for each color category mapping status to expected color.
- **Acceptance Criteria**:
  - [ ] ~24 new parameterized tests in `statusColors.test.ts`
  - [ ] All pass
  - [ ] No regressions in existing tests
- **Dependencies**: None (can be done in parallel with T2-1, but both touch same file -- coordinate placement)
- **Estimated Effort**: M

---

### Task T4-2: Orange Overdue via getRowStatusColor (Vitest)

- **Priority**: LOW
- **Framework**: Vitest
- **Target File**: `frontend/src/components/statusColors.test.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-3.7
- **Requirements**: REQ-M3-3 (AC-M3-3.7)
- **Description**: Add a `getRowStatusColor()` assertion for `Chronic diagnosis resolved` with `tracking1 !== 'Attestation sent'` and `dueDate < today` returning `'red'`. Currently this path is only tested via `isRowOverdue()`, not through the top-level color function.
- **Tests**:
  1. `getRowStatusColor({ measureStatus: 'Chronic diagnosis resolved', tracking1: 'Attestation not sent', dueDate: PAST_DATE })` returns `'red'`
- **Acceptance Criteria**:
  - [ ] 1 new test in `statusColors.test.ts`
  - [ ] Passes
  - [ ] No regressions
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T5-1: Color Array / Dropdown Cross-Reference Integrity (Vitest)

- **Priority**: MEDIUM
- **Framework**: Vitest
- **Target File**: `frontend/src/components/dropdownConfig.test.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-9.1
- **Requirements**: REQ-M3-9 (AC-M3-9.8)
- **Description**: Add a test that verifies every status string in the color arrays (`GREEN_STATUSES`, `BLUE_STATUSES`, `YELLOW_STATUSES`, `PURPLE_STATUSES`, `GRAY_STATUSES`, `ORANGE_STATUSES`) exists in at least one quality measure's status list (in `QUALITY_MEASURE_TO_STATUS`). This cross-reference integrity test ensures no color array contains a "phantom" status that is not reachable through any dropdown cascade chain.
- **Tests**:
  1. For each status in each color array, assert it exists in at least one value array of `QUALITY_MEASURE_TO_STATUS`
- **Acceptance Criteria**:
  - [ ] 1 new test in `dropdownConfig.test.ts` (may contain multiple sub-assertions)
  - [ ] Passes
  - [ ] No regressions in existing 52 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T6-1: Chronic DX Attestation Multi-Role E2E (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-roles.cy.ts`
- **Tests to Write**: 3 (x3 roles = 9 effective tests)
- **Gap IDs**: GAP-11.2
- **Requirements**: REQ-M3-11 (AC-M3-11.4)
- **Description**: Add a 10th scenario to the `ROLES.forEach()` loop in `row-color-roles.cy.ts`. The scenario should set up a Chronic DX row with `Chronic diagnosis resolved` + `Tracking #1 = 'Attestation sent'` + a past status date, and verify the row stays green (never overdue due to attestation cascade). This tests the attestation special case across all 3 roles.
- **Tests** (each runs 3x for Admin, Physician, Staff):
  1. Set up Chronic DX `Chronic diagnosis resolved` + `Attestation sent` + past status date
  2. Verify row shows `row-status-green` (NOT red despite past due date)
  3. Verify the attestation-green behavior is identical across all 3 roles
- **Acceptance Criteria**:
  - [ ] 1 new `it()` block added per role iteration
  - [ ] All 9 effective tests pass
  - [ ] No regressions in existing 24 effective tests
  - [ ] Uses unique patient name per NFR-M3-5
- **Dependencies**: None (can be done alongside T3-1 since both add scenarios to the same file)
- **Estimated Effort**: M

---

### Task T7-1: Time Interval Non-Editable Completeness (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/time-interval.cy.ts`
- **Tests to Write**: 3
- **Gap IDs**: GAP-6.1
- **Requirements**: REQ-M3-6 (AC-M3-6.1)
- **Description**: Add 3 tests for the remaining non-editable time interval dropdown statuses: `HgbA1c at goal`, `HgbA1c NOT at goal`, and `Scheduled call back - BP at goal`. Currently only 3 of 6 dropdown statuses are tested for non-editability. Each test sets the status with a date, then double-clicks the time interval cell and verifies no edit wrapper appears.
- **Tests**:
  1. `HgbA1c at goal` + status date + tracking2 → time interval NOT editable
  2. `HgbA1c NOT at goal` + status date + tracking2 → time interval NOT editable
  3. `Scheduled call back - BP at goal` + status date + tracking1 → time interval NOT editable
- **Acceptance Criteria**:
  - [ ] 3 new tests in `time-interval.cy.ts`
  - [ ] All pass (`cd frontend && npm run cypress:run -- --spec cypress/e2e/time-interval.cy.ts --headed`)
  - [ ] No regressions in existing 15 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T7-2: Depression Screening Time Interval (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/time-interval.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-6.2
- **Requirements**: REQ-M3-6 (AC-M3-6.7, AC-M3-6.8)
- **Description**: Add 2 tests verifying Depression Screening time interval behavior. `Called to schedule` should display interval=7 (baseDueDays) and be editable. `Visit scheduled` should display interval=1 and be editable. Each test sets the Depression Screening status + today's date, then verifies the interval value and confirms the edit wrapper appears on double-click.
- **Tests**:
  1. Depression Screening `Called to schedule` + today's date → interval cell shows `7`, is editable
  2. Depression Screening `Visit scheduled` + today's date → interval cell shows `1`, is editable
- **Acceptance Criteria**:
  - [ ] 2 new tests in `time-interval.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 15 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T7-3: Time Interval Edge Cases (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/time-interval.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-6.3, GAP-6.4
- **Requirements**: REQ-M3-6 (AC-M3-6.4, AC-M3-6.3)
- **Description**: Add 2 edge case tests for time interval validation: (1) negative number rejection and (2) override persistence after page reload.
- **Tests**:
  1. Enter `-5` in time interval → system rejects, reverts to previous value
  2. Override interval to `45`, call `cy.reload()`, verify cell still shows `45`
- **Acceptance Criteria**:
  - [ ] 2 new tests in `time-interval.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 15 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T8-1: Tracking N/A Styling and Non-Editability (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/cascading-dropdowns.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-7.1
- **Requirements**: REQ-M3-7 (AC-M3-7.2)
- **Description**: Add a test verifying that when a status has no tracking options (e.g., `AWV completed`), the Tracking #1 cell displays with N/A italic styling and does NOT enter edit mode on double-click. Currently the test only checks for the absence of "Select" prompt but does not verify the visual N/A indicator or dblclick non-editability.
- **Tests**:
  1. Set `AWV completed`, double-click Tracking #1 cell, verify: (a) cell shows "N/A" text or italic class, (b) no edit wrapper/input appears
- **Acceptance Criteria**:
  - [ ] 1 new test in `cascading-dropdowns.cy.ts`
  - [ ] Passes
  - [ ] No regressions in existing 53 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T8-2: BP Tracking #2 Prompt and Cervical Cancer Month Options (Cypress)

- **Priority**: MEDIUM (GAP-7.3) / LOW (GAP-7.4)
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/cascading-dropdowns.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-7.3, GAP-7.4
- **Requirements**: REQ-M3-7 (AC-M3-7.5, AC-M3-7.6)
- **Description**: Add 2 tests: (1) Verify `Scheduled call back - BP not at goal` shows "BP reading" prompt in Tracking #2; (2) Verify `Screening discussed` (Cervical Cancer) shows all 11 month options ("In 1 Month" through "In 11 Months") in Tracking #1 dropdown.
- **Tests**:
  1. Set BP not at goal, verify Tracking #2 shows "BP reading" prompt text
  2. Set Cervical Cancer > Screening discussed, open Tracking #1 dropdown, verify exactly 11 options
- **Acceptance Criteria**:
  - [ ] 2 new tests in `cascading-dropdowns.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 53 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T8-3: Depression Screening Cascade Clear and Color-to-White (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/cascading-dropdowns.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-4.3, GAP-4.4
- **Requirements**: REQ-M3-4 (AC-M3-4.8, AC-M3-4.9)
- **Description**: Add 2 tests: (1) Set Depression Screening `Called to schedule` with data, then change Request Type to AWV, verify QM auto-fills and old status/tracking are cleared (Depression cascade identical to other measures). (2) After cascade clear, explicitly verify row CSS class is `row-status-white`.
- **Tests**:
  1. Set Depression Screening `Called to schedule` + date, change RT to AWV → QM = `Annual Wellness Visit`, MS cleared, tracking cleared
  2. After cascade clear, verify row has `row-status-white` class
- **Acceptance Criteria**:
  - [ ] 2 new tests in `cascading-dropdowns.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 53 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T8-4: Depression Screening Tracking #1 N/A for Additional Statuses (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/cascading-dropdowns.cy.ts`
- **Tests to Write**: 3
- **Gap IDs**: GAP-7.6
- **Requirements**: REQ-M3-7 (AC-M3-7.9)
- **Description**: Add 3 tests verifying Tracking #1 shows N/A (no "Select" prompt, no dropdown options) for additional Depression Screening statuses beyond `Called to schedule` (which is already tested). Test a representative sample: `Visit scheduled`, `Screening complete`, and `Patient declined`.
- **Tests**:
  1. Depression Screening `Visit scheduled` → Tracking #1 does not show "Select" prompt
  2. Depression Screening `Screening complete` → Tracking #1 does not show "Select" prompt
  3. Depression Screening `Patient declined` → Tracking #1 does not show "Select" prompt
- **Acceptance Criteria**:
  - [ ] 3 new tests in `cascading-dropdowns.cy.ts`
  - [ ] All pass
  - [ ] No regressions in existing 53 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T9-1: Tracking #3 Always-Editable and Type Switching (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 4 (3 for Tracking #3 + 1 for type switching)
- **Gap IDs**: GAP-7.5, GAP-7.7
- **Requirements**: REQ-M3-7 (AC-M3-7.8, AC-M3-7.10)
- **Description**: Add 4 tests: (1-3) Verify Tracking #3 is editable (edit wrapper appears on dblclick) for 3 different status types: one with N/A tracking (e.g., `AWV completed`), one with dropdown tracking (e.g., `Colon cancer screening ordered`), and one with free text tracking (e.g., `HgbA1c ordered`). (4) On the same row, switch between 3 statuses with different tracking types and verify Tracking #1 changes type each time.
- **Tests**:
  1. `AWV completed` (N/A tracking) → Tracking #3 is editable
  2. `Colon cancer screening ordered` (dropdown tracking) → Tracking #3 is editable
  3. `HgbA1c ordered` (free text tracking) → Tracking #3 is editable
  4. On same row: set CCS ordered (dropdown) → AWV completed (N/A) → HgbA1c ordered (free text), verify Tracking #1 type changes
- **Acceptance Criteria**:
  - [ ] 4 new tests in `row-color-comprehensive.cy.ts`
  - [ ] All pass
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T9-2: Duplicate + Overdue Coexistence (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-8.1
- **Requirements**: REQ-M3-8 (AC-M3-8.1, AC-M3-8.3)
- **Description**: Add 1 test verifying that a row flagged as duplicate AND having a past due date shows both the orange left border (`row-status-duplicate` or 4px border-left) AND the red overdue background. This requires importing duplicate rows (or using seed data with duplicates), then setting a past due date on one of them.
- **Tests**:
  1. Find/create duplicate rows, set past due date, verify: `row-status-overdue` background AND `border-left` style coexist
- **Acceptance Criteria**:
  - [ ] 1 new test in `row-color-comprehensive.cy.ts`
  - [ ] Passes
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T9-3: Due Date Exact Value and Recalculation (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-5.1, GAP-5.2
- **Requirements**: REQ-M3-5 (AC-M3-5.6, AC-M3-5.8)
- **Description**: Add 2 tests: (1) Set `AWV completed` + today's date, verify the Due Date cell shows a date exactly 365 days later (formatted). (2) Set `AWV completed` + date1, verify dueDate1; then change status date to date2, verify dueDate changes to date2 + 365.
- **Tests**:
  1. Set AWV completed + today → Due Date cell shows today + 365 days
  2. Set AWV completed + Feb 1 → verify Due Date; change to Mar 1 → verify Due Date updated
- **Acceptance Criteria**:
  - [ ] 2 new tests in `row-color-comprehensive.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T9-4: Depression Visit Scheduled Overdue E2E (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-2.2
- **Requirements**: REQ-M3-2 (AC-M3-2.9), REQ-M3-3 (AC-M3-3.11)
- **Description**: Add 1 test verifying Depression Screening `Visit scheduled` with a past status date (2+ days ago, since baseDueDays=1) turns the row red. Currently only `Called to schedule` overdue is tested in Cypress E2E; `Visit scheduled` overdue is only tested in Vitest. Optionally add the exact boundary: status date 2 days ago = red, 1 day ago = NOT red.
- **Tests**:
  1. Depression Screening `Visit scheduled` + status date 2 days ago → row is red (overdue)
- **Acceptance Criteria**:
  - [ ] 1 new test in `row-color-comprehensive.cy.ts`
  - [ ] Passes
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T10-1: Depression Screening Filter Bar (Cypress)

- **Priority**: MEDIUM
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/compact-filter-bar.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-12.1
- **Requirements**: REQ-M3-12 (AC-M3-12.1 through AC-M3-12.4)
- **Description**: Add 1 test that sets up a Depression Screening row with `Called to schedule`, then clicks the "In Progress" (blue) filter chip and verifies the Depression Screening row is visible in the filtered grid. This ensures Depression Screening rows are counted in the correct color bucket.
- **Tests**:
  1. Set Depression Screening `Called to schedule`, click blue filter chip, verify Depression Screening row is visible
- **Acceptance Criteria**:
  - [ ] 1 new test in `compact-filter-bar.cy.ts`
  - [ ] Passes
  - [ ] No regressions in existing 3 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

## LOW Priority Tasks

### Task T10-2: Filter Count After Inline Edit (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/compact-filter-bar.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-12.2
- **Requirements**: REQ-M3-12 (related to EDGE-M3-9)
- **Description**: Add 1 test verifying filter chip counts update after an inline status edit. Note the "All" count, change a row from `Not Addressed` (white) to a green status, then verify the "Completed" chip count increases. This tests for stale count risk (documented limitation in ROW_COLOR_LOGIC.md section 9d).
- **Tests**:
  1. Note "All" count, change row status white -> green, verify Completed chip count updates
- **Acceptance Criteria**:
  - [ ] 1 new test in `compact-filter-bar.cy.ts`
  - [ ] Passes (or documents known limitation if counts are stale)
  - [ ] No regressions in existing 3 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T10-3: Selection Preserves Color for Multiple Categories (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/sorting-filtering.cy.ts`
- **Tests to Write**: 3
- **Gap IDs**: GAP-8.2
- **Requirements**: REQ-M3-8 (AC-M3-8.2)
- **Description**: Add 3 tests verifying that clicking (selecting) a row preserves its background color class for blue, yellow, and purple categories. Currently only green is tested.
- **Tests**:
  1. Set blue status, click row to select, verify `row-status-blue` class preserved
  2. Set yellow status, click row to select, verify `row-status-yellow` class preserved
  3. Set purple status, click row to select, verify `row-status-purple` class preserved
- **Acceptance Criteria**:
  - [ ] 3 new tests in `sorting-filtering.cy.ts`
  - [ ] All pass
  - [ ] No regressions in existing 56 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T11-1: BP Week Intervals Completeness (Jest)

- **Priority**: LOW
- **Framework**: Jest
- **Target File**: `backend/src/services/__tests__/dueDateCalculator.test.ts`
- **Tests to Write**: 7
- **Gap IDs**: GAP-5.4
- **Requirements**: REQ-M3-5 (AC-M3-5.2)
- **Description**: Add a parameterized test for the remaining 7 BP week intervals. Currently only `Call every 2 wks` (14 days) is tested. Add the other 7: `Call every 1 wks` (7), `Call every 3 wks` (21), `Call every 4 wks` (28), `Call every 5 wks` (35), `Call every 6 wks` (42), `Call every 7 wks` (49), `Call every 8 wks` (56).
- **Tests**: Parameterized `it.each` with 7 entries mapping `Call every N wks` to `N * 7` days.
- **Acceptance Criteria**:
  - [ ] 7 new parameterized tests in `dueDateCalculator.test.ts`
  - [ ] All pass
  - [ ] No regressions in existing 26 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T11-2: Depression Visit Scheduled and Screening Complete Due Date (Jest)

- **Priority**: LOW
- **Framework**: Jest
- **Target File**: `backend/src/services/__tests__/dueDateCalculator.test.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-5.6, GAP-2.5
- **Requirements**: REQ-M3-5 (AC-M3-5.10, AC-M3-5.11)
- **Description**: Add 2 tests: (1) `Visit scheduled` with baseDueDays=1 returns statusDate + 1 day. (2) `Screening complete` with baseDueDays=null returns null dueDate (explicit, not just relying on the existing indirect test).
- **Tests**:
  1. `calculateDueDate({ measureStatus: 'Visit scheduled', statusDate: '2026-02-01' })` returns `'2026-02-02'`
  2. `calculateDueDate({ measureStatus: 'Screening complete', statusDate: '2026-02-01' })` returns `null`
- **Acceptance Criteria**:
  - [ ] 2 new tests in `dueDateCalculator.test.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 26 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T9-5: CDX Attestation Boundary (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 2
- **Gap IDs**: GAP-3.5
- **Requirements**: REQ-M3-3 (AC-M3-3.7, AC-M3-3.8)
- **Description**: Add 2 boundary tests for Chronic DX with `Attestation not sent`: (1) dueDate = today (should be orange, NOT overdue), (2) dueDate = yesterday (should be red, overdue). These complement the existing CDX E2E tests which use distant past dates rather than boundary dates.
- **Tests**:
  1. CDX resolved + Attestation not sent + dueDate = today → `row-status-orange` (not overdue)
  2. CDX resolved + Attestation not sent + dueDate = yesterday → `row-status-overdue` (red)
- **Acceptance Criteria**:
  - [ ] 2 new tests in `row-color-comprehensive.cy.ts`
  - [ ] Both pass
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T11-3: Date Prompt Label in Grid UI (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Tests to Write**: 1
- **Gap IDs**: GAP-10.2
- **Requirements**: REQ-M3-10 (AC-M3-10.1)
- **Description**: Add 1 test verifying the date prompt label is visible in the grid UI when editing a status date. Set `AWV completed`, double-click the status date cell, and verify the prompt label shows "Date Completed" (or similar text in the cell editor).
- **Tests**:
  1. Set AWV completed, enter status date editor, verify "Date Completed" prompt text is visible
- **Acceptance Criteria**:
  - [ ] 1 new test in `row-color-comprehensive.cy.ts`
  - [ ] Passes
  - [ ] No regressions in existing 166 tests
- **Dependencies**: None
- **Estimated Effort**: S

---

## Regression Verification Task

### Task T12-1: Full Regression Verification

- **Priority**: BLOCKING (run after all other tasks)
- **Framework**: All
- **Target File**: All 10 target files
- **Tests to Write**: 0 (verification only)
- **Description**: After all new tests are added, run the complete 4-layer test suite to verify zero regressions and confirm final test counts match expectations.
- **Verification Steps**:
  1. Run Vitest: `cd frontend && npm run test:run` — verify `statusColors.test.ts` has ~120 tests (54 + ~66 new), `dropdownConfig.test.ts` has 53 tests (52 + 1 new)
  2. Run Jest: `cd backend && npm test` — verify `dueDateCalculator.test.ts` has ~37 tests (26 + ~11 new), `statusDatePromptResolver.test.ts` has 66 tests (63 + 3 new)
  3. Run Cypress: `cd frontend && npm run cypress:run --headed` — verify:
     - `row-color-comprehensive.cy.ts`: ~177 tests (166 + ~11 new)
     - `row-color-roles.cy.ts`: ~12 it() blocks (8 + 2 new scenarios x3 roles = ~36 effective)
     - `cascading-dropdowns.cy.ts`: ~61 tests (53 + ~8 new)
     - `time-interval.cy.ts`: ~22 tests (15 + 7 new)
     - `compact-filter-bar.cy.ts`: ~5 tests (3 + 2 new)
     - `sorting-filtering.cy.ts`: ~59 tests (56 + 3 new)
  4. Verify total Module 3 test count is ~754 effective (627 current + ~127 new)
  5. Verify no flaky tests (run each Cypress spec 2x to check determinism)
- **Acceptance Criteria**:
  - [ ] All Vitest tests pass with zero failures
  - [ ] All Jest tests pass with zero failures
  - [ ] All Cypress tests pass with zero failures (--headed)
  - [ ] Test counts match expected totals (within +/- 5 margin for implementation adjustments)
  - [ ] No flaky tests on re-run
  - [ ] NFR-M3-1: Vitest suite completes in < 5 seconds
  - [ ] NFR-M3-2: Each Cypress test completes in < 30 seconds
- **Dependencies**: All tasks T1-1 through T11-3
- **Estimated Effort**: M

---

## Execution Order (Recommended)

The following order maximizes parallelism while respecting file-level conflicts.

### Phase 1: Jest Backend Tests (T1-1, T1-2 — in parallel)
Both target different Jest files, no conflicts.

| Task | File | Tests |
|------|------|------:|
| T1-1 | statusDatePromptResolver.test.ts | 3 |
| T1-2 | dueDateCalculator.test.ts | 1 |

### Phase 2: Vitest Frontend Tests (T2-1, T2-2, T4-1, T4-2, T5-1)
T2-1, T2-2, T4-1, and T4-2 all target `statusColors.test.ts` — implement sequentially or merge into a single editing pass. T5-1 targets a different file and can run in parallel.

| Task | File | Tests |
|------|------|------:|
| T2-1 | statusColors.test.ts | ~39 |
| T2-2 | statusColors.test.ts | 2 |
| T4-1 | statusColors.test.ts | ~24 |
| T4-2 | statusColors.test.ts | 1 |
| T5-1 | dropdownConfig.test.ts | 1 |

### Phase 3: Cypress Multi-Role (T3-1, T6-1 — sequential, same file)

| Task | File | Tests (effective) |
|------|------|------------------:|
| T3-1 | row-color-roles.cy.ts | 9 |
| T6-1 | row-color-roles.cy.ts | 9 |

### Phase 4: Cypress Time Interval (T7-1, T7-2, T7-3 — sequential, same file)

| Task | File | Tests |
|------|------|------:|
| T7-1 | time-interval.cy.ts | 3 |
| T7-2 | time-interval.cy.ts | 2 |
| T7-3 | time-interval.cy.ts | 2 |

### Phase 5: Cypress Cascading Dropdowns (T8-1, T8-2, T8-3, T8-4 — sequential, same file)

| Task | File | Tests |
|------|------|------:|
| T8-1 | cascading-dropdowns.cy.ts | 1 |
| T8-2 | cascading-dropdowns.cy.ts | 2 |
| T8-3 | cascading-dropdowns.cy.ts | 2 |
| T8-4 | cascading-dropdowns.cy.ts | 3 |

### Phase 6: Cypress Comprehensive + Other Files (T9-1 through T9-5, T10-1 through T10-3 — parallel across files)

| Task | File | Tests |
|------|------|------:|
| T9-1 | row-color-comprehensive.cy.ts | 4 |
| T9-2 | row-color-comprehensive.cy.ts | 1 |
| T9-3 | row-color-comprehensive.cy.ts | 2 |
| T9-4 | row-color-comprehensive.cy.ts | 1 |
| T9-5 | row-color-comprehensive.cy.ts | 2 |
| T10-1 | compact-filter-bar.cy.ts | 1 |
| T10-2 | compact-filter-bar.cy.ts | 1 |
| T10-3 | sorting-filtering.cy.ts | 3 |

### Phase 7: Jest LOW Priority (T11-1, T11-2 — sequential, same file)

| Task | File | Tests |
|------|------|------:|
| T11-1 | dueDateCalculator.test.ts | 7 |
| T11-2 | dueDateCalculator.test.ts | 2 |

### Phase 8: Cypress LOW Priority Stragglers (T11-3)

| Task | File | Tests |
|------|------|------:|
| T11-3 | row-color-comprehensive.cy.ts | 1 |

### Phase 9: Full Regression (T12-1)

| Task | Scope | Tests |
|------|-------|------:|
| T12-1 | All files | 0 (verification) |

---

## Traceability Matrix

| Gap ID | Task | Priority | Tests |
|--------|------|----------|------:|
| GAP-1.1 | T4-1 | MEDIUM | 8 |
| GAP-1.2 | T4-1 | MEDIUM | 14 |
| GAP-1.3 | T4-1 | MEDIUM | 2 |
| GAP-1.5 | T4-1 | MEDIUM | 2 |
| GAP-2.1 | T3-1 | HIGH | 9 (eff.) |
| GAP-2.2 | T9-4 | MEDIUM | 1 |
| GAP-2.5 | T11-2 | LOW | 1 |
| GAP-3.1 | T2-1 | HIGH | 14 |
| GAP-3.2 | T2-1 | HIGH | 19 |
| GAP-3.3 | T2-1 | HIGH | 6 |
| GAP-3.4 | T2-2 | HIGH | 2 |
| GAP-3.5 | T9-5 | LOW | 2 |
| GAP-3.7 | T4-2 | LOW | 1 |
| GAP-4.3 | T8-3 | LOW | 1 |
| GAP-4.4 | T8-3 | LOW | 1 |
| GAP-5.1 | T9-3 | MEDIUM | 1 |
| GAP-5.2 | T9-3 | MEDIUM | 1 |
| GAP-5.4 | T11-1 | LOW | 7 |
| GAP-5.5 | T1-2 | HIGH | 1 |
| GAP-5.6 | T11-2 | LOW | 1 |
| GAP-6.1 | T7-1 | MEDIUM | 3 |
| GAP-6.2 | T7-2 | MEDIUM | 2 |
| GAP-6.3 | T7-3 | LOW | 1 |
| GAP-6.4 | T7-3 | LOW | 1 |
| GAP-7.1 | T8-1 | MEDIUM | 1 |
| GAP-7.3 | T8-2 | MEDIUM | 1 |
| GAP-7.4 | T8-2 | LOW | 1 |
| GAP-7.5 | T9-1 | MEDIUM | 3 |
| GAP-7.6 | T8-4 | LOW | 3 |
| GAP-7.7 | T9-1 | MEDIUM | 1 |
| GAP-8.1 | T9-2 | MEDIUM | 1 |
| GAP-8.2 | T10-3 | LOW | 3 |
| GAP-9.1 | T5-1 | MEDIUM | 1 |
| GAP-10.1 | T1-1 | HIGH | 3 |
| GAP-10.2 | T11-3 | LOW | 1 |
| GAP-11.1 | T3-1 | HIGH | 9 (eff.) |
| GAP-11.2 | T6-1 | MEDIUM | 9 (eff.) |
| GAP-12.1 | T10-1 | MEDIUM | 1 |
| GAP-12.2 | T10-2 | LOW | 1 |
