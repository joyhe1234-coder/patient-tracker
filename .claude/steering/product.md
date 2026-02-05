# Product Vision

## Overview
Patient Tracker is a web-based quality measure tracking system that replaces Excel-based workflows for medical offices. It enables healthcare providers to track patient compliance with quality measures across multiple physicians.

## Problem Statement
Medical offices track patient quality measures (wellness visits, cancer screenings, diabetes management, etc.) using Excel spreadsheets. This approach is error-prone, doesn't support multi-user access, lacks role-based permissions, and makes it difficult to import data from healthcare systems.

## Target Users

| Role | Description | Key Needs |
|------|-------------|-----------|
| **PHYSICIAN** | Doctor managing their own patients | View/edit own patient measures, import data |
| **STAFF** | Office staff assigned to physicians | View/edit assigned physician's patients, import data |
| **ADMIN** | System administrator | Manage users, assign patients, view all data, bulk operations |

## Key Features

### Core
- AG Grid-based patient data grid with 14+ columns
- Single-click cell editing with auto-save
- Cascading dropdowns (Request Type → Quality Measure → Measure Status → Tracking)
- Conditional row coloring (8 status colors + overdue detection)
- Add/delete/duplicate patient rows

### Import
- CSV/Excel import from healthcare systems (Hill Healthcare)
- Column auto-mapping with validation
- Merge vs Replace modes with preview
- Patient reassignment detection with confirmation
- Validation warnings and error reporting

### Security
- JWT authentication with bcrypt password hashing
- Role-based access control (PHYSICIAN, STAFF, ADMIN)
- Patient ownership (physicians see only their patients)
- Staff-to-physician assignment
- Audit logging of user actions
- Password reset via email (SMTP)

### Administration
- User CRUD (create, activate/deactivate, reset password)
- Staff-physician assignment management
- Bulk patient reassignment between physicians
- Unassigned patients view

## Quality Measures (13)
1. Annual Wellness Visit (AWV)
2. Diabetic Eye Exam
3. Colon Cancer Screening
4. Breast Cancer Screening
5. Diabetic Nephropathy
6. GC/Chlamydia Screening
7. Hypertension Control
8. Vaccination (Pneumococcal)
9. Cervical Cancer Screening
10. ACE/ARB for Heart Failure
11. Annual Serum K & Cr
12. Chronic Diagnosis Code
13. Diabetes Control (HgbA1c)

## Status Colors
| Color | Hex | Statuses |
|-------|-----|----------|
| Green | #D4EDDA | Completed, At Goal |
| Blue | #CCE5FF | Scheduled, Ordered, In Progress |
| Yellow | #FFF9E6 | Called to schedule, Discussed, Contacted |
| Purple | #E5D9F2 | Declined, Contraindicated |
| Orange | #FFE8CC | Resolved, Invalid |
| Gray | #E9EBF3 | Not Applicable |
| White | #FFFFFF | Not Addressed |
| Red | #FFCDD2 | Overdue |

## Success Metrics
- Replace Excel tracking for medical offices
- Support multiple physicians with patient isolation
- Import data from healthcare systems without manual entry
- Provide real-time compliance visibility through color coding
- Maintain audit trail for accountability

## Business Rules
- Physicians see ONLY their own patients (auto-filtered)
- Staff must select a physician before viewing patients
- Admin can view all patients, including unassigned
- Import requires explicit physician selection to prevent accidental data mixing
- Patient reassignment requires explicit confirmation
- Merge mode preserves existing data; Replace mode deletes first
- Due dates calculated from status date + tracking selection + config rules
- Duplicate detection: same patient + requestType + qualityMeasure
