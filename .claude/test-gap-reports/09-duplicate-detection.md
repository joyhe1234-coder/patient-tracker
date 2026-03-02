# Test Gap Analysis: Requirement Area 9 -- Duplicate Detection

**Date:** 2026-03-02
**Analyst:** Claude Opus 4.6
**Spec:** `.claude/specs/duplicate-detection/requirements.md`

---

## 1. Feature Summary

Duplicate detection prevents and flags rows where the same patient (memberName + memberDob) has the same requestType + qualityMeasure. The system:

1. **Blocks creation** of duplicate rows at add-time (via `POST /api/data/check-duplicate` called implicitly -- though currently skipped because new rows have null RT/QM)
2. **Blocks edits** that would create duplicates (409 on `PUT /api/data/:id`)
3. **Flags existing duplicates** visually (orange left stripe `#F97316`)
4. **Provides a filter chip** ("Duplicates") in the StatusFilterBar
5. **Syncs flags** on create/update/delete/import operations
6. **Resets fields** to null (not revert) on 409 duplicate error during cell edit

---

## 2. Source Code Inventory

| Layer | File | Purpose |
|-------|------|---------|
| Backend Service | `backend/src/services/duplicateDetector.ts` | Core logic: `checkForDuplicate()`, `detectAllDuplicates()`, `updateDuplicateFlags()`, `syncAllDuplicateFlags()` |
| Backend Route Handler | `backend/src/routes/handlers/dataDuplicateHandler.ts` | `POST /api/data/check-duplicate`, `POST /api/data/duplicate` |
| Backend Route Handler | `backend/src/routes/handlers/dataHandlers.ts` | `PUT /api/data/:id` (409 on duplicate), `POST /api/data` (checks on create), `DELETE /api/data/:id` (resync flags) |
| Backend Import | `backend/src/services/import/importExecutor.ts` | Calls `syncAllDuplicateFlags()` after import |
| Backend Import | `backend/src/services/import/validator.ts` | `findDuplicates()` within import rows |
| Frontend Hook | `frontend/src/components/grid/hooks/useGridCellUpdate.ts` | 409 handling: resets to null, dependent field cascade |
| Frontend Grid | `frontend/src/components/grid/PatientGrid.tsx` | `rowClassRules['row-status-duplicate']` based on `isDuplicate` |
| Frontend Modal | `frontend/src/components/modals/DuplicateWarningModal.tsx` | Error modal for add-row duplicate |
| Frontend Filter | `frontend/src/components/layout/StatusFilterBar.tsx` | "Duplicates" filter chip (exclusive mode) |
| Frontend Page | `frontend/src/pages/MainPage.tsx` | `rowCounts.duplicate`, filtering logic, `handleDuplicateRow()` |
| CSS | `frontend/src/index.css` | `.row-status-duplicate { border-left: 4px solid #F97316 }` |

---

## 3. Test File Inventory

| Framework | File | Test Count | Coverage Focus |
|-----------|------|------------|----------------|
| **Jest** | `backend/src/services/__tests__/duplicateDetector.test.ts` | **42** | `checkForDuplicate`, `detectAllDuplicates`, `updateDuplicateFlags`, `syncAllDuplicateFlags`, null handling, edge cases |
| **Jest** | `backend/src/routes/__tests__/data.routes.test.ts` | **~8** (duplicate-related) | `POST /check-duplicate` (4 tests), `POST /duplicate` (3 tests), `PUT /:id` 409 duplicate (1 test) |
| **Jest** | `backend/src/services/import/__tests__/importExecutor.test.ts` | **~3** (duplicate-related) | `syncAllDuplicateFlags` called after import, not called on failure |
| **Vitest** | `frontend/src/components/modals/DuplicateWarningModal.test.tsx` | **9** | Modal rendering, interactions, styling |
| **Vitest** | `frontend/src/components/grid/PatientGrid.test.tsx` | **~2** (duplicate-related) | `row-status-duplicate` class rule exists and functions correctly |
| **Vitest** | `frontend/src/components/grid/hooks/__tests__/useGridCellUpdate.test.ts` | **~3** (duplicate-related) | 409 non-conflict resets requestType to null, resets qualityMeasure to null, dependent field cascade |
| **Vitest** | `frontend/src/components/layout/StatusFilterBar.test.tsx` | **~5** (duplicate-related) | Duplicates chip click/toggle, exclusive mode, exit from duplicates mode |
| **Cypress** | `frontend/cypress/e2e/duplicate-detection.cy.ts` | **16** | Visual indicator, creating duplicate via edit, flag cleared on change, null fields, filter count, status+duplicate combo, 409 error handling |
| **Playwright** | `frontend/e2e/duplicate-member.spec.ts` | **7** (1 skipped) | Copy Member button (disabled/enabled), creates copy, empty measure fields, copies phone/address, selected after creation, multiple duplication |

**Total duplicate-related tests: ~95**

---

## 4. Comprehensive Use Case Matrix

### 4.1 Backend Service: `checkForDuplicate()`

| # | Use Case | Jest | API Test | Cypress | Playwright | Status |
|---|----------|------|----------|---------|------------|--------|
| 1 | Returns false when requestType is null | YES | -- | -- | -- | COVERED |
| 2 | Returns false when requestType is undefined | YES | -- | -- | -- | COVERED |
| 3 | Returns false when requestType is empty string | YES | -- | -- | -- | COVERED |
| 4 | Returns false when requestType is whitespace-only | YES | -- | -- | -- | COVERED |
| 5 | Returns false when qualityMeasure is null | YES | -- | -- | -- | COVERED |
| 6 | Returns false when qualityMeasure is undefined | YES | -- | -- | -- | COVERED |
| 7 | Returns false when qualityMeasure is empty string | YES | -- | -- | -- | COVERED |
| 8 | Returns false when qualityMeasure is whitespace-only | YES | -- | -- | -- | COVERED |
| 9 | Returns false when both are null | YES | -- | -- | -- | COVERED |
| 10 | Returns true when existing measures found | YES | -- | -- | -- | COVERED |
| 11 | Returns false when no existing measures found | YES | -- | -- | -- | COVERED |
| 12 | Returns correct duplicateIds with single match | YES | -- | -- | -- | COVERED |
| 13 | Passes correct where clause without excludeMeasureId | YES | -- | -- | -- | COVERED |
| 14 | Passes excludeMeasureId when provided | YES | -- | -- | -- | COVERED |
| 15 | Does NOT include excludeMeasureId when it is 0 (falsy) | YES | -- | -- | -- | COVERED |
| 16 | Whitespace-padded requestType still queries (non-empty after trim) | YES | -- | -- | -- | COVERED |

### 4.2 Backend Service: `detectAllDuplicates()`

| # | Use Case | Jest | Status |
|---|----------|------|--------|
| 17 | Returns empty map when no measures | YES | COVERED |
| 18 | Marks single measures as not duplicate | YES | COVERED |
| 19 | Marks groups of 2 as duplicate | YES | COVERED |
| 20 | Marks groups of 3+ as duplicate | YES | COVERED |
| 21 | Marks null requestType as not duplicate | YES | COVERED |
| 22 | Marks null qualityMeasure as not duplicate | YES | COVERED |
| 23 | Marks empty requestType as not duplicate | YES | COVERED |
| 24 | Marks empty qualityMeasure as not duplicate | YES | COVERED |
| 25 | Different patients with same fields are NOT duplicates | YES | COVERED |
| 26 | Mixed duplicates and non-duplicates handled correctly | YES | COVERED |
| 27 | Calls findMany with correct select fields | YES | COVERED |

### 4.3 Backend Service: `updateDuplicateFlags()`

| # | Use Case | Jest | Status |
|---|----------|------|--------|
| 28 | Marks groups with 2+ rows as duplicate | YES | COVERED |
| 29 | Marks single rows as not duplicate | YES | COVERED |
| 30 | Sets isDuplicate=false for null requestType | YES | COVERED |
| 31 | Sets isDuplicate=false for null qualityMeasure | YES | COVERED |
| 32 | Sets isDuplicate=false for empty requestType | YES | COVERED |
| 33 | Sets isDuplicate=false for empty qualityMeasure | YES | COVERED |
| 34 | Handles mix of null and valid measures | YES | COVERED |
| 35 | Passes correct patientId to findMany | YES | COVERED |
| 36 | Handles empty measures list | YES | COVERED |
| 37 | Handles multiple distinct groups correctly | YES | COVERED |

### 4.4 Backend Service: `syncAllDuplicateFlags()`

| # | Use Case | Jest | Status |
|---|----------|------|--------|
| 38 | Updates each measure with its duplicate status | YES | COVERED |
| 39 | Handles no measures without errors | YES | COVERED |

### 4.5 Backend Service: Deletion and Edit Edge Cases

| # | Use Case | Jest | Status |
|---|----------|------|--------|
| 40 | Deleting one of two duplicates clears flag on remaining | YES | COVERED |
| 41 | Three-way duplicate: deleting one leaves two still flagged | YES | COVERED |
| 42 | Duplicate flag recalculated when QM edited from match to non-match | YES | COVERED |

### 4.6 Backend API: `POST /api/data/check-duplicate`

| # | Use Case | Jest API | Status |
|---|----------|----------|--------|
| 43 | Returns isDuplicate=false for new combination | YES | COVERED |
| 44 | Returns isDuplicate=true when match exists | YES | COVERED |
| 45 | Skips check when patient fields missing | YES | COVERED |
| 46 | Skips check when requestType/qualityMeasure empty | YES | COVERED |

### 4.7 Backend API: `POST /api/data/duplicate` (Copy Member)

| # | Use Case | Jest API | Playwright | Status |
|---|----------|----------|------------|--------|
| 47 | Duplicates a row with patient data only | YES | YES | COVERED |
| 48 | Returns 400 when sourceRowId is missing | YES | -- | COVERED |
| 49 | Returns 404 when source row not found | YES | -- | COVERED |
| 50 | New duplicate row has all measure fields null | YES | YES | COVERED |
| 51 | New duplicate row has isDuplicate=false | YES | -- | COVERED |

### 4.8 Backend API: `PUT /api/data/:id` (409 Duplicate on Edit)

| # | Use Case | Jest API | Vitest | Cypress | Status |
|---|----------|----------|--------|---------|--------|
| 52 | Returns 409 when updating qualityMeasure creates duplicate | YES | -- | -- | COVERED |
| 53 | Returns 409 when updating requestType creates duplicate | -- | -- | -- | **GAP** |
| 54 | Calls updateDuplicateFlags after successful update | -- | -- | -- | **GAP** |
| 55 | Calls updateDuplicateFlags after delete | -- | -- | -- | **GAP** |

### 4.9 Backend Import: Duplicate Sync After Import

| # | Use Case | Jest | Status |
|---|----------|------|--------|
| 56 | syncAllDuplicateFlags called after successful import | YES | COVERED |
| 57 | syncAllDuplicateFlags NOT called on failed import | YES | COVERED |

### 4.10 Frontend: DuplicateWarningModal

| # | Use Case | Vitest | Status |
|---|----------|--------|--------|
| 58 | Renders nothing when isOpen=false | YES | COVERED |
| 59 | Renders modal when isOpen=true | YES | COVERED |
| 60 | Displays patient name | YES | COVERED |
| 61 | Displays explanation text | YES | COVERED |
| 62 | Displays guidance to use different values | YES | COVERED |
| 63 | Renders OK button | YES | COVERED |
| 64 | Shows Patient label with name | YES | COVERED |
| 65 | Calls onClose when OK button clicked | YES | COVERED |
| 66 | Calls onClose when backdrop clicked | YES | COVERED |
| 67 | Displays red error icon | YES | COVERED |
| 68 | OK button has blue styling | YES | COVERED |

### 4.11 Frontend: PatientGrid Row Class Rules (Duplicate Visual)

| # | Use Case | Vitest | Cypress | Status |
|---|----------|--------|---------|--------|
| 69 | row-status-duplicate class rule exists | YES | -- | COVERED |
| 70 | isDuplicate=true applies row-status-duplicate | YES | YES | COVERED |
| 71 | isDuplicate=false does NOT apply class | YES | YES | COVERED |
| 72 | undefined data does not apply class | YES | -- | COVERED |

### 4.12 Frontend: useGridCellUpdate (409 Handling)

| # | Use Case | Vitest | Cypress | Status |
|---|----------|--------|---------|--------|
| 73 | 409 non-conflict on requestType resets to null | YES | YES | COVERED |
| 74 | 409 non-conflict on requestType also resets qualityMeasure to null | YES | YES | COVERED |
| 75 | 409 non-conflict on requestType also resets measureStatus to null | YES | YES | COVERED |
| 76 | 409 non-conflict on qualityMeasure resets to null | YES | -- | COVERED |
| 77 | 409 non-conflict on qualityMeasure also resets measureStatus to null | YES | -- | COVERED |
| 78 | 409 non-conflict on non-duplicate field (e.g. notes) reverts to old value | -- | -- | **GAP** |
| 79 | Shows toast error message on 409 duplicate | -- | -- | **GAP** |

### 4.13 Frontend: StatusFilterBar (Duplicates Filter)

| # | Use Case | Vitest | Cypress | Status |
|---|----------|--------|---------|--------|
| 80 | Duplicates chip is visible | -- | YES | COVERED |
| 81 | Clicking Duplicates chip activates exclusive filter | YES | YES | COVERED |
| 82 | Toggling Duplicates chip off returns to All | YES | -- | COVERED |
| 83 | Clicking color chip while Duplicates active exits duplicates mode | YES | -- | COVERED |
| 84 | Clicking All while Duplicates active returns to All | YES | -- | COVERED |
| 85 | Duplicate count displayed in chip text | -- | YES | COVERED |
| 86 | Correct number of rows shown when Duplicates filter active | -- | YES | COVERED |

### 4.14 Frontend: MainPage (Duplicate Filtering Logic)

| # | Use Case | Vitest | Cypress | Status |
|---|----------|--------|---------|--------|
| 87 | rowCounts.duplicate incremented for isDuplicate=true rows | -- | -- | **GAP** |
| 88 | Filtered rows include only isDuplicate=true when duplicate filter active | -- | YES | COVERED (via Cypress) |
| 89 | Pinned row stays visible even when duplicate filter active | -- | -- | **GAP** |

### 4.15 Cypress E2E: Full Flow Tests

| # | Use Case | Cypress | Status |
|---|----------|---------|--------|
| 90 | Duplicate rows have row-status-duplicate class | YES | COVERED |
| 91 | Non-duplicate rows do NOT have row-status-duplicate class | YES | COVERED |
| 92 | Duplicate indicator is a left border stripe | YES | COVERED |
| 93 | Creating duplicate via Copy Member + edit triggers 409 and resets cell | YES | COVERED |
| 94 | Resets dependent fields after 409 duplicate error on requestType | YES | COVERED |
| 95 | Changing requestType removes duplicate flag | YES | COVERED |
| 96 | New row with no requestType is NOT flagged as duplicate | YES | COVERED |
| 97 | Row with requestType but no qualityMeasure is NOT flagged | YES | COVERED |
| 98 | Partial match with only requestType is NOT flagged | YES | COVERED |
| 99 | Duplicates filter chip shows count | YES | COVERED |
| 100 | Correct row count when Duplicates filter clicked | YES | COVERED |
| 101 | Duplicate count updates after removing a duplicate | YES | COVERED |
| 102 | Duplicate stripe coexists with status color | YES | COVERED |
| 103 | Duplicate stripe coexists with green status | YES | COVERED |
| 104 | Error alert shown when duplicate created | YES | COVERED |
| 105 | requestType and measureStatus cleared after 409 on AWV/Chronic DX | YES | COVERED |

### 4.16 Playwright E2E: Copy Member Flow

| # | Use Case | Playwright | Status |
|---|----------|------------|--------|
| 106 | Duplicate button disabled when no row selected | YES | COVERED |
| 107 | Duplicate button enabled when row selected | YES | COVERED |
| 108 | Copy Member creates new row with same patient data | YES | COVERED |
| 109 | Duplicated row has empty measure fields | YES | COVERED |
| 110 | Duplicated row copies phone and address | YES | COVERED |
| 111 | Duplicated row is selected after creation | YES | COVERED |
| 112 | Can duplicate multiple times | YES | COVERED |

---

## 5. Identified Gaps

### 5.1 HIGH Priority Gaps

| Gap # | Use Case | Expected Framework | Description | Risk |
|-------|----------|-------------------|-------------|------|
| G-1 | 409 on requestType update creating duplicate | Jest API | Only qualityMeasure 409 is tested (`data.routes.test.ts` line 446). Need separate test for requestType change triggering 409. | Data integrity -- requestType-based duplicates could slip through if 409 logic has a requestType-specific bug. |
| G-2 | Toast error message on 409 duplicate | Vitest | `useGridCellUpdate.test.ts` tests the field reset but does NOT assert that `showToast` was called with the correct error message for 409 non-conflict. | UX -- user might not see feedback about why their edit was rejected. |
| G-3 | DuplicateWarningModal is never shown in practice | Playwright/Cypress | The `DuplicateWarningModal` component is unit-tested, but NO E2E test triggers it via the actual Add Row flow. The current implementation skips duplicate check on Add Row (new rows have null RT/QM), so the modal may be dead code for the add-row path. Need E2E test confirming modal appears if a duplicate is attempted via Add Row with pre-populated fields (if such a flow exists) or document that the modal is only for future use. | Dead code risk -- modal may be unreachable. |

### 5.2 MEDIUM Priority Gaps

| Gap # | Use Case | Expected Framework | Description | Risk |
|-------|----------|-------------------|-------------|------|
| G-4 | `updateDuplicateFlags` called after successful update | Jest API | `dataHandlers.ts` line 487 calls `updateDuplicateFlags` when duplicate fields change. No API-level test verifies this call happens on PUT success. | Flag desync -- duplicate flags might not update after edits. |
| G-5 | `updateDuplicateFlags` called after delete | Jest API | `dataHandlers.ts` line 613 calls `updateDuplicateFlags` after DELETE. No API-level test verifies this call. | Flag desync -- remaining row keeps stale isDuplicate=true after pair is deleted. |
| G-6 | `rowCounts.duplicate` calculation in MainPage | Vitest | MainPage counts `row.isDuplicate` in `rowCounts.duplicate` (line 120). No unit test for this counting logic. | Incorrect filter chip count. |
| G-7 | Pinned row stays visible under duplicate filter | Vitest or Cypress | MainPage line 143 pins newly created rows so they remain visible. Not tested with duplicate filter active. | Newly created row could disappear from view. |
| G-8 | 409 non-conflict on a non-duplicate field (e.g., `notes`) still reverts to old value | Vitest | The `useGridCellUpdate.test.ts` tests 409 handling for `requestType` and `qualityMeasure` but does not test that a 409 on a different field (like `notes`) falls through to the revert-to-old-value path rather than the reset-to-null path. | Wrong behavior -- notes might be reset to null instead of reverted. |
| G-9 | Case sensitivity in name matching | Jest | `checkForDuplicate` and `detectAllDuplicates` rely on Prisma exact match for `requestType` and `qualityMeasure`. No test verifies that "awv" vs "AWV" are treated as different (or same). This is database-level behavior but worth documenting/testing. | Inconsistent duplicate detection if data has mixed case. |

### 5.3 LOW Priority Gaps

| Gap # | Use Case | Expected Framework | Description | Risk |
|-------|----------|-------------------|-------------|------|
| G-10 | Duplicate across different physicians (same patient reassigned) | Jest/Cypress | If patient is reassigned to another physician via import, duplicate detection should still work within the new scope. Covered implicitly by `updateDuplicateFlags(patientId)` which is physician-agnostic, but no explicit test. | Low -- patientId-based grouping is inherently correct, but worth a regression test. |
| G-11 | Performance with many patients in `detectAllDuplicates` | Jest | `detectAllDuplicates` loads ALL measures in one query. No test for performance characteristics with large datasets (e.g., 10K+ rows). | Performance degradation at scale -- acceptable for current deployment size. |
| G-12 | `syncAllDuplicateFlags` batch update optimization | Jest | Tests verify correctness but not that batch queries (trueIds/falseIds) are used instead of N individual queries. This is an implementation detail but important for perf. | Performance -- O(N) queries vs O(1). |
| G-13 | Import validator `findDuplicates()` within-import detection | Jest | `validator.test.ts` exists but was not fully audited here. Check that within-import duplicate detection (same patient + measure in the same spreadsheet) is tested for edge cases: empty QM, null RT, case sensitivity. | Import data quality warnings may be incorrect. |
| G-14 | `POST /api/data/duplicate` permission check (403 on wrong owner) | Jest API | `dataDuplicateHandler.ts` line 100 checks `ownerId`. No test for 403 response when user tries to duplicate a row they don't own. | Security -- unauthorized row duplication. |
| G-15 | `POST /api/data/duplicate` Socket.IO broadcast | Jest API | `dataDuplicateHandler.ts` line 141 broadcasts `row:created`. No test that the socket event is emitted for the duplicated row. | Real-time sync -- other users won't see the new row. |
| G-16 | DuplicateWarningModal accessibility (keyboard navigation, screen reader) | Vitest | No test for Escape key dismissal, focus trapping, or ARIA attributes. | Accessibility compliance. |
| G-17 | Duplicate detection after import (E2E) | Playwright/Cypress | No E2E test imports a file that creates duplicates and then verifies the duplicate flags/visual indicators are set. | Import-to-grid duplicate flag pipeline untested end-to-end. |

---

## 6. Coverage Summary by Framework

| Framework | Duplicate Tests | Coverage Assessment |
|-----------|----------------|---------------------|
| **Jest (Backend)** | ~53 | **Excellent** -- all 4 service functions thoroughly tested, null/empty/whitespace edge cases, deletion/edit scenarios, import sync. API routes partially covered. |
| **Vitest (Frontend)** | ~19 | **Good** -- Modal fully tested, grid class rule tested, 409 handling tested with field reset. Gaps in MainPage counting logic and toast assertion. |
| **Cypress** | 16 | **Good** -- comprehensive E2E coverage of visual indicators, edit-triggers-409, field resets, filter chip, null field handling, color combinations. |
| **Playwright** | 7 | **Adequate** -- Copy Member button flow well tested. Missing: no duplicate-detection-specific flows (only Copy Member). |

### Overall Coverage Rating: **82%** (Covered: 99 of ~112 scenarios)

---

## 7. Recommendations (Prioritized)

### Must Fix (HIGH)

1. **G-1**: Add Jest API test for `PUT /api/data/:id` returning 409 when `requestType` change creates a duplicate (mirror the existing qualityMeasure test).
2. **G-2**: Add Vitest assertion in `useGridCellUpdate.test.ts` that `showToast` is called with the expected error message text on 409 non-conflict.

### Should Fix (MEDIUM)

3. **G-4 + G-5**: Add Jest API tests verifying `updateDuplicateFlags` is called after successful PUT (when duplicate fields change) and after DELETE.
4. **G-6**: Add Vitest test in MainPage for `rowCounts.duplicate` calculation.
5. **G-8**: Add Vitest test for 409 non-conflict on a non-duplicate field (e.g., `notes` with status 409 but no VERSION_CONFLICT code) to confirm it reverts to old value.
6. **G-9**: Add Jest test (or document behavior) for case sensitivity: does `checkForDuplicate` with `requestType: 'awv'` match existing `requestType: 'AWV'`?

### Nice to Have (LOW)

7. **G-3**: Audit whether `DuplicateWarningModal` is reachable in any user flow. If not, either remove it or create a future-use doc note.
8. **G-14**: Add Jest API test for 403 when user tries to duplicate a row owned by another physician.
9. **G-15**: Add Jest API test for Socket.IO broadcast on `POST /api/data/duplicate`.
10. **G-17**: Add Playwright E2E test that imports a file creating duplicates, then verifies flags in the grid.

---

## 8. Test Count Reconciliation

| Source | Claimed Count | Verified Count | Notes |
|--------|--------------|----------------|-------|
| `duplicateDetector.test.ts` | 42 | **42** (15 checkForDuplicate + 11 detectAllDuplicates + 10 updateDuplicateFlags + 2 syncAllDuplicateFlags + 4 edge cases) | Matches |
| `duplicate-detection.cy.ts` | 16 | **16** (3 visual + 2 edit + 1 flag cleared + 3 null fields + 3 filter count + 2 color combo + 2 409 detail) | Matches |
| `duplicate-member.spec.ts` | 7 | **7** (1 skipped) | Matches |
| `DuplicateWarningModal.test.tsx` | Not claimed | **9** | Newly counted |
| `useGridCellUpdate.test.ts` (dup-related) | Not claimed | **3** | Subset of larger file |
| `PatientGrid.test.tsx` (dup-related) | Not claimed | **2** | Subset of larger file |
| `StatusFilterBar.test.tsx` (dup-related) | Not claimed | **~5** | Subset of larger file |
| `data.routes.test.ts` (dup-related) | Not claimed | **~8** | Subset of larger file |
| `importExecutor.test.ts` (dup-related) | Not claimed | **~3** | Subset of larger file |

---

## 9. Acceptance Criteria Traceability

| AC | Description | Backend Unit | Backend API | Frontend Unit | Cypress E2E | Playwright E2E | Status |
|----|-------------|-------------|-------------|---------------|-------------|----------------|--------|
| AC-1 | Duplicate = same name+DOB+RT+QM | 42 tests | 2 tests | -- | 16 tests | -- | **COVERED** |
| AC-2 | Skip check when RT or QM null/empty | 9 tests | 1 test | -- | 3 tests | -- | **COVERED** |
| AC-3 | Error modal on add duplicate | -- | -- | 9 tests | -- | -- | **PARTIAL** (modal tested, but not triggered via E2E add flow) |
| AC-4 | Error alert on edit creating duplicate | 1 test | 1 test | 3 tests | 5 tests | -- | **COVERED** |
| AC-5 | Dependent field reset on error | -- | -- | 3 tests | 2 tests | -- | **COVERED** |
| AC-6 | Orange left stripe indicator | -- | -- | 2 tests | 4 tests | -- | **COVERED** |
| AC-7 | Delete removes flag from remaining | 2 tests | -- | -- | -- | -- | **PARTIAL** (unit-tested, no E2E for delete-removes-flag) |
| AC-8 | Backend validates and blocks | -- | 1 test | -- | 2 tests | -- | **COVERED** |
| AC-9 | Flags synchronized on CRUD | 2 tests | -- | -- | 1 test | -- | **PARTIAL** (sync called in unit tests; API-level sync not tested for PUT/DELETE) |
