# E2E Test Plan: Row Color Cascading (Comprehensive)

## Purpose
Verify that every combination of Request Type, Quality Measure, Measure Status, Tracking #1, and Tracking #2 produces the correct row background color — including overdue (red) transitions when due dates expire.

**Source requirements:** `.claude/specs/row-colors/requirements.md`, `.claude/ROW_COLOR_LOGIC.md`

---

## Test Strategy

### Approach
- Create a **fresh test row** per test (via Add Row modal) to avoid polluting other tests
- Set Request Type → Quality Measure → Measure Status → Tracking fields → Status Date (in cascading order)
- Verify row CSS class matches expected color
- For overdue tests: set Status Date far enough in the past so `statusDate + baseDueDays < today`
- For non-overdue tests: set Status Date to today or leave null

### Row Color → CSS Class Mapping

| Color | CSS Class | Hex |
|-------|-----------|-----|
| White | `row-status-white` | #FFFFFF |
| Yellow | `row-status-yellow` | #FFF9E6 |
| Blue | `row-status-blue` | #CCE5FF |
| Green | `row-status-green` | #D4EDDA |
| Purple | `row-status-purple` | #E5D9F2 |
| Orange | `row-status-orange` | #FFE8CC |
| Gray | `row-status-gray` | #E9EBF3 |
| Red (overdue) | `row-status-overdue` | #FFCDD2 |

### Test Data Convention
- Patient names: `"ColorTest-{QM}-{N}, E2E"` (e.g., `"ColorTest-AWV-1, E2E"`)
- DOB: `1990-01-01` (fixed)
- Past date for overdue: `2024-01-01` (guaranteed > any baseDueDays ago)
- Recent date for non-overdue: today's date

---

## Section 1: Status → Color Mapping (All 13 Quality Measures)

### 1A. Annual Wellness Visit (AWV)

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1A-1 | AWV | Annual Wellness Visit | *(none — just RT+QM)* | White | — |
| 1A-2 | AWV | Annual Wellness Visit | Patient called to schedule AWV | Yellow | 7 |
| 1A-3 | AWV | Annual Wellness Visit | AWV scheduled | Blue | 1 |
| 1A-4 | AWV | Annual Wellness Visit | AWV completed | Green | 365 |
| 1A-5 | AWV | Annual Wellness Visit | Patient declined AWV | Purple | null |
| 1A-6 | AWV | Annual Wellness Visit | Will call later to schedule | Blue | 30 |
| 1A-7 | AWV | Annual Wellness Visit | No longer applicable | Gray | null |

### 1B. Breast Cancer Screening

| TC | Request Type | Quality Measure | Measure Status | Tracking #1 | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|-------------|----------------|-------------|
| 1B-1 | Screening | Breast Cancer Screening | Screening discussed | *(none)* | Yellow | 30 |
| 1B-2 | Screening | Breast Cancer Screening | Screening test ordered | Mammogram | Blue | 14 (DueDayRule) |
| 1B-3 | Screening | Breast Cancer Screening | Screening test ordered | Breast MRI | Blue | 21 (DueDayRule) |
| 1B-4 | Screening | Breast Cancer Screening | Screening test completed | *(none)* | Green | 365 |
| 1B-5 | Screening | Breast Cancer Screening | Obtaining outside records | *(none)* | Blue | 14 |
| 1B-6 | Screening | Breast Cancer Screening | Patient declined screening | *(none)* | Purple | null |
| 1B-7 | Screening | Breast Cancer Screening | No longer applicable | *(none)* | Gray | null |
| 1B-8 | Screening | Breast Cancer Screening | Screening unnecessary | *(none)* | Gray | null |

### 1C. Colon Cancer Screening

| TC | Request Type | Quality Measure | Measure Status | Tracking #1 | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|-------------|----------------|-------------|
| 1C-1 | Screening | Colon Cancer Screening | Screening discussed | *(none)* | Yellow | 30 |
| 1C-2 | Screening | Colon Cancer Screening | Colon cancer screening ordered | Colonoscopy | Blue | 42 (DueDayRule) |
| 1C-3 | Screening | Colon Cancer Screening | Colon cancer screening ordered | Cologuard | Blue | 21 (DueDayRule) |
| 1C-4 | Screening | Colon Cancer Screening | Colon cancer screening completed | *(none)* | Green | 365 |
| 1C-5 | Screening | Colon Cancer Screening | Patient declined screening | *(none)* | Purple | null |
| 1C-6 | Screening | Colon Cancer Screening | Screening unnecessary | *(none)* | Gray | null |

### 1D. Cervical Cancer Screening

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1D-1 | Screening | Cervical Cancer Screening | Screening discussed | Yellow | 30 |
| 1D-2 | Screening | Cervical Cancer Screening | Screening appt made | Blue | 1 |
| 1D-3 | Screening | Cervical Cancer Screening | Screening completed | Green | 365 |
| 1D-4 | Screening | Cervical Cancer Screening | Patient declined | Purple | null |
| 1D-5 | Screening | Cervical Cancer Screening | Screening unnecessary | Gray | null |

### 1E. Depression Screening

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1E-1 | Screening | Depression Screening | Called to schedule | Blue | 7 |
| 1E-2 | Screening | Depression Screening | Visit scheduled | Yellow | 1 |
| 1E-3 | Screening | Depression Screening | Screening complete | Green | null |
| 1E-4 | Screening | Depression Screening | Patient declined | Purple | null |
| 1E-5 | Screening | Depression Screening | Screening unnecessary | Gray | null |
| 1E-6 | Screening | Depression Screening | No longer applicable | Gray | null |

### 1F. Diabetic Eye Exam

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1F-1 | Quality | Diabetic Eye Exam | Diabetic eye exam discussed | Yellow | 42 |
| 1F-2 | Quality | Diabetic Eye Exam | Diabetic eye exam referral made | Blue | 42 |
| 1F-3 | Quality | Diabetic Eye Exam | Diabetic eye exam scheduled | Blue | 1 |
| 1F-4 | Quality | Diabetic Eye Exam | Diabetic eye exam completed | Green | 365 |
| 1F-5 | Quality | Diabetic Eye Exam | Patient declined | Purple | null |
| 1F-6 | Quality | Diabetic Eye Exam | No longer applicable | Gray | null |

### 1G. GC/Chlamydia Screening

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1G-1 | Quality | GC/Chlamydia Screening | Patient contacted for screening | Yellow | 10 |
| 1G-2 | Quality | GC/Chlamydia Screening | Test ordered | Blue | 5 |
| 1G-3 | Quality | GC/Chlamydia Screening | GC/Clamydia screening completed | Green | 365 |
| 1G-4 | Quality | GC/Chlamydia Screening | Patient declined screening | Purple | null |
| 1G-5 | Quality | GC/Chlamydia Screening | No longer applicable | Gray | null |

### 1H. Diabetic Nephropathy

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1H-1 | Quality | Diabetic Nephropathy | Patient contacted for screening | Yellow | 10 |
| 1H-2 | Quality | Diabetic Nephropathy | Urine microalbumin ordered | Blue | 5 |
| 1H-3 | Quality | Diabetic Nephropathy | Urine microalbumin completed | Green | 365 |
| 1H-4 | Quality | Diabetic Nephropathy | Patient declined screening | Purple | null |
| 1H-5 | Quality | Diabetic Nephropathy | No longer applicable | Gray | null |

### 1I. Hypertension Management

| TC | Request Type | Quality Measure | Measure Status | Tracking #1 | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|-------------|----------------|-------------|
| 1I-1 | Quality | Hypertension Management | Blood pressure at goal | *(none)* | Green | null |
| 1I-2 | Quality | Hypertension Management | Scheduled call back - BP not at goal | Call every 2 wks | Blue | 14 (DueDayRule) |
| 1I-3 | Quality | Hypertension Management | Scheduled call back - BP at goal | Call every 4 wks | Blue | 28 (DueDayRule) |
| 1I-4 | Quality | Hypertension Management | Appointment scheduled | *(none)* | Blue | 1 |
| 1I-5 | Quality | Hypertension Management | Declined BP control | *(none)* | Purple | null |
| 1I-6 | Quality | Hypertension Management | No longer applicable | *(none)* | Gray | null |

### 1J. ACE/ARB in DM or CAD

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1J-1 | Quality | ACE/ARB in DM or CAD | Patient on ACE/ARB | Green | null |
| 1J-2 | Quality | ACE/ARB in DM or CAD | ACE/ARB prescribed | Blue | 14 |
| 1J-3 | Quality | ACE/ARB in DM or CAD | Patient declined | Purple | null |
| 1J-4 | Quality | ACE/ARB in DM or CAD | Contraindicated | Purple | null |
| 1J-5 | Quality | ACE/ARB in DM or CAD | No longer applicable | Gray | null |

### 1K. Vaccination

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1K-1 | Quality | Vaccination | Vaccination discussed | Yellow | 7 |
| 1K-2 | Quality | Vaccination | Vaccination scheduled | Blue | 1 |
| 1K-3 | Quality | Vaccination | Vaccination completed | Green | 365 |
| 1K-4 | Quality | Vaccination | Patient declined | Purple | null |
| 1K-5 | Quality | Vaccination | No longer applicable | Gray | null |

### 1L. Diabetes Control (HgbA1c)

| TC | Request Type | Quality Measure | Measure Status | Tracking #2 | Expected Color | Notes |
|----|-------------|-----------------|----------------|-------------|----------------|-------|
| 1L-1 | Quality | Diabetes Control | HgbA1c ordered | *(none)* | Blue | No dueDate without tracking2 |
| 1L-2 | Quality | Diabetes Control | HgbA1c at goal | *(none)* | Green | No dueDate without tracking2 |
| 1L-3 | Quality | Diabetes Control | HgbA1c NOT at goal | *(none)* | Blue | No dueDate without tracking2 |
| 1L-4 | Quality | Diabetes Control | Patient declined | *(none)* | Purple | null |
| 1L-5 | Quality | Diabetes Control | No longer applicable | *(none)* | Gray | null |

### 1M. Annual Serum K&Cr

| TC | Request Type | Quality Measure | Measure Status | Expected Color | baseDueDays |
|----|-------------|-----------------|----------------|----------------|-------------|
| 1M-1 | Quality | Annual Serum K&Cr | Lab ordered | Blue | 7 |
| 1M-2 | Quality | Annual Serum K&Cr | Lab completed | Green | 365 |
| 1M-3 | Quality | Annual Serum K&Cr | Patient declined | Purple | null |
| 1M-4 | Quality | Annual Serum K&Cr | No longer applicable | Gray | null |

### 1N. Chronic Diagnosis Code

| TC | Request Type | Quality Measure | Measure Status | Tracking #1 | Expected Color | Notes |
|----|-------------|-----------------|----------------|-------------|----------------|-------|
| 1N-1 | Chronic DX | Chronic Diagnosis Code | Chronic diagnosis confirmed | *(none)* | Green | 365d |
| 1N-2 | Chronic DX | Chronic Diagnosis Code | Chronic diagnosis resolved | *(none/not selected)* | Orange | Default |
| 1N-3 | Chronic DX | Chronic Diagnosis Code | Chronic diagnosis resolved | Attestation not sent | Orange | 14d timer |
| 1N-4 | Chronic DX | Chronic Diagnosis Code | Chronic diagnosis resolved | Attestation sent | Green | Always green |
| 1N-5 | Chronic DX | Chronic Diagnosis Code | Chronic diagnosis invalid | Attestation sent | Green | Always green |
| 1N-6 | Chronic DX | Chronic Diagnosis Code | No longer applicable | *(none)* | Gray | Terminal |

---

## Section 2: Overdue (Red) Transitions

Test that rows turn red when `dueDate < today`. Set `statusDate` far in the past (2024-01-01) to guarantee overdue.

### 2A. Overdue with baseDueDays statuses

| TC | Quality Measure | Measure Status | baseDueDays | Status Date | Expected: Red? |
|----|-----------------|----------------|-------------|-------------|----------------|
| 2A-1 | Annual Wellness Visit | Patient called to schedule AWV | 7 | 2024-01-01 | YES (red) |
| 2A-2 | Annual Wellness Visit | AWV scheduled | 1 | 2024-01-01 | YES (red) |
| 2A-3 | Annual Wellness Visit | AWV completed | 365 | 2024-01-01 | YES (red — renewal overdue) |
| 2A-4 | Annual Wellness Visit | Will call later to schedule | 30 | 2024-01-01 | YES (red) |
| 2A-5 | Depression Screening | Called to schedule | 7 | 2024-01-01 | YES (red) |
| 2A-6 | Depression Screening | Visit scheduled | 1 | 2024-01-01 | YES (red) |
| 2A-7 | Vaccination | Vaccination discussed | 7 | 2024-01-01 | YES (red) |
| 2A-8 | Vaccination | Vaccination scheduled | 1 | 2024-01-01 | YES (red) |
| 2A-9 | Vaccination | Vaccination completed | 365 | 2024-01-01 | YES (red — renewal overdue) |

### 2B. Terminal statuses NEVER turn red

| TC | Quality Measure | Measure Status | Status Date | Expected Color |
|----|-----------------|----------------|-------------|----------------|
| 2B-1 | Annual Wellness Visit | Patient declined AWV | 2024-01-01 | Purple (NOT red) |
| 2B-2 | Annual Wellness Visit | No longer applicable | 2024-01-01 | Gray (NOT red) |
| 2B-3 | Depression Screening | Patient declined | 2024-01-01 | Purple (NOT red) |
| 2B-4 | Depression Screening | Screening unnecessary | 2024-01-01 | Gray (NOT red) |
| 2B-5 | ACE/ARB in DM or CAD | Contraindicated | 2024-01-01 | Purple (NOT red) |

### 2C. Chronic DX attestation overdue logic

| TC | Measure Status | Tracking #1 | Status Date | Expected Color |
|----|----------------|-------------|-------------|----------------|
| 2C-1 | Chronic diagnosis resolved | Attestation not sent | 2024-01-01 | Red (overdue — 14d rule expired) |
| 2C-2 | Chronic diagnosis resolved | Attestation sent | 2024-01-01 | Green (NEVER red) |
| 2C-3 | Chronic diagnosis invalid | Attestation not sent | 2024-01-01 | Red (overdue) |
| 2C-4 | Chronic diagnosis invalid | Attestation sent | 2024-01-01 | Green (NEVER red) |

### 2D. Overdue with Tracking #1 DueDayRule overrides

| TC | Quality Measure | Measure Status | Tracking #1 | Status Date | Expected: Red? |
|----|-----------------|----------------|-------------|-------------|----------------|
| 2D-1 | Breast Cancer Screening | Screening test ordered | Mammogram | 2024-01-01 | YES (14d DueDayRule expired) |
| 2D-2 | Colon Cancer Screening | Colon cancer screening ordered | Colonoscopy | 2024-01-01 | YES (42d DueDayRule expired) |
| 2D-3 | Hypertension Management | Scheduled call back - BP not at goal | Call every 2 wks | 2024-01-01 | YES (14d DueDayRule expired) |

### 2E. Non-overdue (recent date should NOT be red)

| TC | Quality Measure | Measure Status | Status Date | Expected Color |
|----|-----------------|----------------|-------------|----------------|
| 2E-1 | Annual Wellness Visit | AWV scheduled | *(today)* | Blue (NOT red) |
| 2E-2 | Depression Screening | Called to schedule | *(today)* | Blue (NOT red) |
| 2E-3 | Vaccination | Vaccination completed | *(today)* | Green (NOT red) |

---

## Section 3: Color Transitions (Change Status → Color Changes)

| TC | Initial Status | Initial Color | New Status | New Color |
|----|---------------|---------------|------------|-----------|
| 3-1 | Not Addressed | White | AWV scheduled | Blue |
| 3-2 | AWV scheduled | Blue | AWV completed | Green |
| 3-3 | AWV completed | Green | Patient declined AWV | Purple |
| 3-4 | Patient declined AWV | Purple | No longer applicable | Gray |

---

## Section 4: HgbA1c Tracking #2 Overdue

| TC | Measure Status | Tracking #2 | Status Date | Expected Color | Notes |
|----|----------------|-------------|-------------|----------------|-------|
| 4-1 | HgbA1c ordered | 3 months | 2024-01-01 | Red | 3 months from Jan 2024 is long past |
| 4-2 | HgbA1c at goal | 3 months | 2024-01-01 | Red | Renewal overdue |
| 4-3 | HgbA1c NOT at goal | 3 months | 2024-01-01 | Red | Retest overdue |
| 4-4 | HgbA1c ordered | *(none)* | 2024-01-01 | Blue | No tracking2 → no dueDate → not overdue |

---

## Implementation Notes

- **Test file:** `frontend/cypress/e2e/row-color-comprehensive.cy.ts`
- **Login:** Admin account (`admin@gmail.com` / `welcome100`)
- **Grid helpers:** `cy.addTestRow()`, `cy.selectAgGridDropdown()`, `cy.findRowByMemberName()`, `cy.getAgGridCell()`
- **Color assertion:** `cy.get('[row-index="${idx}"]').first().should('have.class', 'row-status-{color}')`
- **Date entry:** Double-click statusDate cell, type date, press Enter, wait for save
- **Unique patient per test:** Use unique names to avoid conflicts with seeded data
- **Total test cases:** ~95 scenarios across 4 sections
