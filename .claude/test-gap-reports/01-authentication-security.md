# Test Gap Analysis: Authentication & Security

## Summary
- Total Use Cases Identified: 62
- Fully Covered: 45
- Partially Covered: 10
- Not Covered: 7
- Coverage Score: 73% (fully covered) / 89% (fully + partially)

## Test Inventory (Current)
| Framework | File | Test Count |
|-----------|------|------------|
| Jest | authService.test.ts | 18 |
| Jest | auth.test.ts (middleware) | 14 |
| Jest | auth.routes.test.ts | ~45 |
| Jest | emailService.test.ts | 12 |
| Jest | emailService.integration.test.ts | 5 |
| Jest | validateEnv.test.ts | 18 |
| Vitest | LoginPage.test.tsx | 19 |
| Vitest | ForgotPasswordPage.test.tsx | 12 |
| Vitest | ResetPasswordPage.test.tsx | 14 |
| Vitest | authStore.test.ts | 23 |
| Vitest | ProtectedRoute.test.tsx | 11 |
| Vitest | ForcePasswordChange.test.tsx | 7 |
| Playwright | auth.spec.ts | 8 |
| Playwright | auth-edge-cases.spec.ts | 8 |
| Playwright | password-flows.spec.ts | 7 |
| Cypress | role-access-control.cy.ts | 31 |
| **Total** | | **~252** |

---

## Use Cases

### Category A: Login Flow

#### UC-1.1: Login with Valid Credentials (Happy Path)
**Description:** User enters valid email/password and receives JWT token, is redirected to main page
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns token on successful login" |
| Vitest | Covered | authStore.test.ts | "stores user and token on successful PHYSICIAN login" |
| Vitest | Covered | LoginPage.test.tsx | "calls login with email and password on valid submit" |
| Playwright | Covered | auth.spec.ts | "successful login redirects to main page" |
| Cypress | Covered | role-access-control.cy.ts | All beforeEach blocks use cy.login() |
**Verdict: FULLY COVERED**

#### UC-1.2: Login with Invalid Email (User Not Found)
**Description:** User enters email that does not exist in database
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 401 for invalid credentials (user not found)" |
| Vitest | Covered | LoginPage.test.tsx | "displays error message from auth store" |
| Playwright | Covered | auth.spec.ts | "shows error for invalid credentials" |
| Cypress | Not tested | - | - |
**Verdict: FULLY COVERED**

#### UC-1.3: Login with Wrong Password
**Description:** User enters valid email but incorrect password
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 401 for invalid credentials (wrong password)" |
| Vitest | Covered | authStore.test.ts | "sets error on failed login" |
| Playwright | Covered | auth.spec.ts | "shows error for invalid credentials" |
| Cypress | Not tested | - | - |
**Verdict: FULLY COVERED**

#### UC-1.4: Login with Deactivated Account
**Description:** User enters credentials for a deactivated (isActive=false) account
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 401 for deactivated account" |
| Vitest | Not tested | - | - |
| Playwright | Not tested | - | No deactivated account in seed data |
| Cypress | Not tested | - | - |
**Verdict: PARTIALLY COVERED** (backend only; no frontend/E2E test for deactivated account UI)

#### UC-1.5: Login Form Validation - Empty Email
**Description:** User submits form with empty email field
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for missing email", "returns 400 for empty email" |
| Vitest | Covered | LoginPage.test.tsx | "does not call login when email is empty" |
| Playwright | Not tested | - | - |
| Cypress | Not tested | - | - |
**Verdict: FULLY COVERED**

#### UC-1.6: Login Form Validation - Empty Password
**Description:** User submits form with empty password field
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for missing password", "returns 400 for empty password" |
| Vitest | Covered | LoginPage.test.tsx | "does not call login when password is empty" |
| Playwright | Not tested | - | - |
| Cypress | Not tested | - | - |
**Verdict: FULLY COVERED**

#### UC-1.7: Login Form Validation - Invalid Email Format
**Description:** User submits form with malformed email (e.g., "not-an-email")
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for invalid email format" |
| Vitest | Not tested | - | HTML5 validation prevents submission |
| Playwright | Not tested | - | - |
| Cypress | Not tested | - | - |
**Verdict: FULLY COVERED** (backend validates; HTML5 prevents on frontend)

#### UC-1.8: Login Loading State
**Description:** Button shows "Signing in..." and inputs are disabled during API call
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | LoginPage.test.tsx | "shows loading text when isLoading is true", "disables inputs when loading" |
| Playwright | Covered | auth.spec.ts | "shows loading state during login" |
**Verdict: FULLY COVERED**

#### UC-1.9: Password Visibility Toggle
**Description:** User can toggle password field between hidden/visible
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | LoginPage.test.tsx | "initially hides password", "shows password when toggle is clicked", "hides password again" |
| Playwright | Covered | auth.spec.ts | "password visibility toggle works" |
**Verdict: FULLY COVERED**

#### UC-1.10: Redirect When Already Authenticated
**Description:** If user navigates to /login while already authenticated, redirect to /
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | LoginPage.test.tsx | "redirects to home when already authenticated" |
| Playwright | Not tested | - | - |
**Verdict: FULLY COVERED**

#### UC-1.11: Email Trimming
**Description:** Leading/trailing whitespace is trimmed from email before login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | LoginPage.test.tsx | "trims whitespace from email" |
**Verdict: FULLY COVERED**

#### UC-1.12: Login Warning After 3 Failed Attempts
**Description:** After 3 failed attempts, a yellow warning box appears with reset link
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns warning after 3 failed attempts" |
| Vitest | Covered | LoginPage.test.tsx | "displays login warning when present" |
| Playwright | Covered | auth-edge-cases.spec.ts | "shows warning message after 3 failed attempts" |
**Verdict: FULLY COVERED**

#### UC-1.13: Login Error Clears on Input Change
**Description:** Error message disappears when user modifies email or password fields
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Not tested | - | - |
| Playwright | Not tested | - | - |
**Verdict: NOT COVERED** (LoginPage has useEffect to clearError on input change, but no test verifies it)

---

### Category B: Logout

#### UC-2.1: Logout Clears Auth State
**Description:** Clicking logout clears token from localStorage, resets Zustand state, calls API
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "logs out successfully and releases edit lock" |
| Vitest | Covered | authStore.test.ts | "clears auth state on logout", "removes token from localStorage", "calls logout endpoint" |
| Playwright | Covered | auth.spec.ts | "logout button logs out user" |
**Verdict: FULLY COVERED**

#### UC-2.2: Logout Releases Edit Lock
**Description:** Logout endpoint releases any held edit lock for the user
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "logs out successfully and releases edit lock" |
**Verdict: FULLY COVERED**

#### UC-2.3: Logout When API Fails
**Description:** Client clears state even if logout API call fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | authStore.test.ts | "clears state even if logout endpoint fails" |
**Verdict: FULLY COVERED**

#### UC-2.4: Post-Logout Protected Route Denied
**Description:** After logout, user cannot access protected routes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Playwright | Covered | auth-edge-cases.spec.ts | "cannot access protected route after logout" |
**Verdict: FULLY COVERED**

---

### Category C: Session Management & JWT

#### UC-3.1: JWT Token Stored in localStorage
**Description:** On successful login, token is stored in localStorage
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | authStore.test.ts | "stores token in localStorage on successful login" |
**Verdict: FULLY COVERED**

#### UC-3.2: Session Persists Across Page Refresh
**Description:** Page refresh with valid token restores session
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | authStore.test.ts | "verifies token and restores session if valid" |
| Playwright | Covered | auth.spec.ts | "maintains session after page refresh" |
**Verdict: FULLY COVERED**

#### UC-3.3: Expired/Invalid Token Clears State
**Description:** If token is invalid/expired, state is cleared and user redirected to login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "should return null for expired token" |
| Vitest | Covered | authStore.test.ts | "clears state if token is invalid" |
**Verdict: FULLY COVERED**

#### UC-3.4: Token with Wrong Secret Rejected
**Description:** JWT signed with different secret is rejected
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "should return null for token with wrong secret" |
**Verdict: FULLY COVERED**

#### UC-3.5: Malformed Token Rejected
**Description:** Non-JWT strings are handled gracefully
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "should return null for malformed token", "should return null for invalid token", "should return null for empty string" |
**Verdict: FULLY COVERED**

#### UC-3.6: Token Expiry (8 hours)
**Description:** JWT includes correct expiration claim
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "creates token with correct exp claim" |
**Verdict: FULLY COVERED** (but see UC-3.7)

#### UC-3.7: Token Expires Mid-Session (Real-Time)
**Description:** When token expires during an active session, next API call redirects to login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Not tested | - | - |
| Vitest | Partial | authStore.test.ts | refreshUser "clears state if token becomes invalid" |
| Playwright | Not tested | - | - |
**Verdict: PARTIALLY COVERED** (only the refreshUser error path; no test for actual mid-session expiry or automatic redirect via axios interceptor)

#### UC-3.8: Token Payload Contains Correct Fields
**Description:** JWT payload includes userId, email, roles
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "should include correct payload in token", "should handle multiple roles in token" |
**Verdict: FULLY COVERED**

---

### Category D: Protected Routes & Role-Based Access

#### UC-4.1: Unauthenticated User Redirected to /login
**Description:** Accessing / without token redirects to /login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ProtectedRoute.test.tsx | "redirects to /login when not authenticated" |
| Playwright | Covered | auth.spec.ts | "redirects to login when not authenticated" |
| Cypress | Covered | role-access-control.cy.ts | "redirects / to /login when unauthenticated" |
**Verdict: FULLY COVERED**

#### UC-4.2: Unauthenticated User Redirected from /admin
**Description:** Accessing /admin without token redirects to /login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Playwright | Covered | auth.spec.ts | "redirects to login when accessing admin page unauthenticated" |
| Cypress | Covered | role-access-control.cy.ts | "redirects /admin to /login when unauthenticated" |
**Verdict: FULLY COVERED**

#### UC-4.3: PHYSICIAN Cannot Access /admin
**Description:** PHYSICIAN role is redirected away from admin routes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ProtectedRoute.test.tsx | "redirects PHYSICIAN to / when admin-only route" |
| Cypress | Covered | role-access-control.cy.ts | "is redirected away from /admin to /" |
**Verdict: FULLY COVERED**

#### UC-4.4: STAFF Cannot Access /admin
**Description:** STAFF role is redirected away from admin routes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Cypress | Covered | role-access-control.cy.ts | STAFF "is redirected away from /admin to /" |
**Verdict: FULLY COVERED**

#### UC-4.5: ADMIN Can Access /admin
**Description:** ADMIN role can navigate to admin pages
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ProtectedRoute.test.tsx | "renders children when user has an allowed role" |
| Cypress | Covered | role-access-control.cy.ts | "can access /admin page" |
**Verdict: FULLY COVERED**

#### UC-4.6: ADMIN+PHYSICIAN Dual Role Access
**Description:** User with both ADMIN and PHYSICIAN roles has full access
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Cypress | Covered | role-access-control.cy.ts | "ADMIN + PHYSICIAN Dual Role" tests |
**Verdict: FULLY COVERED**

#### UC-4.7: API Returns 401 Without Auth Header
**Description:** API endpoints reject requests without Authorization header
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should call next with error when no authorization header" |
| Cypress | Covered | role-access-control.cy.ts | "returns 401 for /api/admin/users without auth", "returns 401 for /api/data without auth" |
**Verdict: FULLY COVERED**

#### UC-4.8: API Returns 401 with Non-Bearer Auth
**Description:** Authorization header without "Bearer " prefix is rejected
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should call next with error when authorization header does not start with Bearer" |
**Verdict: FULLY COVERED**

#### UC-4.9: API Returns 401 with Empty Bearer Token
**Description:** "Bearer " with empty token is rejected
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should call next with error when Bearer token is empty" |
**Verdict: FULLY COVERED**

#### UC-4.10: API Returns 403 for Unauthorized Role
**Description:** Authenticated user without required role gets 403
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should call next with error when user has no matching roles" |
| Cypress | Covered | role-access-control.cy.ts | "PHYSICIAN calling /api/admin/users receives 403", "STAFF calling /api/admin/users receives 403" |
**Verdict: FULLY COVERED**

#### UC-4.11: requireRole Allows Multiple Roles
**Description:** middleware accepts when user has ANY of the allowed roles
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should accept multiple allowed roles", "should allow access when user has any matching role from multiple roles" |
**Verdict: FULLY COVERED**

#### UC-4.12: optionalAuth Continues Without Token
**Description:** optionalAuth middleware does not fail when no token present
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.test.ts | "should continue without user when no authorization header", "should continue without user when authorization header is not Bearer" |
**Verdict: FULLY COVERED**

#### UC-4.13: ProtectedRoute Loading Spinner
**Description:** Loading spinner shown while checking auth state
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ProtectedRoute.test.tsx | "shows loading spinner while checking authentication" |
**Verdict: FULLY COVERED**

#### UC-4.14: ProtectedRoute Calls checkAuth When Token Exists
**Description:** On mount, if token exists but not authenticated, verify with server
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ProtectedRoute.test.tsx | "calls checkAuth when token exists but not authenticated", "does not call checkAuth when already authenticated" |
**Verdict: FULLY COVERED**

---

### Category E: Password Change (Voluntary)

#### UC-5.1: Change Password Menu Option in Header
**Description:** "Change Password" option visible in user dropdown menu
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Not tested | - | No Header.test.tsx test for "Change Password" menu item |
| Playwright | Not tested | - | - |
| Cypress | Not tested | - | - |
**Verdict: NOT COVERED** (AC-11)

#### UC-5.2: Change Password Modal Renders
**Description:** Modal with current password, new password, confirm fields
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Not tested | - | ChangePasswordModal (inline in Header.tsx) has no dedicated tests |
| Playwright | Not tested | - | - |
**Verdict: NOT COVERED** (AC-12)

#### UC-5.3: Change Password - Wrong Current Password
**Description:** Entering wrong current password shows error
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 401 for wrong current password" |
| Vitest | Not tested | - | No modal test |
| Playwright | Not tested | - | - |
**Verdict: PARTIALLY COVERED** (backend only; AC-13)

#### UC-5.4: Change Password - Success
**Description:** Successful password change shows success message, modal closes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "changes password successfully" |
| Vitest | Not tested | - | No modal test |
| Playwright | Not tested | - | - |
**Verdict: PARTIALLY COVERED** (backend only; AC-14)

#### UC-5.5: Change Password - Same as Current
**Description:** New password same as current is rejected
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for same password" |
**Verdict: PARTIALLY COVERED** (backend only)

#### UC-5.6: Change Password - Too Short
**Description:** New password shorter than 8 chars is rejected
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for short new password" |
**Verdict: PARTIALLY COVERED** (backend only; modal has client-side check but untested)

#### UC-5.7: Change Password - Passwords Don't Match
**Description:** New password and confirmation don't match
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Not tested | - | Validation is in ChangePasswordModal but untested |
**Verdict: NOT COVERED** (client-side validation exists but no test)

#### UC-5.8: Change Password - Audit Log
**Description:** PASSWORD_CHANGE audit log created on successful change
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates PASSWORD_CHANGE audit log on voluntary password change" |
**Verdict: FULLY COVERED**

---

### Category F: Forced Password Change

#### UC-6.1: ForcePasswordChange Modal Shown on Login
**Description:** When mustChangePassword=true, modal blocks access to app
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "includes mustChangePassword in successful login response" |
| Vitest | Covered | ProtectedRoute.test.tsx | "renders ForcePasswordChange component when mustChangePassword is true" |
| Vitest | Covered | ForcePasswordChange.test.tsx | "renders the force change password modal" |
| Playwright | Covered | auth-edge-cases.spec.ts | "shows force-change modal when mustChangePassword is true" |
**Verdict: FULLY COVERED**

#### UC-6.2: ForcePasswordChange - No Close Button
**Description:** Modal cannot be dismissed without changing password
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForcePasswordChange.test.tsx | "does not have a close button" |
**Verdict: FULLY COVERED**

#### UC-6.3: ForcePasswordChange - Password Too Short
**Description:** Validation rejects passwords under 8 characters
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForcePasswordChange.test.tsx | "shows error when password is too short" |
| Playwright | Covered | auth-edge-cases.spec.ts | "validates minimum password length in force-change modal" |
**Verdict: FULLY COVERED**

#### UC-6.4: ForcePasswordChange - Password Mismatch
**Description:** New password and confirmation must match
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForcePasswordChange.test.tsx | "shows error when passwords do not match" |
| Playwright | Covered | auth-edge-cases.spec.ts | "validates password mismatch in force-change modal" |
**Verdict: FULLY COVERED**

#### UC-6.5: ForcePasswordChange - Successful Change Redirects
**Description:** After successful change, user is logged out and redirected to login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForcePasswordChange.test.tsx | "calls onPasswordChanged on successful submit" |
| Playwright | Covered | auth-edge-cases.spec.ts | "successful force-change redirects to login" |
**Verdict: FULLY COVERED**

#### UC-6.6: Force-Change-Password Endpoint
**Description:** POST /api/auth/force-change-password changes password when flag is set
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "changes password when mustChangePassword is true", "returns 400 when mustChangePassword is false", "returns 400 for short password" |
**Verdict: FULLY COVERED**

#### UC-6.7: ForcePasswordChange - API Error Display
**Description:** API errors are displayed in the modal
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForcePasswordChange.test.tsx | "shows error from API on failure" |
**Verdict: FULLY COVERED**

---

### Category G: Forgot Password / Reset Password

#### UC-7.1: Forgot Password Link on Login Page
**Description:** "Forgot your password?" link navigates to /forgot-password
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | LoginPage.test.tsx | rendering tests |
| Playwright | Covered | password-flows.spec.ts | "forgot password link on login page navigates correctly" |
**Verdict: FULLY COVERED**

#### UC-7.2: SMTP Not Configured - Contact Admin
**Description:** When SMTP not configured, show "contact administrator" message
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForgotPasswordPage.test.tsx | "shows unavailable message when SMTP is not configured", "does not show email form" |
**Verdict: FULLY COVERED**

#### UC-7.3: SMTP Check Error
**Description:** When SMTP status API fails, show unavailable message
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForgotPasswordPage.test.tsx | "shows unavailable message when SMTP status check fails" |
**Verdict: FULLY COVERED**

#### UC-7.4: Forgot Password - Email Submission
**Description:** User enters email and submits request
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ForgotPasswordPage.test.tsx | "calls API with email on form submit" |
| Playwright | Covered | password-flows.spec.ts | "displays form and submits email successfully" |
**Verdict: FULLY COVERED**

#### UC-7.5: Forgot Password - Same Response for Any Email
**Description:** Always returns success message (prevents email enumeration)
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns success when SMTP configured (always returns success for security)" |
| Vitest | Covered | ForgotPasswordPage.test.tsx | "shows success message after successful submission" |
| Playwright | Covered | password-flows.spec.ts | "displays form and submits email successfully" |
**Verdict: FULLY COVERED**

#### UC-7.6: Forgot Password - SMTP Not Configured Error
**Description:** API returns 400 when SMTP not configured
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 when SMTP is not configured" |
**Verdict: FULLY COVERED**

#### UC-7.7: Reset Password - No Token in URL
**Description:** Accessing /reset-password without token shows invalid link
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows invalid link message when no token in URL" |
| Playwright | Covered | password-flows.spec.ts | "shows invalid link when no token provided" |
**Verdict: FULLY COVERED**

#### UC-7.8: Reset Password - Invalid Token
**Description:** Server rejects invalid token
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for invalid token" |
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows error message for invalid token" |
| Playwright | Covered | password-flows.spec.ts | "shows error for invalid token when submitting" |
**Verdict: FULLY COVERED**

#### UC-7.9: Reset Password - Expired Token
**Description:** Server rejects expired token (1-hour expiry)
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for expired token" |
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows error message for expired token" |
**Verdict: FULLY COVERED**

#### UC-7.10: Reset Password - Already Used Token
**Description:** Server rejects previously used token (single-use)
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for already-used token" |
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows error message for already used token" |
**Verdict: FULLY COVERED**

#### UC-7.11: Reset Password - Passwords Don't Match
**Description:** Client-side validation rejects mismatched passwords
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows error when passwords do not match" |
| Playwright | Covered | password-flows.spec.ts | "validates passwords match" |
**Verdict: FULLY COVERED**

#### UC-7.12: Reset Password - Password Too Short
**Description:** Client-side and server-side validation for minimum 8 characters
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns 400 for password too short" |
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows error when password is too short" |
| Playwright | Covered | password-flows.spec.ts | "validates password length" |
**Verdict: FULLY COVERED**

#### UC-7.13: Reset Password - Successful Reset
**Description:** Valid token + valid password resets and redirects to login
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "resets password successfully with valid token" |
| Vitest | Covered | ResetPasswordPage.test.tsx | "shows success message after successful reset", "redirects to login after success" |
**Verdict: FULLY COVERED**

---

### Category H: Account Lockout (REQ-SEC-06)

#### UC-8.1: Failed Login Increments Counter
**Description:** Each wrong password increments failedLoginAttempts
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | login flow calls incrementFailedAttempts |
**Verdict: FULLY COVERED**

#### UC-8.2: Account Locks After 5 Failed Attempts
**Description:** 5th failed attempt triggers lockAccount
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "locks account after 5 failed attempts" |
**Verdict: FULLY COVERED**

#### UC-8.3: Locked Account Rejects Login
**Description:** Login attempt on locked account returns ACCOUNT_LOCKED
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "returns ACCOUNT_LOCKED when user account is locked" |
| Playwright | Covered | auth-edge-cases.spec.ts | "shows account locked message after too many failed attempts" |
**Verdict: FULLY COVERED**

#### UC-8.4: Lock Expires After Duration
**Description:** isAccountLocked returns false after lockout period expires
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "returns false when lockedUntil is in the past" |
| Jest | Covered | auth.routes.test.ts | "allows login when lock has expired" |
**Verdict: FULLY COVERED**

#### UC-8.5: Successful Login Resets Counter
**Description:** Successful login clears failedLoginAttempts and lockedUntil
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "resets failed attempts on successful login" |
**Verdict: FULLY COVERED**

#### UC-8.6: isAccountLocked Boundary - Null lockedUntil
**Description:** No lock when lockedUntil is null
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "returns false when lockedUntil is null" |
**Verdict: FULLY COVERED**

#### UC-8.7: isAccountLocked Boundary - Exactly Now
**Description:** Lock considered expired when lockedUntil equals current time
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "returns false when lockedUntil is exactly now (boundary)" |
**Verdict: FULLY COVERED**

---

### Category I: Audit Logging

#### UC-9.1: LOGIN Audit Log on Success
**Description:** Successful login creates LOGIN audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates LOGIN audit log on successful login" |
**Verdict: FULLY COVERED**

#### UC-9.2: LOGOUT Audit Log
**Description:** Successful logout creates LOGOUT audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates LOGOUT audit log on successful logout" |
**Verdict: FULLY COVERED**

#### UC-9.3: LOGIN_FAILED Audit Log (REQ-SEC-10)
**Description:** Failed logins create LOGIN_FAILED entry with reason
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates LOGIN_FAILED audit log for invalid email", "creates LOGIN_FAILED audit log for invalid password", "creates LOGIN_FAILED audit log for deactivated account" |
**Verdict: FULLY COVERED**

#### UC-9.4: Password Never Logged in Audit
**Description:** Attempted password is never stored in audit log
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "does not log attempted password in audit log" |
**Verdict: FULLY COVERED**

#### UC-9.5: Audit Log Failure Doesn't Block Response
**Description:** If audit log DB write fails, login response is still returned
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "audit log failure does not block login response" |
**Verdict: FULLY COVERED**

#### UC-9.6: IP Address Logged in Audit
**Description:** Client IP is included in audit entries
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "includes IP address in audit log entry" |
**Verdict: FULLY COVERED**

#### UC-9.7: ACCOUNT_LOCKED Audit Log
**Description:** Account lockout creates ACCOUNT_LOCKED audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates ACCOUNT_LOCKED audit log on lockout" |
**Verdict: FULLY COVERED**

#### UC-9.8: PASSWORD_CHANGE Audit Log
**Description:** Voluntary password change creates PASSWORD_CHANGE audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates PASSWORD_CHANGE audit log on voluntary password change" |
**Verdict: FULLY COVERED**

#### UC-9.9: PASSWORD_CHANGE (FORCED_CHANGE) Audit Log
**Description:** Force-change creates audit entry with reason: FORCED_CHANGE
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates PASSWORD_CHANGE audit log with FORCED_CHANGE on force-change" |
**Verdict: FULLY COVERED**

#### UC-9.10: PASSWORD_RESET_REQUEST Audit Log
**Description:** Forgot password request creates audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates PASSWORD_RESET_REQUEST audit log for forgot-password" |
**Verdict: FULLY COVERED**

#### UC-9.11: PASSWORD_RESET Audit Log
**Description:** Successful password reset creates audit entry
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | auth.routes.test.ts | "creates PASSWORD_RESET audit log on successful password reset" |
**Verdict: FULLY COVERED**

---

### Category J: Environment Variable Validation (REQ-SEC-04, REQ-SEC-05)

#### UC-10.1: Production - Missing JWT_SECRET Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when JWT_SECRET is missing in production" |
**Verdict: FULLY COVERED**

#### UC-10.2: Production - Default JWT_SECRET Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when JWT_SECRET is the default development value in production" |
**Verdict: FULLY COVERED**

#### UC-10.3: Production - Short JWT_SECRET Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when JWT_SECRET is shorter than 32 characters in production" |
**Verdict: FULLY COVERED**

#### UC-10.4: Development - Missing JWT_SECRET Warns Only
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should return valid: true when env vars are missing in development", "should log a warning when JWT_SECRET is not set in development" |
**Verdict: FULLY COVERED**

#### UC-10.5: Production - Missing SMTP_HOST Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when SMTP_HOST is missing in production", "should error when SMTP_HOST is an empty string" |
**Verdict: FULLY COVERED**

#### UC-10.6: Production - Default ADMIN_EMAIL Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when ADMIN_EMAIL is the default value" |
**Verdict: FULLY COVERED**

#### UC-10.7: Production - Default ADMIN_PASSWORD Fails
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should error when ADMIN_PASSWORD is the default value" |
**Verdict: FULLY COVERED**

#### UC-10.8: Production - All Valid Passes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should return valid: true with no errors when all env vars are correctly set" |
**Verdict: FULLY COVERED**

#### UC-10.9: Config Summary Doesn't Reveal Secrets
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | validateEnv.test.ts | "should not reveal secret values in the configuration summary" |
**Verdict: FULLY COVERED**

---

### Category K: Email Service / SMTP

#### UC-11.1: isSmtpConfigured Returns True When All Vars Set
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.test.ts | "should return true when all SMTP variables are set" |
| Jest | Covered | emailService.integration.test.ts | "detects SMTP as configured with Ethereal env vars" |
**Verdict: FULLY COVERED**

#### UC-11.2: isSmtpConfigured Returns False When Vars Missing
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.test.ts | Tests for each missing var (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, all, empty strings) |
**Verdict: FULLY COVERED**

#### UC-11.3: Password Reset Email Actually Sends
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.integration.test.ts | "sends a password-reset email via Ethereal" |
**Verdict: FULLY COVERED**

#### UC-11.4: Admin Reset Notification Email Sends
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.integration.test.ts | "sends an admin-reset notification email via Ethereal" |
**Verdict: FULLY COVERED**

#### UC-11.5: Email Sending Returns False on Bad Host
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.integration.test.ts | "returns false on SMTP connection error (bad host)" |
**Verdict: FULLY COVERED**

#### UC-11.6: Reset URL Construction
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | emailService.test.ts | "should use default APP_URL when not set", "should use APP_URL when set" |
**Verdict: FULLY COVERED**

---

### Category L: Security Scenarios (Uncovered / Partially Covered)

#### UC-12.1: SQL Injection in Login Email
**Description:** Malicious SQL in email field does not compromise database
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Not tested | - | - |
| Playwright | Not tested | - | - |
**Verdict: NOT COVERED** (Prisma parameterized queries mitigate this, but no explicit test)

#### UC-12.2: XSS in Login Form Fields
**Description:** Script tags in email/password fields do not execute
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Vitest | Not tested | - | - |
| Playwright | Not tested | - | - |
**Verdict: NOT COVERED** (React escapes by default, but no explicit test)

#### UC-12.3: CORS Origin Whitelist (REQ-SEC-02)
**Description:** CORS_ORIGIN env var restricts allowed origins
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Not tested | - | - |
**Verdict: NOT COVERED** (REQ-SEC-02 implemented but no test exists)

#### UC-12.4: Rate Limiting on Login (REQ-SEC-03)
**Description:** Login endpoint rate limited to 20 requests per 15 minutes
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Not tested | - | - |
**Verdict: NOT COVERED** (REQ-SEC-03 marked as DEFERRED in requirements, but rate limiting code may exist)

#### UC-12.5: Concurrent Sessions
**Description:** Multiple simultaneous sessions for the same user
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| All | Not tested | - | - |
**Verdict: NOT COVERED** (no session management beyond JWT; no test for concurrent behavior)

#### UC-12.6: toAuthUser Strips Sensitive Data
**Description:** User object returned to frontend never includes passwordHash
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "should strip sensitive data from user" |
**Verdict: FULLY COVERED**

#### UC-12.7: Temp Password Generation Security
**Description:** Generated passwords are 12 chars, cryptographically random, from allowed charset
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| Jest | Covered | authService.test.ts | "returns a 12-character string", "generates different passwords each time", "only contains allowed characters" |
**Verdict: FULLY COVERED**

---

### Category M: CLI Tools

#### UC-13.1: CLI Password Reset
**Description:** `npm run reset-password -- --email user@clinic --password newpass`
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| All | Not tested | - | - |
**Verdict: NOT COVERED** (AC-26)

#### UC-13.2: Audit Log Cleanup CLI
**Description:** `npm run cleanup-audit-log -- --days 30`
**Test Coverage:**
| Framework | Status | Test File | Test Name |
|-----------|--------|-----------|-----------|
| All | Not tested | - | - |
**Verdict: NOT COVERED** (AC-27)

---

## Gap Summary

### Critical Gaps (No Coverage)
| Use Case | Description | Recommended Framework |
|----------|-------------|----------------------|
| UC-5.1 | Change Password menu option in Header | Vitest (Header.test.tsx) or Playwright E2E |
| UC-5.2 | Change Password modal rendering (ChangePasswordModal) | Vitest (new ChangePasswordModal.test.tsx or Header.test.tsx) |
| UC-5.7 | Change Password modal - passwords don't match validation | Vitest |
| UC-1.13 | Login error clears when input changes | Vitest (LoginPage.test.tsx) |
| UC-12.1 | SQL injection in login email field | Jest (auth.routes.test.ts) |
| UC-12.3 | CORS origin whitelist enforcement | Jest (integration test) |
| UC-13.1 | CLI password reset tool | Jest (script test) |

### Partial Gaps (Need More Coverage)
| Use Case | Description | Missing Framework | What's Missing |
|----------|-------------|-------------------|----------------|
| UC-1.4 | Login with deactivated account | Playwright/Cypress | No frontend E2E test for deactivated account error message |
| UC-3.7 | Token expires mid-session | Playwright | No test for automatic redirect when token expires during use |
| UC-5.3 | Change password wrong current password | Vitest, Playwright | No frontend test for error display in ChangePasswordModal |
| UC-5.4 | Change password success flow | Vitest, Playwright | No frontend test for success message + modal close |
| UC-5.5 | Change password same as current | Vitest | No frontend test for "same password" error in modal |
| UC-5.6 | Change password too short | Vitest | No frontend test for validation in modal |
| UC-12.2 | XSS in auth form fields | Vitest/Playwright | No explicit XSS test (React escapes, but worth verifying) |
| UC-12.4 | Rate limiting on login endpoint | Jest | Rate limiting deferred but should be tested if implemented |
| UC-12.5 | Concurrent sessions | Playwright | No multi-tab/multi-session test |
| UC-13.2 | Audit log cleanup CLI | Jest | CLI script has no tests |

---

## Recommendations

### Priority 1: ChangePasswordModal Tests (UC-5.1 through UC-5.7)
**Impact: HIGH** -- The voluntary password change flow (accessible from Header user menu) has ZERO frontend test coverage. The `ChangePasswordModal` is defined inline in `Header.tsx` and has no unit tests. This is the single largest gap in the authentication test suite.

**Action:**
- Extract `ChangePasswordModal` to its own file: `frontend/src/components/auth/ChangePasswordModal.tsx`
- Create `ChangePasswordModal.test.tsx` with Vitest tests for:
  - Modal renders with 3 fields (current, new, confirm)
  - "All fields required" validation
  - "Password too short" validation
  - "Passwords don't match" validation
  - Successful change shows success message
  - Wrong current password shows error from API
  - "Same password" error from API
  - Loading state during submission
  - Modal auto-closes after success
- Add Playwright or Cypress E2E test for the full change-password flow (open menu -> click Change Password -> fill form -> submit)

### Priority 2: Login Edge Cases (UC-1.13, UC-1.4)
**Impact: MEDIUM**

**Action:**
- Add Vitest test to LoginPage.test.tsx: "clears error when email input changes"
- Add Playwright test for deactivated account login attempt (requires route interception to simulate deactivated account response)

### Priority 3: Security Regression Tests (UC-12.1, UC-12.3)
**Impact: MEDIUM** -- While Prisma and React provide built-in protections, explicit security regression tests provide defense-in-depth.

**Action:**
- Add Jest test to auth.routes.test.ts: login with SQL injection payload in email (verify no crash, proper 400/401)
- Add Jest integration test for CORS: verify `CORS_ORIGIN=https://example.com` rejects requests from other origins

### Priority 4: Mid-Session Token Expiry (UC-3.7)
**Impact: LOW** -- Token expiry is tested at the unit level, but no E2E test verifies the user experience when a token expires during an active session.

**Action:**
- Add Playwright test: login, then mock the /auth/me endpoint to return 401, verify redirect to /login

### Priority 5: CLI Tools (UC-13.1, UC-13.2)
**Impact: LOW** -- Admin-only tools with manual usage. Testing priority is low.

**Action:**
- Add Jest tests for the CLI scripts if they exist as importable modules
- At minimum, verify the scripts can be loaded without errors
