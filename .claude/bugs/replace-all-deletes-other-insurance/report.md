# Bug Report: Replace All Deletes Other Insurance Group's Data

**Bug ID:** replace-all-deletes-other-insurance
**Severity:** Critical (data loss)
**Component:** Import Pipeline - Diff Calculator
**Date:** 2026-02-28

## Summary

When using "Replace All" import mode, the system deletes ALL patient measures for the target physician regardless of insurance group. This causes data loss for patients belonging to other insurance systems.

## Reproduction Steps

1. Physician A has 10 patients from Hill Healthcare and 5 patients from Sutter
2. User imports a NEW Hill spreadsheet using "Replace All" mode for Physician A
3. System deletes ALL 15 patients' measures (Hill + Sutter)
4. System inserts only the new Hill rows
5. Result: 5 Sutter patients' data is LOST

## Expected Behavior

1. Replace All should only delete measures for patients belonging to the SAME insurance group as the import
2. Hill import Replace All -> delete only Hill patients' measures, leave Sutter untouched
3. Sutter import Replace All -> delete only Sutter patients' measures, leave Hill untouched

## Root Cause

Three locations in `backend/src/services/import/diffCalculator.ts`:

1. **`ExistingRecord` interface (line 94-106):** Does not include `insuranceGroup` field
2. **`loadExistingRecords()` (line 242-276):** Loads ALL measures for the target physician with NO insurance group filter -- only filters by `ownerId`
3. **`calculateReplaceAllDiff()` (line 283-330):** Marks ALL existing records as DELETE without any insurance group filtering

## Impact

- **Data Loss:** Patient measures from unrelated insurance groups are permanently deleted during Replace All imports
- **Affects:** Any physician who has patients from multiple insurance systems (Hill + Sutter)
- **Scope:** Only Replace All mode is affected; Merge mode is not impacted

## Fix Approach

1. Add `insuranceGroup` to `ExistingRecord` interface
2. Add `insuranceGroup` to `loadExistingRecords` query results
3. Pass `systemId` through `calculateDiff()` to `loadExistingRecords()`
4. In Replace All mode: filter `existingRecords` to only those matching the import's insurance group
5. Thread `systemId` from the preview route through to `calculateDiff()`

## Files Affected

- `backend/src/services/import/diffCalculator.ts` - Core fix
- `backend/src/routes/import.routes.ts` - Thread systemId to calculateDiff
- `backend/src/services/import/__tests__/diffCalculator.test.ts` - New test cases
