# Adding a New Quality Measure - Complete Checklist

## Overview

This document lists ALL files and configurations that need to be updated when adding a new quality measure to ensure no bugs are introduced and all features work correctly.

---

## Required Configuration Updates

### 1. Database Seed Data
**File:** `backend/prisma/seed.ts`

Add the new quality measure to the appropriate request type:
- [ ] Add to `qualityMeasures` array under the correct request type
- [ ] Define all measure statuses (typically 5-8 statuses)
- [ ] Add tracking options if needed (Tracking #1, #2, #3 dropdowns)
- [ ] Add due day rules (base days and tracking-specific overrides)
- [ ] Add conditional formats for row coloring (if new statuses)

### 2. Frontend Dropdown Config
**File:** `frontend/src/config/dropdownConfig.ts`

- [ ] Add quality measure to `REQUEST_TYPE_TO_QUALITY_MEASURE` mapping
- [ ] Add status array to `QUALITY_MEASURE_TO_STATUS` mapping
- [ ] Add tracking options to `STATUS_TO_TRACKING1` mapping (if applicable)

### 3. Import Validator
**File:** `backend/src/services/import/validator.ts`

- [ ] Add quality measure to `VALID_QUALITY_MEASURES` under correct request type

### 4. Import Configuration (if importing from external source)
**File:** `backend/src/config/import/hill.json` (or other system config)

- [ ] Add column mapping in `measureColumns` section
- [ ] Add status mapping in `statusMapping` section (compliant/nonCompliant)
- [ ] Remove from `skipColumns` if previously skipped

---

## Code Updates for Special Logic

### 5. Row Coloring (PatientGrid)
**File:** `frontend/src/components/grid/PatientGrid.tsx` (lines 784-846)

Add new statuses to appropriate color arrays:
- [ ] `grayStatuses` - N/A statuses
- [ ] `purpleStatuses` - Declined statuses
- [ ] `greenStatuses` - Completed/success statuses
- [ ] `blueStatuses` - In-progress/scheduled statuses
- [ ] `yellowStatuses` - Contacted/discussed statuses
- [ ] `orangeStatuses` - Resolved statuses

### 6. Status Filter Bar
**File:** `frontend/src/components/layout/StatusFilterBar.tsx`

- [ ] Update `getRowStatusColor()` if new status categories needed (lines 84-125)

### 7. Time Period Dropdown Statuses
**File:** `frontend/src/components/grid/PatientGrid.tsx` (lines 17-24)

- [ ] Add to `TIME_PERIOD_DROPDOWN_STATUSES` if interval is dropdown-controlled

**File:** `backend/src/routes/data.routes.ts` (line 175)

- [ ] Add to backend `TIME_PERIOD_DROPDOWN_STATUSES` array

### 8. Due Date Calculator (if special logic needed)
**File:** `backend/src/services/dueDateCalculator.ts`

- [ ] Add special calculation rules if not covered by config-based approach

### 9. Status Date Prompt Resolver
**File:** `backend/src/services/statusDatePromptResolver.ts`

- [ ] Add fallback prompts in `getDefaultDatePrompt()` for new statuses

### 10. Tracking #1 Prompt Text
**File:** `frontend/src/components/grid/PatientGrid.tsx` (lines 606-635)

- [ ] Add prompt text logic if new tracking dropdown types needed

---

## Testing Requirements

### 11. Cypress E2E Tests
**File:** `frontend/cypress/e2e/cascading-dropdowns.cy.ts`

- [ ] Add test for quality measure dropdown options count
- [ ] Add test for measure status options
- [ ] Add test for tracking options (if applicable)
- [ ] Add test for row coloring
- [ ] Add test for prompt text

### 12. Backend Unit Tests
**File:** `backend/src/services/__tests__/` (create if needed)

- [ ] Test due date calculation for new statuses
- [ ] Test duplicate detection with new measure

---

## Verification Steps

After adding a new quality measure:

1. **Database Reset:**
   ```bash
   cd backend && npx prisma migrate reset --force
   ```

2. **Run Backend Tests:**
   ```bash
   cd backend && npm test
   ```

3. **Run E2E Tests:**
   ```bash
   cd frontend && npx cypress run
   ```

4. **Manual Verification:**
   - [ ] Request Type dropdown shows correct quality measures
   - [ ] Quality Measure dropdown filtered correctly
   - [ ] Measure Status dropdown shows all statuses
   - [ ] Tracking dropdowns appear when expected
   - [ ] Row colors change correctly based on status
   - [ ] Due dates calculate correctly
   - [ ] Status date prompts appear correctly
   - [ ] Import preview shows new measure correctly
   - [ ] Duplicate detection works

---

## File Summary Table

| Priority | File | What to Update |
|----------|------|----------------|
| **Required** | `backend/prisma/seed.ts` | Quality measure, statuses, tracking, due days |
| **Required** | `frontend/src/config/dropdownConfig.ts` | Dropdown mappings |
| **Required** | `backend/src/services/import/validator.ts` | VALID_QUALITY_MEASURES |
| **If Importing** | `backend/src/config/import/hill.json` | Column + status mapping |
| **For Colors** | `frontend/src/components/grid/PatientGrid.tsx` | Status color arrays |
| **For Colors** | `frontend/src/components/layout/StatusFilterBar.tsx` | getRowStatusColor() |
| **For Dropdowns** | `frontend/src/components/grid/PatientGrid.tsx` | TIME_PERIOD_DROPDOWN_STATUSES |
| **For Dropdowns** | `backend/src/routes/data.routes.ts` | TIME_PERIOD_DROPDOWN_STATUSES |
| **For Due Dates** | `backend/src/services/dueDateCalculator.ts` | Special calculation logic |
| **For Prompts** | `backend/src/services/statusDatePromptResolver.ts` | Date prompt fallbacks |
| **For Tests** | `frontend/cypress/e2e/cascading-dropdowns.cy.ts` | E2E test coverage |

---

## Example: Adding "Depression Screening" Quality Measure

### Step 1: seed.ts
```typescript
// Under 'Quality' request type qualityMeasures array:
{
  code: 'Depression Screening',
  label: 'Depression Screening',
  allowDuplicates: false,
  statuses: [
    { code: 'Not Addressed', label: 'Not Addressed', baseDueDays: null },
    { code: 'PHQ-2 completed', label: 'PHQ-2 completed', baseDueDays: 365 },
    { code: 'PHQ-9 completed', label: 'PHQ-9 completed', baseDueDays: 365 },
    { code: 'Screening discussed', label: 'Screening discussed', baseDueDays: 30 },
    { code: 'Patient declined screening', label: 'Patient declined screening', baseDueDays: null },
    { code: 'No longer applicable', label: 'No longer applicable', baseDueDays: null },
  ]
}
```

### Step 2: dropdownConfig.ts
```typescript
// REQUEST_TYPE_TO_QUALITY_MEASURE
'Quality': [...existing, 'Depression Screening'],

// QUALITY_MEASURE_TO_STATUS
'Depression Screening': [
  'Not Addressed',
  'PHQ-2 completed',
  'PHQ-9 completed',
  'Screening discussed',
  'Patient declined screening',
  'No longer applicable',
],
```

### Step 3: validator.ts
```typescript
'Quality': [...existing, 'Depression Screening'],
```

### Step 4: PatientGrid.tsx row colors
```typescript
greenStatuses: [...existing, 'PHQ-2 completed', 'PHQ-9 completed'],
yellowStatuses: [...existing], // 'Screening discussed' already included
purpleStatuses: [...existing, 'Patient declined screening'],
grayStatuses: [...existing], // 'No longer applicable' already included
```

---

*Last Updated: 2026-01-31*
