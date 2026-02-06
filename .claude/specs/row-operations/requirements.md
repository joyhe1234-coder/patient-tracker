# Feature: Add/Delete/Duplicate Row Operations

## Overview
Users can add new patient rows, delete existing rows, and duplicate rows to create copies for the same patient with different measures. New rows appear at the top, duplicated rows appear below the source row.

## User Stories
- As a user, I want to add new patients so I can track their quality measures
- As a user, I want to delete rows to remove incorrect or obsolete records
- As a user, I want to duplicate a row to quickly add another measure for the same patient

## Acceptance Criteria
- AC-1: "Add Row" opens modal with Member Name, DOB, Telephone, Address fields
- AC-2: New row appears as FIRST row in grid (rowOrder: 0, others shift down)
- AC-3: New row has empty requestType, qualityMeasure, measureStatus (no defaults)
- AC-4: Request Type cell auto-focused after add
- AC-5: Column sort cleared when adding new row
- AC-6: New row persists after page refresh
- AC-7: "Delete" button requires row selection (disabled otherwise)
- AC-8: Delete shows confirmation modal before removing
- AC-9: Delete decreases row count in status bar
- AC-10: "Duplicate" button requires row selection (disabled otherwise)
- AC-11: Duplicate creates copy below selected row
- AC-12: Duplicate copies memberName, memberDob, phone, address only
- AC-13: Duplicate row has empty requestType, qualityMeasure, measureStatus
- AC-14: Duplicate row persists after refresh

## UI Workflow
Add: Click "Add Row" → fill modal → click Add → row at top → Request Type focused
Delete: Select row → click "Delete" → confirm modal → row removed
Duplicate: Select row → click "Duplicate" → copy below → Request Type focused

## Business Rules
- New rows get rowOrder: 0 (all others increment)
- Duplicate copies patient demographics only, not measure data
- Sort cleared on add to show new row at top
- Duplicate row inserted directly below source row

## Edge Cases
- Add when grid is empty
- Delete last row
- Duplicate when sort is active
- Rapid add/delete operations

## Dependencies
- Cell Editing (for post-add editing)
- Duplicate Detection (for add validation)
