# Test Gap Analysis — Master Summary

**Date:** 2026-03-02
**Total Requirement Areas Analyzed:** 20
**Total Individual Reports:** 20 (in `.claude/test-gap-reports/`)

---

## Overall System Test Health

| Metric | Value |
|--------|-------|
| **Total Automated Tests** | ~3,725+ |
| **Total Use Cases Identified** | ~1,100+ |
| **Average Coverage** | ~84% |
| **Total Gaps Found** | ~155 |
| **Critical/High Gaps** | ~30 |
| **Medium Gaps** | ~40 |
| **Low/Very Low Gaps** | ~85 |

---

## Per-Requirement Coverage Summary

| # | Requirement Area | Tests | Use Cases | Coverage | Critical/High Gaps | Report |
|---|-----------------|-------|-----------|----------|-------------------|--------|
| 1 | Authentication & Security | 252 | 62 | **89%** | 1 (ChangePasswordModal zero tests) | [01](01-authentication-security.md) |
| 2 | Data Loading & Display | ~80 | 35 | **69%** | 6 (loading spinner, error state, phone format) | [02](02-data-loading-display.md) |
| 3 | Cell Editing & Conflict | 198 | ~50 | **75%** | 4 (Tab nav, rapid edits, XSS, time interval validation) | [03](03-cell-editing-conflict.md) |
| 4 | Sorting | 28 | ~20 | **70%** | 2 (sort indicator on edit, postSortRows logic) | [04](04-sorting.md) |
| 5 | Status Filter Bar | 282 | 141 | **93%** | 0 (1 medium only) | [05](05-status-filter-bar.md) |
| 6 | Row Status Colors | 358 | ~100 | **95%+** | 0 (all low/very low) | [06](06-row-status-colors.md) |
| 7 | Cascading Dropdowns | 264 | ~40 | **82%** | 2 ((clear) cascade, role-based cascade) | [07](07-cascading-dropdowns.md) |
| 8 | Due Date Calculation | 198 | ~45 | **80%** | 5 (isTimeIntervalEditable, API recalc triggers) | [08](08-due-date-calculation.md) |
| 9 | Duplicate Detection | 95 | 112 | **82%** | 2 (PUT 409 on RT change, toast assertion) | [09](09-duplicate-detection.md) |
| 10 | Row Operations (Add/Delete) | 89 | 42 | **78%** | 1 (stale Playwright selectors) | [10](10-row-operations.md) |
| 11 | Status Bar | 29 | 19 | **85%** | 0 (regression plan references missing test) | [11](11-status-bar.md) |
| 12 | Tracking Fields | 99 | 25 | **80%** | 1 (spec references unimplemented Tracking #3) | [12](12-tracking-fields.md) |
| 13 | Time Interval | 72 | 74 | **65%** | 5 (isTimeIntervalEditable, valueSetter, negative/decimal) | [13](13-time-interval.md) |
| 14 | Import Pipeline | 1,436 | 178 | **96%** | 2 (XSS in column names, config load failure) | [14](14-import-pipeline.md) |
| 15 | Patient Management Page | 42 | ~20 | **90%** | 0 (1 medium: tab state persistence) | [15](15-patient-management-page.md) |
| 16 | Patient Assignment | 57 | ~30 | **82%** | 0 (3 medium: persistence, error retention, auto-assign) | [16](16-patient-assignment.md) |
| 17 | Patient Name Search | 67 | ~25 | **92%** | 0 (1 medium: Ctrl+F during cell edit) | [17](17-patient-name-search.md) |
| 18 | Insurance Group Filter | ~30 | ~25 | **75%** | 2 (filter persistence on physician switch, edge cases) | [18](18-insurance-group-filter.md) |
| 19 | Depression Screening | 33 | ~20 | **85%** | 1 (spec inconsistency: baseDueDays=365 vs null) | [19](19-depression-screening.md) |
| 20 | Bulk Patient Management | 145 | ~50 | **80%** | 4 (E2E assign/unassign/delete never complete, Toast untested) | [20](20-bulk-patient-management.md) |

---

## Top 15 Highest-Priority Gaps (Action Items)

### CRITICAL (Fix Immediately)

| # | Area | Gap | Impact | Est. Effort |
|---|------|-----|--------|-------------|
| 1 | R14 Import | **XSS injection in column names** — no test for `<script>` tags in file headers rendered in conflict UI | Security vulnerability | 1 hour |
| 2 | R19 Depression | **Spec inconsistency**: requirements say `baseDueDays=365` but design says `null` for "Screening complete" | Ambiguous overdue behavior | 30 min (clarify + fix) |

### HIGH (Fix Before Next Release)

| # | Area | Gap | Impact | Est. Effort |
|---|------|-----|--------|-------------|
| 3 | R1 Auth | **ChangePasswordModal has ZERO frontend tests** | Core auth feature untested | 2 hours |
| 4 | R20 Bulk Ops | **Full E2E Assign flow never completes** (opens modal but never confirms + verifies) | Critical user workflow | 1 hour |
| 5 | R20 Bulk Ops | **Full E2E Unassign flow never completes** | Critical user workflow | 1 hour |
| 6 | R20 Bulk Ops | **Full E2E Delete flow never completes** | Critical user workflow | 1 hour |
| 7 | R3 Cell Edit | **Tab navigation between cells** — zero E2E coverage for core data entry | Primary data entry method | 2 hours |
| 8 | R2 Data Load | **Loading spinner + error state + retry button** — zero tests | User sees broken UI on slow/failed loads | 1 hour |
| 9 | R8/R13 Due Date | **`isTimeIntervalEditable()` has zero unit tests** despite 4 branching conditions | Silent bugs in editability logic | 1 hour |
| 10 | R8 Due Date | **API handler only tests 1 of 4 recalculation triggers** (status change tested, not date/T1/T2 changes) | Due dates could silently not recalculate | 2 hours |
| 11 | R7 Cascading | **(clear) option cascade has zero tests** | Clearing fields may silently break | 1 hour |
| 12 | R18 Insurance | **Insurance filter doesn't persist after physician switch** (untested) | Real user workflow gap | 30 min |
| 13 | R10 Row Ops | **Playwright add-row.spec.ts has stale selectors** — tests may be silently passing/failing | False confidence in test suite | 1 hour |
| 14 | R13 Time Interval | **Negative/decimal input validation** not tested | Invalid data could be saved | 30 min |
| 15 | R20 Bulk Ops | **Toast component has zero tests** | No feedback verification | 30 min |

**Total estimated effort for top 15 gaps: ~16 hours**

---

## Documentation Issues Found

| Issue | Location | Fix |
|-------|----------|-----|
| Spec says 3 Screening options, code has 4 (Depression added) | R7 cascading spec | Update spec |
| Regression plan says 0% automation for Time Interval | Section 12 | Update to ~65% |
| Regression plan references non-existent smoke.spec.ts test | TC-10.1 | Fix reference |
| Spec references Tracking #3 which was never implemented | R12 tracking-fields spec AC-10 | Remove from spec |
| Test plan says 30 Cypress cascading tests, actual is 84 | Section 6 test count | Update count |
| TC-11.2 through TC-11.5 marked "Manual" but now automated | Tracking fields section | Update to "Automated" |

---

## Coverage by Framework

| Framework | Tests | Strongest Areas | Weakest Areas |
|-----------|-------|-----------------|---------------|
| **Jest (Backend)** | ~1,675 | Import pipeline (877), auth (112), routes (321) | API recalculation triggers, CLI scripts |
| **Vitest (Frontend)** | ~1,169 | StatusFilterBar (115), MainPage (76), PatientGrid (66) | ChangePasswordModal (0), loading/error states |
| **Playwright** | ~230 | Auth flows (23), import visual (22), bulk ops (28) | AG Grid interactions (deferred to Cypress) |
| **Cypress** | ~651 | Row colors (177+), cascading (61), import (48) | Bulk ops E2E completion, insurance edge cases |

---

## Recommendations

### Phase 1: Critical Security & Data Integrity (4 hours)
- [ ] Add XSS test for import column names
- [ ] Resolve Depression Screening baseDueDays inconsistency
- [ ] Add `isTimeIntervalEditable()` unit tests
- [ ] Add negative/decimal time interval validation tests

### Phase 2: Core Workflow Coverage (8 hours)
- [ ] Add ChangePasswordModal tests (8-10 tests)
- [ ] Complete Bulk Ops E2E flows (assign/unassign/delete through to verification)
- [ ] Add loading spinner + error state + retry tests
- [ ] Add Tab navigation E2E tests
- [ ] Add API recalculation trigger tests (date/T1/T2 changes)

### Phase 3: Edge Cases & Polish (8 hours)
- [ ] Fix stale Playwright add-row selectors
- [ ] Add (clear) cascade tests
- [ ] Add insurance filter persistence test
- [ ] Add Toast component tests
- [ ] Update stale regression plan documentation

### Phase 4: Documentation Cleanup (2 hours)
- [ ] Fix 6 documentation issues listed above
- [ ] Update REGRESSION_TEST_PLAN.md automation percentages
- [ ] Update TESTING.md test counts

**Total estimated effort: ~22 hours across 4 phases**
