# Test Gap Analysis: Requirement Area 7 -- Cascading Dropdowns

**Date:** 2026-03-02
**Analyst:** Claude (automated audit)
**Spec:** `.claude/specs/cascading-dropdowns/requirements.md`

---

## 1. Test Inventory Summary

| Framework | File | Test Count | Layer |
|-----------|------|-----------|-------|
| Vitest | `frontend/src/config/dropdownConfig.test.ts` | 53 | Unit -- config data integrity |
| Vitest | `frontend/src/components/grid/utils/__tests__/cascadingFields.test.ts` | 16 | Unit -- cascade clear logic |
| Vitest | `frontend/src/components/grid/hooks/__tests__/useGridCellUpdate.test.ts` | 15 | Unit -- hook integration (cascading flag, API call) |
| Jest | `backend/src/services/__tests__/statusDatePromptResolver.test.ts` | 66 | Unit -- date prompt text per status |
| Jest | `backend/src/services/__tests__/dueDateCalculator.test.ts` | 30 | Unit -- due date calc (HgbA1c T2, BP T1, Screening discussed) |
| Cypress | `frontend/cypress/e2e/cascading-dropdowns.cy.ts` | 84 | E2E -- full browser cascade chains |
| Playwright | (none) | 0 | E2E -- no dedicated spec |
| **Total** | | **264** | |

---

## 2. Complete Use-Case Matrix

### 2.1 Request Type -> Quality Measure Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.1.1 | RT dropdown has exactly 4 options (AWV, Chronic DX, Quality, Screening) | dropdownConfig: REQUEST_TYPES has 4 | -- | "Request Type dropdown has 4 options" | -- | COVERED |
| 2.1.2 | AWV auto-fills QM = "Annual Wellness Visit" | cascadingFields: auto-fills for AWV; dropdownConfig: getAutoFillQualityMeasure AWV | -- | "AWV auto-fills Quality Measure" | -- | COVERED |
| 2.1.3 | Chronic DX auto-fills QM = "Chronic Diagnosis Code" | cascadingFields: auto-fills for Chronic DX; dropdownConfig: getAutoFillQualityMeasure Chronic DX | -- | "Chronic DX auto-fills Quality Measure" | -- | COVERED |
| 2.1.4 | Quality shows 8 QM options | dropdownConfig: Quality maps to 8 | -- | "Quality shows 8 Quality Measure options" | -- | COVERED |
| 2.1.5 | Screening shows 4 QM options (incl. Depression Screening) | dropdownConfig: Screening maps to 4 | -- | "Screening shows 4 Quality Measure options" | -- | COVERED |
| 2.1.6 | Quality/Screening clears QM (multi-option types) | cascadingFields: clears QM for Quality/Screening | -- | (implicit in clearing tests) | -- | COVERED |
| 2.1.7 | QM options are alphabetically sorted | dropdownConfig: sorted QM for Quality/Screening | -- | -- | -- | PARTIAL (unit only) |
| 2.1.8 | Unknown/empty request type returns empty QM list | dropdownConfig: empty for unknown/empty | -- | -- | -- | COVERED (unit) |

**Note:** Requirements spec (AC-5) says "Screening shows 3 options" but code and Cypress test show 4 (Depression Screening was added). The spec is outdated.

### 2.2 Quality Measure -> Measure Status Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.2.1 | Annual Wellness Visit has 7 statuses | dropdownConfig: AWV statuses | -- | "AWV has 7 status options" | -- | COVERED |
| 2.2.2 | Diabetic Eye Exam has 8 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no explicit E2E |
| 2.2.3 | Colon Cancer Screening has 8 statuses | dropdownConfig: all QM have entries | -- | (implicit in Tracking T1 tests) | -- | PARTIAL |
| 2.2.4 | Breast Cancer Screening has 8 statuses | dropdownConfig: all QM have entries | -- | "Breast Cancer Screening has 8 status options" | -- | COVERED |
| 2.2.5 | Cervical Cancer Screening has 8 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E count verification |
| 2.2.6 | GC/Chlamydia Screening has 6 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E |
| 2.2.7 | Diabetic Nephropathy has 6 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E |
| 2.2.8 | Hypertension Management has 7 statuses | dropdownConfig: all QM have entries | -- | (implicit in BP tests) | -- | PARTIAL |
| 2.2.9 | ACE/ARB in DM or CAD has 6 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E |
| 2.2.10 | Vaccination has 6 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E |
| 2.2.11 | Diabetes Control has 6 statuses | dropdownConfig: all QM have entries | -- | (implicit in HgbA1c tests) | -- | PARTIAL |
| 2.2.12 | Annual Serum K&Cr has 5 statuses | dropdownConfig: all QM have entries | -- | -- | -- | GAP: no E2E |
| 2.2.13 | Chronic Diagnosis Code has 5 statuses | dropdownConfig: Chronic DX unique statuses | -- | "Chronic Diagnosis Code has 5 status options" | -- | COVERED |
| 2.2.14 | Depression Screening has 7 statuses | dropdownConfig: Depression Screening 7 statuses | -- | "Depression Screening has 7 status options" | -- | COVERED |
| 2.2.15 | Every QM has "Not Addressed" as first status | dropdownConfig: every QM first status is Not Addressed | -- | -- | -- | COVERED (unit) |
| 2.2.16 | Unknown QM returns ["Not Addressed"] | dropdownConfig: unknown returns Not Addressed | -- | -- | -- | COVERED (unit) |
| 2.2.17 | All 14 QMs have config entries (registry completeness) | dropdownConfig: all measures across all RT have status entries | -- | -- | -- | COVERED (unit) |

### 2.3 Measure Status -> Tracking #1 Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.3.1 | Colon cancer screening ordered -> T1 dropdown (Colonoscopy, Sigmoidoscopy, Cologuard, FOBT) | dropdownConfig: STATUS_TO_TRACKING1 colon | -- | (implicit in TC-6.10) | -- | COVERED |
| 2.3.2 | Colon cancer screening completed -> T1 dropdown (same 4 options) | dropdownConfig: STATUS_TO_TRACKING1 colon completed | -- | -- | -- | GAP: no E2E for completed tracking |
| 2.3.3 | Breast cancer Screening test ordered -> T1 dropdown (Mammogram, Breast Ultrasound, Breast MRI) | dropdownConfig: STATUS_TO_TRACKING1 breast | -- | "Screening test ordered shows Tracking #1 options" | -- | COVERED |
| 2.3.4 | Breast cancer Screening test completed -> T1 dropdown (same 3 options) | dropdownConfig: STATUS_TO_TRACKING1 breast completed | -- | -- | -- | GAP: no E2E for completed tracking |
| 2.3.5 | BP not at goal -> T1 dropdown (Call every 1-8 wks) | dropdownConfig: BP callback 8 options | -- | "Tracking #1 shows call interval dropdown" | -- | COVERED |
| 2.3.6 | BP at goal -> T1 dropdown (Call every 1-8 wks) | dropdownConfig: BP at goal 8 options | -- | -- | -- | GAP: no E2E for BP at goal T1 |
| 2.3.7 | Chronic diagnosis resolved -> T1 dropdown (Attestation not sent/sent) | dropdownConfig: chronic resolved attestation | -- | "Chronic diagnosis resolved shows attestation options" | -- | COVERED |
| 2.3.8 | Chronic diagnosis invalid -> T1 dropdown (Attestation not sent/sent) | dropdownConfig: chronic invalid attestation | -- | -- | -- | GAP: no E2E for invalid attestation |
| 2.3.9 | Screening discussed -> T1 dropdown (In 1-11 Months) | dropdownConfig: Screening discussed 11 months | -- | "Cervical Cancer Tracking #1 shows month options" (TC-11.6) | -- | COVERED |
| 2.3.10 | Statuses without tracking -> T1 returns null (N/A) | dropdownConfig: returns null for Not Addressed, AWV completed, Patient declined | -- | "Tracking #1 shows N/A" (TC-11.2, T8-1) | -- | COVERED |
| 2.3.11 | N/A tracking cell is non-editable | -- | -- | "Tracking #1 N/A cell is not editable" (TC-11.2) | -- | COVERED |
| 2.3.12 | HgbA1c statuses -> T1 is free text (HgbA1c value) | -- | -- | "Tracking #1 accepts free text (HgbA1c value)" (TC-11.4) | -- | COVERED |

### 2.4 Tracking #1 -> Tracking #2 Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.4.1 | HgbA1c statuses -> T2 is month dropdown (12 options) | -- | dueDateCalculator: HgbA1c require T2 | "Tracking #2 has 12 month options" (TC-11.3) | -- | COVERED |
| 2.4.2 | BP statuses -> T2 is free text (BP reading) | -- | -- | "Tracking #2 accepts BP reading free text" (TC-11.5) | -- | COVERED |
| 2.4.3 | Other statuses -> T2 behavior (text or N/A) | -- | -- | -- | -- | GAP: no explicit test |
| 2.4.4 | T2 month selection triggers due date calculation | -- | dueDateCalculator: HgbA1c + T2 month pattern | "selecting Tracking #2 calculates due date" | -- | COVERED |

### 2.5 Cascading Field Clearing

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.5.1 | RT change clears QM (unless auto-fill), MS, SD, T1, T2, DD, TI | cascadingFields: RT clears all downstream | -- | "changing Request Type clears Quality Measure and downstream" | -- | COVERED |
| 2.5.2 | QM change clears MS, SD, T1, T2, DD, TI (but NOT QM itself) | cascadingFields: QM clears downstream, not QM | -- | "changing Quality Measure clears Measure Status" | -- | COVERED |
| 2.5.3 | MS change clears SD, T1, T2, DD, TI (but NOT MS or QM) | cascadingFields: MS clears downstream, not MS or QM | -- | "TC-6.10: changing Measure Status clears..." | -- | COVERED |
| 2.5.4 | Notes are NEVER cleared by cascading | cascadingFields: returns empty for notes change | -- | "TC-6.10: Notes should be PRESERVED" | -- | COVERED |
| 2.5.5 | Non-cascading fields (notes, statusDate, tracking1, memberName) return empty payload | cascadingFields: empty payload for non-cascading fields | -- | -- | -- | COVERED (unit) |
| 2.5.6 | setDataValue called for each cleared field (AG Grid UI update) | cascadingFields: setDataValue assertions for each field | -- | -- | -- | COVERED (unit) |
| 2.5.7 | isCascadingUpdateRef prevents duplicate API calls during cascade | useGridCellUpdate: does nothing when isCascadingUpdateRef is true | -- | -- | -- | COVERED (unit) |
| 2.5.8 | isCascadingUpdateRef is reset in finally block (even on error) | useGridCellUpdate: always resets in finally block | -- | -- | -- | COVERED (unit) |

### 2.6 Cascade with (clear) Option

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.6.1 | Selecting (clear)/"" on RT clears all downstream | cascadingFields: handles null/empty correctly | -- | -- | -- | GAP: no E2E test for (clear) selection |
| 2.6.2 | Selecting (clear) on QM clears downstream | -- | -- | -- | -- | GAP: no test at any level |
| 2.6.3 | Selecting (clear) on MS clears downstream | -- | -- | -- | -- | GAP: no test at any level |

### 2.7 Status Date Prompt Text Changes

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.7.1 | AWV statuses have correct date prompts (5 prompts) | -- | statusDatePromptResolver: all AWV prompts | -- | -- | COVERED (unit) |
| 2.7.2 | Diabetic Eye Exam statuses have correct prompts (5 prompts) | -- | statusDatePromptResolver: all DiabeticEye prompts | -- | -- | COVERED (unit) |
| 2.7.3 | Screening statuses have correct prompts (7 prompts) | -- | statusDatePromptResolver: all Screening prompts | -- | -- | COVERED (unit) |
| 2.7.4 | Depression Screening prompts (3 prompts) | -- | statusDatePromptResolver: Called/Visit/Complete | -- | -- | COVERED (unit) |
| 2.7.5 | GC/Chlamydia prompts (3 prompts) | -- | statusDatePromptResolver: GC prompts | -- | -- | COVERED (unit) |
| 2.7.6 | Diabetic Nephropathy prompts (2 prompts) | -- | statusDatePromptResolver: DN prompts | -- | -- | COVERED (unit) |
| 2.7.7 | Hypertension/BP prompts (4 prompts) | -- | statusDatePromptResolver: BP prompts | -- | -- | COVERED (unit) |
| 2.7.8 | ACE/ARB prompts (2 prompts) | -- | statusDatePromptResolver: ACE prompts | -- | -- | COVERED (unit) |
| 2.7.9 | Vaccination prompts (3 prompts) | -- | statusDatePromptResolver: Vaccination prompts | -- | -- | COVERED (unit) |
| 2.7.10 | Diabetes Control HgbA1c prompts (3 prompts) | -- | statusDatePromptResolver: HgbA1c prompts | -- | -- | COVERED (unit) |
| 2.7.11 | Annual Serum K&Cr prompts (2 prompts) | -- | statusDatePromptResolver: Lab prompts | -- | -- | COVERED (unit) |
| 2.7.12 | Chronic Diagnosis prompts (3 prompts) | -- | statusDatePromptResolver: Chronic prompts | -- | -- | COVERED (unit) |
| 2.7.13 | Common decline prompts (3 prompts) | -- | statusDatePromptResolver: Decline prompts | -- | -- | COVERED (unit) |
| 2.7.14 | Common ending prompts (3 prompts) | -- | statusDatePromptResolver: Ending prompts | -- | -- | COVERED (unit) |
| 2.7.15 | Special tracking1 overrides (Patient deceased -> Date of Death, Patient in hospice -> Date Reported) | -- | statusDatePromptResolver: tracking1 overrides | -- | -- | COVERED (unit) |
| 2.7.16 | Prompt visible in UI after status change | -- | -- | -- | -- | GAP: no E2E for prompt display |

### 2.8 Tracking Prompt Labels (UI)

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.8.1 | Colon cancer screening ordered -> T1 shows "Select screening type" | -- | -- | "Colon cancer screening shows Select screening type" | -- | COVERED |
| 2.8.2 | Breast cancer Screening test ordered -> T1 shows "Select test type" | -- | -- | "Breast Cancer Screening test ordered shows Select test type" | -- | COVERED |
| 2.8.3 | Chronic diagnosis resolved -> T1 shows "Select status" | -- | -- | "Chronic diagnosis resolved shows Select status" | -- | COVERED |
| 2.8.4 | Screening discussed -> T1 shows "Select time period" | -- | -- | "Screening discussed shows Select time period" | -- | COVERED |
| 2.8.5 | HgbA1c ordered -> T1 shows "HgbA1c value" | -- | -- | "HgbA1c ordered shows HgbA1c value prompt" | -- | COVERED |
| 2.8.6 | BP not at goal -> T2 shows BP reading prompt | -- | -- | "BP tracking #2 shows correct prompt label" | -- | COVERED |

### 2.9 Row Color Integration with Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.9.1 | AWV completed -> green row | -- | -- | "AWV completed shows green row color" | -- | COVERED |
| 2.9.2 | AWV scheduled -> blue row | -- | -- | "AWV scheduled shows blue row color" | -- | COVERED |
| 2.9.3 | Patient declined AWV -> purple row | -- | -- | "Patient declined AWV shows purple row color" | -- | COVERED |
| 2.9.4 | Breast cancer Screening test completed -> green row | -- | -- | "Screening test completed shows green row" | -- | COVERED |
| 2.9.5 | Chronic diagnosis resolved -> orange row | -- | -- | "Chronic diagnosis resolved shows orange row" | -- | COVERED |
| 2.9.6 | Chronic resolved + Attestation sent -> green row | -- | -- | "Attestation sent -> GREEN" | -- | COVERED |
| 2.9.7 | Chronic resolved + Attestation not sent -> orange row | -- | -- | "Attestation not sent -> ORANGE" | -- | COVERED |
| 2.9.8 | Chronic invalid + Attestation sent -> green row | -- | -- | "invalid + Attestation sent -> GREEN" | -- | COVERED |
| 2.9.9 | Chronic invalid + Attestation not sent -> orange row | -- | -- | "invalid + Attestation not sent -> ORANGE" | -- | COVERED |
| 2.9.10 | Chronic resolved + Att not sent + overdue -> red row | -- | -- | "Attestation not sent + overdue -> RED" | -- | COVERED |
| 2.9.11 | Chronic resolved + Att sent + past date stays green | -- | -- | "Attestation sent remains GREEN even with past date" | -- | COVERED |
| 2.9.12 | BP at goal -> green row | -- | -- | "BP at goal shows green row color" | -- | COVERED |
| 2.9.13 | Depression Screening complete -> green | -- | -- | "Screening complete shows green row color" | -- | COVERED |
| 2.9.14 | Depression Called to schedule -> blue | -- | -- | "Called to schedule shows blue row color" | -- | COVERED |
| 2.9.15 | Depression Visit scheduled -> yellow | -- | -- | "Visit scheduled shows yellow row color" | -- | COVERED |
| 2.9.16 | Depression Patient declined -> purple | -- | -- | "Patient declined shows purple row color" | -- | COVERED |
| 2.9.17 | Depression Screening unnecessary -> gray | -- | -- | "Screening unnecessary shows gray row color" | -- | COVERED |
| 2.9.18 | Depression No longer applicable -> gray | -- | -- | "No longer applicable shows gray row color" | -- | COVERED |
| 2.9.19 | Depression cascading clear -> white row | -- | -- | "Not Addressed shows white row after clearing" | -- | COVERED |

### 2.10 Due Date Calculation via Cascading

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.10.1 | HgbA1c ordered + no T2 -> no due date | -- | dueDateCalculator: null without T2 | "HgbA1c ordered has no due date without T2" | -- | COVERED |
| 2.10.2 | HgbA1c ordered + T2 "1 month" -> due date ~30 days | -- | dueDateCalculator: HgbA1c + T2 month | "selecting Tracking #2 calculates due date" | -- | COVERED |
| 2.10.3 | HgbA1c at goal + T2 "3 months" -> due date ~90 days | -- | dueDateCalculator: HgbA1c at goal + T2 | "HgbA1c at goal requires T2 for due date" | -- | COVERED |
| 2.10.4 | BP not at goal -> status change clears due date | -- | -- | "changing from BP call back clears dueDate and interval" | -- | COVERED |
| 2.10.5 | Screening discussed + T1 "In N Month" -> month-based due date | -- | dueDateCalculator: Screening discussed months | -- | -- | GAP: no E2E |

### 2.11 Edge Cases

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.11.1 | Select status, then change QM -- status should clear | cascadingFields: QM change clears MS | -- | "changing Quality Measure clears Measure Status" | -- | COVERED |
| 2.11.2 | Full row filled, then change RT -- all downstream clears | cascadingFields: RT change clears all | -- | "changing Request Type clears QM and downstream" | -- | COVERED |
| 2.11.3 | Rapid cascading changes (change RT quickly) | -- | -- | -- | -- | GAP: no test for rapid sequential changes |
| 2.11.4 | Network error during cascade -- error recovery | useGridCellUpdate: general error handling | -- | "TC-13.1: Network Error Recovery" | -- | COVERED |
| 2.11.5 | 409 duplicate error on RT/QM -> resets to empty | useGridCellUpdate: resets to empty for 409 on RT/QM | -- | -- | -- | PARTIAL (unit only) |
| 2.11.6 | Cascade during concurrent edit (version conflict) | useGridCellUpdate: 409 VERSION_CONFLICT opens modal | -- | -- | -- | PARTIAL (unit only) |
| 2.11.7 | Sort freeze on cascade edit (row order preserved) | useGridCellUpdate: sort freeze logic | -- | -- | -- | GAP: no explicit test |

### 2.12 Config Data Integrity

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.12.1 | RT keys match REQUEST_TYPES array | dropdownConfig: mapping keys match REQUEST_TYPES | -- | -- | -- | COVERED (unit) |
| 2.12.2 | Every QM across all RTs has status entries | dropdownConfig: cascade chain integrity | -- | -- | -- | COVERED (unit) |
| 2.12.3 | Statuses in tracking map exist in at least one QM status list | dropdownConfig: tracking map entries are valid statuses | -- | -- | -- | COVERED (unit) |
| 2.12.4 | Color arrays cross-reference dropdown statuses | dropdownConfig: color/dropdown cross-reference | -- | -- | -- | COVERED (unit) |
| 2.12.5 | Return value is a new array (no mutation risk) | dropdownConfig: returns new array each call | -- | -- | -- | COVERED (unit) |
| 2.12.6 | getQualityMeasuresForRequestType returns sorted | dropdownConfig: sorted QM | -- | -- | -- | COVERED (unit) |

### 2.13 Depression Screening Cascading (Special)

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.13.1 | Depression Screening has no T1 options for any status | dropdownConfig: no T1 for Depression statuses | -- | "Depression Screening has no Tracking #1 options" | -- | COVERED |
| 2.13.2 | Depression status change clears tracking fields | -- | -- | "T8-3: Depression Screening status change clears tracking" | -- | COVERED |
| 2.13.3 | Depression "Patient declined" -> T1 = N/A | -- | -- | "T8-4: Patient declined sets tracking1 to N/A" | -- | COVERED |
| 2.13.4 | Depression "Screening unnecessary" -> T1 = N/A | -- | -- | "T8-4: Screening unnecessary sets tracking1 to N/A" | -- | COVERED |
| 2.13.5 | Depression "No longer applicable" -> T1 = N/A | -- | -- | "T8-4: No longer applicable sets tracking1 to N/A" | -- | COVERED |
| 2.13.6 | Depression "Not Addressed" after status change -> white row | -- | -- | "T8-3: Not Addressed shows white row" | -- | COVERED |

### 2.14 Role-Based Cascading Behavior

| # | Use Case | Vitest | Jest | Cypress | Playwright | Status |
|---|----------|--------|------|---------|------------|--------|
| 2.14.1 | Admin can edit all cascading fields | -- | -- | -- | -- | GAP: all Cypress tests use admin only |
| 2.14.2 | Staff can edit cascading fields | -- | -- | -- | -- | GAP: no staff-role cascade test |
| 2.14.3 | Viewer cannot edit cascading fields (read-only) | -- | -- | -- | -- | GAP: no viewer-role cascade test |

---

## 3. Gap Summary

### 3.1 CRITICAL Gaps (data integrity / functional correctness)

| Gap ID | Description | Priority | Recommendation |
|--------|-------------|----------|----------------|
| G-7.1 | **(clear) option cascade behavior not tested** -- selecting (clear)/"" on RT, QM, or MS to verify all downstream fields clear correctly. No test at any layer. | HIGH | Add 3 Cypress tests: clear RT, clear QM, clear MS |
| G-7.2 | **Role-based cascade behavior untested** -- all 84 Cypress tests use admin login. No tests verify staff can edit or viewer cannot edit cascading fields. | HIGH | Add Cypress describe block with staff login verifying cascade works, and viewer login verifying cascade fields are read-only |

### 3.2 MEDIUM Gaps (coverage breadth)

| Gap ID | Description | Priority | Recommendation |
|--------|-------------|----------|----------------|
| G-7.3 | **6 of 14 QM status option counts not verified in E2E** -- Diabetic Eye Exam (8), Cervical Cancer (8), GC/Chlamydia (6), Diabetic Nephropathy (6), ACE/ARB (6), Vaccination (6), Annual Serum K&Cr (5) have no Cypress test verifying their exact status option counts. Unit tests cover config integrity but not runtime dropdown rendering. | MEDIUM | Add parameterized Cypress test that opens each QM's MS dropdown and verifies option count |
| G-7.4 | **Colon/Breast cancer screening "completed" tracking options not E2E-tested** -- Only "ordered" statuses verified in Cypress. "Completed" statuses have same T1 options per config but no E2E confirmation. | LOW | Add 2 Cypress tests for completed + tracking |
| G-7.5 | **BP at goal T1 dropdown not E2E-tested** -- Only BP "not at goal" has T1 dropdown verification. | LOW | Add 1 Cypress test |
| G-7.6 | **Chronic diagnosis invalid attestation options not E2E-tested** -- Only "resolved" attestation options tested. | LOW | Add 1 Cypress test |
| G-7.7 | **Screening discussed + T1 -> due date calculation not E2E-tested** -- Unit tested in dueDateCalculator but no Cypress verification of "In N Month" selection triggering due date. | MEDIUM | Add 1 Cypress test |
| G-7.8 | **Status date prompt text not E2E-verified** -- 66 Jest unit tests cover prompt text per status, but no E2E test verifies the prompt actually appears in the Status Date column header/placeholder in the browser. | MEDIUM | Add 2-3 Cypress tests checking prompt display after MS selection |

### 3.3 LOW Gaps (edge cases / hardening)

| Gap ID | Description | Priority | Recommendation |
|--------|-------------|----------|----------------|
| G-7.9 | **Rapid sequential cascading changes** -- No test for user quickly changing RT multiple times before API completes. The isCascadingUpdateRef guard is unit-tested but not stress-tested in E2E. | LOW | Consider adding Cypress test with rapid dropdown changes |
| G-7.10 | **409 duplicate error cascade reset not E2E-tested** -- Unit tested in useGridCellUpdate but no Cypress test for duplicate error resetting RT/QM to empty. | LOW | Add 1 Cypress test with intercepted 409 |
| G-7.11 | **No Playwright E2E tests for cascading** -- Playwright layer has zero dedicated cascading tests. All E2E coverage is in Cypress. | LOW | Not urgent since Cypress covers E2E well; consider adding 1-2 Playwright smoke tests for cross-browser confidence |
| G-7.12 | **Sort freeze during cascade edit not tested** -- The frozen row order logic during cascade saves is not explicitly tested. | LOW | Add 1 Vitest test for sort freeze during cascade |
| G-7.13 | **T2 behavior for non-HgbA1c/non-BP statuses not tested** -- What happens when T2 column is accessed for statuses that don't define T2 behavior (e.g., AWV completed). | LOW | Add 1 Cypress test verifying T2 is N/A or non-editable |

### 3.4 Documentation Gaps

| Gap ID | Description | Priority | Recommendation |
|--------|-------------|----------|----------------|
| G-7.14 | **Requirements spec AC-5 is outdated** -- Says "Screening shows 3 options" but code and tests show 4 (Depression Screening was added post-spec). | LOW | Update requirements.md AC-5 to "4 options" |
| G-7.15 | **Test plan says 30 Cypress tests, actual count is 84** -- `.claude/specs/cascading-dropdowns/test-plan.md` is stale. | LOW | Update test-plan.md with current test count |
| G-7.16 | **REGRESSION_TEST_PLAN TC-6.10 marked "Manual"** -- TC-6.10 (Measure Status cascade clear) now has a Cypress test, but the regression plan still says "Manual". | LOW | Update REGRESSION_TEST_PLAN.md TC-6.10 to "Automated" |

---

## 4. Coverage Heat Map

```
                           Vitest    Jest     Cypress   Playwright
                           ------    ----     -------   ----------
RT -> QM mapping           [====]    [    ]   [====]    [    ]
QM -> MS mapping           [====]    [    ]   [==  ]    [    ]
MS -> T1 mapping           [====]    [    ]   [=== ]    [    ]
T1 -> T2 mapping           [    ]    [=== ]   [=== ]    [    ]
Cascade clearing           [====]    [    ]   [=== ]    [    ]
(clear) option             [    ]    [    ]   [    ]    [    ]
Date prompts               [    ]    [====]   [    ]    [    ]
Due date calc              [    ]    [====]   [=== ]    [    ]
Row colors                 [    ]    [    ]   [====]    [    ]
N/A state                  [    ]    [    ]   [====]    [    ]
Tracking prompts           [    ]    [    ]   [====]    [    ]
Config integrity           [====]    [    ]   [    ]    [    ]
Error recovery             [==  ]    [    ]   [=   ]    [    ]
Role-based access          [    ]    [    ]   [    ]    [    ]
Depression Screening       [====]    [=== ]   [====]    [    ]

Legend: [====] = comprehensive  [=== ] = good  [==  ] = partial
        [=   ] = minimal       [    ] = missing
```

---

## 5. Prioritized Remediation Plan

### Phase 1: High Priority (estimated 8 tests)
1. **G-7.1** -- Add 3 Cypress tests for (clear) option cascade behavior
2. **G-7.2** -- Add 3 Cypress tests for staff role + 2 for viewer role cascading

### Phase 2: Medium Priority (estimated 10 tests)
3. **G-7.3** -- Add 7 parameterized Cypress tests for remaining QM status option counts
4. **G-7.7** -- Add 1 Cypress test for Screening discussed due date via T1 month selection
5. **G-7.8** -- Add 2 Cypress tests for status date prompt display in browser

### Phase 3: Low Priority (estimated 8 tests)
6. **G-7.4** -- Add 2 Cypress tests for completed tracking options
7. **G-7.5** -- Add 1 Cypress test for BP at goal T1
8. **G-7.6** -- Add 1 Cypress test for Chronic invalid attestation
9. **G-7.9** -- Add 1 Cypress test for rapid sequential cascading
10. **G-7.13** -- Add 1 Cypress test for T2 non-HgbA1c behavior
11. **G-7.10** -- Add 1 Cypress test for 409 duplicate cascade reset
12. **G-7.12** -- Add 1 Vitest test for sort freeze during cascade

### Phase 4: Documentation (no code)
13. **G-7.14** -- Update AC-5 in requirements.md
14. **G-7.15** -- Update test-plan.md test count
15. **G-7.16** -- Update REGRESSION_TEST_PLAN.md TC-6.10 status

---

## 6. Overall Assessment

**Coverage Score: 82/100**

The cascading dropdowns feature has strong test coverage at both the unit and E2E levels. The 264 existing tests provide solid confidence in the core cascading chain (RT -> QM -> MS -> T1 -> T2), field clearing behavior, config integrity, and row color integration.

**Strengths:**
- Config data integrity is comprehensively tested via Vitest (53 tests)
- Cascade clearing logic has thorough unit tests (16 tests) plus E2E verification
- All 7 Depression Screening statuses and their row colors are fully E2E-tested
- Chronic DX attestation color cascade (including overdue) is well-covered
- HgbA1c/BP special tracking behaviors tested end-to-end
- Status date prompt text has exhaustive Jest coverage (66 tests)

**Weaknesses:**
- The (clear) option cascade path has zero test coverage at any layer
- Role-based access (staff/viewer) is completely untested for cascading behavior
- 6 of 14 quality measures lack E2E verification of their status dropdown option counts
- No Playwright tests exist (single-framework E2E dependency)
- Status date prompt display in the actual browser UI is untested

**Risk Assessment:**
- The (clear) option gap (G-7.1) represents the highest risk since it is a common user action with no test safety net
- The role-based gap (G-7.2) could mask permission bugs where viewers can edit cascade fields
- The remaining gaps are low risk since unit tests provide a safety net even where E2E tests are missing
