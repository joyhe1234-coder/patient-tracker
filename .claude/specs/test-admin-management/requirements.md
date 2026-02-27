# Requirements Document: Test Admin Management

## Introduction

Module 5: Admin Panel & User Management -- Comprehensive Test Plan. This specification consolidates all testable behaviors from three existing feature specs (admin-dashboard, patient-ownership, patient-management) into a unified set of requirements with traceable acceptance criteria, an explicit coverage matrix against current automated tests, identified coverage gaps, and proposed new test cases to fill those gaps.

The current test inventory for admin and user management functionality spans approximately 80 backend Jest tests, 80 frontend Vitest tests, 8 Playwright E2E tests, and 74+ Cypress E2E tests. This document maps every testable behavior to acceptance criteria, identifies where coverage is lacking, and defines the test cases needed to achieve comprehensive coverage.

## Alignment with Product Vision

This feature directly supports the product vision goals of:

- **Role-based access control**: Verifying that PHYSICIAN, STAFF, ADMIN, and ADMIN+PHYSICIAN roles enforce correct access boundaries is critical to patient data isolation
- **Administration**: The admin dashboard is the central hub for user CRUD, staff-physician assignments, audit logging, and patient reassignment -- all core product features
- **Patient ownership**: Ensuring physicians see only their own patients, and that staff/admin access is properly scoped, is a fundamental security and usability requirement
- **Audit trail for accountability**: The audit log must reliably capture all administrative actions; untested audit behaviors represent a compliance risk
- **Importing data from healthcare systems**: Import physician selection and reassignment confirmation are intertwined with ownership and must be verified end-to-end

## Codebase Analysis

### Existing Test Inventory (Admin & User Management Scope)

| Layer | File | Test Count | Scope |
|-------|------|------------|-------|
| Backend Jest | `admin.routes.test.ts` | 34 | User CRUD, staff assignments, audit log, bulk assign, unassigned patients, send temp password |
| Backend Jest | `users.routes.test.ts` | 11 | Physician list endpoint, role-based filtering |
| Backend Jest | `auth.test.ts` | 15 | Auth middleware: requireAuth, requireRole, optionalAuth |
| Backend Jest | `data.routes.test.ts` | 49 | Data endpoints including ownership filtering |
| Frontend Vitest | `AdminPage.test.tsx` | 21 | Dashboard rendering, tabs, user list, role badges, audit log entries, send temp password, error/loading states |
| Frontend Vitest | `PatientAssignmentPage.test.tsx` | 19 | Reassign tab: patient list, selection, bulk assign, empty state, errors |
| Frontend Vitest | `PatientManagementPage.test.tsx` | 21 | Tab visibility by role, default tab, tab switching, URL param handling, content mounting |
| Frontend Vitest | `Header.test.tsx` | 21 | Physician dropdown visibility, unassigned option, role-based display |
| Frontend Vitest | `ProtectedRoute.test.tsx` | 9 | Auth guard: loading, redirect, role checks |
| Playwright E2E | `admin-management.spec.ts` | 8 | Admin dashboard display, add/edit user modals, audit log tab, non-admin redirect, account lockout |
| Cypress E2E | `patient-assignment.cy.ts` | 32 | Assignment workflow, counts, physician switching, staff assignments |
| Cypress E2E | `role-access-control.cy.ts` | 42 | Role-based page access, dropdown visibility, API auth, unassigned patients |

**Total existing tests in scope: ~282**

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

| Req ID | AC ID | Description | Backend Jest | Frontend Vitest | Playwright E2E | Cypress E2E | Status |
|--------|-------|-------------|-------------|-----------------|----------------|-------------|--------|
| TAM-R01 | AC01 | User list display | admin.routes L155-193 | AdminPage L146-233 | admin-mgmt L22-28 | -- | COVERED |
| TAM-R01 | AC02 | Add User modal | admin.routes L234-257 | -- | admin-mgmt L39-47 | -- | PARTIAL (no Vitest for modal form) |
| TAM-R01 | AC03 | Create user API + audit | admin.routes L234-257 | -- | -- | patient-assignment (stub) | PARTIAL (no audit log verification) |
| TAM-R01 | AC04 | Duplicate email 409 | admin.routes L259-273 | -- | -- | -- | BACKEND ONLY |
| TAM-R01 | AC05 | Validation errors 400 | admin.routes L275-308 | -- | -- | -- | BACKEND ONLY |
| TAM-R01 | AC06 | Edit User modal | admin.routes L314-348 | -- | admin-mgmt L49-59 | -- | PARTIAL (no Vitest for edit modal) |
| TAM-R01 | AC07 | Update user + audit | admin.routes L314-337 | -- | -- | -- | BACKEND ONLY |
| TAM-R01 | AC08 | Cannot change own role | -- | -- | -- | -- | **GAP** |
| TAM-R01 | AC09 | Deactivate user | admin.routes L353-389 | -- | -- | -- | BACKEND ONLY (no E2E) |
| TAM-R01 | AC10 | Cannot delete self | admin.routes L381-388 | -- | -- | -- | BACKEND ONLY |
| TAM-R01 | AC11 | Deactivated user login blocked | auth.test (L36-37) | -- | -- | -- | BACKEND ONLY (no E2E) |
| TAM-R01 | AC12 | Inactive user dimmed display | -- | AdminPage L204-211 | -- | -- | VITEST ONLY |
| TAM-R01 | AC13 | Reactivate user | -- | -- | -- | -- | **GAP** |
| TAM-R01 | AC14 | Send temp password | admin.routes L627-704 | AdminPage L470-523 | -- | -- | PARTIAL (no E2E) |
| TAM-R01 | AC15 | Reset password by admin | admin.routes L393-427 | -- | -- | -- | BACKEND ONLY (no frontend test) |
| TAM-R02 | AC01 | Valid role combinations | admin.routes L275-287 | -- | -- | -- | BACKEND ONLY |
| TAM-R02 | AC02 | Invalid STAFF combo | admin.routes L275-287 | -- | -- | -- | BACKEND ONLY |
| TAM-R02 | AC03 | Empty roles validation | admin.routes L289-295 | -- | -- | -- | BACKEND ONLY |
| TAM-R02 | AC04 | Role change access effects | -- | -- | -- | -- | **GAP** |
| TAM-R02 | AC05 | Role change cleanup | -- | -- | -- | -- | **GAP** |
| TAM-R02 | AC06 | Role badges display | -- | AdminPage L195-202 | admin-mgmt L30-37 | -- | PARTIAL |
| TAM-R02 | AC07 | isValidRoleCombination true | -- | -- | -- | -- | **GAP** (no direct unit test) |
| TAM-R02 | AC08 | isValidRoleCombination false | admin.routes L275-287 (indirect) | -- | -- | -- | PARTIAL (tested via API, not unit) |
| TAM-R03 | AC01 | Staff physician checkboxes | -- | -- | -- | patient-assignment | CYPRESS ONLY |
| TAM-R03 | AC02 | Create assignment | admin.routes L449-465 | -- | -- | patient-assignment | COVERED |
| TAM-R03 | AC03 | Delete assignment | admin.routes L489-500 | -- | -- | patient-assignment | COVERED |
| TAM-R03 | AC04 | Staff not found 404 | admin.routes L467-475 | -- | -- | -- | BACKEND ONLY |
| TAM-R03 | AC05 | Invalid input 400 | admin.routes L477-484 | -- | -- | -- | BACKEND ONLY |
| TAM-R03 | AC06 | Staff dropdown update | -- | -- | -- | patient-assignment | CYPRESS ONLY |
| TAM-R03 | AC07 | No assignments message | -- | -- | -- | -- | **GAP** |
| TAM-R03 | AC08 | Deactivated physician hidden | -- | -- | -- | patient-assignment | CYPRESS ONLY |
| TAM-R03 | AC09 | Assignment display in list | -- | AdminPage (partial) | -- | patient-assignment | PARTIAL |
| TAM-R04 | AC01 | Audit log fetch and display | admin.routes L504-527 | AdminPage L237-247 | admin-mgmt L61-69 | -- | COVERED |
| TAM-R04 | AC02 | Entry details display | admin.routes L504-538 | AdminPage L308-464 | -- | -- | PARTIAL (no E2E for detail format) |
| TAM-R04 | AC03 | LOGIN_FAILED orange badge | -- | AdminPage L308-335 | -- | -- | VITEST ONLY |
| TAM-R04 | AC04 | ACCOUNT_LOCKED red badge | -- | AdminPage L393-418 | -- | -- | VITEST ONLY |
| TAM-R04 | AC05 | Filter parameters | -- | -- | -- | -- | **GAP** (backend supports it but no test for filter params) |
| TAM-R04 | AC06 | Pagination | admin.routes L528-537 | -- | -- | -- | BACKEND ONLY |
| TAM-R04 | AC07 | Limit cap at 100 | -- | -- | -- | -- | **GAP** |
| TAM-R04 | AC08 | Audit log creation on actions | admin.routes (partial: create, deactivate, reset-password, send-temp, bulk-assign) | -- | -- | -- | PARTIAL (not all actions verified) |
| TAM-R04 | AC09 | Login/logout audit entries | -- | -- | -- | -- | **GAP** (auth service creates them but no test for audit creation) |
| TAM-R04 | AC10 | Empty audit log state | -- | -- | -- | -- | **GAP** |
| TAM-R05 | AC01 | Default Import tab | -- | PatientMgmt L101-115 | -- | -- | VITEST ONLY |
| TAM-R05 | AC02 | ADMIN sees both tabs | -- | PatientMgmt L67-73 | -- | -- | VITEST ONLY |
| TAM-R05 | AC03 | STAFF/PHYSICIAN one tab | -- | PatientMgmt L75-89 | -- | -- | VITEST ONLY |
| TAM-R05 | AC04 | ADMIN+PHYSICIAN both tabs | -- | PatientMgmt L91-97 | -- | -- | VITEST ONLY |
| TAM-R05 | AC05 | Reassign tab URL update | -- | PatientMgmt L118-128 | -- | -- | VITEST ONLY |
| TAM-R05 | AC06 | URL param tab activation | -- | PatientMgmt L159-205 | -- | -- | VITEST ONLY |
| TAM-R05 | AC07 | Invalid tab param fallback | -- | PatientMgmt L192-197 | -- | -- | VITEST ONLY |
| TAM-R05 | AC08 | Tab state preservation | -- | PatientMgmt L209-228 | -- | -- | PARTIAL (content mounting tested, not form state) |
| TAM-R05 | AC09 | Lazy load reassign data | -- | PatientAssign L109-119 | -- | -- | VITEST ONLY |
| TAM-R05 | AC10 | No API call when inactive | -- | PatientAssign L109-112 | -- | -- | VITEST ONLY |
| TAM-R06 | AC01 | Unassigned patient list | admin.routes L595-623 | PatientAssign L122-147 | -- | patient-assignment | COVERED |
| TAM-R06 | AC02 | Selection counter | -- | PatientAssign L149-167 | -- | -- | VITEST ONLY |
| TAM-R06 | AC03 | Select All / Deselect All | -- | PatientAssign L169-182 | -- | patient-assignment | COVERED |
| TAM-R06 | AC04 | Assign button disabled | -- | PatientAssign L193-214 | -- | patient-assignment | COVERED |
| TAM-R06 | AC05 | Bulk assign API call | admin.routes L542-559 | PatientAssign L216-243 | -- | patient-assignment | COVERED |
| TAM-R06 | AC06 | List refresh after assign | -- | PatientAssign L245-263 | -- | patient-assignment | COVERED |
| TAM-R06 | AC07 | Error handling | -- | PatientAssign L265-283 | -- | -- | VITEST ONLY |
| TAM-R06 | AC08 | All assigned empty state | -- | PatientAssign L285-301 | -- | patient-assignment | COVERED |
| TAM-R06 | AC09 | Empty patientIds 400 | admin.routes L574-579 | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC10 | Non-existent owner 404 | admin.routes L581-589 | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC11 | Unassign (ownerId null) | admin.routes L561-572 | -- | -- | -- | BACKEND ONLY |
| TAM-R06 | AC12 | Patient in physician grid | -- | -- | -- | patient-assignment | CYPRESS ONLY |
| TAM-R07 | AC01 | PHYSICIAN auto-filter | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R07 | AC02 | PHYSICIAN no dropdown | -- | Header L(test) | -- | role-access-control | COVERED |
| TAM-R07 | AC03 | PHYSICIAN API scoping | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R07 | AC04 | STAFF assigned dropdown | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R07 | AC05 | STAFF physician selection | -- | -- | -- | patient-assignment | CYPRESS ONLY |
| TAM-R07 | AC06 | STAFF empty by default | -- | -- | -- | -- | **GAP** |
| TAM-R07 | AC07 | No assignments message | -- | -- | -- | -- | **GAP** |
| TAM-R07 | AC08 | ADMIN all physicians | -- | Header L(test) | -- | role-access-control | COVERED |
| TAM-R07 | AC09 | Unassigned patients query | data.routes | Header L(test) | -- | role-access-control | COVERED |
| TAM-R07 | AC10 | STAFF 403 unassigned | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R07 | AC11 | PHYSICIAN ignores unassigned | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R07 | AC12 | Dropdown only on grid page | -- | Header L(test) | -- | -- | VITEST ONLY |
| TAM-R08 | AC01 | 401 for all admin endpoints | admin.routes L131-149 | -- | -- | role-access-control | COVERED |
| TAM-R08 | AC02 | PHYSICIAN redirect from /admin | -- | ProtectedRoute L129-149 | admin-mgmt L71-87 | role-access-control | COVERED |
| TAM-R08 | AC03 | STAFF redirect from /admin | -- | ProtectedRoute L129-149 | -- | role-access-control | COVERED |
| TAM-R08 | AC04 | ADMIN access /admin | -- | ProtectedRoute L107-127 | admin-mgmt L22-28 | role-access-control | COVERED |
| TAM-R08 | AC05 | ADMIN+PHYSICIAN access | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R08 | AC06 | Non-admin /import-mapping | -- | -- | -- | role-access-control | CYPRESS ONLY |
| TAM-R08 | AC07 | Unauthenticated redirects | -- | ProtectedRoute L70-83 | -- | role-access-control | COVERED |
| TAM-R08 | AC08 | requireRole 403 | auth.test | -- | -- | role-access-control | COVERED |
| TAM-R08 | AC09 | Deactivated user 401 | auth.test | -- | -- | -- | BACKEND ONLY |
| TAM-R08 | AC10 | Invalid token 401 | auth.test | -- | -- | -- | BACKEND ONLY |
| TAM-R09 | AC01 | PHYSICIAN no physician selector | -- | ImportPage L(test) | -- | -- | VITEST ONLY |
| TAM-R09 | AC02 | STAFF/ADMIN physician selector | -- | ImportPage L(test) | -- | -- | VITEST ONLY |
| TAM-R09 | AC03 | Reassignment warning | -- | ImportPreviewPage L(test) | -- | -- | VITEST ONLY |
| TAM-R09 | AC04 | Reassignment confirmation | -- | ImportPreviewPage L(test) | -- | -- | VITEST ONLY |
| TAM-R09 | AC05 | Physician auto-assign import | -- | -- | -- | -- | **GAP** |

### Identified Coverage Gaps (Priority Ordered)

| Gap ID | Req:AC | Description | Priority | Proposed Layer |
|--------|--------|-------------|----------|----------------|
| GAP-01 | TAM-R01:AC08 | Cannot change own role -- no test at any layer | HIGH | Jest (unit test for updateUser handler) |
| GAP-02 | TAM-R01:AC13 | User reactivation -- no test at any layer | HIGH | Jest + Vitest + Cypress E2E |
| GAP-03 | TAM-R02:AC04 | Role change effects on access -- no E2E | HIGH | Playwright or Cypress E2E |
| GAP-04 | TAM-R02:AC05 | Role change cleanup of StaffAssignment records | HIGH | Jest (unit test for updateUser side effects) |
| GAP-05 | TAM-R02:AC07-08 | isValidRoleCombination unit tests -- pure function untested | MEDIUM | Jest (direct function test) |
| GAP-06 | TAM-R03:AC07 | STAFF with no assignments message -- no test | MEDIUM | Vitest + Cypress E2E |
| GAP-07 | TAM-R04:AC05 | Audit log filter parameters -- backend supports but untested | MEDIUM | Jest (audit handler with filter params) |
| GAP-08 | TAM-R04:AC07 | Audit log limit cap at 100 -- untested | LOW | Jest (audit handler with limit >100) |
| GAP-09 | TAM-R04:AC09 | Login/logout audit entry creation -- untested | MEDIUM | Jest (auth service audit logging) |
| GAP-10 | TAM-R04:AC10 | Empty audit log UI state -- no test | LOW | Vitest (AdminPage empty audit) |
| GAP-11 | TAM-R07:AC06 | STAFF empty grid by default -- no test | MEDIUM | Vitest + Cypress E2E |
| GAP-12 | TAM-R07:AC07 | STAFF no assignments message -- no E2E | MEDIUM | Cypress E2E |
| GAP-13 | TAM-R09:AC05 | PHYSICIAN auto-assign during import -- no E2E | MEDIUM | Cypress or Playwright E2E |
| GAP-14 | TAM-R01:AC02 | Add User modal form -- no Vitest component test | MEDIUM | Vitest (modal rendering + validation) |
| GAP-15 | TAM-R01:AC06 | Edit User modal form -- no Vitest component test | MEDIUM | Vitest (modal pre-fill + submission) |
| GAP-16 | TAM-R01:AC09 | User deactivation E2E -- no E2E test | MEDIUM | Playwright E2E |
| GAP-17 | TAM-R01:AC14 | Send temp password E2E -- no E2E test | LOW | Playwright E2E |
| GAP-18 | TAM-R01:AC15 | Reset password frontend -- no Vitest test | LOW | Vitest (modal + API call) |

---

## Proposed New Test Cases

### Backend Jest (New Tests)

| Test ID | Gap | Description | File |
|---------|-----|-------------|------|
| TAM-T01 | GAP-01 | updateUser returns 400 CANNOT_CHANGE_OWN_ROLE when admin changes own roles | `admin.routes.test.ts` |
| TAM-T02 | GAP-05 | isValidRoleCombination returns true for [PHYSICIAN], [ADMIN], [STAFF], [ADMIN,PHYSICIAN] | New: `admin.routes.unit.test.ts` or inline |
| TAM-T03 | GAP-05 | isValidRoleCombination returns false for [STAFF,PHYSICIAN], [STAFF,ADMIN], [STAFF,ADMIN,PHYSICIAN] | Same as above |
| TAM-T04 | GAP-07 | getAuditLog filters by action, entity, userId, startDate, endDate | `admin.routes.test.ts` |
| TAM-T05 | GAP-08 | getAuditLog caps limit at 100 when larger value provided | `admin.routes.test.ts` |
| TAM-T06 | GAP-09 | Login success creates LOGIN audit entry; login failure creates LOGIN_FAILED audit entry | `auth.routes.test.ts` or `authService.test.ts` |
| TAM-T07 | GAP-02 | updateUser with isActive:true reactivates deactivated user | `admin.routes.test.ts` |
| TAM-T08 | GAP-04 | updateUser role change from STAFF to PHYSICIAN cleans up StaffAssignment records | `admin.routes.test.ts` |

### Frontend Vitest (New Tests)

| Test ID | Gap | Description | File |
|---------|-----|-------------|------|
| TAM-T09 | GAP-14 | Add User modal renders form fields, validates required fields, submits API call | `AdminPage.test.tsx` or new `AddUserModal.test.tsx` |
| TAM-T10 | GAP-15 | Edit User modal pre-fills data, displays role checkboxes, submits updates | `AdminPage.test.tsx` or new `EditUserModal.test.tsx` |
| TAM-T11 | GAP-10 | Audit Log tab shows empty state when no entries returned | `AdminPage.test.tsx` |
| TAM-T12 | GAP-06 | STAFF with no assignments shows "No physicians assigned" message | `Header.test.tsx` or `MainPage.test.tsx` |
| TAM-T13 | GAP-11 | STAFF empty grid when no physician selected | `MainPage.test.tsx` |
| TAM-T14 | GAP-18 | Reset password modal renders, validates min length, calls API | `AdminPage.test.tsx` |

### Playwright E2E (New Tests)

| Test ID | Gap | Description | File |
|---------|-----|-------------|------|
| TAM-T15 | GAP-16 | Admin deactivates a user, verifies they appear as Inactive, verifies deactivated user cannot log in | `admin-management.spec.ts` |
| TAM-T16 | GAP-02 | Admin reactivates a user, verifies they can log in again | `admin-management.spec.ts` |
| TAM-T17 | GAP-03 | Admin changes user role from PHYSICIAN to STAFF, verifies access changes on next login | `admin-management.spec.ts` |
| TAM-T18 | GAP-17 | Admin sends temp password, modal displays correctly (SMTP not configured scenario) | `admin-management.spec.ts` |

### Cypress E2E (New Tests)

| Test ID | Gap | Description | File |
|---------|-----|-------------|------|
| TAM-T19 | GAP-12 | STAFF with no assignments sees "No physicians assigned" message instead of grid | `role-access-control.cy.ts` |
| TAM-T20 | GAP-11 | STAFF sees empty grid before selecting a physician | `role-access-control.cy.ts` |
| TAM-T21 | GAP-13 | PHYSICIAN import auto-assigns to self, patient appears in own grid | `patient-assignment.cy.ts` or `import-flow.cy.ts` |

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
