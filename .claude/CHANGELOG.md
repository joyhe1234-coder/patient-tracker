# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.3.0] - 2026-01-14

### Added
- **Duplicate Row Button** - Copy existing row with patient data only
  - Button enabled when a row is selected
  - Copies memberName, memberDob, phone, address
  - Leaves measure fields empty (requestType, qualityMeasure, measureStatus, etc.)
  - New row inserted directly below selected row
  - New row automatically selected with Request Type focused
  - API endpoint: POST `/api/data/duplicate`

---

## [2.2.0-snapshot] - 2026-01-14

### Added
- **New Row Behavior** - Improved add row experience
  - New rows appear as first row (top of grid)
  - Other rows shift down (rowOrder incremented)
  - Request Type cell auto-focused for immediate editing
  - Column sort cleared on new row add (preserves row positions)
  - New rows have empty requestType, qualityMeasure, measureStatus (no defaults)
- **Git Branching Rules** - Development workflow documentation
  - All implementation must happen on `develop` or `feature/*` branches
  - Never commit directly to `main`
- **Release Skill** - `/release` command for complete release workflow
  - Commits with documentation updates
  - Pushes develop to remote
  - Merges develop into main and pushes
  - Returns to develop branch
  - Verifies Render deployment status via MCP
- **Render MCP Integration** - Added MCP server for deployment monitoring
  - Check deployment status, logs, and metrics
  - Documented in CLAUDE.md for Claude Code awareness

### Changed
- **Cascading Field Clearing** - When parent field changes, all downstream fields are cleared
  - requestType change → clears qualityMeasure*, measureStatus, statusDate, tracking1/2/3, dueDate, timeInterval
  - qualityMeasure change → clears measureStatus, statusDate, tracking1/2/3, dueDate, timeInterval
  - measureStatus change → clears statusDate, tracking1/2/3, dueDate, timeInterval
  - *qualityMeasure auto-fills for AWV/Chronic DX
  - Notes field is preserved (not cleared)
- **Time Interval Manual Override** - Time interval now editable for all statuses
  - Previously locked for dropdown-based statuses (e.g., "Screening test ordered")
  - Now allows manual override regardless of status type
- **Duplicate Detection Logic Updated** - New duplicate definition
  - Duplicates now defined as: same patient (memberName + memberDob) + requestType + qualityMeasure
  - Skip duplicate check if requestType OR qualityMeasure is null/empty
  - Duplicate errors now shown via browser alert (removed DuplicateWarningModal)
  - **Duplicate blocking on updates** - Prevents editing requestType/qualityMeasure to create duplicates
  - On duplicate error, fields reset to empty instead of reverting to old value

### Database Changes
- **Schema Migration Required** - Fields made nullable
  - `requestType`: String → String? (nullable, no default)
  - `qualityMeasure`: String → String? (nullable, no default)
  - `measureStatus`: String with default → String? (nullable, no default)
  - Run: `npx prisma migrate dev --name make-measure-fields-nullable`

---

## [2.1.0-snapshot] - 2026-01-14

### Added
- **Claude Code Integration** - Project context system for AI-assisted development
  - `CLAUDE.md` - Auto-read project context file with pre-commit workflow
  - `.claude/` directory for organized project documentation
  - `/commit` slash command for smart commits with auto-documentation updates

### Changed
- **Phase Restructuring** - Reorganized implementation phases for clarity
  - Added Phase 3: Adding & Duplicating Rows (in progress)
  - Added Phase 4: Sorting & Filtering (in progress)
  - Renumbered subsequent phases (5-14)
- **Documentation Location** - Moved project docs to `.claude/` folder
  - `CHANGELOG.md`, `IMPLEMENTATION_STATUS.md`, `TODO.md`, `REGRESSION_TEST_PLAN.md`
  - Added template files: `context.md`, `patterns.md`, `notes.md`

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
