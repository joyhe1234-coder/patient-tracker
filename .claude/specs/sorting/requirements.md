# Feature: Sorting Behavior

## Overview
Users can sort the grid by clicking column headers. Critical feature: rows do NOT auto-sort during editing - they stay in place until next explicit sort. This prevents user confusion when editing sorted columns.

## User Stories

### US-1: Sort by Column
**As a** user
**I want to** sort the grid by clicking column headers
**So that** I can organize my data by different criteria

### US-2: Stable Rows During Editing
**As a** user
**I want to** have rows stay in place while I'm editing them
**So that** I don't lose track of what I'm working on

## Acceptance Criteria

### AC-1: Three-click sort cycle
- GIVEN the grid is displayed
- WHEN the user clicks a column header once
- THEN the column sorts ascending (A→Z, 0→9, oldest→newest)
- AND a down arrow indicator appears in the header
- WHEN the user clicks the same header again
- THEN the column sorts descending (Z→A, 9→0, newest→oldest)
- AND an up arrow indicator appears
- WHEN the user clicks the same header a third time
- THEN the sort is cleared (returns to original order)
- AND the arrow indicator disappears

### AC-2: Sort indicator (arrow) visible in column header
- GIVEN a column is sorted
- WHEN the user views the column header
- THEN an arrow icon is visible
- AND the arrow points down for ascending sort
- AND the arrow points up for descending sort

### AC-3: Editing a value does NOT reposition the row
- GIVEN the grid is sorted by Status Date ascending
- AND a row has Status Date = "12/15/2025" (in middle of list)
- WHEN the user edits Status Date to "01/01/2025" (earlier date)
- THEN the row stays in its current position
- AND does NOT move to the top of the list
- AND the edit is saved successfully

### AC-4: Sort indicator cleared when editing sorted column
- GIVEN the grid is sorted by Status Date ascending (down arrow visible)
- WHEN the user edits any Status Date value
- THEN the sort indicator (arrow) is removed from the header
- AND the grid remains in its current visual order

### AC-5: Row selection preserved during edits
- GIVEN a row is selected (blue outline)
- AND the user edits a cell in the selected row
- WHEN the edit is saved
- THEN the row remains selected
- AND the blue outline is still visible

### AC-6: Multi-cell edits maintain row position
- GIVEN the grid is sorted by any column
- WHEN the user edits multiple cells in the same row
- THEN the row stays in place after each edit
- AND the sort indicator is cleared after first edit

### AC-7: Date columns sort chronologically
- GIVEN the user clicks the Status Date or Due Date header
- WHEN ascending sort is applied
- THEN rows are ordered oldest to newest (chronological)
- AND dates sort as dates, not as text strings

### AC-8: Numeric columns sort numerically
- GIVEN the user clicks the Time Interval (Days) header
- WHEN ascending sort is applied
- THEN rows are ordered smallest to largest (1, 2, 10, 20)
- AND NOT alphabetically (1, 10, 2, 20)

## UI Workflow

### Sort a Column
1. User clicks "Status Date" header
2. Grid sorts ascending (oldest first)
3. Down arrow appears in header
4. User clicks header again
5. Grid sorts descending (newest first)
6. Up arrow appears
7. User clicks header third time
8. Sort clears, original order restored
9. Arrow disappears

### Edit Sorted Column (Critical Behavior)
1. Grid sorted by Status Date ascending
2. Row #5 has Status Date "06/15/2025"
3. User edits row #5 Status Date to "01/01/2025"
4. Row #5 STAYS in position #5 (does NOT jump to top)
5. Sort arrow removed from Status Date header
6. User can re-sort by clicking header again if desired

## Business Rules

### BR-1: Post-Edit Sort Suppression
When a user edits a cell in a sorted column, the grid does NOT automatically re-sort. This is intentional to preserve user context and prevent confusion.

**Rationale**: If a user is editing multiple rows while sorted, automatic re-sorting would cause rows to jump around, making it hard to continue working.

**Behavior**:
- Edit triggers sort suppression
- Sort indicator cleared visually
- User can manually re-sort by clicking header
- Suppression applies to currently sorted column only

### BR-2: Sort Only on Explicit Header Click
Sorting ONLY occurs when the user explicitly clicks a column header. No other actions trigger sorting:
- Cell edits do not sort
- Filtering does not change sort order
- Adding/deleting rows does not trigger re-sort

### BR-3: Sort Persists Across Filters
If the user sorts, then applies a filter, the visible rows maintain the sort order.

## Edge Cases

### EC-1: Empty Cells in Sorted Column
**Scenario**: Some rows have empty Status Date
**Expected**: Empty values sort to bottom (ascending) or top (descending)

### EC-2: Editing Multiple Cells Rapidly
**Scenario**: User edits 3 cells quickly in a sorted column
**Expected**: Sort indicator clears after first edit, no re-sorting occurs

### EC-3: Sort During Active Filter
**Scenario**: Grid is filtered to "Overdue" status, user sorts by Status Date
**Expected**: Only visible (filtered) rows sort, sort indicator appears

### EC-4: Sort After Adding Row
**Scenario**: Grid sorted by Member Name, user adds new patient
**Expected**: New row appears at bottom, does NOT auto-insert in sorted position

### EC-5: Sort with Mixed Data Types
**Scenario**: Tracking fields have mix of text and numbers
**Expected**: Sort as text (alphabetical) since fields are text type

## Dependencies
- Data Loading & Display (must have grid loaded)
- Cell Editing (sort suppression applies during edits)
- AG Grid sortable column configuration

## Technical Notes

### Sort Suppression Implementation
The sort suppression on edit is implemented by:
1. Listening for `cellValueChanged` event in AG Grid
2. Detecting if the edited column is currently sorted
3. Calling `api.applyColumnState()` to clear sort state
4. NOT calling `api.refreshCells()` or `api.redrawRows()` which would trigger re-sort

### Sort Comparators
Custom comparators are configured for:
- **Date columns**: Parse as Date objects, compare chronologically
- **Numeric columns**: Parse as numbers, compare numerically
- **Text columns**: Default string comparison (case-insensitive)
