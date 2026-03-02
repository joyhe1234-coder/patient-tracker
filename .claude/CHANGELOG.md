# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [4.15.1] - 2026-03-02

### Added
- **76 new frontend Vitest tests** — Closes test gaps across multiple modules:
  - `App.test.tsx` (11 tests): Full routing coverage (login, forgot-password, admin, patient-management, import redirects, catch-all)
  - `toast.test.ts` (9 tests): DOM creation, accessibility (role="alert"), color themes (info/error/success/warning), auto-dismiss timer
  - `MainPage.loading.test.tsx` (5 tests): Loading spinner, error state, Retry button, successful retry hides error
  - `isTimeIntervalEditable.test.ts` (11 tests): Undefined data, null/empty statusDate, null timeIntervalDays, dropdown statuses, editable statuses, TIME_PERIOD_DROPDOWN_STATUSES constant
  - `Header.test.tsx` (+25 tests): ChangePasswordModal validation (empty fields, length, mismatch), API call on save, success/error UI, toggle visibility, close/cancel behavior
  - `axios.test.ts` (+10 tests): sanitizeForLogging (null, string, number, redaction, immutability), getApiBaseUrl (no env, https prefix, onrender suffix), interceptor edge cases, X-Socket-ID header
  - `cascadingFields.test.ts` (+4 tests): Edge cases for cascading field clearing
  - `ConflictResolutionStep.test.tsx` (+2 tests): Additional conflict resolution scenarios
  - `MappingTable.test.tsx` (+1 test): Mapping table edge case
- **9 new backend Jest tests** — Authorization boundary tests:
  - `data.routes.test.ts` (+3 tests): 403 Forbidden when patient/measure/row belongs to another physician (POST, PUT, DELETE)
  - `patientHandlers.bulkAssign.test.ts` (+4 tests): Socket.IO broadcast edge cases for bulk assignment
  - `fileParser.test.ts` (+2 tests): File parser edge cases

### Changed
- **`axios.ts`** — Exported `sanitizeForLogging` and `getApiBaseUrl` for direct unit testing (were previously private)
- **`PatientGrid.tsx`** — Exported `TIME_PERIOD_DROPDOWN_STATUSES` constant and `isTimeIntervalEditable` helper for direct unit testing (were previously private)

### Tests
- Backend (Jest): 1,599 tests passing (56 suites) — +9 from v4.15.0
- Frontend (Vitest): 1,456 tests passing (58 suites) — +76 from v4.15.0

---

## [4.15.0] - 2026-03-02

### Added
- **Bulk Operations tab** — New ADMIN-only tab in Patient Management page for bulk patient management (assign, unassign, delete). Components: `BulkOperationsTab.tsx` (504 lines), `AssignModal.tsx`, `UnassignModal.tsx`, `DeleteModal.tsx`, `Toast.tsx`, `bulkPatientStore.ts` (Zustand), `bulkPatient.ts` types
- **GET /api/admin/patients** — New endpoint returns all patients with summary statistics (total, assigned, unassigned, insurance systems) for the Bulk Operations tab
- **DELETE /api/admin/patients/bulk-delete** — New endpoint for permanent hard delete of patients with audit logging and Socket.IO broadcast
- **Socket.IO broadcasts for bulk operations** — `bulkAssignPatients` now queries previous owners and broadcasts `data:refresh` to affected rooms (new owner, previous owners, unassigned); `bulkDeletePatients` broadcasts to all affected owner rooms
- **Disaster Recovery runbook** — `docs/DISASTER_RECOVERY.md` with 5 recovery scenarios (hardware failure, DB corruption, ransomware, accidental delete, cloud failure), quarterly restore test checklist
- **Automated backup scripts (Windows)** — `scripts/backup.ps1` (AES-256 encryption via 7-Zip, off-site NAS copy, GFS retention, logging, Event Log on failure), `scripts/verify-backup.ps1` (backup validation)
- **Backup automation in installer** — `scripts/install-windows.ps1` now generates `BACKUP_ENCRYPTION_KEY`, prompts for off-site path, creates Windows Task Scheduler task for daily 2 AM backups
- **74 new frontend Vitest tests** — `BulkOperationsTab.test.tsx`, `bulkPatientStore.test.ts`, `AssignModal.test.tsx`, `UnassignModal.test.tsx`, `DeleteModal.test.tsx`, `Toast.test.tsx`, `PatientManagementPage.test.tsx` (+13 bulk-ops tests)
- **30 new backend Jest tests** — `admin.routes.bulkpatient.test.ts`, `patientHandlers.bulkAssign.test.ts`, `patientHandlers.bulkDelete.test.ts`, `patientHandlers.getAllPatients.test.ts`
- **Bulk Operations Cypress E2E** — `bulk-operations.cy.ts` (437 lines)
- **Bulk Operations Playwright E2E** — `bulk-operations.spec.ts` (467 lines)
- **UI/UX review** — `reviews/bulk-operations-tab-2026-03-02.md` and `page-guides/bulk-operations.md`

### Changed
- **Installation guides updated** — `INSTALLATION_GUIDE.md` enhanced backup section (GFS retention, encryption, off-site, quarterly test), `WINDOWS_SERVER_INSTALL.md` rewritten backup/restore section with automated scripts
- **Update script enhanced** — `scripts/update.ps1` now delegates to `backup.ps1` when available (encrypted, logged), falls back to inline pg_dump
- **PatientManagementPage** — Added `bulk-ops` tab ID, lazy-loads BulkOperationsTab for ADMIN role, URL param `?tab=bulk-ops` support
- **patientHandlers.ts** — `bulkAssignPatients` now tracks previous owners for Socket.IO broadcast to affected rooms on reassignment
- **admin.routes.ts** — Added `getAllPatients` and `bulkDeletePatients` route registrations

### Tests
- Backend (Jest): 1,590 tests passing (56 suites) — +30 from v4.14.0
- Frontend (Vitest): 1,380 tests passing (54 suites) — +74 from v4.14.0

---

## [4.14.0] - 2026-03-01

### Fixed
- **Import Replace All deleting other insurance groups** — `diffCalculator.ts` now scopes Replace All mode to only delete records matching the imported insurance system (e.g., Hill import no longer deletes Sutter patients). Passes `systemId` through `import.routes.ts` → `calculateDiff()`
- **Import reassignment creating duplicate measures** — New `loadReassignmentRecords()` in `diffCalculator.ts` loads existing measures for patients being reassigned to a different owner, so diff produces SKIP/UPDATE instead of INSERT (duplicates)
- **Import merge mode not reassigning patients** — `importExecutor.ts` now calls `reassignPatientIfNeeded()` during SKIP/UPDATE actions to update patient ownerId for reassigned patients
- **Socket reconnection data loss** — `useSocket.ts` now tracks connection state with `hasBeenConnectedRef`/`wasDisconnectedRef` and re-joins physician room + refreshes data on reconnection (was silently losing live updates after network interruption)
- **Depression Screening "Screening complete" missing baseDueDays** — `seed.ts` sets `baseDueDays: 365` for "Screening complete" status (was null, preventing due date calculation)
- **BUG-6 filter bar count mismatch** — Marked as FIXED; both filter counting and visual display now use shared `getRowStatusColor()` from `statusColors.ts`

### Added
- **Admin role change cleanup** — `userHandlers.ts` cleans up StaffAssignment records when roles change: removing STAFF deletes staff assignments, removing PHYSICIAN deletes physician assignments and unassigns owned patients
- **Bug reports** — `.claude/bugs/import-reassignment-duplicates/` and `.claude/bugs/replace-all-deletes-other-insurance/` with report, analysis, and verification docs
- **Test spec task breakdowns** — `tasks.md` added to 6 test spec modules (test-admin-management, test-auth-security, test-filtering-search, test-import-pipeline, test-quality-measures-colors, test-realtime-collaboration)
- **132 new backend Jest tests** — auth.routes (+373 lines), admin.routes (+279 lines), import.routes (+89 lines), data.routes.version (+63 lines), socketManager (+194 lines), diffCalculator (+362 lines), importExecutor (+352 lines), previewCache (+82 lines), and more across 22 test files
- **95 new frontend Vitest tests** — statusColors (+132 lines), PatientGrid (+137 lines), useSocket (+119 lines), MainPage (+93 lines), dropdownConfig (+33 lines), AdminPage (+34 lines), ProtectedRoute (+39 lines), SheetSelector (+45 lines)
- **New Cypress E2E tests** — filter-roles-combined.cy.ts, expanded cascading-dropdowns (+229 lines), expanded row-color-comprehensive (+234 lines), expanded sorting-filtering (+162 lines), expanded time-interval (+221 lines), expanded compact-filter-bar (+116 lines)
- **New Playwright E2E tests** — auth-edge-cases.spec.ts (force-change modal, account lockout, post-logout)
- **New backend test files** — cors.test.ts (CORS headers), securityHeaders.test.ts, updateUser.staffCleanup.test.ts, reassignment-merge.test.ts
- **Security audit findings** — 16 findings (0 critical, 5 high, 7 medium, 4 low) documented in TODO.md with remediation plan
- **Workflow audit reports** — `.claude/audit/feature-1-authentication.md` (8 workflows) and `.claude/audit/feature-6-realtime-collaboration.md` (13 workflows + critical gaps identified)

### Changed
- **Test spec requirements updated** — All 8 test spec requirements.md files refined with expanded test cases and updated module boundaries

### Tests
- Backend (Jest): 1,560 tests passing (52 suites) — +132 from v4.13.3
- Frontend (Vitest): 1,306 tests passing (48 suites) — +95 from v4.13.3

---

## [4.13.3] - 2026-02-26

### Fixed
- **AG Grid cell edit input height** -- Text input was shorter than the row height when editing cells. Added `height: 100% !important`, `line-height: normal !important`, `box-sizing: border-box` to `.ag-cell-edit-wrapper input` and `.ag-cell-editor input` in `frontend/src/index.css`

### Added
- **9 due date calculator unit tests** -- `backend/src/services/__tests__/dueDateCalculator.test.ts`: boundary month patterns ("In 1 Month", "In 11 Months", non-matching tracking1 fallback), priority ordering (DueDayRule overrides baseDueDays, fallback to baseDueDays when no DueDayRule match), baseDueDays edge cases (1-day, 7-day, 365-day, null baseDueDays)

### Tests
- Backend (Jest): 1,428 tests passing (48 suites) -- +9 from last release
- Frontend (Vitest): 1,211 tests passing (48 suites) -- no change

---

## [4.13.2] - 2026-02-26

### Fixed
- **Production row colors not turning red (past-due dates)** — Root cause: `prisma db seed` was never run on Render production, so `MeasureStatus.baseDueDays` was NULL, causing `calculateDueDate()` to return null and all due-date-based row coloring to fail
- **Production seed now runs on every deploy** — Added `npm run seed` to `render.yaml` `startCommand` so config data (quality measures, statuses, baseDueDays) is seeded on every Render deploy
- **Seed skips dev data in production** — Added `NODE_ENV=production` guard in `seed.ts` to skip dev users and sample patient data when running in production, preventing test accounts from appearing in prod

### Changed
- **`backend/package.json`** — Added `prisma.seed` config (`tsx prisma/seed.ts`) for `npx prisma db seed` support
- **`render.yaml`** — `startCommand` now runs `npx prisma migrate deploy && npm run seed && npm start` (was `npx prisma migrate deploy && npm start`)
- **`backend/prisma/seed.ts`** — Early return after config data when `NODE_ENV=production`, skipping dev users and sample patients

### Tests
- Backend (Jest): 1,419 tests passing (48 suites) — no change
- Frontend (Vitest): 1,211 tests passing (48 suites) — no change

---

## [4.13.1] - 2026-02-26

### Added
- **Test Gap Remediation Plan** — `.claude/TEST_PLAN.md`: comprehensive test plan with 5-layer pyramid, role-based strategy, per-module coverage targets (~154 new tests planned across Tiers 1-2)
- **7 Test Spec Modules** — `.claude/specs/test-{auth-security,patient-grid,quality-measures-colors,import-pipeline,admin-management,realtime-collaboration,filtering-search}/` with requirements and task breakdowns
- **7 Module Test Plans** — `.claude/test-plans/M1-M7` covering auth/security, patient grid, quality measures, import pipeline, admin management, realtime collaboration, filtering/search
- **Cell Editing Conflict E2E** — `frontend/cypress/e2e/cell-editing-conflict.cy.ts`: Cypress tests for 409 VERSION_CONFLICT modal lifecycle (trigger, display, Keep Mine / Keep Theirs / Cancel resolution, grid state verification)
- **Grid Editing Roles E2E** — `frontend/cypress/e2e/grid-editing-roles.cy.ts`: per-role (Admin, Physician, Staff) column editing verification (dropdown + text field per role)
- **Row Operations E2E** — `frontend/cypress/e2e/row-operations.cy.ts`: add row modal + delete row lifecycle through Toolbar buttons
- **Duplicate Detector edge-case tests** — 5 new Jest tests: delete-one-of-two clears flag, three-way delete leaves two flagged, whitespace-padded requestType, QM edit recalculation
- **Toolbar edge-case tests** — 3 new Vitest tests: all 4 buttons enabled state, disabled Delete click no-op, Member Info toggle CSS class

### Changed
- **Spec docs updated for tracking3 removal** — `code-quality-refactor/design.md`, `insurance-group/design.md`, `parallel-editing/design.md`: `tracking3` replaced with `depressionScreeningStatus` in interface definitions and cascading field arrays
- **Row colors requirements expanded** — `row-colors/requirements.md`: added AC-15 through AC-24 for Depression Screening status-to-color mapping (7 statuses, overdue rules, exclusions)
- **Security hardening requirements updated** — `security-hardening/requirements.md`: REQ-SEC-03 (Rate Limiting) and REQ-SEC-07 (JWT httpOnly Cookie) marked as [DEFERRED]

### Tests
- Backend (Jest): 1,419 tests passing (48 suites) — +4 from last release
- Frontend (Vitest): 1,211 tests passing (48 suites) — +3 from last release
- New Cypress E2E test files: cell-editing-conflict, grid-editing-roles, row-operations

---

## [4.13.0] - 2026-02-26

### Added
- **Comprehensive Row Color E2E Tests** — `row-color-comprehensive.cy.ts` (179 Cypress tests) covering all 14 quality measures x all statuses (93 tests), tracking #1 dropdown with all options + date-to-overdue (52 tests), HgbA1c T1 text + T2 dropdown + date (13 tests), BP T1 dropdown + T2 text + date (5 tests), date entry overdue/today/terminal/no-dueDate (23 tests), time interval editing (2 tests), and color transitions (2 tests)
- **Multi-Role Row Color E2E Tests** — `row-color-roles.cy.ts` with 8 core color scenarios per role (ADMIN, PHYSICIAN, STAFF)
- **Feature-by-Feature Coverage Audit** — Added to TODO.md as HIGH priority: 7 features x 5 audit layers (backend, frontend, E2E, visual browser, role-based access)
- **Row Color E2E Spec** — `.claude/specs/row-color-e2e/test-plan.md` documenting the comprehensive test plan
- **Feature Test Modules** — `.claude/FEATURE_TEST_MODULES.md` mapping features to their test files across all layers

### Changed
- **Add Row Modal** — Split single "Member Name" field into separate Last Name (required), First Name (required), and MI (optional) fields with "Last, First Middle" concatenation format
- **AG Grid row color updates** — Replaced `refreshCells()` with `redrawRows()` for row color changes. `refreshCells` only refreshes cell renderers, not row-level CSS classes from `rowClassRules`; `redrawRows` re-evaluates the full row template including background colors
- **AG Grid API exposure for Cypress** — Exposed `window.__agGridApi` in Cypress environment for reliable `startEditingCell()` calls (bypasses click timing issues in dropdown tests)
- **Cypress `selectAgGridDropdown`** — Rewritten to use `gridApi.startEditingCell()` directly instead of click-based approach, eliminating popup timing failures
- **Cypress `waitForAgGrid`** — Now waits for `window.__agGridApi` property (grid API ready) in addition to DOM visibility
- **Cypress `addTestRow`** — Updated for new split name fields (Last Name, First Name)
- **Role-Based Access Control tests** — Complete rewrite of `role-access-control.cy.ts` using dedicated seed accounts (admin, adminphy, phy1, phy2, staff1, staff2) instead of shared admin-only tests. Now tests all 4 roles with real login + actual API-level access control (STAFF 403 for unassigned, PHYSICIAN data scoping)
- **Seed data** — `seed.ts` now calculates `dueDate` and `timeIntervalDays` using `calculateDueDate()` for all seeded patient measures, ensuring seed data has correct overdue/color state on first load

### Fixed
- **Edit conflict "Keep Theirs" cascading 409 bug** — "Keep Theirs" was using `setDataValue()` per-field which triggered `onCellValueChanged` → API PUT with stale `updatedAt` → cascading VERSION_CONFLICT errors. Now uses `setData()` to replace the entire row silently (including fresh `updatedAt`) without triggering cell change events
- **Edit conflict "Cancel" stale state bug** — Canceling a conflict modal left the row with stale `updatedAt`, causing all future edits to fail with 409. Now restores server row data (including fresh `updatedAt`) on cancel

### Tests
- Backend (Jest): 1,415 tests passing (48 suites)
- Frontend (Vitest): 1,208 tests passing (48 suites) — +6 new AddRowModal tests (name concatenation, whitespace trimming)
- Cypress: +179 row-color-comprehensive + ~24 row-color-roles + rewritten role-access-control (~36 tests)
- REGRESSION_TEST_PLAN.md Section 5 (Row Colors): upgraded from 7 TCs / 50% automated to 16 TCs / 100% automated

---

## [4.12.1] - 2026-02-25

### Added
- **Playwright visual regression testing** — Automated screenshot comparison for 5 key pages (login, main grid, admin dashboard, import page, filter bar). Configured with `maxDiffPixelRatio: 0.01` and `animations: 'disabled'` in `playwright.config.ts`. New test file: `frontend/e2e/visual-regression.spec.ts`
- **New test files** — 13 new test files covering gaps: socketIdMiddleware, dateParser (backend); accessibility, admin-management, import-reassignment, password-flows, visual-regression (Playwright E2E); axios, ImportResultsDisplay, PreviewSummaryCards, DuplicateWarningModal, ResetPasswordModal, UserModal (Vitest)
- **@axe-core/playwright** dependency added for accessibility testing
- **socketManager.clearAllState()** utility for test isolation between test cases

### Changed
- **Migrated fireEvent → userEvent** across 25 Vitest test files (~195 occurrences). `userEvent` is now the standard interaction API for all component tests. `fireEvent` retained only for AG Grid keyboard/mouse handlers in `AutoOpenSelectEditor.test.tsx` (fake timers + userEvent incompatibility).
  - Batch 1 (Modals): AddRowModal, ResetPasswordModal, UserModal, ConfirmModal, ConflictModal, DuplicateWarningModal
  - Batch 2 (Layout): StatusFilterBar, Header, Toolbar, StatusBar
  - Batch 3 (Pages): PatientAssignmentPage, MappingManagementPage, LoginPage, AdminPage, PatientManagementPage
  - Batch 4 (Import & Grid): AutoOpenSelectEditor, StatusDateRenderer, ActionPatternTable, PreviewSummaryCards, ImportResultsDisplay, ForcePasswordChange
  - Batch 5 (Low-count): ImportPreviewPage, ForgotPasswordPage, ResetPasswordPage, ImportPage (unused `fireEvent` imports removed)
- **Accessibility improvements** — Added `htmlFor`/`id` associations to form labels in UserModal and ResetPasswordModal; added `aria-label` attributes to role radio buttons in UserModal; added `aria-label` to physician select dropdown in Header
- **UI contrast improvements** — StatusBar connection status text bumped to 700-weight colors (green-700, yellow-700, red-700, gray-600); filter summary text to gray-600; StatusFilterBar inactive buttons use `hover:bg-gray-50` and `border-dashed` instead of opacity-50
- **Playwright config** — Added local retry (1), parallel workers (3), screenshot comparison settings
- **Removed empty agGridMocks.test.ts** — File had all tests removed in prior audit but still existed, causing Vitest "no test suite found" error

### Fixed
- **AutoOpenSelectEditor keyboard tests** — Switched from `userEvent.keyboard` to `fireEvent.keyDown` to resolve 5-second timeouts caused by fake timers + userEvent async scheduling incompatibility
- **StatusFilterBar search test** — Fixed controlled input test assertion to verify per-keystroke `onSearchChange` calls instead of expecting single aggregate call
- **ActionPatternTable pattern test** — Fixed controlled input test to verify `onActionChange` callback fires with typed character rather than expecting full string replacement
- **UserModal empty password test** — Updated to verify HTML5 `required` attribute prevents form submission rather than expecting custom error message
- **Playwright E2E waitForTimeout elimination** — Replaced 6 `page.waitForTimeout()` calls with proper Playwright assertions across 5 E2E test files (import-all-roles, sutter-import-edge-cases, sutter-import-errors, sutter-import-visual, visual-regression). Now uses `expect().not.toHaveValue()`, `waitForSheetDiscovery()`, `Promise.race()` with element/URL waiters, and `expect().toHaveAttribute()` instead of arbitrary delays

### Documentation
- **TESTING.md**: Added "Visual Regression" section, "userEvent Convention" section with migration reference table, Cypress retention rationale
- **REGRESSION_TEST_PLAN.md**: Added sections 44-48 (Authentication, Authorization, Password Flows, Admin Management, Import Reassignment) with 80+ new test cases
- **TEST_GAP_ANALYSIS.md**: New document cataloguing test coverage gaps and prioritization

---

## [4.12.0] - 2026-02-23

### Added
- **Depression Screening quality measure** — Full stack support for a new Screening-type quality measure with 7 statuses:
  - Not Addressed (white), Called to schedule (blue, 7-day timer), Visit scheduled (yellow, 1-day timer), Screening complete (green), Screening unnecessary (gray), Patient declined (purple), No longer applicable (gray)
  - `dropdownConfig.ts`: Added Depression Screening to Screening request type (now 4 measures) with 7 status options
  - `statusColors.ts`: Added "Called to schedule" (blue), "Visit scheduled" (yellow), "Screening complete" (green) to color arrays; "Patient declined" already covered by purple; "Screening unnecessary" and "No longer applicable" already covered by gray
  - `statusDatePromptResolver.ts`: Date prompts for Called to schedule (Date Called), Visit scheduled (Date Scheduled), Screening complete (Date Completed)
  - `validator.ts`: Added "Depression Screening" to VALID_QUALITY_MEASURES for Screening type
  - `hill.json`: Added "Depression Screening" and "Depression Screening E" column mappings + compliant/nonCompliant status mapping; removed "Depression Screening" from skipColumns
  - `sutter.json`: Added regex pattern `^Depression [Ss]creening|^PHQ-?9|^Screen.*depression` to action mapping
  - `seed.ts`: Added Depression Screening quality measure, 7 statuses with datePrompts/baseDueDays, 6 sample patients, 7 sample patient measures (including one overdue scenario)
- **Test data updated** for Depression Screening:
  - `test-hill-valid.csv`: Added Depression Screening Q1/Q2 columns (now 16 columns per patient)
  - `test-hill-valid.csv.json`: Expected output updated (42 -> 50 output rows, 6 measure types)
  - `test-sutter-valid.xlsx`: Added 3 Depression Screening rows in Physician One (Hill, James patients) + 1 in Physician Two (Nelson)
  - `create-sutter-fixtures.ts`: Updated fixture creation with Depression Screening test rows

### Tests
- Backend (Jest): 1,387 tests passing (47 suites)
- Frontend (Vitest): 1,152 tests passing (43 suites) — +14 new Depression Screening tests
  - `dropdownConfig.test.ts`: +5 tests (4 screening measures, 7 Depression statuses, first status, all statuses, no tracking1)
  - `statusColors.test.ts`: +10 tests (color list assertions + 7 Depression-specific color tests including overdue/terminal behavior)
  - `StatusFilterBar.test.tsx`: +1 test (15 measure dropdown options)
  - `sutter-integration.test.ts`: Updated row counts (18->21 Physician One, 16->18 output, 8->9 Physician Two)
  - `actionMapper.test.ts`: Updated pattern count (10->11)

---

## [4.11.1] - 2026-02-23

### Fixed
- **Wrong-file false positives** in `conflictDetector.ts`: Added dual-ratio check — files where >= 50% of file columns match config are no longer flagged as wrong file, even if they cover < 10% of config columns (fixes partial/small files being rejected)
- **MISSING conflict false positives** in `conflictDetector.ts`: Skip MISSING conflicts for config columns whose `targetField` is already covered by another matched or fuzzy-matched column (e.g., "Patient Full Name" CHANGED to "Patient" no longer also generates a MISSING for the original)
- **Patient field auto-population** in `ConflictResolutionStep.tsx`: ACCEPT_SUGGESTION for patient columns now auto-populates `targetPatientField` from `patientFieldInfo` (was only auto-populating measure columns)
- **Sutter header row alignment** in `fileParser.ts`: Changed `blankrows: false` to `blankrows: true` in `sheet_to_json` so physical row positions are preserved — `headerRow` config index (e.g., row 3) now correctly points to the header even when blank rows exist before it
- **Blank row filtering** in `fileParser.ts`: After switching to `blankrows: true`, added post-parse filter to strip completely blank data rows
- **Sheet validation fuzzy fallback** in `import.routes.ts`: `validateSheetHeaders()` now uses fuzzy matching (0.70 threshold) as fallback for patient column presence — renamed columns no longer cause false "missing patient columns" rejection
- **Sheet validation Q1/Q2 suffix matching** in `import.routes.ts`: Data column matching now also checks with ` q1`/` q2` suffixes, fixing Hill files where headers like "Breast Cancer Screening E Q1" didn't match config key "Breast Cancer Screening E"
- **`patientFieldInfo` in FuzzySuggestion type**: Added to both backend `conflictDetector.ts` and frontend `import-mapping.ts` types for patient column suggestion metadata

### Changed
- **Cypress test hardening** across 20+ spec files:
  - Extracted `cy.login()` custom command replacing repeated login boilerplate in `beforeEach` blocks
  - Fixed dropdown option counting to exclude `(clear)` placeholder option
  - Replaced `.ag-cell-edit-wrapper input` selector with `.date-cell-editor` for date input cells
  - Breast Cancer Screening tests now search for existing row before setting up (avoids 409 duplicate errors)
  - Various stability improvements (longer waits, better selectors, retry patterns)
- **Playwright test hardening** across 10+ spec and page-object files:
  - Updated page objects for improved selectors and wait strategies
  - Aligned with current UI state after conflict detection improvements

### Tests
- Backend (Jest): 1,387 tests passing (47 suites)
- Frontend (Vitest): 1,138 tests passing (43 suites)
- Regression test plan: Added sections 38-42 (56 test cases, 100% automated)
- Total automated: ~2,525+ (1,387 Jest + 1,138 Vitest + Playwright + Cypress)

---

## [4.11.0] - 2026-02-22

### Added
- **Smart Column Mapping feature:** Fuzzy matching, conflict detection (NEW/CHANGED/MISSING/DUPLICATE/AMBIGUOUS), admin-only resolution UI, role-based conflict display
  - `conflictDetector.ts` — 7-step conflict classification pipeline with WRONG_FILE_THRESHOLD, AMBIGUOUS_SCORE_RANGE
  - `fuzzyMatcher.ts` — Dice coefficient with abbreviation expansion + normalization
  - `mappingService.ts` — DB override CRUD with audit logging
  - `mappingTypes.ts` — Shared types for conflict/resolution/merged config
  - `ConflictResolutionStep.tsx` — Admin interactive conflict resolution with dropdowns, progress tracking, Save & Continue
  - `ConflictBanner.tsx` — Non-admin read-only banner with "contact administrator", Cancel, Copy Details
  - `MappingManagementPage.tsx` — Admin mapping configuration page with column/action tables
  - `MappingTable.tsx`, `ActionPatternTable.tsx` — Editable mapping tables
  - `mapping.routes.ts` — REST API for GET/PUT column/action mapping overrides
  - Prisma migration `20260220183125_add_import_mapping_overrides` — ColumnMappingOverride, ActionPatternOverride, AuditLog tables
- **Comprehensive import E2E tests** (`frontend/e2e/import-all-roles.spec.ts`): 13 Playwright tests covering Hill + Sutter imports across all 4 roles (admin, physician, staff, admin+physician) with valid files and conflict scenarios
- **Test data files renamed** with `hill-` / `sutter-` prefixes for clarity (all CSV, XLSX, expected JSON files)

### Fixed
- **ESM compatibility** in `sutter-fixture-helper.ts`: Added `fileURLToPath`/`createRequire` for `__dirname`/`require` in Playwright ESM context
- **Flaky performance test thresholds** in `sutter-performance.test.ts`: Added `PERF_MULTIPLIER` (3x local, 5x CI) to avoid timing failures on busy machines
- **Promise.race fragility** in import E2E tests: Replaced with `waitForAnyVisible()` using `Promise.any` + descriptive error messages
- **Fragile CSS badge selectors**: Replaced Tailwind class selectors (`.bg-amber-100`) with text-based selectors for conflict type labels
- **Hardcoded timeouts**: Extracted all magic numbers into named `TIMEOUT` constants
- **File existence checks**: Added upfront validation for test data files
- **getAttribute null safety**: Fixed `getAttribute('value')` null handling in dropdown selection

### Tests
- Backend (Jest): 1,387 tests passing (47 suites)
- Frontend (Vitest): 1,138 tests passing (43 suites)
- Playwright E2E: 13 import-all-roles tests
- Total automated: ~2,821+ (1,387 Jest + 1,138 Vitest + 13+ Playwright + ~283 Cypress)

---

## [4.10.0] - 2026-02-19

### Added
- **Pinned row on add/duplicate (filter bypass):** Newly created or duplicated rows are automatically "pinned" so they remain visible even when active filters (status color, quality measure, search) would otherwise hide them. Pinned row clears automatically when the user interacts with any filter. An amber "New row pinned -- click to unpin" badge appears in the StatusFilterBar. Status bar shows "(new row pinned)" indicator.
- **StatusFilterBar `pinnedRowId` and `onUnpin` props:** Badge component with amber styling, click-to-dismiss behavior
- **StatusBar `pinnedRowId` prop:** Shows "(new row pinned)" text in amber when a row is pinned
- **MainPage filter wrappers:** `handleFilterChange`, `handleSearchChange`, `handleMeasureChange`, `handleInsuranceGroupChange` all clear pinnedRowId before applying the filter
- **Smart Column Mapping requirements spec:** `.claude/specs/smart-column-mapping/requirements.md` (REQ-SCM-01 through REQ-SCM-08)
- **Import requirements decisions (Q4-Q8):** All open questions resolved in `.claude/IMPORT_REQUIREMENTS.md`

### Changed
- **"Duplicate Mbr" button renamed to "Copy Member"** in Toolbar, Toolbar tests, Playwright page object, and Cypress duplicate-detection tests
- **Removed `tracking3` field** from the entire stack:
  - Prisma schema: dropped `tracking3` column from PatientMeasure model
  - Database migration: `20260219120000_remove_tracking3` drops `tracking_3` column
  - Backend: removed from dataHandlers (GET/POST/PUT), dataDuplicateHandler, versionCheck service, socket types, seed scripts (seed-200.ts, seedDev.ts)
  - Frontend: removed from PatientGrid column definitions (14 -> 13 columns), GridRow interface, MeasureUpdatePayload type, socket types, cascadingFields downstream arrays, FIELD_DISPLAY_NAMES
  - Tests: updated all mock objects and assertions (PatientGrid, useGridCellUpdate, cascadingFields, data.routes, versionCheck, MainPage)

### Removed
- `tracking3` field from PatientMeasure schema and all related code (was an unused placeholder)
- `tracking3` column from AG Grid (grid now shows 13 data columns instead of 14)

### Tests
- Backend (Jest): 1,165 tests passing (43 suites)
- Frontend (Vitest): 1,037 tests passing (38 suites) -- +12 from 4.9.0
  - +5 StatusFilterBar pinned badge tests
  - +7 MainPage pinned row filter bypass tests
- Total automated: ~2,587 (1,165 Jest + 1,037 Vitest + 43 Playwright + ~342 Cypress)

---

## [4.9.0] - 2026-02-18

### Added
- **Sutter Import Enhancements: Duplicate Merging, MeasureDetails Parsing, Role-Based Import Tests** (Feb 18, 2026)
  - **Duplicate Row Merging in `sutterDataTransformer.ts`:** New `mergeDuplicateRows()` function merges rows with the same patient + requestType + qualityMeasure combination. Merge rules: latest statusDate wins, tracking1 from latest-date row, sourceActionText/notes concatenated with "; " separator. Stats reflect merged output count.
  - **Improved `measureDetailsParser.ts`:**
    - Reject lenient native Date parsing (`format: 'native'`) to prevent false positives (e.g., "8.9" no longer parsed as a date)
    - Mixed date/non-date comma values now extract dates and keep non-date parts as tracking1 (e.g., "12/16/2025, 158/85" → statusDate=2025-12-16, tracking1=158/85)
    - New `scanForEmbeddedDates()` — extracts MM/DD/YYYY dates from free text prose (e.g., "Last HgbA1c: 7.8 on 01/15/2025"). Requires 4-digit years to avoid matching blood pressure readings like "142/72".
  - **"Not Addressed" status override:** All Sutter action mapper results now force `measureStatus = "Not Addressed"` regardless of config-defined status (previously HTN used "Not at goal", DM-HbA1c used "HgbA1c NOT at goal")
  - **Updated `sutter.json` config:** HTN and DM-HbA1c patterns now have `measureStatus: "Not Addressed"` (matches runtime override)
  - **Dev/test seed users:** 6 new users covering all role combinations (ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN) with staff assignments. Patients distributed round-robin across physicians.
  - **Role-based data filtering tests:** 12 new backend Jest tests for `getPatientOwnerFilter` (PHYSICIAN auto-filter, ADMIN require physicianId, STAFF assignment check, ADMIN+PHYSICIAN dual role behavior)
  - **ADMIN+PHYSICIAN dual role UI tests:** 13 new Vitest tests (Header dropdown/nav visibility, PatientManagementPage tab visibility and content rendering for dual-role users)
  - **Sutter fixture helpers:** `getValidMultiMeasureFixturePath()` and `getSkipActionsFixturePath()` for all-10-patterns and skip-actions E2E fixtures
  - **Jest config fix:** Added `testPathIgnorePatterns: ['/node_modules/', '/dist/']` to prevent stale compiled files in `dist/` from being picked up by test runner

### Changed
- `sutter.json`: HTN measureStatus changed from "Not at goal" to "Not Addressed"; DM-HbA1c measureStatus changed from "HgbA1c NOT at goal" to "Not Addressed"
- `sutterDataTransformer.ts`: Now calls `mergeDuplicateRows()` before returning results; `measureStatus` forced to "Not Addressed" for all action matches
- `measureDetailsParser.ts`: Mixed comma values now extract dates (previously treated entire value as tracking1); native date format rejected
- `backend/jest.config.js`: Added `testPathIgnorePatterns` to exclude `dist/` directory

### Fixed
- **Jest picking up stale `dist/` test files:** `dist/config/__tests__/validateEnv.test.ts` was causing a test suite failure because it referenced files outside `rootDir`. Fixed by adding `testPathIgnorePatterns` to jest.config.js.
- **Native Date false positives in measureDetailsParser:** Values like "8.9" were being parsed as dates via lenient native `Date()` constructor. Now rejected by checking for `format: 'native'`.

### Tests
- Backend (Jest): 1,165 tests passing (43 suites) — +101 from 4.8.0
- Frontend (Vitest): 1,025 tests passing (38 suites) — +13 from 4.8.0
- Total automated: ~2,575 (1,165 Jest + 1,025 Vitest + 43 Playwright + ~342 Cypress)

---

## [4.8.0] - 2026-02-16

### Added
- **Universal Sheet Validation & Configurable Preview Columns** (Feb 16, 2026)
  - **Area 1 — Universal Sheet Validation (all import systems):**
    - `getRequiredColumns()` in `configLoader.ts` — extracts required patient + data columns from any system config (Hill or Sutter)
    - `getSheetHeaders()` in `fileParser.ts` — reads header row from specific sheets in a workbook (uses config's `headerRow` offset)
    - `getWorkbookInfo()` in `fileParser.ts` — single XLSX.read() to return workbook + sheet names (avoids double-parse)
    - `validateSheetHeaders()` in `import.routes.ts` — validates each sheet's headers against required columns (min 3 non-empty, all patient columns, min 1 data column)
    - `POST /api/import/sheets` enhanced — applies skipTabs name filtering THEN header-based validation; returns valid sheets + exclusion counts
    - `SheetSelector.tsx` rewritten — universal component for ALL systems (was Sutter-only); fetches sheets via POST, shows dropdown for multi-tab or text for single-tab, physician auto-match by tab name, error alert for no valid tabs
    - `ImportPage.tsx` updated — Step 4 "Select Tab & Physician" shown for ALL systems after file upload; submit gated on both tab + physician selection
  - **Area 2 — Default "Not Addressed" status:**
    - `sutterDataTransformer.ts` updated — when action mapper returns no match, silently defaults `measureStatus` to "Not Addressed" instead of generating validator warnings
  - **Area 3 — Configurable Preview Columns:**
    - `previewColumns` field added to `SystemConfig` types and Sutter config JSON
    - `buildExtraData()` in `import.routes.ts` — extracts configured fields from TransformedRow into `extraData` on DiffChange
    - Preview API response enhanced — includes `previewColumns` array and `extraColumns` per change item
    - `PreviewChangesTable.tsx` — renders dynamic column headers and cells from `previewColumns` config; correct colSpan for empty state
    - `ImportPreviewPage.tsx` — passes `previewColumns` and `extraColumns` through to table component
  - **Spec:** `.claude/specs/sutter-sheet-validation/` (requirements, design, tasks — 43 tasks across 4 phases)
  - +34 Jest tests (configLoader requiredColumns, fileParser getSheetHeaders/getWorkbookInfo, import.routes header validation, sutterDataTransformer default status)
  - +56 Vitest tests (SheetSelector 57, PreviewChangesTable 21, ImportPage +3, ImportPreviewPage +2; some replace old Sutter-only tests)
  - +8 Cypress E2E tests (universal sheet selector flow, physician selection, error handling)
  - Total: 1,064 Jest + 1,012 Vitest = 2,076 unit tests

---

## [4.7.0] - 2026-02-14

### Added
- **Sutter/SIP Multi-System Import Support** (Feb 14, 2026)
  - **Backend — Sutter config:** New `backend/src/config/import/sutter.json` with tab-based physician layout, skipTabs patterns (suffix/prefix/exact/contains), header row offset, and action-to-measureStatus mapping
  - **Backend — systems.json:** Registered `sutter` system (`Sutter/SIP`, configFile: `sutter.json`) alongside existing Hill system
  - **Backend — configLoader.ts:** Added `isHillConfig()`, `isSutterConfig()` type guards and `SutterSystemConfig`, `SkipTabPattern` types for polymorphic config handling
  - **Backend — fileParser.ts:** Added `parseExcel()` with sheet selection and configurable header row, `getSheetNames()` for workbook tab discovery
  - **Backend — import.routes.ts:** New `POST /api/import/sheets` endpoint for tab discovery with skipTabs filtering; enhanced `POST /api/import/preview` with sheetName validation, empty tab detection (EMPTY_TAB error), and Sutter-specific parsing
  - **Backend — New Sutter services:**
    - `actionMapper.ts` — Maps Sutter action text to measureStatus/requestType/qualityMeasure tuples with fuzzy matching
    - `measureDetailsParser.ts` — Parses freeform measure detail text for tracking values (HgbA1c levels, BP readings, test types, time intervals)
    - `sutterColumnMapper.ts` — Maps Sutter per-tab columns (member name, DOB, action, measure details) to internal fields
    - `sutterDataTransformer.ts` — Transforms Sutter wide-format rows into long-format patient measures, tracks unmapped actions with counts
  - **Backend — Enhanced existing services:** columnMapper, dataTransformer, diffCalculator, importExecutor, previewCache, validator all extended with Sutter-specific code paths
  - **Frontend — ImportPage.tsx:** Sutter system option in dropdown, dynamic step numbering, sheet selection + physician assignment step (appears after file upload for Sutter), isSutter state management, fixed unused variable build error
  - **Frontend — SheetSelector.tsx:** New component for Sutter tab selection — fetches available sheets via `/api/import/sheets`, physician dropdown per tab, error handling for API failures
  - **Frontend — UnmappedActionsBanner.tsx:** New component showing unmapped action types from Sutter imports with counts, expandable detail list, accessible markup (role=alert)
  - **Frontend — ImportPreviewPage.tsx:** Displays sheetName, physicianName, and UnmappedActionsBanner for Sutter imports
  - **Playwright E2E:** 3 new spec files (`sutter-import.spec.ts`, `sutter-import-edge-cases.spec.ts`, `sutter-import-errors.spec.ts`) + `import-page.ts` page object
  - **Spec:** `.claude/specs/sutter-import/` (requirements, design, tasks)
  - +253 Jest tests (8 new backend test files: actionMapper, measureDetailsParser, sutterColumnMapper, sutterDataTransformer, sutter-import-flow, sutter-edge-cases, sutter-error-handling, sutter-performance; enhanced existing: configLoader, diffCalculator, fileParser, importExecutor, previewCache, validator, import.routes)
  - +61 Vitest tests (SheetSelector 24, UnmappedActionsBanner 17, ImportPage +12, ImportPreviewPage +8)
  - Total: 1,030 Jest + 956 Vitest = 1,986 unit tests

## [4.6.0] - 2026-02-13

### Added
- **Insurance Group Filter (REQ-IG)** (Feb 13, 2026)
  - **Backend — Prisma migration:** New `insuranceGroup` (String?) field on Patient model with database index; data migration sets existing patients to 'hill'
  - **Backend — dataHandlers:** `GET /api/data` accepts `?insuranceGroup=` query param (`all`, `none`/`null`, or system ID); validates against systems registry via `systemExists()`
  - **Backend — importExecutor:** Import sets `patient.insuranceGroup` to the import system ID (REQ-IG-2); re-import updates existing patients' group; both replace and merge modes supported
  - **Backend — versionCheck + dataDuplicateHandler:** `insuranceGroup` included in `GridRowPayload` for real-time sync and duplicate row creation
  - **Backend + Frontend types:** `GridRowPayload` and `GridRow` interfaces extended with `insuranceGroup: string | null`
  - **Frontend — StatusFilterBar:** New insurance group dropdown with All / system options / No Insurance; active-ring visual when filtered
  - **Frontend — MainPage:** Insurance group state management, fetches `/import/systems` for options (with fallback), builds query params, filter summary includes insurance label
  - **Frontend — AdminPage:** Improved action button touch targets (44x44px min), `SEND_TEMP_PASSWORD` audit log badge (yellow), increased icon contrast (gray-400 to gray-500)
  - **Spec:** `.claude/specs/insurance-group/` (requirements, design, tasks)
  - +14 Jest tests (data routes insurance group filtering, importExecutor systemId, versionCheck insuranceGroup)
  - +23 Vitest tests (StatusFilterBar insurance group dropdown, MainPage insurance group integration)
  - +12 Cypress E2E tests (`insurance-group-filter.cy.ts`)
  - Total: 777 Jest + 895 Vitest = 1,672 unit tests

## [4.5.1] - 2026-02-13

### Added
- **Security Hardening: Account Lockout + Temp Password + Forced Password Change (REQ-SEC-06)** (Feb 13, 2026)
  - **Backend — Prisma migration:** 3 new User model fields: `failedLoginAttempts` (Int, default 0), `lockedUntil` (DateTime?), `mustChangePassword` (Boolean, default false)
  - **Backend — authService:** 7 new functions: `incrementFailedAttempts()`, `lockAccount()`, `resetFailedAttempts()`, `isAccountLocked()`, `generateTempPassword()`, `sendTempPassword()`, plus lockout constants (MAX_FAILED_ATTEMPTS=5, LOCKOUT_DURATION_MINUTES=30)
  - **Backend — emailService:** `sendTempPasswordEmail()` function for emailing temporary passwords
  - **Backend — auth.routes:** Lockout logic integrated into `POST /login` (increment on failure, lock after 5 attempts, warning on attempt 3+, reject if locked), new `POST /force-change-password` endpoint for forced password change
  - **Backend — auth.routes:** `PUT /password` now clears `mustChangePassword` flag on successful password change
  - **Backend — admin.routes:** New `POST /users/:id/send-temp-password` endpoint for admin-initiated temp password generation
  - **Backend — userHandlers:** `sendTempPasswordHandler` extracted into handlers module
  - **Backend — errorHandler:** Added `warning` field to `AppError` interface for passing warning messages (e.g., remaining login attempts)
  - **Frontend — authStore:** New `loginWarning` and `mustChangePassword` state fields, `clearMustChangePassword` action
  - **Frontend — ForcePasswordChange.tsx:** New full-screen modal component (no close button, no escape) that forces password change before accessing the app
  - **Frontend — ProtectedRoute.tsx:** Intercepts `mustChangePassword` before role check to redirect to forced password change flow
  - **Frontend — LoginPage.tsx:** Yellow warning box displays remaining attempts and reset password link when login response includes warning
  - **Frontend — AdminPage.tsx:** "Send Temp Password" button per user + result modal showing temp password (SMTP fallback: on-screen display)
  - ~30 new backend Jest tests (lockout logic, temp password, force-change-password, admin send-temp-password)
  - ~12 new frontend Vitest tests (7 ForcePasswordChange + 1 LoginPage + 4 AdminPage)
  - Total: 763 Jest + 872 Vitest = 1,635 unit tests

- **Security Hardening: Failed Login Audit Logging (REQ-SEC-10)** (Feb 13, 2026)
  - **Backend:** Refactored `POST /login` handler to use granular auth steps (`findUserByEmail`, `verifyPassword`, `generateToken`, `updateLastLogin`) instead of monolithic `authenticateUser()`, enabling per-failure-reason audit logging
  - **Failed login audit logging:** `LOGIN_FAILED` audit log entries created for invalid credentials (user not found or wrong password) and deactivated accounts, with reason codes (`INVALID_CREDENTIALS`, `ACCOUNT_DEACTIVATED`), client IP address, and user email
  - **Fire-and-forget audit:** `logFailedLogin()` helper uses `.catch()` to silently ignore audit log write failures so they never block the login response
  - **Security:** Audit log entries never log the attempted password (REQ-SEC-10 AC-5)
  - **AuditLog schema comment** updated with new action types: `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `SEND_TEMP_PASSWORD`
  - **Admin panel (frontend):** `AdminPage.tsx` updated to display `LOGIN_FAILED` entries with orange badge and `ACCOUNT_LOCKED` entries with red badge; `formatSecurityDetails()` renders reason, email, and IP address inline
  - **AuditLogEntry interface** extended with `userEmail`, `ipAddress`, and typed `details` field
  - 8 new Jest tests for failed login audit logging (audit log creation, reason codes, no-password-leak, IP address, audit failure resilience)
  - 2 new Jest tests for login edge cases (deactivated account, split invalid-credentials scenarios)
  - 5 new Vitest tests for admin panel LOGIN_FAILED/ACCOUNT_LOCKED display (orange badge, red badge, reason/email/IP, combined details)
  - Total (at time of commit): 741 Jest + 861 Vitest = 1,602 unit tests

- **Email Service: Integration Tests + Dev TLS** (Feb 13, 2026)
  - New `emailService.integration.test.ts` — 6 Ethereal SMTP integration tests (real network, no mocking): SMTP detection, password-reset email, admin-reset notification, preview URL, unconfigured fallback, bad-host error
  - `emailService.ts`: added `tls: { rejectUnauthorized: false }` for non-production SMTP (Ethereal/dev), plus `_resetTransporterForTesting()` and `_getTransporterForTesting()` test helpers (production-guarded)
  - Security hardening spec updates: clarified temp password UX (inside user edit dialog, fallback to on-screen display when SMTP unconfigured), forced password change as modal overlay, 3-attempt warning links to `/forgot-password`

- **Security Hardening: Env Var Validation at Startup (REQ-SEC-04, REQ-SEC-05)** (Feb 12, 2026)
  - New `validateEnv()` function in `backend/src/config/validateEnv.ts`
  - **Production mode:** crashes with `process.exit(1)` if JWT_SECRET is missing/default/<32 chars, SMTP_HOST is missing, ADMIN_EMAIL is missing/default, or ADMIN_PASSWORD is missing/default
  - **Development mode:** logs warnings for same issues but allows startup
  - Config summary logged on success (masks secrets, shows lengths/presence only)
  - Called at the very start of `startServer()` in `backend/src/index.ts`, before DB connect
  - 25 new Jest unit tests in `backend/src/config/__tests__/validateEnv.test.ts` (uses `jest.unstable_mockModule` for ESM-compatible mocking)
  - Security hardening spec created: `.claude/specs/security-hardening/` (requirements.md, design.md, tasks.md)
  - Total: 726 Jest + 856 Vitest = 1,582 unit tests

## [4.5.0] - 2026-02-12

### Fixed
- **DOB column raw HTML bug** (Feb 12, 2026)
  - Member DOB column showed raw `<span aria-l...` instead of masked dates when Member Info toggled ON
  - Root cause: redundant `cellRenderer` returning HTML string; AG Grid rendered it as text
  - Fix: removed `cellRenderer`, rely on existing `valueFormatter` for display
- **Compound indexes migration** (Feb 12, 2026)
  - Fixed PascalCase table names (`"PatientMeasure"`) → snake_case (`"patient_measures"`) in migration SQL to match Prisma `@@map()` directives

### Added
- **Code Quality Refactor Phases 1-8** (Feb 12, 2026)
  - **Phase 1 (Duplicate Code):** Extracted `dateFormatter.ts`, `dateParser.ts`, consolidated status arrays into `statusColors.ts`, extracted `cascadingFields.ts` from PatientGrid
  - **Phase 2 (Database):** Fixed N+1 queries with `include` clauses, added compound indexes migration, transaction wrapping for multi-table operations, simplified version check queries
  - **Phase 3 (Large File Decomposition):** PatientGrid 1351→~800 lines (extracted hooks: `useGridCellUpdate`, `useGridColumns`, `useGridKeyboard`, `useGridOperations`, `useGridRowStyling`; utils: `cascadingFields`, `cellEditors`, `columnDefinitions`, `valueHandlers`), AdminPage 917→~450 lines (extracted `UserModal`, `ResetPasswordModal`), data.routes 855→~200 lines (extracted `dataHandlers.ts`, `importHandlers.ts`), ImportPreviewPage decomposed into `ImportPreview` components
  - **Phase 4 (Async Safety):** Replaced `setTimeout` with `requestAnimationFrame` or AG Grid API timing, added `useEffect` cleanup for async operations, fixed stale closure patterns
  - **Phase 5 (TypeScript):** Extracted `grid.ts` types, typed AG Grid event handlers, replaced magic strings with constants in `dropdownConfig.ts`
  - **Phase 6 (Logging):** Added structured `logger.ts` (backend + frontend) replacing `console.log` calls with level-based logging
  - **Phase 7 (CSS Quality):** Reduced `!important` declarations, extracted inline styles to CSS classes, standardized cell styling patterns
  - **Phase 8 (Security):** Input length validation on API routes, sensitive data scrubbing in error handler, rate limiting on auth endpoints

- **Code Quality Refactor Phase 9-10: Performance & Test Quality Audit** (Feb 12, 2026)
  - **Phase 9 (Performance):** Grid re-render analysis confirms all callbacks properly memoized (useMemo/useCallback with complete dependency arrays). No changes needed.
  - **Phase 9 (Bundle):** Vite build produces 1,551 KB JS (411 KB gzip). AG Grid Community is dominant factor (~600KB). No tree-shaking failures found. No barrel imports from large libraries.
  - **Phase 10 (Backend Coverage):** 82.97% line coverage across 701 tests. Only `diffCalculator.ts` (57.25%) is below 70% threshold.
  - **Phase 10 (Frontend Coverage):** 65.72% line coverage across 856 tests. `PatientGrid.tsx` (16.71%) is low but covered by 283+ Cypress E2E tests. `ResetPasswordModal.tsx` and `UserModal.tsx` (0%) are untested admin modals.
  - **Phase 10 (AG Grid Mocks):** `agGridMocks.ts` verified with 9 factory functions, used in 6 test files.
  - **Phase 10 (Cypress cy.wait):** 420 hardcoded cy.wait() calls across 15 files. ~171 of the 500ms waits are candidates for cy.intercept replacement. Not modified (too risky without interactive testing).
  - Documentation: Updated `.claude/TESTING.md` with coverage tables, bundle analysis, and cy.wait findings.

- **Date Prepopulate — Option A "Today" Button** (Feb 11, 2026)
  - New `StatusDateRenderer` for statusDate column: empty cells show striped prompt text (e.g., "Date Ordered") with a hover-reveal "Today" button; filled cells show formatted date
  - Clicking "Today" stamps today's date in display format (M/D/YYYY) via `node.setDataValue`, going through the existing `valueSetter` pipeline — no edit mode needed
  - New `DateCellEditor` replaces default AG Grid editor: simple inline text input, focuses on mount, no prepopulation
  - Cell-prompt stripe pattern redesigned: diagonal stripes (`repeating-linear-gradient -45deg`) replace solid dark gray background, allowing row color to show through
  - Prompt text color changed from white (#FFFFFF) to dark gray (#4B5563) for better contrast on colored rows
  - Dropdown arrow on prompt cells changed from white to standard blue (#2196F3) to match new transparent background
  - Edit-mode overrides: stripes and italic hidden when statusDate cell is actively being edited
  - 8 new Vitest tests in `DateCellEditor.test.tsx` (rendering, AG Grid interface, focus, accessibility)
  - 13 new Vitest tests in `StatusDateRenderer.test.tsx` (filled cell, empty cell with prompt, Today button click, empty without prompt, different prompt texts)
  - 1 new PatientGrid test for statusDate column editor/renderer assertion
  - ~36 new Cypress E2E tests in `date-prepopulate.cy.ts` (Today button, manual edit, escape cancel, filled cells, prompt display)
  - Spec: `.claude/specs/date-prepopulate/` (requirements, design, tasks)
  - Visual review: `.claude/agent-memory/ui-ux-reviewer/reviews/date-prepopulate-2026-02-11.md` and `option-a-today-button-2026-02-11.md`
  - Total Vitest tests: ~752 (was 730, +22)
  - Total Cypress tests: ~342 (was 306, +36)

### Changed
- **Auto-open dropdown editor** (Feb 11, 2026)
  - All dropdown cells (Request Type, Quality Measure, Measure Status, Tracking #1, Tracking #2) now open immediately on single click instead of requiring activate-then-expand
  - Custom `AutoOpenSelectEditor` replaces `agSelectCellEditor` — renders as popup with keyboard navigation, type-ahead, and mouse selection
  - Checkmark indicator next to currently-selected value for visual clarity
  - `(clear)` option styled with gray italic text to differentiate from regular options
  - Updated Cypress commands (`selectAgGridDropdown`, `openAgGridDropdown`, `getAgGridDropdownOptions`) for new single-click + popup structure
  - Updated hover-reveal dropdown Cypress tests for new `.ag-popup .auto-open-select-editor` selectors
  - 22 new Vitest tests in `AutoOpenSelectEditor.test.tsx` (rendering, AG Grid interface, keyboard nav, mouse interaction, focus, edge cases)
  - 3 existing PatientGrid tests updated (`agSelectCellEditor` → `AutoOpenSelectEditor` + `cellEditorPopup: true`)
  - Total Vitest tests: 730 (was 708, +22)

### Added
- **Test Audit: +244 Tests, 13 Pre-Existing Failures Fixed, 3 Bugs Fixed** (Feb 11, 2026)
  - **Route happy-path tests rewritten (84 tests):** All 5 route files (`admin`, `auth`, `data`, `import`, `users`) rewritten with `jest.unstable_mockModule` + dynamic imports for proper ESM mocking
  - **New config.routes tests (14 tests):** All 7 config endpoints with auth middleware and error handling
  - **New middleware tests (19 tests):** `errorHandler.test.ts` (status codes, error codes, stack traces, createError factory) + `upload.test.ts` (CSV/XLSX/XLS accept, PDF/TXT/JSON reject, missing file)
  - **New component tests:** `AdminPage.test.tsx` (12), `PatientAssignmentPage.test.tsx` (20), `ProtectedRoute.test.tsx` (9), `dropdownConfig.test.ts` (45), `statusColors.test.ts` (29)
  - **New Cypress E2E:** `hover-reveal-dropdown.cy.ts` (13 tests) — arrow visibility, single-click opens dropdown, disabled cells hidden
  - **Expanded dueDateCalculator.test.ts:** 1 to 31 tests (added Prisma mock + new Priority 3/4 edge cases)
  - **Fixed 13 pre-existing backend failures:** mergeLogic (12 tests: graceful DB skip + `import.meta.url` fix), dueDateCalculator (Prisma mock), config.routes ESM rewrite
  - **3 bugs fixed:** BUG-TEST-001 (`shouldAutoFillQualityMeasure` returns explicit boolean), BUG-TEST-002 (useSocket.test `getState()` mock), BUG-TEST-003 (`import.meta.url` in tests)
  - Test audit report: `.claude/TEST_AUDIT_REPORT.md`
  - Total: 679 Jest + 708 Vitest + 43 Playwright + 306 Cypress = 1,736 automated tests

- **Hover-Reveal Dropdown Arrow UI** (Feb 11, 2026)
  - Dropdown cells (Request Type, Quality Measure, Measure Status, Tracking #1/#2) show a blue arrow indicator on hover
  - Arrow hidden by default, appears on `ag-cell:hover`
  - Disabled (N/A) cells and remotely-edited cells hide the arrow
  - White arrow variant for dark prompt cells
  - CSS-only implementation in `index.css` (`.cell-dropdown-wrapper`, `.cell-dropdown-arrow`)

### Changed
- **Slash commands refactored to background Task agents** (Feb 11, 2026)
  - `/commit`, `/release`, `/jh-4-test-audit`, `/jh-5-security-audit`, `/jh-6-code-review`, `/jh-7-deploy-validate` now launch background Task agents instead of running inline
  - Enables user to continue working while commands run autonomously
  - All commands use `run_in_background: true` with `subagent_type` matching their purpose

- **API Error Handling UX Improvement** (Feb 11, 2026)
  - Created `frontend/src/utils/apiError.ts` — `getApiErrorMessage()` extracts user-friendly messages from Axios error responses, matching backend `{ error: { message } }` shape
  - **MainPage.tsx**: Added toast notifications to 3 silent catch blocks (create row, duplicate row, delete row); load error now shows backend message instead of hardcoded string
  - **PatientGrid.tsx**: Replaced blocking `alert()` with non-disruptive `showToast()` for cell edit errors; force save error now extracts backend message via `getApiErrorMessage()`
  - 8 new Vitest tests in `frontend/src/utils/__tests__/apiError.test.ts` (Axios errors, plain objects, fallbacks, null/undefined)
  - Total Vitest tests: 708 (was 700, +8)

### Added
- **Real-Time Collaborative Editing with Socket.IO** (Feb 10, 2026)
  - Multiple users can edit patient data simultaneously with live updates via WebSocket
  - **Presence awareness**: see who else is viewing the same physician's data (StatusBar indicator with hover tooltip)
  - **Active edit indicators**: dashed orange border on cells being edited by other users
  - **Optimistic concurrency control**: field-level conflict detection using existing `updatedAt` timestamp
  - **Conflict resolution dialog**: ConflictModal with 3-column comparison (Original/Theirs/Yours) and Keep Mine/Keep Theirs/Cancel actions
  - **Live row sync**: row:updated, row:created, row:deleted events broadcast to all users in the same physician room
  - **Import awareness**: yellow banner when bulk import is in progress, auto-refresh on completion
  - **Connection status indicator**: green/yellow/red/gray dot in StatusBar with auto-reconnection (exponential backoff)
  - **Graceful degradation**: falls back to HTTP-only mode if WebSocket connectivity fails
  - **Zero database changes**: leverages existing `updatedAt` field on PatientMeasure
  - New backend files: `socketManager.ts`, `socketAuth.ts`, `versionCheck.ts`, `socketIdMiddleware.ts`, `types/socket.ts`
  - New frontend files: `socketService.ts`, `realtimeStore.ts`, `useSocket.ts`, `ConflictModal.tsx`, `types/socket.ts`, `utils/toast.ts`
  - Modified: `index.ts`, `data.routes.ts`, `import.routes.ts`, `PatientGrid.tsx`, `MainPage.tsx`, `StatusBar.tsx`, `axios.ts`, `index.css`
  - New dependency: `socket.io-client@^4.7.5`
  - Backend tests: 564 passing (50 new tests across 5 test files)
  - Frontend tests: 575 passing (102 new tests across 8 test files)
  - E2E tests: 4 Playwright specs + 3 Cypress specs for parallel editing scenarios
  - Spec: `.claude/specs/parallel-editing/` (requirements, design, tasks — 80 tasks)
  - Docker scaling docs: WebSocket/Socket.IO section in INSTALLATION_GUIDE.md (single instance vs multi-replica, Redis adapter, sticky sessions)

### Fixed
- **Presence count now excludes current user** — shows "1 other online" instead of "2 others online" when 2 users are on the same physician
- **Backend test ESM mock pattern** — converted new test files to `jest.unstable_mockModule()` + `await import()` for proper ESM compatibility; reverted incorrectly modified existing tests
- **Docker entrypoint CRLF line endings** — fixed `docker-entrypoint.sh` to LF for Alpine Linux compatibility

- **Compact Filter Bar with Quality Measure Dropdown** (Feb 9, 2026)
  - Redesigned status filter chips to compact ~24px height (from ~48px), single-line with `white-space: nowrap`
  - Added Quality Measure dropdown ("All Measures" default) populated from existing dropdown config
  - Combined AND filter logic: `(chipA OR chipB) AND measureMatch AND searchMatch`
  - Chip counts scoped by selected measure (e.g., selecting "Annual Wellness Visit" shows counts for only AWV rows)
  - Status bar shows active filter summary when measure or non-default chips selected
  - All 10 chips fit on single row at 1280px+ viewport
  - Preserved existing chip visual treatments: checkmark on selected, filled/outlined states, focus-visible outlines
  - Spec: `.claude/specs/compact-filter-bar/` (requirements, design, tasks — 17 tasks)
  - 482 Vitest tests (was 343, +139): StatusFilterBar.test.tsx (181 tests), MainPage.test.tsx, StatusBar.test.tsx updated
  - New Cypress E2E: `compact-filter-bar.cy.ts`; new Playwright E2E: `compact-filter-bar.spec.ts`
  - Bugs found and fixed during CFB-R8 testing: BUG-CFB-001 (All chip double-counting), BUG-CFB-002 (zero-count opacity), BUG-CFB-003 (test helper timezone)

- **Deployment Pipeline & Windows Server Support** (Feb 9, 2026)
  - **CI/CD pipeline:** `.github/workflows/docker-publish.yml` — triggered by `v*` tags, runs tests via `workflow_call`, builds and pushes frontend + backend images to GHCR with version + `latest` tags, uses GHA build cache
  - **Test workflow reuse:** `.github/workflows/test.yml` updated with `workflow_call` trigger (non-breaking, existing push/PR triggers preserved)
  - **Windows install script:** `scripts/install-windows.ps1` — prerequisite checks (Docker, Linux containers, port 80, RAM ≥ 4GB, disk ≥ 20GB), downloads config files, generates DB_PASSWORD and JWT_SECRET cryptographically, GHCR auth, pulls images, health check loop, restricted `.env` ACL
  - **Update script:** `scripts/update.ps1` — shows current vs target version, database backup via `pg_dump` (uses `cmd /c` to avoid PowerShell UTF-16), pulls new images (aborts if fails — old containers keep running), restarts, health check with rollback instructions
  - **Validation script:** `scripts/validate-deployment.ps1` — 6 checks (containers running, DB healthy, API /health, frontend loads, Socket.io reachable, disk space), PASS/WARN/FAIL per check, GO/NO-GO verdict
  - **Rollback script:** `scripts/rollback.ps1` — stops app containers, restores DB from backup (warns if >24h old), pulls old version images, restarts, health check
  - **Windows Server guide:** `docs/WINDOWS_SERVER_INSTALL.md` — prerequisites, Docker install (Desktop + Server Core), automated + manual install, verification, updates, backup/restore (including daily scheduled task + encryption), rollback, SSL/TLS (self-signed + corporate CA), offline/air-gapped deployment (`docker save`/`load`), troubleshooting (IIS port 80, Docker memory via `.wslconfig`, Windows Defender exclusions, GHCR token expiry, volume permissions), architecture + CI/CD diagrams

### Changed
- **Admin Dashboard: Removed "Assign Patients" button** (Feb 9, 2026)
  - Button already exists as "Reassign Patients" tab on Patient Management page
  - Removed unused `UserPlus` icon import from `AdminPage.tsx`
  - Updated Cypress `patient-assignment.cy.ts` to navigate via Patient Management page
- **Docker Compose production registry** updated from `your-dockerhub-username` to `ghcr.io/joyhe1234-coder` in `docker-compose.prod.yml`
- **`.env.example`** updated with GHCR registry default and `VERSION` variable
- **Documentation cross-references** updated: CLAUDE.md (installation guides table), INSTALLATION_GUIDE.md (Option C: Windows Server), QUICK_INSTALL.md (Windows Server callout)

### Added
- **Auto-bootstrap admin user on startup** (Feb 8, 2026)
  - `bootstrapAdminUser()` in `backend/src/index.ts` creates an ADMIN user on first startup if none exists
  - Configurable via `ADMIN_EMAIL` and `ADMIN_PASSWORD` env vars (defaults: `admin@clinic.com` / `changeme123`)
  - Idempotent: no-op if any ADMIN user already exists — never modifies existing users
  - Works on all deployment targets: Docker, Render, local network
- **Docker entrypoint with auto-migration** (Feb 8, 2026)
  - New `backend/docker-entrypoint.sh` runs `prisma migrate deploy` before starting the app
  - Dockerfile changed from `CMD` to `ENTRYPOINT` using the new script
  - Fixed Prisma engine permissions for non-root `nodejs` user (`chown -R nodejs:nodejs /app`)
  - Fresh `docker-compose up` now works out of the box: migrations + admin user + app start
- **Configurable Vite proxy target** (Feb 8, 2026)
  - `frontend/vite.config.ts` proxy target now reads `PROXY_API_TARGET` env var (falls back to `http://localhost:3000`)
  - Enables running Vite dev server inside Docker containers on the same network as the backend

### Changed
- **Numbered JH workflow commands** (Feb 8, 2026)
  - Renamed `/jh-requirements` → `/jh-1-requirements`, `/jh-design` → `/jh-2-design`, etc. (1-7 sequence)
  - Makes execution order explicit: requirements → design → tasks → test-audit → security-audit → code-review → deploy-validate
  - Updated all cross-references in CLAUDE.md, spec-create.md
- **Added dedicated agent definitions** (Feb 8, 2026)
  - 7 new agent files in `.claude/agents/`: requirements-planner, architecture-designer, task-planner, code-reviewer, security-auditor, test-orchestrator, deployment-validator
  - Refactored `spec-create.md` and `spec-steering-setup.md` to delegate to phase agents

### Added
- **Patient Management Page — Full Implementation** (Feb 7, 2026)
  - Created unified `/patient-management` page with tabbed interface (Import + Reassign tabs)
  - New file: `PatientManagementPage.tsx` — tab bar, URL sync via `?tab=`, role-based visibility
  - Extracted `ImportTabContent` from `ImportPage.tsx` (named export, thin wrapper preserved)
  - Extracted `ReassignTabContent` from `PatientAssignmentPage.tsx` (lazy-load via `isActive` prop)
  - Header nav: "Import" → "Patient Mgmt", path `/import` → `/patient-management`
  - ~~AdminPage "Assign Patients" button → `/patient-management?tab=reassign`~~ (removed Feb 9, 2026)
  - ImportPreviewPage all navigate calls → `/patient-management`
  - Route redirects: `/import` → `/patient-management`, `/admin/patient-assignment` → `/patient-management?tab=reassign`, `/import/preview/:id` → `/patient-management/preview/:id`
  - 18 new Vitest tests: `PatientManagementPage.test.tsx` (tab visibility, URL params, role checks)
  - 8 new Playwright E2E tests: `patient-management.spec.ts` (navigation, redirects, role behavior)
  - Updated Cypress tests: `import-flow.cy.ts`, `patient-assignment.cy.ts`, `role-access-control.cy.ts`, `ux-improvements.cy.ts` with new URL paths
  - Updated existing test assertions: `ImportPage.test.tsx`, `ImportPreviewPage.test.tsx`, `Header.test.tsx`
  - Test counts: Vitest 317→335, Playwright 35→43
  - Spec documents: `.claude/specs/patient-management/` (requirements, design, tasks)

- **Patient Management Spec — Requirements Phase** (Feb 6, 2026)
  - Created `.claude/specs/patient-management/requirements.md`
  - Consolidates Import page + Patient Assignment page into unified tabbed page
  - 5 requirements with 28 acceptance criteria covering all roles
  - Validated by spec-requirements-validator agent (PASS)

- **Comprehensive MCP Playwright Visual Review** (Feb 6, 2026)
  - Created 100+ test scenario plan covering all pages x all roles
  - Test plan: `.claude/agent-memory/ui-ux-reviewer/test-plans/comprehensive-visual-review-plan.md`
  - Executed 4 review phases: Auth Flow, Patient Grid, Import Page, Admin Pages
  - 4 detailed review reports in `.claude/agent-memory/ui-ux-reviewer/reviews/`
  - 12 screenshots captured across all phases
  - Found 3 bugs (all fixed), logged 24 UX improvement suggestions
  - Established ui-ux-reviewer agent MEMORY.md for persistent learnings

- **5-Layer Test Pyramid Documentation** (Feb 6, 2026)
  - Updated TESTING.md with MCP Playwright as Layer 5
  - Updated WORKFLOW.md with 5-layer pyramid diagram and bug discovery cycle
  - Updated CLAUDE.md Quick Commands with layer numbers and current counts
  - Test counts: Jest 527 + Vitest 335 + Playwright 43 + Cypress 293 = 1198 automated

- **Row Color Logic Documentation** (Feb 7, 2026)
  - Created `.claude/ROW_COLOR_LOGIC.md` — comprehensive reference for all row color rules
  - Updated `.claude/specs/row-colors/requirements.md` with complete color logic including Chronic DX attestation cascade (AC-9 through AC-12), corrected overdue rules, Hypertension callback statuses, due date calculation details

- **Chronic DX Attestation Color Cascade E2E Tests** (Feb 7, 2026)
  - 6 new Cypress E2E tests in `cascading-dropdowns.cy.ts` for Chronic DX attestation color scenarios:
    - `Chronic diagnosis resolved` + `Attestation sent` → GREEN
    - `Chronic diagnosis resolved` + `Attestation not sent` → ORANGE
    - `Chronic diagnosis invalid` + `Attestation sent` → GREEN
    - `Chronic diagnosis invalid` + `Attestation not sent` → ORANGE
    - `Chronic diagnosis resolved` + `Attestation not sent` + overdue → RED (row-status-overdue)
    - `Chronic diagnosis resolved` + `Attestation sent` + past date → GREEN (never overdue)
  - Fixed missing login in `cascading-dropdowns.cy.ts` beforeEach (was causing silent failures)
  - Cypress cascading-dropdown tests: 30 → 36 passing

### Fixed
- **BUG-8: Chip counts not updating on cell edits** (Feb 9, 2026)
  - Root cause: `onCellValueChanged` in `PatientGrid.tsx` intentionally skipped `onRowUpdated` callback to prevent row reordering
  - Fix: Added `frozenRowOrderRef` to capture row order before calling `onRowUpdated`, preserving row positions during React re-render
  - Chip counts now update in real-time when cell edits change a row's status color (e.g., making a row overdue)
- **BUG-4: Chronic DX rows now turn GREEN when "Attestation sent"** (Feb 7, 2026)
  - `PatientGrid.tsx`: added `isChronicDxAttestationSent()` helper, green rule includes it, orange rule excludes it
  - `StatusFilterBar.tsx`: same logic in `getRowStatusColor()` (added `tracking1` to row type)
  - 4 new Vitest tests in `PatientGrid.test.tsx`, 3 new in `StatusFilterBar.test.tsx`
- **BUG-5: Chronic DX rows now show overdue RED when attestation not sent and past due** (Feb 7, 2026)
  - `PatientGrid.tsx`: `isRowOverdue()` only excludes orange statuses when `tracking1 === "Attestation sent"`
  - `StatusFilterBar.tsx`: same conditional exclusion
  - 1 new Vitest test in `StatusFilterBar.test.tsx` (overdue orange scenarios)
- **BUG-7: Import reassignment count shows rows instead of unique patients** (Feb 7, 2026)
  - `diffCalculator.ts`: `detectReassignments()` now deduplicates by `memberName|memberDob`
  - Root cause: `prisma.patient.findMany` returns one row per quality measure; 5 measures = 5 "patients"
  - Fix: Added `seenPatients` Set to skip duplicate patient entries
  - Test counts: Vitest 335→343

### Changed
- **Double-click edit** replaces single-click edit on AG Grid (prevents accidental edits with auto-save) — `PatientGrid.tsx`
- **Column header tooltips** added to all 14 AG Grid columns (fixes truncated header text) — `PatientGrid.tsx`
- **Import "Preview Import" button** now disabled when physician not selected (was showing error after click) — `ImportPage.tsx`
- **Import preview filename** now passed from backend to frontend (was showing "File:" with no value) — `previewCache.ts`, `import.routes.ts`
- **Change Password modal** now has `autocomplete` attributes (`current-password`, `new-password`) — `Header.tsx`

- **8 UX Quick-Win Fixes (Batch 2)** (Feb 6, 2026)
  - **Focus-visible outlines** on filter chip buttons for keyboard accessibility — `StatusFilterBar.tsx`
  - **aria-label on masked DOB cells** ("Date of birth hidden for privacy") — `PatientGrid.tsx`
  - **Consistent status bar text** — always shows "Showing X of Y rows" — `StatusBar.tsx`
  - **Password min-length helper text** ("Must be at least 8 characters") on Reset Password and Change Password — `ResetPasswordPage.tsx`, `Header.tsx`
  - **Password visibility toggles** on Change Password modal (3 eye icons with aria-labels) — `Header.tsx`
  - **overflow-x: auto** on import preview changes table (fixes mobile horizontal scroll) — `ImportPreviewPage.tsx`
  - **Warning triangle icon** on Replace All mode warning — `ImportPage.tsx`
  - **Maximum file size text** on file upload zone — `ImportPage.tsx`
  - 18 new Vitest tests (296→314): StatusBar.test.tsx (6 new), Header.test.tsx (+4), PatientGrid.test.tsx (+4), ResetPasswordPage.test.tsx (+1), ImportPage.test.tsx (+2), StatusFilterBar.test.tsx (+1)
  - 10 new Cypress E2E tests (283→293): ux-improvements.cy.ts — status bar, filter accessibility, import UX, password toggles

- **Row numbers column removed** (Feb 6, 2026) — user found it confusing/invisible
  - Removed `#` column definition from `PatientGrid.tsx`
  - Removed 2 Vitest tests and 5 Cypress E2E tests for row numbers

- **Search improvements** (Feb 6, 2026)
  - **Word-based search matching** — each search word matches independently, so "williams robert" matches "Williams, Robert" — `MainPage.tsx`
  - **Search persists during data re-fetch** — only shows full-screen loading spinner on initial load; subsequent re-fetches update data silently to preserve search/filter state — `MainPage.tsx`
  - 5 new Vitest tests for word-based search (MainPage.test.tsx)
  - Test counts: Vitest 314→317, Cypress 298→293, total 1172

### Fixed
- **BUG-1**: Reset password page shows generic "Failed to reset password" instead of specific error messages (expired token, used token, invalid token) — `ResetPasswordPage.tsx`
- **BUG-2**: STAFF user with no physician assignments sees "select from dropdown in header" but no dropdown exists — `MainPage.tsx` — Added separate "No Physician Assignments" check with "contact administrator" guidance
- **BUG-3**: Password visibility toggle button not keyboard accessible (had `tabIndex={-1}`) — `LoginPage.tsx` — Removed tabIndex, added dynamic `aria-label`

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
  - NEW: `test-hill-import-warnings.csv` fixture for validation testing
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
  - Added `test-data/test-hill-both-kept.csv` for testing duplicate/both-kept scenarios

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
  - Test fixture: cypress/fixtures/test-hill-import.csv

### Fixed
- **Cypress Import E2E test stability**
  - Added `force: true` to file upload commands for reliable execution
  - Fixed filter card assertion (ring-2 class is on button, not parent)
  - Fixed test-hill-import.csv fixture with correct column names (Annual Wellness Visit, etc.)
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
  - `test-data/test-hill-merge-cases.csv` - 15 rows covering all 6 merge cases
  - `test-data/TEST-HILL-MERGE-CASES-README.md` - Documentation with expected results
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
