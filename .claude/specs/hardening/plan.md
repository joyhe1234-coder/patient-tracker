# Production Hardening Plan

## Audit Summary (Current Score: 5.6/10)

| Domain | Score | Critical Issues |
|--------|-------|-----------------|
| Security | 5.5/10 | No rate limiting, JWT in localStorage, no account lockout |
| Observability | 3.5/10 | console.log only, no metrics, no error tracking |
| Lifecycle & Resilience | 5.5/10 | No request timeouts, no unhandled rejection handlers |
| Data Integrity & Backup | 5.5/10 | CRUD not transactional, no backups, no optimistic locking |
| DevOps & Deployment | 7.2/10 | Cypress not in CI, no monitoring, no rollback |
| API & Session Management | 6.5/10 | No rate limiting, no refresh tokens, weak CORS |

**Target Score: 8.0/10** across all domains

---

## Phase 1: Critical Security & Stability (Priority: CRITICAL)
*Estimated: 15-20 items, highest impact*

### 1.1 Rate Limiting (Security + API)
**Current:** Zero rate limiting on any endpoint
**Risk:** Brute force attacks, DoS, credential stuffing
**Fix:**
- Install `express-rate-limit`
- Global rate limit: 100 requests/min per IP
- Auth endpoints (`/api/auth/login`, `/api/auth/change-password`): 5 requests/15 min
- Import endpoint: 10 requests/min
- Admin endpoints: 30 requests/min
**Files:** `backend/src/index.ts`, new `backend/src/middleware/rateLimiter.ts`
**Effort:** S (1-2 hours)

### 1.2 Account Lockout
**Current:** Unlimited login attempts
**Risk:** Brute force password attacks
**Fix:**
- Track failed login attempts per email in DB or memory
- Lock account after 5 failed attempts for 15 minutes
- Return generic "Invalid credentials" (don't reveal if email exists)
**Files:** `backend/src/services/authService.ts`, `backend/prisma/schema.prisma` (add failedAttempts, lockedUntil fields)
**Effort:** M (2-3 hours)

### 1.3 Unhandled Error Handlers (Lifecycle)
**Current:** No `unhandledRejection` or `uncaughtException` handlers
**Risk:** Silent crashes, data corruption
**Fix:**
```typescript
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  // Log but don't exit - let the process manager handle it
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1); // Must exit after uncaught exception
});
```
**Files:** `backend/src/index.ts`
**Effort:** S (30 min)

### 1.4 Request Timeouts
**Current:** No timeout on Express routes or Axios calls
**Risk:** Hung requests exhaust server resources
**Fix:**
- Express: `server.setTimeout(30000)` (30s)
- Frontend Axios: `timeout: 15000` in axios instance config
**Files:** `backend/src/index.ts`, `frontend/src/` (axios config)
**Effort:** S (30 min)

### 1.5 React Error Boundary
**Current:** Any render error crashes the entire app
**Risk:** One component failure takes down the whole UI
**Fix:**
- Create `ErrorBoundary` component wrapping main content
- Show user-friendly error message with "Reload" button
- Log error details to console (or future error service)
**Files:** New `frontend/src/components/ErrorBoundary.tsx`, `frontend/src/App.tsx`
**Effort:** S (1 hour)

### 1.6 Graceful Shutdown
**Current:** No SIGTERM handler, no connection cleanup
**Risk:** Abrupt termination loses in-flight requests, DB connections leak
**Fix:**
```typescript
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```
**Files:** `backend/src/index.ts`
**Effort:** S (30 min)

---

## Phase 2: Security Hardening (Priority: HIGH)

### 2.1 JWT Security Improvements
**Current:** JWT stored in localStorage (XSS vulnerable), no refresh token
**Fix (httpOnly cookies):**
- Move JWT to httpOnly, secure, sameSite cookie
- Set cookie on login, clear on logout
- Frontend: Remove localStorage JWT handling, use cookie-based auth
- Add CSRF protection token
**Files:** `backend/src/services/authService.ts`, `backend/src/middleware/auth.ts`, `frontend/src/stores/authStore.ts`
**Effort:** L (4-6 hours) - touches auth across entire stack

### 2.2 Refresh Token Mechanism
**Current:** 8-hour JWT, no refresh. User loses session mid-work
**Fix:**
- Issue refresh token (7-day expiry) alongside access token (15-min expiry)
- Add `/api/auth/refresh` endpoint
- Frontend: Auto-refresh before expiry using axios interceptor
- Store refresh token in httpOnly cookie
**Files:** `backend/src/routes/auth.routes.ts`, `backend/src/services/authService.ts`, `frontend/src/stores/authStore.ts`
**Effort:** L (4-6 hours)

### 2.3 CORS Hardening
**Current:** `ALLOWED_ORIGINS` defaults to `*` if env var not set
**Fix:**
- Remove wildcard default
- Require explicit `ALLOWED_ORIGINS` env var
- Fail startup if not configured (in production)
**Files:** `backend/src/index.ts`
**Effort:** S (30 min)

### 2.4 Security Headers (Helmet)
**Current:** Basic Helmet, CSP disabled
**Fix:**
- Enable Content-Security-Policy with proper directives
- Add `Strict-Transport-Security` for HTTPS
- Enable `X-Content-Type-Options: nosniff`
**Files:** `backend/src/index.ts`
**Effort:** S (1 hour)

### 2.5 Input Validation on All Endpoints
**Current:** Minimal validation, some routes trust client input
**Fix:**
- Add Zod schemas for all route parameters
- Validate request body, params, and query strings
- Return 400 with structured error messages
**Files:** New `backend/src/middleware/validation.ts`, all route files
**Effort:** M-L (3-5 hours)

---

## Phase 3: Observability & Monitoring (Priority: HIGH)

### 3.1 Structured Logging
**Current:** 50+ console.log statements, no structured format
**Fix:**
- Install `winston` or `pino`
- Create logger with JSON format, levels, timestamps
- Replace all `console.log` with `logger.info/warn/error`
- Add request ID to all log entries
**Files:** New `backend/src/utils/logger.ts`, all files using console.log
**Effort:** M (3-4 hours)

### 3.2 Request Logging Middleware
**Current:** No request/response logging
**Fix:**
- Add morgan or custom middleware logging: method, path, status, duration
- Include request ID for correlation
- Log response time for performance monitoring
**Files:** `backend/src/index.ts`, new middleware
**Effort:** S (1 hour)

### 3.3 Health Check Endpoint Enhancement
**Current:** Basic `/api/health` returns 200
**Fix:**
- Add DB connectivity check
- Add uptime, memory usage, version info
- Add `/api/health/ready` for deployment readiness
**Files:** `backend/src/routes/` (health route)
**Effort:** S (1 hour)

### 3.4 Frontend Error Tracking
**Current:** Errors silently fail or show generic messages
**Fix:**
- Add global error handler in ErrorBoundary
- Log errors with component stack trace
- Toast notifications for API errors
**Files:** `frontend/src/components/ErrorBoundary.tsx`, axios interceptor
**Effort:** S (1 hour)

---

## Phase 4: Data Integrity & Backup (Priority: HIGH)

### 4.1 Database Transactions for Multi-Table Operations
**Current:** CRUD operations on patients + measures not wrapped in transactions
**Risk:** Partial writes on failure (e.g., patient created but measures fail)
**Fix:**
- Wrap patient create/update + measures in `prisma.$transaction()`
- Wrap import pipeline in transaction
- Wrap delete operations in transaction
**Files:** `backend/src/routes/data.routes.ts`, `backend/src/routes/import.routes.ts`
**Effort:** M (2-3 hours)

### 4.2 Automated Database Backup
**Current:** Zero backup strategy
**Risk:** Data loss from corruption, accidental deletion, or infrastructure failure
**Fix (Render):**
- Render Postgres has automatic daily backups on paid plans
- Add manual backup cron job: `pg_dump` to cloud storage
- Create a Render cron job that backs up DB daily
**Files:** New `backend/scripts/backup.ts`, Render cron job config
**Effort:** M (2-3 hours)

### 4.3 Optimistic Locking (Concurrent Edit Protection)
**Current:** Last-write-wins, no conflict detection
**Risk:** Two users editing same patient → silent data loss
**Fix:**
- Add `version` field to Patient model
- Include version in update WHERE clause
- Return 409 Conflict if version mismatch
- Frontend shows "Record was modified by another user" dialog
**Files:** `backend/prisma/schema.prisma`, `backend/src/routes/data.routes.ts`, frontend grid
**Effort:** L (4-6 hours)

### 4.4 Data Export Capability
**Current:** No way to export patient data
**Risk:** No way to create manual backups, compliance issues
**Fix:**
- Add CSV export endpoint: `GET /api/patients/export`
- Admin-only access
- Include all patient fields + measures
**Files:** New endpoint in `backend/src/routes/data.routes.ts`
**Effort:** M (2-3 hours)

---

## Phase 5: DevOps & Deployment (Priority: MEDIUM)

### 5.1 CI Pipeline Enhancement
**Current:** GitHub Actions runs Jest + Vitest + Playwright, but NOT Cypress (205 tests)
**Fix:**
- Add Cypress to CI pipeline
- Add build verification step
- Add lint check
**Files:** `.github/workflows/` CI config
**Effort:** M (2-3 hours)

### 5.2 Environment Variable Validation
**Current:** Missing env vars cause silent failures
**Fix:**
- Validate all required env vars on startup
- Fail fast with clear error messages
- Different requirements for dev vs production
**Files:** New `backend/src/config/validateEnv.ts`, `backend/src/index.ts`
**Effort:** S (1 hour)

### 5.3 Database Migration Safety
**Current:** Migrations are forward-only, no rollback scripts
**Fix:**
- Create down migrations for each up migration
- Document rollback procedures
- Test migration rollback in CI
**Files:** `backend/prisma/migrations/`
**Effort:** M (2-3 hours)

---

## Phase 6: Nice-to-Have Improvements (Priority: LOW)

### 6.1 API Documentation
- Add Swagger/OpenAPI spec for all endpoints
- Auto-generate from route definitions

### 6.2 Performance Monitoring
- Add response time histograms
- DB query performance tracking
- Frontend bundle size monitoring

### 6.3 Session Management UI
- Show active sessions in admin panel
- Allow admin to revoke sessions
- Show last login timestamp

### 6.4 Audit Log Enhancement
- Log all data changes with before/after values
- Admin UI to view audit trail
- Export audit logs

---

## Implementation Order (Recommended)

```
Week 1: Phase 1 (Critical) - All items
  ├── 1.1 Rate Limiting
  ├── 1.2 Account Lockout
  ├── 1.3 Unhandled Error Handlers
  ├── 1.4 Request Timeouts
  ├── 1.5 React Error Boundary
  └── 1.6 Graceful Shutdown

Week 2: Phase 2 (Security) + Phase 3 (Observability)
  ├── 2.1 JWT httpOnly Cookies
  ├── 2.3 CORS Hardening
  ├── 2.4 Security Headers
  ├── 3.1 Structured Logging
  ├── 3.2 Request Logging
  └── 3.3 Health Check Enhancement

Week 3: Phase 2 (continued) + Phase 4 (Data)
  ├── 2.2 Refresh Tokens
  ├── 2.5 Input Validation
  ├── 4.1 Database Transactions
  ├── 4.2 Automated Backup
  └── 4.4 Data Export

Week 4: Phase 4 (continued) + Phase 5 (DevOps)
  ├── 4.3 Optimistic Locking
  ├── 5.1 CI Pipeline (Cypress)
  ├── 5.2 Env Var Validation
  └── 5.3 Migration Safety
```

## Expected Final Scores

| Domain | Current | Target | Key Improvements |
|--------|---------|--------|-----------------|
| Security | 5.5 | 8.5 | Rate limiting, JWT cookies, lockout, validation |
| Observability | 3.5 | 8.0 | Structured logging, request logging, error tracking |
| Lifecycle | 5.5 | 9.0 | Graceful shutdown, error handlers, timeouts |
| Data Integrity | 5.5 | 8.0 | Transactions, backups, optimistic locking |
| DevOps | 7.2 | 8.5 | Cypress in CI, env validation |
| API/Session | 6.5 | 8.5 | Rate limiting, refresh tokens, CORS |
| **Overall** | **5.6** | **8.4** | |

---

## Decision Points for User

1. **JWT Storage (2.1):** httpOnly cookies (more secure but complex) vs keep localStorage with XSS mitigations?
2. **Refresh Tokens (2.2):** Implement now or defer? Adds complexity but better UX
3. **Optimistic Locking (4.3):** Full version-based locking or simpler "last modified" check?
4. **Backup Strategy (4.2):** Render automatic backups (requires paid plan) or custom cron job?
5. **Logging Library (3.1):** Winston (feature-rich) or Pino (faster)?

---
*Generated: 2026-02-05*
*Based on: 6-domain audit analysis*
