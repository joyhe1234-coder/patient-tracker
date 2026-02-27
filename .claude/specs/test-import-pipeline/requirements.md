# Requirements Document -- Module 4: Import Pipeline Comprehensive Test Plan

## Introduction

Consolidate all testable behaviors from the import pipeline feature family into a single comprehensive test plan. This document maps every testable behavior across four existing specifications (import-pipeline, sutter-import, smart-column-mapping, sutter-sheet-validation) to acceptance criteria, identifies coverage gaps against the current test suite (~926 backend Jest for import services/routes, ~276 frontend Vitest for import components, ~86 Playwright E2E for import flows, ~71 Cypress E2E for import interactions), and proposes new test cases to fill gaps.

The import pipeline is the largest and most complex subsystem in Patient Tracker, spanning 17 backend service files (7,081 LOC), 2 route files (1,266 LOC), 16 frontend components/pages, and touching authentication, role-based access control, file parsing, fuzzy matching, conflict detection, diff calculation, transaction execution, and real-time UI updates.

### Scope

This test plan covers eight key areas:
1. **File Parsing** -- Excel (.xlsx) and CSV parsing, sheet discovery, multi-sheet selection, column detection
2. **Column Mapping** -- Auto-mapping by header match, fuzzy matching (Jaro-Winkler + Jaccard), manual mapping UI, mapping persistence (save/load)
3. **Conflict Detection** -- Name+DOB matching, duplicate patient detection, field-level diff (INSERT/UPDATE/SKIP/CONFLICT), conflict resolution
4. **Preview** -- PreviewChangesTable showing all changes before execution, action filter cards, row-level detail, configurable preview columns
5. **Execute** -- Transaction-based import execution, rollback on error, stats reporting (inserted/updated/skipped/errors)
6. **Multi-System Support** -- Hill Healthcare and Sutter Health parsers, system-specific column mappings, insurance group propagation
7. **Import Page UI** -- File dropzone, system selector, sheet selector, physician assignment, progress indicators
8. **Mapping Management Page** -- Saved mappings CRUD, conflict resolution when mappings overlap, action pattern management

### Current Test Inventory

| Layer | Framework | Import-Related Tests | Files |
|-------|-----------|---------------------|-------|
| Backend Services | Jest | ~832 test cases | 24 files in `backend/src/services/import/__tests__/` |
| Backend Routes | Jest + supertest | ~94 test cases | `import.routes.test.ts` (52), `mapping.routes.test.ts` (42) |
| Frontend Components | Vitest + RTL | ~276 test cases | 11 files (`ImportPage`, `ImportPreviewPage`, `SheetSelector`, `ConflictBanner`, `ConflictResolutionStep`, `MappingTable`, `ActionPatternTable`, `MappingManagementPage`, `PreviewChangesTable`, `PreviewSummaryCards`, `UnmappedActionsBanner`, `ImportResultsDisplay`) |
| Playwright E2E | Playwright | ~86 test cases | 7 import-related spec files + `smart-column-mapping.spec.ts` |
| Cypress E2E | Cypress | ~71 test cases | `import-flow.cy.ts` (48), `import-conflict-admin.cy.ts` (8), `import-conflict-nonadmin.cy.ts` (6), `mapping-management.cy.ts` (9) |
| **Total** | | **~1,359** | **44 test files** |

## Alignment with Product Vision

This test plan directly supports the product.md goals:

1. **Import data from healthcare systems without manual entry**: Comprehensive testing ensures the import pipeline reliably handles both Hill Healthcare and Sutter/SIP file formats, preventing data loss or corruption during the import process.
2. **Replace Excel tracking for medical offices**: Thorough test coverage of edge cases (malformed files, missing columns, duplicate patients) builds confidence that the system handles real-world data quality issues gracefully.
3. **Maintain audit trail for accountability**: Testing import execution, rollback behavior, and audit logging ensures that every import operation is traceable and reversible.
4. **Support multiple physicians with patient isolation**: Testing physician assignment, role-based access, and reassignment detection ensures patient data isolation is maintained during import.

---

## Requirements

### REQ-TIP-01: File Parsing -- Excel (.xlsx) Parsing

**User Story:** As a QA engineer, I want comprehensive test coverage for Excel file parsing, so that I can verify the system correctly handles all valid and invalid Excel file inputs across both healthcare systems.

#### Acceptance Criteria

1. WHEN a valid .xlsx file with a single sheet is uploaded for Hill THEN the parser SHALL extract all rows starting from the header row (row 0 for Hill) and return column headers and row data.
2. WHEN a valid .xlsx file with multiple sheets is uploaded for Sutter THEN the parser SHALL read all sheet/tab names from the workbook.
3. WHEN a Sutter file is parsed THEN the parser SHALL use the `headerRow` value from `sutter.json` (row index 3) to locate the actual column headers, skipping title/fax rows 0-2.
4. WHEN a file with zero data rows (headers only) is uploaded THEN the parser SHALL return an empty data array without error and the preview SHALL show 0 changes.
5. WHEN an unsupported file type (e.g., .pdf, .doc, .txt) is uploaded THEN the parser SHALL reject with a descriptive error message indicating the supported formats.
6. WHEN a corrupted or password-protected Excel file is uploaded THEN the parser SHALL return a descriptive error message instead of an unhandled exception.
7. WHEN a CSV file is uploaded THEN the parser SHALL detect the CSV format and parse using Papa Parse with header row detection.
8. WHEN a .xlsx file contains merged cells in the header row THEN the parser SHALL compare against non-empty cell values and treat the sheet as invalid if required columns are obscured.
9. WHEN the header row index is out of bounds for a particular sheet THEN the sheet SHALL be considered invalid and excluded without throwing an error.
10. WHEN a sheet's header row at the configured index is empty or contains fewer than 3 non-empty cells THEN the sheet SHALL be considered invalid and excluded.

**Current Coverage:**
- `fileParser.test.ts`: 53 tests covering basic parsing, column validation, sheet name extraction, workbook info, sheet headers
- `import.routes.test.ts`: POST /sheets endpoint tests

**Gap Analysis:**
- GAP-01A: No test for password-protected Excel files (AC-6)
- GAP-01B: No test for merged cells in header row (AC-8)
- GAP-01C: Limited testing of header row boundary conditions (AC-9, AC-10 partially covered)

---

### REQ-TIP-02: File Parsing -- Sheet Discovery and Multi-Sheet Selection

**User Story:** As a QA engineer, I want comprehensive test coverage for sheet discovery and tab filtering, so that I can verify the system correctly identifies valid physician data tabs and excludes non-data tabs across all healthcare systems.

#### Acceptance Criteria

1. WHEN the `POST /api/import/sheets` endpoint processes a Sutter file THEN it SHALL apply name-based filtering FIRST (skipTabs patterns: `_NY` suffix, `Perf by Measure` prefix/suffix, `CAR Report` exact match, `contains` patterns) and header-based validation on the remaining sheets.
2. WHEN the endpoint processes a Hill file (no skipTabs configured) THEN only header-based validation SHALL be applied.
3. WHEN header-based validation runs for a sheet THEN the system SHALL check for presence of required columns: patient columns mapped to `memberName` and `memberDob`, and at least one data/measure column.
4. WHEN header validation compares column names THEN it SHALL perform case-insensitive matching and trim leading/trailing whitespace before comparison.
5. WHEN a file has zero valid physician data tabs (all tabs match skip patterns or fail header validation) THEN the endpoint SHALL return a 400 error with code `NO_VALID_TABS`.
6. WHEN at least one sheet is excluded by header validation THEN the response SHALL include an `invalidSheets` array with sheet name and reason.
7. WHEN all sheets pass validation for a single-sheet file THEN the `sheets` array SHALL contain exactly one entry.
8. WHEN a Sutter file has multiple valid tabs THEN the response SHALL list all valid tabs in workbook order (left to right).
9. WHEN a file with 10+ sheets is processed THEN total discovery time SHALL complete within 3 seconds.
10. WHEN the workbook is read THEN the system SHALL use a single `XLSX.read()` call and reuse the workbook object for both sheet names and header reads.

**Current Coverage:**
- `import.routes.test.ts`: POST /sheets endpoint tests covering skipTabs filtering, header validation, NO_VALID_TABS error
- `sutter-edge-cases.test.ts`: Edge cases for empty tabs, skip patterns
- `configLoader.test.ts`: getRequiredColumns tests
- `fileParser.test.ts`: getSheetNames, getWorkbookInfo, getSheetHeaders tests

**Gap Analysis:**
- GAP-02A: No explicit performance test for 10+ sheet workbooks (AC-9)
- GAP-02B: No test verifying single XLSX.read() call optimization (AC-10)
- GAP-02C: No test for sheet discovery with a Hill multi-tab file (unexpected multi-tab scenario per EC-SV-12)

---

### REQ-TIP-03: File Parsing -- Column Detection and Validation

**User Story:** As a QA engineer, I want comprehensive test coverage for column detection across both Hill and Sutter formats, so that I can verify the system correctly identifies required, optional, and unknown columns.

#### Acceptance Criteria

1. WHEN a Hill file is parsed THEN the system SHALL detect patient columns (Patient, DOB, Phone, Address) and measure columns (Q1/Q2 suffix pattern for each quality measure).
2. WHEN a Sutter file is parsed THEN the system SHALL detect patient columns (Member Name, Member DOB, Member Telephone, Member Home Address) and data columns (Request Type, Possible Actions Needed, Measure Details, Health Plans, Race-Ethnicity, High Priority).
3. WHEN a required column (Patient/Member Name, DOB/Member DOB) is missing THEN the system SHALL report it in `missingRequired` with BLOCKING severity.
4. WHEN an optional column is absent (e.g., Race-Ethnicity, High Priority for Sutter) THEN the parser SHALL NOT treat the absence as an error; those fields SHALL default to null.
5. WHEN an unrecognized column header is found THEN it SHALL be added to the `unmappedColumns` list as a warning.
6. WHEN known non-data columns appear (Age, Sex, MembID, LOB for Hill) THEN they SHALL be listed in `skipColumns` and excluded from mapping.
7. WHEN column headers contain leading/trailing whitespace THEN the system SHALL trim before comparison.
8. WHEN column headers differ only in case THEN the system SHALL treat them as exact matches after normalization.

**Current Coverage:**
- `columnMapper.test.ts`: 13 tests for Hill column mapping
- `sutterColumnMapper.test.ts`: 18 tests for Sutter column mapping
- `configLoader.test.ts`: 47 tests including config loading and validation
- `validator.test.ts`: 47 tests for row validation including required field checks

**Gap Analysis:**
- GAP-03A: No test for columns with embedded whitespace variations beyond leading/trailing (e.g., "Member  Name" with double space)
- GAP-03B: Limited testing of mixed-case column header scenarios in integration context

---

### REQ-TIP-04: Column Mapping -- Auto-Mapping by Header Match

**User Story:** As a QA engineer, I want comprehensive test coverage for automatic column mapping, so that I can verify the system correctly maps file headers to internal field names for both Hill's Q1/Q2 pattern and Sutter's direct mapping.

#### Acceptance Criteria

1. WHEN column mapping is performed for the Hill system THEN the mapper SHALL use the Q1/Q2 suffix logic: Q1 maps to `statusDate`, Q2 maps to `complianceStatus` for each quality measure group.
2. WHEN column mapping is performed for the Sutter system THEN the mapper SHALL use direct column-to-field mapping from `sutter.json` patientColumns (no Q1/Q2 suffix logic).
3. WHEN the mapper processes Hill measure columns THEN it SHALL group multiple columns to the same quality measure (e.g., 3 Breast Cancer age brackets produce 1 measure).
4. WHEN a recognized patient column is found THEN it SHALL be mapped to the corresponding internal field name per the system's config.
5. WHEN a recognized data column is found for Sutter THEN it SHALL be mapped with `columnType: 'data'`.
6. WHEN column mapping uses a mergedConfig (DB overrides + JSON seed) THEN DB overrides SHALL take precedence over JSON seed values for the same source column.
7. WHEN no DB overrides exist for a system THEN the system SHALL fall back to JSON config file mapping.
8. WHEN an optional `mergedConfig` parameter is provided to `mapColumns()` THEN it SHALL build column lookups from the merged config instead of the raw JSON config.

**Current Coverage:**
- `columnMapper.test.ts`: 13 tests for Hill Q1/Q2 mapping
- `sutterColumnMapper.test.ts`: 18 tests for Sutter direct mapping
- `mappingService.test.ts`: 31 tests for merged config loading and CRUD

**Gap Analysis:**
- GAP-04A: No test verifying mapColumns() with mergedConfig parameter for Hill format specifically
- GAP-04B: No test for mapSutterColumns() with mergedConfig parameter and DB overrides active
- GAP-04C: No test for mapping behavior when DB override changes a column from MEASURE to IGNORED type

---

### REQ-TIP-05: Column Mapping -- Fuzzy Matching Engine

**User Story:** As a QA engineer, I want comprehensive test coverage for the fuzzy matching engine, so that I can verify similarity scoring, threshold enforcement, abbreviation expansion, and candidate ranking all work correctly.

#### Acceptance Criteria

1. WHEN a spreadsheet header does not exactly match any known mapping THEN the system SHALL calculate a composite similarity score: 60% Jaro-Winkler + 40% Jaccard token overlap.
2. IF a fuzzy match scores above 80% similarity THEN the system SHALL flag it as a "probable match" (CHANGED conflict type).
3. IF no fuzzy match scores above 80% THEN the column SHALL be flagged as NEW with broader suggestions from a lower threshold (50%).
4. WHEN fuzzy matching is performed THEN the system SHALL normalize inputs by: trimming, lowercasing, removing common suffixes (" E", " Q1", " Q2"), collapsing spaces, and expanding 30+ medical abbreviations.
5. WHEN an exact match exists after normalization THEN the system SHALL NOT invoke fuzzy matching (zero overhead for unchanged columns).
6. WHEN the `fuzzyMatch()` function is called THEN it SHALL return the top 3 matches above threshold, sorted by descending score.
7. WHEN Sutter action text fails regex matching THEN `fuzzyMatchAction()` SHALL fall back to fuzzy scoring with a 75% threshold.
8. WHEN action text contains line breaks THEN they SHALL be normalized to spaces before fuzzy matching.
9. WHEN action text exceeds 500 characters THEN it SHALL be truncated before fuzzy matching.
10. WHEN action text contains year values THEN `fuzzyMatchAction()` SHALL strip 4-digit year sequences before scoring for year-agnostic matching.

**Current Coverage:**
- `fuzzyMatcher.test.ts`: 56 tests covering normalization (17), Jaro-Winkler (6), Jaccard (7), composite score (7), fuzzyMatch function (13), abbreviation expansion (8)
- `actionMapper.test.ts`: 56 tests covering action matching including fuzzy fallback

**Gap Analysis:**
- GAP-05A: No test for fuzzy matching performance with 100+ headers against 200+ known columns (NFR-SCM-P1)
- GAP-05B: No test for action text exactly at 500-character truncation boundary
- GAP-05C: No test for year-stripped text that becomes empty after stripping (edge case)

---

### REQ-TIP-06: Column Mapping -- Manual Mapping UI and Mapping Persistence

**User Story:** As a QA engineer, I want comprehensive test coverage for the mapping management page and conflict resolution UI, so that I can verify ADMIN users can create, read, update, and delete column mappings through the UI, and that mappings persist correctly in the database.

#### Acceptance Criteria

1. WHEN an ADMIN navigates to `/admin/import-mapping` THEN the page SHALL display a system selector dropdown populated from `GET /api/import/systems`.
2. WHEN a system is selected THEN the page SHALL load the merged config via `GET /api/import/mappings/:systemId` and display Patient Column Mappings, Measure Column Mappings, and Ignored Columns tables.
3. WHEN the ADMIN toggles "Edit Mappings" mode THEN all MappingTable sections SHALL switch to edit mode with inline dropdowns.
4. WHEN an ADMIN clicks "Add Mapping" THEN an inline form SHALL appear for source column name and target configuration.
5. WHEN an ADMIN moves a column from "mapped" to "ignored" THEN the change SHALL take effect on the next import without requiring a server restart.
6. WHEN an ADMIN saves mapping changes THEN the system SHALL validate: non-empty sourceColumn, valid targetType enum, no duplicate sourceColumn, quality measure exists in database.
7. WHEN a long-format system (Sutter) is selected THEN the page SHALL additionally display an Action Pattern Configuration section.
8. WHEN an ADMIN edits an action pattern THEN client-side regex validation SHALL occur, and server-side validation SHALL include ReDoS detection.
9. WHEN "Reset to Defaults" is clicked and confirmed THEN all DB overrides for that system SHALL be deleted and the JSON seed config SHALL be returned.
10. WHEN the page is accessed by a non-ADMIN user THEN ProtectedRoute SHALL redirect to the main page.
11. WHEN the ADMIN saves mapping changes THEN an AuditLog entry SHALL be created with action `MAPPING_CHANGE`.
12. WHEN optimistic locking detects a concurrent edit THEN the system SHALL return a 409 error with a retry message.

**Current Coverage:**
- `MappingManagementPage.test.tsx`: 18 tests for page loading, system switching, CRUD
- `MappingTable.test.tsx`: 19 tests for view/edit/resolve modes
- `ActionPatternTable.test.tsx`: 18 tests for pattern editing, regex validation
- `mappingService.test.ts`: 31 tests for DB CRUD, merge logic, audit logging
- `mapping.routes.test.ts`: 42 tests for API endpoints auth, validation, CRUD
- `smart-column-mapping.spec.ts`: 10 Playwright E2E tests
- `mapping-management.cy.ts`: 9 Cypress E2E tests

**Gap Analysis:**
- GAP-06A: No test for optimistic locking 409 scenario in Cypress/Playwright E2E (only unit-tested)
- GAP-06B: No test for "Add Mapping" with a quality measure that does not exist in the database (400 response)
- GAP-06C: No test for concurrent admin editing scenario end-to-end
- GAP-06D: No test for action pattern with catastrophic backtracking (ReDoS) submitted via the UI

---

### REQ-TIP-07: Conflict Detection -- Column Change Classification

**User Story:** As a QA engineer, I want comprehensive test coverage for the 7-step conflict classification pipeline, so that I can verify all conflict types (NEW, MISSING, CHANGED, DUPLICATE, AMBIGUOUS) are correctly detected and reported.

#### Acceptance Criteria

1. WHEN file headers exactly match config columns (case-insensitive, whitespace-tolerant) THEN no conflicts SHALL be generated and import SHALL proceed directly to preview.
2. WHEN a file header fuzzy-matches a config column at >= 80% similarity THEN a CHANGED conflict with WARNING severity SHALL be created.
3. WHEN a file header does not match any config column above threshold THEN a NEW conflict with INFO severity SHALL be created with broader suggestions.
4. WHEN a config column is not found in file headers THEN a MISSING conflict SHALL be created: BLOCKING for required patient columns (memberName, memberDob), WARNING for measure columns.
5. WHEN two file headers match the same config column THEN a DUPLICATE conflict with BLOCKING severity SHALL be created.
6. WHEN one file header matches multiple config columns within 5% score range THEN an AMBIGUOUS conflict with BLOCKING severity SHALL be created.
7. WHEN the matched count is less than 10% of total config columns THEN `isWrongFile` SHALL be set to true and a 400 error returned.
8. WHEN duplicate headers exist in the file (same header twice) THEN they SHALL be detected as a pre-check before fuzzy matching and generate BLOCKING DUPLICATE conflicts.
9. WHEN the conflict report is generated THEN it SHALL include summary counts for each category and a `hasBlockingConflicts` flag.
10. WHEN an error occurs during fuzzy matching for a specific header THEN that header SHALL be classified as NEW (fail-open) and remaining headers SHALL continue processing.

**Current Coverage:**
- `conflictDetector.test.ts`: 64 tests covering all 7 use cases, edge cases, fail-open, suggestions, metadata

**Gap Analysis:**
- GAP-07A: No integration test verifying conflict detection triggered from the full import.routes.ts preview endpoint flow
- GAP-07B: No test for conflict detection with a Sutter config (current tests use Hill-style configs)
- GAP-07C: No test for conflict detection when DB overrides change the expected columns vs. JSON seed

---

### REQ-TIP-08: Conflict Detection -- Conflict Resolution (Admin Inline)

**User Story:** As a QA engineer, I want comprehensive test coverage for the admin inline conflict resolution workflow, so that I can verify ADMIN users can resolve all conflict types, save resolutions, and proceed to preview.

#### Acceptance Criteria

1. WHEN conflicts are detected and the user has ADMIN role THEN the ConflictResolutionStep component SHALL render with interactive dropdowns per conflict.
2. WHEN resolving a NEW column THEN the ADMIN SHALL have options: MAP_TO_MEASURE, MAP_TO_PATIENT, or IGNORE.
3. WHEN resolving a MISSING column THEN the ADMIN SHALL have options: KEEP or REMOVE.
4. WHEN resolving a CHANGED column THEN the ADMIN SHALL have options: ACCEPT_SUGGESTION, MAP_TO_MEASURE, or IGNORE.
5. WHEN all conflicts are resolved and "Save & Continue" is clicked THEN resolutions SHALL be sent to `POST /api/import/mappings/:systemId/resolve` and the import SHALL re-submit preview without conflicts.
6. WHEN the ADMIN cancels conflict resolution THEN no mapping changes SHALL be saved, file selection SHALL reset, and the user SHALL return to file upload.
7. WHEN the "Save & Continue" button is rendered THEN it SHALL be disabled until all conflicts are resolved (resolvedCount === totalConflicts).
8. WHEN a non-ADMIN user encounters conflicts THEN a read-only ConflictBanner SHALL display with role="alert", no dropdowns, and "Cancel" + "Copy Details" buttons.
9. WHEN "Copy Details" is clicked THEN a structured text summary SHALL be copied to clipboard.
10. WHEN a save API call fails with 409 THEN the error message SHALL indicate concurrent modification and suggest reload.

**Current Coverage:**
- `ConflictResolutionStep.test.tsx`: 27 tests for admin/non-admin views, save/cancel, progress, loading/error states
- `ConflictBanner.test.tsx`: 17 tests for banner rendering, badges, buttons
- `import-conflict-admin.cy.ts`: 8 Cypress tests
- `import-conflict-nonadmin.cy.ts`: 6 Cypress tests
- `import-conflict-resolution.spec.ts`: 8 Playwright E2E tests

**Gap Analysis:**
- GAP-08A: No test for ACCEPT_SUGGESTION auto-populating measure info from fuzzy suggestion in E2E context
- GAP-08B: No test for session timeout during conflict resolution (Axios 401 interceptor handling)
- GAP-08C: No test for conflict resolution with DUPLICATE or AMBIGUOUS types in E2E context (only unit-tested)

---

### REQ-TIP-09: Conflict Detection -- Patient Name+DOB Matching and Duplicate Detection

**User Story:** As a QA engineer, I want comprehensive test coverage for patient identity matching during diff calculation, so that I can verify the system correctly identifies new, existing, and duplicate patients based on name+DOB combination.

#### Acceptance Criteria

1. WHEN a patient in the import file matches an existing patient by name+DOB THEN the diff SHALL classify the measure as UPDATE, SKIP, or BOTH depending on compliance status comparison.
2. WHEN a patient in the import file does not match any existing patient THEN the diff SHALL classify all measures as INSERT.
3. WHEN the same patient (name+DOB) appears multiple times in the import file with different quality measures THEN each measure SHALL produce a separate diff entry.
4. WHEN the same patient+requestType+qualityMeasure appears multiple times in the import file THEN the validator SHALL flag them as duplicates within the import.
5. WHEN merge mode is used and existing measure is compliant while import is non-compliant THEN the action SHALL be BOTH (keep both).
6. WHEN merge mode is used and both existing and import measures are non-compliant THEN the action SHALL be SKIP.
7. WHEN merge mode is used and existing measure is non-compliant while import is compliant THEN the action SHALL be UPDATE (upgrade).
8. WHEN replace mode is used THEN the diff SHALL create DELETE for all existing records and INSERT for all import records.
9. WHEN a patient was previously assigned to a different physician THEN the reassignment detector SHALL flag it and require explicit confirmation.
10. WHEN the same file is imported twice in merge mode THEN all rows SHALL be SKIP (idempotent).

**Current Coverage:**
- `diffCalculator.test.ts`: 81 tests covering merge/replace modes, status categorization, INSERT/UPDATE/SKIP/BOTH/DELETE actions
- `mergeLogic.test.ts`: 12 tests for merge strategy (upgrade, downgrade, same status)
- `reassignment.test.ts`: 21 tests for reassignment detection
- `validator.test.ts`: 47 tests including duplicate detection within import

**Gap Analysis:**
- GAP-09A: No test for re-import idempotency (same file twice produces all SKIPs) as an explicit integration test
- GAP-09B: No test for diff calculation with Sutter data where notes and tracking1 fields are non-null
- GAP-09C: No test for merge behavior when existing status is "unknown" category (null/empty string)

---

### REQ-TIP-10: Preview -- PreviewChangesTable Display

**User Story:** As a QA engineer, I want comprehensive test coverage for the preview changes table, so that I can verify all change types display correctly with proper color coding, filtering, and detail.

#### Acceptance Criteria

1. WHEN the preview page loads THEN the PreviewChangesTable SHALL display all changes with action badges: INSERT (green), UPDATE (blue), SKIP (gray), BOTH (purple), DELETE (red).
2. WHEN an action filter card is clicked THEN only changes matching that action type SHALL be displayed.
3. WHEN "All" filter is selected THEN all changes SHALL be displayed.
4. WHEN the preview is for a Sutter import THEN additional columns from `previewColumns` config (Status Date, Possible Actions Needed) SHALL be displayed.
5. WHEN the preview is for a Hill import THEN only standard columns SHALL be displayed (no previewColumns configured).
6. WHEN a `previewColumns` entry has no value for a row THEN the preview SHALL display an empty cell.
7. WHEN the preview summary is displayed THEN it SHALL show patient counts (new vs existing) and action counts.
8. WHEN the preview data contains zero changes THEN the table SHALL show an appropriate empty state message.
9. WHEN the preview includes both Hill and Sutter data for the same physician THEN each import produces an independent preview.

**Current Coverage:**
- `PreviewChangesTable.test.tsx`: 21 tests for rendering, filtering, action badges, configurable columns, empty state
- `PreviewSummaryCards.test.tsx`: 18 tests for summary card rendering
- `ImportPreviewPage.test.tsx`: 33 tests for page rendering, unmapped actions, navigation
- `import-flow.cy.ts`: Cypress tests for preview interaction

**Gap Analysis:**
- GAP-10A: No test for action override functionality (changing SKIP to UPDATE etc.) -- this feature is NOT YET IMPLEMENTED in PreviewChangesTable (currently read-only)
- GAP-10B: No test for preview table with very large datasets (1000+ rows) for scroll/performance
- GAP-10C: No test for row-level detail expansion -- this feature is NOT YET IMPLEMENTED

---

### REQ-TIP-11: Execute -- Transaction-Based Import Execution

**User Story:** As a QA engineer, I want comprehensive test coverage for import execution, so that I can verify transaction atomicity, rollback behavior, stats accuracy, and post-execution cleanup.

#### Acceptance Criteria

1. WHEN executeImport is called with a valid preview ID THEN it SHALL execute within a Prisma transaction with 5-minute timeout and 10-second max wait.
2. WHEN merge mode is used THEN the executor SHALL process INSERT, UPDATE, SKIP, BOTH, and DELETE actions individually per change.
3. WHEN replace mode is used THEN the executor SHALL first DELETE all existing records, then INSERT all new records.
4. WHEN an error occurs during execution THEN the entire transaction SHALL be rolled back and the error SHALL be captured in the ExecutionResult.
5. WHEN execution succeeds THEN the preview SHALL be deleted from cache and stats SHALL be returned with counts for inserted, updated, deleted, skipped, and bothKept.
6. WHEN execution completes successfully THEN `syncAllDuplicateFlags()` SHALL run to detect duplicates across all patients.
7. WHEN a preview ID does not exist or has expired THEN executeImport SHALL throw "Preview not found or expired: {id}".
8. WHEN the import executor creates a new patient record THEN it SHALL set the insuranceGroup based on the systemId (e.g., 'sutter' for Sutter imports, 'hill' for Hill imports).
9. WHEN the import executor creates or updates a measure record THEN it SHALL persist non-null `notes` and `tracking1` fields from the DiffChange.
10. WHEN the import executor calculates due dates THEN it SHALL call `calculateDueDate()` for each created/updated measure.
11. WHEN execution fails after some operations have succeeded THEN ALL operations SHALL be rolled back (no partial imports).
12. WHEN a Sutter tab with 4,000+ rows is executed THEN the import SHALL complete without timeout within the 5-minute transaction window.

**Current Coverage:**
- `importExecutor.test.ts`: 31 tests covering merge mode operations, replace mode, stats counting, error handling, preview validation
- `sutter-integration.test.ts`: Integration tests for full pipeline including diff
- `import-flow.cy.ts`: Cypress E2E tests for execute button and stats display
- `sutter-performance.test.ts`: 5 performance tests

**Gap Analysis:**
- GAP-11A: No test for transaction rollback on mid-execution failure (e.g., database constraint violation after N successful inserts)
- GAP-11B: No test for concurrent import execution for the same physician (race condition scenario)
- GAP-11C: No test for import execution when database connection is lost mid-transaction
- GAP-11D: No test for due date calculation being called during execution (only tested in isolation)
- GAP-11E: No test for insuranceGroup assignment during execution (only integration-tested)

---

### REQ-TIP-12: Execute -- Stats Reporting and Post-Execution

**User Story:** As a QA engineer, I want comprehensive test coverage for import stats reporting and post-execution UI, so that I can verify the user sees accurate statistics and can navigate back to the grid.

#### Acceptance Criteria

1. WHEN execution completes THEN the ImportResultsDisplay component SHALL show counts for inserted, updated, deleted, skipped, and bothKept.
2. WHEN execution has errors THEN the results display SHALL show error count and error details.
3. WHEN execution succeeds THEN the "Return to Grid" button SHALL navigate the user back to the main page.
4. WHEN execution finishes THEN the Socket.IO broadcast SHALL notify other connected clients to refresh their grid data.
5. WHEN the execution duration is returned THEN it SHALL be displayed in a human-readable format.

**Current Coverage:**
- `ImportResultsDisplay.test.tsx`: 15 tests for stats display, error display, navigation
- `import-flow.cy.ts`: Cypress E2E tests for stats verification

**Gap Analysis:**
- GAP-12A: No test for Socket.IO broadcast after successful import execution
- GAP-12B: No test for execution duration display formatting
- GAP-12C: No test for "Return to Grid" button when grid data has changed due to import

---

### REQ-TIP-13: Multi-System Support -- Hill Healthcare Parser

**User Story:** As a QA engineer, I want comprehensive test coverage for the Hill Healthcare import path, so that I can verify wide-to-long transformation, compliance logic, and measure column grouping.

#### Acceptance Criteria

1. WHEN a Hill file is transformed THEN the transformer SHALL pivot from wide format (1 row per patient, multiple measure columns) to long format (1 row per patient+measure).
2. WHEN a measure column group has Q1 (date) and Q2 (compliance status) THEN they SHALL be paired as statusDate and complianceStatus for that measure.
3. WHEN multiple columns map to the same quality measure (e.g., 3 Breast Cancer age brackets) THEN the "any non-compliant wins" rule SHALL apply.
4. WHEN a Hill row has all empty measure columns THEN no measure rows SHALL be generated for that patient.
5. WHEN compliance status is "Compliant", "C", "Yes", or case variations THEN the measure SHALL be categorized as compliant.
6. WHEN compliance status is "Non-Compliant", "NC", "No", or case variations THEN the measure SHALL be categorized as non-compliant.
7. WHEN phone numbers are parsed THEN they SHALL be normalized to (555) 123-4567 format.
8. WHEN dates are parsed THEN recognized formats SHALL include: MM/DD/YYYY, M/D/YY, YYYY-MM-DD, and Excel serial numbers.
9. WHEN a Hill row has no date column or the Q1 date is empty/unparseable THEN `statusDate` SHALL default to the current date with `statusDateSource = 'default'`.
10. WHEN a Hill row has a valid date in Q1 THEN `statusDate` SHALL use the file date with `statusDateSource = 'file'`.

**Current Coverage:**
- `dataTransformer.test.ts`: 23 tests for Hill transformation, wide-to-long, compliance logic
- `integration.test.ts`: 14 tests for full Hill pipeline
- `import-flow.cy.ts`: 48 Cypress E2E tests for Hill import flow

**Gap Analysis:**
- GAP-13A: No test for phone number normalization edge cases (international formats, extensions, partial numbers)
- GAP-13B: No test for statusDateSource tracking through the full pipeline to preview display
- GAP-13C: No test for Hill file with a measure column that has Q1 but no Q2 (or vice versa)

---

### REQ-TIP-14: Multi-System Support -- Sutter Health Parser

**User Story:** As a QA engineer, I want comprehensive test coverage for the Sutter/SIP import path, so that I can verify long-format processing, action-to-measure mapping, Measure Details parsing, and HCC notes preservation.

#### Acceptance Criteria

1. WHEN a Sutter file is transformed THEN each row SHALL produce at most one TransformedRow (long format, no pivoting).
2. WHEN a row has Request Type = "AWV" or "APV" THEN it SHALL map to requestType="AWV", qualityMeasure="Annual Wellness Visit".
3. WHEN a row has Request Type = "HCC" THEN it SHALL map to requestType="Chronic DX", qualityMeasure="Chronic Diagnosis Code", and the full action text SHALL be stored in the notes field.
4. WHEN a row has Request Type = "Quality" THEN the action text SHALL be looked up in actionMapping to determine requestType, qualityMeasure, and measureStatus.
5. WHEN all 10 regex patterns are tested against known action text THEN each SHALL map to the correct quality measure and status.
6. WHEN a Quality row's action text does not match any known pattern THEN `measureStatus` SHALL default to "Not Addressed" silently (per REQ-SV-8).
7. WHEN the Measure Details column contains a semicolon-separated value THEN the first part SHALL be parsed as statusDate and the remaining parts as tracking1.
8. WHEN the Measure Details column contains comma-separated date values THEN the latest (most recent) date SHALL be set as statusDate.
9. WHEN a Member DOB is an Excel serial number THEN it SHALL be converted using the parseDate utility.
10. WHEN action text contains leading/trailing whitespace or embedded line breaks THEN the transformer SHALL trim and normalize before mapping.
11. WHEN a row is missing Member Name THEN the transformer SHALL skip the row and add a transform error.
12. WHEN a Sutter import is executed THEN all patients SHALL have `insuranceGroup = 'sutter'`.
13. WHEN duplicate rows for the same patient+measure exist in the same tab THEN they SHALL be merged (latest statusDate picked, notes concatenated).

**Current Coverage:**
- `sutterDataTransformer.test.ts`: 51 tests for transformation, request type mapping, action mapping, Measure Details parsing
- `actionMapper.test.ts`: 56 tests for all 10 regex patterns, fuzzy fallback, edge cases
- `measureDetailsParser.test.ts`: 42 tests for all parsing strategies
- `sutter-integration.test.ts`: 67 tests for full Sutter pipeline (8 fixture files)
- `sutter-edge-cases.test.ts`: 29 tests for special characters, date formats, boundary conditions
- `sutter-error-handling.test.ts`: 15 tests for error paths

**Gap Analysis:**
- GAP-14A: No test for action text matching order (first match wins when multiple patterns could match)
- GAP-14B: No test for Measure Details with exactly 3 semicolon-separated parts ("01/15/2025; 7.5; mg/dL")
- GAP-14C: No test for Sutter row with unrecognized Request Type value (not AWV, APV, HCC, or Quality)
- GAP-14D: No test for concurrent Sutter and Hill imports for the same physician (race condition per EC-SI-15)

---

### REQ-TIP-15: Multi-System Support -- Insurance Group Propagation

**User Story:** As a QA engineer, I want comprehensive test coverage for insurance group assignment during import, so that I can verify patients are tagged with the correct insurance group and the grid filter works correctly.

#### Acceptance Criteria

1. WHEN a Sutter import is executed THEN all patients created or updated SHALL have `insuranceGroup = 'sutter'`.
2. WHEN a Hill import is executed THEN all patients created or updated SHALL have `insuranceGroup = 'hill'`.
3. WHEN a patient was previously imported from Hill and is later imported from Sutter THEN the patient's `insuranceGroup` SHALL be updated to `'sutter'` (last import wins).
4. WHEN the insurance group filter dropdown is displayed THEN it SHALL include options for both "Hill Healthcare" and "Sutter/SIP".
5. WHEN a user filters by "Sutter/SIP" THEN only patients with `insuranceGroup = 'sutter'` SHALL appear in the grid.

**Current Coverage:**
- `insurance-group-filter.cy.ts`: 12 Cypress tests for grid filtering
- `importExecutor.test.ts`: Tests insurance group assignment during execution

**Gap Analysis:**
- GAP-15A: No test for insurance group change when a patient is re-imported from a different system
- GAP-15B: No test for insurance group filter combined with other filters (status filter + insurance group + name search)

---

### REQ-TIP-16: Import Page UI -- File Dropzone and System Selection

**User Story:** As a QA engineer, I want comprehensive test coverage for the import page UI workflow, so that I can verify the step-by-step import process works correctly for all roles and systems.

#### Acceptance Criteria

1. WHEN a user navigates to the import page THEN the Healthcare System dropdown SHALL display both "Hill Healthcare" and "Sutter/SIP".
2. WHEN a system is selected THEN the Import Mode selection SHALL appear with "Merge" as the default.
3. WHEN "Replace All" mode is selected THEN a warning modal SHALL appear requiring explicit confirmation.
4. WHEN the user selects a file via drag-and-drop or file picker THEN the file name, type, and size SHALL be displayed.
5. WHEN a file exceeds the maximum upload size THEN the system SHALL display an error before sending to the server.
6. WHEN no file is selected THEN the "Preview Import" button SHALL be disabled.
7. WHEN no physician is selected (for ADMIN/STAFF roles) THEN the "Preview Import" button SHALL be disabled.
8. WHEN a PHYSICIAN user accesses the import page THEN the physician SHALL be auto-assigned (no physician dropdown) and only the system, mode, and file selection steps SHALL appear.
9. WHEN a STAFF user accesses the import page THEN the physician dropdown SHALL show only physicians assigned to that staff member.
10. WHEN an ADMIN user accesses the import page THEN the physician dropdown SHALL show ALL physicians in the system.
11. WHEN a file is removed from the dropzone THEN the dropzone SHALL return to its initial state and the preview button SHALL be disabled.

**Current Coverage:**
- `ImportPage.test.tsx`: 40 tests for page rendering, system selection, mode selection, file upload, role-based behavior
- `SheetSelector.test.tsx`: 58 tests for sheet/physician selection, role-based variants
- `import-flow.cy.ts`: 48 Cypress E2E tests
- `import-all-roles.spec.ts`: 21 Playwright E2E tests for all roles
- `sutter-import.spec.ts`: 13 Playwright E2E for Sutter-specific flow
- `sutter-import-visual.spec.ts`: 29 Playwright visual tests

**Gap Analysis:**
- GAP-16A: No test for maximum file size enforcement at the frontend level
- GAP-16B: No test for drag-and-drop functionality in E2E (only click-to-select tested)
- GAP-16C: No test for removing a file and re-uploading a different one

---

### REQ-TIP-17: Import Page UI -- Sheet Selector and Physician Assignment

**User Story:** As a QA engineer, I want comprehensive test coverage for the universal sheet selector and physician assignment step, so that I can verify the component works correctly for single-tab, multi-tab, and all role scenarios.

#### Acceptance Criteria

1. WHEN a file has multiple valid tabs THEN the sheet selector SHALL display a dropdown for tab selection.
2. WHEN a file has exactly one valid tab THEN the sheet selector SHALL display the tab name as static text.
3. WHEN a file is a CSV or single-tab Excel THEN the tab SHALL be auto-selected.
4. WHEN the sheet selector receives invalidSheets with entries THEN it SHALL display an informational note with expandable detail.
5. WHEN a Sutter tab is selected THEN the system SHALL attempt physician auto-match by case-insensitive partial matching against physician displayName.
6. WHEN a physician is auto-matched THEN a "(suggested)" visual indicator SHALL appear.
7. WHEN the user overrides the suggested physician THEN the system SHALL accept the override without warning.
8. WHEN both tab and physician are selected THEN the "Preview Import" button SHALL be enabled.
9. WHEN a PHYSICIAN user uploads a file THEN the physician SHALL be auto-assigned and the physician dropdown SHALL not appear.
10. WHEN an ADMIN+PHYSICIAN dual-role user uploads a file THEN the physician dropdown SHALL show ALL physicians (ADMIN behavior takes precedence).

**Current Coverage:**
- `SheetSelector.test.tsx`: 58 tests covering all roles, single/multi-tab, auto-match, errors, invalid sheets

**Gap Analysis:**
- GAP-17A: No test for physician auto-match when multiple physicians share the same last name
- GAP-17B: No test for tab names with special characters (parentheses, slashes, periods, commas) in E2E context
- GAP-17C: No test for sheet selector with a Hill file that unexpectedly contains multiple tabs

---

### REQ-TIP-18: Import Page UI -- Progress Indicators and Error States

**User Story:** As a QA engineer, I want comprehensive test coverage for import progress indicators and error states, so that I can verify users receive appropriate feedback at each stage of the import workflow.

#### Acceptance Criteria

1. WHEN the preview is being generated THEN a loading spinner or progress indicator SHALL be displayed with the message "Generating preview...".
2. WHEN the import is being executed THEN a loading state SHALL prevent double-submission and show "Applying changes...".
3. WHEN validation fails with blocking errors THEN a red error banner SHALL display the error count and row details.
4. WHEN validation produces warnings but no blocking errors THEN a yellow warning banner SHALL display and the import SHALL be allowed to proceed.
5. WHEN the file upload fails (network error, server error) THEN an error message SHALL be displayed with retry option.
6. WHEN the preview generation fails THEN the error SHALL be displayed inline and the user SHALL be able to modify selections and retry.
7. WHEN the preview expires (30-minute TTL) before execution THEN the system SHALL inform the user and require a new preview.
8. WHEN a Sutter import skips rows due to unmapped actions THEN the unmapped actions banner SHALL display with row count and expandable detail.

**Current Coverage:**
- `ImportPage.test.tsx`: Tests for loading states, error states
- `UnmappedActionsBanner.test.tsx`: 17 tests for unmapped actions display
- `sutter-import-errors.spec.ts`: 6 Playwright tests for error scenarios

**Gap Analysis:**
- GAP-18A: No test for preview expiration (30-minute TTL) and user notification
- GAP-18B: No test for double-submission prevention during execution
- GAP-18C: No test for network error during file upload with retry behavior
- GAP-18D: No test for preview generation failure recovery (modify selections and retry)

---

### REQ-TIP-19: Data Transformation -- Date Parsing

**User Story:** As a QA engineer, I want comprehensive test coverage for date parsing across all supported formats, so that I can verify dates are correctly extracted from both Hill and Sutter file formats.

#### Acceptance Criteria

1. WHEN a date value is in MM/DD/YYYY format THEN it SHALL be parsed correctly.
2. WHEN a date value is in M/D/YY format THEN it SHALL be parsed correctly with 2000s century assumption.
3. WHEN a date value is in YYYY-MM-DD (ISO) format THEN it SHALL be parsed correctly.
4. WHEN a date value is an Excel serial number (e.g., 38082) THEN it SHALL be converted to a proper date.
5. WHEN a date value is empty or null THEN statusDate SHALL default to the import date.
6. WHEN a date value is unparseable text THEN the system SHALL fall back to the import date default for that row.
7. WHEN Measure Details contains comma-separated dates THEN the latest date SHALL be used as statusDate.
8. WHEN Measure Details contains a semicolon-separated "date; reading" THEN the date portion SHALL be extracted.
9. WHEN Measure Details contains a value that is only a number THEN it SHALL be set as tracking1 (not converted to a date).
10. WHEN a column other than Member DOB contains a numeric value THEN it SHALL NOT be automatically converted to an Excel serial date.

**Current Coverage:**
- `measureDetailsParser.test.ts`: 42 tests for Sutter Measure Details parsing
- `dataTransformer.test.ts`: Tests for Hill date parsing
- `sutter-integration.test.ts`: Integration tests covering date parsing end-to-end

**Gap Analysis:**
- GAP-19A: No test for M/D/YY format with ambiguous century boundary (e.g., "1/1/30" -- is it 1930 or 2030?)
- GAP-19B: No test for extremely large Excel serial numbers that would produce future dates
- GAP-19C: No test for timezone edge cases when import date is used as default

---

### REQ-TIP-20: Validation -- Row-Level Validation

**User Story:** As a QA engineer, I want comprehensive test coverage for row-level validation, so that I can verify all validation rules, error severities, and error deduplication work correctly.

#### Acceptance Criteria

1. WHEN required fields (memberName, memberDob, requestType, qualityMeasure) are missing THEN blocking validation errors SHALL be generated.
2. WHEN requestType is not in the valid list THEN an error SHALL be generated: blocking for Hill, warning for Sutter.
3. WHEN qualityMeasure is not in the valid list THEN a validation error SHALL be generated.
4. WHEN duplicate patient+requestType+qualityMeasure combinations exist within the import THEN they SHALL be flagged as duplicates.
5. WHEN error messages are generated THEN they SHALL include the row number and member name.
6. WHEN row numbers reference the spreadsheet THEN they SHALL account for title rows (e.g., Sutter header at row 3 means data starts at row 5 in 1-indexed terms).
7. WHEN multiple identical errors exist for the same patient+field THEN they SHALL be deduplicated.
8. WHEN the validation summary is computed THEN it SHALL correctly set the `canProceed` flag (true if no blocking errors).
9. WHEN a Sutter row has an unmapped action text THEN the validator SHALL NOT generate a warning (per REQ-SV-8 silent default).
10. WHEN a Hill row has empty measureStatus THEN the existing warning behavior SHALL be preserved.

**Current Coverage:**
- `validator.test.ts`: 47 tests for required fields, type validation, duplicate detection, error severity, canProceed
- `errorReporter.test.ts`: 25 tests for error formatting, deduplication, severity display

**Gap Analysis:**
- GAP-20A: No test for validation with Sutter-specific requestType list (including "Chronic DX" and "Screening")
- GAP-20B: No test for row number offset calculation for Sutter files (headerRow=3, dataStartRow=5)
- GAP-20C: No test for validation error deduplication across very large datasets (100+ duplicate errors)

---

### REQ-TIP-21: Error Reporting and Display

**User Story:** As a QA engineer, I want comprehensive test coverage for error reporting UI, so that I can verify error/warning/duplicate counts display correctly with proper styling and row references.

#### Acceptance Criteria

1. WHEN blocking errors exist THEN the error count SHALL display with red background and the error details SHALL include row number and member name.
2. WHEN warnings exist THEN the warning count SHALL display with yellow background.
3. WHEN duplicate groups exist THEN the duplicate count SHALL display with orange background.
4. WHEN the validation summary shows status THEN it SHALL be one of: success (green), warning (yellow), error (red).
5. WHEN `canProceed` is false THEN the import action SHALL be disabled.
6. WHEN `canProceed` is true with warnings THEN the import action SHALL be enabled with a "proceed with caution" indicator.
7. WHEN row numbers are displayed THEN they SHALL reference original spreadsheet rows (1-indexed, accounting for title rows).

**Current Coverage:**
- `errorReporter.test.ts`: 25 tests for report generation, severity levels, deduplication
- `import-flow.cy.ts`: Cypress tests for error/warning display
- `ImportPage.test.tsx`: Tests for canProceed behavior

**Gap Analysis:**
- GAP-21A: No test for error report with mixed blocking and non-blocking errors in the same import
- GAP-21B: No test for error details scrolling/pagination with large number of errors

---

### REQ-TIP-22: Preview Cache Management

**User Story:** As a QA engineer, I want comprehensive test coverage for the preview cache, so that I can verify cache storage, TTL expiration, cleanup, and multi-preview isolation.

#### Acceptance Criteria

1. WHEN a preview is generated THEN it SHALL be stored in the in-memory cache with a unique ID.
2. WHEN a preview is older than 30 minutes THEN it SHALL be expired and return null on lookup.
3. WHEN a preview is executed successfully THEN it SHALL be deleted from the cache.
4. WHEN multiple previews exist for different imports THEN they SHALL be isolated by unique preview IDs.
5. WHEN the cache cleanup timer runs THEN it SHALL remove all expired entries.
6. WHEN `getPreviewSummary()` is called THEN it SHALL return a summary without the full diff data (performance optimization).
7. WHEN `getCacheStats()` is called THEN it SHALL return the count and age of cached entries.

**Current Coverage:**
- `previewCache.test.ts`: 17 tests for store, get, delete, TTL, cleanup, summary, stats

**Gap Analysis:**
- GAP-22A: No test for cache behavior under memory pressure (large number of concurrent previews)
- GAP-22B: No test for preview cache after server restart (cache is in-memory, all lost)
- GAP-22C: No test for race condition between TTL expiration and execution attempt

---

### REQ-TIP-23: API Endpoints -- Import Routes

**User Story:** As a QA engineer, I want comprehensive test coverage for all import API endpoints, so that I can verify authentication, authorization, request validation, and response formats.

#### Acceptance Criteria

1. WHEN `GET /api/import/systems` is called THEN it SHALL return both Hill and Sutter systems.
2. WHEN `GET /api/import/systems/:systemId` is called with a valid systemId THEN it SHALL return the system configuration.
3. WHEN `GET /api/import/systems/:systemId` is called with an invalid systemId THEN it SHALL return 404.
4. WHEN `POST /api/import/sheets` is called THEN it SHALL return filtered sheet names with validation metadata.
5. WHEN `POST /api/import/preview` is called THEN it SHALL run the full pipeline: parse, conflict detect, map, transform, validate, diff, cache.
6. WHEN `POST /api/import/preview` detects conflicts THEN it SHALL short-circuit and return `hasConflicts: true` with the conflict report.
7. WHEN `POST /api/import/execute` is called with a valid preview ID THEN it SHALL execute the import and return stats.
8. WHEN any import endpoint is called without authentication THEN it SHALL return 401.
9. WHEN any import endpoint is called without patient data access THEN it SHALL return 403.
10. WHEN `POST /api/import/preview` for Sutter is called without a sheetName THEN it SHALL return 400 with MISSING_SHEET_NAME.
11. WHEN `POST /api/import/preview` for Sutter is called with a non-existent sheetName THEN it SHALL return 400 with INVALID_SHEET_NAME.

**Current Coverage:**
- `import.routes.test.ts`: 52 tests for all endpoints, auth, validation, error handling

**Gap Analysis:**
- GAP-23A: No test for preview endpoint with file larger than the Multer upload limit
- GAP-23B: No test for concurrent preview requests from the same user
- GAP-23C: No test for execute endpoint when preview was generated by a different user
- GAP-23D: No test for the full pipeline integration (file upload through execution) as a single Jest test

---

### REQ-TIP-24: API Endpoints -- Mapping Routes

**User Story:** As a QA engineer, I want comprehensive test coverage for all mapping management API endpoints, so that I can verify CRUD operations, validation, audit logging, and access control.

#### Acceptance Criteria

1. WHEN `GET /api/import/mappings/:systemId` is called THEN it SHALL return merged config (DB overrides + JSON seed).
2. WHEN `PUT /api/import/mappings/:systemId/columns` is called with valid changes THEN it SHALL update DB overrides and return the updated config.
3. WHEN `PUT /api/import/mappings/:systemId/actions` is called with valid patterns THEN it SHALL update action overrides.
4. WHEN `DELETE /api/import/mappings/:systemId/reset` is called THEN it SHALL delete all overrides for that system.
5. WHEN `POST /api/import/mappings/:systemId/resolve` is called with resolutions THEN it SHALL save and return updated config.
6. WHEN any mapping write endpoint is called without ADMIN role THEN it SHALL return 403.
7. WHEN a PUT request includes an invalid regex pattern THEN it SHALL return 400.
8. WHEN a PUT request includes a ReDoS pattern THEN it SHALL return 400.
9. WHEN a PUT request includes a non-existent quality measure THEN it SHALL return 400.
10. WHEN a PUT request includes duplicate sourceColumn entries THEN it SHALL return 400.
11. WHEN a PUT request includes expectedUpdatedAt that does not match THEN it SHALL return 409.

**Current Coverage:**
- `mapping.routes.test.ts`: 42 tests for all endpoints, auth, validation, CRUD

**Gap Analysis:**
- GAP-24A: No test for mapping routes with a system that has no JSON seed file (DB-only overrides)
- GAP-24B: No test for resolve endpoint with an empty resolutions array
- GAP-24C: No test for action override endpoint with pattern that conflicts with an existing pattern

---

### REQ-TIP-25: Reassignment Detection

**User Story:** As a QA engineer, I want comprehensive test coverage for patient reassignment detection during import, so that I can verify the system correctly identifies patients being moved between physicians and requires confirmation.

#### Acceptance Criteria

1. WHEN import data contains a patient currently assigned to a different physician THEN the system SHALL flag the patient as a reassignment candidate.
2. WHEN reassignment is detected THEN the preview SHALL include a reassignment warning with the count of affected patients.
3. WHEN the user acknowledges the reassignment warning and proceeds THEN the import SHALL update the patient's ownerId to the new physician.
4. WHEN the user cancels due to the reassignment warning THEN no changes SHALL be made.
5. WHEN a patient is unassigned (no owner) and is imported THEN it SHALL NOT be treated as a reassignment.
6. WHEN multiple patients are flagged for reassignment THEN each SHALL be listed individually.

**Current Coverage:**
- `reassignment.test.ts`: 21 tests for detection, counting, listing
- `import-reassignment.spec.ts`: 2 Playwright E2E tests for the warning flow

**Gap Analysis:**
- GAP-25A: No test for reassignment when the source physician is a different role (e.g., imported by STAFF for their assigned physician)
- GAP-25B: No test for reassignment combined with merge mode (patient exists under physician A, import targets physician B)
- GAP-25C: Limited E2E coverage (only 2 tests) for the reassignment warning flow

---

## Non-Functional Requirements

### Performance

- NFR-TIP-P1: The Sutter file parser SHALL process a 4,100-row Excel file within 5 seconds on the server. **Current Coverage:** `sutter-performance.test.ts` (5 tests). **Gap:** No performance test for Hill files of comparable size.
- NFR-TIP-P2: The `POST /api/import/sheets` endpoint SHALL return within 2 seconds for files under 5 MB. **Current Coverage:** Not explicitly tested. **Gap:** GAP-P2A -- No performance test for sheets endpoint.
- NFR-TIP-P3: Fuzzy matching for 100 headers against 200 known columns SHALL complete within 500ms. **Current Coverage:** Not explicitly tested. **Gap:** GAP-P3A -- No fuzzy matching performance benchmark test.
- NFR-TIP-P4: The overall preview generation for a single Sutter tab (parse + map + transform + validate + diff) SHALL complete within 10 seconds. **Current Coverage:** Partially tested via integration tests. **Gap:** GAP-P4A -- No explicit timing assertion.
- NFR-TIP-P5: The 5-minute transaction timeout in importExecutor SHALL be sufficient for imports of 4,000+ rows. **Current Coverage:** `sutter-performance.test.ts`. **Gap:** No test under realistic database load conditions.
- NFR-TIP-P6: Header validation SHALL add no more than 1 second to sheet discovery for files under 5 MB with fewer than 15 sheets. **Current Coverage:** Not explicitly tested. **Gap:** GAP-P6A.

### Security

- NFR-TIP-S1: All import endpoints SHALL require authentication (`requireAuth` middleware). **Current Coverage:** Tested in `import.routes.test.ts`.
- NFR-TIP-S2: All import endpoints SHALL require patient data access (`requirePatientDataAccess` middleware). **Current Coverage:** Tested in `import.routes.test.ts`.
- NFR-TIP-S3: PHYSICIAN users SHALL only import to their own patients. **Current Coverage:** Tested in `import-all-roles.spec.ts`.
- NFR-TIP-S4: STAFF users SHALL only import to physicians they are assigned to. **Current Coverage:** Tested in `SheetSelector.test.tsx` and `import-all-roles.spec.ts`.
- NFR-TIP-S5: The `sheetName` parameter SHALL be validated against actual workbook sheet names to prevent path traversal or injection. **Current Coverage:** Tested in `import.routes.test.ts`. **Gap:** GAP-S5A -- No test for XSS payload in sheetName parameter.
- NFR-TIP-S6: Uploaded files SHALL be processed in memory only (Multer memoryStorage). **Current Coverage:** Architecture constraint, not explicitly tested. **Gap:** GAP-S6A -- No test verifying files are not written to disk.
- NFR-TIP-S7: Regex patterns submitted by admins SHALL be validated for ReDoS. **Current Coverage:** Tested in `mapping.routes.test.ts`.
- NFR-TIP-S8: Mapping write endpoints SHALL require ADMIN role. **Current Coverage:** Tested in `mapping.routes.test.ts`.
- NFR-TIP-S9: Mapping changes SHALL be recorded in AuditLog. **Current Coverage:** Tested in `mappingService.test.ts`.
- NFR-TIP-S10: Import operations SHALL be logged in AuditLog with systemId. **Current Coverage:** Not explicitly tested. **Gap:** GAP-S10A -- No test for import audit logging with systemId.

### Reliability

- NFR-TIP-R1: IF the database is unavailable when loading mappings THEN the system SHALL fall back to JSON config files. **Current Coverage:** Tested in `mappingService.test.ts`.
- NFR-TIP-R2: IF a Sutter Excel file has a corrupted sheet THEN the system SHALL return a descriptive error. **Current Coverage:** Tested in `sutter-error-handling.test.ts`.
- NFR-TIP-R3: IF import execution fails mid-transaction THEN the entire import SHALL be rolled back. **Current Coverage:** Partially tested. **Gap:** GAP-R3A -- No test for mid-transaction failure with partial success.
- NFR-TIP-R4: IF the sutter.json file contains a malformed action mapping entry THEN the system SHALL skip that entry and log a warning. **Current Coverage:** Tested in `configLoader.test.ts`.
- NFR-TIP-R5: Unmapped Sutter actions SHALL NOT cause the entire import to fail. **Current Coverage:** Tested in `sutter-integration.test.ts`.
- NFR-TIP-R6: IF a fuzzy matching error occurs for one header THEN remaining headers SHALL continue processing (fail-open). **Current Coverage:** Tested in `conflictDetector.test.ts`.

### Usability

- NFR-TIP-U1: The sheet selector step SHALL appear for ALL systems after file upload (universal behavior). **Current Coverage:** Tested in `SheetSelector.test.tsx` and `import-flow.cy.ts`.
- NFR-TIP-U2: Error messages SHALL use non-technical language. **Current Coverage:** Partially tested. **Gap:** GAP-U2A -- No systematic test of all user-facing error messages for technical jargon.
- NFR-TIP-U3: The conflict resolution UI SHALL use color-coded badges for each conflict type. **Current Coverage:** Tested in `ConflictResolutionStep.test.tsx` and `ConflictBanner.test.tsx`.
- NFR-TIP-U4: Import results SHALL display stats in a clear, scannable format. **Current Coverage:** Tested in `ImportResultsDisplay.test.tsx`.

### Accessibility

- NFR-TIP-A1: The sheet selector dropdown SHALL be keyboard-accessible. **Current Coverage:** Tested in `SheetSelector.test.tsx`. **Gap:** GAP-A1A -- No E2E keyboard navigation test.
- NFR-TIP-A2: The unmapped actions banner SHALL use `role="alert"` or `role="status"`. **Current Coverage:** Tested in `UnmappedActionsBanner.test.tsx`.
- NFR-TIP-A3: The conflict resolution step SHALL have aria-live regions for progress announcements. **Current Coverage:** Tested in `ConflictResolutionStep.test.tsx`.
- NFR-TIP-A4: Invalid sheets note SHALL use `role="note"` or `aria-live="polite"`. **Current Coverage:** Tested in `SheetSelector.test.tsx`.
- NFR-TIP-A5: The file dropzone SHALL be operable via keyboard. **Current Coverage:** Not explicitly tested. **Gap:** GAP-A5A -- No keyboard-only file upload test.

---

## Proposed New Test Cases to Fill Gaps

### Priority 1: Critical Gaps (Functional correctness risks)

| ID | Gap | Proposed Test | Framework | Area |
|----|-----|--------------|-----------|------|
| NEW-01 | GAP-11A | Test transaction rollback when database constraint violation occurs after N successful inserts | Jest | importExecutor |
| NEW-02 | GAP-09A | Test re-import idempotency: import same Hill file twice, verify all SKIP in second run | Jest | diffCalculator integration |
| NEW-03 | GAP-09B | Test diff calculation with Sutter data containing non-null notes and tracking1 fields | Jest | diffCalculator |
| NEW-04 | GAP-14C | Test Sutter row with unrecognized Request Type (not AWV/APV/HCC/Quality) is skipped with error | Jest | sutterDataTransformer |
| NEW-05 | GAP-18A | Test preview expiration: generate preview, wait/mock TTL, attempt execute, verify error | Jest | previewCache + importExecutor |
| NEW-06 | GAP-09C | Test merge behavior when existing measure status is null or empty string | Jest | diffCalculator |
| NEW-07 | GAP-07B | Test conflict detection with Sutter config (long-format specific) | Jest | conflictDetector |
| NEW-08 | GAP-20A | Test validation with Sutter-specific requestType list ("Chronic DX", "Screening") | Jest | validator |
| NEW-09 | GAP-20B | Test row number offset calculation for Sutter files (headerRow=3 means data starts at 1-indexed row 5) | Jest | validator/errorReporter |
| NEW-10 | GAP-23D | Test full pipeline integration: file upload through preview through execution | Jest | import.routes integration |

### Priority 2: Edge Cases and Boundary Conditions

| ID | Gap | Proposed Test | Framework | Area |
|----|-----|--------------|-----------|------|
| NEW-11 | GAP-01A | Test password-protected Excel file returns descriptive error | Jest | fileParser |
| NEW-12 | GAP-01B | Test merged cells in header row handling | Jest | fileParser |
| NEW-13 | GAP-02C | Test Hill multi-tab file (unexpected scenario) -- all tabs get header validation | Jest | import.routes |
| NEW-14 | GAP-13C | Test Hill file with Q1 but no Q2 for a measure (or vice versa) | Jest | columnMapper |
| NEW-15 | GAP-14A | Test action text matching order (first regex match wins when ambiguous) | Jest | actionMapper |
| NEW-16 | GAP-14B | Test Measure Details with 3+ semicolon-separated parts | Jest | measureDetailsParser |
| NEW-17 | GAP-19A | Test M/D/YY format with century boundary ambiguity (1/1/30) | Jest | dataTransformer |
| NEW-18 | GAP-19B | Test extremely large Excel serial numbers producing future dates | Jest | fileParser/dateParser |
| NEW-19 | GAP-22C | Test race condition: TTL expires between getPreview() and executeImport() calls | Jest | previewCache |
| NEW-20 | GAP-17A | Test physician auto-match when multiple physicians share last name | Vitest | SheetSelector |
| NEW-21 | GAP-05C | Test fuzzy matching when year-stripped text becomes empty | Jest | fuzzyMatcher |
| NEW-22 | GAP-04C | Test mapping behavior when DB override changes column from MEASURE to IGNORED | Jest | mappingService |

### Priority 3: Security and Performance

| ID | Gap | Proposed Test | Framework | Area |
|----|-----|--------------|-----------|------|
| NEW-23 | GAP-S5A | Test XSS payload in sheetName parameter is sanitized | Jest | import.routes |
| NEW-24 | GAP-S10A | Test import audit logging includes systemId field | Jest | importExecutor |
| NEW-25 | GAP-P2A | Test sheets endpoint performance for files under 5MB (< 2 seconds) | Jest | import.routes |
| NEW-26 | GAP-P3A | Test fuzzy matching performance: 100 headers vs 200 columns within 500ms | Jest | fuzzyMatcher |
| NEW-27 | GAP-05A | Performance benchmark: fuzzy matching with realistic column counts | Jest | fuzzyMatcher |
| NEW-28 | GAP-06D | Test ReDoS pattern submitted via mapping management UI is rejected | Cypress | mapping-management |

### Priority 4: UI/UX and E2E Gaps

| ID | Gap | Proposed Test | Framework | Area |
|----|-----|--------------|-----------|------|
| NEW-29 | GAP-10A | Verify action override is NOT available in preview (document as not-yet-implemented) | Vitest | PreviewChangesTable |
| NEW-30 | GAP-16B | Test drag-and-drop file upload in E2E | Cypress | import-flow |
| NEW-31 | GAP-16C | Test remove file and re-upload different file | Cypress | import-flow |
| NEW-32 | GAP-08C | Test DUPLICATE and AMBIGUOUS conflict resolution in E2E | Playwright | import-conflict-resolution |
| NEW-33 | GAP-25C | Add more E2E tests for reassignment warning flow (currently only 2) | Playwright | import-reassignment |
| NEW-34 | GAP-12A | Test Socket.IO broadcast after successful import execution | Jest | import.routes |
| NEW-35 | GAP-17B | Test tab names with special characters in E2E | Playwright | sutter-import |
| NEW-36 | GAP-18B | Test double-submission prevention during execution | Vitest | ImportPreviewPage |
| NEW-37 | GAP-A5A | Test file dropzone keyboard operability | Cypress | import-flow |
| NEW-38 | GAP-15B | Test insurance group filter combined with status filter and name search | Cypress | insurance-group-filter |

### Priority 5: Not-Yet-Implemented Features (Document for Future)

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| FUTURE-01 | Action override in PreviewChangesTable (change SKIP to UPDATE) | NOT IMPLEMENTED | PreviewChangesTable is currently read-only; action type badges are display-only |
| FUTURE-02 | Row-level detail expansion in preview table | NOT IMPLEMENTED | No expand/collapse per-row detail in current PreviewChangesTable |
| FUTURE-03 | Preview pagination for large datasets (1000+ rows) | NOT IMPLEMENTED | Currently renders all rows; may need virtualization for performance |

---

## Assumptions and Constraints

### Assumptions

- ASM-TIP-1: The current test counts are approximate, based on `it()` and `test()` pattern matching in source files. Actual executed test count may differ due to conditional tests, test.skip, or parameterized tests.
- ASM-TIP-2: Backend Jest tests run with `--experimental-vm-modules` for ESM support, which may cause some mocking limitations (route tests can only test auth 401, not full authenticated flows).
- ASM-TIP-3: Cypress is required for AG Grid dropdown interactions because Playwright cannot reliably commit AG Grid dropdown selections.
- ASM-TIP-4: The preview cache is in-memory and lost on server restart; this is a known constraint, not a bug requiring test coverage.
- ASM-TIP-5: The "action override" feature (changing SKIP to UPDATE in the preview) is NOT currently implemented. The PreviewChangesTable is read-only. Any tests for this behavior should be deferred to when the feature is implemented.
- ASM-TIP-6: The "row-level detail expansion" feature in the preview table is NOT currently implemented. Tests should be deferred.
- ASM-TIP-7: Performance tests may need to be marked as `.skip` in CI environments due to variable machine speed.

### Constraints

- CON-TIP-1: Jest ESM mocking limitations prevent testing full authenticated API flows in route tests; auth middleware is mocked.
- CON-TIP-2: Playwright E2E tests require a running dev server (frontend + backend + database).
- CON-TIP-3: Cypress E2E tests require a running dev server with seeded test data.
- CON-TIP-4: Visual browser review (MCP Playwright, Layer 5) is MANDATORY for any UI changes resulting from gap fixes but cannot be automated in CI.
- CON-TIP-5: The in-memory preview cache makes it impossible to test cache persistence across server restarts.
- CON-TIP-6: SheetJS library behavior for corrupted/password-protected files may vary by version; tests should use fixture files.

---

## Edge Cases Consolidated from All Specs

### File Parsing Edge Cases

| ID | Edge Case | Covered? | Test File |
|----|-----------|----------|-----------|
| EC-FP-1 | File with all invalid rows | Yes | `validator.test.ts` |
| EC-FP-2 | File with only headers (no data) | Yes | `fileParser.test.ts` |
| EC-FP-3 | Excel file with multiple sheets (Hill) | Partial | GAP-02C |
| EC-FP-4 | CSV file (single sheet) | Yes | `fileParser.test.ts` |
| EC-FP-5 | Password-protected file | No | GAP-01A |
| EC-FP-6 | Merged cells in header | No | GAP-01B |
| EC-FP-7 | Very large workbook (20+ sheets) | No | GAP-02A |
| EC-FP-8 | File with zero valid tabs | Yes | `sutter-error-handling.test.ts` |

### Column Mapping Edge Cases

| ID | Edge Case | Covered? | Test File |
|----|-----------|----------|-----------|
| EC-CM-1 | Empty or whitespace-only header | Yes | `fuzzyMatcher.test.ts` |
| EC-CM-2 | Duplicate fuzzy match targets | Yes | `conflictDetector.test.ts` |
| EC-CM-3 | Case-only change treated as exact | Yes | `fuzzyMatcher.test.ts` |
| EC-CM-4 | Q1/Q2 suffix stripping | Yes | `conflictDetector.test.ts` |
| EC-CM-5 | Medical abbreviation expansion | Yes | `fuzzyMatcher.test.ts` |
| EC-CM-6 | DB override changes column type | No | GAP-04C |
| EC-CM-7 | JSON seed file missing but DB overrides exist | Yes | `mappingService.test.ts` |

### Sutter-Specific Edge Cases

| ID | Edge Case | Covered? | Test File |
|----|-----------|----------|-----------|
| EC-SI-1 | Empty physician tab | Yes | `sutter-error-handling.test.ts` |
| EC-SI-2 | Patient in multiple tabs | Partial | Integration test |
| EC-SI-3 | Tab name with special characters | Yes | `sutter-edge-cases.test.ts` |
| EC-SI-4 | Same patient, multiple actions, same tab | Yes | `sutterDataTransformer.test.ts` |
| EC-SI-5 | Action text with trailing whitespace/line breaks | Yes | `actionMapper.test.ts` |
| EC-SI-6 | Mixed request types in same tab | Yes | `sutter-integration.test.ts` |
| EC-SI-7 | Excel serial in non-DOB column | Yes | `sutter-edge-cases.test.ts` |
| EC-SI-8 | Large Sutter file (4,000+ rows) | Yes | `sutter-performance.test.ts` |
| EC-SI-9 | File with only skip tabs | Yes | `sutter-error-handling.test.ts` |
| EC-SI-10 | Hill file uploaded with Sutter selected | Partial | `sutter-edge-cases.test.ts` |
| EC-SI-11 | Sutter file uploaded with Hill selected | Partial | Implicit |
| EC-SI-12 | Vaccine action text variations | Yes | `actionMapper.test.ts` |
| EC-SI-13 | Invalid date in Measure Details | Yes | `measureDetailsParser.test.ts` |
| EC-SI-14 | Re-import same Sutter file | No | GAP-09A |
| EC-SI-15 | Concurrent Sutter and Hill imports | No | GAP-14D |

### Conflict Resolution Edge Cases

| ID | Edge Case | Covered? | Test File |
|----|-----------|----------|-----------|
| EC-CR-1 | Partial resolution (not all resolved) | Yes | `ConflictResolutionStep.test.tsx` |
| EC-CR-2 | Session timeout during resolution | No | GAP-08B |
| EC-CR-3 | Concurrent mapping edit (409) | Yes | `mappingService.test.ts` |
| EC-CR-4 | Wrong file detection (<10% match) | Yes | `conflictDetector.test.ts` |
| EC-CR-5 | ADMIN+PHYSICIAN dual role | Yes | `ConflictResolutionStep.test.tsx` |

### Import Execution Edge Cases

| ID | Edge Case | Covered? | Test File |
|----|-----------|----------|-----------|
| EC-IE-1 | Preview not found/expired | Yes | `importExecutor.test.ts` |
| EC-IE-2 | Transaction rollback on failure | Partial | GAP-11A |
| EC-IE-3 | Import same file twice (idempotent) | No | GAP-09A |
| EC-IE-4 | Concurrent execution for same physician | No | GAP-11B |
| EC-IE-5 | Database connection lost mid-transaction | No | GAP-11C |

---

## Summary of Coverage Gaps

### By Priority

| Priority | Count | Description |
|----------|-------|-------------|
| P1 -- Critical | 10 | Functional correctness risks (rollback, idempotency, Sutter-specific validation) |
| P2 -- Edge Cases | 12 | Boundary conditions (password files, merged cells, century ambiguity, race conditions) |
| P3 -- Security/Perf | 6 | Security hardening (XSS, audit logging) and performance benchmarks |
| P4 -- UI/UX/E2E | 10 | E2E gaps (drag-drop, reassignment, keyboard accessibility) |
| P5 -- Future | 3 | Not-yet-implemented features (action override, row detail expansion, pagination) |
| **Total** | **41** | **38 new tests proposed + 3 documented-for-future** |

### By Framework

| Framework | Proposed New Tests |
|-----------|-------------------|
| Jest (Backend) | 22 |
| Vitest (Frontend) | 3 |
| Playwright (E2E) | 4 |
| Cypress (E2E) | 6 |
| Documented-for-Future | 3 |

### By Area

| Area | Current Tests | Proposed New | Total After |
|------|-------------|-------------|-------------|
| File Parsing | ~53 | 4 | ~57 |
| Column Mapping | ~31 | 3 | ~34 |
| Fuzzy Matching | ~56 | 3 | ~59 |
| Conflict Detection | ~64 | 2 | ~66 |
| Conflict Resolution UI | ~44 | 1 | ~45 |
| Diff Calculator | ~93 | 3 | ~96 |
| Validation | ~47 | 3 | ~50 |
| Import Executor | ~31 | 3 | ~34 |
| Preview Cache | ~17 | 2 | ~19 |
| Import Routes | ~52 | 4 | ~56 |
| Mapping Routes | ~42 | 2 | ~44 |
| Mapping Management UI | ~37 | 1 | ~38 |
| Sheet Selector | ~58 | 1 | ~59 |
| Import Page UI | ~40 | 3 | ~43 |
| Import Results Display | ~15 | 2 | ~17 |
| Insurance Group | ~12 | 1 | ~13 |
| Reassignment | ~23 | 2 | ~25 |
| Sutter Integration | ~67 | 1 | ~68 |
| Performance | ~5 | 2 | ~7 |

---

## Dependencies

- **Authentication (existing)**: Required to access import page and API endpoints
- **Patient Ownership (existing)**: Physician assignment and reassignment detection
- **Duplicate Detection (existing)**: Post-import duplicate flag sync
- **Insurance Group Feature (existing)**: `insuranceGroup` field on Patient model, filter dropdown
- **Import Pipeline Services (existing)**: All 17 service files in `backend/src/services/import/`
- **Import Routes (existing)**: `import.routes.ts`, `mapping.routes.ts`
- **SheetJS (XLSX) library (existing)**: Excel parsing and multi-sheet API
- **Prisma ORM (existing)**: Database access for import execution and mapping persistence
- **Socket.IO (existing)**: Real-time broadcast after import execution
- **AG Grid (existing)**: Grid display after import
