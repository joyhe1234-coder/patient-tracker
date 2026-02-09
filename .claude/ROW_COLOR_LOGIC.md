# Row Color Logic — Complete Reference

> **Purpose:** Comprehensive documentation of every use case, rule, and code path that determines row background color in the patient grid. Use this to identify cascading logic issues.

---

## 1. Color Palette

| Color | CSS Class | Hex | Filter Chip Label | Meaning |
|-------|-----------|-----|-------------------|---------|
| **White** | `row-status-white` | `#FFFFFF` | Not Addressed | Default — no status set, or status not in any category |
| **Yellow** | `row-status-yellow` | `#FFF9E6` | Contacted | Patient contacted/discussion phase |
| **Blue** | `row-status-blue` | `#CCE5FF` | In Progress | Scheduled, ordered, referral, in-flight work |
| **Green** | `row-status-green` | `#D4EDDA` | Completed | Measure completed, goal achieved, confirmed |
| **Purple** | `row-status-purple` | `#E5D9F2` | Declined | Patient declined, contraindicated |
| **Orange** | `row-status-orange` | `#FFE8CC` | Resolved | Chronic diagnosis resolved/invalid |
| **Gray** | `row-status-gray` | `#E9EBF3` | N/A | No longer applicable, screening unnecessary |
| **Red** | `row-status-overdue` | `#FFCDD2` | Overdue | Due date has passed — **overrides** status color |
| **Orange stripe** | `row-status-duplicate` | `4px solid #F97316` | Duplicates | Left border — **additive**, combines with any status color |

**CSS file:** `frontend/src/index.css:24-33`

---

## 2. Color Priority Rules

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 (additive): Duplicate check                        │
│  row.isDuplicate === true → add orange left border           │
│  (combines with whatever background color is applied)        │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2 (exclusive): Overdue check                         │
│  dueDate < today AND status NOT in {purple, gray, orange}   │
│  → RED background (overrides all status-based colors)        │
├─────────────────────────────────────────────────────────────┤
│  LAYER 3 (exclusive): Status-based color                    │
│  measureStatus matched against status arrays                 │
│  gray → purple → green → blue → yellow → orange → white     │
│  (first match wins, but in AG Grid all rules are evaluated   │
│   independently — each rule checks !isOverdue first)         │
└─────────────────────────────────────────────────────────────┘
```

**Implementation:** `PatientGrid.tsx:925-947` — AG Grid `rowClassRules` object. Each rule is a function that returns `true/false`. Multiple CSS classes can be applied simultaneously (duplicate + color).

---

## 3. Complete Status → Color Mapping

### WHITE — Default / Not Addressed
| Status | Quality Measure(s) |
|--------|-------------------|
| `Not Addressed` | All 13 quality measures |
| `null` / empty | Any (new row, cleared field) |
| Any unrecognized string | Fallback |

### YELLOW — Contacted / Discussion
| Status | Quality Measure(s) |
|--------|-------------------|
| `Patient called to schedule AWV` | Annual Wellness Visit |
| `Diabetic eye exam discussed` | Diabetic Eye Exam |
| `Screening discussed` | Colon Cancer, Breast Cancer, Cervical Cancer |
| `Patient contacted for screening` | GC/Chlamydia, Diabetic Nephropathy |
| `Vaccination discussed` | Vaccination |

### BLUE — In Progress / Scheduled / Ordered
| Status | Quality Measure(s) |
|--------|-------------------|
| `AWV scheduled` | Annual Wellness Visit |
| `Will call later to schedule` | Annual Wellness Visit |
| `Diabetic eye exam scheduled` | Diabetic Eye Exam |
| `Diabetic eye exam referral made` | Diabetic Eye Exam |
| `Obtaining outside records` | Diabetic Eye Exam, Colon Cancer, Breast Cancer, Cervical Cancer |
| `Colon cancer screening ordered` | Colon Cancer Screening |
| `Screening test ordered` | Breast Cancer Screening |
| `Screening appt made` | Cervical Cancer Screening |
| `Test ordered` | GC/Chlamydia Screening |
| `Urine microalbumin ordered` | Diabetic Nephropathy |
| `Appointment scheduled` | Hypertension Management |
| `Scheduled call back - BP not at goal` | Hypertension Management |
| `Scheduled call back - BP at goal` | Hypertension Management |
| `ACE/ARB prescribed` | ACE/ARB in DM or CAD |
| `Vaccination scheduled` | Vaccination |
| `HgbA1c ordered` | Diabetes Control |
| `HgbA1c NOT at goal` | Diabetes Control |
| `Lab ordered` | Annual Serum K&Cr |

### GREEN — Completed / At Goal
| Status | Quality Measure(s) |
|--------|-------------------|
| `AWV completed` | Annual Wellness Visit |
| `Diabetic eye exam completed` | Diabetic Eye Exam |
| `Colon cancer screening completed` | Colon Cancer Screening |
| `Screening test completed` | Breast Cancer Screening |
| `Screening completed` | Cervical Cancer Screening |
| `GC/Clamydia screening completed` | GC/Chlamydia Screening |
| `Urine microalbumin completed` | Diabetic Nephropathy |
| `Blood pressure at goal` | Hypertension Management |
| `Patient on ACE/ARB` | ACE/ARB in DM or CAD |
| `Vaccination completed` | Vaccination |
| `HgbA1c at goal` | Diabetes Control |
| `Lab completed` | Annual Serum K&Cr |
| `Chronic diagnosis confirmed` | Chronic Diagnosis Code |

### PURPLE — Declined / Contraindicated
| Status | Quality Measure(s) |
|--------|-------------------|
| `Patient declined AWV` | Annual Wellness Visit |
| `Patient declined` | Diabetic Eye Exam, Cervical Cancer, ACE/ARB, Vaccination, Diabetes Control, Annual Serum K&Cr |
| `Patient declined screening` | Colon Cancer, Breast Cancer, GC/Chlamydia, Diabetic Nephropathy |
| `Declined BP control` | Hypertension Management |
| `Contraindicated` | ACE/ARB in DM or CAD |

### ORANGE / GREEN / RED — Chronic DX Resolved / Invalid (cascading by Tracking #1)

These two statuses have **conditional color logic** based on the Tracking #1 value:

| Status | Tracking #1 | Due Date | Color | Why |
|--------|-------------|----------|-------|-----|
| `Chronic diagnosis resolved` | `Attestation sent` | _(any)_ | **GREEN** | Attestation complete — resolved |
| `Chronic diagnosis resolved` | `Attestation not sent` | not passed | **ORANGE** | Pending attestation, still within deadline |
| `Chronic diagnosis resolved` | `Attestation not sent` | passed | **RED** | Attestation overdue |
| `Chronic diagnosis resolved` | _(null/empty)_ | not passed | **ORANGE** | No attestation yet, still within deadline |
| `Chronic diagnosis resolved` | _(null/empty)_ | passed | **RED** | Attestation overdue |
| `Chronic diagnosis invalid` | `Attestation sent` | _(any)_ | **GREEN** | Attestation complete — resolved |
| `Chronic diagnosis invalid` | `Attestation not sent` | not passed | **ORANGE** | Pending attestation, still within deadline |
| `Chronic diagnosis invalid` | `Attestation not sent` | passed | **RED** | Attestation overdue |
| `Chronic diagnosis invalid` | _(null/empty)_ | not passed | **ORANGE** | No attestation yet, still within deadline |
| `Chronic diagnosis invalid` | _(null/empty)_ | passed | **RED** | Attestation overdue |

**Summary rule for `Chronic diagnosis resolved` / `Chronic diagnosis invalid`:**
1. If `Tracking #1 = "Attestation sent"` → **GREEN** (always, regardless of due date)
2. Else if `dueDate < today` → **RED** (overdue — attestation not sent and deadline passed)
3. Else → **ORANGE** (pending attestation, deadline not yet passed)

> **FIXED:** Previously orange statuses were blanket-excluded from overdue and had no tracking1-based color override. Fixed Feb 7, 2026 (BUG-4, BUG-5).

### GRAY — N/A / Unnecessary
| Status | Quality Measure(s) |
|--------|-------------------|
| `No longer applicable` | All 13 quality measures |
| `Screening unnecessary` | Colon Cancer, Breast Cancer, Cervical Cancer |

---

## 4. RED (Overdue) — Override Logic

**Condition:** `dueDate < today` (UTC midnight comparison)

**Implementation:** `PatientGrid.tsx:901-923`

### Overdue APPLIES to:
| Color Category | Example Statuses | Why |
|---------------|-----------------|-----|
| **White** | `Not Addressed`, null | Unaddressed + past due = overdue |
| **Yellow** | `Patient called to schedule AWV` | Contacted but not resolved in time |
| **Blue** | `AWV scheduled`, `HgbA1c ordered` | Scheduled/ordered but past due |
| **Green** | `AWV completed`, `Lab completed` | Completed but annual renewal is past due |

### Overdue DOES NOT apply to (never turns red):
| Color Category | Example Statuses | Why |
|---------------|-----------------|-----|
| **Purple** | `Patient declined`, `Contraindicated` | Patient opted out — no action expected |
| **Gray** | `No longer applicable`, `Screening unnecessary` | Measure not relevant |
| **Chronic DX + Attestation sent** | `Chronic diagnosis resolved/invalid` with Tracking #1 = `Attestation sent` | Attestation complete — no follow-up expected |

### Overdue CONDITIONALLY applies to:
| Color Category | Condition | Result |
|---------------|-----------|--------|
| **Chronic DX + Attestation NOT sent** | `Chronic diagnosis resolved/invalid` with Tracking #1 != `Attestation sent` AND `dueDate < today` | **RED** — attestation overdue |

> **FIXED:** Previously all orange statuses were blanket-excluded from overdue. Now only excluded when `Tracking #1 = "Attestation sent"`. Fixed Feb 7, 2026 (BUG-4, BUG-5).

### How dueDate is calculated:
1. User sets `statusDate` (manually)
2. Backend calculates `timeIntervalDays` based on:
   - Special tracking values ("In N Month(s)", "N month(s)", "Call every N wks")
   - `DueDayRule` database lookup (status + tracking1 combination)
   - `MeasureStatus.baseDueDays` fallback
3. `dueDate = statusDate + timeIntervalDays`
4. User can manually override `timeIntervalDays` (except for TIME_PERIOD_DROPDOWN_STATUSES)

**Backend:** `data.routes.ts:386-442`, `dueDateCalculator.ts`

---

## 5. Duplicate Detection (Orange Stripe)

**Condition:** `row.isDuplicate === true`

**Definition:** 2+ rows for the same patient with identical `requestType` AND `qualityMeasure`

**Skip check:** If either `requestType` or `qualityMeasure` is null/empty → never flagged as duplicate

**Visual:** 4px solid orange left border (`#F97316`) — additive, combines with any background color

**Backend:** `duplicateDetector.ts` — `updateDuplicateFlags()` called after every create/update/delete

---

## 6. Cascading Logic — What Triggers Color Changes

### Use Case 1: User changes `measureStatus`
```
measureStatus changes → row color changes immediately
                     → statusDate, tracking1/2/3, dueDate, timeIntervalDays all cleared to null
                     → overdue check no longer applies (dueDate = null)
                     → color determined by new measureStatus value alone
```

**Example:** Change from "AWV scheduled" (blue) → "AWV completed" (green)
- Blue → Green instantly
- StatusDate cleared → no dueDate → no overdue possible until statusDate is re-entered

### Use Case 2: User changes `qualityMeasure`
```
qualityMeasure changes → measureStatus cleared to null → color becomes WHITE
                       → statusDate, tracking1/2/3, dueDate, timeIntervalDays all cleared
```

### Use Case 3: User changes `requestType`
```
requestType changes → qualityMeasure auto-filled (if single-option) or cleared
                   → measureStatus cleared to null → color becomes WHITE
                   → all downstream fields cleared
```

**Special:** AWV auto-fills qualityMeasure="Annual Wellness Visit", Chronic DX auto-fills "Chronic Diagnosis Code"

### Use Case 4: User changes `statusDate`
```
statusDate changes → backend recalculates dueDate (statusDate + timeIntervalDays)
                  → if new dueDate < today → row turns RED (overdue)
                  → if new dueDate >= today → row stays its status color
                  → measureStatus unchanged → status color unchanged
```

### Use Case 5: User changes `tracking1` or `tracking2`
```
tracking changes → backend recalculates timeIntervalDays and dueDate
                → dueDate may change → overdue status may change
                → measureStatus unchanged → status color unchanged
                → but RED override may appear or disappear

SPECIAL CASE — Chronic DX (resolved/invalid) + Tracking #1:
  "Attestation sent"     → color becomes GREEN (regardless of dueDate)
  "Attestation not sent" → color stays ORANGE (or RED if dueDate passed)
  null/cleared           → color stays ORANGE (or RED if dueDate passed)
```

### Use Case 6: User changes `timeIntervalDays` manually
```
timeIntervalDays changes → backend recalculates dueDate
                        → overdue status may change
                        → NOT allowed for TIME_PERIOD_DROPDOWN_STATUSES:
                          - Screening discussed
                          - HgbA1c ordered / at goal / NOT at goal
                          - Scheduled call back - BP not at goal / at goal
```

### Use Case 7: User creates new row (Add Row)
```
New row → all fields null → measureStatus = null → WHITE
       → dueDate = null → no overdue
       → isDuplicate = false → no stripe
```

### Use Case 8: User duplicates a row
```
Duplicate row → copies patient data only (name, DOB, phone, address)
             → measure fields all null → WHITE
             → isDuplicate flag recalculated for original + new row
```

### Use Case 9: CSV Import sets measureStatus
```
Import → backend sets measureStatus from CSV mapping
      → row color determined by imported status value
      → dueDate may or may not be set from import
      → duplicate flags recalculated post-import
```

### Use Case 10: Row becomes duplicate after edit
```
Edit requestType or qualityMeasure → backend checks for duplicate
  → If duplicate exists → 409 error → fields reset to null → WHITE + no stripe
  → If not duplicate → updateDuplicateFlags() recalculates for all rows of that patient
  → Previously-duplicate rows may lose stripe if no longer duplicated
```

---

## 7. Code Locations Summary

| What | File | Lines |
|------|------|-------|
| CSS color classes | `frontend/src/index.css` | 24-33 |
| Status arrays (gray, purple, green, blue, yellow, orange) | `frontend/src/components/grid/PatientGrid.tsx` | 838-899 |
| `isRowOverdue()` function | `PatientGrid.tsx` | 901-923 |
| `rowClassRules` object (AG Grid) | `PatientGrid.tsx` | 925-947 |
| `getRowStatusColor()` (filter counting) | `frontend/src/components/layout/StatusFilterBar.tsx` | 146-187 |
| Filter chip definitions | `StatusFilterBar.tsx` | 17-34 |
| Row count calculation | `frontend/src/pages/MainPage.tsx` | 50-74 |
| Filter application | `MainPage.tsx` | 80-88 |
| Cascading clear (frontend) | `PatientGrid.tsx` | 334-401 |
| Cascading clear + dueDate calc (backend) | `backend/src/routes/data.routes.ts` | 386-442 |
| Due date calculator | `backend/src/services/dueDateCalculator.ts` | entire file |
| Duplicate detector | `backend/src/services/duplicateDetector.ts` | entire file |
| Dropdown config (all valid statuses) | `frontend/src/config/dropdownConfig.ts` | entire file |
| `gridApi.refreshCells()` trigger | `PatientGrid.tsx` | 413 |

---

## 8. Known Duplication / Consistency Risk

**CRITICAL:** The status→color arrays are defined in **TWO places** that must stay in sync:

1. `PatientGrid.tsx:838-899` — Used by AG Grid `rowClassRules` (renders row colors)
2. `StatusFilterBar.tsx:151-156` — Used by `getRowStatusColor()` (counts rows for filter chips)

If a status is added to one but not the other, the filter chip counts will not match the visual row colors.

---

## 9. Edge Cases & Potential Issues

### 9a. Measure status set but NOT in any color array
- Row gets **WHITE** background (default fallback)
- Could happen if: a new status is added to `dropdownConfig.ts` but not to the color arrays
- **Risk:** silent — no error, just wrong color

### 9b. Overdue + Completed (green) row
- A row with "AWV completed" and `dueDate < today` → turns **RED**
- This is intentional: indicates annual renewal is past due
- Comment at `PatientGrid.tsx:903`: "Completed (green) statuses CAN be overdue"

### 9c. Cascading clears measureStatus → color becomes WHITE but grid may not refresh
- Frontend calls `node.setDataValue('measureStatus', null)` during cascade
- Then calls `node.setData(updatedData)` with server response
- Then calls `gridApi.refreshCells()` with `force: true`
- **Potential issue:** If the API call fails, `setDataValue` already changed local data but `refreshCells` may not fire → stale color

### 9d. Filter count vs visual mismatch
- `rowCounts` is computed from `rowData` (React state) via `getRowStatusColor()`
- Visual row color is computed by AG Grid's `rowClassRules` from node data
- After `node.setData()` the grid updates visually, but `rowData` React state is NOT updated (intentionally, to prevent row reordering — see comment at `PatientGrid.tsx:418-421`)
- **Result:** Filter chip counts may be stale until next full data reload

### 9e. Overdue calculation timezone
- Both `PatientGrid.tsx` and `StatusFilterBar.tsx` use UTC midnight comparison
- `dueDate` stored as UTC in database
- If user's local timezone causes `new Date()` to be a different UTC date, edge cases at midnight transitions

---

## Last Updated

February 7, 2026 — Initial comprehensive documentation extracted from codebase
