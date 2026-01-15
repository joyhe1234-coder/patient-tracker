# Patient Quality Measure Tracking System - Implementation Status

## Overview

This document tracks the implementation progress of the Patient Quality Measure Tracking System, a web-based application replacing an Excel-based tracking system for medical offices.

---

## Completed Phases

### Phase 1: Project Setup & Database Foundation

**Status: Complete**

- [x] Project folder structure created
- [x] Docker Compose configuration (PostgreSQL, Nginx)
- [x] Backend setup (Express.js, TypeScript, Prisma ORM)
- [x] Database schema with all models:
  - Patient, PatientMeasure
  - RequestType, QualityMeasure, MeasureStatus
  - TrackingOption, DueDayRule
  - HgbA1cGoalOption, ConditionalFormat
  - EditLock, AuditLog
- [x] Seed data for configuration tables
- [x] Frontend setup (React 18, Vite, TypeScript, AG Grid, Tailwind CSS)
- [x] Basic API endpoints (health, CRUD)

### Phase 2: CRUD Operations & Grid Editing

**Status: Complete**

- [x] AG Grid displaying 14 columns
- [x] Cell editing with single-click activation
- [x] Auto-save on cell edit with status indicator (Saving/Saved/Error)
- [x] Delete Row with confirmation dialog
- [x] Row selection indicator (blue outline, preserves status colors)
- [x] Active cell indicator (blue outline border)
- [x] Date formatting (display and edit as MM/DD/YYYY)
- [x] Flexible date input (accepts M/D/YY, MM/DD/YYYY, YYYY-MM-DD, M.D.YYYY, etc.)
- [x] Date validation with error popup for invalid format
- [x] Timezone-safe date handling (UTC noon to prevent date shift)
- [x] DOB masking (displays as ### for privacy)
- [x] Phone number formatting ((555) 123-4567)
- [x] Member Info column toggle (toolbar button to show/hide DOB, Telephone, Address columns)
- [x] Member Info columns hidden by default

### Phase 3: Adding & Duplicating Rows

**Status: In Progress**

- [x] Add Row functionality with modal (basic patient info only)
- [x] New row appears as first row (rowOrder: 0, other rows shift down)
- [x] New row has empty requestType, qualityMeasure, measureStatus (no defaults)
- [x] Request Type cell auto-focused for immediate editing after add
- [x] Column sort cleared when new row is added (preserves row order)
- [x] Duplicate detection: same patient (memberName + memberDob) + requestType + qualityMeasure
  - Skip duplicate check if requestType OR qualityMeasure is null/empty
  - Schema updated: requestType, qualityMeasure, measureStatus are now nullable (no defaults)
- [x] Duplicate visual indicator: Light yellow background (#FEF3C7)
- [x] Error modal when creating duplicate row (no proceed option, form data preserved)
- [x] Backend validation prevents updating to create duplicate row
- [x] On duplicate error during edit, fields reset to empty (not revert to old value)
- [x] Backend duplicate flag synchronization on create/update/delete
- [x] API endpoint: POST `/api/data/check-duplicate` for pre-creation duplicate check
- [ ] Duplicate row functionality (create copy of existing row)
- [ ] Duplicate row with new patient info (copy measures to different patient)
- [ ] Bulk add multiple rows at once

### Phase 4: Sorting & Filtering

**Status: In Progress**

- [x] Column sorting (click header to sort ascending/descending)
- [x] Sort indicator icons in column headers
- [x] No auto-sort during editing (rows stay in place, sort only on header click)
- [x] Sort indicator cleared when editing sorted column (row position preserved)
- [x] Row position and selection preserved during all edits
- [x] Status color filter bar (clickable chips to filter by row color/status category)
- [x] Single-select filter behavior (click to select, click again to deselect)
- [x] Filter counts displayed on each chip
- [x] Status bar shows "Showing X of Y rows" when filtering
- [ ] Multi-column sort support
- [ ] Persist sort/filter preferences (localStorage or user settings)
- [ ] Quick search/filter by patient name
- [ ] Advanced filter builder (multiple conditions)

### Phase 5: Cascading Dropdowns

**Status: Complete**

- [x] Request Type dropdown with 4 options (AWV, Chronic DX, Quality, Screening)
- [x] Quality Measure dropdown filtered by Request Type
  - AWV → Auto-fills "Annual Wellness Visit"
  - Chronic DX → Auto-fills "Chronic Diagnosis Code"
  - Quality → Shows 8 options
  - Screening → Shows 3 options
- [x] Measure Status dropdown filtered by Quality Measure
- [x] Tracking #1 dropdown filtered by Measure Status (when applicable)
- [x] Auto-reset of dependent fields when parent changes
- [x] Dropdown configuration stored in `src/config/dropdownConfig.ts`

### Phase 6: Conditional Row Formatting

**Status: Complete**

- [x] Row colors based on Measure Status (matching Excel behavior):
  - **Gray** (#E9EBF3): No longer applicable, Screening unnecessary
  - **Light Purple** (#E5D9F2): Declined, Contraindicated
  - **Light Green** (#D4EDDA): Completed, At Goal
  - **Light Blue** (#CCE5FF): Scheduled, Ordered, In Progress
  - **Pale Yellow** (#FFF9E6): Called to schedule, Discussed, Contacted
  - **Light Orange** (#FFE8CC): Chronic diagnosis resolved/invalid
  - **White** (#FFFFFF): Not Addressed (default)
  - **Light Red** (#FFCDD2): Overdue (dueDate < today, for pending statuses only)
- [x] Row colors preserved during row selection and editing (using CSS classes via rowClassRules)
- [x] Explicit status-to-color mapping (no pattern matching conflicts)
- [x] Real-time color updates when Measure Status changes
- [x] Selection/focus uses outline instead of background color override
- [x] Overdue row coloring (light red) when due date has passed
  - Applies to pending statuses (blue, yellow, white) AND completed statuses (green)
  - Completed rows turn red when due date passes (indicates annual renewal needed)
  - Does not apply to declined or resolved statuses (purple, gray, orange)
  - Color priority: duplicate > overdue > status-based

### Phase 7: Business Logic & Calculations

**Status: Complete**

- [x] Due Date auto-calculation based on Status Date + rules
  - Special handling for "Screening discussed" + tracking month patterns
  - Special handling for HgbA1c statuses + tracking2 month patterns
  - DueDayRule lookup for measureStatus + tracking1 combinations
  - MeasureStatus.baseDueDays fallback
- [x] Time Interval (Days) calculation (dueDate - statusDate)
- [x] Time Interval conditional editability
  - Editable for statuses with baseDueDays default (1-1000 days)
  - NOT editable for dropdown-based intervals (month/week selections)
  - When edited, Due Date = Status Date + Time Interval
  - Row colors update accordingly (overdue detection)
- [x] Status Date prompt when Measure Status changes
  - Shows contextual prompt text (e.g., "Date Completed", "Date Ordered")
  - Light gray cell background with italic text when status date is missing
  - Special overrides for "Patient deceased" and "Patient in hospice"
- [x] Tracking field behavior
  - **Tracking #1:**
    - Dropdown for statuses with predefined options (Colon/Breast cancer screening, Hypertension, etc.)
    - Free text with dark gray prompt "HgbA1c value" for HgbA1c statuses
    - Shows italic "N/A" for disabled statuses (inherits row color with diagonal stripe overlay, not editable)
  - **Tracking #2:**
    - Dropdown (1-12 months) with dark gray prompt "Testing interval" for HgbA1c statuses
    - Free text with dark gray prompt "BP reading" for Hypertension call back statuses
    - Shows italic "N/A" for disabled statuses (inherits row color with diagonal stripe overlay, not editable)
  - **Tracking #3:**
    - Editable free text placeholder for future use
    - Inherits row status color
- [x] Backend services layer:
  - `dueDateCalculator.ts` - Due date calculation logic
  - `duplicateDetector.ts` - Duplicate detection and flag management
  - `statusDatePromptResolver.ts` - Status date prompt resolution

### Phase 8: Complete Countdown Period Configuration

**Status: Complete**

- [x] Updated seed data with complete countdown periods for all 13 quality measures
- [x] Added MeasureStatus records with baseDueDays for all statuses:
  - AWV: 7 days (called), 1 day (scheduled), 365 days (completed)
  - Diabetic Eye Exam: 42 days/6 weeks (discussed/referral), 1 day (scheduled)
  - Colon Cancer: 42 days (Colonoscopy/Sigmoidoscopy), 21 days (Cologuard/FOBT)
  - Breast Cancer: 14 days (Mammogram/Ultrasound), 21 days (MRI)
  - Diabetic Nephropathy: 10 days (contacted), 5 days (ordered)
  - GC/Chlamydia: 10 days (contacted), 5 days (ordered)
  - Hypertension: 7-56 days via Tracking #1 call intervals
  - Vaccination: 7 days (discussed), 1 day (scheduled)
  - Cervical Cancer: 30-330 days via Tracking #1 (In 1-11 Months)
  - ACE/ARB: 14 days (prescribed)
  - Annual Serum K&Cr: 7 days (ordered)
  - Chronic Diagnosis: 14 days (attestation not sent)
- [x] Added DueDayRule records for Tracking #1 dependent countdown periods
- [x] Extended Cervical Cancer "Screening discussed" options to 11 months

---

## Future Phases

### Phase 9: HgbA1c Goal Configuration

**Planned Features:**
- [ ] HgbA1c Goal dropdown for Diabetes Control rows (Less than 7/8/9)
- [ ] "Goal Reached for Year" checkbox
- [ ] "Patient Declined" checkbox
- [ ] Special color logic (GREEN/ORANGE/RED/GRAY) based on goal vs actual

### Phase 10: View-Only Mode & Edit Locking

**Planned Features:**
- [ ] View-only mode for non-editors
- [ ] Single-editor locking system
- [ ] Lock status indicator
- [ ] Force-release lock (admin only)

### Phase 11: Authentication & Multi-Physician Support

**Planned Features:**
- [ ] Login page for editors
- [ ] JWT-based authentication
- [ ] Admin panel for user management
- [ ] Session timeout handling
- [ ] Multi-physician data isolation (each physician sees only their patients)
- [ ] Physician table and Patient.physicianId schema changes

### Phase 12: Excel-like Behaviors

**Planned Features:**
- [ ] Keyboard navigation (Arrow keys, Tab, Enter)
- [ ] Copy/Paste support
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y)
- [ ] Fill handle (drag to fill)
- [ ] Context menu (right-click)

### Phase 13: Additional Features

**Planned Features:**
- [ ] CSV import/export
- [ ] Print/PDF export
- [ ] Cell comments
- [ ] Text wrapping for Notes field
- [ ] Column pinning (first 3 columns fixed)
- [ ] ~~Zebra striping~~ (not needed - using measure status colors instead)
- [ ] Drag-and-drop row reordering

### Phase 14: Reference Data Sheets

**Planned Features:**
- [ ] HCC Code List sheet
- [ ] P4P Summary Guidelines sheet
- [ ] Tab navigation between sheets

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, AG Grid Community, Tailwind CSS |
| Backend | Node.js 20, Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Infrastructure | Docker, Nginx |

---

## File Structure

```
patient-tracker/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and app config
│   │   ├── middleware/      # Error handling
│   │   ├── routes/          # API routes (data, config, health)
│   │   ├── services/        # Business logic services
│   │   │   ├── dueDateCalculator.ts
│   │   │   ├── duplicateDetector.ts
│   │   │   └── statusDatePromptResolver.ts
│   │   └── index.ts         # Server entry point
│   └── prisma/
│       ├── schema.prisma    # Database schema
│       └── seed.ts          # Seed data
├── frontend/
│   └── src/
│       ├── api/             # Axios client
│       ├── components/
│       │   ├── grid/        # PatientGrid component
│       │   ├── layout/      # Header, Toolbar, StatusBar
│       │   └── modals/      # AddRowModal, ConfirmModal, DuplicateWarningModal
│       ├── config/          # Dropdown configurations
│       ├── pages/           # MainPage
│       └── App.tsx          # Root component
├── docs/
│   ├── photos/              # Original handwritten design notes (IMG_9522-9540.jpg)
│   └── requirements.md      # Complete requirements document
├── config/                  # Runtime configuration
├── nginx/                   # Reverse proxy config
└── docker-compose.yml       # Container orchestration
```

---

## Running the Application

### Development

```bash
# Start database
docker compose up -d db

# Backend (terminal 1)
cd backend && npm run dev

# Frontend (terminal 2)
cd frontend && npm run dev

# Access at http://localhost:5173
```

### Production (Docker)

```bash
docker compose up -d --build
# Access at http://localhost
```

### Cloud Deployment (Render)

The application includes a `render.yaml` Blueprint for easy deployment to Render:

1. Sign up at https://render.com with GitHub
2. Click **New → Blueprint** → Select `patient-tracker` repo
3. Click **Apply** - Render creates all services automatically

**Services Created:**
- PostgreSQL database (free tier)
- Backend API (starter plan ~$7/month)
- Frontend static site (free)

---

## Last Updated

January 14, 2026 - Reorganized phases: added Phase 3 (Adding & Duplicating Rows) and Phase 4 (Sorting & Filtering)
