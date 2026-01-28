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
- [ ] Implementation: Phase 5e-5f - Diff Calculator + Preview Cache
- [ ] Implementation: Phase 5g-5i - Import Executor + APIs
- [ ] Implementation: Phase 5j-5l - Full Import UI

### UI Testing
- [x] Phase 1: React Testing Library + Vitest setup
- [x] Phase 2: Playwright E2E setup
- [x] Phase 3: GitHub Actions CI workflows
- [x] Phase 4: Component tests (45 tests)
- [x] Phase 5: CRUD E2E tests (Playwright: 25 passing, 5 skipped)
- [x] Phase 6: Cascading dropdowns E2E tests (Cypress: 19 passing)
  - Cypress framework added for better AG Grid dropdown handling
  - Request Type, Quality Measure, Measure Status, Tracking #1 tests
  - Row color tests, cascading field clearing tests
- [x] Phase 7: Test data management and isolation
  - Added serial mode for data-modifying test suites
  - Added waitForGridLoad(), toggleMemberInfo(), deselectAllRows() helpers
  - Fixed phone/address test with Member Info toggle
  - Playwright: 26 passing, 4 skipped (AG Grid limitations)
- [ ] Phase 8: Import Excel E2E tests

---

## High Priority

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

### Phase 11: Authentication & Multi-Physician Support
- [ ] Login page for editors
- [ ] JWT-based authentication
- [ ] Admin panel for user management
- [ ] Session timeout handling
- [ ] Multi-physician data isolation
- [ ] Physician table and Patient.physicianId schema changes

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

January 28, 2026
