# M1 Auth & Security — Detailed Test Plan

**Parent:** [TEST_PLAN.md](../TEST_PLAN.md) § 8.3
**Spec:** `.claude/specs/test-auth-security/requirements.md`

---

## Current Coverage

| File | Framework | Tests | Covers |
|------|-----------|------:|--------|
| `authService.test.ts` | Jest | 22 | Password hashing, JWT, toAuthUser, lockout, temp password |
| `auth.test.ts` (middleware) | Jest | 15 | requireAuth, requireRole, optionalAuth, requirePatientDataAccess |
| `auth.routes.test.ts` | Jest | 49 | Login, logout, /me, password change, forgot/reset, lockout, audit |
| `emailService.test.ts` | Jest | 12 | SMTP config, reset email |
| `validateEnv.test.ts` | Jest | 25 | JWT secret, required env vars |
| `LoginPage.test.tsx` | Vitest | 18 | Login form rendering, validation, submission |
| `ProtectedRoute.test.tsx` | Vitest | 9 | Auth guard, role redirect |
| `authStore.test.ts` | Vitest | 25 | Login/logout state, token persistence, checkAuth |
| `ForcePasswordChange.test.tsx` | Vitest | 7 | Force password change component |
| `ForgotPasswordPage.test.tsx` | Vitest | 14 | Forgot password page |
| `ResetPasswordPage.test.tsx` | Vitest | 19 | Reset password page |
| `ResetPasswordModal.test.tsx` | Vitest | 9 | Admin reset password modal |
| `auth.spec.ts` | Playwright | 9 | Login form, protected routes, logout, session |
| `password-flows.spec.ts` | Playwright | 7 | Forgot/reset password UI |
| `role-access-control.cy.ts` | Cypress | 42 | ADMIN, PHYSICIAN, STAFF UI/API access |
| **Total** | | **~288** | |

---

## Planned New Tests (~31 tests)

### Tier 1 — Must Have (5 tests)

#### T1-1: Role-Based Data Scoping (3 Jest tests)

**Gap:** The data scoping logic is tested at E2E level via Cypress role-access-control and partially at Jest level (PHYSICIAN auto-filter, ADMIN requires physicianId, ADMIN unassigned — all already exist in data.routes.test.ts). The remaining gaps are STAFF-specific edge cases.

**Spec refs:** REQ-TEST-09, TC-09.3, TC-09.4, TC-09.5

**File:** `backend/src/routes/__tests__/data.routes.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `STAFF GET /api/data with valid assigned physicianId returns patients` | Staff accesses assigned physician's patients |
| 2 | `STAFF GET /api/data without physicianId returns 400` | Missing required param |
| 3 | `STAFF GET /api/data with non-assigned physicianId returns 403` | Staff can't access unassigned physician's data |

**Already covered (verified in existing tests):** PHYSICIAN auto-filter (L800-812), ADMIN requires physicianId (L838-843), ADMIN unassigned patients (L858-870).

---

#### T1-2: Password Reset Token Security (2 Jest tests)

**Gap:** Token expiry and reuse protection are already tested (auth.routes.test.ts L719-751). The remaining gaps are the SMTP happy path and deactivated user reset.

**Spec refs:** REQ-TEST-06, TC-06.2, TC-06.9

**File:** `backend/src/routes/__tests__/auth.routes.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `POST /forgot-password with SMTP + existing user creates token and sends email` | Happy path: token created, sendPasswordResetEmail called, audit log created |
| 2 | `POST /reset-password for deactivated user returns 400 USER_NOT_FOUND` | Deactivated users can't reset password |

**Already covered (verified in existing tests):** Token expiry (L719-734), already-used token reuse (L736-751).

---

### Tier 2 — Should Have (19 tests)

#### T2-1: Audit Logging for Security Events (7 Jest tests)

**Gap:** Several security-relevant actions don't have explicit audit log verification. The tests check the operation succeeds but don't verify the AuditLog entry was created with correct action, entity, and details.

**Spec refs:** REQ-TEST-10, TC-10.4 through TC-10.8, TC-10.12, TC-10.13

**File:** `backend/src/routes/__tests__/auth.routes.test.ts` (extend existing)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `POST /auth/logout creates LOGOUT audit log entry` | prisma.auditLog.create called with action='LOGOUT' |
| 2 | `PUT /auth/password creates PASSWORD_CHANGE audit log on success` | Audit entry on password change |
| 3 | `POST /auth/forgot-password creates PASSWORD_RESET_REQUEST audit log` | Audit entry on forgot password |
| 4 | `POST /auth/reset-password creates PASSWORD_RESET audit log on success` | Audit entry on password reset |
| 5 | `POST /auth/force-change-password creates PASSWORD_CHANGE audit with FORCED_CHANGE reason` | Audit details.reason = 'FORCED_CHANGE' |
| 6 | `GET /admin/audit-log returns paginated entries for admin` | Admin can query audit log |
| 7 | `GET /admin/audit-log filters by action and date range` | Filter params work correctly |

---

#### T2-2: CORS Configuration (4 Jest tests)

**Gap:** CORS configuration has zero test coverage.

**Spec refs:** REQ-TEST-11, TC-11.1 through TC-11.4

**File:** `backend/src/routes/__tests__/cors.test.ts` (new)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `production mode with CORS_ORIGIN whitelist allows listed origin` | Origin in whitelist gets CORS headers |
| 2 | `production mode without CORS_ORIGIN allows all origins` | Default for Render deployment |
| 3 | `development mode allows localhost:5173 and localhost:3000` | Dev defaults |
| 4 | `CORS config includes credentials: true` | Required for JWT auth |

---

#### T2-3: Helmet Security Headers (5 Jest tests)

**Gap:** Security headers applied by Helmet have zero test coverage.

**Spec refs:** REQ-TEST-12, TC-12.1 through TC-12.5

**File:** `backend/src/routes/__tests__/security-headers.test.ts` (new)

| # | Test Name | What It Verifies |
|---|-----------|-----------------|
| 1 | `API response includes X-Content-Type-Options: nosniff` | Helmet default |
| 2 | `API response includes X-Frame-Options header` | Clickjacking protection |
| 3 | `API response includes Strict-Transport-Security` | HSTS |
| 4 | `API response does NOT include X-Powered-By` | Helmet removes it |
| 5 | `API response does NOT include Content-Security-Policy (disabled)` | CSP disabled per config |

---

#### T2-4: Password Change Audit + mustChangePassword (3 Jest tests)

**Spec refs:** REQ-TEST-05, TC-05.5, TC-05.6; REQ-TEST-07, TC-07.5

**File:** `backend/src/routes/__tests__/auth.routes.test.ts` (extend) + `frontend/src/components/auth/ProtectedRoute.test.tsx` (extend)

| # | Test Name | Framework | What It Verifies |
|---|-----------|-----------|-----------------|
| 1 | `PUT /auth/password clears mustChangePassword flag` | Jest | prisma.user.update called with mustChangePassword: false |
| 2 | `PUT /auth/password creates audit log with PASSWORD_CHANGE action` | Jest | AuditLog entry created |
| 3 | `ProtectedRoute renders ForcePasswordChange when mustChangePassword=true` | Vitest | Auth store has mustChangePassword=true → FPC component rendered |

---

**Note:** Account lockout tests were originally planned here (T2-5, 4 tests) but are **already fully covered** in auth.routes.test.ts: lockout threshold (L401-414), locked login rejection (L386-398), lockout expiry (L448-463), and ACCOUNT_LOCKED audit log (L482-503).

---

### Tier 3 — Nice to Have (7 tests)

| # | Test Name | Framework | Spec Ref |
|---|-----------|-----------|----------|
| 1 | `ADMIN login returns all active physicians as assignments` | Jest | TC-01.6 |
| 2 | `ADMIN+PHYSICIAN login returns all physicians as assignments` | Jest | TC-01.7 |
| 3 | `PHYSICIAN login does not include assignments` | Jest | TC-01.4b |
| 4 | `JWT expiration claim matches config.jwtExpiresIn` | Jest | TC-04.9 |
| 5 | `/me endpoint returns 401 when user deleted after token issued` | Jest | TC-04.14 |
| 6 | `/me endpoint returns 401 when user deactivated after token issued` | Jest | TC-04.15 |
| 7 | `POST /login with empty body returns 400` | Jest | TC-02.7 |

---

## New File Summary

| File | Type | Tests | Status |
|------|------|------:|--------|
| `backend/src/routes/__tests__/data.routes.test.ts` | Extend | +3 | TODO |
| `backend/src/routes/__tests__/auth.routes.test.ts` | Extend | +9 | TODO |
| `backend/src/routes/__tests__/cors.test.ts` | New | 4 | TODO |
| `backend/src/routes/__tests__/security-headers.test.ts` | New | 5 | TODO |
| `frontend/src/components/auth/ProtectedRoute.test.tsx` | Extend | +1 | TODO |
| **Total (T1+T2)** | | **24** | |
| **Total (T1+T2+T3)** | | **31** | |

---

## Done Criteria

- [ ] All 24+ tests written and passing (31 if Tier 3 included)
- [ ] No regressions in existing M1 tests (~288 baseline)
- [ ] STAFF data scoping edge cases verified (missing physicianId, non-assigned physicianId)
- [ ] Password reset: SMTP happy path and deactivated user tested
- [ ] Audit logging verified for all 5 security event types
- [ ] CORS and Helmet security headers have test coverage
- [ ] Full 4-layer pyramid passes

**Already covered (no new tests needed):**
- Account lockout: fully tested (6 existing tests in auth.routes.test.ts)
- PHYSICIAN auto-filter, ADMIN requires physicianId, ADMIN unassigned: already tested
- Password reset token expiry and reuse: already tested
