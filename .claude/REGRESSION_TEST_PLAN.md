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
1. Verify columns are visible: Member Name, Request Type, Quality Measure, Measure Status, Status Date, Due Date, Time Interval (Days), Tracking #1, Tracking #2, Notes (12 columns; Tracking #3 removed in v4.10.0)

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
**Automation:** Automated - `date-prepopulate.cy.ts` (manual edit tests), `DateCellEditor.test.tsx` (8 tests), `StatusDateRenderer.test.tsx` (13 tests)
**Steps:**
1. Double-click on Status Date cell
2. Enter date in format: 1/15/2026
3. Press Tab or Enter

**Expected:**
- DateCellEditor opens as inline text input
- Date is accepted and displays as 1/15/2026
- Due Date recalculates based on status rules

### TC-2.3a: Status Date "Today" Button
**Requirement:** Date prepopulate Option A
**Automation:** Automated - `date-prepopulate.cy.ts` (~36 tests), `StatusDateRenderer.test.tsx` (Today button click tests)
**Steps:**
1. Find an empty statusDate cell with prompt text (e.g., "Date Ordered")
2. Hover over the cell
3. Click the "Today" button that appears on hover

**Expected:**
- Empty cells show striped prompt text with pencil icon
- "Today" button appears on cell hover
- Clicking "Today" stamps today's date (M/D/YYYY) without entering edit mode
- Date is saved via valueSetter pipeline (same as manual entry)

### TC-2.4: Date Input Flexibility
**Requirement:** AC-6
**Automation:** Partial - `date-prepopulate.cy.ts` (manual date entry), backend dateParser.ts has unit tests
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
1. Double-click on Status Date cell
2. Enter invalid text: "abc"
3. Press Tab

**Expected:**
- Error popup appears: "Invalid date format"
- Cell reverts to previous value

### TC-2.6: Hover-Reveal Dropdown Arrow
**Requirement:** Cell editing UX — visual affordance for dropdown cells
**Automation:** Automated - `hover-reveal-dropdown.cy.ts` (13 tests)
**Steps:**
1. Hover over a dropdown cell (Request Type, Quality Measure, Measure Status, Tracking #1/#2)
2. Observe arrow indicator appearance
3. Hover over a non-dropdown cell (Notes, Member Name)
4. Hover over a disabled (N/A) cell

**Expected:**
- Blue arrow appears on hover for dropdown cells
- Arrow hidden by default (not visible without hover)
- No arrow on non-dropdown cells
- No arrow on disabled (N/A) cells
- Single click on arrow opens the dropdown editor

### TC-2.7: Auto-Open Dropdown Editor (Single-Click)
**Requirement:** Cell editing UX — dropdown cells open immediately on single click
**Automation:** Automated - `AutoOpenSelectEditor.test.tsx` (22 tests), `hover-reveal-dropdown.cy.ts` (popup assertions), `PatientGrid.test.tsx` (3 updated assertions)
**Steps:**
1. Single-click on a dropdown cell (Request Type, Quality Measure, Measure Status, Tracking #1, Tracking #2)
2. Observe popup appearance
3. Use keyboard (ArrowUp/Down, Enter, Escape, Tab) to navigate options
4. Type characters for type-ahead filtering
5. Click an option with the mouse
6. Open dropdown and observe checkmark on currently-selected value
7. Select `(clear)` option and observe styling

**Expected:**
- Dropdown popup opens immediately on single click (no double-click required)
- Popup renders as `.ag-popup .auto-open-select-editor`
- Keyboard ArrowDown/ArrowUp highlights next/previous option
- Enter confirms selection; Escape cancels without changing value
- Tab confirms selection and moves to next cell
- Type-ahead highlights first matching option
- Checkmark icon displayed next to currently-selected value
- `(clear)` option displayed in gray italic text at top of list
- Selecting `(clear)` sets cell value to empty string

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

### TC-5.1: Status-Based Colors — All 14 Quality Measures
**Requirement:** AC-1
**Automation:** Automated - `row-color-comprehensive.cy.ts` Sections 1A-1N (93 tests), `sorting-filtering.cy.ts` (10 tests), `cascading-dropdowns.cy.ts`
**Steps:**
1. For each of the 14 quality measures, set every available measure status
2. Verify row color matches expected category

**Quality Measures Covered (Section 1A-1N):**
- 1A: Annual Wellness Visit (7 statuses)
- 1B: Breast Cancer Screening (8 statuses)
- 1C: Colon Cancer Screening (8 statuses)
- 1D: Cervical Cancer Screening (8 statuses)
- 1E: Depression Screening (7 statuses)
- 1F: Diabetic Eye Exam (8 statuses)
- 1G: GC/Chlamydia Screening (6 statuses)
- 1H: Diabetic Nephropathy (6 statuses)
- 1I: Hypertension Management (7 statuses)
- 1J: ACE/ARB in DM or CAD (6 statuses)
- 1K: Vaccination (6 statuses)
- 1L: Diabetes Control (6 statuses)
- 1M: Annual Serum K&Cr (5 statuses)
- 1N: Chronic Diagnosis Code (5 statuses)

**Expected:**
- White: Not Addressed
- Yellow: discussed/contacted/called/visit scheduled
- Blue: ordered/scheduled/prescribed/obtaining records/not at goal
- Green: completed/at goal/confirmed/on ACE/ARB
- Purple: declined/contraindicated
- Gray: no longer applicable/screening unnecessary
- Orange: chronic diagnosis resolved/invalid (no attestation)

### TC-5.2: Tracking #1 Dropdown + Color Verification
**Requirement:** AC-1, AC-8
**Automation:** Automated - `row-color-comprehensive.cy.ts` Sections 2A-2H (30+ tests)
**Steps:**
1. For each status with tracking #1 dropdown options, select every option
2. Verify row color stays correct after T1 selection

**Tracking #1 Dropdown Sections:**
- 2A: CCS ordered → Colonoscopy/Sigmoidoscopy/Cologuard/FOBT (blue)
- 2B: CCS completed → Colonoscopy/Sigmoidoscopy/Cologuard/FOBT (green)
- 2C: BCS ordered → Mammogram/Breast Ultrasound/Breast MRI (blue)
- 2D: BCS completed → Mammogram/Breast Ultrasound/Breast MRI (green)
- 2E: Screening discussed → In 1-11 Months (yellow)
- 2F: BP not at goal → Call every 1-8 wks (blue)
- 2G: BP at goal → Call every 1-8 wks (blue)
- 2H: CDX resolved/invalid → Attestation sent (green) / not sent (orange)

### TC-5.2a: Tracking #1 + Past Date → Overdue
**Requirement:** AC-2, AC-3, AC-8
**Automation:** Automated - `row-color-comprehensive.cy.ts` Sections 2A-2H date tests (22+ tests)
**Steps:**
1. For each tracking #1 option that sets a DueDayRule, set a past date (1/1/2024)
2. Verify row turns overdue (red)

**DueDayRules Tested:**
- CCS ordered: Colonoscopy=42d, Sigmoidoscopy=42d, Cologuard=21d, FOBT=21d
- BCS ordered: Mammogram=14d, Breast Ultrasound=14d, Breast MRI=21d
- Screening discussed: In 1 Month=30d, In 3 Months=90d, In 6 Months=180d, In 11 Months=330d
- BP not at goal: Call every 1 wk=7d, 2 wks=14d, 4 wks=28d, 8 wks=56d
- BP at goal: Call every 1 wk=7d, 4 wks=28d, 8 wks=56d
- CDX resolved/invalid: Attestation not sent=14d

**Expected:**
- All past date + T1 combinations → overdue (red)
- Today + T1 → stays base color (NOT overdue)
- Attestation sent + past → stays green (never overdue)

### TC-5.2b: Overdue Row Color (Completed Status)
**Requirement:** AC-3, AC-4
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 5A (11 tests)
**Steps:**
1. Set AWV completed with past date
2. Verify row turns overdue (baseDueDays=365, past date >365 days ago)

**Expected:**
- Row displays as light red (overdue), NOT green
- Indicates annual measure renewal is needed

### TC-5.2c: Non-Overdue Terminal Statuses
**Requirement:** AC-5
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 5C (5 tests)
**Steps:**
1. Set terminal statuses (declined, no longer applicable, screening unnecessary, contraindicated) with past date

**Expected:**
- Purple/gray rows stay their color (NOT red)
- CDX + Attestation sent stays green even with past date

### TC-5.2d: Completed Row Turns Red on Edit
**Requirement:** AC-4, AC-7
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 5A (AWV completed + past → overdue)
**Steps:**
1. Set AWV completed, enter past status date
2. Verify row turns red immediately

**Expected:**
- Due Date recalculates to past date
- Row immediately turns red (overdue)

### TC-5.2e: HgbA1c Tracking #1 Text + Tracking #2 Dropdown + Overdue
**Requirement:** AC-8, AC-2
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 3 (13 tests)
**Steps:**
1. Set HgbA1c ordered/at goal/NOT at goal
2. Enter T1 text value (e.g., "7.5"), select T2 dropdown month interval
3. Verify color. Then add past date → verify overdue

**T2 Month Intervals Tested:** 1, 3, 6, 12 months
**Expected:**
- HgbA1c ordered + T1 + T2 → blue; + past → overdue
- HgbA1c at goal + T1 + T2 → green; + past → overdue
- HgbA1c NOT at goal + T1 + T2 → blue; + past → overdue
- HgbA1c ordered + NO T2 + past → stays blue (needs T2 for dueDate)
- Today → NOT overdue

### TC-5.2f: BP Tracking #1 Dropdown + Tracking #2 Text + Overdue
**Requirement:** AC-8, AC-2
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 4 (5 tests)
**Steps:**
1. Set BP not at goal / at goal
2. Select T1 call frequency dropdown, enter T2 BP reading text
3. Verify color. Then add past date → verify overdue

**Expected:**
- BP not at goal + T1 + T2 → blue; + past → overdue
- BP at goal + T1 + T2 → blue; + past → overdue
- Today → NOT overdue

### TC-5.2g: Chronic DX Attestation Sent → GREEN
**Requirement:** AC-9
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 2H, `cascading-dropdowns.cy.ts`, `PatientGrid.test.tsx`
**Steps:**
1. Set Request Type to "Chronic DX", Measure Status to "Chronic diagnosis resolved"
2. Set Tracking #1 to "Attestation sent"

**Expected:**
- Row displays GREEN (not orange)
- Works for both "resolved" and "invalid" statuses

### TC-5.2h: Chronic DX Attestation Not Sent → ORANGE
**Requirement:** AC-10
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 2H, `cascading-dropdowns.cy.ts`, `PatientGrid.test.tsx`
**Steps:**
1. Set Request Type to "Chronic DX", Measure Status to "Chronic diagnosis resolved"
2. Set Tracking #1 to "Attestation not sent"

**Expected:**
- Row displays ORANGE
- Works for both "resolved" and "invalid" statuses

### TC-5.2i: Chronic DX Attestation + Overdue
**Requirement:** AC-11, AC-12
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 2H date tests (4 tests)
**Steps:**
1. CDX resolved/invalid + Attestation not sent + past date → RED
2. CDX resolved/invalid + Attestation sent + past date → stays GREEN

**Expected:**
- Attestation not sent + past → overdue (DueDayRule=14d)
- Attestation sent + past → stays GREEN (never overdue)

### TC-5.3: Date Entry Methods
**Requirement:** AC-7
**Automation:** Automated - `row-color-comprehensive.cy.ts` Sections 5B, 7 (7 tests)
**Steps:**
1. Click "Today" button on empty status date cell → verify date stamps correctly
2. Double-click status date cell → type date → verify overdue transition
3. Verify date value appears in cell after entry

**Expected:**
- Today button stamps current date
- Double-click date editor accepts MM/DD/YYYY
- Row color changes immediately after date save

### TC-5.4: Time Interval Editing → Overdue Toggle
**Requirement:** AC-7, AC-13
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 6 (2 tests)
**Steps:**
1. Create overdue row (AWV called + past date → red)
2. Edit time interval to 9999 → verify NOT overdue anymore
3. CCS ordered + T1=Colonoscopy + past → overdue → extend to 9999 → NOT overdue

**Expected:**
- Extending interval pushes dueDate into the future → removes overdue
- Row reverts to base status color

### TC-5.5: Color Transitions (Status Change)
**Requirement:** AC-7
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 8 (2 tests)
**Steps:**
1. AWV: White → Blue → Green → Purple → Gray (change measure status)
2. CDX: Orange → Green (toggle attestation sent)

**Expected:**
- Row color updates immediately on each status change

### TC-5.6: No baseDueDays → Never Overdue
**Requirement:** AC-5
**Automation:** Automated - `row-color-comprehensive.cy.ts` Section 5D (2 tests)
**Steps:**
1. Not Addressed + past date → stays white
2. HgbA1c ordered + no T2 + past date → stays blue

**Expected:**
- Statuses without baseDueDays never calculate dueDate, never turn overdue

### TC-5.7: Color Preserved During Selection
**Requirement:** AC-6
**Automation:** Automated - `sorting-filtering.cy.ts: "Row selection preserves color"`
**Steps:**
1. Click on a green (completed) row
2. Observe the row

**Expected:**
- Row has green background with blue outline border
- Green color is NOT overridden by selection

### TC-5.8: Real-Time Color Update
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
**Automation:** Automated (backend) - `dueDateCalculator.test.ts` (29 tests). Manual (E2E)
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

### TC-7.4: Boundary Month Patterns & Priority Ordering
**Requirement:** AC-1, AC-2
**Automation:** Automated (backend) - `dueDateCalculator.test.ts` (6 tests: "In 1 Month", "In 11 Months", non-matching tracking1 fallback, DueDayRule overrides baseDueDays, DueDayRule miss falls to baseDueDays)
**Steps:**
1. Set tracking1 to "In 1 Month" with statusDate 2026-03-15
2. Set tracking1 to "In 11 Months" with statusDate 2026-01-15
3. Set non-matching tracking1 value — should fall through to baseDueDays
4. Set status+tracking1 that matches a DueDayRule — should override baseDueDays

**Expected:**
- "In 1 Month" → due date in April (28-31 days)
- "In 11 Months" → due date in December 2026
- Non-matching tracking1 → baseDueDays used as fallback
- DueDayRule match → DueDayRule dueDays used (not baseDueDays)

### TC-7.5: baseDueDays Edge Cases
**Requirement:** AC-1
**Automation:** Automated (backend) - `dueDateCalculator.test.ts` (4 tests: baseDueDays 1/7/365/null)
**Steps:**
1. Set status with baseDueDays = 1 (e.g., "AWV scheduled")
2. Set status with baseDueDays = 7 (e.g., "Called to schedule")
3. Set status with baseDueDays = 365 (e.g., "AWV completed")
4. Set status with baseDueDays = null (e.g., "Screening complete")

**Expected:**
- baseDueDays 1 → due date = statusDate + 1 day
- baseDueDays 7 → due date = statusDate + 7 days
- baseDueDays 365 → due date = statusDate + 365 days (next year)
- baseDueDays null → no due date calculated (null)

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
- Both rows have orange left stripe duplicate indicator (#F97316)

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
**Automation:** Automated - `duplicateDetector.test.ts: "deleting one of two duplicates clears flag on remaining"`
**Steps:**
1. Have two duplicate rows (same patient + requestType + qualityMeasure)
2. Delete one of the rows

**Expected:**
- Remaining row is no longer marked as duplicate
- Yellow background removed from remaining row

### TC-8.7: Three-Way Duplicate — Delete One Leaves Two Flagged
**Requirement:** AC-7
**Automation:** Automated - `duplicateDetector.test.ts: "three-way duplicate: deleting one leaves two still flagged"`
**Steps:**
1. Have three rows with same patient + requestType + qualityMeasure
2. Delete one of the three rows

**Expected:**
- Remaining two rows are still marked as duplicates
- Duplicate indicators persist until only one row remains

### TC-8.8: QM Edit Recalculates Duplicate Flags
**Requirement:** AC-4
**Automation:** Automated - `duplicateDetector.test.ts: "duplicate flag recalculated when qualityMeasure edited from match to non-match"`
**Steps:**
1. Have two duplicate rows (same patient + RT + QM)
2. Edit one row's Quality Measure to a different value

**Expected:**
- Both rows lose their duplicate flag
- No duplicate indicators shown

### TC-8.9: Whitespace-Padded Request Type Still Checks Duplicates
**Requirement:** AC-1
**Automation:** Automated - `duplicateDetector.test.ts: "duplicate check with whitespace-padded requestType"`
**Steps:**
1. Create a row with Request Type " AWV " (padded with spaces)

**Expected:**
- Duplicate check still executes (non-empty after trim)
- Query uses original padded value

---

## 9. Add/Delete Operations

**Requirement Spec:** [`.claude/specs/row-operations/requirements.md`](specs/row-operations/requirements.md)

### TC-9.0: Copy Member Button (formerly "Duplicate Mbr")
**Requirement:** AC-10
**Automation:** Automated - `duplicate-member.spec.ts: "Duplicate button disabled without selection"`, `Toolbar.test.tsx: "Copy Member"`
**Steps:**
1. Ensure no row is selected
2. Observe "Copy Member" button in toolbar

**Expected:**
- Copy Member button is disabled (grayed out)
- Button label reads "Copy Member" (renamed from "Duplicate Mbr" in v4.10.0)

### TC-9.0b: Duplicate Row - Creates Copy Below
**Requirement:** AC-11, AC-12, AC-13
**Automation:** Automated - `duplicate-member.spec.ts: "creates copy below selected row"`
**Steps:**
1. Select a row in the middle of the grid (e.g., row 5)
2. Note the patient's name, DOB, phone, address
3. Click "Copy Member" button

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

### TC-9.0d: Pinned Row on Add - Filter Bypass
**Requirement:** New row should remain visible when filters are active
**Automation:** Automated - `MainPage.test.tsx: "Pinned row behavior"` (7 tests)
**Steps:**
1. Apply a status color filter (e.g., Green only)
2. Add a new row via "Add Row" button

**Expected:**
- New row is visible in the grid despite not matching the Green filter
- Amber "New row pinned -- click to unpin" badge appears in filter bar
- Status bar shows "(new row pinned)" indicator
- Clicking any filter chip clears the pin (new row may disappear if it doesn't match)

### TC-9.0e: Pinned Row on Duplicate - Filter Bypass
**Requirement:** Duplicated row should remain visible when filters are active
**Automation:** Automated - `MainPage.test.tsx: "Pinned row behavior"` (7 tests)
**Steps:**
1. Apply a quality measure filter (e.g., "Annual Wellness Visit")
2. Select a row and click "Copy Member"

**Expected:**
- New duplicated row is visible despite having null quality measure
- Amber badge appears in filter bar
- Clicking the badge or interacting with filters clears the pin

### TC-9.0f: Pinned Row Badge in StatusFilterBar
**Requirement:** Visual indicator for pinned rows
**Automation:** Automated - `StatusFilterBar.test.tsx: "Pinned Row Badge"` (5 tests)
**Steps:**
1. Trigger a pinned row (add or duplicate while filters active)

**Expected:**
- Badge has amber styling (bg-amber-100, text-amber-700, border-amber-400)
- Badge text: "New row pinned -- click to unpin"
- Clicking badge calls onUnpin callback
- Badge not shown when no row is pinned

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
- Page loads at `/patient-management`
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
1. Upload `test-hill-validation-errors.csv` (no title row)
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
1. Upload `test-hill-no-measures.csv`
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
2. Upload a CSV file (test-data/test-hill-merge-cases.csv)
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
1. Upload test-hill-merge-cases.csv
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
1. Upload test-hill-merge-cases.csv
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
| `test-hill-valid.csv` | 10 patients, all valid data, various measures | TC-15.*, TC-16.1-16.4, TC-20.5 |
| `test-hill-dates.csv` | Rows with various date formats | TC-17.* |
| `test-hill-multi-column.csv` | Multiple columns per measure (age brackets) | TC-18.* |
| `test-hill-validation-errors.csv` | Missing/invalid fields | TC-19.* |
| `test-hill-duplicates.csv` | Duplicate patient+measure rows | TC-19.10, TC-20.4 |
| `test-hill-no-measures.csv` | Patients with all empty measure columns | TC-16.5, TC-21.7 |
| `test-hill-warnings.csv` | Valid data with warnings (missing phone) | TC-20.3, TC-20.6, TC-20.9 |
| `test-hill-merge-cases.csv` | All 6 merge logic cases (INSERT/UPDATE/SKIP/BOTH/DELETE) | TC-22.* |

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
| `cypress/e2e/cascading-dropdowns.cy.ts` | Cascading dropdown behavior, row colors, Chronic DX attestation cascade | 36 |
| `cypress/e2e/import-flow.cy.ts` | Import workflow, preview, execution | 57 |
| `cypress/e2e/patient-assignment.cy.ts` | Patient/staff assignment, count verification | 32 |
| `cypress/e2e/role-access-control.cy.ts` | STAFF/PHYSICIAN/ADMIN access restrictions | 31 |
| `cypress/e2e/sorting-filtering.cy.ts` | Column sorting, status filter bar, row colors | 55 |
| `cypress/e2e/patient-name-search.cy.ts` | Search input UI, filtering, AND logic, keyboard shortcuts | 13 |
| `cypress/e2e/multi-select-filter.cy.ts` | Multi-select toggle, duplicates exclusivity, checkmark visual | 18 |
| `cypress/e2e/row-color-comprehensive.cy.ts` | ALL status→color, tracking #1/#2 types, date→overdue, time interval | 179 |

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

### TC-26.11: ADMIN Role - Patient Grid Access via Physician Dropdown
**Requirement:** See patient-ownership spec AC-9
**Automation:** Automated - `role-access-control.cy.ts: "ADMIN" tests`, `Header.test.tsx`
**Steps:**
1. Login as pure ADMIN user
2. Navigate to patient grid (/)
3. Observe physician dropdown in header

**Expected:**
- Physician dropdown visible with ALL physicians + "Unassigned patients" option
- Must select a physician to view data
- Can switch between any physician's patients
- Can view unassigned patients (ownerId = null)
- Full grid edit capabilities (add, delete, duplicate, edit cells)

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
**Automation:** Partial - `AdminPage.test.tsx` (5 tests for LOGIN_FAILED/ACCOUNT_LOCKED display), remaining audit log views manual
**Steps:**
1. As ADMIN, navigate to Audit Log section
2. View recent entries

**Expected:**
- Shows recent audit entries (LOGIN, LOGIN_FAILED, LOGOUT, PASSWORD_CHANGE, user CRUD)
- LOGIN_FAILED entries show orange badge, reason, email, and IP address
- ACCOUNT_LOCKED entries show red badge with reason
- Entries include timestamp, user, action, details

### TC-26.18a: Failed Login Audit Logging - Backend
**Requirement:** REQ-SEC-10 (AC 1-5)
**Automation:** Automated - `auth.routes.test.ts: "Failed login audit logging"` (8 tests)
**Steps:**
1. Attempt login with invalid email
2. Attempt login with valid email but wrong password
3. Attempt login with deactivated account

**Expected:**
- LOGIN_FAILED audit log created for each scenario
- Reason field contains: INVALID_CREDENTIALS or ACCOUNT_DEACTIVATED
- userEmail field populated (even for unknown users)
- IP address captured
- Attempted password NEVER stored in audit log
- Audit log write failure does not return 500 (login still returns 401)

### TC-26.18b: Failed Login Audit Display - Admin Panel
**Requirement:** REQ-SEC-10 (AC 6-7)
**Automation:** Automated - `AdminPage.test.tsx` (5 tests: orange badge, reason display, email/IP display, red ACCOUNT_LOCKED badge, combined details)
**Steps:**
1. As ADMIN, navigate to Audit Log
2. View LOGIN_FAILED and ACCOUNT_LOCKED entries

**Expected:**
- LOGIN_FAILED entries have orange badge (bg-orange-100 text-orange-800)
- ACCOUNT_LOCKED entries have red badge (bg-red-100 text-red-800)
- Details column shows: "Reason: X | Email: Y | IP: Z"

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

### TC-29.2: Real-Time Name Filtering (Word-Based)
**Requirement:** Req 2 (AC 2.1-2.6)
**Automation:** Automated - `MainPage.test.tsx` (25 tests), `patient-name-search.cy.ts: "Filtering Behavior"` (4 tests)
**Steps:**
1. Type "Smith" in the search input
2. Observe grid rows
3. Type "smith john" — multi-word search

**Expected:**
- Grid filters in real-time as you type
- Only rows where memberName contains "Smith" are shown
- Case-insensitive (typing "smith" matches "Smith, John")
- Partial match (typing "Smi" matches "Smith, John")
- Matches any part of name ("john" matches "Johnson, Mary")
- **Word-based matching**: "smith john" matches "Smith, John" (each word matched independently)
- **Any order**: "john smith" also matches "Smith, John"
- **Partial words**: "smi ali" matches "Smith, Alice"
- **All words required**: "smith charlie" returns no match if no row has both
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

## 30. Multi-Select Status Filter

**Spec:** `.claude/specs/multi-select-filter/requirements.md`

### TC-30.1: Multi-Select Toggle Behavior
**Requirements:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5, AC-1.6
**Automation:** Automated - `StatusFilterBar.test.tsx` (7 tests), `multi-select-filter.cy.ts` (5 tests)

**Steps:**
1. Click a status chip → toggles ON (added to active filters)
2. Click a second chip → both active (multi-select)
3. Click an active chip → toggles OFF (removed from filters, others unaffected)
4. Toggle off the last chip → "All" auto-activates
5. Click "All" → clears all individual selections
6. Click chip while "All" active → only clicked chip active

**Expected:**
- Multi-select toggle works for all scenarios
- Grid shows rows matching ANY selected color (OR logic)
- Zero-selection state impossible (always falls back to "All")

### TC-30.2: Checkmark + Fill Visual Style
**Requirements:** AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6
**Automation:** Automated - `StatusFilterBar.test.tsx` (5 tests), `multi-select-filter.cy.ts` (4 tests)

**Steps:**
1. Observe active chips → filled background + checkmark icon
2. Observe inactive chips → outlined style + reduced opacity
3. Hover inactive chip → subtle opacity increase
4. Observe "All" chip → same visual treatment as other chips

**Expected:**
- Active chips show checkmark + filled background matching status color
- Inactive chips at 50% opacity with 75% on hover
- All chips including "All" and "Duplicates" use consistent visual treatment

### TC-30.3: Duplicates Filter Exclusivity
**Requirements:** AC-3.1, AC-3.2, AC-3.3, AC-3.4
**Automation:** Automated - `StatusFilterBar.test.tsx` (2 tests), `multi-select-filter.cy.ts` (3 tests)

**Steps:**
1. Select color chips, then click "Duplicates" → color chips deselected
2. While "Duplicates" active, click a color chip → exits duplicates mode
3. Click "Duplicates" again to toggle off → returns to "All"

**Expected:**
- "Duplicates" and color chips are mutually exclusive
- "Duplicates" and "All" are mutually exclusive
- "Duplicates" uses same checkmark + fill visual

### TC-30.4: Status Bar and Chip Counts
**Requirements:** AC-4.1, AC-4.2, AC-4.3
**Automation:** Automated - `MainPage.test.tsx` (8 tests), `multi-select-filter.cy.ts` (2 tests)

**Steps:**
1. Select multiple filters → status bar shows combined count
2. Observe chip counts → always reflect full dataset
3. Add search with multi-filter → AND logic applies

**Expected:**
- Status bar shows "Showing X of Y rows" for combined count
- Chip counts unchanged when filters active
- Search narrows within multi-filter results

### TC-30.5: Keyboard Accessibility
**Requirements:** AC-5.1, AC-5.2, AC-5.3
**Automation:** Automated - `multi-select-filter.cy.ts` (2 tests), `StatusFilterBar.test.tsx` (aria-pressed tests)

**Steps:**
1. Focus a chip and press Enter/Space → toggles state
2. Tab between chips → focus moves in order
3. Check `aria-pressed` attribute → reflects toggle state

**Expected:**
- Native button keyboard behavior works (Enter/Space toggle)
- Tab navigation works between chips
- `aria-pressed` is `true` for active, `false` for inactive chips

---

## 31. UX Improvements (Feb 6, 2026)

### ~~TC-31.1: Row Numbers Column~~ REMOVED
**Status:** REMOVED — Row numbers column was removed per user feedback (confusing/invisible).
- Previously: `#` column pinned left, 3 Vitest + 5 Cypress tests
- All tests removed from `PatientGrid.test.tsx` and `ux-improvements.cy.ts`

### TC-31.2: Status Bar Consistent Format
**Automation:** Automated - `StatusBar.test.tsx` (6 tests), `ux-improvements.cy.ts: "Status Bar Consistency"` (3 tests)
**Steps:**
1. Load grid with no filters
2. Observe status bar text
3. Apply a filter and observe again

**Expected:**
- Always shows "Showing X of Y rows" format (even when unfiltered, X equals Y)
- Shows "Connected" status indicator

### TC-31.3: Filter Chip Focus-Visible
**Automation:** Automated - `StatusFilterBar.test.tsx: "Accessibility"` (1 test), `ux-improvements.cy.ts: "Filter Chip Accessibility"` (2 tests)
**Steps:**
1. Tab to filter chips using keyboard
2. Verify visible focus ring appears

**Expected:**
- Blue focus ring (ring-2 ring-blue-500) appears on keyboard focus
- `aria-pressed` attribute present on all chips

### TC-31.4: DOB Masked Aria-Label
**Automation:** Automated - `PatientGrid.test.tsx: "DOB cellRenderer"` (1 test)
**Steps:**
1. Verify masked DOB cells have `aria-label`

**Expected:**
- DOB "###" cells have `aria-label="Date of birth hidden for privacy"`

### TC-31.5: Password Helper Text
**Automation:** Automated - `ResetPasswordPage.test.tsx: "helper text"` (1 test), `Header.test.tsx: "helper text"` (1 test), `ux-improvements.cy.ts` (1 test)
**Steps:**
1. Open Reset Password page
2. Open Change Password modal

**Expected:**
- "Must be at least 8 characters" shown below New Password field in both locations

### TC-31.6: Password Visibility Toggles (Change Password Modal)
**Automation:** Automated - `Header.test.tsx: "visibility toggles"` (2 tests), `ux-improvements.cy.ts: "Password Visibility Toggles"` (3 tests)
**Steps:**
1. Open Change Password modal
2. Verify 3 eye icons exist
3. Click an eye icon to toggle visibility

**Expected:**
- 3 toggle buttons with `aria-label` ("Show/Hide current/new/confirm password")
- Clicking toggles input type between password and text
- Eye icon changes between Eye and EyeOff

### TC-31.7: Import Page Warning Icon
**Automation:** Automated - `ImportPage.test.tsx: "warning text with icon"` (1 test), `ux-improvements.cy.ts` (1 test)
**Steps:**
1. View Import page Replace All warning

**Expected:**
- AlertTriangle SVG icon appears before "Warning:" text

### TC-31.8: Import Page Max File Size
**Automation:** Automated - `ImportPage.test.tsx: "max file size"` (1 test), `ux-improvements.cy.ts` (1 test)
**Steps:**
1. View Import page file upload zone

**Expected:**
- Shows "Maximum file size: 10MB" text

### TC-31.9: Import Preview Table Horizontal Scroll
**Automation:** Automated - `ImportPreviewPage.test.tsx` (existing overflow tests)
**Steps:**
1. View import preview on narrow viewport

**Expected:**
- Table scrolls horizontally (overflow-x: auto) instead of breaking layout

---

## 32. Patient Management Page

### TC-32.1: Page renders with heading
**Automation:** Automated - `PatientManagementPage.test.tsx` (2 tests)
**Steps:** Navigate to `/patient-management`
**Expected:** "Patient Management" heading and icon visible

### TC-32.2: ADMIN sees both tabs
**Automation:** Automated - `PatientManagementPage.test.tsx`, `patient-management.spec.ts`
**Steps:** Login as ADMIN, navigate to `/patient-management`
**Expected:** Both "Import Patients" and "Reassign Patients" tabs visible

### TC-32.3: Non-ADMIN sees only Import tab
**Automation:** Automated - `PatientManagementPage.test.tsx`, `patient-management.spec.ts`
**Steps:** Login as PHYSICIAN/STAFF, navigate to `/patient-management`
**Expected:** Only "Import Patients" tab visible

### TC-32.4: Tab switching and URL sync
**Automation:** Automated - `PatientManagementPage.test.tsx` (4 tests)
**Steps:** Click tabs, verify URL updates and content visibility
**Expected:** Active tab reflected in URL `?tab=` param, correct content shown/hidden

### TC-32.5: URL param ?tab=reassign for non-ADMIN falls back
**Automation:** Automated - `PatientManagementPage.test.tsx`, `patient-management.spec.ts`
**Steps:** As PHYSICIAN, navigate to `/patient-management?tab=reassign`
**Expected:** Import tab active (fallback), Reassign tab not visible

### TC-32.6: Redirect /import → /patient-management
**Automation:** Automated - `patient-management.spec.ts`
**Steps:** Navigate to `/import`
**Expected:** Redirected to `/patient-management`

### TC-32.7: Redirect /admin/patient-assignment → /patient-management?tab=reassign
**Automation:** Automated - `patient-management.spec.ts`
**Steps:** Navigate to `/admin/patient-assignment`
**Expected:** Redirected to `/patient-management?tab=reassign`

### TC-32.8: Header nav shows "Patient Mgmt" with active highlight
**Automation:** Automated - `patient-management.spec.ts`
**Steps:** Navigate to `/patient-management`
**Expected:** "Patient Mgmt" link visible and highlighted (blue)

---

## 33. Security Hardening — Env Var Validation (REQ-SEC-04, REQ-SEC-05)

**Requirement Spec:** `.claude/specs/security-hardening/requirements.md`

### TC-33.1: Production — Missing JWT_SECRET Crashes
**Requirement:** REQ-SEC-04 AC-1
**Automation:** Automated - `validateEnv.test.ts: "should error when JWT_SECRET is missing in production"`
**Expected:** `process.exit(1)` called, error includes "JWT_SECRET environment variable is required"

### TC-33.2: Production — Default JWT_SECRET Crashes
**Requirement:** REQ-SEC-04 AC-2
**Automation:** Automated - `validateEnv.test.ts: "should error when JWT_SECRET is the default development value"`
**Expected:** `process.exit(1)` called, error includes "must not use the default"

### TC-33.3: Production — Short JWT_SECRET Crashes
**Requirement:** REQ-SEC-04 AC-3
**Automation:** Automated - `validateEnv.test.ts: "should error when JWT_SECRET is shorter than 32 characters"`
**Expected:** `process.exit(1)` called, error includes "at least 32 characters"

### TC-33.4: Development — Missing JWT_SECRET Warns Only
**Requirement:** REQ-SEC-04 AC-4
**Automation:** Automated - `validateEnv.test.ts: "should log a warning when JWT_SECRET is not set in development"`
**Expected:** `valid: true`, no `process.exit`, warning logged

### TC-33.5: Production — Missing SMTP_HOST Crashes
**Requirement:** REQ-SEC-05 AC-1
**Automation:** Automated - `validateEnv.test.ts: "should error when SMTP_HOST is missing"`
**Expected:** `process.exit(1)` called

### TC-33.6: Production — Default ADMIN_EMAIL Crashes
**Requirement:** REQ-SEC-05 AC-3
**Automation:** Automated - `validateEnv.test.ts: "should error when ADMIN_EMAIL is the default value"`
**Expected:** `process.exit(1)` called

### TC-33.7: Production — Default ADMIN_PASSWORD Crashes
**Requirement:** REQ-SEC-05 AC-4
**Automation:** Automated - `validateEnv.test.ts: "should error when ADMIN_PASSWORD is the default value"`
**Expected:** `process.exit(1)` called

### TC-33.8: Production — All Valid Passes
**Requirement:** REQ-SEC-05 AC-5
**Automation:** Automated - `validateEnv.test.ts: "should return valid: true with no errors when all env vars are correctly set"`
**Expected:** `valid: true`, no errors, no warnings, config summary logged

### TC-33.9: Production — Multiple Errors Reported
**Requirement:** REQ-SEC-05 AC-2
**Automation:** Automated - `validateEnv.test.ts: "should report all errors when multiple env vars are invalid"`
**Expected:** All 4 errors reported before exit

### TC-33.10: Config Summary Does Not Reveal Secrets
**Requirement:** REQ-SEC-05 AC-5
**Automation:** Automated - `validateEnv.test.ts: "should not reveal secret values in the configuration summary"`
**Expected:** JWT secret logged as length only, SMTP_HOST as "(set)", admin email as "(custom)"

---

## 34. Security Hardening — Account Lockout + Temp Password + Forced Password Change (REQ-SEC-06)

### TC-34.1: Failed Login Increments Counter
**Requirement:** REQ-SEC-06 AC-1
**Automation:** Automated - `auth.routes.test.ts: "lockout logic"` tests
**Expected:** Each failed login increments `failedLoginAttempts` counter on User record

### TC-34.2: Account Locks After 5 Failed Attempts
**Requirement:** REQ-SEC-06 AC-2
**Automation:** Automated - `authService.test.ts: "lockAccount"`, `auth.routes.test.ts`
**Expected:** After 5 consecutive failed logins, account is locked for 30 minutes (`lockedUntil` set)

### TC-34.3: Locked Account Rejects Login
**Requirement:** REQ-SEC-06 AC-3
**Automation:** Automated - `auth.routes.test.ts: "rejects login when account is locked"`
**Expected:** Login returns 423 (Locked) with "Account is temporarily locked" message and `lockedUntil` timestamp

### TC-34.4: Warning Shown at 3+ Failed Attempts
**Requirement:** REQ-SEC-06 AC-4
**Automation:** Automated - `auth.routes.test.ts: "returns warning on attempt 3+"`, `LoginPage.test.tsx`
**Expected:** Login response includes `warning` field with remaining attempts count; frontend shows yellow warning box

### TC-34.5: Successful Login Resets Counter
**Requirement:** REQ-SEC-06 AC-5
**Automation:** Automated - `auth.routes.test.ts: "resets failed attempts on successful login"`
**Expected:** Successful login resets `failedLoginAttempts` to 0

### TC-34.6: Admin Can Send Temp Password
**Requirement:** REQ-SEC-06 AC-6
**Automation:** Automated - `admin.routes.test.ts: "send-temp-password"`, `AdminPage.test.tsx`
**Expected:** Admin clicks "Send Temp Password" button, temp password is generated, sent via email (or shown on-screen if SMTP not configured), user's `mustChangePassword` flag set to true

### TC-34.7: Temp Password Forces Password Change
**Requirement:** REQ-SEC-06 AC-7
**Automation:** Automated - `ForcePasswordChange.test.tsx` (7 tests), `ProtectedRoute.test.tsx`
**Expected:** User logging in with `mustChangePassword=true` sees ForcePasswordChange modal (full-screen, no close button, no escape), must set new password before accessing app

### TC-34.8: Force-Change-Password Endpoint
**Requirement:** REQ-SEC-06 AC-8
**Automation:** Automated - `auth.routes.test.ts: "force-change-password"`
**Expected:** `POST /force-change-password` validates old password, sets new password, clears `mustChangePassword` flag, returns new JWT token

### TC-34.9: Password Change Clears mustChangePassword
**Requirement:** REQ-SEC-06 AC-9
**Automation:** Automated - `auth.routes.test.ts: "clears mustChangePassword on password change"`
**Expected:** `PUT /password` (regular password change) also clears `mustChangePassword` flag if set

### TC-34.10: Lock Duration Expires Automatically
**Requirement:** REQ-SEC-06 AC-10
**Automation:** Automated - `authService.test.ts: "isAccountLocked returns false after lockout expires"`
**Expected:** After 30 minutes, `isAccountLocked()` returns false even if `lockedUntil` is set (time-based expiry)

---

## 35. Insurance Group Filter (REQ-IG)

**Requirement Spec:** [`.claude/specs/insurance-group/requirements.md`](specs/insurance-group/requirements.md)

### TC-35.1: Insurance Group Dropdown Renders
**Automation:** Automated - `StatusFilterBar.test.tsx`, `insurance-group-filter.cy.ts`
**Steps:** Open grid page; observe filter bar
**Expected:** Insurance group dropdown visible with aria-label "Filter by insurance group"; default selection is "Hill"; options include All, system names, No Insurance

### TC-35.2: Filter by Specific Insurance Group
**Automation:** Automated - `data.routes.test.ts: "filters by insuranceGroup=hill"`, `insurance-group-filter.cy.ts`
**Steps:** Select "Hill" from insurance group dropdown
**Expected:** Only patients with `insuranceGroup='hill'` are displayed; API called with `?insuranceGroup=hill`

### TC-35.3: Filter by No Insurance
**Automation:** Automated - `data.routes.test.ts: "filters by insuranceGroup=none"`, `insurance-group-filter.cy.ts`
**Steps:** Select "No Insurance" from insurance group dropdown
**Expected:** Only patients with `insuranceGroup=null` are displayed

### TC-35.4: Show All Insurance Groups
**Automation:** Automated - `data.routes.test.ts: "returns all when insuranceGroup=all"`, `insurance-group-filter.cy.ts`
**Steps:** Select "All" from insurance group dropdown
**Expected:** All patients displayed regardless of insurance group; no insuranceGroup param sent to API

### TC-35.5: Invalid Insurance Group Rejected
**Automation:** Automated - `data.routes.test.ts: "rejects invalid insuranceGroup"``
**Steps:** API call with `?insuranceGroup=invalid_system`
**Expected:** 400 error with `VALIDATION_ERROR` code

### TC-35.6: Active Filter Visual Ring
**Automation:** Automated - `StatusFilterBar.test.tsx`, `insurance-group-filter.cy.ts`
**Steps:** Select a non-"All" insurance group
**Expected:** Dropdown shows blue ring-2 border; selecting "All" removes the ring

### TC-35.7: Combined with Quality Measure Filter
**Automation:** Automated - `insurance-group-filter.cy.ts: "should combine insurance group filter with quality measure filter"`
**Steps:** Select "Hill" insurance group, then select a quality measure
**Expected:** Both filters apply (AND logic); filter summary shows both

### TC-35.8: Import Sets Insurance Group
**Automation:** Automated - `importExecutor.test.ts: "sets insuranceGroup on new patient"`, `importExecutor.test.ts: "updates insuranceGroup on existing patient"`
**Steps:** Import data for "hill" system
**Expected:** New patients get `insuranceGroup='hill'`; existing patients updated to match import system

### TC-35.9: Insurance Group in Grid Row Payload
**Automation:** Automated - `versionCheck.test.ts: "insuranceGroup included in payload"`
**Steps:** Fetch patient data via API
**Expected:** Each row includes `insuranceGroup` field for real-time sync

### TC-35.10: Duplicate Row Preserves Insurance Group
**Automation:** Automated - via `dataDuplicateHandler.ts` inclusion
**Steps:** Duplicate a row
**Expected:** Duplicated row preserves the patient's insurance group value

---

## 36. Sutter/SIP Multi-System Import

**Requirement Spec:** [`.claude/specs/sutter-import/requirements.md`](specs/sutter-import/requirements.md)

### TC-36.1: Sutter System Registration
**Automation:** Automated - `configLoader.test.ts`, `import.routes.test.ts`
**Steps:** Verify Sutter system is listed in `/api/import/systems` endpoint
**Expected:** Sutter appears with id `sutter`, name `Sutter/SIP`, alongside Hill Healthcare

### TC-36.2: Universal Sheet/Tab Discovery with Header Validation
**Automation:** Automated - `import.routes.test.ts: "POST /sheets"`, `fileParser.test.ts: "getSheetHeaders/getWorkbookInfo"`, `configLoader.test.ts: "getRequiredColumns"`
**Steps:** Upload Excel workbook via `POST /api/import/sheets` for ANY system (Hill or Sutter)
**Expected:** Returns header-validated sheet list (skipTabs + column validation); valid sheets listed; exclusion counts by reason (name vs columns)

### TC-36.3: Sheet skipTabs Filtering + Header-Based Validation
**Automation:** Automated - `import.routes.test.ts`, `sutter-edge-cases.test.ts`
**Steps:** Upload workbook containing tabs matching skipTabs patterns AND tabs with wrong columns
**Expected:** Name-matched tabs excluded first; remaining tabs validated against required columns (patient + data); NO_VALID_TABS error if all filtered

### TC-36.4: Sutter Preview with Sheet Selection
**Automation:** Automated - `import.routes.test.ts: "POST /preview Sutter"`, `sutter-import-flow.test.ts`
**Steps:** Upload Sutter file with sheetName parameter via `POST /api/import/preview`
**Expected:** Preview generated for selected tab; MISSING_SHEET_NAME error if sheetName omitted for Sutter; INVALID_SHEET_NAME error if tab not found

### TC-36.5: Action Mapping
**Automation:** Automated - `actionMapper.test.ts` (full coverage of action text to status mapping)
**Steps:** Process Sutter rows with various action text values
**Expected:** Known actions mapped to correct measureStatus/requestType/qualityMeasure; unknown actions tracked as unmapped

### TC-36.6: Measure Details Parsing
**Automation:** Automated - `measureDetailsParser.test.ts`
**Steps:** Process freeform measure detail text
**Expected:** Extracts HgbA1c values, BP readings, test types, time intervals from text

### TC-36.7: Sutter Column Mapping
**Automation:** Automated - `sutterColumnMapper.test.ts`
**Steps:** Map Sutter per-tab columns to internal fields
**Expected:** Member name, DOB, action, measure details correctly mapped

### TC-36.8: Sutter Data Transformation
**Automation:** Automated - `sutterDataTransformer.test.ts`
**Steps:** Transform Sutter wide-format data to long-format patient measures
**Expected:** Rows transformed correctly; unmapped actions tracked with counts; grouped by patient

### TC-36.9: Universal Frontend Sheet Selector
**Automation:** Automated - `SheetSelector.test.tsx` (57 tests), `ImportPage.test.tsx` (universal tests), `PreviewChangesTable.test.tsx` (21 tests)
**Steps:** Select ANY system, upload file, use universal SheetSelector component
**Expected:** Sheet list fetched from API; single-tab shows text, multi-tab shows dropdown; physician auto-match by tab name; errors displayed on API failure; Step 4 "Select Tab & Physician" with submit gating

### TC-36.10: Frontend Unmapped Actions Banner
**Automation:** Automated - `UnmappedActionsBanner.test.tsx` (17 tests), `ImportPreviewPage.test.tsx`
**Steps:** Complete Sutter import with unmapped actions
**Expected:** Banner shows unmapped action types with counts; expandable detail list; accessible (role=alert)

### TC-36.11: Sutter Error Handling
**Automation:** Automated - `sutter-error-handling.test.ts`
**Steps:** Test various error paths (invalid config, empty tabs, malformed data)
**Expected:** Appropriate error codes (NO_VALID_TABS, EMPTY_TAB, MISSING_SHEET_NAME, INVALID_SHEET_NAME)

### TC-36.12: Sutter Performance
**Automation:** Automated - `sutter-performance.test.ts`
**Steps:** Process large Sutter datasets
**Expected:** Performance within acceptable bounds for typical workbook sizes

### TC-36.13: Default "Not Addressed" for Unmapped Actions
**Automation:** Automated - `sutterDataTransformer.test.ts`
**Steps:** Import Sutter file with action text that doesn't match any actionMapping pattern
**Expected:** Unmapped actions silently default to measureStatus="Not Addressed"; no validator warnings generated

### TC-36.14: Configurable Preview Columns
**Automation:** Automated - `PreviewChangesTable.test.tsx` (21 tests), `ImportPreviewPage.test.tsx`
**Steps:** Preview Sutter import with previewColumns config (Status Date, Possible Actions Needed)
**Expected:** Dynamic columns rendered in preview table; extraColumns data shown; correct colSpan for empty state; Hill previews show no extra columns

### TC-36.15: Universal Sheet Selector — Cypress E2E
**Automation:** Automated - `import-flow.cy.ts` (8 new tests)
**Steps:** Upload file, verify Step 4 appears, select tab and physician, submit
**Expected:** Step 4 "Select Tab & Physician" visible after upload; tab dropdown or text display; physician dropdown; submit enabled only when both selected

### TC-36.16: Import — ADMIN Role (Pure)
**Automation:** Automated - `SheetSelector.test.tsx` (physician dropdown tests), `ImportPage.test.tsx`
**Steps:**
1. Login as user with roles `['ADMIN']`
2. Navigate to Import page, select system, upload file
3. Observe Step 4 physician selector

**Expected:**
- Tab selector: dropdown (multi-tab) or text (single-tab) — same for all roles
- Physician selector: dropdown showing ALL physicians in the system
- No auto-assignment; must manually select a physician
- "Preview Import" enabled only after both tab and physician are selected

### TC-36.17: Import — PHYSICIAN Role (Pure)
**Automation:** Automated - `SheetSelector.test.tsx` (PHYSICIAN auto-assign test)
**Steps:**
1. Login as user with roles `['PHYSICIAN']` only
2. Navigate to Import page, select system, upload file
3. Observe Step 4 physician selector

**Expected:**
- Tab selector: same as all roles
- Physician selector: auto-assigned to self — shows "Importing for: {name}" text, no dropdown
- Cannot change physician assignment
- "Preview Import" enabled automatically after tab is selected (physician already assigned)

### TC-36.18: Import — STAFF Role
**Automation:** Automated - `SheetSelector.test.tsx` (STAFF physician dropdown), `ImportPage.test.tsx`
**Steps:**
1. Login as user with roles `['STAFF']`
2. Navigate to Import page, select system, upload file
3. Observe Step 4 physician selector

**Expected:**
- Tab selector: same as all roles
- Physician selector: dropdown showing only assigned physicians (not all)
- Must manually select a physician from filtered list
- "Preview Import" enabled only after both tab and physician selected

### TC-36.19: Import — ADMIN+PHYSICIAN Dual Role
**Automation:** Automated - `SheetSelector.test.tsx` (ADMIN+PHYSICIAN dual role test)
**Steps:**
1. Login as user with roles `['ADMIN', 'PHYSICIAN']`
2. Navigate to Import page, select system, upload file
3. Observe Step 4 physician selector

**Expected:**
- Tab selector: same as all roles
- Physician selector: dropdown showing ALL physicians (ADMIN behavior takes precedence)
- NOT auto-assigned to self — user must manually select
- Auto-match from tab name still works (suggested physician pre-selected)
- "Preview Import" enabled only after both tab and physician selected

---

## 37. Comprehensive Role-Based Use Cases (Cross-Page Workflows)

**Purpose:** End-to-end role behavior across Patient Grid, Patient Management, and Admin pages. Covers gaps not addressed by Section 28 (basic RBAC access control) or Section 36 (import-specific role tests).

**Seed Data (Local Dev):**

| Email | Name | Roles | Staff Assignments | Password |
|-------|------|-------|-------------------|----------|
| `admin@gmail.com` | Admin User | ADMIN | — | `welcome100` |
| `adminphy@gmail.com` | Ko Admin-Phy | ADMIN, PHYSICIAN | — | `welcome100` |
| `phy1@gmail.com` | Physician One | PHYSICIAN | — | `welcome100` |
| `phy2@gmail.com` | Physician Two | PHYSICIAN | — | `welcome100` |
| `staff1@gmail.com` | Staff One | STAFF | → Physician One only | `welcome100` |
| `staff2@gmail.com` | Staff Two | STAFF | → Physician One, Two, Ko Admin-Phy | `welcome100` |

### TC-37.1: ADMIN — Patient Grid Workflow
**Automation:** Partial - `Header.test.tsx`, `role-access-control.cy.ts`
**Steps:**
1. Login as Admin User (`admin@gmail.com`)
2. Navigate to patient grid (/)
3. Observe header physician dropdown
4. Select "Physician One" from dropdown
5. Edit a cell, add a row, delete a row
6. Switch to "Physician Two"
7. Select "Unassigned patients"

**Expected:**
- Physician dropdown visible with ALL physicians + "Unassigned patients"
- Selecting physician loads that physician's patients
- Full edit capabilities (add, delete, duplicate, edit cells)
- Switching physician refreshes grid with new data
- "Unassigned patients" shows patients with no owner
- Search, status filter, insurance filter all work
- Member info toggle works

### TC-37.2: ADMIN — Patient Management Workflow
**Automation:** Partial - `PatientManagementPage.test.tsx`, `PatientAssignmentPage.test.tsx`
**Steps:**
1. Login as Admin User
2. Navigate to /patient-management
3. Verify both tabs visible: "Import Patients" and "Reassign Patients"
4. On Import tab: upload file, verify physician dropdown shows ALL physicians
5. Switch to Reassign tab: verify unassigned patients visible
6. Select patients and assign to a physician

**Expected:**
- Both tabs visible (Import + Reassign)
- Import physician dropdown: all physicians, no auto-assignment
- Reassign: can view unassigned patients, select target physician, bulk-assign
- After reassign: patient count updates, assigned physician sees patients on grid

### TC-37.3: ADMIN — Admin Page Full Access
**Automation:** Automated - `AdminPage.test.tsx`, `admin.routes.test.ts`
**Steps:**
1. Login as Admin User
2. Navigate to /admin
3. Verify Users tab: see all users, role badges, action buttons
4. Create a new PHYSICIAN user
5. Create a new STAFF user with physician assignments
6. Edit a user's role
7. Reset a user's password
8. Switch to Audit Log tab
9. Verify audit entries for actions taken

**Expected:**
- Users tab: all users listed with roles, status, patient counts
- Can create users with any valid role combo
- Can edit roles, staff assignments, deactivate users
- Cannot deactivate self
- Audit log: all entries visible with timestamps, action types, details

### TC-37.4: PHYSICIAN — Patient Grid Workflow
**Automation:** Partial - `role-access-control.cy.ts: "PHYSICIAN auto-filters"`
**Steps:**
1. Login as Physician One (`phy1@gmail.com`)
2. Navigate to patient grid (/)
3. Observe NO physician dropdown in header
4. Verify only own patients visible
5. Edit a cell, add a row, delete a row
6. Use search, status filter, insurance filter

**Expected:**
- NO physician dropdown (auto-filtered)
- Only patients where ownerId = Physician One's ID
- Full edit capabilities on own patients
- All toolbar actions work (add, delete, duplicate, member info toggle)
- All filters work on own patient subset
- Cannot see other physicians' patients or unassigned patients

### TC-37.5: PHYSICIAN — Patient Management (Import Only)
**Automation:** Partial - `SheetSelector.test.tsx`, TC-36.17
**Steps:**
1. Login as Physician One
2. Navigate to /patient-management
3. Verify only "Import Patients" tab visible (NO Reassign tab)
4. Upload file, verify auto-assigned to self

**Expected:**
- Only Import tab visible (Reassign tab hidden)
- Import: shows "Importing for: Physician One" — no physician dropdown
- Cannot change physician assignment
- Imported patients get ownerId = Physician One

### TC-37.6: PHYSICIAN — Admin Page Blocked
**Automation:** Automated - `role-access-control.cy.ts: "PHYSICIAN no admin"`
**Steps:**
1. Login as Physician One
2. Check navigation bar
3. Try to navigate to /admin directly

**Expected:**
- No "Admin" link in navigation
- Navigating to /admin redirects to /
- API calls to /api/admin/* return 403

### TC-37.7: STAFF (Single Assignment) — Patient Grid Workflow
**Automation:** Partial - `Header.test.tsx`, `role-access-control.cy.ts`
**Steps:**
1. Login as Staff One (`staff1@gmail.com`, assigned to Physician One only)
2. Navigate to patient grid (/)
3. Observe physician dropdown in header

**Expected:**
- Physician dropdown visible with ONLY "Physician One"
- NO "Unassigned patients" option
- Grid shows Physician One's patients
- Full edit capabilities on selected physician's patients
- All toolbar and filter actions available

### TC-37.8: STAFF (Multi Assignment) — Patient Grid Physician Switching
**Automation:** Partial - `role-access-control.cy.ts`, `Header.test.tsx`
**Steps:**
1. Login as Staff Two (`staff2@gmail.com`, assigned to Physician One, Two, Ko Admin-Phy)
2. Navigate to patient grid (/)
3. Select "Physician One" from dropdown
4. Switch to "Physician Two"
5. Switch to "Ko Admin-Phy"

**Expected:**
- Dropdown shows exactly 3 physicians (assigned only)
- NO "Unassigned patients" option
- Switching physician refreshes grid with that physician's patients
- Data isolation maintained between physicians
- Cannot manually add physicianId for non-assigned physician to API

### TC-37.9: STAFF — No Assignments
**Automation:** Manual - not yet tested
**Steps:**
1. Login as a STAFF user with zero physician assignments
2. Navigate to patient grid (/)

**Expected:**
- Message displayed: "No physicians assigned" or similar
- Empty grid or no data accessible
- Should prompt to contact administrator

### TC-37.10: STAFF — Patient Management (Import Only)
**Automation:** Partial - `PatientManagementPage.test.tsx`, TC-36.18
**Steps:**
1. Login as Staff Two
2. Navigate to /patient-management
3. Verify only "Import Patients" tab visible (NO Reassign tab)
4. Upload file, verify physician dropdown shows assigned physicians only

**Expected:**
- Only Import tab visible (Reassign tab hidden)
- Import physician dropdown: only assigned physicians
- Cannot import for non-assigned physician
- Must select physician before "Preview Import" enabled

### TC-37.11: STAFF — Admin Page Blocked
**Automation:** Automated - `role-access-control.cy.ts: "STAFF Cannot Access Admin"`
**Steps:**
1. Login as Staff One
2. Check navigation bar
3. Try to navigate to /admin directly

**Expected:**
- No "Admin" link in navigation
- Navigating to /admin redirects to /
- API calls to /api/admin/* return 403

### TC-37.12: ADMIN+PHYSICIAN — Patient Grid (ADMIN Behavior)
**Automation:** Automated - `Header.test.tsx` (4 ADMIN+PHYSICIAN tests), `data.routes.test.ts` (3 dual-role tests)
**Steps:**
1. Login as Ko Admin-Phy (`adminphy@gmail.com`, roles: ADMIN + PHYSICIAN)
2. Navigate to patient grid (/)
3. Observe header physician dropdown

**Expected:**
- Physician dropdown visible with ALL physicians + "Unassigned patients" (ADMIN behavior)
- Label: "Viewing provider:" (same as pure ADMIN)
- Can switch between any physician's patients
- Can view unassigned patients
- Full edit capabilities
- Backend: `getPatientOwnerFilter` checks ADMIN first, so ADMIN+PHYSICIAN hits ADMIN branch

### TC-37.13: ADMIN+PHYSICIAN — Patient Management (ADMIN Behavior)
**Automation:** Automated - `PatientManagementPage.test.tsx` (3 ADMIN+PHYSICIAN tests), `SheetSelector.test.tsx` (dual role test)
**Steps:**
1. Login as Ko Admin-Phy
2. Navigate to /patient-management
3. Verify both tabs visible: "Import Patients" and "Reassign Patients"
4. On Import tab: verify physician dropdown shows ALL physicians (not auto-assigned)

**Expected:**
- Both tabs visible (Import + Reassign) — ADMIN behavior
- Import: physician dropdown shows ALL physicians — NOT auto-assigned to self
- Auto-match from tab name may pre-select a suggestion
- Reassign: full access to bulk-assign unassigned patients

### TC-37.14: ADMIN+PHYSICIAN — Admin Page Full Access
**Automation:** Partial - `AdminPage.test.tsx`
**Steps:**
1. Login as Ko Admin-Phy
2. Navigate to /admin
3. Verify full admin access

**Expected:**
- "Admin" link visible in navigation
- Full access to Users tab and Audit Log tab
- Same capabilities as pure ADMIN on admin page

### TC-37.15: Cross-Role Data Isolation — API Level
**Automation:** Automated - `data.routes.test.ts` (12 role-based filtering tests), `users.routes.test.ts`, `auth.test.ts`
**Steps:**
1. PHYSICIAN calls `/api/data?physicianId=other` → should ignore param, return own data
2. STAFF calls `/api/data?physicianId=unassigned` → should 403
3. STAFF calls `/api/data?physicianId=non-assigned-physician` → should 403
4. Non-admin calls `/api/admin/users` → should 403
5. Non-admin calls `/api/admin/audit-log` → should 403

**Expected:**
- PHYSICIAN: API forces ownerId filter regardless of query params
- STAFF: 403 Forbidden for non-assigned physicians and unassigned
- Non-admin: 403 Forbidden for all admin endpoints
- 401 Unauthorized without valid token

### TC-37.16: Role-Based Navigation Visibility
**Automation:** Automated - `Header.test.tsx` (26 tests including 5 nav visibility + 4 dual-role), `role-access-control.cy.ts`
**Steps:**
1. Login as each role, check navigation links
2. Verify physician dropdown presence/absence
3. Verify "Admin" link presence/absence

**Expected:**

| Element | ADMIN | PHYSICIAN | STAFF | ADMIN+PHYSICIAN |
|---------|-------|-----------|-------|-----------------|
| Patient Grid link | Yes | Yes | Yes | Yes |
| Patient Management link | Yes | Yes | Yes | Yes |
| Admin link | Yes | No | No | Yes |
| Physician dropdown | Yes (all + unassigned) | No | Yes (assigned only) | No |
| User menu (name + role badge) | Yes | Yes | Yes | Yes |
| Change Password | Yes | Yes | Yes | Yes |
| Logout | Yes | Yes | Yes | Yes |

### TC-37.17: Role-Based Patient Management Tab Visibility
**Automation:** Automated - `PatientManagementPage.test.tsx` (21 tests including 3 ADMIN+PHYSICIAN dual-role)
**Steps:**
1. Login as each role, navigate to /patient-management
2. Observe visible tabs

**Expected:**

| Tab | ADMIN | PHYSICIAN | STAFF | ADMIN+PHYSICIAN |
|-----|-------|-----------|-------|-----------------|
| Import Patients | Yes | Yes | Yes | Yes |
| Reassign Patients | Yes | No | No | Yes |

---

## Automation Summary

### Coverage by Section

| Section | Total TCs | Automated | Partial | Manual | Coverage |
|---------|-----------|-----------|---------|--------|----------|
| 1. Data Loading | 3 | 2 | 1 | 0 | 83% |
| 2. Cell Editing | 7 | 2 | 2 | 3 | 43% |
| 3. Sorting | 4 | 1 | 0 | 3 | 25% |
| 4. Status Filter | 5 | 5 | 0 | 0 | 100% |
| 5. Row Colors | 16 | 16 | 0 | 0 | 100% |
| 6. Cascading Dropdowns | 11 | 9 | 0 | 2 | 82% |
| 7. Due Date | 3 | 2 | 0 | 1 | 67% |
| 8. Duplicate Detection | 10 | 4 | 1 | 5 | 45% |
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
| 30. Multi-Select Filter | 5 | 5 | 0 | 0 | 100% |
| 31. UX Improvements | 8 | 8 | 0 | 0 | 100% |
| 32. Patient Management Page | 8 | 8 | 0 | 0 | 100% |
| 33. Security: Env Validation | 10 | 10 | 0 | 0 | 100% |
| 34. Security: Account Lockout | 10 | 10 | 0 | 0 | 100% |
| 35. Insurance Group Filter | 10 | 10 | 0 | 0 | 100% |
| 36. Sutter/SIP Import + Universal Sheet Validation | 19 | 19 | 0 | 0 | 100% |
| 37. Cross-Page Role Workflows | 17 | 10 | 4 | 3 | 82% |
| 38. Sutter File-Based Integration | 8 | 8 | 0 | 0 | 100% |
| 39. Sutter Import Visual Tests | 6 | 6 | 0 | 0 | 100% |
| 40. Smart Column Mapping — Backend | 19 | 19 | 0 | 0 | 100% |
| 41. Smart Column Mapping — UI | 11 | 11 | 0 | 0 | 100% |
| 42. Smart Column Mapping — Admin Mgmt | 12 | 12 | 0 | 0 | 100% |
| 43. Depression Screening QM | 7 | 6 | 0 | 1 | 86% |
| 44. Authentication & Authorization | 15 | 15 | 0 | 0 | 100% |
| 45. Real-Time Collaborative Editing | 7 | 7 | 0 | 0 | 100% |
| 46. Insurance Group Filter | 7 | 7 | 0 | 0 | 100% |
| 47. Depression Screening E2E | 5 | 5 | 0 | 0 | 100% |
| 48. Sutter Import Pipeline | 10 | 10 | 0 | 0 | 100% |
| 49. Cell Editing Conflict | 4 | 4 | 0 | 0 | 100% |
| 50. Grid Editing Per Role | 3 | 3 | 0 | 0 | 100% |
| 51. Row Operations (Toolbar) | 2 | 2 | 0 | 0 | 100% |

### Top Priority Gaps

| Priority | Area | Gap | Recommended Framework |
|----------|------|-----|----------------------|
| HIGH | Role Workflows | ADMIN+PHYSICIAN grid behavior not E2E tested (TC-37.12) | Cypress |
| HIGH | Role Workflows | STAFF no-assignments empty state not tested (TC-37.9) | Cypress |
| HIGH | Role Workflows | Cross-role data isolation at API level (TC-37.15) | Jest + Cypress |
| ~~HIGH~~ | ~~Cell Editing~~ | ~~0 automated E2E tests for cell edit workflow~~ | ~~Cypress~~ — **RESOLVED: `cell-editing-conflict.cy.ts`, `grid-editing-roles.cy.ts`** |
| ~~HIGH~~ | ~~Time Interval~~ | ~~0 automated tests~~ | ~~Cypress~~ — **RESOLVED: `row-color-comprehensive.cy.ts` Section 6** |
| HIGH | Duplicate Detection | Edit-creates-duplicate flow not tested | Cypress |
| MEDIUM | Role Workflows | ADMIN grid workflow with physician switching (TC-37.1) | Cypress |
| MEDIUM | Role Workflows | STAFF multi-physician switching (TC-37.8) | Cypress |
| MEDIUM | Sorting | Post-edit sort suppression not tested | Cypress |
| ~~MEDIUM~~ | ~~Row Colors~~ | ~~Overdue logic~~ | ~~Cypress~~ — **RESOLVED: `row-color-comprehensive.cy.ts` Sections 5A-5D** |
| MEDIUM | Tracking Fields | N/A display, free text prompts not tested | Cypress |
| MEDIUM | Authentication | Password change UI flow not E2E tested | Playwright |
| MEDIUM | Admin Dashboard | Audit log viewer not tested | Cypress |
| LOW | Network Error | Error recovery not tested | Playwright |

---

## 38. Sutter Import File-Based Integration Tests

**Purpose:** Integration tests using programmatically-generated Excel fixture files exercising the full Sutter pipeline (parse → map → transform → validate → diff).

**Fixtures:** `test-data/test-sutter-*.xlsx` (8 files, generated by `test-data/create-sutter-fixtures.ts`)

### TC-38.1: Happy Path — All 10 Action Patterns
**Automation:** Automated - `sutter-integration.test.ts` (13 tests)
**Steps:** Process `test-sutter-valid.xlsx` through full pipeline for both physician tabs
**Expected:** All 10 action patterns mapped correctly, AWV+APV merged, HCC notes preserved, Vaccine rows merged, measure details parsed, correct stats, all INSERTs on diff

### TC-38.2: Duplicate Row Merging
**Automation:** Automated - `sutter-integration.test.ts` (6 tests)
**Steps:** Process `test-sutter-duplicates.xlsx` — same patient+measure rows
**Expected:** Duplicates merged (latest statusDate picked, sourceActionText/notes concatenated), different measures NOT merged

### TC-38.3: Edge Cases
**Automation:** Automated - `sutter-integration.test.ts` (10 tests)
**Steps:** Process `test-sutter-edge-cases.xlsx` — special chars, date formats, BP readings, missing fields
**Expected:** Apostrophes/accented chars in names preserved, ISO/M/D/YYYY dates parsed, BP not confused with dates, whitespace trimmed, Excel serials not converted

### TC-38.4: Error Handling
**Automation:** Automated - `sutter-integration.test.ts` (8 tests)
**Steps:** Process `test-sutter-errors.xlsx` — missing name, missing DOB, unknown request type, headers-only tab
**Expected:** Errors reported per field, valid rows still processed, headers-only tab returns empty result

### TC-38.5: Skip Actions
**Automation:** Automated - `sutter-integration.test.ts` (5 tests)
**Steps:** Process `test-sutter-skip-actions.xlsx` — all 11 config skipActions + 2 valid
**Expected:** Only 2 valid mapped rows produced, skip actions appear as unmapped

### TC-38.6: Unmapped Action Aggregation
**Automation:** Automated - `sutter-integration.test.ts` (5 tests)
**Steps:** Process `test-sutter-unmapped.xlsx` — 3 custom unmapped + skip actions + 2 valid
**Expected:** 3 distinct unmapped actions sorted by count desc, 2 valid rows produced, zero errors

### TC-38.7: Merge/Replace Diff
**Automation:** Automated - `sutter-integration.test.ts` (8 tests)
**Steps:** Process `test-sutter-merge.xlsx` with mock existing records
**Expected:** INSERT for new combos, SKIP for matching, UPDATE/BOTH for status changes, HCC notes preserved

### TC-38.8: Measure Details Parsing
**Automation:** Automated - `sutter-integration.test.ts` (12 tests)
**Steps:** Process `test-sutter-measure-details.xlsx` — 12 parsing strategies
**Expected:** Semicolons parsed (date+reading), comma-separated dates (latest wins), embedded dates extracted, text-only as tracking1, Excel serials not converted, ISO dates parsed, BP as tracking1

---

## 39. Sutter Import Visual Tests (Playwright)

**Purpose:** Visual review tests for the Sutter import UI workflow — system selection, sheet/physician selection, preview page, role-based access, responsive layouts, error states.

### TC-39.1: System Selection & Upload
**Automation:** Automated - `sutter-import-visual.spec.ts` (4 tests)
**Steps:** Select Sutter, upload multi-measure file, verify sheet selector and tab count
**Expected:** Sutter/SIP in dropdown, file input visible, sheet selector step appears, "2 physician tabs" displayed

### TC-39.2: Sheet & Physician Selection
**Automation:** Automated - `sutter-import-visual.spec.ts` (4 tests)
**Steps:** Upload file, verify tab filtering, auto-match, manual override, missing physician warning
**Expected:** Skip tabs filtered, suggested label on auto-match, manual override changes selection, warning on empty physician

### TC-39.3: Preview Page
**Automation:** Automated - `sutter-import-visual.spec.ts` (4 tests)
**Steps:** Navigate to preview, verify header, unmapped banner, details expand/collapse, changes table
**Expected:** Sheet name + physician in header, unmapped banner visible, details toggle works, changes table rendered

### TC-39.4: Role-Based Access
**Automation:** Automated - `sutter-import-visual.spec.ts` (4 tests)
**Steps:** Test ADMIN, PHYSICIAN, ADMIN+PHYSICIAN, STAFF roles on import page
**Expected:** ADMIN sees full dropdown, PHYSICIAN auto-assigned, ADMIN+PHY sees dropdown with auto-select, STAFF sees filtered dropdown

### TC-39.5: Responsive Layouts
**Automation:** Automated - `sutter-import-visual.spec.ts` (3 tests)
**Steps:** Resize to 375px, 768px, 1920px after Sutter upload
**Expected:** Layout adapts correctly at each breakpoint (screenshots captured)

### TC-39.6: Error States
**Automation:** Automated - `sutter-import-visual.spec.ts` (3 tests)
**Steps:** Test no valid tabs, empty tab, missing physician
**Expected:** Appropriate error messages and warnings displayed

---

## 40. Smart Column Mapping — Fuzzy Matching & Conflict Detection (Backend)

**Requirement Spec:** [`.claude/specs/smart-column-mapping/requirements.md`](specs/smart-column-mapping/requirements.md)

### TC-40.1: Header Normalization
**Automation:** Automated - `fuzzyMatcher.test.ts` (17 tests)
**Steps:** normalizeHeader() trims, lowercases, strips suffixes (E, Q1, Q2), collapses spaces, expands abbreviations (BP, DOB, IMM, RX, TX, AWV, MGMT, etc.)
**Expected:** All transformations applied correctly, idempotent

### TC-40.2: Jaro-Winkler Similarity
**Automation:** Automated - `fuzzyMatcher.test.ts` (6 tests)
**Steps:** Score identical, empty, different, typo, and partial-match strings
**Expected:** Identical=1.0, empty=0.0, prefix bonus applied, correct range [0,1]

### TC-40.3: Jaccard Token Similarity
**Automation:** Automated - `fuzzyMatcher.test.ts` (7 tests)
**Steps:** Score token overlap between header pairs
**Expected:** Identical=1.0, no overlap=0.0, rearranged tokens=1.0, duplicates handled

### TC-40.4: Composite Score (60/40 Weighting)
**Automation:** Automated - `fuzzyMatcher.test.ts` (7 tests)
**Steps:** compositeScore() combines 60% Jaro-Winkler + 40% Jaccard token similarity
**Expected:** Correct weighting, normalization applied before scoring

### TC-40.5: Fuzzy Match Function
**Automation:** Automated - `fuzzyMatcher.test.ts` (13 tests)
**Steps:** fuzzyMatch() returns top candidates above threshold, deduplicates, normalizes
**Expected:** Threshold enforcement, top-3 results, abbreviation/suffix matching

### TC-40.6: Abbreviation Expansion Coverage
**Automation:** Automated - `fuzzyMatcher.test.ts` (8 tests)
**Steps:** Test all abbreviation expansions (DOB→date of birth, PT→patient, BP→blood pressure, etc.)
**Expected:** All abbreviations expanded correctly, trailing punctuation stripped

### TC-40.7: Exact Match Detection (UC1)
**Automation:** Automated - `conflictDetector.test.ts` (4 tests)
**Steps:** File headers that exactly match config columns (case-insensitive, whitespace-tolerant)
**Expected:** No conflict generated, reordered columns accepted

### TC-40.8: Renamed Column Detection (UC2)
**Automation:** Automated - `conflictDetector.test.ts` (3 tests)
**Steps:** File header fuzzy-matches config column at >= 80% similarity
**Expected:** CHANGED conflict with WARNING severity, score in message, real fuzzy scoring

### TC-40.9: Low Similarity / Unrecognized Column (UC3-4)
**Automation:** Automated - `conflictDetector.test.ts` (3 tests)
**Steps:** File header does not match any config column above threshold
**Expected:** NEW conflict with INFO severity, broader suggestions included

### TC-40.10: Missing Measure Column (UC5)
**Automation:** Automated - `conflictDetector.test.ts` (2 tests)
**Steps:** Config measure column not found in file headers
**Expected:** MISSING conflict with WARNING severity, measure info in message

### TC-40.11: Missing Required Patient Column (UC6)
**Automation:** Automated - `conflictDetector.test.ts` (5 tests)
**Steps:** Required patient columns (memberName, memberDob) not in file headers
**Expected:** MISSING conflict with BLOCKING severity; optional columns not BLOCKING

### TC-40.12: Required Patient Column Renamed (UC7)
**Automation:** Automated - `conflictDetector.test.ts` (2 tests)
**Steps:** Required patient column fuzzy-matches but is renamed
**Expected:** CHANGED conflict with BLOCKING severity for memberName and memberDob

### TC-40.13: Duplicate Headers (UC8, UC14)
**Automation:** Automated - `conflictDetector.test.ts` (6 tests)
**Steps:** Two file headers match same config column, or exact duplicate headers in file
**Expected:** DUPLICATE conflict with BLOCKING severity, both headers reported

### TC-40.14: Ambiguous Match (UC9)
**Automation:** Automated - `conflictDetector.test.ts` (2 tests)
**Steps:** File header fuzzy-matches multiple config columns equally
**Expected:** AMBIGUOUS conflict with BLOCKING severity, suggestions included

### TC-40.15: Suffix Normalization (UC12)
**Automation:** Automated - `conflictDetector.test.ts` (5 tests)
**Steps:** Headers with E, Q1, Q2 suffixes match base column names
**Expected:** Suffix stripped before matching, Q1+Q2 detected as duplicates

### TC-40.16: Wrong File Detection (UC13)
**Automation:** Automated - `conflictDetector.test.ts` (4 tests)
**Steps:** File with zero or <10% header matches
**Expected:** isWrongFile=true, count displayed, threshold enforcement

### TC-40.17: Conflict Report Metadata
**Automation:** Automated - `conflictDetector.test.ts` (11 tests)
**Steps:** Report includes summary counts, hasBlockingConflicts, unique IDs, systemId
**Expected:** Correct counts by type, blocking flag, sequential IDs, null resolutions

### TC-40.18: Edge Cases & Fail-Open
**Automation:** Automated - `conflictDetector.test.ts` (8 tests)
**Steps:** Empty headers, empty config, inactive columns, per-header error recovery
**Expected:** Graceful handling, inactive columns ignored, errors classified as NEW (fail-open)

### TC-40.19: Suggestions in Conflicts
**Automation:** Automated - `conflictDetector.test.ts` (4 tests)
**Steps:** Fuzzy suggestions include measure info, limited to top 3, NEW columns get broader suggestions
**Expected:** Correct suggestion structure, measure info populated, MISSING has empty suggestions

---

## 41. Smart Column Mapping — Conflict Resolution UI (Frontend)

**Requirement Spec:** [`.claude/specs/smart-column-mapping/requirements.md`](specs/smart-column-mapping/requirements.md)

### TC-41.1: Admin Conflict Resolution Form
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (4 tests), `import-conflict-admin.cy.ts` (8 tests)
**Steps:** Admin uploads file with renamed columns → conflict step renders
**Expected:** Dropdown per conflict, color-coded count chips, summary banner, suggestion badges with scores

### TC-41.2: Save Button State Management
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (3 tests), `import-conflict-admin.cy.ts` (1 test)
**Steps:** Resolve 0, some, then all conflicts
**Expected:** Save disabled at 0/N and partial, enabled at N/N

### TC-41.3: Save & Continue API Call
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (2 tests), `import-conflict-resolution.spec.ts` (1 test)
**Steps:** Resolve all conflicts, click Save & Continue
**Expected:** POST with resolution IDs/actions, onResolved called, navigates to preview

### TC-41.4: Cancel Without Saving
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (1 test), `import-conflict-admin.cy.ts` (1 test), `import-conflict-resolution.spec.ts` (1 test)
**Steps:** Click Cancel on conflict resolution step
**Expected:** Returns to file upload, no API call made

### TC-41.5: Non-Admin Conflict Banner
**Automation:** Automated - `ConflictBanner.test.tsx` (18 tests), `import-conflict-nonadmin.cy.ts` (6 tests)
**Steps:** Non-admin (PHYSICIAN/STAFF) uploads file triggering conflicts
**Expected:** Read-only ConflictBanner with role="alert", no dropdowns, no Save button, color-coded badges, Cancel and Copy Details buttons

### TC-41.6: Progress Tracking
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (2 tests), `import-conflict-admin.cy.ts` (2 tests), `import-conflict-resolution.spec.ts` (1 test)
**Steps:** Resolve conflicts one by one
**Expected:** Progress bar and aria-live region update (0→1→N of N)

### TC-41.7: ACCEPT_SUGGESTION Auto-Population
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (1 test)
**Steps:** Select ACCEPT_SUGGESTION from dropdown
**Expected:** targetMeasure or targetPatientField auto-populated from suggestion info

### TC-41.8: Loading and Error States
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (4 tests)
**Steps:** Trigger save, simulate API failure, simulate 409 conflict
**Expected:** "Saving..." shown during call, error message on failure, 409 shows retry message, error cleared on new resolution

### TC-41.9: DUPLICATE and AMBIGUOUS Resolution
**Automation:** Automated - `ConflictResolutionStep.test.tsx` (3 tests)
**Steps:** Resolve DUPLICATE and AMBIGUOUS conflicts via dropdowns
**Expected:** Correct resolution options shown, saves correctly

### TC-41.10: Role-Based Import Flow (All Roles)
**Automation:** Automated - `import-all-roles.spec.ts` (13 tests)
**Steps:** ADMIN, PHYSICIAN, STAFF, and ADMIN+PHYSICIAN upload valid and conflict files for Hill and Sutter systems
**Expected:** Admin sees resolution form, non-admin sees banner, all roles can reach preview with valid files, dual-role users get admin form

### TC-41.11: Full Conflict Resolution E2E Flow
**Automation:** Automated - `import-conflict-resolution.spec.ts` (6 tests)
**Steps:** Admin uploads Hill file with renamed columns, views conflicts with fuzzy suggestions, resolves all, saves, navigates to preview
**Expected:** Conflict step appears, suggestions shown with scores, Save enables after all resolved, navigation to preview on save, Cancel returns to upload

---

## 42. Smart Column Mapping — Admin Mapping Management

**Requirement Spec:** [`.claude/specs/smart-column-mapping/requirements.md`](specs/smart-column-mapping/requirements.md)

### TC-42.1: System Selector and Config Loading
**Automation:** Automated - `MappingManagementPage.test.tsx` (3 tests), `smart-column-mapping.spec.ts` (2 tests), `mapping-management.cy.ts` (2 tests)
**Steps:** Navigate to /admin/import-mapping, select Hill or Sutter system
**Expected:** System selector populated, switching triggers new GET, correct config loaded

### TC-42.2: Hill System — Column Tables
**Automation:** Automated - `MappingManagementPage.test.tsx` (3 tests), `smart-column-mapping.spec.ts` (1 test), `mapping-management.cy.ts` (1 test)
**Steps:** Select Hill system, view mapping tables
**Expected:** Patient and Measure Column Mappings sections visible, Action Pattern section hidden (wide-format)

### TC-42.3: Sutter System — Action Pattern Table
**Automation:** Automated - `MappingManagementPage.test.tsx` (1 test), `smart-column-mapping.spec.ts` (1 test)
**Steps:** Select Sutter system
**Expected:** Action Pattern Configuration section visible (long-format)

### TC-42.4: Edit Mode
**Automation:** Automated - `MappingManagementPage.test.tsx` (2 tests), `smart-column-mapping.spec.ts` (1 test), `mapping-management.cy.ts` (1 test)
**Steps:** Click "Edit Mappings", make changes, click "Done Editing"
**Expected:** Edit mode toggles, table becomes editable, returns to view mode

### TC-42.5: Add Mapping
**Automation:** Automated - `mapping-management.cy.ts` (2 tests), `smart-column-mapping.spec.ts` (1 test)
**Steps:** Click "Add Mapping", fill source column, save
**Expected:** Inline form opens, new mapping saved and displayed in table

### TC-42.6: Reset to Defaults
**Automation:** Automated - `MappingManagementPage.test.tsx` (2 tests), `smart-column-mapping.spec.ts` (1 test)
**Steps:** Click "Reset to Defaults", cancel, then confirm
**Expected:** Confirmation modal shown, cancel dismisses, confirm deletes overrides, "Using Default Configuration" banner appears

### TC-42.7: Default Configuration Banner
**Automation:** Automated - `MappingManagementPage.test.tsx` (2 tests), `mapping-management.cy.ts` (1 test)
**Steps:** View system with no DB overrides
**Expected:** "Using Default Configuration" banner visible, Reset button hidden

### TC-42.8: Last Modified Metadata
**Automation:** Automated - `MappingManagementPage.test.tsx` (2 tests), `smart-column-mapping.spec.ts` (1 test), `mapping-management.cy.ts` (1 test)
**Steps:** View system config with overrides
**Expected:** "Last modified: <date> by <admin>" displayed; "Never modified" when null

### TC-42.9: Non-Admin Access Control
**Automation:** Automated - `MappingManagementPage.test.tsx` (1 test), `smart-column-mapping.spec.ts` (1 test)
**Steps:** Non-admin navigates to /admin/import-mapping
**Expected:** Admin content not visible, ProtectedRoute blocks access

### TC-42.10: System Switching Loads Different Configs
**Automation:** Automated - `smart-column-mapping.spec.ts` (1 test), `mapping-management.cy.ts` (1 test)
**Steps:** Switch Hill → Sutter → Hill
**Expected:** Action pattern appears/disappears, correct config for each system

### TC-42.11: Ignored Columns Section
**Automation:** Automated - `mapping-management.cy.ts` (1 test)
**Steps:** View system with skip columns configured
**Expected:** "Ignored Columns" section visible

### TC-42.12: Loading and Error States
**Automation:** Automated - `MappingManagementPage.test.tsx` (2 tests)
**Steps:** Trigger loading and API failure states
**Expected:** Spinner during load, error message on failure

---

## 43. Depression Screening Quality Measure

**Requirement Spec:** [`.claude/specs/depression-screening/`](specs/depression-screening/)

### TC-43.1: Depression Screening in Quality Measure Dropdown
**Automation:** Automated - `dropdownConfig.test.ts` (5 tests)
**Steps:** Check Screening request type quality measure options
**Expected:** Depression Screening is the 4th Screening measure (4 total); 7 statuses; "Not Addressed" first; no Tracking #1 options

### TC-43.2: Depression Screening Status Colors
**Automation:** Automated - `statusColors.test.ts` (10 tests)
**Steps:** Verify row color for each Depression Screening status
**Expected:** Not Addressed = white, Called to schedule = blue, Visit scheduled = yellow, Screening complete = green, Screening unnecessary = gray, Patient declined = purple, No longer applicable = gray

### TC-43.3: Depression Screening Overdue Behavior
**Automation:** Automated - `statusColors.test.ts` (4 tests)
**Steps:** Set statusDate past due for each status
**Expected:** Called to schedule (7-day timer) and Visit scheduled (1-day timer) turn red when overdue; Screening unnecessary and Patient declined do NOT turn red (terminal statuses)

### TC-43.4: Depression Screening Filter Bar Integration
**Automation:** Automated - `StatusFilterBar.test.tsx` (1 test)
**Steps:** Check quality measure dropdown options count
**Expected:** 15 options total (14 measures + "All Measures"); Depression Screening present

### TC-43.5: Hill Import — Depression Screening Columns
**Automation:** Automated - `test-hill-valid.csv.json` expected output validation
**Steps:** Import Hill CSV with Depression Screening Q1/Q2 columns
**Expected:** 16 mapped columns (was 14), 6 measure types (was 5), 50 output rows (was 42); each patient gets Depression Screening row based on compliant/non-compliant Q2

### TC-43.6: Sutter Import — Depression Screening Action Pattern
**Automation:** Automated - `sutter-integration.test.ts` (3 tests), `actionMapper.test.ts` (1 test)
**Steps:** Import Sutter file with "Depression Screening", "PHQ-9", "Screen for depression" action text
**Expected:** 11 action patterns compiled (was 10); All 3 variants match Depression Screening measure; duplicate rows for same patient merged

### TC-43.7: Depression Screening Seed Data
**Automation:** Manual - requires database seed verification
**Steps:** Run `npx tsx prisma/seed.ts` on fresh database
**Expected:** Depression Screening quality measure created with 7 statuses (correct datePrompts, baseDueDays, sortOrder); 6 patients (Harper through Ward); 7 patient measures including overdue scenario (Reed with 14-day-old "Called to schedule")

---

## 44. Authentication & Authorization

### TC-44.1: Login Form Renders Correctly
- **Precondition:** Navigate to /login
- **Steps:** Verify login page elements visible (title, email input, password input, sign-in button, admin contact message)
- **Expected:** All form elements render with correct placeholders and labels
- **Status:** Automated (Vitest - `LoginPage.test.tsx`, Playwright - `auth.spec.ts`)

### TC-44.2: Login with Valid Credentials
- **Precondition:** Seeded user exists (phy1@gmail.com / welcome100)
- **Steps:** Enter valid email and password, click Sign In
- **Expected:** JWT token stored in localStorage, user redirected to main page, grid visible
- **Status:** Automated (Vitest - `authStore.test.ts`, Playwright - `auth.spec.ts`)

### TC-44.3: Login with Invalid Credentials
- **Precondition:** Navigate to /login
- **Steps:** Enter invalid email/password combinations (unknown user, wrong password, deactivated account)
- **Expected:** 401 returned with INVALID_CREDENTIALS code, error message displayed, no token stored
- **Status:** Automated (Jest - `auth.routes.test.ts`, Vitest - `LoginPage.test.tsx`, Playwright - `auth.spec.ts`)

### TC-44.4: Input Validation (Empty/Invalid Fields)
- **Precondition:** Navigate to /login
- **Steps:** Submit form with empty email, empty password, both empty, or invalid email format
- **Expected:** HTML5 validation prevents submission; backend returns 400 for malformed requests
- **Status:** Automated (Vitest - `LoginPage.test.tsx`, Jest - `auth.routes.test.ts`)

### TC-44.5: Account Lockout After Failed Attempts
- **Precondition:** Active user account
- **Steps:** Submit 5 incorrect passwords for the same account
- **Expected:** Account locked (ACCOUNT_LOCKED code returned), warning shown after 3 failed attempts, ACCOUNT_LOCKED audit log created, lock expires after timeout
- **Status:** Automated (Jest - `auth.routes.test.ts`)

### TC-44.6: Forced Password Change on First Login
- **Precondition:** User has mustChangePassword=true
- **Steps:** Login with valid credentials; POST /api/auth/force-change-password with new password
- **Expected:** Login response includes mustChangePassword=true; password change succeeds; returns 400 if mustChangePassword is false
- **Status:** Automated (Jest - `auth.routes.test.ts`)

### TC-44.7: Password Change (Authenticated User)
- **Precondition:** Authenticated user session
- **Steps:** PUT /api/auth/password with current and new password
- **Expected:** Password changed on valid input; 401 for wrong current password; 400 if new password same as current or too short
- **Status:** Automated (Jest - `auth.routes.test.ts`)

### TC-44.8: Password Reset Flow (Forgot Password)
- **Precondition:** SMTP configured
- **Steps:** POST /api/auth/forgot-password with email; POST /api/auth/reset-password with token and new password
- **Expected:** Forgot-password always returns 200 (security); reset succeeds with valid unexpired token; 400 for invalid/expired/used tokens
- **Status:** Automated (Jest - `auth.routes.test.ts`)

### TC-44.9: JWT Token Handling & Session Persistence
- **Precondition:** Successful login
- **Steps:** Store token in localStorage; call GET /api/auth/me; refresh page; clear token and call /me again
- **Expected:** Token persists across refreshes; checkAuth restores session with valid token; clears state with invalid token; returns user info and assignments for STAFF
- **Status:** Automated (Vitest - `authStore.test.ts`, Playwright - `auth.spec.ts`)

### TC-44.10: Role-Based Access (PHYSICIAN vs STAFF)
- **Precondition:** PHYSICIAN and STAFF users seeded
- **Steps:** Login as PHYSICIAN; login as STAFF
- **Expected:** PHYSICIAN selectedPhysicianId set to own ID; STAFF receives assignments array, defaults to first assignment, restores previous valid selection from localStorage
- **Status:** Automated (Vitest - `authStore.test.ts`, Jest - `auth.routes.test.ts`)

### TC-44.11: Protected Route Redirection
- **Precondition:** No authentication token
- **Steps:** Navigate to / and /admin without logging in
- **Expected:** Redirected to /login page
- **Status:** Automated (Playwright - `auth.spec.ts`)

### TC-44.12: Logout Clears Session
- **Precondition:** Logged-in user
- **Steps:** Click user menu, click Logout
- **Expected:** Auth state cleared (user, token, assignments null), token removed from localStorage, edit locks released, redirected to /login
- **Status:** Automated (Vitest - `authStore.test.ts`, Jest - `auth.routes.test.ts`, Playwright - `auth.spec.ts`)

### TC-44.13: Password Visibility Toggle
- **Precondition:** Navigate to /login
- **Steps:** Click password visibility toggle button
- **Expected:** Password input toggles between type="password" and type="text"; toggles back on second click
- **Status:** Automated (Vitest - `LoginPage.test.tsx`, Playwright - `auth.spec.ts`)

### TC-44.14: Loading State During Login
- **Precondition:** Navigate to /login
- **Steps:** Submit valid credentials, observe UI during API call
- **Expected:** Button text changes to "Signing in...", email/password inputs disabled during loading
- **Status:** Automated (Vitest - `LoginPage.test.tsx`, Playwright - `auth.spec.ts`)

### TC-44.15: Failed Login Audit Logging
- **Precondition:** Backend running with audit logging
- **Steps:** Attempt login with invalid credentials (user not found, wrong password, deactivated account)
- **Expected:** LOGIN_FAILED audit log created with userEmail, userId (if found), reason, and IP address; password never logged; audit log failure does not block 401 response
- **Status:** Automated (Jest - `auth.routes.test.ts`)

---

## 45. Real-Time Collaborative Editing

### TC-45.1: Socket Room & Presence Management
- **Precondition:** Socket.IO server initialized
- **Steps:** Add user to room, add multiple users, add same user with two sockets
- **Expected:** Room name formatted as "physician:{id}"; multiple users tracked; same user deduplicated across sockets; empty array for non-existent room
- **Status:** Automated (Jest - `socketManager.test.ts`)

### TC-45.2: User Disconnect Cleanup
- **Precondition:** User connected to one or more rooms
- **Steps:** Call removeUserFromRoom and removeUserFromAllRooms
- **Expected:** User removed from specific room; removeUserFromAllRooms clears all rooms and returns affected room list; room map cleaned up when last user leaves
- **Status:** Automated (Jest - `socketManager.test.ts`)

### TC-45.3: Active Edit Tracking
- **Precondition:** Users connected to rooms
- **Steps:** Add active edit (rowId, field, userName, socketId); add second edit on same row+field; add edits on different row+field
- **Expected:** Edit stored with all metadata; same row+field replaced (latest wins); multiple edits tracked per room; empty array for room with no edits
- **Status:** Automated (Jest - `socketManager.test.ts`)

### TC-45.4: Edit Cleanup on Disconnect
- **Precondition:** Multiple active edits across rooms for a socket
- **Steps:** Call clearEditsForSocket for disconnecting socket
- **Expected:** All edits for that socket cleared across all rooms; returns list of cleared edits (room, rowId, field); other users' edits remain untouched
- **Status:** Automated (Jest - `socketManager.test.ts`)

### TC-45.5: Remote Cell Update in Grid
- **Precondition:** Grid loaded with data, user scrolled down
- **Steps:** Simulate remote row:updated event
- **Expected:** Grid accepts external data changes; scroll position preserved after remote update; row selection maintained
- **Status:** Automated (Cypress - `parallel-editing-grid-updates.cy.ts`)

### TC-45.6: Remote Row Operations (Add/Delete)
- **Precondition:** Grid loaded with data
- **Steps:** Add Row via button and modal; Delete Row via selection and button
- **Expected:** Row count increases after add; row count decreases after delete; row selection state transitions correctly between rows
- **Status:** Automated (Cypress - `parallel-editing-row-operations.cy.ts`)

### TC-45.7: Edit Indicator CSS Styling
- **Precondition:** Grid loaded, CSS stylesheets rendered
- **Steps:** Verify cell-remote-editing CSS class exists; apply class to a cell; remove class
- **Expected:** CSS class defined in stylesheets; dashed orange border applied when class present; cellFlash animation defined; indicator removed when class removed
- **Status:** Automated (Cypress - `parallel-editing-edit-indicators.cy.ts`)

---

## 46. Insurance Group Filter

### TC-46.1: Insurance Group Dropdown Renders
- **Precondition:** Logged in as admin
- **Steps:** Check StatusFilterBar for insurance group dropdown
- **Expected:** Dropdown visible with aria-label "Filter by insurance group"; renders in both Vitest component tests and Cypress E2E
- **Status:** Automated (Vitest - `StatusFilterBar.test.tsx`, Cypress - `insurance-group-filter.cy.ts`)

### TC-46.2: Default Selection is "Hill"
- **Precondition:** Logged in as admin, grid loaded
- **Steps:** Check dropdown value on page load
- **Expected:** Dropdown defaults to "hill" value; patients displayed in grid
- **Status:** Automated (Cypress - `insurance-group-filter.cy.ts`, Vitest - `StatusFilterBar.test.tsx`)

### TC-46.3: Option Order (All First, No Insurance Last)
- **Precondition:** Insurance group dropdown visible
- **Steps:** Inspect option list order
- **Expected:** "All" is first option (value="all"); "No Insurance" is last option (value="none"); system groups (Hill, etc.) appear between
- **Status:** Automated (Vitest - `StatusFilterBar.test.tsx`, Cypress - `insurance-group-filter.cy.ts`)

### TC-46.4: Filtering Updates Grid
- **Precondition:** Grid loaded with default "Hill" filter
- **Steps:** Select "All" to show all patients; select "No Insurance" to filter
- **Expected:** "All" shows all patients (row count >= Hill count); "No Insurance" may show zero rows if all patients assigned; grid updates on each selection
- **Status:** Automated (Cypress - `insurance-group-filter.cy.ts`)

### TC-46.5: Active Filter Visual Indicator (Ring)
- **Precondition:** Insurance group dropdown visible
- **Steps:** Check CSS classes when filter is "hill" vs "all"
- **Expected:** Non-"All" selection shows ring-2 ring-blue-400 classes; "All" selection shows border-gray-300 without ring
- **Status:** Automated (Vitest - `StatusFilterBar.test.tsx`, Cypress - `insurance-group-filter.cy.ts`)

### TC-46.6: Combines with Quality Measure Filter
- **Precondition:** Both insurance group and quality measure dropdowns visible
- **Steps:** Set insurance group to "Hill", then change quality measure filter
- **Expected:** Insurance group persists when quality measure changes; both filters show active ring indicators simultaneously
- **Status:** Automated (Cypress - `insurance-group-filter.cy.ts`)

### TC-46.7: Insurance Group Change Callback
- **Precondition:** StatusFilterBar rendered with onInsuranceGroupChange handler
- **Steps:** Change dropdown selection
- **Expected:** onInsuranceGroupChange called with new value (e.g., "none")
- **Status:** Automated (Vitest - `StatusFilterBar.test.tsx`)

---

## 47. Depression Screening E2E

### TC-47.1: Screening Request Type Shows 4 Quality Measures Including Depression Screening
- **Precondition:** Logged in as admin, grid loaded
- **Steps:** Select "Screening" request type; open Quality Measure dropdown
- **Expected:** 4 options: Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening, Depression Screening
- **Status:** Automated (Cypress - `cascading-dropdowns.cy.ts`, Vitest - `dropdownConfig.test.ts`)

### TC-47.2: Depression Screening Has 7 Status Options
- **Precondition:** Row set to Screening / Depression Screening
- **Steps:** Open Measure Status dropdown
- **Expected:** 7 options: Not Addressed, Called to schedule, Visit scheduled, Screening complete, Screening unnecessary, Patient declined, No longer applicable
- **Status:** Automated (Cypress - `cascading-dropdowns.cy.ts`, Vitest - `dropdownConfig.test.ts`)

### TC-47.3: Depression Screening Status Row Colors
- **Precondition:** Row set to Depression Screening
- **Steps:** Select each status and verify row color class
- **Expected:** Screening complete = green, Called to schedule = blue, Visit scheduled = yellow, Patient declined = purple, Screening unnecessary = gray, No longer applicable = gray
- **Status:** Automated (Cypress - `cascading-dropdowns.cy.ts`, Vitest - `statusColors.test.ts`)

### TC-47.4: No Tracking #1 Options for Depression Screening
- **Precondition:** Row set to Depression Screening with a status selected
- **Steps:** Check Tracking #1 cell content
- **Expected:** Cell shows empty or "N/A"; no dropdown prompt; getTracking1OptionsForStatus returns null for all 7 Depression Screening statuses
- **Status:** Automated (Cypress - `cascading-dropdowns.cy.ts`, Vitest - `dropdownConfig.test.ts`)

### TC-47.5: Depression Screening Overdue Timers
- **Precondition:** Depression Screening row with statusDate set in the past
- **Steps:** Set "Called to schedule" with statusDate 8+ days ago; set "Visit scheduled" with statusDate 2+ days ago
- **Expected:** Called to schedule turns red after 7 days; Visit scheduled turns red after 1 day; Screening unnecessary and Patient declined do NOT turn red (terminal statuses)
- **Status:** Automated (Vitest - `statusColors.test.ts`)

---

## 48. Sutter Import Pipeline

### TC-48.1: Sheet Discovery (Physician Tabs vs Skip Tabs)
- **Precondition:** test-sutter-valid.xlsx fixture loaded
- **Steps:** Call getSheetNames to list all tabs
- **Expected:** 4 sheets discovered: Physician One, Physician Two (physician tabs), CAR Report, Summary_NY (skip tabs)
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.2: Action Pattern Matching (11 Patterns)
- **Precondition:** Sutter config loaded with actionMapping
- **Steps:** Build action mapper cache; test each pattern (FOBT, HTN BP, DM urine albumin, DM HbA1c, DM eye exam, Pap/HPV, Mammogram, Chlamydia, RAS Antagonists, Vaccine, Depression Screening)
- **Expected:** 11 compiled patterns; each action text maps to correct requestType, qualityMeasure, and measureStatus; case-insensitive; whitespace/line-break normalized
- **Status:** Automated (Jest - `actionMapper.test.ts`)

### TC-48.3: AWV+APV Merge into Single AWV Row
- **Precondition:** Sutter file with AWV and APV rows for same patient (Anderson, Jane)
- **Steps:** Run full pipeline (parse, map, transform)
- **Expected:** 2 input rows (AWV + APV) merged into 1 output row with requestType=AWV, qualityMeasure=Annual Wellness Visit
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.4: Duplicate Patient+Measure Merge (Latest Date Wins)
- **Precondition:** test-sutter-duplicates.xlsx with duplicate FOBT rows for Patel
- **Steps:** Run pipeline and check merged output
- **Expected:** Duplicate rows merged to 1; latest statusDate kept (2025-06-15 over 2025-01-10); sourceActionText concatenated; different measures for same patient NOT merged
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.5: MeasureDetails Date Extraction
- **Precondition:** Sutter file with HbA1c measure details for Clark, Maria
- **Steps:** Run pipeline and check date/tracking1 fields
- **Expected:** statusDate parsed as 2025-01-10; tracking1 set to 7.5; comma-separated dates resolved (latest date wins)
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.6: Depression Screening Action Variants (3 Regex Patterns)
- **Precondition:** Sutter file with "Depression Screening", "PHQ-9", "Screen for depression" action texts
- **Steps:** Run pipeline; verify Depression Screening rows created and duplicates merged
- **Expected:** All 3 variants match Depression Screening measure; duplicate rows for same patient merged into 1; 11 total action patterns (was 10)
- **Status:** Automated (Jest - `sutter-integration.test.ts`, `actionMapper.test.ts`)

### TC-48.7: Skip Actions Filtered Out
- **Precondition:** Sutter config skipActions list; test-sutter-skip-actions.xlsx fixture
- **Steps:** Match each skipAction text against action mapper
- **Expected:** All skip actions return null (no regex match); only valid actions produce output rows
- **Status:** Automated (Jest - `actionMapper.test.ts`, `sutter-integration.test.ts`)

### TC-48.8: Multi-Tab Import (Select Physician Tab)
- **Precondition:** test-sutter-valid.xlsx with 2 physician tabs
- **Steps:** Process Physician One and Physician Two tabs separately
- **Expected:** Physician One: 21 input rows, 18 output rows, 0 errors; Physician Two: 9 input rows, 0 errors, HCC row for Lewis with correct notes
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.9: Unmapped Action Detection
- **Precondition:** Sutter file with action texts that match no pattern
- **Steps:** Run pipeline and check unmappedActions array
- **Expected:** Valid file (test-sutter-valid.xlsx) has 0 unmapped actions; unmapped file aggregates unrecognized texts for admin review
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

### TC-48.10: Diff Calculation Against Empty Database
- **Precondition:** Pipeline output for Physician One
- **Steps:** Call calculateMergeDiff with empty existing records map
- **Expected:** All rows produce INSERT actions; insert count equals total output rows
- **Status:** Automated (Jest - `sutter-integration.test.ts`)

---

## 49. Cell Editing Conflict (409 VERSION_CONFLICT)

### TC-49.1: Conflict Modal Triggered on 409
- **Precondition:** Grid loaded, cell editing active
- **Steps:** Edit a cell; API returns 409 VERSION_CONFLICT with server row data
- **Expected:** Conflict modal appears with "Edit Conflict" heading; shows "Your value" vs "Server value" comparison
- **Status:** Automated (Cypress - `cell-editing-conflict.cy.ts`)

### TC-49.2: Keep Mine Resolution
- **Precondition:** Conflict modal displayed
- **Steps:** Click "Keep Mine" button
- **Expected:** Modal closes; cell retains user's edit value; grid row updated with user's data
- **Status:** Automated (Cypress - `cell-editing-conflict.cy.ts`)

### TC-49.3: Keep Theirs Resolution
- **Precondition:** Conflict modal displayed
- **Steps:** Click "Keep Theirs" button
- **Expected:** Modal closes; cell reverts to server value; grid row updated with server data (including fresh updatedAt)
- **Status:** Automated (Cypress - `cell-editing-conflict.cy.ts`)

### TC-49.4: Cancel Conflict Resolution
- **Precondition:** Conflict modal displayed
- **Steps:** Click "Cancel" button
- **Expected:** Modal closes; cell reverts to original value before edit; grid row restored with server data (prevents stale updatedAt)
- **Status:** Automated (Cypress - `cell-editing-conflict.cy.ts`)

---

## 50. Grid Editing Per Role

### TC-50.1: Admin Can Edit Dropdown and Text Columns
- **Precondition:** Logged in as Admin (ko037291@gmail.com)
- **Steps:** Add test row; edit requestType dropdown; edit notes text field
- **Expected:** Both dropdown and text edits persist; no permission errors
- **Status:** Automated (Cypress - `grid-editing-roles.cy.ts`)

### TC-50.2: Physician Can Edit Dropdown and Text Columns
- **Precondition:** Logged in as Physician (phy1@gmail.com)
- **Steps:** Edit requestType dropdown; edit notes text field
- **Expected:** Both edits persist; physician sees only own patients
- **Status:** Automated (Cypress - `grid-editing-roles.cy.ts`)

### TC-50.3: Staff Can Edit Dropdown and Text Columns
- **Precondition:** Logged in as Staff (staff1@gmail.com)
- **Steps:** Edit requestType dropdown; edit notes text field on assigned physician's patients
- **Expected:** Both edits persist; staff sees only assigned physician's patients
- **Status:** Automated (Cypress - `grid-editing-roles.cy.ts`)

---

## 51. Row Operations (Add/Delete via Toolbar)

### TC-51.1: Add Row Button Opens Modal and Creates Row
- **Precondition:** Logged in as Admin, grid loaded
- **Steps:** Click "Add Row" button; fill Last Name and First Name; click Add
- **Expected:** New row appears in grid with entered name; row findable by member name search
- **Status:** Automated (Cypress - `row-operations.cy.ts`)

### TC-51.2: Delete Row Removes Selected Row
- **Precondition:** Row selected in grid
- **Steps:** Click "Delete Row" button; confirm deletion
- **Expected:** Row removed from grid; row count decreases; row no longer findable by name
- **Status:** Automated (Cypress - `row-operations.cy.ts`)

---

## 52. Production Deployment — Seed on Deploy

### TC-52.1: Production Seed Skips Dev Data
- **Precondition:** `NODE_ENV=production`
- **Steps:** Run `npx prisma db seed` with NODE_ENV=production
- **Expected:** Config data (quality measures, statuses, baseDueDays) is seeded; dev users and sample patients are NOT created; console shows "Production mode: skipping dev users and sample data"
- **Status:** Manual — requires production environment verification

### TC-52.2: Render Deploy Runs Seed Automatically
- **Precondition:** Push to main triggers Render deploy
- **Steps:** Verify Render startCommand includes `npm run seed`
- **Expected:** `render.yaml` startCommand is `npx prisma migrate deploy && npm run seed && npm start`; MeasureStatus.baseDueDays is populated after deploy; row colors reflect correct overdue state
- **Status:** Manual — verified via Render deploy logs and post-deploy health check

### TC-52.3: baseDueDays Populated After Seed
- **Precondition:** Fresh database after migration
- **Steps:** Run seed; query `SELECT name, "baseDueDays" FROM "MeasureStatus" WHERE "baseDueDays" IS NOT NULL`
- **Expected:** All statuses that should trigger due-date calculation have non-NULL baseDueDays values; `calculateDueDate()` returns valid dates for these statuses
- **Status:** Manual — requires database query verification

---

## Last Updated

February 26, 2026 - Added Section 52: Production Deployment — Seed on Deploy (TC-52.1 to TC-52.3). 3 manual test cases for production seed guard, Render auto-seed, and baseDueDays verification. Root cause fix for row colors not turning red on production (NULL baseDueDays from missing seed). Test counts unchanged: 1,419 Jest + 1,211 Vitest.
February 26, 2026 - Added TC-7.4 (boundary month patterns & priority ordering, 6 tests) and TC-7.5 (baseDueDays edge cases, 4 tests). Updated TC-7.1 test count from 20 to 29. Test counts: 1,428 Jest + 1,211 Vitest.

February 26, 2026 - Added sections 49 (Cell Editing Conflict, 4 TCs), 50 (Grid Editing Per Role, 3 TCs), 51 (Row Operations, 2 TCs). Added TC-8.7/8.8/8.9 for duplicate detection edge cases. Updated TC-8.6 automation status. New Cypress E2E files: cell-editing-conflict.cy.ts, grid-editing-roles.cy.ts, row-operations.cy.ts. New Jest tests: +5 duplicateDetector edge cases. New Vitest tests: +3 Toolbar edge cases. Test counts: 1,419 Jest + 1,211 Vitest.
February 26, 2026 - Added `row-color-comprehensive.cy.ts` (179 Cypress tests): comprehensive row color E2E covering all 14 quality measures × all statuses (93 tests), tracking #1 dropdown with all options + date→overdue (52 tests), HgbA1c T1 text + T2 dropdown + date (13 tests), BP T1 dropdown + T2 text + date (5 tests), date entry→overdue/today/terminal/no-dueDate (23 tests), time interval editing (2 tests), color transitions (2 tests). Updated Section 5 (Row Colors) from 7 TCs / 50% automated to 16 TCs / 100% automated. Resolved HIGH priority gap (Time Interval) and MEDIUM priority gap (Row Colors overdue logic). Fixed edit conflict bug: "Keep Theirs" and "Cancel" now restore serverRow including fresh updatedAt to prevent cascading 409 errors.
February 25, 2026 - Release 4.12.1: Updated test counts (1,415 Jest + 1,202 Vitest). E2E test quality improvements: waitForTimeout elimination across 5 Playwright files, fireEvent→userEvent migration across 25 Vitest files, accessibility labels for form elements.
February 23, 2026 - Added Sections 44-48: Authentication & Authorization (15 TCs), Real-Time Collaborative Editing (7 TCs), Insurance Group Filter (7 TCs), Depression Screening E2E (5 TCs), Sutter Import Pipeline (10 TCs). 44 test cases, 100% automated. Covers: Jest (auth.routes, socketManager, sutter-integration, actionMapper), Vitest (LoginPage, authStore, dropdownConfig, statusColors, StatusFilterBar), Playwright (auth.spec), Cypress (parallel-editing, insurance-group-filter, cascading-dropdowns).
February 23, 2026 - Added Section 43: Depression Screening Quality Measure (TC-43.1 to TC-43.7). 7 test cases, 86% automated (6 automated, 1 manual). +14 Vitest tests (dropdownConfig, statusColors, StatusFilterBar). Updated backend integration tests. Total: 1,387 Jest + 1,152 Vitest + 130 Playwright + 369 Cypress.
February 23, 2026 - Added Sections 40-42: Smart Column Mapping (TC-40.1 to TC-42.12). 40 test cases, 100% automated. Backend: 56 Jest (fuzzyMatcher) + 64 Jest (conflictDetector). Frontend: 27 Vitest (ConflictResolutionStep) + 17 Vitest (ConflictBanner) + 18 Vitest (MappingManagementPage). E2E: 6 Playwright (import-conflict-resolution) + 8 Playwright (smart-column-mapping) + 13 Playwright (import-all-roles) + 8 Cypress (import-conflict-admin) + 6 Cypress (import-conflict-nonadmin) + 9 Cypress (mapping-management). Total: 1,387 Jest + 1,138 Vitest + 130 Playwright + 369 Cypress.
February 18, 2026 - Sutter duplicate merging, measureDetails parsing improvements, "Not Addressed" status override, dev seed users, Jest config fix. Total: 1,165 Jest + 1,025 Vitest.
February 18, 2026 - Added Section 38: Sutter File-Based Integration Tests (TC-38.1 to TC-38.8, 67 Jest tests using 8 fixture files). Added Section 39: Sutter Import Visual Tests (TC-39.1 to TC-39.6, 22 Playwright tests).
February 18, 2026 - Added automated tests for Section 37: +12 backend Jest tests (getPatientOwnerFilter role filtering), +13 frontend Vitest tests (ADMIN+PHYSICIAN dropdown/nav/tabs). Total: 1,077 Jest + 1,025 Vitest.
February 16, 2026 - Added Section 37: Cross-Page Role Workflows (TC-37.1 to TC-37.17). Comprehensive per-role use cases across Patient Grid, Patient Management, and Admin pages. 17 test cases, 56% automated. Fixed TC-26.11 (ADMIN CAN access patient grid via physician dropdown, not blocked). Fixed TC-37.12 (ADMIN+PHYSICIAN gets ADMIN behavior on grid, NOT PHYSICIAN).
February 16, 2026 - Added role-based import test cases (TC-36.16 to TC-36.19: ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN dual role). 19 test cases total in Section 36, 100% automated.
February 16, 2026 - Updated Section 36: Universal Sheet Validation + Configurable Preview Columns (TC-36.13 to TC-36.15 added, TC-36.2/36.3/36.9 updated for universal behavior). 15 test cases, 100% automated. Total: 1,064 Jest + 1,012 Vitest + 8 Cypress.
February 14, 2026 - Added Section 36: Sutter/SIP Multi-System Import (TC-36.1 to TC-36.12, all automated). 12 test cases, 100% automated. Total: 1,030 Jest + 956 Vitest.
February 13, 2026 - Added Section 35: Insurance Group Filter (TC-35.1 to TC-35.10, all automated). 10 test cases, 100% automated. Total: 777 Jest + 895 Vitest + 12 Cypress.
February 13, 2026 - Added Section 34: Account Lockout + Temp Password + Forced Password Change (TC-34.1 to TC-34.10, all automated). 10 test cases, 100% automated.
February 12, 2026 - Added Section 33: Security Hardening Env Var Validation (TC-33.1 to TC-33.10, all automated). 10 test cases, 100% automated.
February 11, 2026 - Added TC-2.7: Auto-Open Dropdown Editor (single-click opens popup, keyboard nav, type-ahead, checkmark, clear option). Cell Editing coverage: 7 TCs, 43% automated.
February 7, 2026 - Added Section 32: Patient Management Page (TC-32.1 to TC-32.8)
February 6, 2026 - TC-31.1 (Row Numbers) removed — feature removed per user feedback. TC-29.2 updated for word-based search matching.
February 6, 2026 - Added UX Improvements test cases (TC-31.2 to TC-31.9): status bar, focus-visible, DOB aria-label, password helpers/toggles, import UX
February 5, 2026 - Added Multi-Select Status Filter test cases (TC-30.1 to TC-30.5)
February 5, 2026 - Added Patient Name Search test cases (TC-29.1 to TC-29.6)
February 5, 2026 - Added automation status and requirement traceability to all test cases
February 5, 2026 - Added Automation Summary section with coverage percentages and priority gaps
February 4, 2026 - Added Role Access Control test cases (TC-28.1 to TC-28.11)
February 4, 2026 - Added Patient Assignment test cases (TC-27.1 to TC-27.10)
February 3, 2026 - Added Forgot Password test cases (TC-26.25 to TC-26.33)
