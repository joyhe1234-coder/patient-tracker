# Test Suite Audit Report

**Date:** February 10, 2026
**Project:** Patient Quality Measure Tracking System
**Total Automated Tests:** 1,141+ (527 Jest + 575 Vitest + 43 Playwright + 293 Cypress)

---

## Project Overview

A web application replacing Excel-based tracking for medical offices. It manages patient quality measures across 13 measure types with cascading dropdowns, conditional row coloring (8 colors), real-time collaborative editing via Socket.IO, CSV/Excel import pipeline, role-based access (Physician/Staff/Admin), and duplicate detection. Tech stack: React 18 + AG Grid (frontend), Express + Prisma + PostgreSQL (backend).

---

## Layer 1: Backend Unit Tests (Jest) — 527 tests across 28 files

### Use Cases Tested

#### Authentication & Authorization (5 files, ~90 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `authService.test.ts` | Password hashing (bcrypt), verification (correct/incorrect/empty), JWT generation (payload, multi-role, uniqueness), JWT verification (valid/invalid/malformed/expired/wrong-secret), sensitive data stripping |
| `emailService.test.ts` | SMTP configuration detection (all combos of missing HOST/PORT/USER/PASS), password reset URL construction (default/custom APP_URL, token preservation), email content (subject line, expiration notice), admin reset notification |
| `auth.test.ts` (middleware) | Missing auth header, invalid Bearer format, empty token, role checking (no user, no match, match), optional auth, patient data access (PHYSICIAN/STAFF/ADMIN/multi-role) |
| `socketAuth.test.ts` | Socket.IO auth: no token, undefined token, invalid token, user not found, deactivated user, successful auth, admin multi-role, unexpected errors |
| `auth.routes.test.ts` | Login validation (invalid email, missing fields), protected endpoint auth checks (logout, me, password), forgot-password validation, reset-password validation |

#### Core Business Logic (5 files, ~150 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `dueDateCalculator.test.ts` | HgbA1c due dates (null/empty tracking2, 1/3/6/12 month intervals, invalid format), general cases (null statusDate/measureStatus/both), screening-discussed month patterns |
| `duplicateDetector.test.ts` | Duplicate check (null/empty/whitespace fields, existing/no matches, Prisma query verification), detect-all (empty/single/groups of 2+/3+, null fields, mixed), update flags (mark groups, singles, null fields, multiple groups), sync-all |
| `statusDatePromptResolver.test.ts` | 50+ prompt texts for AWV/Eye Exam/Screening/GC/Diabetic/HgbA1c/BP/ACE/Vaccination/Lab/Chronic DX/Decline/Ending statuses, tracking1 overrides (deceased, hospice), null/unknown/case-sensitivity, database lookup with priority ordering |
| `socketManager.test.ts` | Room naming (physician ID, unassigned), presence tracking (add/multiple/dedup/remove/cleanup/disconnect), active edit tracking (add/replace/multiple/remove/clear) |
| `versionCheck.test.ts` | Optimistic concurrency: no conflict (matching timestamps), conflict (different timestamps + overlapping fields), auto-merge (no field overlap), row deleted, changedBy from audit log, multiple overlapping fields, audit log failures, payload conversion |

#### Import Pipeline (9 files, ~250 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `fileParser.test.ts` | CSV parsing (headers, multiple rows, empty values, title row detection for "Report"/"All ("/"--", trim, quotes, empty), Excel parsing (same + error handling), file type routing (csv/xlsx/xls/unsupported/uppercase), column validation, real test-data files |
| `columnMapper.test.ts` | Column mapping (patient columns, Q1/Q2 measures, skip columns, unmapped, missing required, empty headers, whitespace, stats), measure grouping, test-data headers |
| `dataTransformer.test.ts` | Wide-to-long transformation, multi-measure row expansion, empty measure skipping, any-non-compliant-wins logic, no-measures patients, date parsing (formats, invalid), status date handling, source row tracking, test-data files |
| `validator.test.ts` | Required fields (name/DOB/requestType/qualityMeasure), warnings (phone, status), error deduplication, memberName in errors, duplicate detection, row index tracking, stats, date/name/requestType/qualityMeasure edge cases, large dataset (1000 rows), result structure |
| `diffCalculator.test.ts` | Summary text (merge/replace modes), action filtering (INSERT/UPDATE/SKIP/BOTH/DELETE), modifying changes, change structure, categorize-status (compliant/non-compliant/unknown, 30+ statuses, case-insensitive), replace-all diff, merge diff, apply-merge-logic (6 documented cases), 20+ edge cases |
| `errorReporter.test.ts` | Report generation, summary (success/warning/error, row counts), group-by-field (count, 5-sample limit), group-by-row (patient name), duplicate report, text formatting (1-indexed rows), condensed report (10 error/5 duplicate limits) |
| `previewCache.test.ts` | Store/retrieve/delete previews, unique IDs, expiration, active previews, stats, cleanup expired, clear all, extend TTL, summary |
| `reassignment.test.ts` | Interface structure (all fields, null owners), names, scenarios (A->B, unassigned->physician, physician->unassigned), display formatting, detection logic (same/different owners) |
| `importExecutor.test.ts` | Replace/Merge mode execution |

#### Route Authorization (6 files, ~60 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `admin.routes.test.ts` | 401 for all 11 admin endpoints without auth |
| `users.routes.test.ts` | 401 for physician endpoints, invalid token formats |
| `data.routes.test.ts` | CRUD auth checks |
| `data.routes.socket.test.ts` | Socket event emission on successful CRUD |
| `data.routes.version.test.ts` | expectedVersion/forceOverwrite concurrency control |
| `import.routes.test.ts` | Import endpoint auth/authorization |

### Coverage Assessment

**Well-Covered Areas:**
- Import pipeline is the strongest — 9 files with 250+ tests covering parsing, transformation, validation, diff calculation, and caching
- Authentication service logic (hashing, JWT, token verification) thoroughly tested
- Duplicate detection has extensive edge case coverage
- Due date calculation covers HgbA1c and screening month patterns
- Status date prompt resolution tests 50+ status-to-prompt mappings

### Gaps & Improvement Areas

| # | Gap | Priority | Impact | What to Add |
|---|-----|----------|--------|-------------|
| B1 | **`config.routes.ts`** — 188 lines, 7 API endpoints, ZERO tests | HIGH | All dropdown data served to frontend could silently break | Test each GET endpoint returns correct data shape, cascading filter logic, auth requirements |
| B2 | **`health.routes.ts`** — health check endpoint, ZERO tests | MEDIUM | Deployment monitoring depends on this | Test 200 when DB connected, 503 when disconnected, response format |
| B3 | **`errorHandler.ts`** — error formatting middleware, ZERO tests | MEDIUM | Malformed error responses confuse frontend | Test status code propagation, stack trace in dev vs prod, createError utility |
| B4 | **`upload.ts`** — file upload validation, ZERO tests | MEDIUM | Invalid files could bypass validation | Test file type filtering (.csv/.xlsx/.xls only), 10MB size limit, MulterError handling |
| B5 | **`socketIdMiddleware.ts`** — header extraction, ZERO tests | LOW | Simple but untested | Test X-Socket-ID header extraction and attachment |
| B6 | **Route happy-path testing** — routes only test auth failures | HIGH | No tests verify that valid requests return correct data | Add happy-path tests for data CRUD operations (GET/POST/PUT/DELETE with valid auth), import execution flow, admin user management |
| B7 | **`importExecutor.ts`** — partially tested | MEDIUM | Core import execution logic | Expand tests for error handling during bulk insert/update/delete, transaction rollback |
| B8 | **Integration tests** — import pipeline end-to-end | MEDIUM | Individual services tested but not the full pipeline flow | Add tests that run fileParser -> columnMapper -> dataTransformer -> validator -> diffCalculator -> importExecutor in sequence |
| B9 | **Due date edge cases** — timezone boundaries | HIGH | UTC noon strategy may fail at month boundaries | Test month-end dates (Jan 31 + 1 month), leap years, year boundaries, DST transition dates |
| B10 | **WebSocket broadcast integration** — only tests event emission | MEDIUM | No test that Socket.IO actually delivers messages to room members | Would require integration test with real Socket.IO server |

---

## Layer 2: Frontend Component Tests (Vitest) — 575 tests across 19 files

### Use Cases Tested

#### State Management (3 files, 63 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `authStore.test.ts` (25 tests) | Initial state, login (loading/success for PHYSICIAN/STAFF, localStorage, assignment restoration, errors), logout (clear state, localStorage, endpoint call, error resilience), physician selection (state + localStorage), error clearing, checkAuth (no token, valid/invalid token, physician auto-select), refreshUser |
| `realtimeStore.test.ts` (19 tests) | Initial state, connection status (connected/reconnecting/offline/connecting), room users (set/replace/empty), active edits (add/multiple/dedup/remove/clear), import in progress (set/clear/missing importedBy) |
| `socketService.test.ts` (25 tests) | Server URL detection, connect (JWT auth, connection status, event listeners, reconnection lifecycle, duplicate prevention, handler callbacks, connect/disconnect events, auth failure, generic errors), disconnect (cleanup, null, safe double-call), joinRoom (connected/unassigned/disconnected), leaveRoom, emitEditingStart/Stop, getSocket |

#### Hook Tests (1 file, 17 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `useSocket.test.ts` (17 tests) | Connect/disconnect on mount/unmount, room join/leave on physician change, null token handling, event handler wiring (connectionChange, presenceUpdate, editingActive/Inactive, importStarted/Completed, rowUpdated/Deleted) |

#### Component Tests (7 files, ~290 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `PatientGrid.test.tsx` (57 tests) | Rendering (with/without data, theme container), column definitions (count, fields, pinning, editors, editability, flex), member info visibility toggle, grid config (selection mode, double-click edit, stop-on-blur, animation, row IDs, deltaSort), row class rules (8 colors + duplicate + overdue + chronic DX attestation cascade + never-overdue for purple/gray), prop passing, header names/tooltips, DOB masking with aria-label, socket integration (editing events, ConflictModal, remote-edit cell class), version tracking |
| `StatusFilterBar.test.tsx` (181 tests) | All chips rendered with counts, click behavior, toggle-off-last to all, multi-select (add/remove/all-exits, duplicates exclusivity), checkmark visual style (aria-pressed, opacity, filled background), zero-count handling, search input (placeholder, aria-label, clear button visibility, typing, clear, Escape, display value), accessibility (focus-visible), compact styling (whitespace-nowrap, padding, font), quality measure dropdown (render, default "All", 13 measures, onChange, blue ring, aria-label, divider), **getRowStatusColor exhaustive matrix** (gray/purple/green/blue/yellow/orange/white statuses, overdue handling, chronic DX attestation 4-way matrix, boundary dates today/yesterday/tomorrow/null, chip count accuracy with overdue+duplicate, rowClassRules consistency) |
| `Header.test.tsx` (16 tests) | Provider dropdown visibility by role/page, unassigned patients option (ADMIN only), physician selection callbacks, change password modal (3 fields, 8-char helper, visibility toggle), role display ("ADMIN + PHYSICIAN") |
| `Toolbar.test.tsx` (15 tests) | All buttons rendered, duplicate button enable/disable/click, delete button enable/disable/click, add row click, member info toggle, save status indicator (idle/saving/saved/error) |
| `AddRowModal.test.tsx` (15 tests) | Open/close rendering, form fields, required indicators, validation (empty name/DOB, error clearing), submission (valid data, form reset, failed onAdd), close behavior (cancel/X/backdrop) |
| `ConfirmModal.test.tsx` (11 tests) | Open/close, title/message display, default/custom button text, confirm/cancel/backdrop callbacks, button color variants, alert icon |
| `ConflictModal.test.tsx` (14 tests) | Open/close, patient name, changedBy, conflict field display, 3-column values (original/theirs/yours), "(empty)" for nulls, multiple conflicts, Keep Mine/Keep Theirs/Cancel callbacks, backdrop click, 3 action buttons rendered |
| `StatusBar.test.tsx` (18 tests) | Row count ("X of Y" format, locale formatting, zero), filter summary (shown/hidden/combined), connection status (green connected/yellow reconnecting/red disconnected/gray offline/hidden connecting), presence indicator (shown/plural/hidden/tooltip hover/leave) |

#### Page Tests (6 files, ~170 tests)

| Module | Use Cases Covered |
|--------|-------------------|
| `MainPage.test.tsx` (45 tests) | Search filtering (empty/case-insensitive/partial/any-part/no-match/uppercase/mixed/whitespace/trim/multi-word/all-words/extra-spaces), null memberName handling, search + status filter AND logic (green+name, blue+name, no-match combos, duplicate+search), clearing search restores rows, multi-select OR logic (2 colors, 3 colors, single, duplicates, all-selected, multi+search, empty combos), quality measure filter (by measure, "All", null exclusion, measure+color AND, measure+color+search triple AND, duplicate+measure, preserve filter on change), measure-scoped rowCounts, chip count independence from filters |
| `LoginPage.test.tsx` (17 tests) | Form rendering (inputs, placeholders, admin contact), validation (empty email/password/both), login flow (credentials, trim email, redirect), error display, loading state (text, disabled inputs), password visibility toggle (hide/show/re-hide), redirect when authenticated |
| `ForgotPasswordPage.test.tsx` (12 tests) | Loading state, SMTP not configured (unavailable message, link, no form), SMTP configured (email form, description, back link), submission (API call, success message, loading, error, generic error, disabled during loading), SMTP check error |
| `ResetPasswordPage.test.tsx` (19 tests) | No token (invalid message, link, no form), token present (form, description, back link, min-length helper), validation (password mismatch, too short), submission (API call, success, redirect, loading, disabled), API errors (expired token, 4 error scenarios) |
| `ImportPage.test.tsx` (27 tests) | Rendering (title, steps, system dropdown, mode options, file upload area, preview button, cancel, what-happens-next), mode selection (Merge default, Replace All, warning text, recommended label), Replace All warning (modal, cancel, confirm, no modal for Merge), file upload (invalid type, CSV/Excel acceptance, file size display, enable preview, remove file), submission (loading, navigation, API error, network error, form data) |
| `ImportPreviewPage.test.tsx` (23 tests) | Loading spinner, error state (not found, new import button, navigation), preview display (title, mode, summary cards, patient counts, changes table, action badges, buttons), filtering (by INSERT, show all), cancel (delete + navigate), execution (loading, success, error, Import More button), empty changes (disabled Apply), warnings display (shown/hidden/singular) |
| `PatientManagementPage.test.tsx` (18 tests) | Page heading/icon, tab visibility by role (ADMIN both, STAFF/PHYSICIAN import only), default tab, tab switching (click Reassign/Import, isActive prop passing), URL params (?tab=reassign for ADMIN, fallback for STAFF/PHYSICIAN, invalid), content mounting (Import always rendered, Reassign for ADMIN only) |

### Coverage Assessment

**Well-Covered Areas:**
- StatusFilterBar is the most extensively tested component (181 tests) — exhaustive color matrix, multi-select logic, accessibility, getRowStatusColor with every status combination
- MainPage filtering logic thoroughly tested — search, multi-select OR, quality measure, triple AND combinations
- PatientGrid column definitions, row class rules, and socket integration well covered
- Auth flows (login/forgot/reset) have strong happy-path and error coverage
- Import pages test the full user journey from upload through preview to execution

### Gaps & Improvement Areas

| # | Gap | Priority | Impact | What to Add |
|---|-----|----------|--------|-------------|
| F1 | **`AdminPage.tsx`** — 918 lines, ZERO tests | CRITICAL | User management, role assignment, password resets, staff mapping, audit log — all untested | Test user list rendering, create/edit/delete flows, role badge display, expandable rows, staff assignment, deactivation, audit log tab, non-admin redirect |
| F2 | **`PatientAssignmentPage.tsx`** — 307 lines, ZERO tests | HIGH | Bulk patient reassignment UI logic untested | Test patient list rendering, checkbox selection, select-all, physician dropdown, assign button enable/disable, success/error messages, count updates |
| F3 | **`HillMeasureMapping.tsx`** — 162 lines, ZERO tests | MEDIUM | Admin measure status configuration page | Test mapping display, status dropdown changes, CSV export |
| F4 | **`ProtectedRoute.tsx`** — 75 lines, ZERO tests | HIGH | Auth guard for all protected pages | Test redirect for unauthenticated, role-based access, loading spinner, successful render for authorized users |
| F5 | **`DuplicateWarningModal.tsx`** — 64 lines, ZERO tests | LOW | Simple modal but untested | Test open/close, patient name display, button callbacks |
| F6 | **`dropdownConfig.ts`** — 214 lines, ZERO tests | HIGH | All cascading dropdown logic runs untested | Test every REQUEST_TYPE->QUALITY_MEASURE mapping, every QM->STATUS mapping, every STATUS->TRACKING1 mapping, auto-fill logic, edge cases (empty/null/unknown inputs) |
| F7 | **`statusColors.ts`** — 127 lines, ZERO tests | HIGH | Row coloring business logic (partially covered indirectly by StatusFilterBar's getRowStatusColor tests, but the shared module itself is untested) | Test isRowOverdue UTC logic with timezone edge cases, isChronicDxAttestationSent, all status arrays, getRowStatusColor independently |
| F8 | **PatientGrid `onCellValueChanged`** — complex cascading logic | HIGH | Auto-save handler with cascading field clearing tested only via E2E, not unit-tested | Mock gridApi and test each cascade path (requestType->all downstream, qualityMeasure->downstream, measureStatus->downstream), error handling (409 conflict, 404 deleted), sort indicator clearing |
| F9 | **PatientGrid `onCellClicked`** (new hover-reveal feature) | MEDIUM | Single-click dropdown opening logic not unit-tested | Test isDropdownCell for each column, verify startEditingCell called for dropdowns, verify text cells ignored, verify remote-editing cells skipped |
| F10 | **`useSocket` hook** — 1 pre-existing test failure | LOW | `wires onPresenceUpdate to setRoomUsers` fails due to mock issue | Fix `useAuthStore.getState` mock to return proper function |

---

## Layer 3: Playwright E2E — 43 tests across 11 spec files (4 skipped)

### Use Cases Tested

#### Authentication Flows (1 file, 9 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `auth.spec.ts` | Login page display, invalid credentials error, password visibility toggle, successful login + redirect, loading state, protected route redirects (main + admin), logout, session persistence after refresh |

#### Grid CRUD Operations (3 files, 23 tests, 4 skipped)

| Spec | Use Cases Covered |
|------|-------------------|
| `add-row.spec.ts` (8 tests) | Modal open, form fields present, valid submission creates row, new row appears first, empty measure fields, cancel closes without creating, validation errors (name/DOB), X button closes |
| `delete-row.spec.ts` (7 tests, 3 skipped) | Delete disabled without selection, enabled with selection, confirmation dialog, warning message, cancel keeps row, backdrop closes dialog; **Skipped**: confirm delete removes row, delete disables after, multiple deletes |
| `duplicate-member.spec.ts` (8 tests, 1 skipped) | Duplicate disabled/enabled by selection, creates row with same patient data, empty measure fields, copies phone/address (via member info toggle), duplicated row selected, multiple duplicates; **Skipped**: deselect |

#### Navigation & Page Structure (2 files, 13 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `smoke.spec.ts` (4 tests) | Page loads, grid visible, toolbar buttons present, filter bar with chips, grid has data rows |
| `patient-management.spec.ts` (9 tests) | Nav link, Import default tab, both tabs for ADMIN, Reassign tab content, redirects (/import -> /patient-management, /admin/patient-assignment -> ?tab=reassign), PHYSICIAN: no Reassign tab, tab=reassign fallback |

#### Filter Bar (1 file, 8 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `compact-filter-bar.spec.ts` | Compact chip styling (whitespace-nowrap, py-0.5, text-xs), measure dropdown visible + functional ("All Measures" default), combined filter updates status bar, measure selection persists after chip toggle, zero-count chip faded, specific measure filtering ("Annual Wellness Visit", "Diabetic Eye Exam") |

#### Real-Time Collaborative Editing (4 files, 11 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `parallel-editing-conflict.spec.ts` (3 tests) | Two users editing same cell -> conflict dialog, Keep Mine resolves with user's value, Keep Theirs reverts to other user's value |
| `parallel-editing-connection.spec.ts` (3 tests) | "Connected" status after login, presence indicator when second user joins, presence updates when user leaves |
| `parallel-editing-reconnection.spec.ts` (2 tests) | "Reconnecting" when Socket.IO blocked, "Connected" after network restored |
| `parallel-editing-updates.spec.ts` (3 tests) | Cell edit broadcasts to other user, row add broadcasts, row delete broadcasts |

### Coverage Assessment

**Well-Covered Areas:**
- Authentication flow is solid — login, logout, session persistence, protected routes
- Real-time collaboration has dedicated test coverage for conflict resolution, presence, reconnection, and live updates
- Add/duplicate row modals tested thoroughly
- Patient management page navigation and role-based tab visibility

### Gaps & Improvement Areas

| # | Gap | Priority | Impact | What to Add |
|---|-----|----------|--------|-------------|
| P1 | **3 skipped delete tests** | HIGH | Confirm-delete, post-delete state, and multiple-delete flows are skipped | Fix and enable: confirming delete removes row, delete button disables after deletion, sequential delete operations |
| P2 | **1 skipped duplicate test** | LOW | Deselect after duplicate | Fix and enable |
| P3 | **No admin page E2E tests** | HIGH | User management, role assignment, audit log never tested end-to-end | Add: navigate to admin, list users, create user, edit roles, deactivate user, view audit log, staff-physician assignments |
| P4 | **No import execution E2E** | MEDIUM | Upload -> preview -> execute flow not tested in Playwright (covered in Cypress) | Consider adding a smoke test for the full import pipeline |
| P5 | **No cell editing E2E in Playwright** | LOW | Covered by Cypress, but Playwright could add basic double-click-edit-save test | Low priority since Cypress handles this |
| P6 | **No keyboard navigation tests** | MEDIUM | Tab, Enter, Escape, arrow key navigation in grid not tested | Add: Tab between cells, Enter to start editing, Escape to cancel, F2 to edit |
| P7 | **No error state E2E tests** | MEDIUM | Network failures, API errors, 500 responses not tested in browser context | Add: simulate API failure during save, verify error indicator, test retry behavior |
| P8 | **Conflict resolution with cascading fields** | MEDIUM | Only tests simple cell conflicts, not conflicts during cascading dropdown changes | Add: conflict when changing Request Type (which cascades to 7 fields) |
| P9 | **Multi-browser/viewport testing** | LOW | Only tests at default viewport | Add responsive checks for mobile/tablet viewports |

---

## Layer 4: Cypress E2E — 293 tests across 15 spec files

### Use Cases Tested

#### AG Grid Cell Editing (1 file, 19 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `cell-editing.cy.ts` | Row selection (outline, change, preserve color), text editing in Notes (enter/save-on-click/save-on-Tab/persist/save-indicator), date editing in Status Date (MM/DD/YYYY, M/D/YY, YYYY-MM-DD, M.D.YYYY, normalize display, invalid alert, clear to null), member name editing (edit + display), save indicator lifecycle (Saving->Saved->hidden) |

#### Cascading Dropdowns (1 file, 30 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `cascading-dropdowns.cy.ts` | Request Type 4 options, auto-fill Quality Measure (AWV->Annual Wellness Visit, Chronic DX->Chronic Diagnosis Code), AWV 7 statuses (completed->green, scheduled->blue, declined->purple), Breast Cancer 8 statuses (test ordered->Tracking #1 options, completed->green), Chronic DX 5 statuses (resolved->attestation options, attestation cascade colors), Hypertension (BP call back->at goal clears due date), HgbA1c (12 month options, due date calculation per status), field clearing on parent change |

#### Sorting & Filtering (2 files, 52 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `sorting-filtering.cy.ts` (39 tests) | Column sorting (7 columns: Status Date, Due Date, Member Name, Request Type, Quality Measure, Measure Status, Time Interval — each asc/desc/none), sort indicator clearing, 10 filter chips rendered with counts, filter by each status (Completed/In Progress/Contacted/Declined/Resolved/N/A/Overdue/Duplicates), toggle behavior (return to All, multi-select add, highlight with aria-pressed + checkmark), filter+sort combination (maintain filter when sorting, maintain sort when filtering), status bar count updates, row color verification for 8+ statuses |
| `multi-select-filter.cy.ts` (13 tests) | Multi-select OR logic (select multiple, toggle off without affecting others, fall back to All, click All clears), Duplicates exclusivity (deselects color chips, exit on color click), checkmark + fill visual (checkmarks, opacity, aria-pressed on All), search + multi-filter combination |

#### Patient Search (1 file, 11 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `patient-name-search.cy.ts` | Search input UI (placeholder, clear button visibility), filtering (case-insensitive, partial match, empty on no match), clear behavior (restore all, hide button), filter combination (status + name AND logic, restore count), keyboard shortcuts (Ctrl+F focus, Escape clear+blur) |

#### Import Workflow (1 file, 25 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `import-flow.cy.ts` | Page structure (3 steps, Hill Healthcare default, Merge default, Replace All warning), file upload (CSV accepted, invalid rejected, remove file), preview navigation, preview page (summary cards, patient counts, changes table, action filtering), import execution (loading, success, statistics: Inserted/Updated/Deleted, navigation), error handling (invalid format, expired preview, empty CSV), merge mode behavior, preview details (file info, expiration), multiple imports (same file twice shows different results), cancel navigation |

#### Patient Assignment (1 file, 21 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `patient-assignment.cy.ts` | Viewing unassigned patients (navigate, display, available physicians), assigning (single/multiple/select-all, disable on no selection/no physician), count verification (update after assignment, appear in grid), admin grid viewing (unassigned option, switch between physicians, no caching), staff-physician assignments (checkboxes, assign/remove, view assigned only), E2E verification (count consistency, decrease unassigned) |

#### Role Access Control (1 file, 22 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `role-access-control.cy.ts` | STAFF (no Admin link, redirect from /admin, no unassigned option, only assigned physicians), PHYSICIAN (no Admin link, no dropdown, can't view others, can't access unassigned or /admin), ADMIN (Admin link, /admin page, unassigned option, view any physician), API access (403/401), navigation protection, data isolation (different counts per physician, separate unassigned, no cross-physician data) |

#### Duplicate Detection (1 file, 15 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `duplicate-detection.cy.ts` | Visual indicator (row-status-duplicate class, left border stripe, appears/disappears), creating duplicate via edit (409 error, reset cell, clear dependents), flag cleared on requestType change, null fields never duplicate, duplicate count (chip count, correct rows filtered, count updates), duplicate + color combination |

#### Time Interval (1 file, 11 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `time-interval.cy.ts` | Not editable for dropdown-controlled statuses (screening discussed, HgbA1c, BP call back), editable for standard statuses (AWV completed 365 days, Patient called 7 days), manual override (recalculate due date, 1-1000 range), validation (reject non-numeric/zero/>1000, don't allow empty), via dropdown (HgbA1c 3 months, screening discussed tracking1) |

#### UX & Accessibility (1 file, 7 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `ux-improvements.cy.ts` | Status bar consistency ("Showing X of Y rows", "Connected"), filter chip accessibility (aria-pressed, keyboard focus-visible), import page UX (warning icon, file size text), password visibility toggles (change password modal, helper text, toggle) |

#### Real-Time Collaboration (4 files, 13 tests)

| Spec | Use Cases Covered |
|------|-------------------|
| `compact-filter-bar.cy.ts` (3 tests) | Grid rows update with measure selection, chip counts update, measure + color chip AND filter |
| `parallel-editing-edit-indicators.cy.ts` (4 tests) | CSS class exists, cellFlash animation defined, dashed orange border applied, indicator removed on stop |
| `parallel-editing-grid-updates.cy.ts` (3 tests) | Cell updates on remote row:updated, scroll position preserved, row selection maintained |
| `parallel-editing-row-operations.cy.ts` (3 tests) | Rows loaded from API, selection state correct, count updates after add/delete |

### Coverage Assessment

**Well-Covered Areas:**
- Cascading dropdowns are the crown jewel — 30 tests cover the full hierarchy (Request Type -> Quality Measure -> Measure Status -> Tracking) with color verification at each step
- Sorting & filtering is thoroughly tested — 52 tests across sorting, multi-select, search, and combinations
- Import flow covers the entire journey from upload through preview to execution including error cases
- Role access control systematically tests STAFF/PHYSICIAN/ADMIN boundaries with API-level verification
- Time interval editability rules and validation comprehensively covered

### Gaps & Improvement Areas

| # | Gap | Priority | Impact | What to Add |
|---|-----|----------|--------|-------------|
| C1 | **No admin page Cypress tests** | HIGH | User CRUD, role management, audit log, staff assignments never tested via grid interaction | Test user list, create user modal, edit roles, deactivate toggle, staff-physician mapping, audit log |
| C2 | **No CSV export tests** | MEDIUM | HillMeasureMapping CSV export untested | Test export button click, file download, CSV content verification |
| C3 | **Tracking #2 BP reading text input** | MEDIUM | Only HgbA1c dropdown tested; BP free-text entry not specifically tested | Add: navigate to BP call-back status, type BP reading, verify it saves |
| C4 | **Tracking #3 editing** | LOW | Column exists but no tests for it | Add basic edit test (placeholder for future use) |
| C5 | **Status Date prompt text verification** | MEDIUM | Prompts like "Date Completed", "Date Ordered" not visually verified | Add: select different statuses, verify prompt text changes in Status Date cell |
| C6 | **Due Date auto-calculation display** | MEDIUM | Due date calculation tested for HgbA1c but not for other status types | Add: set statusDate for AWV completed, verify due date = statusDate + 365 days |
| C7 | **Overdue row color with date editing** | MEDIUM | Overdue detection tested statically but not after editing a status date to past | Add: set status date to past date, verify row turns red |
| C8 | **Concurrent import awareness** | LOW | Yellow banner when import in progress not tested | Add: simulate import:started socket event, verify banner appears |
| C9 | **DOB masking verification** | LOW | Member Info toggle tested but DOB "###" display not verified | Add: toggle member info on, verify "###" display, verify aria-label |
| C10 | **Phone formatting display** | LOW | Phone saved but (555) 123-4567 format not verified | Add: enter phone, verify formatted display |
| C11 | **Sort freeze during edit** | MEDIUM | Sort clearing on edit is in code but not tested | Add: sort by column, edit a cell in that column, verify sort indicator clears but rows don't jump |
| C12 | **Hover-reveal dropdown feature** | HIGH | Just implemented, no Cypress tests | Add: hover over dropdown cell -> arrow appears, single-click opens editor, hover over text cell -> no arrow, hover over N/A cell -> no arrow |

---

## Cross-Layer Summary

### Overall Coverage by Feature

| Feature | Jest (L1) | Vitest (L2) | Playwright (L3) | Cypress (L4) | Verdict |
|---------|-----------|-------------|------------------|---------------|---------|
| Authentication | Good | Good | Good | - | Solid |
| Cascading Dropdowns | - | - | - | Excellent | No unit tests for dropdownConfig.ts |
| Row Coloring | - | Excellent (181) | - | Good | No direct statusColors.ts unit test |
| Import Pipeline | Excellent | Good | - | Excellent | Solid |
| Duplicate Detection | Excellent | - | - | Good | Solid |
| Due Date Calculation | Good | - | - | Partial | Missing non-HgbA1c scenarios in E2E |
| Real-Time Collab | Good | Good | Good | Partial | Solid |
| Role Access Control | Good (auth) | Good (Header) | Partial | Excellent | Solid |
| **Admin Page** | Auth only | **ZERO** | **ZERO** | **ZERO** | **CRITICAL GAP** |
| **Patient Assignment** | - | **ZERO** | Partial | Good | Vitest gap |
| Cell Editing | - | Grid config | - | Good | No unit test for onCellValueChanged |
| Sorting/Filtering | - | Excellent | Partial | Excellent | Solid |
| Search | - | Excellent | - | Good | Solid |
| Time Interval | - | - | - | Excellent | No backend unit test for edge cases |
| **Hover-Reveal Dropdown** | - | **ZERO** | **ZERO** | **ZERO** | **NEW -- needs tests** |

### Top 10 Improvement Priorities

| Rank | ID | Description | Layer | Est. Tests |
|------|----|-------------|-------|------------|
| 1 | F1 | AdminPage.tsx — 918 lines, zero tests at any layer | Vitest | 30-40 |
| 2 | F6 | dropdownConfig.ts — all cascading dropdown mappings, zero unit tests | Vitest | 20-30 |
| 3 | B1 | config.routes.ts — 7 API endpoints serving dropdown data, zero tests | Jest | 15-20 |
| 4 | B6 | Route happy-path testing — routes only test auth rejection, not actual data ops | Jest | 25-35 |
| 5 | F2 | PatientAssignmentPage.tsx — bulk assignment UI, zero Vitest tests | Vitest | 15-20 |
| 6 | F4 | ProtectedRoute.tsx — auth guard for all pages, zero tests | Vitest | 8-12 |
| 7 | C12 | Hover-reveal dropdown — just implemented, zero E2E tests | Cypress | 6-10 |
| 8 | P1 | Fix 4 skipped Playwright tests — core CRUD coverage reduced | Playwright | 4 (fix) |
| 9 | B3+B4 | errorHandler.ts + upload.ts middleware — untested | Jest | 10-15 |
| 10 | B9 | Due date edge cases — timezone boundaries, month-end, leap year | Jest | 8-12 |

---

## Appendix: Source Module Test Coverage Map

### Backend — Untested Modules

| File | Lines | Description |
|------|-------|-------------|
| `backend/src/middleware/errorHandler.ts` | 40 | Express error formatting, stack traces, createError utility |
| `backend/src/middleware/upload.ts` | 54 | Multer file upload config, type/size validation |
| `backend/src/middleware/socketIdMiddleware.ts` | 15 | X-Socket-ID header extraction |
| `backend/src/routes/config.routes.ts` | 188 | 7 config API endpoints (dropdown data) |
| `backend/src/routes/health.routes.ts` | 34 | Health check with DB connectivity test |

### Frontend — Untested Modules

| File | Lines | Description |
|------|-------|-------------|
| `frontend/src/pages/AdminPage.tsx` | 918 | User CRUD, roles, staff mapping, audit log |
| `frontend/src/pages/PatientAssignmentPage.tsx` | 307 | Bulk patient-to-physician assignment |
| `frontend/src/pages/HillMeasureMapping.tsx` | 162 | Measure status mapping config + CSV export |
| `frontend/src/pages/ImportTestPage.tsx` | 1152 | Developer debug/test page for import pipeline |
| `frontend/src/components/auth/ProtectedRoute.tsx` | 75 | Auth guard + role-based route protection |
| `frontend/src/components/modals/DuplicateWarningModal.tsx` | 64 | Duplicate patient warning dialog |
| `frontend/src/config/dropdownConfig.ts` | 214 | Cascading dropdown mappings + auto-fill logic |
| `frontend/src/config/statusColors.ts` | 127 | Status-to-color mapping, overdue calculation, attestation logic |
