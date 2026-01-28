# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [3.1.0-snapshot] - Unreleased

### Added
- **Test Data Management** (Phase 7 of UI Testing Plan)
  - Serial mode for data-modifying test suites (delete-row, duplicate-member)
  - New Page Object helpers: waitForGridLoad(), toggleMemberInfo(), deselectAllRows(), isMemberInfoVisible()
  - Fixed phone/address duplication test by toggling Member Info visibility
  - Playwright: 26 passing, 4 skipped (down from 25 passing, 5 skipped)
- **Cypress E2E Testing** (Phase 6 of UI Testing Plan)
  - Cypress framework setup as alternative to Playwright for AG Grid dropdown tests
  - Custom AG Grid commands (openAgGridDropdown, selectAgGridDropdown, getAgGridDropdownOptions)
  - Cascading dropdown tests (19 passing):
    - Request Type dropdown with 4 options
    - AWV/Chronic DX auto-fill behavior
    - Quality Measure filtering by Request Type (8 Quality, 3 Screening options)
    - Measure Status options by Quality Measure
    - Tracking #1 options (Breast Cancer, Chronic DX)
    - Row color changes on status selection
    - Cascading field clearing on parent changes
  - npm scripts: `cypress`, `cypress:run`, `cypress:headed`
- **E2E Testing with Playwright** (Phase 5 of UI Testing Plan)
  - Add Row tests: modal, validation, form submission, new row positioning
  - Duplicate Member tests: button state, row creation, empty measure fields
  - Delete Row tests: confirmation dialog, cancel, backdrop close
  - Page Object Model for maintainable test structure
  - 25 passing E2E tests, 5 skipped (require test isolation)
- **CSV Import Implementation Plan** (Phase 5)
  - Multi-healthcare system support (Hill, Kaiser, etc.)
  - Config files stored on server (`backend/src/config/import/`)
  - Preview before commit (in-memory diff calculation)
  - 13 implementation phases defined
  - 11 backend/frontend modules identified
  - API contracts for `/api/import/preview` and `/api/import/execute`
- **`/version` Command** - Semantic versioning release workflow
  - Supports major, minor, patch increments
  - Tags main branch with vX.X.X
  - Bumps to next snapshot version after release
- **Phase 5a: Import Config Loader** - Multi-system configuration support
  - `backend/src/config/import/systems.json` - Healthcare system registry
  - `backend/src/config/import/hill.json` - Hill Healthcare mapping config
  - `backend/src/services/import/configLoader.ts` - Config loading service
  - API endpoints: `GET /api/import/systems`, `GET /api/import/systems/:systemId`
- **Phase 5b: File Parser + Import Test Page**
  - `backend/src/services/import/fileParser.ts` - CSV/Excel parser with title row detection
  - `backend/src/middleware/upload.ts` - Multer file upload middleware
  - API endpoint: `POST /api/import/parse` - Parse uploaded file
  - `frontend/src/pages/ImportTestPage.tsx` - UI for testing file parsing
  - Navigation link "Import Test" added to header
  - Route `/import-test` added to App.tsx
- **Phase 5c: Column Mapper + Data Transformer**
  - `backend/src/services/import/columnMapper.ts` - Maps CSV headers to internal fields using config
  - `backend/src/services/import/dataTransformer.ts` - Wide-to-long format transformation
  - `backend/src/utils/dateParser.ts` - Flexible date parsing (Excel serial, MM/DD/YYYY, etc.)
  - API endpoint: `POST /api/import/analyze` - Analyze column mappings
  - API endpoint: `POST /api/import/transform` - Transform data to long format
  - Status date set to import date (today) instead of from CSV columns
  - Tracks patients with no measures generated (empty measure columns)
- **Phase 5d: Validator + Error Reporter**
  - `backend/src/services/import/validator.ts` - Validates transformed data
  - `backend/src/services/import/errorReporter.ts` - Generates validation reports
  - API endpoint: `POST /api/import/validate` - Validate before import
  - Validation checks: required fields, date formats, valid values, duplicates
  - Error messages include member name for easy identification
  - Reports errors, warnings, and duplicate groups
- **"Any Non-Compliant Wins" Logic**
  - Multiple CSV columns can map to same quality measure (e.g., age-specific columns)
  - If ANY column shows non-compliant, result is non-compliant
  - Applies to: Breast Cancer, Colon Cancer, Diabetes, Nephropathy, Chlamydia, Vaccination
- **Import Test Data Files**
  - `test-data/` folder with 7 CSV files for testing import
  - Covers: valid data, date formats, multi-column, validation errors, duplicates, no measures, warnings
  - README.md with expected results for each test file
- **Comprehensive Import Test Plan**
  - 56 new test cases (TC-15 to TC-21) added to REGRESSION_TEST_PLAN.md
  - Covers column mapping, transformation, date parsing, validation, error reporting, UI
- **Phase 5e: Diff Calculator**
  - `backend/src/services/import/diffCalculator.ts` - Compare import data vs database
  - Merge logic matrix: 6 cases based on compliance status (compliant/non-compliant)
  - Actions: INSERT (new record), UPDATE (upgrade), SKIP (keep existing), BOTH (downgrade), DELETE (replace mode)
  - Status categorization using keyword matching
  - 22 unit tests documenting all merge scenarios
- **Phase 5f: Preview Cache**
  - `backend/src/services/import/previewCache.ts` - In-memory cache with TTL
  - 30-minute default TTL for preview entries
  - Auto-cleanup every 5 minutes (expired entries removed)
  - Features: store, get, delete, extend TTL, cache statistics
  - 17 unit tests for cache operations

### Changed

### Fixed
- **Prisma/Alpine OpenSSL compatibility** - Added `linux-musl-openssl-3.0.x` binary target
- **Docker config files** - Added COPY for `src/config` to `dist/config` in Dockerfile
- **Validation Error Row Numbers** - Now show original spreadsheet row numbers instead of transformed row indices
  - Added `dataStartRow` tracking to handle files with title rows
  - Errors deduplicated per patient+field (no longer repeated for each generated row)
  - CSV parser now detects title rows and calculates correct data start position
- **Time Interval Editability** - Corrected which statuses allow manual time interval editing
  - Only 5 "time period dropdown" statuses (Screening discussed, HgbA1c at/not at goal, BP call back statuses) prevent manual interval editing
  - Test type dropdown statuses (Screening test ordered, Colon cancer screening ordered, etc.) now allow interval editing
  - Documented complete Time Interval Editability Matrix in `.claude/TIME_INTERVAL_MATRIX.md`
  - API returns `dataStartRow` for frontend to calculate display row numbers

---

## [3.0.0] - 2026-01-22

### Added
- **CSV Import Requirements Documentation** (Phase 5)
  - `IMPORT_REQUIREMENTS.md` - Requirements and open questions
  - `IMPORT_COLUMN_MAPPING.md` - 36 columns mapped to existing quality measures
  - `IMPORT_SPREADSHEET_REFERENCE.md` - Complete column listing
  - Import modes: Replace All vs Merge
  - Merge logic matrix for 6 scenarios
  - Duplicate row visual change: left stripe instead of background color
  - "Duplicates" filter chip requirement
- **Hill Spreadsheet Quality Measure Mapping Page** (`/hill-mapping`)
  - Configure Compliant/Non Compliant → measureStatus mapping
  - 10 quality measures with dropdown status selection
  - Defaults: Compliant → "completed" status, Non Compliant → "Not Addressed"
  - Export to CSV functionality
  - Navigation links added to header

### Changed
- **Duplicate Row Visual Indicator** - Changed from yellow background to orange left stripe
  - 4px orange (#F97316) border on left edge of duplicate rows
  - Row background now preserves measure status color (not overridden)
  - Duplicate styling is additive - can combine with any status color
- **Duplicates Filter Chip** - Added to status filter bar
  - Shows count of duplicate rows
  - Click to filter grid to show only duplicates
- **Duplicate Mbr Button** - Renamed from "Duplicate" to "Duplicate Mbr"

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
