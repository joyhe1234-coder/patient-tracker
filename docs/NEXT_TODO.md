# Next Implementation Requirements

## 1. Duplicate Detection Rule (Changed)

**Current behavior:** Duplicate = same patient (name + DOB)

**New behavior:** Duplicate = same patient (name + DOB) + same requestType + same qualityMeasure

**Duplicate check conditions:**
- Only perform duplicate check when **ALL** of these fields are non-null:
  - Patient name
  - Date of birth
  - Request type
  - Quality measure
- If **any** of requestType or qualityMeasure is null/empty → **skip duplicate check** (not a duplicate)

---

## 2. Schema Changes

Make these fields **nullable**:

| Field | Previous | New |
|-------|----------|-----|
| requestType | Required | Nullable |
| qualityMeasure | Required | Nullable |
| measureStatus | Required (default: "Not Addressed") | Nullable |

---

## 3. Add New Row ("+" button)

**Modal collects:** Member Name, DOB only (no request type, no quality measure)

**Created row has:**
- requestType = null (user selects in grid)
- qualityMeasure = null (user selects in grid)
- measureStatus = null (or default)

**No duplicate check** when creating (since requestType/qualityMeasure are null)

---

## 4. New Row UX

When a new row is created:
1. Insert at **top** of grid
2. Clear/freeze sort order
3. Auto-select the new row
4. Start editing the requestType cell immediately

---

## 5. Duplicate Patient Function (NEW)

**Purpose:** Copy an existing patient's info to create a new row

**Trigger:** Button/action on currently selected row

**Copies:**
- Member Name
- Date of Birth
- Address
- Telephone

**Does NOT copy:**
- Request Type (set to null)
- Quality Measure (set to null)
- Status, dates, tracking fields, etc.

**Position:** Insert new row **below** the current/selected row

**Duplicate check:** Same rules as above (no check since requestType/qualityMeasure are null)
