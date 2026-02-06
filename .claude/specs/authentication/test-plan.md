# Test Plan: Authentication

## Coverage Matrix

### Login/Logout
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-1 | Login page fields | TC-26.1 | LoginPage.test.tsx (19 tests), auth.spec.ts | Covered |
| AC-2 | Valid login redirects | TC-26.1 | auth.spec.ts: login tests | Covered |
| AC-3 | Invalid credentials error | TC-26.2 | LoginPage.test.tsx: error handling | Covered |
| AC-4 | Form validation | TC-26.3 | LoginPage.test.tsx: validation tests | Covered |
| AC-5 | Logout flow | TC-26.4 | auth.spec.ts: logout test, authStore.test.ts | Covered |
| AC-6 | Display name in header | TC-26.1 | Header.test.tsx | Covered |

### Session Management
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-7 | Token in localStorage | - | authStore.test.ts (31 tests): token persistence | Covered |
| AC-8 | Protected route redirect | TC-26.19 | auth.spec.ts: "protected routes", role-access-control.cy.ts | Covered |
| AC-9 | Expired token | TC-26.20 | authService.test.ts: JWT expiry tests | Partial |
| AC-10 | State persists on refresh | - | authStore.test.ts: persistence tests | Covered |

### Password Change
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-11 | Change Password menu | TC-26.5 | - | Gap |
| AC-12 | Change password form | TC-26.5 | - | Gap |
| AC-13 | Wrong current password error | TC-26.6 | auth.routes.test.ts | Partial |
| AC-14 | Success message | TC-26.5 | - | Gap |
| AC-15 | Login with new password | TC-26.5 | - | Gap |

### Forgot Password
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-16 | Forgot Password link | TC-26.25 | ForgotPasswordPage.test.tsx (20 tests) | Covered |
| AC-17 | SMTP configured: email form | TC-26.26 | ForgotPasswordPage.test.tsx: SMTP tests | Covered |
| AC-18 | SMTP not configured: message | TC-26.27 | ForgotPasswordPage.test.tsx: no SMTP test | Covered |
| AC-19 | Same response for any email | TC-26.28 | auth.routes.test.ts: forgot password | Covered |
| AC-20 | Token 1-hour expiry | TC-26.30 | authService.test.ts | Covered |
| AC-21 | Single-use token | TC-26.32 | auth.routes.test.ts | Covered |

### Reset Password
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-22 | Token validation | TC-26.29 | ResetPasswordPage.test.tsx (17 tests) | Covered |
| AC-23 | Invalid/expired token error | TC-26.30, 26.31 | ResetPasswordPage.test.tsx | Covered |
| AC-24 | Password validation | TC-26.33 | ResetPasswordPage.test.tsx | Covered |
| AC-25 | Success redirects to login | TC-26.29 | ResetPasswordPage.test.tsx | Covered |

### CLI Tools
| Req ID | Description | Manual TC | Automated Test | Status |
|--------|-------------|-----------|----------------|--------|
| AC-26 | CLI password reset | TC-26.23 | - | Gap |
| AC-27 | Audit log cleanup | TC-26.24 | - | Gap |

## Automated Test Inventory
- Jest: authService.test.ts (27), auth.test.ts middleware (14), auth.routes.test.ts (14), emailService.test.ts (22)
- Vitest: LoginPage.test.tsx (19), ForgotPasswordPage.test.tsx (20), ResetPasswordPage.test.tsx (17), authStore.test.ts (31)
- Playwright: auth.spec.ts (13 tests)
- Cypress: role-access-control.cy.ts - authentication redirect tests (31 tests)
- Total: ~208 auth-related tests

## Gaps & Recommendations
- Gap 1: Password change UI flow (AC-11 to AC-15) not E2E tested - Priority: MEDIUM
- Gap 2: CLI tools (AC-26, AC-27) not automated - Priority: LOW (admin tools)
- Gap 3: Token expiry mid-session (AC-9) only partially tested - Priority: LOW
