# Feature 1: Authentication — Workflow Audit

## Workflows Identified

1. **WF-1: Login Flow** — User enters email/password → JWT returned → stored in localStorage → redirect to home
2. **WF-2: Logout Flow** — User clicks logout → token cleared from localStorage → edit lock released → redirect to login
3. **WF-3: Forgot Password Flow** — User clicks "Forgot Password" → enters email → API sends reset email → success state shown
4. **WF-4: Reset Password Flow** — User arrives at /reset-password?token=xxx → enters new password → submits → token validated → password updated → redirect to login
5. **WF-5: Force Password Change Flow** — User logs in with mustChangePassword=true → modal appears → enters new password → submits → flag cleared → logout/redirect
6. **WF-6: Account Lockout Flow** — User fails login 5 times → account locked for 15min → error message shown → can use forgot password to reset
7. **WF-7: Session/Token Handling** — JWT verified on protected routes → token stored in Authorization header (Bearer token) → token refreshed via /auth/me
8. **WF-8: Password Change (Header Modal)** — Logged-in user → clicks change password in user menu → enters current + new password → submits → success state shown

---

## Workflow Details

### WF-1: Login Flow
**Steps:**
1. User navigates to /login (LoginPage component)
2. User enters email and password, clicks "Sign in"
3. Frontend validates: email format, password not empty
4. LoginPage calls useAuthStore.login(email, password)
5. authStore sends POST /api/auth/login with credentials
6. Backend finds user by email, checks if active, verifies password hash
7. Backend increments failedLoginAttempts if password wrong, locks account after 5 attempts
8. On success: generates JWT token, updates lastLoginAt, returns user + token + assignments + mustChangePassword flag
9. Frontend stores token in localStorage via authStore
10. Frontend redirects to home (/) if login successful, or shows error

**Frontend:** `LoginPage.tsx`, `authStore.ts`
**Backend:** `auth.routes.ts`, `authService.ts`
**Database:** User table: email, passwordHash, isActive, failedLoginAttempts, lockedUntil, mustChangePassword
**Tests:** Vitest (LoginPage, authStore), E2E (auth.spec), Jest (auth.routes)
**Gaps:**
- MINOR: No test for email case-insensitivity normalization (backend does `email.toLowerCase()` but frontend might not)

### WF-2: Logout Flow
**Steps:**
1. User clicks user menu dropdown in Header
2. User clicks "Logout" button
3. Header calls useAuthStore.logout()
4. authStore sends POST /api/auth/logout (with Bearer token)
5. Backend releases edit lock, creates LOGOUT audit log entry
6. Frontend clears token from localStorage, resets state
7. Frontend redirects to /login

**Frontend:** `Header.tsx`, `authStore.ts`
**Backend:** `auth.routes.ts`
**Tests:** E2E (auth.spec), Jest (auth.routes)
**Gaps:** None identified — well-tested

### WF-3: Forgot Password Flow
**Steps:**
1. User clicks "Forgot Password?" link on LoginPage
2. ForgotPasswordPage checks SMTP configuration via GET /api/auth/smtp-status
3. If SMTP not configured: shows "Password reset unavailable" message
4. If SMTP configured: shows form with email input
5. User enters email, clicks "Send Reset Link"
6. POST /api/auth/forgot-password → always returns 200 (doesn't reveal if email exists)
7. Backend creates PasswordResetToken (expires in 1 hour), sends email
8. Frontend shows "Check Your Email" success state

**Frontend:** `ForgotPasswordPage.tsx`
**Backend:** `auth.routes.ts`, `emailService.ts`
**Database:** PasswordResetToken table: token, email, expiresAt, used
**Tests:** E2E (password-flows.spec), Jest (auth.routes)
**Gaps:**
- MODERATE: No Vitest unit test for ForgotPasswordPage component
- MISSING: No test that verifies password reset email is actually sent when SMTP configured

### WF-4: Reset Password Flow
**Steps:**
1. User clicks reset link from email (contains token in URL)
2. If no token in URL: shows "Invalid Link" message
3. If token present: shows form with new password + confirm password
4. Frontend validates: passwords match, password >= 8 characters
5. POST /api/auth/reset-password with token + newPassword
6. Backend verifies token exists, not used, not expired
7. Backend updates passwordHash, marks token as used, creates audit log
8. Frontend shows success, auto-redirects to /login after 3 seconds

**Frontend:** `ResetPasswordPage.tsx`
**Backend:** `auth.routes.ts`, `authService.ts`
**Tests:** E2E (password-flows.spec), Jest (auth.routes)
**Gaps:**
- MISSING: No Vitest unit test for ResetPasswordPage component
- EDGE CASE: If email delivery fails, user can't reset — no retry mechanism

### WF-5: Force Password Change Flow
**Steps:**
1. User logs in with mustChangePassword=true
2. ProtectedRoute detects flag, renders ForcePasswordChange modal (blocking)
3. User enters new password + confirm, clicks "Change Password"
4. POST /api/auth/force-change-password with newPassword
5. Backend verifies mustChangePassword=true, updates hash, clears flag
6. Frontend calls logout(), redirects to /login

**Frontend:** `ForcePasswordChange.tsx`, `ProtectedRoute.tsx`
**Backend:** `auth.routes.ts`
**Tests:** Vitest (ForcePasswordChange), E2E (auth-edge-cases), Jest (auth.routes)
**Gaps:**
- EDGE CASE: onPasswordChanged error handling if logout fails

### WF-6: Account Lockout Flow
**Steps:**
1. User fails login → failedLoginAttempts incremented
2. After 3 failures: warning shown with reset password link
3. After 5 failures: account locked for 15 minutes
4. Backend creates ACCOUNT_LOCKED audit log
5. User can wait 15min or use forgot password to reset

**Frontend:** `LoginPage.tsx` (error display, warning box)
**Backend:** `auth.routes.ts`, `authService.ts` (isAccountLocked, lockAccount)
**Tests:** E2E (auth-edge-cases), Jest (auth.routes)
**Gaps:**
- MODERATE: Lockout duration hardcoded (15min) — not configurable
- MINOR: No countdown UI showing remaining lockout time

### WF-7: Session/Token Handling
**Steps:**
1. App load: checks localStorage for auth_token
2. If token exists: GET /api/auth/me → verifies JWT, returns user
3. ProtectedRoute checks isAuthenticated → redirects to /login if not
4. API calls: axios interceptor adds Authorization header
5. If token expired: 401 returned, user must re-login

**Frontend:** `authStore.ts`, `axios.ts`, `ProtectedRoute.tsx`
**Backend:** `auth.ts` middleware, `auth.routes.ts`
**Tests:** Vitest (authStore), E2E (auth.spec), Jest (auth.routes)
**Gaps:**
- MODERATE: No automatic token refresh — token expires (default 1h), user must re-login
- MODERATE: No 401 error handler in axios interceptor to auto-redirect to login

### WF-8: Password Change (Header Modal)
**Steps:**
1. User clicks "Change Password" in user menu dropdown
2. Modal shows: current password, new password, confirm new password (all with visibility toggles)
3. Frontend validates: all fields filled, >= 8 chars, passwords match
4. PUT /api/auth/password with currentPassword + newPassword
5. Backend verifies current password, updates hash, clears mustChangePassword
6. Frontend shows success, modal auto-closes after 2 seconds

**Frontend:** `Header.tsx` (ChangePasswordModal inline)
**Backend:** `auth.routes.ts`, `authService.ts`
**Tests:** Vitest (Header), Jest (auth.routes)
**Gaps:**
- MODERATE: ChangePasswordModal is inline in Header.tsx — harder to test in isolation

---

## Summary Table

| Workflow | Frontend | Backend | Tests | Coverage | Gaps |
|----------|----------|---------|-------|----------|------|
| WF-1: Login | LoginPage, authStore | auth.routes, authService | Vitest, E2E, Jest | High | Email normalization |
| WF-2: Logout | Header, authStore | auth.routes | E2E, Jest | High | None |
| WF-3: Forgot Password | ForgotPasswordPage | auth.routes, emailService | E2E, Jest | Medium | No Vitest, no email send test |
| WF-4: Reset Password | ResetPasswordPage | auth.routes | E2E, Jest | High | No Vitest |
| WF-5: Force Change | ForcePasswordChange, ProtectedRoute | auth.routes | Vitest, E2E, Jest | High | Error handling edge |
| WF-6: Account Lockout | LoginPage | auth.routes, authService | E2E, Jest | High | Hardcoded 15min, no countdown |
| WF-7: Token Handling | authStore, axios, ProtectedRoute | auth middleware | Vitest, E2E, Jest | Medium | No auto-refresh, no 401 handler |
| WF-8: Password Change | Header (inline modal) | auth.routes | Vitest, Jest | Medium | Modal not separate component |

---

## Critical Gaps (Prioritized)

1. **MODERATE: No Token Auto-Refresh** — User loses session on token expiry (1h default)
2. **MODERATE: No 401 Auto-Redirect** — 401 responses don't force logout/redirect
3. **MODERATE: Hardcoded Lockout Duration** — 15min not configurable
4. **MODERATE: No Vitest for ForgotPasswordPage & ResetPasswordPage** — Only E2E coverage
5. **MODERATE: ChangePasswordModal inline in Header** — Hard to test in isolation
6. **MINOR: No Lockout Countdown UI** — User doesn't know remaining lockout time
7. **MINOR: No Email Send Verification Test** — Email sending not verified
8. **MINOR: Frontend Email Case Normalization** — Backend lowercases, frontend doesn't
9. **EDGE: Force Change Modal Error Handling** — logout failure after password change
10. **EDGE: No Password Reset Token Retry** — If email fails, user can't recover
