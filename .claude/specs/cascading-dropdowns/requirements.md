# Feature: Cascading Dropdowns

## Overview
The grid uses cascading dropdown menus where the selection in one column determines the available options in dependent columns. Request Type → Quality Measure → Measure Status → Tracking #1. Changing a parent field clears all dependent fields.

## User Stories
- As a user, I want the quality measure options to match my selected request type so I only see relevant choices
- As a user, I want dependent fields to auto-clear when I change a parent field to prevent invalid data combinations
- As a user, I want auto-fill for AWV and Chronic DX to speed up common data entry

## Acceptance Criteria
- AC-1: Request Type has 4 options: AWV, Chronic DX, Quality, Screening
- AC-2: AWV auto-fills Quality Measure with "Annual Wellness Visit"
- AC-3: Chronic DX auto-fills Quality Measure with "Chronic Diagnosis Code"
- AC-4: Quality shows 8 Quality Measure options (Diabetic Eye Exam, GC/Chlamydia, Diabetic Nephropathy, Hypertension Management, ACE/ARB, Vaccination, Diabetes Control, Annual Serum K&Cr)
- AC-5: Screening shows 3 options (Breast Cancer, Colon Cancer, Cervical Cancer Screening)
- AC-6: Measure Status options filtered by selected Quality Measure
- AC-7: Changing Request Type clears: Quality Measure (unless auto-fill), Measure Status, Status Date, Tracking 1/2/3, Due Date, Time Interval
- AC-8: Changing Quality Measure clears: Measure Status, Status Date, Tracking 1/2/3, Due Date, Time Interval
- AC-9: Changing Measure Status clears: Status Date, Tracking 1/2/3, Due Date, Time Interval
- AC-10: Notes are PRESERVED across all cascading clears (never cleared)

## UI Workflow
1. Click Request Type cell → select from dropdown
2. Click Quality Measure cell → see filtered options (or auto-filled)
3. Click Measure Status cell → see options matching quality measure
4. Dependent fields clear on parent change

## Business Rules
- AWV and Chronic DX have exactly one quality measure each (auto-fill)
- Quality has 8 measures, Screening has 3
- Cascading clear always preserves Notes
- Auto-fill does not clear existing downstream values on first set

## Edge Cases
- Change Request Type when full row is filled (tests cascade clear)
- Change Quality Measure only (partial cascade)
- Rapid sequential dropdown changes

## Dependencies
- Dropdown configuration (src/config/dropdownConfig.ts)
- Cell Editing
