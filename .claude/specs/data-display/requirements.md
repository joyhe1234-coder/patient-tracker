# Feature: Data Loading & Display

## Overview
The system loads patient quality measure data from PostgreSQL and displays it in an AG Grid with 14 columns. Supports toggling visibility of member info columns (DOB, Telephone, Address) for privacy.

## User Stories

### US-1: View Patient Measures
**As a** physician
**I want to** see all my patient measures in a grid
**So that** I can track quality compliance

### US-2: Toggle Sensitive Information
**As a** user
**I want to** toggle sensitive member info on/off
**So that** I can comply with privacy requirements

### US-3: Data Load Feedback
**As a** user
**I want to** see data load progress
**So that** I know when the grid is ready

## Acceptance Criteria

### AC-1: Grid loads and displays all patient measures on page load
- GIVEN the user is logged in
- WHEN the user navigates to the main page
- THEN all patient measures from the database are loaded and displayed in the grid

### AC-2: Grid shows 11 columns by default
- GIVEN the grid has loaded
- WHEN the user views the grid
- THEN the following 11 columns are visible: Member Name, Request Type, Quality Measure, Measure Status, Status Date, Due Date, Time Interval (Days), Tracking #1, Tracking #2, Tracking #3, Notes

### AC-3: DOB, Telephone, Address columns hidden by default
- GIVEN the grid has loaded
- WHEN the user views the grid
- THEN the DOB, Telephone, and Address columns are not visible

### AC-4: "Show Member Info" button toggles visibility of DOB, Telephone, Address
- GIVEN the grid is displayed
- WHEN the user clicks the "Show Member Info" button
- THEN the DOB, Telephone, and Address columns become visible
- AND clicking the button again hides these columns

### AC-5: DOB displays as "###" for privacy masking
- GIVEN the DOB column is visible
- WHEN the user views the DOB field
- THEN the date of birth is displayed as "###" for privacy

### AC-6: Telephone formats as (555) 123-4567
- GIVEN the Telephone column is visible
- WHEN the user views the phone number
- THEN it is formatted as (XXX) XXX-XXXX

### AC-7: Loading spinner shows during data fetch
- GIVEN the user navigates to the main page
- WHEN the data is being loaded from the server
- THEN a loading spinner is displayed
- AND the spinner disappears when loading completes

### AC-8: Status bar shows total row count
- GIVEN the grid has loaded
- WHEN the user views the status bar
- THEN it displays the total number of rows (e.g., "Showing 150 rows")

### AC-9: No error messages on successful load
- GIVEN the data loads successfully
- WHEN the user views the page
- THEN no error messages or alerts are displayed

## UI Workflow
1. User navigates to application
2. Loading spinner appears
3. Grid renders with patient data
4. Status bar shows total row count
5. User can toggle member info visibility as needed

## Business Rules
- DOB is always masked for privacy
- Phone numbers are always formatted consistently
- Member info columns (DOB, Telephone, Address) are hidden by default
- Only patients belonging to the logged-in physician are displayed (ownership filtering)

## Edge Cases
1. **Empty dataset**: Grid should display with no rows, status bar shows "Showing 0 rows"
2. **Large dataset (1000+ rows)**: Grid should use virtualization for performance
3. **Network timeout during load**: Error message should display with retry option
4. **Partial data load failure**: Display loaded data with warning message

## Dependencies
- Authentication system (user must be logged in)
- Patient ownership filtering (physicians see only their patients)
- PostgreSQL database connection
