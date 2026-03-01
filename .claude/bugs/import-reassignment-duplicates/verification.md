# Verification: Import Reassignment Duplicates Fix

## Bug ID
BUG-REASSIGN-DUP-001

## Date Fixed
2026-02-28

## Test Results

### Backend (Jest)
- **50 test suites passed** (1 skipped - integration test requiring database)
- **1465 tests passed** (12 skipped)
- **0 failures**
- **11 NEW tests added** in `reassignment-merge.test.ts`

### Frontend (Vitest)
- **48 test suites passed**
- **1214 tests passed** (1 skipped)
- **0 failures**
- No regressions

## Changes Made

### 1. `backend/src/services/import/diffCalculator.ts`

**New function: `loadReassignmentRecords()`** (lines 317-396)

Added a new private async function that:
- Takes import rows and targetOwnerId as inputs
- Extracts unique patients (by name+DOB) from the import rows
- Queries the database for patients that match import rows BUT have a different ownerId than the target
- Loads all PatientMeasure records for those reassigned patients
- Returns them as ExistingRecord[] compatible with the diff calculator

**Modified: `calculateDiff()`** (lines 172-250)

After the existing `loadExistingRecords(targetOwnerId)` call:
1. Added call to `loadReassignmentRecords(rows, targetOwnerId)`
2. Combined both record sets into `allExistingRecords`
3. Updated the `existingByKey` map building to use `allExistingRecords` with deduplication (target owner records take precedence)
4. Updated both merge mode and replace mode to use the combined records:
   - Replace mode: `calculateReplaceAllDiff(rows, allExistingRecords, summary)` -- ensures old measures from reassigned patients get DELETE actions
   - Merge mode: `calculateMergeDiff(rows, existingByKey, summary)` -- existingByKey now includes reassigned patients' measures
5. Updated `existingPatientKeys` to include reassigned patients so they're correctly counted as existing (not new)

### 2. `backend/src/services/import/importExecutor.ts`

**Modified: `executeMergeMode()`** (lines 181-202)

For UPDATE and SKIP actions, added patient ownerId reassignment:
- UPDATE case: After updating the measure, calls `reassignPatientIfNeeded()` to update the patient's ownerId to the target owner
- SKIP case: Even though the measure is skipped (same status), still calls `reassignPatientIfNeeded()` to update the patient's ownerId

**New function: `reassignPatientIfNeeded()`** (lines 358-371)

Helper that checks if a patient's ownerId differs from the target, and updates it if so. This ensures:
- When a measure is SKIPped (identical status), the patient is still reassigned to the new owner
- When a measure is UPDATEd, the patient is also reassigned
- Only performs the update if needed (avoids unnecessary DB writes)

### 3. `backend/src/services/import/__tests__/reassignment-merge.test.ts` (NEW FILE)

11 new tests covering all reassignment merge scenarios:

| # | Test | Scenario | Expected |
|---|------|----------|----------|
| 1 | Same status, different owner | Non-compliant -> Non-compliant | SKIP |
| 2 | Upgraded status, different owner | Non-compliant -> Compliant | UPDATE |
| 3 | Downgraded status, different owner | Compliant -> Non-compliant | BOTH |
| 4 | New patient (not reassignment) | No existing record | INSERT |
| 5 | Mix of reassigned + new patients | Both types in one import | SKIP + INSERT |
| 6 | Multiple measures per patient | 2 measures, same patient | 2x SKIP |
| 7 | Patient under target + reassignment | Target owner already has records | Uses target record |
| 8 | No DOB in import rows | Edge case: null DOB | INSERT, no reassignment lookup |
| 9 | Patient counting | Reassigned patient | Counted as existing, not new |
| 10 | Replace mode with reassignment | Old measures from reassigned patient | DELETE + INSERT |
| 11 | Reassignment to unassigned | ownerId null target | SKIP |

## Edge Cases Considered

1. **Patient exists under target owner AND another owner**: Target owner records take precedence in the existingByKey map (deduplication prevents overwrites)
2. **Null DOB**: loadReassignmentRecords returns early without any DB queries
3. **Null targetOwnerId**: Works correctly -- finds patients with ownerId != null (i.e., assigned patients being moved to unassigned)
4. **Multiple measures per patient**: All measures are loaded and matched individually
5. **Replace mode**: Reassigned patients' old measures get DELETE actions, preventing orphaned records
6. **SKIP action with reassignment**: Patient ownerId is still updated even when measures are skipped
7. **No reassigned patients**: loadReassignmentRecords returns empty array, no performance impact

## Root Cause Confirmed Fixed

The core issue was that `loadExistingRecords(targetOwnerId)` only loaded measures for patients already owned by the target physician. By adding `loadReassignmentRecords()` to also load measures for patients being reassigned from other owners, the diff calculator now correctly produces SKIP/UPDATE/BOTH instead of INSERT, preventing duplicate PatientMeasure rows.
