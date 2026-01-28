# Time Interval Editability Matrix

Complete list of all Request Type → Quality Measure → Measure Status combinations with interval behavior.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Time Interval EDITABLE (user can override default) |
| ❌ | Time Interval NOT EDITABLE (controlled by time period dropdown) |
| — | No interval (baseDueDays = null, no due date) |

---

## AWV (Annual Wellness Visit)

| Quality Measure | Measure Status | Tracking #1 | Default Interval | Editable |
|-----------------|----------------|-------------|------------------|----------|
| Annual Wellness Visit | Not Addressed | — | — | — |
| Annual Wellness Visit | Patient called to schedule AWV | — | 7 days | ✅ |
| Annual Wellness Visit | AWV scheduled | — | 1 day | ✅ |
| Annual Wellness Visit | AWV completed | — | 365 days | ✅ |
| Annual Wellness Visit | Patient declined AWV | — | — | — |
| Annual Wellness Visit | Will call later to schedule | — | 30 days | ✅ |
| Annual Wellness Visit | No longer applicable | — | — | — |

---

## Screening

### Breast Cancer Screening

| Measure Status | Tracking #1 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| Screening discussed | In 1-11 Months | 30-330 days (from dropdown) | ❌ |
| Screening test ordered | Mammogram | 14 days | ✅ |
| Screening test ordered | Breast Ultrasound | 14 days | ✅ |
| Screening test ordered | Breast MRI | 21 days | ✅ |
| Screening test completed | Mammogram/Ultrasound/MRI | 365 days | ✅ |
| Obtaining outside records | — | 14 days | ✅ |
| Patient declined screening | — | — | — |
| No longer applicable | — | — | — |
| Screening unnecessary | — | — | — |

### Colon Cancer Screening

| Measure Status | Tracking #1 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| Screening discussed | In 1-11 Months | 30-330 days (from dropdown) | ❌ |
| Colon cancer screening ordered | Colonoscopy | 42 days (6 wks) | ✅ |
| Colon cancer screening ordered | Sigmoidoscopy | 42 days (6 wks) | ✅ |
| Colon cancer screening ordered | Cologuard | 21 days (3 wks) | ✅ |
| Colon cancer screening ordered | FOBT | 21 days (3 wks) | ✅ |
| Colon cancer screening completed | Colonoscopy/etc. | 365 days | ✅ |
| Obtaining outside records | — | 14 days | ✅ |
| Patient declined screening | — | — | — |
| No longer applicable | — | — | — |
| Screening unnecessary | — | — | — |

### Cervical Cancer Screening

| Measure Status | Tracking #1 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| Screening discussed | In 1-11 Months | 30-330 days (from dropdown) | ❌ |
| Screening appt made | — | 1 day | ✅ |
| Screening completed | — | 365 days | ✅ |
| Obtaining outside records | — | 14 days | ✅ |
| Patient declined | — | — | — |
| No longer applicable | — | — | — |
| Screening unnecessary | — | — | — |

---

## Quality

### Diabetic Eye Exam

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Diabetic eye exam discussed | — | 42 days | ✅ |
| Diabetic eye exam referral made | — | 42 days | ✅ |
| Diabetic eye exam scheduled | — | 1 day | ✅ |
| Diabetic eye exam completed | — | 365 days | ✅ |
| Obtaining outside records | — | 14 days | ✅ |
| Patient declined | — | — | — |
| No longer applicable | — | — | — |

### GC/Chlamydia Screening

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Patient contacted for screening | — | 10 days | ✅ |
| Test ordered | — | 5 days | ✅ |
| GC/Chlamydia screening completed | — | 365 days | ✅ |
| Patient declined screening | — | — | — |
| No longer applicable | — | — | — |

### Diabetic Nephropathy

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Patient contacted for screening | — | 10 days | ✅ |
| Urine microalbumin ordered | — | 5 days | ✅ |
| Urine microalbumin completed | — | 365 days | ✅ |
| Patient declined screening | — | — | — |
| No longer applicable | — | — | — |

### Hypertension Management

| Measure Status | Tracking #1 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| Blood pressure at goal | — | — | — |
| Scheduled call back - BP not at goal | Call every 1 wk | 7 days | ❌ |
| Scheduled call back - BP not at goal | Call every 2 wks | 14 days | ❌ |
| Scheduled call back - BP not at goal | Call every 3 wks | 21 days | ❌ |
| Scheduled call back - BP not at goal | Call every 4 wks | 28 days | ❌ |
| Scheduled call back - BP not at goal | Call every 5-8 wks | 35-56 days | ❌ |
| Scheduled call back - BP at goal | Call every 1-8 wks | 7-56 days | ❌ |
| Appointment scheduled | — | 1 day | ✅ |
| Declined BP control | — | — | — |
| No longer applicable | — | — | — |

### ACE/ARB in DM or CAD

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Patient on ACE/ARB | — | — | — |
| ACE/ARB prescribed | — | 14 days | ✅ |
| Patient declined | — | — | — |
| Contraindicated | — | — | — |
| No longer applicable | — | — | — |

### Vaccination

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Vaccination discussed | — | 7 days | ✅ |
| Vaccination scheduled | — | 1 day | ✅ |
| Vaccination completed | — | 365 days | ✅ |
| Patient declined | — | — | — |
| No longer applicable | — | — | — |

### Diabetes Control (HgbA1c)

| Measure Status | Tracking #2 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| HgbA1c ordered | — | 14 days | ✅ |
| HgbA1c at goal | 1-12 months | 30-365 days (from dropdown) | ❌ |
| HgbA1c NOT at goal | 1-12 months | 30-365 days (from dropdown) | ❌ |
| Patient declined | — | — | — |
| No longer applicable | — | — | — |

### Annual Serum K&Cr

| Measure Status | Tracking #1 | Default Interval | Editable |
|----------------|-------------|------------------|----------|
| Not Addressed | — | — | — |
| Lab ordered | — | 7 days | ✅ |
| Lab completed | — | 365 days | ✅ |
| Patient declined | — | — | — |
| No longer applicable | — | — | — |

---

## Chronic DX

### Chronic Diagnosis Code

| Measure Status | Tracking #1 Options | Default Interval | Editable |
|----------------|---------------------|------------------|----------|
| Not Addressed | — | — | — |
| Chronic diagnosis confirmed | — | 365 days | ✅ |
| Chronic diagnosis resolved | Attestation not sent | 14 days | ✅ |
| Chronic diagnosis resolved | Attestation sent | — | — |
| Chronic diagnosis invalid | Attestation not sent | 14 days | ✅ |
| Chronic diagnosis invalid | Attestation sent | — | — |
| No longer applicable | — | — | — |

---

## Summary: Statuses with NON-EDITABLE Time Interval

These statuses have **time period dropdowns** that control the interval:

| Measure Status | Dropdown Field | Dropdown Options | Interval Range |
|----------------|----------------|------------------|----------------|
| Screening discussed | Tracking #1 | In 1-11 Months | 30-330 days |
| HgbA1c at goal | Tracking #2 | 1-12 months | 30-365 days |
| HgbA1c NOT at goal | Tracking #2 | 1-12 months | 30-365 days |
| Scheduled call back - BP not at goal | Tracking #1 | Call every 1-8 wks | 7-56 days |
| Scheduled call back - BP at goal | Tracking #1 | Call every 1-8 wks | 7-56 days |

**All other statuses with baseDueDays have EDITABLE time intervals.**

---

## Last Updated

January 26, 2026
