# Implementation Plan: test-auth-security

## Task Overview

Write 22 new tests across 7 task groups to fill the 18 remaining coverage gaps in the Authentication & Security module. This spec adds tests only — no production code changes. Each task produces one file (new or extended) and is independently executable.

**Current baseline:** 323 auth/security tests across 4 layers
**Projected total after all tasks complete:** ~345 tests
**Coverage improvement:** 89% (120/134 AC) -> 100% (134/134 AC)

**Test distribution:**
- T1: 3 Cypress tests — Admin API 403 enforcement (extend existing file)
- T2: 4 Jest tests — CORS configuration (new file)
- T3: 5 Jest tests — Helmet security headers (new file)
- T4: 3 Jest tests — Login assignment responses per role (extend existing file)
- T5: 5 Jest tests — JWT, password, and audit log edge cases (extend existing files)
- T6: 1 Jest test — Empty body login validation (extend existing file)
- T7: 1 Vitest test — ProtectedRoute ForcePasswordChange (extend existing file)
- T8: Regression verification — run full test suite

## Steering Document Compliance

- Cypress tests follow the pattern in `frontend/cypress/e2e/role-access-control.cy.ts`
- Jest route tests follow the ESM pattern in `backend/src/routes/__tests__/auth.routes.test.ts` (jest.unstable_mockModule + dynamic import)
- Jest service tests follow the pattern in `backend/src/services/__tests__/authService.test.ts`
- Vitest component tests follow the pattern in `frontend/src/components/auth/ProtectedRoute.test.tsx`
- Cypress tests use seed accounts: `ko037291@gmail.com` (admin), `phy1@gmail.com` (physician), `staff1@gmail.com` (staff) — password: `welcome100`
- All new Jest integration tests (CORS, Helmet) use supertest against the Express app
- No tests target deferred features: rate limiting (REQ-SEC-03), httpOnly cookies (REQ-SEC-07), refresh tokens (REQ-SEC-09)

## Atomic Task Requirements

Each task meets these criteria:
- **File Scope**: 1 file created or 1 file extended
- **Time Boxing**: 15-30 minutes
- **Single Purpose**: One test file, one behavioral area
- **Specific Files**: Exact paths listed
- **Agent-Friendly**: Includes run command to verify passing

---

## Tasks

### Task T1: Cypress E2E — Non-ADMIN API 403 Enforcement
- **Priority**: HIGH
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/role-access-control.cy.ts` (extend existing)
- **Tests to Write**: 3
- **Gap IDs**: GAP TC-08.2a, TC-08.2b, TC-08.2c
- **Requirement**: REQ-TEST-08 (Route Protection, criterion #2)
- **Description**: Verify that authenticated non-ADMIN users receive HTTP 403 (not 401) when calling admin-only API endpoints. The existing file tests unauthenticated 401 responses but does not test authenticated-but-unauthorized 403. These tests authenticate as PHYSICIAN or STAFF, then call admin API routes and assert 403 FORBIDDEN.
- **Test list**:
  1. `PHYSICIAN calling /api/admin/users with valid token receives 403` — `cy.login('phy1@gmail.com', 'welcome100')` then `cy.request({ url: '/api/admin/users', failOnStatusCode: false })` → assert `response.status === 403`
  2. `STAFF calling /api/admin/users with valid token receives 403` — `cy.login('staff1@gmail.com', 'welcome100')` then `cy.request({ url: '/api/admin/users', failOnStatusCode: false })` → assert `response.status === 403`
  3. `Non-ADMIN roles receive 403 from /api/admin/audit-log and /api/admin/patients/bulk-assign` — Login as PHYSICIAN, call `GET /api/admin/audit-log` → 403, call `PATCH /api/admin/patients/bulk-assign` with body `{ patientIds: [], physicianId: 1 }` → 403
- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] Tests placed in a new `describe('Admin API 403 enforcement')` block within the existing file
  - [ ] No regressions in existing 42 role-access-control tests
- **Dependencies**: None
- **Estimated Effort**: S (trivial — straightforward API calls with assertion)
- **Run command**: `cd frontend && npx cypress run --spec cypress/e2e/role-access-control.cy.ts --headed`

---

### Task T2: Jest — CORS Configuration
- **Priority**: MEDIUM
- **Framework**: Jest (Backend)
- **Target File**: `backend/src/routes/__tests__/cors.test.ts` (new file)
- **Tests to Write**: 4
- **Gap IDs**: GAP TC-11.1, TC-11.2, TC-11.3, TC-11.4
- **Requirement**: REQ-TEST-11 (CORS Configuration, criteria #1-#4)
- **Description**: Integration tests that import the Express app and make supertest requests with different `Origin` headers while manipulating `NODE_ENV` and `CORS_ORIGIN` environment variables. These verify the CORS middleware configuration in `app.ts` behaves correctly across production and development modes.
- **Test list**:
  1. `production mode with CORS_ORIGIN whitelist allows only listed origins` — Set `NODE_ENV=production`, `CORS_ORIGIN=https://example.com,https://app.example.com`. Make OPTIONS request with `Origin: https://example.com` → `Access-Control-Allow-Origin: https://example.com`. Make request with `Origin: https://evil.com` → no `Access-Control-Allow-Origin` header (or different value).
  2. `production mode without CORS_ORIGIN allows all origins` — Set `NODE_ENV=production`, unset `CORS_ORIGIN`. Make request with `Origin: https://any-site.com` → response includes `Access-Control-Allow-Origin`.
  3. `development mode allows localhost:5173 and localhost:3000` — Set `NODE_ENV=development`. Make request with `Origin: http://localhost:5173` → `Access-Control-Allow-Origin: http://localhost:5173`. Repeat with `http://localhost:3000`.
  4. `CORS configuration includes credentials: true` — Make OPTIONS preflight request → response includes `Access-Control-Allow-Credentials: true`.
- **Implementation notes**:
  - Use `jest.replaceProperty(process.env, ...)` or direct `process.env` mutation with cleanup in `afterEach`
  - The CORS config is evaluated at app startup, so the test may need to re-import the app module after changing env vars. Use `jest.unstable_mockModule` if needed, or test by inspecting the cors options object directly.
  - Alternatively, inspect the CORS configuration function in `app.ts` rather than spinning up the full server.
  - Reference: `backend/src/app.ts` CORS configuration block
- **Acceptance Criteria**:
  - [ ] 4 tests written and passing
  - [ ] Tests correctly manipulate environment variables and restore them after each test
  - [ ] No regressions in existing backend tests
- **Dependencies**: None
- **Estimated Effort**: M (requires understanding CORS middleware initialization and possible module re-import)
- **Run command**: `cd backend && npx jest --testPathPattern=cors.test --verbose`

---

### Task T3: Jest — Helmet Security Headers
- **Priority**: MEDIUM
- **Framework**: Jest (Backend)
- **Target File**: `backend/src/routes/__tests__/securityHeaders.test.ts` (new file)
- **Tests to Write**: 5
- **Gap IDs**: GAP TC-12.1, TC-12.2, TC-12.3, TC-12.4, TC-12.5
- **Requirement**: REQ-TEST-12 (Helmet.js Security Headers, criteria #1-#5)
- **Description**: Make a supertest request to `GET /api/health` (unauthenticated, always available) and verify the security headers set by Helmet.js. These are simple response header assertions — no mocking needed.
- **Test list**:
  1. `API response includes X-Content-Type-Options: nosniff` — `GET /api/health` → `response.headers['x-content-type-options']` equals `'nosniff'`
  2. `API response includes X-Frame-Options header` — `GET /api/health` → `response.headers['x-frame-options']` is either `'DENY'` or `'SAMEORIGIN'`
  3. `API response includes Strict-Transport-Security header` — `GET /api/health` → `response.headers['strict-transport-security']` is defined (Helmet sets `max-age=15552000; includeSubDomains` by default)
  4. `API response does NOT include X-Powered-By header` — `GET /api/health` → `response.headers['x-powered-by']` is `undefined`
  5. `API response does NOT include Content-Security-Policy header (CSP disabled)` — `GET /api/health` → `response.headers['content-security-policy']` is `undefined`
- **Implementation notes**:
  - Import app from `../../app.js` and use `import request from 'supertest'`
  - Follow ESM import pattern: `const { default: app } = await import('../../app.js');`
  - No mocking required — just hit the health endpoint and check headers
  - Reference: `backend/src/app.ts` Helmet configuration
- **Acceptance Criteria**:
  - [ ] 5 tests written and passing
  - [ ] All header assertions match actual Helmet configuration in app.ts
  - [ ] No regressions in existing backend tests
- **Dependencies**: None (independent of T2)
- **Estimated Effort**: S (simple supertest assertions)
- **Run command**: `cd backend && npx jest --testPathPattern=securityHeaders.test --verbose`

---

### Task T4: Jest — Login Assignment Responses Per Role
- **Priority**: LOW
- **Framework**: Jest (Backend)
- **Target File**: `backend/src/routes/__tests__/auth.routes.test.ts` (extend existing)
- **Tests to Write**: 3
- **Gap IDs**: GAP TC-01.6, TC-01.7, TC-01.4b
- **Requirement**: REQ-TEST-01 (Login Flow — Valid Credentials, criteria #4, #6, #7)
- **Description**: Add tests to the existing `POST /api/auth/login` describe block verifying that login responses include the correct `assignments` array based on role. ADMIN and ADMIN+PHYSICIAN should get all active physicians; PHYSICIAN should get no assignments.
- **Test list**:
  1. `ADMIN login returns all active physicians as assignments` — Set `testUser.roles = ['ADMIN']`. Mock `getAllPhysicians` to return `[{ id: 1, name: 'Dr. A' }, { id: 2, name: 'Dr. B' }]`. POST `/api/auth/login` → assert `response.body.data.assignments` deep-equals the mock array.
  2. `ADMIN+PHYSICIAN login returns all active physicians as assignments` — Set `testUser.roles = ['ADMIN', 'PHYSICIAN']`. Mock `getAllPhysicians` same as above. POST `/api/auth/login` → assert `response.body.data.assignments` deep-equals the mock array.
  3. `PHYSICIAN login does not include assignments in response` — Set `testUser.roles = ['PHYSICIAN']`. POST `/api/auth/login` → assert `response.body.data.assignments` is `undefined` or not present.
- **Implementation notes**:
  - Place tests in a new `describe('Login assignment responses per role')` block inside the existing `POST /api/auth/login` describe
  - Use existing mock patterns from the file (testUser, mockPrisma, etc.)
  - May need to mock `getAllPhysicians` via `mockPrisma.user.findMany` or a service-level mock depending on how the route handler fetches physicians
  - Reference: `backend/src/routes/auth.routes.ts` login handler's role-based assignment logic
- **Acceptance Criteria**:
  - [ ] 3 tests written and passing
  - [ ] Tests placed within the existing auth.routes.test.ts file
  - [ ] No regressions in existing 59 auth.routes tests
- **Dependencies**: None
- **Estimated Effort**: S
- **Run command**: `cd backend && npx jest --testPathPattern=auth.routes.test --verbose`

---

### Task T5: Jest — JWT, Password, and Audit Log Edge Cases
- **Priority**: LOW
- **Framework**: Jest (Backend)
- **Target Files**:
  - `backend/src/services/__tests__/authService.test.ts` (extend — 1 test)
  - `backend/src/routes/__tests__/auth.routes.test.ts` (extend — 3 tests)
  - `backend/src/routes/__tests__/admin.routes.test.ts` (extend — 1 test)
- **Tests to Write**: 5
- **Gap IDs**: GAP TC-04.9, TC-04.14, TC-04.15, TC-05.6, TC-10.13
- **Requirements**: REQ-TEST-04 (JWT, criteria #9, #14, #15), REQ-TEST-05 (Password Change, criterion #6), REQ-TEST-10 (Audit Logging, criterion #13)
- **Description**: Five edge-case tests spread across three existing files. Grouped together because they are all LOW priority, small effort, and related to auth/security edge cases.
- **Test list**:
  1. **(authService.test.ts) TC-04.9:** `generateToken creates token with correct exp claim matching jwtExpiresIn config` — Call `generateToken(...)`, decode the returned JWT with `jwt.decode()`, verify `payload.exp` is approximately `Math.floor(Date.now()/1000) + 28800` (8 hours = default jwtExpiresIn). Place in the existing `generateToken` describe block.
  2. **(auth.routes.test.ts) TC-04.14:** `GET /api/auth/me returns 401 when user is deleted after token issuance` — Mock `findUserById` (or `mockPrisma.user.findUnique`) to return `null`. Make GET `/api/auth/me` with valid token → assert 401 with code `USER_NOT_FOUND`. Place in the existing `GET /api/auth/me` describe block.
  3. **(auth.routes.test.ts) TC-04.15:** `GET /api/auth/me returns 401 when user is deactivated after token issuance` — Mock `findUserById` to return `{ ...testUser, isActive: false }`. Make GET `/api/auth/me` → assert 401 with code `USER_DEACTIVATED`. Place next to TC-04.14.
  4. **(auth.routes.test.ts) TC-05.6:** `PUT /api/auth/password clears mustChangePassword flag after successful change` — After successful password change, verify `mockPrisma.user.update` was called with `data` containing `mustChangePassword: false`. Place in the existing `PUT /api/auth/password` describe block.
  5. **(admin.routes.test.ts) TC-10.13:** `GET /api/admin/audit-log supports filtering by action, entity, userId, and date range` — Make GET `/api/admin/audit-log?action=LOGIN&userId=1&startDate=2024-01-01&endDate=2024-12-31` → verify `mockPrisma.auditLog.findMany` was called with `where` clause containing `action: 'LOGIN'`, `userId: 1`, and `createdAt` date range filters. Place in the existing audit log describe block.
- **Implementation notes**:
  - TC-04.14 and TC-04.15: The route handler for `/me` calls `findUserById` and checks `isActive`. These tests verify the handler-level logic, working around ESM middleware mock limitations.
  - TC-05.6: The existing password change tests already verify the 200 response; this test adds a `mockPrisma.user.update` assertion for the specific `mustChangePassword: false` field.
  - TC-10.13: Examine `admin.routes.ts` GET `/audit-log` handler to determine exact query param names and how they map to Prisma `where` clause.
- **Acceptance Criteria**:
  - [ ] 5 tests written and passing across 3 files
  - [ ] Each test placed in the appropriate describe block of its target file
  - [ ] No regressions in existing tests (22 authService, 59 auth.routes, 2 admin.routes)
- **Dependencies**: None
- **Estimated Effort**: M (5 tests across 3 files requires context-switching)
- **Run command**: `cd backend && npx jest --testPathPattern="authService.test|auth.routes.test|admin.routes.test" --verbose`

---

### Task T6: Jest — Empty Body Login Validation
- **Priority**: LOW
- **Framework**: Jest (Backend)
- **Target File**: `backend/src/routes/__tests__/auth.routes.test.ts` (extend existing)
- **Tests to Write**: 1
- **Gap IDs**: GAP TC-02.7
- **Requirement**: REQ-TEST-02 (Login Flow — Invalid Credentials, criterion #7)
- **Description**: Verify that POST `/api/auth/login` with an empty/missing request body returns 400. The Zod validation schema rejects it, but no dedicated test exists.
- **Test list**:
  1. `POST /api/auth/login with empty body returns 400` — POST `/api/auth/login` with no body (or `{}`) → assert `response.status === 400`.
- **Implementation notes**:
  - Place in the existing `POST /api/auth/login` validation tests describe block
  - The route uses Zod schema validation, so the error code may be `VALIDATION_ERROR` or similar
- **Acceptance Criteria**:
  - [ ] 1 test written and passing
  - [ ] No regressions in existing auth.routes tests
- **Dependencies**: None (can be combined with T4 or T5 in same session if desired)
- **Estimated Effort**: S (trivial)
- **Run command**: `cd backend && npx jest --testPathPattern=auth.routes.test --verbose`

---

### Task T7: Vitest — ProtectedRoute ForcePasswordChange Unit Test
- **Priority**: LOW
- **Framework**: Vitest (Frontend)
- **Target File**: `frontend/src/components/auth/ProtectedRoute.test.tsx` (extend existing)
- **Tests to Write**: 1
- **Gap IDs**: GAP TC-07.5
- **Requirement**: REQ-TEST-07 (Force Change Password, criterion #5)
- **Description**: Add a unit test verifying that the ProtectedRoute component renders the ForcePasswordChange component (instead of child routes) when `mustChangePassword` is true in the auth store. While E2E coverage exists in `auth-edge-cases.spec.ts`, this Vitest unit test provides faster feedback and isolates the component logic from API mocking.
- **Test list**:
  1. `renders ForcePasswordChange component when mustChangePassword is true` — Mock auth store with `isAuthenticated: true`, `user: { ...mockUser, mustChangePassword: true }`. Render `<ProtectedRoute />` inside `<MemoryRouter>`. Assert `screen.getByText('Password Change Required')` is visible (or equivalent ForcePasswordChange heading text).
- **Implementation notes**:
  - Follow existing patterns in ProtectedRoute.test.tsx for mocking `useAuthStore`
  - The ForcePasswordChange component renders a modal with heading text — check `ForcePasswordChange.tsx` for exact text to assert
  - May need to mock the ForcePasswordChange component itself if it has complex dependencies, or render it fully
- **Acceptance Criteria**:
  - [ ] 1 test written and passing
  - [ ] Test placed in the existing ProtectedRoute.test.tsx file
  - [ ] No regressions in existing 9 ProtectedRoute tests
- **Dependencies**: None
- **Estimated Effort**: S
- **Run command**: `cd frontend && npx vitest run src/components/auth/ProtectedRoute.test.tsx`

---

### Task T8: Regression Verification — Full Test Suite
- **Priority**: HIGH (must be last)
- **Framework**: All (Jest, Vitest, Cypress)
- **Target File**: N/A (no code changes)
- **Tests to Write**: 0
- **Gap IDs**: N/A
- **Description**: Run the complete test suite across all layers to verify that all new tests pass and no regressions were introduced. This task must be executed after T1-T7 are complete.
- **Verification steps**:
  1. Run backend Jest: `cd backend && npm test` — expect all tests pass (baseline 527 + new tests from T2-T6)
  2. Run frontend Vitest: `cd frontend && npm run test:run` — expect all tests pass (baseline 296 + new test from T7)
  3. Run Cypress E2E: `cd frontend && npx cypress run --headed` — expect all tests pass (baseline 283 + new tests from T1)
  4. Verify total new test count matches expected 22
- **Acceptance Criteria**:
  - [ ] All backend Jest tests pass (0 failures)
  - [ ] All frontend Vitest tests pass (0 failures)
  - [ ] All Cypress E2E tests pass (0 failures)
  - [ ] No test count decreased (no tests removed)
  - [ ] Total new auth/security tests: 22
- **Dependencies**: T1, T2, T3, T4, T5, T6, T7 (all must be complete)
- **Estimated Effort**: S (just running commands)
- **Run commands**:
  ```
  cd backend && npm test
  cd frontend && npm run test:run
  cd frontend && npx cypress run --headed
  ```

---

## Execution Order

```
Phase 1: HIGH Priority
  T1 — Cypress Admin API 403 enforcement (3 tests)

Phase 2: MEDIUM Priority (T2 and T3 can run in parallel)
  T2 — Jest CORS configuration (4 tests)
  T3 — Jest Helmet security headers (5 tests)

Phase 3: LOW Priority (T4, T5, T6, T7 can run in parallel)
  T4 — Jest Login assignment per role (3 tests)
  T5 — Jest JWT/password/audit edge cases (5 tests)
  T6 — Jest Empty body login (1 test)
  T7 — Vitest ProtectedRoute ForcePasswordChange (1 test)

Phase 4: Verification (must be last)
  T8 — Full regression suite
```

## Traceability Matrix

| Task | Gap IDs | Requirement | Framework | File | Tests |
|------|---------|-------------|-----------|------|------:|
| T1 | TC-08.2a, TC-08.2b, TC-08.2c | REQ-TEST-08 | Cypress | role-access-control.cy.ts | 3 |
| T2 | TC-11.1, TC-11.2, TC-11.3, TC-11.4 | REQ-TEST-11 | Jest | cors.test.ts (NEW) | 4 |
| T3 | TC-12.1, TC-12.2, TC-12.3, TC-12.4, TC-12.5 | REQ-TEST-12 | Jest | securityHeaders.test.ts (NEW) | 5 |
| T4 | TC-01.4b, TC-01.6, TC-01.7 | REQ-TEST-01 | Jest | auth.routes.test.ts | 3 |
| T5 | TC-04.9, TC-04.14, TC-04.15, TC-05.6, TC-10.13 | REQ-TEST-04/05/10 | Jest | authService.test.ts, auth.routes.test.ts, admin.routes.test.ts | 5 |
| T6 | TC-02.7 | REQ-TEST-02 | Jest | auth.routes.test.ts | 1 |
| T7 | TC-07.5 | REQ-TEST-07 | Vitest | ProtectedRoute.test.tsx | 1 |
| T8 | -- | All | All | -- | 0 |
| **Total** | **18 gaps** | **7 requirements** | | | **22** |
