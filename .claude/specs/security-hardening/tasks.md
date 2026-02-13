# Implementation Tasks: Security Hardening

## Task Overview

This document breaks down the security hardening implementation into atomic, executable coding tasks. The implementation covers 7 requirements (REQ-SEC-02, 03, 04, 05, 06, 07, 10) organized into deployment groups that minimize dependencies and enable incremental deployment.

**Scope:** 7 included requirements addressing Critical and High severity security gaps. This focuses on startup validation, rate limiting, CORS configuration, account lockout, httpOnly cookies, and failed login audit logging.

**Excluded (deferred):** REQ-SEC-01 (HTTPS/TLS), REQ-SEC-08 (CSP), REQ-SEC-09 (Refresh Tokens), REQ-SEC-11 (Hide DB Port), REQ-SEC-12 (Field-Level Encryption).

## Steering Document Compliance

**Tech Stack Alignment:**
- Backend: Express + Prisma ORM (existing patterns)
- Frontend: React + Zustand + axios (existing patterns)
- Middleware: Express middleware chain (existing patterns)
- Testing: Jest (backend), Vitest (components), Playwright/Cypress (E2E), MCP Playwright (visual)

**File Organization:**
- New middleware: `backend/src/middleware/rateLimiter.ts`, `backend/src/config/validateEnv.ts`
- Service extensions: `backend/src/services/authService.ts`, `backend/src/services/emailService.ts`
- Route updates: `backend/src/routes/auth.routes.ts`, `backend/src/routes/admin.routes.ts`, `backend/src/routes/import.routes.ts`
- Frontend: `frontend/src/components/ForcePasswordChange.tsx`, `frontend/src/stores/authStore.ts`, `frontend/src/api/axios.ts`

## Atomic Task Requirements

Each task meets these criteria:
- **File Scope**: 1-3 related files maximum
- **Time Boxing**: Completable in 15-30 minutes
- **Single Purpose**: One testable outcome per task
- **Specific Files**: Exact file paths to create/modify
- **Agent-Friendly**: Clear input/output with minimal context switching

---

## Deployment Groups

### Group 1: Startup & Config (Critical - Deploy First)
No runtime dependencies, safe to deploy independently.

### Group 2: Rate Limiting (Critical)
No frontend dependencies, independent of other groups.

### Group 3: CORS Improvement (Critical)
Depends on Group 1 (validateEnv), minimal change.

### Group 4: Failed Login Audit Logging (High)
No dependencies, adds audit logging only.

### Group 5: Account Lockout (High)
Depends on Group 4 (failed login logging), includes database migration.

### Group 6: httpOnly Cookie (High)
No dependencies, includes frontend/backend coordination.

### Group 7: Documentation
Updates all installation guides.

### Group 8: Visual Browser Review (MANDATORY)
Tests all UI changes with real browser.

---

## Tasks

### Group 1: Startup & Config (REQ-SEC-04, REQ-SEC-05)

- [x] 1. Create environment validation module
  - **File:** `backend/src/config/validateEnv.ts`
  - Export `validateEnv(): EnvValidationResult` function
  - Export `EnvValidationResult` interface: `{ valid: boolean; errors: string[]; warnings: string[] }`
  - In production mode (`NODE_ENV=production`):
    - Validate `JWT_SECRET` is set, not default value, >= 32 characters
    - Validate `SMTP_HOST` is set and non-empty
    - Validate `ADMIN_EMAIL` is set and not default (`admin@clinic.com`)
    - Validate `ADMIN_PASSWORD` is set and not default (`changeme123`)
  - In development mode: log warnings for missing/default values but return `valid: true`
  - On success: log summary without revealing secret values (e.g., `"JWT secret length=64"`)
  - On failure in production: log all errors and call `process.exit(1)`
  - **Acceptance:** Function validates 4 required env vars, exits in prod if invalid, warns in dev
  - _Requirements: REQ-SEC-04 (AC 1-4), REQ-SEC-05 (AC 1-5)_
  - _Leverage: `backend/src/config/index.ts` for env access patterns_

- [x] 2. Create validateEnv unit tests
  - **File:** `backend/src/config/__tests__/validateEnv.test.ts`
  - Test production mode: missing JWT_SECRET exits, default JWT_SECRET exits, short JWT_SECRET exits
  - Test production mode: missing SMTP_HOST exits, missing ADMIN_EMAIL exits, missing ADMIN_PASSWORD exits
  - Test production mode: default ADMIN_EMAIL exits, default ADMIN_PASSWORD exits
  - Test production mode: all valid passes and logs summary
  - Test development mode: missing vars log warnings but do not exit
  - **Acceptance:** 10+ tests covering all AC from REQ-SEC-04 and REQ-SEC-05
  - _Requirements: REQ-SEC-04 (AC 1-4), REQ-SEC-05 (AC 1-6)_
  - _Leverage: `backend/src/services/__tests__/authService.test.ts` for Jest patterns_

- [x] 3. Integrate validateEnv into startup sequence
  - **File:** `backend/src/index.ts`
  - Import `validateEnv` from `./config/validateEnv.js`
  - Call `validateEnv()` immediately after `dotenv.config()` and before any other imports
  - Add comment: `// Validate environment BEFORE anything else (REQ-SEC-04, REQ-SEC-05)`
  - **Acceptance:** Validation runs before database connection, HTTP listener, or service initialization
  - _Requirements: REQ-SEC-05 (AC 6)_
  - _Leverage: `backend/src/index.ts` existing startup sequence_

- [x] 4. Update backend config for rate limiting and cookies
  - **File:** `backend/src/config/index.ts`
  - Add `rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false'` (defaults to true)
  - Add `jwtCookieName: 'auth_token'`
  - Add `jwtCookieMaxAge: 28800000` (8 hours in ms)
  - **Acceptance:** Config exports rate limit flag and cookie settings
  - _Requirements: REQ-SEC-03, REQ-SEC-07_
  - _Leverage: `backend/src/config/index.ts` existing config object_

---

### Group 2: Rate Limiting (REQ-SEC-03)

- [ ] 5. Install rate limiting dependencies
  - **Command:** `cd backend && npm install express-rate-limit cookie-parser @types/cookie-parser`
  - **Acceptance:** Dependencies added to `package.json` and `node_modules`
  - _Requirements: REQ-SEC-03, REQ-SEC-07_

- [ ] 6. Add trust proxy to Express app
  - **File:** `backend/src/app.ts`
  - Add `app.set('trust proxy', 1);` immediately after `const app = express();`
  - Add comment: `// Trust first proxy (nginx/Render LB) for X-Forwarded-For header (REQ-SEC-03)`
  - **Acceptance:** Express trusts proxy headers, enabling correct client IP resolution
  - _Requirements: REQ-SEC-03 (AC 6)_
  - _Leverage: `backend/src/app.ts` existing Express setup_

- [ ] 7. Create rate limiter configuration module
  - **File:** `backend/src/middleware/rateLimiter.ts`
  - Import `rateLimit` from `express-rate-limit`
  - Export `getRateLimitConfig(): RateLimitConfig` reading from env vars:
    - `RATE_LIMIT_ENABLED` (default: `'true'`)
    - `RATE_LIMIT_LOGIN_MAX` (default: `20`), `RATE_LIMIT_LOGIN_WINDOW_MIN` (default: `15`)
    - `RATE_LIMIT_IMPORT_MAX` (default: `10`), `RATE_LIMIT_IMPORT_WINDOW_MIN` (default: `1`)
    - `RATE_LIMIT_GLOBAL_MAX` (default: `100`), `RATE_LIMIT_GLOBAL_WINDOW_MIN` (default: `1`)
    - `RATE_LIMIT_FORGOT_PW_MAX` (default: `5`), `RATE_LIMIT_FORGOT_PW_WINDOW_MIN` (default: `15`)
  - Export 5 rate limiter middleware instances: `loginLimiter`, `forgotPasswordLimiter`, `changePasswordLimiter`, `importLimiter`, `globalLimiter`
  - When `RATE_LIMIT_ENABLED=false`, replace all limiters with pass-through middleware: `(_req, _res, next) => next()`
  - Configure custom error handler: return `{ success: false, error: { code: "RATE_LIMIT_EXCEEDED", message: "...", retryAfter: N } }`
  - Set headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - Use `keyGenerator: (req) => req.ip` for client IP tracking
  - Use in-memory store (default)
  - **Acceptance:** Module exports 5 configured rate limiters with env-based config
  - _Requirements: REQ-SEC-03 (AC 1-9)_
  - _Leverage: Express middleware patterns from `backend/src/middleware/auth.ts`_

- [ ] 8. Create rate limiter unit tests
  - **File:** `backend/src/middleware/__tests__/rateLimiter.test.ts`
  - Test `getRateLimitConfig()` reads env vars with defaults
  - Test `RATE_LIMIT_ENABLED=false` returns pass-through middleware
  - Test custom thresholds from env vars (e.g., `RATE_LIMIT_LOGIN_MAX=5`)
  - Test rate limiter config object structure
  - **Acceptance:** 5+ tests covering env var reading and disable flag
  - _Requirements: REQ-SEC-03 (AC 8-9)_
  - _Leverage: `backend/src/middleware/__tests__/auth.test.ts` for middleware test patterns_

- [ ] 9. Apply global rate limiter to app
  - **File:** `backend/src/app.ts`
  - Import `globalLimiter` from `./middleware/rateLimiter.js`
  - Add `app.use('/api', globalLimiter);` after CORS middleware, before routes
  - Add comment: `// Global rate limiting: 100 req/min per IP (REQ-SEC-03)`
  - **Acceptance:** Global rate limiter applied to all `/api/*` routes
  - _Requirements: REQ-SEC-03 (AC 4)_
  - _Leverage: `backend/src/app.ts` existing middleware chain_

- [ ] 10. Apply login rate limiter to auth routes
  - **File:** `backend/src/routes/auth.routes.ts`
  - Import `loginLimiter` from `../middleware/rateLimiter.js`
  - Add `loginLimiter` to POST `/login` route: `router.post('/login', loginLimiter, async (req, res, next) => { ... });`
  - **Acceptance:** Login endpoint limited to 20 attempts per 15 minutes per IP
  - _Requirements: REQ-SEC-03 (AC 1)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing route patterns_

- [ ] 11. Apply forgot-password and change-password rate limiters
  - **File:** `backend/src/routes/auth.routes.ts`
  - Import `forgotPasswordLimiter`, `changePasswordLimiter` from `../middleware/rateLimiter.js`
  - Add `forgotPasswordLimiter` to POST `/forgot-password` route
  - Add `changePasswordLimiter` to PUT `/password` route
  - **Acceptance:** Forgot-password limited to 5/15min, change-password limited to 5/15min
  - _Requirements: REQ-SEC-03 (AC 2), user decision (change-password uses same limits)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing route patterns_

- [ ] 12. Apply import rate limiter to import routes
  - **File:** `backend/src/routes/import.routes.ts`
  - Import `importLimiter` from `../middleware/rateLimiter.js`
  - Add `router.use(importLimiter);` at the top of the file (applies to all import routes)
  - Add comment: `// Rate limit all import endpoints: 10 req/min per IP (REQ-SEC-03)`
  - **Acceptance:** Import endpoints limited to 10 requests per minute per IP
  - _Requirements: REQ-SEC-03 (AC 3)_
  - _Leverage: `backend/src/routes/import.routes.ts` existing router setup_

- [ ] 13. Create rate limiter integration tests (auth routes)
  - **File:** `backend/src/routes/__tests__/auth.routes.test.ts` (modify existing)
  - Add test: "POST /login returns 429 after 21 requests"
  - Add test: "POST /forgot-password returns 429 after 6 requests"
  - Add test: "PUT /password returns 429 after 6 requests"
  - Verify `Retry-After` header in 429 response
  - Verify error response format: `{ success: false, error: { code: "RATE_LIMIT_EXCEEDED", ... } }`
  - **Acceptance:** 5+ integration tests verify rate limiting on auth endpoints
  - _Requirements: REQ-SEC-03 (AC 1-2, 5)_
  - _Leverage: `backend/src/routes/__tests__/auth.routes.test.ts` existing supertest patterns_

- [ ] 14. Update LoginPage to display rate limit errors
  - **File:** `frontend/src/pages/LoginPage.tsx`
  - Existing error handling already displays server error messages from `error.response.data.error.message`
  - Verify 429 error message displays correctly: "Too many login attempts. Please try again in 15 minutes."
  - No code change required if existing error display works for 429 responses
  - If needed: add special styling for rate limit errors (yellow warning box)
  - **Acceptance:** LoginPage displays rate limit error message from API 429 response
  - _Requirements: REQ-SEC-03 (user experience)_
  - _Leverage: `frontend/src/pages/LoginPage.tsx` existing error display_

- [ ] 15. Create LoginPage rate limit display tests
  - **File:** `frontend/src/pages/LoginPage.test.tsx` (modify existing)
  - Add test: "displays rate limit error when API returns 429"
  - Mock axios POST response with 429 status and rate limit error message
  - Verify error message displays on page
  - **Acceptance:** 1+ test verifies rate limit error display
  - _Requirements: REQ-SEC-03 (user experience)_
  - _Leverage: `frontend/src/pages/LoginPage.test.tsx` existing test patterns_

---

### Group 3: CORS Improvement (REQ-SEC-02)

- [ ] 16. Update CORS configuration to support optional whitelist
  - **File:** `backend/src/app.ts`
  - Locate existing CORS middleware configuration
  - Verify current logic: when `CORS_ORIGIN` is set, splits by comma and uses as whitelist; when not set, uses `origin: true`
  - Add comment: `// CORS: optional whitelist via CORS_ORIGIN, defaults to allow all (REQ-SEC-02)`
  - No code change required if existing logic matches design (per user decision: `origin: true` is default, `CORS_ORIGIN` is optional)
  - **Acceptance:** CORS defaults to `origin: true`, supports optional `CORS_ORIGIN` comma-separated whitelist
  - _Requirements: REQ-SEC-02 (AC 2-6)_
  - _Leverage: `backend/src/app.ts` existing CORS configuration_

---

### Group 4: Failed Login Audit Logging (REQ-SEC-10)

- [ ] 17. Add LOGIN_FAILED and ACCOUNT_LOCKED audit action types
  - **File:** `backend/prisma/schema.prisma` (modify existing)
  - Locate `AuditLog` model
  - Update comment on `action` field to include: `'LOGIN_FAILED'`, `'ACCOUNT_LOCKED'`, `'SEND_TEMP_PASSWORD'`
  - No schema migration needed (action is already a String field)
  - **Acceptance:** AuditLog action type documented to include new values
  - _Requirements: REQ-SEC-10, REQ-SEC-06_
  - _Leverage: `backend/prisma/schema.prisma` existing AuditLog model_

- [ ] 18. Add failed login logging to auth routes login handler
  - **File:** `backend/src/routes/auth.routes.ts`
  - In POST `/login` handler, add failed login audit logging for these scenarios:
    - User not found: `action: 'LOGIN_FAILED'`, `userId: null`, `userEmail: attemptedEmail`, `details: { reason: 'INVALID_CREDENTIALS' }`
    - Account deactivated: `action: 'LOGIN_FAILED'`, `userId: user.id`, `userEmail: email`, `details: { reason: 'ACCOUNT_DEACTIVATED' }`
    - Wrong password: `action: 'LOGIN_FAILED'`, `userId: user.id`, `userEmail: email`, `details: { reason: 'INVALID_CREDENTIALS' }`
  - Use existing `prisma.auditLog.create()` pattern
  - Include `ipAddress: req.ip` in all audit log entries
  - Never log the attempted password
  - **Acceptance:** Failed login attempts create audit log entries with reason and IP
  - _Requirements: REQ-SEC-10 (AC 1-5)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing audit logging for successful login_

- [ ] 19. Create failed login audit logging tests
  - **File:** `backend/src/routes/__tests__/auth.routes.test.ts` (modify existing)
  - Add test: "creates LOGIN_FAILED audit log for invalid email"
  - Add test: "creates LOGIN_FAILED audit log for invalid password"
  - Add test: "creates LOGIN_FAILED audit log for deactivated account"
  - Add test: "does not log attempted password in audit log"
  - Verify audit log `details` JSON contains `reason` field
  - **Acceptance:** 4+ tests verify failed login audit logging
  - _Requirements: REQ-SEC-10 (AC 1-5)_
  - _Leverage: `backend/src/routes/__tests__/auth.routes.test.ts` existing audit log tests_

- [ ] 20. Verify admin panel displays LOGIN_FAILED audit entries
  - **File:** `frontend/src/pages/AdminPage.tsx` (audit log section)
  - The audit log display is in AdminPage.tsx, NOT a separate AuditLogTab component
  - Verify existing display shows: action, userEmail, timestamp, details JSON
  - If `LOGIN_FAILED` entries need special formatting (show `reason` from `details.reason`), update the audit log rendering
  - **Test:** `frontend/src/pages/AdminPage.test.tsx` — add test for LOGIN_FAILED entry rendering
  - **Acceptance:** Admin audit log displays LOGIN_FAILED entries with email, IP, reason
  - _Requirements: REQ-SEC-10 (AC 6)_
  - _Leverage: Existing AdminPage audit log rendering_

---

### Group 5: Account Lockout (REQ-SEC-06)

- [ ] 21. Create Prisma migration for account lockout fields
  - **File:** `backend/prisma/schema.prisma`
  - Add to `User` model:
    ```prisma
    failedLoginAttempts  Int       @default(0) @map("failed_login_attempts")
    lockedUntil          DateTime? @map("locked_until")
    mustChangePassword   Boolean   @default(false) @map("must_change_password")
    ```
  - **Command:** `cd backend && npx prisma migrate dev --name add-account-lockout-fields`
  - **Acceptance:** Migration creates 3 new columns in users table with defaults
  - _Requirements: REQ-SEC-06 (AC 6)_
  - _Leverage: `backend/prisma/schema.prisma` existing User model_

- [ ] 22. Add lockout helper functions to authService
  - **File:** `backend/src/services/authService.ts`
  - Add `incrementFailedAttempts(userId: number): Promise<number>` - increments counter, returns new count
  - Add `lockAccount(userId: number): Promise<void>` - sets `lockedUntil` to now + 15 minutes
  - Add `resetFailedAttempts(userId: number): Promise<void>` - sets counter to 0, clears lock
  - Add `isAccountLocked(user: { lockedUntil: Date | null }): boolean` - checks if locked and not expired
  - Add `generateTempPassword(): string` - generates 12-char random password (alphanumeric + symbols)
  - **Acceptance:** 5 new functions exported from authService
  - _Requirements: REQ-SEC-06 (AC 1, 4, 7)_
  - _Leverage: `backend/src/services/authService.ts` existing Prisma patterns_

- [ ] 23. Create authService lockout function tests
  - **File:** `backend/src/services/__tests__/authService.test.ts` (modify existing)
  - Add test: "incrementFailedAttempts increments counter and returns new value"
  - Add test: "lockAccount sets lockedUntil to 15 minutes from now"
  - Add test: "resetFailedAttempts clears counter and lock"
  - Add test: "isAccountLocked returns true when locked and not expired"
  - Add test: "isAccountLocked returns false when lock expired"
  - Add test: "generateTempPassword returns 12-character password with required chars"
  - **Acceptance:** 6+ tests verify lockout helper functions
  - _Requirements: REQ-SEC-06 (AC 1, 4, 6, 7)_
  - _Leverage: `backend/src/services/__tests__/authService.test.ts` existing test patterns_

- [ ] 24. Update login handler to implement account lockout
  - **Files:** `backend/src/routes/auth.routes.ts`, `backend/src/services/authService.ts`
  - **IMPORTANT:** The current login handler calls `authenticateUser()` which bundles user lookup, password verification, and token generation into a single function. This task MUST refactor the login handler to inline/decompose the authenticateUser logic so lockout checks can be inserted at the right points. Either break `authenticateUser()` into smaller functions (findUserByEmail, verifyPassword, generateToken) or inline the logic directly in the route handler. The old `authenticateUser()` function should be removed or deprecated.
  - In POST `/login` handler, after user lookup:
    - Check if `lockedUntil` is set and > now: return 401 with `"Account temporarily locked. Please try again later."`
    - On lockout: log `LOGIN_FAILED` with `reason: 'ACCOUNT_LOCKED'`
  - On password verification failure:
    - Call `incrementFailedAttempts(user.id)`
    - If new count >= 5: call `lockAccount(user.id)`, log `ACCOUNT_LOCKED` audit entry
    - If new count >= 3: include warning in 401 response: `"Having trouble? Reset your password to avoid being locked out."`
  - On successful login: call `resetFailedAttempts(user.id)`
  - **Acceptance:** Login handler implements lockout logic per AC 1-5, 10
  - _Requirements: REQ-SEC-06 (AC 1-5, 10)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing login handler_

- [ ] 25. Update login response to include mustChangePassword flag
  - **File:** `backend/src/routes/auth.routes.ts`
  - In POST `/login` success response, add `mustChangePassword: user.mustChangePassword` to data object
  - **Acceptance:** Login response includes `{ ..., mustChangePassword: boolean }`
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing login response format_

- [ ] 26. Create login lockout integration tests
  - **File:** `backend/src/routes/__tests__/auth.routes.test.ts` (modify existing)
  - Add test: "locks account after 5 failed login attempts"
  - Add test: "returns lockout error for locked account"
  - Add test: "creates ACCOUNT_LOCKED audit log entry"
  - Add test: "includes 3-attempt warning in response after 3 failures"
  - Add test: "resets failed attempts on successful login"
  - Add test: "lockout expires after 15 minutes"
  - **Acceptance:** 6+ tests verify lockout behavior
  - _Requirements: REQ-SEC-06 (AC 1-5, 10)_
  - _Leverage: `backend/src/routes/__tests__/auth.routes.test.ts` existing integration tests_

- [ ] 27. Add sendTempPassword function to authService
  - **File:** `backend/src/services/authService.ts`
  - Add `sendTempPassword(userId: number): Promise<{ email: string; emailSent: boolean }>`
  - Generate temp password, hash it, update user password
  - Reset `failedLoginAttempts` to 0, set `lockedUntil` to null, set `mustChangePassword` to true
  - Call `emailService.sendTempPasswordEmail(user.email, tempPassword)`
  - Return `{ email: user.email, emailSent: true/false }`
  - **Acceptance:** Function generates temp password, unlocks account, emails user, forces password change
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/services/authService.ts` existing password hashing, `backend/src/services/emailService.ts` for email_

- [ ] 28. Create sendTempPasswordEmail function in emailService
  - **File:** `backend/src/services/emailService.ts`
  - Add `sendTempPasswordEmail(email: string, tempPassword: string): Promise<boolean>`
  - Email subject: `"Your Temporary Password - Patient Tracker"`
  - Email body: display temp password, login URL, instructions to change password
  - Use existing `sendEmail()` function
  - **Acceptance:** Function sends temp password email with HTML/text formats
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/services/emailService.ts` existing `sendPasswordResetEmail` pattern_

- [ ] 29. Create emailService sendTempPasswordEmail tests
  - **File:** `backend/src/services/__tests__/emailService.test.ts` (modify existing)
  - Add test: "sendTempPasswordEmail sends email with temp password"
  - Add test: "email includes login URL and instructions"
  - Verify email content includes temp password (mock SMTP transport)
  - **Acceptance:** 2+ tests verify temp password email content
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/services/__tests__/emailService.test.ts` existing email tests_

- [ ] 30. Add send-temp-password endpoint handler
  - **File:** `backend/src/routes/handlers/userHandlers.ts`
  - Add `sendTempPasswordHandler(req: Request, res: Response, next: NextFunction)` function
  - Parse `userId` from `req.params.id`
  - Check SMTP is configured (return 400 if not)
  - Check user exists (return 404 if not)
  - Call `authService.sendTempPassword(userId)`
  - Create `SEND_TEMP_PASSWORD` audit log entry
  - Return `{ success: true, message: "Temporary password sent to <email>", data: { emailSent: true } }`
  - **Acceptance:** Handler sends temp password, unlocks account, creates audit log
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/routes/handlers/userHandlers.ts` existing handler patterns_

- [ ] 31. Add send-temp-password route to admin routes
  - **File:** `backend/src/routes/admin.routes.ts`
  - Import `sendTempPasswordHandler` from `./handlers/userHandlers.js`
  - Add `router.post('/users/:id/send-temp-password', sendTempPasswordHandler);`
  - Route inherits ADMIN role requirement from router-level middleware
  - **Acceptance:** POST /api/admin/users/:id/send-temp-password endpoint exists
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/routes/admin.routes.ts` existing admin routes_

- [ ] 32. Create send-temp-password endpoint tests
  - **File:** `backend/src/routes/__tests__/admin.routes.test.ts` (modify existing)
  - Add test: "POST /users/:id/send-temp-password sends temp password and unlocks account"
  - Add test: "returns 404 if user not found"
  - Add test: "returns 400 if SMTP not configured"
  - Add test: "creates SEND_TEMP_PASSWORD audit log entry"
  - **Acceptance:** 4+ tests verify send-temp-password endpoint
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `backend/src/routes/__tests__/admin.routes.test.ts` existing admin endpoint tests_

- [ ] 33. Add force-change-password endpoint to auth routes
  - **File:** `backend/src/routes/auth.routes.ts`
  - Add POST `/force-change-password` route with `requireAuth` middleware
  - Validate request body: `{ newPassword: string }` (min 8 chars)
  - Check user's `mustChangePassword` flag is true (return 400 if false)
  - Update user password, set `mustChangePassword` to false
  - Generate new JWT token, return in response body (cookie-setting will be added in Group 6 Task 49; for now use existing Bearer token pattern)
  - Return `{ success: true, data: { token, user }, message: "Password changed successfully" }`
  - **Note:** This task uses the existing Bearer token pattern. The httpOnly cookie will be added when Group 6 is implemented. Do NOT add cookie-setting logic here.
  - **Acceptance:** Endpoint allows forced password change without current password
  - _Requirements: REQ-SEC-06 (AC 8-9)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing password change pattern_

- [ ] 34. Update regular password change endpoint to clear mustChangePassword flag
  - **File:** `backend/src/routes/auth.routes.ts`
  - In PUT `/password` handler, after successful password update:
  - If `user.mustChangePassword` is true, update user: `mustChangePassword: false`
  - **Acceptance:** Regular password change also clears mustChangePassword flag
  - _Requirements: REQ-SEC-06 (AC 9)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing PUT /password handler_

- [ ] 35. Create ForcePasswordChange component
  - **File:** `frontend/src/components/ForcePasswordChange.tsx`
  - Full-screen modal overlay (blocks all interaction)
  - Title: "Password Change Required"
  - Form: new password (min 8 chars), confirm password (must match)
  - Submit button calls POST `/api/auth/force-change-password` with `{ newPassword }`
  - On success: call `onPasswordChanged()` callback
  - On error: display error message
  - Props: `{ onPasswordChanged: () => void }`
  - **Acceptance:** Component renders forced password change UI
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `frontend/src/components/modals/` existing modal patterns_

- [ ] 36. Create ForcePasswordChange component tests
  - **File:** `frontend/src/components/ForcePasswordChange.test.tsx`
  - Test: renders change form
  - Test: validates password length (min 8 chars)
  - Test: validates passwords match
  - Test: submits successfully and calls onPasswordChanged
  - Test: displays error on API failure
  - **Acceptance:** 5+ tests verify forced password change UI
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `frontend/src/components/modals/` existing modal tests_

- [ ] 37. Add mustChangePassword state to authStore
  - **File:** `frontend/src/stores/authStore.ts`
  - Add `mustChangePassword: boolean` to `AuthState` interface
  - Update `login` action to set `mustChangePassword` from API response
  - Add `clearMustChangePassword: () => void` action: sets `mustChangePassword: false`
  - Update `logout` action to reset `mustChangePassword: false`
  - **Acceptance:** authStore tracks mustChangePassword flag
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `frontend/src/stores/authStore.ts` existing auth state_

- [ ] 38. Update LoginPage to redirect to force-change-password
  - **File:** `frontend/src/pages/LoginPage.tsx`
  - Add `useEffect` hook: if `isAuthenticated && mustChangePassword`, navigate to `/force-change-password`
  - Else if `isAuthenticated`, navigate to `/` (existing behavior)
  - **Acceptance:** LoginPage redirects to force-change-password when mustChangePassword is true
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `frontend/src/pages/LoginPage.tsx` existing navigation logic_

- [ ] 39. Update LoginPage to display lockout and 3-attempt warning
  - **File:** `frontend/src/pages/LoginPage.tsx`
  - Add `loginWarning: string | null` to component state
  - In login error handler, extract `warning` from `error.response?.data?.error?.warning`
  - Display lockout error message: "Account temporarily locked. Please try again later."
  - Display 3-attempt warning in yellow box with link to `/forgot-password`: "Having trouble? Reset your password to avoid being locked out."
  - **Acceptance:** LoginPage displays lockout and warning messages from API
  - _Requirements: REQ-SEC-06 (AC 2, 10)_
  - _Leverage: `frontend/src/pages/LoginPage.tsx` existing error display_

- [ ] 40. Create LoginPage lockout UI tests
  - **File:** `frontend/src/pages/LoginPage.test.tsx` (modify existing)
  - Add test: "displays lockout error message"
  - Add test: "displays 3-attempt warning with reset password link"
  - Mock API 401 responses with lockout and warning messages
  - **Acceptance:** 2+ tests verify lockout UI display
  - _Requirements: REQ-SEC-06 (AC 2, 10)_
  - _Leverage: `frontend/src/pages/LoginPage.test.tsx` existing error tests_

- [ ] 41. Add force-change-password route to app router
  - **File:** `frontend/src/App.tsx` (or routes config file)
  - Add route: `/force-change-password` → `<ForcePasswordChange onPasswordChanged={handlePasswordChanged} />`
  - `handlePasswordChanged` callback: clear mustChangePassword state, navigate to `/`
  - **Acceptance:** Route exists for forced password change screen
  - _Requirements: REQ-SEC-06 (AC 8)_
  - _Leverage: `frontend/src/App.tsx` existing route definitions_

- [ ] 42. Add "Send Temporary Password" button to admin user management
  - **File:** `frontend/src/pages/AdminPage.tsx` (or UserManagement component)
  - Add button per user row (or user modal): "Send Temporary Password"
  - On click: POST `/api/admin/users/:id/send-temp-password`
  - Display success toast: "Temporary password sent to <email>"
  - Display error toast on failure
  - **Acceptance:** Admin can send temp password to unlock user account
  - _Requirements: REQ-SEC-06 (AC 7)_
  - _Leverage: `frontend/src/pages/AdminPage.tsx` existing admin UI patterns_

---

### Group 6: httpOnly Cookie (REQ-SEC-07)

- [ ] 43. Add cookie-parser middleware to app
  - **File:** `backend/src/app.ts`
  - Import `cookieParser` from `cookie-parser`
  - Add `app.use(cookieParser());` after Helmet, before body parser
  - Add comment: `// Parse cookies for httpOnly JWT auth (REQ-SEC-07)`
  - **Acceptance:** Express parses cookies from incoming requests
  - _Requirements: REQ-SEC-07 (AC 2)_
  - _Leverage: `backend/src/app.ts` existing middleware chain_

- [ ] 44. Update requireAuth middleware to read JWT from cookie
  - **File:** `backend/src/middleware/auth.ts`
  - In `requireAuth` function:
    - Try `req.cookies?.auth_token` first (httpOnly cookie)
    - Fall back to `req.headers.authorization?.substring(7)` (Bearer header)
    - If neither exists, throw 401 error
  - Add comment: `// Try httpOnly cookie first, fall back to Bearer header for migration (REQ-SEC-07)`
  - **Acceptance:** requireAuth reads JWT from cookie or Bearer header
  - _Requirements: REQ-SEC-07 (AC 2)_
  - _Leverage: `backend/src/middleware/auth.ts` existing token extraction_

- [ ] 45. Update optionalAuth middleware to read JWT from cookie
  - **File:** `backend/src/middleware/auth.ts`
  - In `optionalAuth` function: same logic as requireAuth (cookie first, Bearer fallback)
  - **Acceptance:** optionalAuth reads JWT from cookie or Bearer header
  - _Requirements: REQ-SEC-07 (AC 2)_
  - _Leverage: `backend/src/middleware/auth.ts` existing optionalAuth function_

- [ ] 46. Create auth middleware cookie tests
  - **File:** `backend/src/middleware/__tests__/auth.test.ts` (modify existing)
  - Add test: "requireAuth accepts JWT from httpOnly cookie"
  - Add test: "requireAuth falls back to Bearer header"
  - Add test: "requireAuth rejects when neither cookie nor header present"
  - Add test: "optionalAuth accepts JWT from cookie"
  - **Acceptance:** 4+ tests verify cookie-based auth middleware
  - _Requirements: REQ-SEC-07 (AC 2)_
  - _Leverage: `backend/src/middleware/__tests__/auth.test.ts` existing auth tests_

- [ ] 47. Update socketAuth middleware to read JWT from cookie
  - **File:** `backend/src/middleware/socketAuth.ts`
  - Parse cookie string from `socket.handshake.headers.cookie` (Socket.IO does not use cookie-parser)
  - Add inline cookie parser function: `parseCookies(cookieString: string): Record<string, string>`
  - Try `parseCookies(socket.handshake.headers.cookie)?.auth_token` first
  - Fall back to `socket.handshake.auth?.token` (backward compatibility)
  - If neither exists, call `next(new Error('Authentication failed: no token provided'))`
  - **Acceptance:** Socket.IO authenticates via cookie or auth payload
  - _Requirements: REQ-SEC-07 (user experience impact)_
  - _Leverage: `backend/src/middleware/socketAuth.ts` existing auth logic_

- [ ] 48. Create socketAuth cookie tests
  - **File:** `backend/src/middleware/__tests__/socketAuth.test.ts` (modify existing)
  - Add test: "authenticates Socket.IO connection via cookie"
  - Add test: "falls back to auth payload token"
  - Add test: "rejects when neither cookie nor auth token present"
  - **Acceptance:** 3+ tests verify Socket.IO cookie auth
  - _Requirements: REQ-SEC-07 (user experience impact)_
  - _Leverage: `backend/src/middleware/__tests__/socketAuth.test.ts` existing tests_

- [ ] 49. Update login handler to set httpOnly cookie
  - **File:** `backend/src/routes/auth.routes.ts`
  - In POST `/login` success handler, add:
    ```typescript
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 28800000, // 8 hours
    });
    ```
  - Keep `token` in response body for backward compatibility (migration period)
  - **Acceptance:** Login sets httpOnly cookie with correct attributes
  - _Requirements: REQ-SEC-07 (AC 1, 7)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing login response_

- [ ] 50. Update logout handler to clear httpOnly cookie
  - **File:** `backend/src/routes/auth.routes.ts`
  - In POST `/logout` handler, add:
    ```typescript
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    ```
  - **Acceptance:** Logout clears httpOnly cookie
  - _Requirements: REQ-SEC-07 (AC 3)_
  - _Leverage: `backend/src/routes/auth.routes.ts` existing logout handler_

- [ ] 51. Create auth routes cookie tests
  - **File:** `backend/src/routes/__tests__/auth.routes.test.ts` (modify existing)
  - Add test: "POST /login sets httpOnly cookie"
  - Add test: "POST /logout clears httpOnly cookie"
  - Verify cookie attributes: httpOnly, secure (in prod), sameSite, path, maxAge
  - **Acceptance:** 2+ tests verify login/logout cookie handling
  - _Requirements: REQ-SEC-07 (AC 1, 3)_
  - _Leverage: `backend/src/routes/__tests__/auth.routes.test.ts` existing integration tests_

- [ ] 52. Update axios config to send cookies with requests
  - **File:** `frontend/src/api/axios.ts`
  - Add `withCredentials: true` to axios instance config:
    ```typescript
    export const api = axios.create({
      baseURL: apiBaseUrl,
      withCredentials: true,  // Send cookies with every request (REQ-SEC-07)
      headers: { 'Content-Type': 'application/json' },
    });
    ```
  - **Acceptance:** Axios sends cookies with all API requests
  - _Requirements: REQ-SEC-07 (AC 4)_
  - _Leverage: `frontend/src/api/axios.ts` existing axios instance_

- [ ] 53. Remove Bearer header from axios request interceptor
  - **File:** `frontend/src/api/axios.ts`
  - In `api.interceptors.request.use()`, remove `Authorization: Bearer` header logic
  - Keep `X-Socket-ID` header (existing functionality)
  - Add comment: `// Auth handled via httpOnly cookie (withCredentials: true), no Bearer header needed (REQ-SEC-07)`
  - **Acceptance:** Axios no longer sends Authorization header
  - _Requirements: REQ-SEC-07 (AC 4)_
  - _Leverage: `frontend/src/api/axios.ts` existing request interceptor_

- [ ] 54. Add 429 rate limit handling to axios response interceptor
  - **File:** `frontend/src/api/axios.ts`
  - In `api.interceptors.response.use()` error handler:
  - Check `error.response?.status === 429`
  - Log warning: `logger.warn('Rate limited:', { url, retryAfter })`
  - No special UI action needed (error message already bubbles up)
  - **Acceptance:** Axios logs rate limit errors
  - _Requirements: REQ-SEC-03 (user experience)_
  - _Leverage: `frontend/src/api/axios.ts` existing error interceptor_

- [ ] 55. Remove token from authStore localStorage persistence
  - **File:** `frontend/src/stores/authStore.ts`
  - Remove `localStorage.setItem('auth_token', token)` from `login` action
  - Remove `localStorage.removeItem('auth_token')` from `logout` action
  - Update `checkAuth` to not use `localStorage.getItem('auth_token')`
  - Update Zustand `persist` middleware `partialize` option: exclude `token` field
  - Keep `token` in memory for backward compatibility (not persisted)
  - **Acceptance:** authStore no longer stores token in localStorage
  - _Requirements: REQ-SEC-07 (AC 5)_
  - _Leverage: `frontend/src/stores/authStore.ts` existing persist config_

- [ ] 56. Update authStore checkAuth to use cookie
  - **File:** `frontend/src/stores/authStore.ts`
  - In `checkAuth` action:
  - Remove `localStorage.getItem('auth_token')` check
  - Call `api.get('/auth/me')` directly (cookie sent automatically via `withCredentials: true`)
  - On success: set user state
  - On failure: clear auth state
  - **Acceptance:** checkAuth relies on httpOnly cookie, not localStorage
  - _Requirements: REQ-SEC-07 (AC 5)_
  - _Leverage: `frontend/src/stores/authStore.ts` existing checkAuth logic_

- [ ] 57. Create authStore cookie tests
  - **File:** `frontend/src/stores/authStore.test.ts` (modify existing)
  - Add test: "login does not store token in localStorage"
  - Add test: "logout does not remove token from localStorage"
  - Add test: "checkAuth works without localStorage token"
  - Verify `localStorage.getItem('auth_token')` is never called
  - **Acceptance:** 3+ tests verify cookie-based auth store
  - _Requirements: REQ-SEC-07 (AC 5, 6)_
  - _Leverage: `frontend/src/stores/authStore.test.ts` existing auth tests_

- [ ] 58. Update socketService to use cookie-based auth
  - **File:** `frontend/src/services/socketService.ts`
  - Remove `token` parameter from `connect()` function signature
  - Remove `auth: { token }` from Socket.IO config
  - Add `withCredentials: true` to Socket.IO config
  - Add comment: `// Auth handled via httpOnly cookie sent on WebSocket upgrade (REQ-SEC-07)`
  - Update all call sites to remove `token` argument
  - **Acceptance:** Socket.IO connects using cookie, not auth payload
  - _Requirements: REQ-SEC-07 (user experience impact)_
  - _Leverage: `frontend/src/services/socketService.ts` existing Socket.IO config_

- [ ] 59. Add CSRF protection via Origin header validation
  - **File:** `backend/src/middleware/csrf.ts` (new file)
  - Create middleware: `validateCsrf(req: Request, res: Response, next: NextFunction)`
  - On POST/PUT/DELETE requests:
    - Check `Origin` or `Referer` header matches allowed origins
    - If not allowed, return 403 Forbidden
  - Export middleware
  - **Acceptance:** Middleware validates Origin/Referer headers for state-changing requests
  - _Requirements: REQ-SEC-07 (AC 8)_
  - _Leverage: Express middleware patterns from `backend/src/middleware/auth.ts`_

- [ ] 60. Apply CSRF protection to app
  - **File:** `backend/src/app.ts`
  - Import `validateCsrf` from `./middleware/csrf.js`
  - Add `app.use(validateCsrf);` after CORS, before routes
  - Add comment: `// CSRF protection via Origin/Referer validation (REQ-SEC-07)`
  - **Acceptance:** CSRF protection applied globally
  - _Requirements: REQ-SEC-07 (AC 8)_
  - _Leverage: `backend/src/app.ts` existing middleware chain_

---

### Group 7: Documentation & Installation Guides

- [ ] 61. Update .env.example with new environment variables
  - **File:** `.env.example`
  - Add entries for:
    - `JWT_SECRET` (with generation command: `openssl rand -hex 32`)
    - `SMTP_HOST` (example: `smtp.example.com`)
    - `ADMIN_EMAIL` (note: change from default in production)
    - `ADMIN_PASSWORD` (note: change from default in production)
    - All `RATE_LIMIT_*` variables with defaults
  - Add comments explaining each variable
  - **Acceptance:** .env.example includes all new required and optional env vars
  - _Requirements: All (NFR-DOC-01)_
  - _Leverage: `.env.example` existing format_

- [ ] 62. Update QUICK_INSTALL.md with env var setup
  - **File:** `docs/QUICK_INSTALL.md`
  - Add step in environment configuration section:
    - Generate JWT_SECRET: `openssl rand -hex 32`
    - Set SMTP_HOST (required in production)
    - Change ADMIN_EMAIL from default
    - Change ADMIN_PASSWORD from default
  - Add rate limit configuration (optional)
  - **Acceptance:** Quick install guide documents required env vars
  - _Requirements: All (NFR-DOC-01)_
  - _Leverage: `docs/QUICK_INSTALL.md` existing step format_

- [ ] 63. Update INSTALLATION_GUIDE.md with full env var reference
  - **File:** `docs/INSTALLATION_GUIDE.md`
  - Add "Security Configuration" section
  - Add table with all new env vars: name, required/optional, default, description, how to generate
  - Document rate limiting: how to disable, how to customize thresholds
  - Document account lockout: 5 attempts/15min, temp password flow
  - **Acceptance:** Installation guide has comprehensive env var reference
  - _Requirements: All (NFR-DOC-01)_
  - _Leverage: `docs/INSTALLATION_GUIDE.md` existing sections_

- [ ] 64. Update WINDOWS_SERVER_INSTALL.md with PowerShell env var setup
  - **File:** `docs/WINDOWS_SERVER_INSTALL.md`
  - Add PowerShell commands to set env vars:
    - `$env:JWT_SECRET = "$(openssl rand -hex 32)"`
    - `$env:SMTP_HOST = "smtp.example.com"`
    - `$env:ADMIN_EMAIL = "admin@yourclinic.com"`
    - `$env:ADMIN_PASSWORD = "YourSecurePassword123"`
  - **Acceptance:** Windows install guide includes PowerShell env var setup
  - _Requirements: All (NFR-DOC-01)_
  - _Leverage: `docs/WINDOWS_SERVER_INSTALL.md` existing PowerShell commands_

- [ ] 65. Update RENDER_INSTALL.md with Render dashboard env vars
  - **File:** `docs/RENDER_INSTALL.md`
  - Add instructions for setting env vars in Render dashboard:
    - Navigate to service → Environment
    - Add JWT_SECRET (generate via `openssl rand -hex 32`)
    - Add SMTP_HOST
    - Add ADMIN_EMAIL (change from default)
    - Add ADMIN_PASSWORD (change from default)
  - Note: CORS_ORIGIN is optional (defaults to allow all)
  - **Acceptance:** Render install guide documents env var setup in dashboard
  - _Requirements: All (NFR-DOC-01)_
  - _Leverage: `docs/RENDER_INSTALL.md` existing Render dashboard instructions_

- [ ] 66. Update CHANGELOG.md with security hardening entry
  - **File:** `.claude/CHANGELOG.md`
  - Add new entry for security hardening feature
  - List all 7 requirements implemented
  - Note: CORS_ORIGIN optional, rate limiting configurable, account lockout 5/15min
  - **Acceptance:** CHANGELOG documents security hardening changes
  - _Requirements: All (pre-commit workflow)_
  - _Leverage: `.claude/CHANGELOG.md` existing entry format_

- [ ] 67. Update IMPLEMENTATION_STATUS.md with feature status
  - **File:** `.claude/IMPLEMENTATION_STATUS.md`
  - Mark security hardening feature as complete
  - List test counts: backend, frontend, E2E
  - Note any deferred requirements (REQ-SEC-01, 08, 09, 11, 12)
  - **Acceptance:** IMPLEMENTATION_STATUS reflects completed security hardening
  - _Requirements: All (pre-commit workflow)_
  - _Leverage: `.claude/IMPLEMENTATION_STATUS.md` existing feature entries_

- [ ] 68. Update TODO.md to remove completed security tasks
  - **File:** `.claude/TODO.md`
  - Remove security hardening tasks from active list
  - Move deferred requirements to "Future Enhancements" section
  - **Acceptance:** TODO.md reflects completed work
  - _Requirements: All (pre-commit workflow)_
  - _Leverage: `.claude/TODO.md` existing task format_

---

### Group 8: Visual Browser Review (MANDATORY)

- [ ] 69. Visual browser review of login page error handling (Layer 5)
  - **Agent:** ui-ux-reviewer (MCP Playwright)
  - **Page:** LoginPage (http://localhost:5173/login)
  - Test login with invalid credentials 3 times → verify 3-attempt warning displays with reset password link
  - Test login 5 times with invalid credentials → verify account lockout error message displays
  - Test login during rate limit (21+ attempts) → verify 429 rate limit error message displays
  - Test forced password change flow: login with temp password → verify redirect to /force-change-password
  - Verify all error messages are readable, properly styled, and actionable
  - Take screenshots at each error state
  - **Acceptance:** All login error states display correctly, no visual issues
  - _Requirements: REQ-SEC-03, REQ-SEC-06_

- [ ] 70. Visual browser review of ForcePasswordChange component (Layer 5)
  - **Agent:** ui-ux-reviewer (MCP Playwright)
  - **Page:** ForcePasswordChange (http://localhost:5173/force-change-password)
  - Log in with user that has `mustChangePassword: true`
  - Verify modal blocks all interaction with main app
  - Test password validation (too short, mismatch)
  - Test successful password change → verify redirect to main page
  - Verify form layout, spacing, button states
  - Take screenshots of initial state, validation errors, success state
  - **Acceptance:** Forced password change UI is clear, functional, blocks other actions
  - _Requirements: REQ-SEC-06_

- [ ] 71. Visual browser review of admin "Send Temporary Password" button (Layer 5)
  - **Agent:** ui-ux-reviewer (MCP Playwright)
  - **Page:** AdminPage or UserManagement (http://localhost:5173/admin)
  - Log in as ADMIN
  - Navigate to user management section
  - Verify "Send Temporary Password" button is visible per user row
  - Click button → verify success toast displays
  - Verify button disabled state while request is in-flight
  - Take screenshots of button, success toast, error state
  - **Acceptance:** Admin temp password button is functional and provides clear feedback
  - _Requirements: REQ-SEC-06_

- [ ] 72. Visual browser review of existing functionality after cookie migration (Layer 5)
  - **Agent:** ui-ux-reviewer (MCP Playwright)
  - **Pages:** MainPage, ImportPage, AdminPage (all major flows)
  - Log in as STAFF, PHYSICIAN, ADMIN (test all roles)
  - Navigate through app: patient grid, add row, edit cells, import, admin panel
  - Verify all API calls succeed (cookies sent automatically)
  - Verify Socket.IO connection works (cookie-based auth)
  - Verify logout clears session (cannot access protected pages)
  - Take screenshots at key points (logged in, grid loaded, logout)
  - **Acceptance:** All existing functionality works after cookie migration, no regressions
  - _Requirements: REQ-SEC-07 (NFR-COMPAT-04)_

---

## Task Summary

### Total Tasks: 72

**Group 1 (Startup & Config):** 4 tasks
- 1 new file (validateEnv.ts)
- 1 test file
- 2 file modifications (index.ts, config/index.ts)

**Group 2 (Rate Limiting):** 11 tasks
- 1 new file (rateLimiter.ts)
- 1 test file
- 4 file modifications (app.ts, auth.routes.ts, import.routes.ts, LoginPage.tsx)
- 2 test updates (auth.routes.test.ts, LoginPage.test.tsx)
- 1 dependency install

**Group 3 (CORS):** 1 task
- 1 file verification (app.ts, no change needed)

**Group 4 (Failed Login Logging):** 4 tasks
- 3 file modifications (schema.prisma, auth.routes.ts, AdminPage.tsx)
- 1 test update (auth.routes.test.ts)

**Group 5 (Account Lockout):** 22 tasks
- 3 new files (ForcePasswordChange.tsx, force-change-password route, send-temp-password endpoint)
- 6 test files (authService, auth.routes, emailService, admin.routes, ForcePasswordChange, LoginPage)
- 8 file modifications (authService.ts, emailService.ts, auth.routes.ts, admin.routes.ts, userHandlers.ts, authStore.ts, LoginPage.tsx, AdminPage.tsx)
- 1 database migration

**Group 6 (httpOnly Cookie):** 18 tasks
- 1 new file (csrf.ts)
- 5 test updates (auth.test.ts, socketAuth.test.ts, auth.routes.test.ts, authStore.test.ts, integration tests)
- 7 file modifications (app.ts, auth.ts, socketAuth.ts, auth.routes.ts, axios.ts, authStore.ts, socketService.ts)

**Group 7 (Documentation):** 8 tasks
- 8 file updates (.env.example, 4 installation guides, CHANGELOG, IMPLEMENTATION_STATUS, TODO)

**Group 8 (Visual Review):** 4 tasks
- 4 MCP Playwright visual review sessions (login errors, ForcePasswordChange, admin button, existing functionality)

### Deployment Order

1. **Deploy Group 1** (Startup & Config) → safe, no runtime impact if env vars are set
2. **Deploy Group 2** (Rate Limiting) → independent, no frontend changes
3. **Deploy Group 3** (CORS) → verification only, depends on Group 1
4. **Deploy Group 4** (Failed Login Logging) → independent, adds audit logs only
5. **Deploy Group 5** (Account Lockout) → depends on Group 4, includes DB migration
6. **Deploy Group 6** (httpOnly Cookie) → backend + frontend together, supports migration period
7. **Update Group 7** (Documentation) → post-deployment
8. **Run Group 8** (Visual Review) → final verification before commit

### Estimated Implementation Time

- Group 1: 2 hours (4 tasks × 30 min)
- Group 2: 5.5 hours (11 tasks × 30 min)
- Group 3: 15 min (1 task)
- Group 4: 2 hours (4 tasks × 30 min)
- Group 5: 11 hours (22 tasks × 30 min)
- Group 6: 9 hours (18 tasks × 30 min)
- Group 7: 4 hours (8 tasks × 30 min)
- Group 8: 2 hours (4 visual reviews × 30 min each)

**Total: ~36 hours of implementation time**

### Testing Checklist

**Before committing, verify:**
- [ ] All backend unit tests pass (Jest): `cd backend && npm test`
- [ ] All frontend component tests pass (Vitest): `cd frontend && npm run test:run`
- [ ] All Playwright E2E tests pass: `cd frontend && npm run e2e`
- [ ] All Cypress E2E tests pass: `cd frontend && npm run cypress:run`
- [ ] MCP Playwright visual reviews complete (Group 8)
- [ ] Manual testing: login, lockout, temp password, forced password change
- [ ] Manual testing: rate limiting (21 login attempts)
- [ ] Manual testing: existing functionality works (patient grid, import, admin)

### Key Reuse Points

| Existing Pattern | File | How It's Reused |
|------------------|------|-----------------|
| Express middleware | `backend/src/middleware/auth.ts` | Rate limiter, cookie parser, CSRF middleware patterns |
| Prisma models | `backend/prisma/schema.prisma` | Add 3 fields to User model, existing migration workflow |
| Service patterns | `backend/src/services/authService.ts` | Lockout helper functions, temp password generation |
| Email service | `backend/src/services/emailService.ts` | Temp password email using existing SMTP transport |
| Audit logging | `backend/src/routes/auth.routes.ts` | Failed login and lockout audit entries |
| API routes | `backend/src/routes/admin.routes.ts` | Send-temp-password endpoint using existing handler patterns |
| Modal components | `frontend/src/components/modals/` | ForcePasswordChange modal using existing modal patterns |
| Auth store | `frontend/src/stores/authStore.ts` | Add mustChangePassword state, update cookie-based auth |
| Axios config | `frontend/src/api/axios.ts` | Add withCredentials, remove Bearer header |
| Socket.IO | `frontend/src/services/socketService.ts` | Update to cookie-based auth |
| Test patterns | `backend/src/services/__tests__/`, `frontend/src/pages/*.test.tsx` | Jest, Vitest, Playwright, Cypress test patterns |

---

## Notes

**Critical Path:**
- Group 1 (validateEnv) must complete before Groups 2-6 deploy to production
- Group 4 (failed login logging) must complete before Group 5 (account lockout)
- Group 6 (httpOnly cookie) requires backend + frontend deployment together

**Migration Strategy:**
- JWT auth supports both cookie and Bearer header during migration period
- Socket.IO auth supports both cookie and auth payload
- Frontend can be deployed after backend (Bearer header continues working)

**Deferred Items:**
- REQ-SEC-01 (HTTPS/TLS): No cert info available
- REQ-SEC-08 (CSP): Skipped by user
- REQ-SEC-09 (Refresh Tokens): 8-hour JWT sufficient for now
- REQ-SEC-11 (Hide DB Port): Deferred by user
- REQ-SEC-12 (Field-Level Encryption): Deferred by user

**User Decision Overrides:**
- CORS_ORIGIN is optional (defaults to `origin: true`)
- Only 4 env vars required: JWT_SECRET, SMTP_HOST, ADMIN_EMAIL, ADMIN_PASSWORD
- DATABASE_URL is set by infrastructure, not validated
- Rate limiting is configurable via env vars, can be disabled with `RATE_LIMIT_ENABLED=false`
