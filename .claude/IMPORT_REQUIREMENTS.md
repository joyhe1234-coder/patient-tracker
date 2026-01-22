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
| Mapped to existing measures | 42 columns | ✓ Ready |
| Unmapped (no matching measure) | 20 columns | Skip for now |
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
| Quality | ACE/ARB in DM or CAD | 6 |
| Quality | Vaccination | 18 |
| **Total** | | **42** |

### Unmapped Columns (Skip for v3.0.0)

These 20 columns will be skipped during import - no matching quality measure in our system:
- Well-Child Visits (2 columns)
- Child/Adolescent Well-Care (5 columns)
- Medication Review (1 column)
- Functional Status Assessment (1 column)
- Asthma Medication Ratio (4 columns)
- PPC - Prenatal/Postpartum (2 columns)
- Depression Screening (2 columns)
- Pharyngitis Testing (4 columns)

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

### Q2: Status Value Mapping ⚠️ NEXT DECISION NEEDED

**Import values:**
- Compliant
- Non Compliant
- Missing Value (blank)

**Our system has detailed statuses** like:
- AWV scheduled, AWV completed, Patient called to schedule AWV, Patient declined AWV
- Screening ordered, Screening completed, Screening discussed
- etc.

**How should we map import values to measureStatus?**

| Import Value | → measureStatus | Notes |
|--------------|-----------------|-------|
| Compliant | ??? | Need to decide |
| Non Compliant | ??? | Need to decide |
| Missing Value (blank) | (skip row) | Don't create row - Confirmed |

**Options for Compliant:**
- **A. Generic**: Map all to "Completed" (new generic status)
- **B. Measure-Specific**: Map to measure's completion status (e.g., "AWV completed", "Screening completed")
- **C. Simple Flag**: Add `isCompliant` boolean field, ignore detailed status

**Options for Non Compliant:**
- **A. Not Addressed**: Map to "Not Addressed" (existing status)
- **B. Needs Action**: Create new "Needs Action" or "Non Compliant" status
- **C. Blank**: Leave measureStatus null/empty

**Decision:** _______________

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

## Implementation Phases (Suggested)

Once Q2 (Status Mapping) is resolved, we can begin implementation:

1. **Phase 5a: Basic Import**
   - File upload (CSV/Excel)
   - Fixed column mapping
   - Patient data only (no measures)
   - Replace all behavior

2. **Phase 5b: Measure Import**
   - Quality measure columns (42 mapped columns)
   - Status mapping (Compliant/Non Compliant)
   - Validation and error reporting

3. **Phase 5c: Polish**
   - Column mapping UI (if needed)
   - Import preview
   - Progress indicator

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

---

## Last Updated

January 21, 2026
