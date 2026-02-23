# Requirements Document -- Smart Column Mapping

## Introduction

Replace the current fixed/exact-match column mapping with an intelligent, insurance-agnostic fuzzy matching system that detects header changes, warns users, and allows ADMIN users to manage mappings through the UI. This eliminates developer involvement when insurance systems rename, reorder, or add columns to their spreadsheets. The system must work identically across all current insurance systems (Hill, Sutter/SIP) and any future systems added to the registry, without requiring code changes.

### Current Behavior

- Column mappings are hardcoded in JSON config files (`hill.json`, `sutter.json`) located in `backend/src/config/import/`.
- Hill headers are matched by **exact string** in `columnMapper.ts` via `mapHillColumns()` and `findMeasureMapping()`.
- Sutter headers are matched by **exact string** in `sutterColumnMapper.ts` via `mapSutterColumns()`.
- Sutter action text ("Possible Actions Needed") is matched by **compiled regex patterns** in `actionMapper.ts` via `matchAction()`.
- If a header changes even slightly (e.g., "BP Control" becomes "Blood Pressure Control"), the column lands in `unmappedColumns` and is **silently skipped** -- no warning, data lost.
- If a required patient column is missing, the import fails with a generic validation error.
- Only a developer can update mappings by editing JSON files on the server and redeploying.
- The `configLoader.ts` reads config from the filesystem on every call with no database override layer.
- The existing `/hill-mapping` page (`HillMeasureMapping.tsx`) is a read-only status mapping viewer with CSV export -- it does not support editing column mappings.

### New Behavior (Implemented)

- System uses **fuzzy matching** with a composite similarity scoring algorithm (60% Jaro-Winkler + 40% Jaccard token overlap) to detect renamed/changed headers. Additionally, common medical abbreviations (e.g., "bp" -> "blood pressure", "hba1c" -> "glycemic status assessment", "awv" -> "annual wellness visit") are expanded during normalization to improve cross-vocabulary matching.
- **Conflict detection** runs during `POST /api/import/preview` between file parsing and column mapping. When conflicts are detected, the preview returns early with a `hasConflicts: true` response containing a `ConflictReport` instead of generating the full diff preview.
- **ADMIN users** can resolve conflicts inline during the import flow via an interactive `ConflictResolutionStep` component with per-conflict resolution dropdowns, and can manage mappings proactively through a dedicated admin page at `/admin/import-mapping`.
- **Non-admin users** (STAFF, PHYSICIAN) see a read-only `ConflictBanner` that blocks import and instructs them to contact an administrator, with a "Copy Details" button to share conflict information.
- Mapping changes are persisted to the **database** (`ImportMappingOverride` and `ImportActionOverride` tables) with JSON config files serving as seed/fallback. The merge logic in `mappingService.ts` combines DB overrides with JSON seed defaults.
- Sutter action text benefits from fuzzy matching when regex patterns fail, via `fuzzyMatchAction()` in `actionMapper.ts`.
- Applies to **all** current systems (Hill, Sutter/SIP) and any future systems added to `systems.json` -- the system is insurance-agnostic.
- Import date is used as the default `statusDate` when no date column exists in the spreadsheet, with a `statusDateSource` field ('file' or 'default') tracking the origin.
- The existing `/hill-mapping` route redirects to `/admin/import-mapping?system=hill`.
- A new shared types module (`backend/src/services/import/mappingTypes.ts`) provides common type definitions used by both `conflictDetector.ts` and `mappingService.ts`, avoiding circular dependencies.
- A new frontend types module (`frontend/src/types/import-mapping.ts`) mirrors the backend types for type-safe consumption by React components.

## Alignment with Product Vision

This feature directly supports the product vision of empowering medical office staff to manage patient quality measures without technical dependencies:

1. **Self-service administration**: Administrators can manage import column mappings through the UI without developer involvement, reducing turnaround time from days (code deploy) to minutes (UI click).
2. **Data integrity protection**: Fuzzy matching with warnings prevents silent data loss when insurance systems rename columns, which is a real-world occurrence in healthcare data exchanges.
3. **Insurance-agnostic design**: By abstracting the mapping layer away from system-specific code, adding a new insurance system (e.g., Kaiser) automatically benefits from fuzzy matching, conflict detection, and admin management without any code changes.
4. **Role-based access control**: Mapping management is restricted to ADMIN users, aligning with the existing RBAC model (`requireRole(['ADMIN'])` middleware) and preventing non-admin users from making potentially destructive configuration changes.

---

## Requirements

### REQ-SCM-01: Fuzzy Header Matching Engine

**User Story:** As an import user, I want the system to fuzzy-match renamed column headers to known mappings, so that minor header changes (renaming, reordering, typos) do not silently lose patient data.

**Implementation:** `backend/src/services/import/fuzzyMatcher.ts` -- a standalone string similarity utility module with zero import-specific dependencies.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN a spreadsheet header does not exactly match any known mapping in the active configuration THEN the system calculates a similarity score against all known column names using a composite scoring algorithm: 60% Jaro-Winkler similarity + 40% Jaccard token overlap on word tokens.
2. **[IMPLEMENTED]** IF a fuzzy match scores above the configurable threshold (default: 80% similarity) THEN the system flags it as a "probable match" (CHANGED conflict type) and includes it in the conflict detection results.
3. **[IMPLEMENTED]** WHEN multiple unrecognized headers exist THEN each has its own independent fuzzy suggestions ranked by similarity score.
4. **[IMPLEMENTED]** The `fuzzyMatch()` function returns the top 3 matches above the threshold, sorted by descending score.
5. **[IMPLEMENTED]** IF no fuzzy match scores above the threshold THEN the column is flagged as a NEW conflict with no exact match. For NEW columns, a broader fuzzy search at a lower threshold (50%) is performed to provide suggestions for user guidance.
6. **[IMPLEMENTED]** WHEN fuzzy matching is performed THEN the system normalizes both the source header and candidate names by: trimming whitespace, lowercasing, removing common suffixes (" E", " Q1", " Q2"), collapsing multiple spaces, and expanding common medical abbreviations (e.g., "bp" -> "blood pressure", "hba1c" -> "glycemic status assessment", "awv" -> "annual wellness visit", plus 30+ additional abbreviations).
7. **[IMPLEMENTED]** WHEN an exact match exists for a header (after normalization) THEN the system uses the exact match and does NOT invoke fuzzy matching for that header, ensuring zero performance overhead for unchanged columns.
8. **[IMPLEMENTED]** The composite scoring approach uses: 60% Jaro-Winkler similarity (with prefix scale factor 0.1, max prefix length 4) + 40% Jaccard token overlap (tokenized on whitespace, computing |intersection| / |union|). Both inputs are normalized before scoring.

#### Edge Cases

- **Empty header**: Empty or whitespace-only headers are silently skipped (not flagged as conflicts) -- the `normalizeHeader()` function trims to empty string which does not match any config column.
- **Duplicate fuzzy match**: If two file headers fuzzy-match the same known column, both are flagged as DUPLICATE conflicts with BLOCKING severity for manual resolution (only one can map to a given target). Detection occurs by tracking `fuzzyMatchTargets` (a map of normalized config column -> list of file headers that matched it).
- **Case-only change**: "BP control" vs "BP Control" (case-only difference) is treated as an exact match after normalization, not a fuzzy match.
- **Q1/Q2 suffix handling**: For Hill format, "Eye Exam Q1" and "Eye Exam Q2" suffixes are stripped by `normalizeHeader()` before fuzzy matching. The `findMeasureMapping()` / `findMergedMeasureMapping()` functions in `columnMapper.ts` handle re-applying Q1/Q2 suffixes to determine `statusDate` vs `complianceStatus` target fields.
- **Abbreviation expansion**: Common medical abbreviations are expanded during normalization (e.g., "BP Control" normalizes to "blood pressure control"), improving matching accuracy when insurance systems alternate between abbreviations and full terms.

---

### REQ-SCM-02: Column Change Detection and Warnings

**User Story:** As an import user, I want to see clear warnings when column headers differ from the saved mapping, so that I am aware of changes before any data is processed.

**Implementation:** `backend/src/services/import/conflictDetector.ts` -- the `detectConflicts()` function implements a 7-step classification pipeline.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN a file is uploaded for import THEN the system compares uploaded file headers against the active merged mapping configuration (DB overrides + JSON seed) and classifies changes into five categories: **NEW** (in file but not in mapping), **MISSING** (in mapping but not in file), **CHANGED** (fuzzy-match to a known column but not exact), **DUPLICATE** (two file headers match same config column), and **AMBIGUOUS** (one file header matches multiple config columns within 5% score range).
2. **[IMPLEMENTED]** IF any column changes are detected THEN the `POST /api/import/preview` endpoint returns early with `{ success: true, data: { hasConflicts: true, conflicts: conflictReport } }` -- the full diff/preview is NOT computed until conflicts are resolved. The frontend `ImportTabContent` component detects `hasConflicts: true` and renders the `ConflictResolutionStep` component instead of navigating to the preview page.
3. **[IMPLEMENTED]** The `ConflictReport` includes a `summary` object with counts for each category (`total`, `new`, `missing`, `changed`, `duplicate`, `ambiguous`, `blocking`, `warnings`). The frontend displays these as color-coded count chips in the summary banner.
4. **[IMPLEMENTED]** IF no column changes are detected (all headers match exactly after normalization) THEN the import proceeds directly to the full preview step without showing a conflict resolution step.
5. **[IMPLEMENTED]** WHEN changes are detected THEN the system returns the conflict data via the existing `POST /api/import/preview` endpoint response (new `hasConflicts` and `conflicts` fields) as a short-circuit response -- the full diff/preview is NOT computed until conflicts are resolved. A subsequent preview call after conflict resolution produces the normal preview.
6. **[IMPLEMENTED]** WHEN a column is classified as "MISSING" THEN the system distinguishes between patient columns and measure columns via the `category` field on each `ColumnConflict`. Missing required patient columns (`memberName`/`memberDob` targets) are classified with BLOCKING severity, while missing measure columns are classified with WARNING severity.

#### Edge Cases

- **All columns missing / wrong file**: If the matched count is less than 10% of total config columns, the system sets `isWrongFile = true` on the `ConflictReport` and the import route returns a 400 error: "No recognizable columns found. This file may not be from the selected insurance system." (error code `WRONG_FILE`).
- **Reordered but identical**: Columns that appear in a different order but with identical names (after normalization) are NOT flagged as changes. The conflict detector uses a normalized lookup map, not positional matching.
- **Extra whitespace**: Headers with leading/trailing whitespace differences are treated as exact matches after trimming via `normalizeHeader()`.
- **Duplicate headers in file**: If `new Set(normalizedHeaders).size < headers.length`, duplicate headers are detected as a pre-check before any fuzzy matching. Each duplicate header generates a DUPLICATE conflict with BLOCKING severity. The function returns early with only the duplicate conflicts.

---

### REQ-SCM-03: Admin Inline Conflict Resolution During Import

**User Story:** As an ADMIN user, I want to resolve column mapping conflicts directly during the import flow, so that I can fix issues immediately without leaving the import workflow or navigating to a separate page.

**Implementation:** `frontend/src/components/import/ConflictResolutionStep.tsx` -- inserted into `ImportPage.tsx` (`ImportTabContent`) between the SheetSelector step and preview navigation.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN conflicts are detected during import AND the authenticated user has the ADMIN role THEN the system displays the interactive `ConflictResolutionStep` component within the import flow. The `isAdmin` prop is determined by `checkIsAdmin(user)` from `authStore.ts`.
2. **[IMPLEMENTED]** WHEN resolving a **NEW column** conflict THEN the ADMIN can select: "Map to measure" (`MAP_TO_MEASURE`), "Map to patient field" (`MAP_TO_PATIENT`), or "Ignore" (`IGNORE`).
3. **[IMPLEMENTED]** WHEN resolving a **MISSING column** conflict THEN the ADMIN can select: "Keep mapping" (`KEEP`) or "Remove mapping" (`REMOVE`).
4. **[IMPLEMENTED]** WHEN resolving a **CHANGED/renamed column** conflict THEN the ADMIN can select: "Accept suggestion" (`ACCEPT_SUGGESTION` -- auto-populates suggestion data from the top fuzzy match), "Map to different measure" (`MAP_TO_MEASURE`), or "Ignore" (`IGNORE`).
5. **[IMPLEMENTED]** WHEN the ADMIN resolves all conflicts and clicks "Save & Continue" THEN the resolutions are sent to `POST /api/import/mappings/:systemId/resolve` as an array of `ResolvedConflict` objects (each containing `conflictId`, `sourceColumn`, and `resolution`). The resolution changes are persisted to the database mapping configuration via `saveMappingOverrides()`, AND the import flow clears the conflict state and re-submits `POST /api/import/preview` which should now proceed without conflicts.
6. **[IMPLEMENTED]** IF the ADMIN cancels the conflict resolution THEN no mapping changes are saved, the conflict state is cleared, the file selection is reset, and the user returns to the file upload step.
7. **[IMPLEMENTED]** WHEN the ADMIN saves conflict resolutions THEN an `AuditLog` entry is created with action `MAPPING_CHANGE`, entity `import_mapping`, and a `changes` JSON containing the before/after mapping values for each modified column.

#### Resolution Actions for DUPLICATE and AMBIGUOUS Conflicts

- **DUPLICATE conflicts**: ADMIN can select "Select this mapping" (`ACCEPT_SUGGESTION`) or "Ignore others" (`IGNORE`).
- **AMBIGUOUS conflicts**: ADMIN can select "Select correct mapping" (`ACCEPT_SUGGESTION`) from the available fuzzy suggestions.

#### Edge Cases

- **Partial resolution**: The ADMIN must resolve ALL conflicts before proceeding -- the "Save & Continue" button is `disabled` until `resolvedCount === totalConflicts`. A progress bar and `aria-live="polite"` region announce progress (e.g., "X of Y conflicts resolved").
- **Session timeout**: If the user's session expires during conflict resolution, the Axios interceptor catches the 401 response, and unsaved changes are lost. The error is displayed in the component's error display area.
- **Concurrent mapping edit**: If another admin modifies the same mapping while the first admin is resolving conflicts, the `saveMappingOverrides()` function uses optimistic locking via `expectedUpdatedAt` timestamp comparison. If a mismatch is detected, a 409 error is returned.
- **Focus management**: On mount, focus moves to the first conflict row after a 100ms delay to ensure the DOM is rendered.

---

### REQ-SCM-04: Dedicated Admin Mapping Management Page

**User Story:** As an ADMIN user, I want a dedicated page to view, edit, and manage all column mappings for all insurance systems, so that I can proactively configure mappings without needing to start an import.

**Implementation:** `frontend/src/pages/MappingManagementPage.tsx` at route `/admin/import-mapping`, using `MappingTable.tsx` and `ActionPatternTable.tsx` components.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN an ADMIN user navigates to `/admin/import-mapping` THEN the system displays the mapping management page with a system selector dropdown populated from `GET /api/import/systems`. The first system (or default system) is auto-selected.
2. **[IMPLEMENTED]** WHEN a system is selected THEN the page loads the merged config via `GET /api/import/mappings/:systemId` and displays three sections: (a) **Patient Column Mappings** table, (b) **Measure Column Mappings** table, and (c) **Ignored Columns** table (shown only if skip columns exist). Each section uses the `MappingTable` component.
3. **[IMPLEMENTED]** WHEN the ADMIN toggles "Edit Mappings" mode THEN all `MappingTable` sections switch from `view` to `edit` mode, showing inline dropdowns for target type, request type, quality measure, or patient field selection. Changes are saved immediately via `PUT /api/import/mappings/:systemId/columns`.
4. **[IMPLEMENTED]** WHEN an ADMIN clicks "Add Mapping" THEN an inline form appears with a source column name text input and a `MappingTable` in `resolve` mode for target configuration. Saving calls `PUT /api/import/mappings/:systemId/columns`.
5. **[IMPLEMENTED]** WHEN an ADMIN moves a column from "mapped" to "ignored" (or vice versa) via the target type dropdown THEN the change takes effect on the next import without requiring a server restart.
6. **[IMPLEMENTED]** WHEN an ADMIN saves any mapping change THEN the system sends the change to `PUT /api/import/mappings/:systemId/columns`, which validates that the target measure exists in the database (`prisma.qualityMeasure.findFirst`) and returns 400 if not found.
7. **[IMPLEMENTED]** WHEN the mapping management page loads THEN it shows the `lastModifiedAt` timestamp and the display name of the admin who last modified each system's mappings (from `mergedConfig.lastModifiedAt` and `mergedConfig.lastModifiedBy`).
8. **[IMPLEMENTED]** WHEN the page is accessed by a user without the ADMIN role THEN the `ProtectedRoute` component with `allowedRoles={['ADMIN']}` redirects to the main page. Additionally, the `MappingManagementPage` component itself performs a `navigate('/')` redirect if the user lacks the ADMIN role.
9. **[IMPLEMENTED]** WHEN a long-format system is selected (e.g., Sutter) THEN the page additionally displays an "Action Pattern Configuration" section using the `ActionPatternTable` component, showing: (a) **Action pattern mappings** -- regex pattern, request type, quality measure, measure status, and override badge, and (b) **Skip Actions** -- list of action texts that are silently skipped during import, with add/remove functionality in edit mode.
10. **[IMPLEMENTED]** WHEN an ADMIN edits an action pattern mapping THEN the `ActionPatternTable` performs client-side regex validation via `new RegExp(value)` in a try/catch, showing an inline red "Invalid regex" error if the pattern is syntactically invalid. Server-side validation (including ReDoS detection) is also performed in the PUT endpoint.
11. **[IMPLEMENTED]** WHEN no DB overrides exist for a system THEN the page shows a blue info banner: "Using Default Configuration -- This system is using the built-in default column mappings."
12. **[IMPLEMENTED]** "Reset to Defaults" button appears only when the system has DB overrides. Clicking it shows a `ConfirmModal` with a warning, and confirmation calls `DELETE /api/import/mappings/:systemId/reset` which deletes all overrides.

#### Edge Cases

- **Empty state**: If a system has no measure column mappings, the page shows an amber warning: "No Measure Columns Configured -- This system has no measure column mappings. Use 'Add Mapping' to configure measure columns for quality tracking."
- **Long column names**: Column names longer than 100 characters are truncated with an ellipsis via the `truncateText()` helper in `MappingTable.tsx`, with the full text available in the `title` attribute on hover.
- **Optimistic locking on save**: Each PUT column mapping request includes `expectedUpdatedAt` from the current `mergedConfig.lastModifiedAt`. If another admin modified the mapping, a 409 error is caught and displayed as "Another admin has modified these mappings. Please reload and try again."

---

### REQ-SCM-05: Non-Admin Import Blocking with Redirect

**User Story:** As a STAFF or PHYSICIAN user, I want to see a clear warning when column mapping conflicts exist during import, so that I know to contact an administrator before proceeding.

**Implementation:** `frontend/src/components/import/ConflictBanner.tsx` -- rendered by `ConflictResolutionStep` when `isAdmin` is false.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN column mapping conflicts are detected during import AND the authenticated user does NOT have the ADMIN role THEN the import is blocked at the conflict detection step. The `ConflictResolutionStep` delegates to `ConflictBanner` when `isAdmin === false`.
2. **[IMPLEMENTED]** WHEN import is blocked for a non-admin user THEN the system displays a `role="alert"` banner with amber styling containing: "Column mapping conflicts detected. Please contact your administrator to resolve the mapping for [systemName] before importing." with a grouped, read-only list of the specific conflicts using color-coded badges.
3. **[IMPLEMENTED]** WHEN the warning is displayed THEN the user has only two available actions: "Cancel" (clears conflicts, resets file, returns to file upload step) and "Copy Details" (copies a structured text summary to clipboard via `navigator.clipboard.writeText()` containing system name, total conflicts, and per-conflict type/severity/message/suggestions).
4. **[IMPLEMENTED]** WHEN an ADMIN subsequently resolves the conflicts (via mapping page or their own import) THEN the next import attempt by any user for the same system proceeds without blocking, assuming the file headers now match the updated mapping.
5. **[IMPLEMENTED]** IF the user navigates directly to `/admin/import-mapping` without the ADMIN role THEN `ProtectedRoute` with `allowedRoles={['ADMIN']}` redirects to `/`.

#### Edge Cases

- **ADMIN + PHYSICIAN dual role**: A user with both ADMIN and PHYSICIAN roles sees the admin conflict resolution UI (REQ-SCM-03), not the blocking message, because `checkIsAdmin(user)` returns true for any user with the ADMIN role.
- **STAFF assigned to physician**: The blocking behavior applies regardless of which physician the STAFF user is importing for -- the `isAdmin` check is role-based, not physician-based.

---

### REQ-SCM-06: Sutter Action Pattern Fuzzy Matching

**User Story:** As an import user, I want Sutter action text ("Possible Actions Needed") to be fuzzy-matched against known patterns when regex matching fails, so that minor wording changes in Sutter actions do not silently default to "Not Addressed."

**Implementation:** `fuzzyMatchAction()` function in `backend/src/services/import/actionMapper.ts`, added as a fallback in `matchAction()`.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN a Sutter action text does not match any compiled regex pattern in `actionMapping` (via `matchAction()` in `actionMapper.ts`) THEN `matchAction()` falls back to calling `fuzzyMatchAction(actionText, cache)` before returning null.
2. **[IMPLEMENTED]** WHEN performing fuzzy matching on action text THEN `fuzzyMatchAction()`: (a) normalizes the input (line breaks to spaces, truncates to 500 characters, trims), (b) strips year patterns (`\d{4}`) for year-agnostic matching, (c) builds a candidate list from `cache.compiledPatterns` regex source strings, and (d) calls `fuzzyMatch()` from `fuzzyMatcher.ts` with the year-stripped text against the candidates.
3. **[IMPLEMENTED]** IF a fuzzy match scores above the action-matching threshold (default: 75% similarity) THEN `fuzzyMatchAction()` returns an `ActionMatch` with `matchedBy: 'fuzzy'` and the `fuzzyScore` field. The match uses the target `requestType`, `qualityMeasure`, and `measureStatus` from the matched pattern.
4. **[IMPLEMENTED]** IF no fuzzy match is found above the threshold THEN `fuzzyMatchAction()` returns null, and the action text falls through to the existing unmapped action handling (added to `unmappedActions` array in the Sutter transform result).
5. **[NOT IMPLEMENTED - Out of Scope for current phase]** WHEN an ADMIN resolves an unknown action, the ability to create new regex patterns or add to skip actions is available via the mapping management page (REQ-SCM-04.9) but not directly inline during import conflict resolution. Action text conflicts are not surfaced in the inline `ConflictResolutionStep` -- they appear in the `unmappedActions` section of the preview response.

#### Edge Cases

- **Multi-line action text**: Action text containing line breaks is normalized to single-line (spaces replaced via `.replace(/\r\n/g, ' ').replace(/\n/g, ' ')`) before fuzzy matching.
- **Year-only change**: "FOBT in 2025 or colonoscopy" vs "FOBT in 2026 or colonoscopy" -- the existing regex patterns handle year variation via `\d{4}`; if regex fails, `fuzzyMatchAction()` strips all 4-digit year sequences before scoring, treating these as near-identical.
- **Empty action text**: Empty or whitespace-only action text after normalization returns null immediately without invoking fuzzy matching.
- **Very long action text**: Action text is truncated to 500 characters via `.substring(0, 500)` before fuzzy matching to prevent performance degradation.

---

### REQ-SCM-07: Database-Backed Mapping Persistence with JSON Seed Fallback

**User Story:** As a system administrator, I want mapping changes to be persisted reliably in the database with JSON config files as the default seed, so that changes survive server restarts, are consistent across users, and can be initialized from version-controlled seed data.

**Implementation:** `backend/src/services/import/mappingService.ts` (CRUD and merge logic), `backend/prisma/schema.prisma` (data models), `backend/prisma/migrations/20260220183125_add_import_mapping_overrides/` (migration).

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN the system needs a column mapping configuration THEN `loadMergedConfig(systemId)` first loads the JSON seed via `loadSystemConfig(systemId)`, then queries the database for active `ImportMappingOverride` records. DB overrides take precedence over JSON seed values for the same source column.
2. **[IMPLEMENTED]** IF no database overrides exist for a given system ID THEN the system falls back to reading the JSON config file (e.g., `hill.json`, `sutter.json`) from `backend/src/config/import/`.
3. **[IMPLEMENTED]** WHEN the application is first deployed (or a new system is added) THEN the database has no override entries, and the JSON seed files serve as the complete mapping configuration.
4. **[IMPLEMENTED]** WHEN an ADMIN saves mapping changes (via inline resolution or the management page) THEN the changes are written to the database as override entries via `prisma.importMappingOverride.upsert()`, leaving the JSON seed files untouched.
5. **[IMPLEMENTED]** WHEN a mapping override is saved to the database THEN it takes effect immediately on the next import call without requiring a server restart or cache invalidation -- `loadMergedConfig()` always queries the DB fresh.
6. **[IMPLEMENTED]** WHEN mapping overrides are saved THEN `mappingService.ts` creates an `AuditLog` entry with: `action = 'MAPPING_CHANGE'`, `entity = 'import_mapping'`, `entityId = null`, `changes` JSON containing `{ systemId, before: {...}, after: {...} }` with the before/after mapping values per source column. For resets, the action is `'MAPPING_RESET'` with the count of deleted mappings and actions.
7. **[IMPLEMENTED]** WHEN the system loads mappings THEN `buildMergedConfig()` merges database overrides with JSON seed defaults: DB overrides replace seed values for the same `sourceColumn`; seed values not overridden remain active; DB-only additions (new columns not in seed) are included in the appropriate section (patient/measure/data/skip) based on their `targetType`.
8. **[IMPLEMENTED]** WHEN an ADMIN wants to "reset to defaults" for a system THEN `resetToDefaults(systemId, userId)` deletes all `ImportMappingOverride` and `ImportActionOverride` records for that system via `deleteMany()`, creates an audit log entry, and returns the fresh JSON-seed-only config.

#### Acceptance Criteria -- Data Model

9. **[IMPLEMENTED]** The database stores mapping overrides in the `ImportMappingOverride` model (Prisma) with fields: `id` (auto-increment PK), `systemId` (string, indexed), `sourceColumn` (string), `targetType` (enum: `PATIENT`, `MEASURE`, `DATA`, `IGNORED`), `targetField` (nullable string), `requestType` (nullable string), `qualityMeasure` (nullable string), `isActive` (boolean, default true), `createdBy` (FK to User), `updatedAt` (auto-updated timestamp), `createdAt` (auto timestamp). Table name: `import_mapping_overrides`.
10. **[IMPLEMENTED]** For Sutter action mapping overrides, the database stores the `ImportActionOverride` model with fields: `id` (auto-increment PK), `systemId` (string, indexed), `pattern` (string), `requestType` (string), `qualityMeasure` (string), `measureStatus` (string), `isActive` (boolean, default true), `createdBy` (FK to User), `updatedAt` (auto-updated timestamp), `createdAt` (auto timestamp). Table name: `import_action_overrides`.
11. **[IMPLEMENTED]** The `ImportMappingOverride` model has a unique constraint on `[systemId, sourceColumn]` to prevent duplicate entries for the same column in the same system. The `ImportActionOverride` model has a unique constraint on `[systemId, pattern]`.
12. **[IMPLEMENTED]** The `User` model has two new relations: `mappingOverrides ImportMappingOverride[] @relation("MappingCreator")` and `actionOverrides ImportActionOverride[] @relation("ActionCreator")`.
13. **[IMPLEMENTED]** The `ImportTargetType` enum (`PATIENT`, `MEASURE`, `DATA`, `IGNORED`) is defined at the top of the Prisma schema.
14. **[IMPLEMENTED]** The migration file `20260220183125_add_import_mapping_overrides/migration.sql` creates both tables and the enum type as a purely additive, zero-downtime migration.

#### Edge Cases

- **JSON seed file missing**: If a JSON config file is missing but database overrides exist, `loadMergedConfig()` catches the error, logs a warning, and uses DB overrides only. If both are unavailable, it throws.
- **JSON seed file malformed**: If a JSON config file cannot be parsed, the same fallback applies -- `loadMergedConfig()` catches the parse error and uses DB overrides if available.
- **Database unavailable**: If the database query fails, `loadMergedConfig()` catches the connection error, logs a warning via `logger.warn()`, sets `dbAvailable = false`, and falls back to JSON-only config, maintaining backward compatibility.
- **Migration from existing setup**: On first deployment of this feature, the existing JSON config files continue to work without any database seeding required -- the override layer is additive.

---

### REQ-SCM-08: Import Date as Default Status Date

**User Story:** As an import user, I want imported rows without date data to default to today's date as their `statusDate`, so that due dates can be auto-calculated and follow-up tracking begins immediately.

**Implementation:** Modified `dataTransformer.ts` (`transformHillRow()`) and `sutterDataTransformer.ts` (Sutter row transform).

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN a Hill spreadsheet row has no date column or the Q1 date column is empty/unparseable THEN `statusDate` is set to the current date via `getTodayISOString()` (YYYY-MM-DD format from `new Date()`), and `statusDateSource` is set to `'default'`.
2. **[IMPLEMENTED]** WHEN a Sutter row has no date extracted from Measure Details (via `measureDetailsParser.ts`) THEN `statusDate` is set to `new Date().toISOString().slice(0, 10)` and `statusDateSource` is set to `'default'`.
3. **[IMPLEMENTED]** IF the spreadsheet DOES contain date data (e.g., Sutter's Measure Details parsed dates, or Hill's Q1 date columns) AND the date value is non-empty and parseable THEN the extracted date takes precedence and `statusDateSource` is set to `'file'`.
4. **[IMPLEMENTED]** The `TransformedRow` interface includes a `statusDateSource?: 'file' | 'default'` field that tracks whether the `statusDate` came from the file or was defaulted to import date, making this visible in the preview data.
5. **[IMPLEMENTED]** For Sutter duplicate merging, when multiple rows for the same patient/measure are merged, the latest `statusDate` is picked, and the corresponding `statusDateSource` from that row is preserved.

#### Edge Cases

- **File has date column but value is empty for some rows**: Rows with empty date values use the import date default (`statusDateSource: 'default'`); rows with valid date values use the file's date (`statusDateSource: 'file'`).
- **Invalid date in file**: If a date value in the file cannot be parsed by `parseDate()`, the system falls back to the import date default for that row.
- **Timezone**: Import date is calculated in the server's local timezone (consistent with existing `new Date()` usage in the codebase), not UTC.

---

### REQ-SCM-09: Insurance-Agnostic System Design

**User Story:** As a system administrator, I want the fuzzy mapping, conflict detection, and admin management features to work automatically for any insurance system registered in `systems.json`, so that adding a new insurance system requires only a JSON config file and optional database overrides -- no code changes.

**Implementation:** The `conflictDetector.ts`, `mappingService.ts`, and `MappingManagementPage.tsx` all operate on the generic `MergedSystemConfig` type, not system-specific types.

#### Acceptance Criteria

1. **[IMPLEMENTED]** WHEN a new system config file is added to `backend/src/config/import/` and registered in `systems.json` THEN all fuzzy matching, conflict detection, warning display, admin inline resolution, and mapping management features work for that system without any code modifications.
2. **[IMPLEMENTED]** WHEN the mapping management page loads the system list THEN it dynamically reads from `GET /api/import/systems` (which calls `listSystems()` from `configLoader.ts`) and supports any number of systems.
3. **[IMPLEMENTED]** WHEN fuzzy matching runs for any system THEN it uses the same `detectConflicts()` algorithm and threshold regardless of whether the system uses "wide" format (Hill-style `measureColumns`) or "long" format (Sutter-style `dataColumns` + `actionMapping`).
4. **[IMPLEMENTED]** WHEN a new system with "wide" format is added THEN the conflict detection handles `patientColumns`, `measureColumns`, and `skipColumns` sections via `buildConfigColumnLookup()`.
5. **[IMPLEMENTED]** WHEN a new system with "long" format is added THEN the conflict detection handles `patientColumns`, `dataColumns`, `measureColumns` (from `requestTypeMapping`), and `skipColumns` sections via the same `buildConfigColumnLookup()` function.
6. **[IMPLEMENTED]** WHEN the database `ImportMappingOverride` table contains overrides for a system THEN those overrides are loaded by `systemId` (indexed), ensuring overrides for "hill" do not affect "sutter" and vice versa.

#### Edge Cases

- **Unknown format**: If a new system config has an unrecognized `format` value (not "wide" or "long"), `isSutterConfig()` returns false and the system falls back to wide-format behavior (Hill-style).
- **System removed from registry**: If a system is removed from `systems.json` but database overrides still exist, the overrides are orphaned but harmless -- they will not be loaded since `systemExists()` returns false.

---

### REQ-SCM-10: Mapping CRUD API Endpoints

**User Story:** As the frontend mapping management page, I need RESTful API endpoints to read, create, update, and delete column mapping overrides, so that the admin UI can manage mappings through standard HTTP calls.

**Implementation:** `backend/src/routes/mapping.routes.ts` -- registered at `/api/import/mappings` in `routes/index.ts` (mounted BEFORE `/import` to prevent route swallowing).

#### Acceptance Criteria

1. **[IMPLEMENTED]** `GET /api/import/mappings/:systemId` -- returns the merged mapping configuration (DB overrides + JSON seed fallback) via `loadMergedConfig(systemId)`, with metadata including `isOverride`, `overrideId`, `lastModifiedAt`, and `lastModifiedBy` for each entry. Returns 404 if `systemExists()` returns false.
2. **[IMPLEMENTED]** `PUT /api/import/mappings/:systemId/columns` -- accepts `{ changes: MappingChangeRequest[], expectedUpdatedAt?: string }`, validates each change (non-empty `sourceColumn`, valid `targetType` enum, no duplicate `sourceColumn` in request, quality measure exists if `targetType` is MEASURE), and calls `saveMappingOverrides()`. Returns 409 on optimistic locking conflict. Requires ADMIN role.
3. **[IMPLEMENTED]** `PUT /api/import/mappings/:systemId/actions` -- accepts `{ changes: ActionChangeRequest[] }`, validates each pattern (syntactic regex validation via `new RegExp(pattern)`, ReDoS detection via `REDOS_PATTERN = /\([^)]*[+*][^)]*\)[+*]/` check, quality measure existence check), and calls `saveActionOverrides()`. Requires ADMIN role.
4. **[IMPLEMENTED]** `DELETE /api/import/mappings/:systemId/reset` -- calls `resetToDefaults()`, returns `{ success: true, data, message }` with a count of deleted overrides. Requires ADMIN role.
5. **[IMPLEMENTED]** All mapping write endpoints (PUT, DELETE, POST) require ADMIN role via `requireRole(['ADMIN'])` middleware. Non-admin users receive a 403 Forbidden response.
6. **[IMPLEMENTED]** All endpoints validate request bodies: empty `sourceColumn` returns 400, invalid `targetType` returns 400, duplicate `sourceColumn` in a PUT request returns 400 with "Duplicate source column: {name}", invalid regex pattern returns 400, non-existent quality measure returns 400.
7. **[IMPLEMENTED]** `POST /api/import/mappings/:systemId/resolve` -- accepts `{ resolutions: ResolvedConflict[] }`, validates the array is non-empty and each resolution has a valid action from the set (`ACCEPT_SUGGESTION`, `MAP_TO_MEASURE`, `MAP_TO_PATIENT`, `IGNORE`, `KEEP`, `REMOVE`), and calls `resolveConflicts()`. Returns the updated merged config for immediate use. Requires ADMIN role.
8. **[IMPLEMENTED]** All mapping routes require authentication (`requireAuth`) and patient data access (`requirePatientDataAccess`), applied globally to the router. ADMIN role is required additionally for write endpoints.

#### Edge Cases

- **System not found**: If `systemId` does not exist in the registry, the API returns 404 with message "System not found: {systemId}".
- **Duplicate source column**: If a PUT request includes two entries with the same `sourceColumn`, the API returns 400 with message "Duplicate source column: {name}".

---

## Non-Functional Requirements

### Performance

- **NFR-SCM-P1**: **[IMPLEMENTED]** Fuzzy matching for a file with up to 100 headers against a mapping configuration with up to 200 known columns completes well under 500ms -- each comparison pair involves O(max(|s1|, |s2|)) for Jaro-Winkler and O(tokens1 + tokens2) for Jaccard, totaling ~20,000 lightweight comparisons.
- **NFR-SCM-P2**: **[IMPLEMENTED]** The mapping management page loads all system configurations via a single `GET /api/import/mappings/:systemId` call. System list is loaded via a separate `GET /api/import/systems` call.
- **NFR-SCM-P3**: **[IMPLEMENTED]** Saving mapping changes uses individual `prisma.upsert()` calls per change within `saveMappingOverrides()`.
- **NFR-SCM-P4**: **[IMPLEMENTED]** The fuzzy matching algorithm is computed server-side only (in `backend/src/services/import/fuzzyMatcher.ts`), not in the browser.
- **NFR-SCM-P5**: **[IMPLEMENTED]** The database override queries use the indexed `systemId` field (`@@index([systemId])` in the Prisma schema) to avoid full table scans.

### Security

- **NFR-SCM-S1**: **[IMPLEMENTED]** All mapping write endpoints (PUT, POST, DELETE) require `requireAuth` AND `requireRole(['ADMIN'])`.
- **NFR-SCM-S2**: **[IMPLEMENTED]** All mapping read endpoints (GET) require `requireAuth` and `requirePatientDataAccess`, applied globally to the mapping router.
- **NFR-SCM-S3**: **[IMPLEMENTED]** Mapping changes are recorded in the `AuditLog` table with the admin's `userId`, `action`, `entity`, and `changes` JSON.
- **NFR-SCM-S4**: **[IMPLEMENTED]** Regex patterns submitted by admins for action mappings are validated for syntactic correctness (via `new RegExp(pattern)` in try/catch) and rejected if they contain catastrophic backtracking patterns (via `REDOS_PATTERN = /\([^)]*[+*][^)]*\)[+*]/` regex check). Client-side validation also occurs in `ActionPatternTable.tsx`.
- **NFR-SCM-S5**: **[IMPLEMENTED]** Source column names and pattern strings are handled via Prisma's parameterized queries, preventing SQL injection.

### Reliability

- **NFR-SCM-R1**: **[IMPLEMENTED]** If the database is unavailable when loading mappings, `loadMergedConfig()` gracefully falls back to JSON config files and logs a warning via `logger.warn()`.
- **NFR-SCM-R2**: **[IMPLEMENTED]** If fuzzy matching encounters an unexpected error for a specific header, that header is classified as "unmapped" (NEW with no suggestions) and the remaining headers continue to be processed. This is implemented via a try/catch around the per-header fuzzy matching call in `detectConflicts()`.
- **NFR-SCM-R3**: **[IMPLEMENTED]** Database mapping overrides are stored in separate tables (`import_mapping_overrides`, `import_action_overrides`), not mixed with patient data.
- **NFR-SCM-R4**: **[IMPLEMENTED]** Optimistic locking is implemented in `saveMappingOverrides()` -- the `expectedUpdatedAt` parameter is compared against the current `MAX(updatedAt)` via `findFirst({ orderBy: { updatedAt: 'desc' } })`. On mismatch, a 409 error is thrown.

### Usability

- **NFR-SCM-U1**: **[IMPLEMENTED]** The conflict resolution UI uses color-coded badges: blue (`bg-blue-100 text-blue-800`) for NEW, amber (`bg-amber-100 text-amber-800`) for CHANGED, red (`bg-red-100 text-red-800`) for MISSING/DUPLICATE/AMBIGUOUS. Both `ConflictBanner` and `ConflictResolutionStep` share these badge styles.
- **NFR-SCM-U2**: **[IMPLEMENTED]** Fuzzy match suggestions display the similarity percentage (e.g., "85% match") next to the suggested column name in both the `ConflictResolutionStep` (per-conflict suggestions with color-coded score badges) and `MappingTable` resolve mode.
- **NFR-SCM-U3**: **[IMPLEMENTED]** The mapping management page uses ARIA labels on all interactive elements (dropdowns, buttons). The `ConflictResolutionStep` has an `aria-live="polite"` region for progress announcements and screen-reader-only labels for all resolution dropdowns.
- **NFR-SCM-U4**: **[IMPLEMENTED]** The "Copy Details" button (via `ConflictBanner.onCopyDetails` and `ConflictResolutionStep.handleCopyDetails`) copies a structured text summary to clipboard including system name, total conflicts, and per-conflict details (type, config column, severity, message, suggestions with percentages).
- **NFR-SCM-U5**: **[IMPLEMENTED]** The inline conflict resolution step is visually integrated into the existing import flow within `ImportTabContent` -- rendered in a white rounded shadow container between the SheetSelector and submit button, not a separate modal or page.
- **NFR-SCM-U6**: **[IMPLEMENTED]** The mapping management page replaces the existing `/hill-mapping` route. `App.tsx` redirects `/hill-mapping` to `/admin/import-mapping?system=hill` via `<Navigate to="/admin/import-mapping?system=hill" replace />`. The old `HillMeasureMapping` import has been removed.

### Maintainability

- **NFR-SCM-M1**: **[IMPLEMENTED]** The fuzzy matching algorithm is encapsulated in `backend/src/services/import/fuzzyMatcher.ts` with zero import-specific dependencies, enabling reuse. It exports `normalizeHeader`, `jaroWinklerSimilarity`, `jaccardTokenSimilarity`, `compositeScore`, and `fuzzyMatch` as individual functions.
- **NFR-SCM-M2**: **[IMPLEMENTED]** The mapping persistence layer is encapsulated in `backend/src/services/import/mappingService.ts` providing `loadMergedConfig`, `saveMappingOverrides`, `saveActionOverrides`, `resetToDefaults`, and `resolveConflicts`.
- **NFR-SCM-M3**: **[IMPLEMENTED]** Shared types are extracted into `backend/src/services/import/mappingTypes.ts` to avoid circular dependencies between `conflictDetector.ts` and `mappingService.ts`.
- **NFR-SCM-M4**: **[IMPLEMENTED]** Frontend types mirror backend types in `frontend/src/types/import-mapping.ts`, providing type-safe consumption by React components.

---

## Integration Requirements

### Existing Import Flow Integration

- **[IMPLEMENTED]** The fuzzy matching and conflict detection are integrated into the existing `POST /api/import/preview` endpoint flow in `import.routes.ts`. After `parseFile()` returns and before `mapColumns()`, the route calls `loadMergedConfig(systemId)` then `detectConflicts(headers, mergedConfig, systemId)`. If `isWrongFile`, a 400 error is returned. If conflicts exist, the route short-circuits with `hasConflicts: true`.
- **[IMPLEMENTED]** The `mapColumns()` function in `columnMapper.ts` accepts an optional `mergedConfig?: MergedSystemConfig` parameter. When provided, it builds column lookups from the merged config instead of the raw JSON config. The same extension applies to `mapHillColumns()` and `mapSutterColumns()`.
- **[IMPLEMENTED]** The `configLoader.ts` has a new `loadMergedConfig(systemId)` function that uses a lazy dynamic import of `mappingService.js` to avoid circular dependency. All existing exported functions (`loadSystemConfig`, `listSystems`, `systemExists`, etc.) are preserved unchanged.

### Database Integration

- **[IMPLEMENTED]** Two new Prisma models (`ImportMappingOverride`, `ImportActionOverride`) plus the `ImportTargetType` enum are added via migration `20260220183125_add_import_mapping_overrides`.
- **[IMPLEMENTED]** The existing `AuditLog` model is used for tracking mapping changes -- no schema change needed. Actions `MAPPING_CHANGE` and `MAPPING_RESET` are used.

### Frontend Integration

- **[IMPLEMENTED]** The `/admin/import-mapping` route is added to `App.tsx` within the `ProtectedRoute` wrapper with `allowedRoles={['ADMIN']}`, using the standard admin page layout (Header + main).
- **[IMPLEMENTED]** The `ConflictResolutionStep` component is rendered within `ImportPage.tsx` (`ImportTabContent`) when `conflicts` state is non-null, inserted between the SheetSelector section and the submit button.
- **[IMPLEMENTED]** The existing `/hill-mapping` route redirects to `/admin/import-mapping?system=hill` via `<Navigate>`. The `HillMeasureMapping` component import has been removed from `App.tsx`.
- **[IMPLEMENTED]** The `AdminPage.tsx` remains unchanged -- the mapping management page is a separate route, not a tab within the admin page.

### Route Registration

- **[IMPLEMENTED]** `mapping.routes.ts` is registered in `routes/index.ts` as `router.use('/import/mappings', mappingRoutes)` -- mounted BEFORE the existing `router.use('/import', importRoutes)` to prevent `/import/mappings/:systemId` from being swallowed by the more general `/import` route.

### Socket.IO Integration

- Mapping changes do NOT require real-time broadcast via Socket.IO since they are configuration changes, not patient data changes.

---

## Assumptions and Constraints

### Assumptions

1. Insurance systems change column headers infrequently (estimated 1-2 times per year per system) but when they do, it currently requires a developer to update JSON files and redeploy.
2. The number of columns per insurance system will not exceed 200 (currently Hill has ~70, Sutter has ~10 fixed columns + dynamic action patterns).
3. Admins have sufficient domain knowledge to identify correct column-to-measure mappings when presented with fuzzy match suggestions.
4. The existing `config_quality_measures` and `config_request_types` database tables contain the complete set of valid target measures for mapping.
5. The Prisma ORM and PostgreSQL database are capable of handling the additional tables and queries without performance concerns (the mapping tables will have at most a few hundred rows per system).

### Constraints

1. **No machine learning**: The fuzzy matching uses deterministic string similarity algorithms (Jaro-Winkler + Jaccard + abbreviation expansion), not ML models, keeping the system simple, predictable, and deployable in air-gapped environments.
2. **No automatic mapping without confirmation**: For healthcare data, all fuzzy match suggestions must be confirmed by an ADMIN before being applied -- no auto-accept even at 100% similarity, to prevent data integrity issues. Conflicts always block the import until resolved.
3. **Backward compatibility**: The existing JSON config files continue to work as-is for deployments that do not use database overrides. `loadSystemConfig()` is unchanged; `loadMergedConfig()` is additive.
4. **Single-tenant**: The mapping management assumes a single-tenant deployment (one clinic per installation). Multi-tenant mapping isolation is out of scope.
5. **No breaking API changes**: Existing import API responses maintain backward compatibility. The `hasConflicts` and `conflicts` fields are additive to the preview response, not replacing existing fields.

---

## Out of Scope

- **Machine learning-based matching**: Over-engineered for the expected column change frequency and clinic size.
- **Mapping version history / rollback**: Admin can "reset to defaults" but cannot roll back to a specific previous state. Can be added later.
- **Bulk mapping import/export**: Admin cannot upload a CSV of mappings or export the current mapping to a file. Can be added later.
- **Multi-tenant mapping isolation**: Each deployment is single-tenant; mapping overrides are global within the deployment.
- **Automatic mapping without admin confirmation**: Even at 100% fuzzy match, an admin must confirm. This is a healthcare data safety constraint.
- **Real-time collaborative editing**: Two admins editing mappings simultaneously will get an optimistic locking error; no real-time cursor/presence is provided.
- **Custom similarity thresholds per system**: The threshold is global (80% for headers, 75% for actions). Per-system thresholds can be added later if needed.
- **SIP as a separate system**: SIP currently shares the Sutter config (`sutter.json` is named "Sutter/SIP"). If SIP needs its own config in the future, it can be added as a new entry in `systems.json`.
- **Inline action text conflict resolution during import**: Sutter action text fuzzy matches are not surfaced in the inline `ConflictResolutionStep` -- they appear in the `unmappedActions` section of the preview response and can be managed via the mapping management page.

---

## Decisions Log

| Date | Question | Decision |
|------|----------|----------|
| 2026-02-19 | Q4: Unmapped Patient Columns | Ignore all (Age, Sex, MembID, LOB) |
| 2026-02-19 | Q5: "Has Sticket" Column | Ignore |
| 2026-02-19 | Q6: Duplicate Measures | Import overall only (skip age-specific sub-columns) |
| 2026-02-19 | Q7: Column Mapping UI | Smart fuzzy mapping with admin management (dedicated page + inline resolution) |
| 2026-02-19 | Q8: Date Fields | Use import date as statusDate, auto-calculate dueDate |
| 2026-02-20 | Fuzzy Algorithm | Composite: 60% Jaro-Winkler + 40% Jaccard token overlap |
| 2026-02-20 | Header Threshold | 80% similarity for header fuzzy matching |
| 2026-02-20 | Action Threshold | 75% similarity for Sutter action fuzzy matching |
| 2026-02-20 | Persistence Model | Database overrides + JSON seed fallback (additive layer) |
| 2026-02-20 | Non-Admin Behavior | Block import with read-only conflict details; no skip option |
| 2026-02-20 | Existing /hill-mapping | Deprecate and redirect to new /admin/import-mapping page |
| 2026-02-22 | Abbreviation Expansion | Added 30+ medical abbreviation expansions to normalizeHeader() for improved matching accuracy |
| 2026-02-22 | Shared Types Module | Created mappingTypes.ts to avoid circular dependency between conflictDetector.ts and mappingService.ts |
| 2026-02-22 | Route Ordering | mapping.routes.ts mounted BEFORE import.routes.ts in index.ts to prevent route swallowing |
| 2026-02-22 | Broader Suggestions for NEW | NEW columns get suggestions from a lower-threshold (50%) fuzzy search for user guidance |
| 2026-02-22 | ResolvedConflict Shape | Includes sourceColumn field alongside conflictId for direct use by saveMappingOverrides |

---

## File Inventory

### New Backend Files

| File | Purpose |
|------|---------|
| `backend/src/services/import/fuzzyMatcher.ts` | Jaro-Winkler + Jaccard composite scoring utility with abbreviation expansion |
| `backend/src/services/import/conflictDetector.ts` | 7-step conflict classification pipeline |
| `backend/src/services/import/mappingService.ts` | Database CRUD + JSON seed merge logic |
| `backend/src/services/import/mappingTypes.ts` | Shared TypeScript types for the mapping feature |
| `backend/src/routes/mapping.routes.ts` | RESTful API endpoints (GET, PUT, DELETE, POST) |
| `backend/prisma/migrations/20260220183125_add_import_mapping_overrides/` | Database migration |

### Modified Backend Files

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Added `ImportTargetType` enum, `ImportMappingOverride` model, `ImportActionOverride` model, User relations |
| `backend/src/routes/index.ts` | Added `mapping.routes.ts` mount at `/import/mappings` |
| `backend/src/routes/import.routes.ts` | Added conflict detection in preview route, imports `detectConflicts` and `loadMergedConfig` |
| `backend/src/services/import/configLoader.ts` | Added `loadMergedConfig()` re-export with lazy dynamic import |
| `backend/src/services/import/columnMapper.ts` | Extended `mapColumns()` and `mapHillColumns()` with optional `mergedConfig` parameter, added `findMergedMeasureMapping()` |
| `backend/src/services/import/sutterColumnMapper.ts` | Extended `mapSutterColumns()` with optional `mergedConfig` parameter |
| `backend/src/services/import/actionMapper.ts` | Added `fuzzyMatchAction()` function, modified `matchAction()` to include fuzzy fallback |
| `backend/src/services/import/dataTransformer.ts` | Added `statusDateSource` field, `getTodayISOString()`, import date defaulting in `transformHillRow()` |
| `backend/src/services/import/sutterDataTransformer.ts` | Added import date defaulting, `statusDateSource` field, and source tracking in duplicate merging |

### New Frontend Files

| File | Purpose |
|------|---------|
| `frontend/src/types/import-mapping.ts` | TypeScript types mirroring backend conflict/mapping types |
| `frontend/src/components/import/ConflictBanner.tsx` | Read-only blocking banner for non-admin users |
| `frontend/src/components/import/ConflictResolutionStep.tsx` | Interactive admin conflict resolution UI |
| `frontend/src/components/import/MappingTable.tsx` | Reusable column mapping table (view/edit/resolve modes) |
| `frontend/src/components/import/ActionPatternTable.tsx` | Sutter action regex pattern table with skip actions |
| `frontend/src/pages/MappingManagementPage.tsx` | Admin mapping management page at `/admin/import-mapping` |

### Modified Frontend Files

| File | Changes |
|------|---------|
| `frontend/src/App.tsx` | Added `/admin/import-mapping` route, `/hill-mapping` redirect, removed `HillMeasureMapping` import |
| `frontend/src/pages/ImportPage.tsx` | Added conflict state, `ConflictResolutionStep` rendering, `handleConflictsResolved`, `handleConflictsCancel`, `buildConflictSummaryText` |
| `frontend/src/pages/AdminPage.tsx` | No functional changes to the admin page itself (mapping management is a separate route) |

### New Test Files

| File | Framework | Tests |
|------|-----------|-------|
| `backend/src/services/import/__tests__/fuzzyMatcher.test.ts` | Jest | Fuzzy matching algorithm tests |
| `backend/src/services/import/__tests__/conflictDetector.test.ts` | Jest | All 16 conflict use cases |
| `backend/src/services/import/__tests__/mappingService.test.ts` | Jest | CRUD operations, merge logic, audit logging |
| `backend/src/routes/__tests__/mapping.routes.test.ts` | Jest + supertest | API endpoint auth, validation, CRUD |
| `frontend/src/components/import/ConflictBanner.test.tsx` | Vitest | Banner rendering, badges, buttons |
| `frontend/src/components/import/ConflictResolutionStep.test.tsx` | Vitest | Admin/non-admin views, save/cancel, progress |
| `frontend/src/components/import/MappingTable.test.tsx` | Vitest | View/edit/resolve modes, suggestions |
| `frontend/src/components/import/ActionPatternTable.test.tsx` | Vitest | Pattern editing, regex validation, skip actions |
| `frontend/src/pages/MappingManagementPage.test.tsx` | Vitest | Page loading, system switching, CRUD |
| `frontend/e2e/smart-column-mapping.spec.ts` | Playwright | Admin mapping management flow |
| `frontend/e2e/import-conflict-resolution.spec.ts` | Playwright | Import conflict resolution flow |
| `frontend/e2e/pages/mapping-page.ts` | Playwright | Page Object Model for mapping page |
| `frontend/cypress/e2e/import-conflict-admin.cy.ts` | Cypress | Admin conflict resolution dropdowns |
| `frontend/cypress/e2e/import-conflict-nonadmin.cy.ts` | Cypress | Non-admin blocking behavior |
| `frontend/cypress/e2e/mapping-management.cy.ts` | Cypress | Mapping management page CRUD |

---

## Related Documents

- `.claude/IMPORT_REQUIREMENTS.md` -- Master import requirements and decisions
- `backend/src/config/import/hill.json` -- Hill Healthcare column mapping seed
- `backend/src/config/import/sutter.json` -- Sutter/SIP column mapping seed
- `backend/src/config/import/systems.json` -- Insurance system registry
- `backend/src/services/import/columnMapper.ts` -- Column mapping logic (extended)
- `backend/src/services/import/sutterColumnMapper.ts` -- Sutter-specific column mapping (extended)
- `backend/src/services/import/actionMapper.ts` -- Sutter action regex matching (extended with fuzzy fallback)
- `backend/src/services/import/configLoader.ts` -- System config loading (extended with loadMergedConfig)
- `backend/src/services/import/fuzzyMatcher.ts` -- Fuzzy matching utility (new)
- `backend/src/services/import/conflictDetector.ts` -- Conflict detection engine (new)
- `backend/src/services/import/mappingService.ts` -- Mapping CRUD service (new)
- `backend/src/services/import/mappingTypes.ts` -- Shared types (new)
- `backend/src/routes/mapping.routes.ts` -- Mapping API endpoints (new)
- `frontend/src/pages/MappingManagementPage.tsx` -- Admin mapping management page (new, replaces HillMeasureMapping)
- `frontend/src/types/import-mapping.ts` -- Frontend types (new)

---

## Last Updated

February 22, 2026
