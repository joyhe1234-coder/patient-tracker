# Verification: Replace All Deletes Other Insurance Group's Data

**Bug ID:** replace-all-deletes-other-insurance
**Fix Date:** 2026-02-28
**Status:** VERIFIED

## Changes Made

### 1. `backend/src/services/import/diffCalculator.ts`

| Change | Description |
|--------|-------------|
| `ExistingRecord` interface (line 106) | Added `insuranceGroup: string \| null` field |
| `calculateDiff()` (line 172-176) | Added optional `systemId?: string \| null` parameter. When mode is 'replace' and systemId is provided, passes it as insurance group filter to `loadExistingRecords()` |
| `loadExistingRecords()` (line 258-288) | Added optional `insuranceGroup?: string` parameter. When provided, adds `patient.insuranceGroup` filter to the Prisma query WHERE clause |
| `loadExistingRecords()` return mapping (line 301) | Added `insuranceGroup: m.patient.insuranceGroup ?? null` to returned records |
| `loadReassignmentRecords()` return mapping (line 378) | Added `insuranceGroup: m.patient.insuranceGroup ?? null` to returned records |
| Replace mode branch (line 220) | Changed to pass `existingRecords` (insurance-filtered) instead of `allExistingRecords` |

### 2. `backend/src/routes/import.routes.ts`

| Change | Description |
|--------|-------------|
| Preview route (line 636) | Changed `calculateDiff(transformResult.rows, mode, targetOwnerId)` to `calculateDiff(transformResult.rows, mode, targetOwnerId, systemId)` |

### 3. Test files updated

| File | Change |
|------|--------|
| `diffCalculator.test.ts` | Added `insuranceGroup: null` to `createMockExistingRecord()` helper; added 7 new test cases |
| `sutter-edge-cases.test.ts` | Added `insuranceGroup: null` to inline ExistingRecord construction |
| `sutter-import-flow.test.ts` | Added `insuranceGroup: null` to inline ExistingRecord construction |
| `sutter-integration.test.ts` | Added `insuranceGroup: null` to 2 inline ExistingRecord constructions |

## New Tests Added (7 tests)

1. **ExistingRecord insuranceGroup field**
   - `should include insuranceGroup in ExistingRecord` -- verifies the field exists
   - `should default insuranceGroup to null` -- verifies null default

2. **Replace All insurance group filtering (bug fix)**
   - `should only delete records that were passed in (pre-filtered by insurance group)` -- core fix verification
   - `should not delete Sutter records when only Hill records are passed` -- isolation check
   - `should handle mixed insurance groups when no filter is applied (backwards compatible)` -- backwards compatibility

3. **Scenario: Hill import should not delete Sutter data**
   - `should demonstrate the fixed behavior with insurance group separation` -- end-to-end scenario

4. **Merge mode is unaffected by insurance filter**
   - `should apply normal merge logic regardless of insuranceGroup field` -- merge mode unchanged
   - `should merge records from different insurance groups without filtering` -- cross-insurance merge

## Test Results

### Backend Tests (Jest)
- **49 test suites passed** (out of 50 total; 1 skipped is unrelated)
- **1454 tests passed**, 12 skipped
- The single FAIL (`reassignment-merge.test.ts`) is an **untracked, uncommitted** file from another agent's WIP work -- pre-existing failures unrelated to this fix
- TypeScript type-check: **PASS** (0 errors)

### Frontend Tests (Vitest)
- **48 test suites passed** (48 of 48)
- **1214 tests passed**, 1 skipped

### New Test Count
- 7 new tests added to `diffCalculator.test.ts`

## How the Fix Works

### Before (buggy)
```
calculateDiff(rows, 'replace', physicianId)
  -> loadExistingRecords(physicianId)       // Loads ALL measures for physician
  -> calculateReplaceAllDiff(rows, ALL_records)  // Deletes ALL -- Hill, Sutter, etc.
```

### After (fixed)
```
calculateDiff(rows, 'replace', physicianId, 'hill')
  -> insuranceFilter = 'hill'  (only set for replace mode)
  -> loadExistingRecords(physicianId, 'hill')  // Loads only Hill measures
  -> calculateReplaceAllDiff(rows, HILL_ONLY_records)  // Deletes only Hill records
```

### Key Design Decisions

1. **Insurance filter only applied in replace mode** -- Merge mode always loads all records (unchanged behavior). The filter is computed as `mode === 'replace' && systemId ? systemId : undefined`.

2. **Filtering done at query level** -- The Prisma WHERE clause is augmented with `patient.insuranceGroup`, so only matching records are loaded from DB. This is more efficient than loading all and filtering in JS.

3. **Replace mode uses `existingRecords` (filtered), not `allExistingRecords`** -- The `allExistingRecords` variable includes reassignment records which should not be deleted. The replace branch now correctly uses only the insurance-filtered records.

4. **Backwards compatible** -- When `systemId` is null/undefined or mode is 'merge', the filter is not applied, preserving existing behavior.
