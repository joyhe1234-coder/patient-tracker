# Implementation Tasks: Sutter/SIP Import

## Task Overview

This implementation adds Sutter Independent Physicians (SIP) as a second healthcare system alongside Hill Healthcare. The core challenge is supporting Sutter's **long format** (one row per measure per patient) versus Hill's **wide format** (one row per patient with multiple measure columns). Sutter files are multi-tab Excel workbooks with physician-specific tabs, and measure data is encoded in free-text "Possible Actions Needed" values that must be parsed via regex-based action mappings.

The implementation uses a **strategy pattern** to make the column mapper and data transformer system-aware, while reusing the existing downstream pipeline (diffCalculator, importExecutor, previewCache, validator) with minimal extensions.

**Estimated new tests: ~186** (131 Jest backend, 35 Vitest frontend, 10 Playwright E2E, 10 Jest API integration)

## Steering Document Compliance

- **structure.md**: New files follow camelCase (services/config) and PascalCase (components) conventions
- **tech.md**: Node.js 20 LTS, TypeScript 5.4, Express 4.21, React 18, SheetJS ^0.18.5, existing testing stack (Jest/Vitest/Playwright/Cypress)
- **patterns.md**: 5-layer test pyramid (Jest backend → Vitest components → Playwright E2E → Cypress AG Grid → MCP Playwright visual review)
- **CLAUDE.md**: TDD workflow enforced (test tasks interleaved with implementation), visual review MANDATORY for UI changes

## Atomic Task Requirements

**Each task meets these criteria for optimal agent execution:**
- **File Scope**: Touches 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Exact file paths specified
- **Agent-Friendly**: Clear input/output, minimal context switching

## Task Dependency Flow

```
Config/Types (1-4)
    ↓
Hill Extraction (5, 7-8)  ──→  Sutter Components (11-16)
    ↓                              ↓
Dispatchers (6, 9) ←── depend on Sutter components existing
    ↓
TransformedRow Extension (10)
    ↓
Pipeline Extensions (21-26)
    ↓
Validator + InsuranceGroup (26a-26c)
    ↓
API Endpoints (27-32)
    ↓
Frontend Components (33-40)
    ↓
Backend Tests (41-50)
    ↓
Frontend Tests (51-54)
    ↓
E2E Tests (55-57)
    ↓
Visual Review (58) [MANDATORY]
```

**IMPORTANT**: Tasks 6 and 9 (dispatchers) MUST be executed AFTER tasks 11 and 14 (Sutter implementations) because the dispatchers call the Sutter functions.

---

## Phase 1: Configuration & Type Foundations

### 1. Register Sutter system in systems.json
- **File**: `backend/src/config/import/systems.json` (modify)
- Add `sutter` entry with `name: "Sutter/SIP"` and `configFile: "sutter.json"`
- Ensure JSON is valid (no trailing commas)
- _Leverage: existing `hill` entry as template_
- _Requirements: REQ-SI-1 AC1, AC2_

**Acceptance Criteria:**
- [ ] `systems.json` contains `sutter` entry with correct name and configFile
- [ ] File parses without errors when loaded by `loadSystemsRegistry()`
- [ ] Both `hill` and `sutter` appear in registry

---

### 2. Create sutter.json configuration file
- **File**: `backend/src/config/import/sutter.json` (create)
- Define config with `format: "long"`, `headerRow: 3`, `patientColumns`, `dataColumns`, `requestTypeMapping`, `actionMapping` (10 regex patterns), `skipActions` (12 documented), `skipTabs` (4 patterns)
- Use regex patterns with `\d{4}` for year-agnostic matching
- _Leverage: `hill.json` structure as reference_
- _Requirements: REQ-SI-2 (all ACs)_

**Config sections:**
- [ ] `patientColumns`: Member Name/DOB/Telephone/Address mappings
- [ ] `dataColumns`: Health Plans, Race-Ethnicity, Possible Actions Needed, Request Type, Measure Details, High Priority
- [ ] `requestTypeMapping`: AWV/APV/HCC/Quality mappings
- [ ] `actionMapping`: 10 regex patterns (FOBT, HTN BP, DM urine, DM HbA1c, DM eye, Pap, Mammogram, Chlamydia, RAS, Vaccine)
- [ ] `skipActions`: 12 known unmapped actions
- [ ] `skipTabs`: suffix _NY, prefix/suffix "Perf by Measure", exact "CAR Report"

---

### 3. Extend SystemConfig type with union/discriminated types
- **File**: `backend/src/services/import/configLoader.ts` (modify)
- Create `SystemConfigBase`, `HillSystemConfig`, `SutterSystemConfig` interfaces
- Create discriminated union `type SystemConfig = HillSystemConfig | SutterSystemConfig`
- Add type guard `isSutterConfig(config): config is SutterSystemConfig`
- Define `ActionMappingEntry`, `SkipTabPattern` interfaces
- _Leverage: existing `SystemConfig` interface as base_
- _Requirements: REQ-SI-2 AC8_

**Acceptance Criteria:**
- [ ] `SutterSystemConfig` has all required fields: format, headerRow, dataColumns, requestTypeMapping, actionMapping, skipActions, skipTabs
- [ ] `HillSystemConfig` preserves existing fields: measureColumns, statusMapping, skipColumns
- [ ] Type guard correctly distinguishes Hill vs Sutter configs
- [ ] Union type allows `loadSystemConfig()` to return either variant

---

### 4. Extend ColumnMapping interface with 'data' columnType
- **File**: `backend/src/services/import/columnMapper.ts` (modify)
- Extend `ColumnMapping.columnType` from `'patient' | 'measure'` to `'patient' | 'measure' | 'data'`
- Update JSDoc to document 'data' type usage for Sutter non-measure columns
- _Leverage: existing `ColumnMapping` interface_
- _Requirements: REQ-SI-5 AC4_

**Acceptance Criteria:**
- [ ] `columnType` accepts `'data'` literal value
- [ ] Type definitions export correctly
- [ ] No breaking changes to existing Hill column mappings

---

## Phase 2: Backend Strategy Refactoring

### 5. Extract Hill-specific column mapping logic into hillColumnMapper function
- **File**: `backend/src/services/import/columnMapper.ts` (refactor)
- Extract existing Hill mapping logic (Q1/Q2 suffix matching, measure column grouping) into `mapHillColumns(headers: string[], config: HillSystemConfig): MappingResult`
- Keep logic unchanged, just relocate
- _Leverage: existing Hill column mapping logic_
- _Requirements: REQ-SI-5 (preparation for dispatcher)_

**Acceptance Criteria:**
- [x] `mapHillColumns()` function contains existing Hill logic
- [x] Function signature accepts `HillSystemConfig` specifically
- [x] No behavior changes for Hill imports
- [x] Returns `MappingResult` with same structure

---

### 6. ⚠️ Convert mapColumns to system-aware dispatcher (AFTER task 11)
- **File**: `backend/src/services/import/columnMapper.ts` (modify)
- **DEPENDENCY**: Requires task 11 (sutterColumnMapper) to be complete first
- Update `mapColumns(headers, systemId)` to load config, check `isSutterConfig()`, and delegate
- If Sutter → call `mapSutterColumns()` (from task 11)
- If Hill → call `mapHillColumns()` (from task 5)
- _Leverage: `configLoader.loadSystemConfig()`, type guard from task 3_
- _Requirements: REQ-SI-5 AC1_

**Acceptance Criteria:**
- [x] `mapColumns()` loads config via `loadSystemConfig(systemId)`
- [x] Delegates to correct mapper based on config format
- [x] Public API signature unchanged
- [x] Hill imports continue working without changes
- [x] All existing Hill column mapper tests pass unchanged

---

### 7. Extract Hill-specific data transformation logic into hillDataTransformer function
- **File**: `backend/src/services/import/dataTransformer.ts` (refactor)
- Extract existing Hill transformation logic (wide-to-long pivot, Q1/Q2 pairing, compliance mapping) into `transformHillData(headers, rows, config, systemId, dataStartRow): TransformResult`
- Keep logic unchanged, just relocate
- _Leverage: existing Hill transformation logic_
- _Requirements: REQ-SI-6 (preparation for dispatcher)_

**Acceptance Criteria:**
- [x] `transformHillData()` function contains existing Hill logic
- [x] Function signature matches extracted logic needs
- [x] No behavior changes for Hill imports
- [x] Returns `TransformResult` with same structure

---

### 8. Export extractPatientData and normalizePhone from dataTransformer
- **File**: `backend/src/services/import/dataTransformer.ts` (modify)
- Change `extractPatientData()` and `normalizePhone()` from private to exported functions
- Add JSDoc comments documenting reuse by Sutter transformer
- _Leverage: existing Hill transformer implementation_
- _Requirements: REQ-SI-6 AC1, design component 8_

**Acceptance Criteria:**
- [x] `extractPatientData()` exported as public function
- [x] `normalizePhone()` exported as public function
- [x] JSDoc indicates these are shared utilities
- [x] No signature changes to functions

---

### 9. ⚠️ Convert transformData to system-aware dispatcher (AFTER task 14-16)
- **File**: `backend/src/services/import/dataTransformer.ts` (modify)
- **DEPENDENCY**: Requires tasks 14-16 (sutterDataTransformer) to be complete first
- Update `transformData(headers, rows, systemId, dataStartRow)` to load config and delegate
- If Sutter → call `transformSutterData()` (from tasks 14-16)
- If Hill → call `transformHillData()` (from task 7)
- _Leverage: `configLoader.loadSystemConfig()`, type guard from task 3_
- _Requirements: REQ-SI-6 AC1_

**Acceptance Criteria:**
- [x] `transformData()` loads config via `loadSystemConfig(systemId)`
- [x] Delegates to correct transformer based on config format
- [x] Public API signature unchanged
- [x] Hill imports continue working without changes
- [x] All existing Hill data transformer tests pass unchanged

---

### 10. Extend TransformedRow interface with notes and tracking1 fields
- **File**: `backend/src/services/import/dataTransformer.ts` (modify)
- Add optional `notes: string | null` field (for HCC action text)
- Add optional `tracking1: string | null` field (for Measure Details readings)
- Update JSDoc to document Sutter-specific usage
- _Leverage: existing `TransformedRow` interface_
- _Requirements: REQ-SI-9 AC1, AC2_

**Acceptance Criteria:**
- [x] `TransformedRow` interface has `notes?: string | null`
- [x] `TransformedRow` interface has `tracking1?: string | null`
- [x] Fields are optional (undefined or null for Hill)
- [x] Type exports correctly to consumers

---

## Phase 3: Sutter-Specific Backend Components

### 11. Create Sutter column mapper [COMPLETED]
- **File**: `backend/src/services/import/sutterColumnMapper.ts` (create)
- Implement `mapSutterColumns(headers: string[], config: SutterSystemConfig): MappingResult`
- Map patient columns via direct lookup (no Q1/Q2 logic)
- Map data columns with `columnType: 'data'`
- Check required columns: Member Name, Member DOB
- _Leverage: `MappingResult`, `ColumnMapping` types from task 4_
- _Requirements: REQ-SI-5 (all ACs)_

**Acceptance Criteria:**
- [ ] Patient columns mapped to internal field names per config
- [ ] Data columns mapped with `columnType: 'data'`
- [ ] Unmapped columns collected in `unmappedColumns` array
- [ ] Missing required columns reported in `missingRequired`
- [ ] No Q1/Q2 suffix matching logic

---

### 12. Create action mapper with regex cache [COMPLETED]
- **File**: `backend/src/services/import/actionMapper.ts` (create)
- Implement `buildActionMapperCache(actionMapping: ActionMappingEntry[]): ActionMapperCache`
- Implement `matchAction(actionText: string, cache: ActionMapperCache): ActionMatch | null`
- Compile regex patterns once, match case-insensitively
- First match wins, return null if no match
- Handle malformed regex gracefully (log warning, skip entry)
- Define `ActionMatch`, `ActionMapperCache` interfaces
- _Leverage: no dependencies (pure function)_
- _Requirements: REQ-SI-7 (all ACs), NFR-SI-3, NFR-SI-11_

**Acceptance Criteria:**
- [ ] Regex patterns compiled to `RegExp` objects with `'i'` flag
- [ ] `matchAction()` trims whitespace and normalizes line breaks
- [ ] Sequential regex matching (first match wins)
- [ ] Returns `{ requestType, qualityMeasure, measureStatus, patternIndex }` or null
- [ ] Malformed patterns caught in try-catch, logged, skipped

---

### 13. Create measure details parser [COMPLETED]
- **File**: `backend/src/services/import/measureDetailsParser.ts` (create)
- Implement `parseMeasureDetails(value: string | undefined | null): MeasureDetailsResult`
- Parse semicolon-separated (`date; reading` or `date; reading; unit`)
- Parse comma-separated dates (pick latest)
- Parse single numeric (→ tracking1), single date (→ statusDate), unrecognized (→ tracking1)
- Handle empty/null → `{ statusDate: null, tracking1: null }`
- Define `MeasureDetailsResult` interface
- _Leverage: `dateParser.parseDate()`, `dateParser.toISODateString()`_
- _Requirements: REQ-SI-6 AC10-AC16, EC-SI-7, EC-SI-13_

**Acceptance Criteria:**
- [ ] Semicolon format: date part → statusDate, remaining → tracking1
- [ ] Comma dates: latest date → statusDate
- [ ] Single numeric → tracking1 only
- [ ] Single date → statusDate only
- [ ] Empty/null → both null
- [ ] Unrecognized → entire value as tracking1
- [ ] No Excel serial conversion (only DOB uses that)

---

### 14. Create Sutter data transformer (part 1: structure and requestType resolution) [COMPLETED]
- **File**: `backend/src/services/import/sutterDataTransformer.ts` (create)
- Implement `transformSutterData(headers, rows, config, mapping, dataStartRow): SutterTransformResult`
- Extract patient data using `extractPatientData()` (from task 8)
- Look up Request Type in `config.requestTypeMapping`
- Handle AWV/APV → `{ requestType: "AWV", qualityMeasure: "Annual Wellness Visit" }`
- Handle HCC → `{ requestType: "Chronic DX", qualityMeasure: "Chronic Diagnosis Code", notes: actionText }`
- Skip row if Request Type unrecognized
- Define `SutterTransformResult` (extends `TransformResult` with `unmappedActions`)
- Define `UnmappedAction` interface
- _Leverage: `extractPatientData`, `normalizePhone` from task 8_
- _Requirements: REQ-SI-6 AC1-AC5, AC18_

**Acceptance Criteria:**
- [x] Each input row produces at most one `TransformedRow` (no pivoting)
- [x] Patient data extracted via reused function
- [x] AWV/APV mapped correctly
- [x] HCC mapped with notes field populated
- [x] Unknown Request Type → row skipped with error
- [x] Missing Member Name → row skipped with error

---

### 15. Create Sutter data transformer (part 2: Quality action mapping) [COMPLETED]
- **File**: `backend/src/services/import/sutterDataTransformer.ts` (modify from task 14)
- Handle Quality Request Type → call `matchAction()` to resolve from action text
- Build action mapper cache once at start of transformation
- If match found → use mapped `requestType`, `qualityMeasure`, `measureStatus`
- If no match → skip row, record in `unmappedActions` map
- Aggregate unmapped actions by text with counts
- Return unmapped actions sorted by count descending
- _Leverage: `actionMapper.buildActionMapperCache()`, `actionMapper.matchAction()` from task 12_
- _Requirements: REQ-SI-6 AC6-AC8, REQ-SI-7, REQ-SI-8_

**Acceptance Criteria:**
- [x] Quality rows call `matchAction()` with action text
- [x] Matched rows use mapped measure details
- [x] Unmatched rows skipped and counted in unmapped map
- [x] `unmappedActions` array returned with distinct action texts and counts
- [x] Action mapper cache built once per import

---

### 16. Create Sutter data transformer (part 3: Measure Details parsing) [COMPLETED]
- **File**: `backend/src/services/import/sutterDataTransformer.ts` (modify from task 15)
- Parse Measure Details column via `parseMeasureDetails()` for each row
- Set `statusDate` and `tracking1` on `TransformedRow` from parsed result
- Handle empty Measure Details → both null
- _Leverage: `measureDetailsParser.parseMeasureDetails()` from task 13_
- _Requirements: REQ-SI-6 AC10-AC16_

**Acceptance Criteria:**
- [x] Measure Details parsed for every row
- [x] `statusDate` and `tracking1` set on `TransformedRow`
- [x] Empty values handled gracefully (null)
- [x] All format variants supported (semicolon, comma dates, single numeric, etc.)

---

### 17. Write unit tests for actionMapper [COMPLETED]
- **File**: `backend/src/services/import/__tests__/actionMapper.test.ts` (create)
- Test all 10 regex patterns with sample action texts
- Test unmapped text returns null
- Test case-insensitive matching
- Test whitespace/line break normalization
- Test malformed regex handling
- Estimated: ~25 tests (actual: 34 tests)
- _Leverage: Jest test patterns from existing import tests_
- _Requirements: REQ-SI-7_

**Acceptance Criteria:**
- [x] All 10 action patterns tested with matching text
- [x] Non-matching text returns null
- [x] Case variations handled correctly
- [x] Whitespace trimming verified
- [x] Malformed regex caught and logged (no crash)

---

### 18. Write unit tests for measureDetailsParser [COMPLETED]
- **File**: `backend/src/services/import/__tests__/measureDetailsParser.test.ts` (create)
- Test semicolon format (`date; reading`, `date; reading; unit`)
- Test comma-separated dates (picks latest)
- Test single numeric → tracking1
- Test single date → statusDate
- Test empty/null → both null
- Test invalid date in semicolon format
- Test multi-part semicolon (more than 2 parts)
- Test Excel serial in non-DOB column (should NOT convert)
- Estimated: ~20 tests (actual: 31 tests)
- _Leverage: Jest test patterns, `dateParser` test helpers_
- _Requirements: REQ-SI-6 AC10-AC16, EC-SI-7, EC-SI-13_

**Acceptance Criteria:**
- [x] All format variants tested
- [x] Latest date picked from comma list
- [x] Single values routed correctly (numeric/date/text)
- [x] Empty handled without errors
- [x] Invalid dates don't crash parser

---

### 19. Write unit tests for sutterColumnMapper [COMPLETED]
- **File**: `backend/src/services/import/__tests__/sutterColumnMapper.test.ts` (create)
- Test patient column mapping (Member Name, DOB, Telephone, Address)
- Test data column mapping with `columnType: 'data'`
- Test unmapped columns collected
- Test missing required columns reported
- Test no Q1/Q2 suffix logic applied
- Estimated: ~15 tests (actual: 18 tests)
- _Leverage: Existing `columnMapper.test.ts` patterns_
- _Requirements: REQ-SI-5_

**Acceptance Criteria:**
- [x] Patient columns map to correct internal fields
- [x] Data columns marked with `columnType: 'data'`
- [x] Unknown columns go to `unmappedColumns`
- [x] Missing Member Name/DOB flagged in `missingRequired`
- [x] No measure column grouping logic

---

### 20. Write unit tests for sutterDataTransformer [COMPLETED]
- **File**: `backend/src/services/import/__tests__/sutterDataTransformer.test.ts` (create)
- Test AWV/APV/HCC/Quality request type handling
- Test action mapping integration (matched and unmatched)
- Test measure details parsing integration
- Test missing Member Name skip
- Test unmapped actions aggregation
- Test mixed request types in same file
- Estimated: ~30 tests (actual: 32 tests)
- _Leverage: Existing `dataTransformer.test.ts` patterns, mocks for actionMapper/measureDetailsParser_
- _Requirements: REQ-SI-6, REQ-SI-8, EC-SI-6_

**Acceptance Criteria:**
- [x] All request types transform correctly
- [x] Action mapping resolves Quality measures
- [x] Measure details propagate to TransformedRow
- [x] Unmapped actions counted and returned
- [x] Missing patient name handled gracefully
- [x] Mixed request types processed independently

---

## Phase 4: Pipeline Extensions

### 21. Extend fileParser with multi-sheet support (getSheetNames)
- **File**: `backend/src/services/import/fileParser.ts` (modify)
- Implement `getSheetNames(buffer: Buffer): string[]`
- Read workbook, return `workbook.SheetNames` array
- _Leverage: SheetJS `XLSX.read()`, existing `parseExcel()` buffer handling_
- _Requirements: REQ-SI-3 AC1, REQ-SI-12 AC1_

**Acceptance Criteria:**
- [x] `getSheetNames()` returns array of sheet names
- [x] Works with multi-sheet Excel files
- [x] Returns single-element array for CSV/single-sheet files
- [x] No errors on valid workbooks

---

### 22. Extend fileParser with sheet selection and headerRow options
- **File**: `backend/src/services/import/fileParser.ts` (modify)
- Add `ParseOptions` interface with optional `sheetName` and `headerRow` fields
- Update `parseExcel(buffer, fileName, options?)` signature
- When `sheetName` provided → read that sheet instead of first
- When `headerRow` provided → use that row index instead of auto-detect
- Validate `sheetName` exists in workbook
- _Leverage: Existing `parseExcel()` logic, `isTitleRow()` helper_
- _Requirements: REQ-SI-3 AC5-AC6, REQ-SI-11 AC2, AC5_

**Acceptance Criteria:**
- [x] `ParseOptions` interface defined with optional fields
- [x] `sheetName` selects specific sheet from workbook
- [x] `headerRow` uses fixed row index (no auto-detect)
- [x] Invalid `sheetName` throws descriptive error
- [x] Default behavior preserved when no options passed

---

### 23. Extend DiffChange interface with notes and tracking1
- **File**: `backend/src/services/import/diffCalculator.ts` (modify)
- Add optional `notes?: string | null` field
- Add optional `tracking1?: string | null` field
- Update JSDoc to document Sutter usage
- _Leverage: Existing `DiffChange` interface_
- _Requirements: REQ-SI-9 AC3_

**Acceptance Criteria:**
- [x] `DiffChange` has optional `notes` field
- [x] `DiffChange` has optional `tracking1` field
- [x] Fields are optional (undefined or null for Hill)
- [x] Type exports correctly

---

### 24. Propagate notes/tracking1 through diffCalculator
- **File**: `backend/src/services/import/diffCalculator.ts` (modify)
- In `calculateReplaceAllDiff()` → copy `notes` and `tracking1` from `TransformedRow` to `DiffChange` for INSERT actions
- In `calculateMergeDiff()` → copy `notes` and `tracking1` from `TransformedRow` to `DiffChange` for INSERT/UPDATE/BOTH
- In `applyMergeLogic()` → spread `notes` and `tracking1` in `baseChange`
- _Leverage: Existing diff calculation logic_
- _Requirements: REQ-SI-9 AC3_

**Acceptance Criteria:**
- [x] INSERT actions include notes/tracking1 if present
- [x] UPDATE actions include notes/tracking1 if present
- [x] BOTH actions include notes/tracking1 if present
- [x] Hill imports unaffected (fields are null/undefined)

---

### 25. Persist notes/tracking1 in importExecutor
- **File**: `backend/src/services/import/importExecutor.ts` (modify)
- In `insertMeasure()` → include `notes` and `tracking1` in Prisma create data
- In `updateMeasure()` → include `notes` and `tracking1` in update data if non-null
- Pass `tracking1` to `calculateDueDate()` for due date calculation
- _Leverage: Existing Prisma transaction logic, `calculateDueDate()`_
- _Requirements: REQ-SI-9 AC4, AC5_

**Acceptance Criteria:**
- [x] `insertMeasure()` persists notes/tracking1 to database
- [x] `updateMeasure()` updates notes/tracking1 if provided
- [x] `tracking1` passed to due date calculation
- [x] Hill imports unaffected (fields null/undefined)

---

### 26. Extend PreviewEntry with sheetName and unmappedActions
- **File**: `backend/src/services/import/previewCache.ts` (modify)
- Add optional `sheetName?: string` field to `PreviewEntry` interface
- Add optional `unmappedActions?: UnmappedAction[]` field
- Update `storePreview()` to accept and store these fields
- _Leverage: Existing `PreviewEntry` interface, `storePreview()` function_
- _Requirements: REQ-SI-11 AC6, REQ-SI-8 AC3_

**Acceptance Criteria:**
- [x] `PreviewEntry` has optional `sheetName` field
- [x] `PreviewEntry` has optional `unmappedActions` field
- [x] `storePreview()` sets fields on entry object
- [x] Fields returned in `getPreview()` response

---

### 26a. Set insuranceGroup to 'sutter' in Sutter import pipeline
- **File**: `backend/src/services/import/sutterDataTransformer.ts` (modify)
- Ensure every `TransformedRow` produced by the Sutter transformer has `insuranceGroup: 'sutter'`
- This ensures patients created/updated during Sutter import are tagged correctly
- _Leverage: Existing `insuranceGroup` field on `TransformedRow` (set by Hill transformer)_
- _Requirements: REQ-SI-13 AC1_

**Acceptance Criteria:**
- [x] Every `TransformedRow` from Sutter import has `insuranceGroup = 'sutter'` (handled via systemId in importExecutor)
- [x] Grid filter can segment Sutter vs Hill patients
- [x] Existing Hill imports still set `insuranceGroup = 'hill'`

---

### 26b. Make validator severity system-aware for invalid requestType
- **File**: `backend/src/services/import/validator.ts` (modify)
- Add optional `systemId` parameter to `validateRows()`
- When `systemId === 'sutter'`: invalid `requestType` → severity `'warning'` (not blocking)
- When `systemId === 'hill'` or unspecified: invalid `requestType` → severity `'error'` (existing behavior)
- `VALID_REQUEST_TYPES` already includes `'Chronic DX'` and `'Screening'` — no changes needed there
- _Leverage: Existing `validateRows()` function_
- _Requirements: REQ-SI-14 AC6_

**Acceptance Criteria:**
- [x] `validateRows()` accepts optional `systemId` parameter
- [x] Sutter: invalid requestType is warning (non-blocking)
- [x] Hill: invalid requestType remains error (blocking)
- [x] Valid Sutter request types (Chronic DX, Screening) pass validation

---

### 26c. Handle zero valid tabs and empty tab errors
- **File**: `backend/src/routes/import.routes.ts` (in sheets endpoint from task 27)
- Validate that after tab filtering, at least one valid tab remains
- Return 400: "No physician data tabs found in the uploaded file" if zero tabs
- In preview endpoint: validate selected tab has data rows (not just headers)
- Return 400: "Selected tab has no patient data rows" if empty
- _Requirements: REQ-SI-3 AC4, EC-SI-1, EC-SI-9_

**Acceptance Criteria:**
- [ ] Zero valid tabs returns descriptive 400 error
- [ ] Empty physician tab returns descriptive 400 error
- [ ] Both errors include user-friendly messages

---

## Phase 5: API Endpoints

### 27. Implement POST /api/import/sheets endpoint
- **File**: `backend/src/routes/import.routes.ts` (modify)
- Create new `POST /api/import/sheets` endpoint
- Accept `file` (multipart) and `systemId` (form field)
- Call `getSheetNames(buffer)` to read workbook tabs
- Load system config, apply `skipTabs` filters
- Return `{ sheets, totalSheets, filteredSheets, skippedSheets }`
- Error if no valid tabs found
- Require authentication via `requireAuth` and `requirePatientDataAccess`
- _Leverage: `fileParser.getSheetNames()` from task 21, `configLoader.loadSystemConfig()`_
- _Requirements: REQ-SI-12 (all ACs)_

**Acceptance Criteria:**
- [ ] Endpoint accepts multipart file upload
- [ ] Reads sheet names from workbook
- [ ] Filters tabs per `skipTabs` config
- [ ] Returns list of valid physician data tabs
- [ ] Returns 400 if no valid tabs
- [ ] Authentication required

---

### 28. Extend POST /api/import/preview to accept sheetName parameter
- **File**: `backend/src/routes/import.routes.ts` (modify)
- Accept optional `sheetName` in request body (multipart form field)
- Validate: if `systemId === 'sutter'` and `sheetName` missing → 400 error
- Validate: `sheetName` exists in workbook (call `getSheetNames()`, check exact match)
- Pass `sheetName` to `parseExcel()` via `ParseOptions`
- Pass `headerRow` from config to `parseExcel()` for Sutter
- Store `sheetName` in preview cache entry
- _Leverage: `fileParser.parseExcel()` with options from task 22, `previewCache.storePreview()` from task 26_
- _Requirements: REQ-SI-11 (all ACs)_

**Acceptance Criteria:**
- [ ] `sheetName` parameter accepted in request
- [ ] Sutter imports require `sheetName`, Hill ignores it
- [ ] Invalid `sheetName` returns 400 error
- [ ] `sheetName` passed to parser for correct sheet selection
- [ ] `headerRow` from config used for Sutter
- [ ] `sheetName` stored in preview cache

---

### 29. Extend POST /api/import/preview response with unmappedActions
- **File**: `backend/src/routes/import.routes.ts` (modify)
- Include `unmappedActions` array in preview response data
- Include `unmappedActionsSummary` with `totalTypes` and `totalRows`
- Limit unmapped actions list to first 20 entries sorted by count descending
- Store `unmappedActions` in preview cache entry
- _Leverage: `SutterTransformResult.unmappedActions` from task 15_
- _Requirements: REQ-SI-8 AC1-AC3_

**Acceptance Criteria:**
- [ ] Response includes `unmappedActions` array
- [ ] Response includes `unmappedActionsSummary`
- [ ] Unmapped actions limited to 20, sorted by count
- [ ] Empty array if all actions mapped
- [ ] Stored in preview cache for later retrieval

---

### 30. Guard GET /api/import/systems/:systemId against missing Sutter fields
- **File**: `backend/src/routes/import.routes.ts` (modify)
- Update route handler to check `config.format`
- For Sutter (long format): return empty arrays for `measureColumns` and `skipColumns`, or omit fields
- For Hill (wide format): return existing `measureColumns` and `skipColumns`
- Prevent undefined property access errors
- _Leverage: `isSutterConfig()` type guard from task 3_
- _Requirements: Design component 13 note_

**Acceptance Criteria:**
- [ ] Sutter config returns safe values for Hill-only fields
- [ ] No undefined property errors
- [ ] Hill config behavior unchanged
- [ ] Response correctly formatted for both systems

---

### 31. Write integration tests for POST /api/import/sheets
- **File**: `backend/src/routes/__tests__/import.routes.test.ts` (modify)
- Test valid Sutter file returns sheet names
- Test skip tabs filter applied correctly
- Test file with no valid tabs returns 400
- Test authentication required
- Test CSV/single-sheet returns single-element array
- Estimated: ~10 tests
- _Leverage: Existing import routes test patterns, supertest_
- _Requirements: REQ-SI-12_

**Acceptance Criteria:**
- [ ] Multi-sheet file returns correct tab list
- [ ] Skip tabs excluded from response
- [ ] No valid tabs error returned
- [ ] Unauthenticated requests rejected
- [ ] Single-sheet files handled

---

### 32. Write integration tests for modified POST /api/import/preview with sheetName
- **File**: `backend/src/routes/__tests__/import.routes.test.ts` (modify)
- Test Sutter preview with valid sheetName succeeds
- Test Sutter preview without sheetName returns 400
- Test invalid sheetName returns 400
- Test Hill preview ignores sheetName (backwards compatibility)
- Test unmappedActions in response
- Estimated: ~10 tests (added to existing preview tests)
- _Leverage: Existing preview endpoint test patterns_
- _Requirements: REQ-SI-11, REQ-SI-8_

**Acceptance Criteria:**
- [ ] Valid sheetName processes correctly
- [ ] Missing sheetName for Sutter returns error
- [ ] Invalid sheetName returns descriptive error
- [ ] Hill preview unaffected by sheetName presence
- [ ] Unmapped actions returned in response

---

## Phase 6: Frontend Components

### 33. Create SheetSelector component (structure and sheet loading)
- **File**: `frontend/src/components/import/SheetSelector.tsx` (create)
- Implement component with props: `file`, `systemId`, `physicians`, `onSelect`, `onError`
- On mount: call `POST /api/import/sheets` to fetch tab list
- Display loading state during sheet discovery
- Display error state if discovery fails
- Define `SheetSelectorProps`, `SheetSelectorState` interfaces
- _Leverage: Existing import component patterns, `api` utilities_
- _Requirements: REQ-SI-4 AC1, AC2_

**Acceptance Criteria:**
- [ ] Component renders without errors
- [ ] Calls `/api/import/sheets` on mount
- [ ] Shows loading spinner during fetch
- [ ] Shows error message on failure
- [ ] Props interface typed correctly

---

### 34. Add sheet dropdown to SheetSelector
- **File**: `frontend/src/components/import/SheetSelector.tsx` (modify from task 33)
- Render dropdown with all valid physician tab names
- Display tabs in workbook order
- Handle tab selection → update state
- If exactly one tab → pre-select it
- _Leverage: Tailwind dropdown patterns from existing components_
- _Requirements: REQ-SI-4 AC3, AC10, NFR-SI-16_

**Acceptance Criteria:**
- [ ] Dropdown shows all valid tab names
- [ ] Tabs ordered as they appear in workbook
- [ ] User can select a tab
- [ ] Single-tab files pre-select the tab
- [ ] Keyboard accessible (Tab, Enter, Escape)

---

### 35. Add physician auto-matching to SheetSelector
- **File**: `frontend/src/components/import/SheetSelector.tsx` (modify from task 34)
- When tab selected: extract tab name parts (split on comma/space)
- Compare against physician `displayName` (case-insensitive substring match)
- Score by longest matching substring length
- Pre-select physician with highest score
- Display "(suggested)" label next to auto-matched physician
- Allow user to override suggestion
- _Leverage: `physicians` array from props (from `GET /api/users/physicians`)_
- _Requirements: REQ-SI-4 AC4-AC6, REQ-SI-15 (all ACs), NFR-SI-18_

**Acceptance Criteria:**
- [ ] Tab name parsed for physician match
- [ ] Physician dropdown pre-selects best match
- [ ] "(suggested)" label displayed for auto-match
- [ ] User can manually override selection
- [ ] No match → dropdown unselected

---

### 36. Add physician confirmation to SheetSelector
- **File**: `frontend/src/components/import/SheetSelector.tsx` (modify from task 35)
- Display physician assignment dropdown below tab selector
- Populate with physicians from props
- On selection change → call `onSelect(sheetName, physicianId)`
- Validate: both tab and physician selected before allowing proceed
- _Leverage: Existing physician dropdown patterns from ImportPage_
- _Requirements: REQ-SI-4 AC7-AC9_

**Acceptance Criteria:**
- [ ] Physician dropdown renders below tab selector
- [ ] Displays all physicians from props
- [ ] Calls `onSelect` callback when both selected
- [ ] Prevents proceed if physician not selected
- [ ] Visual indicator for selected physician

---

### 37. Integrate SheetSelector into ImportPage
- **File**: `frontend/src/pages/ImportPage.tsx` (modify)
- Add Sutter to `HEALTHCARE_SYSTEMS` array
- Add state: `sheets`, `selectedSheet`, `sheetPhysicianId`
- Show SheetSelector step conditionally when `systemId === 'sutter'`
- Position between file upload and preview button
- Dynamic step numbering: adjust step numbers when SheetSelector shown
- Pass `sheetName` in form data when calling `POST /api/import/preview`
- _Leverage: Existing ImportPage state management, conditional rendering patterns_
- _Requirements: REQ-SI-4 AC1, AC8, AC9, NFR-SI-17, NFR-SI-21_

**Acceptance Criteria:**
- [ ] Sutter appears in healthcare system dropdown
- [ ] SheetSelector shown only for Sutter system
- [ ] Step numbers adjust dynamically
- [ ] `sheetName` included in preview request
- [ ] Hill imports unaffected (no SheetSelector)

---

### 38. Create UnmappedActionsBanner component
- **File**: `frontend/src/components/import/UnmappedActionsBanner.tsx` (create)
- Display info banner when `unmappedActions` array is non-empty
- Show summary: "X rows skipped: action type not yet configured (Y action types)"
- Expandable details section with table of action texts and counts
- Use `role="status"` for screen reader announcement
- Define `UnmappedActionsBannerProps` interface
- _Leverage: Tailwind banner patterns, existing info/warning components_
- _Requirements: REQ-SI-8 AC4, AC5, NFR-SI-20, NFR-SI-24_

**Acceptance Criteria:**
- [ ] Banner displays when unmapped actions present
- [ ] Summary shows counts (rows, action types)
- [ ] Details section expandable/collapsible
- [ ] Table shows action text and row count
- [ ] ARIA role set for accessibility
- [ ] Hidden when unmappedActions empty

---

### 39. Integrate UnmappedActionsBanner into ImportPreviewPage
- **File**: `frontend/src/pages/ImportPreviewPage.tsx` (modify)
- Extract `unmappedActions` from preview response
- Calculate `totalSkippedRows` by summing counts
- Render `UnmappedActionsBanner` at top of preview (if present)
- _Leverage: Existing preview page layout_
- _Requirements: REQ-SI-8 AC4_

**Acceptance Criteria:**
- [ ] Banner renders on preview page
- [ ] Positioned above diff summary
- [ ] Only shown when unmapped actions exist
- [ ] Total skipped rows calculated correctly

---

### 40. Display sheetName and physician in ImportPreviewPage header
- **File**: `frontend/src/pages/ImportPreviewPage.tsx` (modify)
- Extract `sheetName` from preview response
- Display in preview header: "Importing from tab: [sheetName]"
- Display assigned physician name
- _Leverage: Existing preview header layout_
- _Requirements: NFR-SI-19_

**Acceptance Criteria:**
- [ ] Sheet name displayed in preview header
- [ ] Physician name displayed
- [ ] Only shown for Sutter imports
- [ ] Hill imports show existing header (unchanged)

---

## Phase 7: Backend Unit Tests

### 41. Write unit tests for configLoader with Sutter config
- **File**: `backend/src/services/import/__tests__/configLoader.test.ts` (modify)
- Test `loadSystemConfig('sutter')` returns `SutterSystemConfig`
- Test `isSutterConfig()` type guard correctly identifies Sutter
- Test union type allows both Hill and Sutter
- Test missing sutter.json throws error
- Estimated: ~10 tests (added to existing config tests)
- _Leverage: Existing configLoader test patterns_
- _Requirements: REQ-SI-2 AC8_

**Acceptance Criteria:**
- [ ] Sutter config loads without errors
- [ ] Type guard works correctly
- [ ] Hill config still loads (no regression)
- [ ] Missing config file error thrown

---

### 42. Write unit tests for fileParser with multi-sheet support
- **File**: `backend/src/services/import/__tests__/fileParser.test.ts` (modify)
- Test `getSheetNames()` returns all sheet names
- Test `parseExcel()` with `sheetName` option selects correct sheet
- Test `parseExcel()` with `headerRow` option uses fixed row index
- Test invalid `sheetName` throws error
- Test CSV/single-sheet behavior unchanged
- Estimated: ~10 tests (added to existing parser tests)
- _Leverage: Existing fileParser test patterns, sample Excel files_
- _Requirements: REQ-SI-3, REQ-SI-11_

**Acceptance Criteria:**
- [ ] Sheet names extracted correctly
- [ ] Specific sheet parsed when requested
- [ ] Header row fixed when specified
- [ ] Invalid sheet name error descriptive
- [ ] Default behavior preserved

---

### 43. Write unit tests for diffCalculator with notes/tracking1 propagation
- **File**: `backend/src/services/import/__tests__/diffCalculator.test.ts` (modify)
- Test INSERT actions include notes/tracking1 from TransformedRow
- Test UPDATE actions include notes/tracking1
- Test SKIP actions handle notes/tracking1
- Test BOTH actions include notes/tracking1
- Test Hill imports (null fields) unaffected
- Estimated: ~8 tests (added to existing diff tests)
- _Leverage: Existing diffCalculator test patterns_
- _Requirements: REQ-SI-9 AC3_

**Acceptance Criteria:**
- [ ] notes/tracking1 propagate through INSERT
- [ ] notes/tracking1 propagate through UPDATE
- [ ] BOTH actions handle correctly
- [ ] Null/undefined fields don't break logic

---

### 44. Write unit tests for importExecutor with notes/tracking1 persistence
- **File**: `backend/src/services/import/__tests__/importExecutor.test.ts` (modify)
- Test `insertMeasure()` persists notes/tracking1 to database
- Test `updateMeasure()` updates notes/tracking1 if non-null
- Test null fields don't overwrite existing data
- Test tracking1 passed to calculateDueDate
- Estimated: ~8 tests (added to existing executor tests)
- _Leverage: Existing importExecutor test patterns, Prisma mocks_
- _Requirements: REQ-SI-9 AC4, AC5_

**Acceptance Criteria:**
- [ ] notes persisted on insert
- [ ] tracking1 persisted on insert
- [ ] notes updated on update if provided
- [ ] tracking1 updated on update if provided
- [ ] null fields handled gracefully

---

### 45. Write unit tests for previewCache with sheetName/unmappedActions
- **File**: `backend/src/services/import/__tests__/previewCache.test.ts` (modify)
- Test `storePreview()` stores sheetName field
- Test `storePreview()` stores unmappedActions array
- Test `getPreview()` returns sheetName
- Test `getPreview()` returns unmappedActions
- Test Hill imports (undefined fields) work correctly
- Estimated: ~5 tests (added to existing cache tests)
- _Leverage: Existing previewCache test patterns_
- _Requirements: REQ-SI-11 AC6, REQ-SI-8 AC3_

**Acceptance Criteria:**
- [ ] sheetName stored and retrieved
- [ ] unmappedActions stored and retrieved
- [ ] Optional fields don't break cache
- [ ] Hill previews unaffected

---

### 46. Write integration tests for validator with Sutter data
- **File**: `backend/src/services/import/__tests__/validator.test.ts` (modify)
- Test Sutter TransformedRows validate correctly
- Test `Chronic DX` and `Screening` request types accepted
- Test Sutter quality measures accepted
- Test validation errors reported consistently
- Estimated: ~5 tests (added to existing validator tests)
- _Leverage: Existing validator test patterns_
- _Requirements: REQ-SI-14 AC1, AC6_

**Acceptance Criteria:**
- [ ] Sutter request types recognized as valid
- [ ] Sutter quality measures recognized
- [ ] Missing required fields flagged
- [ ] Invalid values flagged

---

### 47. Write end-to-end backend tests for Sutter import flow
- **File**: `backend/src/services/import/__tests__/sutter-import-flow.test.ts` (create)
- Test complete flow: parse Sutter file → map columns → transform → validate → diff → execute
- Test AWV, HCC, and Quality rows process correctly
- Test unmapped actions aggregated
- Test insuranceGroup set to 'sutter'
- Test notes/tracking1 persisted
- Estimated: ~15 tests
- _Leverage: Existing Hill import flow test patterns, sample Sutter Excel file_
- _Requirements: All Sutter requirements_

**Acceptance Criteria:**
- [ ] Full import pipeline works end-to-end
- [ ] All request types handled
- [ ] Unmapped actions collected
- [ ] Database records created correctly
- [ ] insuranceGroup field set

---

### 48. Write tests for error scenarios (malformed config, corrupted file, etc.)
- **File**: `backend/src/services/import/__tests__/sutter-error-handling.test.ts` (create)
- Test malformed action mapping regex
- Test corrupted Excel file
- Test header row not at expected index
- Test empty physician tab
- Test Hill file with Sutter system selected
- Test Sutter file with Hill system selected
- Estimated: ~10 tests
- _Leverage: Error handler test patterns_
- _Requirements: NFR-SI-11, NFR-SI-12, NFR-SI-13, EC-SI-1, EC-SI-10, EC-SI-11_

**Acceptance Criteria:**
- [ ] Malformed regex logged, skipped (no crash)
- [ ] Corrupted file returns descriptive error
- [ ] Header row fallback logic works
- [ ] Empty tab error descriptive
- [ ] Format mismatch errors clear

---

### 49. Write edge case tests (vaccine variations, mixed request types, etc.)
- **File**: `backend/src/services/import/__tests__/sutter-edge-cases.test.ts` (create)
- Test vaccine action text variations (all map to "Vaccination")
- Test mixed request types in same tab
- Test same patient with multiple actions
- Test action text with whitespace/line breaks
- Test Excel serial number in Measure Details (not converted)
- Test re-import same file (all SKIP)
- Estimated: ~15 tests
- _Leverage: Edge case test patterns_
- _Requirements: EC-SI-4, EC-SI-5, EC-SI-6, EC-SI-7, EC-SI-12, EC-SI-14_

**Acceptance Criteria:**
- [ ] Vaccine variants all map correctly
- [ ] Mixed request types handled
- [ ] Multiple actions per patient allowed
- [ ] Whitespace normalized
- [ ] Excel serial not converted outside DOB

---

### 50. Write performance tests for Sutter import
- **File**: `backend/src/services/import/__tests__/sutter-performance.test.ts` (create)
- Test 1,000-row Sutter tab transforms within 1 second
- Test action mapping regex cache reused (not rebuilt per row)
- Test overall preview < 10 seconds for typical tab
- Estimated: ~5 tests
- _Leverage: Performance test patterns (timing assertions)_
- _Requirements: NFR-SI-1, NFR-SI-3, NFR-SI-4, NFR-SI-5_

**Acceptance Criteria:**
- [ ] Large tab processes within time limits
- [ ] Regex cache built once
- [ ] No performance regressions
- [ ] Memory usage reasonable

---

## Phase 8: Frontend Component Tests

### 51. Write component tests for SheetSelector
- **File**: `frontend/src/components/import/SheetSelector.test.tsx` (create)
- Test component renders without errors
- Test tab dropdown populated from API response
- Test physician auto-matching logic
- Test manual physician override
- Test "(suggested)" label display
- Test loading state during sheet discovery
- Test error state on API failure
- Test keyboard accessibility (Tab, Enter, Escape)
- Estimated: ~15 tests
- _Leverage: Vitest component test patterns, React Testing Library_
- _Requirements: REQ-SI-4, REQ-SI-15, NFR-SI-22_

**Acceptance Criteria:**
- [ ] Component renders correctly
- [ ] Dropdowns functional
- [ ] Auto-match algorithm works
- [ ] Loading/error states correct
- [ ] Keyboard navigation works

---

### 52. Write component tests for UnmappedActionsBanner
- **File**: `frontend/src/components/import/UnmappedActionsBanner.test.tsx` (create)
- Test banner renders when unmappedActions present
- Test banner hidden when unmappedActions empty
- Test expand/collapse details section
- Test table displays action texts and counts
- Test ARIA role set correctly
- Test summary text formatting
- Estimated: ~8 tests
- _Leverage: Vitest component test patterns_
- _Requirements: REQ-SI-8, NFR-SI-24_

**Acceptance Criteria:**
- [ ] Banner shows/hides correctly
- [ ] Details expand/collapse
- [ ] Table renders action data
- [ ] ARIA attributes correct
- [ ] Summary text accurate

---

### 53. Write component tests for ImportPage with SheetSelector integration
- **File**: `frontend/src/pages/ImportPage.test.tsx` (modify)
- Test Sutter system selection shows SheetSelector
- Test Hill system selection hides SheetSelector
- Test step numbering adjusts dynamically
- Test sheetName included in preview request
- Test physician assignment required for Sutter
- Test single-tab file pre-selects tab
- Estimated: ~12 tests (added to existing ImportPage tests)
- _Leverage: Existing ImportPage test patterns_
- _Requirements: REQ-SI-4, NFR-SI-17, NFR-SI-21_

**Acceptance Criteria:**
- [ ] SheetSelector conditional rendering works
- [ ] Step numbers correct for both systems
- [ ] Form data includes sheetName
- [ ] Validation prevents proceed without physician
- [ ] Single-tab pre-selection works

---

### 54. Write component tests for ImportPreviewPage with UnmappedActionsBanner
- **File**: `frontend/src/pages/ImportPreviewPage.test.tsx` (modify)
- Test UnmappedActionsBanner renders when unmapped actions present
- Test banner hidden when all actions mapped
- Test sheetName displays in header
- Test physician name displays in header
- Test total skipped rows calculated correctly
- Estimated: ~8 tests (added to existing preview tests)
- _Leverage: Existing ImportPreviewPage test patterns_
- _Requirements: REQ-SI-8, NFR-SI-19_

**Acceptance Criteria:**
- [ ] Banner conditional rendering works
- [ ] Header shows sheetName and physician
- [ ] Skipped row count accurate
- [ ] Hill previews unaffected

---

## Phase 9: E2E Integration Tests

### 55. Write Playwright E2E test for full Sutter import flow
- **File**: `frontend/e2e/sutter-import.spec.ts` (create)
- Test user journey: select Sutter system → upload file → select tab → confirm physician → preview → execute
- Test sheet discovery API call
- Test physician auto-matching
- Test preview shows unmapped actions banner
- Test execute completes and redirects to grid
- Test grid shows imported patients with insuranceGroup = 'sutter'
- Estimated: ~10 tests
- _Leverage: Existing Playwright test patterns, `MainPage` page object_
- _Requirements: All Sutter requirements end-to-end_

**Acceptance Criteria:**
- [ ] Full import flow works in real browser
- [ ] Tab selector appears for Sutter
- [ ] Physician auto-match suggests correct physician
- [ ] Preview displays correctly
- [ ] Execute creates records
- [ ] Grid filters by insurance group work

---

### 56. Write Playwright E2E test for error scenarios
- **File**: `frontend/e2e/sutter-import-errors.spec.ts` (create)
- Test file with no valid tabs shows error
- Test missing physician selection shows error
- Test Hill file with Sutter system shows validation error
- Test empty physician tab shows error
- Estimated: ~5 tests
- _Leverage: Playwright error assertion patterns_
- _Requirements: EC-SI-1, EC-SI-9, EC-SI-10_

**Acceptance Criteria:**
- [ ] No valid tabs error displayed
- [ ] Missing physician error displayed
- [ ] Format mismatch error displayed
- [ ] Empty tab error displayed

---

### 57. Write Playwright E2E test for edge cases
- **File**: `frontend/e2e/sutter-import-edge-cases.spec.ts` (create)
- Test single-tab file pre-selects tab
- Test manual physician override
- Test re-import same file (all skipped)
- Test concurrent Sutter and Hill imports
- Estimated: ~5 tests
- _Leverage: Playwright test patterns_
- _Requirements: EC-SI-2, EC-SI-14, EC-SI-15_

**Acceptance Criteria:**
- [ ] Single-tab pre-selection works
- [ ] Override suggestion works
- [ ] Re-import shows 0 inserts
- [ ] Concurrent imports don't conflict

---

## Phase 10: Visual Review (MANDATORY)

### 58. Visual browser review of Sutter import UI flow
- **Agent**: ui-ux-reviewer (MCP Playwright)
- **Purpose**: MANDATORY visual verification of ALL UI changes per project rules
- Open real browser, navigate to import page
- Select Sutter/SIP system, upload sample Sutter file
- Verify sheet selector dropdown appearance and tab names
- Verify physician auto-matching pre-selects correct physician
- Verify "(suggested)" label displays correctly
- Click through to preview, verify unmapped actions banner
- Verify preview header shows sheetName and physician name
- Take screenshots at each step
- Verify step numbering adjusts dynamically
- Test keyboard navigation (Tab, Enter, Escape)
- Verify ARIA roles and labels for accessibility
- _Requirements: ALL UI requirements, NFR-SI-16 through NFR-SI-24_

**Acceptance Criteria:**
- [ ] Sheet selector renders correctly in real browser
- [ ] Tab dropdown shows all tabs in order
- [ ] Physician dropdown pre-selects matched physician
- [ ] "(suggested)" label visible
- [ ] Step numbers adjust for Sutter (5 steps vs Hill 4 steps)
- [ ] Unmapped actions banner displays when present
- [ ] Preview header shows sheetName and physician
- [ ] Keyboard navigation works (no mouse required)
- [ ] Screen reader announces status messages
- [ ] Screenshots captured for all key states
- [ ] No console errors
- [ ] Visual design consistent with existing import flow

---

## Summary

**Total Tasks: 61**

**Breakdown by Phase:**
1. Config/Types: 4 tasks (1-4)
2. Backend Strategy Refactoring: 6 tasks (5-10) — ⚠️ Tasks 6 and 9 must run AFTER tasks 11 and 14-16
3. Sutter Backend Components: 10 tasks (11-20, including 4 unit test tasks)
4. Pipeline Extensions: 6 tasks (21-26) + 3 added tasks (26a-26c: insuranceGroup, validator, tab errors)
5. API Endpoints: 6 tasks (27-32, including 2 integration test tasks)
6. Frontend Components: 8 tasks (33-40)
7. Backend Unit Tests: 10 tasks (41-50)
8. Frontend Component Tests: 4 tasks (51-54)
9. E2E Integration Tests: 3 tasks (55-57)
10. Visual Review: 1 task (58, MANDATORY)

**Recommended Execution Order:**
1→2→3→4 → 5→7→8 → 11→12→13→14→15→16 → **6**→**9**→10 → 17→18→19→20 → 21→22→23→24→25→26→26a→26b→26c → 27→28→29→30→31→32 → 33→34→35→36→37→38→39→40 → 41-50 → 51-54 → 55-57 → **58**

**Estimated Test Coverage:**
- Jest (backend): ~131 new tests
- Vitest (frontend): ~35 new tests
- Playwright E2E: ~10 new tests
- Jest API integration: ~10 new tests (included in backend count)
- **Total: ~186 new automated tests**

**Key Reuse Points:**
- `extractPatientData()`, `normalizePhone()` from Hill transformer
- `parseDate()`, `toISODateString()` from dateParser
- `diffCalculator`, `importExecutor`, `validator` with minimal extensions
- Existing authentication, audit logging, insurance group infrastructure
- SheetJS (XLSX) multi-sheet API
- React component patterns, Tailwind styling, form validation

**Dependency Chain:**
- Config files and type definitions must be completed before backend implementation
- Backend strategy refactoring must precede Sutter-specific components
- API endpoints depend on backend components
- Frontend components depend on API endpoints
- Tests depend on implementation but can be interleaved
- Visual review must be LAST (requires all UI implementation complete)

**Critical Path:**
Tasks 1-4 (config) → 5,7,8 (Hill extraction) → 11-16 (Sutter components) → 6,9 (dispatchers) → 10 (TransformedRow) → 21-26,26a-c (pipeline+validator+insuranceGroup) → 27-32 (API) → 33-40 (frontend) → 58 (visual review)

**Atomic Validation:**
- Each task touches 1-3 files
- Each task completable in 15-30 minutes
- Each task has single testable outcome
- All file paths specified
- Requirements and leverage points documented
