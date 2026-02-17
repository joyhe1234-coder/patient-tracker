# Requirements Document: Import Sheet Validation & Flexible Import Steps

## Introduction

Enhance the import workflow to be flexible and system-agnostic for multi-tab Excel file handling. For ALL import systems (Hill, Sutter, and future systems), after file upload the system validates each sheet's header row against the known column structure for that system's configuration. Only tabs with matching headers appear in the sheet selector. If multiple valid tabs exist, a dropdown is shown; if only one valid tab exists, it is displayed as text (not a dropdown). After the target tab is identified, the user selects the physician those patients will be imported to.

Additionally, this spec addresses two Sutter-specific improvements: defaulting unmapped action statuses to "Not Addressed" silently, and configurable preview columns per system.

## Alignment with Product Vision

This feature supports the `product.md` goals of:

- **Import data from healthcare systems without manual entry**: By automatically filtering tabs based on column structure, users never see irrelevant sheets. This works uniformly across all healthcare systems.
- **Replace Excel tracking for medical offices**: Both Hill and Sutter workbooks may contain non-data tabs (summary, pivot, reporting). Automatically excluding them provides a clean import experience.
- **Support multiple healthcare systems**: The generalized approach means adding a new system (e.g., another insurance group) only requires a JSON config file — the tab validation, sheet selector, and physician assignment work automatically.
- **Provide real-time compliance visibility**: Fewer import errors from wrong-tab selection means data gets into the grid faster.

## Glossary

| Term | Definition |
|------|------------|
| Header row | The row in a sheet containing column names. Position is defined per system config (e.g., `headerRow: 0` for Hill, `headerRow: 3` for Sutter). Defaults to row 0 if not specified. |
| Required columns | The minimum set of column headers a sheet must contain to be valid for import. Derived from each system's JSON config `patientColumns` keys and key data columns. |
| Name-based filtering | The existing `skipTabs` pattern matching that excludes tabs by name (suffix, prefix, exact, contains). Only applies to systems that define `skipTabs` in config. |
| Header-based validation | The new validation step that checks each sheet's actual column headers against the required column set derived from that system's config. |
| Valid tab | A sheet that passes both name-based filtering (if applicable) and header-based validation. |
| Invalid tab | A sheet that fails header-based validation (column structure doesn't match). |

## Requirements

### REQ-SV-1: Universal Header-Based Sheet Validation

**User Story:** As a user importing a file from any healthcare system, I want the import process to automatically identify which tabs contain importable patient data based on their column headers, so that I only see relevant tabs.

#### Acceptance Criteria

1. WHEN the `POST /api/import/sheets` endpoint processes a file for ANY system (Hill, Sutter, or future systems) THEN it SHALL validate each sheet's header row against the required columns for that system.
2. WHEN header-based validation runs for a sheet THEN the system SHALL read the header row at the index specified by the system's config `headerRow` value (defaults to 0 if not specified).
3. WHEN a sheet's header row is examined THEN the system SHALL check for the presence of required columns derived from that system's `patientColumns` config (keys mapped to `memberName` and `memberDob`) and at least one data column from `measureColumns` keys (Hill) or `dataColumns` (Sutter).
4. WHEN a sheet fails header-based validation THEN it SHALL be excluded from the returned `sheets` array.
5. WHEN a sheet passes header-based validation THEN it SHALL be included in the returned `sheets` array.
6. WHEN a sheet's header row at the configured index is empty or contains fewer than 3 non-empty cells THEN the sheet SHALL be considered invalid and excluded.
7. WHEN the header row index is out of bounds for a particular sheet THEN the sheet SHALL be considered invalid and excluded without throwing an error.
8. WHEN a system config includes `skipTabs` patterns (e.g., Sutter) THEN name-based filtering SHALL run FIRST, and header-based validation SHALL run only on the remaining sheets.
9. WHEN a system config does NOT include `skipTabs` (e.g., Hill) THEN only header-based validation SHALL be applied.

### REQ-SV-2: Required Columns Derived from System Configuration

**User Story:** As a developer, I want the required columns for header validation to be derived from each system's JSON config, so that adding a new healthcare system requires only a config file — no code changes.

#### Acceptance Criteria

1. WHEN the system determines required columns for validation THEN it SHALL derive patient columns from the config's `patientColumns` keys mapped to `memberName` and `memberDob`.
2. WHEN the system determines required data columns THEN for Hill-style configs it SHALL require at least one key from `measureColumns`; for Sutter-style configs it SHALL require at least one entry from `dataColumns` (e.g., `Request Type` or `Possible Actions Needed`).
3. IF a system config's `patientColumns` mapping changes (e.g., `"Patient Name"` instead of `"Member Name"`) THEN the header validation SHALL automatically use the new column names without code changes.
4. WHEN header validation compares column names THEN it SHALL perform case-insensitive matching.
5. WHEN header validation compares column names THEN it SHALL trim leading and trailing whitespace before comparison.

### REQ-SV-3: API Response Includes Validation Metadata

**User Story:** As a frontend developer, I want the `/api/import/sheets` response to indicate which sheets were excluded and why, so that I can provide informative feedback to the user.

#### Acceptance Criteria

1. WHEN the endpoint returns successfully THEN the response SHALL include a `skippedSheets` array listing sheets excluded by name-based filtering (empty for systems without `skipTabs`).
2. WHEN the endpoint returns successfully THEN the response SHALL include an `invalidSheets` array listing sheets excluded by header-based validation, with sheet name and reason.
3. WHEN the endpoint returns successfully THEN the `filteredSheets` count SHALL reflect only sheets that passed all validation.
4. WHEN at least one sheet is excluded by header validation THEN each `invalidSheets` entry SHALL include the sheet name and a brief reason (e.g., `"Missing required columns: Patient, DOB"`).

### REQ-SV-4: Graceful Handling When All Sheets Are Invalid

**User Story:** As a user, I want a clear error message if no tabs in the workbook match the expected column structure, so I know I may have uploaded the wrong file or selected the wrong system.

#### Acceptance Criteria

1. WHEN all sheets are excluded (by name filtering, header validation, or both) THEN the endpoint SHALL return a 400 error with code `NO_VALID_TABS`.
2. WHEN the error is returned THEN the message SHALL include counts of how sheets were excluded and which required columns were expected.
3. WHEN both name-based and header-based filtering exclude sheets THEN the error message SHALL mention both reasons with counts.

### REQ-SV-5: Flexible Sheet Selector UI

**User Story:** As a user importing a file, I want the import flow to show me which tab will be imported and let me pick a physician, whether the file has one valid tab or many.

#### Acceptance Criteria

1. WHEN a file is uploaded for ANY system and has multiple valid tabs THEN the sheet selector SHALL display a dropdown for tab selection.
2. WHEN a file has exactly one valid tab THEN the sheet selector SHALL display the tab name as static text (not a dropdown), clearly indicating which tab will be imported.
3. WHEN the target tab is identified (selected or auto-detected) THEN the user SHALL be prompted to select a physician for that import.
4. WHEN the file is a single-sheet file (e.g., CSV or single-tab Excel) THEN the tab SHALL be auto-selected and displayed as text, and the physician selector SHALL appear immediately.
5. WHEN the `SheetSelector` component receives `invalidSheets` with one or more entries THEN it SHALL display an informational note (e.g., `"{N} tab(s) excluded: missing required import columns"`) with expandable detail.
6. WHEN there are zero `invalidSheets` THEN the informational note SHALL NOT be displayed.

### REQ-SV-6: Universal Sheet Selector Step for All Systems

**User Story:** As a user importing from any healthcare system, I want the import flow to always show me the tab and physician selection step after file upload, so the experience is consistent regardless of which system I'm importing from.

#### Acceptance Criteria

1. WHEN a file is uploaded for ANY system (Hill, Sutter, or future) THEN the sheet/tab discovery and physician selection step SHALL appear after file upload.
2. WHEN the system is Hill and the file has one valid tab THEN the tab SHALL be shown as text and the physician selector SHALL appear.
3. WHEN the system is Sutter and the file has multiple valid tabs THEN the tab dropdown and physician selector SHALL appear (current Sutter behavior, preserved).
4. WHEN the system is Hill and a PHYSICIAN user uploads a file THEN the physician SHALL be auto-assigned (no physician dropdown needed, since physicians import for themselves). The tab SHALL still be shown.
5. WHEN the system is any system and a STAFF/ADMIN user uploads a file THEN the physician dropdown SHALL always appear.

### REQ-SV-7: Performance of Header Validation

**User Story:** As a user, I want sheet discovery with header validation to complete quickly for all systems.

#### Acceptance Criteria

1. WHEN header validation runs THEN the system SHALL read only the header row from each sheet (not full data).
2. WHEN a file with 10+ sheets is processed THEN total discovery time SHALL complete within 3 seconds.
3. WHEN the workbook is read THEN the system SHALL use a single `XLSX.read()` call and reuse the workbook object for both sheet names and header reads.

### REQ-SV-8: Default "Not Addressed" Status for Unmapped Sutter Actions

**User Story:** As a user importing a Sutter file, I want rows with unmapped actions to default to "Not Addressed" measure status silently, so that I am not overwhelmed with warnings about missing statuses.

#### Acceptance Criteria

1. WHEN the Sutter action mapper cannot find a match for a row's action text THEN the system SHALL set `measureStatus` to `"Not Addressed"` automatically.
2. WHEN `measureStatus` is defaulted to `"Not Addressed"` for a Sutter row THEN the validator SHALL NOT generate a warning for that row.
3. WHEN the preview is displayed for a Sutter import THEN the warning count SHALL NOT include rows defaulted to `"Not Addressed"`.
4. WHEN a Sutter row's action text IS successfully mapped THEN the mapped `measureStatus` SHALL be used as before.
5. WHEN a Hill import has rows without a `measureStatus` THEN the existing warning behavior SHALL remain unchanged.

### REQ-SV-9: Configurable Preview Columns Per System

**User Story:** As a user importing data from any healthcare system, I want the import preview to show columns relevant to that system's data, so that I can verify the most important fields before committing.

#### Acceptance Criteria

1. WHEN a system config contains a `previewColumns` array THEN the import preview SHALL display those columns in addition to the standard columns.
2. WHEN a system config defines `previewColumns` THEN each entry SHALL specify `field`, `label`, and `source`.
3. WHEN the preview is displayed for Sutter THEN it SHALL show `statusDate` and `Possible Actions Needed` as defined in `sutter.json` `previewColumns`.
4. WHEN the preview is displayed for Hill THEN it SHALL show only standard columns (no `previewColumns` defined).
5. WHEN a system config does NOT contain `previewColumns` THEN the preview SHALL display only standard columns (backward compatible).
6. WHEN the preview endpoint returns data THEN it SHALL include a `previewColumns` metadata field so the frontend renders dynamically.
7. WHEN a `previewColumns` entry has no value for a row THEN the preview SHALL display an empty cell.

## Non-Functional Requirements

### Performance

- NFR-SV-1: Header validation SHALL add no more than 1 second to sheet discovery for files under 5 MB with fewer than 15 sheets.
- NFR-SV-2: Only the header row SHALL be read per sheet during validation — no full data parsing.

### Security

- NFR-SV-3: Header validation SHALL NOT introduce new attack surface. Sheet names and headers are treated as untrusted input.
- NFR-SV-4: Same authentication and RBAC as existing endpoints.

### Reliability

- NFR-SV-5: IF reading a sheet's header row throws an error THEN that sheet SHALL be treated as invalid and processing SHALL continue.

### Usability

- NFR-SV-6: Users SHALL NOT need to understand which tabs are data vs. summary. The system filters automatically.
- NFR-SV-7: Exclusion info SHALL use non-technical language (e.g., "missing required import columns").

### Accessibility

- NFR-SV-8: Invalid sheets note SHALL use `role="note"` or `aria-live="polite"`.
- NFR-SV-9: Expandable detail SHALL be keyboard-accessible (Tab + Enter/Space).

## Edge Cases

### EC-SV-1: Sheet With Correct Headers But Zero Data Rows
Sheet passes header validation but has no data rows. SHALL be included in dropdown; empty-data check happens at preview time.

### EC-SV-2: Sheet With Headers at Wrong Row
Headers at unexpected row index. SHALL be treated as invalid during discovery.

### EC-SV-3: Sheet With Partial Required Columns
Has patient columns but no data columns. SHALL be excluded.

### EC-SV-4: Sheet With Extra Columns Beyond Required
Has all required columns plus extras. SHALL be considered valid.

### EC-SV-5: Sheet Name Matches Skip Pattern AND Has Invalid Headers
Excluded by name filter. SHALL appear in `skippedSheets` only, not `invalidSheets`.

### EC-SV-6: All Sheets Fail Validation
All sheets excluded. SHALL return 400 NO_VALID_TABS.

### EC-SV-7: Sheet With Merged Cells in Header Row
Merged cells may collapse. Compare against non-empty values. Invalid if required columns obscured.

### EC-SV-8: Very Large Workbook (20+ Sheets)
Validation SHALL complete within performance requirements using single workbook read.

### EC-SV-9: CSV File (Single Sheet)
Header validation runs on the single sheet. If invalid, return NO_VALID_TABS error.

### EC-SV-10: Column Names With Whitespace
Trim before comparison. `"  Patient  "` matches `"Patient"`.

### EC-SV-11: Hill File With One Tab
Single valid tab shown as text with physician selector. No dropdown.

### EC-SV-12: Hill File With Multiple Tabs (Unexpected)
All tabs get header validation. Only matching ones shown in dropdown.

### EC-SV-13: Sutter Row With Empty Action Text
Row with no actionable data is skipped (tracked in unmapped actions). No warning generated.

### EC-SV-14: Preview With Mixed Mapped and Unmapped Sutter Rows
Mapped rows show mapped status. Unmapped rows show "Not Addressed". No warnings for either.

## Dependencies

- **Sutter Import Feature (v4.7.0)**: Builds on existing import pipeline.
- **fileParser.ts**: `getSheetNames()` and `parseExcel()` — new `getWorkbookInfo()` and `getSheetHeaders()` functions.
- **configLoader.ts**: Config types extended for validation. New `getRequiredColumns()` utility.
- **import.routes.ts**: `POST /api/import/sheets` handler generalized for all systems.
- **ImportPage.tsx**: Sheet selector step generalized for all systems (not just Sutter).
- **SheetSelector.tsx**: Handles single-tab text display, multi-tab dropdown, `invalidSheets`.
- **validator.ts**: Sutter-specific warning suppression for "measure status empty" (REQ-SV-8).
- **sutterDataTransformer.ts**: Default `measureStatus` to `"Not Addressed"` (REQ-SV-8).
- **sutter.json / hill.json**: `previewColumns` optional array, `headerRow` (optional, defaults to 0).
- **ImportPreviewPage.tsx**: Dynamic preview columns from `previewColumns` metadata (REQ-SV-9).
- **SheetJS (XLSX) library**: Existing dependency, no new libraries.
