# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.0.0-snapshot] - 2026-01-10

### Added
- **Status Color Filter Bar** - Clickable chips to filter grid by row color/status category
  - Single-select behavior (click to filter, click again to return to all)
  - Filter counts displayed on each chip
  - Chips ordered: All, Not Started, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A
- **Sort Indicator Clearing** - Sort arrow clears when editing sorted column
- **Row Position Preservation** - Rows stay in place during all edits (no jumping)
- **Status Bar Filter Count** - Shows "Showing X of Y rows" when filtering

### Changed
- **Sorting Behavior** - Rows no longer auto-sort during editing; sort only triggers on column header click
- **Seed Data** - All 55 patient names are now unique and realistic

### Fixed
- Row order changing unexpectedly during cell edits
- Duplicate "Jock up" names in seed data
- TypeScript errors for `PostSortRowsParams` type
- TypeScript strict mode handling for undefined values

---

## [1.0.0] - 2026-01-09

### Added
- **Core Grid Features**
  - AG Grid displaying 14 columns with single-click editing
  - Auto-save on cell edit with status indicator
  - Add/Delete row functionality with confirmation dialogs
  - Row selection with blue outline (preserves status colors)

- **Date Handling**
  - Flexible date input (M/D/YY, MM/DD/YYYY, YYYY-MM-DD, M.D.YYYY)
  - Date validation with error popups
  - Timezone-safe UTC handling

- **Cascading Dropdowns**
  - Request Type → Quality Measure → Measure Status → Tracking #1
  - Auto-reset of dependent fields when parent changes

- **Conditional Row Formatting**
  - 8 status colors: Gray, Purple, Green, Blue, Yellow, Orange, White, Red (overdue)
  - Real-time color updates on status change
  - Overdue detection for pending statuses

- **Business Logic**
  - Due Date auto-calculation based on status and tracking values
  - Time Interval calculation and conditional editability
  - Status Date prompt based on Measure Status
  - Duplicate patient detection (same name + DOB)

- **Countdown Period Configuration**
  - Complete baseDueDays for all 13 quality measures
  - DueDayRule records for tracking-dependent periods
  - Month-based tracking options (1-11 months for Cervical Cancer)

- **Privacy Features**
  - DOB masking (displays as ###)
  - Member Info column toggle (DOB, Telephone, Address)
  - Phone number formatting

- **Infrastructure**
  - React 18 + Vite frontend
  - Express.js + Prisma backend
  - PostgreSQL database
  - Docker Compose configuration
  - Render.yaml for cloud deployment

---

## [0.1.0] - 2026-01-07

### Added
- Initial project setup
- Database schema with Prisma
- Basic CRUD API endpoints
- AG Grid integration
- Tailwind CSS styling
