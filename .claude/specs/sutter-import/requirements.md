# Requirements Document: Sutter/SIP Import

## Introduction

Add Sutter Independent Physicians (SIP) import support as a second healthcare system alongside the existing Hill Healthcare import. Sutter uses a fundamentally different spreadsheet format from Hill: long format (one row per quality measure per patient) versus Hill's wide format (one row per patient, multiple measure columns). Sutter files are multi-tab Excel workbooks where each tab represents a physician's patient panel. This feature extends the import pipeline with Sutter-specific column mapping, data transformation, and action-text-to-measure mapping, while reusing the existing downstream pipeline components (diffCalculator, importExecutor, preview/execute flow).

## Alignment with Product Vision

This feature directly supports several goals from `product.md`:

- **Import data from healthcare systems without manual entry**: Adds a second healthcare system import format, moving the platform from single-system to multi-system support. Sutter/SIP is a major physician network, and supporting it eliminates hours of manual data entry per import cycle.
- **Replace Excel tracking for medical offices**: Offices that work with both Hill and Sutter panels currently maintain separate tracking workflows. A unified import pipeline lets them manage both populations in a single application.
- **Support multiple physicians with patient isolation**: Sutter files contain multiple physician tabs. The tab selection + physician assignment flow ensures patients are correctly assigned to the right physician, maintaining data isolation.
- **Provide real-time compliance visibility through color coding**: Sutter data represents non-compliant measures. Importing this data populates the grid with actionable compliance gaps that immediately surface in the color-coded view.
- **Insurance group filtering (REQ-IG)**: Patients imported from Sutter will have `insuranceGroup = 'sutter'`, enabling the existing insurance group dropdown filter to segment Sutter vs. Hill patients in the grid.

## Glossary

| Sutter Term | Internal Term | Description |
|-------------|---------------|-------------|
| SIP | Sutter/SIP | Sutter Independent Physicians — the healthcare network |
| HCC | Chronic DX | Hierarchical Condition Category — maps to "Chronic DX" request type |
| APV | AWV | Annual Physical Visit — maps to same "AWV" (Annual Wellness Visit) request type |
| Possible Actions Needed | Action text | Free-text column describing the non-compliance action; parsed into qualityMeasure + measureStatus |
| Measure Details | statusDate / tracking1 | Contains dates and/or readings that map to status date and tracking fields |

## Requirements

### REQ-SI-1: System Registration

**User Story:** As a system administrator, I want Sutter/SIP registered as an available healthcare system, so that users can select it in the import page dropdown and the system loads the correct configuration.

#### Acceptance Criteria

1. WHEN the `systems.json` registry is loaded THEN it SHALL contain a `sutter` entry with `name` set to `"Sutter/SIP"` and `configFile` set to `"sutter.json"`.
2. WHEN the `GET /api/import/systems` endpoint is called THEN the response SHALL include both `hill` and `sutter` in the list of available systems.
3. WHEN a user navigates to the import page THEN the Healthcare System dropdown SHALL display both "Hill Healthcare" and "Sutter/SIP" as selectable options.
4. WHEN the `sutter.json` configuration file is loaded THEN the system SHALL NOT throw errors and SHALL be parseable by the existing `loadSystemConfig` function.
5. IF the `sutter.json` configuration file is missing or malformed THEN the system SHALL throw a descriptive error when `sutter` is selected (consistent with existing Hill error handling).

### REQ-SI-2: Sutter Configuration File

**User Story:** As a developer, I want a comprehensive `sutter.json` configuration file, so that the column mapping and action-to-measure translation for Sutter files is fully data-driven and maintainable without code changes.

#### Acceptance Criteria

1. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `patientColumns` section mapping Sutter column headers to internal field names:
   - `"Member Name"` maps to `"memberName"`
   - `"Member DOB"` maps to `"memberDob"`
   - `"Member Telephone"` maps to `"memberTelephone"`
   - `"Member Home Address"` maps to `"memberAddress"`
2. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `dataColumns` section listing additional Sutter-specific columns that carry measure data: `"Health Plans"`, `"Race-Ethnicity"`, `"Possible Actions Needed"`, `"Request Type"`, `"Measure Details"`, `"High Priority"`.
3. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `requestTypeMapping` section that maps Sutter request type values to internal request types:
   - `"AWV"` maps to `{ "requestType": "AWV", "qualityMeasure": "Annual Wellness Visit" }`
   - `"APV"` maps to `{ "requestType": "AWV", "qualityMeasure": "Annual Wellness Visit" }`
   - `"HCC"` maps to `{ "requestType": "Chronic DX", "qualityMeasure": "Chronic Diagnosis Code" }`
   - `"Quality"` maps to `{ "requestType": null, "qualityMeasure": null }` (resolved via actionMapping)
4. WHEN the `sutter.json` file is loaded THEN it SHALL contain an `actionMapping` section that maps "Possible Actions Needed" text values to `{ requestType, qualityMeasure, measureStatus }` tuples for all known action strings.
5. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `skipTabs` section listing tab name patterns to exclude: tabs with `_NY` suffix, tabs starting or ending with `Perf by Measure`, and `CAR Report`.
6. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `format` field set to `"long"` to distinguish it from Hill's `"wide"` format.
7. WHEN the `sutter.json` file is loaded THEN it SHALL contain a `headerRow` field set to `3` (0-indexed) indicating that rows 0-2 are title/fax info and the actual column headers are at row index 3.
8. WHEN `loadSystemConfig('sutter')` is called THEN the `SystemConfig` type SHALL be extended (or a union type/generics approach used) to include Sutter-specific fields (`requestTypeMapping`, `actionMapping`, `skipTabs`, `format`, `headerRow`) alongside the existing Hill fields (`patientColumns`, `measureColumns`, `statusMapping`, `skipColumns`). Hill-only fields SHALL be optional when the `format` is `"long"`.

### REQ-SI-3: Multi-Tab Excel Parsing

**User Story:** As a user importing a Sutter file, I want the system to detect and list all physician data tabs in the workbook, so that I can select which physician's panel to import.

#### Acceptance Criteria

1. WHEN a user uploads a Sutter Excel file THEN the system SHALL read all sheet/tab names from the workbook.
2. WHEN sheet names are read THEN the system SHALL filter out tabs matching the skip patterns defined in `sutter.json` (`_NY` suffix, `Perf by Measure` prefix/suffix, `CAR Report`).
3. WHEN the filtered tab list is returned THEN the API response SHALL include a `sheets` array containing the names of all physician data tabs.
4. WHEN a Sutter file has zero valid physician data tabs (all tabs match skip patterns) THEN the system SHALL return an error: `"No physician data tabs found in the uploaded file"`.
5. WHEN the file parser processes a Sutter file THEN it SHALL use the `headerRow` value from `sutter.json` (row index 3) to locate the actual column headers, skipping title/fax rows 0-2.
6. WHEN the file parser detects the header row at 0-indexed row 3 THEN `dataStartRow` SHALL be set to `5` (1-indexed), meaning data rows begin immediately after the header row (0-indexed row 4 = 1-indexed row 5).
7. WHEN columns are not present in a specific file version (e.g., `Race-Ethnicity` and `High Priority` absent in non-APR files) THEN the parser SHALL NOT treat their absence as an error; those fields SHALL default to `null`.

### REQ-SI-4: Sheet Selection UI

**User Story:** As a user importing a Sutter file, I want to select which physician tab to import and confirm the physician assignment, so that patient data is attributed to the correct physician in the system.

#### Acceptance Criteria

1. WHEN the user selects "Sutter/SIP" as the healthcare system and uploads an Excel file THEN the import page SHALL display a sheet/tab selector step between the file upload step and the "Preview Import" button.
2. WHEN the sheet selector is displayed THEN it SHALL show a dropdown containing all valid physician data tab names from the uploaded file.
3. WHEN the sheet selector dropdown shows tab names THEN each tab name SHALL be displayed as-is from the workbook (e.g., "Dr. Smith", "Jones, M").
4. WHEN the user selects a tab THEN the system SHALL display a physician assignment dropdown below the tab selector, pre-populated with the list of physicians from the existing `GET /api/users/physicians` endpoint.
5. WHEN a tab is selected THEN the system SHALL attempt to auto-match the tab name to a physician by performing a case-insensitive partial match between the tab name and each physician's `displayName`. IF a match is found THEN the physician dropdown SHALL be pre-selected to the matched physician.
6. WHEN no physician match is found for the selected tab THEN the physician dropdown SHALL remain unselected with a prompt "-- Select a physician --".
7. WHEN the user clicks "Preview Import" without selecting a physician for the chosen tab THEN the system SHALL display an error: "Please select a physician for the selected tab".
8. WHEN the user selects a tab and confirms the physician THEN the system SHALL send the selected sheet name and physician ID to the preview endpoint.
9. WHEN the healthcare system is NOT "Sutter/SIP" THEN the sheet selector step SHALL NOT be displayed (Hill uses single-sheet files).
10. IF a Sutter file contains exactly one physician data tab THEN the sheet selector SHALL be displayed with that tab pre-selected, allowing the user to confirm the physician assignment.

### REQ-SI-5: Sutter Column Mapper

**User Story:** As a developer, I want a Sutter-specific column mapping strategy, so that Sutter's fixed column layout is correctly mapped to internal fields without the Q1/Q2 suffix logic used by Hill.

#### Acceptance Criteria

1. WHEN column mapping is performed for the `sutter` system THEN the mapper SHALL use direct column-to-field mapping from `sutter.json` `patientColumns` (no Q1/Q2 suffix logic).
2. WHEN column headers are analyzed THEN the mapper SHALL identify patient columns (`Member Name`, `Member DOB`, `Member Telephone`, `Member Home Address`) and data columns (`Request Type`, `Possible Actions Needed`, `Measure Details`, `Health Plans`, `Race-Ethnicity`, `High Priority`).
3. WHEN a recognized patient column is found THEN it SHALL be mapped to the corresponding internal field name per `sutter.json`.
4. WHEN a recognized data column is found THEN it SHALL be mapped with `columnType: 'data'`. The existing `ColumnMapping` interface SHALL be extended from `'patient' | 'measure'` to `'patient' | 'measure' | 'data'` to support Sutter's non-measure data columns.
5. WHEN an unrecognized column header is found THEN it SHALL be added to the `unmappedColumns` list as a warning (consistent with Hill behavior).
6. WHEN required columns are missing THEN the required-column check SHALL be system-aware, checking against the system's own `patientColumns` keys (not hardcoded to Hill's `Patient`/`DOB` names). For Sutter, missing `Member Name` or `Member DOB` SHALL be reported in `missingRequired`.
7. WHEN the column mapper runs for the `sutter` system THEN it SHALL NOT attempt to find measure columns via Q1/Q2 suffix matching (that logic is Hill-specific).

### REQ-SI-6: Sutter Data Transformer

**User Story:** As a developer, I want a Sutter-specific data transformation strategy, so that each row in the long-format Sutter file is correctly mapped to a `TransformedRow` with the proper `requestType`, `qualityMeasure`, `measureStatus`, and tracking fields.

#### Acceptance Criteria

1. WHEN data transformation is performed for the `sutter` system THEN the transformer SHALL process each input row as a single measure (long format: one input row produces at most one output `TransformedRow`).
2. WHEN the transformer processes a row THEN it SHALL NOT perform wide-to-long pivoting (no measure column grouping, no Q1/Q2 pairing).
3. WHEN a row has `Request Type` = `"AWV"` THEN the output `TransformedRow` SHALL have `requestType = "AWV"` and `qualityMeasure = "Annual Wellness Visit"`.
4. WHEN a row has `Request Type` = `"APV"` THEN the output `TransformedRow` SHALL have `requestType = "AWV"` and `qualityMeasure = "Annual Wellness Visit"` (APV maps to the same measure as AWV).
5. WHEN a row has `Request Type` = `"HCC"` THEN the output `TransformedRow` SHALL have `requestType = "Chronic DX"`, `qualityMeasure = "Chronic Diagnosis Code"`, and the `notes` field SHALL contain the full text of the `Possible Actions Needed` column.
6. WHEN a row has `Request Type` = `"Quality"` THEN the transformer SHALL look up the `Possible Actions Needed` text in the `actionMapping` section of `sutter.json` to determine `requestType`, `qualityMeasure`, and `measureStatus`.
7. WHEN a `Quality` row's `Possible Actions Needed` text matches an entry in `actionMapping` THEN the output `TransformedRow` SHALL use the mapped `requestType`, `qualityMeasure`, and `measureStatus` values.
8. WHEN a `Quality` row's `Possible Actions Needed` text does NOT match any entry in `actionMapping` THEN the row SHALL be skipped (not included in the output) and the action text SHALL be logged to the unmapped actions report.
9. WHEN a row has an unrecognized `Request Type` value (not AWV, APV, HCC, or Quality) THEN the transformer SHALL skip the row and add a transform error.
10. WHEN the `Measure Details` column contains a value in `"date; reading"` format (semicolon-separated) THEN the transformer SHALL split on `;`, parse the date portion as `statusDate`, and set the reading portion as `tracking1`.
11. WHEN the `Measure Details` column contains a single numeric value THEN the transformer SHALL set it as `tracking1` and leave `statusDate` as the import date.
12. WHEN the `Measure Details` column contains comma-separated date values THEN the transformer SHALL parse all dates, pick the latest (most recent) date, and set it as `statusDate`.
13. WHEN the `Measure Details` column is empty THEN both `statusDate` and `tracking1` SHALL be `null` (statusDate will default to import date when the measure is created).
14. WHEN the `Measure Details` column contains a value that does not match any recognized format (not a date, not a number, not semicolon-separated date;reading) THEN the entire value SHALL be stored as `tracking1` and `statusDate` SHALL be `null`.
15. WHEN the `Measure Details` column contains a semicolon-separated value with more than two parts (e.g., `"01/15/2025; 7.5; mg/dL"`) THEN the first part SHALL be parsed as `statusDate` and the remaining parts (joined by `;`) SHALL be stored as `tracking1`.
16. WHEN date parsing is performed on `Measure Details` values THEN recognized date formats SHALL include: `MM/DD/YYYY`, `M/D/YYYY`, `YYYY-MM-DD`, and Excel serial numbers. Unrecognized date strings SHALL be treated as plain text and stored in `tracking1`.
17. WHEN a row's `Member DOB` is an Excel serial number (e.g., `38082`) THEN the transformer SHALL convert it to a proper date using the existing `parseDate` utility from `dateParser.ts`.
18. WHEN a row is missing `Member Name` THEN the transformer SHALL skip the row and add a transform error: `"Missing required patient name"`.

### REQ-SI-7: Action-to-Measure Mapping

**User Story:** As a user importing Sutter Quality data, I want the system to automatically determine the correct quality measure and status from the "Possible Actions Needed" column, so that imported data maps to the correct grid categories without manual intervention.

#### Acceptance Criteria

All action text matching SHALL be case-insensitive and use regex patterns with `\d{4}` for year placeholders (year-agnostic matching). Patterns are evaluated in order; first match wins.

##### Mapped Actions (10 regex patterns, ~1,634 rows / 71.3% of Quality rows)

1. WHEN the action text matches `/^FOBT in \d{4} or colonoscopy/i` (e.g., `"FOBT in 2025 or colonoscopy 2015 - 2025"`, ~445 rows) THEN the system SHALL map to `requestType = "Screening"`, `qualityMeasure = "Colon Cancer Screening"`, `measureStatus = "Not Addressed"`.
2. WHEN the action text matches `/^HTN - Most recent \d{4} BP less than/i` (e.g., `"HTN - Most recent 2025 BP less than 140/90"`, ~325 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "Hypertension Management"`, `measureStatus = "Not at goal"`.
3. WHEN the action text matches `/^DM - Urine albumin\/creatine? ratio/i` (e.g., `"DM - Urine albumin/creatine ratio and a eGFR (both are needed) in 2025"`, ~178 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "Diabetic Nephropathy"`, `measureStatus = "Not Addressed"`.
4. WHEN the action text matches `/^DM - Most recent \d{4} HbA1c/i` (e.g., `"DM - Most recent 2025 HbA1c less than 8%"`, ~166 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "Diabetes Control"`, `measureStatus = "HgbA1c NOT at goal"`.
5. WHEN the action text matches `/^DM - Eye exam in \d{4}/i` (e.g., `"DM - Eye exam in 2025"`, ~155 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "Diabetic Eye Exam"`, `measureStatus = "Not Addressed"`.
6. WHEN the action text matches `/^Pap in \d{4} - \d{4} -OR- Pap & HPV/i` (e.g., `"Pap in 2023 - 2025 -OR- Pap & HPV test in 2021 - 2025"`, ~132 rows) THEN the system SHALL map to `requestType = "Screening"`, `qualityMeasure = "Cervical Cancer Screening"`, `measureStatus = "Not Addressed"`.
7. WHEN the action text matches `/^Mammogram in \d{4}/i` (e.g., `"Mammogram in 2024 or 2025"`, ~115 rows) THEN the system SHALL map to `requestType = "Screening"`, `qualityMeasure = "Breast Cancer Screening"`, `measureStatus = "Not Addressed"`.
8. WHEN the action text matches `/^Chlamydia test in \d{4}/i` (e.g., `"Chlamydia test in 2025"`, ~49 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "GC/Chlamydia Screening"`, `measureStatus = "Not Addressed"`.
9. WHEN the action text matches `/^Need dispensing events for RAS Antagonists/i` (e.g., `"Need dispensing events for RAS Antagonists to cover 80% of the year..."`, ~30 rows) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "ACE/ARB in DM or CAD"`, `measureStatus = "Not Addressed"`.
10. WHEN the action text matches `/^Vaccine:/i` (e.g., `"Vaccine: HPV by 13th birthday"`, `"Vaccine: Meningococcal by 13th birthday"`, `"Vaccine: DTaP by 2nd birthday"`, `"Vaccine: Hepatitis A by 2nd birthday"`, `"Vaccine: Hepatitis B by 2nd birthday"`, `"Vaccine: HiB by 2nd birthday"`, `"Vaccine: Influenza by 2nd birthday"`, `"Vaccine: IPV by 2nd birthday"`, `"Vaccine: MMR by 2nd birthday"`, `"Vaccine: PCV by 2nd birthday"`, `"Vaccine: Rotavirus by 2nd birthday"`, `"Vaccine: Tdap by 13th birthday"`, `"Vaccine: VZV by 2nd birthday"`, ~39 rows total) THEN the system SHALL map to `requestType = "Quality"`, `qualityMeasure = "Vaccination"`, `measureStatus = "Not Addressed"`.

##### Unmapped Actions — SKIP (12 known actions, ~658 rows / 28.7% of Quality rows)

The following actions SHALL be skipped during import and recorded in the unmapped actions report. They are documented here for completeness and future reference.

11. `Annual Child and Young Adult Well-Care Visits - Schedule patient for a well visit (3yrs - 21yrs old)` (~404 rows) — No grid measure; well-care visits for ages 3-21 not tracked.
12. `Order and/or schedule patient for osteoporosis screening tests` (~37 rows) — No matching quality measure in grid.
13. `DM - One prescription for any intensity statin medication filled by a pharmacy` (~34 rows) — Statin dispensing not tracked.
14. `Screen for Lung Cancer with low-dose computed tomography (CT) every year` (~31 rows) — No matching quality measure in grid.
15. `Well-Child Visit (15-30 mos) - need 2 WCV encounters between 15-30 mos` (~29 rows) — Well-child visits not tracked.
16. `Need dispensing events for statin medications to cover 80% of the year (which equates to 292 days)` (~28 rows) — Statin dispensing not tracked.
17. `Prenatal Vaccine: Influenza` (~23 rows) — Prenatal vaccines not tracked.
18. `One prescription for a high-intensity or moderate-intensity statin medication filled by a pharmacy` (~21 rows) — Statin dispensing not tracked.
19. `Prenatal Vaccine: Tdap` (~18 rows) — Prenatal vaccines not tracked.
20. `Asthma Medication Ratio - Prescribe/Refill asthma controller medication` (~10 rows) — No matching quality measure in grid.
21. `Need dispensing events for oral diabetes medication to cover 80% of the year (which equates to 292 days)` (~10 rows) — Oral diabetes dispensing not tracked.
22. `Well-Child Visit (first 15 mos) - need 6 WCV encounters before turning 15 mos` (~1 row) — Well-child visits not tracked.

##### Matching Rules

23. WHEN action text matching is performed THEN it SHALL use regex patterns (not exact string matching) to be year-agnostic. Year values in action text (e.g., "2025") SHALL be matched by `\d{4}` in the regex.
24. WHEN the action text does not match any of the 10 mapped regex patterns AND does not match any of the 12 known unmapped actions THEN the row SHALL be skipped and the action text SHALL be recorded in the unmapped actions report as a newly discovered unmapped action.
25. WHEN the `sutter.json` configuration stores action mappings THEN mapped actions SHALL be stored as regex pattern strings (not exact text), and unmapped actions SHALL be stored in a separate `skipActions` array for documentation purposes.

### REQ-SI-8: Unmapped Actions Report

**User Story:** As a user importing Sutter data, I want to see which action texts could not be mapped to quality measures, so that I know what data was skipped and can report missing mappings for future configuration.

#### Acceptance Criteria

1. WHEN the Sutter import transformation completes THEN the system SHALL generate an unmapped actions report listing all distinct `Possible Actions Needed` values that did not match any entry in the `actionMapping` configuration.
2. WHEN the unmapped actions report is generated THEN each entry SHALL include the action text and the count of rows that used that action text.
3. WHEN the import preview response is returned THEN it SHALL include the unmapped actions report in a `unmappedActions` field, limited to the first 20 entries sorted by row count descending.
4. WHEN the preview page displays for a Sutter import THEN the UI SHALL show an information banner listing the number of unmapped action types and total skipped rows, with the option to expand and see the full list.
5. WHEN all action texts in the file are successfully mapped THEN the unmapped actions report SHALL be empty and the UI SHALL NOT display the information banner.

### REQ-SI-9: Pipeline Data Flow Extension for Sutter Fields

**User Story:** As a user importing Sutter HCC data, I want HCC action text and lab readings to be preserved during import, so that I can see relevant clinical details in the grid's Notes and Tracking columns without re-entering them manually.

#### Acceptance Criteria

1. WHEN the `TransformedRow` interface is extended THEN it SHALL include an optional `notes` field of type `string | null` for HCC action text.
2. WHEN the `TransformedRow` interface is extended THEN it SHALL include an optional `tracking1` field of type `string | null` for parsed Measure Details values.
3. WHEN the `DiffChange` interface is extended THEN it SHALL carry `notes` and `tracking1` fields from the source `TransformedRow`. The `diffCalculator` SHALL propagate these fields from each `TransformedRow` into the corresponding `DiffChange` entry.
4. WHEN the import executor creates a new measure record THEN it SHALL persist the `notes` and `tracking1` fields from the `DiffChange` to the corresponding database columns (if non-null).
5. WHEN the import executor updates an existing measure record THEN it SHALL update the `notes` and `tracking1` fields if the `DiffChange` provides non-null values.
6. WHEN a Hill import produces a `TransformedRow` THEN the `notes` and `tracking1` fields SHALL default to `null` (no change to Hill behavior).

### REQ-SI-10: All Patients Are Non-Compliant

**User Story:** As a user, I want the system to correctly treat all Sutter import rows as representing non-compliant measures, so that the grid accurately reflects the compliance status from the Sutter data.

#### Acceptance Criteria

1. WHEN a Sutter file is imported THEN every row SHALL be treated as a non-compliant measure (there is no compliance status column in Sutter files).
2. WHEN the `measureStatus` is derived from the action mapping THEN it SHALL use the mapped value (e.g., `"Not Addressed"`, `"Not at goal"`, `"HgbA1c NOT at goal"`) rather than a generic non-compliant status.
3. WHEN a `measureStatus` is set on a Sutter `TransformedRow` THEN the diff calculator SHALL correctly categorize it as `'non-compliant'` using the existing `categorizeStatus` function.
4. WHEN Sutter data is merged with existing data THEN the standard merge logic SHALL apply: if the existing measure is compliant and the import is non-compliant, the action SHALL be `BOTH` (keep both); if both are non-compliant, the action SHALL be `SKIP`.

### REQ-SI-11: Sutter Import API Endpoint

**User Story:** As a user importing Sutter data, I want the import API to accept a sheet name parameter, so that the backend processes only the selected physician tab from the multi-tab workbook.

#### Acceptance Criteria

1. WHEN the `POST /api/import/preview` endpoint receives a request with `systemId = 'sutter'` THEN it SHALL accept an additional `sheetName` parameter in the request body specifying which tab to parse.
2. WHEN a `sheetName` parameter is provided THEN the file parser SHALL parse only the specified sheet from the workbook, not the first sheet (Hill behavior).
3. WHEN the `sheetName` parameter refers to a sheet that does not exist in the workbook THEN the system SHALL return a 400 error: `"Sheet not found: {sheetName}"`.
4. WHEN the `sheetName` parameter is omitted for a Sutter import THEN the system SHALL return a 400 error: `"Sheet name is required for Sutter imports"`.
5. WHEN parsing the specified sheet THEN the parser SHALL use the `headerRow` value from `sutter.json` to locate headers at the correct row index.
6. WHEN the preview is generated successfully THEN the preview cache entry SHALL store the selected `sheetName` alongside the existing `systemId`, `mode`, and `targetOwnerId` fields. The stored `sheetName` is informational — it is displayed in the preview header (per NFR-SI-19) and in audit logs. The execute step uses the cached diff results, not the raw file, so `sheetName` is NOT needed for re-parsing.

### REQ-SI-12: File Upload Sheets Discovery Endpoint

**User Story:** As a frontend developer, I want an API endpoint that returns the list of valid physician data tabs from an uploaded Sutter file, so that the sheet selector dropdown can be populated before the user starts the import.

#### Acceptance Criteria

1. WHEN a `POST /api/import/sheets` endpoint is called with an uploaded Sutter Excel file THEN the system SHALL return a JSON response containing the list of valid physician data tab names.
2. WHEN the endpoint processes the file THEN it SHALL apply the tab filtering rules from `sutter.json` `skipTabs` to exclude non-data tabs.
3. WHEN the file is a CSV or single-sheet Excel file THEN the endpoint SHALL return a single-element array containing the sheet name (or `"Sheet1"` for CSV files).
4. WHEN the file contains no valid data tabs THEN the endpoint SHALL return a 400 error: `"No physician data tabs found in the uploaded file"`.
5. WHEN the endpoint is called with `systemId` other than `sutter` THEN it SHALL still return the sheet names (allowing future multi-tab support for other systems).

### REQ-SI-13: Insurance Group Assignment

**User Story:** As a user, I want patients imported from Sutter to be tagged with the `sutter` insurance group, so that I can filter the grid to see only Sutter patients using the existing insurance group dropdown.

#### Acceptance Criteria

1. WHEN a Sutter import is executed THEN all patients created or updated during the import SHALL have `insuranceGroup` set to `'sutter'`.
2. WHEN the insurance group dropdown filter is displayed THEN it SHALL include "Sutter/SIP" as a selectable option (populated from the `systems.json` registry per REQ-IG-7).
3. WHEN the user selects "Sutter/SIP" in the insurance group filter THEN the grid SHALL show only patients whose `insuranceGroup = 'sutter'`.
4. WHEN a patient was previously imported from Hill (insuranceGroup = 'hill') and is later imported from Sutter THEN the patient's `insuranceGroup` SHALL be updated to `'sutter'` (per existing REQ-IG-6 re-import logic).

### REQ-SI-14: Downstream Pipeline Reuse

**User Story:** As a developer, I want the existing diffCalculator, importExecutor, previewCache, and validator to work with Sutter data without modification, so that the downstream import pipeline is shared between Hill and Sutter.

#### Acceptance Criteria

1. WHEN Sutter data is transformed into `TransformedRow[]` THEN the existing `validateRows` function SHALL validate the rows using the same rules as Hill (required fields, valid request types, valid quality measures).
2. WHEN Sutter `TransformedRow[]` data is passed to `calculateDiff` THEN the diff calculator SHALL correctly compute INSERT/UPDATE/SKIP/BOTH/DELETE actions using the same merge logic as Hill.
3. WHEN a Sutter import preview is executed THEN the `importExecutor` SHALL process the diff changes using the same transaction logic as Hill (insert/update/delete measures, create/update patients).
4. WHEN the import executor processes Sutter rows THEN it SHALL persist any non-null `notes` and `tracking1` values from the `TransformedRow`.
5. WHEN the import completes THEN the existing `syncAllDuplicateFlags` function SHALL run to detect duplicates across both Hill and Sutter patients.
6. WHEN the validator runs for a Sutter import THEN the valid `requestType` list SHALL be extended to include `"Chronic DX"` and `"Screening"` (Sutter-used types). Invalid `requestType` for Sutter imports SHALL be reported as a warning (not a blocking error), while Hill imports SHALL retain the existing error severity for invalid request types.

### REQ-SI-15: Physician-Tab Name Matching

**User Story:** As a user importing Sutter data, I want the system to suggest which physician to assign based on the tab name, so that I do not have to manually search through the physician dropdown for each tab.

#### Acceptance Criteria

1. WHEN a tab is selected in the sheet selector THEN the system SHALL compare the tab name against all physician display names using case-insensitive partial matching.
2. WHEN the tab name contains a physician's last name (extracted from `displayName` by splitting on comma or space) THEN the system SHALL suggest that physician as the match.
3. WHEN multiple physicians match the tab name THEN the system SHALL present all matches in the physician dropdown with the best match pre-selected (longest substring match).
4. WHEN no physician matches the tab name THEN the physician dropdown SHALL remain unselected.
5. WHEN the system suggests a physician match THEN the UI SHALL display a visual indicator (e.g., "(suggested)" label or highlight) next to the pre-selected physician to signal it is an auto-suggestion.
6. WHEN the user overrides the suggested physician by selecting a different one THEN the system SHALL accept the user's selection without warning.

## Non-Functional Requirements

### Performance

- NFR-SI-1: The Sutter file parser SHALL process a 4,100-row Excel file (4 physician tabs) within 5 seconds on the server.
- NFR-SI-2: The `POST /api/import/sheets` endpoint SHALL return the tab list within 2 seconds for a typical Sutter file (under 5 MB).
- NFR-SI-3: The action-to-measure mapping lookup SHALL be efficient. With 10 fixed regex patterns, sequential regex matching is acceptable (O(10) per row = effectively constant time). The pattern list is small and fixed; no hash-map optimization is required.
- NFR-SI-4: The Sutter data transformer SHALL process a single physician tab (~1,000 rows) within 1 second.
- NFR-SI-5: The overall preview generation (parse + map + transform + validate + diff) for a single Sutter tab SHALL complete within 10 seconds.

### Security

- NFR-SI-6: The `sheetName` parameter in the API request SHALL be validated to prevent path traversal or injection attacks. It SHALL be matched exactly against the workbook's actual sheet names.
- NFR-SI-7: The Sutter import SHALL enforce the same role-based access control as the Hill import: PHYSICIAN can import to their own patients, STAFF can import to assigned physicians only, ADMIN can import to any physician.
- NFR-SI-8: The `sutter.json` configuration file SHALL NOT contain sensitive data (no credentials, no patient data). It SHALL contain only mapping configuration.
- NFR-SI-9: Uploaded Sutter files SHALL be processed in memory and not written to disk (consistent with existing Multer configuration using `memoryStorage`).
- NFR-SI-10: Audit logging SHALL record Sutter imports with the same detail level as Hill imports, including `systemId = 'sutter'` in the log entry.

### Reliability

- NFR-SI-11: IF the `sutter.json` file contains a malformed action mapping entry THEN the system SHALL skip that entry and log a warning, not crash the entire import.
- NFR-SI-12: IF a Sutter Excel file has a corrupted or password-protected sheet THEN the system SHALL return a descriptive error message instead of an unhandled exception.
- NFR-SI-13: IF the header row is not at the expected index (row 3) in a Sutter file THEN the system SHALL attempt to detect the header row by scanning for known column names (`Member Name`, `Request Type`) in the first 10 rows, falling back to an error if not found.
- NFR-SI-14: The Sutter import SHALL be atomic: if any error occurs during execution, the entire import SHALL be rolled back (using the existing transaction wrapper in `importExecutor`).
- NFR-SI-15: IF a Sutter file contains rows from both known and unknown action texts THEN the system SHALL import the mapped rows and skip only the unmapped rows. The import SHALL NOT fail entirely due to unmapped actions.

### Usability

- NFR-SI-16: The sheet selector dropdown SHALL display tab names in the order they appear in the workbook (left to right).
- NFR-SI-17: The sheet selector step SHALL only appear when the selected healthcare system supports multi-tab files. It SHALL NOT appear for Hill or other single-sheet systems.
- NFR-SI-18: The physician auto-match suggestion SHALL be visually distinct from a user-confirmed selection (e.g., different label text or tooltip) so the user knows to verify it.
- NFR-SI-19: The import preview page for a Sutter import SHALL display the selected tab name and assigned physician name in the preview header, so the user can confirm they are importing the correct data.
- NFR-SI-20: WHEN a Sutter import skips rows due to unmapped actions THEN the preview summary SHALL clearly state the number of skipped rows and provide the reason, using non-technical language (e.g., "12 rows skipped: action type not yet configured").
- NFR-SI-21: The import page step numbering SHALL dynamically adjust to accommodate the sheet selector step without renumbering existing steps awkwardly. For Sutter imports, the steps SHALL be: (1) Select Healthcare System, (2) Choose Import Mode, (3) Select Target Physician, (4) Upload File, (5) Select Physician Tab, (6) Preview Import.

### Accessibility

- NFR-SI-22: The sheet selector dropdown SHALL be keyboard-accessible (navigable via Tab, selectable via Enter/Space, dismissible via Escape) and SHALL have an associated `<label>` or `aria-label` for screen readers.
- NFR-SI-23: The physician assignment dropdown SHALL follow the same keyboard accessibility pattern as the sheet selector.
- NFR-SI-24: The unmapped actions information banner SHALL use an appropriate ARIA role (`role="status"` or `role="alert"`) so that screen readers announce when rows are skipped.

## Assumptions and Constraints

### Assumptions

- ASM-SI-1: The Sutter Excel file format is consistent: title/fax info in rows 0-2, column headers at row 3, data starting at row 4. If Sutter changes their format, the `headerRow` value in `sutter.json` can be updated without code changes.
- ASM-SI-2: Tab names in Sutter files reliably correspond to physician names or identifiable labels. The matching is a convenience; users always have the option to override the auto-suggestion.
- ASM-SI-3: All rows in Sutter files represent non-compliant measures. There is no compliance status column; compliance is inferred from the fact that the patient appears in the action list.
- ASM-SI-4: The 34 known Quality action mappings cover the majority of data in Sutter files. Unmapped actions (currently osteoporosis, lung cancer, asthma) are low-volume and can be added to the config later without code changes.
- ASM-SI-5: A single Sutter physician tab is imported per import operation. Users who need to import multiple tabs will perform separate import operations, one per tab.
- ASM-SI-6: DOB values in Sutter files are Excel serial numbers and the existing `parseDate` utility in `dateParser.ts` already handles Excel serial number conversion correctly.
- ASM-SI-7: The `Member Name` column in Sutter files uses "Last, First" format, consistent with how Hill stores names. No name format normalization is needed.
- ASM-SI-8: The existing `TransformedRow` interface can be extended with optional fields (`notes`, `tracking1`) without breaking Hill import functionality.
- ASM-SI-9: The `sutter.json` action mapping uses regex pattern matching on the `Possible Actions Needed` column value. Patterns use `\d{4}` for year placeholders, making them year-agnostic. No annual config updates are needed for year changes.

### Constraints

- CON-SI-1: The SheetJS (XLSX) library used by the existing file parser supports multi-sheet workbooks. No additional dependencies are needed for multi-tab parsing.
- CON-SI-2: The preview cache is in-memory with a 30-minute TTL. The selected `sheetName` must be stored in the preview entry alongside the existing metadata.
- CON-SI-3: The `configLoader.ts` `SystemConfig` interface assumes a Hill-like structure (patientColumns, measureColumns, statusMapping, skipColumns). Sutter requires additional config fields (requestTypeMapping, actionMapping, skipTabs, format, headerRow). The `SystemConfig` type must be extended or a new type created.
- CON-SI-4: The column mapper (`columnMapper.ts`) currently only supports Hill's Q1/Q2 suffix pattern. Sutter requires a different mapping strategy. The mapper must be made system-aware or replaced with a strategy pattern.
- CON-SI-5: The data transformer (`dataTransformer.ts`) currently only supports wide-to-long transformation. Sutter requires long-to-long (pass-through with enrichment). The transformer must be made system-aware or replaced with a strategy pattern.
- CON-SI-6: AG Grid Community edition is used; no enterprise features are available.
- CON-SI-7: No new environment variables or infrastructure changes are required for this feature.
- CON-SI-8: The frontend `HEALTHCARE_SYSTEMS` array in `ImportPage.tsx` is currently hardcoded. It should be updated to fetch from the backend or extended to include Sutter with its multi-tab capability flag.

## Edge Cases

### EC-SI-1: Empty Physician Tab
WHEN a user selects a physician tab that contains only header rows and no data rows THEN the system SHALL display an error: "Selected tab has no patient data rows" and SHALL NOT proceed to preview.

### EC-SI-2: Patient Appears in Multiple Tabs
WHEN the same patient (same `Member Name` + `Member DOB`) appears in multiple physician tabs in the same Sutter file AND the user imports different tabs for different physicians THEN each import SHALL be treated independently. The second import will trigger a reassignment detection for patients imported from the first tab (existing REQ-IP reassignment logic applies).

### EC-SI-3: Tab Name Contains Special Characters
WHEN a tab name contains special characters (parentheses, slashes, periods, commas) THEN the sheet selector SHALL display the name correctly and the API SHALL handle the name without encoding errors.

### EC-SI-4: Same Patient With Multiple Actions in Same Tab
WHEN a Sutter tab contains multiple rows for the same patient with different `Possible Actions Needed` values THEN each row SHALL produce a separate `TransformedRow` (one per quality measure). If two rows map to the same `requestType + qualityMeasure` combination, the validator SHALL flag them as duplicates within the import.

### EC-SI-5: Action Text With Trailing Whitespace or Line Breaks
WHEN the `Possible Actions Needed` column contains leading/trailing whitespace or embedded line breaks THEN the transformer SHALL trim whitespace and normalize line breaks before performing the action mapping lookup.

### EC-SI-6: Mixed Request Types in Same Tab
WHEN a single physician tab contains rows with AWV, APV, HCC, and Quality request types THEN the transformer SHALL correctly process each row according to its request type without interference. The tab is not filtered by request type.

### EC-SI-7: Excel Serial Number in Non-DOB Columns
WHEN a column other than `Member DOB` contains a numeric value that could be interpreted as an Excel serial number (e.g., `Measure Details` with value `45523`) THEN the system SHALL NOT automatically convert it to a date. Only `Member DOB` values SHALL undergo Excel serial number conversion.

### EC-SI-8: Large Sutter File (4,000+ Rows)
WHEN a Sutter tab contains more than 4,000 rows THEN the import SHALL process all rows without timeout. The existing 5-minute transaction timeout in `importExecutor` SHALL be sufficient for this volume.

### EC-SI-9: File With Only Skip Tabs
WHEN a Sutter Excel file contains only tabs that match skip patterns (`_NY`, `Perf by Measure`, `CAR Report`) THEN the `POST /api/import/sheets` endpoint SHALL return an error: "No physician data tabs found in the uploaded file" and the import flow SHALL NOT proceed.

### EC-SI-10: Hill File Uploaded With Sutter System Selected
WHEN a user selects "Sutter/SIP" as the healthcare system but uploads a Hill-format file (single sheet, different column headers) THEN the column mapper SHALL report missing required columns (`Member Name`, `Member DOB`) and the import SHALL fail with a descriptive validation error indicating the file does not match the Sutter format.

### EC-SI-11: Sutter File Uploaded With Hill System Selected
WHEN a user selects "Hill Healthcare" as the healthcare system but uploads a Sutter-format file THEN the Hill column mapper SHALL treat most Sutter columns as unmapped. The transformer may produce zero transformed rows or rows with missing measures. The validation step SHALL report errors and the import SHALL fail with descriptive messages.

### EC-SI-12: Vaccine Action Text Variations
WHEN the `Possible Actions Needed` column contains `"Vaccine: Tdap"`, `"Vaccine: Influenza"`, `"Vaccine: PCV 20"`, or any other `"Vaccine: *"` pattern THEN the system SHALL map all of them to `qualityMeasure = "Vaccination"` regardless of the specific vaccine type after the colon.

### EC-SI-13: Measure Details With Invalid Date Format
WHEN the `Measure Details` column contains a semicolon-separated value where the date portion is not a valid date (e.g., `"abc; 7.5"`) THEN the transformer SHALL set `statusDate` to `null` (default to import date) and still extract the reading portion as `tracking1`.

### EC-SI-14: Re-Import Same Sutter File
WHEN a user imports the same Sutter tab twice for the same physician THEN the merge mode diff calculator SHALL categorize all rows as SKIP (both non-compliant) because the existing measures already match. The preview SHALL show 0 inserts, 0 updates, and N skips.

### EC-SI-15: Concurrent Sutter and Hill Imports
WHEN two users simultaneously import a Sutter file and a Hill file for the same physician THEN both imports SHALL proceed independently. The preview cache stores separate entries. If both create the same patient, the import executor's find-or-create logic will handle the patient record. The `insuranceGroup` will be set by whichever import executes last.

## Dependencies

- **Authentication**: Required to access import page and API endpoints (existing)
- **Patient Ownership**: Physician assignment and reassignment detection (existing)
- **Duplicate Detection**: Post-import duplicate flag sync (existing)
- **Insurance Group Feature (REQ-IG)**: `insuranceGroup` field on Patient model, filter dropdown (already implemented)
- **Import Pipeline (existing)**: fileParser, diffCalculator, importExecutor, previewCache, validator, errorReporter (reused)
- **SheetJS (XLSX) library**: Already a dependency for Excel parsing; multi-sheet API available
