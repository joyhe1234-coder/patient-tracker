# Feature: Cell Editing (Row Selection & Editing)

## Overview
Users can select rows and edit cell values directly in the AG Grid. Supports text fields, date fields with flexible input, and auto-save with status indicators.

## User Stories

### US-1: Select Rows
**As a** user
**I want to** click a row to select it
**So that** I can see which record I'm working with

### US-2: Edit Cells Directly
**As a** user
**I want to** edit cells directly in the grid
**So that** I can update patient data quickly without opening a separate form

### US-3: Flexible Date Input
**As a** user
**I want to** enter dates in multiple formats
**So that** I don't have to remember exact formatting rules

### US-4: Auto-Save Changes
**As a** user
**I want to** have my changes auto-saved
**So that** I don't lose my work

## Acceptance Criteria

### AC-1: Row click shows blue outline border selection
- GIVEN the grid is displayed
- WHEN the user clicks on any row
- THEN the row displays a blue outline border to indicate selection

### AC-2: Row selection preserves status color (not overridden)
- GIVEN a row has a status color (e.g., green for completed, red for overdue)
- WHEN the user selects the row
- THEN the blue outline appears
- AND the background status color is preserved (not replaced)

### AC-3: Single-click on cell enters edit mode for text fields
- GIVEN a row is selected
- WHEN the user single-clicks on an editable text cell (e.g., Notes)
- THEN the cell enters edit mode with cursor positioned

### AC-4: Text saved after exiting edit mode
- GIVEN the user has edited a text cell
- WHEN the user presses Tab or clicks elsewhere
- THEN the cell exits edit mode
- AND the new value is saved to the database

### AC-5: "Saving..." then "Saved" indicator in toolbar during save
- GIVEN the user has edited a cell
- WHEN the save operation begins
- THEN the toolbar displays "Saving..." indicator
- AND when complete, displays "Saved" for 2 seconds
- AND then the indicator disappears

### AC-6: Date fields accept multiple formats
- GIVEN the user is editing a date cell (Status Date, Due Date)
- WHEN the user enters a date in any of these formats:
  - MM/DD/YYYY (e.g., 12/25/2025)
  - M/D/YY (e.g., 1/5/25)
  - M.D.YYYY (e.g., 1.5.2025)
  - YYYY-MM-DD (e.g., 2025-01-05)
- THEN the date is accepted and saved

### AC-7: Dates normalize to MM/DD/YYYY display format
- GIVEN the user has entered a date in any accepted format
- WHEN the cell exits edit mode
- THEN the date displays in MM/DD/YYYY format

### AC-8: Invalid date shows error popup and reverts
- GIVEN the user is editing a date cell
- WHEN the user enters an invalid date (e.g., "13/45/2025", "abc")
- THEN an error popup appears with message "Invalid date format"
- AND the cell value reverts to the previous valid value

### AC-9: Status bar unchanged during selection
- GIVEN the user selects a row
- WHEN the selection occurs
- THEN the status bar row count remains the same
- AND no other status bar values change

## UI Workflow

### Edit Text Cell
1. User clicks row (blue outline appears)
2. User clicks cell (e.g., Notes column)
3. Cell enters edit mode (cursor blinking)
4. User types new value
5. User presses Tab or clicks elsewhere
6. Toolbar shows "Saving..." then "Saved"
7. Cell displays new value

### Edit Date Cell
1. User selects row
2. User clicks date cell (e.g., Due Date)
3. User types date in any accepted format
4. User presses Tab
5. If valid: Date normalizes to MM/DD/YYYY, auto-saves
6. If invalid: Error popup, value reverts

## Business Rules
1. All date formats are normalized to MM/DD/YYYY for display
2. Invalid dates are rejected immediately with error message
3. Auto-save occurs on cell blur (Tab, click elsewhere, Enter)
4. Save indicator appears for all successful saves
5. Row selection is visual only - does not affect data or filtering

## Edge Cases

### EC-1: Rapid Edits
**Scenario**: User edits multiple cells quickly
**Expected**: Each edit queues and saves sequentially, no data loss

### EC-2: Concurrent Edits (Future)
**Scenario**: Two users edit same row simultaneously
**Expected**: Last save wins (current behavior), future: conflict detection

### EC-3: Empty Date Value
**Scenario**: User deletes date and leaves empty
**Expected**: Empty value is saved (null in database)

### EC-4: Special Characters in Text
**Scenario**: User enters quotes, apostrophes, newlines in Notes
**Expected**: All characters saved correctly, no SQL injection

### EC-5: Edit During Filter
**Scenario**: User edits cell while grid is filtered
**Expected**: Edit saves, row remains visible in filter

### EC-6: Very Long Text
**Scenario**: User pastes 1000+ characters into Notes
**Expected**: Text truncates to field limit or scrolls within cell

## Dependencies
- Data Loading & Display (must have grid loaded)
- Authentication (must be logged in to save)
- Backend API (PUT/PATCH endpoint for updates)
