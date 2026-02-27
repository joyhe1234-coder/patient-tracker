# Requirements Document: Module 1 — Authentication & Security Comprehensive Test Plan

## Introduction

This specification consolidates all testable behaviors from the authentication, role-based access control, and security-hardening domains of the Patient Quality Measure Tracking System. Its purpose is to (a) map every implemented behavior to acceptance criteria, (b) audit current test coverage against those criteria to identify gaps, and (c) propose new test cases to fill those gaps. The deliverable is a structured test plan, not new application features.

The system currently has approximately 236 auth/security tests across four test layers. This spec will catalog what is covered, what is missing, and what is explicitly deferred (not implemented).

## Alignment with Product Vision

Product.md states: "JWT authentication with bcrypt password hashing, Role-based access control (PHYSICIAN, STAFF, ADMIN), Patient ownership (physicians see only their patients), Staff-to-physician assignment, Audit logging of user actions, Password reset via email (SMTP)." This test plan ensures every one of those stated capabilities has verifiable, automated test coverage, fulfilling the product's accountability and security goals.

---

## Current Test Inventory (Baseline)

| Layer | File | Test Count | Domain |
|-------|------|-----------|--------|
| Backend Jest | `authService.test.ts` | 22 | Password hashing, JWT, toAuthUser, lockout, temp password |
| Backend Jest | `auth.test.ts` (middleware) | 15 | requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| Backend Jest | `auth.routes.test.ts` | 49 | Login, logout, /me, password change, forgot/reset password, lockout, audit logging |
| Backend Jest | `emailService.test.ts` | 12 | Email service (SMTP, reset email) |
| Frontend Vitest | `LoginPage.test.tsx` | 18 | Login form rendering, validation, submission, errors, loading |
| Frontend Vitest | `ProtectedRoute.test.tsx` | 9 | Auth guard, role redirect, loading, checkAuth |
| Frontend Vitest | `authStore.test.ts` | 25 | Login/logout state, token persistence, checkAuth, refreshUser |
| Frontend Vitest | `ForcePasswordChange.test.tsx` | 7 | Force password change component |
| Frontend Vitest | `ForgotPasswordPage.test.tsx` | 14 | Forgot password page |
| Frontend Vitest | `ResetPasswordPage.test.tsx` | 19 | Reset password page |
| Frontend Vitest | `ResetPasswordModal.test.tsx` | 9 | Admin reset password modal |
| Playwright E2E | `auth.spec.ts` | 9 | Login form, protected routes, logout, session persistence |
| Playwright E2E | `password-flows.spec.ts` | 7 | Forgot password, reset password UI, validation |
| Cypress E2E | `role-access-control.cy.ts` | 42 | ADMIN, PHYSICIAN, STAFF, ADMIN+PHYSICIAN UI/API access |
| Backend Jest | `validateEnv.test.ts` | 25 | JWT secret, required env vars, startup validation |
| Backend Jest | `emailService.integration.test.ts` | 6 | SMTP integration, email delivery |
| **TOTAL** | | **288** | |

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

#### Current Coverage

| # | Criterion | Backend Jest | Frontend Vitest | Playwright | Cypress | Status |
|---|-----------|-------------|-----------------|------------|---------|--------|
| 1 | Valid login returns token | auth.routes L128-143 | authStore L99-120 | auth.spec L46-55 | -- | COVERED |
| 2 | lastLoginAt updated | auth.routes L131-132 (mock) | -- | -- | -- | COVERED (unit only) |
| 3 | Reset failed attempts | auth.routes L433-446 | -- | -- | -- | COVERED |
| 4 | PHYSICIAN no assignments | -- | authStore L119 | -- | -- | PARTIAL (Vitest only) |
| 5 | STAFF gets assignments | -- | authStore L137-154 | -- | -- | PARTIAL (Vitest only) |
| 6 | ADMIN gets all physicians | -- | -- | -- | -- | GAP |
| 7 | ADMIN+PHYSICIAN assignments | -- | -- | -- | -- | GAP |
| 8 | LOGIN audit log created | auth.routes L172-181 | -- | -- | -- | COVERED (unit only) |

#### Proposed New Tests

- **TC-01.6** (Backend Jest): Verify ADMIN login returns all active physicians as assignments.
- **TC-01.7** (Backend Jest): Verify ADMIN+PHYSICIAN login returns all physicians as assignments.
- **TC-01.4b** (Backend Jest): Verify PHYSICIAN login does not include assignments in response.

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

#### Current Coverage

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | Successful change | auth.routes L579-593 | COVERED |
| 2 | Wrong current | auth.routes L595-605 | COVERED |
| 3 | Same password | auth.routes L607-619 | COVERED |
| 4 | Short password | auth.routes L621-627 | COVERED |
| 5 | Audit log | -- | GAP |
| 6 | Clear mustChangePassword | -- | GAP |
| 7 | Unauthenticated | auth.routes L571-577 | COVERED |

#### Proposed New Tests

- **TC-05.5** (Backend Jest): Verify PUT /api/auth/password creates PASSWORD_CHANGE audit log entry on success.
- **TC-05.6** (Backend Jest): Verify PUT /api/auth/password clears mustChangePassword flag (mock prisma.user.update called with `{ mustChangePassword: false }`).

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

#### Current Coverage

| # | Criterion | Backend Jest | Playwright | Status |
|---|-----------|-------------|------------|--------|
| 1 | No SMTP | auth.routes L646-654 | -- | COVERED |
| 2 | Valid forgot | -- | password-flows (partial) | GAP (backend) |
| 3 | Non-existent email | auth.routes L657-667 | -- | COVERED |
| 4 | Valid reset | auth.routes L753-772 | -- | COVERED |
| 5 | Invalid token | auth.routes L708-717 | password-flows L63-79 | COVERED |
| 6 | Expired token | auth.routes L719-734 | -- | COVERED |
| 7 | Used token | auth.routes L736-751 | -- | COVERED |
| 8 | Short password | auth.routes L700-706 | password-flows L82-93 | COVERED |
| 9 | Deactivated user | -- | -- | GAP |
| 10 | SMTP status | auth.routes L633-641 | -- | COVERED |

#### Proposed New Tests

- **TC-06.2** (Backend Jest): Verify POST /forgot-password with SMTP configured and existing user creates a PasswordResetToken, calls sendPasswordResetEmail, and creates PASSWORD_RESET_REQUEST audit log.
- **TC-06.9** (Backend Jest): Verify POST /reset-password with valid token for deactivated user returns 400 USER_NOT_FOUND.

---

### REQ-TEST-07: Password Flows — Force Change Password

**User Story:** As a QA engineer, I want the forced password change flow (admin-initiated temp passwords) to be fully tested, so that the first-login password change requirement cannot be bypassed.

#### Acceptance Criteria

1. WHEN an authenticated user with mustChangePassword=true submits POST /force-change-password with valid new password THEN the system SHALL update the password, clear mustChangePassword, create audit entry, and return 200.
2. WHEN mustChangePassword is false THEN the system SHALL return 400 NOT_REQUIRED.
3. WHEN the new password is shorter than 8 characters THEN the system SHALL return 400.
4. WHEN an unauthenticated user calls /force-change-password THEN the system SHALL return 401.
5. WHEN mustChangePassword is true THEN the ProtectedRoute component SHALL render the ForcePasswordChange component instead of the child route.

#### Current Coverage

| # | Criterion | Backend Jest | Frontend Vitest | Status |
|---|-----------|-------------|-----------------|--------|
| 1 | Successful force change | auth.routes L786-801 | ForcePasswordChange tests | COVERED |
| 2 | Not required | auth.routes L803-812 | -- | COVERED |
| 3 | Short password | auth.routes L814-820 | -- | COVERED |
| 4 | Unauthenticated | auth.routes L778-781 | -- | COVERED |
| 5 | ProtectedRoute renders FPC | -- | -- | GAP |

#### Proposed New Tests

- **TC-07.5** (Frontend Vitest): Verify ProtectedRoute renders ForcePasswordChange component when mustChangePassword is true in auth store.

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

#### Current Coverage

| # | Criterion | Backend Jest | Cypress | Status |
|---|-----------|-------------|---------|--------|
| 1 | PHYSICIAN scoping | -- | role-access L296-315 | PARTIAL (E2E only) |
| 2 | STAFF valid physician | -- | role-access L217-225 (switch) | PARTIAL (E2E only) |
| 3 | STAFF missing physicianId | -- | -- | GAP |
| 4 | STAFF unassigned 403 | -- | role-access L281-294 | COVERED |
| 5 | STAFF not assigned 403 | -- | -- | GAP |
| 6 | ADMIN unassigned | -- | role-access L317-330 | COVERED |
| 7 | ADMIN specific physician | -- | role-access L67-81 | COVERED |
| 8 | ADMIN missing physicianId | -- | -- | GAP |

#### Proposed New Tests

- **TC-09.1** (Backend Jest): Unit test getPatientOwnerFilter for PHYSICIAN role — always returns user.id regardless of query param.
- **TC-09.2** (Backend Jest): Unit test getPatientOwnerFilter for STAFF with valid assigned physicianId.
- **TC-09.3** (Backend Jest): Unit test getPatientOwnerFilter for STAFF with missing physicianId — throws 400.
- **TC-09.5** (Backend Jest): Unit test getPatientOwnerFilter for STAFF with unassigned physicianId they are NOT assigned to — throws 403.
- **TC-09.8** (Backend Jest): Unit test getPatientOwnerFilter for ADMIN with missing physicianId — throws 400.

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

#### Current Coverage

| # | Criterion | Backend Jest | Status |
|---|-----------|-------------|--------|
| 1 | LOGIN | auth.routes L128-143 (implicit) | COVERED |
| 2 | LOGIN_FAILED | auth.routes L228-365 | COVERED |
| 3 | ACCOUNT_LOCKED | auth.routes L482-503 | COVERED |
| 4 | LOGOUT | auth.routes L508-526 | PARTIAL (creates audit, but not explicitly verified) |
| 5 | PASSWORD_CHANGE | -- | GAP |
| 6 | PASSWORD_RESET_REQUEST | -- | GAP |
| 7 | PASSWORD_RESET | -- | GAP |
| 8 | FORCED_CHANGE | -- | GAP |
| 9 | Audit failure non-blocking | auth.routes L366-380 | COVERED |
| 10 | No password in log | auth.routes L286-301 | COVERED |
| 11 | IP address in log | auth.routes L351-364 | COVERED |
| 12 | Audit log endpoint | -- | GAP |
| 13 | Audit log filters | -- | GAP |

#### Proposed New Tests

- **TC-10.4** (Backend Jest): Verify POST /api/auth/logout creates LOGOUT audit log entry.
- **TC-10.5** (Backend Jest): Verify PUT /api/auth/password creates PASSWORD_CHANGE audit log entry on success.
- **TC-10.6** (Backend Jest): Verify POST /api/auth/forgot-password creates PASSWORD_RESET_REQUEST audit log for valid user.
- **TC-10.7** (Backend Jest): Verify POST /api/auth/reset-password creates PASSWORD_RESET audit log on success.
- **TC-10.8** (Backend Jest): Verify POST /api/auth/force-change-password creates PASSWORD_CHANGE audit log with details.reason=FORCED_CHANGE.
- **TC-10.12** (Backend Jest): Verify GET /api/admin/audit-log returns paginated entries (requires admin auth).
- **TC-10.13** (Backend Jest): Verify GET /api/admin/audit-log filters by action, entity, userId, date range.

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

## Gap Summary

### Tests to Add (Prioritized)

| Priority | ID | Layer | Description | Estimated Effort |
|----------|-----|-------|-------------|-----------------|
| HIGH | TC-09.1-5,8 | Backend Jest | getPatientOwnerFilter unit tests (6 tests) — data isolation is security-critical | Small |
| HIGH | TC-10.4-8 | Backend Jest | Audit log verification for logout, password changes, reset flows (5 tests) | Small |
| HIGH | TC-10.12-13 | Backend Jest | Audit log API endpoint tests with pagination and filters (2 tests) | Medium |
| HIGH | TC-08.2a-c | Cypress E2E | Non-ADMIN role API 403 for admin endpoints (3 tests) | Small |
| MEDIUM | TC-11.1-4 | Backend Jest | CORS configuration tests (4 tests) | Medium |
| MEDIUM | TC-12.1-5 | Backend Jest | Helmet security header tests (5 tests) | Small |
| MEDIUM | TC-06.2 | Backend Jest | Forgot password happy path with SMTP (1 test) | Small |
| MEDIUM | TC-06.9 | Backend Jest | Reset password for deactivated user (1 test) | Small |
| MEDIUM | TC-05.5-6 | Backend Jest | Password change audit + mustChangePassword clear (2 tests) | Small |
| LOW | TC-01.6-7,4b | Backend Jest | Login assignment responses per role (3 tests) | Small |
| LOW | TC-04.9 | Backend Jest | JWT expiration claim verification (1 test) | Small |
| LOW | TC-04.14-15 | Backend Jest | /me endpoint with deleted/deactivated user (2 tests) | Small |
| LOW | TC-02.7 | Backend Jest | Empty body validation (1 test) | Trivial |
| LOW | TC-07.5 | Frontend Vitest | ProtectedRoute renders ForcePasswordChange (1 test) | Small |

**Total new tests proposed: ~36**
**Current test count: ~288** (including validateEnv + emailService.integration)
**Projected total after gaps filled: ~324**

---

## Requirement Cross-Reference

| Req ID | Title | Acceptance Criteria | Gaps Found | New Tests |
|--------|-------|--------------------:|----------:|----------:|
| REQ-TEST-01 | Login — Valid | 8 | 3 | 3 |
| REQ-TEST-02 | Login — Invalid | 7 | 1 | 1 |
| REQ-TEST-03 | Account Lockout | 10 | 0 | 0 |
| REQ-TEST-04 | JWT Lifecycle | 17 | 3 | 3 |
| REQ-TEST-05 | Password Change | 7 | 2 | 2 |
| REQ-TEST-06 | Forgot/Reset | 10 | 2 | 2 |
| REQ-TEST-07 | Force Change | 5 | 1 | 1 |
| REQ-TEST-08 | Route Protection | 11 | 1 | 3 |
| REQ-TEST-09 | Data Scoping | 8 | 3 | 5 |
| REQ-TEST-10 | Audit Logging | 13 | 7 | 7 |
| REQ-TEST-11 | CORS | 4 | 4 | 4 |
| REQ-TEST-12 | Helmet Headers | 5 | 5 | 5 |
| REQ-TEST-13 | Role UI | 7 | 0 | 0 |
| REQ-TEST-14 | Auth Store | 11 | 0 | 0 |
| REQ-TEST-15 | Env Var Validation | 6 | 0 | 0 |
| **TOTAL** | | **129** | **32** | **36** |
