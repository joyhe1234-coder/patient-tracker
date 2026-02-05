# Patient Quality Measure Tracking System - Regression Test Plan

This document contains test cases for verifying system functionality. Each test case includes automation status and requirement traceability. Run manual tests after major changes or before releases.

---

## Automation Legend

| Status | Meaning |
|--------|---------|
| **Automated** | Fully covered by automated test(s) |
| **Partial** | Some aspects automated, manual verification recommended |
| **Manual** | No automated test exists - must test manually |

---

## Test Environment Setup

1. Ensure backend is running (`npm run dev` in `/backend`)
2. Ensure frontend is running (`npm run dev` in `/frontend`)
3. Ensure PostgreSQL database has seed data (`npx prisma db push && npx tsx prisma/seed.ts`)
4. Access application at http://localhost:5173 (dev) or production URL

---

## 1. Data Loading & Display

**Requirement Spec:** [`.claude/specs/data-display/requirements.md`](specs/data-display/requirements.md)

### TC-1.1: Initial Data Load
**Requirement:** AC-1, AC-7, AC-8, AC-9
**Automation:** Automated - `smoke.spec.ts: "should load the application"`, `smoke.spec.ts: "should display the status bar"`
**Steps:**
1. Navigate to application
2. Wait for loading spinner to complete

**Expected:**
- Grid displays all patient measures
- Status bar shows total row count
- No error messages

### TC-1.2: Patient Data Columns
**Requirement:** AC-2, AC-3
**Automation:** Automated - `smoke.spec.ts: "should display the patient grid"`, `Toolbar.test.tsx`
**Steps:**
1. Verify columns are visible: Member Name, Request Type, Quality Measure, Measure Status, Status Date, Due Date, Time Interval (Days), Tracking #1, Tracking #2, Tracking #3, Notes

**Expected:**
- All columns render correctly
- DOB, Telephone, Address columns hidden by default

### TC-1.3: Member Info Toggle
**Requirement:** AC-4, AC-5, AC-6
**Automation:** Partial - `Toolbar.test.tsx: "toggles member info"` (toggle tested, DOB masking and phone formatting not automated)
**Steps:**
1. Click "Show Member Info" button in toolbar
2. Observe grid columns

**Expected:**
- DOB, Telephone, Address columns become visible
- DOB displays as "###" for privacy
- Telephone displays formatted as (555) 123-4567

---

## 2. Row Selection & Editing

**Requirement Spec:** [`.claude/specs/cell-editing/requirements.md`](specs/cell-editing/requirements.md)

### TC-2.1: Row Selection
**Requirement:** AC-1, AC-2, AC-9
**Automation:** Partial - `sorting-filtering.cy.ts: "Row selection preserves color"` (color preservation tested, outline and status bar not explicitly)
**Steps:**
1. Click on any row in the grid
2. Observe visual feedback

**Expected:**
- Row has blue outline border
- Row maintains its status color (not overridden by selection)
- Status bar remains unchanged

### TC-2.2: Cell Editing - Text Fields
**Requirement:** AC-3, AC-4, AC-5
**Automation:** Manual - cell editing E2E not automated (AG Grid interaction complexity)
**Steps:**
1. Click on Notes cell
2. Enter new text
3. Press Tab or click elsewhere

**Expected:**
- Cell enters edit mode on single click
- Text is saved after exiting edit mode
- "Saving..." then "Saved" indicator appears in toolbar

### TC-2.3: Cell Editing - Date Fields
**Requirement:** AC-6, AC-7
**Automation:** Manual - date field editing not automated
**Steps:**
1. Click on Status Date cell
2. Enter date in format: 1/15/2026
3. Press Tab

**Expected:**
- Date is accepted and displays as 01/15/2026
- Due Date recalculates based on status rules

### TC-2.4: Date Input Flexibility
**Requirement:** AC-6
**Automation:** Manual - date format flexibility not E2E tested (backend dateParser.ts has unit tests)
**Steps:**
1. Try entering dates in various formats:
   - M/D/YY → 1/5/26
   - MM/DD/YYYY → 01/05/2026
   - M.D.YYYY → 1.5.2026
   - YYYY-MM-DD → 2026-01-05

**Expected:**
- All formats are accepted and normalized to MM/DD/YYYY

### TC-2.5: Invalid Date Handling
**Requirement:** AC-8
**Automation:** Manual - invalid date handling not E2E tested
**Steps:**
1. Click on Status Date cell
2. Enter invalid text: "abc"
3. Press Tab

**Expected:**
- Error popup appears: "Invalid date format"
- Cell reverts to previous value

---

## 3. Sorting Behavior

**Requirement Spec:** [`.claude/specs/sorting/requirements.md`](specs/sorting/requirements.md)

### TC-3.1: Column Header Sort
**Requirement:** AC-1, AC-2
**Automation:** Automated - `sorting-filtering.cy.ts: "Sort indicator behavior"` (16 sorting tests)
**Steps:**
1. Click on "Quality Measure" column header
2. Observe grid

**Expected:**
- Rows sort ascending (A-Z)
- Sort indicator (arrow) appears in column header
- Click again to sort descending (Z-A)
- Click third time to clear sort

### TC-3.2: No Auto-Sort During Editing
**Requirement:** AC-3, AC-4, AC-5
**Automation:** Manual - post-edit sort suppression not automated
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
**Requirement:** AC-3, AC-4
**Automation:** Manual - sort indicator clearing on edit not automated
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
**Requirement:** AC-6
**Automation:** Manual - multi-cell edit behavior not automated
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

**Requirement Spec:** [`.claude/specs/status-filter/requirements.md`](specs/status-filter/requirements.md)

### TC-4.1: Filter Bar Display
**Requirement:** AC-1, AC-2, AC-3
**Automation:** Automated - `StatusFilterBar.test.tsx` (45 tests), `sorting-filtering.cy.ts: "Filter chip display"`
**Steps:**
1. Observe filter bar below toolbar

**Expected:**
- Filter chips displayed in order: All, Not Started, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A
- Each chip shows count in parentheses
- "All" chip is selected by default (has ring highlight)

### TC-4.2: Single Filter Selection
**Requirement:** AC-4, AC-7
**Automation:** Automated - `sorting-filtering.cy.ts: "Filter by status"` (9 tests)
**Steps:**
1. Click "Completed" (green) chip

**Expected:**
- Only green (completed) rows are displayed
- Status bar shows "Showing X of Y rows"
- "Completed" chip has ring highlight
- "All" chip no longer highlighted

### TC-4.3: Filter Deselection
**Requirement:** AC-5
**Automation:** Automated - `sorting-filtering.cy.ts: "Filter toggle behavior"`
**Steps:**
1. With "Completed" selected, click "Completed" again

**Expected:**
- Filter returns to "All"
- All rows are displayed
- "All" chip is highlighted

### TC-4.4: Filter Switch
**Requirement:** AC-6
**Automation:** Automated - `sorting-filtering.cy.ts: "Filter toggle behavior"`
**Steps:**
1. Click "In Progress" (blue) chip
2. Click "Declined" (purple) chip

**Expected:**
- View switches directly to purple (declined) rows
- Only one filter active at a time
- "Declined" chip highlighted, "In Progress" not highlighted

### TC-4.5: Filter Counts Accuracy
**Requirement:** AC-8
**Automation:** Automated - `sorting-filtering.cy.ts: "Filter chip counts"`
**Steps:**
1. Count rows of each color manually (or note total)
2. Compare with chip counts

**Expected:**
- Each chip count matches actual row count of that color
- "All" chip count equals sum of all other counts

---

## 5. Row Status Colors

**Requirement Spec:** [`.claude/specs/row-colors/requirements.md`](specs/row-colors/requirements.md)

### TC-5.1: Status-Based Colors
**Requirement:** AC-1
**Automation:** Automated - `sorting-filtering.cy.ts: "Row Color Verification"` (10 tests), `cascading-dropdowns.cy.ts: row color tests`
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
**Requirement:** AC-2, AC-3
**Automation:** Partial - `sorting-filtering.cy.ts: "Overdue" filter` (filter tested, not date-specific overdue logic)
**Steps:**
1. Find a row with Due Date in the past
2. Ensure Measure Status is pending (blue/yellow/white category)

**Expected:**
- Row displays as light red (overdue)
- Overdue color takes priority over status color

### TC-5.2b: Overdue Row Color (Completed Status)
**Requirement:** AC-3, AC-4
**Automation:** Manual - completed overdue (annual renewal) not automated
**Steps:**
1. Find patient "Bennett, Carol" (AWV completed 400+ days ago)
2. Verify the Due Date is in the past (365 days after completion)

**Expected:**
- Row displays as light red (overdue), NOT green
- Indicates annual measure renewal is needed

### TC-5.2c: Non-Overdue Terminal Statuses
**Requirement:** AC-5
**Automation:** Manual - terminal status overdue exclusion not automated
**Steps:**
1. Find a row with "Patient declined AWV" (purple)
2. Verify no due date or past due date

**Expected:**
- Row stays purple (NOT red)
- Declined statuses never turn red

### TC-5.2d: Completed Row Turns Red on Edit
**Requirement:** AC-4, AC-7
**Automation:** Manual - edit-triggers-overdue not automated
**Steps:**
1. Find a green (completed) row with future due date
2. Change Status Date to over 365 days ago
3. Press Tab

**Expected:**
- Due Date recalculates to past date
- Row immediately turns red (overdue)

### TC-5.3: Color Preserved During Selection
**Requirement:** AC-6
**Automation:** Automated - `sorting-filtering.cy.ts: "Row selection preserves color"`
**Steps:**
1. Click on a green (completed) row
2. Observe the row

**Expected:**
- Row has green background with blue outline border
- Green color is NOT overridden by selection

### TC-5.4: Real-Time Color Update
**Requirement:** AC-7
**Automation:** Automated - `cascading-dropdowns.cy.ts: status change color tests`
**Steps:**
1. Select a white row (Not Addressed)
2. Change Measure Status to "AWV completed"
3. Press Tab

**Expected:**
- Row immediately changes to green
- Selection outline remains

---

## 6. Cascading Dropdowns

**Requirement Spec:** [`.claude/specs/cascading-dropdowns/requirements.md`](specs/cascading-dropdowns/requirements.md)

### TC-6.1: Request Type to Quality Measure
**Requirement:** AC-1, AC-2
**Automation:** Automated - `cascading-dropdowns.cy.ts: "AWV auto-fills Quality Measure"`
**Steps:**
1. Click Request Type cell
2. Select "AWV"

**Expected:**
- Quality Measure auto-fills with "Annual Wellness Visit"

### TC-6.2: Quality Measure Options
**Requirement:** AC-4
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Quality shows 8 options"`
**Steps:**
1. Set Request Type to "Quality"
2. Click Quality Measure cell

**Expected:**
- Dropdown shows 8 options (Diabetic Eye Exam, Diabetes Control, etc.)

### TC-6.3: Measure Status Filtering
**Requirement:** AC-6
**Automation:** Automated - `cascading-dropdowns.cy.ts: AWV/Breast Cancer/Chronic status tests`
**Steps:**
1. Set Quality Measure to "Annual Wellness Visit"
2. Click Measure Status cell

**Expected:**
- Dropdown shows AWV-specific options (AWV completed, AWV scheduled, etc.)

### TC-6.4: Dependent Field Reset
**Requirement:** AC-8
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Changing Quality Measure clears Measure Status"`
**Steps:**
1. Set Quality Measure to "Annual Wellness Visit"
2. Set Measure Status to "AWV completed"
3. Change Quality Measure to "Diabetic Eye Exam"

**Expected:**
- Measure Status resets/clears
- Previous status value is NOT retained

### TC-6.5: Chronic DX Auto-Fill
**Requirement:** AC-3
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Chronic DX auto-fills"`
**Steps:**
1. Set Request Type to "Chronic DX"

**Expected:**
- Quality Measure auto-fills with "Chronic Diagnosis Code"
- Cannot select other quality measures

### TC-6.6: Screening Quality Measures
**Requirement:** AC-5
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Screening shows 3 options"`
**Steps:**
1. Set Request Type to "Screening"
2. Click Quality Measure dropdown

**Expected:**
- Shows exactly 3 options: Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening

### TC-6.7: Quality Request Type Options
**Requirement:** AC-4
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Quality shows 8 Quality Measure options"`
**Steps:**
1. Set Request Type to "Quality"
2. Click Quality Measure dropdown

**Expected:**
- Shows 8 options: Diabetic Eye Exam, GC/Chlamydia Screening, Diabetic Nephropathy, Hypertension Management, ACE/ARB in DM or CAD, Vaccination, Diabetes Control, Annual Serum K&Cr

### TC-6.8: Cascading Clear on Request Type Change
**Requirement:** AC-7, AC-10
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Changing Request Type clears Quality Measure"`
**Steps:**
1. Fill in a complete row: Request Type, Quality Measure, Measure Status, Status Date, Tracking #1, Due Date populated
2. Change Request Type to a different value

**Expected:**
- Quality Measure clears (or auto-fills for AWV/Chronic DX)
- Measure Status clears
- Status Date clears
- Tracking #1, #2, #3 clear
- Due Date clears
- Time Interval clears
- Notes are PRESERVED (not cleared)

### TC-6.9: Cascading Clear on Quality Measure Change
**Requirement:** AC-8, AC-10
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Changing Quality Measure clears Measure Status"`
**Steps:**
1. Fill in row with Measure Status, Status Date, Tracking values
2. Change Quality Measure to a different value

**Expected:**
- Measure Status clears
- Status Date clears
- Tracking #1, #2, #3 clear
- Due Date clears
- Time Interval clears
- Notes are PRESERVED

### TC-6.10: Cascading Clear on Measure Status Change
**Requirement:** AC-9, AC-10
**Automation:** Manual - Measure Status cascade clear not explicitly automated
**Steps:**
1. Fill in row with Status Date, Tracking #1 = "Colonoscopy", Due Date calculated
2. Change Measure Status to a different value

**Expected:**
- Status Date clears
- Tracking #1, #2, #3 clear
- Due Date clears
- Time Interval clears
- Notes are PRESERVED

### TC-6.11: Time Interval Manual Override
**Requirement:** See time-interval spec AC-2, AC-3
**Automation:** Manual - time interval override not automated
**Steps:**
1. Set up row with "Screening test ordered" status (previously non-editable)
2. Click on Time Interval cell
3. Enter a new value (e.g., 30)

**Expected:**
- Time Interval is editable
- Due Date recalculates based on new interval
- Change is saved to database

---

## 7. Due Date Calculation

**Requirement Spec:** [`.claude/specs/due-date/requirements.md`](specs/due-date/requirements.md)

### TC-7.1: Basic Due Date Calculation
**Requirement:** AC-1, AC-3
**Automation:** Automated (backend) - `dueDateCalculator.test.ts` (20 tests). Manual (E2E)
**Steps:**
1. Set Measure Status to "Patient called to schedule AWV"
2. Set Status Date to 01/10/2026

**Expected:**
- Due Date auto-calculates to 01/17/2026 (7 days later)
- Time Interval (Days) shows 7

### TC-7.2: Tracking-Dependent Due Date
**Requirement:** AC-2
**Automation:** Automated (backend) - `dueDateCalculator.test.ts: tracking rule tests`. Manual (E2E)
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Set Tracking #1 to "Colonoscopy"
4. Set Status Date to 01/10/2026

**Expected:**
- Due Date calculates to 6 weeks later (02/21/2026)
- Time Interval shows 42

### TC-7.3: Time Interval Manual Edit
**Requirement:** See time-interval spec AC-4
**Automation:** Manual - time interval manual edit not automated
**Steps:**
1. Set a status with baseDueDays default
2. Note the Due Date
3. Click Time Interval cell and change to 14

**Expected:**
- Due Date updates to Status Date + 14 days
- Edit is saved

---

## 8. Duplicate Detection

**Requirement Spec:** [`.claude/specs/duplicate-detection/requirements.md`](specs/duplicate-detection/requirements.md)

### TC-8.1: Add Duplicate Row (Same Patient + Request Type + Quality Measure)
**Requirement:** AC-1, AC-3, AC-8
**Automation:** Automated - `add-row.spec.ts: duplicate error tests`
**Steps:**
1. Click "Add Row" button
2. Enter Member Name matching an existing patient
3. Enter DOB matching the same existing patient
4. Click Add (row uses default AWV + Annual Wellness Visit)

**Expected:**
- Error modal appears: "Duplicate Row Error"
- Row is NOT created (if patient already has AWV row)
- Form data is preserved for correction

### TC-8.2: Add Row With Same Patient But Different Request Type
**Requirement:** AC-1
**Automation:** Manual - different request type scenario not automated
**Steps:**
1. Add a row for "Patient A" with Request Type "AWV"
2. Click "Add Row" again
3. Enter same "Patient A" name and DOB
4. Click Add

**Expected:**
- Row IS created successfully (NOT a duplicate because AWV is default)
- Wait - this would be duplicate. User should change Request Type in grid after creation

### TC-8.3: Duplicate Detection Skip When Fields Empty
**Requirement:** AC-2
**Automation:** Manual - null field skip not automated
**Steps:**
1. Create a row with empty/null Request Type (via direct database or API)
2. Create another row with same patient and empty Request Type

**Expected:**
- Row IS created (duplicate check skipped when requestType is empty/null)
- Neither row marked as duplicate

### TC-8.4: Duplicate Visual Indicator
**Requirement:** AC-6
**Automation:** Partial - `sorting-filtering.cy.ts: "Duplicates" filter chip` (filter tested, visual indicator not directly)
**Steps:**
1. Create two rows with same patient + requestType + qualityMeasure
   (e.g., via API or by editing requestType/qualityMeasure in grid)

**Expected:**
- Both rows have light yellow duplicate indicator background (#FEF3C7)

### TC-8.5: Update Row Blocked When Creating Duplicate
**Requirement:** AC-4, AC-5, AC-8
**Automation:** Manual - edit-creates-duplicate flow not automated
**Steps:**
1. Have two rows for same patient with different qualityMeasure
2. Edit one row's requestType or qualityMeasure to match the other row

**Expected:**
- Error alert appears: "A row with the same patient, request type, and quality measure already exists."
- The edited field resets to EMPTY (not reverts to old value)
- Dependent fields also reset (qualityMeasure and measureStatus if requestType was edited)
- Update is NOT saved to database

### TC-8.5b: Duplicate Error Resets Dependent Fields
**Requirement:** AC-5
**Automation:** Manual - dependent field reset on duplicate error not automated
**Steps:**
1. Have a row with Request Type = "AWV", Quality Measure = "Annual Wellness Visit"
2. Have another row for same patient with Request Type = "Quality", Quality Measure = "Breast Cancer Screening"
3. Change the second row's Request Type to "AWV"

**Expected:**
- Error alert appears (would create duplicate)
- Request Type resets to empty
- Quality Measure resets to empty
- Measure Status resets to empty

### TC-8.6: Delete Removes Duplicate Status
**Requirement:** AC-7, AC-9
**Automation:** Manual - delete-removes-duplicate not automated
**Steps:**
1. Have two duplicate rows (same patient + requestType + qualityMeasure)
2. Delete one of the rows

**Expected:**
- Remaining row is no longer marked as duplicate
- Yellow background removed from remaining row

---

## 9. Add/Delete Operations

**Requirement Spec:** [`.claude/specs/row-operations/requirements.md`](specs/row-operations/requirements.md)

### TC-9.0: Duplicate Row Button
**Requirement:** AC-10
**Automation:** Automated - `duplicate-member.spec.ts: "Duplicate button disabled without selection"`
**Steps:**
1. Ensure no row is selected
2. Observe "Duplicate" button in toolbar

**Expected:**
- Duplicate button is disabled (grayed out)

### TC-9.0b: Duplicate Row - Creates Copy Below
**Requirement:** AC-11, AC-12, AC-13
**Automation:** Automated - `duplicate-member.spec.ts: "creates copy below selected row"`
**Steps:**
1. Select a row in the middle of the grid (e.g., row 5)
2. Note the patient's name, DOB, phone, address
3. Click "Duplicate" button

**Expected:**
- New row appears directly below selected row (at position 6)
- New row has same memberName, memberDob, phone, address
- New row has empty requestType, qualityMeasure, measureStatus
- New row is selected (highlighted)
- Request Type cell is focused for editing

### TC-9.0c: Duplicate Row - Persists After Refresh
**Requirement:** AC-14
**Automation:** Manual - persistence after refresh not automated
**Steps:**
1. Duplicate a row
2. Note the new row's position
3. Refresh the page

**Expected:**
- New row is still in the same position (below original)
- Patient data is preserved
- Row order is correct

### TC-9.1: Add New Row - First Row Position
**Requirement:** AC-1, AC-2, AC-3, AC-4
**Automation:** Automated - `add-row.spec.ts` (9 tests) - modal form, validation, row creation
**Steps:**
1. Note the current first row in the grid
2. Click "Add Row" button
3. Fill in Member Name, DOB, Telephone, Address
4. Click Add

**Expected:**
- New row appears as FIRST row in grid (not at bottom)
- Previous first row is now second row
- Request Type cell is focused and in edit mode
- requestType, qualityMeasure, measureStatus are empty (not defaulted)

### TC-9.1b: Add New Row - Sort Cleared
**Requirement:** AC-5
**Automation:** Manual - sort clearing on add not automated
**Steps:**
1. Sort grid by any column (e.g., Member Name)
2. Click "Add Row" and add a new row

**Expected:**
- Sort indicator is cleared from column header
- Row positions are preserved (no re-sorting)
- New row is at top

### TC-9.1c: Add New Row - Persists After Refresh
**Requirement:** AC-6
**Automation:** Manual - persistence after refresh not automated
**Steps:**
1. Add a new row
2. Refresh the page

**Expected:**
- New row is still the first row in grid
- Row order is preserved (new row has rowOrder: 0)

### TC-9.2: Delete Row
**Requirement:** AC-7, AC-8, AC-9
**Automation:** Automated - `delete-row.spec.ts` (10 tests, 4 skipped)
**Steps:**
1. Select a row
2. Click "Delete" button
3. Confirm in modal

**Expected:**
- Row is removed from grid
- Row count decreases
- "Saved" indicator shows

### TC-9.3: Delete Without Selection
**Requirement:** AC-7
**Automation:** Automated - `delete-row.spec.ts: "Delete button disabled without selection"`
**Steps:**
1. Ensure no row is selected
2. Observe Delete button

**Expected:**
- Delete button is disabled

---

## 10. Status Bar

**Requirement Spec:** [`.claude/specs/status-bar/requirements.md`](specs/status-bar/requirements.md)

### TC-10.1: Row Count Display
**Requirement:** AC-1, AC-2
**Automation:** Automated - `smoke.spec.ts: "should display the status bar"`
**Steps:**
1. Observe status bar at bottom

**Expected:**
- Shows "Rows: X" where X is total row count
- Shows "Connected" in green

### TC-10.2: Filtered Row Count
**Requirement:** AC-3, AC-4, AC-5
**Automation:** Automated - `sorting-filtering.cy.ts: "Status bar updates"` (2 tests)
**Steps:**
1. Select a color filter (e.g., "Completed")
2. Observe status bar

**Expected:**
- Shows "Showing X of Y rows"
- X is filtered count, Y is total count

---

## 11. Tracking Fields

**Requirement Spec:** [`.claude/specs/tracking-fields/requirements.md`](specs/tracking-fields/requirements.md)

### TC-11.1: Tracking #1 Dropdown
**Requirement:** AC-1
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Screening test ordered shows Tracking #1 options"`
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Click Tracking #1 cell

**Expected:**
- Dropdown shows: Colonoscopy, Sigmoidoscopy, Cologuard, FOBT

### TC-11.2: Tracking #1 N/A State
**Requirement:** AC-2, AC-3
**Automation:** Manual - N/A display and editability not automated
**Steps:**
1. Set Measure Status to a status without tracking options
2. Observe Tracking #1 cell

**Expected:**
- Cell shows italic "N/A"
- Cell has diagonal stripe overlay
- Cell is NOT editable

### TC-11.3: Tracking #2 for HgbA1c
**Requirement:** AC-5
**Automation:** Manual - HgbA1c month dropdown not automated
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c ordered"
3. Click Tracking #2 cell

**Expected:**
- Dropdown shows month options (1 month, 2 months, etc.)

### TC-11.4: Tracking #1 Free Text for HgbA1c
**Requirement:** AC-4
**Automation:** Manual - HgbA1c free text prompt not automated
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c at goal"
3. Click Tracking #1 cell

**Expected:**
- Cell shows prompt "HgbA1c value" when empty
- Accepts free text input (e.g., "6.5", "8.2")
- NOT a dropdown

### TC-11.5: Tracking #2 Free Text for Hypertension
**Requirement:** AC-6
**Automation:** Manual - Hypertension BP reading not automated
**Steps:**
1. Set Quality Measure to "Hypertension Management"
2. Set Measure Status to "Scheduled call back - BP not at goal"
3. Click Tracking #2 cell

**Expected:**
- Cell shows prompt "BP reading" when empty
- Accepts free text input (e.g., "145/92")
- Tracking #1 shows call interval dropdown

### TC-11.6: Cervical Cancer Month Tracking
**Requirement:** AC-7, AC-8
**Automation:** Partial - `dueDateCalculator.test.ts` covers calculation, E2E dropdown not automated
**Steps:**
1. Set Quality Measure to "Cervical Cancer Screening"
2. Set Measure Status to "Screening discussed"
3. Click Tracking #1 cell

**Expected:**
- Dropdown shows: In 1 Month through In 11 Months
- Selecting "In 3 Months" sets due date to statusDate + 90 days

### TC-11.7: Chronic Diagnosis Attestation Tracking
**Requirement:** AC-9
**Automation:** Automated - `cascading-dropdowns.cy.ts: "Chronic diagnosis resolved shows attestation options"`
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

**Requirement Spec:** [`.claude/specs/time-interval/requirements.md`](specs/time-interval/requirements.md)

### TC-12.1: Time Interval Editable (Base Due Days)
**Requirement:** AC-1, AC-2
**Automation:** Manual - time interval editability not E2E automated
**Steps:**
1. Set Measure Status to "AWV scheduled" (baseDueDays = 1)
2. Click Time Interval cell
3. Change value to 7

**Expected:**
- Cell is editable
- Due Date updates to Status Date + 7 days
- Value is saved

### TC-12.2: Time Interval Override (Tracking Dropdown Status)
**Requirement:** AC-3, AC-4, AC-5
**Automation:** Manual - time interval override not automated
**Steps:**
1. Set Quality Measure to "Colon Cancer Screening"
2. Set Measure Status to "Colon cancer screening ordered"
3. Set Tracking #1 to "Colonoscopy" (default interval: 42)
4. Click Time Interval cell
5. Change value to 30

**Expected:**
- Cell IS editable (manual override allowed)
- Due Date updates to Status Date + 30 days
- Override is saved to database

### TC-12.3: Time Interval Override (HgbA1c Status)
**Requirement:** AC-3, AC-4, AC-5
**Automation:** Manual - HgbA1c interval override not automated
**Steps:**
1. Set Quality Measure to "Diabetes Control"
2. Set Measure Status to "HgbA1c at goal"
3. Set Tracking #2 to "3 months" (default interval: 90)
4. Click Time Interval cell
5. Change value to 60

**Expected:**
- Cell IS editable (manual override allowed)
- Due Date updates to Status Date + 60 days
- Override is saved to database

---

## 13. Error Handling

### TC-13.1: Network Error Recovery
**Automation:** Manual - network error recovery not automated
**Steps:**
1. Stop backend server
2. Try to edit a cell
3. Restart backend

**Expected:**
- Error indicator shows
- Retry button or auto-retry works

### TC-13.2: Validation Error
**Automation:** Manual - generic validation error not automated
**Steps:**
1. Try to save invalid data

**Expected:**
- Error message displays
- Data is not corrupted

---

## 14. Import Test Page

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-14.1: Navigate to Import Test Page
**Requirement:** AC-45
**Automation:** Automated - `import-flow.cy.ts: "Import page" tests`
**Steps:**
1. Click "Import Test" link in header navigation

**Expected:**
- Page loads at `/import-test`
- Shows file upload section with "Choose File" button

### TC-14.2: Upload CSV File
**Requirement:** AC-1, AC-4
**Automation:** Automated - `import-flow.cy.ts: file upload tests`, `fileParser.test.ts` (47 tests)
**Steps:**
1. Navigate to Import Test page
2. Click file input and select a CSV file
3. Click "Parse File" button

**Expected:**
- Loading state shows "Parsing..."
- Results display with file metadata (name, type, row count, column count)
- Headers section shows all detected column names
- Preview table shows first 10 rows

### TC-14.3: Upload Excel File
**Requirement:** AC-2
**Automation:** Automated - `fileParser.test.ts: Excel parsing tests`
**Steps:**
1. Navigate to Import Test page
2. Click file input and select an Excel (.xlsx) file
3. Click "Parse File" button

**Expected:**
- File is parsed successfully
- Title/report rows are automatically skipped
- Headers are detected from first data row
- Preview shows actual data rows

### TC-14.4: Column Validation Display
**Requirement:** AC-3
**Automation:** Automated - `fileParser.test.ts: column validation`, `import-flow.cy.ts`
**Steps:**
1. Upload file with required columns

**Expected:**
- Green badge shows "All required columns found" if valid
- Red badge shows "Missing columns" with list if invalid

### TC-14.5: Error Handling
**Requirement:** AC-5
**Automation:** Automated - `import-flow.cy.ts: "Error Handling"` (4 tests)
**Steps:**
1. Upload unsupported file type (e.g., .txt)

**Expected:**
- Error message displays
- No crash or unhandled error

---

## 15. Column Mapping (Phase 5c)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-15.1: Patient Column Mapping
**Requirement:** AC-6
**Automation:** Automated - `columnMapper.test.ts` (28 tests)
**Steps:**
1. Upload CSV with columns: Patient, DOB, Phone, Address
2. Click Transform or Validate

**Expected:**
- Columns mapped to: memberName, memberDob, memberTelephone, memberAddress
- Mapping stats show 4 mapped patient columns

### TC-15.2: Measure Column Mapping (Q1/Q2)
**Requirement:** AC-7
**Automation:** Automated - `columnMapper.test.ts: Q1/Q2 mapping tests`
**Steps:**
1. Upload file with "Annual Wellness Visit Q1" and "Annual Wellness Visit Q2" columns
2. Click Transform

**Expected:**
- Both columns mapped to "Annual Wellness Visit" quality measure
- Q1 = statusDate field, Q2 = complianceStatus field

### TC-15.3: Skip Columns
**Requirement:** AC-9
**Automation:** Automated - `columnMapper.test.ts: skip column tests`
**Steps:**
1. Upload file with columns: Age, Sex, MembID, LOB
2. Click Transform

**Expected:**
- Columns appear in "Skipped" count
- Not included in mapped columns
- No error for these columns

### TC-15.4: Unmapped Columns
**Requirement:** AC-10
**Automation:** Automated - `columnMapper.test.ts: unmapped column tests`
**Steps:**
1. Upload file with unknown column "CustomField"
2. Click Transform

**Expected:**
- Column appears in "Unmapped Columns" list
- Warning displayed but not blocking

### TC-15.5: Missing Required Columns
**Requirement:** AC-3
**Automation:** Automated - `fileParser.test.ts: column validation`
**Steps:**
1. Upload file missing "Patient" column
2. Click Parse

**Expected:**
- Column validation shows "Missing: Patient"
- Red indicator for missing required column

### TC-15.6: Multiple Columns → Same Quality Measure
**Requirement:** AC-8
**Automation:** Automated - `columnMapper.test.ts: grouping tests`
**Steps:**
1. Upload file with columns:
   - "Breast Cancer Screening E Q2"
   - "Breast Cancer Screening 42-51 Years E Q2"
   - "Breast Cancer Screening 52-74 Years E Q2"
2. Click Transform

**Expected:**
- All three columns grouped under "Breast Cancer Screening"
- Single output row per patient for Breast Cancer Screening (not 3 rows)
- Compliance determined by "any non-compliant wins" logic

---

## 16. Data Transformation (Phase 5c)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-16.1: Wide to Long Format
**Requirement:** AC-11
**Automation:** Automated - `dataTransformer.test.ts` (34 tests)
**Steps:**
1. Upload file with 50 patients, each having 10 measure columns with data
2. Click Transform

**Expected:**
- Original Rows: 50
- Generated Rows: ~500 (50 patients × 10 measures)
- Each patient has multiple output rows (one per measure)

### TC-16.2: Original vs Generated Rows Display
**Requirement:** AC-11
**Automation:** Automated - `import-flow.cy.ts: stats display`
**Steps:**
1. Upload file with 100 input rows
2. Click Transform
3. Observe stats display

**Expected:**
- "Original Rows" shows 100 (gray box)
- "Generated Rows" shows X (blue box)
- Both values clearly labeled and separate

### TC-16.3: Empty Measure Columns Skipped
**Requirement:** AC-12
**Automation:** Automated - `dataTransformer.test.ts: empty column tests`
**Steps:**
1. Upload file where Patient A has data in 5 of 10 measure columns
2. Click Transform

**Expected:**
- Only 5 rows generated for Patient A
- Empty measure columns do not create rows

### TC-16.4: Status Date = Import Date
**Requirement:** AC-13
**Automation:** Automated - `dataTransformer.test.ts: status date tests`
**Steps:**
1. Upload file with compliance values
2. Click Transform
3. Check statusDate in preview

**Expected:**
- All rows have statusDate = today's date (YYYY-MM-DD format)
- statusDate does NOT come from Q1 column

### TC-16.5: Patients With No Measures
**Requirement:** AC-16
**Automation:** Automated - `dataTransformer.test.ts: no measures tests`
**Steps:**
1. Upload file where Patient B has ALL measure columns empty
2. Click Transform

**Expected:**
- "No Measures" stat shows count ≥ 1
- Purple section "Patients with No Measures" appears
- Patient B listed with Row #, Name, DOB
- Patient B has 0 generated rows

### TC-16.6: Phone Number Normalization
**Requirement:** AC-14
**Automation:** Automated - `dataTransformer.test.ts: phone normalization`
**Steps:**
1. Upload file with Phone = "5551234567"
2. Click Transform
3. Check memberTelephone in preview

**Expected:**
- Phone displays as "(555) 123-4567"
- 11-digit numbers starting with 1 also normalized

---

## 17. Date Parsing (Phase 5c)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-17.1: MM/DD/YYYY Format
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts: date parsing tests`
**Input:** DOB = "01/15/2026"
**Expected:** Parsed as 2026-01-15

### TC-17.2: M/D/YYYY Format
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts`
**Input:** DOB = "1/5/2026"
**Expected:** Parsed as 2026-01-05

### TC-17.3: M/D/YY Format
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts`
**Input:** DOB = "1/5/26"
**Expected:** Parsed as 2026-01-05

### TC-17.4: YYYY-MM-DD Format
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts`
**Input:** DOB = "2026-01-15"
**Expected:** Parsed as 2026-01-15

### TC-17.5: M.D.YYYY Format
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts`
**Input:** DOB = "1.15.2026"
**Expected:** Parsed as 2026-01-15

### TC-17.6: Excel Serial Number
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts: Excel serial tests`
**Input:** DOB = "44941" (Excel serial)
**Expected:** Parsed as valid date (Excel epoch conversion)

### TC-17.7: Invalid Date
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts: invalid date tests`
**Input:** DOB = "abc"
**Expected:**
- Transform error: "Invalid date format: abc"
- Row still processed but memberDob = null

---

## 18. "Any Non-Compliant Wins" Logic (Phase 5c)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-18.1: All Compliant
**Requirement:** AC-17, AC-18
**Automation:** Automated - `dataTransformer.test.ts: compliance logic`
**Data:**
- Breast Cancer Screening E Q2 = "Compliant"
- Breast Cancer Screening 42-51 Q2 = "Compliant"

**Expected:** measureStatus = "Screening test completed" (compliant mapping)

### TC-18.2: Any Non-Compliant Wins
**Requirement:** AC-17, AC-19
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Breast Cancer Screening E Q2 = "Compliant"
- Breast Cancer Screening 42-51 Q2 = "Non Compliant"

**Expected:** measureStatus = "Not Addressed" (non-compliant wins)

### TC-18.3: All Non-Compliant
**Requirement:** AC-19
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Breast Cancer Screening E Q2 = "NC"
- Breast Cancer Screening 42-51 Q2 = "Non Compliant"

**Expected:** measureStatus = "Not Addressed"

### TC-18.4: Mixed Empty + Compliant
**Requirement:** AC-17, AC-18
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Breast Cancer Screening E Q2 = ""
- Breast Cancer Screening 42-51 Q2 = "Compliant"
- Breast Cancer Screening 52-74 Q2 = ""

**Expected:** measureStatus = "Screening test completed" (uses non-empty compliant)

### TC-18.5: Mixed Empty + Non-Compliant
**Requirement:** AC-17, AC-19
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Breast Cancer Screening E Q2 = ""
- Breast Cancer Screening 42-51 Q2 = "NC"

**Expected:** measureStatus = "Not Addressed"

### TC-18.6: All Empty
**Requirement:** AC-21
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Breast Cancer Screening E Q2 = ""
- Breast Cancer Screening 42-51 Q2 = ""
- Breast Cancer Screening 52-74 Q2 = ""

**Expected:** No row generated for Breast Cancer Screening (skipped)

### TC-18.7: Case Insensitive
**Requirement:** AC-20
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Col1 = "COMPLIANT"
- Col2 = "compliant"

**Expected:** Both recognized as compliant

### TC-18.8: Compliant Abbreviations
**Requirement:** AC-20
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Col1 = "C"
- Col2 = "Yes"

**Expected:** Both recognized as compliant

### TC-18.9: Non-Compliant Abbreviations
**Requirement:** AC-20
**Automation:** Automated - `dataTransformer.test.ts`
**Data:**
- Col1 = "NC"
- Col2 = "No"

**Expected:** Both recognized as non-compliant → "Not Addressed"

---

## 19. Validation (Phase 5d)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-19.1: Missing Member Name
**Requirement:** AC-22
**Automation:** Automated - `validator.test.ts` (57 tests)
**Data:** Row with memberName = "" or null
**Expected:**
- Error: "Member name is required"
- Error severity: error (blocking)
- Error includes "(Unknown)" as member name

### TC-19.2: Missing DOB
**Requirement:** AC-22
**Automation:** Automated - `validator.test.ts`
**Data:** Row with memberDob = null
**Expected:**
- Error: "Date of birth is required"
- Error severity: error (blocking)

### TC-19.3: Invalid DOB Format
**Requirement:** AC-23
**Automation:** Automated - `validator.test.ts`
**Data:** Row with memberDob = "invalid-date"
**Expected:**
- Error: "Invalid date of birth format"
- Error includes value: "invalid-date"

### TC-19.4: Missing Request Type
**Requirement:** AC-22
**Automation:** Automated - `validator.test.ts`
**Data:** Row with requestType = ""
**Expected:**
- Error: "Request type is required"
- Error severity: error (blocking)

### TC-19.5: Invalid Request Type
**Requirement:** AC-23
**Automation:** Automated - `validator.test.ts`
**Data:** Row with requestType = "Unknown"
**Expected:**
- Error: "Invalid request type: Unknown"
- Error severity: error (blocking)

### TC-19.6: Missing Quality Measure
**Requirement:** AC-22
**Automation:** Automated - `validator.test.ts`
**Data:** Row with qualityMeasure = ""
**Expected:**
- Error: "Quality measure is required"
- Error severity: error (blocking)

### TC-19.7: Invalid Quality Measure for Request Type
**Requirement:** AC-23
**Automation:** Automated - `validator.test.ts`
**Data:** requestType = "AWV", qualityMeasure = "Breast Cancer Screening"
**Expected:**
- Warning: "Invalid quality measure for request type"
- Warning severity: warning (non-blocking)

### TC-19.8: Missing Measure Status
**Requirement:** AC-25
**Automation:** Automated - `validator.test.ts`
**Data:** Row with measureStatus = null
**Expected:**
- Warning: "Measure status is empty - will be set to Not Addressed"
- Warning severity: warning (non-blocking)

### TC-19.9: Missing Phone
**Requirement:** AC-25
**Automation:** Automated - `validator.test.ts`
**Data:** Row with memberTelephone = null
**Expected:**
- Warning: "Phone number is missing"
- Warning severity: warning (non-blocking)

### TC-19.10: Duplicate Within Import
**Requirement:** AC-24
**Automation:** Automated - `validator.test.ts: duplicate detection`
**Data:** Two rows with same:
- memberName = "John Smith"
- memberDob = "1980-01-15"
- requestType = "AWV"
- qualityMeasure = "Annual Wellness Visit"

**Expected:**
- Warning on second row: "Duplicate of row X: same patient + measure"
- Both rows in "Duplicate Groups" section
- Duplicate count = 1 group

---

## 20. Error Reporting (Phase 5d)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-20.1: Error Message Includes Member Name
**Requirement:** AC-26
**Automation:** Automated - `errorReporter.test.ts` (48 tests)
**Steps:**
1. Upload file with validation errors for patient "John Smith"
2. Click Validate
3. Check error messages

**Expected:**
- Error format: "Row 5 (John Smith) - memberDob: Date of birth is required"
- Member name in parentheses after row number

### TC-20.2: Error Count Display
**Requirement:** AC-28
**Automation:** Automated - `import-flow.cy.ts: error handling tests`, `errorReporter.test.ts`
**Steps:**
1. Upload file with 3 validation errors
2. Click Validate

**Expected:**
- Errors section header: "Errors (3)"
- Red background on section
- 3 error items listed

### TC-20.3: Warning Count Display
**Requirement:** AC-29
**Automation:** Automated - `import-flow.cy.ts: warning tests`, `errorReporter.test.ts`
**Steps:**
1. Upload file with 5 warnings (missing phone, etc.)
2. Click Validate

**Expected:**
- Warnings section header: "Warnings (5)"
- Yellow background on section
- 5 warning items listed

### TC-20.4: Duplicate Groups Display
**Requirement:** AC-30
**Automation:** Manual - duplicate groups UI display not E2E tested
**Steps:**
1. Upload file with 2 sets of duplicate rows
2. Click Validate

**Expected:**
- Duplicates section header: "Duplicate Groups (2)"
- Orange background on section
- Each group shows patient name, measure, and row numbers

### TC-20.5: Validation Summary - All Valid
**Requirement:** AC-31, AC-32
**Automation:** Automated - `ImportPage.test.tsx`, `validator.test.ts`
**Steps:**
1. Upload file with all valid data, no warnings
2. Click Validate

**Expected:**
- Green banner: "All X rows passed validation"
- Status: "success"
- canProceed: true

### TC-20.6: Validation Summary - Warnings Only
**Requirement:** AC-31, AC-32
**Automation:** Automated - `ImportPage.test.tsx`, `validator.test.ts`
**Steps:**
1. Upload file with valid data but some warnings
2. Click Validate

**Expected:**
- Yellow banner: "X rows validated with Y warning(s). Import can proceed."
- Status: "warning"
- canProceed: true

### TC-20.7: Validation Summary - Has Errors
**Requirement:** AC-31, AC-32
**Automation:** Automated - `ImportPage.test.tsx`, `validator.test.ts`
**Steps:**
1. Upload file with validation errors
2. Click Validate

**Expected:**
- Red banner: "Validation failed: X error(s) in Y row(s). Please fix errors before importing."
- Status: "error"
- canProceed: false

### TC-20.8: Can Proceed - False (Errors)
**Requirement:** AC-32
**Automation:** Automated - `validator.test.ts: canProceed tests`
**Steps:**
1. Upload file with errors
2. Click Validate

**Expected:**
- "Fix Errors First" button/badge shown (red)
- Import action should be disabled

### TC-20.9: Can Proceed - True (Warnings Only)
**Requirement:** AC-32
**Automation:** Automated - `validator.test.ts: canProceed tests`
**Steps:**
1. Upload file with warnings but no errors
2. Click Validate

**Expected:**
- "Ready to Import" button/badge shown (green)
- Import action should be enabled

---

## 21. Import Test Page UI (Phase 5c-5d)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-21.1: Transform Button
**Requirement:** AC-45
**Automation:** Automated - `import-flow.cy.ts`
**Steps:**
1. Upload CSV file
2. Click "Transform" button

**Expected:**
- Loading state shows "Transforming..."
- Transform Results tab opens automatically
- Stats and preview displayed

### TC-21.2: Validate Button
**Requirement:** AC-45
**Automation:** Automated - `import-flow.cy.ts`
**Steps:**
1. Upload CSV file
2. Click "Validate" button

**Expected:**
- Loading state shows "Validating..."
- Validation Results tab opens automatically
- Stats, errors, warnings, duplicates displayed

### TC-21.3: Tab Navigation
**Automation:** Automated - `ImportPage.test.tsx: tab tests`
**Steps:**
1. Upload and process file
2. Click between Parse/Transform/Validate tabs

**Expected:**
- Correct content shown for each tab
- Tab state preserved (doesn't re-fetch)
- Active tab visually highlighted

### TC-21.4: Stats Grid - Transform Tab
**Automation:** Automated - `import-flow.cy.ts: stats display`
**Steps:**
1. Upload file and Transform
2. Check stats section

**Expected:**
- 6 stat boxes displayed in grid:
  - Original Rows (gray)
  - Generated Rows (blue)
  - Unique Patients (purple)
  - Measures/Patient (orange)
  - Errors (gray)
  - No Measures (purple if > 0)

### TC-21.5: Stats Grid - Validate Tab
**Automation:** Automated - `import-flow.cy.ts`
**Steps:**
1. Upload file and Validate
2. Check stats section

**Expected:**
- 7 stat boxes displayed:
  - Original Rows (gray)
  - Generated Rows (blue)
  - Valid Rows (green)
  - Error Rows (red if > 0)
  - Warning Rows (yellow if > 0)
  - Duplicates (orange if > 0)
  - No Measures (purple if > 0)

### TC-21.6: Preview Table
**Automation:** Automated - `import-flow.cy.ts: changes table tests`
**Steps:**
1. Process file (Transform or Validate)
2. Scroll to preview section

**Expected:**
- Table shows first 20 transformed rows
- Columns: #, Member Name, DOB, Request Type, Quality Measure, Measure Status, Status Date
- Alternating row colors for readability

### TC-21.7: Patients No Measures Section
**Requirement:** AC-16
**Automation:** Partial - `dataTransformer.test.ts` covers backend, E2E section display not directly tested
**Steps:**
1. Upload file with patients having empty measures
2. Transform or Validate

**Expected:**
- Purple section appears: "Patients with No Measures (X)"
- Description text explains these won't be imported
- Table shows: Row #, Member Name, DOB
- Scrollable if many patients

### TC-21.8: Scrollable Error List
**Automation:** Manual - scrollable error list UI not explicitly tested
**Steps:**
1. Upload file with many errors (20+)
2. Validate

**Expected:**
- Error section has max-height with scroll
- All errors accessible via scrolling
- Section doesn't overflow page

### TC-21.9: Row Numbers Match Spreadsheet (No Title Row)
**Requirement:** AC-33
**Automation:** Automated - `validator.test.ts: row number tests`, `errorReporter.test.ts`
**Steps:**
1. Upload `test-validation-errors.csv` (no title row)
2. Click Validate
3. Check error row numbers

**Expected:**
- Row 3 in error corresponds to line 3 in spreadsheet (header is row 1)
- Patient "MissingDOB, Patient3" error shows "Row 4" (data starts at row 2)

### TC-21.10: Row Numbers Match Spreadsheet (With Title Row)
**Requirement:** AC-33
**Automation:** Automated - `fileParser.test.ts: title row detection`, `errorReporter.test.ts`
**Steps:**
1. Upload Excel file with title/report row before headers
2. Click Validate
3. Check error row numbers

**Expected:**
- Row numbers account for title row (data starts at row 3)
- Patient on first data row shows "Row 3" not "Row 2"

### TC-21.11: Error Deduplication Per Patient
**Requirement:** AC-27
**Automation:** Automated - `validator.test.ts: deduplication tests`
**Steps:**
1. Upload file with patient having validation error (e.g., missing DOB)
2. Click Validate
3. Count errors for that patient

**Expected:**
- Same error appears only ONCE per patient (not repeated for each generated row)
- If patient generates 4 measure rows, DOB error shows 1 time, not 4

### TC-21.12: Patients With No Measures Row Numbers
**Requirement:** AC-33
**Automation:** Automated - `dataTransformer.test.ts`, `errorReporter.test.ts`
**Steps:**
1. Upload `test-no-measures.csv`
2. Click Validate or Transform
3. Check "Patients with No Measures" section row numbers

**Expected:**
- Row numbers match original spreadsheet positions
- Row numbers account for title row if present

---

## 22. Import Preview (Phase 5e-5f)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-22.1: Preview Button and Mode Selection
**Requirement:** AC-34, AC-46
**Automation:** Automated - `import-flow.cy.ts: preview tests`, `ImportPreviewPage.test.tsx`
**Steps:**
1. Navigate to Import Test page
2. Upload a CSV file (test-data/merge-test-cases.csv)
3. Select "Merge Mode" from dropdown
4. Click "Preview Import" button

**Expected:**
- Preview tab appears with summary statistics
- Mode shows "MERGE"
- Preview ID and expiration time displayed

### TC-22.2: Preview Summary Stats
**Requirement:** AC-34, AC-39
**Automation:** Automated - `diffCalculator.test.ts` (104 tests), `mergeLogic.test.ts` (37 tests), `import-flow.cy.ts`
**Steps:**
1. Upload merge-test-cases.csv
2. Preview in Merge mode

**Expected:**
- Inserts: 9
- Updates: 4
- Skips: 5
- Duplicates (BOTH): 2
- Deletes: 0
- Total: 20

### TC-22.3: INSERT Action - New Patient
**Requirement:** AC-34
**Automation:** Automated - `diffCalculator.test.ts: INSERT tests`, `import-flow.cy.ts: filter tests`
**Steps:**
1. In preview results, filter by INSERT action
2. Look for "New Patient, Alice"

**Expected:**
- Action shows "INSERT"
- Old Status is null/empty
- New Status shows the status value
- Reason: "New patient+measure combination"

### TC-22.4: UPDATE Action - Upgrade to Compliant
**Requirement:** AC-35
**Automation:** Automated - `diffCalculator.test.ts: UPDATE tests`
**Steps:**
1. In preview results, filter by UPDATE action
2. Look for "Smith, John"

**Expected:**
- Action shows "UPDATE"
- Old Status: "Not Addressed"
- New Status: "AWV completed"
- Reason contains "Upgrading"

### TC-22.5: SKIP Action - Both Compliant
**Requirement:** AC-35
**Automation:** Automated - `diffCalculator.test.ts: SKIP tests`
**Steps:**
1. In preview results, filter by SKIP action
2. Look for "Wilson, Sarah"

**Expected:**
- Action shows "SKIP"
- Old Status: "Screening test completed"
- New Status: "Screening test completed"
- Reason: "Both compliant - keeping existing"

### TC-22.6: SKIP Action - Both Non-Compliant
**Requirement:** AC-35
**Automation:** Automated - `diffCalculator.test.ts: SKIP tests`
**Steps:**
1. In preview results, filter by SKIP action
2. Look for "Jones, Michael"

**Expected:**
- Action shows "SKIP"
- Old Status: "Patient declined AWV"
- New Status: "Not Addressed"
- Reason: "Both non-compliant - keeping existing"

### TC-22.7: BOTH Action - Downgrade Detected
**Requirement:** AC-35
**Automation:** Automated - `diffCalculator.test.ts: BOTH tests`
**Steps:**
1. In preview results, filter by BOTH action
2. Look for "Brown, Patricia"

**Expected:**
- Action shows "BOTH"
- Old Status: "AWV completed" (compliant)
- New Status: "Not Addressed" (non-compliant)
- Reason: "Downgrade detected - keeping both"

### TC-22.8: Replace All Mode
**Requirement:** AC-36
**Automation:** Automated - `diffCalculator.test.ts: replace mode tests`, `import-flow.cy.ts: mode tests`
**Steps:**
1. Upload merge-test-cases.csv
2. Select "Replace All" mode
3. Click "Preview Import"

**Expected:**
- Summary shows DELETE count > 0 (existing records)
- Summary shows INSERT count > 0 (all import rows)
- No UPDATE, SKIP, or BOTH actions
- All deletes show reason: "Replace All mode"

### TC-22.9: Patient Summary
**Requirement:** AC-39
**Automation:** Automated - `ImportPreviewPage.test.tsx: patient counts`
**Steps:**
1. In preview results, check Patient Summary section

**Expected:**
- New Patients: 3 (Alice, Bob, Carol)
- Existing Patients: 11
- Total: 14

### TC-22.10: Action Filter Buttons
**Requirement:** AC-38
**Automation:** Automated - `import-flow.cy.ts: "Filter by action type"`
**Steps:**
1. Click on each action card (INSERT, UPDATE, SKIP, etc.)
2. Verify table filters correctly

**Expected:**
- Clicking "INSERT" shows only INSERT rows
- Clicking "All" resets filter
- Count in card matches filtered row count

### TC-22.11: Preview Expiration
**Requirement:** AC-37
**Automation:** Automated - `previewCache.test.ts` (21 tests)
**Steps:**
1. Note the expiration time in preview header
2. Verify it's approximately 30 minutes from now

**Expected:**
- Preview expires after 30 minutes
- Attempting to load expired preview shows error

### TC-22.12: Date Parsing in Preview
**Requirement:** AC-15
**Automation:** Automated - `fileParser.test.ts: date parsing`, `diffCalculator.test.ts`
**Steps:**
1. Verify DOB dates display correctly in preview
2. Check "Smith, John" shows DOB 1955-01-15

**Expected:**
- DOB dates are correctly parsed (MM/DD/YYYY in CSV → YYYY-MM-DD in display)
- No dates showing 1900-xx-xx (Excel serial number bug)

---

## 23. Import Executor (Phase 5h)

**Requirement Spec:** [`.claude/specs/import-pipeline/requirements.md`](specs/import-pipeline/requirements.md)

### TC-23.1: Execute Import - Preview Not Found
**Requirement:** AC-40
**Automation:** Automated - `importExecutor.test.ts` (22 tests)
**Steps:**
1. Call executeImport with invalid preview ID

**Expected:**
- Error thrown: "Preview not found or expired"
- No database changes

### TC-23.2: Execute Import - Merge Mode INSERT
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts: INSERT tests`
**Steps:**
1. Create preview with INSERT actions (new patient + measure)
2. Call executeImport

**Expected:**
- New Patient record created
- New PatientMeasure record created
- Due date calculated
- Stats show inserted: 1

### TC-23.3: Execute Import - Merge Mode UPDATE
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts: UPDATE tests`
**Steps:**
1. Create preview with UPDATE action (upgrade status)
2. Call executeImport

**Expected:**
- Existing PatientMeasure updated
- measureStatus changed to new value
- statusDate updated
- dueDate recalculated
- Stats show updated: 1

### TC-23.4: Execute Import - Merge Mode SKIP
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts: SKIP tests`
**Steps:**
1. Create preview with SKIP action (both compliant)
2. Call executeImport

**Expected:**
- No database changes for this record
- Stats show skipped: 1

### TC-23.5: Execute Import - Merge Mode BOTH (Downgrade)
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts: BOTH tests`
**Steps:**
1. Create preview with BOTH action (downgrade scenario)
2. Call executeImport

**Expected:**
- Existing record unchanged
- New record created (duplicate)
- Stats show bothKept: 1

### TC-23.6: Execute Import - Replace Mode DELETE
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts: replace mode tests`
**Steps:**
1. Create preview with DELETE actions (replace mode)
2. Call executeImport

**Expected:**
- All specified records deleted
- Stats show deleted: N

### TC-23.7: Execute Import - Replace Mode INSERT
**Requirement:** AC-40, AC-44
**Automation:** Automated - `importExecutor.test.ts`
**Steps:**
1. Create preview in replace mode with INSERT actions
2. Call executeImport

**Expected:**
- All new records created
- Stats show inserted: N

### TC-23.8: Execute Import - Transaction Rollback
**Requirement:** AC-41
**Automation:** Automated - `importExecutor.test.ts: rollback tests`
**Steps:**
1. Create preview that will cause database error mid-execution
2. Call executeImport

**Expected:**
- Transaction rolls back all changes
- result.success = false
- result.errors contains transaction error

### TC-23.9: Execute Import - Duplicate Flags Synced
**Requirement:** AC-42
**Automation:** Automated - `importExecutor.test.ts: duplicate sync tests`
**Steps:**
1. Execute import that creates duplicate records
2. Check duplicate flags after

**Expected:**
- syncAllDuplicateFlags() called after execution
- isDuplicate flags correctly set

### TC-23.10: Execute Import - Preview Deleted After Success
**Requirement:** AC-43
**Automation:** Automated - `importExecutor.test.ts`
**Steps:**
1. Execute import successfully
2. Try to retrieve preview by ID

**Expected:**
- Preview no longer in cache
- getPreview returns null

### TC-23.11: Execute Import - Null DOB Handling
**Automation:** Automated - `importExecutor.test.ts: null handling`
**Steps:**
1. Create preview with change that has null memberDob
2. Call executeImport

**Expected:**
- Error recorded: "DOB is required"
- Other records still processed
- Stats accurate

### TC-23.12: Execute Import - Stats Accuracy
**Requirement:** AC-44
**Automation:** Automated - `importExecutor.test.ts: stats tests`
**Steps:**
1. Create preview with mixed actions (2 INSERT, 1 UPDATE, 3 SKIP, 1 BOTH)
2. Call executeImport

**Expected:**
- stats.inserted = 2
- stats.updated = 1
- stats.skipped = 3
- stats.bothKept = 1
- stats.deleted = 0

---

## Test Data Files Needed

| File | Description | Use For Tests |
|------|-------------|---------------|
| `test-valid.csv` | 10 patients, all valid data, various measures | TC-15.*, TC-16.1-16.4, TC-20.5 |
| `test-dates.csv` | Rows with various date formats | TC-17.* |
| `test-multi-column.csv` | Multiple columns per measure (age brackets) | TC-18.* |
| `test-validation-errors.csv` | Missing/invalid fields | TC-19.* |
| `test-duplicates.csv` | Duplicate patient+measure rows | TC-19.10, TC-20.4 |
| `test-no-measures.csv` | Patients with all empty measure columns | TC-16.5, TC-21.7 |
| `test-warnings.csv` | Valid data with warnings (missing phone) | TC-20.3, TC-20.6, TC-20.9 |
| `merge-test-cases.csv` | All 6 merge logic cases (INSERT/UPDATE/SKIP/BOTH/DELETE) | TC-22.* |

---

## 24. Automated E2E Tests (Playwright)

The following test cases are automated using Playwright. Run with `npm run e2e` in the frontend directory.

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `e2e/smoke.spec.ts` | Basic page load and UI verification | 4 |
| `e2e/add-row.spec.ts` | Add Row modal and form functionality | 9 |
| `e2e/duplicate-member.spec.ts` | Duplicate Member button behavior | 8 (3 skipped) |
| `e2e/delete-row.spec.ts` | Delete Row confirmation flow | 10 (4 skipped) |
| `e2e/auth.spec.ts` | Authentication flow (login, logout, protected routes) | 13 |

### Skipped Tests (Require Test Isolation)

| Test | Reason |
|------|--------|
| Confirming delete removes the row | Race condition with parallel add-row tests |
| Delete multiple rows | Race condition with parallel add-row tests |
| Duplicate copies phone/address | Member Info columns hidden by default |
| Button disable after deselection | Grid doesn't deselect on header click |

### Running E2E Tests

```bash
cd frontend
npm run e2e           # Run headless
npm run e2e:headed    # Run with browser visible
npm run e2e:ui        # Run with Playwright UI
npm run e2e:report    # View test report
```

---

## 25. Automated E2E Tests (Cypress)

Cypress tests for AG Grid interactions, import flow, patient assignment, role access control, and sorting/filtering.

### Test Files

| File | Description | Tests |
|------|-------------|-------|
| `cypress/e2e/cascading-dropdowns.cy.ts` | Cascading dropdown behavior, row colors | 30 |
| `cypress/e2e/import-flow.cy.ts` | Import workflow, preview, execution | 57 |
| `cypress/e2e/patient-assignment.cy.ts` | Patient/staff assignment, count verification | 32 |
| `cypress/e2e/role-access-control.cy.ts` | STAFF/PHYSICIAN/ADMIN access restrictions | 31 |
| `cypress/e2e/sorting-filtering.cy.ts` | Column sorting, status filter bar, row colors | 55 |
| `cypress/e2e/patient-name-search.cy.ts` | Search input UI, filtering, AND logic, keyboard shortcuts | 13 |

### Test Categories

**Cascading Dropdowns (30 tests):**
- Request Type dropdown has 4 options (AWV, Chronic DX, Quality, Screening)
- AWV auto-fills Quality Measure with "Annual Wellness Visit"
- Chronic DX auto-fills Quality Measure with "Chronic Diagnosis Code"
- Quality shows 8 Quality Measure options
- Screening shows 3 Quality Measure options
- AWV Measure Status options and row colors
- Breast Cancer Screening status and tracking options
- Chronic Diagnosis Code status and attestation tracking
- Cascading field clearing behavior

**Import Flow (57 tests):**
- Import page: system/mode selection, file upload validation
- Preview page: summary cards, filters, changes table
- Execution: success/error states, navigation
- Error handling, merge mode behavior, warnings

**Patient Assignment (32 tests):**
- Assign unassigned patients to physicians
- Verify patient counts update correctly
- Staff-physician assignment management
- Data freshness verification (no caching)

**Role Access Control (31 tests):**
- STAFF restrictions: no admin, no unassigned patients, only assigned physicians
- PHYSICIAN restrictions: no admin, only own patients
- ADMIN capabilities: full access to all features
- API 401/403 protection tests

**Sorting & Filtering (55 tests):**
- Column sorting (ascending, descending, clear)
- Date/numeric column sorting (chronological, numeric)
- Status filter bar behavior (filter, deselect, switch)
- Row color verification (10 tests)
- Status bar count updates

### Custom AG Grid Commands

```typescript
cy.waitForAgGrid()                           // Wait for grid to load
cy.getAgGridCell(rowIndex, colId)            // Get cell by row index and column
cy.openAgGridDropdown(rowIndex, colId)       // Open dropdown for editing
cy.selectAgGridDropdown(rowIndex, colId, value) // Select dropdown value
cy.getAgGridDropdownOptions()                // Get all options from open dropdown
```

### Running Cypress Tests

```bash
cd frontend
npm run cypress         # Open Cypress Test Runner
npm run cypress:run     # Run headless
npm run cypress:headed  # Run with browser visible
```

---

## 26. Authentication & Multi-Physician Support (Phase 11)

**Requirement Spec:** [`.claude/specs/authentication/requirements.md`](specs/authentication/requirements.md)

### TC-26.1: Login Page - Valid Credentials
**Requirement:** AC-1, AC-2, AC-6
**Automation:** Automated - `LoginPage.test.tsx` (19 tests), `auth.spec.ts: login tests`
**Steps:**
1. Navigate to application
2. Enter valid email and password
3. Click "Sign In"

**Expected:**
- Redirected to main patient grid
- User menu shows user's display name in header
- Protected routes accessible

### TC-26.2: Login Page - Invalid Credentials
**Requirement:** AC-3
**Automation:** Automated - `LoginPage.test.tsx: error handling`, `auth.spec.ts: "invalid credentials"`
**Steps:**
1. Navigate to application
2. Enter invalid email or password
3. Click "Sign In"

**Expected:**
- Error message: "Invalid email or password"
- Remains on login page
- No token stored

### TC-26.3: Login Page - Form Validation
**Requirement:** AC-4
**Automation:** Automated - `LoginPage.test.tsx: validation tests`
**Steps:**
1. Leave email field empty, click "Sign In"
2. Enter invalid email format, click "Sign In"

**Expected:**
- Required field validation shown
- Cannot submit with invalid email format

### TC-26.4: Logout
**Requirement:** AC-5
**Automation:** Automated - `auth.spec.ts: logout test`, `authStore.test.ts: logout`
**Steps:**
1. Login as any user
2. Click user menu in header
3. Click "Logout"

**Expected:**
- Redirected to login page
- Token cleared from localStorage
- Cannot access protected routes

### TC-26.5: Password Change
**Requirement:** AC-11, AC-12, AC-14, AC-15
**Automation:** Manual - password change UI flow not E2E automated
**Steps:**
1. Login as any user
2. Click user menu → "Change Password"
3. Enter current password, new password, confirm new password
4. Click "Change Password"

**Expected:**
- Success message displayed
- Modal closes
- Can login with new password

### TC-26.6: Password Change - Wrong Current Password
**Requirement:** AC-13
**Automation:** Partial - `auth.routes.test.ts: password change validation` (backend only)
**Steps:**
1. Login as any user
2. Click user menu → "Change Password"
3. Enter wrong current password
4. Click "Change Password"

**Expected:**
- Error message: "Current password is incorrect"
- Password not changed

### TC-26.7: PHYSICIAN Role - Data Isolation
**Requirement:** See patient-ownership spec AC-1, AC-2, AC-3
**Automation:** Automated - `role-access-control.cy.ts: "PHYSICIAN auto-filters"`
**Steps:**
1. Login as PHYSICIAN user (e.g., dr.smith@clinic)
2. View patient grid

**Expected:**
- Only sees patients where Patient.ownerId = current user's ID
- Cannot see patients owned by other physicians
- Cannot see unassigned patients (ownerId = null)

### TC-26.8: STAFF Role - Physician Selector
**Requirement:** See patient-ownership spec AC-5
**Automation:** Automated - `role-access-control.cy.ts: "STAFF assigned physicians"`
**Steps:**
1. Login as STAFF user
2. Observe header

**Expected:**
- Physician selector dropdown visible in header
- Shows list of assigned physicians (from StaffAssignment)
- First assigned physician selected by default

### TC-26.9: STAFF Role - Switch Physician
**Requirement:** See patient-ownership spec AC-7
**Automation:** Automated - `patient-assignment.cy.ts: physician switching`
**Steps:**
1. Login as STAFF user with multiple assigned physicians
2. Select different physician from dropdown
3. Observe patient grid

**Expected:**
- Grid refreshes with selected physician's patients
- Only shows patients where ownerId = selected physician

### TC-26.10: STAFF Role - No Assignments
**Requirement:** See patient-ownership spec AC-8
**Automation:** Manual - no assignments message not tested
**Steps:**
1. Login as STAFF user with no physician assignments

**Expected:**
- Message: "No physicians assigned"
- Empty patient grid or message indicating no data access

### TC-26.11: ADMIN Role - Cannot See Patients
**Requirement:** See patient-ownership spec AC-9
**Automation:** Automated - `role-access-control.cy.ts: "ADMIN" tests`
**Steps:**
1. Login as ADMIN user
2. Attempt to navigate to patient grid (/)

**Expected:**
- Redirected to admin dashboard
- Cannot access patient data routes
- Error if trying to access /api/data/patients directly

### TC-26.12: ADMIN Role - User Management
**Requirement:** See admin-dashboard spec AC-1
**Automation:** Automated - `patient-assignment.cy.ts: user management`
**Steps:**
1. Login as ADMIN user
2. Navigate to Admin dashboard

**Expected:**
- User list visible with all users
- Can see user email, display name, role, status
- Create/Edit/Deactivate buttons available

### TC-26.13: Admin - Create User
**Requirement:** See admin-dashboard spec AC-2
**Automation:** Automated - `patient-assignment.cy.ts: "Create user"`
**Steps:**
1. As ADMIN, click "Create User"
2. Fill in email, username, display name, password, role
3. Click "Create"

**Expected:**
- User created successfully
- Appears in user list
- Can login with new credentials

### TC-26.14: Admin - Edit User
**Requirement:** See admin-dashboard spec AC-3
**Automation:** Automated - `patient-assignment.cy.ts: "Edit user"`
**Steps:**
1. As ADMIN, click "Edit" on a user
2. Change display name and role
3. Click "Save"

**Expected:**
- Changes saved
- User list shows updated info
- User's next login reflects new role

### TC-26.15: Admin - Deactivate User
**Requirement:** See admin-dashboard spec AC-4
**Automation:** Manual - deactivation flow not E2E tested
**Steps:**
1. As ADMIN, click "Deactivate" on a user
2. Confirm action

**Expected:**
- User's isActive set to false
- User cannot login
- User appears dimmed/marked as inactive in list

### TC-26.16: Admin - Reset Password
**Requirement:** See admin-dashboard spec AC-5
**Automation:** Manual - admin password reset not E2E tested
**Steps:**
1. As ADMIN, click "Reset Password" on a user
2. Enter new password
3. Click "Reset"

**Expected:**
- Password reset successful
- User can login with new password

### TC-26.17: Admin - Staff Assignments
**Requirement:** See admin-dashboard spec AC-6, AC-7
**Automation:** Automated - `patient-assignment.cy.ts: "Staff assignments"`
**Steps:**
1. As ADMIN, edit a STAFF user
2. Add/remove physician assignments
3. Save changes

**Expected:**
- Assignments updated in database
- STAFF user sees updated physician list on next login

### TC-26.18: Admin - Audit Log Viewer
**Requirement:** See admin-dashboard spec AC-9, AC-10, AC-11
**Automation:** Manual - audit log display not automated
**Steps:**
1. As ADMIN, navigate to Audit Log section
2. View recent entries

**Expected:**
- Shows recent audit entries (LOGIN, LOGOUT, PASSWORD_CHANGE, user CRUD)
- Entries include timestamp, user, action, details

### TC-26.19: Protected Routes - No Token
**Requirement:** AC-8
**Automation:** Automated - `auth.spec.ts: "protected routes"`, `role-access-control.cy.ts: "Navigation redirects"`
**Steps:**
1. Clear localStorage (remove token)
2. Navigate directly to /

**Expected:**
- Redirected to /login
- Cannot access protected content

### TC-26.20: Protected Routes - Expired Token
**Requirement:** AC-9
**Automation:** Partial - `authService.test.ts: JWT expiry` (backend only, not E2E)
**Steps:**
1. Login and get token
2. Wait for token to expire (8 hours by default)
3. Try to access protected route

**Expected:**
- Redirected to /login
- Error message about session expired

### TC-26.21: Import Page - PHYSICIAN Ownership
**Requirement:** See patient-ownership spec AC-17
**Automation:** Manual - physician auto-import-assign not E2E tested
**Steps:**
1. Login as PHYSICIAN
2. Import patients via /import
3. Check imported patients

**Expected:**
- Imported patients have ownerId = current physician's ID
- Only visible to current physician

### TC-26.22: Import Page - STAFF Physician Selection
**Requirement:** See patient-ownership spec AC-16
**Automation:** Automated - `ImportPage.test.tsx: physician dropdown`
**Steps:**
1. Login as STAFF with multiple physician assignments
2. Navigate to Import page
3. Check if can select target physician

**Expected:**
- Can select which physician's data to import to
- OR imports to currently selected physician from header

### TC-26.23: CLI Password Reset
**Requirement:** AC-26
**Automation:** Manual - CLI scripts not automated
**Steps:**
1. Run: `npm run reset-password -- --email user@clinic --password newpass`

**Expected:**
- Password reset successfully
- User can login with new password
- Works for any user including ADMIN

### TC-26.24: Audit Log Cleanup
**Requirement:** AC-27
**Automation:** Manual - CLI scripts not automated
**Steps:**
1. Run: `npm run cleanup-audit-log -- --days 30`

**Expected:**
- Deletes audit entries older than 30 days
- Shows count of deleted entries
- Remaining entries preserved

### TC-26.25: Forgot Password - Link on Login Page
**Requirement:** AC-16
**Automation:** Automated - `ForgotPasswordPage.test.tsx` (20 tests), `auth.spec.ts`
**Steps:**
1. Navigate to /login
2. Look for "Forgot Password?" link

**Expected:**
- Link visible below sign in button
- Clicking link navigates to /forgot-password

### TC-26.26: Forgot Password - Request Reset (SMTP Configured)
**Requirement:** AC-17, AC-19
**Automation:** Automated - `ForgotPasswordPage.test.tsx: SMTP configured tests`
**Steps:**
1. Ensure SMTP is configured in environment
2. Navigate to /forgot-password
3. Enter valid email address
4. Click "Send Reset Link"

**Expected:**
- Success message: "If an account exists with this email, a reset link has been sent"
- Email received with reset link
- Link contains valid token
- Token expires after 1 hour

### TC-26.27: Forgot Password - Request Reset (SMTP Not Configured)
**Requirement:** AC-18
**Automation:** Automated - `ForgotPasswordPage.test.tsx: no SMTP test`
**Steps:**
1. Ensure SMTP is NOT configured
2. Navigate to /forgot-password

**Expected:**
- Message displayed: "Password reset is not available. Please contact your administrator."
- No email form shown

### TC-26.28: Forgot Password - Invalid Email
**Requirement:** AC-19
**Automation:** Automated - `auth.routes.test.ts: forgot password`, `ForgotPasswordPage.test.tsx`
**Steps:**
1. Navigate to /forgot-password
2. Enter email that doesn't exist in system
3. Click "Send Reset Link"

**Expected:**
- Same success message shown (security: don't reveal if email exists)
- No email sent

### TC-26.29: Reset Password - Valid Token
**Requirement:** AC-22, AC-25
**Automation:** Automated - `ResetPasswordPage.test.tsx` (17 tests)
**Steps:**
1. Request password reset email
2. Click link in email (navigates to /reset-password?token=xxx)
3. Enter new password and confirm
4. Click "Reset Password"

**Expected:**
- Success message: "Password has been reset"
- Redirected to login page
- Can login with new password

### TC-26.30: Reset Password - Expired Token
**Requirement:** AC-20, AC-23
**Automation:** Automated - `ResetPasswordPage.test.tsx: expired token`, `authService.test.ts`
**Steps:**
1. Request password reset email
2. Wait >1 hour (or manually expire token in DB)
3. Click link in email

**Expected:**
- Error message: "Reset link has expired"
- Link to request new reset

### TC-26.31: Reset Password - Invalid Token
**Requirement:** AC-23
**Automation:** Automated - `ResetPasswordPage.test.tsx: invalid token`
**Steps:**
1. Navigate to /reset-password?token=invalidtoken

**Expected:**
- Error message: "Invalid reset link"
- Link to request new reset

### TC-26.32: Reset Password - Token Already Used
**Requirement:** AC-21
**Automation:** Automated - `auth.routes.test.ts: used token test`
**Steps:**
1. Request password reset email
2. Use the link to reset password
3. Try to use the same link again

**Expected:**
- Error message: "Reset link has already been used"
- Link to request new reset

### TC-26.33: Reset Password - Password Validation
**Requirement:** AC-24
**Automation:** Automated - `ResetPasswordPage.test.tsx: password validation`
**Steps:**
1. Navigate to /reset-password with valid token
2. Enter mismatched passwords
3. Enter password too short (<8 chars)

**Expected:**
- Validation error for mismatched passwords
- Validation error for short password
- Cannot submit until valid

---

## 27. Patient Assignment (Phase 12)

**Requirement Spec:** [`.claude/specs/patient-ownership/requirements.md`](specs/patient-ownership/requirements.md)

### TC-27.1: View Unassigned Patients (ADMIN)
**Requirement:** See patient-ownership spec AC-9, AC-10
**Automation:** Automated - `patient-assignment.cy.ts`
**Steps:**
1. Login as ADMIN user
2. On Patient Grid page, select "Unassigned patients" from dropdown

**Expected:**
- Grid shows patients with no owner assigned
- Status bar shows correct count
- No caching - fresh data on each selection

### TC-27.2: Assign Unassigned Patient to Physician
**Requirement:** See patient-ownership spec AC-13
**Automation:** Automated - `patient-assignment.cy.ts: "Assign patients"`
**Steps:**
1. Login as ADMIN
2. Navigate to /admin/patient-assignment
3. Select one unassigned patient
4. Select target physician from dropdown
5. Click "Assign" button

**Expected:**
- Success message displayed
- Patient no longer in unassigned list
- Patient appears in target physician's list

### TC-27.3: Bulk Assign Multiple Patients
**Requirement:** See patient-ownership spec AC-13
**Automation:** Automated - `patient-assignment.cy.ts: bulk assign tests`
**Steps:**
1. Login as ADMIN
2. Navigate to /admin/patient-assignment
3. Select multiple patients (or click "Select All")
4. Select target physician
5. Click "Assign" button

**Expected:**
- All selected patients assigned
- Count updates immediately
- Success message shows count

### TC-27.4: Patient Count Updates After Assignment
**Requirement:** See patient-ownership spec AC-14
**Automation:** Automated - `patient-assignment.cy.ts: "Count updates"`
**Steps:**
1. Note unassigned patient count
2. Note target physician's patient count
3. Assign 1 patient from unassigned to physician
4. Check both counts again

**Expected:**
- Unassigned count decreases by 1
- Physician count increases by 1

### TC-27.5: Assign Physician to Staff User
**Requirement:** See admin-dashboard spec AC-6, AC-7
**Automation:** Automated - `patient-assignment.cy.ts: "Staff assignments"`
**Steps:**
1. Login as ADMIN
2. Go to Admin page
3. Click Edit on a STAFF user
4. Check a physician in the assignments list
5. Save

**Expected:**
- Staff user now has physician assigned
- Assignment count updates in user list

### TC-27.6: Staff Sees Only Assigned Physicians
**Requirement:** See patient-ownership spec AC-5
**Automation:** Automated - `patient-assignment.cy.ts: "Staff sees assigned"`, `role-access-control.cy.ts`
**Steps:**
1. As ADMIN, assign Physician A to Staff User
2. Login as Staff User
3. Check physician dropdown on Patient Grid

**Expected:**
- Only Physician A appears in dropdown
- Cannot view other physicians' patients

### TC-27.7: Staff Viewing Assigned Physician's Patients
**Requirement:** See patient-ownership spec AC-7
**Automation:** Automated - `patient-assignment.cy.ts`
**Steps:**
1. Login as STAFF with physician assignment
2. Select assigned physician from dropdown
3. View patient grid

**Expected:**
- Grid shows that physician's patients
- Patient count matches physician's actual count

### TC-27.8: No Data Caching When Switching Physicians
**Requirement:** See patient-ownership spec AC-7
**Automation:** Automated - `patient-assignment.cy.ts: data freshness tests`
**Steps:**
1. Select Physician A, note patients
2. Select Physician B, note patients
3. Select Physician A again

**Expected:**
- Fresh API call made each time
- No stale data from previous selection

### TC-27.9: Provider Dropdown Only on Patient Grid
**Requirement:** See patient-ownership spec AC-11
**Automation:** Automated - `Header.test.tsx: "dropdown only on grid page"`
**Steps:**
1. Login as ADMIN
2. Check header on Patient Grid page
3. Navigate to Import page
4. Navigate to Admin page

**Expected:**
- Dropdown visible only on Patient Grid (/)
- Not visible on /import or /admin

### TC-27.10: Unassigned Option Only for ADMIN
**Requirement:** See patient-ownership spec AC-9, role-access-control spec AC-3
**Automation:** Automated - `Header.test.tsx: "Unassigned option for ADMIN"`, `role-access-control.cy.ts`
**Steps:**
1. Login as ADMIN, check dropdown
2. Login as STAFF, check dropdown

**Expected:**
- ADMIN sees "Unassigned patients" option
- STAFF does not see "Unassigned patients" option

---

## 28. Role-Based Access Control

**Requirement Spec:** [`.claude/specs/role-access-control/requirements.md`](specs/role-access-control/requirements.md)

### TC-28.1: STAFF Cannot Access Admin Page
**Requirement:** AC-1, AC-2
**Automation:** Automated - `role-access-control.cy.ts: "STAFF Cannot Access Admin"`
**Steps:**
1. Login as STAFF user
2. Try to navigate to /admin

**Expected:**
- Redirected away from /admin
- No "Admin" link in navigation

### TC-28.2: STAFF Cannot See Unassigned Patients Option
**Requirement:** AC-3
**Automation:** Automated - `role-access-control.cy.ts: "No unassigned option"`, `Header.test.tsx`
**Steps:**
1. Login as STAFF user
2. Go to Patient Grid page
3. Check physician dropdown

**Expected:**
- Dropdown only shows assigned physicians
- No "Unassigned patients" option

### TC-28.3: STAFF Can Only See Assigned Physicians
**Requirement:** AC-4
**Automation:** Automated - `role-access-control.cy.ts: "Only assigned physicians"`
**Steps:**
1. Login as STAFF user assigned to Physician A only
2. Check dropdown options

**Expected:**
- Only Physician A appears in dropdown
- Cannot view Physician B's patients

### TC-28.4: PHYSICIAN Auto-Filters to Own Patients
**Requirement:** AC-6, AC-7
**Automation:** Automated - `role-access-control.cy.ts: "PHYSICIAN auto-filters"`
**Steps:**
1. Login as PHYSICIAN user
2. Navigate to Patient Grid

**Expected:**
- No physician selector dropdown shown
- Grid automatically shows own patients only

### TC-28.5: PHYSICIAN Cannot See Admin Functions
**Requirement:** AC-8, AC-9
**Automation:** Automated - `role-access-control.cy.ts: "PHYSICIAN no admin"`
**Steps:**
1. Login as PHYSICIAN user (not also ADMIN)
2. Check navigation and available pages

**Expected:**
- No "Admin" link visible
- Cannot access /admin or /admin/patient-assignment

### TC-28.6: PHYSICIAN Cannot View Other Doctors' Patients
**Requirement:** AC-10
**Automation:** Automated - `role-access-control.cy.ts: "API ignores physicianId"`
**Steps:**
1. Login as PHYSICIAN
2. Try to access API with different physicianId

**Expected:**
- API ignores physicianId parameter (forces own)
- Cannot see other doctors' patients

### TC-28.7: PHYSICIAN Cannot View Unassigned Patients
**Requirement:** AC-11
**Automation:** Automated - `role-access-control.cy.ts`
**Steps:**
1. Login as PHYSICIAN
2. Try to access unassigned patients

**Expected:**
- No option to view unassigned
- API rejects physicianId=unassigned

### TC-28.8: ADMIN Full Access
**Requirement:** AC-12, AC-13, AC-14, AC-15, AC-16
**Automation:** Automated - `role-access-control.cy.ts: "ADMIN Full Access"`
**Steps:**
1. Login as ADMIN user
2. Verify all functions available

**Expected:**
- Admin link visible
- Can access /admin
- Can view any physician's patients
- Can view unassigned patients
- Can access patient assignment page

### TC-28.9: API Returns 401 Without Authentication
**Requirement:** AC-17
**Automation:** Automated - `role-access-control.cy.ts: "API 401"`, `data.routes.test.ts`
**Steps:**
1. Clear all auth tokens
2. Make API request to /api/data

**Expected:**
- 401 Unauthorized response

### TC-28.10: Admin API Returns 401 Without Authentication
**Requirement:** AC-18
**Automation:** Automated - `role-access-control.cy.ts: "Admin API 401"`, `admin.routes.test.ts`
**Steps:**
1. Clear all auth tokens
2. Make API request to /api/admin/users

**Expected:**
- 401 Unauthorized response

### TC-28.11: Navigation Redirects to Login When Unauthenticated
**Requirement:** AC-20
**Automation:** Automated - `role-access-control.cy.ts: "Navigation redirects"`
**Steps:**
1. Clear auth session
2. Try to access /, /admin, /import

**Expected:**
- All redirect to /login

---

## 29. Patient Name Search

**Requirement Spec:** [`.claude/specs/patient-name-search/requirements.md`](specs/patient-name-search/requirements.md)

### TC-29.1: Search Input UI
**Requirement:** Req 1 (AC 1.1-1.7)
**Automation:** Automated - `StatusFilterBar.test.tsx: "Search Input"` (10 tests), `patient-name-search.cy.ts: "Search Input UI"` (3 tests)
**Steps:**
1. Navigate to patient grid
2. Observe the StatusFilterBar

**Expected:**
- Search input visible to the right of status chips
- Placeholder text "Search by name..."
- Search magnifying glass icon visible
- Clear (X) button hidden when input is empty
- Clear (X) button visible when input has text
- `aria-label="Search patients by name"` on input
- `aria-label="Clear search"` on clear button

### TC-29.2: Real-Time Name Filtering
**Requirement:** Req 2 (AC 2.1-2.6)
**Automation:** Automated - `MainPage.test.tsx` (20 tests), `patient-name-search.cy.ts: "Filtering Behavior"` (4 tests)
**Steps:**
1. Type "Smith" in the search input
2. Observe grid rows

**Expected:**
- Grid filters in real-time as you type
- Only rows where memberName contains "Smith" are shown
- Case-insensitive (typing "smith" matches "Smith, John")
- Partial match (typing "Smi" matches "Smith, John")
- Matches any part of name ("john" matches "Johnson, Mary")
- Typing non-matching text shows empty grid

### TC-29.3: Search with Status Filter (AND Logic)
**Requirement:** Req 3 (AC 3.1-3.4)
**Automation:** Automated - `MainPage.test.tsx: "search + status filter"` (6 tests), `patient-name-search.cy.ts: "Filter Combination"` (2 tests)
**Steps:**
1. Click "Completed" status chip
2. Type "Smith" in search input

**Expected:**
- Only rows matching BOTH green status AND "Smith" name shown
- Clearing search restores all green rows (status filter maintained)
- Status chip counts reflect full dataset (not affected by search)

### TC-29.4: Clear Search Behavior
**Requirement:** Req 1 (AC 1.5, 1.6)
**Automation:** Automated - `StatusFilterBar.test.tsx: "Clear search"` (2 tests), `patient-name-search.cy.ts: "Clear Behavior"` (2 tests)
**Steps:**
1. Type text in search input
2. Click clear (X) button

**Expected:**
- Search input cleared to empty
- Clear button disappears
- All rows restored (respecting active status filter)

### TC-29.5: Row Count Update
**Requirement:** Req 4 (AC 4.1-4.2)
**Automation:** Automated - `MainPage.test.tsx: "chip counts"` (1 test), `patient-name-search.cy.ts: "Status Bar Row Count"` (1 test)
**Steps:**
1. Note status bar row count
2. Type a search term

**Expected:**
- Status bar shows "Showing X of Y rows" when search is active
- Status chip counts do NOT change during search

### TC-29.6: Keyboard Shortcuts
**Requirement:** Req 5 (AC 5.1-5.2)
**Automation:** Automated - `StatusFilterBar.test.tsx: "Escape key"` (2 tests), `patient-name-search.cy.ts: "Keyboard Shortcuts"` (2 tests)
**Steps:**
1. Press Ctrl+F (or Cmd+F)
2. Type a search term
3. Press Escape

**Expected:**
- Ctrl+F focuses the search input
- Does NOT intercept Ctrl+F when editing AG Grid cell
- Escape clears search text and blurs the input

---

## Automation Summary

### Coverage by Section

| Section | Total TCs | Automated | Partial | Manual | Coverage |
|---------|-----------|-----------|---------|--------|----------|
| 1. Data Loading | 3 | 2 | 1 | 0 | 83% |
| 2. Cell Editing | 5 | 0 | 2 | 3 | 20% |
| 3. Sorting | 4 | 1 | 0 | 3 | 25% |
| 4. Status Filter | 5 | 5 | 0 | 0 | 100% |
| 5. Row Colors | 7 | 3 | 1 | 3 | 50% |
| 6. Cascading Dropdowns | 11 | 9 | 0 | 2 | 82% |
| 7. Due Date | 3 | 2 | 0 | 1 | 67% |
| 8. Duplicate Detection | 7 | 1 | 1 | 5 | 21% |
| 9. Row Operations | 10 | 6 | 0 | 4 | 60% |
| 10. Status Bar | 2 | 2 | 0 | 0 | 100% |
| 11. Tracking Fields | 7 | 2 | 1 | 4 | 36% |
| 12. Time Interval | 3 | 0 | 0 | 3 | 0% |
| 13. Error Handling | 2 | 0 | 0 | 2 | 0% |
| 14-23. Import Pipeline | 62 | 58 | 2 | 2 | 95% |
| 26. Authentication | 19 | 14 | 2 | 3 | 79% |
| 27. Patient Assignment | 10 | 10 | 0 | 0 | 100% |
| 28. RBAC | 11 | 11 | 0 | 0 | 100% |
| 29. Patient Name Search | 6 | 6 | 0 | 0 | 100% |

### Top Priority Gaps

| Priority | Area | Gap | Recommended Framework |
|----------|------|-----|----------------------|
| HIGH | Cell Editing | 0 automated E2E tests for cell edit workflow | Cypress |
| HIGH | Time Interval | 0 automated tests for editability/override | Cypress |
| HIGH | Duplicate Detection | Edit-creates-duplicate flow not tested | Cypress |
| MEDIUM | Sorting | Post-edit sort suppression not tested | Cypress |
| MEDIUM | Row Colors | Overdue logic (completed expiry, terminal exclusion) | Cypress |
| MEDIUM | Tracking Fields | N/A display, free text prompts not tested | Cypress |
| MEDIUM | Authentication | Password change UI flow not E2E tested | Playwright |
| MEDIUM | Admin Dashboard | Audit log viewer not tested | Cypress |
| LOW | Network Error | Error recovery not tested | Playwright |

---

## Last Updated

February 5, 2026 - Added Patient Name Search test cases (TC-29.1 to TC-29.6)
February 5, 2026 - Added automation status and requirement traceability to all test cases
February 5, 2026 - Added Automation Summary section with coverage percentages and priority gaps
February 4, 2026 - Added Role Access Control test cases (TC-28.1 to TC-28.11)
February 4, 2026 - Added Patient Assignment test cases (TC-27.1 to TC-27.10)
February 3, 2026 - Added Forgot Password test cases (TC-26.25 to TC-26.33)
