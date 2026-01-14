# Cascading Dropdown & Field Combinations Reference

This document lists all valid combinations for seeding data, showing how fields cascade and affect each other.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| **Dropdown** | Field shows dropdown with listed options |
| **Free text** | Field accepts any text input |
| **N/A** | Field is disabled, shows italic "N/A" |
| **Prompt: X** | Field shows placeholder prompt text when empty |
| **Editable** | Time Interval can be manually changed |
| **Read-only** | Time Interval is calculated, not editable |

---

## 1. Annual Wellness Visit (AWV)

**Request Type:** AWV (auto-fills Quality Measure)

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Patient called to schedule AWV | YELLOW | N/A | N/A | 7 | Editable |
| AWV scheduled | BLUE | N/A | N/A | 1 | Editable |
| AWV completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Patient declined AWV | PURPLE | N/A | N/A | null | - |
| Will call later to schedule | BLUE | N/A | N/A | 30 | Editable |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 2. Breast Cancer Screening

**Request Type:** Screening

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Screening discussed | YELLOW | N/A | N/A | 30 | Editable |
| Screening test ordered | BLUE | **Dropdown:** Mammogram, Breast Ultrasound, Breast MRI | N/A | Tracking-dependent* | Read-only |
| Screening test completed | GREEN→RED | **Dropdown:** Mammogram, Breast Ultrasound, Breast MRI | N/A | 365 | Editable |
| Obtaining outside records | BLUE | N/A | N/A | 14 | Editable |
| Patient declined screening | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |
| Screening unnecessary | GRAY | N/A | N/A | null | - |

*Tracking #1 Due Day Rules for "Screening test ordered":
| Tracking #1 Value | Due Days |
|-------------------|----------|
| Mammogram | 14 |
| Breast Ultrasound | 14 |
| Breast MRI | 21 |

---

## 3. Colon Cancer Screening

**Request Type:** Screening

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Screening discussed | YELLOW | N/A | N/A | 30 | Editable |
| Colon cancer screening ordered | BLUE | **Dropdown:** Colonoscopy, Sigmoidoscopy, Cologuard, FOBT | N/A | Tracking-dependent* | Read-only |
| Colon cancer screening completed | GREEN→RED | **Dropdown:** Colonoscopy, Sigmoidoscopy, Cologuard, FOBT | N/A | 365 | Editable |
| Obtaining outside records | BLUE | N/A | N/A | 14 | Editable |
| Patient declined screening | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |
| Screening unnecessary | GRAY | N/A | N/A | null | - |

*Tracking #1 Due Day Rules for "Colon cancer screening ordered":
| Tracking #1 Value | Due Days |
|-------------------|----------|
| Colonoscopy | 42 (6 weeks) |
| Sigmoidoscopy | 42 (6 weeks) |
| Cologuard | 21 (3 weeks) |
| FOBT | 21 (3 weeks) |

---

## 4. Cervical Cancer Screening

**Request Type:** Screening

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Screening discussed | YELLOW | **Dropdown:** In 1-11 Months | N/A | Tracking-dependent* | Read-only |
| Screening appt made | BLUE | N/A | N/A | 1 | Editable |
| Screening completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Obtaining outside records | BLUE | N/A | N/A | 14 | Editable |
| Patient declined | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |
| Screening unnecessary | GRAY | N/A | N/A | null | - |

*Tracking #1 Due Day Rules for "Screening discussed":
| Tracking #1 Value | Due Days |
|-------------------|----------|
| In 1 Month | 30 |
| In 2 Months | 60 |
| In 3 Months | 90 |
| In 4 Months | 120 |
| In 5 Months | 150 |
| In 6 Months | 180 |
| In 7 Months | 210 |
| In 8 Months | 240 |
| In 9 Months | 270 |
| In 10 Months | 300 |
| In 11 Months | 330 |

---

## 5. Diabetic Eye Exam

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Diabetic eye exam discussed | YELLOW | N/A | N/A | 42 (6 weeks) | Editable |
| Diabetic eye exam referral made | BLUE | N/A | N/A | 42 (6 weeks) | Editable |
| Diabetic eye exam scheduled | BLUE | N/A | N/A | 1 | Editable |
| Diabetic eye exam completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Obtaining outside records | BLUE | N/A | N/A | 14 | Editable |
| Patient declined | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 6. GC/Chlamydia Screening

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Patient contacted for screening | YELLOW | N/A | N/A | 10 | Editable |
| Test ordered | BLUE | N/A | N/A | 5 | Editable |
| GC/Clamydia screening completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Patient declined screening | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 7. Diabetic Nephropathy

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Patient contacted for screening | YELLOW | N/A | N/A | 10 | Editable |
| Urine microalbumin ordered | BLUE | N/A | N/A | 5 | Editable |
| Urine microalbumin completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Patient declined screening | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 8. Hypertension Management

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Blood pressure at goal | GREEN | N/A | N/A | null | - |
| Scheduled call back - BP not at goal | BLUE | **Dropdown:** Call every 1-8 wks | **Free text:** Prompt "BP reading" | Tracking-dependent* | Read-only |
| Scheduled call back - BP at goal | BLUE | **Dropdown:** Call every 1-8 wks | **Free text:** Prompt "BP reading" | Tracking-dependent* | Read-only |
| Appointment scheduled | BLUE | N/A | N/A | 1 | Editable |
| Declined BP control | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

*Tracking #1 Due Day Rules for "Scheduled call back - BP not/at goal":
| Tracking #1 Value | Due Days |
|-------------------|----------|
| Call every 1 wk | 7 |
| Call every 2 wks | 14 |
| Call every 3 wks | 21 |
| Call every 4 wks | 28 |
| Call every 5 wks | 35 |
| Call every 6 wks | 42 |
| Call every 7 wks | 49 |
| Call every 8 wks | 56 |

**Note:** Tracking #2 stores BP reading (e.g., "145/92")

---

## 9. ACE/ARB in DM or CAD

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Patient on ACE/ARB | GREEN | N/A | N/A | null | - |
| ACE/ARB prescribed | BLUE | N/A | N/A | 14 | Editable |
| Patient declined | PURPLE | N/A | N/A | null | - |
| Contraindicated | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 10. Vaccination

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Vaccination discussed | YELLOW | N/A | N/A | 7 | Editable |
| Vaccination scheduled | BLUE | N/A | N/A | 1 | Editable |
| Vaccination completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Patient declined | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 11. Diabetes Control (HgbA1c)

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| HgbA1c ordered | BLUE | **Free text:** Prompt "HgbA1c value" | **Dropdown:** 1-12 months | 14 (base) or Tracking2* | Read-only if tracking2 |
| HgbA1c at goal | GREEN→RED | **Free text:** Prompt "HgbA1c value" | **Dropdown:** 1-12 months | 90 (base) or Tracking2* | Read-only |
| HgbA1c NOT at goal | BLUE | **Free text:** Prompt "HgbA1c value" | **Dropdown:** 1-12 months | 90 (base) or Tracking2* | Read-only |
| Patient declined | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

*Tracking #2 Due Day Rules (Testing interval):
| Tracking #2 Value | Due Days |
|-------------------|----------|
| 1 month | 30 |
| 2 months | 60 |
| 3 months | 90 |
| 4 months | 120 |
| 5 months | 150 |
| 6 months | 180 |
| 7 months | 210 |
| 8 months | 240 |
| 9 months | 270 |
| 10 months | 300 |
| 11 months | 330 |
| 12 months | 365 |

**Note:** Tracking #1 stores HgbA1c value (e.g., "6.5", "8.2")

---

## 12. Annual Serum K&Cr

**Request Type:** Quality

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Base Due Days | Time Interval |
|----------------|-----------|-------------|-------------|---------------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Lab ordered | BLUE | N/A | N/A | 7 | Editable |
| Lab completed | GREEN→RED | N/A | N/A | 365 | Editable |
| Patient declined | PURPLE | N/A | N/A | null | - |
| No longer applicable | GRAY | N/A | N/A | null | - |

---

## 13. Chronic Diagnosis Code

**Request Type:** Chronic DX (auto-fills Quality Measure)

| Measure Status | Row Color | Tracking #1 | Tracking #2 | Due Days | Time Interval |
|----------------|-----------|-------------|-------------|----------|---------------|
| Not Addressed | WHITE | N/A | N/A | null | - |
| Chronic diagnosis confirmed | GREEN→RED | N/A | N/A | 365 | Editable |
| Chronic diagnosis resolved | ORANGE | **Dropdown:** Attestation not sent, Attestation sent | N/A | Tracking-dependent* | Varies |
| Chronic diagnosis invalid | ORANGE | **Dropdown:** Attestation not sent, Attestation sent | N/A | Tracking-dependent* | Varies |
| No longer applicable | GRAY | N/A | N/A | null | - |

*Tracking #1 Due Day Rules for "Chronic diagnosis resolved/invalid":
| Tracking #1 Value | Due Days |
|-------------------|----------|
| Attestation not sent | 14 |
| Attestation sent | null |

---

## Row Color Reference

| Color | Hex | Statuses | Can Turn RED? |
|-------|-----|----------|---------------|
| WHITE | #FFFFFF | Not Addressed | Yes |
| YELLOW | #FFF9E6 | Called, Discussed, Contacted | Yes |
| BLUE | #CCE5FF | Scheduled, Ordered, In Progress | Yes |
| GREEN | #D4EDDA | Completed, At Goal, Confirmed | **Yes** (annual renewal) |
| PURPLE | #E5D9F2 | Declined, Contraindicated | No |
| ORANGE | #FFE8CC | Resolved, Invalid | No |
| GRAY | #E9EBF3 | N/A, Unnecessary | No |
| RED | #FFCDD2 | Overdue (dueDate < today) | N/A |

---

## Seed Data Validation Checklist

When creating seed data, verify:

1. **Request Type + Quality Measure match** - e.g., AWV can only have "Annual Wellness Visit"
2. **Measure Status is valid for Quality Measure** - check QUALITY_MEASURE_TO_STATUS
3. **Tracking #1 matches status expectations:**
   - If status has dropdown options → value must be from that list
   - If HgbA1c status → free text (numeric value like "6.5")
   - Otherwise → should be null
4. **Tracking #2 matches status expectations:**
   - If HgbA1c status → should be month interval (e.g., "3 months")
   - If Hypertension call back → should be BP reading (e.g., "145/92")
   - Otherwise → should be null
5. **Status Date required for non-"Not Addressed" statuses**
6. **Due Date will be auto-calculated** - don't set manually in seed unless testing specific scenarios

---

## Last Updated

January 13, 2026
