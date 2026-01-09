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
- [x] Cell editing with double-click
- [x] Auto-save on cell edit with status indicator (Saving/Saved/Error)
- [x] Add Row functionality with modal (basic patient info only)
- [x] Delete Row with confirmation dialog
- [x] Row selection for delete operations (blue left border indicator)
- [x] Date formatting (display and edit as MM/DD/YYYY)
- [x] Date validation with error popup for invalid format
- [x] DOB masking (displays as ### for privacy)
- [x] Phone number formatting ((555) 123-4567)
- [x] Member Info column toggle (toolbar button to show/hide DOB, Telephone, Address columns)

### Phase 3: Cascading Dropdowns

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

### Phase 4: Conditional Row Formatting

**Status: Complete**

- [x] Row colors based on Measure Status (matching Excel behavior):
  - **Gray** (#E9EBF3): No longer applicable, Screening unnecessary
  - **Light Purple** (#E5D9F2): Declined, Contraindicated
  - **Light Green** (#D4EDDA): Completed, At Goal
  - **Light Blue** (#CCE5FF): Scheduled, Ordered, In Progress
  - **Pale Yellow** (#FFF9E6): Called to schedule, Discussed, Contacted
  - **Light Orange** (#FFE8CC): Chronic diagnosis resolved/invalid
  - **White** (#FFFFFF): Not Addressed (default)
- [x] Row colors preserved during row selection and editing
- [x] Explicit status-to-color mapping (no pattern matching conflicts)
- [x] Real-time color updates when Measure Status changes

### Phase 5: Business Logic & Calculations

**Status: Complete**

- [x] Due Date auto-calculation based on Status Date + rules
  - Special handling for "Screening discussed" + tracking month patterns
  - Special handling for HgbA1c statuses + tracking2 month patterns
  - DueDayRule lookup for measureStatus + tracking1 combinations
  - MeasureStatus.baseDueDays fallback
- [x] Time Interval (Days) calculation (dueDate - statusDate)
- [x] Status Date prompt when Measure Status changes
  - Shows contextual prompt text (e.g., "Date Completed", "Date Ordered")
  - **Dark gray cell background** with white italic text when status date is missing
  - Special overrides for "Patient deceased" and "Patient in hospice"
- [x] Duplicate detection (same patient + quality measure)
  - Visual indicator: Light yellow background (#FEF3C7)
  - Warning modal when creating duplicate entries
  - Backend duplicate flag synchronization on create/update/delete
- [x] Backend services layer:
  - `dueDateCalculator.ts` - Due date calculation logic
  - `duplicateDetector.ts` - Duplicate detection and flag management
  - `statusDatePromptResolver.ts` - Status date prompt resolution
- [x] API endpoint: POST `/api/data/check-duplicate` for pre-creation duplicate check

---

## Future Phases

### Phase 6: HgbA1c Goal Configuration

**Planned Features:**
- [ ] HgbA1c Goal dropdown for Diabetes Control rows (Less than 7/8/9)
- [ ] "Goal Reached for Year" checkbox
- [ ] "Patient Declined" checkbox
- [ ] Special color logic (GREEN/ORANGE/RED/GRAY) based on goal vs actual

### Phase 7: View-Only Mode & Edit Locking

**Planned Features:**
- [ ] View-only mode for non-editors
- [ ] Single-editor locking system
- [ ] Lock status indicator
- [ ] Force-release lock (admin only)

### Phase 8: Authentication & Authorization

**Planned Features:**
- [ ] Login page for editors
- [ ] JWT-based authentication
- [ ] Admin panel for user management
- [ ] Session timeout handling

### Phase 9: Excel-like Behaviors

**Planned Features:**
- [ ] Keyboard navigation (Arrow keys, Tab, Enter)
- [ ] Copy/Paste support
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y)
- [ ] Fill handle (drag to fill)
- [ ] Context menu (right-click)
- [ ] Quick filter/search bar

### Phase 10: Additional Features

**Planned Features:**
- [ ] CSV import/export
- [ ] Print/PDF export
- [ ] Cell comments
- [ ] Text wrapping for Notes field
- [ ] Column pinning (first 3 columns fixed)
- [ ] ~~Zebra striping~~ (not needed - using measure status colors instead)
- [ ] Drag-and-drop row reordering

### Phase 11: Reference Data Sheets

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

### Production

```bash
docker compose up -d --build
# Access at http://localhost
```

---

## Last Updated

January 9, 2026 - Phase 5 Complete, UI improvements (date format MM/DD/YYYY, row color fixes)
