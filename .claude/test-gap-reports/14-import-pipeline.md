# Test Gap Analysis: Import Pipeline (Requirement Area 14)

**Date:** 2026-03-02
**Scope:** File parsing, column mapping, data transformation, validation, diff calculation, preview, execution, smart column mapping, conflict resolution, Sutter import, import bug fixes
**Regression Plan Sections:** 14-23, 36, 38-42, 48, 53

---

## Summary

- **Total Use Cases Identified:** 178
- **Fully Covered:** 153
- **Partially Covered:** 17
- **Not Covered:** 8
- **Coverage Score:** 86% (fully covered) / 96% (fully + partially)

---

## Test Inventory (Current)

### Backend — Jest (25 files, ~883 tests)

| File | Test Count | Scope |
|------|-----------|-------|
| fileParser.test.ts | 56 | CSV/Excel parsing, title row detection, column validation, sheet headers |
| columnMapper.test.ts | 13 | Hill Q1/Q2 mapping, patient columns, skip columns, unmapped |
| dataTransformer.test.ts | 25 | Wide-to-long, compliance logic, phone normalization, status date |
| validator.test.ts | 50 | Required fields, date validation, duplicates, deduplication, canProceed |
| errorReporter.test.ts | 25 | Error formatting, row numbers, severity, member name inclusion |
| diffCalculator.test.ts | 94 | Merge/replace logic, INSERT/UPDATE/SKIP/BOTH/DELETE, insurance scoping |
| mergeLogic.test.ts | 12 | applyMergeLogic unit tests |
| importExecutor.test.ts | 40 | Execute, INSERT/UPDATE/SKIP/BOTH/DELETE, rollback, reassignment |
| previewCache.test.ts | 19 | TTL, store/retrieve/delete, expiry |
| configLoader.test.ts | 47 | System registry, config loading, required columns, merged config |
| fuzzyMatcher.test.ts | 59 | Normalize, Jaro-Winkler, Jaccard, composite, fuzzyMatch, abbreviations |
| conflictDetector.test.ts | 65 | All conflict types, wrong file, summary, edge cases, suggestions |
| mappingService.test.ts | 32 | Load merged config, save overrides, reset, resolve conflicts |
| actionMapper.test.ts | 57 | 11 regex patterns, fuzzy fallback, skip actions, cache, edge cases |
| sutterColumnMapper.test.ts | 18 | Sutter column mapping, patient/data columns, unmapped |
| sutterDataTransformer.test.ts | 52 | Long format transform, request types, action mapping, dedup merge |
| measureDetailsParser.test.ts | 43 | Date extraction, semicolons, BP, HbA1c, comma dates, edge cases |
| sutter-integration.test.ts | 67 | Full pipeline with Excel fixtures (8 scenarios) |
| sutter-edge-cases.test.ts | 29 | Header validation, skipTabs, special chars, empty tabs |
| sutter-error-handling.test.ts | 15 | Error codes, missing config, malformed data |
| sutter-import-flow.test.ts | 14 | End-to-end flow tests |
| sutter-performance.test.ts | 5 | Large dataset processing |
| integration.test.ts | 14 | Hill pipeline end-to-end |
| reassignment.test.ts | 21 | Reassignment detection and handling |
| reassignment-merge.test.ts | 11 | Insurance scoping, merge reassign, dedup |

### Backend — Jest (Route tests, 2 files, ~96 tests)

| File | Test Count | Scope |
|------|-----------|-------|
| import.routes.test.ts | 54 | All /api/import/* endpoints |
| mapping.routes.test.ts | 42 | All /api/import/mappings/* endpoints |

### Frontend — Vitest (12 files, ~302 tests)

| File | Test Count | Scope |
|------|-----------|-------|
| ImportPage.test.tsx | 40 | Page rendering, tab navigation, mode selection, role handling |
| ImportPreviewPage.test.tsx | 33 | Preview display, summary cards, action filters, execute |
| MappingManagementPage.test.tsx | 18 | System selector, edit mode, reset, non-admin block |
| SheetSelector.test.tsx | 59 | Tab selector, physician dropdown, role-based behavior |
| ConflictResolutionStep.test.tsx | 27 | Admin resolution form, save, cancel, progress, ACCEPT_SUGGESTION |
| ConflictBanner.test.tsx | 17 | Non-admin read-only banner, copy details, role=alert |
| PreviewChangesTable.test.tsx | 21 | Changes table, dynamic columns, empty state |
| PreviewSummaryCards.test.tsx | 18 | Summary card rendering, counts, colors |
| UnmappedActionsBanner.test.tsx | 17 | Unmapped actions display, expand/collapse |
| ImportResultsDisplay.test.tsx | 15 | Validation results display |
| MappingTable.test.tsx | 19 | Mapping table rendering, edit mode |
| ActionPatternTable.test.tsx | 18 | Action pattern display, regex validation |

### Cypress E2E (5 files, ~84 tests)

| File | Test Count | Scope |
|------|-----------|-------|
| import-flow.cy.ts | 48 | Full import workflow, preview, execute, error handling |
| import-conflict-admin.cy.ts | 8 | Admin conflict resolution |
| import-conflict-nonadmin.cy.ts | 6 | Non-admin conflict banner |
| mapping-management.cy.ts | 9 | Admin mapping management page |
| insurance-group-filter.cy.ts | 13 | Insurance group filtering |

### Playwright E2E (8 files, ~71 tests)

| File | Test Count | Scope |
|------|-----------|-------|
| sutter-import.spec.ts | 11 | Sutter import workflow |
| sutter-import-visual.spec.ts | 22 | Sutter visual review |
| sutter-import-edge-cases.spec.ts | 5 | Sutter edge cases |
| sutter-import-errors.spec.ts | 5 | Sutter error states |
| smart-column-mapping.spec.ts | 8 | Mapping management page |
| import-all-roles.spec.ts | 13 | Role-based import access |
| import-conflict-resolution.spec.ts | 6 | Conflict resolution E2E |
| import-reassignment.spec.ts | 1 | Reassignment warning |

### Grand Total: ~1,436 tests across import pipeline

---

## Detailed Use Case Analysis

### Category A: File Parsing (11 Use Cases)

#### UC-A1: CSV File Parsing
**Description:** Parse a CSV file with header row detection, extracting headers, rows, and metadata.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | Multiple CSV parsing tests |
| Cypress | Covered | import-flow.cy.ts | Upload CSV, verify parse results |
**Verdict: FULLY COVERED**

#### UC-A2: Excel (.xlsx) File Parsing
**Description:** Parse Excel files, detecting and skipping title/report rows, extracting headers from correct row.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | Excel parsing, title row skip tests |
| Cypress | Covered | import-flow.cy.ts | Excel upload tests |
**Verdict: FULLY COVERED**

#### UC-A3: Title Row Detection and Skip
**Description:** Detect non-data title/report rows at top of Excel files and skip them.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | isTitleRow() tests |
**Verdict: FULLY COVERED**

#### UC-A4: Column Header Validation
**Description:** Validate that required columns (Patient, DOB) are present after parsing.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | validateRequiredColumns() |
| Cypress | Covered | import-flow.cy.ts | Column validation display |
**Verdict: FULLY COVERED**

#### UC-A5: File Metadata Display
**Description:** Show parsed file metadata (name, type, row count, column count).
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Vitest | Covered | ImportPage.test.tsx | Metadata display |
| Cypress | Covered | import-flow.cy.ts | Stats display |
**Verdict: FULLY COVERED**

#### UC-A6: Unsupported File Type Rejection
**Description:** Reject non-CSV/Excel files (.txt, .pdf, etc.) with a user-friendly error message.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | Unsupported type tests |
| Cypress | Covered | import-flow.cy.ts | Error handling for .txt |
**Verdict: FULLY COVERED**

#### UC-A7: Empty File Handling
**Description:** Handle files with only headers and no data rows gracefully.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | Headers-only file test |
| Jest | Covered | sutter-integration.test.ts | Headers-only tab |
**Verdict: FULLY COVERED**

#### UC-A8: Corrupt/Password-Protected File Handling
**Description:** Handle corrupt or password-protected Excel files with descriptive error.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No test for corrupt .xlsx |
| E2E | Not tested | - | No E2E test |
**Verdict: NOT COVERED**
**Gap ID: GAP-A8** | Priority: MEDIUM | Recommended: Jest test with corrupt binary buffer

#### UC-A9: Large File Handling (>10MB)
**Description:** Handle large files without timeout or memory issues.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Partial | sutter-performance.test.ts | Performance tests for large datasets |
| Jest | Not tested | - | No explicit >10MB file size test |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-A9** | Priority: LOW | Large file tests exist but no explicit memory/timeout boundary test

#### UC-A10: Multi-Sheet Workbook Parsing
**Description:** Parse Excel files with multiple sheets, returning sheet names.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | getWorkbookInfo, getSheetNames |
| Jest | Covered | sutter-integration.test.ts | Multi-tab tests |
**Verdict: FULLY COVERED**

#### UC-A11: Encoding Support (UTF-8, special chars)
**Description:** Handle files with special characters and various encodings.
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | sutter-edge-cases.test.ts | Apostrophes, accented chars |
| Jest | Not tested | - | No explicit UTF-16 or BOM handling test |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-A11** | Priority: LOW | UTF-8 special chars tested; UTF-16/BOM not tested

---

### Category B: Column Mapping — Hill (6 Use Cases)

#### UC-B1: Patient Column Mapping (Patient -> memberName, DOB -> memberDob, etc.)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | columnMapper.test.ts | Patient column mapping tests |
**Verdict: FULLY COVERED**

#### UC-B2: Measure Column Mapping (Q1/Q2 Suffix Pairing)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | columnMapper.test.ts | Q1/Q2 pairing tests |
**Verdict: FULLY COVERED**

#### UC-B3: Skip Columns (Age, Sex, MembID, LOB)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | columnMapper.test.ts | Skip column tests |
**Verdict: FULLY COVERED**

#### UC-B4: Unmapped Columns Warning
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | columnMapper.test.ts | Unmapped column tests |
**Verdict: FULLY COVERED**

#### UC-B5: Multiple Columns Grouped to Same Measure (Breast Cancer age brackets)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | columnMapper.test.ts | Grouping tests |
| Jest | Covered | dataTransformer.test.ts | Compliance grouping |
**Verdict: FULLY COVERED**

#### UC-B6: Missing Required Columns Error
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | fileParser.test.ts | Column validation |
| Cypress | Covered | import-flow.cy.ts | Missing column display |
**Verdict: FULLY COVERED**

---

### Category C: Smart Column Mapping — Fuzzy Matching (8 Use Cases)

#### UC-C1: Exact Match (Normalized, Case-Insensitive)
**Test Coverage:** Jest: fuzzyMatcher.test.ts, conflictDetector.test.ts
**Verdict: FULLY COVERED**

#### UC-C2: Fuzzy Matching (Jaro-Winkler + Jaccard Composite Scoring)
**Test Coverage:** Jest: fuzzyMatcher.test.ts (59 tests covering all scoring functions)
**Verdict: FULLY COVERED**

#### UC-C3: Abbreviation Expansion (32+ medical abbreviations)
**Test Coverage:** Jest: fuzzyMatcher.test.ts (8 abbreviation tests)
**Verdict: FULLY COVERED**

#### UC-C4: Q1/Q2/E Suffix Stripping Before Matching
**Test Coverage:** Jest: fuzzyMatcher.test.ts, conflictDetector.test.ts (5 suffix tests)
**Verdict: FULLY COVERED**

#### UC-C5: Top-3 Results Cap with Threshold
**Test Coverage:** Jest: fuzzyMatcher.test.ts (top-3, threshold enforcement)
**Verdict: FULLY COVERED**

#### UC-C6: Conflict Detection — All 8 Conflict Types (EXACT, CHANGED, NEW, MISSING, DUPLICATE, AMBIGUOUS, WRONG_FILE, INACTIVE)
**Test Coverage:** Jest: conflictDetector.test.ts (65 tests, all types)
**Verdict: FULLY COVERED**

#### UC-C7: Wrong File Detection (<10% Match Rate)
**Test Coverage:** Jest: conflictDetector.test.ts (4 wrong-file tests)
**Verdict: FULLY COVERED**

#### UC-C8: Per-Header Fail-Open Error Recovery
**Test Coverage:** Jest: conflictDetector.test.ts (fail-open tests)
**Verdict: FULLY COVERED**

---

### Category D: Smart Column Mapping — Conflict Resolution UI (11 Use Cases)

#### UC-D1: Admin Sees Conflict Resolution Step with Dropdowns
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx, Cypress: import-conflict-admin.cy.ts, Playwright: import-conflict-resolution.spec.ts
**Verdict: FULLY COVERED**

#### UC-D2: Save Button Enabled Only When All Conflicts Resolved
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx, Cypress: import-conflict-admin.cy.ts
**Verdict: FULLY COVERED**

#### UC-D3: Save Triggers API Call and Auto-Resubmit Preview
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx, Playwright: import-conflict-resolution.spec.ts
**Verdict: FULLY COVERED**

#### UC-D4: Cancel Resets File and Conflicts
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx, Cypress: import-conflict-admin.cy.ts, Playwright: import-conflict-resolution.spec.ts
**Verdict: FULLY COVERED**

#### UC-D5: Non-Admin Sees Read-Only ConflictBanner
**Test Coverage:** Vitest: ConflictBanner.test.tsx (17 tests), Cypress: import-conflict-nonadmin.cy.ts (6 tests)
**Verdict: FULLY COVERED**

#### UC-D6: Progress Tracking (Aria-Live Updates)
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx, Cypress: import-conflict-admin.cy.ts
**Verdict: FULLY COVERED**

#### UC-D7: ACCEPT_SUGGESTION Auto-Population
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx
**Verdict: FULLY COVERED**

#### UC-D8: Loading and Error States (Including 409 Optimistic Lock)
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx (4 error tests)
**Verdict: FULLY COVERED**

#### UC-D9: DUPLICATE and AMBIGUOUS Resolution
**Test Coverage:** Vitest: ConflictResolutionStep.test.tsx (3 tests)
**Verdict: FULLY COVERED**

#### UC-D10: Role-Based Import Flow (All 4 Roles)
**Test Coverage:** Playwright: import-all-roles.spec.ts (13 tests)
**Verdict: FULLY COVERED**

#### UC-D11: Copy Details to Clipboard (Non-Admin)
**Test Coverage:** Vitest: ConflictBanner.test.tsx
**Verdict: FULLY COVERED**

---

### Category E: Smart Column Mapping — Admin Mapping Management (12 Use Cases)

#### UC-E1: System Selector Loads Config
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright: smart-column-mapping.spec.ts, Cypress: mapping-management.cy.ts
**Verdict: FULLY COVERED**

#### UC-E2: Hill Column Tables (Patient + Measure, No Action Patterns)
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright, Cypress
**Verdict: FULLY COVERED**

#### UC-E3: Sutter Action Pattern Table
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright: smart-column-mapping.spec.ts
**Verdict: FULLY COVERED**

#### UC-E4: Edit Mode Toggle
**Test Coverage:** Vitest, Playwright, Cypress
**Verdict: FULLY COVERED**

#### UC-E5: Add Mapping
**Test Coverage:** Cypress: mapping-management.cy.ts, Playwright: smart-column-mapping.spec.ts
**Verdict: FULLY COVERED**

#### UC-E6: Reset to Defaults
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright: smart-column-mapping.spec.ts
**Verdict: FULLY COVERED**

#### UC-E7: Default Configuration Banner
**Test Coverage:** Vitest, Cypress
**Verdict: FULLY COVERED**

#### UC-E8: Last Modified Metadata
**Test Coverage:** Vitest, Playwright, Cypress
**Verdict: FULLY COVERED**

#### UC-E9: Non-Admin Access Control
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright: smart-column-mapping.spec.ts
**Verdict: FULLY COVERED**

#### UC-E10: Optimistic Locking (409 Conflict on Concurrent Edit)
**Test Coverage:** Jest: mappingService.test.ts
**Verdict: FULLY COVERED**

#### UC-E11: Audit Log Entries for Mapping Changes
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | mappingService.test.ts | Audit log verified on save/reset |
| E2E | Not tested | - | No E2E verification of audit log content |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-E11** | Priority: LOW | Backend tests verify audit log creation; no E2E verification

#### UC-E12: ReDoS Protection for Regex Patterns
**Test Coverage:** Jest: mappingService.test.ts, actionMapper.test.ts
**Verdict: FULLY COVERED**

---

### Category F: Data Transformation — Hill (9 Use Cases)

#### UC-F1: Wide-to-Long Format Transformation
**Test Coverage:** Jest: dataTransformer.test.ts (multiple tests)
**Verdict: FULLY COVERED**

#### UC-F2: Empty Measure Columns Skipped (No Row Generated)
**Test Coverage:** Jest: dataTransformer.test.ts
**Verdict: FULLY COVERED**

#### UC-F3: Status Date = Import Date for New Records
**Test Coverage:** Jest: dataTransformer.test.ts
**Verdict: FULLY COVERED**

#### UC-F4: Phone Number Normalization ((555) 123-4567 format)
**Test Coverage:** Jest: dataTransformer.test.ts
**Verdict: FULLY COVERED**

#### UC-F5: Date Parsing — Multiple Formats (MM/DD/YYYY, M/D/YY, YYYY-MM-DD, Excel serial)
**Test Coverage:** Jest: fileParser.test.ts (date parsing tests)
**Verdict: FULLY COVERED**

#### UC-F6: Compliance Logic — "Any Non-Compliant Wins"
**Test Coverage:** Jest: dataTransformer.test.ts (all/any compliant/non-compliant combinations)
**Verdict: FULLY COVERED**

#### UC-F7: Case-Insensitive Compliance Matching (COMPLIANT, C, Yes, NC, No)
**Test Coverage:** Jest: dataTransformer.test.ts
**Verdict: FULLY COVERED**

#### UC-F8: Patients With No Measures Tracked Separately
**Test Coverage:** Jest: dataTransformer.test.ts, Vitest: ImportPage.test.tsx
**Verdict: FULLY COVERED**

#### UC-F9: statusDateSource Tracking (file vs default)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Partial | dataTransformer.test.ts | statusDate set to import date tested; explicit statusDateSource field tracking less clear |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-F9** | Priority: LOW | Core behavior tested; metadata tracking field less explicit

---

### Category G: Validation (10 Use Cases)

#### UC-G1: Missing Member Name — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G2: Missing DOB — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G3: Invalid DOB Format — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G4: Missing Request Type — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G5: Invalid Request Type — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G6: Missing Quality Measure — Blocking Error
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G7: Invalid Quality Measure for Request Type — Warning
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G8: Missing Measure Status — Warning
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G9: Duplicate Detection Within Import
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-G10: Error Deduplication Per Patient+Field
**Test Coverage:** Jest: validator.test.ts, errorReporter.test.ts
**Verdict: FULLY COVERED**

---

### Category H: Error Reporting (7 Use Cases)

#### UC-H1: Error Message Includes Row Number and Member Name
**Test Coverage:** Jest: errorReporter.test.ts
**Verdict: FULLY COVERED**

#### UC-H2: Error Count Display (Red Background)
**Test Coverage:** Jest: errorReporter.test.ts, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-H3: Warning Count Display (Yellow Background)
**Test Coverage:** Jest: errorReporter.test.ts, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-H4: Duplicate Groups Display (Orange Background)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | errorReporter.test.ts | Group formatting |
| E2E | Not tested | - | Duplicate groups UI display not E2E tested |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-H4** | Priority: MEDIUM | Backend formats correctly; no E2E test verifying orange UI section

#### UC-H5: Validation Summary (success/warning/error status)
**Test Coverage:** Jest: validator.test.ts, Vitest: ImportPage.test.tsx
**Verdict: FULLY COVERED**

#### UC-H6: canProceed Flag Logic
**Test Coverage:** Jest: validator.test.ts
**Verdict: FULLY COVERED**

#### UC-H7: Row Numbers Reference Original Spreadsheet Rows (Title Row Offset)
**Test Coverage:** Jest: errorReporter.test.ts, validator.test.ts, fileParser.test.ts
**Verdict: FULLY COVERED**

---

### Category I: Diff Calculation / Preview (14 Use Cases)

#### UC-I1: Merge Mode — INSERT (New Patient + Measure)
**Test Coverage:** Jest: diffCalculator.test.ts, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-I2: Merge Mode — UPDATE (Upgrade Non-Compliant to Compliant)
**Test Coverage:** Jest: diffCalculator.test.ts
**Verdict: FULLY COVERED**

#### UC-I3: Merge Mode — SKIP (Both Compliant)
**Test Coverage:** Jest: diffCalculator.test.ts
**Verdict: FULLY COVERED**

#### UC-I4: Merge Mode — SKIP (Both Non-Compliant)
**Test Coverage:** Jest: diffCalculator.test.ts
**Verdict: FULLY COVERED**

#### UC-I5: Merge Mode — BOTH (Downgrade Detected, Keep Both)
**Test Coverage:** Jest: diffCalculator.test.ts
**Verdict: FULLY COVERED**

#### UC-I6: Replace All Mode (DELETE Existing + INSERT New)
**Test Coverage:** Jest: diffCalculator.test.ts, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-I7: Insurance Group Scoping (Replace All Only Deletes Same Insurance)
**Test Coverage:** Jest: diffCalculator.test.ts, reassignment-merge.test.ts
**Verdict: FULLY COVERED**

#### UC-I8: Preview Cached with 30-Minute TTL
**Test Coverage:** Jest: previewCache.test.ts (19 tests)
**Verdict: FULLY COVERED**

#### UC-I9: Preview Summary Cards (INSERT/UPDATE/SKIP/BOTH/DELETE/Warnings)
**Test Coverage:** Vitest: PreviewSummaryCards.test.tsx (18 tests), Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-I10: Action Filter Cards for Changes Table
**Test Coverage:** Cypress: import-flow.cy.ts (filter tests)
**Verdict: FULLY COVERED**

#### UC-I11: Patient Summary (New vs Existing Counts)
**Test Coverage:** Vitest: ImportPreviewPage.test.tsx
**Verdict: FULLY COVERED**

#### UC-I12: Preview ID Validation (Invalid/Expired)
**Test Coverage:** Jest: previewCache.test.ts, importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-I13: Reassignment Detection and Warning
**Test Coverage:** Jest: reassignment.test.ts (21 tests), Playwright: import-reassignment.spec.ts (1 test)
**Verdict: FULLY COVERED**

#### UC-I14: Configurable Preview Columns Per System (Sutter Shows Extra Columns)
**Test Coverage:** Vitest: PreviewChangesTable.test.tsx (21 tests), ImportPreviewPage.test.tsx
**Verdict: FULLY COVERED**

---

### Category J: Import Execution (12 Use Cases)

#### UC-J1: Execute Import — INSERT New Records
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J2: Execute Import — UPDATE Existing Records
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J3: Execute Import — SKIP (No Changes)
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J4: Execute Import — BOTH (Create Duplicate)
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J5: Execute Import — DELETE (Replace Mode)
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J6: Transaction Rollback on Failure
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J7: Duplicate Flags Synced After Execution
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J8: Preview Deleted After Successful Execution
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J9: Stats Accuracy (inserted, updated, deleted, skipped, bothKept)
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-J10: Reassignment During Execution (Patient Owner Change)
**Test Coverage:** Jest: importExecutor.test.ts (reassignPatientIfNeeded)
**Verdict: FULLY COVERED**

#### UC-J11: Notes and Tracking1 Persisted (Sutter HCC)
**Test Coverage:** Jest: importExecutor.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-J12: Due Date Calculated After INSERT/UPDATE
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

---

### Category K: Sutter-Specific (20 Use Cases)

#### UC-K1: Sutter System Registration (systems.json)
**Test Coverage:** Jest: configLoader.test.ts, import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-K2: Sutter Configuration File (sutter.json)
**Test Coverage:** Jest: configLoader.test.ts
**Verdict: FULLY COVERED**

#### UC-K3: Multi-Tab Excel Parsing (Skip Pattern Filtering)
**Test Coverage:** Jest: sutter-edge-cases.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-K4: Sheet Selection UI (Tab Dropdown + Physician Picker)
**Test Coverage:** Vitest: SheetSelector.test.tsx (59 tests), Playwright: sutter-import.spec.ts
**Verdict: FULLY COVERED**

#### UC-K5: Sutter Column Mapping (Direct, No Q1/Q2)
**Test Coverage:** Jest: sutterColumnMapper.test.ts (18 tests)
**Verdict: FULLY COVERED**

#### UC-K6: Sutter Data Transformation (Long Format, Request Type Routing)
**Test Coverage:** Jest: sutterDataTransformer.test.ts (52 tests)
**Verdict: FULLY COVERED**

#### UC-K7: Action-to-Measure Mapping (11 Regex Patterns)
**Test Coverage:** Jest: actionMapper.test.ts (57 tests)
**Verdict: FULLY COVERED**

#### UC-K8: Unmapped Actions Report
**Test Coverage:** Jest: sutter-integration.test.ts, Vitest: UnmappedActionsBanner.test.tsx
**Verdict: FULLY COVERED**

#### UC-K9: HCC Notes Preserved in Notes Field
**Test Coverage:** Jest: sutterDataTransformer.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-K10: Measure Details Parsing (date;reading, comma dates, BP, HbA1c)
**Test Coverage:** Jest: measureDetailsParser.test.ts (43 tests), sutter-integration.test.ts (12 tests)
**Verdict: FULLY COVERED**

#### UC-K11: AWV+APV Merge to Single AWV Row
**Test Coverage:** Jest: sutterDataTransformer.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-K12: Duplicate Patient+Measure Merge (Latest Date Wins)
**Test Coverage:** Jest: sutterDataTransformer.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-K13: Default "Not Addressed" for Unmapped Actions (Silent, No Warning)
**Test Coverage:** Jest: sutterDataTransformer.test.ts
**Verdict: FULLY COVERED**

#### UC-K14: Insurance Group = 'sutter' for Imported Patients
**Test Coverage:** Jest: diffCalculator.test.ts (insurance group scoping)
**Verdict: FULLY COVERED**

#### UC-K15: Physician-Tab Name Auto-Matching
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: sutter-import-visual.spec.ts
**Verdict: FULLY COVERED**

#### UC-K16: Empty Physician Tab Error
**Test Coverage:** Jest: sutter-error-handling.test.ts, sutter-integration.test.ts
**Verdict: FULLY COVERED**

#### UC-K17: Action Text Trimming (Whitespace, Line Breaks)
**Test Coverage:** Jest: actionMapper.test.ts, sutter-edge-cases.test.ts
**Verdict: FULLY COVERED**

#### UC-K18: Fuzzy Action Matching (Fallback When No Regex Match)
**Test Coverage:** Jest: actionMapper.test.ts (fuzzyMatchAction tests)
**Verdict: FULLY COVERED**

#### UC-K19: Excel Serial Number in DOB (Not in Other Columns)
**Test Coverage:** Jest: sutter-edge-cases.test.ts
**Verdict: FULLY COVERED**

#### UC-K20: Re-Import Same File (All SKIPs in Merge Mode)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No explicit test for re-import all-SKIP scenario |
**Verdict: NOT COVERED**
**Gap ID: GAP-K20** | Priority: MEDIUM | Should verify re-importing identical file produces all SKIPs

---

### Category L: Sheet Validation / Universal Sheet Selector (10 Use Cases)

#### UC-L1: Universal Header-Based Sheet Validation (All Systems)
**Test Coverage:** Jest: configLoader.test.ts (getRequiredColumns), fileParser.test.ts (getSheetHeaders), import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-L2: Required Columns Derived from System Config (Not Hardcoded)
**Test Coverage:** Jest: configLoader.test.ts
**Verdict: FULLY COVERED**

#### UC-L3: API Response Includes invalidSheets with Reasons
**Test Coverage:** Jest: import.routes.test.ts (POST /sheets)
**Verdict: FULLY COVERED**

#### UC-L4: No Valid Tabs Error (NO_VALID_TABS)
**Test Coverage:** Jest: sutter-error-handling.test.ts, import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-L5: Single Tab Shown as Text (Not Dropdown)
**Test Coverage:** Vitest: SheetSelector.test.tsx
**Verdict: FULLY COVERED**

#### UC-L6: Multi-Tab Shows Dropdown
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: sutter-import.spec.ts
**Verdict: FULLY COVERED**

#### UC-L7: Hill File Gets Universal Sheet Selector (Post-Upload)
**Test Coverage:** Vitest: SheetSelector.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-L8: Invalid Sheets Info Note (Expandable)
**Test Coverage:** Vitest: SheetSelector.test.tsx
**Verdict: FULLY COVERED**

#### UC-L9: Case-Insensitive, Whitespace-Trimmed Header Comparison
**Test Coverage:** Jest: configLoader.test.ts, sutter-edge-cases.test.ts
**Verdict: FULLY COVERED**

#### UC-L10: Sheet With Correct Headers But Zero Data Rows
**Test Coverage:** Jest: sutter-integration.test.ts (headers-only tab)
**Verdict: FULLY COVERED**

---

### Category M: Import UI Flow (15 Use Cases)

#### UC-M1: Healthcare System Selection Dropdown
**Test Coverage:** Vitest: ImportPage.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-M2: Import Mode Selection (Merge Default, Replace All with Warning)
**Test Coverage:** Vitest: ImportPage.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-M3: Drag-and-Drop File Upload
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Vitest | Covered | ImportPage.test.tsx | File input tested |
| Cypress | Covered | import-flow.cy.ts | File upload via cy.selectFile |
| E2E | Not tested | - | Drag-and-drop specifically not tested (only click-to-upload) |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-M3** | Priority: LOW | Click upload works; drag-and-drop gesture not E2E tested

#### UC-M4: Preview Page Navigation
**Test Coverage:** Vitest: ImportPreviewPage.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-M5: Execute Button with Loading State
**Test Coverage:** Vitest: ImportPreviewPage.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-M6: Success Screen with Statistics
**Test Coverage:** Vitest: ImportPreviewPage.test.tsx, Cypress: import-flow.cy.ts
**Verdict: FULLY COVERED**

#### UC-M7: Physician Selection for Import Target (Admin/Staff)
**Test Coverage:** Vitest: SheetSelector.test.tsx (59 tests), ImportPage.test.tsx
**Verdict: FULLY COVERED**

#### UC-M8: Replace All Mode Warning Modal
**Test Coverage:** Cypress: import-flow.cy.ts (replace mode warning)
**Verdict: FULLY COVERED**

#### UC-M9: Tab Navigation (Parse/Transform/Validate)
**Test Coverage:** Vitest: ImportPage.test.tsx
**Verdict: FULLY COVERED**

#### UC-M10: Scrollable Error List
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Vitest | Not tested | - | No test for scroll behavior with 20+ errors |
| Cypress | Not tested | - | No E2E test for scrollable error list |
**Verdict: NOT COVERED**
**Gap ID: GAP-M10** | Priority: LOW | Visual/scroll behavior not tested

#### UC-M11: "Patients With No Measures" Section in UI
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Covered | dataTransformer.test.ts | Backend tracking |
| Vitest | Partial | ImportPage.test.tsx | Component tested |
| Cypress | Not tested | - | E2E display of purple section not verified |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-M11** | Priority: LOW | Backend works; E2E visual verification missing

#### UC-M12: Import Step Numbers Dynamically Adjust for Sutter (6 Steps)
**Test Coverage:** Vitest: ImportPage.test.tsx, Playwright: sutter-import.spec.ts
**Verdict: FULLY COVERED**

#### UC-M13: File Removed Returns to Dropzone
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Vitest | Not tested | - | No explicit test for file removal + dropzone return |
| E2E | Not tested | - | - |
**Verdict: NOT COVERED**
**Gap ID: GAP-M13** | Priority: LOW | File removal state transition not tested

#### UC-M14: Import Results Display (Validation Summary)
**Test Coverage:** Vitest: ImportResultsDisplay.test.tsx (15 tests)
**Verdict: FULLY COVERED**

#### UC-M15: Preview Changes Table (Dynamic Columns, Empty State)
**Test Coverage:** Vitest: PreviewChangesTable.test.tsx (21 tests)
**Verdict: FULLY COVERED**

---

### Category N: Role-Based Import Access (5 Use Cases)

#### UC-N1: Admin Can Import for Any Physician
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: import-all-roles.spec.ts
**Verdict: FULLY COVERED**

#### UC-N2: Physician Can Only Import for Self
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: import-all-roles.spec.ts
**Verdict: FULLY COVERED**

#### UC-N3: Staff Can Import Only for Assigned Physicians
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: import-all-roles.spec.ts
**Verdict: FULLY COVERED**

#### UC-N4: Admin+Physician Dual Role Gets Admin Behavior
**Test Coverage:** Vitest: SheetSelector.test.tsx, Playwright: import-all-roles.spec.ts
**Verdict: FULLY COVERED**

#### UC-N5: Staff Cannot Access Admin Mapping Management
**Test Coverage:** Vitest: MappingManagementPage.test.tsx, Playwright: smart-column-mapping.spec.ts
**Verdict: FULLY COVERED**

---

### Category O: Import Bug Fixes (5 Use Cases)

#### UC-O1: Replace All Scoped by Insurance Group
**Description:** Replace All mode only deletes measures for patients in the same insurance group, not all patients.
**Test Coverage:** Jest: diffCalculator.test.ts, reassignment-merge.test.ts
**Verdict: FULLY COVERED**

#### UC-O2: Reassignment Dedup (No Duplicate Measures on Re-Import)
**Description:** When a patient is being reassigned to a different physician, their existing measures are loaded for diff calculation to prevent INSERT duplicates.
**Test Coverage:** Jest: diffCalculator.test.ts, importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-O3: Merge Mode Reassigns Patient Owner
**Description:** During SKIP and UPDATE actions in merge mode, the patient ownerId is updated to the target physician.
**Test Coverage:** Jest: importExecutor.test.ts
**Verdict: FULLY COVERED**

#### UC-O4: Socket Reconnection Re-joins Room
**Description:** After network interruption, socket re-joins physician room and refreshes data.
**Test Coverage:** Vitest: useSocket.test.ts
**Verdict: FULLY COVERED**

#### UC-O5: Admin Role Change Cleans Up Assignments
**Description:** Removing STAFF/PHYSICIAN role cleans up StaffAssignment records and patient ownership.
**Test Coverage:** Jest: updateUser.staffCleanup.test.ts
**Verdict: FULLY COVERED**

---

### Category P: API Endpoints (12 Use Cases)

#### UC-P1: GET /api/import/systems — List Available Systems
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P2: GET /api/import/systems/:systemId — Get System Details
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P3: POST /api/import/sheets — Sheet Discovery with Header Validation
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P4: POST /api/import/parse — Parse File
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P5: POST /api/import/analyze — Analyze Columns (Map + Transform + Validate)
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P6: POST /api/import/preview — Generate Preview
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P7: POST /api/import/execute/:previewId — Execute Import
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P8: GET /api/import/preview/:previewId — Get Cached Preview
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P9: DELETE /api/import/preview/:previewId — Delete Preview
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P10: GET /api/import/mappings/:systemId — Get Merged Config
**Test Coverage:** Jest: mapping.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P11: PUT /api/import/mappings/:systemId/columns — Save Column Overrides
**Test Coverage:** Jest: mapping.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-P12: POST /api/import/mappings/:systemId/resolve — Resolve Conflicts
**Test Coverage:** Jest: mapping.routes.test.ts
**Verdict: FULLY COVERED**

---

### Category Q: Security & Edge Cases (12 Use Cases)

#### UC-Q1: Authentication Required for All Import Endpoints
**Test Coverage:** Jest: import.routes.test.ts, mapping.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-Q2: Admin-Only for Mapping Write Operations
**Test Coverage:** Jest: mapping.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-Q3: SheetName Validated Against Workbook (Path Traversal Prevention)
**Test Coverage:** Jest: import.routes.test.ts
**Verdict: FULLY COVERED**

#### UC-Q4: XSS in Column Names
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No test for `<script>` in column headers |
| Vitest | Not tested | - | No test for XSS rendering in ConflictResolutionStep |
**Verdict: NOT COVERED**
**Gap ID: GAP-Q4** | Priority: HIGH | CRITICAL per smart-column-mapping TEST_CASES.md (GAP-20)

#### UC-Q5: SQL Injection Defense in Mapping Save
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Partial | mappingService.test.ts | Uses Prisma ORM (parameterized), but no explicit SQL injection test |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-Q5** | Priority: MEDIUM | Prisma provides parameterization; explicit test would increase confidence

#### UC-Q6: File Upload Size Limit
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No test for >10MB file upload rejection |
**Verdict: NOT COVERED**
**Gap ID: GAP-Q6** | Priority: MEDIUM | Multer limit exists but not tested

#### UC-Q7: Invalid Regex Pattern in Action Mappings
**Test Coverage:** Jest: mappingService.test.ts, actionMapper.test.ts
**Verdict: FULLY COVERED**

#### UC-Q8: Concurrent Import Operations (Two Users, Same Physician)
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No test for concurrent imports to same physician |
**Verdict: NOT COVERED**
**Gap ID: GAP-Q8** | Priority: LOW | Edge case; preview cache isolates operations

#### UC-Q9: Hill File Uploaded With Sutter System Selected
**Test Coverage:** Jest: sutter-edge-cases.test.ts (wrong column validation)
**Verdict: FULLY COVERED**

#### UC-Q10: Sutter File Uploaded With Hill System Selected
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Partial | - | Header validation would catch it, but no explicit cross-system file test |
**Verdict: PARTIALLY COVERED**
**Gap ID: GAP-Q10** | Priority: LOW | Implicitly covered by header validation; explicit test missing

#### UC-Q11: Preview Expiration During Execute (Race Condition)
**Test Coverage:** Jest: importExecutor.test.ts (preview not found test)
**Verdict: FULLY COVERED**

#### UC-Q12: loadMergedConfig Failure Breaks All Imports
**Test Coverage:**
| Framework | Status | File | Notes |
|-----------|--------|------|-------|
| Jest | Not tested | - | No test for loadMergedConfig throwing during import flow |
**Verdict: NOT COVERED**
**Gap ID: GAP-Q12** | Priority: HIGH | CRITICAL per TEST_CASES.md (GAP-27); config failure should return meaningful 500

---

## Gap Summary

### CRITICAL / HIGH Priority Gaps

| Gap ID | Use Case | Description | Recommended Framework | Priority |
|--------|----------|-------------|----------------------|----------|
| GAP-Q4 | UC-Q4 | XSS injection in column names — no test for `<script>` tags in headers being safely rendered in UI | Jest + Vitest | HIGH |
| GAP-Q12 | UC-Q12 | loadMergedConfig failure during import flow — no test for meaningful error when config loading throws | Jest (import.routes) | HIGH |
| GAP-K20 | UC-K20 | Re-import identical Sutter file — no test verifying all SKIPs in merge mode | Jest (sutter-integration) | MEDIUM |
| GAP-H4 | UC-H4 | Duplicate groups orange UI section — no E2E test verifying visual display | Cypress | MEDIUM |
| GAP-Q5 | UC-Q5 | SQL injection in mapping save — no explicit test with malicious sourceColumn | Jest (mappingService) | MEDIUM |
| GAP-Q6 | UC-Q6 | File upload size limit — no test for >10MB rejection | Jest (import.routes) | MEDIUM |
| GAP-A8 | UC-A8 | Corrupt/password-protected Excel file — no test for error handling | Jest (fileParser) | MEDIUM |

### LOW Priority Gaps

| Gap ID | Use Case | Description | Recommended Framework | Priority |
|--------|----------|-------------|----------------------|----------|
| GAP-A9 | UC-A9 | Large file (>10MB) explicit memory/timeout boundary test | Jest (fileParser) | LOW |
| GAP-A11 | UC-A11 | UTF-16/BOM encoding support | Jest (fileParser) | LOW |
| GAP-E11 | UC-E11 | Audit log content verification E2E | Cypress | LOW |
| GAP-F9 | UC-F9 | statusDateSource metadata tracking explicit test | Jest (dataTransformer) | LOW |
| GAP-M3 | UC-M3 | Drag-and-drop file upload gesture E2E test | Cypress/Playwright | LOW |
| GAP-M10 | UC-M10 | Scrollable error list with 20+ errors | Cypress | LOW |
| GAP-M11 | UC-M11 | "Patients with No Measures" purple section E2E | Cypress | LOW |
| GAP-M13 | UC-M13 | File removal returns to dropzone state | Vitest | LOW |
| GAP-Q8 | UC-Q8 | Concurrent imports to same physician | Jest | LOW |
| GAP-Q10 | UC-Q10 | Sutter file uploaded with Hill system selected | Jest | LOW |

---

## Coverage by Sub-Area

| Sub-Area | Use Cases | Fully Covered | Partially | Not Covered | Score |
|----------|-----------|---------------|-----------|-------------|-------|
| A. File Parsing | 11 | 8 | 2 | 1 | 73% |
| B. Column Mapping (Hill) | 6 | 6 | 0 | 0 | 100% |
| C. Smart Mapping — Fuzzy | 8 | 8 | 0 | 0 | 100% |
| D. Smart Mapping — Resolution UI | 11 | 11 | 0 | 0 | 100% |
| E. Smart Mapping — Admin Mgmt | 12 | 11 | 1 | 0 | 92% |
| F. Data Transformation (Hill) | 9 | 8 | 1 | 0 | 89% |
| G. Validation | 10 | 10 | 0 | 0 | 100% |
| H. Error Reporting | 7 | 6 | 1 | 0 | 86% |
| I. Diff Calculation / Preview | 14 | 14 | 0 | 0 | 100% |
| J. Import Execution | 12 | 12 | 0 | 0 | 100% |
| K. Sutter-Specific | 20 | 19 | 0 | 1 | 95% |
| L. Sheet Validation | 10 | 10 | 0 | 0 | 100% |
| M. Import UI Flow | 15 | 10 | 2 | 3 | 67% |
| N. Role-Based Import | 5 | 5 | 0 | 0 | 100% |
| O. Import Bug Fixes | 5 | 5 | 0 | 0 | 100% |
| P. API Endpoints | 12 | 12 | 0 | 0 | 100% |
| Q. Security & Edge Cases | 12 | 6 | 3 | 3 | 50% |
| **TOTAL** | **178** | **153** | **17** | **8** | **86%** |

---

## Coverage by Framework

| Framework | Files | Tests | Primary Coverage |
|-----------|-------|-------|-----------------|
| Jest (backend services) | 25 | ~883 | Core business logic, transformation, validation, diff, Sutter pipeline |
| Jest (backend routes) | 2 | ~96 | API endpoint behavior, authentication, error responses |
| Vitest (frontend components) | 12 | ~302 | Component rendering, user interactions, state management |
| Cypress E2E | 5 | ~84 | Full import workflow, conflict resolution, mapping management |
| Playwright E2E | 8 | ~71 | Sutter import flows, visual review, role-based access |
| **TOTAL** | **52** | **~1,436** | |

---

## Recommendations (Ordered by Impact)

### 1. Add XSS injection test for column names (GAP-Q4) — HIGH
Create a Jest test in `columnMapper.test.ts` or `conflictDetector.test.ts` with headers containing `<script>` tags. Create a Vitest test in `ConflictResolutionStep.test.tsx` verifying safe rendering (escaped text, no execution).

### 2. Add loadMergedConfig failure test (GAP-Q12) — HIGH
In `import.routes.test.ts`, mock `loadMergedConfig()` to throw and verify the endpoint returns a meaningful 500 error (not an unhandled rejection crash).

### 3. Add corrupt file handling test (GAP-A8) — MEDIUM
In `fileParser.test.ts`, pass a corrupt binary buffer (e.g., random bytes) to `parseExcel()` and verify a descriptive error is returned.

### 4. Add re-import identical file test (GAP-K20) — MEDIUM
In `sutter-integration.test.ts`, import data, then re-import the same file and verify all actions are SKIP with zero INSERTs.

### 5. Add file upload size limit test (GAP-Q6) — MEDIUM
In `import.routes.test.ts`, send a request with a buffer exceeding the Multer size limit and verify a 400/413 response.

### 6. Add SQL injection defense test (GAP-Q5) — MEDIUM
In `mappingService.test.ts`, save a column with `sourceColumn = "'; DROP TABLE..."` and verify it is stored literally without executing SQL.

### 7. Add duplicate groups UI E2E test (GAP-H4) — MEDIUM
In `import-flow.cy.ts`, upload a file with duplicate rows and verify the orange "Duplicate Groups" section appears in the UI.

---

## Cross-Reference to Regression Plan

| Regression Section | Test Cases | This Report Category | Coverage |
|--------------------|------------|---------------------|----------|
| 14. Import Test Page | TC-14.1 to TC-14.5 | A, M | 100% |
| 15. Column Mapping | TC-15.1 to TC-15.6 | B | 100% |
| 16. Data Transformation | TC-16.1 to TC-16.6 | F | 100% |
| 17. Date Parsing | TC-17.1 to TC-17.7 | F | 100% |
| 18. Non-Compliant Wins Logic | TC-18.1 to TC-18.9 | F | 100% |
| 19. Validation | TC-19.1 to TC-19.10 | G | 100% |
| 20. Error Reporting | TC-20.1 to TC-20.9 | H | 89% (TC-20.4 partial) |
| 21. Import Test Page UI | TC-21.1 to TC-21.12 | M | 83% (TC-21.8 not covered) |
| 22. Import Preview | TC-22.1 to TC-22.12 | I | 100% |
| 23. Import Executor | TC-23.1 to TC-23.12 | J | 100% |
| 36. Sutter/SIP Import | TC-36.1 to TC-36.19 | K, L, N | 100% |
| 38. Sutter File-Based Integration | TC-38.1 to TC-38.8 | K | 100% |
| 39. Sutter Visual Tests | TC-39.1 to TC-39.6 | K | 100% |
| 40. Smart Mapping — Backend | TC-40.1 to TC-40.19 | C | 100% |
| 41. Smart Mapping — UI | TC-41.1 to TC-41.11 | D | 100% |
| 42. Smart Mapping — Admin | TC-42.1 to TC-42.12 | E | 100% |
| 48. Sutter Pipeline | TC-48.1 to TC-48.10 | K | 100% |
| 53. Import Bug Fixes | TC-53.1 to TC-53.5 | O | 100% |

---

## Smart Column Mapping TEST_CASES.md Cross-Reference

The spec document `.claude/specs/smart-column-mapping/TEST_CASES.md` defines 161 test cases across 10 categories plus 42 QA review additions. Cross-referencing against actual tests:

| Category | Defined TCs | Automated | Gap Notes |
|----------|-------------|-----------|-----------|
| 1. Fuzzy Matching Engine | 16 | 15+ | TC-FM-12 (boundary 0.80) likely covered implicitly |
| 2. Conflict Detection | 22 | 22 | All conflict types covered by conflictDetector.test.ts |
| 3. Conflict Resolution (Admin) | 20 | 18 | GAP-20 (XSS) not tested; TC-CR-18 (409 UI retry) partially covered |
| 4. Conflict Resolution (Non-Admin) | 9 | 9 | All covered by ConflictBanner.test.tsx + Cypress |
| 5. Mapping Management CRUD | 21 | 17 | TC-MM-13/14 (audit content), TC-MM-17/18 (edit mode toggle/unsaved), TC-MM-19 (empty dropdown) |
| 6. Import Flow Integration | 11 | 9 | TC-IF-10 (loadMergedConfig failure) = GAP-Q12 |
| 7. Action Pattern Matching | 11 | 11 | All covered by actionMapper.test.ts |
| 8. Edge Cases & Boundary | 23 | 18 | TC-EC-18/19 (corrupt/password files) = GAP-A8 |
| 9. Security & Validation | 23 | 17 | TC-SV-14/15 (XSS) = GAP-Q4; TC-SV-16 (SQL injection) = GAP-Q5 |
| 10. Performance & Reliability | 5 | 3 | TC-PR-3 (10K rows with conflicts) not explicitly tested |

**Overall TEST_CASES.md coverage: ~87% (140/161)**

---

## Conclusion

The Import Pipeline area has **strong overall coverage at 86% fully covered (96% with partial)**. The test infrastructure is mature with ~1,436 tests spread across 5 testing frameworks and 52 test files.

**Strongest areas (100%):** Column mapping, validation, diff calculation, import execution, sheet validation, role-based access, API endpoints, and the smart column mapping subsystems.

**Weakest area:** Security edge cases (50%) and Import UI flow (67%), primarily due to missing XSS tests, corrupt file handling, and some UI-only visual verifications.

**Top 3 actions to close the most impactful gaps:**
1. XSS injection test (GAP-Q4) — protects against security vulnerability
2. loadMergedConfig failure test (GAP-Q12) — prevents production crash scenario
3. Corrupt file handling test (GAP-A8) — improves user experience for invalid files
