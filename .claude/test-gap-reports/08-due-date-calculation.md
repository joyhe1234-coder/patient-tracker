# Test Gap Analysis: Requirement Area 8 -- Due Date Calculation

**Date:** 2026-03-02
**Analyst:** Claude Opus 4.6
**Feature Spec:** `.claude/specs/due-date/requirements.md`
**Regression Plan Section:** 7 (TC-7.1 through TC-7.5)

---

## 1. Source Code Inventory

| File | Role |
|------|------|
| `backend/src/services/dueDateCalculator.ts` | Core calculation logic (4-priority system) |
| `backend/src/routes/handlers/dataHandlers.ts` | API handler: calls calculateDueDate on create/update, manual interval override |
| `frontend/src/config/statusColors.ts` | `isRowOverdue()` -- client-side overdue detection (dueDate < today UTC) |
| `frontend/src/components/grid/PatientGrid.tsx` | `isTimeIntervalEditable()` -- conditional editability; valueSetter validation (1-1000) |
| `frontend/src/components/grid/utils/cascadingFields.ts` | Downstream field clearing (includes dueDate, timeIntervalDays) |
| `backend/prisma/seed.ts` | baseDueDays + DueDayRule seed data (production truth) |

---

## 2. Test File Inventory

| File | Framework | Focus | Test Count |
|------|-----------|-------|------------|
| `backend/src/services/__tests__/dueDateCalculator.test.ts` | Jest | Core calculation logic | 37 (30 it + 7 it.each) |
| `frontend/src/config/statusColors.test.ts` | Vitest | isRowOverdue + getRowStatusColor | ~64 it blocks (many parameterized) |
| `frontend/src/components/grid/PatientGrid.test.tsx` | Vitest | Column defs, dueDate non-editable, rowClassRules | ~20 relevant assertions |
| `frontend/cypress/e2e/time-interval.cy.ts` | Cypress | Time interval editability, validation, dropdown control | 22 |
| `frontend/cypress/e2e/row-color-comprehensive.cy.ts` | Cypress | Overdue transitions (Sections 5, 6, 9) | ~50 due-date-related |
| `backend/src/routes/__tests__/data.routes.test.ts` | Jest | API handler: manual interval, recalculation triggers | ~5 due-date-related |

**Total due-date-related tests:** ~198

---

## 3. Complete Use Case Matrix

### 3.1 Core Calculation Logic (Backend)

| # | Use Case | Source Code | Jest | Vitest | Cypress | Playwright | Gap? |
|---|----------|-------------|------|--------|---------|------------|------|
| 1 | statusDate=null --> dueDate=null | dueDateCalculator.ts:24 | YES (general cases: null statusDate) | -- | -- | -- | NO |
| 2 | measureStatus=null --> dueDate=null | dueDateCalculator.ts:24 | YES | -- | -- | -- | NO |
| 3 | Both null --> dueDate=null | dueDateCalculator.ts:24 | YES | -- | -- | -- | NO |
| 4 | Priority 1: "Screening discussed" + "In N Month(s)" tracking1 | dueDateCalculator.ts:31-38 | YES (In 3 Months, In 1 Month, In 11 Months) | -- | YES (time-interval.cy.ts) | -- | NO |
| 5 | Priority 1: "Screening discussed" + non-matching tracking1 falls to P3/P4 | dueDateCalculator.ts:31 | YES (boundary tests: non-matching) | -- | -- | -- | NO |
| 6 | Priority 2: HgbA1c ordered + tracking2="1 month" | dueDateCalculator.ts:43-56 | YES (all 3 HgbA1c statuses x 1mo) | -- | YES (time-interval.cy.ts) | -- | NO |
| 7 | Priority 2: HgbA1c ordered + tracking2="3 months" | dueDateCalculator.ts:43-56 | YES | -- | YES | -- | NO |
| 8 | Priority 2: HgbA1c ordered + tracking2="6 months" | dueDateCalculator.ts:43-56 | YES | -- | -- | -- | NO |
| 9 | Priority 2: HgbA1c ordered + tracking2="12 months" | dueDateCalculator.ts:43-56 | YES | -- | -- | -- | NO |
| 10 | Priority 2: HgbA1c + no tracking2 --> null | dueDateCalculator.ts:45-46 | YES (all 3 HgbA1c statuses) | -- | YES (row-color: stays blue) | -- | NO |
| 11 | Priority 2: HgbA1c + empty string tracking2 --> null | dueDateCalculator.ts:45-46 | YES | -- | -- | -- | NO |
| 12 | Priority 2: HgbA1c + invalid tracking2 format --> null | dueDateCalculator.ts:55-56 | YES | -- | -- | -- | NO |
| 13 | Priority 3: DueDayRule match (Colonoscopy=42d) | dueDateCalculator.ts:60-76 | YES | -- | YES (row-color: overdue) | -- | NO |
| 14 | Priority 3: DueDayRule no match --> falls to P4 | dueDateCalculator.ts:78-89 | YES | -- | -- | -- | NO |
| 15 | Priority 3 overrides Priority 4 when both exist | dueDateCalculator.ts:60-76 | YES (priority ordering tests) | -- | -- | -- | NO |
| 16 | Priority 4: baseDueDays=1 (AWV scheduled) | dueDateCalculator.ts:78-89 | YES | -- | YES (row-color: 5A) | -- | NO |
| 17 | Priority 4: baseDueDays=7 (Called to schedule) | dueDateCalculator.ts:78-89 | YES | -- | YES | -- | NO |
| 18 | Priority 4: baseDueDays=14 (ACE/ARB prescribed) | dueDateCalculator.ts:78-89 | -- | -- | -- | -- | **GAP** |
| 19 | Priority 4: baseDueDays=30 (Will call later) | dueDateCalculator.ts:78-89 | -- | -- | -- | -- | **GAP** |
| 20 | Priority 4: baseDueDays=42 (Diabetic eye exam discussed) | dueDateCalculator.ts:78-89 | -- | -- | -- | -- | **GAP** |
| 21 | Priority 4: baseDueDays=365 (AWV completed) | dueDateCalculator.ts:78-89 | YES | -- | YES | -- | NO |
| 22 | Priority 4: baseDueDays=null --> no dueDate | dueDateCalculator.ts:86 | YES (Screening unnecessary) | -- | YES (5D) | -- | NO |
| 23 | No rules + no baseDueDays --> null | dueDateCalculator.ts:97 | YES | -- | -- | -- | NO |

### 3.2 DueDayRule Specific Rules (All Seeded Rules)

| # | Status | Tracking Value | DueDays | Jest | Cypress | Gap? |
|---|--------|----------------|---------|------|---------|------|
| 24 | Screening discussed | In 1 Month | 30 | YES (boundary) | YES (row-color 2E) | NO |
| 25 | Screening discussed | In 2 Months | 60 | -- | -- | **GAP** |
| 26 | Screening discussed | In 3 Months | 90 | YES | YES | NO |
| 27 | Screening discussed | In 4 Months | 120 | -- | -- | **GAP** |
| 28 | Screening discussed | In 5 Months | 150 | -- | -- | **GAP** |
| 29 | Screening discussed | In 6 Months | 180 | -- | YES (row-color 2E) | PARTIAL |
| 30 | Screening discussed | In 7 Months | 210 | -- | -- | **GAP** |
| 31 | Screening discussed | In 8 Months | 240 | -- | -- | **GAP** |
| 32 | Screening discussed | In 9 Months | 270 | -- | -- | **GAP** |
| 33 | Screening discussed | In 10 Months | 300 | -- | -- | **GAP** |
| 34 | Screening discussed | In 11 Months | 330 | YES (boundary) | YES (row-color 2E) | NO |
| 35 | Colon cancer screening ordered | Colonoscopy | 42 | YES (via DueDayRule mock) | YES (row-color 2A) | NO |
| 36 | Colon cancer screening ordered | Sigmoidoscopy | 42 | -- | YES (row-color 2A) | PARTIAL |
| 37 | Colon cancer screening ordered | Cologuard | 21 | -- | YES (row-color 2A, 5A) | PARTIAL |
| 38 | Colon cancer screening ordered | FOBT | 21 | -- | YES (row-color 2A) | PARTIAL |
| 39 | Screening test ordered | Mammogram | 14 | -- | YES (row-color 2C, 5A) | PARTIAL |
| 40 | Screening test ordered | Breast Ultrasound | 14 | -- | YES (row-color 2C) | PARTIAL |
| 41 | Screening test ordered | Breast MRI | 21 | -- | YES (row-color 2C) | PARTIAL |
| 42 | BP not at goal | Call every 1 wk | 7 | YES (it.each) | YES (row-color 2F, 5A) | NO |
| 43 | BP not at goal | Call every 2 wks | 14 | YES (standalone + it.each) | YES | NO |
| 44 | BP not at goal | Call every 3 wks | 21 | YES (it.each) | YES | NO |
| 45 | BP not at goal | Call every 4 wks | 28 | YES (it.each) | YES | NO |
| 46 | BP not at goal | Call every 5 wks | 35 | YES (it.each) | -- | PARTIAL |
| 47 | BP not at goal | Call every 6 wks | 42 | YES (it.each) | -- | PARTIAL |
| 48 | BP not at goal | Call every 7 wks | 49 | YES (it.each) | -- | PARTIAL |
| 49 | BP not at goal | Call every 8 wks | 56 | YES (it.each) | YES | NO |
| 50 | BP at goal | (same 8 rules) | same | -- (only "not at goal" tested) | YES (row-color 2G) | **GAP: Jest** |
| 51 | CDX resolved | Attestation not sent | 14 | YES | YES (row-color 2H, 5A) | NO |
| 52 | CDX invalid | Attestation not sent | 14 | -- | YES (row-color 2H) | PARTIAL |

### 3.3 HgbA1c Tracking #2 Month Intervals

| # | Status | T2 Value | Expected Days | Jest | Cypress | Gap? |
|---|--------|----------|---------------|------|---------|------|
| 53 | HgbA1c ordered | 1 month | ~30 | YES | YES (row-color 3) | NO |
| 54 | HgbA1c ordered | 3 months | ~90 | YES | YES (time-interval.cy.ts) | NO |
| 55 | HgbA1c ordered | 6 months | ~180 | YES | -- | NO |
| 56 | HgbA1c ordered | 12 months | ~365 | YES | -- | NO |
| 57 | HgbA1c at goal | 1 month | ~30 | YES | -- | NO |
| 58 | HgbA1c at goal | 3 months | ~90 | YES | -- | NO |
| 59 | HgbA1c at goal | 6 months | ~180 | YES | -- | NO |
| 60 | HgbA1c at goal | 12 months | ~365 | YES | -- | NO |
| 61 | HgbA1c NOT at goal | 1 month | ~30 | YES | YES (row-color 3) | NO |
| 62 | HgbA1c NOT at goal | 3 months | ~90 | YES | -- | NO |
| 63 | HgbA1c NOT at goal | 6 months | ~180 | YES | -- | NO |
| 64 | HgbA1c NOT at goal | 12 months | ~365 | YES | -- | NO |

### 3.4 Overdue Detection (Frontend)

| # | Use Case | Vitest | Cypress | Gap? |
|---|----------|--------|---------|------|
| 65 | dueDate=null --> not overdue | YES | -- | NO |
| 66 | dueDate in past --> overdue (red row) | YES | YES (5A: 11 tests) | NO |
| 67 | dueDate=today --> NOT overdue | YES | YES (5B: 5 tests) | NO |
| 68 | dueDate in future --> NOT overdue | YES | -- | NO |
| 69 | dueDate=yesterday --> overdue | YES (boundary) | -- | NO |
| 70 | dueDate=tomorrow --> NOT overdue | YES (boundary) | -- | NO |
| 71 | Gray statuses NEVER overdue | YES (2 statuses) | YES (5C: 2 tests) | NO |
| 72 | Purple statuses NEVER overdue | YES (all 5 statuses) | YES (5C: 2 tests) | NO |
| 73 | CDX + Attestation sent NEVER overdue | YES | YES (5C, 9E) | NO |
| 74 | CDX + Attestation not sent CAN be overdue | YES | YES (5A, 9E) | NO |
| 75 | Overdue overrides green/blue/yellow/orange | YES (parameterized all statuses) | YES | NO |
| 76 | Overdue does NOT override gray | YES | YES | NO |
| 77 | Overdue does NOT override purple | YES | YES | NO |
| 78 | 7-day timer: day 7 exact = NOT overdue | YES | -- | NO |
| 79 | 7-day timer: day 8 = overdue | YES | -- | NO |
| 80 | 1-day timer: visit day exact = NOT overdue | YES | -- | NO |
| 81 | 1-day timer: day after = overdue | YES | -- | NO |
| 82 | Depression "Visit scheduled" + past --> overdue | -- | YES (9D) | NO |
| 83 | Depression "Screening complete" + past --> overdue | -- | -- | **GAP** |

### 3.5 Time Interval Editability

| # | Use Case | Vitest | Cypress | Gap? |
|---|----------|--------|---------|------|
| 84 | Standard status (AWV completed) + statusDate --> editable | -- | YES (time-interval.cy.ts) | **GAP: Vitest unit** |
| 85 | Dropdown status (Screening discussed) --> NOT editable | -- | YES | **GAP: Vitest unit** |
| 86 | Dropdown status (HgbA1c ordered) --> NOT editable | -- | YES | **GAP: Vitest unit** |
| 87 | Dropdown status (BP not at goal) --> NOT editable | -- | YES | **GAP: Vitest unit** |
| 88 | No statusDate --> NOT editable | -- | -- | **GAP** |
| 89 | No timeIntervalDays (null) --> NOT editable | -- | YES (T7-1: Not Addressed) | PARTIAL |
| 90 | Terminal status (Patient declined) --> NOT editable | -- | YES (T7-1) | PARTIAL |

### 3.6 Time Interval Manual Override & Validation

| # | Use Case | Jest (API) | Cypress | Gap? |
|---|----------|------------|---------|------|
| 91 | Manual override: interval 365-->60 recalculates dueDate | YES (data.routes.test.ts) | YES | NO |
| 92 | Validation: reject non-numeric (abc) | -- | YES | NO |
| 93 | Validation: reject zero | -- | YES | NO |
| 94 | Validation: reject >1000 | -- | YES | NO |
| 95 | Validation: accept 1 (lower bound) | -- | YES | NO |
| 96 | Validation: accept 1000 (upper bound) | -- | YES | NO |
| 97 | Validation: reject empty (clear) | -- | YES | NO |
| 98 | Validation: reject negative numbers | -- | -- | **GAP** |
| 99 | Validation: reject decimal (3.5) | -- | -- | **GAP** |
| 100 | Blocked for dropdown-controlled status (API) | YES (data.routes.test.ts) | -- | NO |

### 3.7 Due Date Recalculation Triggers

| # | Use Case | Jest (API) | Cypress | Playwright | Gap? |
|---|----------|------------|---------|------------|------|
| 101 | Status change triggers recalculation | YES (data.routes.test.ts) | -- | -- | PARTIAL (no E2E) |
| 102 | StatusDate change triggers recalculation | -- | YES (row-color 9C) | -- | **GAP: Jest API** |
| 103 | Tracking1 change triggers recalculation | -- | YES (time-interval.cy.ts) | -- | **GAP: Jest API** |
| 104 | Tracking2 change triggers recalculation | -- | YES (time-interval.cy.ts) | -- | **GAP: Jest API** |
| 105 | Status change to terminal clears dueDate+interval | -- | YES (T7-3) | -- | **GAP: Jest API** |

### 3.8 Cascading Field Reset

| # | Use Case | Vitest | Cypress | Gap? |
|---|----------|--------|---------|------|
| 106 | Request type change clears dueDate + timeIntervalDays | YES (cascadingFields.test.ts) | -- | NO |
| 107 | Measure status change clears dueDate + timeIntervalDays | YES (cascadingFields.test.ts) | -- | NO |

### 3.9 Display

| # | Use Case | Vitest | Cypress | Playwright | Gap? |
|---|----------|--------|---------|------------|------|
| 108 | Due Date column renders in grid | YES (PatientGrid.test.tsx) | -- | -- | NO |
| 109 | Time Interval column renders in grid | YES (PatientGrid.test.tsx) | -- | -- | NO |
| 110 | Due Date column is NOT editable | YES (PatientGrid.test.tsx) | -- | -- | NO |
| 111 | Due Date column header = "Due Date" | YES (PatientGrid.test.tsx) | -- | -- | NO |
| 112 | Time Interval column header = "Time Interval (Days)" | YES (PatientGrid.test.tsx) | -- | -- | NO |
| 113 | Due Date displays formatted date (not raw ISO) | -- | YES (visible in various tests) | -- | NO |
| 114 | Due Date column sorts chronologically | -- | -- | -- | **GAP** |

### 3.10 Edge Cases

| # | Use Case | Jest | Vitest | Cypress | Gap? |
|---|----------|------|--------|---------|------|
| 115 | addMonths: Jan 31 + 1 month (end-of-month overflow) | -- | -- | -- | **GAP** |
| 116 | addMonths: crossing year boundary (Dec --> Jan next year) | YES (12 months tests) | -- | -- | NO |
| 117 | Leap year: Feb 29 + 1 year | -- | -- | -- | **GAP** |
| 118 | baseDueDays=0 (not seeded but code handles) | -- | -- | -- | **GAP** |
| 119 | Concurrent edits: two users change tracking simultaneously | -- | -- | -- | **GAP** |
| 120 | Very large interval (999) + statusDate | -- | -- | -- | **GAP** |

### 3.11 Deployment / Seed Data

| # | Use Case | Tested? | Gap? |
|---|----------|---------|------|
| 121 | baseDueDays seeded for all statuses in prisma/seed.ts | Manual (seed file reviewed) | **GAP: No automated seed verification** |
| 122 | DueDayRules seeded for all tracking combinations | Manual (seed file reviewed) | **GAP: No automated seed verification** |
| 123 | Render deploy seeds baseDueDays correctly | Manual (production check) | **GAP: No automated verification** |

---

## 4. Gap Summary

### 4.1 HIGH Priority Gaps (Missing tests for core logic)

| Gap ID | Description | Suggested Framework | Effort |
|--------|-------------|---------------------|--------|
| G8-01 | `isTimeIntervalEditable()` has no Vitest unit tests (PatientGrid.tsx:51-63). This function has 4 conditions but no dedicated unit test. | Vitest | LOW |
| G8-02 | API handler: statusDate change triggers recalculation (dataHandlers.ts:394-423). Only measureStatus change is tested in data.routes.test.ts. | Jest | LOW |
| G8-03 | API handler: tracking1/tracking2 change triggers recalculation. Not tested at API level. | Jest | LOW |
| G8-04 | API handler: status change to terminal clears dueDate+timeIntervalDays. Not tested at API level. | Jest | LOW |
| G8-05 | Depression "Screening complete" + past date overdue behavior. baseDueDays=365, so it SHOULD go overdue. Not tested in Vitest or Cypress (only a log statement in T7-2). | Vitest + Cypress | LOW |

### 4.2 MEDIUM Priority Gaps (Missing DueDayRule coverage)

| Gap ID | Description | Suggested Framework | Effort |
|--------|-------------|---------------------|--------|
| G8-06 | "Screening discussed" DueDayRules for months 2, 4, 5, 7, 8, 9, 10 not tested anywhere (only 1, 3, 6, 11 tested). Note: these use Priority 1 month-matching in code, not DB lookup; still, interval correctness for all month values is untested. | Jest | LOW |
| G8-07 | "Scheduled call back - BP at goal" DueDayRules not tested in Jest (only "not at goal" is tested). The Cypress row-color-comprehensive covers some via E2E. | Jest | LOW |
| G8-08 | "Chronic diagnosis invalid" + "Attestation not sent" = 14d not tested in Jest (only "resolved" tested). | Jest | LOW |
| G8-09 | baseDueDays=14 (ACE/ARB prescribed), =30 (Will call later), =42 (Diabetic eye exam discussed) not tested with specific status codes in Jest. | Jest | LOW |

### 4.3 LOW Priority Gaps (Edge cases, nice-to-have)

| Gap ID | Description | Suggested Framework | Effort |
|--------|-------------|---------------------|--------|
| G8-10 | `addMonths()` end-of-month overflow: Jan 31 + 1 month should produce Feb 28 (or Mar 3). JavaScript `setUTCMonth` may roll over. | Jest | LOW |
| G8-11 | Leap year edge: Feb 29 2028 + 12 months = Feb 28 2029. | Jest | LOW |
| G8-12 | baseDueDays=0: code will calculate dueDate = statusDate. Unlikely in production but no guard. | Jest | LOW |
| G8-13 | Time interval validation: reject negative number (-5). Code uses `parsed < 1` check so it should reject; not tested. | Cypress | LOW |
| G8-14 | Time interval validation: reject decimal (3.5). `parseInt` truncates to 3, so it may silently accept. | Cypress | LOW |
| G8-15 | Due Date column sort order (chronological). No dedicated test. | Cypress | LOW |
| G8-16 | Seed data integrity: automated test that baseDueDays values match expected for all statuses after seeding. | Jest (integration) | MEDIUM |
| G8-17 | Playwright E2E: no Playwright tests exist for any due date scenario. All E2E coverage is via Cypress. | Playwright | MEDIUM |

---

## 5. Coverage by Framework

### Jest (Backend) -- dueDateCalculator.test.ts: 37 tests

| Category | Tests | Notes |
|----------|-------|-------|
| Null inputs | 3 | statusDate=null, measureStatus=null, both=null |
| HgbA1c (P2) | 21 | 3 statuses x (null, empty, 1mo, 3mo, 6mo, 12mo, invalid) |
| Screening discussed (P1) | 5 | In 3 Mo, null tracking1, baseDueDays fallback, In 1 Mo, In 11 Mo, non-matching |
| DueDayRule (P3) | 2 | Colonoscopy match, no match falls to P4 |
| Priority ordering | 2 | P3 overrides P4, P3 miss falls to P4 |
| BP callback (P3) | 8 | 2 wks (standalone) + 7 it.each entries (1-8 wks) |
| CDX Attestation | 1 | Attestation not sent = 14d |
| baseDueDays edge | 5 | 1d, 7d, 365d, null, Depression Screening complete null |
| Depression Screening | 2 | Visit scheduled 1d, Screening complete null |

**Strengths:** Excellent coverage of the 4-priority calculation system. All HgbA1c month variants tested.
**Weaknesses:** Only "BP not at goal" tested (not "at goal"). Only CDX "resolved" tested (not "invalid"). Many DueDayRule tracking values untested individually (months 2, 4, 5, 7-10). No addMonths edge cases.

### Jest (Backend) -- data.routes.test.ts: ~5 due-date tests

| Test | What It Covers |
|------|---------------|
| Manual timeIntervalDays edit for non-dropdown status | canEditInterval=true path |
| Blocks manual edit for dropdown status | canEditInterval=false path |
| Recalculates dueDate when measureStatus changes | dueDateFieldsChanged=true path |
| Recalculates statusDatePrompt (includes calculateDueDate mock) | Ancillary |

**Weaknesses:** Missing tests for statusDate change, tracking1 change, tracking2 change as recalculation triggers. Missing test for terminal status clearing dueDate.

### Vitest (Frontend) -- statusColors.test.ts: ~64 tests

| Category | Tests | Notes |
|----------|-------|-------|
| isRowOverdue basic | 5 | null, undefined, past, today, future |
| Terminal non-overdue | 7 | 2 gray, 5 purple statuses |
| CDX attestation | 2 | sent=false, not sent=true |
| Boundary tests | 6 | yesterday, today, tomorrow, 7d exact, 7d+1, 1d exact, 1d+1 |
| Timezone boundary | 1 | Local date comparison |
| getRowStatusColor | ~25 | All color categories, overdue priority, parameterized |
| Depression colors | 8 | All Depression statuses + overdue variants |

**Strengths:** Excellent boundary testing. All terminal statuses verified. Parameterized overdue tests for every GREEN, BLUE, YELLOW status.
**Weaknesses:** No unit test for `isTimeIntervalEditable()`.

### Cypress E2E -- time-interval.cy.ts: 22 tests

| Category | Tests | Notes |
|----------|-------|-------|
| Not editable for dropdown statuses | 3 | Screening discussed, HgbA1c ordered, BP not at goal |
| Editable for standard statuses | 2 | AWV completed, Patient called to schedule AWV |
| Manual override | 3 | Override recalculates dueDate, lower bound (1), upper bound (1000) |
| Validation | 4 | Non-numeric, zero, >1000, empty |
| Dropdown-controlled interval | 3 | HgbA1c T2=3mo, Screening discussed T1=In 3 Mo, HgbA1c T2 change |
| Terminal status read-only | 3 | Not Addressed, Patient declined AWV, No longer applicable |
| Depression interval | 2 | Called to schedule (7d), Screening complete (no interval) |
| Edge cases | 2 | Status transition clears interval, BP dropdown options |

**Strengths:** Very thorough editability testing. Good validation coverage.
**Weaknesses:** No test for negative numbers, decimals.

### Cypress E2E -- row-color-comprehensive.cy.ts: ~50 due-date tests

| Section | Tests | Notes |
|---------|-------|-------|
| 5A: Past date --> overdue | 11 | Various statuses + DueDayRule combos |
| 5B: Today --> NOT overdue | 5 | AWV, BCS, HgbA1c, Vaccination |
| 5C: Terminal NEVER overdue | 5 | Declined, N/A, Unnecessary, Contraindicated, CDX+Attestation sent |
| 5D: No baseDueDays --> no overdue | 2 | Not Addressed, HgbA1c no T2 |
| 6: Time interval editing | 2 | Extend interval clears overdue |
| 9C: Due date exact value | 2 | Due date = today + baseDueDays, recalculation on date change |
| 9D: Depression overdue | 1 | Visit scheduled + past |
| 9E: CDX boundary | 2 | Recent date not overdue, far past overdue |
| Tracking sections (2A-2H) | ~20 | Various tracking + overdue combos |

**Strengths:** Comprehensive E2E validation of overdue transitions across all quality measures. Tests both past and today dates.
**Weaknesses:** No Playwright coverage at all.

---

## 6. Recommendations

### Immediate (Before Next Release)

1. **G8-01:** Add Vitest unit tests for `isTimeIntervalEditable()` in PatientGrid.test.tsx. Test all 4 conditions: no data, no statusDate, null timeIntervalDays, dropdown status. (~4 new tests)

2. **G8-02/03/04:** Add Jest API tests in data.routes.test.ts for:
   - statusDate change triggers recalculation
   - tracking1 change triggers recalculation
   - tracking2 change triggers recalculation
   - Status change to terminal clears dueDate and timeIntervalDays
   (~4 new tests)

3. **G8-05:** Add explicit test for Depression "Screening complete" overdue behavior. Currently baseDueDays=365 in seed, so it CAN go overdue -- but no test verifies this. Add to statusColors.test.ts and row-color-comprehensive.cy.ts. (~2 new tests)

### Next Sprint

4. **G8-06/07/08/09:** Fill remaining DueDayRule and baseDueDays unit test gaps in dueDateCalculator.test.ts. Add parameterized tests for all untested month values (2, 4, 5, 7-10), BP at goal, CDX invalid. (~15 new tests)

5. **G8-10/11:** Add addMonths edge case tests: end-of-month overflow (Jan 31 + 1 mo) and leap year boundary. (~3 new tests)

6. **G8-13/14:** Add Cypress validation tests for negative numbers and decimal values in time interval editor. (~2 new tests)

### Backlog

7. **G8-16:** Create a seed data integrity test that verifies all expected baseDueDays and DueDayRule values after running prisma seed. This guards against accidental seed changes breaking due date calculations.

8. **G8-17:** Consider adding a Playwright E2E test for one critical due date flow (e.g., set status, enter date, verify dueDate appears, change tracking, verify recalculation). Currently all E2E is Cypress-only.

---

## 7. Test Count Summary

| Framework | Existing Due-Date Tests | Gaps Identified | Recommended New Tests |
|-----------|------------------------|-----------------|----------------------|
| Jest (backend) | 42 (37 calculator + 5 API) | 8 gaps (G8-02/03/04/06/07/08/09/10/11) | ~22 |
| Vitest (frontend) | ~64 (statusColors) + ~20 (PatientGrid) | 2 gaps (G8-01/05) | ~6 |
| Cypress E2E | ~72 (time-interval + row-color) | 3 gaps (G8-05/13/14) | ~4 |
| Playwright E2E | 0 | 1 gap (G8-17) | ~3 |
| **TOTAL** | **~198** | **14 unique gaps** | **~35 new tests** |

---

## 8. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| addMonths overflow (Jan 31 + 1 mo) silently produces wrong date | HIGH (wrong due date displayed) | LOW (rare date) | Add unit test (G8-10) |
| API doesn't recalculate when tracking2 changes | HIGH (stale dueDate) | LOW (E2E covers it) | Add API test (G8-03) |
| Seed data changed without updating calculator expectations | HIGH (all due dates wrong) | MEDIUM | Add seed integrity test (G8-16) |
| Terminal status doesn't clear dueDate on status change | MEDIUM (confusing UI) | LOW (E2E covers it) | Add API test (G8-04) |
| isTimeIntervalEditable false positive allows editing dropdown-controlled interval | HIGH (data corruption) | LOW (Cypress covers it) | Add Vitest unit test (G8-01) |
