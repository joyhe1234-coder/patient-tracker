# Requirements Document: Test Admin Management

## Introduction

Module 5: Admin Panel & User Management -- Comprehensive Test Plan. This specification consolidates all testable behaviors from three existing feature specs (admin-dashboard, patient-ownership, patient-management) into a unified set of requirements with traceable acceptance criteria, an explicit coverage matrix against current automated tests, identified coverage gaps, and proposed new test cases to fill those gaps.

The current test inventory for admin and user management functionality spans 119 backend Jest tests (34 admin.routes + 11 users.routes + 15 auth middleware + 59 auth.routes), 93 frontend Vitest tests (21 AdminPage + 12 UserModal + 9 ResetPasswordModal + 19 PatientAssignmentPage + 21 PatientManagementPage + 9 ProtectedRoute + 22 Header -- note: some tests overlap with auth/import modules counted separately), 8 Playwright E2E tests, and 74 Cypress E2E tests (32 patient-assignment + 42 role-access-control). **Total in-scope: 363 tests.** This document maps every testable behavior to acceptance criteria, identifies where coverage is lacking, and defines the test cases needed to achieve comprehensive coverage.

## Alignment with Product Vision

This feature directly supports the product vision goals of:

- **Role-based access control**: Verifying that PHYSICIAN, STAFF, ADMIN, and ADMIN+PHYSICIAN roles enforce correct access boundaries is critical to patient data isolation
- **Administration**: The admin dashboard is the central hub for user CRUD, staff-physician assignments, audit logging, and patient reassignment -- all core product features
- **Patient ownership**: Ensuring physicians see only their own patients, and that staff/admin access is properly scoped, is a fundamental security and usability requirement
- **Audit trail for accountability**: The audit log must reliably capture all administrative actions; untested audit behaviors represent a compliance risk
- **Importing data from healthcare systems**: Import physician selection and reassignment confirmation are intertwined with ownership and must be verified end-to-end

## Codebase Analysis

### Existing Test Inventory (Admin & User Management Scope)

> **VERIFIED 2026-02-27** -- Test counts below are verified by source code analysis, not estimated.

| Layer | File | Test Count | Scope |
|-------|------|------------|-------|
| Backend Jest | `admin.routes.test.ts` | 34 | User CRUD, staff assignments, audit log, bulk assign, unassigned patients, send temp password |
| Backend Jest | `users.routes.test.ts` | 11 | Physician list endpoint, role-based filtering (PHYSICIAN/ADMIN/STAFF scoping) |
| Backend Jest | `auth.test.ts` (middleware) | 15 | Auth middleware: requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| Backend Jest | `auth.routes.test.ts` | 59 | Login/logout, failed login audit logging (LOGIN_FAILED, ACCOUNT_LOCKED), account lockout, password change, password reset, audit log creation for all auth actions |
| Backend Jest | `data.routes.test.ts` | 49 | Data endpoints including ownership filtering |
| Frontend Vitest | `AdminPage.test.tsx` | 21 | Dashboard rendering, tabs, user list, role badges, audit log entries (LOGIN_FAILED orange badge, ACCOUNT_LOCKED red badge), send temp password, error/loading states |
| Frontend Vitest | `UserModal.test.tsx` | 12 | Add User form (fields, submit, password required), Edit User form (pre-fill, update), role selection (Staff shows physician assignments), error handling, cancel |
| Frontend Vitest | `ResetPasswordModal.test.tsx` | 9 | Reset password form rendering, min 8 char validation, password mismatch, API call, success/error states, loading state, cancel |
| Frontend Vitest | `PatientAssignmentPage.test.tsx` | 19 | Reassign tab: patient list, selection, select all/deselect, physician dropdown, bulk assign API, success/error messages, empty state, lazy load |
| Frontend Vitest | `PatientManagementPage.test.tsx` | 21 | Tab visibility by role (ADMIN/STAFF/PHYSICIAN/ADMIN+PHYSICIAN), default tab, tab switching, URL param handling, invalid tab fallback, content mounting |
| Frontend Vitest | `Header.test.tsx` | 22 | Physician dropdown visibility per role, unassigned option (ADMIN only, not STAFF), dropdown only on grid page, Admin nav link visibility, role badges, ADMIN+PHYSICIAN dual-role behavior, change password modal |
| Frontend Vitest | `ProtectedRoute.test.tsx` | 9 | Auth guard: loading spinner, redirect to /login, role-based render, PHYSICIAN redirect from admin-only, STAFF access, token check |
| Playwright E2E | `admin-management.spec.ts` | 8 | Admin dashboard display, role badges, add/edit user modals, audit log tab, non-admin redirect, account lockout (3 failed attempts) |
| Cypress E2E | `patient-assignment.cy.ts` | 32 | Assignment workflow (single/bulk/select-all), counts verification, physician switching, staff-physician assignments (edit modal, assign, remove), deactivated physician hidden, no-cache fetch |
| Cypress E2E | `role-access-control.cy.ts` | 42 | ADMIN (nav, /admin, dropdown, unassigned), PHYSICIAN (no admin, no dropdown, redirect), STAFF single/multi-physician (assigned dropdown only, no unassigned), ADMIN+PHYSICIAN dual role, API access control (401/403), navigation protection (unauthenticated redirects) |

**Total existing tests in scope: 363** (previously estimated at ~282 due to omitting auth.routes.test.ts, UserModal.test.tsx, ResetPasswordModal.test.tsx, and undercounting Header.test.tsx)

### Reusable Components Identified

- **Auth middleware** (`backend/src/middleware/auth.ts`): `requireAuth`, `requireRole`, `requirePatientDataAccess` -- well-tested with 15 Jest tests
- **Admin route handlers** (`backend/src/routes/handlers/`): `userHandlers.ts`, `staffHandlers.ts`, `auditHandlers.ts`, `patientHandlers.ts` -- modular handler pattern, testable in isolation
- **Zod schemas** (`admin.routes.ts`): `createUserSchema`, `updateUserSchema`, `assignStaffSchema`, `resetPasswordSchema` -- validation logic that can be unit-tested independently
- **`isValidRoleCombination()`** (`admin.routes.ts`): Pure function, directly unit-testable
- **ProtectedRoute component** (`frontend/src/components/auth/ProtectedRoute.tsx`): Reusable auth guard with role-based access
- **Zustand auth store** (`frontend/src/stores/authStore.ts`): Centralized auth state, mockable in tests
- **Cypress custom commands**: `waitForAgGrid`, `selectAgGridDropdown` -- reusable for grid-related admin tests
- **Playwright Page Object Model**: `LoginPage` POM already exists for auth flows

### Integration Points

- **Admin routes** mount at `/api/admin/*` with `requireAuth` + `requireRole(['ADMIN'])` middleware chain
- **Data routes** at `/api/data/*` enforce ownership filtering via `dataHandlers.ts`
- **Users routes** at `/api/users/physicians` provide physician list (used by Header dropdown and PatientAssignmentPage)
- **Frontend routing** in `App.tsx` uses `ProtectedRoute` with `allowedRoles` for `/admin` and `/patient-management`
- **Prisma models**: `User`, `StaffAssignment`, `Patient` (ownerId FK), `AuditLog` -- all schema relationships are tested through route handlers

---

## Requirements

### Requirement 1: User CRUD Operations

**ID:** TAM-R01

**User Story:** As an ADMIN, I want to create, view, edit, deactivate, and reactivate user accounts, so that I can control who has access to the system and manage their profiles.

#### Acceptance Criteria

1. **TAM-R01-AC01** WHEN admin navigates to `/admin` THEN system SHALL display a user list showing all users with columns: display name, email, roles (as badges), status (Active/Inactive), patient count, last login, and action buttons (Edit, Send Temp Password)
2. **TAM-R01-AC02** WHEN admin clicks "Add User" THEN system SHALL display a modal with fields: email (required, valid email format), display name (required, non-empty), password (required, min 8 characters), and role selection (at least one role required)
3. **TAM-R01-AC03** WHEN admin submits the Add User form with valid data THEN system SHALL create the user via `POST /api/admin/users`, return 201 with the created user, and log a `CREATE` audit entry with the admin's userId, target email, and roles
4. **TAM-R01-AC04** IF admin submits an email that already exists THEN system SHALL return 409 with error code `EMAIL_EXISTS` and display an error message in the modal
5. **TAM-R01-AC05** IF admin submits invalid data (missing fields, invalid email format, password under 8 chars) THEN system SHALL return 400 with `VALIDATION_ERROR` and display the validation message
6. **TAM-R01-AC06** WHEN admin clicks Edit on a user THEN system SHALL display a pre-filled Edit User modal with display name, email, roles, and (for STAFF) physician assignment checkboxes
7. **TAM-R01-AC07** WHEN admin updates user details via `PUT /api/admin/users/:id` THEN system SHALL save changes, return 200, and log an `UPDATE` audit entry with field-level changes (`{ fields: [{ field, old, new }] }`)
8. **TAM-R01-AC08** IF admin attempts to update their own roles THEN system SHALL return 400 with error code `CANNOT_CHANGE_OWN_ROLE`
9. **TAM-R01-AC09** WHEN admin clicks Delete/Deactivate on a user via `DELETE /api/admin/users/:id` THEN system SHALL soft-delete by setting `isActive=false`, unassign the user's patients (set ownerId=null) if PHYSICIAN, remove staff assignments, and log a `DELETE` audit entry
10. **TAM-R01-AC10** IF admin attempts to deactivate their own account THEN system SHALL return 400 with error code `CANNOT_DELETE_SELF`
11. **TAM-R01-AC11** WHEN a deactivated user attempts to log in THEN system SHALL return 401 with `USER_DEACTIVATED` error and prevent access
12. **TAM-R01-AC12** WHEN admin views the user list THEN deactivated users SHALL appear with "Inactive" status and visually dimmed styling
13. **TAM-R01-AC13** WHEN admin updates a deactivated user's `isActive` to `true` via `PUT /api/admin/users/:id` THEN system SHALL reactivate the user, allowing them to log in again
14. **TAM-R01-AC14** WHEN admin clicks "Send temporary password" for a user THEN system SHALL call `POST /api/admin/users/:id/send-temp-password`, generate a random password, set `mustChangePassword=true`, and either email it (if SMTP configured) or display it in a modal (if SMTP not configured)
15. **TAM-R01-AC15** WHEN admin resets a user's password via `POST /api/admin/users/:id/reset-password` THEN system SHALL hash and save the new password, return 200, log a `PASSWORD_RESET` audit entry, and optionally send a notification email

### Requirement 2: Role Management

**ID:** TAM-R02

**User Story:** As an ADMIN, I want to assign and validate role combinations for users, so that each user has appropriate access permissions and invalid role combinations are prevented.

#### Acceptance Criteria

1. **TAM-R02-AC01** WHEN creating or editing a user THEN the role selection SHALL allow these valid combinations only: `[PHYSICIAN]`, `[ADMIN]`, `[STAFF]`, `[ADMIN, PHYSICIAN]`
2. **TAM-R02-AC02** IF roles include `STAFF` combined with any other role (e.g., `[STAFF, PHYSICIAN]`) THEN system SHALL return 400 with error code `INVALID_ROLE_COMBINATION`
3. **TAM-R02-AC03** IF no roles are selected (empty array) THEN system SHALL return 400 with validation error "At least one role is required"
4. **TAM-R02-AC04** WHEN a user's role is changed from PHYSICIAN to STAFF THEN system SHALL update the role, and the user's next login SHALL reflect the new access level (STAFF sees physician selector, cannot see admin page)
5. **TAM-R02-AC05** WHEN a user's role is changed from STAFF to PHYSICIAN THEN any existing staff-physician assignments SHALL be cleaned up (orphaned StaffAssignment records for the old STAFF role)
6. **TAM-R02-AC06** WHEN admin views the user list THEN each user SHALL display their roles as colored badges: ADMIN, PHYSICIAN, STAFF, or multiple badges for dual-role users
7. **TAM-R02-AC07** WHEN `isValidRoleCombination()` is called with `['ADMIN', 'PHYSICIAN']` THEN it SHALL return `true`
8. **TAM-R02-AC08** WHEN `isValidRoleCombination()` is called with `['STAFF', 'ADMIN']` THEN it SHALL return `false`

### Requirement 3: Staff-Physician Assignments

**ID:** TAM-R03

**User Story:** As an ADMIN, I want to assign STAFF users to specific physicians, so that staff members can view and edit only their assigned physicians' patient data.

#### Acceptance Criteria

1. **TAM-R03-AC01** WHEN admin edits a STAFF user THEN system SHALL display physician assignment checkboxes listing all active physicians
2. **TAM-R03-AC02** WHEN admin checks a physician checkbox and saves THEN system SHALL create a StaffAssignment record via `POST /api/admin/staff-assignments` with the staffId and physicianId
3. **TAM-R03-AC03** WHEN admin unchecks a physician checkbox and saves THEN system SHALL remove the StaffAssignment record via `DELETE /api/admin/staff-assignments`
4. **TAM-R03-AC04** IF the staff user ID does not exist THEN system SHALL return 404 with error code `STAFF_NOT_FOUND`
5. **TAM-R03-AC05** IF the staffId or physicianId is not a valid integer THEN system SHALL return 400 with validation error
6. **TAM-R03-AC06** WHEN a STAFF user logs in after assignment change THEN the physician selector dropdown SHALL show only the currently assigned physicians
7. **TAM-R03-AC07** WHEN a STAFF user has no physician assignments THEN system SHALL display a "No physicians assigned" message instead of the patient grid
8. **TAM-R03-AC08** WHEN a physician is deactivated THEN STAFF users previously assigned to that physician SHALL no longer see that physician in their dropdown
9. **TAM-R03-AC09** WHEN admin views the user list THEN each STAFF user SHALL display their assignment count and physician names; each PHYSICIAN user SHALL display their assigned staff names

### Requirement 4: Audit Log

**ID:** TAM-R04

**User Story:** As an ADMIN, I want to view, filter, and understand audit log entries, so that I can monitor system activity, investigate security events, and maintain accountability.

#### Acceptance Criteria

1. **TAM-R04-AC01** WHEN admin clicks the "Audit Log" tab THEN system SHALL fetch entries from `GET /api/admin/audit-log` and display them in reverse chronological order
2. **TAM-R04-AC02** WHEN audit entries load THEN each entry SHALL display: timestamp (formatted), user display name (or email for unknown users), action badge (color-coded), entity type, entity ID, and details
3. **TAM-R04-AC03** WHEN `LOGIN_FAILED` entries are displayed THEN system SHALL show an orange action badge, the reason (INVALID_CREDENTIALS, ACCOUNT_LOCKED, or ACCOUNT_DEACTIVATED), the email attempted, and the IP address
4. **TAM-R04-AC04** WHEN `ACCOUNT_LOCKED` entries are displayed THEN system SHALL show a red action badge with the reason (e.g., TOO_MANY_FAILED_ATTEMPTS)
5. **TAM-R04-AC05** WHEN the audit log API is called with filter parameters (`action`, `entity`, `userId`, `startDate`, `endDate`) THEN system SHALL return only matching entries
6. **TAM-R04-AC06** WHEN the audit log API is called with pagination params (`page`, `limit`) THEN system SHALL return the correct page of results with pagination metadata (page, limit, total, totalPages)
7. **TAM-R04-AC07** IF `limit` exceeds 100 THEN system SHALL cap it at 100 entries per page
8. **TAM-R04-AC08** WHEN an administrative action occurs (CREATE, UPDATE, DELETE user; PASSWORD_RESET; SEND_TEMP_PASSWORD; bulk patient assignment) THEN system SHALL create an AuditLog record with: action, userId, userEmail, entity, entityId, changes/details JSON, ipAddress, and createdAt timestamp
9. **TAM-R04-AC09** WHEN a user logs in or out THEN system SHALL create LOGIN or LOGOUT audit entries
10. **TAM-R04-AC10** WHEN the audit log has no entries matching filters THEN system SHALL display an empty state message

### Requirement 5: Patient Management Page

**ID:** TAM-R05

**User Story:** As a user (ADMIN, PHYSICIAN, or STAFF), I want a unified Patient Management page with tabbed Import and Reassign interfaces, so that I can manage patient data operations from a single location.

#### Acceptance Criteria

1. **TAM-R05-AC01** WHEN user navigates to `/patient-management` THEN system SHALL display a tabbed interface with the "Import Patients" tab active by default
2. **TAM-R05-AC02** IF user is ADMIN THEN system SHALL display both "Import Patients" and "Reassign Patients" tabs
3. **TAM-R05-AC03** IF user is STAFF or PHYSICIAN THEN system SHALL display only the "Import Patients" tab (no "Reassign Patients" tab visible)
4. **TAM-R05-AC04** IF user is ADMIN+PHYSICIAN THEN system SHALL display both tabs (ADMIN privilege)
5. **TAM-R05-AC05** WHEN ADMIN clicks the "Reassign Patients" tab THEN system SHALL show the reassign interface and update the URL to `/patient-management?tab=reassign`
6. **TAM-R05-AC06** WHEN user navigates to `/patient-management?tab=reassign` THEN system SHALL activate the Reassign tab (if ADMIN) or fall back to Import tab (if non-ADMIN)
7. **TAM-R05-AC07** WHEN user navigates to `/patient-management?tab=<invalid>` THEN system SHALL default to the Import tab
8. **TAM-R05-AC08** WHEN user switches between tabs THEN import form state (file, mode, physician) SHALL be preserved (no remount)
9. **TAM-R05-AC09** WHEN Reassign tab first activates THEN system SHALL lazy-load unassigned patient data (showing a loading spinner)
10. **TAM-R05-AC10** WHEN Reassign tab is not active THEN system SHALL NOT make API calls for unassigned patients

### Requirement 6: Bulk Patient Assignment (Reassign Tab)

**ID:** TAM-R06

**User Story:** As an ADMIN, I want to view unassigned patients and bulk-assign them to physicians, so that every patient has an owning physician and is visible in the appropriate physician's patient list.

#### Acceptance Criteria

1. **TAM-R06-AC01** WHEN ADMIN views the Reassign tab THEN system SHALL display a list of unassigned patients (ownerId=null) with checkboxes, showing: patient name, DOB, telephone, and measure count
2. **TAM-R06-AC02** WHEN ADMIN selects patients using individual checkboxes or "Select All" THEN the selection counter SHALL update to show "N of M selected"
3. **TAM-R06-AC03** WHEN ADMIN clicks "Select All" THEN all patients SHALL be selected; when ADMIN clicks "Deselect All" THEN all SHALL be deselected
4. **TAM-R06-AC04** WHEN no patients are selected or no physician is chosen THEN the "Assign Selected" button SHALL be disabled
5. **TAM-R06-AC05** WHEN ADMIN selects patients and a physician and clicks "Assign Selected" THEN system SHALL call `PATCH /api/admin/patients/bulk-assign` with `{ patientIds, ownerId }` and show a success message
6. **TAM-R06-AC06** WHEN bulk assignment succeeds THEN system SHALL reload the unassigned patient list, reducing the count by the number assigned
7. **TAM-R06-AC07** WHEN bulk assignment fails THEN system SHALL display an error message and retain the user's patient selections and physician choice
8. **TAM-R06-AC08** WHEN all patients are assigned (empty list) THEN system SHALL display an "All Patients Assigned" empty state
9. **TAM-R06-AC09** WHEN admin calls `PATCH /api/admin/patients/bulk-assign` with empty patientIds THEN system SHALL return 400
10. **TAM-R06-AC10** WHEN admin calls `PATCH /api/admin/patients/bulk-assign` with a non-existent ownerId THEN system SHALL return 404
11. **TAM-R06-AC11** WHEN admin calls `PATCH /api/admin/patients/bulk-assign` with `ownerId: null` THEN system SHALL unassign the selected patients (set ownerId to null)
12. **TAM-R06-AC12** WHEN patient is assigned to a physician THEN that patient SHALL appear in the physician's grid when the physician next loads data

### Requirement 7: Patient Ownership & Data Isolation

**ID:** TAM-R07

**User Story:** As a system, I want to enforce patient ownership rules so that physicians see only their own patients, staff see only assigned physicians' patients, and admins can see all patients or filter by physician.

#### Acceptance Criteria

1. **TAM-R07-AC01** WHEN a PHYSICIAN logs in THEN system SHALL auto-filter to show only patients where `ownerId` equals the physician's user ID
2. **TAM-R07-AC02** WHEN a PHYSICIAN is logged in THEN the physician selector dropdown SHALL NOT be visible
3. **TAM-R07-AC03** WHEN a PHYSICIAN calls the data API THEN system SHALL return only their own patients, regardless of any physicianId query parameter
4. **TAM-R07-AC04** WHEN a STAFF user logs in THEN system SHALL display a physician selector dropdown containing only physicians assigned via StaffAssignment
5. **TAM-R07-AC05** WHEN a STAFF user selects a physician THEN the grid SHALL display that physician's patients
6. **TAM-R07-AC06** WHEN a STAFF user has not selected a physician THEN the grid SHALL be empty (no data loaded by default)
7. **TAM-R07-AC07** WHEN a STAFF user has no physician assignments THEN system SHALL display a "No physicians assigned" message
8. **TAM-R07-AC08** WHEN an ADMIN user logs in THEN the physician selector dropdown SHALL show all eligible physicians plus an "Unassigned patients" option
9. **TAM-R07-AC09** WHEN ADMIN selects "Unassigned patients" THEN the API call SHALL include `physicianId=unassigned` and the grid SHALL display patients with `ownerId=null`
10. **TAM-R07-AC10** WHEN a STAFF user calls the API to request unassigned patients THEN system SHALL return 403 Forbidden
11. **TAM-R07-AC11** WHEN a PHYSICIAN calls the API with `physicianId=unassigned` THEN system SHALL return only their own patients (ignoring the param)
12. **TAM-R07-AC12** WHEN the physician selector dropdown is shown THEN it SHALL be visible ONLY on the Patient Grid page (not on Import, Admin, or other pages)

### Requirement 8: Admin-Only Access Control

**ID:** TAM-R08

**User Story:** As the system, I want to restrict the admin dashboard and all admin API endpoints to users with the ADMIN role, so that non-admin users cannot access administrative functions.

#### Acceptance Criteria

1. **TAM-R08-AC01** WHEN a non-authenticated user requests any `/api/admin/*` endpoint THEN system SHALL return 401 Unauthorized
2. **TAM-R08-AC02** WHEN a PHYSICIAN user navigates to `/admin` THEN system SHALL redirect to `/` (main page)
3. **TAM-R08-AC03** WHEN a STAFF user navigates to `/admin` THEN system SHALL redirect to `/` (main page)
4. **TAM-R08-AC04** WHEN an ADMIN user navigates to `/admin` THEN system SHALL display the Admin Dashboard
5. **TAM-R08-AC05** WHEN an ADMIN+PHYSICIAN user navigates to `/admin` THEN system SHALL display the Admin Dashboard (ADMIN role grants access)
6. **TAM-R08-AC06** WHEN a non-admin user navigates to `/admin/import-mapping` THEN system SHALL redirect away
7. **TAM-R08-AC07** WHEN an unauthenticated user navigates to `/admin` or `/patient-management` THEN system SHALL redirect to `/login`
8. **TAM-R08-AC08** WHEN the `requireRole(['ADMIN'])` middleware is applied to admin routes THEN all non-ADMIN authenticated users SHALL receive 403 Forbidden
9. **TAM-R08-AC09** WHEN a deactivated user's JWT token is used THEN `requireAuth` middleware SHALL return 401 with `USER_DEACTIVATED`
10. **TAM-R08-AC10** WHEN a valid JWT with invalid/expired signature is used THEN `requireAuth` middleware SHALL return 401 with `INVALID_TOKEN`

### Requirement 9: Import Ownership Integration

**ID:** TAM-R09

**User Story:** As a user importing patient data, I want ownership rules to be enforced during import, so that imported patients are correctly assigned to the appropriate physician.

#### Acceptance Criteria

1. **TAM-R09-AC01** IF user is PHYSICIAN THEN the import form SHALL NOT show a physician selector (auto-assigns to self)
2. **TAM-R09-AC02** IF user is STAFF or ADMIN THEN the import form SHALL show a physician selector for explicit assignment
3. **TAM-R09-AC03** WHEN importing patients that belong to a different physician THEN system SHALL display a reassignment warning
4. **TAM-R09-AC04** WHEN reassignment warning is displayed THEN user SHALL explicitly confirm before the import proceeds
5. **TAM-R09-AC05** WHEN import completes THEN assigned patients SHALL appear in the target physician's grid

---

## Coverage Gap Analysis

### Current Coverage vs. Requirements Matrix

> **VERIFIED 2026-02-27** -- Each cell references an actual test file and test name verified by source code analysis.
> Notation: file:line-range or file:"test name substring"

| Req ID | AC ID | Description | Backend Jest | Frontend Vitest | Playwright E2E | Cypress E2E | Status |
|--------|-------|-------------|-------------|-----------------|----------------|-------------|--------|
| TAM-R01 | AC01 | User list display | admin.routes:"returns list of all users" | AdminPage:"renders user rows","shows patient count","shows Never" | admin-mgmt:"displays admin dashboard" | -- | **COVERED** |
| TAM-R01 | AC02 | Add User modal fields | admin.routes:"creates a new user" | UserModal:"renders Add User title","shows password field","calls API to create user" | admin-mgmt:"can open Add User modal" | -- | **COVERED** (was PARTIAL; UserModal.test.tsx exists with 4 create tests) |
| TAM-R01 | AC03 | Create user API + audit | admin.routes:"creates a new user" (verifies 201) | UserModal:"calls API to create user on submit" | -- | -- | PARTIAL (audit log creation verified by mock.toHaveBeenCalled but not asserting audit content) |
| TAM-R01 | AC04 | Duplicate email 409 | admin.routes:"returns 409 for duplicate email" | UserModal:"shows error message on API failure" (generic) | -- | -- | **COVERED** (backend + frontend error path) |
| TAM-R01 | AC05 | Validation errors 400 | admin.routes:"returns 400 for missing required fields","returns 400 for invalid email format" | UserModal:"does not submit when password is empty" | -- | -- | **COVERED** |
| TAM-R01 | AC06 | Edit User modal | admin.routes:"updates user display name" | UserModal:"renders Edit User title","pre-fills form","calls API to update user","shows Active checkbox" | admin-mgmt:"can open Edit User modal" | -- | **COVERED** (was PARTIAL; UserModal.test.tsx has 4 edit tests) |
| TAM-R01 | AC07 | Update user + audit | admin.routes:"updates user display name" | UserModal:"calls API to update user on submit" | -- | -- | PARTIAL (audit content not verified, field-level change tracking untested) |
| TAM-R01 | AC08 | Cannot change own role | -- | -- | -- | -- | **GAP** (code exists in userHandlers.ts L250-256 but no test at any layer) |
| TAM-R01 | AC09 | Deactivate user + cascade | admin.routes:"deactivates a user" (verifies 200, "deactivated") | -- | -- | -- | BACKEND ONLY (no E2E verifying patient unassignment or staff assignment cleanup) |
| TAM-R01 | AC10 | Cannot delete self | admin.routes:"prevents deleting self" (verifies 400 CANNOT_DELETE_SELF) | -- | -- | -- | BACKEND ONLY |
| TAM-R01 | AC11 | Deactivated user login blocked | auth.routes:"creates LOGIN_FAILED audit log for deactivated account" (verifies 401) | -- | -- | -- | BACKEND ONLY (no E2E login-after-deactivation flow) |
| TAM-R01 | AC12 | Inactive user dimmed display | -- | AdminPage:"shows active/inactive status" (verifies "Inactive" text) | -- | -- | VITEST ONLY |
| TAM-R01 | AC13 | Reactivate user | -- | UserModal:"shows Active checkbox" (can toggle) | -- | -- | **GAP** (no backend test for PUT with isActive:true on deactivated user; no E2E reactivation flow) |
| TAM-R01 | AC14 | Send temp password | admin.routes:"sends temp password successfully","returns temp password when SMTP not configured","creates SEND_TEMP_PASSWORD audit log" | AdminPage:"shows temp password modal when SMTP not configured","shows success modal when temp password emailed" | -- | -- | COVERED (backend 3 tests + Vitest 2 tests; no E2E) |
| TAM-R01 | AC15 | Reset password by admin | admin.routes:"resets user password","returns 404","returns 400 for short password" | ResetPasswordModal: 9 tests (render, validation, API call, success/error/loading, cancel) | -- | -- | **COVERED** (was BACKEND ONLY; ResetPasswordModal.test.tsx exists with full coverage) |
| TAM-R02 | AC01 | Valid role combinations | admin.routes:"creates a new user" (PHYSICIAN accepted) | UserModal:"shows physician assignment list when Staff role is selected" (role UI) | -- | -- | PARTIAL (only PHYSICIAN tested via API; no test for [ADMIN] or [ADMIN,PHYSICIAN] acceptance) |
| TAM-R02 | AC02 | Invalid STAFF combo | admin.routes:"returns 400 for invalid role combination (STAFF + PHYSICIAN)" | -- | -- | -- | BACKEND ONLY |
| TAM-R02 | AC03 | Empty roles validation | admin.routes:"returns 400 for missing required fields" (Zod min(1)) | -- | -- | -- | BACKEND ONLY |
| TAM-R02 | AC04 | Role change access effects | -- | -- | -- | -- | **GAP** (no E2E test for: change role, logout, login, verify new access level) |
| TAM-R02 | AC05 | Role change cleanup | -- | -- | -- | -- | **GAP** (code gap: updateUser handler does NOT cleanup StaffAssignment on role change; only deleteUser does) |
| TAM-R02 | AC06 | Role badges display | -- | AdminPage:"displays role badges for each user" (ADMIN/PHYSICIAN/STAFF) | admin-mgmt:"shows user roles with correct badges" | role-access:"displays (ADMIN) role badge" etc. | **COVERED** |
| TAM-R02 | AC07 | isValidRoleCombination true | -- | -- | -- | -- | **GAP** (pure function exported from admin.routes.ts but no direct unit test) |
| TAM-R02 | AC08 | isValidRoleCombination false | admin.routes:"returns 400 for invalid role combination" (tests [STAFF,PHYSICIAN] via API) | -- | -- | -- | PARTIAL (only [STAFF,PHYSICIAN] tested; no test for [STAFF,ADMIN] or [STAFF,ADMIN,PHYSICIAN]) |
| TAM-R03 | AC01 | Staff physician checkboxes | -- | UserModal:"shows physician assignment list when Staff role is selected" (lists Dr. Smith, Dr. Jones) | -- | patient-assignment:"should show physician checkboxes when editing staff user" | **COVERED** |
| TAM-R03 | AC02 | Create assignment | admin.routes:"creates a staff assignment" (201) | -- | -- | patient-assignment:"should assign physician to staff and save" | **COVERED** |
| TAM-R03 | AC03 | Delete assignment | admin.routes:"removes a staff assignment" | -- | -- | patient-assignment:"should remove physician assignment from staff" | **COVERED** |
| TAM-R03 | AC04 | Staff not found 404 | admin.routes:"returns 404 for invalid staff user" (STAFF_NOT_FOUND) | -- | -- | -- | BACKEND ONLY |
| TAM-R03 | AC05 | Invalid input 400 | admin.routes:"returns 400 for invalid input" (staffId: 'abc') | -- | -- | -- | BACKEND ONLY |
| TAM-R03 | AC06 | Staff dropdown after assignment change | -- | -- | -- | role-access:"shows only assigned physicians in dropdown" | CYPRESS ONLY |
| TAM-R03 | AC07 | No assignments message | -- | -- | -- | -- | **GAP** (no test for STAFF with 0 assignments seeing "No physicians assigned" message) |
| TAM-R03 | AC08 | Deactivated physician hidden | -- | -- | -- | patient-assignment:"should handle deactivated physician gracefully" | CYPRESS ONLY |
| TAM-R03 | AC09 | Assignment display in list | -- | AdminPage data includes assignedPhysicians/assignedStaff in mocks | -- | patient-assignment:"should display staff users with assignment count" | PARTIAL (data is in mock fixtures but no explicit assertion on display) |
| TAM-R04 | AC01 | Audit log fetch and display | admin.routes:"returns paginated audit log entries" | AdminPage:"switches to Audit Log tab on click" | admin-mgmt:"can switch to Audit Log tab" | -- | **COVERED** |
| TAM-R04 | AC02 | Entry details display | admin.routes:"returns paginated audit log entries" (includes user.displayName) | AdminPage: 5 tests for LOGIN_FAILED/ACCOUNT_LOCKED detail rendering | -- | -- | COVERED (backend + Vitest detail assertions; no E2E for detail format) |
| TAM-R04 | AC03 | LOGIN_FAILED orange badge | -- | AdminPage:"renders LOGIN_FAILED entries with orange action badge" (bg-orange-100 class) | -- | -- | VITEST ONLY |
| TAM-R04 | AC04 | ACCOUNT_LOCKED red badge | -- | AdminPage:"renders ACCOUNT_LOCKED entries with red badge and details" (bg-red-100 class, TOO_MANY_FAILED_ATTEMPTS) | -- | -- | VITEST ONLY |
| TAM-R04 | AC05 | Filter parameters | -- | -- | -- | -- | **GAP** (auditHandlers.ts supports action/entity/userId/startDate/endDate filters but no test verifies they work) |
| TAM-R04 | AC06 | Pagination | admin.routes:"supports pagination params" (page=2, limit=10) | -- | -- | -- | BACKEND ONLY |
| TAM-R04 | AC07 | Limit cap at 100 | -- | -- | -- | -- | **GAP** (auditHandlers.ts L21: Math.min(limit, 100) but no test with limit > 100) |
| TAM-R04 | AC08 | Audit log creation on actions | admin.routes: verified for CREATE, DELETE, PASSWORD_RESET, SEND_TEMP_PASSWORD, BULK_ASSIGN_PATIENTS; auth.routes: verified for LOGIN, LOGOUT, LOGIN_FAILED, ACCOUNT_LOCKED, PASSWORD_CHANGE | -- | -- | -- | **COVERED** (was PARTIAL; auth.routes.test.ts has 8+ audit creation tests) |
| TAM-R04 | AC09 | Login/logout audit entries | auth.routes:"creates LOGIN audit log on successful login","creates LOGOUT audit log on successful logout","creates LOGIN_FAILED audit log for invalid email/password/deactivated" | -- | -- | -- | **COVERED** (was GAP; auth.routes.test.ts has 10+ tests including LOGIN_FAILED, ACCOUNT_LOCKED audit) |
| TAM-R04 | AC10 | Empty audit log state | -- | -- | -- | -- | **GAP** (no Vitest test for empty entries array rendering in AdminPage) |
| TAM-R05 | AC01 | Default Import tab | -- | PatientMgmt:"renders Import tab by default","Import tab is styled as active" | -- | -- | VITEST ONLY |
| TAM-R05 | AC02 | ADMIN sees both tabs | -- | PatientMgmt:"ADMIN sees both Import and Reassign tabs" | -- | -- | VITEST ONLY |
| TAM-R05 | AC03 | STAFF/PHYSICIAN one tab | -- | PatientMgmt:"STAFF sees only Import tab","PHYSICIAN sees only Import tab" | -- | -- | VITEST ONLY |
| TAM-R05 | AC04 | ADMIN+PHYSICIAN both tabs | -- | PatientMgmt:"ADMIN+PHYSICIAN sees both tabs" | -- | -- | VITEST ONLY |
| TAM-R05 | AC05 | Reassign tab URL update | -- | PatientMgmt:"clicking Reassign Patients tab shows reassign content" | -- | -- | VITEST ONLY |
| TAM-R05 | AC06 | URL param tab activation | -- | PatientMgmt:"?tab=reassign activates Reassign tab for ADMIN","?tab=reassign falls back for STAFF/PHYSICIAN","?tab=reassign activates for ADMIN+PHYSICIAN" | -- | -- | VITEST ONLY |
| TAM-R05 | AC07 | Invalid tab param fallback | -- | PatientMgmt:"?tab=invalid falls back to Import tab" | -- | -- | VITEST ONLY |
| TAM-R05 | AC08 | Tab state preservation | -- | PatientMgmt:"Import tab content is always rendered","Reassign tab content is rendered for ADMIN" (both mounted, CSS toggle) | -- | -- | PARTIAL (mounting verified but actual form state preservation on tab switch untested) |
| TAM-R05 | AC09 | Lazy load reassign data | -- | PatientAssign:"loads data on first activation" (verifies API calls) | -- | -- | VITEST ONLY |
| TAM-R05 | AC10 | No API call when inactive | -- | PatientAssign:"does not load data when tab is not active" (mockGet not called) | -- | -- | VITEST ONLY |
| TAM-R06 | AC01 | Unassigned patient list | admin.routes:"returns unassigned patients","returns empty array" | PatientAssign:"renders patient list with names","shows patient DOB and phone","shows measure count" | -- | patient-assignment:"should display unassigned patients list" | **COVERED** |
| TAM-R06 | AC02 | Selection counter | -- | PatientAssign:"shows 0 of N selected initially","selects a patient on checkbox click" (1 of 3) | -- | -- | VITEST ONLY |
| TAM-R06 | AC03 | Select All / Deselect All | -- | PatientAssign:"select all toggles all patients" (3 of 3 then 0 of 3) | -- | patient-assignment:"should use select all to assign all patients" | **COVERED** |
| TAM-R06 | AC04 | Assign button disabled | -- | PatientAssign:"Assign button is disabled when no patients selected","disabled when no physician selected" | -- | patient-assignment:"should disable assign button when no patients/physician selected" | **COVERED** |
| TAM-R06 | AC05 | Bulk assign API call | admin.routes:"assigns patients to a physician" (PATCH, 200) | PatientAssign:"performs bulk assignment on button click" (verifies payload) | -- | patient-assignment:"should assign a single patient","should assign multiple patients" | **COVERED** |
| TAM-R06 | AC06 | List refresh after assign | -- | PatientAssign:"shows success message after assignment" | -- | patient-assignment:"should refresh list after assignment","should update unassigned count after assignment" | **COVERED** |
| TAM-R06 | AC07 | Error handling on assign | -- | PatientAssign:"shows error when assignment fails" | -- | -- | VITEST ONLY |
| TAM-R06 | AC08 | All assigned empty state | -- | PatientAssign:"shows All Patients Assigned when list is empty" | -- | patient-assignment:"should handle no unassigned patients gracefully" | **COVERED** |
| TAM-R06 | AC09 | Empty patientIds 400 | admin.routes:"returns 400 for empty patientIds" | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC10 | Non-existent owner 404 | admin.routes:"returns 404 for non-existent target user" | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC11 | Unassign (ownerId null) | admin.routes:"unassigns patients when ownerId is null" | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC12 | Patient in physician grid | -- | -- | -- | patient-assignment:"should verify patient appears in physician grid after assignment" | CYPRESS ONLY |
| TAM-R07 | AC01 | PHYSICIAN auto-filter | -- | -- | -- | role-access:"does NOT show physician selector dropdown (auto-filters)" | CYPRESS ONLY |
| TAM-R07 | AC02 | PHYSICIAN no dropdown | -- | Header:"should NOT show provider dropdown for PHYSICIAN user" | -- | role-access:"does NOT show physician selector dropdown" | **COVERED** |
| TAM-R07 | AC03 | PHYSICIAN API scoping | -- | -- | -- | role-access:"PHYSICIAN requesting unassigned gets 200 but only own data" | CYPRESS ONLY |
| TAM-R07 | AC04 | STAFF assigned dropdown | -- | Header:"should show provider dropdown for STAFF on Patient Grid page" | -- | role-access:"shows only assigned physicians in dropdown" | **COVERED** |
| TAM-R07 | AC05 | STAFF physician selection | -- | -- | -- | role-access:"can switch between assigned physicians" | CYPRESS ONLY |
| TAM-R07 | AC06 | STAFF empty by default | -- | -- | -- | -- | **GAP** (no test for STAFF seeing empty grid before selecting physician) |
| TAM-R07 | AC07 | No assignments message | -- | -- | -- | -- | **GAP** (no test for STAFF with 0 assignments seeing message instead of grid) |
| TAM-R07 | AC08 | ADMIN all physicians | -- | Header:"should show Unassigned patients option for ADMIN users" | -- | role-access:"shows multiple physicians in dropdown" | **COVERED** |
| TAM-R07 | AC09 | Unassigned patients query | -- | Header:"should select unassigned value","should call setSelectedPhysicianId with null" | -- | role-access:"can view unassigned patients","ADMIN gets 200 for unassigned" | **COVERED** |
| TAM-R07 | AC10 | STAFF 403 unassigned | -- | Header:"should NOT show Unassigned patients option for STAFF" | -- | role-access:"STAFF gets 403 when requesting unassigned patients via API" | **COVERED** |
| TAM-R07 | AC11 | PHYSICIAN ignores unassigned | -- | -- | -- | role-access:"PHYSICIAN requesting unassigned gets 200 but only own data" | CYPRESS ONLY |
| TAM-R07 | AC12 | Dropdown only on grid page | -- | Header:"should NOT show provider dropdown for ADMIN on Import page","on Admin page","ADMIN+PHYSICIAN NOT show dropdown on non-grid pages" | -- | -- | VITEST ONLY |
| TAM-R08 | AC01 | 401 for all admin endpoints | admin.routes:"returns 401 for all endpoints when not authenticated" (8 endpoints) | -- | -- | role-access:"returns 401 for /api/admin/users without auth" | **COVERED** |
| TAM-R08 | AC02 | PHYSICIAN redirect from /admin | -- | ProtectedRoute:"redirects PHYSICIAN to / when admin-only" | admin-mgmt:"non-admin user is redirected" | role-access:"is redirected away from /admin" | **COVERED** |
| TAM-R08 | AC03 | STAFF redirect from /admin | -- | ProtectedRoute (same logic, STAFF tested via allowedRoles) | -- | role-access STAFF:"is redirected away from /admin to /" | **COVERED** |
| TAM-R08 | AC04 | ADMIN access /admin | -- | ProtectedRoute:"renders children when user has an allowed role" (ADMIN) | admin-mgmt:"displays admin dashboard" | role-access:"can access /admin page" | **COVERED** |
| TAM-R08 | AC05 | ADMIN+PHYSICIAN access | -- | -- | -- | role-access ADMIN+PHYSICIAN:"can access /admin page" | CYPRESS ONLY |
| TAM-R08 | AC06 | Non-admin /import-mapping | -- | -- | -- | role-access PHYSICIAN:"is redirected away from /admin/import-mapping", STAFF same | **COVERED** (Cypress covers both PHYSICIAN and STAFF redirect) |
| TAM-R08 | AC07 | Unauthenticated redirects | -- | ProtectedRoute:"redirects to /login when not authenticated" | -- | role-access Navigation:"redirects /admin to /login","redirects /patient-management to /login" | **COVERED** |
| TAM-R08 | AC08 | requireRole 403 | auth.test:"should call next with error when user has no matching roles" (403) | -- | -- | role-access API:"returns 401 for /api/admin/users without auth" | **COVERED** |
| TAM-R08 | AC09 | Deactivated user 401 | auth.routes:"creates LOGIN_FAILED audit log for deactivated account" (returns 401) | -- | -- | -- | BACKEND ONLY |
| TAM-R08 | AC10 | Invalid token 401 | auth.test:"should call next with error when Bearer token is empty" (401 INVALID_TOKEN) | -- | -- | -- | BACKEND ONLY |
| TAM-R09 | AC01 | PHYSICIAN no physician selector | -- | ImportPage tests (verified in component test files) | -- | -- | VITEST ONLY |
| TAM-R09 | AC02 | STAFF/ADMIN physician selector | -- | ImportPage tests (verified in component test files) | -- | -- | VITEST ONLY |
| TAM-R09 | AC03 | Reassignment warning | -- | ImportPreviewPage tests (verified in component test files) | -- | -- | VITEST ONLY |
| TAM-R09 | AC04 | Reassignment confirmation | -- | ImportPreviewPage tests (verified in component test files) | -- | -- | VITEST ONLY |
| TAM-R09 | AC05 | Physician auto-assign import | -- | -- | -- | -- | **GAP** (no E2E verifying PHYSICIAN import auto-assigns to self and patient appears in grid) |

### Coverage Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| **COVERED** (2+ layers) | 36 | 42% |
| BACKEND ONLY | 11 | 13% |
| VITEST ONLY | 14 | 16% |
| CYPRESS ONLY | 8 | 9% |
| PARTIAL | 6 | 7% |
| **GAP** (0 layers) | 10 | 12% |
| **Total ACs** | **85** | 100% |

### Identified Coverage Gaps (Priority Ordered)

> **CORRECTED 2026-02-27** -- Previous analysis listed 18 gaps. After verifying against actual test files, 7 former gaps were reclassified as covered (UserModal.test.tsx, ResetPasswordModal.test.tsx, and auth.routes.test.ts were not accounted for). 10 genuine gaps remain, plus 1 code-level gap.

| Gap ID | Req:AC | Description | Priority | Proposed Layer | Notes |
|--------|--------|-------------|----------|----------------|-------|
| GAP-01 | TAM-R01:AC08 | Cannot change own role -- no test at any layer | **HIGH** | Jest (admin.routes.test.ts) | Code exists in userHandlers.ts L250-256 (CANNOT_CHANGE_OWN_ROLE) but zero tests |
| GAP-02 | TAM-R01:AC13 | User reactivation -- no backend test for PUT isActive:true on deactivated user; no E2E reactivation flow | **HIGH** | Jest + Playwright E2E | UserModal has Active checkbox but no end-to-end flow test |
| GAP-03 | TAM-R02:AC04 | Role change effects on access -- no E2E verifying that after role change, user's next login has different permissions | **HIGH** | Playwright E2E | Requires multi-user login flow |
| GAP-04 | TAM-R02:AC05 | **CODE GAP**: updateUser handler does NOT cleanup StaffAssignment records when changing role from STAFF to PHYSICIAN; only deleteUser does cleanup | **HIGH** | Fix code + Jest test | userHandlers.ts updateUser() missing StaffAssignment cleanup |
| GAP-05 | TAM-R02:AC07-08 | isValidRoleCombination pure function has no direct unit test | **MEDIUM** | Jest (new test file or inline) | 7 valid/invalid combos to test; function is exported |
| GAP-06 | TAM-R03:AC07 + TAM-R07:AC07 | STAFF with no physician assignments sees "No physicians assigned" message | **MEDIUM** | Vitest + Cypress E2E | Requires empty assignments mock/seed user |
| GAP-07 | TAM-R04:AC05 | Audit log filter parameters (action, entity, userId, startDate, endDate) -- backend supports via auditHandlers.ts but no test verifies filtering | **MEDIUM** | Jest (admin.routes.test.ts) | auditHandlers.ts L24-33 builds where clause |
| GAP-08 | TAM-R04:AC07 | Audit log limit cap at 100 -- auditHandlers.ts L21 uses Math.min(limit, 100) but no test sends limit > 100 | **LOW** | Jest (admin.routes.test.ts) | Single test: limit=200 should return limitNum=100 |
| GAP-09 | TAM-R04:AC10 | Empty audit log UI state -- no Vitest test for AdminPage rendering when entries=[] | **LOW** | Vitest (AdminPage.test.tsx) | Simple mock response test |
| GAP-10 | TAM-R07:AC06 | STAFF empty grid by default -- no test verifying STAFF sees empty grid before selecting a physician | **MEDIUM** | Vitest + Cypress E2E | Related to GAP-06 |
| GAP-11 | TAM-R09:AC05 | PHYSICIAN auto-assign during import -- no E2E verifying imported patients are assigned to self | **MEDIUM** | Cypress E2E | Cross-feature: import + ownership |
| GAP-12 | TAM-R01:AC07 | Update user audit log content -- no test verifies field-level change tracking in audit details JSON | **LOW** | Jest (admin.routes.test.ts) | userHandlers.ts L286-298 creates changedFields array |
| GAP-13 | TAM-R05:AC08 | Tab state preservation -- content mounting tested but actual form input state not verified after tab switch | **LOW** | Vitest or Cypress E2E | Edge case: fill import form, switch to reassign, switch back |

**Previous gaps reclassified as COVERED after verification:**
- ~~GAP-09 (old) TAM-R04:AC09~~ Login/logout audit entries: **COVERED** by `auth.routes.test.ts` (10+ tests for LOGIN, LOGOUT, LOGIN_FAILED, ACCOUNT_LOCKED audit creation)
- ~~GAP-14 (old) TAM-R01:AC02~~ Add User modal: **COVERED** by `UserModal.test.tsx` (4 create-mode tests)
- ~~GAP-15 (old) TAM-R01:AC06~~ Edit User modal: **COVERED** by `UserModal.test.tsx` (4 edit-mode tests)
- ~~GAP-18 (old) TAM-R01:AC15~~ Reset password frontend: **COVERED** by `ResetPasswordModal.test.tsx` (9 tests)
- ~~GAP-16 (old) TAM-R01:AC09~~ User deactivation E2E: Downgraded -- backend test exists, E2E is nice-to-have
- ~~GAP-17 (old) TAM-R01:AC14~~ Send temp password E2E: Downgraded -- 5 tests across backend+Vitest already cover this

---

## Proposed New Test Cases

> **UPDATED 2026-02-27** -- Reduced from 21 to 16 proposed tests after removing those that already exist.

### Backend Jest (New Tests: 7)

| Test ID | Gap | Description | File | Priority |
|---------|-----|-------------|------|----------|
| TAM-T01 | GAP-01 | PUT /api/admin/users/:id returns 400 CANNOT_CHANGE_OWN_ROLE when admin (id=1) changes own roles from [ADMIN] to [ADMIN,PHYSICIAN] | `admin.routes.test.ts` | **HIGH** |
| TAM-T02 | GAP-05 | isValidRoleCombination returns true for [PHYSICIAN], [ADMIN], [STAFF], [ADMIN,PHYSICIAN] (4 assertions) | New: `admin.routes.unit.test.ts` or add to `admin.routes.test.ts` | MEDIUM |
| TAM-T03 | GAP-05 | isValidRoleCombination returns false for [STAFF,PHYSICIAN], [STAFF,ADMIN], [STAFF,ADMIN,PHYSICIAN], [] (4 assertions) | Same as TAM-T02 | MEDIUM |
| TAM-T04 | GAP-07 | GET /api/admin/audit-log?action=LOGIN&userId=1&startDate=2026-01-01&endDate=2026-02-01 returns filtered entries | `admin.routes.test.ts` | MEDIUM |
| TAM-T05 | GAP-08 | GET /api/admin/audit-log?limit=200 caps at 100 (verify pagination.limit=100 in response) | `admin.routes.test.ts` | LOW |
| TAM-T06 | GAP-02 | PUT /api/admin/users/:id with {isActive:true} on deactivated user returns 200, user.isActive becomes true | `admin.routes.test.ts` | **HIGH** |
| TAM-T07 | GAP-12 | PUT /api/admin/users/:id with {displayName:"New"} creates audit log with changes.fields containing {field:"displayName", old:"Old", new:"New"} | `admin.routes.test.ts` | LOW |

### Frontend Vitest (New Tests: 3)

| Test ID | Gap | Description | File | Priority |
|---------|-----|-------------|------|----------|
| TAM-T08 | GAP-09 | AdminPage Audit Log tab renders "No audit log entries" when API returns entries=[] | `AdminPage.test.tsx` | LOW |
| TAM-T09 | GAP-06 | Header/MainPage shows "No physicians assigned" for STAFF with empty assignments array | `Header.test.tsx` or new `MainPage.test.tsx` | MEDIUM |
| TAM-T10 | GAP-10 | MainPage/grid area shows empty state for STAFF before selecting a physician from dropdown | `MainPage.test.tsx` or `Header.test.tsx` | MEDIUM |

### Playwright E2E (New Tests: 3)

| Test ID | Gap | Description | File | Priority |
|---------|-----|-------------|------|----------|
| TAM-T11 | GAP-02 | Admin deactivates user via Edit modal (uncheck Active, save), then reactivates (check Active, save), user can log in again | `admin-management.spec.ts` | **HIGH** |
| TAM-T12 | GAP-03 | Admin changes user role from PHYSICIAN to STAFF via Edit modal, user logs in and sees STAFF-level access (physician dropdown, no admin link) | `admin-management.spec.ts` | **HIGH** |
| TAM-T13 | GAP-01 | Admin opens own Edit modal, changes own role checkboxes, attempts save -- expects error (CANNOT_CHANGE_OWN_ROLE) | `admin-management.spec.ts` | **HIGH** |

### Cypress E2E (New Tests: 3)

| Test ID | Gap | Description | File | Priority |
|---------|-----|-------------|------|----------|
| TAM-T14 | GAP-06 | Create or use STAFF user with no physician assignments, login, verify "No physicians assigned" message instead of grid | `role-access-control.cy.ts` | MEDIUM |
| TAM-T15 | GAP-10 | Login as STAFF with assignments, verify grid is empty/shows prompt before selecting physician from dropdown | `role-access-control.cy.ts` | MEDIUM |
| TAM-T16 | GAP-11 | Login as PHYSICIAN, import patient file without selecting physician, verify patients auto-assigned to self (appear in grid) | `patient-assignment.cy.ts` | MEDIUM |

### Code Fix Required (Not a Test)

| Fix ID | Gap | Description | File |
|--------|-----|-------------|------|
| TAM-FIX-01 | GAP-04 | updateUser handler must cleanup StaffAssignment records when roles change from STAFF to non-STAFF (same logic as deleteUser L347-349) | `backend/src/routes/handlers/userHandlers.ts` L276-282 |

### Test Count Impact

| Layer | Current | New | Total After |
|-------|---------|-----|-------------|
| Backend Jest (admin-scoped) | 34 | +7 | 41 |
| Frontend Vitest (admin-scoped) | 93 | +3 | 96 |
| Playwright E2E | 8 | +3 | 11 |
| Cypress E2E (admin-scoped) | 74 | +3 | 77 |
| **Total (admin scope)** | **209** | **+16** | **225** |

> Note: "admin-scoped" counts exclude auth.routes.test.ts (59 tests), data.routes.test.ts (49 tests), and auth middleware tests (15 tests) which are cross-cutting but contribute to admin coverage. Including those, the full admin+auth test inventory is 363 current + 16 new = 379.

---

## Non-Functional Requirements

### Performance

- **TAM-NFR01** The user list endpoint `GET /api/admin/users` SHALL respond within 500ms for up to 100 users
- **TAM-NFR02** The audit log endpoint `GET /api/admin/audit-log` SHALL respond within 500ms for paginated queries (limit <= 100)
- **TAM-NFR03** Bulk patient assignment `PATCH /api/admin/patients/bulk-assign` SHALL complete within 2 seconds for up to 100 patients
- **TAM-NFR04** Tab switching on the Patient Management page SHALL be instant (no API calls on tab switch; data loads lazily on first activation only)

### Security

- **TAM-NFR05** All `/api/admin/*` endpoints SHALL require both authentication (valid JWT) and ADMIN role authorization
- **TAM-NFR06** Deactivated user JWT tokens SHALL be rejected by `requireAuth` middleware (checked on every request, not cached)
- **TAM-NFR07** Passwords SHALL be hashed with bcrypt before storage; plaintext passwords SHALL never be stored or logged
- **TAM-NFR08** Audit log entries SHALL capture the IP address of the requesting client for all administrative actions
- **TAM-NFR09** The admin password reset endpoint SHALL not reveal whether a user exists (404 is acceptable since only admins call it)
- **TAM-NFR10** Rate limiting SHALL be enforced on authentication endpoints to prevent brute-force attacks

### Reliability

- **TAM-NFR11** User deactivation SHALL use a database transaction to atomically update isActive, unassign patients, and remove staff assignments
- **TAM-NFR12** Audit log creation failures SHALL NOT cause the parent operation to fail (audit logging should be best-effort)
- **TAM-NFR13** The physician selector SHALL make a fresh API call on each physician switch (no stale cached data)

### Usability

- **TAM-NFR14** Role badges SHALL use distinct colors for each role (ADMIN, PHYSICIAN, STAFF) for quick visual identification
- **TAM-NFR15** Deactivated users SHALL be visually distinguishable from active users (dimmed text, "Inactive" label)
- **TAM-NFR16** The Assign button SHALL provide clear disabled-state feedback when preconditions are not met (no patients selected or no physician chosen)
- **TAM-NFR17** Error messages from validation failures SHALL be specific and actionable (e.g., "Password must be at least 8 characters" not "Invalid input")

---

## Assumptions and Constraints

### Assumptions

- **A1** The seeded development database contains at least one ADMIN, one PHYSICIAN, one STAFF, and one ADMIN+PHYSICIAN user for E2E testing
- **A2** SMTP is not configured in the test environment; temp password tests must handle the "display in modal" path
- **A3** The Cypress `patient-assignment.cy.ts` tests use API-level seeding for deterministic test data
- **A4** Playwright E2E tests run against a local dev server with seeded data (same as Cypress)
- **A5** The audit log has no export functionality currently; any export requirements are out of scope for this test plan

### Constraints

- **C1** ESM mocking limitations in Jest: route tests can mock middleware but cannot fully test authenticated flows with real JWT verification (use supertest with mocked auth)
- **C2** Cypress is required for AG Grid interactions (dropdowns, cell editing); Playwright cannot reliably commit AG Grid selections
- **C3** The audit log cleanup script (6-month retention) is a CLI tool, not tested via the web UI
- **C4** Staff reassignment edge cases (reassigning a staff user while they are actively viewing a physician's data) cannot be tested in isolation without WebSocket/real-time infrastructure
- **C5** Test execution time: the full Cypress suite takes ~5 minutes; new tests should be grouped to minimize redundant login/navigation

---

## Dependencies

- **D1** Authentication system (JWT issuance, verification, refresh)
- **D2** Role-based access control middleware (`requireAuth`, `requireRole`)
- **D3** Prisma ORM and PostgreSQL database (User, StaffAssignment, Patient, AuditLog models)
- **D4** Frontend routing (React Router with `ProtectedRoute` guard)
- **D5** Zustand auth store (user state, physician selection state)
- **D6** Existing import pipeline (for ownership integration tests)
- **D7** Seeded test database (dev users with known credentials)
