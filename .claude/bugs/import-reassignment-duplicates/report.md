# Bug Report: Import Reassignment Duplicates

## Bug ID
BUG-REASSIGN-DUP-001

## Title
Import with physician reassignment creates duplicate PatientMeasure rows instead of SKIP/UPDATE

## Severity
**HIGH** -- Creates duplicate data in production, corrupts patient records

## Status
Open

## Date Reported
2026-02-28

---

## Description

When importing data for a physician (Physician B) and some patients already exist under a different physician (Physician A), the import creates NEW duplicate PatientMeasure rows instead of correctly matching against the existing measures. The old measures from Physician A are never cleaned up, resulting in double rows per patient.

## Reproduction Steps

1. Patients exist in DB owned by Physician A (from seed data or previous import)
2. User imports a spreadsheet targeting Physician B
3. System detects reassignment ("these patients belong to A, will be reassigned to B")
4. User confirms reassignment
5. Import creates NEW PatientMeasure rows (INSERT) + updates patient.ownerId to B
6. OLD PatientMeasure rows from Physician A are NOT deleted
7. Result: patient has DOUBLE rows -- old measures + new imported measures = duplicates

## Expected Behavior

- When importing identical data with a different owner, the diff should produce **SKIP** actions (same status = no change needed), not INSERTs
- When importing upgraded statuses, the diff should produce **UPDATE** actions
- When importing downgraded statuses, the diff should produce **BOTH** actions
- Patient ownerId should be updated to the new owner during execution
- No duplicate PatientMeasure rows should be created

## Actual Behavior

- The diff produces **INSERT** for ALL measures of reassigned patients
- Old measures remain in the database untouched
- Patient ends up with 2x the expected number of PatientMeasure rows
- Patient ownerId is updated to the new owner, but old measures remain

## Root Cause

In `backend/src/services/import/diffCalculator.ts`, the `loadExistingRecords()` function (lines 242-276) filters PatientMeasure records by `patient.ownerId === targetOwnerId`. When a patient is being reassigned from Physician A to Physician B:

- `targetOwnerId` = Physician B's ID
- Patient's current `ownerId` = Physician A's ID
- `loadExistingRecords(physicianB_id)` returns NO records for this patient
- The diff calculator sees NO existing records and produces INSERT instead of SKIP/UPDATE

```typescript
async function loadExistingRecords(targetOwnerId: number | null): Promise<ExistingRecord[]> {
  const measures = await prisma.patientMeasure.findMany({
    where: {
      patient: {
        ownerId: targetOwnerId, // <-- ONLY loads records for target physician
      },
    },
    // ...
  });
}
```

The `detectReassignments()` function correctly identifies which patients will be reassigned, but this information is never fed back into `calculateDiff()` to also load those patients' existing measures.

## Affected Files

- `backend/src/services/import/diffCalculator.ts` -- Root cause in `loadExistingRecords()` and `calculateDiff()`
- `backend/src/services/import/importExecutor.ts` -- `insertMeasure()` already handles ownerId updates on existing patients (line 253), but receives INSERT instead of SKIP/UPDATE
- `backend/src/routes/import.routes.ts` -- Calls `calculateDiff()` and `detectReassignments()` independently (line 636-639)

## Impact

- Data integrity: Duplicate PatientMeasure rows in database
- UI impact: Patients appear with doubled measures in the grid
- Affects any workflow where patients are reassigned between physicians via import
