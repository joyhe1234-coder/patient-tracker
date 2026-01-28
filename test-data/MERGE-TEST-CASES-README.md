# Merge Test Cases Import File

## File: merge-test-cases.csv

This file is designed to test all 6 merge logic cases when importing with **Merge Mode**.

## Merge Logic Matrix

| Case | Old (DB) Status | New (Import) Status | Action | Description |
|------|----------------|---------------------|--------|-------------|
| 1 | Does NOT exist | Has value | INSERT | New patient+measure combination |
| 2 | Exists | Missing/blank | SKIP | Keep existing, ignore blank import |
| 3 | Non Compliant | Compliant | UPDATE | Upgrade to compliant |
| 4 | Compliant | Compliant | SKIP | Both compliant, keep existing |
| 5 | Non Compliant | Non Compliant | SKIP | Both non-compliant, keep existing |
| 6 | Compliant | Non Compliant | BOTH | Downgrade detected, keep both |

## Expected Results (Merge Mode)

| Action | Count | Examples |
|--------|-------|----------|
| INSERT | 9 | New Patient Alice, Bob, Carol (new patients) |
| UPDATE | 4 | Smith (Not Addressed → Compliant), Miller (Not Addressed → Compliant) |
| SKIP | 5 | Wilson (both compliant), Jones (both non-compliant), Johnson (blank import) |
| BOTH | 2 | Brown (downgrade), Wright (downgrade) |
| DELETE | 0 | N/A (only in Replace mode) |
| **Total** | **20** | |

## Test Data Details

### Case 1: INSERT (New patient+measure)

| Patient | Measure | Import Value |
|---------|---------|--------------|
| New Patient, Alice | AWV | Compliant |
| New Patient, Alice | Hypertension | Compliant |
| New Patient, Bob | Breast Cancer | Compliant |
| New Patient, Bob | Colon Cancer | Compliant |
| New Patient, Carol | All measures | Compliant |

### Case 2: SKIP (Old exists, new blank)

| Patient | Measure | DB Status | Import Value |
|---------|---------|-----------|--------------|
| Johnson, Mary | AWV | Called to schedule | (blank) |

### Case 3: UPDATE (Non-compliant → Compliant)

| Patient | Measure | DB Status | Import Value |
|---------|---------|-----------|--------------|
| Smith, John | AWV | Not Addressed | Compliant |
| Miller, Barbara | Breast Cancer | Not Addressed | Compliant |
| Garcia, Linda | AWV | Called to schedule | Compliant |
| Robinson, Ashley | GC/Chlamydia | Contacted | Compliant |

### Case 4: SKIP (Both compliant)

| Patient | Measure | DB Status | Import Value |
|---------|---------|-----------|--------------|
| Wilson, Sarah | Breast Cancer | Completed | Compliant |
| Thomas, James | Colon Cancer | Ordered | Compliant |
| Sanchez, Donald | Hypertension | BP at goal | Compliant |

### Case 5: SKIP (Both non-compliant)

| Patient | Measure | DB Status | Import Value |
|---------|---------|-----------|--------------|
| Jones, Michael | AWV | Declined | Non Compliant |
| Anderson, Karen | Breast Cancer | Declined | Non Compliant |

### Case 6: BOTH (Downgrade - Compliant → Non-compliant)

| Patient | Measure | DB Status | Import Value |
|---------|---------|-----------|--------------|
| Brown, Patricia | AWV | AWV completed | Non Compliant |
| Wright, Steven | Hypertension | Scheduled callback | Non Compliant |

## How to Test

### Manual Testing

1. Reset and reseed the database:
   ```bash
   cd backend
   npx prisma migrate reset --force
   npx tsx prisma/seed.ts
   ```

2. Start the servers:
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

3. Go to http://localhost:5178/import-test

4. Upload `merge-test-cases.csv`

5. Select **Merge Mode** and click **Preview Import**

6. Verify the summary:
   - Inserts: 9
   - Updates: 4
   - Skips: 5
   - Duplicates (BOTH): 2
   - Deletes: 0

### Automated Testing

Run the merge logic integration tests:
```bash
cd backend
npm test -- --testPathPatterns="mergeLogic"
```

Expected: 12 tests passing

## Notes

- Status values in CSV: "Compliant" or "Non Compliant" or blank
- Blank values → SKIP (keep existing)
- Status categorization:
  - **Compliant**: completed, at goal, confirmed, scheduled, ordered
  - **Non-compliant**: not addressed, not at goal, declined, invalid, resolved, discussed, unnecessary
- Date format: MM/DD/YYYY (e.g., 01/15/1955)
