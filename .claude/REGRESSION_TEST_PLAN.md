# Patient Quality Measure Tracking System - Regression Test Plan

This document contains manual test cases for verifying system functionality. Run these tests after major changes or before releases.

---

## Test Environment Setup

1. Ensure backend is running (`npm run dev` in `/backend`)
2. Ensure frontend is running (`npm run dev` in `/frontend`)
3. Ensure PostgreSQL database has seed data (`npx prisma db push && npx tsx prisma/seed.ts`)
4. Access application at http://localhost:5173 (dev) or production URL

---

## 1. Data Loading & Display

### TC-1.1: Initial Data Load
**Steps:**
1. Navigate to application
2. Wait for loading spinner to complete

**Expected:**
- Grid displays all patient measures
- Status bar shows total row count
- No error messages

### TC-1.2: Patient Data Columns
**Steps:**
1. Verify columns are visible: Member Name, Request Type, Quality Measure, Measure Status, Status Date, Due Date, Time Interval (Days), Tracking #1, Tracking #2, Tracking #3, Notes

**Expected:**
- All columns render correctly
- DOB, Telephone, Address columns hidden by default

### TC-1.3: Member Info Toggle
**Steps:**
1. Click "Show Member Info" button in toolbar
2. Observe grid columns

**Expected:**
- DOB, Telephone, Address columns become visible
- DOB displays as "###" for privacy
- Telephone displays formatted as (555) 123-4567

---

## 2. Row Selection & Editing

### TC-2.1: Row Selection
**Steps:**
1. Click on any row in the grid
2. Observe visual feedback

**Expected:**
- Row has blue outline border
- Row maintains its status color (not overridden by selection)
- Status bar remains unchanged

### TC-2.2: Cell Editing - Text Fields
**Steps:**
1. Click on Notes cell
2. Enter new text
3. Press Tab or click elsewhere

**Expected:**
- Cell enters edit mode on single click
- Text is saved after exiting edit mode
- "Saving..." then "Saved" indicator appears in toolbar

### TC-2.3: Cell Editing - Date Fields
**Steps:**
1. Click on Status Date cell
2. Enter date in format: 1/15/2026
3. Press Tab

**Expected:**
- Date is accepted and displays as 01/15/2026
- Due Date recalculates based on status rules

### TC-2.4: Date Input Flexibility
**Steps:**
1. Try entering dates in various formats:
   - M/D/YY → 1/5/26
   - MM/DD/YYYY → 01/05/2026
   - M.D.YYYY → 1.5.2026
   - YYYY-MM-DD → 2026-01-05

**Expected:**
- All formats are accepted and normalized to MM/DD/YYYY

### TC-2.5: Invalid Date Handling
**Steps:**
1. Click on Status Date cell
2. Enter invalid text: "abc"
3. Press Tab

**Expected:**
- Error popup appears: "Invalid date format"
- Cell reverts to previous value

---

## 3. Sorting Behavior

### TC-3.1: Column Header Sort
**Steps:**
1. Click on "Quality Measure" column header
2. Observe grid

**Expected:**
- Rows sort ascending (A-Z)
- Sort indicator (arrow) appears in column header
- Click again to sort descending (Z-A)
- Click third time to clear sort

### TC-3.2: No Auto-Sort During Editing
**Steps:**
1. Sort by "Quality Measure" column (ascending)
2. Select a row in the middle of the grid
3. Edit the Quality Measure value to something that would change its sort position
4. Press Tab to save

**Expected:**
- Row stays in its current position (does NOT jump to new sorted position)
- Sort indicator is cleared from column header
- Row selection is preserved

### TC-3.3: Sort Indicator Clearing with Position Preservation
**Steps:**
1. Sort by "Member Name" column
2. Note a row's position (e.g., row 5)
3. Edit the Member Name value
4. Press Tab

**Expected:**
- Row remains at position 5 (not re-sorted)
- Sort indicator arrow is cleared from Member Name column
- All other rows maintain their positions

### TC-3.4: Multi-Cell Edit Without Re-Sort
**Steps:**
1. Sort by "Measure Status"
2. Edit Measure Status on row 3
3. Without clicking elsewhere, edit Notes on same row
4. Press Tab

**Expected:**
- Row 3 remains at position 3 throughout all edits
- Sort indicator cleared after first edit to sorted column

---

## 4. Status Color Filter Bar

### TC-4.1: Filter Bar Display
**Steps:**
1. Observe filter bar below toolbar

**Expected:**
- Filter chips displayed in order: All, Not Started, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A
- Each chip shows count in parentheses
- "All" chip is selected by default (has ring highlight)

### TC-4.2: Single Filter Selection
**Steps:**
1. Click "Completed" (green) chip

**Expected:**
- Only green (completed) rows are displayed
- Status bar shows "Showing X of Y rows"
- "Completed" chip has ring highlight
- "All" chip no longer highlighted

### TC-4.3: Filter Deselection
**Steps:**
1. With "Completed" selected, click "Completed" again

**Expected:**
- Filter returns to "All"
- All rows are displayed
- "All" chip is highlighted

### TC-4.4: Filter Switch
**Steps:**
1. Click "In Progress" (blue) chip
2. Click "Declined" (purple) chip

**Expected:**
- View switches directly to purple (declined) rows
- Only one filter active at a time
- "Declined" chip highlighted, "In Progress" not highlighted

### TC-4.5: Filter Counts Accuracy
**Steps:**
1. Count rows of each color manually (or note total)
2. Compare with chip counts

**Expected:**
- Each chip count matches actual row count of that color
- "All" chip count equals sum of all other counts

---

## 5. Row Status Colors

### TC-5.1: Status-Based Colors
**Steps:**
1. Find rows with different Measure Status values
2. Verify colors match:
   - "AWV completed" → Green
   - "AWV scheduled" → Blue
   - "Patient called to schedule AWV" → Yellow
   - "Patient declined AWV" → Purple
   - "No longer applicable" → Gray
   - "Not Addressed" → White

**Expected:**
- Colors match the status category

### TC-5.2: Overdue Row Color (Pending Status)
**Steps:**
1. Find a row with Due Date in the past
2. Ensure Measure Status is pending (blue/yellow/white category)

**Expected:**
- Row displays as light red (overdue)
- Overdue color takes priority over status color

### TC-5.2b: Overdue Row Color (Completed Status)
**Steps:**
1. Find patient "Bennett, Carol" (AWV completed 400+ days ago)
2. Verify the Due Date is in the past (365 days after completion)

**Expected:**
- Row displays as light red (overdue), NOT green
- Indicates annual measure renewal is needed

### TC-5.2c: Non-Overdue Terminal Statuses
**Steps:**
1. Find a row with "Patient declined AWV" (purple)
2. Verify no due date or past due date

**Expected:**
- Row stays purple (NOT red)
- Declined statuses never turn red

### TC-5.2d: Completed Row Turns Red on Edit
**Steps:**
1. Find a green (completed) row with future due date
2. Change Status Date to over 365 days ago
3. Press Tab

**Expected:**
- Due Date recalculates to past date
- Row immediately turns red (overdue)

### TC-5.3: Color Preserved During Selection
**Steps:**
1. Click on a green (completed) row
2. Observe the row

**Expected:**
- Row has green background with blue outline border
- Green color is NOT overridden by selection

### TC-5.4: Real-Time Color Update
**Steps:**
1. Select a white row (Not Addressed)
2. Change Measure Status to "AWV completed"
3. Press Tab

**Expected:**
- Row immediately changes to green
- Selection outline remains

---

## 6. Cascading Dropdowns

### TC-6.1: Request Type to Quality Measure
**Steps:**
1. Click Request Type cell
2. Select "AWV"

**Expected:**
- Quality Measure auto-fills with "Annual Wellness Visit"

### TC-6.2: Quality Measure Options
**Steps:**
1. Set Request Type to "Quality"
2. Click Quality Measure cell

**Expected:**
- Dropdown shows 8 options (Diabetic Eye Exam, Diabetes Control, etc.)

### TC-6.3: Measure Status Filtering
**Steps:**
1. Set Quality Measure to "Annual Wellness Visit"
2. Click Measure Status cell

**Expected:**
- Dropdown shows AWV-specific options (AWV completed, AWV scheduled, etc.)

### TC-6.4: Dependent Field Reset
**Steps:**
1. Set Quality Measure to "Annual Wellness Visit"
2. Set Measure Status to "AWV completed"
3. Change Quality Measure to "Diabetic Eye Exam"

**Expected:**
- Measure Status resets/clears
- Previous status value is NOT retained

### TC-6.5: Chronic DX Auto-Fill
**Steps:**
1. Set Request Type to "Chronic DX"

**Expected:**
- Quality Measure auto-fills with "Chronic Diagnosis Code"
- Cannot select other quality measures

### TC-6.6: Screening Quality Measures
**Steps:**
1. Set Request Type to "Screening"
2. Click Quality Measure dropdown

**Expected:**
- Shows exactly 3 options: Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening

### TC-6.7: Quality Request Type Options
**Steps:**
1. Set Request Type to "Quality"
2. Click Quality Measure dropdown

**Expected:**
- Shows 8 options: Diabetic Eye Exam, GC/Chlamydia Screening, Diabetic Nephropathy, Hypertension Management, ACE/ARB in DM or CAD, Vaccination, Diabetes Control, Annual Serum K&Cr

---

## 7. Due Date Calculation

### TC-7.1: Basic Due Date Calculation
**Steps:**
1. Set Measure Status to "Patient called to schedule AWV"
2. Set Status Date to 01/10/2026

**Expected:**
- Due Date auto-calculates to 01/17/2026 (7 days later)
- Time Interval (Days) shows 7

### TC-7.2: Tracking-Dependent Due Date
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Set Tracking #1 to "Colonoscopy"
4. Set Status Date to 01/10/2026

**Expected:**
- Due Date calculates to 6 weeks later (02/21/2026)
- Time Interval shows 42

### TC-7.3: Time Interval Manual Edit
**Steps:**
1. Set a status with baseDueDays default
2. Note the Due Date
3. Click Time Interval cell and change to 14

**Expected:**
- Due Date updates to Status Date + 14 days
- Edit is saved

---

## 8. Duplicate Detection

### TC-8.1: Add Duplicate Patient
**Steps:**
1. Click "Add Row" button
2. Enter Member Name matching an existing patient
3. Enter DOB matching the same existing patient
4. Click Add

**Expected:**
- Error modal appears: "Duplicate Patient"
- Row is NOT created
- Form data is preserved for correction

### TC-8.2: Duplicate Visual Indicator
**Steps:**
1. Find two rows with the same patient (name + DOB)

**Expected:**
- Both rows have light yellow duplicate indicator background

---

## 9. Add/Delete Operations

### TC-9.1: Add New Row
**Steps:**
1. Click "Add Row" button
2. Fill in Member Name, DOB, Telephone, Address
3. Click Add

**Expected:**
- New row appears in grid
- "Saved" indicator shows
- Row has default Request Type, Quality Measure values

### TC-9.2: Delete Row
**Steps:**
1. Select a row
2. Click "Delete" button
3. Confirm in modal

**Expected:**
- Row is removed from grid
- Row count decreases
- "Saved" indicator shows

### TC-9.3: Delete Without Selection
**Steps:**
1. Ensure no row is selected
2. Observe Delete button

**Expected:**
- Delete button is disabled

---

## 10. Status Bar

### TC-10.1: Row Count Display
**Steps:**
1. Observe status bar at bottom

**Expected:**
- Shows "Rows: X" where X is total row count
- Shows "Connected" in green

### TC-10.2: Filtered Row Count
**Steps:**
1. Select a color filter (e.g., "Completed")
2. Observe status bar

**Expected:**
- Shows "Showing X of Y rows"
- X is filtered count, Y is total count

---

## 11. Tracking Fields

### TC-11.1: Tracking #1 Dropdown
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Click Tracking #1 cell

**Expected:**
- Dropdown shows: Colonoscopy, Sigmoidoscopy, Cologuard, FOBT

### TC-11.2: Tracking #1 N/A State
**Steps:**
1. Set Measure Status to a status without tracking options
2. Observe Tracking #1 cell

**Expected:**
- Cell shows italic "N/A"
- Cell has diagonal stripe overlay
- Cell is NOT editable

### TC-11.3: Tracking #2 for HgbA1c
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c ordered"
3. Click Tracking #2 cell

**Expected:**
- Dropdown shows month options (1 month, 2 months, etc.)

### TC-11.4: Tracking #1 Free Text for HgbA1c
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c at goal"
3. Click Tracking #1 cell

**Expected:**
- Cell shows prompt "HgbA1c value" when empty
- Accepts free text input (e.g., "6.5", "8.2")
- NOT a dropdown

### TC-11.5: Tracking #2 Free Text for Hypertension
**Steps:**
1. Set Quality Measure to "Hypertension Management"
2. Set Measure Status to "Scheduled call back - BP not at goal"
3. Click Tracking #2 cell

**Expected:**
- Cell shows prompt "BP reading" when empty
- Accepts free text input (e.g., "145/92")
- Tracking #1 shows call interval dropdown

### TC-11.6: Cervical Cancer Month Tracking
**Steps:**
1. Set Quality Measure to "Cervical Cancer Screening"
2. Set Measure Status to "Screening discussed"
3. Click Tracking #1 cell

**Expected:**
- Dropdown shows: In 1 Month through In 11 Months
- Selecting "In 3 Months" sets due date to statusDate + 90 days

### TC-11.7: Chronic Diagnosis Attestation Tracking
**Steps:**
1. Set Quality Measure to "Chronic Diagnosis Code"
2. Set Measure Status to "Chronic diagnosis resolved"
3. Click Tracking #1 cell

**Expected:**
- Dropdown shows: Attestation not sent, Attestation sent
- "Attestation not sent" sets due date to statusDate + 14 days
- "Attestation sent" has no due date

---

## 12. Time Interval Editability

### TC-12.1: Time Interval Editable (Base Due Days)
**Steps:**
1. Set Measure Status to "AWV scheduled" (baseDueDays = 1)
2. Click Time Interval cell
3. Change value to 7

**Expected:**
- Cell is editable
- Due Date updates to Status Date + 7 days
- Value is saved

### TC-12.2: Time Interval Read-Only (Tracking Dropdown)
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Set Tracking #1 to "Colonoscopy"
4. Click Time Interval cell

**Expected:**
- Cell is NOT editable (read-only)
- Shows 42 (from tracking rule)
- Must change Tracking #1 to change interval

### TC-12.3: Time Interval Read-Only (HgbA1c)
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c at goal"
3. Set Tracking #2 to "3 months"
4. Click Time Interval cell

**Expected:**
- Cell is NOT editable (read-only)
- Shows 90 (3 months)
- Must change Tracking #2 to change interval

---

## 13. Error Handling

### TC-13.1: Network Error Recovery
**Steps:**
1. Stop backend server
2. Try to edit a cell
3. Restart backend

**Expected:**
- Error indicator shows
- Retry button or auto-retry works

### TC-13.2: Validation Error
**Steps:**
1. Try to save invalid data

**Expected:**
- Error message displays
- Data is not corrupted

---

## Test Execution Checklist

| Test Case | Pass | Fail | Notes |
|-----------|------|------|-------|
| TC-1.1 | | | |
| TC-1.2 | | | |
| TC-1.3 | | | |
| TC-2.1 | | | |
| TC-2.2 | | | |
| TC-2.3 | | | |
| TC-2.4 | | | |
| TC-2.5 | | | |
| TC-3.1 | | | |
| TC-3.2 | | | |
| TC-3.3 | | | |
| TC-3.4 | | | |
| TC-4.1 | | | |
| TC-4.2 | | | |
| TC-4.3 | | | |
| TC-4.4 | | | |
| TC-4.5 | | | |
| TC-5.1 | | | |
| TC-5.2 | | | |
| TC-5.2b | | | Completed row overdue |
| TC-5.2c | | | Terminal status no red |
| TC-5.2d | | | Edit triggers red |
| TC-5.3 | | | |
| TC-5.4 | | | |
| TC-6.1 | | | |
| TC-6.2 | | | |
| TC-6.3 | | | |
| TC-6.4 | | | |
| TC-6.5 | | | Chronic DX auto-fill |
| TC-6.6 | | | Screening options |
| TC-6.7 | | | Quality options |
| TC-7.1 | | | |
| TC-7.2 | | | |
| TC-7.3 | | | |
| TC-8.1 | | | |
| TC-8.2 | | | |
| TC-9.1 | | | |
| TC-9.2 | | | |
| TC-9.3 | | | |
| TC-10.1 | | | |
| TC-10.2 | | | |
| TC-11.1 | | | |
| TC-11.2 | | | |
| TC-11.3 | | | |
| TC-11.4 | | | HgbA1c free text |
| TC-11.5 | | | Hypertension BP reading |
| TC-11.6 | | | Cervical month tracking |
| TC-11.7 | | | Chronic attestation |
| TC-12.1 | | | Time interval editable |
| TC-12.2 | | | Time interval read-only (tracking) |
| TC-12.3 | | | Time interval read-only (HgbA1c) |
| TC-13.1 | | | |
| TC-13.2 | | | |

---

## Last Updated

January 13, 2026 - Added overdue logic for completed rows, cascading dropdown tests, tracking field tests, time interval editability tests
