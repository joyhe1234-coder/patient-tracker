# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.4.0] - 2026-02-05

### Added
- **Multi-Select Status Filter** (Feb 5, 2026)
  - Redesigned StatusFilterBar from single-select to multi-select toggle behavior
  - Users can now select multiple status chips simultaneously (OR logic filtering)
  - Checkmark + fill visual style: active chips show checkmark icon + filled background color
  - Inactive chips show outlined style at 50% opacity with hover at 75%
  - "All" chip clears all selections; "Duplicates" chip is exclusive (deselects color chips)
  - Zero-selection prevented: toggling off last chip auto-activates "All"
  - `aria-pressed` attribute on all chips for accessibility
  - Search + multi-filter uses AND logic (unchanged from single-select)
  - Updated `StatusFilterBar.test.tsx` - 12 new multi-select + visual tests (51 total, was 39)
  - Updated `MainPage.test.tsx` - 8 new multi-filter integration tests (28 total, was 20)
  - NEW: `multi-select-filter.cy.ts` - 18 Cypress E2E tests for multi-select behavior
  - Updated `sorting-filtering.cy.ts` - 2 tests updated for multi-select (55 total)
  - Total Vitest tests: 285 (was 265, +20 new)
  - Total Cypress tests: 283 (was 265, +18 new)

- **Patient Name Search** (Feb 5, 2026)
  - Search input in StatusFilterBar for filtering patients by name
  - Case-insensitive partial match filtering on memberName field
  - AND logic between name search and status color filter
  - Ctrl+F keyboard shortcut to focus search, Escape to clear and blur
  - Clear (X) button to reset search, hidden when input is empty
  - Status bar shows "Showing X of Y rows" during active search
  - Status chip counts reflect full dataset (not affected by search)
  - NEW: `MainPage.test.tsx` - 20 Vitest tests for search filtering logic
  - NEW: `patient-name-search.cy.ts` - 13 Cypress E2E tests for search workflow
  - Updated `StatusFilterBar.test.tsx` - 10 new search UI tests (39 total)
  - Total Vitest tests: 265 (was 245, +20 new)
  - Total Cypress tests: 265 (was 252, +13 new)

- **Regression Test Gap Coverage** (Feb 5, 2026)
  - NEW: `duplicateDetector.test.ts` - 38 Jest tests for duplicate detection logic
    - checkForDuplicate: null/empty/whitespace handling, Prisma where clause, excludeMeasureId
    - detectAllDuplicates: grouping, null handling, mixed scenarios, patientId isolation
    - updateDuplicateFlags: duplicate/single marking, null handling, multiple groups
    - syncAllDuplicateFlags: full sync workflow
  - NEW: `statusDatePromptResolver.test.ts` - 59 Jest tests for status date prompt resolution
    - getDefaultDatePrompt: 40+ status-to-prompt mappings across all measure categories
    - resolveStatusDatePrompt: tracking1 overrides, null handling, database lookup, priority ordering
  - NEW: `PatientGrid.test.tsx` - 42 Vitest tests for main grid component
    - Column definitions, row class rules (all color categories + overdue priority)
    - Grid configuration, prop passing, column header names
  - NEW: `cell-editing.cy.ts` - 18 Cypress E2E tests for cell editing
    - Row selection, text editing (Notes), date editing with format validation, member name editing, save indicator
  - NEW: `time-interval.cy.ts` - 14 Cypress E2E tests for time interval override
    - Dropdown-controlled statuses (not editable), manual override with due date recalculation, validation
  - NEW: `duplicate-detection.cy.ts` - 15 Cypress E2E tests for duplicate detection editing
    - Visual indicators, 409 error handling, flag clearing, null field handling, filter bar counts
  - Fixed ESM mocking: switched duplicateDetector and statusDatePromptResolver tests to use `jest.unstable_mockModule`
  - Total backend tests: 527 (was 426)
  - Total frontend component tests: 245 (was 203)
  - Total Cypress E2E tests: 252 (was 205, +47 new tests in 3 files)

- **Feature Requirement Docs & Test Plans** (Feb 5, 2026)
  - Created 17 formal requirement specs in `.claude/specs/` with requirements.md and test-plan.md:
    - data-display, cell-editing, sorting, status-filter, row-colors
    - cascading-dropdowns, due-date, duplicate-detection, row-operations, status-bar
    - tracking-fields, time-interval, import-pipeline, authentication
    - patient-ownership, admin-dashboard, role-access-control
  - Each spec includes: user stories, acceptance criteria, UI workflow, business rules, edge cases
  - Each test plan maps requirements to manual TCs, automated tests, and identifies gaps
  - Updated REGRESSION_TEST_PLAN.md with:
    - Automation status (Automated/Partial/Manual) on every test case
    - Requirement traceability (AC-X links) on every test case
    - Automation Summary section with coverage percentages per section
    - Top Priority Gaps table identifying highest-value test additions
  - Coverage analysis: 100% of TC-XX test cases now traceable to requirements
  - Identified top gaps: Cell Editing (0% E2E), Time Interval (0%), Duplicate Detection edit flow

- **Import Workflow Test Coverage** (Feb 5, 2026)
  - NEW: `import.routes.test.ts` - 11 backend API tests for authentication requirements
  - NEW: 14 additional Cypress E2E tests in `import-flow.cy.ts`:
    - Error handling: empty CSV file
    - Merge mode behavior: preserves existing data, mode indicator
    - Preview page details: file info, expiration, columns, filtering
    - Import with warnings handling
    - Multiple file imports with different results
    - Cancel and navigation flows
  - NEW: `test-import-warnings.csv` fixture for validation testing
  - `newOwnerName` field added to PatientReassignment interface
  - Import preview now shows actual physician name instead of "New physician"
  - Backend unit tests: 54 new tests for diffCalculator, validator, reassignment
  - Total backend tests: 426 (was 360)
  - Total Cypress import tests: 57 (was 43)

- **Spec-Driven Development Infrastructure** (Feb 5, 2026)
  - NEW: `.claude/agents/` - TDD agents (test-writer, implementer, refactorer)
  - NEW: `.claude/commands/` - Spec workflow commands (spec-create, spec-execute, spec-status, spec-list)
  - NEW: `.claude/commands/` - Bug workflow commands (bug-create, bug-analyze, bug-fix, bug-verify)
  - NEW: `.claude/skills/` - Test planning and auditing skills
  - NEW: `.claude/steering/` - Project context docs (product, tech, structure)
  - NEW: `.claude/templates/` - Spec and bug report templates

### Changed
- **Multi-Role User Model** (Feb 5, 2026)
  - Refactored `User.role: UserRole` (single) → `User.roles: UserRole[]` (array)
  - Removed `canHavePatients` boolean field - replaced by having PHYSICIAN in roles array
  - Users can now hold multiple roles simultaneously (e.g., ADMIN + PHYSICIAN)
  - NEW: Prisma migration `20260205070000_convert_role_to_roles_array`
  - Updated all backend routes, middleware, services, and tests for roles array
  - Updated all frontend stores, components, and pages for roles array
  - JWT token payload now includes `roles: UserRole[]` instead of `role: UserRole`
  - `getAllPhysicians()` now queries `roles: { has: 'PHYSICIAN' }` instead of `canHavePatients: true`

- **Cross-Platform Build Script** (Feb 5, 2026)
  - Replaced Unix-only `cp -r` with Node.js cross-platform script
  - NEW: `backend/scripts/copyConfig.js` - copies JSON config files to dist
  - Build now works on Windows, Linux, and macOS
  - Fixed "hill not found" error on Render deployment

### Fixed

---

## [4.2.0] - 2026-02-05

### Added
- **Phase 12: Patient Ownership & Assignment System** (Feb 3, 2026)
  - **Phase 12a: Database & Backend Foundation** (Complete)
    - Added `canHavePatients` boolean field to User model
    - PHYSICIAN role always has `canHavePatients=true` (enforced)
    - ADMIN can opt-in to `canHavePatients` to also be a physician
    - STAFF role always has `canHavePatients=false`
    - Updated seed.ts, authService, admin routes
  - **Phase 12b: Patient Filtering by Owner** (Complete)
    - GET /api/data requires `physicianId` param for ADMIN/STAFF
    - GET /api/data?physicianId=unassigned returns unassigned patients (ADMIN only)
    - GET /api/users/physicians returns users who can have patients
    - GET /api/users/physicians/:id returns specific physician info
    - PHYSICIAN auto-filtered to own patients (no selector needed)
  - **Phase 12c: Import Reassignment Detection** (Complete)
    - Import preview detects patients that would be reassigned
    - Added `reassignments` array to preview response
    - Added `targetOwnerId` to preview cache
    - Import execute requires `confirmReassign=true` if reassignments exist
    - Blocks execution if reassignments not explicitly confirmed
  - **Phase 12d-g: Frontend UI** (Complete)
    - Patient Grid: "Select a physician to view" message for ADMIN/STAFF
    - Import Page: Physician selector dropdown with dynamic step numbering
    - Import Preview: Reassignment warning section with confirmation modal
    - Patient Assignment Page: New `/admin/patient-assignment` for bulk assignment
    - User Management: "Can Have Patients" toggle for ADMIN users
    - Admin Page: "Assign Patients" button linking to assignment page
    - Backend: PATCH /api/admin/patients/bulk-assign endpoint
    - Backend: GET /api/admin/patients/unassigned endpoint
  - **Phase 12h: UI Refinements** (Feb 4, 2026)
    - Provider dropdown now only visible on Patient Grid page (not Import/Admin)
    - ADMIN users can select "Unassigned patients" to view patients without a provider
    - MainPage properly sends `physicianId=unassigned` for unassigned patient view
  - **Header Component Tests** (Feb 4, 2026)
    - NEW: `Header.test.tsx` - 12 tests for provider dropdown visibility and unassigned patients option
    - Tests provider dropdown only shows on Patient Grid page (not Import/Admin)
    - Tests "Unassigned patients" option only available for ADMIN users
    - Tests correct state management when switching between physicians and unassigned
    - Total frontend component tests: 203 (was 191)
  - **Patient Assignment E2E Tests** (Feb 4, 2026)
    - NEW: `patient-assignment.cy.ts` - 32 Cypress tests for patient and staff assignment
    - Tests assigning unassigned patients to physicians
    - Tests patient count updates after assignment
    - Tests staff-physician assignment management
    - Tests data freshness (no caching when switching physicians)
  - **Role-Based Access Control Tests** (Feb 4, 2026)
    - NEW: `role-access-control.cy.ts` - 31 Cypress tests for access restrictions
    - STAFF: Cannot access admin functions, cannot see unassigned patients
    - PHYSICIAN: Cannot access admin (unless also admin), cannot see other doctors' patients
    - ADMIN: Full access to all functions and data
    - API protection tests (401/403 responses)
    - Navigation protection tests
  - **Sorting & Filtering Tests** (Feb 4, 2026)
    - NEW: `sorting-filtering.cy.ts` - 55 Cypress tests for column sorting and status filter bar
    - Column sorting tests: Status Date, Due Date, Member Name, Request Type, Quality Measure, Measure Status, Time Interval
    - Date sorting verified as chronological (not alphabetical)
    - Sort indicator behavior (ascending/descending/clear, single indicator)
    - Status filter bar: All 10 filter chips (All, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A, Duplicates)
    - Filter chip counts and click behavior
    - Filter + sort combination tests
    - Row color verification for each status category
    - Total Cypress tests: 177 (was 122)
  - **Admin Password Reset Email Notification** (Feb 4, 2026)
    - When admin resets a user's password, user receives email notification
    - Email includes admin's name who performed the reset
    - Added `sendAdminPasswordResetNotification` function to emailService
    - Response includes `emailSent` flag indicating notification status
  - **Phase 11/12 Test Coverage** (Feb 4, 2026)
    - NEW: `users.routes.test.ts` - 4 tests for physician endpoint authentication
    - Updated `admin.routes.test.ts` - Added 2 tests for bulk-assign and unassigned patients endpoints
    - Updated `data.routes.test.ts` - Added 1 test for check-duplicate endpoint
    - Updated `emailService.test.ts` - Added 6 tests for admin reset notification content
    - Total backend tests: 360 (was 347)
  - **Requirements Documentation**
    - Physicians see only their own patients (auto-filtered)
    - Staff/Admin must select physician before viewing patients
    - Import requires explicit physician selection (prevents accidental imports)
    - Admin can bulk reassign patients between physicians
    - See `.claude/PATIENT_OWNERSHIP_REQUIREMENTS.md` for full specification
- **Phase 11: Authentication & Multi-Physician Support**
  - JWT-based authentication with login/logout endpoints
  - User model with roles: PHYSICIAN, STAFF, ADMIN
  - Staff-to-Physician assignment for multi-physician coverage
  - Frontend login page with email/password form
  - Zustand auth store with localStorage persistence
  - Protected routes with role-based access control
  - Header user menu with password change and logout
  - Physician selector dropdown for STAFF and ADMIN users
  - Admin dashboard with user management (CRUD)
  - Audit log viewer in admin panel
  - Password reset by admin and CLI script
  - Audit log cleanup script (6-month retention)
- **Data Isolation by Owner**
  - Patient.ownerId field links patients to physicians
  - PHYSICIAN sees only own patients
  - STAFF sees assigned physicians' patients
  - ADMIN can view any physician's patients (with selector)
  - Existing patients remain unassigned (backward compatible)
- **Authentication Test Coverage** (Feb 2, 2026)
  - Backend authService.test.ts (19 tests): password hashing, JWT tokens, toAuthUser
  - Backend auth.test.ts middleware (13 tests): requireAuth, requireRole, optionalAuth
  - Backend auth.routes.test.ts (8 tests): login validation, auth requirements
  - Backend admin.routes.test.ts (10 tests): admin endpoint auth requirements
  - Frontend LoginPage.test.tsx (17 tests): form rendering, validation, auth flow
  - Frontend authStore.test.ts (25 tests): login/logout, session persistence
  - E2E auth.spec.ts (9 tests): login form, credentials, session, protected routes
  - Enhanced CLAUDE.md testing requirements with emphasis and checklists
- **Installation Guide** (Feb 2, 2026)
  - Created `docs/INSTALLATION_GUIDE.md` for self-hosted server deployment
  - Docker Compose deployment option (recommended)
  - Manual installation option for custom environments
  - Environment variables reference (required + optional SMTP)
  - Architecture diagram with Nginx reverse proxy
  - SSL/TLS configuration options (Let's Encrypt, self-signed, corporate)
  - Backup and restore procedures
  - Troubleshooting section
  - Updated CLAUDE.md to require installation guide updates for deployment-affecting changes
- **Simplified Installation for Network Admins** (Feb 2, 2026)
  - Added Quick Start section with 5-step Docker path and 3-step script path
  - Created `docker-compose.prod.yml` for production deployment
  - Created `frontend/Dockerfile` for containerized frontend
  - Created `scripts/install.sh` automated installer (Ubuntu/Debian/RHEL/CentOS)
  - Created `nginx/nginx.prod.conf` for production reverse proxy
  - Updated `.env.example` with all configuration options and comments
  - Added non-git installation options (release archive, pre-built bundle)
- **Forgot Password Feature** (Feb 3, 2026)
  - `/forgot-password` page with email form (checks SMTP status)
  - `/reset-password` page with token validation and new password form
  - `POST /api/auth/forgot-password` - creates token, sends reset email
  - `POST /api/auth/reset-password` - validates token, updates password
  - `GET /api/auth/smtp-status` - frontend checks if email is available
  - `PasswordResetToken` database model with 1-hour expiration
  - Email service using nodemailer (configurable SMTP)
  - Graceful fallback when SMTP not configured ("Contact administrator")
  - "Forgot password?" link added to login page

### Changed
- All data/config/import routes now require authentication
- PatientGrid and MainPage pass physicianId for STAFF and ADMIN users
- AuditLog model updated with userId relation and changes field
- Removed username field - authentication uses email only
- Admin page now includes Header with full navigation
- Edit lock uses email instead of username
- **Removed username from Admin user form** (Feb 4, 2026)
  - Removed username field from create/edit user modal
  - Removed username from AdminUser and AuditLogEntry interfaces
  - Users are identified by email only
- **Dual role display for ADMIN with canHavePatients** (Feb 4, 2026)
  - Admin users with canHavePatients=true show both "ADMIN" and "PHYSICIAN" badges
  - Header shows "(ADMIN + PHYSICIAN)" for these users
  - Patient count column shows count for admins who can have patients

### Fixed
- **Status Date and Due Date columns sorting alphabetically instead of chronologically** (Feb 4, 2026)
  - Bug: Dates like "1/15/2026" sorted before "10/1/2025" due to string comparison
  - Cause: AG Grid valueGetter returns formatted date strings, default sort compares as strings
  - Fix: Added custom comparator to statusDate and dueDate columns that compares ISO date strings
  - Now correctly sorts dates in chronological order with empty dates at the end
- **Unassigned patients not displaying for ADMIN users** (Feb 4, 2026)
  - Bug: When ADMIN selected "Unassigned patients" from dropdown, grid showed "Select a Physician" prompt
  - Cause: `needsPhysicianSelection` check treated `null` (unassigned selection) as "no selection"
  - Fix: Updated check in MainPage.tsx to distinguish between ADMIN (allows null for unassigned) and STAFF (requires physician)
  - Also fixed: Dockerfile not copying frontend `public` folder to container
- **Delete row not working for ADMIN users** (Feb 4, 2026)
  - Bug: Delete API call missing `physicianId` query parameter
  - Cause: Phase 12 added physician filtering requirement but delete endpoint wasn't updated
  - Fix: Added `getQueryParams()` to delete API call in MainPage.tsx
- **Import Replace mode counting all patients instead of target owner's** (Feb 4, 2026)
  - Bug: Replace mode showed DELETE count for ALL patients (e.g., 117) instead of target physician's patients
  - Cause: `loadExistingRecords()` loaded all records without filtering by owner
  - Fix: Added `targetOwnerId` parameter to `calculateDiff()` and `loadExistingRecords()`
  - Now correctly shows DELETE count only for patients belonging to the selected physician
- Fixed double `/api` prefix in forgot/reset password API calls (was `/api/api/auth/...`)
- Added `dotenv` to backend for automatic `.env` loading in local development
- Configured SMTP environment variables on Render production deployment
- Added `APP_URL` environment variable on Render for correct password reset links

---

## [4.0.0] - 2026-02-01

### Added
- **Validation Error Details on Import Page**
  - Import page now shows detailed validation errors with row numbers and member names
  - Each error displays the specific field and error message
  - Scrollable error list for multiple errors
- **Warnings Display on Preview Page**
  - Added "Warnings" card in summary row showing warning count
  - Added yellow warnings section below summary displaying all warnings
  - Warnings include row number, member name, and message
  - Orange highlighting when warnings exist, gray when none
- **Test Data for BOTH Action**
  - Added `test-data/test-both-kept.csv` for testing duplicate/both-kept scenarios

### Changed
- **Phase 5j: Import UI - Upload Page** (`/import`)
  - Healthcare system selection dropdown (Hill Healthcare)
  - Import mode selection with Merge as default (recommended)
  - Replace All warning modal - confirms before deleting all data
  - Drag-and-drop file upload with type validation (CSV, Excel)
  - Step-by-step wizard UI with numbered sections
  - Loading state and error handling
  - Routes to `/import/preview/:previewId` on successful preview generation
  - Header navigation updated: "Import Test" → "Import"
- **Phase 5k: Import UI - Preview Page** (`/import/preview/:previewId`)
  - Summary cards showing INSERT, UPDATE, SKIP, BOTH, DELETE counts
  - Clickable cards to filter changes table by action type
  - Patient counts (new vs existing)
  - Changes table with action badges, patient info, status changes
  - Cancel button cleans up preview and returns to upload page
  - Execute button applies changes with loading state
  - Success screen with import statistics and navigation
  - Error handling for expired/missing previews
- **Import Page Tests**
  - Vitest component tests: ImportPage.test.tsx (26 tests)
  - Vitest component tests: ImportPreviewPage.test.tsx (23 tests, including warnings display)
  - Cypress E2E tests: import-flow.cy.ts (29 tests)
  - Test fixture: cypress/fixtures/test-import.csv

### Fixed
- **Cypress Import E2E test stability**
  - Added `force: true` to file upload commands for reliable execution
  - Fixed filter card assertion (ring-2 class is on button, not parent)
  - Fixed test-import.csv fixture with correct column names (Annual Wellness Visit, etc.)
  - Removed flaky "Processing..." loading state check
- **Quality Measure Addition Checklist** (`.claude/ADDING_QUALITY_MEASURES.md`)
  - Complete 12-file checklist for adding new quality measures
  - Covers: seed.ts, dropdownConfig.ts, validator.ts, hill.json, row colors, tests
  - Example implementation for Depression Screening
- **Depression Screening** added to TODO.md as High Priority task
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
- **Phase 5g: Preview API + UI**
  - Preview endpoints in `import.routes.ts` (POST /preview, GET /preview/:id, DELETE /preview/:id)
  - Preview tab in ImportTestPage.tsx with summary stats and changes table
  - Action filter dropdown (All, INSERT, UPDATE, SKIP, BOTH, DELETE)
  - Patient counts (new vs existing)
- **Merge Logic Integration Tests**
  - `mergeLogic.test.ts` - 12 integration tests for all 6 merge cases
  - Tests merge mode (INSERT, UPDATE, SKIP, BOTH) and replace mode (DELETE all + INSERT)
  - Edge case tests for blank values and case-insensitive status matching
- **Merge Test Data File**
  - `test-data/merge-test-cases.csv` - 15 rows covering all 6 merge cases
  - `test-data/MERGE-TEST-CASES-README.md` - Documentation with expected results
  - Expected counts: 9 INSERT, 4 UPDATE, 5 SKIP, 2 BOTH, 0 DELETE
- **Phase 5h: Import Executor**
  - `backend/src/services/import/importExecutor.ts` - Execute database operations
  - Replace mode: Bulk delete existing + insert all new records
  - Merge mode: Process INSERT (create), UPDATE (upgrade status), SKIP, BOTH (downgrade - keep existing + add new)
  - Prisma transactions ensure atomicity (all-or-nothing)
  - Post-execution: syncAllDuplicateFlags(), deletePreview()
  - 16 unit tests covering all scenarios
- **Phase 5i: Execute API Endpoint**
  - POST /api/import/execute/:previewId - Execute import from cached preview
  - Returns execution stats and any errors
  - Validates preview exists before executing
- **Execute Button in Import Test Page**
  - Red "Execute Import" button in preview header
  - Execution results display with stats (inserted, updated, deleted, skipped, bothKept)
  - Error display for failed operations
  - Link to main grid after successful import
- **Test Coverage Improvements**
  - Fixed 3 failing mergeLogic integration tests by properly detecting seeded database data
  - Backend coverage: 89% statements, 80% branches (241 tests)
  - Frontend coverage: 99% statements, 96% branches (70 tests)
  - fileParser.ts: 59% → 95% (added Excel parsing, title row detection tests)
  - diffCalculator.ts: 63% → 97% (exported and tested categorizeStatus, applyMergeLogic)
  - StatusFilterBar.tsx: 33% → 100% (added getRowStatusColor tests for all status categories)

### Changed
- **HgbA1c Due Date Calculation** - Tracking #2 dropdown now required (no base fallback)
  - Removed baseDueDays for HgbA1c ordered (was 14), HgbA1c at goal (was 90), HgbA1c NOT at goal (was 90)
  - Due date only calculated when user selects from Tracking #2 dropdown (1-12 months)
  - Time interval is read-only for all HgbA1c statuses (controlled by dropdown)
  - Added "HgbA1c ordered" to TIME_PERIOD_DROPDOWN_STATUSES in frontend and backend
- **Status Filter Label** - Changed "Not Started" to "Not Addressed" in filter bar
- **Tracking Dropdown Prompts** - Added "Select time period" prompt for empty tracking dropdowns
  - Shows gray italic text when dropdown selection is expected but not yet made
  - Applies to: Screening discussed (Tracking #1), BP call back statuses (Tracking #1)

### Fixed
- **Date Parser Excel Serial Detection** - Fixed bug where dates like "05/15/1970" were parsed as Excel serial numbers
  - Root cause: `parseFloat("05/15/1970")` returns `5`, which was incorrectly treated as Excel serial
  - Fix: Added regex check `/^\d+$/` to ensure string contains ONLY digits before treating as Excel serial
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
- **Cascading Field Clear Race Condition** - Fixed bug where dueDate/timeIntervalDays were not cleared when changing measureStatus
  - Root cause: `setDataValue()` calls for cascading fields triggered separate `onCellValueChanged` events, causing parallel API calls
  - The secondary API calls used OLD measureStatus/statusDate values to recalculate dueDate, overwriting the correct null values
  - Symptom: Row stayed red (overdue) after changing from "Scheduled call back - BP not at goal" to "Blood pressure at goal"
  - Fix: Added `isCascadingUpdateRef` flag to skip API calls for programmatic `setDataValue` changes

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
