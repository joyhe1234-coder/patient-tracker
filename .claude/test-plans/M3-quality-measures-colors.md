# M3 Quality Measures, Row Colors & Cascading — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.2
**Spec:** `.claude/specs/test-quality-measures-colors/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `statusColors.test.ts` | Vitest | 54 | Status arrays, isChronicDxAttestationSent, isRowOverdue, getRowStatusColor |
| `dropdownConfig.test.ts` | Vitest | 52 | Cascading mappings, helper functions, Depression Screening config |
| `dueDateCalculator.test.ts` | Jest | 17 | Due date calculation, HgbA1c tracking2, DueDayRule, baseDueDays |
| `statusDatePromptResolver.test.ts` | Jest | 63 | Date prompt resolution for all statuses |
| `row-color-comprehensive.cy.ts` | Cypress | 179 | All 14 QMs x statuses, tracking, date/overdue, time interval |
| `row-color-roles.cy.ts` | Cypress | 43 | 8 core scenarios x 3 roles |
| `cascading-dropdowns.cy.ts` | Cypress | 55 | Dropdown cascading, auto-fill, field clearing |
| `sorting-filtering.cy.ts` | Cypress | 63 | Row color verification subset, overdue filter |
| `time-interval.cy.ts` | Cypress | 16 | Editability, override, validation |
| **Total** | | **~542** | |

---

## Planned New Tests (~37 tests)

### Tier 1 — Must Have (24 tests)

#### T1-1: Depression Screening Color Mapping (6 Vitest tests)

**Gap:** Depression Screening was recently added (v4.12.0) with +10 Vitest tests, but the spec identifies missing individual status-to-color assertions at the unit level and missing multi-role E2E coverage.

**Spec refs:** REQ-M3-2 (AC-M3-2.1 through AC-M3-2.11), GAP-2.1

**File:** `frontend/src/config/statusColors.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `Depression Screening "Called to schedule" maps to blue` | `getRowStatusColor({ measureStatus: 'Called to schedule' })` → `row-status-blue` |
| 2 | `Depression Screening "Visit scheduled" maps to yellow` | `getRowStatusColor({ measureStatus: 'Visit scheduled' })` → `row-status-yellow` |
| 3 | `Depression Screening "Screening complete" maps to green (no "d")` | Verify `Screening complete` (no "d") ≠ `Screening completed` (with "d"), both green |
| 4 | `Depression Screening "Called to schedule" overdue turns red` | Row with dueDate in past → `row-status-overdue` overrides blue |
| 5 | `Depression Screening "Screening complete" never turns red (baseDueDays=null)` | No dueDate assigned → `isRowOverdue` returns false regardless of date |
| 6 | `Depression Screening terminal statuses not overdue despite past dueDate` | `Patient declined`, `Screening unnecessary`, `No longer applicable` with past dueDate → NOT overdue |

**Pattern:** Extend the existing `describe('getRowStatusColor')` block with a new `describe('Depression Screening')`.

---

#### T1-2: Chronic DX Attestation Cascade (8 Vitest tests)

**Gap:** The 3-way logic (green/orange/red) for Chronic DX with attestation tracking is partially covered but not exhaustive. The spec calls for boundary testing of all combinations.

**Spec refs:** REQ-M3-3 (AC-M3-3.6 through AC-M3-3.8), GAP-3.5

**File:** `frontend/src/config/statusColors.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `Chronic DX resolved + Attestation sent = green` | tracking1='Attestation sent' → `row-status-green` |
| 2 | `Chronic DX resolved + Attestation sent + past dueDate = still green (never overdue)` | Attestation sent overrides overdue completely |
| 3 | `Chronic DX resolved + Attestation not sent + future dueDate = orange` | No attestation, not overdue → `row-status-orange` |
| 4 | `Chronic DX resolved + Attestation not sent + past dueDate = red` | No attestation + overdue → `row-status-overdue` |
| 5 | `Chronic DX resolved + null tracking1 + future dueDate = orange` | null tracking1 treated same as "Attestation not sent" |
| 6 | `Chronic DX resolved + null tracking1 + past dueDate = red` | null tracking1 + overdue → red |
| 7 | `Chronic DX invalid + Attestation sent = green` | Same logic applies to "Chronic diagnosis invalid" |
| 8 | `Chronic DX resolved + Attestation not sent + dueDate = today = orange (boundary)` | dueDate === today → NOT overdue → stays orange |

**Pattern:** Use `vi.useFakeTimers()` + `vi.setSystemTime()` for deterministic date comparisons.

---

#### T1-3: Overdue Boundary Conditions (4 Vitest tests)

**Gap:** Overdue logic uses strict less-than (`dueDate < today`). Boundary between "overdue" and "not overdue" must be tested explicitly for both `isRowOverdue()` and the visual color.

**Spec refs:** REQ-M3-3 (AC-M3-3.3, AC-M3-3.4), GAP-3.6

**File:** `frontend/src/config/statusColors.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `isRowOverdue returns false when dueDate = today (strict less-than)` | Boundary: exact today → NOT overdue |
| 2 | `isRowOverdue returns true when dueDate = yesterday` | Boundary: one day past → IS overdue |
| 3 | `isRowOverdue returns false when dueDate is null` | No dueDate → never overdue |
| 4 | `getRowStatusColor returns blue (not red) when dueDate = today for blue status` | End-to-end: blue status + dueDate=today → stays blue |

---

#### T1-4: Cascading Dropdown Clears (6 Vitest tests)

**Gap:** The cascading field clearing logic in `cascadingFields.ts` is tested for Request Type and Quality Measure cascade levels, but Measure Status cascade and Depression Screening cascade are not explicitly tested.

**Spec refs:** REQ-M3-4 (AC-M3-4.1 through AC-M3-4.4), GAP-4.1 through GAP-4.4

**File:** `frontend/src/components/grid/utils/__tests__/cascadingFields.test.ts` (extend existing — 16 tests already present)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `changing measureStatus clears statusDate, tracking1, tracking2, dueDate, timeIntervalDays` | Measure Status cascade clears all downstream fields |
| 2 | `changing requestType clears qualityMeasure (unless auto-fill), measureStatus, and all downstream` | Request Type cascade is complete |
| 3 | `changing qualityMeasure clears measureStatus and all downstream` | Quality Measure cascade is complete |
| 4 | `notes field is NOT cleared by any cascade` | Notes preserved across all cascade levels |
| 5 | `Depression Screening fields follow identical cascade rules` | Set Depression Screening row, change QM → all fields cleared |
| 6 | `row color becomes white after cascade clears measureStatus` | After cascade, measureStatus=null → `getRowStatusColor` returns `row-status-white` |

---

### Tier 2 — Should Have (13 tests)

#### T2-1: Tracking Field Validation per Status (5 Vitest tests)

**Gap:** `dropdownConfig.test.ts` has ~11 tracking-related assertions for `getTracking1OptionsForStatus()`, but doesn't verify Chronic DX attestation options, tracking options shown for wrong statuses, or tracking2 options per measure.

**Spec refs:** REQ-M3-6 (tracking field correctness), execution plan item #14

**File:** `frontend/src/config/dropdownConfig.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `Chronic DX "resolved" returns Attestation tracking1 options` | ["Attestation sent", "Attestation not sent"] |
| 2 | `tracking1 options for non-matching status returns null` | e.g., "AWV completed" has no tracking1 options |
| 3 | `HgbA1c statuses return tracking2 options (Goal/Year)` | HgbA1c-specific tracking2 populated |
| 4 | `statuses without tracking2 return null` | e.g., AWV, Depression Screening have no tracking2 |
| 5 | `Depression Screening "Screening complete" has no tracking1 or tracking2` | Terminal status, both tracking fields null |

**Already covered:** Depression Screening "no Tracking #1 options for any status" (dropdownConfig.test.ts L118-123).

---

#### T2-2: Due Date Calculation Chain (8 Jest tests)

**Gap:** `dueDateCalculator.test.ts` has 17 tests but misses Depression Screening baseDueDays and Chronic DX attestation DueDayRule.

**Spec refs:** REQ-M3-5 (AC-M3-5.9 through AC-M3-5.11), GAP-5.3, GAP-5.5

**File:** `backend/src/services/__tests__/dueDateCalculator.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `Depression Screening "Called to schedule" → statusDate + 7 days` | baseDueDays=7 for Called to schedule |
| 2 | `Depression Screening "Visit scheduled" → statusDate + 1 day` | baseDueDays=1 for Visit scheduled |
| 3 | `Depression Screening "Screening complete" → null dueDate (baseDueDays=null)` | Terminal status, no renewal |
| 4 | `Depression Screening "Patient declined" → null dueDate` | Terminal, baseDueDays=null |
| 5 | `Chronic DX "Attestation not sent" DueDayRule = 14 days` | DueDayRule override for attestation tracking |
| 6 | `Due date is null when statusDate is null regardless of baseDueDays` | Null guard: no statusDate → no dueDate |
| 7 | `HgbA1c tracking2 "Goal reached" DueDayRule overrides baseDueDays` | tracking2 value triggers different due date |
| 8 | `Explicit timeIntervalDays overrides baseDueDays calculation` | timeIntervalDays field takes priority when set |

---

## Tests NOT Planned (Deferred to Tier 3)

| Gap | Reason Deferred |
|-----|----------------|
| All 40+ blue statuses individually tested (GAP-1.2) | Parameterized exhaustiveness — 4 already covered, low incremental value |
| All 14 green statuses individually (GAP-1.1) | Same — 6 already covered |
| Depression Screening multi-role E2E (GAP-2.1, GAP-11.1) | row-color-roles.cy.ts already has 43 tests; adding 2 scenarios per role is low priority |
| N/A display and non-editability (GAP-7.1) | Covered by row-color-comprehensive |
| HgbA1c/BP prompt text verification (GAP-7.2-7.3) | Cosmetic, not functional |
| Cervical Cancer month dropdown options (GAP-7.4) | dropdownConfig.test.ts already covers the options |
| Date prompt in grid UI (GAP-10.2) | StatusDateRenderer.test.tsx covers prompt display |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `frontend/src/config/statusColors.test.ts` | Extend | +18 | TODO |
| `frontend/src/components/grid/utils/__tests__/cascadingFields.test.ts` | Extend | +6 | TODO |
| `frontend/src/config/dropdownConfig.test.ts` | Extend | +5 | TODO |
| `backend/src/services/__tests__/dueDateCalculator.test.ts` | Extend | +8 | TODO |
| **Total** | | **37** | |

---

## Done Criteria

- [ ] All 37 tests written and passing
- [ ] No regressions in existing M3 tests (~542 baseline)
- [ ] All 7 Depression Screening color mappings verified at unit level
- [ ] Chronic DX attestation 3-way cascade (green/orange/red) fully tested
- [ ] Overdue boundary (today vs yesterday) explicitly passing
- [ ] Cascading clears verified for all 3 levels (RT→QM→MS)
- [ ] Tracking field validation: Depression Screening, Chronic DX, HgbA1c tracking options verified
- [ ] Depression Screening due date calculation verified
- [ ] HgbA1c tracking2 DueDayRule and timeIntervalDays override verified
- [ ] Full 4-layer pyramid passes
