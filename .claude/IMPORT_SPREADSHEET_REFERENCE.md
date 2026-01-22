# Import Spreadsheet Column Reference

This document lists all column headers from the external spreadsheet and their possible values, for use in planning the CSV Import feature.

---

## Patient Data Columns (A-H)

| Column | Field | Maps To |
|--------|-------|---------|
| A | Patient | memberName |
| B | DOB | memberDob |
| C | Age | (calculated, not stored) |
| D | Sex | (not in schema) |
| E | MembID | (not in schema) |
| F | Phone | memberTelephone |
| G | Address | memberAddress |
| H | LOB | (not in schema - Line of Business?) |

---

## Quality Measure Columns (I onwards)

All quality measure columns have the same possible values:
- **Compliant** - Measure completed/met
- **Non Compliant** - Measure not met, needs action
- **Missing Value** (blank) - Not applicable, skip

### Eye & Vision

| Column | Quality Measure |
|--------|-----------------|
| I | Eye Exam |

### Diabetes

| Column | Quality Measure |
|--------|-----------------|
| J | Glycemic Status Assessment for Patients With Diabetes (Glycemic Status <8.0%) |
| T | Glycemic Status Assessment for Patients With Diabetes (Glycemic Status <=9.0%) |
| N | Kidney Health Evaluation for Patients With Diabetes (Overall) |
| BK | Kidney Health Evaluation for Patients With Diabetes (18-64) |
| BL | Kidney Health Evaluation for Patients With Diabetes (65-75) |

### Cholesterol & Statins

| Column | Quality Measure |
|--------|-----------------|
| K | Cholesterol (Statins) |
| AD | Statin Use in Persons with Diabetes |
| AE | Received Statin Therapy (SPD) |
| AF | Statin Adherence 80% (SPD) |
| AG | Received Statin Therapy (SPC) |
| AH | Statin Adherence 80% (SPC) |

### Well-Child Visits

| Column | Quality Measure |
|--------|-----------------|
| L | Well-Child Visits in the First 15 Months |
| M | Well-Child Visits for Age 15 Months-30 Months |

### Child and Adolescent Well-Care

| Column | Quality Measure |
|--------|-----------------|
| N | Child and Adolescent Well-Care Visits-3-11 Years |
| O | Child and Adolescent Well-Care Visits-Total |
| P | Child and Adolescent Well-Care Visits-12-17 Years |
| Q | Child and Adolescent Well-Care Visits-18-21 Years |

### Medication & Functional

| Column | Quality Measure |
|--------|-----------------|
| U | Medication Review |
| V | Functional Status Assessment |

### Chlamydia Screening

| Column | Quality Measure |
|--------|-----------------|
| W | Chlamydia 16-20 |
| X | Chlamydia 21-24 |
| Y | Chlamydia Screening (Total) |

### Blood Pressure

| Column | Quality Measure |
|--------|-----------------|
| Z | BP Control |

### Asthma

| Column | Quality Measure |
|--------|-----------------|
| AA | Asthma Medication Ratio : Total |
| AE | Asthma Medication Ratio : Ages 12-18 |
| AF | Asthma Medication Ratio : Ages 19-50 |
| AG | Asthma Medication Ratio : Ages 51-64 |

### Prenatal/Postpartum Care

| Column | Quality Measure |
|--------|-----------------|
| AB | PPC - Timeliness of Prenatal Care |
| AC | PPC - Postpartum Care |

### Annual Wellness Visit

| Column | Quality Measure |
|--------|-----------------|
| AH | Annual Wellness Visit |

### Depression

| Column | Quality Measure |
|--------|-----------------|
| AI | Depression Screening |
| AJ | Follow-Up on Positive Screen |

### Immunizations - Adolescents

| Column | Quality Measure |
|--------|-----------------|
| AK | Immunizations for Adolescents: Meningococcal E |
| AL | Immunizations for Adolescents: Tdap/Td E |
| AM | Immunizations for Adolescents: HPV E |
| AN | Immunizations for Adolescents: Combo-2 E |

### Immunizations - Prenatal

| Column | Quality Measure |
|--------|-----------------|
| AO | Prenatal Immunization Status: Combination |
| AP | Prenatal Immunization Status: Influenza |
| AQ | Prenatal Immunization Status: Tdap |

### Immunizations - Childhood

| Column | Quality Measure |
|--------|-----------------|
| AR | Childhood Immunization Status: DTaP E |
| AS | Childhood Immunization Status: IPV E |
| AT | Childhood Immunization Status: MMR E |
| AU | Childhood Immunization Status: HiB E |
| AV | Childhood Immunization Status: Hep-B E |
| AW | Childhood Immunization Status: VZV E |
| AX | Childhood Immunization Status: PCV E |
| AY | Childhood Immunization Status: Hep-A E |
| AZ | Childhood Immunization Status: Rota E |
| BA | Childhood Immunization Status: Influenza E |
| BB | Childhood Immunization Status: Combo-10 E |

### Cancer Screening

| Column | Quality Measure |
|--------|-----------------|
| BC | Cervical Cancer Screening E |
| BG | Breast Cancer Screening E |
| BM | Breast Cancer Screening 42-51 Years E |
| BN | Breast Cancer Screening 52-74 Years E |
| BH | Colorectal Cancer Screening E |
| BI | Colorectal Cancer Screening 45-50 Years E |
| BJ | Colorectal Cancer Screening 51-75 Years E |

### Pharyngitis Testing

| Column | Quality Measure |
|--------|-----------------|
| BD | Appropriate Testing for Pharyngitis (Overall) |
| BE | Appropriate Testing for Pharyngitis: Ages 3-17y |
| BF | Appropriate Testing for Pharyngitis: Ages 18-64y |
| BG | Appropriate Testing for Pharyngitis: Ages 65y+ |

---

## Other Columns

| Column | Field | Possible Values |
|--------|-------|-----------------|
| (Last) | Has Sticket | Y, N |

---

## Summary Statistics

- **Total patient data columns:** 8
- **Total quality measure columns:** ~60
- **Possible values for measures:** Compliant, Non Compliant, Missing Value (blank)

---

## Mapping Decisions (TBD)

### Status Mapping
| Import Value | → measureStatus |
|--------------|-----------------|
| Compliant | TBD |
| Non Compliant | TBD |
| Missing Value | Don't create row |

### Quality Measure Mapping
- Current system has 13 quality measures
- Import spreadsheet has ~60 quality measures
- Decision needed: Expand system or filter to matching measures only?

### Unmapped Columns
- Age (calculated from DOB)
- Sex (not in schema)
- MembID (not in schema)
- LOB (not in schema)
- Has Sticket (purpose unknown)

---

## Last Updated

January 14, 2026
