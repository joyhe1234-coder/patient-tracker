# Smart Column Mapping — Requirements

## Summary

Replace the current fixed/exact-match column mapping with a smart fuzzy-matching system that detects header changes, warns users, and allows ADMIN users to manage mappings through the UI — eliminating developer involvement in the mapping process.

## Current Behavior

- Column mappings are hardcoded in JSON config files (`hill.json`, `sutter.json`)
- Headers are matched by **exact string** (Hill) or **regex patterns** (Sutter actions)
- If a header changes, the column is **silently skipped** — no warning, data lost
- If a required column is missing, import fails with a generic validation error
- Only a developer can update mappings by editing JSON files

## New Behavior

- System uses **fuzzy matching** to detect renamed/changed headers
- **Warnings** shown when columns are added, removed, or changed
- **ADMIN users** can manage mappings through a dedicated UI page and inline during import
- **Non-admin users** see a warning banner directing them to contact an administrator
- Mapping changes are persisted (database or config) without developer involvement
- Applies to **both** Hill (header-based) and Sutter (action pattern-based) systems

---

## Requirements

### REQ-SCM-01: Fuzzy Header Matching

**As an** import user,
**I want** the system to fuzzy-match renamed column headers to known mappings,
**So that** minor header changes don't silently lose data.

**Acceptance Criteria:**
1. When a spreadsheet header doesn't exactly match any known mapping, the system calculates similarity scores against all known column names
2. If a fuzzy match scores above a configurable threshold (e.g., 80% similarity), it is flagged as a "probable match"
3. Probable matches are presented to the user as suggestions (e.g., `"Blood Pressure Control"` → likely matches `"BP Control"`)
4. Fuzzy matching uses a standard algorithm (e.g., Levenshtein distance, Jaro-Winkler, or token-based matching)
5. Multiple unrecognized headers can each have their own fuzzy suggestion
6. If no fuzzy match is found above threshold, the column is flagged as "new/unknown"

### REQ-SCM-02: Column Change Detection & Warnings

**As an** import user,
**I want** to see clear warnings when column headers differ from the saved mapping,
**So that** I know something changed before proceeding.

**Acceptance Criteria:**
1. On import preview, the system compares uploaded file headers against the saved mapping
2. Three categories of changes are detected:
   - **New columns**: headers in the file that don't match any known mapping
   - **Missing columns**: mapped columns that are not found in the file
   - **Changed columns**: headers that fuzzy-match a known column but aren't exact
3. A warning banner summarizes the changes (e.g., "2 new columns, 1 missing column, 1 renamed column")
4. Each change is listed with its category and suggested action
5. Import can still proceed if the user (admin) resolves or acknowledges the conflicts
6. Warning is shown BEFORE the preview is generated (between file upload and preview)

### REQ-SCM-03: Admin Mapping Resolution (Inline)

**As an** ADMIN user,
**I want** to resolve column mapping conflicts during import,
**So that** I can fix issues immediately without leaving the import flow.

**Acceptance Criteria:**
1. When conflicts are detected, ADMIN sees an interactive resolution step in the import flow
2. For **new columns**, admin can:
   - Map to an existing quality measure (dropdown of available measures)
   - Mark as "ignored" (skip this column)
3. For **missing columns**, admin can:
   - Keep the mapping (column may return in future files)
   - Remove the mapping (move to ignored)
4. For **changed/renamed columns**, admin can:
   - Accept the fuzzy-match suggestion (update mapping to new header name)
   - Map to a different measure
   - Mark as ignored
5. Resolution changes are saved to the persistent mapping configuration
6. After resolving all conflicts, import proceeds to preview as normal

### REQ-SCM-04: Admin Mapping Management Page

**As an** ADMIN user,
**I want** a dedicated page to view and manage all column mappings,
**So that** I can proactively configure mappings without starting an import.

**Acceptance Criteria:**
1. Accessible at `/admin/import-mapping` (or similar), visible only to ADMIN role
2. Shows all configured import systems (Hill, Sutter, etc.) with a system selector
3. For each system, displays:
   - **Patient columns**: source header → target field mapping
   - **Measure columns**: source header → requestType + qualityMeasure mapping
   - **Ignored columns**: list of explicitly skipped columns
4. Admin can:
   - Edit existing mappings (change which measure a column maps to)
   - Add new column mappings
   - Move columns between mapped and ignored
   - Remove mappings entirely
5. Changes are validated (target measure must exist in the system)
6. Changes are persisted and take effect on the next import
7. Shows last-modified timestamp and which admin made the change

### REQ-SCM-05: Non-Admin Warning

**As a** STAFF or PHYSICIAN user,
**I want** to see a clear warning when column mapping conflicts exist,
**So that** I know to contact an administrator before proceeding.

**Acceptance Criteria:**
1. When conflicts are detected for non-admin users, import is **blocked**
2. A warning banner shows: "Column mapping conflicts detected. Please contact your administrator to resolve."
3. The specific conflicts are listed (read-only) so the user can relay details to the admin
4. The user cannot proceed past the conflict step — no "skip" or "ignore" option
5. Once an admin resolves the conflicts (via mapping page or their own import), subsequent imports by any user proceed normally

### REQ-SCM-06: Sutter Action Pattern Fuzzy Matching

**As an** import user,
**I want** Sutter action text to be fuzzy-matched against known patterns,
**So that** minor wording changes in Sutter actions don't silently default to "Not Addressed."

**Acceptance Criteria:**
1. When a Sutter action text doesn't match any regex pattern in `actionMapping`, the system attempts fuzzy matching against known action descriptions
2. Fuzzy matching considers:
   - Key medical terms (e.g., "colonoscopy", "HbA1c", "mammogram")
   - Structural similarity (ignoring year numbers, date ranges)
   - Token overlap (shared words between action text and known patterns)
3. Probable matches are flagged for admin review (same resolution flow as REQ-SCM-03)
4. Unmatched actions that don't fuzzy-match anything are flagged as "new/unknown actions"
5. Admin can map new action patterns to existing quality measures or mark as skipped
6. New action mappings are persisted to the system configuration

### REQ-SCM-07: Mapping Persistence

**As a** system administrator,
**I want** mapping changes to be persisted reliably,
**So that** changes survive server restarts and are consistent across users.

**Acceptance Criteria:**
1. Mapping configuration is stored in the database (not just JSON files)
2. JSON config files serve as the **default/seed** — database overrides take precedence
3. If no database overrides exist, the system falls back to the JSON config file
4. API endpoints for CRUD operations on mappings (admin-only, authenticated)
5. Audit log entries created when mappings are changed (who, when, what changed)
6. Mapping changes take effect immediately (no server restart required)

### REQ-SCM-08: Import Date as Default Status Date

**As an** import user,
**I want** imported rows to have today's date as their statusDate,
**So that** due dates can be auto-calculated and follow-up tracking begins immediately.

**Acceptance Criteria:**
1. When a spreadsheet has no date column (e.g., Hill Compliant/Non Compliant only), statusDate is set to the date of import
2. dueDate is auto-calculated from statusDate using existing DueDayRule logic
3. If the spreadsheet DOES have date data (e.g., Sutter's Measure Details), the extracted date takes precedence over import date
4. The import preview shows the statusDate that will be assigned
5. Time interval (days) is calculated as dueDate - statusDate

---

## Open Questions for Design Phase

1. **Fuzzy matching algorithm**: Which algorithm to use? Levenshtein distance is simple but may miss token-level matches. Jaro-Winkler is good for short strings. Token-based (TF-IDF or Jaccard) may be better for long measure names.
2. **Similarity threshold**: What percentage should trigger a "probable match"? Too low = false positives, too high = misses.
3. **Mapping storage schema**: Separate table for mapping overrides, or store full config in a JSON column?
4. **Migration path**: How to transition from JSON-only to database-backed mappings without breaking existing imports?
5. **Concurrency**: What if two admins edit mappings simultaneously?

---

## Affected Components

### Backend
- `columnMapper.ts` — add fuzzy matching logic
- `sutterColumnMapper.ts` — add fuzzy action matching
- `actionMapper.ts` — add fuzzy action pattern matching
- `configLoader.ts` — add database override layer
- New: `mappingService.ts` — CRUD for mapping overrides
- New: `fuzzyMatcher.ts` — fuzzy string matching utility
- New: mapping API routes (admin-only)
- Prisma schema — new `ImportMapping` / `MappingOverride` model

### Frontend
- New: `ImportMappingPage.tsx` — admin mapping management page
- `ImportPage.tsx` — add conflict detection step
- New: `MappingConflictResolver.tsx` — inline conflict resolution component
- New: `MappingWarningBanner.tsx` — non-admin warning component

---

## Out of Scope

- Automatic mapping without any user confirmation (too risky for medical data)
- Machine learning-based matching (over-engineered for this use case)
- Version history / rollback of mapping changes (can be added later)
- Bulk mapping import/export (can be added later)

---

## Decisions Log

| Date | Question | Decision |
|------|----------|----------|
| 2026-02-19 | Q4: Unmapped Patient Columns | Ignore all (Age, Sex, MembID, LOB) |
| 2026-02-19 | Q5: "Has Sticket" Column | Ignore |
| 2026-02-19 | Q6: Duplicate Measures | Import overall only (skip age-specific sub-columns) |
| 2026-02-19 | Q7: Column Mapping UI | Smart fuzzy mapping with admin management (dedicated page + inline resolution) |
| 2026-02-19 | Q8: Date Fields | Use import date as statusDate, auto-calculate dueDate |

---

## Last Updated

February 19, 2026
