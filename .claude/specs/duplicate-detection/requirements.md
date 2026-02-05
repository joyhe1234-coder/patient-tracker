# Feature: Duplicate Detection

## Overview
The system detects and flags duplicate rows - same patient (memberName + memberDob) with same requestType and qualityMeasure. Duplicates are visually marked, blocked from creation, and dynamically tracked when rows change.

## User Stories
- As a user, I want to be warned when creating a duplicate row so I avoid redundant data
- As a user, I want visual indicators for duplicate rows so I can review and clean up data
- As a user, I want duplicate status to update dynamically when I edit or delete rows

## Acceptance Criteria
- AC-1: Duplicate = same memberName + memberDob + requestType + qualityMeasure
- AC-2: Skip duplicate check when requestType OR qualityMeasure is null/empty
- AC-3: Error modal when attempting to add a duplicate row via Add Row
- AC-4: Error alert when editing creates a duplicate (fields reset to empty, not revert)
- AC-5: Duplicate error resets dependent fields (requestType change resets qualityMeasure, measureStatus)
- AC-6: Visual indicator: orange left stripe (#F97316) on duplicate rows
- AC-7: Deleting one of duplicate pair removes duplicate flag from remaining row
- AC-8: Backend validates and blocks duplicate creation on API
- AC-9: Duplicate flags synchronized across create/update/delete operations

## UI Workflow
1. Add Row → enter same patient+measure → error modal → row NOT created
2. Edit field → creates duplicate → error alert → fields reset to empty
3. Delete duplicate → remaining row loses duplicate indicator

## Business Rules
- Duplicate check uses exact match on all 4 fields
- Skip check if any key field is null/empty
- On duplicate error during edit: reset to empty (not revert to old value)
- Dependent fields also reset on duplicate error

## Edge Cases
- Two rows with same patient but different request types (NOT duplicate)
- Editing to create duplicate then deleting other row
- Import creating duplicates (handled by import logic)

## Dependencies
- Add/Delete Row Operations
- Cascading Dropdowns (for field reset behavior)
