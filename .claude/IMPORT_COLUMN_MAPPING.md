# Import Column Mapping

This document defines the mapping from spreadsheet columns to our database schema.

---

## Patient Data Mapping

| Spreadsheet Column | → Our Field | Status |
|--------------------|-------------|--------|
| Patient | memberName | Confirmed |
| DOB | memberDob | Confirmed |
| Phone | memberTelephone | Confirmed |
| Address | memberAddress | Confirmed |
| Age | (skip) | Calculated from DOB |
| Sex | (TBD) | Q4 |
| MembID | (TBD) | Q4 |
| LOB | (TBD) | Q4 |
| Has Sticket | (TBD) | Q5 |

---

## Quality Measure Mapping

**Rule:** Derive `requestType` from quality measure (Q3 - Decided 2026-01-14)

### AWV (Annual Wellness Visit)

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Annual Wellness Visit | AWV | Annual Wellness Visit |

### Screening

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Breast Cancer Screening E | Screening | Breast Cancer Screening |
| Breast Cancer Screening 42-51 Years E | Screening | Breast Cancer Screening |
| Breast Cancer Screening 52-74 Years E | Screening | Breast Cancer Screening |
| Colorectal Cancer Screening E | Screening | Colon Cancer Screening |
| Colorectal Cancer Screening 45-50 Years E | Screening | Colon Cancer Screening |
| Colorectal Cancer Screening 51-75 Years E | Screening | Colon Cancer Screening |
| Cervical Cancer Screening E | Screening | Cervical Cancer Screening |

### Quality - Diabetic Eye Exam

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Eye Exam | Quality | Diabetic Eye Exam |

### Quality - Diabetes Control

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Glycemic Status Assessment for Patients With Diabetes (Glycemic Status <8.0%) | Quality | Diabetes Control |
| Glycemic Status Assessment for Patients With Diabetes (Glycemic Status <=9.0%) | Quality | Diabetes Control |

### Quality - Diabetic Nephropathy

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Kidney Health Evaluation for Patients With Diabetes (Overall) | Quality | Diabetic Nephropathy |
| Kidney Health Evaluation for Patients With Diabetes (18-64) | Quality | Diabetic Nephropathy |
| Kidney Health Evaluation for Patients With Diabetes (65-75) | Quality | Diabetic Nephropathy |

### Quality - GC/Chlamydia Screening

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Chlamydia 16-20 | Quality | GC/Chlamydia Screening |
| Chlamydia 21-24 | Quality | GC/Chlamydia Screening |
| Chlamydia Screening (Total) | Quality | GC/Chlamydia Screening |

### Quality - Hypertension Management

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| BP Control | Quality | Hypertension Management |

### Quality - ACE/ARB in DM or CAD (Statin-related)

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Cholesterol (Statins) | Quality | ACE/ARB in DM or CAD |
| Statin Use in Persons with Diabetes | Quality | ACE/ARB in DM or CAD |
| Received Statin Therapy (SPD) | Quality | ACE/ARB in DM or CAD |
| Statin Adherence 80% (SPD) | Quality | ACE/ARB in DM or CAD |
| Received Statin Therapy (SPC) | Quality | ACE/ARB in DM or CAD |
| Statin Adherence 80% (SPC) | Quality | ACE/ARB in DM or CAD |

### Quality - Vaccination

| Spreadsheet Column | → requestType | → qualityMeasure |
|--------------------|---------------|------------------|
| Immunizations for Adolescents: Meningococcal E | Quality | Vaccination |
| Immunizations for Adolescents: Tdap/Td E | Quality | Vaccination |
| Immunizations for Adolescents: HPV E | Quality | Vaccination |
| Immunizations for Adolescents: Combo-2 E | Quality | Vaccination |
| Prenatal Immunization Status: Combination | Quality | Vaccination |
| Prenatal Immunization Status: Influenza | Quality | Vaccination |
| Prenatal Immunization Status: Tdap | Quality | Vaccination |
| Childhood Immunization Status: DTaP E | Quality | Vaccination |
| Childhood Immunization Status: IPV E | Quality | Vaccination |
| Childhood Immunization Status: MMR E | Quality | Vaccination |
| Childhood Immunization Status: HiB E | Quality | Vaccination |
| Childhood Immunization Status: Hep-B E | Quality | Vaccination |
| Childhood Immunization Status: VZV E | Quality | Vaccination |
| Childhood Immunization Status: PCV E | Quality | Vaccination |
| Childhood Immunization Status: Hep-A E | Quality | Vaccination |
| Childhood Immunization Status: Rota E | Quality | Vaccination |
| Childhood Immunization Status: Influenza E | Quality | Vaccination |
| Childhood Immunization Status: Combo-10 E | Quality | Vaccination |

---

## Unmapped Columns (No Matching Quality Measure)

These columns don't map to our existing quality measures. Decision needed (Q1).

| Spreadsheet Column | Suggested Action |
|--------------------|------------------|
| Well-Child Visits in the First 15 Months | TBD - New measure or skip? |
| Well-Child Visits for Age 15 Months-30 Months | TBD - New measure or skip? |
| Child and Adolescent Well-Care Visits-3-11 Years | TBD - New measure or skip? |
| Child and Adolescent Well-Care Visits-Total | TBD - New measure or skip? |
| Child and Adolescent Well-Care Visits-12-17 Years | TBD - New measure or skip? |
| Child and Adolescent Well-Care Visits-18-21 Years | TBD - New measure or skip? |
| Medication Review | TBD - New measure or skip? |
| Functional Status Assessment | TBD - New measure or skip? |
| Asthma Medication Ratio : Total | TBD - New measure or skip? |
| Asthma Medication Ratio : Ages 12-18 | TBD - New measure or skip? |
| Asthma Medication Ratio : Ages 19-50 | TBD - New measure or skip? |
| Asthma Medication Ratio : Ages 51-64 | TBD - New measure or skip? |
| PPC - Timeliness of Prenatal Care | TBD - New measure or skip? |
| PPC - Postpartum Care | TBD - New measure or skip? |
| Depression Screening | TBD - New measure or skip? |
| Follow-Up on Positive Screen | TBD - New measure or skip? |
| Appropriate Testing for Pharyngitis (Overall) | TBD - New measure or skip? |
| Appropriate Testing for Pharyngitis: Ages 3-17y | TBD - New measure or skip? |
| Appropriate Testing for Pharyngitis: Ages 18-64y | TBD - New measure or skip? |
| Appropriate Testing for Pharyngitis: Ages 65y+ | TBD - New measure or skip? |

---

## Status Value Mapping

**Decision:** TBD - See Q2 in IMPORT_REQUIREMENTS.md

| Spreadsheet Value | → measureStatus | Status |
|-------------------|-----------------|--------|
| Compliant | TBD | |
| Non Compliant | TBD | |
| Missing Value (blank) | (skip row) | Confirmed |

---

## Summary

| Category | Count |
|----------|-------|
| Mapped to existing measures | 42 columns |
| Unmapped (need decision) | 20 columns |
| Total quality measure columns | 62 columns |

---

## Decisions Log

| Date | Item | Decision |
|------|------|----------|
| 2026-01-14 | Q3: Request Type | Derive from quality measure |
| 2026-01-14 | Eye Exam | → Quality / Diabetic Eye Exam |
| 2026-01-14 | All mappings | Initial mapping completed |

---

## Last Updated

January 14, 2026
