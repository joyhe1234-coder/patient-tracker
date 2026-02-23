# Implementation Plan -- Smart Column Mapping

## Task Overview

Implement the Smart Column Mapping feature in 7 ordered phases:

1. **Database** -- Prisma schema additions (2 new models, 1 enum)
2. **Backend Services** -- fuzzyMatcher, conflictDetector, mappingService (3 new modules)
3. **Backend Routes** -- mapping.routes.ts (5 new endpoints) + extended import.routes.ts
4. **Extended Import Pipeline** -- columnMapper, configLoader, dataTransformer (extend existing)
5. **Frontend Components** -- ConflictBanner, MappingTable, ActionPatternTable, ConflictResolutionStep (4 new components)
6. **Frontend Pages** -- MappingManagementPage, App.tsx routing (1 new page + routing changes)
7. **Tests** -- Unit, API, Vitest, Playwright, Cypress, and visual review tasks

Total estimated tasks: 39

## Steering Document Compliance

- Backend files follow `camelCase` service naming and `kebab-case.routes` convention (`structure.md`)
- All new routes use `requireAuth` + `requireRole(['ADMIN'])` pattern (`auth.ts` middleware)
- Error handling uses `createError(message, statusCode)` → global handler (`patterns.md`)
- Frontend components use PascalCase, pages use PascalCase + Page suffix (`structure.md`)
- Tests follow `same-name.test.ts` convention in `__tests__/` subdirectories (`structure.md`)
- ESM imports use `.js` extensions on all backend files (`tech.md`)
- Zustand for global state, `useState` for local component state (`structure.md`)

## Key Existing Code to Reuse

| Existing File | How It Is Reused |
|---|---|
| `backend/src/services/import/configLoader.ts` | `loadSystemConfig()`, `listSystems()`, `systemExists()`, `isSutterConfig()`, `isHillConfig()`, all config types -- extended with `loadMergedConfig()` re-export |
| `backend/src/services/import/columnMapper.ts` | `mapColumns()`, `ColumnMapping`, `MappingResult` types -- extended with optional `mergedConfig` parameter |
| `backend/src/services/import/actionMapper.ts` | `buildActionMapperCache()`, `matchAction()`, `ActionMapperCache` types -- extended with `fuzzyMatchAction()` fallback |
| `backend/src/services/import/dataTransformer.ts` | `transformHillRow()` -- modified to default `statusDate` to import date |
| `backend/src/services/import/sutterDataTransformer.ts` | Sutter row transform -- modified to default `statusDate` to import date |
| `backend/src/routes/import.routes.ts` | `POST /preview` handler -- extended to call conflict detection before column mapping |
| `backend/src/routes/index.ts` | Route registry -- add `mappingRoutes` mount |
| `backend/prisma/schema.prisma` | `User` model -- add two new relations |
| `frontend/src/App.tsx` | Route definitions -- add `/admin/import-mapping`, redirect `/hill-mapping` |
| `frontend/src/pages/ImportPage.tsx` (`ImportTabContent`) | `handleSubmit` -- extended to handle `hasConflicts` response |
| `frontend/src/components/import/UnmappedActionsBanner.tsx` | Pattern reference for `ConflictBanner` design |
| `frontend/src/components/import/SheetSelector.tsx` | Rendered alongside new `ConflictResolutionStep` in import flow |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Wrap `/admin/import-mapping` route |

---

## Tasks

### Phase 1 -- Database Schema

- [x] 1. Add `ImportTargetType` enum and `ImportMappingOverride` model to Prisma schema
  - File: `backend/prisma/schema.prisma`
  - Add enum `ImportTargetType { PATIENT MEASURE DATA IGNORED }`
  - Add model `ImportMappingOverride` with all fields from design: `id`, `systemId`, `sourceColumn`, `targetType`, `targetField`, `requestType`, `qualityMeasure`, `isActive`, `createdBy` (FK to User), `createdAt`, `updatedAt`
  - Add `@@unique([systemId, sourceColumn])` and `@@index([systemId])` constraints
  - Add `@@map("import_mapping_overrides")` table mapping
  - Add `mappingOverrides ImportMappingOverride[] @relation("MappingCreator")` relation to existing `User` model
  - _Leverage: `backend/prisma/schema.prisma` (existing `User` model, `AuditLog` pattern)_
  - _Requirements: REQ-SCM-07.9, REQ-SCM-07.11_

- [x] 2. Add `ImportActionOverride` model to Prisma schema and generate migration
  - Files: `backend/prisma/schema.prisma`, `backend/prisma/migrations/20260220000000_add_import_mapping_overrides/migration.sql`
  - Add model `ImportActionOverride` with fields: `id`, `systemId`, `pattern`, `requestType`, `qualityMeasure`, `measureStatus`, `isActive`, `createdBy` (FK to User), `createdAt`, `updatedAt`
  - Add `@@unique([systemId, pattern])` and `@@index([systemId])` constraints
  - Add `@@map("import_action_overrides")` table mapping
  - Add `actionOverrides ImportActionOverride[] @relation("ActionCreator")` relation to existing `User` model
  - Run `npx prisma migrate dev --name add_import_mapping_overrides` to generate SQL migration
  - _Leverage: `backend/prisma/schema.prisma` (existing migration pattern from `migrations/` directory)_
  - _Requirements: REQ-SCM-07.10, REQ-SCM-07.11_

---

### Phase 2 -- Backend Services

- [x] 3. Create `fuzzyMatcher.ts` -- Jaro-Winkler + Jaccard composite scoring utility
  - File: `backend/src/services/import/fuzzyMatcher.ts`
  - Implement `normalizeHeader(header: string): string` -- trim, lowercase, strip ` E` / ` Q1` / ` Q2` suffixes, collapse whitespace
  - Implement `jaroWinklerSimilarity(s1: string, s2: string): number` -- returns 0.0-1.0, prefix scale 0.1, max prefix length 4
  - Implement `jaccardTokenSimilarity(s1: string, s2: string): number` -- tokenize on whitespace, compute |intersection| / |union|
  - Implement `compositeScore(source: string, candidate: string): number` -- 60% Jaro-Winkler + 40% Jaccard, normalize both inputs first
  - Implement `fuzzyMatch(source: string, candidates: string[], threshold?: number): FuzzyMatchResult[]` -- default threshold 0.80, returns top 3 results above threshold sorted by descending score
  - Export `FuzzyMatchResult` interface: `{ candidate, score, normalizedSource, normalizedCandidate }`
  - Port the working Jaro-Winkler + Jaccard logic from `poc-fuzzy-matching.ts` (root directory)
  - Zero import-specific dependencies -- pure string utility module
  - _Leverage: `poc-fuzzy-matching.ts` (root) for proven algorithm implementation_
  - _Requirements: REQ-SCM-01.1, REQ-SCM-01.2, REQ-SCM-01.6, REQ-SCM-01.8, NFR-SCM-M1_

- [x] 4. Create `conflictDetector.ts` -- header conflict classification engine
  - File: `backend/src/services/import/conflictDetector.ts`
  - Export types: `ConflictType`, `ConflictSeverity`, `ColumnCategory`, `ColumnConflict`, `FuzzySuggestion`, `ConflictResolution`, `ConflictReport`
  - Implement `detectConflicts(fileHeaders, mergedConfig, systemId, options?)` following the 7-step classification pipeline from design:
    - Step 1: Normalize all file headers
    - Step 2: Pre-check for duplicate headers in file (BLOCKING error)
    - Step 3: Build lookup sets from merged config (patient, measure, skip, data columns)
    - Step 4a-f: For each file header -- exact match check, fuzzy match, CHANGED/NEW classification, DUPLICATE/AMBIGUOUS detection. Wrap per-header fuzzy matching in try/catch; on error, classify that header as "unmapped" and continue processing remaining headers (NFR-SCM-R2)
    - Step 5: For each config column not matched -- MISSING conflict
    - Step 6: Classify severity (BLOCKING for patient-required + DUPLICATE + AMBIGUOUS; WARNING/INFO otherwise)
    - Step 7: Wrong-file check -- `isWrongFile = true` if matched < 10% of config columns
  - BLOCKING severity for: `memberName`/`memberDob` MISSING or CHANGED, DUPLICATE, AMBIGUOUS
  - WARNING severity for: measure column MISSING, NEW, non-patient CHANGED
  - INFO severity for: skip column CHANGED
  - Populate `suggestions` with top 3 fuzzy matches including `score` and `measureInfo`
  - Return `ConflictReport` with full `summary` counts and `hasBlockingConflicts` flag
  - _Leverage: `backend/src/services/import/fuzzyMatcher.ts` (task 3), `backend/src/services/import/configLoader.ts` types_
  - _Requirements: REQ-SCM-01.3, REQ-SCM-01.4, REQ-SCM-01.5, REQ-SCM-02.1, REQ-SCM-02.6, REQ-SCM-09.3, REQ-SCM-09.4, REQ-SCM-09.5_

- [x] 5. Create `mappingService.ts` -- database override CRUD and merge logic
  - File: `backend/src/services/import/mappingService.ts`
  - Export types: `MergedColumnMapping`, `MergedActionMapping`, `MergedSystemConfig`, `MappingChangeRequest`, `ActionChangeRequest`, `ResolvedConflict`
  - Implement `loadMergedConfig(systemId: string): Promise<MergedSystemConfig>`:
    - Load JSON seed via `loadSystemConfig(systemId)` (catch file errors)
    - Query `prisma.importMappingOverride.findMany({ where: { systemId, isActive: true } })`
    - On DB error: log warning via `logger.warn()`, fall back to JSON-only (do not throw)
    - Merge: DB overrides replace same `sourceColumn` seed entries; DB-only additions included; seed entries without overrides remain
    - Populate `lastModifiedAt` = MAX(updatedAt); `lastModifiedBy` = creator displayName for most recent override
    - Return full `MergedSystemConfig` with all column sections
  - Implement `saveMappingOverrides(systemId, changes, userId, expectedUpdatedAt?)`:
    - Optimistic locking: compare `expectedUpdatedAt` to current MAX(updatedAt) -- throw 409 if mismatch
    - For each change: `prisma.importMappingOverride.upsert({ where: { systemId_sourceColumn: { systemId, sourceColumn } }, ... })`
    - Create `AuditLog` entry: `action: 'MAPPING_CHANGE'`, `entity: 'import_mapping'`, `entityId: null`, `changes: { before, after }`, `userId`
    - Return updated `MergedSystemConfig` from `loadMergedConfig()`
  - Implement `saveActionOverrides(systemId, changes, userId)`:
    - For each change: `prisma.importActionOverride.upsert({ where: { systemId_pattern: { systemId, pattern } }, ... })`
    - Create `AuditLog` entry with `action: 'MAPPING_CHANGE'`
    - Return updated `MergedSystemConfig`
  - Implement `resetToDefaults(systemId, userId)`:
    - `prisma.importMappingOverride.deleteMany({ where: { systemId } })`
    - `prisma.importActionOverride.deleteMany({ where: { systemId } })`
    - Create `AuditLog` entry with action `MAPPING_RESET`
    - Return fresh `loadMergedConfig()` (JSON-seed-only result)
  - Implement `resolveConflicts(systemId, resolutions, userId)`:
    - Convert each `ResolvedConflict` (with `ConflictResolution`) into a `MappingChangeRequest`
    - Delegate to `saveMappingOverrides()` and return updated config
  - _Leverage: `backend/src/services/import/configLoader.ts` (`loadSystemConfig`, `listSystems`, `isSutterConfig`), `backend/src/config/database.ts` (Prisma client), `backend/src/utils/logger.ts` (logger)_
  - _Requirements: REQ-SCM-07.1, REQ-SCM-07.2, REQ-SCM-07.3, REQ-SCM-07.4, REQ-SCM-07.5, REQ-SCM-07.6, REQ-SCM-07.7, REQ-SCM-07.8, NFR-SCM-R1, NFR-SCM-M2_

---

### Phase 3 -- Backend Routes

- [x] 6. Create `mapping.routes.ts` with GET, DELETE, and POST /resolve endpoints
  - File: `backend/src/routes/mapping.routes.ts`
  - Apply `requireAuth` + `requirePatientDataAccess` globally to the router
  - Apply `requireRole(['ADMIN'])` to all write endpoints (PUT, DELETE, POST /resolve)
  - Implement `GET /:systemId` -- call `mappingService.loadMergedConfig(systemId)`, return 404 if system not found via `systemExists()`
  - Implement `DELETE /:systemId/reset` -- call `mappingService.resetToDefaults(systemId, req.user.id)`, return `{ success: true, data, message }` with deleted-count message
  - Implement `POST /:systemId/resolve` -- validate `resolutions` array is non-empty, call `mappingService.resolveConflicts()`, return updated config; return 400 if any resolution action is invalid
  - Use `createError()` pattern for all error responses
  - Export `router` as default
  - _Leverage: `backend/src/routes/admin.routes.ts` (existing `requireRole` pattern), `backend/src/middleware/auth.ts`, `backend/src/middleware/errorHandler.ts` (`createError`), `backend/src/services/import/mappingService.ts` (task 5)_
  - _Requirements: REQ-SCM-10.1, REQ-SCM-10.4, REQ-SCM-10.5, REQ-SCM-10.7, NFR-SCM-S1, NFR-SCM-S2_

- [x] 7. Add PUT column and action endpoints to `mapping.routes.ts`
  - File: `backend/src/routes/mapping.routes.ts` (extend task 6)
  - Implement `PUT /:systemId/columns`:
    - Parse `{ changes, expectedUpdatedAt }` from request body
    - Validate: reject if `changes` is empty, any `sourceColumn` is blank, or any `targetType` is invalid enum value
    - Validate: if `targetType` is MEASURE, query `prisma.qualityMeasure` to confirm the measure exists -- return 400 if not found
    - Check for duplicate `sourceColumn` entries in the request -- return 400 with "Duplicate source column: {name}"
    - Call `mappingService.saveMappingOverrides(systemId, changes, userId, expectedUpdatedAt)`
    - Return 409 on optimistic locking conflict
  - Implement `PUT /:systemId/actions`:
    - Parse `{ changes }` from request body
    - Validate each `pattern` with `new RegExp(pattern)` in try/catch -- return 400 on `SyntaxError`
    - Validate ReDoS: reject patterns matching `/\([^)]*[+*][^)]*\)[+*]/` (nested quantifiers)
    - Validate: confirm each `qualityMeasure` exists in database
    - Call `mappingService.saveActionOverrides(systemId, changes, userId)`
  - _Leverage: `backend/src/routes/mapping.routes.ts` (task 6), `backend/src/config/database.ts` (Prisma)_
  - _Requirements: REQ-SCM-10.2, REQ-SCM-10.3, REQ-SCM-10.5, REQ-SCM-10.6, REQ-SCM-04.10, NFR-SCM-S4_

- [ ] 8. Register `mapping.routes.ts` in `routes/index.ts`
  - File: `backend/src/routes/index.ts`
  - Import `mappingRoutes from './mapping.routes.js'`
  - Add `router.use('/import/mappings', mappingRoutes)` after the existing `router.use('/import', importRoutes)` line
  - Verify the mount path does not conflict with existing `/import` routes
  - _Leverage: `backend/src/routes/index.ts` (existing route registration pattern)_
  - _Requirements: REQ-SCM-10_

---

### Phase 4 -- Extended Import Pipeline

- [x] 9. Add `loadMergedConfig` re-export to `configLoader.ts`
  - File: `backend/src/services/import/configLoader.ts`
  - Add one exported function `loadMergedConfig(systemId: string): Promise<MergedSystemConfig>` that delegates to `mappingService.loadMergedConfig(systemId)` with a lazy import to avoid circular dependency
  - Preserve all existing exported functions and types unchanged (`loadSystemConfig`, `listSystems`, `systemExists`, `isSutterConfig`, `isHillConfig`, `getRequiredColumns`, etc.)
  - Document the new function with a JSDoc comment explaining it returns DB overrides merged with JSON seed
  - _Leverage: `backend/src/services/import/configLoader.ts` (preserve existing API), `backend/src/services/import/mappingService.ts` (task 5)_
  - _Requirements: REQ-SCM-07.1, REQ-SCM-09.1, NFR-SCM-R1_

- [ ] 10. Extend `mapColumns()` in `columnMapper.ts` with optional `mergedConfig` parameter
  - File: `backend/src/services/import/columnMapper.ts`
  - Add optional third parameter to `mapColumns(headers, systemId, mergedConfig?: MergedSystemConfig)`: if provided, use `mergedConfig` to build column lookup sets instead of calling `loadSystemConfig(systemId)`
  - For Hill format: if `mergedConfig` is provided, build column lookup from `mergedConfig.patientColumns`, `mergedConfig.measureColumns`, `mergedConfig.skipColumns` instead of reading `hillConfig.patientColumns` etc.
  - For Sutter format: pass `mergedConfig` through to `mapSutterColumns(headers, config, mergedConfig)`; extend `sutterColumnMapper.ts` `mapSutterColumns()` similarly to accept optional `mergedConfig` and use its column sets when provided
  - Preserve backward compatibility: when `mergedConfig` is omitted, behavior is identical to today
  - _Leverage: `backend/src/services/import/columnMapper.ts` (existing `mapColumns`, `mapHillColumns`), `backend/src/services/import/sutterColumnMapper.ts` (existing `mapSutterColumns`), `backend/src/services/import/mappingService.ts` types_
  - _Requirements: REQ-SCM-07.1, REQ-SCM-07.7, REQ-SCM-09.3_

- [x] 11. Extend `POST /api/import/preview` in `import.routes.ts` to run conflict detection
  - File: `backend/src/routes/import.routes.ts`
  - After `parseFile()` returns `ParseResult {headers, rows}` and before calling `mapColumns()`:
    - Call `loadMergedConfig(systemId)` to get merged config
    - Call `detectConflicts(headers, mergedConfig, systemId)` to get `ConflictReport`
    - If `conflictReport.isWrongFile`: return 400 with message "No recognizable columns found. This file may not be from the selected insurance system."
    - If `conflictReport.conflicts.length > 0`: return early with `{ success: true, data: { hasConflicts: true, conflicts: conflictReport } }` -- do NOT run full preview
    - If no conflicts: pass `mergedConfig` to `mapColumns(headers, systemId, mergedConfig)` and continue existing pipeline unchanged
  - The response shape when `hasConflicts: true` is additive -- existing no-conflict response shape is unchanged
  - _Leverage: `backend/src/routes/import.routes.ts` (existing preview handler), `backend/src/services/import/conflictDetector.ts` (task 4), `backend/src/services/import/configLoader.ts` (`loadMergedConfig`)_
  - _Requirements: REQ-SCM-02.1, REQ-SCM-02.4, REQ-SCM-02.5, REQ-SCM-05.1_

- [x] 12. Add import date default for `statusDate` in `dataTransformer.ts` (Hill wide format)
  - File: `backend/src/services/import/dataTransformer.ts`
  - In `transformHillRow()` (or equivalent Hill row transform function): after extracting `statusDate` from Q1 columns
  - If `statusDate` is null/empty/unparseable: set `statusDate = new Date().toISOString().slice(0, 10)` (YYYY-MM-DD, server local date)
  - Add `statusDateSource: 'file' | 'default'` field to the transformed row output
  - After `statusDate` is established, call existing `dueDateCalculator.ts` logic to compute `dueDate`
  - Compute `timeIntervalDays` using same formula as `useGridCellUpdate.ts`
  - If file has a non-empty date value, `statusDateSource = 'file'`; if defaulted, `statusDateSource = 'default'`
  - _Leverage: `backend/src/services/import/dataTransformer.ts` (existing `transformHillRow`), `backend/src/services/import/measureDetailsParser.ts` (`parseDate`), existing `dueDateCalculator.ts` logic_
  - _Requirements: REQ-SCM-08.1, REQ-SCM-08.2, REQ-SCM-08.3, REQ-SCM-08.4, REQ-SCM-08.5_

- [x] 13. Add import date default for `statusDate` in `sutterDataTransformer.ts` (Sutter long format)
  - File: `backend/src/services/import/sutterDataTransformer.ts`
  - After `measureDetailsParser.ts` `scanForEmbeddedDates()` runs for a row:
  - If no date was extracted (result is null/empty): set `statusDate = new Date().toISOString().slice(0, 10)`
  - Add `statusDateSource: 'file' | 'default'` field to Sutter transformed row output
  - Compute `dueDate` and `timeIntervalDays` using the same logic added in task 12
  - _Leverage: `backend/src/services/import/sutterDataTransformer.ts` (existing Sutter transform), `backend/src/services/import/measureDetailsParser.ts` (`scanForEmbeddedDates`)_
  - _Requirements: REQ-SCM-08.1, REQ-SCM-08.2, REQ-SCM-08.3_

- [x] 14. Add `fuzzyMatchAction()` fallback to `actionMapper.ts` for Sutter action text
  - File: `backend/src/services/import/actionMapper.ts`
  - Add `fuzzyMatchAction(actionText: string, cache: ActionMapperCache, threshold?: number): ActionMatch | null` function:
    - Normalize `actionText`: normalize line breaks to spaces, truncate to 500 characters, trim
    - If empty after normalization: return null immediately
    - Strip year patterns (`\d{4}`) from `actionText` before scoring
    - Build candidate list from `cache.compiledPatterns` descriptive text (the pattern string itself)
    - Call `fuzzyMatch(normalizedAction, candidates, threshold ?? 0.75)` from `fuzzyMatcher.ts`
    - If best match score >= threshold: return `ActionMatch` with the matched pattern's `requestType`, `qualityMeasure`, `measureStatus`
    - Return null if no match above threshold
  - Extend `matchAction()`: if regex fails, call `fuzzyMatchAction()` as fallback; if fuzzy match found, return it; if no fuzzy match, add `actionText` to `unmappedActions` array
  - _Leverage: `backend/src/services/import/actionMapper.ts` (existing `matchAction`, `buildActionMapperCache`), `backend/src/services/import/fuzzyMatcher.ts` (task 3)_
  - _Requirements: REQ-SCM-06.1, REQ-SCM-06.2, REQ-SCM-06.3, REQ-SCM-06.4_

---

### Phase 5 -- Frontend Components

- [x] 15. Create `ConflictBanner.tsx` -- read-only blocking banner for non-admin users
  - File: `frontend/src/components/import/ConflictBanner.tsx`
  - Props: `{ conflicts: ColumnConflict[], systemName: string, onCancel: () => void, onCopyDetails: () => void }`
  - Render `role="alert"` banner with amber/red styling: "Column mapping conflicts detected. Please contact your administrator to resolve the mapping before importing."
  - Display read-only list of conflicts grouped by type with color-coded badges: blue for NEW, amber for CHANGED, red for MISSING
  - Show count summary: "X new columns, Y renamed columns, Z missing columns"
  - Render "Cancel" button that calls `onCancel`
  - Render "Copy Details" button (`aria-label="Copy conflict details to clipboard"`) that calls `onCopyDetails`
  - The `onCopyDetails` callback should be implemented in the parent; the button just triggers it
  - No resolution controls (dropdowns, save buttons) -- this is non-admin only
  - Export as named export `ConflictBanner`
  - _Leverage: `frontend/src/components/import/UnmappedActionsBanner.tsx` (existing banner pattern/styling), Lucide icons (`AlertTriangle`, `Copy`)_
  - _Requirements: REQ-SCM-05.2, REQ-SCM-05.3, NFR-SCM-U1, NFR-SCM-U4_

- [x] 16. Create `MappingTable.tsx` -- reusable column mapping table for view/edit/resolve modes
  - File: `frontend/src/components/import/MappingTable.tsx`
  - Props: `{ mappings: MergedColumnMapping[], mode: 'view' | 'edit' | 'resolve', qualityMeasures: QualityMeasureOption[], patientFields: PatientFieldOption[], onMappingChange?: (sourceColumn, change) => void, onDelete?: (sourceColumn) => void }`
  - View mode: read-only table showing sourceColumn, targetType badge, target measure/field, isOverride indicator
  - Edit mode: same table with inline dropdowns -- targetType selector, then conditional requestType + qualityMeasure dropdowns (for MEASURE) or targetField dropdown (for PATIENT), or plain "Ignored" label (for IGNORED)
  - Resolve mode: like edit mode but also shows fuzzy match suggestions with `score` percentage badge (e.g., "85% match") next to each suggestion in the dropdown options
  - Long column names (>100 chars) truncated with ellipsis in display, full text in `title` attribute
  - "Delete" button in edit mode that calls `onDelete`
  - Keyboard-navigable dropdowns with ARIA labels for WCAG 2.1 AA
  - _Leverage: `frontend/src/components/import/SheetSelector.tsx` (dropdown styling patterns), `frontend/src/config/dropdownConfig.ts` (`QUALITY_MEASURE_TO_STATUS` for measure options)_
  - _Requirements: REQ-SCM-04.2, REQ-SCM-04.3, REQ-SCM-04.4, NFR-SCM-U2, NFR-SCM-U3_

- [x] 17. Create `ActionPatternTable.tsx` -- Sutter action regex pattern table
  - File: `frontend/src/components/import/ActionPatternTable.tsx`
  - Props: `{ actionMappings: MergedActionMapping[], skipActions: string[], mode: 'view' | 'edit', qualityMeasures: QualityMeasureOption[], onActionChange?: (index, change) => void, onSkipActionAdd?: (text) => void, onSkipActionRemove?: (text) => void }`
  - View mode: read-only table showing regex pattern, requestType, qualityMeasure, measureStatus, isOverride badge
  - Edit mode: inline editing of `pattern` text input (with client-side regex validation feedback), requestType + qualityMeasure dropdowns
  - On `pattern` change: attempt `new RegExp(value)` client-side; show inline red error "Invalid regex" if it throws
  - Skip actions section: list of skip action texts with "Remove" button each; text input + "Add" button to add new skip action
  - _Leverage: `frontend/src/components/import/MappingTable.tsx` (task 16, similar table patterns), Lucide `Trash2` and `Plus` icons_
  - _Requirements: REQ-SCM-04.9, REQ-SCM-04.10, REQ-SCM-06.5_

- [x] 18. Create `ConflictResolutionStep.tsx` -- interactive admin conflict resolution UI
  - File: `frontend/src/components/import/ConflictResolutionStep.tsx`
  - Props: `{ conflicts: ColumnConflict[], systemId: string, isAdmin: boolean, onResolved: (updatedMapping: MergedSystemConfig) => void, onCancel: () => void }`
  - If `isAdmin` is false: render `ConflictBanner` (non-admin blocking view), implementing `onCopyDetails` as `navigator.clipboard.writeText(buildConflictSummaryText(conflicts, systemId))`
  - If `isAdmin` is true: render full interactive resolution form:
    - Color-coded summary banner: "X new, Y renamed, Z missing" with blue/amber/red counts
    - `aria-live="polite"` region announcing "X of Y conflicts resolved" (updates as user resolves)
    - Per-conflict row with: source header, conflict type badge, top suggestion(s) with score %, resolution dropdown
    - Resolution dropdown options vary by conflict type (NEW: map to measure / map to patient field / ignore; MISSING: keep / remove; CHANGED: accept suggestion / map to different measure / ignore)
    - Track resolved count: `resolvedCount` state initialized to 0, incremented as each conflict gets a resolution
    - "Save & Continue" button: disabled until `resolvedCount === conflicts.length`; on click: POST to `/api/import/mappings/:systemId/resolve`, call `onResolved(updatedMapping)` on success
    - "Cancel" button: calls `onCancel`, no API call
    - Loading state while saving
    - Error display on API failure
  - Focus management: move focus to first unresolved conflict row on mount
  - _Leverage: `frontend/src/components/import/ConflictBanner.tsx` (task 15), `frontend/src/components/import/MappingTable.tsx` (task 16), `frontend/src/stores/authStore.ts` (`useAuthStore`, `isAdmin()`), `frontend/src/api/axios.ts` (API client)_
  - _Requirements: REQ-SCM-03.1, REQ-SCM-03.2, REQ-SCM-03.3, REQ-SCM-03.4, REQ-SCM-03.5, REQ-SCM-03.6, REQ-SCM-05.2, REQ-SCM-05.3, NFR-SCM-U1, NFR-SCM-U2, NFR-SCM-U5_

---

### Phase 6 -- Frontend Pages and Routing

- [x] 19. Create `MappingManagementPage.tsx` -- admin mapping management page
  - File: `frontend/src/pages/MappingManagementPage.tsx`
  - Page state: `{ selectedSystemId, mergedConfig, loading, saving, error, editingRow }`
  - On mount: load systems list via `GET /api/import/systems`, set `selectedSystemId` to first system
  - On `selectedSystemId` change: load `GET /api/import/mappings/:systemId`, set `mergedConfig`
  - Render system selector dropdown populated from `listSystems()` API response
  - Show last modified timestamp and admin name from `mergedConfig.lastModifiedAt` and `mergedConfig.lastModifiedBy`
  - Render three `MappingTable` sections: Patient Column Mappings, Measure Column Mappings, Ignored Columns
  - For long-format systems (Sutter): render `ActionPatternTable` for action patterns and skip actions
  - Edit mode: per-row "Edit" button sets `editingRow` state, saves via `PUT /api/import/mappings/:systemId/columns`
  - "Add Mapping" button: show inline form with `MappingTable` in resolve mode for new row entry
  - "Reset to Defaults" button: show `ConfirmModal` with warning text, call `DELETE /api/import/mappings/:systemId/reset` on confirm
  - If `mergedConfig` has no DB overrides for a system: show read-only defaults with "Override" button that copies seed values to DB via a save call
  - "Admin access required" redirect handled by `ProtectedRoute` in `App.tsx` (not in this component)
  - Empty state when no measure columns exist: show amber warning "No measure columns configured. Imports for this system will produce no patient measures."
  - _Leverage: `frontend/src/components/import/MappingTable.tsx` (task 16), `frontend/src/components/import/ActionPatternTable.tsx` (task 17), `frontend/src/components/modals/ConfirmModal.tsx` (existing modal), `frontend/src/stores/authStore.ts`, `frontend/src/api/axios.ts`_
  - _Requirements: REQ-SCM-04.1, REQ-SCM-04.2, REQ-SCM-04.3, REQ-SCM-04.4, REQ-SCM-04.5, REQ-SCM-04.6, REQ-SCM-04.7, REQ-SCM-04.8, REQ-SCM-04.9, REQ-SCM-04.10, REQ-SCM-09.2, NFR-SCM-U3, NFR-SCM-U6_

- [x] 20. Extend `ImportPage.tsx` (`ImportTabContent`) to handle conflict detection response
  - File: `frontend/src/pages/ImportPage.tsx`
  - Add state: `conflicts: ColumnConflict[] | null`, initialized to null
  - After `POST /api/import/preview` returns: check if `data.hasConflicts === true`
  - If `hasConflicts`: set `conflicts = data.conflicts.conflicts`, do NOT navigate to preview
  - Render `ConflictResolutionStep` when `conflicts` is non-null (inserted between SheetSelector and preview navigation)
  - Pass `isAdmin` from `useAuthStore().isAdmin()` to `ConflictResolutionStep`
  - `onResolved` callback: clear `conflicts` state, re-submit `POST /api/import/preview` (now with updated mappings, no conflicts expected), navigate to preview on success
  - `onCancel` callback: clear `conflicts` state, return user to file upload step (reset `file` state and re-enable upload UI)
  - Implement `buildConflictSummaryText(conflicts, systemId, fileName)` for "Copy Details" clipboard content: structured text with system name, file name, and each conflict's type and details
  - _Leverage: `frontend/src/pages/ImportPage.tsx` (existing `ImportTabContent`, `handleSubmit`), `frontend/src/components/import/ConflictResolutionStep.tsx` (task 18), `frontend/src/stores/authStore.ts`_
  - _Requirements: REQ-SCM-02.2, REQ-SCM-02.3, REQ-SCM-02.4, REQ-SCM-03.1, REQ-SCM-05.1, REQ-SCM-05.4_

- [x] 21. Add `/admin/import-mapping` route and `/hill-mapping` redirect in `App.tsx`
  - File: `frontend/src/App.tsx`
  - Import `MappingManagementPage` from `./pages/MappingManagementPage`
  - Add new admin-protected route:
    ```tsx
    <Route
      path="/admin/import-mapping"
      element={
        <ProtectedRoute allowedRoles={['ADMIN']}>
          <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-1 flex flex-col">
              <MappingManagementPage />
            </main>
          </div>
        </ProtectedRoute>
      }
    />
    ```
  - Change `/hill-mapping` route from `<HillMeasureMapping />` to `<Navigate to="/admin/import-mapping?system=hill" replace />`
  - Keep the `HillMeasureMapping` import temporarily until the redirect is confirmed working (can be cleaned up in a follow-up task)
  - Verify `ProtectedRoute` with `allowedRoles={['ADMIN']}` correctly redirects non-admin users to `/`
  - _Leverage: `frontend/src/App.tsx` (existing admin route pattern for `/admin`), `frontend/src/components/auth/ProtectedRoute.tsx`_
  - _Requirements: REQ-SCM-04.1, REQ-SCM-04.8, REQ-SCM-05.5, NFR-SCM-U6_

---

### Phase 7 -- Tests

- [x] 22. Write Jest unit tests for `fuzzyMatcher.ts`
  - File: `backend/src/services/import/__tests__/fuzzyMatcher.test.ts`
  - Test `normalizeHeader()`: whitespace trimming, lowercase, ` E` suffix strip, ` Q1`/` Q2` suffix strip, multiple space collapse, empty string handling
  - Test `jaroWinklerSimilarity()`: identical strings = 1.0, completely different strings < 0.3, single char edit (typo), prefix bonus (Jaro-Winkler favors common prefix), empty string = 0.0
  - Test `jaccardTokenSimilarity()`: identical token sets = 1.0, no overlap = 0.0, partial overlap = |intersection|/|union|, single-token strings, multi-word rearrangement
  - Test `compositeScore()`: verify 60/40 weighting via known pairs, normalized inputs before scoring, "BP Control" vs "Blood Pressure Control" composite score
  - Test `fuzzyMatch()`: returns sorted results above threshold, top 3 only, default threshold 0.80, custom threshold, no matches returns empty array, duplicate candidates deduplicated
  - Minimum: 25 test cases
  - _Leverage: `backend/src/services/import/__tests__/actionMapper.test.ts` (test structure pattern), `backend/src/services/import/fuzzyMatcher.ts` (task 3)_
  - _Requirements: REQ-SCM-01.1, REQ-SCM-01.6, REQ-SCM-01.8, NFR-SCM-M1, NFR-SCM-M3_

- [x] 23. Write Jest unit tests for `conflictDetector.ts`
  - File: `backend/src/services/import/__tests__/conflictDetector.test.ts`
  - Test all 16 use cases from the design classification table:
    - UC1: exact/case/whitespace/reorder match -> no conflict
    - UC2: renamed column (high fuzzy >= 80%) -> CHANGED, WARNING severity
    - UC3-4: low similarity / no fuzzy match -> NEW, WARNING severity
    - UC5: missing measure column -> MISSING, WARNING
    - UC6: missing required patient column (memberName/memberDob) -> MISSING, BLOCKING
    - UC7: required patient column renamed -> CHANGED, BLOCKING
    - UC8: two file headers match same config column -> DUPLICATE, BLOCKING
    - UC9: one header matches multiple config columns within 5% -> AMBIGUOUS, BLOCKING
    - UC12: suffix normalization auto-resolves " E" and " Q1"/` Q2" -> no conflict
    - UC13: zero headers match (<10% config) -> `isWrongFile = true`
    - UC14: duplicate headers in file -> BLOCKING error
    - UC10: column split (one became two) -> MISSING (old) + NEW or CHANGED (new age-specific)
    - UC11: column merge (two became one) -> MISSING (old age-specific) + exact match (new total)
    - UC15: skip column renamed -> CHANGED, INFO severity
    - UC16: Sutter action text wording change -> unmappedActions (tested in task 26)
  - Test per-header fail-open: fuzzy error on one header does not prevent remaining headers from processing (NFR-SCM-R2)
  - Test `ConflictReport` summary counts are accurate
  - Test `hasBlockingConflicts` is true when any BLOCKING conflict exists
  - Minimum: 30 test cases using a mock `MergedSystemConfig`
  - _Leverage: `backend/src/services/import/__tests__/columnMapper.test.ts` (mock config pattern), `backend/src/services/import/conflictDetector.ts` (task 4)_
  - _Requirements: REQ-SCM-01.3, REQ-SCM-01.4, REQ-SCM-01.5, REQ-SCM-02.1, REQ-SCM-02.6, NFR-SCM-M3_

- [x] 24. Write Jest unit tests for `mappingService.ts`
  - File: `backend/src/services/import/__tests__/mappingService.test.ts`
  - Mock Prisma client (`jest.mock('../../../config/database.js')`) and `configLoader`
  - Test `loadMergedConfig()`:
    - DB overrides replace JSON seed entries for same `sourceColumn`
    - JSON seed entries without overrides remain in merged config
    - DB-only additions (not in JSON seed) are included
    - `isActive = false` overrides are excluded
    - DB error falls back to JSON-only (logs warning, does not throw)
    - JSON file missing but DB overrides exist: use DB-only, logs warning
  - Test `saveMappingOverrides()`:
    - Calls Prisma upsert for each change
    - Creates `AuditLog` entry with correct fields
    - Optimistic locking: throws 409 when `expectedUpdatedAt` mismatches current MAX(updatedAt)
  - Test `resetToDefaults()`: calls `deleteMany` for both override tables, creates audit log
  - Test `resolveConflicts()`: ACCEPT_SUGGESTION creates override, IGNORE creates IGNORED type override, REMOVE creates `isActive: false` override
  - Minimum: 20 test cases
  - _Leverage: `backend/src/services/import/__tests__/importExecutor.test.ts` (Prisma mock pattern), `backend/src/services/import/mappingService.ts` (task 5)_
  - _Requirements: REQ-SCM-07.1, REQ-SCM-07.2, REQ-SCM-07.7, REQ-SCM-07.8, NFR-SCM-M3_

- [x] 25. Write Jest API tests for `mapping.routes.ts`
  - File: `backend/src/routes/__tests__/mapping.routes.test.ts`
  - Use `supertest` + mock auth middleware pattern from `backend/src/routes/__tests__/import.routes.test.ts`
  - Test auth guards: `GET /:systemId` returns 401 without token; `PUT /:systemId/columns` returns 403 for non-admin; `DELETE /:systemId/reset` returns 403 for non-admin
  - Test `GET /:systemId`: 200 with valid systemId, 404 for unknown system
  - Test `PUT /:systemId/columns`: 400 for empty `sourceColumn`, 400 for duplicate sourceColumn in request, 400 for invalid `targetType`, 409 for optimistic lock conflict
  - Test `PUT /:systemId/actions`: 400 for invalid regex pattern, 400 for nested quantifier ReDoS pattern
  - Test `DELETE /:systemId/reset`: 200 returns confirmation message
  - Test `POST /:systemId/resolve`: 400 for empty resolutions, 403 for non-admin
  - Minimum: 15 test cases
  - _Leverage: `backend/src/routes/__tests__/import.routes.test.ts` (supertest + mock auth pattern), `backend/src/routes/mapping.routes.ts` (tasks 6-7)_
  - _Requirements: REQ-SCM-10.1, REQ-SCM-10.4, REQ-SCM-10.5, REQ-SCM-10.6, NFR-SCM-S1, NFR-SCM-S4_

- [x] 26. Write Jest unit tests for `fuzzyMatchAction()` in `actionMapper.ts`
  - File: `backend/src/services/import/__tests__/actionMapper.test.ts` (extend existing file)
  - Add describe block `fuzzyMatchAction` with test cases:
    - Empty action text returns null (no API call to fuzzyMatcher)
    - Action text > 500 chars truncated before matching
    - Year normalization: "FOBT in 2025 or colonoscopy" matches "FOBT in 2026 or colonoscopy" pattern
    - Multi-line action text normalized to single line before matching
    - Score below 0.75 threshold returns null
    - Score above threshold returns matching `ActionMatch`
    - Match from `matchAction()` fallback: regex fails → fuzzy fallback succeeds → result returned
    - Regex fails → fuzzy fails → action added to `unmappedActions`
  - Minimum: 8 new test cases added to existing file
  - _Leverage: `backend/src/services/import/__tests__/actionMapper.test.ts` (existing test cases), `backend/src/services/import/actionMapper.ts` (task 14)_
  - _Requirements: REQ-SCM-06.1, REQ-SCM-06.2, REQ-SCM-06.3, REQ-SCM-06.4_

- [x] 27. Write Jest unit tests for `statusDate` defaulting in `dataTransformer.ts`
  - File: `backend/src/services/import/__tests__/dataTransformer.test.ts` (extend existing file)
  - Add test cases for import date default behavior:
    - Hill row with empty Q1 date column: `statusDate` set to today (YYYY-MM-DD), `statusDateSource = 'default'`
    - Hill row with valid Q1 date: `statusDate` from file, `statusDateSource = 'file'`
    - Hill row with invalid/unparseable date: `statusDate` defaults to today, `statusDateSource = 'default'`
    - `dueDate` is calculated after `statusDate` is set (via DueDayRule)
    - `timeIntervalDays` is computed as `dueDate - statusDate` in days
  - Add similar test cases in `sutterDataTransformer.test.ts` for Sutter format
  - Minimum: 5 new test cases per transformer (10 total across 2 files)
  - _Leverage: `backend/src/services/import/__tests__/dataTransformer.test.ts` (existing test structure), `backend/src/services/import/__tests__/sutterDataTransformer.test.ts`_
  - _Requirements: REQ-SCM-08.1, REQ-SCM-08.2, REQ-SCM-08.3, REQ-SCM-08.4_

- [x] 28. Write Vitest unit tests for `ConflictBanner.tsx`
  - File: `frontend/src/components/import/ConflictBanner.test.tsx`
  - Test renders with `role="alert"` attribute
  - Test displays conflict count summary (X new, Y renamed, Z missing)
  - Test NEW conflicts render with blue badge, CHANGED with amber badge, MISSING with red badge
  - Test "Cancel" button calls `onCancel` prop
  - Test "Copy Details" button calls `onCopyDetails` prop
  - Test no resolution controls (no dropdowns, no "Save & Continue" button) are rendered
  - Test conflict list items are read-only (no interactive elements in conflict rows)
  - Minimum: 6 test cases
  - _Leverage: `frontend/src/components/import/UnmappedActionsBanner.test.tsx` (existing banner test pattern), `frontend/src/components/import/ConflictBanner.tsx` (task 15)_
  - _Requirements: REQ-SCM-05.2, REQ-SCM-05.3, NFR-SCM-U1_

- [x] 29. Write Vitest unit tests for `MappingTable.tsx`
  - File: `frontend/src/components/import/MappingTable.test.tsx`
  - Test view mode: renders sourceColumn, targetType, and measure info in read-only cells
  - Test edit mode: dropdowns rendered for each row, changing dropdown calls `onMappingChange`
  - Test resolve mode: fuzzy match suggestions shown with score percentage badge
  - Test long column name (>100 chars) truncated with `title` attribute containing full text
  - Test "Delete" button calls `onDelete` with correct sourceColumn
  - Test PATIENT targetType shows targetField dropdown instead of measure dropdowns
  - Minimum: 8 test cases
  - _Leverage: `frontend/src/components/import/SheetSelector.test.tsx` (React Testing Library patterns), `frontend/src/components/import/MappingTable.tsx` (task 16)_
  - _Requirements: REQ-SCM-04.2, REQ-SCM-04.3, NFR-SCM-U2_

- [x] 29b. Write Vitest unit tests for `ActionPatternTable.tsx`
  - File: `frontend/src/components/import/ActionPatternTable.test.tsx`
  - Test view mode: renders action patterns with regex, requestType, qualityMeasure columns
  - Test edit mode: regex field becomes editable, requestType/qualityMeasure dropdowns appear
  - Test regex validation: invalid regex shows inline error, valid regex clears error
  - Test ReDoS detection: nested quantifier pattern `(a+)+` shows warning
  - Test add skip action: new entry appended to skip actions list
  - Test remove skip action: entry removed from list
  - Test onChange callback fires with updated patterns and skip actions
  - Minimum: 7 test cases
  - _Leverage: `frontend/src/components/import/MappingTable.tsx` (task 16 pattern), `frontend/src/components/import/ActionPatternTable.tsx` (task 17)_
  - _Requirements: REQ-SCM-04.9, REQ-SCM-04.10, NFR-SCM-S4_

- [x] 30. Write Vitest unit tests for `ConflictResolutionStep.tsx`
  - File: `frontend/src/components/import/ConflictResolutionStep.test.tsx`
  - Mock `useAuthStore` and `api` (Axios)
  - Test admin view: conflict list with resolution dropdowns rendered for each conflict
  - Test "Save & Continue" button is disabled when 0 of N conflicts resolved
  - Test "Save & Continue" button becomes enabled when all conflicts have a resolution selected
  - Test clicking "Save & Continue" calls `POST /api/import/mappings/:systemId/resolve` with correct body
  - Test `onResolved` is called with updated mapping on API success
  - Test "Cancel" button calls `onCancel` without making API call
  - Test non-admin view (`isAdmin = false`): renders `ConflictBanner` instead of resolution form
  - Test loading state shown while API call is in progress
  - Test error message shown on API failure
  - Minimum: 10 test cases
  - _Leverage: `frontend/src/pages/ImportPage.test.tsx` (Axios mock pattern), `frontend/src/components/import/ConflictResolutionStep.tsx` (task 18)_
  - _Requirements: REQ-SCM-03.1, REQ-SCM-03.5, REQ-SCM-03.6, REQ-SCM-05.1_

- [x] 31. Write Vitest unit tests for `MappingManagementPage.tsx`
  - File: `frontend/src/pages/MappingManagementPage.test.tsx`
  - Mock `useAuthStore` (ADMIN user), mock `api` for `GET /api/import/systems` and `GET /api/import/mappings/:systemId`
  - Test system selector dropdown is populated from API response
  - Test switching selected system triggers `GET /api/import/mappings/:systemId` for the new system
  - Test patient column mappings table renders for loaded config
  - Test measure column mappings table renders
  - Test Sutter system: action pattern table is shown; Hill system: action pattern table is hidden
  - Test last-modified metadata displayed when present
  - Test "Reset to Defaults" button triggers confirmation modal; confirm calls `DELETE /api/import/mappings/:systemId/reset`
  - Test empty measure columns shows amber warning message
  - Test loading spinner shown while API call in progress
  - Minimum: 12 test cases
  - _Leverage: `frontend/src/pages/AdminPage.test.tsx` (page-level test structure), `frontend/src/pages/MappingManagementPage.tsx` (task 19)_
  - _Requirements: REQ-SCM-04.1, REQ-SCM-04.7, REQ-SCM-09.2_

- [x] 32. Write Playwright E2E tests for admin mapping management flow
  - File: `frontend/e2e/smart-column-mapping.spec.ts`
  - Use `MainPage` or create `MappingPage` Page Object Model in `frontend/e2e/pages/mapping-page.ts` if reusable selectors are needed
  - Test: admin navigates to `/admin/import-mapping`, page loads with system selector
  - Test: selecting Hill system loads patient and measure column tables
  - Test: selecting Sutter system shows action pattern table section
  - Test: editing a mapping row, saving, page shows updated value
  - Test: "Reset to Defaults" shows confirmation modal; cancelling does not reset; confirming resets and table reflects seed values
  - Test: non-admin user navigating to `/admin/import-mapping` is redirected to `/` (use staff credentials)
  - Minimum: 6 test scenarios
  - _Leverage: `frontend/e2e/pages/main-page.ts` (Page Object Model pattern), `frontend/e2e/sutter-import.spec.ts` (import flow test pattern)_
  - _Requirements: REQ-SCM-04.1, REQ-SCM-04.5, REQ-SCM-04.8, REQ-SCM-05.5_

- [x] 33. Write Playwright E2E tests for import conflict resolution flow
  - File: `frontend/e2e/import-conflict-resolution.spec.ts`
  - Test: admin uploads Hill file with a renamed column header, conflict step appears instead of navigating to preview
  - Test: conflict list shows the renamed column with a fuzzy suggestion and percentage score
  - Test: admin selects "Accept suggestion" for all conflicts, "Save & Continue" becomes enabled
  - Test: clicking "Save & Continue" saves resolutions, then re-submits preview, navigates to ImportPreviewPage
  - Test: clicking "Cancel" returns to file upload step (conflict step disappears, file input re-enabled)
  - Minimum: 5 test scenarios
  - _Leverage: `frontend/e2e/sutter-import.spec.ts` (import flow test patterns), `frontend/e2e/pages/main-page.ts`_
  - _Requirements: REQ-SCM-02.2, REQ-SCM-03.1, REQ-SCM-03.5, REQ-SCM-03.6_

- [x] 34. Write Cypress E2E tests for admin conflict resolution dropdowns
  - File: `frontend/cypress/e2e/import-conflict-admin.cy.ts`
  - Use `cy.visit('/patient-management')` and navigate to import tab
  - Test: upload file with renamed column, `ConflictResolutionStep` renders with dropdown per conflict
  - Test: selecting resolution from dropdown updates resolved count in `aria-live` region
  - Test: "Save & Continue" button is disabled until all dropdowns have a selection
  - Test: selecting "Ignore" resolution works the same as mapping resolution (counts toward resolved total)
  - Minimum: 4 test scenarios using `cy.get()` and Cypress dropdown interaction
  - _Leverage: `frontend/cypress/e2e/import-flow.cy.ts` (existing import Cypress test pattern), `frontend/cypress/support/commands.ts` (custom commands)_
  - _Requirements: REQ-SCM-03.2, REQ-SCM-03.4_

- [x] 35. Write Cypress E2E tests for non-admin import blocking behavior
  - File: `frontend/cypress/e2e/import-conflict-nonadmin.cy.ts`
  - Login as STAFF user
  - Test: upload file with renamed column, blocking `ConflictBanner` is shown (not resolution form)
  - Test: no resolution dropdowns are present in the banner
  - Test: "Cancel" button is present and returns to file upload step
  - Test: "Copy Details" button is present and functional (verify clipboard text contains conflict info)
  - Minimum: 4 test scenarios
  - _Leverage: `frontend/cypress/e2e/role-access-control.cy.ts` (role-based login pattern), `frontend/cypress/e2e/import-flow.cy.ts`_
  - _Requirements: REQ-SCM-05.1, REQ-SCM-05.2, REQ-SCM-05.3_

- [x] 36. Write Cypress E2E tests for mapping management page CRUD
  - File: `frontend/cypress/e2e/mapping-management.cy.ts`
  - Login as ADMIN user, navigate to `/admin/import-mapping`
  - Test: system selector shows all configured systems
  - Test: "Add Mapping" button opens inline form with sourceColumn input and type/measure dropdowns
  - Test: submitting add mapping form saves and updates the table
  - Test: "Edit" button on a row opens inline edit form
  - Test: switching system in dropdown loads different mapping config
  - Minimum: 5 test scenarios
  - _Leverage: `frontend/cypress/e2e/role-access-control.cy.ts` (admin login), `frontend/cypress/support/commands.ts`_
  - _Requirements: REQ-SCM-04.1, REQ-SCM-04.3, REQ-SCM-04.4, REQ-SCM-04.5_

- [ ] 37. Visual browser review for conflict resolution step and mapping management page (Layer 5)
  - Tool: ui-ux-reviewer agent (MCP Playwright real browser)
  - Review 1 -- `ConflictResolutionStep` (admin view):
    - Navigate to import flow, trigger conflicts with a renamed-column file
    - Verify color-coded badges: blue for NEW, amber for CHANGED, red for MISSING
    - Verify similarity score percentage is visible next to fuzzy suggestions
    - Verify "Save & Continue" button is visually disabled until all resolved
    - Take screenshot and verify visual integration with existing import flow (no jarring layout)
  - Review 2 -- `ConflictBanner` (non-admin view):
    - Login as STAFF, trigger same conflict scenario
    - Verify blocking banner shows with amber/red styling, no resolution controls
    - Verify "Copy Details" button is visible and styled correctly
  - Review 3 -- `MappingManagementPage`:
    - Navigate to `/admin/import-mapping`
    - Verify table layout, system selector, badge indicators for overrides vs seed values
    - Switch between Hill and Sutter systems, verify action pattern section appears/disappears
    - Verify last-modified metadata display
    - Take screenshots of each section
  - Review 4 -- accessibility spot check:
    - Tab through conflict resolution form, verify focus order and visible focus rings
    - Verify `aria-live` region is present in the DOM
  - _Leverage: ui-ux-reviewer agent, MCP Playwright browser tools_
  - _Requirements: NFR-SCM-U1, NFR-SCM-U2, NFR-SCM-U3, NFR-SCM-U5_

---

### Phase 8 -- Integration Verification

- [x] 38. Verify end-to-end import pipeline with merged config and no conflicts
  - Files: `backend/src/routes/__tests__/import.routes.test.ts` (extend existing)
  - Add integration test: upload a valid Hill file whose headers exactly match merged config (no DB overrides needed) -- verify response has no `hasConflicts` field and includes normal preview data
  - Add integration test: upload a valid Hill file after seeding one DB override that renames a column -- verify the override is respected and no conflicts are reported (because file now matches the override)
  - Add integration test: upload a Hill file with a renamed column, verify response has `hasConflicts: true` with non-empty `conflicts` array
  - Add integration test: upload a completely wrong file (Excel from a different system), verify `isWrongFile = true` response
  - These tests can mock `prisma` and `configLoader` but should test the full route handler logic end-to-end
  - Minimum: 4 integration test cases
  - _Leverage: `backend/src/routes/__tests__/import.routes.test.ts` (existing import route test infrastructure), all tasks 3-11_
  - _Requirements: REQ-SCM-01.7, REQ-SCM-02.4, REQ-SCM-02.5, REQ-SCM-07.3, REQ-SCM-09.1_

---

## Dependency Chain

```
Task 1 (schema enum+model) ──┐
Task 2 (schema action+migrate)──┤
                              ├──> Task 5 (mappingService) ──> Task 8 (register routes)
Task 3 (fuzzyMatcher) ───────┤                             ──> Task 6 (mapping routes GET/DELETE/resolve)
                              ├──> Task 4 (conflictDetector) ──> Task 11 (extend import preview)
                              └──> Task 14 (fuzzyMatchAction)

Task 5 ──> Task 9 (configLoader re-export)
Task 5 ──> Task 6 ──> Task 7 (PUT endpoints)
Task 6 + Task 7 ──> Task 8 (register routes)

Task 4 + Task 5 ──> Task 10 (extend columnMapper)
Task 10 + Task 11 ──> Task 38 (integration verification)

Task 15 (ConflictBanner) ──> Task 18 (ConflictResolutionStep)
Task 16 (MappingTable) ──> Task 18, Task 19 (MappingManagementPage)
Task 17 (ActionPatternTable) ──> Task 19

Task 18 ──> Task 20 (ImportPage extension)
Task 19 + Task 21 (App.tsx routing) ── independent of ImportPage

Tasks 22-27 (backend unit tests) ── can run after corresponding service task completes
Tasks 28-31 (frontend unit tests) ── can run after corresponding component task completes
Tasks 32-36 (E2E tests) ── require all implementation tasks complete
Task 37 (visual review) ── requires all frontend implementation tasks complete
Task 38 (integration) ── requires Phase 3 and Phase 4 complete
```

## Estimated Implementation Phases

| Phase | Tasks | Focus | Estimated Effort |
|-------|-------|-------|-----------------|
| 1 -- Database | 1-2 | Schema + migration | 30-45 min |
| 2 -- Backend Services | 3-5 | fuzzyMatcher, conflictDetector, mappingService | 90-120 min |
| 3 -- Backend Routes | 6-8 | mapping.routes.ts, registration | 45-60 min |
| 4 -- Import Pipeline Extensions | 9-14 | Extend existing modules | 60-90 min |
| 5 -- Frontend Components | 15-18 | 4 new components | 90-120 min |
| 6 -- Frontend Pages + Routing | 19-21 | MappingManagementPage, App.tsx | 60-90 min |
| 7 -- Tests | 22-37 | All 5 test layers | 120-180 min |
| 8 -- Integration | 38 | End-to-end pipeline verification | 30 min |

**Total: ~8-10 hours for an experienced developer**

## Key Reuse Points from Existing Codebase

1. **`poc-fuzzy-matching.ts`** -- Port the working Jaro-Winkler + Jaccard implementation directly into `fuzzyMatcher.ts`. This avoids re-implementing from scratch.

2. **`configLoader.ts`** -- All system config types (`HillSystemConfig`, `SutterSystemConfig`, `ActionMappingEntry`, `isSutterConfig()`, `isHillConfig()`) are reused as-is by the new modules. Zero changes needed to load semantics.

3. **`columnMapper.ts`** -- Only the function signature is extended (optional parameter). The core Hill/Sutter dispatch logic and all `ColumnMapping`/`MappingResult` types are reused unchanged.

4. **`actionMapper.ts`** -- The compiled regex cache pattern and `matchAction()` are reused. `fuzzyMatchAction()` is a new fallback function, not a replacement.

5. **`dataTransformer.ts` / `sutterDataTransformer.ts`** -- Only the `statusDate` extraction section is modified. The rest of the transform pipeline is untouched.

6. **`UnmappedActionsBanner.tsx`** -- Design reference for `ConflictBanner` (color badges, layout). No code inheritance needed but structure is similar.

7. **`ProtectedRoute.tsx`** -- Reused as-is to guard `/admin/import-mapping`. No modification needed.

8. **`ConfirmModal.tsx`** -- Reused as-is for "Reset to Defaults" confirmation in `MappingManagementPage`.

9. **`AuditLog` Prisma model** -- Existing flexible `action`/`entity`/`changes` JSON schema supports `MAPPING_CHANGE` entries without schema changes.

10. **Existing test infrastructure** -- `import.routes.test.ts` mock-auth pattern and `actionMapper.test.ts` Jest structure are directly extended for new test files.
