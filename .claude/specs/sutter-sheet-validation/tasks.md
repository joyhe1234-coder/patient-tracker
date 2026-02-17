# Implementation Plan: Import Sheet Validation & Flexible Import Steps

## Task Overview

This implementation enhances the import pipeline with three major areas: universal header-based sheet validation for all systems, default "Not Addressed" status for unmapped Sutter actions, and configurable preview columns. The design specifies implementation order: Area 2 first (smallest), then Area 1 (largest), then Area 3.

Total estimated implementation time: **8-12 hours** across 42 atomic tasks.

## Steering Document Compliance

### Structure.md Alignment
- **Backend services**: New functions in `backend/src/services/import/fileParser.ts`, `configLoader.ts`
- **Route handlers**: Modify `backend/src/routes/import.routes.ts`
- **System configs**: Add fields to `backend/src/config/import/sutter.json`
- **Frontend pages**: Update `frontend/src/pages/ImportPage.tsx`, `ImportPreviewPage.tsx`
- **Frontend components**: Update `frontend/src/components/import/SheetSelector.tsx`

### Tech.md Alignment
- **TypeScript strict typing**: All interfaces explicitly typed
- **SheetJS (XLSX)**: Single `XLSX.read()` call reused via `getWorkbookInfo()`
- **Express pattern**: `try/catch -> next(createError(...))`
- **Test frameworks**: Jest (backend), Vitest (frontend), Cypress (E2E), MCP Playwright (visual)

## Atomic Task Requirements
**Each task meets these criteria:**
- **File Scope**: 1-3 related files maximum
- **Time Boxing**: 15-30 minutes per task
- **Single Purpose**: One testable outcome
- **Specific Files**: Exact file paths specified
- **Agent-Friendly**: Clear input/output, minimal context switching

## Tasks

### Phase 1: Area 2 — Default "Not Addressed" Status (Smallest)

- [ ] 1. Add systemId parameter to validator.ts validateRow function
  - File: `backend/src/services/import/validator.ts`
  - Add `systemId: string` parameter to `validateRow()` signature
  - Suppress "measure status is empty" warning when `systemId === 'sutter'`
  - Update internal calls to pass systemId through
  - Purpose: Enable system-specific validation behavior
  - _Leverage: existing validateRow implementation, error building pattern_
  - _Requirements: REQ-SV-8_

- [ ] 2. Update validateRows to accept and pass systemId parameter
  - File: `backend/src/services/import/validator.ts`
  - Add `systemId: string` parameter to `validateRows()` signature
  - Pass systemId to each `validateRow()` call in the loop
  - Update JSDoc comments
  - Purpose: Thread systemId through validation pipeline
  - _Leverage: existing validateRows implementation_
  - _Requirements: REQ-SV-8_

- [ ] 3. Update import.routes.ts validateRows calls with systemId
  - File: `backend/src/routes/import.routes.ts`
  - Find all calls to `validateRows()` in preview endpoint
  - Pass `systemId` from request context to validateRows
  - Purpose: Connect route handler to updated validator
  - _Leverage: existing preview endpoint implementation_
  - _Requirements: REQ-SV-8_

- [ ] 4. Default measureStatus to "Not Addressed" in sutterDataTransformer.ts
  - File: `backend/src/services/import/sutterDataTransformer.ts`
  - In `transformSutterRow()`, after actionMapper match, add safety net: `measureStatus = match.measureStatus || 'Not Addressed'`
  - For unmapped actions (no match), explicitly set `measureStatus = 'Not Addressed'`
  - Update comments to explain silent defaulting
  - Purpose: Prevent empty measureStatus for Sutter imports
  - _Leverage: existing actionMapper integration, transformSutterRow logic_
  - _Requirements: REQ-SV-8_

- [ ] 5. Write validator tests for Sutter warning suppression
  - File: `backend/src/services/import/__tests__/validator.test.ts`
  - Test case: Sutter row with empty measureStatus → no warning generated
  - Test case: Hill row with empty measureStatus → warning still generated
  - Test case: validateRows passes systemId correctly
  - Purpose: Verify system-specific validation behavior
  - _Leverage: existing validator test patterns, mock data_
  - _Requirements: REQ-SV-8 (AC 2, 5)_

- [ ] 6. Write sutterDataTransformer tests for status defaulting
  - File: `backend/src/services/import/__tests__/sutterDataTransformer.test.ts`
  - Test case: Unmapped action → measureStatus = "Not Addressed"
  - Test case: Mapped action with empty measureStatus → "Not Addressed"
  - Test case: Mapped action with valid measureStatus → unchanged
  - Purpose: Verify defaulting behavior
  - _Leverage: existing transformer test patterns, Sutter fixtures_
  - _Requirements: REQ-SV-8 (AC 1, 3, 4)_

### Phase 2: Area 1 — Universal Header-Based Sheet Validation (Largest)

#### Backend: fileParser.ts

- [ ] 7. Create getWorkbookInfo function in fileParser.ts
  - File: `backend/src/services/import/fileParser.ts`
  - Implement `getWorkbookInfo(buffer: Buffer): { sheetNames: string[]; workbook: XLSX.WorkBook }`
  - Call `XLSX.read(buffer, { type: 'buffer' })` once
  - Extract `workbook.SheetNames`
  - Return both sheetNames array and workbook object
  - Purpose: Single XLSX.read() call for reuse
  - _Leverage: existing XLSX import, buffer handling patterns_
  - _Requirements: REQ-SV-1 (AC 1), REQ-SV-7 (AC 3)_

- [ ] 8. Create getSheetHeaders function in fileParser.ts
  - File: `backend/src/services/import/fileParser.ts`
  - Implement `getSheetHeaders(workbook: XLSX.WorkBook, sheetNames: string[], headerRowIndex: number): Map<string, string[]>`
  - For each sheet, read only the header row using `XLSX.utils.sheet_to_json(worksheet, { header: 1, range: headerRowIndex })`
  - Trim whitespace from each header value
  - Handle out-of-bounds row index → return empty array
  - Handle sheet read errors → log, return empty array for that sheet
  - Return Map<sheetName, headers[]>
  - Purpose: Efficient header-only reading without full parse
  - _Leverage: existing XLSX sheet_to_json usage, error handling patterns_
  - _Requirements: REQ-SV-1 (AC 2, 6, 7), REQ-SV-2 (AC 5)_

- [ ] 9. Refactor getSheetNames to delegate to getWorkbookInfo
  - File: `backend/src/services/import/fileParser.ts`
  - Update existing `getSheetNames(buffer: Buffer): string[]` to call `getWorkbookInfo(buffer).sheetNames`
  - Preserve backward compatibility
  - Update JSDoc comments
  - Purpose: Reuse workbook reading logic
  - _Leverage: new getWorkbookInfo function_
  - _Requirements: REQ-SV-1 (maintain existing API)_

- [ ] 10. Write fileParser tests for getWorkbookInfo
  - File: `backend/src/services/import/__tests__/fileParser.test.ts`
  - Test case: Single XLSX.read() call verified
  - Test case: Returns sheet names correctly
  - Test case: Returns workbook object
  - Purpose: Verify workbook info extraction
  - _Leverage: existing fileParser test setup, XLSX mocks_
  - _Requirements: REQ-SV-1 (AC 1), REQ-SV-7 (AC 3)_

- [ ] 11. Write fileParser tests for getSheetHeaders
  - File: `backend/src/services/import/__tests__/fileParser.test.ts`
  - Test case: Reads headers at row 0 for Hill
  - Test case: Reads headers at row 3 for Sutter
  - Test case: Trims whitespace from headers
  - Test case: Returns empty array for out-of-bounds headerRow
  - Test case: Returns empty array for sheet with fewer than 3 non-empty cells
  - Test case: Handles sheet read error gracefully
  - Purpose: Verify header reading logic
  - _Leverage: existing test fixtures for Hill + Sutter workbooks_
  - _Requirements: REQ-SV-1 (AC 2, 6, 7), REQ-SV-2 (AC 5)_

#### Backend: configLoader.ts

- [ ] 12. Add PreviewColumnDef and RequiredColumns interfaces to configLoader.ts
  - File: `backend/src/services/import/configLoader.ts`
  - Define `PreviewColumnDef` interface: `{ field: string; label: string; source: string; }`
  - Define `RequiredColumns` interface: `{ patientColumns: string[]; dataColumns: string[]; minDataColumns: number; }`
  - Add `previewColumns?: PreviewColumnDef[]` to `SystemConfigBase` type
  - Add `headerRow?: number` to `SystemConfigBase` type (defaults to 0)
  - Export new types
  - Purpose: Type safety for sheet validation and preview columns
  - _Leverage: existing config type patterns_
  - _Requirements: REQ-SV-1 (AC 2), REQ-SV-2 (AC 1), REQ-SV-9 (AC 2)_

- [ ] 13. Create getRequiredColumns function in configLoader.ts
  - File: `backend/src/services/import/configLoader.ts`
  - Implement `getRequiredColumns(config: HillSystemConfig | SutterSystemConfig): RequiredColumns`
  - For Hill: extract keys mapped to memberName/memberDob from patientColumns, first 3 keys from measureColumns
  - For Sutter: extract keys mapped to memberName/memberDob from patientColumns, dataColumns entries
  - Set `minDataColumns = 1` for both systems
  - Purpose: Derive required columns from system config
  - _Leverage: existing config type guards (isHillConfig, isSutterConfig)_
  - _Requirements: REQ-SV-2 (AC 1, 2, 3)_

- [ ] 14. Write configLoader tests for getRequiredColumns
  - File: `backend/src/services/import/__tests__/configLoader.test.ts`
  - Test case: Hill config → Patient, DOB, measure columns
  - Test case: Sutter config → Member Name, Member DOB, data columns
  - Test case: Config with changed patientColumns mapping → new column names
  - Purpose: Verify required columns derivation
  - _Leverage: existing Hill + Sutter config fixtures_
  - _Requirements: REQ-SV-2 (AC 1, 2, 3)_

#### Backend: import.routes.ts

- [ ] 15. Add InvalidSheet interface to import.routes.ts
  - File: `backend/src/routes/import.routes.ts`
  - Define `InvalidSheet` interface: `{ name: string; reason: string; }`
  - Place near top of file with other interfaces
  - Purpose: Type safety for validation results
  - _Requirements: REQ-SV-3 (AC 2, 4)_

- [ ] 16. Create validateSheetHeaders helper function in import.routes.ts
  - File: `backend/src/routes/import.routes.ts`
  - Implement `validateSheetHeaders(sheetName: string, headers: string[], required: RequiredColumns): InvalidSheet | null`
  - Build set of lowercase trimmed headers
  - Check minimum 3 non-empty cells
  - Check all patientColumns present (case-insensitive)
  - Check at least minDataColumns data columns present
  - Return null if valid, `{ name, reason }` if invalid
  - Purpose: Core header validation logic
  - _Leverage: existing string comparison patterns_
  - _Requirements: REQ-SV-1 (AC 3, 4, 5), REQ-SV-2 (AC 4, 5)_

- [ ] 17. Refactor POST /api/import/sheets handler for universal validation
  - File: `backend/src/routes/import.routes.ts`
  - Replace system-specific logic with universal flow:
    1. Call `getWorkbookInfo(buffer)` → sheetNames + workbook
    2. Apply name-based filtering if config has skipTabs → skippedSheets
    3. Call `getRequiredColumns(config)` → required
    4. Call `getSheetHeaders(workbook, candidates, config.headerRow ?? 0)` → headerMap
    5. For each candidate, call `validateSheetHeaders()` → valid or invalid
    6. If no valid sheets, return 400 NO_VALID_TABS with counts
    7. Return `{ sheets: validSheets, totalSheets, filteredSheets, skippedSheets, invalidSheets }`
  - Remove `isSutter` checks for sheet discovery (now universal)
  - Purpose: Generalize sheet discovery for all systems
  - _Leverage: new getWorkbookInfo, getSheetHeaders, getRequiredColumns, validateSheetHeaders_
  - _Requirements: REQ-SV-1 (AC 1, 8, 9), REQ-SV-3 (AC 1, 2, 3), REQ-SV-4 (AC 1, 2, 3)_

- [ ] 18. Write import.routes.ts tests for Hill header validation
  - File: `backend/src/routes/__tests__/import.routes.test.ts`
  - Test case: POST /sheets for Hill → validates headers, returns valid sheets
  - Test case: Hill file with invalid tab → excluded, appears in invalidSheets
  - Test case: Hill CSV with wrong columns → NO_VALID_TABS error
  - Purpose: Verify Hill system header validation
  - _Leverage: existing route test patterns, Hill fixtures_
  - _Requirements: REQ-SV-1 (AC 1, 4), REQ-SV-4 (AC 1)_

- [ ] 19. Write import.routes.ts tests for Sutter header validation
  - File: `backend/src/routes/__tests__/import.routes.test.ts`
  - Test case: POST /sheets for Sutter → skipTabs + header validation
  - Test case: Sutter tab excluded by name → appears in skippedSheets only
  - Test case: Sutter tab excluded by headers → appears in invalidSheets
  - Test case: All Sutter tabs excluded → NO_VALID_TABS with counts
  - Purpose: Verify Sutter two-stage filtering
  - _Leverage: existing Sutter fixtures, route test patterns_
  - _Requirements: REQ-SV-1 (AC 8), REQ-SV-3 (AC 1, 2), REQ-SV-4 (AC 2, 3)_

- [ ] 20. Write import.routes.ts tests for edge cases
  - File: `backend/src/routes/__tests__/import.routes.test.ts`
  - Test case: Sheet with headers at wrong row → invalid (EC-SV-2)
  - Test case: Sheet with partial required columns → invalid (EC-SV-3)
  - Test case: Sheet with extra columns beyond required → valid (EC-SV-4)
  - Test case: Very large workbook (20+ sheets) → completes within 3 seconds (EC-SV-8)
  - Test case: Sheet with correct headers but zero data rows → still valid (EC-SV-1)
  - Test case: Sheet with merged cells in header row → handles gracefully (EC-SV-7)
  - Test case: CSV file single sheet → header validation applied (EC-SV-9)
  - Purpose: Verify edge case handling
  - _Leverage: custom test fixtures for edge cases_
  - _Requirements: REQ-SV-1 (AC 7), REQ-SV-7 (AC 2), EC-SV-1, EC-SV-7, EC-SV-9_

#### Frontend: ImportPage.tsx

- [ ] 21. Generalize ImportPage.tsx sheet selector step for all systems
  - File: `frontend/src/pages/ImportPage.tsx`
  - Remove `isSutter` check for sheet selector visibility
  - Change: `{isSutter && file && (<SheetSelector .../>)}` → `{file && (<SheetSelector .../>)}`
  - Remove separate physician selection step (Step 3) — now inside SheetSelector
  - Update step numbering: Step 4 is "Select Tab & Physician" for all systems
  - Purpose: Unify import flow for all systems
  - _Leverage: existing SheetSelector component_
  - _Requirements: REQ-SV-5 (AC 1, 2, 3, 4), REQ-SV-6 (AC 1, 2, 3)_

- [ ] 22. Pass invalidSheets prop to SheetSelector component
  - File: `frontend/src/pages/ImportPage.tsx`
  - Update SheetSelector invocation to pass `invalidSheets={sheetsData?.invalidSheets || []}`
  - Handle invalidSheets in state if needed
  - Purpose: Enable invalid sheets display in SheetSelector
  - _Leverage: existing sheets API response handling_
  - _Requirements: REQ-SV-5 (AC 5)_

- [ ] 23. Update ImportPage.tsx step labels
  - File: `frontend/src/pages/ImportPage.tsx`
  - Update step 4 label to "Select Tab & Physician"
  - Remove old physician-only step if exists
  - Update any conditional rendering based on step numbers
  - Purpose: Clear UI labeling for unified flow
  - _Leverage: existing step indicator components_
  - _Requirements: REQ-SV-6 (AC 1)_

#### Frontend: SheetSelector.tsx

- [ ] 24. Add single-tab text display logic to SheetSelector.tsx
  - File: `frontend/src/components/import/SheetSelector.tsx`
  - Add conditional rendering: if `sheets.length === 1`, display tab name as static text (not dropdown)
  - Style: `<div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-900 font-medium">Importing from: {sheets[0]}</div>`
  - Auto-select the single sheet in state
  - Purpose: Single-tab auto-detection with clear display
  - _Leverage: existing SheetSelector component structure_
  - _Requirements: REQ-SV-5 (AC 2, 4)_

- [ ] 25. Add physician auto-assign for PHYSICIAN role in SheetSelector.tsx
  - File: `frontend/src/components/import/SheetSelector.tsx`
  - Add `userRole` prop to SheetSelector
  - If `userRole === 'PHYSICIAN'`, display physician name as text (no dropdown)
  - Auto-assign current physician ID in onSelect callback
  - Derive `currentPhysicianName` by finding the physician in the `physicians` prop whose ID matches the current user's ID from `useAuthStore().user.id`
  - Style: `<div className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">Importing for: {currentPhysicianName}</div>`
  - Purpose: Streamline physician imports
  - _Leverage: existing physician data from props, useAuthStore for current user_
  - _Requirements: REQ-SV-6 (AC 4, 5)_

- [ ] 26. Add invalidSheets display to SheetSelector.tsx
  - File: `frontend/src/components/import/SheetSelector.tsx`
  - Add `invalidSheets?: InvalidSheet[]` prop
  - If `invalidSheets.length > 0`, display expandable note below tab selector
  - Button text: "{N} tab(s) excluded: missing required import columns"
  - Expandable detail: list each sheet with reason
  - Add `role="note"` for accessibility
  - Keyboard accessible (Tab + Enter/Space)
  - Purpose: Informative feedback on excluded tabs
  - _Leverage: existing expandable component patterns_
  - _Requirements: REQ-SV-5 (AC 5, 6), NFR-SV-8, NFR-SV-9_

- [ ] 27. Write SheetSelector.test.tsx tests for single/multi tab display
  - File: `frontend/src/components/import/SheetSelector.test.tsx`
  - Test case: Single tab → shows text, not dropdown
  - Test case: Multiple tabs → shows dropdown
  - Test case: Single tab auto-selects
  - Purpose: Verify tab display logic
  - _Leverage: existing Vitest + React Testing Library patterns_
  - _Requirements: REQ-SV-5 (AC 1, 2, 4)_

- [ ] 28. Write SheetSelector.test.tsx tests for physician assignment
  - File: `frontend/src/components/import/SheetSelector.test.tsx`
  - Test case: PHYSICIAN role → no physician dropdown, auto-assigned
  - Test case: STAFF role → physician dropdown shown
  - Test case: ADMIN role → physician dropdown shown
  - Purpose: Verify physician auto-assign logic
  - _Leverage: existing role mocking patterns_
  - _Requirements: REQ-SV-6 (AC 4, 5)_

- [ ] 29. Write SheetSelector.test.tsx tests for invalidSheets display
  - File: `frontend/src/components/import/SheetSelector.test.tsx`
  - Test case: invalidSheets present → note shown
  - Test case: invalidSheets empty → note hidden
  - Test case: Expandable detail toggles correctly
  - Test case: Keyboard navigation works
  - Purpose: Verify invalid sheets UI
  - _Leverage: existing accessibility test patterns_
  - _Requirements: REQ-SV-5 (AC 5, 6), NFR-SV-8, NFR-SV-9_

- [ ] 30. Write ImportPage.test.tsx tests for universal sheet selector
  - File: `frontend/src/pages/ImportPage.test.tsx`
  - Test case: Hill file upload → sheet selector appears
  - Test case: Sutter file upload → sheet selector appears (existing behavior)
  - Test case: No separate physician step exists
  - Purpose: Verify universal sheet selector flow
  - _Leverage: existing ImportPage test setup_
  - _Requirements: REQ-SV-6 (AC 1, 2)_

### Phase 3: Area 3 — Configurable Preview Columns

#### Backend: Config Files

- [ ] 31. Add previewColumns to sutter.json
  - File: `backend/src/config/import/sutter.json`
  - Add `"previewColumns": [{ "field": "statusDate", "label": "Status Date", "source": "Measure Details" }, { "field": "possibleActionsNeeded", "label": "Possible Actions Needed", "source": "Possible Actions Needed" }]`
  - Validate JSON syntax
  - Purpose: Define Sutter-specific preview columns
  - _Leverage: existing Sutter config structure_
  - _Requirements: REQ-SV-9 (AC 2, 3)_

#### Backend: Data Models

- [ ] 32. Add sourceActionText to TransformedRow type
  - File: `backend/src/services/import/dataTransformer.ts` (TransformedRow interface at line ~15)
  - Add `sourceActionText?: string | null` to TransformedRow interface
  - Update JSDoc comments
  - Purpose: Capture raw action text for preview
  - _Leverage: existing TransformedRow definition_
  - _Requirements: REQ-SV-9 (AC 2)_

- [ ] 33. Add extraData to DiffChange type
  - File: `backend/src/services/import/diffCalculator.ts` (DiffChange interface at line ~25)
  - Add `extraData?: Record<string, string | null>` to DiffChange interface
  - Update JSDoc comments
  - Purpose: Store preview column data in diff changes
  - _Leverage: existing DiffChange definition_
  - _Requirements: REQ-SV-9 (AC 2)_

- [ ] 34. Populate sourceActionText in sutterDataTransformer.ts
  - File: `backend/src/services/import/sutterDataTransformer.ts`
  - In `transformSutterRow()`, set `sourceActionText = rawRow['Possible Actions Needed']`
  - Purpose: Capture source action text for preview
  - _Leverage: existing rawRow reading logic_
  - _Requirements: REQ-SV-9 (AC 3)_

#### Backend: Preview Endpoint

- [ ] 35. Build extraData in diffCalculator.ts when previewColumns exist
  - File: `backend/src/services/import/diffCalculator.ts`
  - When building DiffChange objects, if system config has `previewColumns`, populate `extraData` from TransformedRow fields matching `previewColumns[].field`
  - Handle null values gracefully
  - Purpose: Include preview column data in diff changes
  - _Leverage: existing diff building logic, config access_
  - _Requirements: REQ-SV-9 (AC 2, 7)_

- [ ] 36. Include previewColumns metadata in preview response (import.routes.ts)
  - File: `backend/src/routes/import.routes.ts`
  - In POST /api/import/preview endpoint, add `previewColumns: config.previewColumns || []` to response
  - For each change, build `extraColumns` from `change.extraData` using `previewColumns` field keys
  - Purpose: Provide preview column metadata to frontend
  - _Leverage: existing preview endpoint response building_
  - _Requirements: REQ-SV-9 (AC 6)_

- [ ] 37. Update GET /api/import/preview/:previewId with previewColumns
  - File: `backend/src/routes/import.routes.ts`
  - Ensure cached preview response includes `previewColumns` and `extraColumns`
  - No schema change to cache needed (already stores serialized response)
  - Purpose: Consistent preview response from cache
  - _Leverage: existing preview cache get logic_
  - _Requirements: REQ-SV-9 (AC 6)_

- [ ] 38. Write import.routes.ts tests for preview columns
  - File: `backend/src/routes/__tests__/import.routes.test.ts`
  - Test case: Sutter preview → includes previewColumns metadata
  - Test case: Sutter preview → changes include extraColumns
  - Test case: Hill preview → no previewColumns (backward compatible)
  - Test case: Preview with null extraColumns value → displays empty
  - Purpose: Verify preview column data flow
  - _Leverage: existing preview endpoint test patterns_
  - _Requirements: REQ-SV-9 (AC 3, 4, 5, 6, 7)_

#### Frontend: ImportPreviewPage.tsx

- [ ] 39. Add previewColumns prop to ImportPreviewPage.tsx
  - File: `frontend/src/pages/ImportPreviewPage.tsx`
  - Add `previewColumns?: PreviewColumnDef[]` to PreviewData type
  - Read from API response
  - Pass to PreviewChangesTable component
  - Purpose: Receive preview column metadata
  - _Leverage: existing preview data fetching_
  - _Requirements: REQ-SV-9 (AC 6)_

- [ ] 40. Render dynamic preview columns in PreviewChangesTable
  - File: `frontend/src/pages/ImportPreviewPage.tsx` (or separate component file)
  - Add `previewColumns` prop to PreviewChangesTable component
  - For each `previewColumns` entry, render additional `<th>` with label
  - For each change row, render `<td>` with `change.extraColumns?.[col.field] || ''`
  - Handle null/undefined gracefully with empty cell
  - Purpose: Display dynamic preview columns
  - _Leverage: existing table rendering logic_
  - _Requirements: REQ-SV-9 (AC 6, 7)_

- [ ] 41. Write ImportPreviewPage.test.tsx tests for dynamic columns
  - File: `frontend/src/pages/ImportPreviewPage.test.tsx`
  - Test case: previewColumns present → extra headers rendered
  - Test case: extraColumns present → extra cells rendered
  - Test case: previewColumns absent → no extra headers
  - Test case: extraColumns null → empty cell displayed
  - Purpose: Verify dynamic column rendering
  - _Leverage: existing preview page test patterns_
  - _Requirements: REQ-SV-9 (AC 6, 7)_

### Phase 4: End-to-End Testing & Visual Review

- [ ] 42. Write Cypress E2E test for sutter-sheet-validation
  - File: `frontend/cypress/e2e/sutter-sheet-validation.cy.ts`
  - Test case: Hill import with single tab → tab shown as text, physician selector
  - Test case: Sutter import with multi-tab → dropdown, invalid sheets note
  - Test case: Sutter preview → extra columns (statusDate, Actions) displayed
  - Test case: Invalid sheets expandable detail
  - Purpose: Verify complete import flow with sheet validation
  - _Leverage: existing Cypress import flow patterns, custom commands_
  - _Requirements: All REQ-SV-5, REQ-SV-6, REQ-SV-9_

- [ ] 43. Visual browser review with MCP Playwright (MANDATORY for UI changes)
  - Use: `ui-ux-reviewer` agent
  - Screenshots:
    1. Hill import: single tab as text + physician selector
    2. Sutter import: multi-tab dropdown + invalid sheets note expanded
    3. Sutter preview: dynamic columns (statusDate + Actions)
    4. Hill import: no extra preview columns
  - Verify: Button styles, text alignment, expandable details, dropdown rendering
  - Purpose: Visual verification of all UI changes
  - _Leverage: existing ui-ux-reviewer agent workflow, page guides_
  - _Requirements: Layer 5 testing (MANDATORY per project rules)_

## Summary

**Total Tasks:** 43 atomic tasks

**Dependency Chain:**
1. **Phase 1 (Tasks 1-6):** Area 2 — Independent, can start immediately
2. **Phase 2 (Tasks 7-30):** Area 1 — Depends on Phase 1 completion (validator changes used in tests)
3. **Phase 3 (Tasks 31-41):** Area 3 — Depends on Phase 2 backend completion (uses config types, preview endpoint)
4. **Phase 4 (Tasks 42-43):** E2E + Visual — Depends on all implementation complete

**Estimated Implementation Phases:**
- **Phase 1:** 1-2 hours (6 tasks, small scope)
- **Phase 2:** 5-7 hours (24 tasks, largest scope: backend + frontend)
- **Phase 3:** 2-3 hours (11 tasks, medium scope: config + preview)
- **Phase 4:** 1 hour (2 tasks, testing only)

**Key Reuse Points from Existing Codebase:**
- **SheetJS (XLSX):** `XLSX.read()`, `sheet_to_json()` patterns from existing fileParser.ts
- **Config type guards:** `isHillConfig()`, `isSutterConfig()` from configLoader.ts
- **Route error handling:** `createError()`, `try/catch -> next()` from import.routes.ts
- **Test fixtures:** Existing Hill + Sutter test workbooks, mock data
- **SheetSelector component:** Existing dropdown, physician selection logic
- **Validator patterns:** Warning generation, systemId threading
- **Preview rendering:** Existing table component in ImportPreviewPage.tsx
