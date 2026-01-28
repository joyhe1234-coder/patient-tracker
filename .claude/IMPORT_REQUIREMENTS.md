# CSV Import Requirements

This document captures the current requirements and open questions for the CSV Import feature (Phase 5, v3.0.0).

---

## Confirmed Requirements

### Import Behavior
- **User Choice**: User selects import mode before importing:
  - **Replace All**: Delete ALL existing data, then import new records (clean slate)
  - **Merge**: Keep existing data, add new records, update matching records
- **Atomic Operation**: If ANY row fails validation, entire import is aborted (no data changed)
- **Single Physician**: Currently imports all data globally (multi-physician scoping in Phase 11)

### Merge Mode Details (when user selects Merge)
- **Match Key**: Patient identified by memberName + memberDob
- **New Patient**: If patient not found in database → create new patient and measures
- **Existing Patient**: If patient exists → add new measures, update matching measures
- **Measure Match Key**: Patient + requestType + qualityMeasure

#### Merge Logic Matrix

| # | Old Data | New Data (Import) | Action |
|---|----------|-------------------|--------|
| 1 | Does NOT exist | Has value | **Insert new** row |
| 2 | Exists | Missing/blank | **Keep old** (no change) |
| 3 | Non Compliant | Compliant | **Replace** old with new |
| 4 | Compliant | Compliant | **Keep old** (no change) |
| 5 | Non Compliant | Non Compliant | **Keep old** (no change) |
| 6 | Compliant | Non Compliant | **Keep BOTH** - old stays Compliant, insert new as Non Compliant, flag both as duplicate |

**Summary:**
- Insert new data when old doesn't exist
- Skip import when new data is blank
- Replace only when upgrading from Non Compliant → Compliant
- Keep both (flag duplicate) when downgrading from Compliant → Non Compliant

### Duplicate Row Display (Updated)

**Visual Indicator:** Left stripe
- Colored vertical bar (4px) on left edge of row
- Color: Orange (#F97316) or similar warning color
- Row background color still based on measure status (not overridden)

**Filter Chip:** Add "Duplicates" to status filter bar
- Shows count of duplicate rows
- Click to filter grid to show only duplicate rows
- Fits with existing filter chip pattern (All, Not Started, Overdue, etc.)

**Note:** This changes existing duplicate behavior - currently duplicates have yellow background that overrides status color. New behavior preserves status color and uses left stripe instead.

---

### Error Handling
- **Fail-All Strategy**: Validate all rows before any database changes
- **Downloadable Error Report**: CSV/Excel file containing:
  - Row number from original file
  - Original row data
  - Specific error message(s) for each invalid row
- **No Partial Import**: Either all rows import successfully, or nothing changes

### File Format
- Support CSV files
- Support Excel (.xlsx) files
- Wide format: One column per quality measure (pivot style)

### Source Data Structure
- **Patient columns**: Patient, DOB, Age, Sex, MembID, Phone, Address, LOB
- **Quality measure columns**: 62 columns with values: Compliant, Non Compliant, or blank
- **Other**: Has Sticket (Y/N)

See `IMPORT_SPREADSHEET_REFERENCE.md` for complete column listing.

---

## Data Transformation

The import transforms **wide format** (columns) to **long format** (rows):

```
WIDE FORMAT (Spreadsheet):
| Patient | DOB | Eye Exam  | BP Control  | AWV |
|---------|-----|-----------|-------------|-----|
| Smith   | 1/1 | Compliant | Non Compliant |   |

LONG FORMAT (Database):
| memberName | memberDob | requestType | qualityMeasure       | measureStatus |
|------------|-----------|-------------|----------------------|---------------|
| Smith      | 1/1       | Quality     | Diabetic Eye Exam    | ???           |
| Smith      | 1/1       | Quality     | Hypertension Mgmt    | ???           |
(AWV skipped - blank value)
```

---

## Column Mapping Summary

**Mapping completed 2026-01-14.** See `IMPORT_COLUMN_MAPPING.md` for full details.

| Category | Count | Status |
|----------|-------|--------|
| Mapped to existing measures | 36 columns | ✓ Ready |
| Unmapped (no matching measure) | 26 columns | Skip for now |
| **Total quality measure columns** | 62 columns | |

### Mapped Columns by Request Type

| Request Type | Quality Measure | Column Count |
|--------------|-----------------|--------------|
| AWV | Annual Wellness Visit | 1 |
| Screening | Breast Cancer Screening | 3 |
| Screening | Colon Cancer Screening | 3 |
| Screening | Cervical Cancer Screening | 1 |
| Quality | Diabetic Eye Exam | 1 |
| Quality | Diabetes Control | 2 |
| Quality | Diabetic Nephropathy | 3 |
| Quality | GC/Chlamydia Screening | 3 |
| Quality | Hypertension Management | 1 |
| Quality | Vaccination | 18 |
| **Total** | | **36** |

### Unmapped Columns (Skip for v3.0.0)

These 26 columns will be skipped during import - no matching quality measure in our system:
- Statin-related (6 columns) - Cholesterol, Statin Use, Statin Therapy/Adherence
- Well-Child Visits (2 columns)
- Child/Adolescent Well-Care (5 columns)
- Medication Review (1 column)
- Functional Status Assessment (1 column)
- Asthma Medication Ratio (4 columns)
- PPC - Prenatal/Postpartum (2 columns)
- Depression Screening (2 columns)
- Pharyngitis Testing (4 columns)

### App Measures Not in Spreadsheet

These 3 quality measures exist in our app but have no spreadsheet column:
- Chronic DX / Chronic Diagnosis Code
- Quality / ACE/ARB in DM or CAD
- Quality / Annual Serum K&Cr

---

## Resolved Questions

### Q1: Quality Measure Scope ✓

**Decision:** **Option B - Filter Import** (Decided 2026-01-14)

Import only columns that map to our existing 13 quality measures (42 columns).
Skip the 20 unmapped columns for now.

---

### Q3: Request Type Assignment ✓

**Decision:** **Option A - Derive from Measure** (Decided 2026-01-14)

Derive `requestType` from the quality measure column name.
See `IMPORT_COLUMN_MAPPING.md` for complete mapping table.

---

### Q9: Merge Conflict Handling ✓

**Decision:** Custom merge logic based on compliance states (Decided 2026-01-21)

| # | Old Data | New Data (Import) | Action |
|---|----------|-------------------|--------|
| 1 | Does NOT exist | Has value | **Insert new** row |
| 2 | Exists | Missing/blank | **Keep old** (no change) |
| 3 | Non Compliant | Compliant | **Replace** old with new |
| 4 | Compliant | Compliant | **Keep old** (no change) |
| 5 | Non Compliant | Non Compliant | **Keep old** (no change) |
| 6 | Compliant | Non Compliant | **Keep BOTH** - old stays Compliant, insert new as Non Compliant, flag both as duplicate |

---

## Open Questions

### Q2: Status Value Mapping ✓

**Decision:** Measure-specific mapping (Decided 2026-01-22)

| Import Value | → measureStatus | Notes |
|--------------|-----------------|-------|
| Compliant | Measure-specific "completed" status | See table below |
| Non Compliant | "Not Addressed" | All measures |
| Missing Value (blank) | (skip row) | Don't create row |

**Compliant Status Mapping by Quality Measure:**

| Request Type | Quality Measure | Compliant → measureStatus |
|--------------|-----------------|---------------------------|
| AWV | Annual Wellness Visit | AWV completed |
| Screening | Breast Cancer Screening | Screening test completed |
| Screening | Colon Cancer Screening | Colon cancer screening completed |
| Screening | Cervical Cancer Screening | Screening completed |
| Quality | Diabetic Eye Exam | Diabetic eye exam completed |
| Quality | Diabetes Control | HgbA1c at goal |
| Quality | Diabetic Nephropathy | Urine microalbumin completed |
| Quality | GC/Chlamydia Screening | GC/Clamydia screening completed |
| Quality | Hypertension Management | Blood pressure at goal |
| Quality | Vaccination | Vaccination completed |

**Non Compliant:** All measures map to "Not Addressed"

**Configuration Tool:** `/hill-mapping` page allows customizing these mappings and exporting to CSV

---

### Q4: Unmapped Patient Columns

These columns exist in the spreadsheet but not in our schema:

| Column | Current Schema | Options |
|--------|----------------|---------|
| Age | Not stored | A. Ignore (calculate from DOB) |
| Sex | Not stored | A. Ignore / B. Add to schema |
| MembID | Not stored | A. Ignore / B. Add to schema |
| LOB | Not stored | A. Ignore / B. Add to schema |

**Decision:** _______________

---

### Q5: "Has Sticket" Column

**Values:** Y, N

**Questions:**
- What does "Sticket" mean? (Sticker?)
- Is this relevant to track?
- Should we add a field for this?

**Options:**
- **A. Ignore**: Don't import this column
- **B. Add Field**: Add `hasSticker` boolean to Patient or PatientMeasure
- **C. Notes**: Store in notes field

**Decision:** _______________

---

### Q6: Duplicate Measures in Spreadsheet

Some measures have age-range sub-categories that all map to the same quality measure:

**Example - Colorectal Cancer Screening:**
- Colorectal Cancer Screening E (overall)
- Colorectal Cancer Screening 45-50 Years E
- Colorectal Cancer Screening 51-75 Years E

All 3 columns → Screening / Colon Cancer Screening

**How should we handle multiple columns mapping to the same measure?**

**Options:**
- **A. Import All**: Create separate rows for each (3 rows for same patient)
- **B. Import First Non-Blank**: Only import one row per measure per patient
- **C. Import Overall Only**: Only import the "E" or "Overall" version, skip age-specific

**Decision:** _______________

---

### Q7: Column Mapping UI

**Should users be able to customize column mapping?**

**Options:**
- **A. Fixed Mapping**: Hardcode column positions/names, no UI
- **B. Auto-Detect**: Auto-match by column header names, allow manual override
- **C. Full Mapping UI**: User maps each column manually

**Decision:** _______________

---

### Q8: Date Fields

**Import only has compliance status, no dates.**

Our system tracks:
- statusDate (when status was recorded)
- dueDate (when follow-up is due)

**What dates should imported rows have?**

**Options:**
- **A. Import Date**: Set statusDate to import date, calculate dueDate from rules
- **B. Null**: Leave dates empty, user fills in manually
- **C. Prompt**: Ask user for a "status as of" date during import

**Decision:** _______________

---

## Multi-Healthcare System Support

Different healthcare systems (Hill, Kaiser, etc.) have different CSV formats. The import feature supports multiple systems via config files.

### Config File Structure

```
backend/src/config/import/
├── systems.json        # Registry of healthcare systems
├── hill.json           # Hill Healthcare mapping
└── [other].json        # Other system mappings
```

### systems.json - Master Registry

```json
{
  "systems": {
    "hill": { "name": "Hill Healthcare", "configFile": "hill.json" },
    "kaiser": { "name": "Kaiser Permanente", "configFile": "kaiser.json" }
  },
  "default": "hill"
}
```

### System Config File (e.g., hill.json)

Each system config includes:
- **patientColumns**: Map CSV headers → patient fields
- **measureColumns**: Map CSV headers → requestType + qualityMeasure
- **statusMapping**: Map Compliant/Non Compliant → measureStatus
- **skipColumns**: Columns to ignore

```json
{
  "name": "Hill Healthcare",
  "version": "1.0",

  "patientColumns": {
    "Patient": "memberName",
    "DOB": "memberDob",
    "Phone": "memberTelephone",
    "Address": "memberAddress"
  },

  "measureColumns": {
    "Eye Exam": { "requestType": "Quality", "qualityMeasure": "Diabetic Eye Exam" },
    "BP Control": { "requestType": "Quality", "qualityMeasure": "Hypertension Management" },
    "Annual Wellness Visit": { "requestType": "AWV", "qualityMeasure": "Annual Wellness Visit" }
  },

  "statusMapping": {
    "Diabetic Eye Exam": { "compliant": "Diabetic eye exam completed", "nonCompliant": "Not Addressed" },
    "Hypertension Management": { "compliant": "Blood pressure at goal", "nonCompliant": "Not Addressed" }
  },

  "skipColumns": ["Age", "Sex", "MembID", "LOB", "Has Sticket"]
}
```

### Config Storage Decision

**Decision:** Option D - Config files on server (Decided 2026-01-22)

Config files stored in `backend/src/config/import/`. Once defined, mappings rarely change.

---

## Preview Before Commit

Both Replace All and Merge modes show a preview before applying changes. User must approve the preview to execute the import.

### Preview Strategy

**Decision:** Option D - In-Memory Diff (Decided 2026-01-22)

1. Process import file entirely in memory
2. Load current data from DB into memory
3. Calculate diff (inserts, updates, skips, deletes, duplicates)
4. Return diff as preview (no DB changes yet)
5. User approves → Apply diff to DB
6. User rejects → Discard (nothing to clean up)

### Import Flow

```
1. User selects healthcare system from dropdown
2. User selects mode (Replace All / Merge) - Replace All is first option
3. User uploads CSV/Excel file
4. System generates preview (no DB changes)
   - Validation errors → Show errors, block preview
   - Valid → Show preview page
5. Preview page shows:
   - Summary counts (insert, update, skip, delete, duplicate)
   - Table of changes with action, patient, measure, old/new status
6. User approves → Execute import (atomic transaction)
   User rejects → Cancel, no changes made
7. Show results
```

### Preview UI

```
┌──────────────────────────────────────────────────────────────┐
│  Import Preview - Hill Healthcare (Merge Mode)              │
├──────────────────────────────────────────────────────────────┤
│  Summary:                                                    │
│  ┌────────────────────────────────────────────────────┐     │
│  │  🟢 Insert:  142 new rows                          │     │
│  │  🔵 Update:   38 rows (Non Compliant → Compliant)  │     │
│  │  ⚪ Skip:     87 rows (no change)                  │     │
│  │  🟠 Both:     12 rows (keep old + insert new)      │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│  Preview Changes:              Filter: [All Actions ▼]       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Action │ Patient      │ Measure          │ New Status│   │
│  ├────────┼──────────────┼──────────────────┼───────────┤   │
│  │ INSERT │ John Smith   │ Diabetic Eye Exam│ Completed │   │
│  │ UPDATE │ Bob Wilson   │ BP Control       │ At Goal   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [Cancel - No Changes]              [Approve & Import]       │
└──────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  /import-mapping        │  /import                              │
│  - Configure mappings   │  - Select system                      │
│  - Column headers       │  - Select mode (Replace/Merge)        │
│  - Status mappings      │  - Upload file                        │
│  - Export/Import JSON   │  - Preview page (approve/reject)      │
│                         │  - Results display                    │
└────────────┬────────────┴──────────────────┬────────────────────┘
             │                               │
             ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND API                              │
├─────────────────────────────────────────────────────────────────┤
│  GET  /api/import/systems         - List available systems      │
│  GET  /api/import/systems/:id     - Get system config           │
│  POST /api/import/preview         - Generate preview (no save)  │
│  POST /api/import/execute         - Apply approved changes      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module Breakdown

| # | Module | Location | Purpose |
|---|--------|----------|---------|
| 1 | Config Loader | Backend | Load system config files |
| 2 | File Parser | Backend | Parse CSV/Excel to raw rows |
| 3 | Column Mapper | Backend | Map headers using config |
| 4 | Data Transformer | Backend | Wide→Long, apply status mapping |
| 5 | Validator | Backend | Validate all rows, collect errors |
| 6 | Diff Calculator | Backend | Compare import vs DB, generate diff |
| 7 | Preview Cache | Backend | Store diff with 30-min TTL |
| 8 | Import Executor | Backend | Apply diff to DB (atomic) |
| 9 | Error Reporter | Backend | Generate error CSV |
| 10 | Import UI | Frontend | Upload, mode select, preview, results |
| 11 | Mapping UI | Frontend | Configure system mappings |

---

## Files to Create

| Location | File | Purpose |
|----------|------|---------|
| Backend | `src/config/import/systems.json` | System registry |
| Backend | `src/config/import/hill.json` | Hill mapping config |
| Backend | `src/services/import/configLoader.ts` | Load config files |
| Backend | `src/services/import/fileParser.ts` | Parse CSV/Excel |
| Backend | `src/services/import/columnMapper.ts` | Map columns |
| Backend | `src/services/import/dataTransformer.ts` | Wide→Long |
| Backend | `src/services/import/validator.ts` | Validate rows |
| Backend | `src/services/import/diffCalculator.ts` | Generate diff |
| Backend | `src/services/import/previewCache.ts` | Cache management |
| Backend | `src/services/import/importExecutor.ts` | DB operations |
| Backend | `src/services/import/errorReporter.ts` | Error CSV |
| Backend | `src/routes/import.ts` | API routes |
| Frontend | `src/pages/ImportPage.tsx` | Upload + mode select |
| Frontend | `src/pages/ImportPreviewPage.tsx` | Preview + approve |
| Frontend | `src/pages/ImportMappingPage.tsx` | Mapping config UI |
| Frontend | `src/components/import/DiffTable.tsx` | Preview diff table |
| Frontend | `src/components/import/ImportSummary.tsx` | Summary cards |

---

## Implementation Phases

| Phase | Scope | Deliverable |
|-------|-------|-------------|
| **5a** | Config files + Config Loader | Create hill.json, systems.json, loader service |
| **5b** | File Parser | Parse CSV/Excel, extract headers and rows |
| **5c** | Column Mapper + Transformer | Map columns, wide→long, status mapping |
| **5d** | Validator + Error Reporter | Validate all, generate error CSV |
| **5e** | Diff Calculator | Compare import vs DB, generate diff |
| **5f** | Preview Cache | Store/retrieve diff with TTL |
| **5g** | Import Executor | Apply diff to DB (Replace All + Merge) |
| **5h** | Preview API | POST /preview endpoint |
| **5i** | Execute API | POST /execute endpoint |
| **5j** | Import UI - Upload | File upload, system/mode selection |
| **5k** | Import UI - Preview | Preview page with diff table |
| **5l** | Import UI - Results | Success/error display |
| **5m** | Mapping UI | Update /import-mapping page |

---

## API Contracts

### POST /api/import/preview

**Request:**
```typescript
{
  systemId: string;           // "hill"
  mode: "replace" | "merge";
  file: File;                 // multipart/form-data
}
```

**Response (Success):**
```typescript
{
  success: true;
  previewId: string;          // "abc-123-def"
  summary: {
    inserts: number;
    updates: number;
    skips: number;
    duplicates: number;
    deletes: number;
  };
  changes: Array<{
    action: "INSERT" | "UPDATE" | "SKIP" | "BOTH" | "DELETE";
    patient: string;
    measure: string;
    oldStatus: string | null;
    newStatus: string;
  }>;
  totalChanges: number;
  expiresAt: string;          // ISO date
}
```

**Response (Validation Error):**
```typescript
{
  success: false;
  error: "VALIDATION_FAILED";
  errors: Array<{
    row: number;
    field: string;
    message: string;
    value: string;
  }>;
  errorReportUrl: string;     // Download link
}
```

### POST /api/import/execute

**Request:**
```typescript
{
  previewId: string;          // From preview response
}
```

**Response:**
```typescript
{
  success: true;
  created: number;
  updated: number;
  skipped: number;
  duplicates: number;
  deleted: number;
}
```

---

## Related Documents

- `IMPORT_COLUMN_MAPPING.md` - Complete column-to-field mapping table
- `IMPORT_SPREADSHEET_REFERENCE.md` - Complete column listing with possible values
- `IMPLEMENTATION_STATUS.md` - Phase 5 status tracking
- `TODO.md` - Task tracking

---

## Decisions Log

| Date | Question | Decision |
|------|----------|----------|
| 2026-01-14 | Q1: Quality Measure Scope | Option B - Filter to existing 13 measures (42 columns) |
| 2026-01-14 | Q3: Request Type Assignment | Option A - Derive from measure |
| 2026-01-14 | Column Mapping | Completed - see IMPORT_COLUMN_MAPPING.md |
| 2026-01-14 | Import Behavior | User choice: Replace All OR Merge |
| 2026-01-21 | Merge Logic | Matrix defined - see Merge Mode Details section |
| 2026-01-21 | Duplicate Visual | Left stripe (not background color) + filter chip |
| 2026-01-22 | Q2: Status Value Mapping | Measure-specific mapping - see Q2 section |
| 2026-01-22 | Config Storage | Option D - Config files on server |
| 2026-01-22 | Preview Strategy | Option D - In-Memory Diff before commit |
| 2026-01-22 | Multi-System Support | Healthcare system selector with per-system config |
| 2026-01-22 | Implementation Plan | 13 phases defined with module breakdown |

---

## Last Updated

January 22, 2026
