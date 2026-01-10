# Patient Quality Measure Tracking System - Regression Test Plan

**Version:** 1.0
**Last Updated:** January 9, 2026
**Coverage:** Phases 1-6

---

## Table of Contents

1. [Test Environment Setup](#1-test-environment-setup)
2. [Phase 1: Project Setup & Database Foundation](#2-phase-1-project-setup--database-foundation)
3. [Phase 2: CRUD Operations & Grid Editing](#3-phase-2-crud-operations--grid-editing)
4. [Phase 3: Cascading Dropdowns](#4-phase-3-cascading-dropdowns)
5. [Phase 4: Conditional Row Formatting](#5-phase-4-conditional-row-formatting)
6. [Phase 5: Business Logic & Calculations](#6-phase-5-business-logic--calculations)
7. [Phase 6: Countdown Period Configuration](#7-phase-6-countdown-period-configuration)
8. [Test Data Reference](#8-test-data-reference)

---

## 1. Test Environment Setup

### 1.1 Prerequisites

- [ ] Docker Desktop running
- [ ] PostgreSQL database container running (`docker compose up -d db`)
- [ ] Backend server running (`cd backend && npm run dev`)
- [ ] Frontend server running (`cd frontend && npm run dev`)
- [ ] Browser: Chrome/Edge/Firefox (latest)

### 1.2 Pre-Test Checklist

- [ ] Access http://localhost:5173 - Frontend loads
- [ ] Access http://localhost:3000/api/health - Returns `{"status":"ok"}`
- [ ] Grid displays with data (or empty state if no data)
- [ ] No console errors in browser DevTools

### 1.3 Test Data Setup

Run test seed for comprehensive test data:
```bash
cd backend
npx tsx prisma/test-seed.ts
```

---

## 2. Phase 1: Project Setup & Database Foundation

### 2.1 Database Connectivity

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 1.1.1 | Database connection | Start backend server | Console shows "Database connected successfully" | |
| 1.1.2 | API health check | GET http://localhost:3000/api/health | Returns `{"status":"ok"}` | |
| 1.1.3 | Data retrieval | GET http://localhost:3000/api/data | Returns JSON array of patient measures | |

### 2.2 Frontend Loading

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 1.2.1 | Page load | Navigate to http://localhost:5173 | Page loads without errors | |
| 1.2.2 | Grid renders | Wait for page load | AG Grid component displays | |
| 1.2.3 | Column headers | Inspect grid | All 14 columns visible (or 11 if Member Info hidden) | |

---

## 3. Phase 2: CRUD Operations & Grid Editing

### 3.1 Grid Display

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.1.1 | 14 columns displayed | Count columns in grid | Request Type, Member Name, Member DOB, Member Telephone, Member Address, Quality Measure, Measure Status, Status Date, Tracking#1, Tracking#2, Tracking#3, Due Date, Time Interval (Days), Notes | |
| 2.1.2 | Column headers correct | Verify header text | Each column header matches expected name | |
| 2.1.3 | Data rows display | View grid with test data | Rows display patient measure data | |

### 3.2 Cell Editing

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.2.1 | Single-click edit | Click on editable cell | Cell enters edit mode immediately | |
| 2.2.2 | Edit text field | Click Member Name, type "Test Patient" | Value updates in cell | |
| 2.2.3 | Edit with Enter | Press Enter after editing | Edit confirmed, cursor moves down | |
| 2.2.4 | Edit with Tab | Press Tab after editing | Edit confirmed, cursor moves right | |
| 2.2.5 | Cancel edit with Escape | Press Escape while editing | Edit cancelled, original value restored | |

### 3.3 Auto-Save

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.3.1 | Save indicator - Saving | Edit a cell and exit | Status bar shows "Saving..." briefly | |
| 2.3.2 | Save indicator - Saved | Wait after edit | Status bar shows "Saved" with checkmark | |
| 2.3.3 | Data persists | Edit cell, refresh page | Edited value persists after refresh | |
| 2.3.4 | Save error handling | Disconnect network, edit cell | Status bar shows error indicator | |

### 3.4 Add Row

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.4.1 | Add Row button | Click "+ Add Row" in toolbar | Modal dialog opens | |
| 2.4.2 | Modal fields | View Add Row modal | Shows Member Name, DOB, Telephone, Address fields | |
| 2.4.3 | Required validation | Submit with empty Member Name | Error shown, form not submitted | |
| 2.4.4 | Create row | Fill form, click Save | New row appears in grid | |
| 2.4.5 | Cancel add | Click Cancel in modal | Modal closes, no row added | |

### 3.5 Delete Row

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.5.1 | Delete button | Select row, click Delete | Confirmation dialog appears | |
| 2.5.2 | Confirm delete | Click "Delete" in confirmation | Row is removed from grid | |
| 2.5.3 | Cancel delete | Click "Cancel" in confirmation | Row remains, dialog closes | |
| 2.5.4 | Data persists | Delete row, refresh page | Deleted row stays deleted | |

### 3.6 Row Selection

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.6.1 | Row selection indicator | Click on a row | Row shows blue outline border | |
| 2.6.2 | Selection preserves color | Select colored row | Status color preserved, blue outline added | |
| 2.6.3 | Active cell indicator | Click on specific cell | Cell shows blue outline border | |

### 3.7 Date Formatting

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.7.1 | Display format | View date cells | Dates display as MM/DD/YYYY | |
| 2.7.2 | Edit format | Edit date cell | Date editable as MM/DD/YYYY | |
| 2.7.3 | Flexible input - M/D/YYYY | Enter "1/5/2025" | Accepts and formats as "01/05/2025" | |
| 2.7.4 | Flexible input - M/D/YY | Enter "1/5/25" | Accepts and formats as "01/05/2025" | |
| 2.7.5 | Flexible input - dashes | Enter "1-5-2025" | Accepts and formats as "01/05/2025" | |
| 2.7.6 | Flexible input - dots | Enter "1.5.2025" | Accepts and formats as "01/05/2025" | |
| 2.7.7 | Flexible input - ISO | Enter "2025-01-05" | Accepts and formats as "01/05/2025" | |
| 2.7.8 | Flexible input - no separator | Enter "01052025" | Accepts and formats as "01/05/2025" | |
| 2.7.9 | Invalid date error | Enter "13/45/2025" | Error popup shown, value rejected | |

### 3.8 DOB Masking

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.8.1 | DOB display masked | View Member DOB column | Shows "###" instead of actual date | |
| 2.8.2 | DOB edit shows value | Click to edit DOB cell | Actual date value shown during edit | |
| 2.8.3 | DOB masked after edit | Exit DOB edit | Returns to "###" display | |

### 3.9 Phone Number Formatting

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.9.1 | Phone display format | View phone numbers | Display as (555) 123-4567 | |
| 2.9.2 | Phone input - digits only | Enter "5551234567" | Formats to (555) 123-4567 | |
| 2.9.3 | Phone input - with dashes | Enter "555-123-4567" | Formats to (555) 123-4567 | |
| 2.9.4 | Phone input - with country code | Enter "1-555-123-4567" | Formats to (555) 123-4567 | |
| 2.9.5 | Phone invalid length | Enter "555123" | Error shown or partial formatting | |

### 3.10 Member Info Toggle

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 2.10.1 | Toggle button exists | Check toolbar | "Member Info" toggle button visible | |
| 2.10.2 | Hide member info | Click toggle when columns shown | DOB, Telephone, Address columns hide | |
| 2.10.3 | Show member info | Click toggle when columns hidden | DOB, Telephone, Address columns show | |
| 2.10.4 | State persists | Toggle, refresh page | Toggle state preserved | |

---

## 4. Phase 3: Cascading Dropdowns

### 4.1 Request Type Dropdown

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.1.1 | Request Type options | Click Request Type cell | Dropdown shows: AWV, Chronic DX, Quality, Screening | |
| 3.1.2 | Select AWV | Select "AWV" | Value set to AWV | |
| 3.1.3 | Select Screening | Select "Screening" | Value set to Screening | |

### 4.2 Quality Measure Cascading

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.2.1 | AWV auto-fill | Set Request Type to "AWV" | Quality Measure auto-fills "Annual Wellness Visit" | |
| 3.2.2 | Chronic DX auto-fill | Set Request Type to "Chronic DX" | Quality Measure auto-fills "Chronic Diagnosis Code" | |
| 3.2.3 | Quality options | Set Request Type to "Quality", click Quality Measure | Shows 8 options: Diabetic Eye Exam, GC/Chlamydia, Diabetic Nephropathy, Hypertension, ACE/ARB, Vaccination, Diabetes Control, Annual Serum K&Cr | |
| 3.2.4 | Screening options | Set Request Type to "Screening", click Quality Measure | Shows 3 options: Breast Cancer, Colon Cancer, Cervical Cancer | |

### 4.3 Measure Status Cascading

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.3.1 | AWV statuses | Set Quality Measure to "Annual Wellness Visit", click Measure Status | Shows AWV-specific statuses | |
| 3.3.2 | Colon Cancer statuses | Set Quality Measure to "Colon Cancer Screening", click Measure Status | Shows colon cancer-specific statuses | |
| 3.3.3 | Diabetes Control statuses | Set Quality Measure to "Diabetes Control", click Measure Status | Shows HgbA1c-related statuses | |

### 4.4 Tracking #1 Cascading

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.4.1 | Colon cancer ordered - dropdown | Set Status to "Colon cancer screening ordered" | Tracking#1 shows dropdown: Colonoscopy, Sigmoidoscopy, Cologuard, FOBT | |
| 3.4.2 | Breast cancer ordered - dropdown | Set Status to "Screening test ordered" (Breast) | Tracking#1 shows dropdown: Mammogram, Breast Ultrasound, Breast MRI | |
| 3.4.3 | Hypertension callback - dropdown | Set Status to "Scheduled call back - BP not at goal" | Tracking#1 shows dropdown: Call every 1-8 wks | |
| 3.4.4 | Cervical screening discussed - dropdown | Set Status to "Screening discussed" (Cervical) | Tracking#1 shows dropdown: In 1-11 Months | |

### 4.5 Auto-Reset on Parent Change

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 3.5.1 | Request Type change resets Quality Measure | Change Request Type | Quality Measure cleared | |
| 3.5.2 | Quality Measure change resets Status | Change Quality Measure | Measure Status cleared | |
| 3.5.3 | Measure Status change resets Tracking | Change Measure Status | Tracking fields cleared | |

---

## 5. Phase 4: Conditional Row Formatting

### 5.1 Status-Based Row Colors

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.1.1 | White - Not Addressed | Set Status to "Not Addressed" | Row background is white (#FFFFFF) | |
| 4.1.2 | Gray - No longer applicable | Set Status to "No longer applicable" | Row background is gray (#E9EBF3) | |
| 4.1.3 | Gray - Screening unnecessary | Set Status to "Screening unnecessary" | Row background is gray (#E9EBF3) | |
| 4.1.4 | Purple - Declined | Set Status containing "declined" | Row background is light purple (#E5D9F2) | |
| 4.1.5 | Purple - Contraindicated | Set Status to "Contraindicated" | Row background is light purple (#E5D9F2) | |
| 4.1.6 | Green - Completed | Set Status containing "completed" | Row background is light green (#D4EDDA) | |
| 4.1.7 | Green - At Goal | Set Status to "HgbA1c at goal" | Row background is light green (#D4EDDA) | |
| 4.1.8 | Blue - Scheduled | Set Status containing "scheduled" | Row background is light blue (#CCE5FF) | |
| 4.1.9 | Blue - Ordered | Set Status containing "ordered" | Row background is light blue (#CCE5FF) | |
| 4.1.10 | Yellow - Called to schedule | Set Status containing "called to schedule" | Row background is pale yellow (#FFF9E6) | |
| 4.1.11 | Yellow - Discussed | Set Status containing "discussed" | Row background is pale yellow (#FFF9E6) | |
| 4.1.12 | Orange - Chronic resolved | Set Status to "Chronic diagnosis resolved" | Row background is light orange (#FFE8CC) | |
| 4.1.13 | Orange - Chronic invalid | Set Status to "Chronic diagnosis invalid" | Row background is light orange (#FFE8CC) | |

### 5.2 Row Color Preservation

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.2.1 | Color preserved on selection | Select a colored row | Status color preserved, blue outline added | |
| 4.2.2 | Color preserved during edit | Edit cell in colored row | Status color preserved during edit | |
| 4.2.3 | Color updates on status change | Change Measure Status | Row color updates immediately | |

### 5.3 Overdue Row Coloring

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.3.1 | Overdue - pending status | Set due date in past, status is "ordered" | Row turns light red (#FFCDD2) | |
| 4.3.2 | Not overdue - completed | Set due date in past, status is "completed" | Row stays green (not red) | |
| 4.3.3 | Not overdue - declined | Set due date in past, status is "declined" | Row stays purple (not red) | |
| 4.3.4 | Overdue clears on new date | Update status date to today | Row returns to status-based color | |

### 5.4 Duplicate Row Coloring

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 4.4.1 | Duplicate indicator | Create two rows with same name + DOB | Both rows show light yellow (#FEF3C7) | |
| 4.4.2 | Duplicate priority | Duplicate row with overdue status | Shows duplicate color (yellow), not overdue (red) | |

---

## 6. Phase 5: Business Logic & Calculations

### 6.1 Due Date Auto-Calculation

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.1.1 | Due date from baseDueDays | Set status with baseDueDays, enter status date | Due Date = Status Date + baseDueDays | |
| 5.1.2 | Due date from tracking1 | Set "Colon cancer screening ordered", Tracking#1 = "Colonoscopy", enter date | Due Date = Status Date + 42 days | |
| 5.1.3 | Due date from tracking2 (HgbA1c) | Set "HgbA1c at goal", Tracking#2 = "3 months", enter date | Due Date = Status Date + 90 days | |
| 5.1.4 | Due date from month pattern | Set "Screening discussed", Tracking#1 = "In 3 Months", enter date | Due Date = Status Date + 90 days | |
| 5.1.5 | No due date for null baseDueDays | Set status with no countdown period | Due Date remains empty | |

### 6.2 Time Interval Calculation

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.2.1 | Time Interval displays | Row with due date | Time Interval shows number of days | |
| 5.2.2 | Time Interval = dueDate - statusDate | Verify calculation | Time Interval equals difference in days | |
| 5.2.3 | Time Interval null when no due date | Row without due date | Time Interval is empty | |

### 6.3 Time Interval Conditional Editability

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.3.1 | Editable - baseDueDays status | Set "AWV scheduled", try to edit Time Interval | Cell is editable | |
| 5.3.2 | NOT editable - dropdown interval | Set "Screening discussed" (Cervical), try to edit Time Interval | Cell is NOT editable | |
| 5.3.3 | NOT editable - HgbA1c | Set "HgbA1c at goal", try to edit Time Interval | Cell is NOT editable | |
| 5.3.4 | NOT editable - Colon cancer ordered | Set "Colon cancer screening ordered", try to edit Time Interval | Cell is NOT editable | |
| 5.3.5 | NOT editable - Hypertension callback | Set "Scheduled call back - BP not at goal", try to edit Time Interval | Cell is NOT editable | |
| 5.3.6 | Edit updates due date | Edit Time Interval to 30 | Due Date = Status Date + 30 days | |
| 5.3.7 | Edit updates row color | Edit Time Interval to make row overdue | Row color changes to red | |

### 6.4 Status Date Prompt

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.4.1 | Prompt displays | Set status requiring date, leave date empty | Status Date cell shows prompt text (e.g., "Date Completed") | |
| 5.4.2 | Prompt styling | View prompt in Status Date cell | Light gray background, italic text | |
| 5.4.3 | Prompt for completed | Set status to "AWV completed" | Prompt shows "Date Completed" | |
| 5.4.4 | Prompt for scheduled | Set status to "AWV scheduled" | Prompt shows "Date Scheduled" | |
| 5.4.5 | Prompt for ordered | Set status containing "ordered" | Prompt shows "Date Ordered" | |

### 6.5 Tracking Field Behavior

#### Tracking #1

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.5.1 | Dropdown when applicable | Set status with tracking options | Tracking#1 shows dropdown | |
| 5.5.2 | Free text for HgbA1c | Set "HgbA1c at goal" or "HgbA1c NOT at goal" | Tracking#1 is free text with "HgbA1c value" prompt | |
| 5.5.3 | N/A for disabled status | Set "Not Addressed" | Tracking#1 shows "N/A", not editable | |
| 5.5.4 | N/A inherits row color | Set completed status | Tracking#1 "N/A" has green background | |

#### Tracking #2

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.5.5 | Dropdown for HgbA1c | Set "HgbA1c at goal" | Tracking#2 shows dropdown: 1-12 months | |
| 5.5.6 | Free text for Hypertension | Set "Scheduled call back - BP not at goal" | Tracking#2 is free text with "BP reading" prompt | |
| 5.5.7 | N/A for other statuses | Set status without Tracking#2 | Shows "N/A", not editable | |

#### Tracking #3

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.5.8 | Always editable free text | Any row | Tracking#3 is editable free text | |
| 5.5.9 | Inherits row color | Colored row | Tracking#3 has same background as row | |

### 6.6 Duplicate Detection

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 5.6.1 | Visual indicator | Two rows with same name + DOB | Both rows have light yellow background | |
| 5.6.2 | Add duplicate error | Try to add row with existing name + DOB | Error modal shown, cannot proceed | |
| 5.6.3 | Error preserves form data | Close error modal | Form data still filled in | |
| 5.6.4 | Edit to create duplicate | Edit DOB to match another patient | Backend rejects update | |
| 5.6.5 | Delete updates flags | Delete one of duplicate pair | Remaining row loses duplicate indicator | |

---

## 7. Phase 6: Countdown Period Configuration

### 7.1 Annual Wellness Visit (AWV)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.1.1 | Called to schedule - 7 days | Set "Patient called to schedule AWV", enter date | Due Date = Status Date + 7 days | |
| 6.1.2 | AWV scheduled - 1 day | Set "AWV scheduled", enter date | Due Date = Status Date + 1 day | |
| 6.1.3 | AWV completed - 365 days | Set "AWV completed", enter date | Due Date = Status Date + 365 days | |
| 6.1.4 | Patient declined - no due date | Set "Patient declined AWV" | Due Date is null | |

### 7.2 Diabetic Eye Exam

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.2.1 | Eye exam discussed - 42 days | Set "Diabetic eye exam discussed", enter date | Due Date = Status Date + 42 days | |
| 6.2.2 | Eye exam referral - 42 days | Set "Diabetic eye exam referral made", enter date | Due Date = Status Date + 42 days | |
| 6.2.3 | Eye exam scheduled - 1 day | Set "Diabetic eye exam scheduled", enter date | Due Date = Status Date + 1 day | |

### 7.3 Colon Cancer Screening

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.3.1 | Colonoscopy - 42 days | Set "Colon cancer screening ordered", Tracking#1 = "Colonoscopy" | Due Date = Status Date + 42 days | |
| 6.3.2 | Sigmoidoscopy - 42 days | Set Tracking#1 = "Sigmoidoscopy" | Due Date = Status Date + 42 days | |
| 6.3.3 | Cologuard - 21 days | Set Tracking#1 = "Cologuard" | Due Date = Status Date + 21 days | |
| 6.3.4 | FOBT - 21 days | Set Tracking#1 = "FOBT" | Due Date = Status Date + 21 days | |

### 7.4 Breast Cancer Screening

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.4.1 | Mammogram - 14 days | Set "Screening test ordered", Tracking#1 = "Mammogram" | Due Date = Status Date + 14 days | |
| 6.4.2 | Breast Ultrasound - 14 days | Set Tracking#1 = "Breast Ultrasound" | Due Date = Status Date + 14 days | |
| 6.4.3 | Breast MRI - 21 days | Set Tracking#1 = "Breast MRI" | Due Date = Status Date + 21 days | |

### 7.5 Cervical Cancer Screening

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.5.1 | In 1 Month - 30 days | Set "Screening discussed", Tracking#1 = "In 1 Month" | Due Date = Status Date + 30 days | |
| 6.5.2 | In 3 Months - 90 days | Set Tracking#1 = "In 3 Months" | Due Date = Status Date + 90 days | |
| 6.5.3 | In 6 Months - 180 days | Set Tracking#1 = "In 6 Months" | Due Date = Status Date + 180 days | |
| 6.5.4 | In 11 Months - 330 days | Set Tracking#1 = "In 11 Months" | Due Date = Status Date + 330 days | |

### 7.6 Hypertension Management

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.6.1 | Call every 1 wk - 7 days | Set "Scheduled call back - BP not at goal", Tracking#1 = "Call every 1 wk" | Due Date = Status Date + 7 days | |
| 6.6.2 | Call every 2 wks - 14 days | Set Tracking#1 = "Call every 2 wks" | Due Date = Status Date + 14 days | |
| 6.6.3 | Call every 4 wks - 28 days | Set Tracking#1 = "Call every 4 wks" | Due Date = Status Date + 28 days | |
| 6.6.4 | Call every 8 wks - 56 days | Set Tracking#1 = "Call every 8 wks" | Due Date = Status Date + 56 days | |

### 7.7 Diabetes Control (HgbA1c)

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.7.1 | HgbA1c 3 months | Set "HgbA1c at goal", Tracking#2 = "3 months" | Due Date = Status Date + 90 days | |
| 6.7.2 | HgbA1c 6 months | Set Tracking#2 = "6 months" | Due Date = Status Date + 180 days | |
| 6.7.3 | HgbA1c 12 months | Set Tracking#2 = "12 months" | Due Date = Status Date + 365 days | |
| 6.7.4 | HgbA1c NOT at goal - same | Set "HgbA1c NOT at goal", Tracking#2 = "3 months" | Due Date = Status Date + 90 days | |

### 7.8 Other Quality Measures

| ID | Test Case | Steps | Expected Result | Pass/Fail |
|----|-----------|-------|-----------------|-----------|
| 6.8.1 | Diabetic Nephropathy contacted - 10 days | Set "Patient contacted for screening" | Due Date = Status Date + 10 days | |
| 6.8.2 | Diabetic Nephropathy ordered - 5 days | Set "Urine microalbumin ordered" | Due Date = Status Date + 5 days | |
| 6.8.3 | GC/Chlamydia contacted - 10 days | Set "Patient contacted for screening" | Due Date = Status Date + 10 days | |
| 6.8.4 | GC/Chlamydia ordered - 5 days | Set "Test ordered" | Due Date = Status Date + 5 days | |
| 6.8.5 | Vaccination discussed - 7 days | Set "Vaccination discussed" | Due Date = Status Date + 7 days | |
| 6.8.6 | Vaccination scheduled - 1 day | Set "Vaccination scheduled" | Due Date = Status Date + 1 day | |
| 6.8.7 | ACE/ARB prescribed - 14 days | Set "ACE/ARB prescribed" | Due Date = Status Date + 14 days | |
| 6.8.8 | Annual Serum ordered - 7 days | Set "Lab ordered" | Due Date = Status Date + 7 days | |
| 6.8.9 | Chronic DX attestation - 14 days | Set "Chronic diagnosis resolved", Tracking#1 = "Attestation not sent" | Due Date = Status Date + 14 days | |

---

## 8. Test Data Reference

### 8.1 Request Type → Quality Measure Mapping

| Request Type | Quality Measures |
|--------------|------------------|
| AWV | Annual Wellness Visit (auto-fill) |
| Chronic DX | Chronic Diagnosis Code (auto-fill) |
| Quality | Diabetic Eye Exam, GC/Chlamydia Screening, Diabetic Nephropathy, Hypertension Management, ACE/ARB in DM or CAD, Vaccination, Diabetes Control, Annual Serum K&Cr |
| Screening | Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening |

### 8.2 Status Color Reference

| Color | Hex | Status Keywords |
|-------|-----|-----------------|
| White | #FFFFFF | Not Addressed |
| Gray | #E9EBF3 | No longer applicable, Screening unnecessary |
| Purple | #E5D9F2 | declined, Contraindicated |
| Green | #D4EDDA | completed, at goal, confirmed, on ACE/ARB |
| Blue | #CCE5FF | scheduled, ordered |
| Yellow | #FFF9E6 | called to schedule, discussed, contacted |
| Orange | #FFE8CC | resolved, invalid |
| Red | #FFCDD2 | Overdue (pending status + past due date) |
| Light Yellow | #FEF3C7 | Duplicate patient |

### 8.3 Time Interval Editable Statuses

**NOT Editable (dropdown-based intervals):**
- Screening discussed (Cervical - month selection)
- HgbA1c at goal
- HgbA1c NOT at goal
- Colon cancer screening ordered
- Screening test ordered (Breast)
- Scheduled call back - BP not at goal
- Scheduled call back - BP at goal
- Chronic diagnosis resolved
- Chronic diagnosis invalid

**Editable (baseDueDays defaults):**
- All other statuses with a due date calculation

---

## Test Execution Log

| Date | Tester | Phases Tested | Pass Rate | Notes |
|------|--------|---------------|-----------|-------|
| | | | | |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-09 | Initial test plan covering Phases 1-6 |
