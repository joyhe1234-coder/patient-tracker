# Patient Quality Measure Tracking System - TODO

This document tracks planned features and enhancements for future development.

---

## In Progress

### Real-Time Collaborative Editing / Parallel Editing (Complete)
**Spec:** `.claude/specs/parallel-editing/`
- [x] Requirements phase — `requirements.md` created (11 requirements, 91 acceptance criteria)
- [x] Design phase — `design.md` created (Socket.IO architecture, version checking, conflict resolution)
- [x] Tasks phase — `tasks.md` created (80 atomic tasks across 7 phases)
- [x] Phase 1-2: Backend infrastructure + API integration (Socket.IO server, auth, version check, route events)
- [x] Phase 3-4: Frontend infrastructure + UI (socket service, store, hook, ConflictModal, StatusBar)
- [x] Phase 5: PatientGrid + MainPage integration (version tracking, conflict handling, remote updates, edit indicators)
- [x] Phase 6: E2E tests (4 Playwright + 3 Cypress specs)
- [x] Phase 7: Documentation updates (CHANGELOG, IMPLEMENTATION_STATUS, install guides, test docs)
- [x] Docker scaling documentation (single vs multi-instance, Redis adapter, sticky sessions)

### Compact Filter Bar with Quality Measure Dropdown (Complete)
**Spec:** `.claude/specs/compact-filter-bar/`
- [x] Requirements phase — `requirements.md` created and approved (8 requirements)
- [x] Design phase — `design.md` created and approved
- [x] Tasks phase — `tasks.md` created and approved (17 tasks)
- [x] Implementation — compact chips, quality measure dropdown, combined AND filter logic
- [x] Vitest unit tests (482 total, +139 new: StatusFilterBar 181, MainPage 41, StatusBar 7)
- [x] Cypress E2E tests (`compact-filter-bar.cy.ts`)
- [x] Playwright E2E tests (`compact-filter-bar.spec.ts`)
- [x] CFB-R8 testing complete (row color accuracy + chip count integrity)
- [x] 3 bugs found and fixed: BUG-CFB-001, BUG-CFB-002, BUG-CFB-003

### Patient Management Page (Complete)
**Spec:** `.claude/specs/patient-management/`
- [x] Requirements phase — `requirements.md` created and approved
- [x] Design phase — `design.md` created and approved
- [x] Tasks phase — `tasks.md` created and approved (9 tasks)
- [x] Implementation — consolidated Import + Patient Assignment into tabbed `/patient-management` page
- [x] Vitest unit tests (18 tests in `PatientManagementPage.test.tsx`)
- [x] Playwright E2E tests (8 tests in `patient-management.spec.ts`)
- [x] Cypress tests updated with new URL paths
- [x] Existing test assertions updated for new routes

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

### Phase 4: Sorting & Filtering
- [x] Column header click to sort ascending/descending
- [x] Sort indicator icons in column headers
- [x] No auto-sort during editing (rows stay in place while editing)
- [x] Sort indicator cleared when editing sorted column (row position preserved)
- [x] Row position and selection preserved during all edits
- [x] Status color filter bar (filter by row color with clickable chips)
- [x] Single-select filter behavior
- [x] Multi-select filter behavior (checkmark + fill visual style)
- [x] Filter counts displayed on each chip
- [x] Quick search/filter by patient name
- [x] **Insurance Group Filter (REQ-IG)** — filter grid by insurance group (Hill, Kaiser, etc.) via dropdown in StatusFilterBar; backend query param, import sets group, Prisma migration + index

### Phase 5: CSV Import (v3.0.0)
**Requirements documented in:** `.claude/IMPORT_REQUIREMENTS.md`

- [x] Requirements document created
- [x] Column mapping completed (42 of 62 columns mapped)
- [x] Merge logic defined
- [x] Duplicate row visual requirements updated (left stripe + filter chip)
- [x] Q2: Status Value Mapping (measure-specific mapping decided)
- [x] Hill Measure Mapping page (`/hill-mapping`) with CSV export
- [x] Q4: Unmapped Patient Columns — **Ignore all** (Age, Sex, MembID, LOB)
- [x] Q5: "Has Sticket" Column — **Ignore**
- [x] Q6: Duplicate Measures — **Import overall only** (skip age-specific sub-columns)
- [x] Q7: Column Mapping UI — **Smart fuzzy mapping with admin management** (see `.claude/specs/smart-column-mapping/requirements.md`)
- [x] Q8: Date Fields — **Use import date** as statusDate, auto-calculate dueDate
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
- [x] Implementation: Phase 5m - Universal Sheet Validation & Configurable Preview Columns (43 tasks, Feb 16, 2026)
  - Universal header-based sheet validation for ALL import systems
  - SheetSelector rewritten as universal component (was Sutter-only)
  - Default "Not Addressed" for unmapped Sutter actions
  - Configurable preview columns (Sutter shows Status Date + Possible Actions Needed)
- [x] Implementation: Phase 5n - Sutter Duplicate Merging + MeasureDetails Parsing + Role Tests (Feb 18, 2026)
  - `mergeDuplicateRows()` merges same patient+measure Sutter rows (latest date, concat notes/actions)
  - `scanForEmbeddedDates()` extracts dates from free-text prose
  - Mixed comma values extract dates (was all-or-nothing)
  - Native Date false positives rejected (e.g., "8.9")
  - All action matches force "Not Addressed" status
  - 6 dev/test seed users (ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN)
  - Role-based filtering tests (+12 Jest, +13 Vitest)
  - Jest config fix: `testPathIgnorePatterns` for `dist/`

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

## Completed This Session

### Code Quality Refactor (10 Phases) ✅ COMPLETE
**Spec:** `.claude/specs/code-quality-refactor/`
- [x] Phase 1: Duplicate code consolidation (date utils, status arrays, CSS patterns)
- [x] Phase 2: Database optimization (N+1 fixes, compound indexes, transaction safety)
- [x] Phase 3: Large file decomposition (PatientGrid, AdminPage, data.routes, ImportPreviewPage)
- [x] Phase 4: Error handling & async safety (setTimeout→rAF, useEffect cleanup)
- [x] Phase 5: TypeScript strictness (grid.ts types, typed handlers, constants)
- [x] Phase 6: Logging infrastructure (structured logger, replaced console.log)
- [x] Phase 7: CSS quality (reduced !important, extracted inline styles)
- [x] Phase 8: Security hardening (input length validation, data scrubbing)
- [x] Phase 9: Performance audit (re-render optimization verified, bundle analysis)
- [x] Phase 10: Test quality audit (coverage analysis, AG Grid mock verification)
- [x] DOB column raw HTML bug fix
- [x] Compound indexes migration fix (PascalCase→snake_case)
- [x] Comprehensive visual test plan v2.1 (427 test cases)

### Phase 12: Patient Ownership & Assignment System ✅ COMPLETE
**Reference:** `.claude/PATIENT_OWNERSHIP_REQUIREMENTS.md`

#### Phase 12a: Database & Backend Foundation ✅ COMPLETE
- [x] Add `canHavePatients` field to User model (migration)
- [x] Update seed.ts: PHYSICIAN gets `canHavePatients=true` by default
- [x] Update user creation API to handle `canHavePatients`
- [x] Update user update API to enforce role-based rules
- [x] Update authService: toAuthUser includes canHavePatients
- [x] Update getAllPhysicians to return all users with canHavePatients=true
- [x] Update frontend AuthUser type
- [x] Update all tests for new field

#### Phase 12b: Patient Filtering by Owner ✅ COMPLETE
- [x] Update GET /api/data to require `physicianId` for ADMIN/STAFF
- [x] Add support for `?physicianId=unassigned` (unassigned patients, ADMIN only)
- [x] PHYSICIAN: auto-filter to own patients
- [x] STAFF: requires physicianId, cannot view unassigned
- [x] Create GET /api/users/physicians endpoint (returns eligible owners)
- [x] GET /api/users/physicians/:id for individual physician info

#### Phase 12c: Import Reassignment Detection ✅ COMPLETE
- [x] Update import preview to detect patients being reassigned
- [x] Add `reassignments` array to preview response
- [x] Update import execute to require `confirmReassign` flag
- [x] Block execution if reassignments exist and not confirmed

#### Phase 12d: Patient Grid UI Updates ✅ COMPLETE
- [x] Add physician selector dropdown for ADMIN/STAFF
- [x] Show "Select a physician to view patients" when none selected
- [x] Store selected physician in localStorage (via authStore)
- [x] Hide selector for PHYSICIAN role

#### Phase 12e: Import Page UI Updates ✅ COMPLETE
- [x] Add physician selector for ADMIN/STAFF import
- [x] Require physician selection before import
- [x] Show reassignment warning section with affected patient list
- [x] Require confirmation checkbox for reassignment

#### Phase 12f: Bulk Assignment Feature ✅ COMPLETE
- [x] Create PATCH /api/admin/patients/bulk-assign endpoint (admin only)
- [x] Create GET /api/admin/patients/unassigned endpoint (admin only)
- [x] Create Patient Assignment page (`/admin/patient-assignment`)
- [x] Add bulk selection checkboxes to assignment grid
- [x] Add "Assign to..." physician dropdown
- [x] Add "Assign Patients" button on Admin page

#### Phase 12g: User Management Updates ✅ COMPLETE
- [x] Add "Can Have Patients" toggle in user edit form
- [x] Show toggle only for ADMIN users
- [x] PHYSICIAN always shows as enabled (non-editable info text)

---

### Add New Quality Measure: Depression Screening ✅ COMPLETE
**Reference:** `.claude/ADDING_QUALITY_MEASURES.md` (implementation checklist)

- [x] Add to `backend/prisma/seed.ts` (statuses, tracking options, due days)
- [x] Add to `frontend/src/config/dropdownConfig.ts` (dropdown mappings)
- [x] Add to `backend/src/services/import/validator.ts` (VALID_QUALITY_MEASURES)
- [x] Add to `backend/src/config/import/hill.json` (column + status mapping)
- [x] Add to `backend/src/config/import/sutter.json` (regex action pattern)
- [x] Update row colors in `statusColors.ts` (Called to schedule, Visit scheduled, Screening complete)
- [x] Update `statusDatePromptResolver.ts` (date prompts for 3 new statuses)
- [x] Update test data (Hill CSV, Sutter XLSX, expected JSON, fixtures)
- [x] Add 14 new Vitest tests (dropdownConfig, statusColors, StatusFilterBar)
- [x] Update backend integration tests (sutter-integration, actionMapper)
- [x] Run full test suite — all passing (1,387 Jest + 1,152 Vitest)

### External Data Import
See **Phase 5: CSV Import** in "In Progress" section above.

---

## Open Bugs

### BUG-9: ~~Quality Measure dropdown options not in alphabetical order~~ FIXED
- Fixed in `MainPage.tsx:40`: Added `.sort()` to `measureOptions` memo
- Dropdown now lists measures alphabetically (ACE/ARB, Annual Serum K&Cr, Annual Wellness Visit, ...)

---

## Confirmed Bugs — Fixed

### BUG-8: ~~Chip counts not updating on cell edits~~ FIXED
- Fixed in `PatientGrid.tsx`: Added `frozenRowOrderRef` to preserve row order, then call `onRowUpdated` to sync React state
- Chip counts now update in real-time when cell edits change a row's status color

### BUG-4: ~~Chronic DX rows don't turn GREEN when "Attestation sent"~~ FIXED
- Fixed in `PatientGrid.tsx`: added `isChronicDxAttestationSent()` helper; green rule includes it, orange rule excludes it
- Fixed in `StatusFilterBar.tsx`: same logic in `getRowStatusColor()`
- 8 new tests (4 PatientGrid + 4 StatusFilterBar)

### BUG-5: ~~Chronic DX rows never show overdue (RED) when attestation not sent~~ FIXED
- Fixed in `PatientGrid.tsx`: `isRowOverdue()` only excludes orange statuses when `tracking1 === "Attestation sent"`
- Fixed in `StatusFilterBar.tsx`: same conditional exclusion in `isOverdue()`
- Covered by same 8 new tests

### BUG-7: ~~Import reassignment count shows rows instead of unique patients~~ FIXED
- Fixed in `diffCalculator.ts`: `detectReassignments()` now deduplicates `existingPatients` by `memberName|memberDob` before building the reassignment array
- Root cause: `prisma.patient.findMany` returns all rows (one per quality measure) for each patient; without dedup, a patient with 5 measures counted as 5 reassignments

### BUG-6: Status filter bar counts don't match row colors for overdue/attestation rows
- **Severity:** Medium
- **Location:** `StatusFilterBar.tsx` (`getRowStatusColor()`) and filter chip count logic
- **Issue:** The status filter counts are based on `measureStatus` category, but when a row's actual displayed color differs (due to overdue or attestation logic), the count doesn't match what the user sees. Examples:
  - `Chronic diagnosis resolved` + `Attestation sent` → displays **GREEN**, but counted as **Orange** (Resolved)
  - `Chronic diagnosis resolved` + `Attestation not sent` + overdue → displays **RED**, but counted as **Orange** (Resolved)
  - `Chronic diagnosis invalid` + `Attestation sent` → displays **GREEN**, but counted as **Orange** (Resolved)
  - `Chronic diagnosis invalid` + `Attestation not sent` + overdue → displays **RED**, but counted as **Orange** (Resolved)
  - `Scheduled call back - BP not at goal` + overdue → displays **RED**, but counted as **Blue** (In Progress)
  - `Scheduled call back - BP at goal` + overdue → displays **RED**, but counted as **Blue** (In Progress)
- **Expected:** Filter chip counts should match the actual displayed row color — overdue rows should count toward Overdue/Red, attestation-sent rows should count toward Green
- **Root cause:** `getRowStatusColor()` may be returning the correct color, but the filter chip aggregation or the filtering logic groups by status category rather than actual computed color
- **Fix hint:** Ensure filter bar counts use the same color computation as `rowClassRules` in PatientGrid, so the count reflects the visual color the user sees

---

## Confirmed Bugs (from UI/UX Reviews, Feb 6, 2026) - ALL FIXED

### BUG-1: ~~Reset password shows generic error instead of specific message~~ FIXED
- Fixed in `ResetPasswordPage.tsx:47`: reads `data.error.message` with `data.message` fallback
- Tests updated to use real backend error format (TOKEN_EXPIRED, TOKEN_USED, INVALID_TOKEN)

### BUG-2: ~~STAFF user sees "select from dropdown" but no dropdown exists~~ FIXED
- Fixed in `MainPage.tsx`: added `staffHasNoAssignments` check before `needsPhysicianSelection`
- Shows yellow "No Physician Assignments" message with "contact your administrator" guidance

### BUG-3: ~~Password visibility toggle not keyboard accessible~~ FIXED
- Fixed in `LoginPage.tsx`: removed `tabIndex={-1}`, added `aria-label` toggling
- Updated `LoginPage.test.tsx` to use exact `'Password'` label to avoid aria-label collision

---

## API Error Handling UX (Feb 10, 2026)

### Graceful API Failure Messages
- [x] **Toast notifications for API failures** (Feb 11, 2026) — Created `getApiErrorMessage()` utility to extract backend error messages from Axios responses. Replaced `alert()` with `showToast()` in PatientGrid. Added toast notifications to silent catch blocks in MainPage (create/duplicate/delete row). Load error now shows backend message. 8 new Vitest tests.
  - **Remaining (future work):**
    - Inline field-level errors for validation failures (400s)
    - Retry logic with exponential backoff for network errors
    - Import page error message improvements
    - Admin operations error message improvements

---

## Grid Feature Requests (Feb 6, 2026)

### Duplicate Row UX Improvements
- [x] **"Duplicate Mbr" button label → "Copy Member"** — DONE: renamed in Toolbar, tests, Playwright page object, Cypress tests
- [x] **Newly created/duplicated rows should remain visible when filters are active** — DONE: pinned row bypass with amber badge
  - Implemented as "pinned row" approach: new row ID stored in `pinnedRowId` state
  - Pinned row passes through all filters (status color, quality measure, search)
  - Amber "New row pinned -- click to unpin" badge in StatusFilterBar
  - Pin auto-clears when user interacts with any filter (chips, measure dropdown, search, insurance group)
  - StatusBar shows "(new row pinned)" indicator
  - 12 new Vitest tests (5 badge + 7 filter bypass)

### Row Numbers Feature
- [x] ~~**Add row numbers column to AG Grid**~~ — REMOVED: user found it confusing/invisible
  - Was: `#` column, pinned left, width 55, valueGetter with rowIndex+1
  - Removed in Feb 6, 2026 based on user feedback

---

## UI/UX Review Findings (Feb 6, 2026)

**Full report:** `.claude/agent-memory/ui-ux-reviewer/reviews/patient-grid-2026-02-06.md`

### Quick Wins
- [x] Add `title` tooltips to all AG Grid column headers (fixes truncation) — DONE: `headerTooltip` on all 14 columns
- [x] Add `aria-label="Date of birth hidden for privacy"` to masked DOB cells — DONE: cellRenderer on memberDob column
- [x] Add `:focus-visible` outline styles to filter chip buttons — DONE: focus-visible ring classes
- [x] Fix inconsistent status bar text ("Rows: 100" vs "Showing X of Y rows") — DONE: always "Showing X of Y rows"

### Important UX Fixes
- [x] Change single-click edit to double-click edit (prevents accidental edits with auto-save) — DONE: `singleClickEdit={false}`
- [x] Make tracking prompt cells ("Select test type") use row color + italic placeholder instead of dark olive background — DONE: `stripe-overlay` + `cell-prompt` classes
- [x] ~~Improve Member Info toggle active/inactive visual state~~ — WONTFIX: current state is fine

### Accessibility (WCAG)
- [ ] Add screen-reader-only grid structure summary for split pinned/scrollable headers
- [ ] Add secondary status indicators beyond color (icon or text badge for color-blind users)
- [ ] Audit full keyboard navigation path through grid (Tab, arrow keys, Enter to edit)
- [ ] Add `aria-label` attributes to N/A disabled tracking cells

## Auth Flow UI/UX Review Findings (Feb 6, 2026)

**Full report:** `.claude/agent-memory/ui-ux-reviewer/reviews/auth-flow-2026-02-06.md`

### Quick Wins
- [x] Add `autocomplete` attributes to Change Password modal inputs (`current-password`, `new-password`) — DONE
- [x] Add "Must be at least 8 characters" helper text below New Password fields — DONE: ResetPasswordPage + Header modal

### Important UX Fixes
- [ ] Replace native HTML5 validation with custom JS validation + red banner pattern on all auth forms

### Nice-to-Have
- [x] Add password visibility toggles to Change Password modal (3 fields) — DONE: Eye/EyeOff with aria-labels

## Import Flow UI/UX Review Findings (Feb 6, 2026) — Deep Review

**Full report:** `.claude/agent-memory/ui-ux-reviewer/reviews/import-page-2026-02-06.md`
**Screenshots**: 14 screenshots (`import-review-01` through `import-review-14`)

### UX Suggestions
- [x] Disable "Preview Import" button until physician is selected (currently shows error after click) — DONE
- [x] Display filename in preview header metadata (currently shows "File:" with no value) — DONE: passed through previewCache

### Important (Responsive)
- [x] Add `overflow-x: auto` to preview changes table (completely broken on mobile 375px) — DONE
- [ ] Fix mobile header overflow (title wraps 4 lines, user menu pushed off-screen)

### Nice-to-Have
- [x] Add warning triangle icon to Replace mode warning card — DONE: AlertTriangle icon
- [x] Add "Maximum file size" text to file upload zone — DONE: "Maximum file size: 10MB"
- [ ] Add loading spinner during preview generation (for large files)

## Admin Pages UI/UX Review Findings (Feb 6, 2026)

**Full report:** `.claude/agent-memory/ui-ux-reviewer/reviews/admin-pages-2026-02-06.md`

### Important UX Fixes
- [ ] Add pagination to Audit Log (25-50 entries per page)
- [ ] Add action type filter dropdown to Audit Log
- [ ] Add user filter and date range filter to Audit Log

### Nice-to-Have
- [ ] Replace native `confirm()` with custom ConfirmModal for user deletion
- [ ] Add distinct action badge colors for LOGOUT, PASSWORD_RESET
- [ ] Show entity display names alongside IDs in Audit Log
- [ ] Improve Details column (show IP for LOGIN, target for PASSWORD_RESET)

---

## Medium Priority

### Security Hardening (In Spec Process)
**Spec:** `.claude/specs/security-hardening/requirements.md`
**Status:** Phases 1-3 complete (env var validation, failed login audit logging, account lockout), remaining items pending

#### Included (7 items):
- [ ] REQ-SEC-02: CORS Origin Whitelist (require `CORS_ORIGIN` env var in production)
- [ ] REQ-SEC-03: Rate Limiting (20 login/15min, 10 import/min, 100 global/min)
- [x] REQ-SEC-04: JWT Secret Validation (32 char min, crash on missing/default) -- **Done Feb 12, 2026**
- [x] REQ-SEC-05: Env Var Validation at Startup (4 required vars: JWT_SECRET, SMTP_HOST, ADMIN_EMAIL, ADMIN_PASSWORD) -- **Done Feb 12, 2026**
- [x] REQ-SEC-06: Account Lockout (5 attempts, temp password via email, forced pw change) -- **Done Feb 13, 2026**
- [ ] REQ-SEC-07: Move JWT to httpOnly Cookie (sameSite strict, same-origin Docker)
- [x] REQ-SEC-10: Failed Login Audit Logging (LOGIN_FAILED entries with reason/email/IP, admin panel display) -- **Done Feb 13, 2026**

#### Deferred (5 items):
- [ ] REQ-SEC-01: HTTPS/TLS Enforcement (no cert info available)
- [ ] REQ-SEC-08: Content-Security-Policy (deferred by user)
- [ ] REQ-SEC-09: Refresh Token Mechanism (8hr JWT sufficient)
- [ ] REQ-SEC-11: Hide DB Port in Docker (deferred by user)
- [ ] REQ-SEC-12: Field-Level Encryption for PHI (deferred by user)

### Smart Column Mapping (REQ-SCM)
**Spec:** `.claude/specs/smart-column-mapping/requirements.md`
**Status:** Requirements drafted, pending design phase

Replace fixed/exact-match column mapping with fuzzy matching + admin-managed UI:
- [ ] REQ-SCM-01: Fuzzy header matching (similarity scoring for renamed columns)
- [ ] REQ-SCM-02: Column change detection & warnings (new/missing/changed headers)
- [ ] REQ-SCM-03: Admin inline conflict resolution during import
- [ ] REQ-SCM-04: Dedicated admin mapping management page (`/admin/import-mapping`)
- [ ] REQ-SCM-05: Non-admin warning (block import, direct to admin)
- [ ] REQ-SCM-06: Sutter action pattern fuzzy matching
- [ ] REQ-SCM-07: Database-backed mapping persistence (JSON as seed/fallback)
- [ ] REQ-SCM-08: Import date as default statusDate (for spreadsheets without dates)

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
- [x] Production environment configuration (docker-compose.prod.yml with GHCR)
- [x] CI/CD pipeline setup (GitHub Actions: `.github/workflows/docker-publish.yml`)
- [x] Automated testing in pipeline (test.yml reused via `workflow_call`)
- [x] Database migration strategy (auto-migration via docker-entrypoint.sh)
- [x] Backup and restore procedures (update.ps1, rollback.ps1, daily-backup scheduled task)
- [ ] Monitoring and alerting setup
- [x] SSL/TLS certificate management (documented in WINDOWS_SERVER_INSTALL.md)
- [ ] Load balancing considerations
- [x] Environment-specific configuration (dev/staging/prod via .env + docker-compose.prod.yml)
- [x] Rollback procedures (rollback.ps1 with DB restore)
- [x] Windows Server on-premise deployment (install-windows.ps1, update.ps1, validate-deployment.ps1, rollback.ps1)

---

## Backlog (From IMPLEMENTATION_STATUS.md)

### Phase 9: HgbA1c Goal Configuration
- [ ] HgbA1c Goal dropdown for Diabetes Control rows (Less than 7/8/9)
- [ ] "Goal Reached for Year" checkbox
- [ ] "Patient Declined" checkbox
- [ ] Special color logic (GREEN/ORANGE/RED/GRAY) based on goal vs actual

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

## Test Coverage Improvement

**Audit Report:** [TEST_AUDIT_REPORT.md](./TEST_AUDIT_REPORT.md) (February 10, 2026)
**Current:** ~2,587 tests (1,165 Jest + 1,037 Vitest + 43 Playwright + ~342 Cypress)
**Added Feb 10-12, 2026:** +244 new tests (116 Jest + 115 Vitest + 13 Cypress), fixed 13 pre-existing failures, 3 bugs fixed, +22 Jest from code quality refactor, +104 Vitest from code quality refactor

### Priority 1: Critical Gaps (Zero Coverage)

- [x] **AdminPage.tsx** (Vitest) — 12 tests: rendering, tabs, user list, role badges, error/loading states. *(Feb 10, 2026)*
- [x] **dropdownConfig.ts** (Vitest) — 45 tests: all mappings, helper functions, auto-fill, cascade chain integrity. *(Feb 10, 2026)*
- [x] **config.routes.ts** (Jest) — 14 tests: all 7 endpoints, auth middleware, error handling. *(Feb 10, 2026)*
- [x] **Route happy-path tests** (Jest) — All 5 route files rewritten with `jest.unstable_mockModule` for ESM-compatible mocking. 84 new tests: data.routes (24), admin.routes (30), auth.routes (29), users.routes (15), import.routes (28). *(Feb 10, 2026)*

### Priority 2: High-Value Gaps

- [x] **PatientAssignmentPage.tsx** (Vitest) — 20 tests: wrapper, lazy-load, patient list, select all, bulk assign, error/success/empty states. *(Feb 10, 2026)*
- [x] **ProtectedRoute.tsx** (Vitest) — 9 tests: loading, unauthenticated redirect, role-based access, token verification. *(Feb 10, 2026)*
- [x] **statusColors.ts** (Vitest) — 29 tests: all status arrays, isChronicDxAttestationSent, isRowOverdue (time-mocked), getRowStatusColor priority ordering. *(Feb 10, 2026)*
- [x] **Hover-reveal dropdown feature** (Cypress) — 13 tests: arrow visibility, single-click opens dropdown, text cells unaffected, disabled cells hidden, styling. *(Feb 10, 2026)*

### Priority 3: Medium Gaps

- [ ] **Fix 4 skipped Playwright tests** — 3 delete tests + 1 duplicate test disabled, reducing core CRUD E2E coverage.
- [x] **errorHandler.ts + upload.ts middleware** (Jest) — 19 tests: errorHandler (status codes, error codes, stack traces, createError factory), upload (CSV/XLSX/XLS accept, PDF/TXT/JSON reject, missing file). *(Feb 10, 2026)*
- [ ] **Due date edge cases** (Jest) — Month boundaries (Jan 31 + 1 month), leap years, year boundaries, DST transitions. Est. 8-12 tests.
- [ ] **PatientGrid onCellValueChanged** (Vitest) — Complex cascading auto-save handler only tested via E2E. Mock gridApi and test each cascade path + error handling. Est. 15-20 tests.
- [ ] **Tracking #2 BP text input** (Cypress) — Only HgbA1c dropdown tested; BP free-text entry not tested.
- [ ] **Status Date prompt verification** (Cypress) — Prompt text changes per status not visually verified.
- [ ] **Due Date display for non-HgbA1c** (Cypress) — AWV completed + statusDate -> verify dueDate = +365 days.
- [ ] **Sort freeze during edit** (Cypress) — Sort indicator clearing on edit not E2E tested.
- [x] **~~Fix useSocket.test.ts failure~~** — Fixed: added `getState()` mock (BUG-TEST-002).

### Priority 4: Nice-to-Have

- [ ] **HillMeasureMapping.tsx** (Vitest) — Measure config page + CSV export.
- [ ] **DuplicateWarningModal.tsx** (Vitest) — Simple modal.
- [ ] **health.routes.ts** (Jest) — Health check endpoint.
- [ ] **socketIdMiddleware.ts** (Jest) — Header extraction.
- [ ] **DOB masking verification** (Cypress) — "###" display + aria-label.
- [ ] **Phone formatting display** (Cypress) — (555) 123-4567 format.
- [ ] **Keyboard navigation** (Playwright) — Tab, Enter, Escape, arrow keys in grid.
- [ ] **Multi-browser/viewport** (Playwright) — Responsive checks for mobile/tablet.

### Bugs Found During Testing (Feb 10, 2026) — ALL FIXED

- **BUG-TEST-001** ~~(Low): `shouldAutoFillQualityMeasure()` returns `undefined` instead of `false`~~ **FIXED**: Changed to `!!measures && measures.length === 1` for explicit boolean return.
- **BUG-TEST-002** ~~(Pre-existing): `useSocket.test.ts` `wires onPresenceUpdate` fails~~ **FIXED**: Added `getState()` mock to `useAuthStore` in `beforeEach`.
- **BUG-TEST-003** ~~(Pre-existing): 15 backend Jest suites fail to compile (`import.meta.url`)~~ **FIXED**: Replaced with `path.resolve(process.cwd(), '../test-data')` in validator/integration tests. Rewrote config.routes to use `jest.unstable_mockModule`. Added graceful DATABASE_URL skip to mergeLogic. Added Prisma mock to dueDateCalculator.

### Review Checklist

When addressing gaps, review each use case against the feature requirements:

- [ ] Review `REGRESSION_TEST_PLAN.md` for any test cases marked "Manual" that could be automated
- [ ] Cross-check `IMPLEMENTATION_STATUS.md` features against test coverage — every completed feature should have tests
- [ ] Verify all 13 quality measures have at least basic E2E dropdown test coverage
- [ ] Verify all 8 row colors have E2E verification tests
- [ ] Verify every API endpoint has at least one happy-path + one error test
- [ ] Run coverage reports: `cd backend && npm test -- --coverage` and `cd frontend && npm run test:run -- --coverage`

---

## Completed

See [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) for completed features.

---

## Last Updated

February 23, 2026 - Release 4.11.1: Conflict detection fixes (wrong-file, MISSING false positives, patient field auto-population), Sutter parser blank row alignment, sheet validation fuzzy fallback, Cypress + Playwright hardening. 1,387 Jest + 1,138 Vitest + Playwright + Cypress = ~2,525+ automated tests.
February 19, 2026 - Release 4.10.0: Remove tracking3, rename Copy Member, pinned row on add/duplicate, import Q4-Q8 decisions, smart column mapping spec. 1,165 Jest + 1,037 Vitest + 43 Playwright + ~342 Cypress = ~2,587 automated tests.
February 18, 2026 - Release 4.9.0: Sutter duplicate merging, measureDetails parsing, role-based tests, universal sheet validation, configurable preview columns, bug fixes (ADMIN+PHYSICIAN dual role, CSV headerRow, SheetSelector a11y), Sutter/SIP multi-system import. 1,165 Jest + 1,025 Vitest + 43 Playwright + ~342 Cypress = ~2,575 automated tests.
February 14, 2026 - Sutter/SIP multi-system import: full pipeline (config, parser, routes, transformer, mapper, UI). 253 new Jest + 61 new Vitest. 1,030 Jest + 956 Vitest + 43 Playwright + ~342 Cypress = ~2,371 automated tests.
February 13, 2026 - Release 4.6.0: Insurance group filter (REQ-IG), security hardening phases 1-3 (REQ-SEC-04/05/06/10). 777 Jest + 895 Vitest + 43 Playwright + ~342 Cypress = ~2,057 automated tests.
February 12, 2026 - Release 4.5.0: 10-phase code quality refactor complete, visual test plan v2.1 executed (232 tests, 0 failures). All tests passing: 701 Jest + 856 Vitest + 43 Playwright + ~342 Cypress = ~1,942 automated tests.
February 11, 2026 - Date prepopulate (Option A "Today" button): StatusDateRenderer + DateCellEditor for statusDate column. Striped prompt + hover Today button. 22 new Vitest + ~36 new Cypress tests. Total: ~1,816 tests (679 Jest + ~752 Vitest + 43 Playwright + ~342 Cypress).
February 11, 2026 - Auto-open dropdown editor: AutoOpenSelectEditor replaces agSelectCellEditor. 22 new Vitest, 3 updated PatientGrid tests. Cypress commands updated. Total: 1,758 tests (679 Jest + 730 Vitest + 43 Playwright + 306 Cypress).
February 11, 2026 - Test audit committed: +244 tests, 13 pre-existing failures fixed, 3 bugs fixed. Hover-reveal dropdown CSS. Slash commands refactored to background Task agents. Total: 1,736 tests (679 Jest + 708 Vitest + 43 Playwright + 306 Cypress).
February 11, 2026 - API error handling UX: getApiErrorMessage utility, replaced alert() with showToast(), added toast to MainPage catch blocks. 8 new Vitest tests. Total: 708 Vitest.
February 10, 2026 - Route happy-path tests: All 5 route files rewritten with jest.unstable_mockModule (ESM fix). 84 new route tests + 19 middleware tests. errorHandler + upload middleware fully covered. Total: 679 Jest + 700 Vitest = 1,379 unit tests, 0 failures.
February 10, 2026 - Fixed all 13 pre-existing backend test failures: mergeLogic (12 tests, graceful DB skip + import.meta.url fix), dueDateCalculator (1→31 tests, Prisma mock + 6 new Priority 3/4 tests). config.routes rewritten with jest.unstable_mockModule (ESM fix). 3 bugs fixed (BUG-TEST-001/002/003).
February 10, 2026 - High-priority test coverage: +142 new tests (dropdownConfig 45, statusColors 29, ProtectedRoute 9, config.routes 14, AdminPage 12, PatientAssignmentPage 20, hover-reveal Cypress 13). 3 bugs logged.
February 9, 2026 - Compact Filter Bar complete (482 Vitest, +139 new), BUG-8 fixed (chip counts on cell edit), removed Assign Patients from Admin, deployment pipeline & Windows Server support
February 7, 2026 - BUG-4/5 fixed (Chronic DX attestation colors), BUG-7 fixed (import reassignment dedup), BUG-6 logged. 6 new Cypress E2E tests, row-colors requirements rewritten.
February 7, 2026 - Patient Management Page complete: tabbed `/patient-management` page, 18 Vitest + 8 Playwright tests, Cypress tests updated
February 6, 2026 - Created patient-management spec requirements (consolidate Import + Patient Assignment pages)
February 6, 2026 - Removed row numbers column (user feedback). Fixed search bug (re-fetch clears search). Added word-based search matching.
February 6, 2026 - Completed 8 UX quick-wins (batch 2): focus-visible, aria-label DOB, status bar, password helper, password toggles, overflow-x, warning icon, max file size
February 6, 2026 - Added grid feature requests: Copy Member label, filter-aware row creation, row numbers
February 6, 2026 - Comprehensive MCP Playwright visual review: 4 review reports, 3 bugs fixed, 24 UX suggestions logged
February 5, 2026 - Multi-select status filter, patient name search, test gap coverage, spec infrastructure
February 4, 2026 - Bug fixes: Delete row physicianId, removed username from Admin UI
