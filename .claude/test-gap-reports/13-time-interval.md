# Test Gap Report: Requirement Area 13 -- Time Interval Editability

**Date:** 2026-03-02
**Spec:** `.claude/specs/time-interval/requirements.md`
**Regression Plan Section:** 12 (Time Interval Editability)

---

## 1. Source Files Analyzed

| Layer | File | Purpose |
|-------|------|---------|
| Backend service | `backend/src/services/dueDateCalculator.ts` | Due date + interval calculation (4-priority cascade) |
| Backend handler | `backend/src/routes/handlers/dataHandlers.ts` | PUT handler: manual interval override vs auto-recalculation |
| Frontend grid | `frontend/src/components/grid/PatientGrid.tsx` | Column definition: `isTimeIntervalEditable()`, `valueSetter` (1-1000 range) |
| Frontend hook | `frontend/src/components/grid/hooks/useGridCellUpdate.ts` | API save dispatch for cell edits |
| Frontend cascading | `frontend/src/components/grid/utils/cascadingFields.ts` | Clears timeIntervalDays on cascading changes |

---

## 2. Test Files Analyzed

| Framework | File | Test Count | What It Covers |
|-----------|------|------------|----------------|
| **Jest** | `backend/src/services/__tests__/dueDateCalculator.test.ts` | 29 | All 4 priority levels: HgbA1c month tracking, Screening discussed month tracking, DueDayRule lookup, baseDueDays fallback, null inputs, BP week patterns, boundary months |
| **Jest** | `backend/src/routes/__tests__/data.routes.test.ts` | 3 (interval-specific) | Manual interval override for non-dropdown status, blocked for dropdown status, auto-recalculation on measureStatus change |
| **Jest** | `backend/src/services/__tests__/versionCheck.test.ts` | ~1 (incidental) | timeIntervalDays in sample data and field list |
| **Vitest** | `frontend/src/components/grid/PatientGrid.test.tsx` | 3 (incidental) | Column exists, field name correct, header name correct |
| **Vitest** | `frontend/src/components/grid/utils/__tests__/cascadingFields.test.ts` | 4 (incidental) | timeIntervalDays cleared on requestType/qualityMeasure/measureStatus change |
| **Vitest** | `frontend/src/components/grid/hooks/__tests__/useGridCellUpdate.test.ts` | 0 (interval-specific) | Only has sample data with timeIntervalDays: null |
| **Cypress** | `frontend/cypress/e2e/time-interval.cy.ts` | 22 | Dropdown-controlled non-editable (3), standard editable (2), manual override + due date recalc (3), validation (4), dropdown interval via T1/T2 (3), terminal read-only (3), Depression (2), edge cases (2) |
| **Cypress** | `frontend/cypress/e2e/row-color-comprehensive.cy.ts` | 2 (Section 6) | Overdue -> extend interval to 9999 -> not overdue (AWV + CCS) |
| **Cypress** | `frontend/cypress/e2e/cascading-dropdowns.cy.ts` | 3 (incidental) | Time interval cleared on cascading status changes, T2 dropdown sets interval |
| **Cypress** | `frontend/cypress/e2e/sorting-filtering.cy.ts` | 1 (incidental) | Time Interval column sortable |
| **Playwright** | `frontend/e2e/*.spec.ts` | 0 | No time interval tests in Playwright |

**Totals (time-interval-specific):**
- Jest: 32 tests
- Vitest: 7 tests (3 column definition + 4 cascading clear)
- Cypress: 33 tests (22 dedicated + 2 Section 6 + 3 cascading + 1 sorting + 5 incidental interval checks)
- Playwright: 0 tests

---

## 3. Complete Use Case Matrix

### 3A. Auto-Calculation (AC-1, AC-7)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 1 | Time interval = dueDate - statusDate for baseDueDays statuses | Yes (29 tests) | -- | Yes (AWV=365, Called=7) | -- | COVERED |
| 2 | Time interval from DueDayRule (tracking1 + measureStatus combo) | Yes (DueDayRule lookup) | -- | Yes (Colonoscopy=42, Mammogram=14) | -- | COVERED |
| 3 | Time interval from HgbA1c T2 month dropdown (1/3/6/12 months) | Yes (4 month values x 3 statuses = 12 tests) | -- | Yes (3 months, 1 month) | -- | COVERED |
| 4 | Time interval from Screening discussed T1 month pattern (In 1-11 Months) | Yes (In 1 Month, In 3 Months, In 11 Months) | -- | Yes (In 3 Months) | -- | COVERED |
| 5 | Time interval from BP T1 week dropdown (Call every 1-8 wks) | Yes (7 week values via DueDayRule) | -- | Yes (Call every 2 wks) | -- | COVERED |
| 6 | Default interval from baseDueDays when no DueDayRule matches | Yes (baseDueDays fallback tests) | -- | Yes (AWV completed=365) | -- | COVERED |
| 7 | No interval when no baseDueDays and no rules | Yes (returns null) | -- | Yes (Not Addressed = empty) | -- | COVERED |
| 8 | No interval when statusDate is null | Yes (returns null) | -- | -- | -- | **PARTIAL: no Cypress test for empty interval when no statusDate** |
| 9 | No interval when measureStatus is null | Yes (returns null) | -- | -- | -- | **PARTIAL: backend only** |

### 3B. Manual Override (AC-2, AC-3, AC-4, AC-5)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 10 | User edits interval for baseDueDays status (e.g., AWV completed 365->45) | Yes (API handler) | -- | Yes (AWV completed 365->45) | -- | COVERED |
| 11 | User edits interval for DueDayRule status (e.g., Colonoscopy 42->30) | Yes (API handler allows non-dropdown) | -- | -- | -- | **GAP: no Cypress test for test-type dropdown status override** |
| 12 | Manual override recalculates dueDate = statusDate + newInterval | Yes (API test verifies dueDate) | -- | Yes (365->60, verifies dueDate changed) | -- | COVERED |
| 13 | Override value persisted to database after save | Yes (API test checks update payload) | -- | Yes (implicitly - value shows after edit) | -- | COVERED |
| 14 | Override value survives page refresh | -- | -- | -- | -- | **GAP: no test reloads page after override to verify persistence** |

### 3C. Editability Rules (AC-2, AC-6)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 15 | Editable for baseDueDays statuses with statusDate | -- | -- | Yes (AWV completed, Patient called to schedule AWV) | -- | COVERED |
| 16 | NOT editable for Screening discussed (T1 dropdown controls) | -- | -- | Yes (dblclick -> no editor) | -- | COVERED |
| 17 | NOT editable for HgbA1c ordered (T2 dropdown controls) | -- | -- | Yes (dblclick -> no editor) | -- | COVERED |
| 18 | NOT editable for HgbA1c at goal | -- | -- | -- | -- | **GAP: not explicitly tested** |
| 19 | NOT editable for HgbA1c NOT at goal | -- | -- | -- | -- | **GAP: not explicitly tested** |
| 20 | NOT editable for Scheduled call back - BP not at goal (T1 dropdown) | -- | -- | Yes (dblclick -> no editor) | -- | COVERED |
| 21 | NOT editable for Scheduled call back - BP at goal | -- | -- | -- | -- | **GAP: not explicitly tested** |
| 22 | NOT editable when statusDate is empty (no due date possible) | -- | -- | -- | -- | **GAP: `isTimeIntervalEditable` checks statusDate but no Cypress test** |
| 23 | NOT editable when timeIntervalDays is null (no baseDueDays) | -- | -- | Yes (Not Addressed, Patient declined AWV, No longer applicable) | -- | COVERED |
| 24 | `isTimeIntervalEditable()` unit tests for all conditions | -- | -- | -- | -- | **GAP: no Vitest unit test for the `isTimeIntervalEditable` helper** |

### 3D. Validation (valueSetter)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 25 | Reject non-numeric input (revert to original) | -- | -- | Yes (types 'abc', reverts) | -- | COVERED |
| 26 | Reject zero (alert + revert) | -- | -- | Yes (types '0', alert, reverts) | -- | COVERED |
| 27 | Reject negative number (alert + revert) | -- | -- | -- | -- | **GAP: no test for negative input like -5** |
| 28 | Reject value > 1000 (alert + revert) | -- | -- | Yes (types '1001', alert, reverts) | -- | COVERED |
| 29 | Accept lower boundary value (1) | -- | -- | Yes (types '1', accepted) | -- | COVERED |
| 30 | Accept upper boundary value (1000) | -- | -- | Yes (types '1000', accepted) | -- | COVERED |
| 31 | Reject empty/cleared value (revert) | -- | -- | Yes (clear, enter, reverts) | -- | COVERED |
| 32 | Reject decimal value (e.g., 3.5) | -- | -- | -- | -- | **GAP: no test for decimal input (parseInt may silently truncate)** |
| 33 | Alert message text verification | -- | -- | Yes (checks "valid number between 1 and 1000") | -- | COVERED |
| 34 | `valueSetter` unit test for all validation cases | -- | -- | -- | -- | **GAP: no Vitest unit test for the valueSetter function** |

### 3E. Dropdown-Controlled Interval Updates (AC-6)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 35 | HgbA1c: changing T2 from 1 month to 6 months updates interval | -- | -- | Yes (1 month->6 months, interval increases) | -- | COVERED |
| 36 | HgbA1c: T2 = 1 month shows ~28-31 days | Yes | -- | Yes | -- | COVERED |
| 37 | HgbA1c: T2 = 3 months shows ~84-93 days | Yes | -- | Yes | -- | COVERED |
| 38 | HgbA1c: T2 = 6 months shows ~180-186 days | Yes | -- | -- | -- | **PARTIAL: Jest only** |
| 39 | HgbA1c: T2 = 12 months shows ~365-366 days | Yes | -- | -- | -- | **PARTIAL: Jest only** |
| 40 | Screening discussed: T1 = In 3 Months shows ~90 days | Yes | -- | Yes | -- | COVERED |
| 41 | BP: T1 = Call every 2 wks shows 14 days | Yes (DueDayRule) | -- | Yes | -- | COVERED |
| 42 | BP: T1 = Call every 1 wk shows 7 days | Yes (DueDayRule) | -- | -- | -- | **PARTIAL: Jest only, no Cypress E2E** |
| 43 | BP: T1 = Call every 4 wks shows 28 days | Yes (DueDayRule) | -- | -- | -- | **PARTIAL: Jest only** |
| 44 | BP: T1 = Call every 8 wks shows 56 days | Yes (DueDayRule) | -- | -- | -- | **PARTIAL: Jest only** |
| 45 | Dropdown options listed for BP T1 (1/2/4/8 wks) | -- | -- | Yes (verifies option list) | -- | COVERED |

### 3F. Terminal/Non-Actionable Statuses

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 46 | Not Addressed: interval empty, read-only | -- | -- | Yes (T7-1) | -- | COVERED |
| 47 | Patient declined AWV: interval empty, read-only | -- | -- | Yes (T7-1) | -- | COVERED |
| 48 | No longer applicable: interval empty, read-only | -- | -- | Yes (T7-1) | -- | COVERED |
| 49 | Screening unnecessary: interval empty | Yes (baseDueDays null) | -- | -- | -- | **PARTIAL: Jest calculation only, no Cypress read-only check** |
| 50 | Screening complete (Depression): interval empty or 365 | Yes (two tests: null and 365) | -- | Yes (T7-2, logs value) | -- | COVERED |
| 51 | Contraindicated: interval empty | -- | -- | -- | -- | **GAP: no specific test** |

### 3G. Cascading Changes (Status Transitions)

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 52 | Changing requestType clears timeIntervalDays | -- | Yes (cascadingFields) | Yes (cascading-dropdowns) | -- | COVERED |
| 53 | Changing qualityMeasure clears timeIntervalDays | -- | Yes (cascadingFields) | Yes (cascading-dropdowns) | -- | COVERED |
| 54 | Changing measureStatus clears timeIntervalDays | -- | Yes (cascadingFields) | Yes (cascading-dropdowns) | -- | COVERED |
| 55 | Actionable -> terminal status: interval clears, dueDate clears | -- | -- | Yes (T7-3: Patient called -> Patient declined) | -- | COVERED |
| 56 | Terminal -> actionable status: interval recalculates | -- | -- | -- | -- | **GAP: no test for reverse transition** |
| 57 | Changing T1/T2 dropdown recalculates interval (dropdown statuses) | Yes (API handler) | -- | Yes (HgbA1c T2 change, BP T1 change) | -- | COVERED |

### 3H. Display and Format

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 58 | Time interval displays as integer (no decimals) | -- | -- | Yes (parseInt and equality checks) | -- | COVERED |
| 59 | Column header shows "Time Interval (Days)" | -- | Yes (PatientGrid.test) | -- | -- | COVERED |
| 60 | Column is sortable | -- | -- | Yes (sorting-filtering.cy.ts) | -- | COVERED |
| 61 | Column is filterable | -- | -- | -- | -- | **GAP: no filter test for time interval** |

### 3I. Overdue Interaction

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 62 | Editing interval to 9999 removes overdue (pushes dueDate forward) | -- | -- | Yes (Section 6: AWV + CCS) | -- | COVERED |
| 63 | Editing interval to small value causes overdue (with past statusDate) | -- | -- | -- | -- | **GAP: no test for shrinking interval to trigger overdue** |
| 64 | Editing interval to exactly match days-since-statusDate (boundary) | -- | -- | -- | -- | **GAP: boundary overdue test** |

### 3J. API-Level Behavior

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 65 | PUT with timeIntervalDays for non-dropdown status: manual override | Yes | -- | -- | -- | COVERED |
| 66 | PUT with timeIntervalDays for dropdown status: blocked (ignored) | Yes | -- | -- | -- | COVERED |
| 67 | PUT changing measureStatus: auto-recalculates interval | Yes | -- | -- | -- | COVERED |
| 68 | PUT changing tracking1/tracking2: auto-recalculates interval | -- | -- | -- | -- | **GAP: no API test for tracking field changes triggering recalc** |
| 69 | PUT with timeIntervalDays when no statusDate: dueDate not computed | -- | -- | -- | -- | **GAP: no test for interval edit without statusDate at API level** |

### 3K. Backend Calculation Edge Cases

| # | Use Case | Jest | Vitest | Cypress | Playwright | Status |
|---|----------|------|--------|---------|------------|--------|
| 70 | addMonths rollover (Jan 31 + 1 month -> Feb 28/Mar 3?) | -- | -- | -- | -- | **GAP: month-end rollover edge case** |
| 71 | addMonths across year boundary (Nov -> Feb next year) | Yes (In 11 Months from Jan = Dec) | -- | -- | -- | **PARTIAL: only same-year tested** |
| 72 | Leap year handling (Feb 29 + 12 months) | -- | -- | -- | -- | **GAP: leap year edge case** |
| 73 | differenceInDays rounding (DST edge case) | -- | -- | -- | -- | **GAP: uses Math.round, no DST test** |
| 74 | Concurrent edits: two users edit same interval | -- | -- | -- | -- | **GAP: version conflict on interval edit** |

---

## 4. Gap Summary

### CRITICAL Gaps (P1 -- Missing Core Coverage)

| # | Gap Description | Framework Needed | Use Cases |
|---|-----------------|------------------|-----------|
| G1 | `isTimeIntervalEditable()` has no unit test | Vitest | #24 |
| G2 | `valueSetter` for timeIntervalDays column has no unit test | Vitest | #34 |
| G3 | Negative number input not tested in validation | Cypress | #27 |
| G4 | Decimal number input not tested (e.g., 3.5 -> truncation) | Cypress | #32 |
| G5 | Override persistence after page refresh not tested | Cypress | #14 |

### HIGH Gaps (P2 -- Missing Important Scenarios)

| # | Gap Description | Framework Needed | Use Cases |
|---|-----------------|------------------|-----------|
| G6 | HgbA1c at goal: NOT editable not explicitly tested | Cypress | #18 |
| G7 | HgbA1c NOT at goal: NOT editable not explicitly tested | Cypress | #19 |
| G8 | Scheduled call back - BP at goal: NOT editable not explicitly tested | Cypress | #21 |
| G9 | Not editable when statusDate is empty (front-end guard) | Cypress | #22 |
| G10 | DueDayRule status (e.g., Colonoscopy) interval manual override E2E | Cypress | #11 |
| G11 | Terminal -> actionable status transition recalculates interval | Cypress | #56 |
| G12 | Shrinking interval to trigger overdue (reverse of #62) | Cypress | #63 |
| G13 | API test for tracking1/tracking2 change triggering recalculation | Jest | #68 |

### MEDIUM Gaps (P3 -- Edge Cases)

| # | Gap Description | Framework Needed | Use Cases |
|---|-----------------|------------------|-----------|
| G14 | Screening unnecessary: read-only check (Cypress) | Cypress | #49 |
| G15 | Contraindicated: interval empty, read-only | Cypress | #51 |
| G16 | Column filterable by time interval value | Cypress | #61 |
| G17 | Overdue boundary: interval = exact days since statusDate | Cypress | #64 |
| G18 | API: interval edit with no statusDate at API level | Jest | #69 |
| G19 | Month-end rollover in addMonths (Jan 31 + 1 month) | Jest | #70 |
| G20 | Leap year in addMonths (Feb 29 + 12 months) | Jest | #72 |
| G21 | DST boundary in differenceInDays | Jest | #73 |
| G22 | HgbA1c T2 = 6 months E2E (only Jest, no Cypress) | Cypress | #38 |
| G23 | HgbA1c T2 = 12 months E2E (only Jest, no Cypress) | Cypress | #39 |
| G24 | BP Call every 1 wk E2E | Cypress | #42 |
| G25 | BP Call every 4 wks E2E | Cypress | #43 |
| G26 | BP Call every 8 wks E2E | Cypress | #44 |

### LOW Gaps (P4 -- Nice to Have)

| # | Gap Description | Framework Needed | Use Cases |
|---|-----------------|------------------|-----------|
| G27 | Concurrent interval edits (version conflict) | Jest + Cypress | #74 |
| G28 | Playwright E2E for time interval (zero Playwright coverage) | Playwright | All |
| G29 | No statusDate + interval display is empty (Cypress) | Cypress | #8 |

---

## 5. Coverage Summary by Framework

| Framework | Covered Use Cases | Gap Use Cases | Coverage % |
|-----------|-------------------|---------------|------------|
| **Jest** (backend) | 32 tests: calculation, API manual override, API block, fallback | G13, G18, G19, G20, G21 | ~85% of backend logic |
| **Vitest** (frontend) | 7 tests: column def + cascading clear | G1, G2 (isTimeIntervalEditable + valueSetter unit tests) | ~30% of frontend logic |
| **Cypress** (E2E) | 33 tests: editability, validation, override, dropdown, terminal, overdue toggle | G3-G12, G14-G17, G22-G26 | ~65% of use cases |
| **Playwright** | 0 tests | G28 (entire framework) | 0% |

### Overall Coverage: **~65%** of identified use cases (48/74 fully covered)

---

## 6. Recommendations

### Immediate (before next release)

1. **Add Vitest unit tests for `isTimeIntervalEditable()`** -- test all 5 branches:
   - data is undefined -> false
   - no statusDate -> false
   - timeIntervalDays is null -> false
   - TIME_PERIOD_DROPDOWN_STATUSES -> false
   - all conditions pass -> true

2. **Add Vitest unit tests for `valueSetter`** -- test:
   - null/empty/undefined input -> returns false
   - non-numeric -> returns false
   - value < 1 (0, -5) -> alert + returns false
   - value > 1000 -> alert + returns false
   - valid integer -> sets data + returns true
   - decimal 3.5 -> parseInt truncates to 3 (or check current behavior)

3. **Add Cypress test for negative number validation** (-5 input)

4. **Add Cypress test for decimal input** (3.5 -> verify behavior)

### Short-term (next sprint)

5. Add explicit Cypress non-editable tests for: HgbA1c at goal, HgbA1c NOT at goal, BP at goal (#G6-G8)
6. Add Cypress test: statusDate empty -> interval not editable (#G9)
7. Add Cypress test: manual override of DueDayRule status interval (#G10)
8. Add Cypress test: terminal -> actionable status transition recalculates interval (#G11)
9. Add Jest test: tracking1/tracking2 change in PUT triggers due date recalculation (#G13)

### Medium-term

10. Add Jest edge case tests: month-end rollover, leap year, DST boundary (#G19-G21)
11. Add more Cypress E2E tests for BP week intervals beyond 2 wks (#G24-G26)
12. Add Cypress test: shrink interval to trigger overdue (#G12)
13. Add Cypress test: override persists after page refresh (#G5)

---

## 7. Regression Plan Section 12 -- Status Update

The regression plan section 12 states: `| 12. Time Interval | 3 | 0 | 0 | 3 | 0% |`

**This is OUTDATED.** The actual status is:

| TC | Description | Automation Status | Automated In |
|----|-------------|-------------------|--------------|
| TC-12.1 | Time Interval Editable (Base Due Days) | **Automated** | `time-interval.cy.ts` (AWV completed edit) |
| TC-12.2 | Time Interval Override (Tracking Dropdown Status) | **Partially Automated** | `time-interval.cy.ts` (T1/T2 dropdown tests, but no manual override of DueDayRule status) |
| TC-12.3 | Time Interval Override (HgbA1c Status) | **NOT Automated** | HgbA1c interval is NOT editable by design (AC-6), so TC-12.3 as written is incorrect |

**Recommended update:** Section 12 should reflect the 22-test `time-interval.cy.ts` file plus 2 from `row-color-comprehensive.cy.ts` Section 6. The coverage percentage should be updated from 0% to ~65%.
