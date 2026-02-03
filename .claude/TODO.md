# Patient Quality Measure Tracking System - TODO

This document tracks planned features and enhancements for future development.

---

## In Progress

### Phase 3: Adding & Duplicating Rows
- [x] Add Row functionality with modal (basic patient info only)
- [x] New row appears as first row (shifts other rows down)
- [x] New row has empty fields (no defaults for requestType, qualityMeasure, measureStatus)
- [x] Request Type cell auto-focused after add
- [x] Column sort cleared on new row (preserves row order)
- [x] Duplicate detection updated: same patient + requestType + qualityMeasure
  - [x] Skip duplicate check if requestType OR qualityMeasure is null/empty
  - [x] Schema change: requestType, qualityMeasure, measureStatus now nullable
- [x] Duplicate visual indicator: Light yellow background
- [x] Error alert when creating/editing to duplicate row
- [x] Duplicate blocking on updates (prevent editing to create duplicates)
- [x] Reset to empty on duplicate error (not revert to old value)
- [x] Backend duplicate flag synchronization on create/update/delete
- [x] Cascading field clearing when parent field changes
  - requestType → clears downstream (qualityMeasure*, measureStatus, statusDate, tracking, dueDate, interval)
  - qualityMeasure → clears downstream (measureStatus, statusDate, tracking, dueDate, interval)
  - measureStatus → clears downstream (statusDate, tracking, dueDate, interval)
- [x] Time interval manual override for all statuses
- [x] Duplicate row functionality (create copy of existing row with patient data only)
- [ ] Duplicate row with new patient info (copy measures to different patient)
- [ ] Bulk add multiple rows at once

### Phase 4: Sorting & Filtering
- [x] Column header click to sort ascending/descending
- [x] Sort indicator icons in column headers
- [x] No auto-sort during editing (rows stay in place while editing)
- [x] Sort indicator cleared when editing sorted column (row position preserved)
- [x] Row position and selection preserved during all edits
- [x] Status color filter bar (filter by row color with clickable chips)
- [x] Single-select filter behavior
- [x] Filter counts displayed on each chip
- [ ] Multi-column sort support
- [ ] Persist sort/filter preferences (localStorage or user settings)
- [ ] Quick search/filter by patient name
- [ ] Advanced filter builder (multiple conditions)

### Phase 5: CSV Import (v3.0.0)
**Requirements documented in:** `.claude/IMPORT_REQUIREMENTS.md`

- [x] Requirements document created
- [x] Column mapping completed (42 of 62 columns mapped)
- [x] Merge logic defined
- [x] Duplicate row visual requirements updated (left stripe + filter chip)
- [x] Q2: Status Value Mapping (measure-specific mapping decided)
- [x] Hill Measure Mapping page (`/hill-mapping`) with CSV export
- [ ] Q4: Unmapped Patient Columns (Sex, MembID, LOB)
- [ ] Q5: "Has Sticket" Column decision
- [ ] Q6: Duplicate Measures handling (age-range sub-categories)
- [ ] Q7: Column Mapping UI decision
- [ ] Q8: Date Fields decision
- [x] Implementation: Phase 5a - Config Loader (systems registry, Hill config)
- [x] Implementation: Phase 5b - File Parser (CSV/Excel) + Import Test Page
- [x] Implementation: Phase 5c - Column Mapper + Transformer
- [x] Implementation: Phase 5d - Validator + Error Reporter
- [x] Implementation: Phase 5e-5f - Diff Calculator + Preview Cache
  - `diffCalculator.ts` - Compare import vs DB with merge logic (22 tests)
  - `previewCache.ts` - In-memory TTL cache for previews (17 tests)
- [x] Implementation: Phase 5g - Preview API endpoints
- [x] Implementation: Phase 5h - Import Executor (Replace All + Merge)
  - `importExecutor.ts` - Execute database operations based on diff (16 tests)
- [x] Implementation: Phase 5i - Execute API endpoint
  - POST /api/import/execute/:previewId
- [x] Implementation: Phase 5j-5l - Full Import UI (29 E2E tests)

### UI Testing
- [x] Phase 1: React Testing Library + Vitest setup
- [x] Phase 2: Playwright E2E setup
- [x] Phase 3: GitHub Actions CI workflows
- [x] Phase 4: Component tests (45 tests)
- [x] Phase 5: CRUD E2E tests (Playwright: 25 passing, 5 skipped)
- [x] Phase 6: Cascading dropdowns E2E tests (Cypress: 30 passing)
  - Cypress framework added for better AG Grid dropdown handling
  - Request Type, Quality Measure, Measure Status, Tracking #1 tests
  - Row color tests, cascading field clearing tests
- [x] Phase 7: Test data management and isolation
  - Added serial mode for data-modifying test suites
  - Added waitForGridLoad(), toggleMemberInfo(), deselectAllRows() helpers
  - Fixed phone/address test with Member Info toggle
  - Playwright: 26 passing, 4 skipped (AG Grid limitations)
- [x] Phase 8: Import E2E tests (Cypress: 29 passing)
  - Import page: system selection, mode selection, file upload
  - Preview page: summary cards, action filters, changes table
- [x] Phase 9: Authentication tests (Feb 2, 2026)
  - LoginPage.test.tsx (17 Vitest tests)
  - authStore.test.ts (25 Vitest tests)
  - auth.spec.ts (9 Playwright E2E tests)
  - Execution: success message, statistics, navigation
  - Error handling: invalid format, expired preview

---

## High Priority

### Add New Quality Measure: Depression Screening
**Reference:** `.claude/ADDING_QUALITY_MEASURES.md` (implementation checklist)

- [ ] Add to `backend/prisma/seed.ts` (statuses, tracking options, due days)
- [ ] Add to `frontend/src/config/dropdownConfig.ts` (dropdown mappings)
- [ ] Add to `backend/src/services/import/validator.ts` (VALID_QUALITY_MEASURES)
- [ ] Add to `backend/src/config/import/hill.json` (column + status mapping)
- [ ] Update row colors in `PatientGrid.tsx` if new status categories
- [ ] Add Cypress E2E tests for new measure
- [ ] Run full test suite to verify no regressions

### External Data Import
See **Phase 5: CSV Import** in "In Progress" section above.

---

## Medium Priority

### Charting & Stats Analyzer
- [ ] Dashboard view with summary statistics
- [ ] Measure completion rates by quality measure
- [ ] Overdue items trend chart
- [ ] Status distribution pie/bar charts
- [ ] Time-to-completion metrics
- [ ] Filter charts by date range
- [ ] Export charts as images/PDF
- [ ] Drill-down from chart to filtered grid view

### Deployment Strategy
- [ ] Production environment configuration
- [ ] CI/CD pipeline setup (GitHub Actions)
- [ ] Automated testing in pipeline
- [ ] Database migration strategy
- [ ] Backup and restore procedures
- [ ] Monitoring and alerting setup
- [ ] SSL/TLS certificate management
- [ ] Load balancing considerations
- [ ] Environment-specific configuration (dev/staging/prod)
- [ ] Rollback procedures

---

## Backlog (From IMPLEMENTATION_STATUS.md)

### Phase 9: HgbA1c Goal Configuration
- [ ] HgbA1c Goal dropdown for Diabetes Control rows (Less than 7/8/9)
- [ ] "Goal Reached for Year" checkbox
- [ ] "Patient Declined" checkbox
- [ ] Special color logic (GREEN/ORANGE/RED/GRAY) based on goal vs actual

### Phase 10: View-Only Mode & Edit Locking
- [ ] View-only mode for non-editors
- [ ] Single-editor locking system
- [ ] Lock status indicator
- [ ] Force-release lock (admin only)

### Phase 11: Authentication & Multi-Physician Support (**COMPLETED**)
- [x] Login page for editors
- [x] JWT-based authentication
- [x] Admin panel for user management
- [x] Multi-physician data isolation (Patient.ownerId)
- [x] User model with roles (PHYSICIAN, STAFF, ADMIN)
- [x] Staff-to-physician assignment
- [x] Role-based access control
- [x] Audit logging
- [x] Authentication test coverage (101 tests - Feb 2, 2026)
  - Backend: authService, middleware, routes tests (50 tests)
  - Frontend: LoginPage, authStore tests (42 tests)
  - E2E: auth.spec.ts Playwright tests (9 tests)
- [x] **Forgot Password Feature** (Feb 3, 2026)
  - [x] PasswordResetToken database model
  - [x] POST /api/auth/forgot-password endpoint
  - [x] POST /api/auth/reset-password endpoint
  - [x] Email service (configurable SMTP via nodemailer)
  - [x] ForgotPasswordPage frontend
  - [x] ResetPasswordPage frontend
  - [x] "Forgot Password?" link on LoginPage
  - [x] Fallback message when SMTP not configured
  - [x] GET /api/auth/smtp-status endpoint for frontend check
- [ ] Session timeout handling (advanced feature)
- [ ] Unassigned patients page (advanced feature)
- [ ] Import page physician selector for STAFF (advanced feature)

### Phase 12: Excel-like Behaviors
- [ ] Keyboard navigation (Arrow keys, Tab, Enter)
- [ ] Copy/Paste support
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y)
- [ ] Fill handle (drag to fill)
- [ ] Context menu (right-click)

### Phase 13: Additional Features
- [ ] CSV import/export
- [ ] Print/PDF export
- [ ] Cell comments
- [ ] Text wrapping for Notes field
- [ ] Column pinning (first 3 columns fixed)
- [ ] Drag-and-drop row reordering

### Phase 14: Reference Data Sheets
- [ ] HCC Code List sheet
- [ ] P4P Summary Guidelines sheet
- [ ] Tab navigation between sheets

---

## Completed

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for completed features.

---

## Last Updated

February 1, 2026
