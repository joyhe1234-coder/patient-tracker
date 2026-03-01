# Analysis: Import Reassignment Duplicates

## Root Cause Deep Dive

### The Flow

1. **`import.routes.ts` line 636**: `calculateDiff(transformResult.rows, mode, targetOwnerId)` is called
2. **`diffCalculator.ts` line 175**: Inside `calculateDiff()`, `loadExistingRecords(targetOwnerId)` is called
3. **`diffCalculator.ts` line 242-276**: `loadExistingRecords()` queries `patientMeasure` WHERE `patient.ownerId === targetOwnerId`
4. For reassigned patients, their ownerId is DIFFERENT from targetOwnerId, so their measures are NOT loaded
5. **`diffCalculator.ts` line 178**: `existingByKey` map has NO entries for reassigned patients
6. **`diffCalculator.ts` line 206**: `calculateMergeDiff()` sees no existing record for each row, produces INSERT
7. **`import.routes.ts` line 639**: `detectReassignments()` runs AFTER diff calculation -- too late to help

### Why the Diff is Wrong

The `existingByKey` map is built from `loadExistingRecords(targetOwnerId)` which only contains measures for patients already owned by the target physician. When Patient X is owned by Physician A and we're importing for Physician B:

- `loadExistingRecords(physicianB_id)` returns: [] (no measures for Patient X)
- `existingByKey` has no key for Patient X's measures
- `calculateMergeDiff()` processes import row for Patient X → no match in existingByKey → INSERT

### The Fix

Modify `calculateDiff()` to:

1. After calling `loadExistingRecords(targetOwnerId)`, identify which import patients exist in the DB under a DIFFERENT owner
2. Load those patients' existing measures as well
3. Add them to `existingByKey` so `calculateMergeDiff()` / `calculateReplaceAllDiff()` can see them

This is equivalent to: "for the purposes of diff calculation, treat reassigned patients' existing measures as if they belong to the target owner."

### Specific Code Changes

**File: `backend/src/services/import/diffCalculator.ts`**

1. Make `loadExistingRecords()` exportable (for testing) or add a new function
2. Add a new function `loadReassignmentRecords()` that:
   - Takes the import rows and targetOwnerId
   - Finds patients in the import that exist in DB under a DIFFERENT ownerId
   - Loads their PatientMeasure records
   - Returns them as ExistingRecord[]
3. In `calculateDiff()`, after loading target-owner records, also load reassignment records and merge into existingByKey

### What About Replace Mode?

In replace mode, `calculateReplaceAllDiff()` receives `existingRecords` (the array, not the map). The same fix applies: we need to include reassigned patients' measures in the existing records so they get DELETE actions. Otherwise in replace mode, the old measures also remain as orphans.

### What About the Executor?

The executor's `insertMeasure()` (importExecutor.ts line 250-261) already handles ownerId updates:
```typescript
if (ownerId !== null && patient.ownerId !== ownerId) {
  updateData.ownerId = ownerId;
}
```

For SKIP and UPDATE actions, we need to ensure the patient's ownerId is still updated to the target owner. Currently:
- `executeMergeMode()` SKIP handler (line 194): just increments `stats.skipped` -- does NOT update patient ownerId
- `updateMeasure()` (line 300): updates the measure but does NOT update patient ownerId

We need to add patient ownerId updates for SKIP and UPDATE actions during merge mode when a reassignment is happening. However, this can be done by adding the existingPatientId to the diff change and updating the patient in executeMergeMode for SKIP/UPDATE.

Actually, looking more carefully: the DiffChange already includes `existingPatientId` from the ExistingRecord (set in `applyMergeLogic()` line 407-421). The executor just needs to be updated to also reassign the patient's owner for UPDATE and SKIP actions.

For UPDATE: `updateMeasure()` already has access to `change.existingPatientId` and updates `insuranceGroup`. We need to also update `ownerId`.

For SKIP: The executor currently does nothing. We need to update the patient's ownerId during SKIP when the change indicates a reassignment.

### Edge Cases

1. **Patient exists under target physician AND has measures under a different physician**: Shouldn't happen in normal usage, but be defensive -- deduplicate by measure key
2. **Multiple patients being reassigned**: Each patient's measures need to be loaded
3. **Null targetOwnerId (unassigned)**: Already handled by `loadExistingRecords(null)` -- loads unassigned patients' measures. Reassignment detection also works for null.
4. **Replace mode with reassignment**: Old measures must be included in existingRecords for proper DELETE generation
