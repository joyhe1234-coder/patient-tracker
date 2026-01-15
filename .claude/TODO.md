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
- [x] Error modal when creating duplicate row
- [x] Duplicate blocking on updates (prevent editing to create duplicates)
- [x] Reset to empty on duplicate error (not revert to old value)
- [x] Backend duplicate flag synchronization on create/update/delete
- [ ] Duplicate row functionality (create copy of existing row)
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

---

## High Priority

### External Data Import
- [ ] Import wizard for external spreadsheets (Excel, CSV)
- [ ] Column mapping interface (source column → target field)
- [ ] Preview imported data before committing
- [ ] Handle mismatched column structures
- [ ] Data validation during import
- [ ] Duplicate detection during import
- [ ] Merge vs. replace options for existing records
- [ ] Import history/audit log

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

January 14, 2026
