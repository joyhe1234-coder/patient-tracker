# Requirements Document: Module 1 — Authentication & Security Comprehensive Test Plan

## Introduction

This specification consolidates all testable behaviors from the authentication, role-based access control, and security-hardening domains of the Patient Quality Measure Tracking System. Its purpose is to (a) map every implemented behavior to acceptance criteria, (b) audit current test coverage against those criteria to identify gaps, and (c) propose new test cases to fill those gaps. The deliverable is a structured test plan, not new application features.

The system currently has **306 auth/security tests** across four test layers plus additional coverage in `data.routes.test.ts` and `admin.routes.test.ts` for data scoping and audit log endpoints. This spec catalogs what is covered, what is missing, and what is explicitly deferred (not implemented).

## Alignment with Product Vision

Product.md states: "JWT authentication with bcrypt password hashing, Role-based access control (PHYSICIAN, STAFF, ADMIN), Patient ownership (physicians see only their patients), Staff-to-physician assignment, Audit logging of user actions, Password reset via email (SMTP)." This test plan ensures every one of those stated capabilities has verifiable, automated test coverage, fulfilling the product's accountability and security goals.

---

## Current Test Inventory (Baseline — verified 2026-02-27)

| Layer | File | Test Count | Domain |
|-------|------|-----------|--------|
| Backend Jest | `authService.test.ts` | 22 | Password hashing, JWT, toAuthUser, lockout, temp password |
| Backend Jest | `auth.test.ts` (middleware) | 15 | requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| Backend Jest | `auth.routes.test.ts` | 59 | Login, logout, /me, password change, forgot/reset password, lockout, audit logging |
| Backend Jest | `emailService.test.ts` | 12 | Email service (SMTP, reset email) |
| Backend Jest | `emailService.integration.test.ts` | 6 | SMTP integration, email delivery |
| Backend Jest | `validateEnv.test.ts` | 25 | JWT secret, required env vars, startup validation |
| Backend Jest | `data.routes.test.ts` (scoping subset) | 15 | getPatientOwnerFilter per-role data scoping |
| Backend Jest | `admin.routes.test.ts` (audit subset) | 2 | GET /api/admin/audit-log pagination |
| Frontend Vitest | `LoginPage.test.tsx` | 18 | Login form rendering, validation, submission, errors, loading |
| Frontend Vitest | `ProtectedRoute.test.tsx` | 9 | Auth guard, role redirect, loading, checkAuth |
| Frontend Vitest | `authStore.test.ts` | 25 | Login/logout state, token persistence, checkAuth, refreshUser |
| Frontend Vitest | `ForcePasswordChange.test.tsx` | 7 | Force password change component |
| Frontend Vitest | `ForgotPasswordPage.test.tsx` | 14 | Forgot password page |
| Frontend Vitest | `ResetPasswordPage.test.tsx` | 19 | Reset password page |
| Frontend Vitest | `ResetPasswordModal.test.tsx` | 9 | Admin reset password modal |
| Playwright E2E | `auth.spec.ts` | 9 | Login form, protected routes, logout, session persistence |
| Playwright E2E | `auth-edge-cases.spec.ts` | 8 | Force password change modal, lockout warning/lock, post-logout protection |
| Playwright E2E | `password-flows.spec.ts` | 7 | Forgot password, reset password UI, validation |
| Cypress E2E | `role-access-control.cy.ts` | 42 | ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN UI/API access |
| **TOTAL** | | **323** | |

**Changes from previous baseline (288):**
- `auth.routes.test.ts`: 49 -> 59 (added 10 audit log verification tests for LOGIN, LOGOUT, PASSWORD_CHANGE, FORCED_CHANGE, PASSWORD_RESET_REQUEST, PASSWORD_RESET, plus edge cases for deactivated user reset, inactive forgot-password, token boundary)
- `auth-edge-cases.spec.ts`: NEW file with 8 Playwright E2E tests (force password change modal, lockout warning, account locked message, post-logout protection)
- `data.routes.test.ts`: 15 tests covering getPatientOwnerFilter (PHYSICIAN, ADMIN, STAFF, ADMIN+PHYSICIAN scoping)
- `admin.routes.test.ts`: 2 tests covering GET /api/admin/audit-log endpoint with pagination

---

## Requirements

### REQ-TEST-01: Login Flow — Valid Credentials

**User Story:** As a QA engineer, I want every valid login scenario to have automated test coverage, so that regressions in the authentication happy path are detected immediately.

#### Acceptance Criteria

1. WHEN a user submits valid email and password THEN the system SHALL return HTTP 200 with a JWT token, user object, and mustChangePassword flag.
2. WHEN login succeeds THEN the system SHALL update the user's lastLoginAt timestamp.
3. WHEN login succeeds THEN the system SHALL reset failedLoginAttempts to 0 and clear lockedUntil.
4. WHEN a PHYSICIAN logs in THEN the response SHALL NOT include assignments and selectedPhysicianId SHALL equal the user's own ID.
5. WHEN a STAFF user logs in THEN the response SHALL include their physician assignments.
6. WHEN an ADMIN user logs in THEN the response SHALL include all active physicians as assignments.
7. WHEN an ADMIN+PHYSICIAN user logs in THEN the response SHALL include all active physicians as assignments.
8. WHEN login succeeds THEN the system SHALL create a LOGIN audit log entry with userId, userEmail, and ipAddress.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Frontend Vitest | Playwright | Cypress | Status |
|---|-----------|-------------|-----------------|------------|---------|--------|
| 1 | Valid login returns token | auth.routes.test L128-143 | authStore.test L99-120 | auth.spec L46-55 | -- | COVERED |
| 2 | lastLoginAt updated | auth.routes.test L131-132 (mock calls updateLastLogin) | -- | -- | -- | COVERED (unit only) |
| 3 | Reset failed attempts | auth.routes.test L433-446 | -- | -- | -- | COVERED |
| 4 | PHYSICIAN no assignments | -- | authStore.test L119 (selectedPhysicianId=own) | -- | -- | PARTIAL (Vitest only) |
| 5 | STAFF gets assignments | -- | authStore.test L137-154 | -- | -- | PARTIAL (Vitest only) |
| 6 | ADMIN gets all physicians | -- | -- | -- | -- | GAP |
| 7 | ADMIN+PHYSICIAN assignments | -- | -- | -- | -- | GAP |
| 8 | LOGIN audit log created | auth.routes.test "creates LOGIN audit log on successful login" | -- | -- | -- | COVERED |

#### Proposed New Tests

- **TC-01.6** (Backend Jest, auth.routes.test.ts): Verify ADMIN login returns all active physicians as assignments (mock getAllPhysicians, assert response.data.assignments).
- **TC-01.7** (Backend Jest, auth.routes.test.ts): Verify ADMIN+PHYSICIAN login returns all physicians as assignments (set testUser.roles=['ADMIN','PHYSICIAN'], assert response.data.assignments).
- **TC-01.4b** (Backend Jest, auth.routes.test.ts): Verify PHYSICIAN login does not include assignments in response (assert response.data.assignments is undefined).

---

### REQ-TEST-02: Login Flow — Invalid Credentials

**User Story:** As a QA engineer, I want every invalid login scenario to have test coverage, so that security-critical rejection paths cannot regress.

#### Acceptance Criteria

1. WHEN email does not exist in the system THEN the system SHALL return 401 INVALID_CREDENTIALS with generic message "Invalid email or password."
2. WHEN password is incorrect THEN the system SHALL return 401 INVALID_CREDENTIALS with generic message.
3. WHEN user account is deactivated (isActive=false) THEN the system SHALL return 401 INVALID_CREDENTIALS (not revealing deactivation status).
4. WHEN email format is invalid THEN the system SHALL return 400 VALIDATION_ERROR.
5. WHEN password is empty THEN the system SHALL return 400 VALIDATION_ERROR.
6. WHEN email is empty THEN the system SHALL return 400 VALIDATION_ERROR.
7. WHEN request body is missing THEN the system SHALL return 400.

#### Current Coverage

| # | Criterion | Backend Jest | Frontend Vitest | Playwright | Status |
|---|-----------|-------------|-----------------|------------|--------|
| 1 | Unknown email | auth.routes L145-155 | authStore L194-213 | auth.spec L17-27 | COVERED |
| 2 | Wrong password | auth.routes L157-168 | -- | -- | COVERED |
| 3 | Deactivated account | auth.routes L170-181 | -- | -- | COVERED |
| 4 | Invalid email format | auth.routes L183-190 | LoginPage (HTML5) | -- | COVERED |
| 5 | Empty password | auth.routes L197-199, 214-219 | LoginPage L124-135 | -- | COVERED |
| 6 | Empty email | auth.routes L200-206 | LoginPage L111-122 | -- | COVERED |
| 7 | Missing body | -- | -- | -- | GAP |

#### Proposed New Tests

- **TC-02.7** (Backend Jest): POST /api/auth/login with empty body returns 400.

---

### REQ-TEST-03: Account Lockout

**User Story:** As a QA engineer, I want the account lockout mechanism (5 failed attempts, 15-minute lockout) to be fully tested, so that brute-force protection cannot regress.

#### Acceptance Criteria

1. WHEN a user fails login THEN the system SHALL increment failedLoginAttempts by 1.
2. WHEN failedLoginAttempts reaches 5 THEN the system SHALL lock the account for 15 minutes (set lockedUntil).
3. WHEN a locked account attempts login THEN the system SHALL return 401 ACCOUNT_LOCKED with descriptive message.
4. WHEN a lock has expired (lockedUntil is in the past) THEN the system SHALL allow login.
5. WHEN a user successfully logs in THEN the system SHALL reset failedLoginAttempts to 0 and clear lockedUntil.
6. WHEN 3 failed attempts have occurred (but fewer than 5) THEN the system SHALL include a warning suggesting password reset.
7. WHEN account is locked THEN the system SHALL create an ACCOUNT_LOCKED audit log entry with reason "TOO_MANY_FAILED_ATTEMPTS."
8. IF lockedUntil is null THEN isAccountLocked() SHALL return false.
9. IF lockedUntil is in the future THEN isAccountLocked() SHALL return true.
10. IF lockedUntil is exactly now (boundary) THEN isAccountLocked() SHALL return false (lock expired).

#### Current Coverage

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | Increment attempts | auth.routes L401-414 (implicit via mock) | COVERED |
| 2 | Lock at 5 | auth.routes L401-414 | COVERED |
| 3 | Locked account rejected | auth.routes L386-398 | COVERED |
| 4 | Expired lock allows login | auth.routes L448-463 | COVERED |
| 5 | Reset on success | auth.routes L433-446 | COVERED |
| 6 | Warning at 3 | auth.routes L417-431 | COVERED |
| 7 | ACCOUNT_LOCKED audit | auth.routes L482-503 | COVERED |
| 8 | Null lockedUntil | authService L270-273 | COVERED |
| 9 | Future lockedUntil | authService L260-263 | COVERED |
| 10 | Boundary (now) | authService L274-278 | COVERED |

**Status: FULLY COVERED.** No new tests needed.

---

### REQ-TEST-04: JWT Token Lifecycle

**User Story:** As a QA engineer, I want JWT creation, validation, expiration, and rejection paths to have unit-level coverage, so that token-based authentication cannot regress.

#### Acceptance Criteria

1. WHEN generateToken is called THEN the resulting JWT SHALL contain userId, email, and roles in its payload.
2. WHEN generateToken is called with multiple roles THEN all roles SHALL appear in the payload.
3. WHEN verifyToken is called with a valid token THEN it SHALL return the decoded payload.
4. WHEN verifyToken is called with an invalid token THEN it SHALL return null.
5. WHEN verifyToken is called with a malformed string THEN it SHALL return null.
6. WHEN verifyToken is called with a token signed by a different secret THEN it SHALL return null.
7. WHEN verifyToken is called with an expired token THEN it SHALL return null.
8. WHEN verifyToken is called with an empty string THEN it SHALL return null.
9. WHEN the JWT_EXPIRES_IN configuration is set THEN tokens SHALL be created with that expiration.
10. WHEN a request includes a valid Bearer token THEN requireAuth SHALL attach the user to req.user and call next().
11. WHEN a request includes an expired or invalid token THEN requireAuth SHALL return 401.
12. WHEN a request has no Authorization header THEN requireAuth SHALL return 401.
13. WHEN a request uses "Basic" scheme instead of "Bearer" THEN requireAuth SHALL return 401.
14. WHEN a token references a user that no longer exists THEN requireAuth SHALL return 401 USER_NOT_FOUND.
15. WHEN a token references a deactivated user THEN requireAuth SHALL return 401 USER_DEACTIVATED.
16. WHEN the frontend stores a token and the page is refreshed THEN checkAuth SHALL verify the token against GET /api/auth/me and restore the session.
17. WHEN the stored token is invalid or expired THEN checkAuth SHALL clear auth state and remove the token from localStorage.

#### Current Coverage

| # | Criterion | Backend Jest | Frontend Vitest | Playwright | Status |
|---|-----------|-------------|-----------------|------------|--------|
| 1 | Payload content | authService L67-79 | -- | -- | COVERED |
| 2 | Multiple roles | authService L81-93 | -- | -- | COVERED |
| 3 | Valid token | authService L98-112 | -- | -- | COVERED |
| 4 | Invalid token | authService L114-117 | -- | -- | COVERED |
| 5 | Malformed | authService L119-122 | -- | -- | COVERED |
| 6 | Wrong secret | authService L124-134 | -- | -- | COVERED |
| 7 | Expired | authService L136-146 | -- | -- | COVERED |
| 8 | Empty string | authService L148-151 | -- | -- | COVERED |
| 9 | Expiration config | -- | -- | -- | GAP |
| 10 | requireAuth happy | -- (ESM mock limitation) | -- | auth.spec L46-55 | PARTIAL (E2E only) |
| 11 | requireAuth invalid | auth.test L62-73 | -- | -- | COVERED |
| 12 | No header | auth.test L38-48 | -- | auth.spec L73-84 | COVERED |
| 13 | Basic scheme | auth.test L50-60 | -- | -- | COVERED |
| 14 | User not found | -- (ESM mock limitation) | -- | -- | GAP |
| 15 | Deactivated user | -- (ESM mock limitation) | -- | -- | GAP |
| 16 | checkAuth restore | -- | authStore L342-360 | auth.spec L124-139 | COVERED |
| 17 | checkAuth invalid | -- | authStore L362-373 | -- | COVERED |

#### Proposed New Tests

- **TC-04.9** (Backend Jest): Verify generateToken creates token with correct `exp` claim matching config.jwtExpiresIn.
- **TC-04.14** (Backend Jest, auth.routes): Verify /api/auth/me returns 401 when user is deleted between token issuance and request (mock findUserById returning null).
- **TC-04.15** (Backend Jest, auth.routes): Verify /api/auth/me returns 401 when user is deactivated between token issuance and request.

**Note:** Criteria 10, 14, 15 have limited unit coverage due to ESM mocking limitations. The auth.routes.test.ts mock middleware approach covers them indirectly for route-level tests. E2E tests serve as the primary safety net.

---

### REQ-TEST-05: Password Flows — Change Password

**User Story:** As a QA engineer, I want the password change flow to be fully tested, so that users can securely update their passwords without regression.

#### Acceptance Criteria

1. WHEN an authenticated user submits correct current password and valid new password THEN the system SHALL update the password and return 200.
2. WHEN the current password is incorrect THEN the system SHALL return 401 INVALID_PASSWORD.
3. WHEN the new password is the same as the current password THEN the system SHALL return 400 SAME_PASSWORD.
4. WHEN the new password is shorter than 8 characters THEN the system SHALL return 400 VALIDATION_ERROR.
5. WHEN password is changed THEN the system SHALL create a PASSWORD_CHANGE audit log entry.
6. WHEN password is changed THEN the system SHALL clear the mustChangePassword flag.
7. WHEN an unauthenticated user calls PUT /api/auth/password THEN the system SHALL return 401.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | Successful change | auth.routes.test L579-593 | COVERED |
| 2 | Wrong current | auth.routes.test L595-605 | COVERED |
| 3 | Same password | auth.routes.test L607-619 | COVERED |
| 4 | Short password | auth.routes.test L621-627 | COVERED |
| 5 | Audit log | auth.routes.test "creates PASSWORD_CHANGE audit log on voluntary password change" | **COVERED** (was GAP) |
| 6 | Clear mustChangePassword | -- | GAP |
| 7 | Unauthenticated | auth.routes.test L571-577 | COVERED |

**Analysis:** The PASSWORD_CHANGE audit log test was added in a recent commit. The mustChangePassword flag clearing is verified implicitly (the source code at auth.routes.ts L310-313 does `prisma.user.update({ mustChangePassword: false })`), but no test explicitly asserts this mock call.

#### Proposed New Tests

- **TC-05.6** (Backend Jest, auth.routes.test.ts): Verify PUT /api/auth/password calls `prisma.user.update` with `{ mustChangePassword: false }` after successful password change.

---

### REQ-TEST-06: Password Flows — Forgot Password & Reset

**User Story:** As a QA engineer, I want the forgot/reset password flow to be tested end-to-end at the API level, so that the email-based reset mechanism is protected against abuse.

#### Acceptance Criteria

1. WHEN SMTP is not configured and /forgot-password is called THEN the system SHALL return 400 SMTP_NOT_CONFIGURED.
2. WHEN SMTP is configured and email exists THEN the system SHALL create a PasswordResetToken (1-hour expiry), send email, create audit entry, and return 200.
3. WHEN SMTP is configured and email does NOT exist THEN the system SHALL return 200 (prevent email enumeration).
4. WHEN /reset-password is called with a valid, unused, non-expired token THEN the system SHALL update password, mark token used, create audit entry, and return 200.
5. WHEN /reset-password is called with an invalid token THEN the system SHALL return 400 INVALID_TOKEN.
6. WHEN /reset-password is called with an expired token THEN the system SHALL return 400 TOKEN_EXPIRED.
7. WHEN /reset-password is called with an already-used token THEN the system SHALL return 400 TOKEN_USED.
8. WHEN /reset-password is called with password shorter than 8 chars THEN the system SHALL return 400.
9. WHEN /reset-password is called for a deactivated user THEN the system SHALL return 400 USER_NOT_FOUND.
10. WHEN the SMTP status endpoint is called THEN it SHALL return the current SMTP configuration state.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Playwright | Status |
|---|-----------|-------------|------------|--------|
| 1 | No SMTP | auth.routes.test L646-654 | -- | COVERED |
| 2 | Valid forgot | auth.routes.test "creates PASSWORD_RESET_REQUEST audit log for forgot-password" | password-flows (partial) | **COVERED** (was GAP) |
| 3 | Non-existent email | auth.routes.test L657-667 | -- | COVERED |
| 4 | Valid reset | auth.routes.test L753-772 | -- | COVERED |
| 5 | Invalid token | auth.routes.test L708-717 | password-flows L63-79 | COVERED |
| 6 | Expired token | auth.routes.test L719-734 | -- | COVERED |
| 7 | Used token | auth.routes.test L736-751 | -- | COVERED |
| 8 | Short password | auth.routes.test L700-706 | password-flows L82-93 | COVERED |
| 9 | Deactivated user | auth.routes.test "reset-password returns USER_NOT_FOUND for inactive user" | -- | **COVERED** (was GAP) |
| 10 | SMTP status | auth.routes.test L633-641 | -- | COVERED |

**Analysis:** Both previous gaps have been filled:
- TC-06.2: The test "creates PASSWORD_RESET_REQUEST audit log for forgot-password" (auth.routes.test L908-926) mocks SMTP as configured, provides an active user, and verifies the audit log creation with action='PASSWORD_RESET_REQUEST'. It also implicitly verifies token creation via `mockPrisma.passwordResetToken.create`.
- TC-06.9: The test "reset-password returns USER_NOT_FOUND for inactive user" (auth.routes.test L978-994) verifies a valid token for an inactive user returns 400 USER_NOT_FOUND.
- Additionally, "forgot-password for inactive user returns success but skips email" (auth.routes.test L996-1011) verifies the anti-enumeration behavior for deactivated accounts.

**Status: FULLY COVERED.** No new tests needed.

---

### REQ-TEST-07: Password Flows — Force Change Password

**User Story:** As a QA engineer, I want the forced password change flow (admin-initiated temp passwords) to be fully tested, so that the first-login password change requirement cannot be bypassed.

#### Acceptance Criteria

1. WHEN an authenticated user with mustChangePassword=true submits POST /force-change-password with valid new password THEN the system SHALL update the password, clear mustChangePassword, create audit entry, and return 200.
2. WHEN mustChangePassword is false THEN the system SHALL return 400 NOT_REQUIRED.
3. WHEN the new password is shorter than 8 characters THEN the system SHALL return 400.
4. WHEN an unauthenticated user calls /force-change-password THEN the system SHALL return 401.
5. WHEN mustChangePassword is true THEN the ProtectedRoute component SHALL render the ForcePasswordChange component instead of the child route.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Frontend Vitest | Playwright E2E | Status |
|---|-----------|-------------|-----------------|----------------|--------|
| 1 | Successful force change | auth.routes.test L786-801 | ForcePasswordChange tests | auth-edge-cases "successful force-change redirects to login" | COVERED |
| 2 | Not required | auth.routes.test L803-812 | -- | -- | COVERED |
| 3 | Short password | auth.routes.test L814-820 | ForcePasswordChange "shows error when password is too short" | auth-edge-cases "validates minimum password length" | COVERED |
| 4 | Unauthenticated | auth.routes.test L778-781 | -- | -- | COVERED |
| 5 | ProtectedRoute renders FPC | -- | -- | auth-edge-cases "shows force-change modal when mustChangePassword is true" | **COVERED via E2E** (was GAP) |

**Analysis:** The Playwright `auth-edge-cases.spec.ts` file (8 tests) was added since the original baseline and provides E2E coverage for the ForcePasswordChange flow:
- "shows force-change modal when mustChangePassword is true" — intercepts login API to return mustChangePassword=true, verifies "Password Change Required" modal renders with input fields and button. This covers criterion #5 at the E2E level.
- "validates minimum password length in force-change modal" — verifies client-side validation.
- "validates password mismatch in force-change modal" — verifies mismatch error.
- "successful force-change redirects to login" — full happy path through modal to redirect.

#### Proposed New Tests

- **TC-07.5** (Frontend Vitest, ProtectedRoute.test.tsx): Verify ProtectedRoute renders ForcePasswordChange component when `mustChangePassword` is true in auth store. While E2E coverage exists, a Vitest unit test would provide faster feedback and isolate the component behavior from API mocking.

**Priority: LOW** — E2E coverage exists; unit test adds defense-in-depth only.

---

### REQ-TEST-08: Role-Based Access Control — Route Protection

**User Story:** As a QA engineer, I want every role-based route protection rule to have automated coverage, so that unauthorized access to pages and APIs cannot regress.

#### Acceptance Criteria

1. WHEN a user without ADMIN role accesses /admin THEN the system SHALL redirect to / (PHYSICIAN, STAFF) or /admin (ADMIN).
2. WHEN a user without ADMIN role calls any /api/admin/* endpoint THEN the system SHALL return 403 FORBIDDEN.
3. WHEN an unauthenticated user accesses any protected route THEN the system SHALL redirect to /login.
4. WHEN an unauthenticated user calls any protected API THEN the system SHALL return 401.
5. WHEN a PHYSICIAN accesses /admin THEN the ProtectedRoute SHALL redirect to /.
6. WHEN a STAFF accesses /admin THEN the ProtectedRoute SHALL redirect to /.
7. WHEN an ADMIN accesses a physician-only route THEN the ProtectedRoute SHALL redirect to /admin.
8. WHEN a user has multiple roles (ADMIN+PHYSICIAN) THEN they SHALL have access to both ADMIN and PHYSICIAN routes.
9. WHEN requireRole middleware receives a user without any matching role THEN it SHALL return 403.
10. WHEN requireRole middleware receives no user THEN it SHALL return 401.
11. WHEN requireRole receives multiple allowed roles and user has one THEN it SHALL call next() (allow).

#### Current Coverage

| # | Criterion | Backend Jest | Frontend Vitest | Playwright | Cypress | Status |
|---|-----------|-------------|-----------------|------------|---------|--------|
| 1 | Non-ADMIN redirect | -- | ProtectedRoute L129-149 | auth.spec L86-97 | role-access L111-118 | COVERED |
| 2 | Non-ADMIN API 403 | -- | -- | -- | -- | GAP |
| 3 | Unauth redirect | -- | ProtectedRoute L70-83 | auth.spec L73-97 | role-access L336-360 | COVERED |
| 4 | Unauth API 401 | -- | -- | -- | role-access L265-279 | COVERED |
| 5 | PHYSICIAN redirect | -- | ProtectedRoute L129-149 | -- | role-access L111-114 | COVERED |
| 6 | STAFF redirect | -- | -- | -- | role-access L155-159 | COVERED |
| 7 | ADMIN → /admin | -- | ProtectedRoute L152-173 | -- | -- | COVERED |
| 8 | Dual role access | -- | -- | -- | role-access L234-260 | COVERED |
| 9 | No matching role | auth.test L93-106 | -- | -- | -- | COVERED |
| 10 | No user | auth.test L80-91 | -- | -- | -- | COVERED |
| 11 | Multiple allowed | auth.test L108-145 | -- | -- | -- | COVERED |

#### Proposed New Tests

- **TC-08.2a** (Cypress E2E): PHYSICIAN calls /api/admin/users with valid token, expects 403.
- **TC-08.2b** (Cypress E2E): STAFF calls /api/admin/users with valid token, expects 403.
- **TC-08.2c** (Cypress E2E): Verify admin-only API routes (/api/admin/audit-log, /api/admin/patients/bulk-assign) return 403 for non-ADMIN roles.

---

### REQ-TEST-09: Role-Based Access Control — Data Scoping

**User Story:** As a QA engineer, I want data scoping by role (PHYSICIAN sees own, STAFF sees assigned, ADMIN sees all) to have comprehensive test coverage, so that patient data isolation cannot regress.

#### Acceptance Criteria

1. WHEN a PHYSICIAN calls /api/data THEN the system SHALL return only their own patients (ownerId = user.id), regardless of physicianId query param.
2. WHEN a STAFF user calls /api/data with a valid assigned physicianId THEN the system SHALL return that physician's patients.
3. WHEN a STAFF user calls /api/data without physicianId THEN the system SHALL return 400 MISSING_PHYSICIAN_ID.
4. WHEN a STAFF user calls /api/data with physicianId=unassigned THEN the system SHALL return 403 FORBIDDEN.
5. WHEN a STAFF user calls /api/data with a physicianId they are NOT assigned to THEN the system SHALL return 403 NOT_ASSIGNED.
6. WHEN an ADMIN calls /api/data with physicianId=unassigned THEN the system SHALL return unassigned patients (ownerId=null).
7. WHEN an ADMIN calls /api/data with a specific physicianId THEN the system SHALL return that physician's patients.
8. WHEN an ADMIN calls /api/data without physicianId THEN the system SHALL return 400 MISSING_PHYSICIAN_ID.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Cypress | Status |
|---|-----------|-------------|---------|--------|
| 1 | PHYSICIAN scoping | data.routes.test "auto-filters to own patients" + "ignores physicianId query param" | role-access L296-315 | **COVERED** (was PARTIAL) |
| 2 | STAFF valid physician | data.routes.test "can view assigned physician data" | role-access L217-225 | **COVERED** (was PARTIAL) |
| 3 | STAFF missing physicianId | data.routes.test "requires physicianId param" (STAFF) | -- | **COVERED** (was GAP) |
| 4 | STAFF unassigned 403 | data.routes.test "cannot view unassigned patients (403)" | role-access L281-294 | COVERED |
| 5 | STAFF not assigned 403 | data.routes.test "cannot view non-assigned physician data (403)" | -- | **COVERED** (was GAP) |
| 6 | ADMIN unassigned | data.routes.test "can view unassigned patients (physicianId=unassigned)" | role-access L317-330 | COVERED |
| 7 | ADMIN specific physician | data.routes.test "can view any physician by ID" | role-access L67-81 | COVERED |
| 8 | ADMIN missing physicianId | data.routes.test "requires physicianId param" (ADMIN) | -- | **COVERED** (was GAP) |

**Analysis:** All 5 previously identified gaps are now filled. The `data.routes.test.ts` file contains a comprehensive "Role-based data filtering (getPatientOwnerFilter)" describe block (lines 780-963) with 15 tests across 4 role sub-groups:
- **PHYSICIAN** (2 tests): auto-filters to own, ignores physicianId param
- **ADMIN** (3 tests): requires physicianId, can view any physician, can view unassigned
- **STAFF** (4 tests): requires physicianId, can view assigned, cannot view unassigned (403), cannot view non-assigned (403)
- **ADMIN+PHYSICIAN** (3 tests): gets ADMIN behavior, can view unassigned, requires physicianId

Additional coverage: 3 ADMIN+PHYSICIAN dual-role tests verify that the ADMIN branch takes precedence.

**Status: FULLY COVERED.** No new tests needed.

---

### REQ-TEST-10: Audit Logging

**User Story:** As a QA engineer, I want audit logging for all security-relevant actions to have test coverage, so that accountability requirements are enforced and cannot regress.

#### Acceptance Criteria

1. WHEN a user logs in successfully THEN the system SHALL create a LOGIN audit log entry.
2. WHEN a user fails to log in THEN the system SHALL create a LOGIN_FAILED audit log entry with reason (INVALID_CREDENTIALS, ACCOUNT_LOCKED, ACCOUNT_DEACTIVATED).
3. WHEN an account is locked THEN the system SHALL create an ACCOUNT_LOCKED audit log entry.
4. WHEN a user logs out THEN the system SHALL create a LOGOUT audit log entry.
5. WHEN a user changes their password THEN the system SHALL create a PASSWORD_CHANGE audit log entry.
6. WHEN a user requests a password reset THEN the system SHALL create a PASSWORD_RESET_REQUEST audit log entry.
7. WHEN a password is reset via token THEN the system SHALL create a PASSWORD_RESET audit log entry.
8. WHEN a force password change occurs THEN the system SHALL create a PASSWORD_CHANGE audit log entry with details.reason=FORCED_CHANGE.
9. IF audit log creation fails THEN the primary operation (login, logout, etc.) SHALL NOT be blocked.
10. Audit log entries SHALL NOT contain the attempted password.
11. Audit log entries SHALL include ipAddress when available.
12. WHEN an ADMIN accesses /api/admin/audit-log THEN the system SHALL return paginated audit log entries.
13. WHEN /api/admin/audit-log is called with filter parameters (action, entity, userId, date range) THEN the system SHALL filter results accordingly.

#### Current Coverage (verified 2026-02-27)

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | LOGIN | auth.routes.test "creates LOGIN audit log on successful login" | **COVERED** |
| 2 | LOGIN_FAILED | auth.routes.test "Failed login audit logging" (6 tests) | COVERED |
| 3 | ACCOUNT_LOCKED | auth.routes.test "creates ACCOUNT_LOCKED audit log on lockout" | COVERED |
| 4 | LOGOUT | auth.routes.test "creates LOGOUT audit log on successful logout" | **COVERED** (was PARTIAL) |
| 5 | PASSWORD_CHANGE | auth.routes.test "creates PASSWORD_CHANGE audit log on voluntary password change" | **COVERED** (was GAP) |
| 6 | PASSWORD_RESET_REQUEST | auth.routes.test "creates PASSWORD_RESET_REQUEST audit log for forgot-password" | **COVERED** (was GAP) |
| 7 | PASSWORD_RESET | auth.routes.test "creates PASSWORD_RESET audit log on successful password reset" | **COVERED** (was GAP) |
| 8 | FORCED_CHANGE | auth.routes.test "creates PASSWORD_CHANGE audit log with FORCED_CHANGE on force-change" | **COVERED** (was GAP) |
| 9 | Audit failure non-blocking | auth.routes.test "audit log failure does not block login response" | COVERED |
| 10 | No password in log | auth.routes.test "does not log attempted password in audit log" | COVERED |
| 11 | IP address in log | auth.routes.test "includes IP address in audit log entry" | COVERED |
| 12 | Audit log endpoint | admin.routes.test "returns paginated audit log entries" | **COVERED** (was GAP) |
| 13 | Audit log filters | admin.routes.test "supports pagination params" | **PARTIAL** (pagination only, no action/entity/date filters) |

**Analysis:** 6 of the 7 previously identified gaps have been filled. The `auth.routes.test.ts` "Audit logging for successful operations" describe block (lines 823-954) contains 7 explicit audit log verification tests. The `admin.routes.test.ts` file contains 2 tests for GET /api/admin/audit-log, but only verifies pagination parameters (page, limit), not filter parameters (action, entity, userId, date range).

#### Proposed New Tests

- **TC-10.13** (Backend Jest, admin.routes.test.ts): Verify GET /api/admin/audit-log supports filtering by action, entity, userId, and date range query parameters (verify `prisma.auditLog.findMany` is called with correct `where` clause).

**Priority: MEDIUM** — The endpoint works and has basic pagination coverage; filter tests add regression safety for the query builder logic.

---

### REQ-TEST-11: CORS Configuration

**User Story:** As a QA engineer, I want CORS configuration to have test coverage, so that cross-origin security policies cannot silently break.

#### Acceptance Criteria

1. WHEN NODE_ENV=production and CORS_ORIGIN is set THEN the system SHALL only allow origins in the comma-separated whitelist.
2. WHEN NODE_ENV=production and CORS_ORIGIN is NOT set THEN the system SHALL allow all origins (for Render deployment behind proxy).
3. WHEN NODE_ENV=development THEN the system SHALL allow localhost:5173 and localhost:3000.
4. The CORS configuration SHALL include credentials: true.

#### Current Coverage

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | Whitelist | -- | GAP |
| 2 | Default allow all | -- | GAP |
| 3 | Dev localhost | -- | GAP |
| 4 | Credentials | -- | GAP |

#### Proposed New Tests

- **TC-11.1** (Backend Jest): Integration test — set NODE_ENV=production, CORS_ORIGIN="https://example.com", verify request from https://example.com gets CORS headers and request from https://evil.com is rejected.
- **TC-11.2** (Backend Jest): Integration test — set NODE_ENV=production with no CORS_ORIGIN, verify all origins allowed.
- **TC-11.3** (Backend Jest): Integration test — set NODE_ENV=development, verify localhost:5173 and localhost:3000 get CORS headers.
- **TC-11.4** (Backend Jest): Verify cors options include `credentials: true`.

---

### REQ-TEST-12: Helmet.js Security Headers

**User Story:** As a QA engineer, I want security headers applied by Helmet.js to be tested, so that HTTP security posture cannot degrade without detection.

#### Acceptance Criteria

1. WHEN any API response is returned THEN it SHALL include X-Content-Type-Options: nosniff.
2. WHEN any API response is returned THEN it SHALL include X-Frame-Options header (DENY or SAMEORIGIN).
3. WHEN any API response is returned THEN it SHALL include Strict-Transport-Security header.
4. WHEN any API response is returned THEN it SHALL NOT include X-Powered-By header (Helmet removes it).
5. The contentSecurityPolicy SHALL be disabled (set to false per app.ts configuration).

#### Current Coverage

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | X-Content-Type-Options | -- | GAP |
| 2 | X-Frame-Options | -- | GAP |
| 3 | HSTS | -- | GAP |
| 4 | No X-Powered-By | -- | GAP |
| 5 | CSP disabled | -- | GAP |

#### Proposed New Tests

- **TC-12.1** (Backend Jest): Verify API response includes X-Content-Type-Options: nosniff.
- **TC-12.2** (Backend Jest): Verify API response includes X-Frame-Options header.
- **TC-12.3** (Backend Jest): Verify API response includes Strict-Transport-Security header.
- **TC-12.4** (Backend Jest): Verify API response does NOT include X-Powered-By header.
- **TC-12.5** (Backend Jest): Verify API response does NOT include Content-Security-Policy header (CSP disabled).

---

### REQ-TEST-13: Role Combinations & UI Behavior

**User Story:** As a QA engineer, I want every valid role combination's UI behavior to be tested, so that the user experience for each role cannot regress.

#### Acceptance Criteria

1. WHEN ADMIN is logged in THEN the header SHALL display "(ADMIN)" badge, Admin nav link, "Viewing provider:" label, and a physician dropdown with "Unassigned patients" option.
2. WHEN PHYSICIAN is logged in THEN the header SHALL display "(PHYSICIAN)" badge, NO Admin nav link, NO physician dropdown, NO "Viewing provider:" label.
3. WHEN STAFF is logged in THEN the header SHALL display "(STAFF)" badge, NO Admin nav link, "Viewing as:" label, and a physician dropdown without "Unassigned patients" option containing only assigned physicians.
4. WHEN ADMIN+PHYSICIAN is logged in THEN the header SHALL display "(ADMIN + PHYSICIAN)" badge, Admin nav link, "Viewing provider:" label, and full physician dropdown.
5. WHEN STAFF has a single physician assignment THEN the dropdown SHALL show that physician.
6. WHEN STAFF has multiple physician assignments THEN the dropdown SHALL show all and allow switching.
7. WHEN any role visits /patient-management THEN the page SHALL load successfully.

#### Current Coverage

All 7 criteria are fully covered by Cypress `role-access-control.cy.ts` (42 tests across 7 describe blocks).

**Status: FULLY COVERED.** No new tests needed.

---

### REQ-TEST-14: Frontend Auth State Management

**User Story:** As a QA engineer, I want the Zustand auth store's state transitions to be fully tested, so that client-side auth behavior cannot regress.

#### Acceptance Criteria

1. WHEN the store initializes THEN user, token, isAuthenticated, assignments, and selectedPhysicianId SHALL all be null/false/empty.
2. WHEN login succeeds THEN the store SHALL update user, token, isAuthenticated, and remove error.
3. WHEN login fails THEN the store SHALL set error message, clear user and token.
4. WHEN logout is called THEN the store SHALL clear all auth state and remove token from localStorage.
5. WHEN logout API call fails THEN the store SHALL still clear local state.
6. WHEN checkAuth finds no token THEN it SHALL return false and set isAuthenticated to false.
7. WHEN checkAuth finds a valid token THEN it SHALL restore user, set isAuthenticated to true.
8. WHEN checkAuth finds an invalid token THEN it SHALL clear state and remove token from localStorage.
9. WHEN STAFF logs in THEN selectedPhysicianId SHALL default to first assignment (or restored from localStorage if valid).
10. WHEN refreshUser is called with no token THEN it SHALL not make any API call.
11. WHEN refreshUser is called with expired token THEN it SHALL clear auth state.

#### Current Coverage

All 11 criteria are covered by `authStore.test.ts` (25 tests).

**Status: FULLY COVERED.** No new tests needed.

---

### REQ-TEST-15: Environment Variable Validation (REQ-SEC-04 + REQ-SEC-05)

**User Story:** As a QA engineer, I want to verify that the application validates critical environment variables at startup and rejects invalid/missing JWT secrets, so that misconfigured deployments fail fast with clear error messages.

#### Acceptance Criteria

1. **AC-15.1:** WHEN the application starts without `JWT_SECRET` set, THEN it SHALL throw an error and refuse to start.
2. **AC-15.2:** WHEN `JWT_SECRET` is set to a weak value (e.g., "secret", less than 32 characters), THEN the validation SHALL warn or reject.
3. **AC-15.3:** WHEN `DATABASE_URL` is missing, THEN startup validation SHALL fail with a descriptive error.
4. **AC-15.4:** WHEN all required environment variables are set with valid values, THEN validation SHALL pass silently.
5. **AC-15.5:** WHEN `NODE_ENV` is set to "production", THEN stricter validation rules SHALL apply.
6. **AC-15.6:** WHEN optional environment variables (SMTP_HOST, CORS_ORIGIN) are missing, THEN validation SHALL NOT fail.

#### Current Coverage

All 6 criteria are covered by `validateEnv.test.ts` (25 tests).

**Status: FULLY COVERED.** No new tests needed.

---

## Deferred / Out-of-Scope Items

### REQ-SEC-01: HTTPS/TLS Enforcement (DEFERRED)

HTTPS/TLS is handled by Render.com in production and by Nginx config in Docker. Application-level TLS enforcement is not implemented. **No tests should target this behavior.**

### REQ-SEC-03: Rate Limiting (DEFERRED)

Rate limiting is documented in the security-hardening spec but is **NOT implemented** in the current codebase. No `express-rate-limit` or equivalent middleware exists in app.ts or auth.routes.ts. Tests MUST NOT be written for this feature until it is implemented.

**Status:** DEFERRED. No tests should target this behavior.

### REQ-SEC-07: httpOnly JWT Cookies (DEFERRED)

The current implementation stores JWT tokens in localStorage on the frontend. The httpOnly cookie approach is documented as a future enhancement but is **NOT implemented**. The token is transmitted via Authorization: Bearer header, not via cookies.

**Status:** DEFERRED. No tests should target cookie-based JWT storage.

### REQ-SEC-08: Content Security Policy (DEFERRED)

CSP headers beyond basic Helmet defaults are not configured. **No tests should target custom CSP rules.**

### REQ-SEC-09: JWT Refresh Tokens (DEFERRED)

Token refresh mechanism is not implemented. The current JWT has a fixed 8-hour expiry with no refresh flow. **No tests should target refresh token behavior.**

### REQ-SEC-11: Hide Database Port (DEFERRED)

Database port exposure is a deployment configuration concern, not an application-level feature. **No tests should target this.**

### REQ-SEC-12: Field-Level Encryption (DEFERRED)

PHI field encryption at rest is not implemented. Data is protected by database-level access controls only. **No tests should target field-level encryption.**

---

## Non-Functional Requirements

### Performance

- **NFR-PERF-01:** Login API response time SHALL be less than 500ms under normal load (bcrypt hash comparison is the bottleneck; test with salt rounds=4 in test environment).
- **NFR-PERF-02:** JWT verification (verifyToken) SHALL complete in less than 5ms (synchronous operation).
- **NFR-PERF-03:** Audit log writes SHALL be fire-and-forget and SHALL NOT add latency to the primary operation.

### Security

- **NFR-SEC-01:** Passwords SHALL be hashed with bcrypt using at least 12 salt rounds in production (4 in test).
- **NFR-SEC-02:** JWT secret SHALL be configurable via environment variable JWT_SECRET.
- **NFR-SEC-03:** Password reset tokens SHALL expire after 1 hour.
- **NFR-SEC-04:** The system SHALL NOT reveal whether an email exists during the forgot-password flow (anti-enumeration).
- **NFR-SEC-05:** Failed login responses SHALL use identical error messages for "user not found" and "wrong password" (anti-enumeration).
- **NFR-SEC-06:** Temporary passwords SHALL be 12 characters using crypto.randomBytes.

### Reliability

- **NFR-REL-01:** Audit log failures SHALL NOT block authentication operations.
- **NFR-REL-02:** Logout SHALL clear local state even if the server-side logout call fails.
- **NFR-REL-03:** checkAuth SHALL gracefully handle network failures by clearing auth state.

### Usability

- **NFR-USA-01:** Login page SHALL show loading state (spinner/disabled inputs) during authentication.
- **NFR-USA-02:** Password visibility toggle SHALL work on the login page.
- **NFR-USA-03:** After 3 failed login attempts, the user SHALL see a warning suggesting password reset.

---

## Integration Requirements

### Existing Systems to Integrate With

| System | Integration Point | Test Approach |
|--------|------------------|---------------|
| Prisma ORM | User, AuditLog, PasswordResetToken models | Mock prisma in Jest; real DB in E2E |
| Express middleware chain | requireAuth -> requireRole -> route handler | Supertest with mock middleware |
| Zustand auth store | Frontend state management | Vitest with mock API |
| React Router | ProtectedRoute component | Vitest with MemoryRouter |
| AG Grid page access | Grid data requires authenticated physicianId | Cypress E2E |
| Nodemailer (SMTP) | Password reset email | Mock emailService in Jest |

### Cross-Cutting Concerns

- All API routes except /api/health, /api/auth/login, /api/auth/smtp-status, /api/auth/forgot-password, and /api/auth/reset-password require authentication.
- Admin routes (/api/admin/*) additionally require ADMIN role.
- Data routes (/api/data/*) enforce per-role data scoping.

---

## Assumptions and Constraints

### Assumptions

1. The seeded database (prisma/seed.ts) provides test accounts for all role combinations: admin@gmail.com (ADMIN), adminphy@gmail.com (ADMIN+PHYSICIAN), phy1@gmail.com (PHYSICIAN), phy2@gmail.com (PHYSICIAN), staff1@gmail.com (STAFF, single assignment), staff2@gmail.com (STAFF, multi-assignment). All use password "welcome100".
2. ESM mocking limitations in Jest prevent full unit testing of middleware that depends on transitive imports (verifyToken, findUserById). E2E tests fill this gap.
3. SMTP email delivery cannot be tested in E2E; backend Jest tests mock the email service.
4. Cypress is used for AG Grid interactions; Playwright for general UI flows.

### Constraints

1. REQ-SEC-03 (Rate Limiting) is NOT implemented and MUST NOT have tests written.
2. REQ-SEC-07 (httpOnly JWT Cookies) is NOT implemented and MUST NOT have tests written.
3. Jest ESM module mocking requires `jest.unstable_mockModule` + dynamic imports for route-level tests.
4. Backend salt rounds MUST be set to 4 in test environment for speed (production uses 12).

---

## Coverage Matrix (verified 2026-02-27)

This matrix provides a complete overview of coverage status by requirement, layer, and test file.

| Requirement | Backend Jest | Frontend Vitest | Playwright E2E | Cypress E2E | Coverage % |
|-------------|-------------|-----------------|----------------|-------------|-----------|
| REQ-TEST-01: Login Valid | auth.routes.test (5/8 criteria) | authStore.test (2/8) | auth.spec (1/8) | -- | 75% (6/8) |
| REQ-TEST-02: Login Invalid | auth.routes.test (7/7) | LoginPage.test (3/7) | auth.spec (1/7) | -- | 100% (7/7)* |
| REQ-TEST-03: Account Lockout | auth.routes.test + authService.test (10/10) | -- | auth-edge-cases (3/10) | -- | 100% |
| REQ-TEST-04: JWT Lifecycle | authService.test (8/17), auth.test (4/17) | authStore.test (2/17) | auth.spec (2/17) | -- | 82% (14/17) |
| REQ-TEST-05: Password Change | auth.routes.test (6/7) | -- | -- | -- | 86% (6/7) |
| REQ-TEST-06: Forgot/Reset | auth.routes.test (10/10) | ForgotPasswordPage.test, ResetPasswordPage.test | password-flows (4/10) | -- | 100% |
| REQ-TEST-07: Force Change | auth.routes.test (4/5) | ForcePasswordChange.test (4/5) | auth-edge-cases (4/5) | -- | 100%* |
| REQ-TEST-08: Route Protection | auth.test (3/11) | ProtectedRoute.test (4/11) | auth.spec (2/11) | role-access (6/11) | 91% (10/11) |
| REQ-TEST-09: Data Scoping | data.routes.test (8/8) | -- | -- | role-access (4/8) | 100% |
| REQ-TEST-10: Audit Logging | auth.routes.test (11/13), admin.routes.test (1/13) | -- | -- | -- | 92% (12/13) |
| REQ-TEST-11: CORS | -- | -- | -- | -- | 0% (0/4) |
| REQ-TEST-12: Helmet Headers | -- | -- | -- | -- | 0% (0/5) |
| REQ-TEST-13: Role UI | -- | -- | -- | role-access (7/7) | 100% |
| REQ-TEST-14: Auth Store | -- | authStore.test (11/11) | -- | -- | 100% |
| REQ-TEST-15: Env Validation | validateEnv.test (6/6) | -- | -- | -- | 100% |
| **OVERALL** | | | | | **89% (120/134)** |

*Note: TC-02.7 (empty body) returns 400 but has no dedicated test; the Zod schema rejects it implicitly.
*Note: TC-07.5 (ProtectedRoute renders FPC) is covered by E2E (auth-edge-cases.spec.ts) but not by unit test.

---

## Gap Analysis (verified 2026-02-27)

### Gaps Closed Since Original Baseline

The following **19 gaps from the original spec** have been filled by tests added in recent commits:

| Original Gap ID | Category | How Filled |
|-----------------|----------|-----------|
| TC-09.1 | Data scoping: PHYSICIAN | data.routes.test "auto-filters to own patients" |
| TC-09.2 | Data scoping: STAFF valid | data.routes.test "can view assigned physician data" |
| TC-09.3 | Data scoping: STAFF missing param | data.routes.test "requires physicianId param" (STAFF) |
| TC-09.5 | Data scoping: STAFF not assigned | data.routes.test "cannot view non-assigned physician data" |
| TC-09.8 | Data scoping: ADMIN missing param | data.routes.test "requires physicianId param" (ADMIN) |
| TC-10.4 | Audit: LOGOUT | auth.routes.test "creates LOGOUT audit log on successful logout" |
| TC-10.5 | Audit: PASSWORD_CHANGE | auth.routes.test "creates PASSWORD_CHANGE audit log on voluntary password change" |
| TC-10.6 | Audit: PASSWORD_RESET_REQUEST | auth.routes.test "creates PASSWORD_RESET_REQUEST audit log for forgot-password" |
| TC-10.7 | Audit: PASSWORD_RESET | auth.routes.test "creates PASSWORD_RESET audit log on successful password reset" |
| TC-10.8 | Audit: FORCED_CHANGE | auth.routes.test "creates PASSWORD_CHANGE audit log with FORCED_CHANGE" |
| TC-10.12 | Audit: endpoint | admin.routes.test "returns paginated audit log entries" |
| TC-06.2 | Forgot: happy path | auth.routes.test "creates PASSWORD_RESET_REQUEST audit log" (also verifies token creation) |
| TC-06.9 | Reset: deactivated user | auth.routes.test "reset-password returns USER_NOT_FOUND for inactive user" |
| TC-05.5 | Password: audit log | auth.routes.test "creates PASSWORD_CHANGE audit log on voluntary password change" |
| TC-07.5 | ForcePasswordChange in ProtectedRoute | auth-edge-cases.spec.ts "shows force-change modal when mustChangePassword is true" (E2E) |
| -- | Lockout E2E: warning at 3 | auth-edge-cases.spec.ts "shows warning message after 3 failed attempts" |
| -- | Lockout E2E: account locked | auth-edge-cases.spec.ts "shows account locked message" |
| -- | Post-logout protection | auth-edge-cases.spec.ts "cannot access protected route after logout" |
| -- | Force password change E2E flows | auth-edge-cases.spec.ts (4 tests: modal render, validation, mismatch, success redirect) |

### Remaining Gaps (14 tests proposed)

| Priority | ID | Layer | Target File | Description | Estimated Effort |
|----------|-----|-------|-------------|-------------|-----------------|
| **HIGH** | TC-08.2a | Cypress E2E | role-access-control.cy.ts | PHYSICIAN calls /api/admin/users with valid token, expects 403 | Trivial |
| **HIGH** | TC-08.2b | Cypress E2E | role-access-control.cy.ts | STAFF calls /api/admin/users with valid token, expects 403 | Trivial |
| **HIGH** | TC-08.2c | Cypress E2E | role-access-control.cy.ts | Verify /api/admin/audit-log and /api/admin/patients/bulk-assign return 403 for non-ADMIN | Small |
| **MEDIUM** | TC-11.1 | Backend Jest | NEW: cors.test.ts | NODE_ENV=production + CORS_ORIGIN set: only whitelisted origin gets CORS headers | Medium |
| **MEDIUM** | TC-11.2 | Backend Jest | NEW: cors.test.ts | NODE_ENV=production + no CORS_ORIGIN: all origins allowed | Medium |
| **MEDIUM** | TC-11.3 | Backend Jest | NEW: cors.test.ts | NODE_ENV=development: localhost:5173 and localhost:3000 get CORS headers | Medium |
| **MEDIUM** | TC-11.4 | Backend Jest | NEW: cors.test.ts | CORS options include `credentials: true` | Small |
| **MEDIUM** | TC-12.1-5 | Backend Jest | NEW: securityHeaders.test.ts | Verify X-Content-Type-Options, X-Frame-Options, HSTS, no X-Powered-By, no CSP (5 tests in 1 file) | Small |
| **LOW** | TC-01.6 | Backend Jest | auth.routes.test.ts | ADMIN login returns all active physicians as assignments | Small |
| **LOW** | TC-01.7 | Backend Jest | auth.routes.test.ts | ADMIN+PHYSICIAN login returns all physicians as assignments | Small |
| **LOW** | TC-01.4b | Backend Jest | auth.routes.test.ts | PHYSICIAN login does not include assignments in response | Small |
| **LOW** | TC-04.9 | Backend Jest | authService.test.ts | generateToken creates token with correct `exp` claim | Small |
| **LOW** | TC-04.14-15 | Backend Jest | auth.routes.test.ts | /api/auth/me returns 401 for deleted/deactivated user (2 tests) | Small |
| **LOW** | TC-05.6 | Backend Jest | auth.routes.test.ts | PUT /api/auth/password calls prisma.user.update with mustChangePassword: false | Small |
| **LOW** | TC-10.13 | Backend Jest | admin.routes.test.ts | GET /api/admin/audit-log supports action, entity, userId, date range filters | Medium |
| **LOW** | TC-02.7 | Backend Jest | auth.routes.test.ts | POST /api/auth/login with empty body returns 400 | Trivial |
| **LOW** | TC-07.5 | Frontend Vitest | ProtectedRoute.test.tsx | ProtectedRoute renders ForcePasswordChange when mustChangePassword is true | Small |

---

## Proposed New Tests (detailed)

### HIGH Priority (3 tests)

**TC-08.2a-c** — Non-ADMIN API 403 enforcement (Cypress E2E, `role-access-control.cy.ts`)

These tests verify that authenticated non-ADMIN users receive 403 (not 401) when calling admin-only API endpoints. Currently, the Cypress test file only tests unauthenticated 401 responses, not authenticated-but-unauthorized 403 responses.

```
TC-08.2a: PHYSICIAN → GET /api/admin/users → 403
TC-08.2b: STAFF → GET /api/admin/users → 403
TC-08.2c: PHYSICIAN → GET /api/admin/audit-log → 403; PHYSICIAN → PATCH /api/admin/patients/bulk-assign → 403
```

### MEDIUM Priority (9 tests)

**TC-11.1-4** — CORS Configuration (Backend Jest, NEW file `cors.test.ts`)

These tests require importing the Express app and making supertest requests with different `Origin` headers while manipulating `NODE_ENV` and `CORS_ORIGIN` environment variables.

```
TC-11.1: Production + whitelist → only whitelisted origin gets Access-Control-Allow-Origin
TC-11.2: Production + no CORS_ORIGIN → all origins get Access-Control-Allow-Origin
TC-11.3: Development → localhost:5173 and localhost:3000 get Access-Control-Allow-Origin
TC-11.4: All modes → Access-Control-Allow-Credentials: true
```

**TC-12.1-5** — Helmet Security Headers (Backend Jest, NEW file `securityHeaders.test.ts`)

These tests make a supertest request to any endpoint (e.g., GET /api/health) and verify response headers.

```
TC-12.1: X-Content-Type-Options: nosniff
TC-12.2: X-Frame-Options present (DENY or SAMEORIGIN)
TC-12.3: Strict-Transport-Security present
TC-12.4: X-Powered-By NOT present
TC-12.5: Content-Security-Policy NOT present (CSP disabled)
```

### LOW Priority (8 tests)

**TC-01.4b, TC-01.6, TC-01.7** — Login assignment responses per role (Backend Jest, `auth.routes.test.ts`)

Add to existing POST /api/auth/login describe block. Mock `getAllPhysicians` and `getStaffAssignments` to return known values, then assert `response.body.data.assignments`.

**TC-04.9** — JWT expiration claim (Backend Jest, `authService.test.ts`)

Decode token with `jwt.decode()` and verify `exp` claim is approximately `Date.now()/1000 + 3600` (for '1h' config).

**TC-04.14-15** — /me endpoint with deleted/deactivated user (Backend Jest, `auth.routes.test.ts`)

Mock `findUserById` to return null (TC-04.14) or `{ isActive: false }` (TC-04.15) and verify 401 response. Note: these test the route handler's logic, not the middleware directly (ESM mock limitation).

**TC-05.6** — mustChangePassword flag clearing (Backend Jest, `auth.routes.test.ts`)

After successful PUT /api/auth/password, verify `mockPrisma.user.update` was called with `data: { mustChangePassword: false }`.

**TC-10.13** — Audit log filters (Backend Jest, `admin.routes.test.ts`)

Add tests verifying that query params `?action=LOGIN&userId=1&startDate=...&endDate=...` produce the correct `prisma.auditLog.findMany` where clause.

**TC-02.7** — Empty body (Backend Jest, `auth.routes.test.ts`)

POST /api/auth/login with no body → 400.

**TC-07.5** — ProtectedRoute ForcePasswordChange unit test (Frontend Vitest, `ProtectedRoute.test.tsx`)

Mock `mustChangePassword: true` in auth store, verify "Password Change Required" text renders.

---

**Total remaining gaps: 14 acceptance criteria across 6 requirements**
**Total new tests proposed: ~20** (some criteria share test cases)
**Current test count: 323**
**Projected total after gaps filled: ~343**

---

## Requirement Cross-Reference (updated 2026-02-27)

| Req ID | Title | Acceptance Criteria | Gaps (original) | Gaps (remaining) | New Tests Needed |
|--------|-------|--------------------:|----------------:|-----------------:|-----------------:|
| REQ-TEST-01 | Login — Valid | 8 | 3 | 2 | 3 |
| REQ-TEST-02 | Login — Invalid | 7 | 1 | 1 | 1 |
| REQ-TEST-03 | Account Lockout | 10 | 0 | 0 | 0 |
| REQ-TEST-04 | JWT Lifecycle | 17 | 3 | 3 | 3 |
| REQ-TEST-05 | Password Change | 7 | 2 | 1 | 1 |
| REQ-TEST-06 | Forgot/Reset | 10 | 2 | 0 | 0 |
| REQ-TEST-07 | Force Change | 5 | 1 | 0* | 1* |
| REQ-TEST-08 | Route Protection | 11 | 1 | 1 | 3 |
| REQ-TEST-09 | Data Scoping | 8 | 5 | 0 | 0 |
| REQ-TEST-10 | Audit Logging | 13 | 7 | 1 | 1 |
| REQ-TEST-11 | CORS | 4 | 4 | 4 | 4 |
| REQ-TEST-12 | Helmet Headers | 5 | 5 | 5 | 5 |
| REQ-TEST-13 | Role UI | 7 | 0 | 0 | 0 |
| REQ-TEST-14 | Auth Store | 11 | 0 | 0 | 0 |
| REQ-TEST-15 | Env Var Validation | 6 | 0 | 0 | 0 |
| **TOTAL** | | **129** | **34** | **18** | **~22** |

*TC-07.5 has E2E coverage but no unit test — counted as 0 gaps remaining but 1 test proposed for defense-in-depth.
