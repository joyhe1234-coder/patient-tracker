# Smart Column Mapping - Comprehensive Test Cases

> **Feature:** Smart Column Mapping with Fuzzy Matching & Conflict Resolution
> **Date:** 2026-02-22
> **Test Spreadsheets:** Located in `test-data/smart-column-mapping/`

---

## Table of Contents

1. [Fuzzy Matching Engine](#1-fuzzy-matching-engine)
2. [Conflict Detection Pipeline](#2-conflict-detection-pipeline)
3. [Conflict Resolution (Admin)](#3-conflict-resolution-admin)
4. [Conflict Resolution (Non-Admin)](#4-conflict-resolution-non-admin)
5. [Mapping Management CRUD](#5-mapping-management-crud)
6. [Import Flow Integration](#6-import-flow-integration)
7. [Action Pattern Matching (Sutter)](#7-action-pattern-matching-sutter)
8. [Edge Cases & Boundary Conditions](#8-edge-cases--boundary-conditions)
9. [Security & Validation](#9-security--validation)
10. [Performance & Reliability](#10-performance--reliability)
11. [Test Spreadsheet Inventory](#11-test-spreadsheet-inventory)

---

## 1. Fuzzy Matching Engine

### TC-FM-1: Exact match (normalized)
- **Input:** Source `"Member Name"`, Candidate `"member name"`
- **Expected:** Score = 1.0 (after normalization)
- **Spreadsheet:** `test-01-exact-match.xlsx`

### TC-FM-2: Case insensitivity
- **Input:** Source `"MEMBER DOB"`, Candidate `"Member DOB"`
- **Expected:** Score = 1.0 (both normalize to `"member date of birth"` after abbreviation expansion of `dob`)

### TC-FM-3: Abbreviation expansion
- **Input:** Source `"BP Screening Q1"`, Candidate `"Blood Pressure Screening Q1"`
- **Expected:** Score = 1.0 (after `bp` -> `blood pressure` and Q1 suffix stripping)

### TC-FM-4: Q1/Q2 suffix stripping
- **Input:** Source `"Diabetes Control Q1"`, Candidate `"Diabetes Control Q2"`
- **Expected:** Score = 1.0 (both Q1 and Q2 suffixes stripped)

### TC-FM-5: E suffix stripping
- **Input:** Source `"Colorectal Screening E"`, Candidate `"Colorectal Screening"`
- **Expected:** Score = 1.0

### TC-FM-6: Similar but different headers (above threshold)
- **Input:** Source `"Member Full Name"`, Candidate `"Member Name"`
- **Expected:** Score >= 0.80 (CHANGED conflict)

### TC-FM-7: Different headers (below threshold)
- **Input:** Source `"Insurance ID"`, Candidate `"Member Name"`
- **Expected:** Score < 0.80 (NEW conflict / no match)

### TC-FM-8: Completely unrelated strings
- **Input:** Source `"XYZABC123"`, Candidate `"Member Name"`
- **Expected:** Score near 0.0

### TC-FM-9: Empty string handling
- **Input:** Source `""`, Candidate `"Member Name"`
- **Expected:** Score = 0.0 (Jaro returns 0.0 for empty)

### TC-FM-10: Both empty strings
- **Input:** Source `""`, Candidate `""`
- **Expected:** Jaro = 0.0, Jaccard = 1.0 (both empty sets)

### TC-FM-11: Top 3 results cap
- **Input:** Source vs 5 candidates all above threshold
- **Expected:** Only top 3 returned, sorted descending by score

### TC-FM-12: Threshold boundary (score exactly 0.80)
- **Input:** Strings that produce exactly 0.80 composite score
- **Expected:** Included in results (>= threshold)

### TC-FM-13: All 32 abbreviations expand correctly
- **Input:** Each abbreviation in ABBREVIATIONS map
- **Expected:** Each expands to its full form
- **Abbreviations:** bp, hgba1c, hba1c, eval, dx, rx, tx, hx, pt, dob, addr, tel, ph, imm, immun, vax, vacc, scr, ctrl, mgmt, pcp, awv, gc, hep, dtap, ipv, mmr, hib, vzv, pcv, rota, tdap, combo, ppc, phq

### TC-FM-14: Trailing punctuation on abbreviation tokens
- **Input:** Source `"bp:"`, abbreviation map entry for `bp`
- **Expected:** Expands `bp` even with trailing `:`, suffix preserved

### TC-FM-15: Jaro-Winkler prefix boost
- **Input:** Two strings with same 4-char prefix vs no common prefix
- **Expected:** Prefix version has higher Jaro-Winkler score

---

## 2. Conflict Detection Pipeline

### TC-CD-1: All headers match exactly (no conflicts)
- **Input:** File headers = exact copy of config columns
- **Expected:** Empty conflict list, `hasBlockingConflicts = false`
- **Spreadsheet:** `test-02-no-conflicts.xlsx`

### TC-CD-2: Single NEW column (unrecognized header)
- **Input:** File has `"Insurance Plan Type"` not in config
- **Expected:** 1 NEW conflict, severity = WARNING, broader suggestions at 0.50 threshold
- **Spreadsheet:** `test-03-new-column.xlsx`

### TC-CD-3: Multiple NEW columns
- **Input:** File has 3 unrecognized headers
- **Expected:** 3 NEW conflicts, all severity = WARNING

### TC-CD-4: MISSING required patient column (memberName)
- **Input:** File missing `"Member Name"` column
- **Expected:** 1 MISSING conflict, severity = BLOCKING
- **Spreadsheet:** `test-04-missing-required.xlsx`

### TC-CD-5: MISSING required patient column (memberDob)
- **Input:** File missing `"Date of Birth"` column
- **Expected:** 1 MISSING conflict, severity = BLOCKING

### TC-CD-6: MISSING optional measure column
- **Input:** File missing one measure column
- **Expected:** 1 MISSING conflict, severity = WARNING (not BLOCKING)

### TC-CD-7: MISSING skip column
- **Input:** File missing a skip column from config
- **Expected:** 1 MISSING conflict, severity = WARNING

### TC-CD-8: CHANGED header (renamed column, >= 0.80 match)
- **Input:** `"Patient Name"` instead of `"Member Name"`
- **Expected:** 1 CHANGED conflict with suggestion pointing to `"Member Name"`
- **Spreadsheet:** `test-05-changed-column.xlsx`

### TC-CD-9: CHANGED on required patient field -> BLOCKING
- **Input:** `"Patient Full Name"` fuzzy matches `"Member Name"` (memberName target)
- **Expected:** CHANGED conflict, severity = BLOCKING

### TC-CD-10: CHANGED on skip column -> INFO severity
- **Input:** Fuzzy match to a skip column
- **Expected:** CHANGED conflict, severity = INFO

### TC-CD-11: CHANGED on measure column -> WARNING severity
- **Input:** Fuzzy match to a measure column
- **Expected:** CHANGED conflict, severity = WARNING

### TC-CD-12: DUPLICATE headers in file
- **Input:** File has `"Member Name"` appearing twice
- **Expected:** DUPLICATE conflicts for both, severity = BLOCKING, early return
- **Spreadsheet:** `test-06-duplicate-headers.xlsx`

### TC-CD-13: DUPLICATE via normalization (case/space variants)
- **Input:** File has `"Member Name"` and `"member  name"`
- **Expected:** Both flagged as DUPLICATE (same after normalization)

### TC-CD-14: DUPLICATE fuzzy target (two headers match same config column)
- **Input:** `"Patient Name"` and `"Member Full Name"` both fuzzy match `"Member Name"`
- **Expected:** Both flagged as DUPLICATE, severity = BLOCKING
- **Spreadsheet:** `test-07-duplicate-fuzzy.xlsx`

### TC-CD-15: AMBIGUOUS match (2+ close scores within 0.05)
- **Input:** Header with top score 0.85 and second score 0.82 (within 0.05)
- **Expected:** AMBIGUOUS conflict, severity = BLOCKING
- **Spreadsheet:** `test-08-ambiguous.xlsx`

### TC-CD-16: NOT AMBIGUOUS (scores differ by more than 0.05)
- **Input:** Header with top score 0.90 and second score 0.82 (diff = 0.08 > 0.05)
- **Expected:** CHANGED conflict (not AMBIGUOUS)

### TC-CD-17: Wrong file detection (< 10% match)
- **Input:** File with completely unrelated headers (0 of 20 match)
- **Expected:** `isWrongFile = true`, `wrongFileMessage` present
- **Spreadsheet:** `test-09-wrong-file.xlsx`

### TC-CD-18: Borderline wrong file (exactly 10% match)
- **Input:** 2 of 20 config columns matched (10% exactly)
- **Expected:** `isWrongFile = false` (threshold is `<` not `<=`)

### TC-CD-19: Mixed conflict types in one file
- **Input:** File with 1 NEW, 1 MISSING, 1 CHANGED, 1 exact match
- **Expected:** 3 conflicts correctly classified, summary counts accurate
- **Spreadsheet:** `test-10-mixed-conflicts.xlsx`

### TC-CD-20: Per-header fail-open (fuzzy error on one header)
- **Input:** Inject fuzzyMatchFn that throws on specific header
- **Expected:** Errored header classified as NEW, other headers processed normally

### TC-CD-21: Inactive config columns excluded
- **Input:** Merged config with `isActive = false` on some columns
- **Expected:** Inactive columns NOT in config lookup, not counted as MISSING

### TC-CD-22: NEW column broader suggestions (0.50 threshold)
- **Input:** Unrecognized header that has a 0.55-score match to a config column
- **Expected:** NEW conflict with suggestion populated (from broader 0.50 search)

---

## 3. Conflict Resolution (Admin)

### TC-CR-1: Resolve all conflicts enables Save
- **Input:** 3 conflicts, resolve all 3
- **Expected:** Save button becomes enabled, progress bar shows 3/3

### TC-CR-2: Partially resolved disables Save
- **Input:** 3 conflicts, only 2 resolved
- **Expected:** Save button disabled, progress bar shows 2/3

### TC-CR-3: ACCEPT_SUGGESTION resolution
- **Input:** CHANGED conflict with suggestion, admin clicks "Accept Suggestion"
- **Expected:** Resolution action = ACCEPT_SUGGESTION, suggestion data auto-populated

### TC-CR-4: MAP_TO_MEASURE resolution
- **Input:** NEW conflict, admin maps to a specific measure
- **Expected:** Resolution includes requestType + qualityMeasure

### TC-CR-5: MAP_TO_PATIENT resolution
- **Input:** NEW conflict, admin maps to patient field (e.g., memberPhone)
- **Expected:** Resolution includes targetPatientField

### TC-CR-6: IGNORE resolution
- **Input:** NEW conflict, admin chooses "Ignore this column"
- **Expected:** Resolution action = IGNORE

### TC-CR-7: KEEP resolution for MISSING column
- **Input:** MISSING conflict, admin chooses "Keep mapping"
- **Expected:** Resolution action = KEEP (no-op, mapping retained)

### TC-CR-8: REMOVE resolution for MISSING column
- **Input:** MISSING conflict, admin chooses "Remove mapping"
- **Expected:** Resolution action = REMOVE (column deactivated)

### TC-CR-9: Save triggers API call and re-preview
- **Input:** All conflicts resolved, admin clicks Save
- **Expected:** POST to `/import/mappings/{systemId}/resolve`, then auto-resubmits preview

### TC-CR-10: Save error displays message with retry
- **Input:** API returns 500
- **Expected:** Error message shown, Save button re-enabled for retry

### TC-CR-11: Cancel resets file and conflicts
- **Input:** Admin clicks Cancel during conflict resolution
- **Expected:** File cleared, sheet selection cleared, conflicts cleared

### TC-CR-12: Focus management on mount
- **Input:** ConflictResolutionStep renders with 3 unresolved conflicts
- **Expected:** First unresolved conflict row receives focus (after 100ms)

### TC-CR-13: Score badge colors
- **Input:** Suggestions with scores 0.95, 0.70, 0.45
- **Expected:** Green (>= 0.80), Amber (>= 0.60), Gray (< 0.60)

### TC-CR-14: Count chips by conflict type
- **Input:** 2 NEW, 1 CHANGED, 1 MISSING
- **Expected:** Blue chip "2 NEW", Amber chip "1 CHANGED", Red chip "1 MISSING"

### TC-CR-15: aria-live progress announcement
- **Input:** Resolve one conflict
- **Expected:** Screen reader announces updated progress (e.g., "1 of 3 conflicts resolved")

---

## 4. Conflict Resolution (Non-Admin)

### TC-NA-1: Non-admin sees read-only ConflictBanner
- **Input:** Non-admin user with conflicts detected
- **Expected:** ConflictBanner component shown (not interactive resolution form)

### TC-NA-2: ConflictBanner blocks import
- **Input:** Non-admin with blocking conflicts
- **Expected:** No submit/import button available

### TC-NA-3: "Copy Details" clipboard button
- **Input:** Non-admin clicks "Copy Details"
- **Expected:** Structured text summary copied to clipboard (system name, file name, conflicts)

### TC-NA-4: ConflictBanner scrollable with many conflicts
- **Input:** 20+ conflicts for non-admin
- **Expected:** Conflict list scrollable (max-h-60 with overflow)

### TC-NA-5: ConflictBanner returns null for empty conflicts
- **Input:** Empty or null conflicts array
- **Expected:** Component returns null (nothing rendered)

### TC-NA-6: role="alert" on ConflictBanner
- **Input:** Conflicts detected for non-admin
- **Expected:** `role="alert"` attribute on banner for screen reader

---

## 5. Mapping Management CRUD

### TC-MM-1: Load merged config (JSON seed + DB overrides)
- **Input:** GET `/import/mappings/hill_physicians`
- **Expected:** Merged config with DB overrides winning over JSON seed

### TC-MM-2: Save column mapping override
- **Input:** PUT column with sourceColumn="New Column", targetType=MEASURE
- **Expected:** `ImportMappingOverride` created in DB, audit log entry

### TC-MM-3: Optimistic locking - concurrent edit rejected
- **Input:** Two saves with same expectedUpdatedAt, second arrives after first
- **Expected:** Second save returns 409 Conflict

### TC-MM-4: Reset to defaults
- **Input:** DELETE `/:systemId/reset`
- **Expected:** All overrides for system deleted, returns JSON-only config

### TC-MM-5: Save action pattern override
- **Input:** PUT action with valid regex pattern
- **Expected:** `ImportActionOverride` created, audit log entry

### TC-MM-6: Add new column mapping in UI
- **Input:** Admin clicks "Add Mapping", fills in new column details
- **Expected:** New row appears in MappingTable, save persists to DB

### TC-MM-7: Edit existing mapping
- **Input:** Admin changes targetType of existing column from MEASURE to IGNORED
- **Expected:** Override saved, override badge appears

### TC-MM-8: "Using Default Configuration" banner
- **Input:** System with no DB overrides
- **Expected:** Banner displayed indicating default config in use

### TC-MM-9: System selector changes load correct config
- **Input:** Switch from "Hill Physicians" to "Sutter Health"
- **Expected:** Config reloads for selected system

### TC-MM-10: Last modified timestamp and user displayed
- **Input:** Config with overrides
- **Expected:** "Last modified by [user] at [timestamp]" shown

### TC-MM-11: Non-admin redirected from management page
- **Input:** Non-admin navigates to `/admin/import-mapping`
- **Expected:** Redirected to `/`

### TC-MM-12: Quality measure dropdown cascading
- **Input:** Change request type in mapping table
- **Expected:** Quality measure options update for that request type; auto-fills if only one option

---

## 6. Import Flow Integration

### TC-IF-1: No conflicts - proceed to preview normally
- **Input:** Upload file with all headers matching
- **Expected:** Preview step shown without conflict resolution
- **Spreadsheet:** `test-02-no-conflicts.xlsx`

### TC-IF-2: Conflicts detected - blocks preview
- **Input:** Upload file with unrecognized headers
- **Expected:** ConflictResolutionStep shown, preview blocked

### TC-IF-3: After resolution - auto-resubmit preview
- **Input:** Admin resolves all conflicts, clicks Save
- **Expected:** Preview automatically re-submitted with updated mappings

### TC-IF-4: File type validation (.csv, .xlsx, .xls)
- **Input:** Upload .csv, .xlsx, .xls files
- **Expected:** All accepted; .txt rejected

### TC-IF-5: Replace mode warning with conflicts
- **Input:** Replace mode + conflicts detected
- **Expected:** Both conflict resolution and replace warning handled

### TC-IF-6: Sheet selection required before conflict check
- **Input:** Multi-sheet Excel file
- **Expected:** Sheet must be selected before preview/conflict detection triggers

---

## 7. Action Pattern Matching (Sutter)

### TC-AP-1: Regex first-match-wins
- **Input:** Action text matching two patterns, first pattern listed first
- **Expected:** First pattern's mapping used

### TC-AP-2: Fuzzy fallback when no regex match
- **Input:** Action text not matching any regex but similar to a pattern (>= 0.75)
- **Expected:** Fuzzy match returned with `matchedBy: 'fuzzy'`

### TC-AP-3: Year-pattern stripping for fuzzy matching
- **Input:** `"AWV 2025 Annual Visit"` vs pattern `"AWV 2024 Annual Visit"`
- **Expected:** Years stripped before scoring, high similarity

### TC-AP-4: Malformed regex skipped gracefully
- **Input:** Config has invalid regex pattern `"[invalid"`
- **Expected:** Pattern skipped with warning, other patterns still work

### TC-AP-5: Empty action text returns null
- **Input:** `""` or `"   "`
- **Expected:** `null` returned (no match)

### TC-AP-6: Input truncation at 500 characters
- **Input:** 600-character action text
- **Expected:** Truncated to 500 chars for fuzzy matching

### TC-AP-7: Client-side regex validation in ActionPatternTable
- **Input:** Type invalid regex in pattern field
- **Expected:** Inline error message, `aria-invalid="true"`

### TC-AP-8: ReDoS protection
- **Input:** Pattern with nested quantifiers like `(a+)+`
- **Expected:** Rejected by API with error message

### TC-AP-9: Skip action patterns
- **Input:** Action text matching a skip action entry
- **Expected:** Row silently skipped (no output row)

### TC-AP-10: Unmapped actions aggregated with counts
- **Input:** 5 rows with same unmapped action text, 2 rows with another
- **Expected:** `unmappedActions` has 2 entries sorted by count (5, 2)

---

## 8. Edge Cases & Boundary Conditions

### TC-EC-1: File with only headers, no data rows
- **Input:** Excel file with header row only
- **Expected:** Conflict detection runs on headers; no data transform errors
- **Spreadsheet:** `test-11-headers-only.xlsx`

### TC-EC-2: Single column file
- **Input:** File with only 1 column header
- **Expected:** Most config columns flagged as MISSING; single header classified

### TC-EC-3: 200+ column file
- **Input:** File with 250 headers
- **Expected:** All 250 processed; performance within acceptable range

### TC-EC-4: Unicode/special characters in headers
- **Input:** `"Memb\u00e9r N\u00e4me"`, `"DOB\u2014Date"`
- **Expected:** Handled without crash; low fuzzy score to ASCII equivalent
- **Spreadsheet:** `test-12-unicode-headers.xlsx`

### TC-EC-5: Headers with leading/trailing whitespace
- **Input:** `"  Member Name  "`, `"\tDOB\t"`
- **Expected:** Trimmed before matching; exact match after normalization

### TC-EC-6: Header = config column but different casing only
- **Input:** `"MEMBER NAME"` vs config `"Member Name"`
- **Expected:** Exact match after normalization (no conflict)

### TC-EC-7: Header with multiple consecutive spaces
- **Input:** `"Member    Name"` vs config `"Member Name"`
- **Expected:** Exact match after whitespace collapse

### TC-EC-8: Very long header name (200+ chars)
- **Input:** 250-character column header
- **Expected:** Processed correctly; UI truncates display at 100 chars

### TC-EC-9: Null/undefined in headers array
- **Input:** Headers array containing null or undefined values
- **Expected:** Graceful handling (skip or error, no crash)

### TC-EC-10: Config with 0 columns (empty system)
- **Input:** System with empty config
- **Expected:** All file headers classified as NEW

### TC-EC-11: DB unavailable during loadMergedConfig
- **Input:** Database connection failure
- **Expected:** Falls back to JSON-only config with warning

### TC-EC-12: Abbreviation at end of token with numbers
- **Input:** `"bp2"` -> should expand `bp` to `blood pressure` keeping `2`
- **Expected:** `"blood pressure2"`

### TC-EC-13: Multiple abbreviations in one header
- **Input:** `"pt dob addr"`
- **Expected:** `"patient date of birth address"`

### TC-EC-14: Sutter duplicate merging with same patient+measure
- **Input:** Two rows: same memberName, DOB, requestType, qualityMeasure
- **Expected:** Merged: action texts joined with `"; "`, latest statusDate kept

### TC-EC-15: Compliance value variants
- **Input:** `"compliant"`, `"c"`, `"yes"`, `"non compliant"`, `"non-compliant"`, `"nc"`, `"no"`
- **Expected:** All correctly mapped to compliant/non-compliant status

### TC-EC-16: statusDateSource tracking
- **Input:** Row with valid date in Q1 vs row with empty Q1
- **Expected:** `statusDateSource: 'file'` vs `statusDateSource: 'default'`

---

## 9. Security & Validation

### TC-SV-1: Non-authenticated user denied all mapping routes
- **Input:** Request without auth token
- **Expected:** 401 Unauthorized

### TC-SV-2: Non-admin denied write operations
- **Input:** PUT/POST/DELETE with non-admin user
- **Expected:** 403 Forbidden

### TC-SV-3: Admin allowed read + write operations
- **Input:** GET/PUT/POST/DELETE with admin user
- **Expected:** All succeed (200/201)

### TC-SV-4: Blank sourceColumn rejected
- **Input:** PUT column with sourceColumn = ""
- **Expected:** 400 Bad Request

### TC-SV-5: Invalid targetType rejected
- **Input:** PUT column with targetType = "INVALID"
- **Expected:** 400 Bad Request

### TC-SV-6: Duplicate sourceColumn in same request rejected
- **Input:** PUT with two entries having same sourceColumn
- **Expected:** 400 Bad Request

### TC-SV-7: ReDoS pattern rejected
- **Input:** PUT action with pattern `(a+)+b`
- **Expected:** 400 Bad Request with ReDoS warning

### TC-SV-8: Invalid regex syntax rejected
- **Input:** PUT action with pattern `[unclosed`
- **Expected:** 400 Bad Request

### TC-SV-9: Non-existent quality measure rejected
- **Input:** PUT column referencing qualityMeasure not in DB
- **Expected:** 400 Bad Request

### TC-SV-10: Non-existent systemId returns 404
- **Input:** GET `/import/mappings/nonexistent_system`
- **Expected:** 404 Not Found

### TC-SV-11: Empty resolutions array rejected
- **Input:** POST resolve with empty resolutions array
- **Expected:** 400 Bad Request

### TC-SV-12: Invalid resolution action rejected
- **Input:** POST resolve with action = "INVALID_ACTION"
- **Expected:** 400 Bad Request

---

## 10. Performance & Reliability

### TC-PR-1: Fuzzy matching performance with 100 candidates
- **Input:** 1 source against 100 candidate columns
- **Expected:** Completes in < 50ms

### TC-PR-2: Conflict detection with 50 file headers
- **Input:** 50-column file against 30-column config
- **Expected:** Completes in < 200ms

### TC-PR-3: Large file upload (10,000 rows) with conflicts
- **Input:** 10K-row file with 3 column conflicts
- **Expected:** Conflict detection on headers only (not per-row), fast response

### TC-PR-4: Concurrent conflict resolution saves
- **Input:** Two admins resolve same system's conflicts simultaneously
- **Expected:** Second save gets 409 (optimistic locking), first succeeds

### TC-PR-5: DB failure during save -> meaningful error
- **Input:** Database goes down mid-save
- **Expected:** 500 with descriptive error, no partial state

---

## 11. Test Spreadsheet Inventory

| File | Description | Headers | Data Rows | Tests Covered |
|------|-------------|---------|-----------|---------------|
| `test-01-exact-match.xlsx` | All headers perfectly match Hill config | Standard Hill columns | 5 | TC-FM-1, TC-CD-1 |
| `test-02-no-conflicts.xlsx` | Clean file, no conflicts | Standard Hill columns | 10 | TC-CD-1, TC-IF-1 |
| `test-03-new-column.xlsx` | Has 1 unrecognized column | Standard + "Insurance Plan Type" | 5 | TC-CD-2 |
| `test-04-missing-required.xlsx` | Missing "Member Name" column | All except Member Name | 5 | TC-CD-4 |
| `test-05-changed-column.xlsx` | Renamed column "Patient Name" | "Patient Name" instead of "Member Name" | 5 | TC-CD-8, TC-CD-9 |
| `test-06-duplicate-headers.xlsx` | Duplicate "Member Name" column | "Member Name" appears twice | 5 | TC-CD-12 |
| `test-07-duplicate-fuzzy.xlsx` | Two headers match same config | "Patient Name" + "Member Full Name" | 5 | TC-CD-14 |
| `test-08-ambiguous.xlsx` | Header with 2 close fuzzy matches | Ambiguous header | 5 | TC-CD-15 |
| `test-09-wrong-file.xlsx` | Completely wrong file for system | Random unrelated columns | 5 | TC-CD-17 |
| `test-10-mixed-conflicts.xlsx` | Mix of NEW, MISSING, CHANGED | Various conflict types | 10 | TC-CD-19 |
| `test-11-headers-only.xlsx` | Headers only, no data | Standard Hill columns | 0 | TC-EC-1 |
| `test-12-unicode-headers.xlsx` | Unicode/special chars in headers | Unicode variants | 5 | TC-EC-4 |
| `test-13-sutter-action-patterns.xlsx` | Sutter file with action text variations | Standard Sutter columns | 20 | TC-AP-1 through TC-AP-10 |
| `test-14-large-file.xlsx` | Performance test (many columns) | 50 columns | 100 | TC-PR-2 |
| `test-15-abbreviations.xlsx` | All medical abbreviation variants | Headers using all 32 abbreviations | 5 | TC-FM-13 |

---

---

## 12. Review Findings - Additional Test Cases (from QA Review)

> **Reviewed by:** Senior QA Engineer (automated review agent)
> **Review Date:** 2026-02-22
> **Findings:** 40 gaps identified (4 CRITICAL, 15 HIGH, 14 MEDIUM, 7 LOW)

### CRITICAL Gaps

#### GAP-20: XSS injection in column names
- **TC-SV-14:** Upload file with header `<script>alert('XSS')</script>`. Verify escaped text in ConflictResolutionStep.
- **TC-SV-15:** PUT column with `sourceColumn = "<img src=x onerror=alert(1)>"`. Verify safe rendering on mapping page.

#### GAP-01: DUPLICATE and AMBIGUOUS resolution actions untested
- **TC-CR-16:** Admin resolves DUPLICATE by "Select this mapping" for one header, "Ignore" for other. Verify only one mapping survives.
- **TC-CR-17:** Admin resolves AMBIGUOUS by selecting correct mapping from multiple suggestions.

#### GAP-10: 409 optimistic locking in conflict resolution UI
- **TC-CR-18:** Admin clicks Save, receives 409. Verify error message, Save re-enabled, selections preserved.

#### GAP-27: loadMergedConfig failure breaks ALL imports
- **TC-IF-10:** Mock `loadMergedConfig()` to throw. Verify meaningful 500 error, not unhandled rejection.

### HIGH Gaps

#### GAP-02: Audit log content verification
- **TC-MM-13:** After save, verify AuditLog: `action = 'MAPPING_CHANGE'`, `entity = 'import_mapping'`, correct changes JSON.
- **TC-MM-14:** After reset, verify AuditLog: `action = 'MAPPING_RESET'` with deleted count.

#### GAP-03: End-to-end re-submit after resolution
- **TC-IF-7:** After resolve, verify auto-resubmit returns `hasConflicts: false` with valid previewData.

#### GAP-04: Legacy route redirect
- **TC-IF-8:** Navigate to `/hill-mapping`, verify redirect to `/admin/import-mapping?system=hill`.

#### GAP-11: Zero headers in file
- **TC-EC-17:** Upload file with empty header row. Verify wrong-file detection or all MISSING.

#### GAP-12: Corrupted/password-protected files
- **TC-EC-18:** Corrupted .xlsx returns clear error (not 500 stack trace).
- **TC-EC-19:** Password-protected .xlsx returns user-friendly error.

#### GAP-13: File re-upload during conflict resolution
- **TC-EC-20:** While ConflictResolutionStep displayed, verify file upload controls disabled/hidden.

#### GAP-22: Request body size limits
- **TC-SV-17:** PUT with 1000 change entries. Verify 400 or graceful handling.
- **TC-SV-18:** PUT with 10,000-char sourceColumn. Verify truncation/rejection.

#### GAP-23: ReDoS detection bypass
- **TC-SV-19:** PUT action `(?:a+)+b` (non-capturing group). Verify rejected.
- **TC-SV-20:** PUT action `(a|aa)+b` (nested alternation). Verify behavior.
- **TC-AP-11:** Pattern causing catastrophic backtracking. Verify no hang.

#### GAP-28: Route registration ordering regression
- **TC-IF-11:** GET `/api/import/mappings/hill` returns mapping config (not import error). CI smoke test.

#### GAP-29: Normalization stability
- **TC-FM-16:** Verify adding new abbreviation doesn't break existing exact matches.

#### GAP-21: SQL injection defense-in-depth
- **TC-SV-16:** PUT column with `sourceColumn = "'; DROP TABLE..."`. Verify stored literally.

#### GAP-30: Sutter action text fuzzy fallback test data
- Test-13 should include: regex match, year-variant, fuzzy-only, completely unrecognizable rows.

#### GAP-31: Realistic insurance system rename scenario
- **Spreadsheet:** `test-16-realistic-hill-rename.csv` -- 2 renamed columns, rest unchanged.

#### GAP-35: Admin resolution change tracking
- **TC-CR-19:** Admin changes resolution from "Ignore" to "Map to measure". Verify no double-count, final resolution correct.

### MEDIUM Gaps

#### GAP-05: Systems list API
- **TC-MM-15:** GET `/api/import/systems` returns both Hill and Sutter.

#### GAP-06/07: Role-specific scenarios
- **TC-NA-7:** STAFF user sees blocking banner regardless of physician assignment.
- **TC-NA-8:** ADMIN+PHYSICIAN dual role sees admin resolution UI.

#### GAP-14: Clipboard API failure
- **TC-NA-9:** Mock clipboard rejection, verify graceful error message.

#### GAP-15: Whitespace-only headers
- **TC-EC-21:** File header of only spaces. Verify graceful handling.

#### GAP-16: Config columns normalizing identically
- **TC-EC-22:** "BP Control Q1" and "BP Control Q2" normalize same. Verify no metadata loss.

#### GAP-36: Focus management verification
- **TC-CR-20:** After 100ms, verify `document.activeElement` is first conflict dropdown.

#### GAP-37: Edit mode toggle
- **TC-MM-17:** Toggle "Edit Mappings" switches all sections simultaneously.
- **TC-MM-18:** Unsaved changes warning on mode toggle.

#### GAP-38: Request type with no quality measures
- **TC-MM-19:** Verify helpful empty state in quality measure dropdown.

#### GAP-32/33: CSV and multi-sheet test data
- **Spreadsheet:** `test-18-hill-format.csv` for CSV-specific parsing.
- **Spreadsheet:** `test-19-multi-sheet.xlsx` with wrong vs correct sheet.

---

## Summary

| Category | Original | Review Additions | Total | Priority |
|----------|----------|-----------------|-------|----------|
| Fuzzy Matching Engine | 15 | 1 | 16 | HIGH |
| Conflict Detection Pipeline | 22 | 0 | 22 | CRITICAL |
| Conflict Resolution (Admin) | 15 | 5 | 20 | CRITICAL |
| Conflict Resolution (Non-Admin) | 6 | 3 | 9 | HIGH |
| Mapping Management CRUD | 12 | 9 | 21 | HIGH |
| Import Flow Integration | 6 | 5 | 11 | CRITICAL |
| Action Pattern Matching (Sutter) | 10 | 1 | 11 | HIGH |
| Edge Cases & Boundary | 16 | 7 | 23 | MEDIUM |
| Security & Validation | 12 | 11 | 23 | CRITICAL |
| Performance & Reliability | 5 | 0 | 5 | MEDIUM |
| **TOTAL** | **119** | **42** | **161** | |

### CI/CD Automation Priority

**P1 - Must automate (every build):**
- TC-CD-1 (no conflicts), TC-IF-1 (normal import flow)
- TC-SV-1/SV-2/SV-3 (auth guards)
- TC-CD-12 (duplicate headers), TC-CD-17 (wrong file)
- TC-IF-10 (loadMergedConfig failure)
- TC-IF-11 (route ordering smoke test)
- TC-SV-14 (XSS injection)

**P2 - Should automate (nightly):**
- TC-FM-13 (all abbreviations), TC-CD-19 (mixed conflicts)
- TC-CR-9 (save + re-preview), TC-MM-3 (optimistic locking)
- TC-AP-8 (ReDoS), TC-PR-4 (concurrent saves)

**P3 - Nice to have (weekly/manual):**
- TC-EC-3 (200+ columns), TC-PR-1/PR-2 (performance)
- TC-EC-4 (Unicode), TC-EC-23 (50+ conflicts UI)
