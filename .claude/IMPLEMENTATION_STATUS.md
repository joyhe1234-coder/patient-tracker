# Patient Quality Measure Tracking System - Implementation Status

## Overview

This document tracks the implementation progress of the Patient Quality Measure Tracking System, a web-based application replacing an Excel-based tracking system for medical offices.

---

## Completed Phases

### Code Quality Refactor (10 Phases)

**Status: Complete** (Feb 12, 2026)
**Spec:** `.claude/specs/code-quality-refactor/` (requirements, design, tasks — 163 tasks across 10 phases)

- [x] **Phase 1 — Duplicate Code:** Extracted `dateFormatter.ts`, `dateParser.ts`; consolidated status arrays into `statusColors.ts`; extracted `cascadingFields.ts`
- [x] **Phase 2 — Database:** N+1 query fixes, compound indexes migration, transaction wrapping, version check simplification
- [x] **Phase 3 — Large File Decomposition:** PatientGrid (1351→~800 lines via hooks/utils), AdminPage (917→~450 lines via modals), data.routes (855→~200 lines via handlers), ImportPreviewPage decomposition
- [x] **Phase 4 — Async Safety:** setTimeout→requestAnimationFrame, useEffect cleanup, stale closure fixes
- [x] **Phase 5 — TypeScript:** Extracted `grid.ts` types, typed AG Grid handlers, replaced magic strings with constants
- [x] **Phase 6 — Logging:** Structured `logger.ts` (backend + frontend) replacing console.log calls
- [x] **Phase 7 — CSS Quality:** Reduced !important declarations, extracted inline styles, standardized cell styling
- [x] **Phase 8 — Security:** Input length validation, sensitive data scrubbing in error handler, rate limiting on auth
- [x] **Phase 9 — Performance:** Grid callbacks verified memoized; bundle 1,551KB JS (411KB gzip); AG Grid dominant
- [x] **Phase 10 — Test Quality:** 82.97% backend coverage (701 tests), 65.72% frontend coverage (856 tests), AG Grid mock audit

**Bug Fixes:**
- DOB column raw HTML rendering (`<span aria-l...` → proper masked dates)
- Compound indexes migration PascalCase → snake_case table names
- Empty config tables in Docker (seedDev.ts vs seed.ts gap identified)

**Test Coverage (as of v4.13.1):**
- Layer 1 (Backend Jest): 1,419 tests passing (48 suites)
- Layer 2 (Frontend Vitest): 1,211 tests passing (48 suites)
- Layer 3 (Playwright E2E): 13+ import-all-roles tests + 5 visual regression + 5 accessibility + 4 admin-management + 4 password-flows + 3 import-reassignment
- Layer 4 (Cypress E2E): ~486+ tests (expanded: +179 row-color-comprehensive, +24 row-color-roles, rewritten role-access-control ~36 tests, +new cell-editing-conflict, grid-editing-roles, row-operations)
- Visual test plan v2.1: 427 test cases documented
- Regression test plan: 48 sections, Row Colors section upgraded to 16 TCs / 100% automated
- Test Gap Remediation Plan: `.claude/TEST_PLAN.md` with 7 module test plans targeting ~154 new tests

### Row Color Comprehensive E2E + Add Row Modal Split + Conflict Fix

**Status: Complete** (Feb 26, 2026)
**Spec:** `.claude/specs/row-color-e2e/test-plan.md`

- [x] **Row Color E2E** — `row-color-comprehensive.cy.ts` (179 tests): all 14 QMs x all statuses, tracking #1/#2 types, date-to-overdue, time interval editing, color transitions
- [x] **Multi-Role E2E** — `row-color-roles.cy.ts`: 8 core color scenarios tested as ADMIN, PHYSICIAN, STAFF
- [x] **Add Row Modal** — Split "Member Name" into Last Name + First Name + MI with "Last, First Middle" format
- [x] **Grid row color fix** — `refreshCells()` → `redrawRows()` for proper `rowClassRules` re-evaluation
- [x] **AG Grid API exposure** — `window.__agGridApi` for Cypress `startEditingCell()` reliability
- [x] **Conflict bug fix** — "Keep Theirs" and "Cancel" now use `setData()` to restore full server row (prevents cascading 409s from stale `updatedAt`)
- [x] **Role-Access-Control rewrite** — Real multi-role login with API-level access verification (STAFF 403, PHYSICIAN scoping)
- [x] **Seed dueDate calculation** — `seed.ts` uses `calculateDueDate()` for correct initial state

**Tests:** +6 Vitest (AddRowModal name concatenation), +179 Cypress (row-color-comprehensive), +24 Cypress (row-color-roles), ~36 Cypress (role-access-control rewrite)

### Test Gap Remediation — Planning & New E2E Tests

**Status: In Progress** (Feb 26, 2026)
**Spec:** `.claude/TEST_PLAN.md`, `.claude/specs/test-*/`, `.claude/test-plans/M1-M7`

- [x] **Test Gap Remediation Plan** — Comprehensive plan with 5-layer pyramid, role-based strategy, per-module coverage targets
- [x] **7 Test Spec Modules** — Requirements and task breakdowns for auth-security, patient-grid, quality-measures-colors, import-pipeline, admin-management, realtime-collaboration, filtering-search
- [x] **7 Module Test Plans** — Detailed M1-M7 test plans with test case IDs and implementation priorities
- [x] **Cell Editing Conflict E2E** — Cypress tests for 409 VERSION_CONFLICT modal lifecycle
- [x] **Grid Editing Roles E2E** — Per-role column editing verification (Admin, Physician, Staff)
- [x] **Row Operations E2E** — Add row modal + delete row lifecycle tests
- [x] **Duplicate Detector edge cases** — +5 Jest tests (deletion flag clearing, three-way duplicate, whitespace handling, QM edit recalculation)
- [x] **Toolbar edge cases** — +3 Vitest tests (button enable state, disabled click no-op, toggle CSS class)
- [x] **Spec docs reconciled** — tracking3 -> depressionScreeningStatus across 3 design specs; depression screening color ACs added; security requirements deferred items marked

**Tests:** +4 Jest, +3 Vitest, +3 new Cypress E2E test files

### Depression Screening Quality Measure

**Status: Complete** (Feb 23, 2026)
**Spec:** `.claude/specs/depression-screening/`

- [x] **Seed data:** Quality measure, 7 statuses (Not Addressed, Called to schedule, Visit scheduled, Screening complete, Screening unnecessary, Patient declined, No longer applicable) with date prompts and baseDueDays
- [x] **Seed patients:** 6 sample patients with 7 patient measures (including overdue scenario)
- [x] **Frontend dropdowns:** Added to Screening request type (4 measures), 7 status options in QUALITY_MEASURE_TO_STATUS
- [x] **Status colors:** Called to schedule (blue), Visit scheduled (yellow), Screening complete (green), Patient declined (purple), Screening unnecessary/No longer applicable (gray)
- [x] **Date prompts:** statusDatePromptResolver updated for 3 new status-to-prompt mappings
- [x] **Import validation:** Added to VALID_QUALITY_MEASURES in validator.ts
- [x] **Hill import:** Column mapping + compliant/nonCompliant status mapping; removed from skipColumns
- [x] **Sutter import:** Regex action pattern for Depression Screening, PHQ-9, Screen for depression
- [x] **Test data:** Updated Hill CSV/JSON expected output + Sutter XLSX fixtures with Depression Screening rows
- [x] **Visual review:** 35/35 scenarios passed (ui-ux-reviewer agent)

**Tests:** +14 Vitest (dropdownConfig, statusColors, StatusFilterBar, sutter-integration, actionMapper)

### Smart Column Mapping + Import E2E Tests

**Status: Complete** (Feb 22, 2026)
**Spec:** `.claude/specs/smart-column-mapping/` (requirements, design, tasks)

- [x] **Conflict Detection Pipeline:** `conflictDetector.ts` — 7-step classification (normalize, duplicate, lookup, fuzzy match, missing, severity, wrong-file check)
- [x] **Fuzzy Matcher:** `fuzzyMatcher.ts` — Dice coefficient with abbreviation expansion (rx, tx, awv, mgmt, etc.) + header normalization
- [x] **Mapping Service:** `mappingService.ts` — DB override CRUD with audit logging, loadMergedConfig combining JSON seed + DB overrides
- [x] **Admin Resolution UI:** `ConflictResolutionStep.tsx` — Interactive dropdowns per conflict, progress tracking, Save & Continue
- [x] **Non-Admin Banner:** `ConflictBanner.tsx` — Read-only with "contact your administrator", Cancel, Copy Details
- [x] **Mapping Management Page:** `MappingManagementPage.tsx` — Admin column/action mapping configuration
- [x] **REST API:** `mapping.routes.ts` — GET/PUT for column and action mapping overrides
- [x] **Database Migration:** ColumnMappingOverride, ActionPatternOverride, AuditLog tables
- [x] **Import E2E Tests:** 13 Playwright tests (Hill/Sutter x Admin/Physician/Staff/Admin+Physician) covering valid imports + conflict role-based UI
- [x] **Test Data Renamed:** All CSV/XLSX/expected-JSON files renamed with `hill-`/`sutter-` prefixes
- [x] **Defect Fixes:** ESM compatibility, flaky perf thresholds, Promise.race fragility, fragile selectors, timeout constants, null safety
- [x] **Post-release fixes (4.11.1):** Wrong-file false positives (dual-ratio check), MISSING conflict false positives (covered targetField), patient field auto-population, Sutter blank row header alignment, sheet validation fuzzy fallback + Q1/Q2 suffix matching, Cypress test hardening (cy.login, clear option, date editor, BCS row lookup), Playwright test hardening

**Tests:** +222 Jest, +101 Vitest, +13 Playwright E2E

### Grid UX: Remove tracking3, Rename Copy Member, Pinned Row on Add/Duplicate

**Status: Complete** (Feb 19, 2026)

- [x] **Removed `tracking3` field** from entire stack (Prisma schema, migration, backend handlers/services/types/seeds, frontend grid/types/tests, cascading fields)
- [x] **Renamed "Duplicate Mbr" to "Copy Member"** in Toolbar, tests, Playwright page object, Cypress tests
- [x] **Pinned row on add/duplicate:** Newly created/duplicated rows bypass active filters (status color, measure, search) until user interacts with filters
- [x] **StatusFilterBar pinned badge:** Amber "New row pinned -- click to unpin" button with hover effect
- [x] **StatusBar pinned indicator:** "(new row pinned)" in amber italic
- [x] **MainPage filter wrappers:** Clear pinnedRowId on any filter interaction
- [x] **Import requirements Q4-Q8 resolved:** All open questions decided and documented
- [x] **Smart Column Mapping spec:** Requirements drafted (`.claude/specs/smart-column-mapping/requirements.md`)

**Tests:** +12 Vitest (5 StatusFilterBar pinned badge + 7 MainPage pinned row filter bypass)

### Sutter Import Enhancements: Duplicate Merging, Parsing, Role Tests

**Status: Complete** (Feb 18, 2026)

- [x] `mergeDuplicateRows()` in `sutterDataTransformer.ts` — merges same patient+measure rows (latest statusDate, concat sourceActionText/notes)
- [x] `scanForEmbeddedDates()` in `measureDetailsParser.ts` — extracts MM/DD/YYYY from free text (requires 4-digit years to avoid BP false positives)
- [x] Mixed comma values now extract dates + non-date parts (was treating entire value as tracking1)
- [x] Native Date format rejected in `tryParseAsDate()` (prevents "8.9" being parsed as date)
- [x] All Sutter action matches force `measureStatus = "Not Addressed"` (was config-defined per pattern)
- [x] Dev/test seed users: 6 users covering ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN roles with staff assignments
- [x] Patients distributed round-robin across physicians in seed data
- [x] 12 new backend Jest tests: role-based data filtering (`getPatientOwnerFilter`)
- [x] 13 new Vitest tests: ADMIN+PHYSICIAN dual role (Header dropdown, nav visibility, PatientManagementPage tabs)
- [x] Sutter E2E fixture helpers: `getValidMultiMeasureFixturePath()`, `getSkipActionsFixturePath()`
- [x] Jest config fix: `testPathIgnorePatterns` excludes `dist/` directory

**Tests:** +101 Jest, +13 Vitest

### Universal Sheet Validation & Configurable Preview Columns

**Status: Complete** (Feb 16, 2026)
**Spec:** `.claude/specs/sutter-sheet-validation/` (requirements, design, tasks — 43 tasks across 4 phases)

- [x] **Phase 1 — Default "Not Addressed" status:** Unmapped Sutter actions silently default to "Not Addressed" instead of generating validator warnings
- [x] **Phase 2 — Universal Sheet Validation:** `getRequiredColumns()`, `getSheetHeaders()`, `getWorkbookInfo()`, `validateSheetHeaders()` — header-based validation for ALL import systems (Hill & Sutter); SheetSelector rewritten as universal component with auto-match physician, multi-tab dropdown, error alerts
- [x] **Phase 3 — Configurable Preview Columns:** `previewColumns` config field, `buildExtraData()` extraction, dynamic column rendering in PreviewChangesTable, Sutter shows "Status Date" and "Possible Actions Needed" in preview
- [x] **Phase 4 — E2E + Visual Review:** Cypress tests (8 new for universal sheet selector), visual browser review (6 screenshots verifying Hill CSV, Sutter multi-tab, error state, physician selection)

**Tests:** +34 Jest, +56 Vitest, +8 Cypress E2E

### Security Hardening — Phase 1: Env Var Validation (REQ-SEC-04, REQ-SEC-05)

**Status: Complete** (Feb 12, 2026)
**Spec:** `.claude/specs/security-hardening/` (requirements, design, tasks)

- [x] `validateEnv()` function in `backend/src/config/validateEnv.ts`
- [x] Production: crash on missing/default/weak JWT_SECRET, SMTP_HOST, ADMIN_EMAIL, ADMIN_PASSWORD
- [x] Development: warn-only for same issues
- [x] Config summary logged without revealing secrets
- [x] Integrated into `startServer()` in `backend/src/index.ts` (before DB connect)
- [x] 25 Jest tests with ESM-compatible mocking (`jest.unstable_mockModule`)

### Security Hardening — Phase 2: Failed Login Audit Logging (REQ-SEC-10)

**Status: Complete** (Feb 13, 2026)
**Spec:** `.claude/specs/security-hardening/` (requirements, design, tasks — tasks 18-20)

- [x] Refactored `POST /login` to granular auth steps (findUserByEmail, verifyPassword, generateToken, updateLastLogin)
- [x] `logFailedLogin()` fire-and-forget helper creates `LOGIN_FAILED` audit entries with reason, email, IP
- [x] Three failure reasons logged: `INVALID_CREDENTIALS` (user not found), `INVALID_CREDENTIALS` (wrong password), `ACCOUNT_DEACTIVATED`
- [x] Attempted password NEVER logged in audit entries (REQ-SEC-10 AC-5)
- [x] Audit log failure does not block login response (silent `.catch()`)
- [x] AuditLog schema comment updated with new action types
- [x] Admin panel: `LOGIN_FAILED` orange badge, `ACCOUNT_LOCKED` red badge, `formatSecurityDetails()` for reason/email/IP
- [x] AuditLogEntry interface extended with `userEmail`, `ipAddress`, typed `details`
- [x] Email service: Ethereal integration tests + dev TLS support + test helpers
- [x] 10 new Jest tests (8 audit logging + 2 login edge cases)
- [x] 5 new Vitest tests (admin panel LOGIN_FAILED/ACCOUNT_LOCKED display)
- [x] 6 new Jest integration tests (Ethereal SMTP)

### Security Hardening — Phase 3: Account Lockout + Temp Password + Forced Password Change (REQ-SEC-06)

**Status: Complete** (Feb 13, 2026)
**Spec:** `.claude/specs/security-hardening/` (requirements, design, tasks — tasks 21-28)

- [x] Prisma migration: 3 new User model fields (`failedLoginAttempts`, `lockedUntil`, `mustChangePassword`)
- [x] authService: 7 new functions (incrementFailedAttempts, lockAccount, resetFailedAttempts, isAccountLocked, generateTempPassword, sendTempPassword) + lockout constants
- [x] emailService: `sendTempPasswordEmail()` for temp password delivery
- [x] `POST /login`: lockout logic (increment on failure, lock after 5, warning on 3+, reject if locked)
- [x] `POST /force-change-password`: new endpoint for forced password change
- [x] `PUT /password`: clears `mustChangePassword` on success
- [x] `POST /users/:id/send-temp-password`: admin-initiated temp password
- [x] errorHandler: `warning` field on AppError interface
- [x] authStore: `loginWarning`, `mustChangePassword` state, `clearMustChangePassword` action
- [x] ForcePasswordChange.tsx: full-screen modal (no close, no escape)
- [x] ProtectedRoute.tsx: intercepts `mustChangePassword` before role check
- [x] LoginPage.tsx: yellow warning box with remaining attempts + reset link
- [x] AdminPage.tsx: "Send Temp Password" button + result modal (SMTP fallback)
- [x] ~30 new Jest tests (lockout, temp password, force-change, admin send-temp)
- [x] ~12 new Vitest tests (ForcePasswordChange, LoginPage, AdminPage)

### Sutter/SIP Multi-System Import

**Status: Complete** (Feb 14, 2026)
**Spec:** `.claude/specs/sutter-import/` (requirements, design, tasks)

- [x] Sutter system config (`sutter.json`): tab-based physician layout, skipTabs patterns, header row offset, action-to-status mapping
- [x] Systems registry updated (`systems.json`): `sutter` added alongside `hill`
- [x] Config loader: `isHillConfig()` / `isSutterConfig()` type guards, `SutterSystemConfig` / `SkipTabPattern` types
- [x] File parser: `parseExcel()` with sheet selection + header row, `getSheetNames()` for tab discovery
- [x] New `POST /api/import/sheets` endpoint: tab discovery with skipTabs filtering, NO_VALID_TABS error
- [x] Enhanced `POST /api/import/preview`: sheetName validation, EMPTY_TAB / MISSING_SHEET_NAME / INVALID_SHEET_NAME errors, Sutter-specific parsing
- [x] `actionMapper.ts`: Sutter action text to measureStatus/requestType/qualityMeasure mapping with fuzzy matching
- [x] `measureDetailsParser.ts`: freeform text parsing for HgbA1c, BP readings, test types, time intervals
- [x] `sutterColumnMapper.ts`: per-tab column mapping (member name, DOB, action, measure details)
- [x] `sutterDataTransformer.ts`: wide-to-long format with unmapped action tracking
- [x] Extended: columnMapper, dataTransformer, diffCalculator, importExecutor, previewCache, validator for Sutter paths
- [x] ImportPage.tsx: Sutter system option, dynamic step numbering, sheet selection + physician assignment step
- [x] SheetSelector.tsx: tab selection component with physician dropdown, API integration
- [x] UnmappedActionsBanner.tsx: unmapped action display with counts, accessible markup
- [x] ImportPreviewPage.tsx: sheetName, physicianName, UnmappedActionsBanner display
- [x] 3 Playwright E2E spec files + import-page page object
- [x] 253 new Jest tests (8 new test files + 6 enhanced existing files)
- [x] 61 new Vitest tests (SheetSelector, UnmappedActionsBanner, ImportPage, ImportPreviewPage)

### Insurance Group Filter (REQ-IG)

**Status: Complete** (Feb 13, 2026)
**Spec:** `.claude/specs/insurance-group/` (requirements, design, tasks)

- [x] Prisma migration: `insuranceGroup` (String?) on Patient model + database index + data migration (existing → 'hill')
- [x] `GET /api/data?insuranceGroup=` query param: `all`, `none`/`null`, or system ID (validated via `systemExists()`)
- [x] Import executor: sets `patient.insuranceGroup` to import system ID; re-import updates group; replace + merge modes
- [x] `GridRowPayload` / `GridRow` extended with `insuranceGroup: string | null` (backend + frontend types)
- [x] `versionCheck` + `dataDuplicateHandler`: insuranceGroup included in real-time payloads
- [x] StatusFilterBar: insurance group dropdown (All / system options / No Insurance) with active-ring visual
- [x] MainPage: insurance group state, fetches `/import/systems`, query param building, filter summary
- [x] AdminPage: improved touch targets (44x44px), `SEND_TEMP_PASSWORD` yellow badge, icon contrast improvement
- [x] 14 new Jest tests (data routes filtering, importExecutor systemId, versionCheck)
- [x] 23 new Vitest tests (StatusFilterBar, MainPage)
- [x] 12 new Cypress E2E tests (`insurance-group-filter.cy.ts`)

**Remaining Security Hardening (Not Yet Implemented):**
- [ ] REQ-SEC-02: CORS Origin Whitelist
- [ ] REQ-SEC-03: Rate Limiting
- [ ] REQ-SEC-07: Move JWT to httpOnly Cookie

### Real-Time Collaborative Editing (Parallel Editing)

**Status: Complete** (Feb 10, 2026)
**Spec:** `.claude/specs/parallel-editing/` (requirements, design, tasks — 80 tasks)

- [x] Socket.IO server attached to existing HTTP server (no extra port/process)
- [x] JWT authentication for WebSocket connections (reuses existing auth)
- [x] Room-based broadcasting (physician rooms, presence tracking, active edit tracking)
- [x] Optimistic concurrency control with field-level conflict detection
- [x] Version check service (`expectedVersion` / `forceOverwrite` on PUT)
- [x] Socket.IO events emitted from all CRUD routes (create/update/delete/duplicate)
- [x] Import started/completed events with user notification banner
- [x] Conflict-override audit logging
- [x] Frontend socket service, realtime Zustand store, useSocket hook
- [x] ConflictModal component (3-column comparison, Keep Mine/Theirs/Cancel)
- [x] StatusBar connection indicator (green/yellow/red/gray) + presence tooltip
- [x] PatientGrid version tracking, remote update handling, edit indicators, cell flash animation
- [x] Toast notification utility for cascading edit conflicts and deleted rows
- [x] API error message extraction utility (`getApiErrorMessage`) for user-friendly error toasts
- [x] Replaced `alert()` with `showToast()` for non-disruptive error feedback in PatientGrid
- [x] Added toast notifications to silent catch blocks in MainPage (create/duplicate/delete row)
- [x] Graceful degradation to HTTP-only mode if WebSocket fails
- [x] Zero database schema changes (leverages existing `updatedAt` field)
- [x] New dependency: `socket.io-client@^4.7.5`

**Test Coverage:**
- Layer 1 (Backend Jest): 679 tests, all suites passing (includes rewritten route tests, middleware tests, config routes)
- Layer 2 (Frontend Vitest): 708 tests, 25/25 suites passing (includes apiError utility tests)
- Layer 3 (Playwright E2E): 4 new test specs (connection, conflict, updates, reconnection)
- Layer 4 (Cypress E2E): 3 new test specs (grid updates, edit indicators, row operations) + hover-reveal dropdown (13 tests)

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

- [x] AG Grid displaying 13 data columns (tracking3 removed Feb 19, 2026)
- [x] Cell editing with double-click activation (changed from single-click to prevent accidental edits)
- [x] Auto-save on cell edit with status indicator (Saving/Saved/Error)
- [x] Delete Row with confirmation dialog
- [x] Row selection indicator (blue outline, preserves status colors)
- [x] Active cell indicator (blue outline border)
- [x] Date formatting (display and edit as MM/DD/YYYY)
- [x] Flexible date input (accepts M/D/YY, MM/DD/YYYY, YYYY-MM-DD, M.D.YYYY, etc.)
- [x] Date validation with error popup for invalid format
- [x] Timezone-safe date handling (UTC noon to prevent date shift)
- [x] DOB masking (displays as ### for privacy, with `aria-label="Date of birth hidden for privacy"`)
- [x] Phone number formatting ((555) 123-4567)
- [x] Member Info column toggle (toolbar button to show/hide DOB, Telephone, Address columns)
- [x] Member Info columns hidden by default

### Phase 3: Adding & Duplicating Rows

**Status: Complete**

- [x] Add Row functionality with modal (basic patient info only)
- [x] New row appears as first row (rowOrder: 0, other rows shift down)
- [x] New row has empty requestType, qualityMeasure, measureStatus (no defaults)
- [x] Request Type cell auto-focused for immediate editing after add
- [x] Column sort cleared when new row is added (preserves row order)
- [x] Duplicate detection: same patient (memberName + memberDob) + requestType + qualityMeasure
  - Skip duplicate check if requestType OR qualityMeasure is null/empty
  - Schema updated: requestType, qualityMeasure, measureStatus are now nullable (no defaults)
- [x] Duplicate visual indicator: Orange left stripe (#F97316) - preserves status color
- [x] Error alert when creating/editing duplicate row (browser alert, fields reset to empty)
- [x] Backend validation prevents updating to create duplicate row
- [x] On duplicate error during edit, fields reset to empty (not revert to old value)
- [x] Backend duplicate flag synchronization on create/update/delete
- [x] API endpoint: POST `/api/data/check-duplicate` for pre-creation duplicate check
- [x] Cascading field clearing when parent field changes:
  - requestType → clears qualityMeasure (unless auto-fill), measureStatus, statusDate, tracking1/2, dueDate, timeInterval
  - qualityMeasure → clears measureStatus, statusDate, tracking1/2, dueDate, timeInterval
  - measureStatus → clears statusDate, tracking1/2, dueDate, timeInterval
  - Notes preserved (not cleared)
- [x] Time interval manual override - editable for ALL statuses (allows overriding default from tracking)
- [x] Duplicate row functionality (create copy of existing row)
  - "Duplicate" button in toolbar (enabled when row selected)
  - Copies patient data only (memberName, memberDob, phone, address)
  - New row inserted directly below selected row
  - New row selected with Request Type cell focused
  - API endpoint: POST `/api/data/duplicate`

### Phase 4: Sorting & Filtering

**Status: In Progress**

- [x] Column sorting (click header to sort ascending/descending)
- [x] Sort indicator icons in column headers
- [x] No auto-sort during editing (rows stay in place, sort only on header click)
- [x] Sort indicator cleared when editing sorted column (row position preserved)
- [x] Row position and selection preserved during all edits
- [x] Status color filter bar (clickable chips to filter by row color/status category)
- [x] Single-select filter behavior (click to select, click again to deselect)
- [x] Multi-select filter behavior (checkmark + fill visual, OR logic, Duplicates exclusive)
- [x] Filter counts displayed on each chip
- [x] Status bar always shows "Showing X of Y rows" (consistent format, even when unfiltered)
- [x] Patient name search (search input in StatusFilterBar with case-insensitive partial match)
  - Search + status color filter uses AND logic (both must match)
  - Ctrl+F focuses search input, Escape clears and blurs
  - Clear (X) button to reset search
  - Status chip counts reflect full dataset (not affected by search)
- [x] **Compact Filter Bar with Quality Measure Dropdown** (Feb 9, 2026)
  - Compact chips (~24px height, single-line, `white-space: nowrap`)
  - Quality Measure dropdown ("All Measures" default) — filters grid by qualityMeasure field
  - Combined AND logic: `(chipA OR chipB) AND measureMatch AND searchMatch`
  - Chip counts scoped by selected measure
  - Status bar shows active filter summary
  - All 10 chips fit on single row at 1280px+
  - Spec: `.claude/specs/compact-filter-bar/`
  - 482 Vitest tests (was 343, +139 new)
- [x] **Auto-open dropdown editor** (Feb 11, 2026)
  - Custom `AutoOpenSelectEditor` replaces `agSelectCellEditor` on all 5 dropdown columns
  - Single click opens dropdown immediately as a popup (no double-click → expand dance)
  - Keyboard navigation (ArrowUp/Down, Enter, Escape, Tab), type-ahead search
  - Checkmark next to current value, gray italic `(clear)` option
  - Hover-reveal arrow still works (cell renderer unchanged)
  - 22 new Vitest tests in `AutoOpenSelectEditor.test.tsx`
  - Cypress commands and hover-reveal tests updated for new popup structure
- [x] **Date prepopulate — Option A "Today" button** (Feb 11, 2026)
  - `StatusDateRenderer`: empty cells show striped prompt + hover "Today" button; filled cells show date
  - `DateCellEditor`: simple inline text input (double-click to edit)
  - Cell-prompt stripes replace solid dark gray background (row color shows through)
  - 8 + 13 + 1 = 22 new Vitest tests, ~36 new Cypress E2E tests
  - Spec: `.claude/specs/date-prepopulate/`
- [ ] Multi-column sort support
- [ ] Persist sort/filter preferences (localStorage or user settings)
- [ ] Advanced filter builder (multiple conditions)

### Phase 5: CSV Import

**Status: Planning**

Requirements documented in `.claude/IMPORT_REQUIREMENTS.md`

#### Requirements (Complete)
- [x] Requirements document created with open questions
- [x] Spreadsheet column reference documented (62 quality measure columns)
- [x] Column mapping completed (36 columns → existing 10 quality measures)
- [x] Import modes defined: Replace All vs Merge
- [x] Merge logic matrix defined (6 scenarios)
- [x] Duplicate row visual requirements updated (left stripe + filter chip)
- [x] Q2 Status Value Mapping resolved (measure-specific mapping)
- [x] Hill Measure Mapping page (`/hill-mapping`) for configuring status mappings
- [x] Multi-healthcare system support designed (config files per system)
- [x] Preview before commit strategy (in-memory diff)
- [x] Implementation plan with 13 phases and 11 modules
- [x] API contracts defined (/preview, /execute)
- [x] Remaining questions: Q4-Q8 — All resolved (Feb 19, 2026)

#### Implementation Phases
- [x] 5a: Config files + Config Loader
- [x] 5b: File Parser (CSV/Excel) + Import Test Page
- [x] 5c: Column Mapper + Transformer
- [x] 5d: Validator + Error Reporter
  - Error row numbers now reference original spreadsheet rows (not transformed indices)
  - Title row detection for files with report headers
  - Error deduplication per patient+field
- [x] 5e: Diff Calculator
  - `diffCalculator.ts` - Compare import data vs existing database records
  - Implements merge logic matrix (6 cases based on compliance status)
  - Actions: INSERT, UPDATE, SKIP, BOTH (downgrade), DELETE (replace mode)
  - Unit tests: 22 tests covering all merge cases
- [x] 5f: Preview Cache
  - `previewCache.ts` - In-memory cache with TTL (30 min default)
  - Stores diff results before commit for preview
  - Auto-cleanup of expired entries (5 min interval)
  - Unit tests: 17 tests for cache operations
- [x] 5g: Preview API endpoint
  - POST /api/import/preview - Parse, transform, validate, calculate diff
  - GET /api/import/preview/:previewId - Retrieve cached preview
  - DELETE /api/import/preview/:previewId - Delete cached preview
  - GET /api/import/preview-cache/stats - Cache statistics
- [x] 5g-ui: Preview UI (Import Test Page)
  - Preview tab with summary stats (INSERT, UPDATE, SKIP, BOTH, DELETE counts)
  - Patient counts (new vs existing)
  - Action filter dropdown for changes table
  - Changes table with member, measure, action, old/new status, reason
- [x] Merge Logic Integration Tests
  - `mergeLogic.test.ts` - 12 integration tests for test-hill-merge-cases.csv
  - Tests all 6 merge cases (INSERT, UPDATE, SKIP, BOTH for merge mode; DELETE for replace mode)
  - Test data file: `test-data/test-hill-merge-cases.csv`
- [x] 5h: Import Executor (Replace All + Merge)
  - `importExecutor.ts` - Execute import operations based on previewed diff
  - Replace mode: Delete all existing records, insert all new
  - Merge mode: Process INSERT, UPDATE, SKIP, BOTH actions
  - Prisma transactions for atomicity
  - Post-execution: sync duplicate flags, delete preview cache
  - Unit tests: 16 tests covering all scenarios
- [x] 5i: Execute API endpoint + UI
  - POST /api/import/execute/:previewId - Execute import from cached preview
  - Returns stats (inserted, updated, deleted, skipped, bothKept)
  - Execute button in Import Test Page preview tab
  - Execution results display with stats and errors
- [x] 5j: Import UI - Upload page (now at `/patient-management`, Import tab)
  - Healthcare system selection dropdown
  - Import mode selection with Merge as default (recommended)
  - Replace All warning modal confirms before deleting data
  - Drag-and-drop file upload with validation
  - Detailed validation error display (row numbers, member names, error messages)
  - Routes to preview page on success
- [x] 5k: Import UI - Preview page (`/patient-management/preview/:previewId`)
  - Summary cards with action counts (INSERT, UPDATE, SKIP, BOTH, DELETE, Warnings)
  - Clickable filter cards for changes table
  - Patient counts (new vs existing)
  - Warnings section with detailed warning messages (row number, member name)
  - Changes table with action badges and status changes
  - Cancel/Execute buttons with loading states
  - Success screen with statistics
- [x] 5l: Import UI - Results display (integrated into Preview page)
  - Success banner with import statistics
  - Error display with details
  - Navigation to Patient Grid or Import More
- [ ] 5m: Mapping UI (/import-mapping)
- [x] 5n: Patient Management Page — unified tabbed interface
  - Combined Import + Patient Assignment into `/patient-management`
  - `PatientManagementPage.tsx` — tab bar with URL sync (`?tab=import|reassign`)
  - ADMIN sees both tabs; STAFF/PHYSICIAN see only Import tab
  - `ImportTabContent` extracted from `ImportPage.tsx` (named export)
  - `ReassignTabContent` extracted from `PatientAssignmentPage.tsx` (lazy-load on first activation)
  - Both tab contents stay mounted (hidden via `display: none`) for state preservation
  - Header nav: "Patient Mgmt" link to `/patient-management`
  - Route redirects: `/import` → `/patient-management`, `/admin/patient-assignment` → `/patient-management?tab=reassign`
  - 18 Vitest + 8 Playwright E2E tests

---

### Phase 6: Cascading Dropdowns (formerly Phase 5)

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

### Phase 7: Conditional Row Formatting (formerly Phase 6)

**Status: Complete**

- [x] Row colors based on Measure Status (matching Excel behavior):
  - **Gray** (#E9EBF3): No longer applicable, Screening unnecessary
  - **Light Purple** (#E5D9F2): Declined, Contraindicated
  - **Light Green** (#D4EDDA): Completed, At Goal
  - **Light Blue** (#CCE5FF): Scheduled, Ordered, In Progress
  - **Pale Yellow** (#FFF9E6): Called to schedule, Discussed, Contacted
  - **Light Orange** (#FFE8CC): Chronic diagnosis resolved/invalid (when Tracking #1 is NOT "Attestation sent")
  - **White** (#FFFFFF): Not Addressed (default)
  - **Light Red** (#FFCDD2): Overdue (dueDate < today, see overdue rules below)
- [x] Row colors preserved during row selection and editing (using CSS classes via rowClassRules)
- [x] Explicit status-to-color mapping (no pattern matching conflicts)
- [x] Real-time color updates when Measure Status changes
- [x] Selection/focus uses outline instead of background color override
- [x] Overdue row coloring (light red) when due date has passed
  - Applies to pending statuses (blue, yellow, white) AND completed statuses (green)
  - Completed rows turn red when due date passes (indicates annual renewal needed)
  - Does NOT apply to: purple (declined), gray (N/A)
  - Conditionally applies to orange: only when Tracking #1 is NOT "Attestation sent"
  - Color priority: duplicate > overdue > status-based
- [x] Chronic DX attestation color cascade
  - `Chronic diagnosis resolved/invalid` + `Attestation sent` → **GREEN** (always, never overdue)
  - `Chronic diagnosis resolved/invalid` + `Attestation not sent` or null → **ORANGE** (if not overdue)
  - `Chronic diagnosis resolved/invalid` + `Attestation not sent` + overdue → **RED**

### Phase 8: Business Logic & Calculations (formerly Phase 7)

**Status: Complete**

- [x] Due Date auto-calculation based on Status Date + rules
  - Special handling for "Screening discussed" + tracking1 month patterns
  - Special handling for HgbA1c statuses + tracking2 month patterns (no base fallback - requires dropdown)
  - DueDayRule lookup for measureStatus + tracking1 combinations
  - MeasureStatus.baseDueDays fallback (not used for HgbA1c statuses)
- [x] Time Interval (Days) calculation (dueDate - statusDate)
- [x] Time Interval editability
  - Editable for statuses with **fixed default** or **test type dropdown** (Mammogram, Colonoscopy, etc.)
  - **NOT editable** for 6 time period dropdown statuses (interval controlled by dropdown):
    - Screening discussed (In 1-11 Months)
    - HgbA1c ordered / at goal / NOT at goal (1-12 months) - requires Tracking #2 selection
    - Scheduled call back - BP at/not at goal (Call every 1-8 wks)
  - Default value comes from tracking selection (DueDayRule) or baseDueDays
  - When edited, Due Date = Status Date + Time Interval
  - Row colors update accordingly (overdue detection)
  - See `.claude/TIME_INTERVAL_MATRIX.md` for complete editability matrix
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
  - **~~Tracking #3~~:** Removed (Feb 19, 2026) — was an unused placeholder field
- [x] Backend services layer:
  - `dueDateCalculator.ts` - Due date calculation logic
  - `duplicateDetector.ts` - Duplicate detection and flag management
  - `statusDatePromptResolver.ts` - Status date prompt resolution

### Phase 9: Complete Countdown Period Configuration (formerly Phase 8)

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

## UI Testing Infrastructure

**Status: In Progress**

### Component Testing (React Testing Library + Vitest)
- [x] Phase 1: Setup (vitest.config.ts, setup.ts, npm scripts)
- [x] Phase 4: Component tests (~752 tests total)
  - StatusFilterBar.test.tsx (186 tests - compact chips, quality measure dropdown, combined filter logic, getRowStatusColor, row color accuracy, chip count integrity, search UI, multi-select, accessibility, attestation cascade, pinned row badge)
  - StatusBar.test.tsx (7 tests - consistent display format, locale formatting, Connected status, filter summary)
  - Toolbar.test.tsx (15 tests)
  - AddRowModal.test.tsx (15 tests)
  - ConfirmModal.test.tsx (11 tests)
  - PatientGrid.test.tsx (50 tests - column defs, row class rules, headerTooltip, DOB aria-label, attestation cascade, AutoOpenSelectEditor assertions, DateCellEditor/StatusDateRenderer assertions)
  - AutoOpenSelectEditor.test.tsx (22 tests - rendering, AG Grid interface, keyboard navigation, mouse interaction, focus, edge cases)
  - DateCellEditor.test.tsx (8 tests - rendering, AG Grid interface, focus, accessibility)
  - StatusDateRenderer.test.tsx (13 tests - filled cell, empty cell with prompt, Today button click, empty without prompt, different prompts)
  - Header.test.tsx (16 tests - provider dropdown, unassigned patients, change password modal, visibility toggles)
  - LoginPage.test.tsx (18 tests - includes login warning display)
  - ForgotPasswordPage.test.tsx (14 tests)
  - ResetPasswordPage.test.tsx (18 tests - includes password helper text)
  - ImportPage.test.tsx (39 tests - includes warning icon, max file size, Sutter system selection, sheet selector step, physician assignment)
  - ImportPreviewPage.test.tsx (31 tests - includes unmapped actions banner, sheetName/physicianName display)
  - SheetSelector.test.tsx (24 tests - sheet discovery, physician selection, error handling)
  - UnmappedActionsBanner.test.tsx (17 tests - rendering, expand/collapse, accessibility)
  - MainPage.test.tsx (48 tests - search filtering, word-based search, multi-select filter logic, measure dropdown filtering, pinned row filter bypass)
  - authStore.test.ts (25 tests)
  - PatientManagementPage.test.tsx (18 tests)
  - dropdownConfig.test.ts (45 tests - all mappings, helper functions, auto-fill, cascade chain integrity)
  - statusColors.test.ts (29 tests - status arrays, attestation sent, overdue, priority ordering)
  - ForcePasswordChange.test.tsx (7 tests - rendering, validation, submit, API error, loading state)
  - ProtectedRoute.test.tsx (9 tests - loading, redirect, role-based access, token verification)
  - AdminPage.test.tsx (21 tests - rendering, tabs, user list, role badges, error/loading states, LOGIN_FAILED/ACCOUNT_LOCKED audit display, Send Temp Password button + result modal)
  - PatientAssignmentPage.test.tsx (20 tests - wrapper, lazy-load, patient list, bulk assign, error/success/empty states)

### E2E Testing (Playwright)
- [x] Phase 2: Setup (playwright.config.ts, Page Object Model)
- [x] Phase 3: CI/CD workflows (.github/workflows/test.yml, e2e-tests.yml)
- [x] Phase 5: CRUD operation tests (26 passing, 4 skipped)
  - smoke.spec.ts (4 tests)
  - add-row.spec.ts (9 tests)
  - duplicate-member.spec.ts (8 tests, 3 skipped)
  - delete-row.spec.ts (10 tests, 4 skipped)
- [ ] Phase 6: Grid editing, cascading dropdowns, time interval tests
- [ ] Phase 7: Test data management and isolation
- [ ] Phase 8: Import Excel E2E tests

### E2E Testing (Cypress)
- [x] Phase 6: Cascading dropdowns tests (36 passing)
  - cypress/e2e/cascading-dropdowns.cy.ts - Comprehensive cascading dropdown tests
  - Tests include: Request Type selection, AWV/Chronic DX auto-fill, Quality Measure filtering, Measure Status options, Tracking #1 options, row colors, cascading field clearing
  - Chronic DX attestation color cascade (6 tests): resolved/invalid + sent/not-sent/overdue scenarios
- [x] Phase 8: Import E2E tests (57 passing)
  - cypress/e2e/import-flow.cy.ts - Complete import workflow tests
  - Import page: system/mode selection, file upload validation
  - Preview page: summary cards, filters, changes table
  - Execution: success/error states, navigation
- [x] Phase 12: Patient assignment tests (32 tests)
  - cypress/e2e/patient-assignment.cy.ts - Patient and staff assignment workflows
- [x] Phase 12: Role access control tests (31 tests)
  - cypress/e2e/role-access-control.cy.ts - Authorization verification
- [x] Sorting & filtering tests (55 tests)
  - cypress/e2e/sorting-filtering.cy.ts - Column sorting, status filter bar
- [x] Cell editing tests (18 tests)
  - cypress/e2e/cell-editing.cy.ts - Row selection, text/date/name editing, save indicator
- [x] Time interval tests (14 tests)
  - cypress/e2e/time-interval.cy.ts - Dropdown-controlled statuses, manual override, validation
- [x] Duplicate detection tests (15 tests)
  - cypress/e2e/duplicate-detection.cy.ts - Visual indicators, 409 errors, flag clearing
- [x] Patient name search tests (13 tests)
  - cypress/e2e/patient-name-search.cy.ts - Search input UI, filtering, AND logic, keyboard shortcuts
- [x] Multi-select filter tests (18 tests)
  - cypress/e2e/multi-select-filter.cy.ts - Multi-select toggle, duplicates exclusivity, checkmark visual, search combo
- [x] UX improvements tests (10 tests)
  - cypress/e2e/ux-improvements.cy.ts - Status bar, filter accessibility, import UX, password toggles
- [x] Compact filter bar tests
  - cypress/e2e/compact-filter-bar.cy.ts - Compact chips, measure dropdown, combined filters
- [x] Hover-reveal dropdown tests (13 tests)
  - cypress/e2e/hover-reveal-dropdown.cy.ts - Arrow visibility, single-click opens dropdown, disabled cells hidden, styling
- [x] Date prepopulate tests (~36 tests)
  - cypress/e2e/date-prepopulate.cy.ts - Today button, manual edit, escape cancel, filled cells, prompt display

### Test Data Management
- [x] Phase 7: Test isolation and data management
  - Serial mode for data-modifying test suites (delete-row, duplicate-member)
  - Page Object helpers: waitForGridLoad(), toggleMemberInfo(), deselectAllRows()
  - Fixed phone/address test with Member Info toggle
  - Playwright: 26 passing, 4 skipped (AG Grid limitations)
- [x] Phase 8: Import E2E tests (Cypress: 29 passing)
  - Note: Import execution tests modify database - reseed before cascading tests

### Backend Unit Testing (Jest)
- [x] 1,165 tests passing (43 suites) — includes Sutter multi-system import, sheet validation, duplicate merging, role-based filtering
- Total test count: ~2,587 automated tests across all frameworks (1,165 Jest + 1,037 Vitest + 43 Playwright + ~342 Cypress)
- [x] Route tests (rewritten with `jest.unstable_mockModule` for ESM):
  - admin.routes.test.ts - 30 tests (CRUD, auth, bulk assign, unassigned patients)
  - auth.routes.test.ts - 39 tests (login, registration, password reset, JWT, failed login audit logging)
  - data.routes.test.ts - 24 tests (CRUD, duplicate check, physician filtering)
  - import.routes.test.ts - 28 tests (preview, execute, parse, auth)
  - users.routes.test.ts - 15 tests (physician endpoints, auth)
  - config.routes.test.ts - 14 tests (all 7 config endpoints, auth, errors)
- [x] Middleware tests:
  - errorHandler.test.ts - 12 tests (status codes, error codes, stack traces, createError factory)
  - upload.test.ts - 7 tests (CSV/XLSX/XLS accept, PDF/TXT/JSON reject, missing file)
- [x] Service tests:
  - dueDateCalculator.test.ts - 31 tests (Prisma mock, edge cases, month boundaries)
- [x] Import services tests:
  - fileParser.test.ts - 28+ tests, 95% coverage (CSV/Excel parsing, title row detection, sheet selection)
  - diffCalculator.test.ts - 54+ tests, 97% coverage (status categorization, merge logic)
  - mergeLogic.test.ts - 12 integration tests (graceful DB skip, `import.meta.url` fix)
  - previewCache.test.ts - 17+ tests (cache TTL, cleanup, sheetName/unmappedActions)
  - validator.test.ts - validation error handling (`import.meta.url` fix)
  - integration.test.ts - integration tests (`import.meta.url` fix)
  - importExecutor.test.ts - 16+ tests (replace/merge mode execution, Sutter paths)
  - configLoader.test.ts - enhanced with Sutter config type guard tests
  - actionMapper.test.ts - action text to status mapping, fuzzy matching
  - measureDetailsParser.test.ts - freeform text parsing for tracking values
  - sutterColumnMapper.test.ts - per-tab column mapping
  - sutterDataTransformer.test.ts - wide-to-long transform, unmapped action tracking
  - sutter-import-flow.test.ts - end-to-end Sutter import flow
  - sutter-edge-cases.test.ts - edge cases and boundary conditions
  - sutter-error-handling.test.ts - error paths and validation
  - sutter-performance.test.ts - performance characteristics

---

## Future Phases

### Phase 10: HgbA1c Goal Configuration

**Planned Features:**
- [ ] HgbA1c Goal dropdown for Diabetes Control rows (Less than 7/8/9)
- [ ] "Goal Reached for Year" checkbox
- [ ] "Patient Declined" checkbox
- [ ] Special color logic (GREEN/ORANGE/RED/GRAY) based on goal vs actual

### Phase 11: Authentication & Multi-Physician Support

**Status: Complete**

- [x] JWT-based authentication
  - Login/logout endpoints (email-only, no username)
  - Password hashing with bcrypt
  - Token verification middleware
  - Password change endpoint
- [x] Auto-bootstrap admin user on first startup
  - `bootstrapAdminUser()` runs at server start, creates ADMIN if none exists
  - Configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars
  - Idempotent: no-op when any ADMIN already exists
- [x] User management
  - User model with roles (PHYSICIAN, STAFF, ADMIN)
  - Staff-to-Physician assignment model
  - Admin CRUD endpoints for users
  - Password reset by admin
  - CLI password reset script
- [x] Role-based access control
  - PHYSICIAN: sees only own patients
  - STAFF: sees assigned physicians' patients (with physician selector)
  - ADMIN: user management + can view any physician's patients
- [x] Frontend authentication
  - Login page with email/password form
  - Zustand auth store with persistence
  - Protected routes with role checks
  - Header with user menu and physician selector (STAFF and ADMIN)
  - Password change modal
  - Consistent navigation across all pages including Admin
- [x] Admin dashboard
  - User list with role badges
  - Create/edit/deactivate users
  - Staff-physician assignments
  - Password reset
  - Audit log viewer
- [x] Data isolation by owner
  - Patient.ownerId links patients to physicians
  - API filtering by owner
  - Existing patients remain unassigned (migration-safe)
- [x] Audit logging
  - LOGIN, LOGOUT, PASSWORD_CHANGE actions
  - User CRUD actions
  - Audit log cleanup script (6-month retention)
  - Uses email for user identification (not username)
- [x] Authentication Test Coverage (Feb 2, 2026)
  - Backend: authService.test.ts (19), auth.test.ts middleware (13), route tests (18)
  - Frontend: LoginPage.test.tsx (17), authStore.test.ts (25)
  - E2E: auth.spec.ts (9 Playwright tests)
  - 101 new authentication tests total
- [x] Forgot Password Feature (Feb 3, 2026)
  - PasswordResetToken database model with 1-hour expiration
  - POST /api/auth/forgot-password - generates token, sends reset email
  - POST /api/auth/reset-password - validates token, updates password
  - GET /api/auth/smtp-status - frontend checks if email is available
  - Email service (emailService.ts) using nodemailer
  - ForgotPasswordPage - email form when SMTP configured, fallback message when not
  - ResetPasswordPage - token validation, password reset form
  - "Forgot password?" link on login page
  - Backend loads .env via dotenv for local development
  - SMTP environment variables configured on Render production

### Phase 12: Patient Ownership & Assignment System

**Status: Complete**

Complete redesign of patient ownership, viewing, and import assignment.

#### Requirements (Finalized Feb 3, 2026)

**Core Principles:**
- Physicians see **only their own patients** (auto-filtered, no selector)
- Staff/Admin see **nothing until they select a physician**
- Import **requires explicit physician selection** (prevents accidental imports)
- Admin can **reassign patients** between physicians

**Data Model:**
- [x] `User.roles: UserRole[]` - Multi-role array (replaces single `role` + `canHavePatients`)
  - Users with PHYSICIAN in roles can have patients assigned
  - ADMIN + PHYSICIAN dual-role supported natively
  - STAFF users don't have PHYSICIAN role

**Role-Based Behavior:**

| Role | Default View | Physician Selector | Import Target | Bulk Assign |
|------|--------------|-------------------|---------------|-------------|
| PHYSICIAN | Own patients (auto) | Hidden | Self (auto) | ❌ |
| STAFF | Empty until selected | Assigned physicians only | Must select | ❌ |
| ADMIN | Empty until selected | All eligible + "Unassigned" | Must select | ✅ |

**Backend Changes (Phase 12a-c):**
- [x] Migration: Add `canHavePatients` to User model (Phase 12a)
- [x] Seed.ts: PHYSICIAN gets `canHavePatients=true` by default (Phase 12a)
- [x] Admin routes: Handle `canHavePatients` on user create/update (Phase 12a)
- [x] AuthService: Include `canHavePatients` in AuthUser (Phase 12a)
- [x] GET /api/data - Require `physicianId` param for ADMIN/STAFF (Phase 12b)
- [x] GET /api/data?physicianId=unassigned - Return unassigned patients (Phase 12b)
- [x] GET /api/users/physicians - Return users who can own patients (Phase 12b)
- [x] GET /api/users/physicians/:id - Get specific physician info (Phase 12b)
- [x] POST /api/import/preview - Detect and return `reassignments` array (Phase 12c)
- [x] POST /api/import/execute - Require `confirmReassign=true` if reassignments exist (Phase 12c)
- [x] PATCH /api/admin/patients/bulk-assign - Bulk assignment (admin only)
- [x] GET /api/admin/patients/unassigned - Get unassigned patients (admin only)

**Frontend Changes (Phase 12d-g):**
- [x] Patient Grid: Physician selector dropdown (ADMIN/STAFF only)
- [x] Patient Grid: "Select a physician to view" message when none selected
- [x] Import Page: Physician selector (ADMIN/STAFF only)
- [x] Import Preview: Reassignment warning with confirmation modal
- [x] Patient Assignment Page: New admin-only page for bulk reassignment (`/admin/patient-assignment`)
- [x] User Management: "Can Have Patients" toggle for ADMIN users
- [x] ~~Admin Page: "Assign Patients" button~~ (removed Feb 9, 2026 — functionality exists as "Reassign Patients" tab on Patient Management page)

**UI Refinements (Phase 12h):**
- [x] Provider dropdown only visible on Patient Grid page (not Import/Admin pages)
- [x] ADMIN users can select "Unassigned patients" option to view patients without a provider
- [x] MainPage properly sends `physicianId=unassigned` for unassigned patient queries

**Import Reassignment Warning:**
When importing patients that already belong to another physician:
- Show warning dialog listing affected patients
- Require explicit confirmation to proceed
- Cancel option to abort import

See `.claude/PATIENT_OWNERSHIP_REQUIREMENTS.md` for detailed specifications.

---

### Deployment Pipeline & Windows Server Support

**Status: Complete**

CI/CD pipeline and on-premise Windows Server deployment tooling.

- [x] GitHub Actions CI/CD pipeline (`.github/workflows/docker-publish.yml`)
  - Trigger: push tags `v*`
  - Gate: reuses test.yml via `workflow_call` (tests must pass)
  - Builds frontend + backend Docker images
  - Pushes to GHCR (`ghcr.io/joyhe1234-coder/patient-tracker-*`)
  - Tags: version number + `latest`
  - Uses GHA build cache for speed
- [x] Test workflow reuse (`test.yml` updated with `workflow_call` trigger)
- [x] Docker Compose production config updated for GHCR (`docker-compose.prod.yml`)
- [x] `.env.example` updated with GHCR registry and VERSION variable
- [x] Windows install script (`scripts/install-windows.ps1`)
  - Prerequisite checks (Docker, Linux containers, port 80, RAM, disk)
  - Downloads config files, generates secrets cryptographically
  - GHCR authentication, image pull, health check
  - Restricted `.env` file ACL (Administrators + SYSTEM only)
- [x] Update script (`scripts/update.ps1`)
  - Database backup via `pg_dump` (uses `cmd /c` to avoid UTF-16)
  - Pull new images (aborts if fails, old containers keep running)
  - Health check with rollback instructions on failure
- [x] Validation script (`scripts/validate-deployment.ps1`)
  - 6 checks: containers, DB, API, frontend, Socket.io, disk space
  - GO/NO-GO verdict
- [x] Rollback script (`scripts/rollback.ps1`)
  - Database restore from backup, pull old version, health check
  - Warns if backup is >24 hours old
- [x] Windows Server deployment guide (`docs/WINDOWS_SERVER_INSTALL.md`)
  - Prerequisites, Docker install, initial deployment, updates
  - Backup/restore, rollback, SSL/TLS, offline deployment
  - Troubleshooting (IIS port 80, Docker memory, Defender, GHCR token)
  - Architecture diagram and CI/CD pipeline diagram
- [x] Documentation cross-references updated (CLAUDE.md, INSTALLATION_GUIDE.md, QUICK_INSTALL.md)

---

### Phase 13: Excel-like Behaviors

**Planned Features:**
- [ ] Keyboard navigation (Arrow keys, Tab, Enter)
- [ ] Copy/Paste support
- [ ] Undo/Redo (Ctrl+Z, Ctrl+Y)
- [ ] Fill handle (drag to fill)
- [ ] Context menu (right-click)

### Phase 14: Additional Features

**Planned Features:**
- [ ] CSV import/export
- [ ] Print/PDF export
- [ ] Cell comments
- [ ] Text wrapping for Notes field
- [ ] Column pinning (first 3 columns fixed)
- [ ] ~~Zebra striping~~ (not needed - using measure status colors instead)
- [ ] Drag-and-drop row reordering

### Phase 15: Reference Data Sheets

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
│   │   │   ├── statusDatePromptResolver.ts
│   │   │   └── import/       # CSV Import services
│   │   │       ├── configLoader.ts
│   │   │       ├── fileParser.ts
│   │   │       ├── columnMapper.ts
│   │   │       ├── dataTransformer.ts
│   │   │       ├── validator.ts
│   │   │       ├── errorReporter.ts
│   │   │       ├── diffCalculator.ts
│   │   │       ├── previewCache.ts
│   │   │       └── importExecutor.ts
│   │   ├── utils/           # Utility functions
│   │   │   └── dateParser.ts
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
│       │   └── modals/      # AddRowModal, ConfirmModal (DuplicateWarningModal unused)
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
# Migrations run automatically via docker-entrypoint.sh
# Admin user created on first startup (admin@clinic.com / changeme123)
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

February 26, 2026 - v4.13.0: Comprehensive row color E2E (179 Cypress tests), multi-role row color tests, Add Row Modal split (Last/First/MI), edit conflict cascading 409 fix, role-access-control rewrite with real multi-role login, seed dueDate calculation, grid redrawRows fix. All tests passing: 1,415 Jest + 1,208 Vitest + Playwright + ~486 Cypress = ~3,100+ automated tests.
February 25, 2026 - Release 4.12.1: Test hardening (fireEvent→userEvent migration across 25 Vitest files, accessibility labels, Playwright waitForTimeout elimination), Depression Screening quality measure (7 statuses, color coding, import support), conflict detection false positives fix. All tests passing: 1,415 Jest + 1,202 Vitest + Playwright + Cypress = ~2,617+ automated tests.
February 23, 2026 - Release 4.11.1: Conflict detection fixes (wrong-file dual-ratio, MISSING covered targetField, patient field auto-population), Sutter file parser blank row alignment, sheet validation fuzzy fallback + Q1/Q2 suffix matching, Cypress + Playwright test hardening. All tests passing: 1,387 Jest + 1,138 Vitest + Playwright + Cypress = ~2,525+ automated tests.
February 19, 2026 - Release 4.10.0: Remove tracking3 field (migration + full stack), rename "Duplicate Mbr" to "Copy Member", pinned row on add/duplicate (filter bypass with amber badge), import Q4-Q8 decisions resolved, smart column mapping spec. All tests passing: 1,165 Jest + 1,037 Vitest + 43 Playwright + ~342 Cypress = ~2,587 automated tests.
February 18, 2026 - Release 4.9.0: Sutter duplicate merging, measureDetails parsing, role-based tests, seed users, universal sheet validation, configurable preview columns, ADMIN+PHYSICIAN dual role fix, CSV headerRow fix, SheetSelector a11y fix, Sutter/SIP multi-system import. All tests passing: 1,165 Jest + 1,025 Vitest + 43 Playwright + ~342 Cypress = ~2,575 automated tests.
February 14, 2026 - Sutter/SIP multi-system import: full pipeline (config, parser, routes, transformer, mapper, UI components). 253 new Jest + 61 new Vitest tests. All tests passing: 1,030 Jest + 956 Vitest + 43 Playwright + ~342 Cypress = ~2,371 automated tests.
February 13, 2026 - Release 4.6.0: Insurance group filter (REQ-IG), security hardening phases 1-3 (REQ-SEC-04/05/06/10). All tests passing: 777 Jest + 895 Vitest + 43 Playwright + ~342 Cypress = ~2,057 automated tests.
February 12, 2026 - Release 4.5.0: 10-phase code quality refactor, visual test plan v2.1 (232 tests executed, 0 failures). All tests passing: 701 Jest + 856 Vitest + 43 Playwright + ~342 Cypress = ~1,942 automated tests.
February 11, 2026 - Date prepopulate (Option A "Today" button): StatusDateRenderer + DateCellEditor for statusDate column. Striped prompt replaces dark gray bg. Hover-reveal "Today" button. 22 new Vitest + ~36 new Cypress tests. Total: 679 Jest + ~752 Vitest + 43 Playwright + ~342 Cypress = ~1,816.
February 11, 2026 - Auto-open dropdown editor: AutoOpenSelectEditor replaces agSelectCellEditor on all 5 dropdown columns. Single-click opens popup. Checkmark + (clear) styling. 22 new Vitest tests, 3 updated PatientGrid tests, Cypress commands updated. Total: 679 Jest + 730 Vitest + 43 Playwright + 306 Cypress = 1,758.
February 11, 2026 - Test audit: +244 tests (84 route rewrites, 19 middleware, 14 config.routes, 45 dropdownConfig, 29 statusColors, 12 AdminPage, 20 PatientAssignmentPage, 9 ProtectedRoute, 13 hover-reveal Cypress, 30 dueDateCalculator). Fixed 13 pre-existing failures. 3 bugs fixed. Hover-reveal dropdown CSS. Slash commands refactored to background agents. Total: 679 Jest + 708 Vitest + 43 Playwright + 306 Cypress = 1,736.
February 11, 2026 - API error handling UX: getApiErrorMessage utility, replaced alert() with showToast(), added toast to MainPage catch blocks. 8 new Vitest tests. Total: 708 Vitest.
February 9, 2026 - Compact Filter Bar with Quality Measure Dropdown (482 Vitest tests, +139), BUG-8 fix (chip counts on cell edit), removed Assign Patients button from Admin page, deployment pipeline & Windows Server support.
February 8, 2026 - Numbered JH workflow commands (jh-1 through jh-7), added 7 dedicated agent definitions, refactored spec-create/spec-steering-setup.
February 7, 2026 - Chronic DX attestation color cascade: BUG-4/5/7 fixes, 6 Cypress E2E + 8 Vitest tests, row-colors requirements rewrite. Total ~1204 tests (Vitest 343, Playwright 43, Cypress 299, Jest 527).
February 7, 2026 - Patient Management Page: tabbed `/patient-management` consolidating Import + Patient Assignment. 18 Vitest + 8 Playwright tests.
February 6, 2026 - Removed row numbers column (user feedback), fixed search bug (data re-fetch clears search), added word-based search matching. Total ~1172 tests (Vitest 317, Cypress 293).
February 6, 2026 - 8 UX quick-win fixes (batch 2): focus-visible, aria-label DOB, status bar, password helper, password toggles, overflow-x, warning icon, max file size. 18 new Vitest + 10 new Cypress tests.
February 6, 2026 - MCP Playwright visual review (4 phases, 3 bugs fixed, 24 UX suggestions), 5 quick-win UX fixes (double-click edit, header tooltips, import button disable, filename display, autocomplete). Total ~1141 tests.
February 5, 2026 - Patient name search feature, multi-role refactoring, test gap coverage (6 new test files), spec infrastructure. Total ~1092 tests.
February 4, 2026 - Added role access control tests: role-access-control.cy.ts (31). Total ~680 tests.
February 4, 2026 - Added Phase 12 tests: Header.test.tsx (12), patient-assignment.cy.ts (32).
February 4, 2026 - Bug fixes: Delete row physicianId, removed username from Admin UI
