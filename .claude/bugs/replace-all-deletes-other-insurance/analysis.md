# Root Cause Analysis: Replace All Deletes Other Insurance Group's Data

## Data Flow Analysis

### Current Flow (Buggy)

```
import.routes.ts POST /preview
  -> calculateDiff(rows, mode, targetOwnerId)       // systemId NOT passed
    -> loadExistingRecords(targetOwnerId)            // loads ALL measures for owner
    -> if mode === 'replace':
         calculateReplaceAllDiff(rows, existingRecords, summary)
           // Deletes ALL existingRecords -- no insurance filter
```

### Fixed Flow

```
import.routes.ts POST /preview
  -> calculateDiff(rows, mode, targetOwnerId, systemId)  // systemId passed through
    -> loadExistingRecords(targetOwnerId, systemId)       // filter by insurance group in replace mode
    -> if mode === 'replace':
         calculateReplaceAllDiff(rows, existingRecords, summary)
           // Only deletes records matching the import's insurance group
```

## Detailed Root Cause

### 1. ExistingRecord interface (diffCalculator.ts:94-106)

The `ExistingRecord` interface does not include `insuranceGroup`:

```typescript
export interface ExistingRecord {
  patientId: number;
  measureId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
  measureStatus: string | null;
  ownerId: number | null;
  ownerName: string | null;
  // MISSING: insuranceGroup: string | null;
}
```

### 2. loadExistingRecords (diffCalculator.ts:242-276)

The Prisma query only filters by `patient.ownerId`, not by `patient.insuranceGroup`:

```typescript
async function loadExistingRecords(targetOwnerId: number | null): Promise<ExistingRecord[]> {
  const measures = await prisma.patientMeasure.findMany({
    where: {
      patient: {
        ownerId: targetOwnerId, // Only filters by owner, NOT by insuranceGroup
      },
    },
    // ...
  });
  // return mapping does not include insuranceGroup
}
```

### 3. calculateReplaceAllDiff (diffCalculator.ts:283-330)

Deletes ALL existing records without any filtering:

```typescript
export function calculateReplaceAllDiff(rows, existingRecords, summary) {
  for (const record of existingRecords) {
    changes.push({ action: 'DELETE', ... }); // No insurance check
  }
}
```

### 4. calculateDiff (diffCalculator.ts:169-233)

Does not accept systemId parameter:

```typescript
export async function calculateDiff(
  rows: TransformedRow[],
  mode: ImportMode,
  targetOwnerId: number | null = null
  // MISSING: systemId parameter
): Promise<DiffResult> {
```

### 5. import.routes.ts (line 636)

The preview route has `systemId` available but does not pass it to `calculateDiff`:

```typescript
const diffResult = await calculateDiff(transformResult.rows, mode, targetOwnerId);
// systemId is available in scope but not passed
```

## Available Data

- `systemId` is already available in the preview route (line 487: `const systemId = req.body.systemId || 'hill'`)
- The Prisma schema has `insuranceGroup` field on the Patient model (confirmed: `insuranceGroup String? @map("insurance_group")`)
- The `insuranceGroup` is already set during import execution (importExecutor.ts line 247: `insuranceGroup: systemId`)
- Patients already have `insuranceGroup` populated from previous imports

## Fix Strategy

### Minimal, Targeted Changes

1. **ExistingRecord interface** -- Add `insuranceGroup: string | null`
2. **loadExistingRecords()** -- Add optional `insuranceGroup` parameter; when provided, add `patient.insuranceGroup` to the Prisma `where` clause. Include `insuranceGroup` in the returned mapping.
3. **calculateDiff()** -- Add optional `systemId` parameter; when mode is 'replace' and systemId is provided, pass it to `loadExistingRecords()` as the insurance group filter.
4. **import.routes.ts** -- Pass `systemId` to `calculateDiff()` call on line 636.

### Backwards Compatibility

- Merge mode: `loadExistingRecords` is called WITHOUT insurance filter (existing behavior unchanged)
- Replace All without systemId: loads all records (backwards compatible)
- Replace All with systemId: filters by insurance group (new behavior, fixes the bug)

### Interaction with Other Bug Fix

Another agent is fixing import-reassignment-duplicates in the same file (adding reassigned patients' measures to loadExistingRecords). That fix ADDS more records for merge mode. Our fix FILTERS records for replace mode. The two fixes are independent:
- Their fix: merge mode loads more records (reassigned patients)
- Our fix: replace mode loads fewer records (only matching insurance group)
- Both touch `loadExistingRecords` but in different ways -- potential merge conflict in function signature but logically compatible.
