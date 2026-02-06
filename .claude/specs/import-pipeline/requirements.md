# Feature: CSV/Excel Import Pipeline

## Overview
A multi-stage pipeline for importing patient quality measure data from CSV and Excel files. Supports multiple healthcare system formats, wide-to-long data transformation, validation with detailed error reporting, merge/replace modes with preview before commit, and physician ownership assignment.

## User Stories
- As an admin, I want to import patient data from CSV/Excel so I can bulk-load quality measures
- As an admin, I want to preview import changes before committing so I can verify correctness
- As an admin, I want merge mode to update existing data without losing manual edits
- As a user, I want clear error messages so I can fix import data issues

## Acceptance Criteria

### File Parsing (Phase 5b)
- AC-1: Parse CSV files with header row detection
- AC-2: Parse Excel (.xlsx) files with title row skipping
- AC-3: Validate required columns (Patient, DOB at minimum)
- AC-4: Show file metadata (name, type, row count, column count)
- AC-5: Reject unsupported file types with error message

### Column Mapping (Phase 5c)
- AC-6: Map patient columns (Patient→memberName, DOB→memberDob, Phone→memberTelephone, Address→memberAddress)
- AC-7: Map measure columns (Q1=statusDate, Q2=complianceStatus)
- AC-8: Group multiple columns to same quality measure (e.g., 3 Breast Cancer age brackets → 1 measure)
- AC-9: Skip known non-data columns (Age, Sex, MembID, LOB)
- AC-10: Report unmapped columns as warnings

### Data Transformation (Phase 5c)
- AC-11: Transform wide format to long format (1 row per patient+measure)
- AC-12: Skip empty measure columns (no row generated)
- AC-13: Set statusDate = import date for all rows
- AC-14: Normalize phone numbers to (555) 123-4567 format
- AC-15: Parse dates in multiple formats (MM/DD/YYYY, M/D/YY, YYYY-MM-DD, Excel serial)
- AC-16: Track patients with no measures separately

### Compliance Logic (Phase 5c)
- AC-17: "Any non-compliant wins" rule for grouped measure columns
- AC-18: Compliant → measureStatus = "Screening test completed" (or measure-specific)
- AC-19: Non-compliant → measureStatus = "Not Addressed"
- AC-20: Case-insensitive matching (COMPLIANT, compliant, C, Yes all valid)
- AC-21: All empty columns = skip (no row generated)

### Validation (Phase 5d)
- AC-22: Required field validation (memberName, memberDob, requestType, qualityMeasure)
- AC-23: Data type validation (dates, request types, quality measures)
- AC-24: Duplicate detection within import
- AC-25: Error severity: blocking errors vs non-blocking warnings
- AC-26: Error messages include row number and member name
- AC-27: Error deduplication per patient+field

### Error Reporting (Phase 5d)
- AC-28: Error count display with red background
- AC-29: Warning count display with yellow background
- AC-30: Duplicate groups display with orange background
- AC-31: Validation summary: success/warning/error status
- AC-32: canProceed flag (true if no blocking errors)
- AC-33: Row numbers reference original spreadsheet rows (accounting for title rows)

### Preview (Phase 5e-5f)
- AC-34: Preview shows diff: INSERT/UPDATE/SKIP/BOTH/DELETE actions
- AC-35: Merge mode logic: upgrade=UPDATE, both-compliant=SKIP, downgrade=BOTH
- AC-36: Replace mode: DELETE all existing + INSERT all new
- AC-37: Preview cached with 30-minute TTL
- AC-38: Action filter cards for changes table
- AC-39: Patient summary (new vs existing)

### Execution (Phase 5h)
- AC-40: Execute from cached preview
- AC-41: Transaction rollback on failure
- AC-42: Sync duplicate flags after execution
- AC-43: Preview deleted after successful execution
- AC-44: Stats returned: inserted, updated, deleted, skipped, bothKept

### Import UI (Phase 5j-5l)
- AC-45: Healthcare system selection dropdown
- AC-46: Import mode selection (Merge default, Replace All with warning)
- AC-47: Drag-and-drop file upload
- AC-48: Preview page with summary cards and changes table
- AC-49: Execute button with loading state
- AC-50: Success screen with statistics
- AC-51: Physician selection for import target (ADMIN/STAFF)
- AC-52: Reassignment warning when importing patients belonging to another physician

## UI Workflow
1. Select healthcare system → select mode → upload file
2. System parses, maps, transforms, validates
3. Preview shows changes (INSERT/UPDATE/SKIP/BOTH/DELETE)
4. User reviews and clicks "Apply Changes"
5. Execution with stats display

## Business Rules
- Merge mode: never downgrades (keeps both on downgrade)
- Replace mode: deletes ALL existing data first
- Any non-compliant wins for grouped measures
- Import requires physician target for ADMIN/STAFF
- Reassignment requires explicit confirmation

## Edge Cases
- File with all invalid rows
- File with only headers (no data)
- Excel file with multiple sheets
- Duplicate patients within import file
- Import same file twice (all SKIPs in merge mode)

## Dependencies
- Authentication (required to access import)
- Patient Ownership (physician assignment)
- Duplicate Detection (post-import sync)
