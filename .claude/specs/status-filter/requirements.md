# Feature: Status Color Filter Bar

## Overview
Clickable filter chips below the toolbar allow users to filter the grid by row status color. Single-select behavior with accurate counts on each chip. Replaces the old dropdown filter with a more intuitive visual interface.

## User Stories

### US-1: Filter by Status
**As a** user
**I want to** filter the grid by patient status
**So that** I can focus on specific groups (e.g., overdue patients, completed measures)

### US-2: See Status Counts
**As a** user
**I want to** see patient counts for each status
**So that** I can understand my workload distribution at a glance

### US-3: Quick Filter Toggle
**As a** user
**I want to** quickly toggle filters on/off
**So that** I can switch between views without navigating menus

## Acceptance Criteria

### AC-1: Filter chips display in correct order
- GIVEN the grid is loaded
- WHEN the user views the filter bar below the toolbar
- THEN filter chips are displayed in this order from left to right:
  1. All
  2. Not Started
  3. Overdue
  4. In Progress
  5. Contacted
  6. Completed
  7. Declined
  8. Resolved
  9. N/A

### AC-2: Each chip shows count in parentheses
- GIVEN the filter bar is visible
- WHEN the user views any chip
- THEN it displays the status name and count in format: "Status (X)"
- EXAMPLE: "Overdue (15)", "Completed (42)", "All (150)"

### AC-3: "All" selected by default with ring highlight
- GIVEN the page loads for the first time
- WHEN the user views the filter bar
- THEN the "All" chip has a ring-2 highlight (border outline)
- AND all other chips have no highlight

### AC-4: Clicking a chip filters grid to that status only
- GIVEN the "All" chip is selected (default)
- WHEN the user clicks the "Overdue" chip
- THEN the grid filters to show only overdue patients
- AND the "Overdue" chip gains ring-2 highlight
- AND the "All" chip loses highlight

### AC-5: Clicking same chip again returns to "All"
- GIVEN the "Overdue" chip is selected (grid showing only overdue)
- WHEN the user clicks the "Overdue" chip again
- THEN the filter clears (grid shows all rows)
- AND the "All" chip gains ring-2 highlight
- AND the "Overdue" chip loses highlight

### AC-6: Only one filter active at a time (single-select)
- GIVEN the "Overdue" chip is selected
- WHEN the user clicks the "Completed" chip
- THEN the grid filters to show only completed patients
- AND the "Completed" chip is highlighted
- AND the "Overdue" chip is NOT highlighted
- AND only ONE chip has ring-2 highlight at any time

### AC-7: Status bar updates to "Showing X of Y rows" when filtered
- GIVEN the grid has 150 total rows
- AND 15 rows are overdue
- WHEN the user clicks "Overdue" chip
- THEN the status bar displays "Showing 15 of 150 rows"
- WHEN the user returns to "All"
- THEN the status bar displays "Showing 150 rows" (no "of")

### AC-8: Chip counts are accurate and match actual row counts
- GIVEN the grid has loaded
- WHEN the user views chip counts
- THEN each chip count equals the actual number of rows with that status
- AND the "All" chip count equals the sum of all other statuses
- WHEN the user edits a row to change its status
- THEN chip counts update immediately to reflect the change

## UI Workflow

### Filter by Status
1. User loads page → "All" chip selected, grid shows all 150 rows
2. User clicks "Overdue" chip
3. "Overdue" chip gets ring-2 highlight
4. Grid filters to 15 overdue rows
5. Status bar shows "Showing 15 of 150 rows"
6. User clicks "Completed" chip
7. "Completed" chip highlighted, "Overdue" un-highlighted
8. Grid shows 42 completed rows
9. Status bar shows "Showing 42 of 150 rows"

### Deselect Filter
1. User has "Overdue" chip selected (15 rows visible)
2. User clicks "Overdue" chip again
3. "Overdue" chip un-highlights
4. "All" chip highlights
5. Grid shows all 150 rows
6. Status bar shows "Showing 150 rows"

## Business Rules

### BR-1: Single-Select Behavior
Only one filter chip can be active at a time. Clicking a new chip automatically deselects the previous chip.

**Exception**: "All" is the default state when no specific status is selected.

### BR-2: Count Accuracy
Chip counts MUST always match actual row counts. Counts update in real-time when:
- Data is loaded from server
- User edits a status field
- Rows are added or deleted
- Filter is changed

### BR-3: "All" Count Calculation
The "All" chip count represents the total number of rows, which should equal the sum of all other status counts.

### BR-4: Visual Highlight
The ring-2 highlight (border outline) indicates the currently active filter. Only ONE chip has this highlight at any time.

## Edge Cases

### EC-1: Zero Count Chip
**Scenario**: No patients with "Declined" status
**Expected**: Chip displays "Declined (0)", still clickable, shows empty grid when selected

### EC-2: Filter with Sorting Active
**Scenario**: Grid sorted by Status Date, user clicks "Overdue" chip
**Expected**: Filtered rows maintain sort order, sort indicator still visible

### EC-3: Edit Status While Filtered
**Scenario**:
- User filters to "Overdue" (15 rows)
- User edits row to change status from "Overdue" to "Completed"

**Expected**:
- Edited row disappears from grid (no longer matches filter)
- "Overdue" count decreases to 14
- "Completed" count increases by 1
- Status bar updates to "Showing 14 of 150 rows"

### EC-4: Filter After Add/Delete Row
**Scenario**: User adds new patient row
**Expected**:
- If filter is "All", new row appears
- If filter is specific status, new row appears only if it matches
- Counts update immediately

### EC-5: Clicking "All" Chip
**Scenario**: User clicks "All" chip when it's already selected
**Expected**: No change (remains on "All", grid shows all rows)

## Dependencies
- Data Loading & Display (must have grid and status data loaded)
- Row Status Colors (chip names match status color categories)
- Status Bar component (for "Showing X of Y" display)

## Technical Notes

### Status Color Mapping
Filter chips correspond to row status colors defined in the system:

| Status | Row Color | CSS Class |
|--------|-----------|-----------|
| Not Started | Gray | `row-status-gray` |
| Overdue | Red | `row-status-red` |
| In Progress | Yellow | `row-status-yellow` |
| Contacted | Blue | `row-status-blue` |
| Completed | Green | `row-status-green` |
| Declined | Orange | `row-status-orange` |
| Resolved | Purple | `row-status-purple` |
| N/A | Light Gray | `row-status-na` |

### Count Update Triggers
Chip counts update on these events:
- `gridReady` - Initial load
- `cellValueChanged` - Status edited
- `rowDataUpdated` - Data refresh
- `filterChanged` - Filter applied/cleared

### Filter Implementation
Uses AG Grid's external filtering API:
```typescript
gridApi.isExternalFilterPresent() // Returns true if chip selected
gridApi.doesExternalFilterPass(node) // Returns true if row matches selected status
```
