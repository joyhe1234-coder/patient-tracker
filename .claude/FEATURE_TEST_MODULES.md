# Feature Test Modules — Comprehensive Testing Plan

**Generated:** 2026-02-25
**Purpose:** Categorize all features into modular, independently testable units for comprehensive coverage planning.

---

## Module Map

```
M1  Authentication & Session
M2  Authorization & RBAC
M3  Admin User Management
M4  Patient Data CRUD
M5  AG Grid Cell Editing
M6  Cascading Dropdowns & Config
M7  Status Colors & Conditional Formatting
M8  Filtering & Search
M9  Duplicate Detection
M10 Real-Time Collaboration (Socket.IO)
M11 Import Pipeline — Hill (CSV)
M12 Import Pipeline — Sutter (Excel)
M13 Smart Column Mapping
M14 Conflict Detection & Resolution
M15 Patient Assignment & Ownership
M16 Audit Logging
M17 Quality Measures & Date Logic
M18 Security Hardening
M19 Accessibility & Visual Regression
M20 Deployment & Infrastructure
```

---

## M1: Authentication & Session

**Scope:** Login, logout, JWT token lifecycle, session persistence, password flows.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M1.1 | Successful login (valid email + password) | E2E | Automated |
| M1.2 | Failed login (wrong password) — error message | E2E | Automated |
| M1.3 | Failed login (non-existent email) — same error (no enumeration) | Unit | Automated |
| M1.4 | JWT token stored in localStorage on login | Unit | Automated |
| M1.5 | JWT token attached to API requests (Authorization header) | Unit | Automated |
| M1.6 | Expired JWT rejected (401) | Unit | Automated |
| M1.7 | Logout clears token + redirects to login | E2E | Automated |
| M1.8 | Protected routes redirect to login when unauthenticated | E2E | Automated |
| M1.9 | Forgot password — email sent (SMTP) | E2E | Automated |
| M1.10 | Reset password — valid token | E2E | Automated |
| M1.11 | Reset password — expired/invalid token | E2E | Automated |
| M1.12 | Reset password — password validation (min length) | E2E | Automated |
| M1.13 | Forced password change modal — blocks all navigation | E2E | Automated |
| M1.14 | Forced password change — clears mustChangePassword flag | Unit | Automated |
| M1.15 | SMTP status endpoint (`/api/auth/smtp-status`) | Unit | Automated |
| M1.16 | Password visibility toggle (eye icon) | E2E | Automated |

**Key Files:**
- Backend: `routes/auth.routes.ts`, `services/authService.ts`, `middleware/auth.ts`
- Frontend: `pages/LoginPage.tsx`, `pages/ForgotPasswordPage.tsx`, `pages/ResetPasswordPage.tsx`, `components/ForcePasswordChange.tsx`, `stores/authStore.ts`

**Dependencies:** None (foundation module)

---

## M2: Authorization & RBAC

**Scope:** Role enforcement, physician scoping, staff assignment validation.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M2.1 | ADMIN sees all physicians in dropdown | E2E (Cypress) | Automated |
| M2.2 | PHYSICIAN sees only self in dropdown | E2E (Cypress) | Automated |
| M2.3 | STAFF sees only assigned physicians | E2E (Cypress) | Automated |
| M2.4 | STAFF cannot access unassigned patients | Unit | Automated |
| M2.5 | Non-ADMIN cannot access /admin routes | E2E | Automated |
| M2.6 | Non-ADMIN cannot access /mapping routes | E2E | Automated |
| M2.7 | PHYSICIAN data auto-filtered by ownerId | Unit | Automated |
| M2.8 | API rejects physicianId not accessible to STAFF | Unit | Automated |
| M2.9 | Multi-role user (ADMIN+PHYSICIAN) has combined permissions | E2E | Automated |
| M2.10 | Socket.IO room join rejected for unauthorized physician | Unit | Automated |

**Key Files:**
- Backend: `middleware/auth.ts` (`requireRole`, `requirePhysicianAccess`), `services/authService.ts` (`isStaffAssignedToPhysician`)
- Frontend: `components/auth/ProtectedRoute.tsx`, `components/layout/Header.tsx`

**Dependencies:** M1 (authentication)

---

## M3: Admin User Management

**Scope:** User CRUD, role assignment, staff-physician assignments, temp passwords.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M3.1 | List all users (table display) | E2E | Automated |
| M3.2 | Create user — valid email, password, roles | E2E | Automated |
| M3.3 | Create user — duplicate email rejected | Unit | Automated |
| M3.4 | Edit user — change displayName, roles | E2E | Automated |
| M3.5 | Deactivate user (isActive=false) | E2E | Automated |
| M3.6 | Assign staff to physician | E2E | Automated |
| M3.7 | Remove staff assignment | Unit | Automated |
| M3.8 | Reset password (admin-initiated) | E2E | Automated |
| M3.9 | Send temporary password via email | Unit | Automated |
| M3.10 | Self-role-change prevention (privilege escalation guard) | Unit | Gap |
| M3.11 | Delete user cascade (patient unassignment, staff cleanup) | Unit | Gap |
| M3.12 | Audit log tab — filter by action/entity/date | E2E | Automated |

**Key Files:**
- Backend: `routes/admin.routes.ts`, `routes/handlers/userHandlers.ts`
- Frontend: `pages/AdminPage.tsx`, `components/modals/UserModal.tsx`, `components/modals/ResetPasswordModal.tsx`

**Dependencies:** M1, M2

---

## M4: Patient Data CRUD

**Scope:** Create, read, update, delete patient measure rows.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M4.1 | Add Row modal — patient name + DOB (required) | E2E | Automated |
| M4.2 | Add Row — phone, address (optional) | E2E | Automated |
| M4.3 | Add Row — auto-assigns to PHYSICIAN's ownerId | Unit | Automated |
| M4.4 | Add Row — ADMIN must specify physician | Unit | Automated |
| M4.5 | Delete Row — confirm modal | E2E | Automated |
| M4.6 | Delete Row — cancel preserves row | E2E | Automated |
| M4.7 | Copy Member — duplicates patient+DOB, clears measure fields | E2E (Cypress) | Automated |
| M4.8 | Copy Member — copies phone and address | E2E | Automated |
| M4.9 | Row count updates in status bar after add/delete | E2E | Automated |
| M4.10 | Pinned row badge when new row added (bypasses filters) | E2E (Cypress) | Automated |
| M4.11 | Data loads on physician selection | E2E | Automated |

**Key Files:**
- Backend: `routes/data.routes.ts`, `routes/handlers/patientHandlers.ts`
- Frontend: `components/modals/AddRowModal.tsx`, `components/modals/ConfirmModal.tsx`, `components/layout/Toolbar.tsx`

**Dependencies:** M1, M2

---

## M5: AG Grid Cell Editing

**Scope:** Inline cell editing, auto-save, keyboard navigation, version tracking.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M5.1 | Double-click opens text editor | E2E (Cypress) | Automated |
| M5.2 | Double-click opens dropdown editor | E2E (Cypress) | Automated |
| M5.3 | Double-click opens date editor | E2E (Cypress) | Automated |
| M5.4 | Escape cancels edit (reverts value) | E2E (Cypress) | Automated |
| M5.5 | Tab moves to next cell | E2E (Cypress) | Automated |
| M5.6 | Auto-save on cell blur (PATCH API call) | E2E (Cypress) | Automated |
| M5.7 | Status indicator during save (saving → saved) | Component | Automated |
| M5.8 | Optimistic concurrency — version mismatch triggers conflict modal | Unit | Automated |
| M5.9 | Row selection (single click, blue outline) | E2E (Cypress) | Automated |
| M5.10 | Keyboard arrows cycle dropdown options | Component | Automated |
| M5.11 | Date format parsing (flexible input) | Unit | Automated |
| M5.12 | Notes field — free text, multi-line support | E2E (Cypress) | Automated |

**Key Files:**
- Frontend: `components/grid/PatientGrid.tsx`, `components/grid/AutoOpenSelectEditor.tsx`, `components/grid/DateCellEditor.tsx`, `components/grid/hooks/useGridCellUpdate.ts`
- Backend: `routes/data.routes.ts` (PATCH handler)

**Dependencies:** M4, M6

---

## M6: Cascading Dropdowns & Config

**Scope:** Request Type → Quality Measure → Measure Status → Tracking Options chain, auto-fill, reset logic.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M6.1 | Request Type selection populates Quality Measure options | E2E (Cypress) | Automated |
| M6.2 | Quality Measure selection populates Measure Status options | E2E (Cypress) | Automated |
| M6.3 | Measure Status selection populates Tracking Options | E2E (Cypress) | Automated |
| M6.4 | Changing Request Type resets downstream fields | E2E (Cypress) | Automated |
| M6.5 | Changing Quality Measure resets Measure Status + Tracking | E2E (Cypress) | Automated |
| M6.6 | Config endpoint returns full dropdown tree | Unit | Automated |
| M6.7 | Tracking1 renders as dropdown OR free text based on config | E2E (Cypress) | Automated |
| M6.8 | HgbA1c Goal fields appear only for Diabetes Control measure | E2E (Cypress) | Automated |
| M6.9 | HgbA1c month dropdown (Jan–Dec) for Diabetes measures | E2E (Cypress) | Automated |
| M6.10 | Hypertension BP reading + call interval dropdown | E2E (Cypress) | Automated |
| M6.11 | Cervical Cancer month tracking dropdown | E2E (Cypress) | Automated |
| M6.12 | Depression Screening — 7 statuses load correctly | E2E (Cypress) | Automated |

**Key Files:**
- Frontend: `config/dropdownConfig.ts`, `components/grid/AutoOpenSelectEditor.tsx`
- Backend: `routes/config.routes.ts`, seed data (`prisma/seed.ts`)

**Dependencies:** None (config is foundational)

---

## M7: Status Colors & Conditional Formatting

**Scope:** Row background colors based on measure status, overdue detection, duplicate stripe.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M7.1 | White — "Not Addressed" status | Component | Automated |
| M7.2 | Yellow — appointment-related statuses | Component | Automated |
| M7.3 | Blue — ordered/scheduled/referral statuses | Component | Automated |
| M7.4 | Green — completed/at-goal statuses | Component | Automated |
| M7.5 | Purple — declined/contraindicated statuses | Component | Automated |
| M7.6 | Orange — Chronic DX resolved (without attestation) | Component | Automated |
| M7.7 | Gray — no longer applicable, screening unnecessary | Component | Automated |
| M7.8 | Red overdue — dueDate < today (UTC comparison) | Component | Automated |
| M7.9 | Red overdue — NOT applied to purple/gray statuses | Component | Automated |
| M7.10 | Red overdue — NOT applied to Chronic DX with "Attestation sent" | Component | Automated |
| M7.11 | Duplicate orange left stripe overlay | E2E (Cypress) | Automated |
| M7.12 | Overdue boundary — today = NOT overdue, yesterday = overdue | Component | Automated |
| M7.13 | Row color count in filter bar chips | Component | Automated |
| M7.14 | Depression Screening colors (blue/yellow/green/purple/gray) | Component | Automated |
| M7.15 | Blood pressure statuses color mapping | Component | Automated |

**Key Files:**
- Frontend: `config/statusColors.ts`, `config/statusColors.test.ts`, `components/layout/StatusFilterBar.tsx`

**Dependencies:** M6 (status definitions)

---

## M8: Filtering & Search

**Scope:** Status filter bar, quality measure dropdown, insurance group, patient search.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M8.1 | Status filter chips — click filters by color | E2E (Cypress) | Automated |
| M8.2 | Status filter — multi-select toggle | E2E (Cypress) | Automated |
| M8.3 | Status filter — count badges show correct numbers | Component | Automated |
| M8.4 | Quality Measure dropdown filters grid | E2E (Cypress) | Automated |
| M8.5 | Insurance Group dropdown (All/None/hill/sutter) | E2E (Cypress) | Automated |
| M8.6 | Search by patient name (word-based matching) | E2E (Cypress) | Automated |
| M8.7 | Search by DOB | E2E (Cypress) | Automated |
| M8.8 | Filter persistence — survives physician switch | E2E (Cypress) | Automated |
| M8.9 | "New row pinned" badge — bypasses active filters | E2E (Cypress) | Automated |
| M8.10 | Clear search restores all rows | E2E (Cypress) | Automated |
| M8.11 | Column sorting (ascending/descending toggle) | E2E (Cypress) | Automated |
| M8.12 | Sort by Status Date | E2E (Cypress) | Automated |
| M8.13 | Sort by Member Name | E2E (Cypress) | Automated |
| M8.14 | Sort indicator icon visible after sort | E2E (Cypress) | Automated |

**Key Files:**
- Frontend: `components/layout/StatusFilterBar.tsx`, `pages/MainPage.tsx` (search logic)
- Backend: `routes/data.routes.ts` (query params: `insuranceGroup`, `status`, `measure`, `search`)

**Dependencies:** M7 (color classification), M6 (measure options)

---

## M9: Duplicate Detection

**Scope:** Duplicate row detection, visual indicators, prevention warnings.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M9.1 | Duplicate detected on same memberName+DOB+requestType+qualityMeasure | Unit | Automated |
| M9.2 | Duplicate flag sync across affected rows | Unit | Automated |
| M9.3 | Orange left stripe on duplicate rows | E2E (Cypress) | Automated |
| M9.4 | Warning modal on edit that creates duplicate | E2E (Cypress) | Automated |
| M9.5 | Warning modal on add-row that creates duplicate | Unit | Automated |
| M9.6 | Skip check when requestType or qualityMeasure is null | Unit | Automated |
| M9.7 | Duplicate filter chip in status bar | E2E (Cypress) | Automated |
| M9.8 | Duplicate count accuracy in filter chip | Component | Automated |

**Key Files:**
- Backend: `services/duplicateDetector.ts`, `routes/data.routes.ts` (`check-duplicate`)
- Frontend: `components/modals/DuplicateWarningModal.tsx`

**Dependencies:** M4, M6

---

## M10: Real-Time Collaboration (Socket.IO)

**Scope:** WebSocket connection, room management, presence, edit indicators, conflict handling.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M10.1 | Socket connects with JWT auth on page load | E2E | Automated |
| M10.2 | Socket joins physician room on selection | Unit | Automated |
| M10.3 | Presence update shows other users in room | E2E | Automated |
| M10.4 | `row:updated` event updates cell in real-time | E2E | Automated |
| M10.5 | `row:created` event adds row to grid | E2E | Automated |
| M10.6 | `row:deleted` event removes row from grid | E2E | Automated |
| M10.7 | `editing:active` shows "User is editing" indicator | Unit | Automated |
| M10.8 | `editing:inactive` clears indicator | Unit | Automated |
| M10.9 | Conflict modal on concurrent edit (same cell) | E2E | Automated |
| M10.10 | Conflict resolution — "Keep Mine" | E2E | Automated |
| M10.11 | Conflict resolution — "Keep Theirs" | E2E | Automated |
| M10.12 | Disconnect → reconnect preserves state | E2E | Automated |
| M10.13 | StatusBar shows connection state (green/yellow/red/gray) | Component | Automated |
| M10.14 | `import:started` / `import:completed` events | Unit | Automated |
| M10.15 | Room leave on physician switch | Unit | Automated |
| M10.16 | Disconnect cleans up presence + active edits | Unit | Automated |
| M10.17 | X-Socket-ID header sent on API requests | Unit | Automated |

**Key Files:**
- Backend: `services/socketManager.ts`, `middleware/socketAuth.ts`, `types/socket.ts`
- Frontend: `services/socketService.ts`, `hooks/useSocket.ts`, `stores/realtimeStore.ts`, `components/modals/ConflictModal.tsx`

**Dependencies:** M1, M2, M5

---

## M11: Import Pipeline — Hill (CSV)

**Scope:** Hill Healthcare CSV import, column mapping, transform, validation, preview, execution.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M11.1 | CSV file upload and parse | Unit | Automated |
| M11.2 | Header row auto-detection (skip title rows) | Unit | Automated |
| M11.3 | Column mapping (source → patient/measure fields) | Unit | Automated |
| M11.4 | Wide-to-long transformation (Q1/Q2 columns → rows) | Unit | Automated |
| M11.5 | Validation — required fields (memberName, DOB) | Unit | Automated |
| M11.6 | Validation — duplicate detection in import data | Unit | Automated |
| M11.7 | Diff calculation — inserts, updates, skips | Unit | Automated |
| M11.8 | Preview summary (counts by action) | E2E | Automated |
| M11.9 | Preview changes table (full diff display) | E2E | Automated |
| M11.10 | Execute import — merge mode (keep existing + add new) | Unit | Automated |
| M11.11 | Execute import — replace mode (delete all + re-import) | Unit | Automated |
| M11.12 | Replace mode confirmation modal | E2E | Automated |
| M11.13 | Import stats display (inserted/updated/skipped) | E2E | Automated |
| M11.14 | Insurance group set to "hill" on imported rows | Unit | Automated |
| M11.15 | Date parsing from various formats (MM/DD/YYYY, M/D/YY, etc.) | Unit | Automated |
| M11.16 | Excel serial number date conversion | Unit | Automated |

**Key Files:**
- Backend: `services/import/fileParser.ts`, `services/import/columnMapper.ts`, `services/import/dataTransformer.ts`, `services/import/validator.ts`, `services/import/diffCalculator.ts`, `config/import/hill.json`
- Frontend: `pages/ImportPage.tsx`, `pages/ImportPreviewPage.tsx`

**Dependencies:** M1, M2, M15 (physician assignment)

---

## M12: Import Pipeline — Sutter (Excel)

**Scope:** Sutter/SIP multi-tab Excel import, sheet discovery, action mapping, tab merging.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M12.1 | Excel file upload (.xlsx) | E2E | Automated |
| M12.2 | Sheet tab discovery (API) | Unit | Automated |
| M12.3 | Skip tabs matching pattern (e.g., "Summary") | Unit | Automated |
| M12.4 | Physician selector for tab assignment | E2E | Automated |
| M12.5 | Action text → (requestType, qualityMeasure, measureStatus) mapping | Unit | Automated |
| M12.6 | Regex pattern matching for actions | Unit | Automated |
| M12.7 | Unmapped actions banner with counts | E2E | Automated |
| M12.8 | Duplicate row merging (same patient+measure) | Unit | Automated |
| M12.9 | Notes concatenation on merge | Unit | Automated |
| M12.10 | Embedded date extraction from free text | Unit | Automated |
| M12.11 | Measure details parsing (HgbA1c values, BP readings) | Unit | Automated |
| M12.12 | Insurance group set to "sutter" on imported rows | Unit | Automated |
| M12.13 | Header row offset detection (skip info rows) | Unit | Automated |
| M12.14 | Depression Screening patterns (PHQ-9, PHQ 9, etc.) | Unit | Automated |
| M12.15 | Multi-tab import (sequential tabs for same physician) | E2E | Automated |
| M12.16 | Performance — 1,000 rows in < 1 second | Unit | Automated |

**Key Files:**
- Backend: `services/import/fileParser.ts`, `services/import/dataTransformer.ts`, `services/import/actionMapper.ts`, `config/import/sutter.json`
- Frontend: `components/import/SheetSelector.tsx`, `components/import/UnmappedActionsBanner.tsx`

**Dependencies:** M11 (shared pipeline), M13 (mapping config)

---

## M13: Smart Column Mapping

**Scope:** Fuzzy column matching, conflict classification, admin override management.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M13.1 | Fuzzy match (Dice coefficient) for column names | Unit | Automated |
| M13.2 | Abbreviation expansion (e.g., "Mbr" → "Member") | Unit | Automated |
| M13.3 | 7-step conflict classification (NEW, CHANGED, MISSING, etc.) | Unit | Automated |
| M13.4 | Admin mapping override — save column mapping | E2E | Automated |
| M13.5 | Admin mapping override — save action pattern (regex) | E2E | Automated |
| M13.6 | ReDoS validation on regex patterns | Unit | Automated |
| M13.7 | Reset to defaults (delete all overrides) | E2E | Automated |
| M13.8 | Merged config (JSON seed + DB overrides) | Unit | Automated |
| M13.9 | Non-admin sees read-only conflict banner | E2E | Automated |
| M13.10 | Admin conflict resolution UI (interactive dropdowns) | E2E | Automated |
| M13.11 | Mapping management page — column table display | E2E | Automated |
| M13.12 | Mapping management page — action pattern table | E2E | Automated |

**Key Files:**
- Backend: `services/import/configLoader.ts`, `routes/import.routes.ts` (mapping endpoints)
- Frontend: `pages/MappingManagementPage.tsx`, `components/import/MappingTable.tsx`, `components/import/ActionPatternTable.tsx`, `components/import/ConflictResolutionStep.tsx`, `components/import/ConflictBanner.tsx`

**Dependencies:** M11, M12, M2 (admin role)

---

## M14: Conflict Detection & Resolution

**Scope:** Import conflicts (column mapping + data merge), real-time editing conflicts.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M14.1 | Import conflict — column mismatch detection | Unit | Automated |
| M14.2 | Import conflict — admin resolution (interactive) | E2E | Automated |
| M14.3 | Import conflict — non-admin banner (read-only) | E2E | Automated |
| M14.4 | Data merge conflict — same row updated by import and user | Unit | Automated |
| M14.5 | Real-time edit conflict — same cell edited simultaneously | E2E | Automated |
| M14.6 | Conflict modal — Keep Mine / Keep Theirs / Cancel | E2E | Automated |
| M14.7 | forceOverwrite flag audit logging | Unit | Automated |
| M14.8 | Version mismatch triggers 409 status code | Unit | Automated |
| M14.9 | Conflict progress tracking (X of Y resolved) | E2E | Automated |
| M14.10 | Save button enabled only after all conflicts resolved | E2E | Automated |

**Key Files:**
- Backend: `services/import/diffCalculator.ts`, `routes/data.routes.ts` (version check)
- Frontend: `components/modals/ConflictModal.tsx`, `components/import/ConflictResolutionStep.tsx`

**Dependencies:** M10, M11, M13

---

## M15: Patient Assignment & Ownership

**Scope:** Patient-physician ownership, bulk assignment, reassignment detection.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M15.1 | PHYSICIAN auto-assigned as owner on patient create | Unit | Automated |
| M15.2 | ADMIN selects physician on patient create | Unit | Automated |
| M15.3 | Unassigned patients list (admin view) | E2E | Automated |
| M15.4 | Bulk assign unassigned patients to physician | E2E | Automated |
| M15.5 | Reassignment detection during import | E2E | Automated |
| M15.6 | Reassignment banner in preview | E2E | Automated |
| M15.7 | Patient management tabs (per physician) | E2E | Automated |
| M15.8 | Staff coverage — view assigned physician's patients | E2E (Cypress) | Automated |

**Key Files:**
- Backend: `routes/handlers/patientHandlers.ts` (`bulkAssignPatients`), `services/import/reassignment.ts`
- Frontend: `pages/PatientAssignmentPage.tsx`, `pages/PatientManagementPage.tsx`

**Dependencies:** M2, M4

---

## M16: Audit Logging

**Scope:** Action tracking, change recording, audit log queries.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M16.1 | LOGIN action logged (userId, email, IP) | Unit | Automated |
| M16.2 | LOGIN_FAILED logged (reason, email, IP — NOT password) | Unit | Automated |
| M16.3 | CREATE action on patient/measure | Unit | Automated |
| M16.4 | UPDATE action with field-level changes (JSON) | Unit | Automated |
| M16.5 | DELETE action on patient/measure | Unit | Automated |
| M16.6 | IMPORT action logged (stats, systemId) | Unit | Automated |
| M16.7 | CONFLICT_OVERRIDE logged when forceOverwrite used | Unit | Automated |
| M16.8 | Admin audit log page — filter by action | E2E | Automated |
| M16.9 | Admin audit log page — filter by date range | E2E | Automated |
| M16.10 | Audit log retains entries indefinitely | Unit | Not tested |
| M16.11 | Password reset actions logged | Unit | Automated |

**Key Files:**
- Backend: `routes/admin.routes.ts` (audit-log endpoint), all route handlers (audit calls)
- Frontend: `pages/AdminPage.tsx` (audit tab)

**Dependencies:** M1, M3

---

## M17: Quality Measures & Date Logic

**Scope:** Due date calculation, time intervals, status-date prompts, overdue detection.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M17.1 | Due date auto-calculated from baseDueDays + statusDate | Unit | Automated |
| M17.2 | Due date adjusted by tracking1 conditional rules | Unit | Automated |
| M17.3 | Time interval days field updates due date | E2E (Cypress) | Automated |
| M17.4 | Status date prompt changes based on measure status | Unit | Automated |
| M17.5 | Date prompt shows correct text (e.g., "Date AWV call made") | Component | Automated |
| M17.6 | Overdue detection — dueDate < today | Component | Automated |
| M17.7 | Overdue exemption — purple/gray statuses | Component | Automated |
| M17.8 | Overdue exemption — Chronic DX with "Attestation sent" | Component | Automated |
| M17.9 | 7-day timer boundary (day 7 = NOT overdue, day 8 = IS) | Component | Automated |
| M17.10 | Today boundary (dueDate = today → NOT overdue) | Component | Automated |
| M17.11 | Date format display (MM/DD/YYYY) | Unit | Automated |
| M17.12 | Flexible date input parsing | Unit | Automated |
| M17.13 | Depression Screening date prompts | Component | Automated |

**Key Files:**
- Backend: `services/dueDateCalculator.ts`, `services/statusDatePromptResolver.ts`
- Frontend: `components/grid/StatusDateRenderer.tsx`, `config/statusColors.ts`

**Dependencies:** M6 (status/measure definitions)

---

## M18: Security Hardening

**Scope:** Account lockout, input validation, environment validation, XSS prevention.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M18.1 | Account lockout after 5 failed attempts | E2E | Automated |
| M18.2 | Warning message at 3+ failed attempts | E2E | Automated |
| M18.3 | Lockout duration — 30 minutes | Unit | Automated |
| M18.4 | Environment validation in production (JWT_SECRET, SMTP_HOST, etc.) | Unit | Automated |
| M18.5 | process.exit(1) on missing production env vars | Unit | Automated |
| M18.6 | Development mode — warnings only (no exit) | Unit | Automated |
| M18.7 | DOB masking (### on display) | E2E | Automated |
| M18.8 | Sensitive data scrubbing in error handler | Unit | Automated |
| M18.9 | Input length validation (50 char limit) | Unit | Automated |
| M18.10 | Password never logged (audit log excludes password) | Unit | Automated |
| M18.11 | CORS configuration (configurable origins) | Unit | Not tested |
| M18.12 | XSS prevention in import headers | E2E | Automated |
| M18.13 | SQL injection prevention (Prisma parameterized queries) | Implicit | N/A |

**Key Files:**
- Backend: `config/validateEnv.ts`, `middleware/auth.ts`, `services/authService.ts`
- Frontend: `api/axios.ts` (sanitizeForLogging)

**Dependencies:** M1

---

## M19: Accessibility & Visual Regression

**Scope:** WCAG compliance, keyboard navigation, visual consistency, browser compatibility.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M19.1 | Login page — no critical axe-core violations | E2E | Automated |
| M19.2 | Login page — form labels present | E2E | Automated |
| M19.3 | Main grid — toolbar buttons have accessible names | E2E | Automated |
| M19.4 | Filter bar — ARIA roles correct | E2E | Automated |
| M19.5 | Grid — ARIA structure present | E2E | Automated |
| M19.6 | Import page — no critical violations | E2E | Automated |
| M19.7 | Color contrast — login page meets AA | E2E | Automated |
| M19.8 | Color contrast — filter bar meets AA | E2E | Automated |
| M19.9 | Keyboard — login form tab order | E2E | Automated |
| M19.10 | Keyboard — toolbar focus management | E2E | Automated |
| M19.11 | Visual regression — login form screenshot | E2E | Automated |
| M19.12 | Visual regression — patient grid screenshot | E2E | Automated |
| M19.13 | Visual regression — admin dashboard screenshot | E2E | Automated |
| M19.14 | Visual regression — import page screenshot | E2E | Automated |
| M19.15 | Visual regression — filter bar with active filter | E2E | Automated |
| M19.16 | Cross-browser — Chromium, Firefox, Edge | E2E | Configured |

**Key Files:**
- Frontend: `e2e/accessibility.spec.ts`, `e2e/visual-regression.spec.ts`, `playwright.config.ts`

**Dependencies:** None (cross-cutting)

---

## M20: Deployment & Infrastructure

**Scope:** Docker build, CI/CD pipeline, health checks, database migrations.

| ID | Test Scenario | Layer | Status |
|----|---------------|-------|--------|
| M20.1 | Health check endpoint returns 200 + DB status | Unit | Gap |
| M20.2 | Docker build — backend compiles | CI | Automated |
| M20.3 | Docker build — frontend compiles | CI | Automated |
| M20.4 | Prisma migrations apply cleanly | CI | Automated |
| M20.5 | Seed data populates all config tables | CI | Automated |
| M20.6 | CI — backend tests pass on push | CI | Automated |
| M20.7 | CI — frontend tests pass on push | CI | Automated |
| M20.8 | CI — TypeScript check passes | CI | Automated |
| M20.9 | CI — Playwright E2E on release | CI | Automated |
| M20.10 | CI — Cypress E2E on release | CI | Configured |
| M20.11 | Render deploy — backend service goes live | Manual | Verified |
| M20.12 | Render deploy — frontend service goes live | Manual | Verified |
| M20.13 | Post-deploy health check (HTTP 200) | Manual | Verified |

**Key Files:**
- `docker-compose.yml`, `Dockerfile` (backend + frontend)
- `.github/workflows/test.yml`, `.github/workflows/e2e-tests.yml`
- `backend/src/routes/health.routes.ts`

**Dependencies:** All modules (integration)

---

## Module Dependency Graph

```
M1 Authentication
 ├── M2 Authorization (needs M1)
 │    ├── M3 Admin Management (needs M2)
 │    ├── M4 Patient CRUD (needs M2)
 │    │    ├── M5 Cell Editing (needs M4)
 │    │    ├── M9 Duplicate Detection (needs M4)
 │    │    └── M15 Patient Assignment (needs M4)
 │    └── M10 Real-Time (needs M2, M5)
 │         └── M14 Conflict Resolution (needs M10)
 │
 ├── M11 Hill Import (needs M1, M2, M15)
 ├── M12 Sutter Import (needs M11, M13)
 └── M13 Column Mapping (needs M2, M11)

M6 Cascading Dropdowns (standalone config)
 ├── M7 Status Colors (needs M6)
 ├── M8 Filtering (needs M7, M6)
 └── M17 Date Logic (needs M6)

M16 Audit Logging (cross-cutting, needs M1)
M18 Security (cross-cutting, needs M1)
M19 Accessibility (cross-cutting, standalone)
M20 Deployment (integration, needs all)
```

---

## Testing Priority Matrix

| Priority | Modules | Rationale |
|----------|---------|-----------|
| **P0 — Critical** | M1, M2, M18 | Auth/security failures block everything |
| **P1 — High** | M4, M5, M6, M7, M10 | Core user workflow (view/edit patient data) |
| **P2 — High** | M11, M12, M13, M14 | Import is the primary data entry method |
| **P3 — Medium** | M3, M8, M9, M15, M17 | Admin, filtering, duplicates, assignment |
| **P4 — Low** | M16, M19, M20 | Audit, accessibility, deployment |

---

## Coverage Summary

| Module | Total Scenarios | Automated | Gaps | Coverage |
|--------|----------------|-----------|------|----------|
| M1 Authentication | 16 | 16 | 0 | 100% |
| M2 Authorization | 10 | 10 | 0 | 100% |
| M3 Admin Management | 12 | 10 | 2 | 83% |
| M4 Patient CRUD | 11 | 11 | 0 | 100% |
| M5 Cell Editing | 12 | 12 | 0 | 100% |
| M6 Cascading Dropdowns | 12 | 12 | 0 | 100% |
| M7 Status Colors | 15 | 15 | 0 | 100% |
| M8 Filtering & Search | 14 | 14 | 0 | 100% |
| M9 Duplicate Detection | 8 | 8 | 0 | 100% |
| M10 Real-Time | 17 | 17 | 0 | 100% |
| M11 Hill Import | 16 | 16 | 0 | 100% |
| M12 Sutter Import | 16 | 16 | 0 | 100% |
| M13 Column Mapping | 12 | 12 | 0 | 100% |
| M14 Conflict Resolution | 10 | 10 | 0 | 100% |
| M15 Patient Assignment | 8 | 8 | 0 | 100% |
| M16 Audit Logging | 11 | 10 | 1 | 91% |
| M17 Date Logic | 13 | 13 | 0 | 100% |
| M18 Security | 13 | 11 | 2 | 85% |
| M19 Accessibility | 16 | 16 | 0 | 100% |
| M20 Deployment | 13 | 10 | 3 | 77% |
| **TOTAL** | **255** | **247** | **8** | **97%** |

### Remaining Gaps (8 scenarios)

| ID | Gap | Priority | Effort |
|----|-----|----------|--------|
| M3.10 | Self-role-change prevention | MED | S |
| M3.11 | Delete user cascade | MED | S |
| M16.10 | Audit log retention verification | LOW | S |
| M18.11 | CORS configuration tests | LOW | S |
| M20.1 | Health check endpoint tests | LOW | S |
| M20.10 | Cypress CI verification | LOW | Done (configured) |
| M20.11-13 | Render deploy checks | LOW | Manual only |

---

## Test Organization by Layer

### Layer 1: Backend Unit Tests (Jest)

**Runner:** `cd backend && npm test`
**Location:** `backend/src/**/__tests__/*.test.ts`
**Count:** ~1,415 tests across 48 suites
**Scope:** Business logic, services, routes, middleware — NO browser, NO DOM

```
backend/src/
├── config/__tests__/
│   └── validateEnv.test.ts              M18 (env validation, process.exit)
├── middleware/__tests__/
│   ├── auth.test.ts                     M2  (requireAuth, requireRole, optionalAuth)
│   └── socketIdMiddleware.test.ts       M10 (X-Socket-ID header extraction)
├── routes/__tests__/
│   ├── auth.routes.test.ts              M1  (login, logout, password reset)
│   ├── admin.routes.test.ts             M3  (user CRUD, staff assignments)
│   ├── data.routes.test.ts              M4  (patient CRUD, version check, measures)
│   ├── users.routes.test.ts             M2  (physician list, access validation)
│   └── import.routes.test.ts            M11 (preview, execute, mapping endpoints)
├── services/__tests__/
│   ├── authService.test.ts              M1  (password hash, JWT, toAuthUser)
│   ├── emailService.test.ts             M1  (SMTP config, reset URL)
│   ├── duplicateDetector.test.ts        M9  (detection logic, flag sync)
│   ├── statusDatePromptResolver.test.ts M17 (40+ status prompts)
│   ├── dueDateCalculator.test.ts        M17 (due date calc, tracking1 rules)
│   └── socketManager.test.ts            M10 (rooms, presence, edits)
├── services/import/__tests__/
│   ├── fileParser.test.ts               M11 (CSV/XLSX parsing, header detect)
│   ├── columnMapper.test.ts             M13 (column mapping, Q1/Q2)
│   ├── dataTransformer.test.ts          M11 (wide-to-long, Sutter transform)
│   ├── validator.test.ts                M11 (required fields, duplicates)
│   ├── diffCalculator.test.ts           M14 (insert/update/skip/both-kept)
│   ├── mergeLogic.test.ts               M12 (Sutter duplicate merging)
│   ├── actionMapper.test.ts             M12 (regex patterns, Depression)
│   ├── configLoader.test.ts             M13 (JSON seed + DB overrides)
│   ├── reassignment.test.ts             M15 (physician reassignment detect)
│   ├── previewCache.test.ts             M11 (TTL, cleanup, stats)
│   ├── integration.test.ts              M11 (full pipeline parse→diff)
│   └── sutter-performance.test.ts       M12 (1K rows < 1s benchmark)
└── utils/__tests__/
    ├── dateParser.test.ts               M17 (6 formats, Excel serial, edge cases)
    └── logger.test.ts                   M20 (log levels, sanitization)
```

**What belongs here:**
- Pure functions (no DOM, no browser)
- Database queries via mocked Prisma
- API route handlers via supertest
- Business rules, validation, computation
- Config loading, environment checks

**What does NOT belong here:**
- React components (use Vitest)
- Browser interactions (use Playwright/Cypress)
- Visual checks (use visual regression)

---

### Layer 2: Frontend Component Tests (Vitest)

**Runner:** `cd frontend && npm run test:run`
**Location:** `frontend/src/**/*.test.{ts,tsx}`
**Count:** ~1,202 tests across 48 suites
**Scope:** React components, stores, hooks, utils — jsdom environment, NO real browser

```
frontend/src/
├── api/
│   └── axios.test.ts                    M1  (interceptors, base URL, token attach)
├── components/
│   ├── auth/
│   │   └── ProtectedRoute.test.tsx      M2  (role gates, redirect, force change)
│   ├── grid/
│   │   ├── PatientGrid.test.tsx         M5  (grid render, column defs, callbacks)
│   │   ├── AutoOpenSelectEditor.test.tsx M5  (dropdown open, keyboard nav)
│   │   ├── StatusDateRenderer.test.tsx   M17 (date prompt display)
│   │   └── hooks/__tests__/
│   │       └── useGridCellUpdate.test.ts M5  (save logic, version track)
│   ├── import/
│   │   ├── ActionPatternTable.test.tsx   M13 (regex patterns, add/delete)
│   │   ├── ConflictBanner.test.tsx       M14 (non-admin read-only banner)
│   │   ├── ConflictResolutionStep.test.tsx M14 (admin dropdown resolution)
│   │   ├── ImportResultsDisplay.test.tsx M11 (success/error/stats display)
│   │   ├── MappingTable.test.tsx         M13 (column mapping table)
│   │   ├── PreviewSummaryCards.test.tsx  M11 (count cards, filter clicks)
│   │   └── SheetSelector.test.tsx        M12 (tab discovery, physician select)
│   ├── layout/
│   │   ├── Header.test.tsx              M2  (role badge, physician dropdown)
│   │   ├── StatusBar.test.tsx           M10 (connection indicator, presence)
│   │   ├── StatusFilterBar.test.tsx     M7  (color chips, counts, overdue)
│   │   └── Toolbar.test.tsx             M4  (add/copy/delete buttons)
│   └── modals/
│       ├── AddRowModal.test.tsx          M4  (form fields, validation)
│       ├── ConfirmModal.test.tsx         M4  (confirm/cancel, message)
│       ├── ConflictModal.test.tsx        M10 (keep mine/theirs/cancel)
│       ├── DuplicateWarningModal.test.tsx M9  (warning display, patient name)
│       ├── ResetPasswordModal.test.tsx   M3  (admin password reset form)
│       └── UserModal.test.tsx           M3  (create/edit user, roles)
├── config/
│   └── statusColors.test.ts             M7  (getRowStatusColor, 40+ scenarios)
├── hooks/
│   └── useSocket.test.ts                M10 (connect/disconnect, events)
├── pages/
│   ├── LoginPage.test.tsx               M1  (render, validation, submit)
│   ├── ForgotPasswordPage.test.tsx      M1  (email form, submit, errors)
│   ├── ResetPasswordPage.test.tsx       M1  (token validate, new password)
│   ├── AdminPage.test.tsx               M3  (user list, tabs, modals)
│   ├── ImportPage.test.tsx              M11 (system select, upload, preview)
│   ├── ImportPreviewPage.test.tsx       M11 (preview grid, apply, cancel)
│   ├── MappingManagementPage.test.tsx   M13 (mapping editor, save, reset)
│   ├── PatientManagementPage.test.tsx   M15 (tabs, physician filter)
│   └── PatientAssignmentPage.test.tsx   M15 (bulk assign table)
├── services/
│   └── socketService.test.ts            M10 (socket init, emit, listeners)
├── stores/
│   ├── authStore.test.ts                M1  (login/logout state, token)
│   └── realtimeStore.test.ts            M10 (presence, edits, import state)
└── utils/__tests__/
    ├── apiError.test.ts                 M18 (error message extraction)
    ├── dateFormatter.test.ts            M17 (display format, today)
    └── logger.test.ts                   M20 (log levels, env detection)
```

**What belongs here:**
- React component rendering (does it render? does it show the right content?)
- User interactions (click, type, select — via @testing-library/user-event)
- State management (Zustand stores, hook behavior)
- Conditional rendering (role-based visibility, loading/error states)
- Form validation (required fields, error messages)
- Utility functions (date formatting, error parsing)

**What does NOT belong here:**
- Real API calls (mock with MSW or vi.mock)
- Real browser behavior (CSS, scrolling, animations — use E2E)
- AG Grid cell editing (jsdom can't render AG Grid — use Cypress)
- Multi-page navigation flows (use Playwright)

---

### Layer 3: Playwright E2E (Real Browser — Full Flows)

**Runner:** `cd frontend && npm run e2e`
**Location:** `frontend/e2e/*.spec.ts`
**Count:** ~48 tests across 18 spec files
**Browsers:** Chromium, Firefox, Edge
**Scope:** Full user journeys against real backend + database

```
frontend/e2e/
├── pages/                               (Page Objects)
│   ├── login-page.ts                    M1  (goto, login, getError)
│   ├── main-page.ts                     M4  (grid helpers, dropdown, filter)
│   └── mapping-page.ts                  M13 (system select, edit, reset)
│
├── fixtures/                            (Test Data)
│   ├── hill-*.xlsx                       M11
│   ├── sutter-*.xlsx                     M12
│   └── sutter-fixture-helper.ts          M12
│
├── smoke.spec.ts                        M4  (page load, grid display)
├── auth.spec.ts                         M1  (login, session, logout, protect)
├── password-flows.spec.ts               M1  (forgot, reset, validation)
├── add-row.spec.ts                      M4  (Add Row modal, grid update)
├── delete-row.spec.ts                   M4  (delete confirm, cancel, count)
├── duplicate-member.spec.ts             M9  (copy member, data copy)
├── patient-management.spec.ts           M15 (tabs, role-based access)
├── import-all-roles.spec.ts             M11 (admin/phy/staff import flows)
├── import-conflict-resolution.spec.ts   M14 (admin conflict resolution)
├── import-reassignment.spec.ts          M15 (reassignment detection)
├── smart-column-mapping.spec.ts         M13 (mapping editor, save, reset)
├── sutter-import-visual.spec.ts         M12 (Sutter multi-tab workflow)
├── sutter-import-edge-cases.spec.ts     M12 (edge cases, system switch)
├── sutter-import-errors.spec.ts         M12 (error handling)
├── admin-management.spec.ts             M3  (user CRUD, lockout)
├── compact-filter-bar.spec.ts           M8  (filter chips, persistence)
├── parallel-editing-connection.spec.ts  M10 (socket connect, presence)
├── parallel-editing-conflict.spec.ts    M10 (concurrent edit conflict)
├── parallel-editing-updates.spec.ts     M10 (remote row update/add/delete)
├── parallel-editing-reconnection.spec.ts M10 (disconnect/reconnect)
├── accessibility.spec.ts               M19 (axe-core, keyboard nav)
└── visual-regression.spec.ts            M19 (screenshot comparison)
```

**What belongs here:**
- Multi-page navigation flows (login → main → import → preview)
- Real API calls against real backend + PostgreSQL
- Multi-user scenarios (parallel editing uses 2 browser contexts)
- Authentication end-to-end (login, token persistence, logout)
- Import full pipeline (upload file → preview → apply)
- Accessibility audits (axe-core scans)
- Visual regression (screenshot comparison)
- Cross-browser verification (Chromium, Firefox, Edge)

**What does NOT belong here:**
- AG Grid dropdown cell editing (AG Grid internals — use Cypress)
- Individual component rendering (use Vitest)
- Pure business logic (use Jest)

---

### Layer 4: Cypress E2E (AG Grid Specialized)

**Runner:** `cd frontend && npm run cypress:run`
**Location:** `frontend/cypress/e2e/*.cy.ts`
**Count:** ~293 tests across 21 spec files
**Scope:** AG Grid interactions — dropdowns, cells, colors, sorting, filtering

```
frontend/cypress/
├── support/
│   ├── e2e.ts                           (Custom command declarations)
│   └── commands.ts                      (12 AG Grid helpers)
│       ├── cy.login()                   M1
│       ├── cy.waitForAgGrid()           M5
│       ├── cy.getAgGridCell()           M5
│       ├── cy.getAgGridCellWithScroll() M5
│       ├── cy.selectAgGridDropdown()    M6
│       ├── cy.selectAgGridDropdownAndVerify() M6 (retry on 409)
│       ├── cy.openAgGridDropdown()      M6
│       ├── cy.getAgGridDropdownOptions() M6
│       ├── cy.addTestRow()              M4
│       ├── cy.findRowByMemberName()     M4
│       └── cy.scrollToAgGridColumn()    M5
│
├── fixtures/
│   ├── test-hill-import.csv             M11
│   └── test-hill-import-warnings.csv    M11
│
└── e2e/
    ├── cascading-dropdowns.cy.ts        M6  (30 tests: cascade chain, reset, auto-fill)
    ├── cell-editing.cy.ts               M5  (18 tests: text, date, dropdown, escape)
    ├── sorting-filtering.cy.ts          M8  (55 tests: sort, filter chips, search)
    ├── time-interval.cy.ts              M17 (14 tests: time interval + due date)
    ├── patient-assignment.cy.ts         M15 (32 tests: assign, reassign)
    ├── duplicate-detection.cy.ts        M9  (15 tests: orange stripe, warning)
    ├── multi-select-filter.cy.ts        M8  (18 tests: multi-select toggle)
    ├── patient-name-search.cy.ts        M8  (13 tests: word-based search)
    ├── role-access-control.cy.ts        M2  (31 tests: ADMIN/PHY/STAFF access)
    ├── hover-reveal-dropdown.cy.ts      M5  (hover interactions)
    ├── compact-filter-bar.cy.ts         M8  (filter chip interactions)
    ├── insurance-group-filter.cy.ts     M8  (All/None/hill/sutter)
    ├── date-prepopulate.cy.ts           M17 (date auto-fill, prompts)
    ├── ux-improvements.cy.ts            M4  (status bar, misc UX)
    ├── import-conflict-admin.cy.ts      M14 (admin conflict flow — intercept)
    ├── import-conflict-nonadmin.cy.ts   M14 (non-admin banner — intercept)
    ├── mapping-management.cy.ts         M13 (mapping page — intercept)
    ├── parallel-editing-grid-updates.cy.ts  M10 (remote grid updates)
    ├── parallel-editing-row-operations.cy.ts M10 (remote add/delete)
    └── depression-screening.cy.ts       M7  (7 statuses, 5 colors)
```

**What belongs here:**
- AG Grid cell editing (double-click, dropdown open, value select)
- Cascading dropdown chains (Request Type → Quality Measure → Status)
- Row background colors (status-based, duplicate stripe)
- Column sorting (click header, verify order)
- Filter interactions (status chips, search input)
- AG Grid virtual scrolling (cells off-screen)
- Keyboard navigation within AG Grid cells

**What does NOT belong here:**
- Multi-page navigation (use Playwright)
- Authentication flows (use Playwright)
- Import file upload (use Playwright)
- Accessibility audits (use Playwright + axe-core)

---

### Layer 5: Visual Browser Review (MCP Playwright)

**Runner:** ui-ux-reviewer agent (manual trigger)
**Scope:** Real browser screenshots, visual design critique, UX evaluation

```
.claude/agent-memory/ui-ux-reviewer/
└── page-guides/
    ├── patient-grid.md                  M4, M5, M7  (grid layout, colors, roles)
    └── auth-flow.md                     M1  (login, reset, change password)

Review Checklist:
├── Login page                           M1, M19
├── Main grid (with data)               M4, M5, M7
├── Admin dashboard                      M3, M19
├── Import page (system select + upload) M11, M12
├── Import preview (diff table)          M11, M14
├── Mapping management page              M13
├── Filter bar (with active filters)     M8, M19
├── Patient management tabs              M15
├── Conflict resolution step             M14
├── Add Row modal                        M4
├── Duplicate warning modal              M9
├── Forced password change modal         M1
└── Status bar (connection states)       M10
```

**What belongs here:**
- Screenshot verification after any UI change
- Color accuracy (status colors match spec)
- Layout correctness (spacing, alignment)
- Responsive behavior (different viewports)
- Role-specific UI differences (admin vs staff vs physician)
- Dark/light mode if applicable
- Error state visual presentation

**MANDATORY:** Run after ANY frontend component, page, or style change.

---

### Layer-to-Module Matrix

Shows which modules are tested at which layer. Modules should appear in multiple layers for defense-in-depth.

| Module | Jest (Backend) | Vitest (Frontend) | Playwright (E2E) | Cypress (Grid) | Visual |
|--------|:-:|:-:|:-:|:-:|:-:|
| **M1** Authentication | **authService** authRoutes | LoginPage, authStore, axios | auth, password-flows | login command | Login page |
| **M2** Authorization | auth middleware, routes | Header, ProtectedRoute | — | role-access-control | — |
| **M3** Admin Management | admin routes | AdminPage, UserModal, ResetModal | admin-management | — | Admin dashboard |
| **M4** Patient CRUD | data routes | AddRowModal, ConfirmModal, Toolbar | add-row, delete-row, smoke | ux-improvements | Main grid |
| **M5** Cell Editing | data routes (PATCH) | PatientGrid, AutoOpenSelect, DateCell | — | cell-editing, hover-reveal | Grid cells |
| **M6** Cascading Dropdowns | config routes | — (config is backend) | — | cascading-dropdowns | — |
| **M7** Status Colors | — | statusColors, StatusFilterBar | — | depression-screening | Color accuracy |
| **M8** Filtering & Search | data routes (query) | StatusFilterBar | compact-filter-bar | sorting-filtering, multi-select, search, insurance | Filter bar |
| **M9** Duplicate Detection | duplicateDetector | DuplicateWarningModal | duplicate-member | duplicate-detection | — |
| **M10** Real-Time | socketManager | ConflictModal, realtimeStore, StatusBar | parallel-editing (4 specs) | parallel-editing (2 specs) | Status bar |
| **M11** Hill Import | fileParser, transformer, validator, diff, preview, integration | ImportPage, PreviewPage, ImportResults, SummaryCards | import-all-roles | — | Import page |
| **M12** Sutter Import | actionMapper, mergeLogic, performance | SheetSelector | sutter-import (3 specs) | — | — |
| **M13** Column Mapping | configLoader | MappingTable, ActionPattern, ConflictBanner | smart-column-mapping | mapping-management | Mapping page |
| **M14** Conflict Resolution | diffCalculator | ConflictResolutionStep, ConflictBanner | import-conflict-resolution | import-conflict (2 specs) | Conflict UI |
| **M15** Patient Assignment | reassignment | PatientManagement, PatientAssignment | patient-management, import-reassignment | patient-assignment | — |
| **M16** Audit Logging | all route handlers | AdminPage (audit tab) | admin-management | — | — |
| **M17** Date Logic | dueDateCalc, statusDatePrompt, dateParser | StatusDateRenderer, dateFormatter | — | time-interval, date-prepopulate | — |
| **M18** Security | validateEnv, authService | apiError | — | — | — |
| **M19** Accessibility | — | — | accessibility, visual-regression | — | All pages |
| **M20** Deployment | — | — | — | — | — |

---

### When to Use Which Layer

```
                ┌────────────────────────────────────────────┐
                │         "Should I write a test?"           │
                └────────────────┬───────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Is it pure logic?       │
                    │  (no DOM, no browser)     │
                    └─────┬──────────┬─────────┘
                      YES │          │ NO
                          ▼          ▼
                   ┌──────────┐  ┌────────────────────┐
                   │  JEST    │  │  Does it render     │
                   │ (backend)│  │  a React component? │
                   └──────────┘  └──────┬────────┬─────┘
                                    YES │        │ NO
                                        ▼        ▼
                                 ┌──────────┐  ┌──────────────────┐
                                 │  VITEST  │  │  Does it involve │
                                 │(component│  │  AG Grid cells?  │
                                 │ render)  │  └──────┬─────┬─────┘
                                 └──────────┘     YES │     │ NO
                                                      ▼     ▼
                                              ┌─────────┐ ┌───────────┐
                                              │ CYPRESS  │ │ PLAYWRIGHT│
                                              │(AG Grid) │ │ (flows)   │
                                              └─────────┘ └───────────┘

          After ANY UI change:  → VISUAL REVIEW (Layer 5, mandatory)
```

### Test Execution Order (CI Pipeline)

```
Stage 1: Fast feedback (< 2 min)
├── Jest (backend unit)          ~1,415 tests
└── Vitest (frontend component)  ~1,202 tests

Stage 2: Build gate (< 1 min)
├── Backend tsc --noEmit
└── Frontend vite build

Stage 3: E2E (< 15 min, on release)
├── Playwright (Chromium + Firefox + Edge)  ~48 tests
└── Cypress (AG Grid)                       ~293 tests

Stage 4: Visual (manual, on UI changes)
└── MCP Playwright review                   13 pages
```
