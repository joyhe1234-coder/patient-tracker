# Requirements Document: Security Hardening

## Introduction

Production security hardening for the Patient Quality Measure Tracking System, a healthcare application handling Protected Health Information (PHI) including patient names, dates of birth, phone numbers, and addresses. This feature addresses 12 identified security gaps (5 Critical, 7 High severity) to bring the application from its current security posture (audit score 5.5/10) to production-grade compliance suitable for handling PHI in medical office environments.

The application already has foundational security controls in place: RBAC with 3 roles (PHYSICIAN, STAFF, ADMIN — with 4 valid role combinations including ADMIN+PHYSICIAN), bcryptjs password hashing (12 rounds), Zod validation on all endpoints, Prisma parameterized queries, Helmet.js headers, audit logging, file upload validation, DOB masking, and JWT authentication. This hardening effort closes the remaining gaps without disrupting existing functionality.

## Alignment with Product Vision

The product vision states the system must "maintain audit trail for accountability" and serves medical offices tracking patient quality measures. Handling PHI introduces regulatory obligations (HIPAA considerations) and user trust requirements. Security hardening directly supports:

- **Data protection**: PHI (names, DOB, phone, address) must be protected in transit and at rest
- **User trust**: Medical offices must trust the system with sensitive patient data
- **Operational reliability**: Rate limiting and account lockout prevent service disruption
- **Audit compliance**: Failed login logging closes a gap in the existing audit trail
- **Multi-deployment support**: Security must work across Docker on-premise and Render.com cloud deployments

---

## Requirements

### REQ-SEC-01: HTTPS/TLS Enforcement (Critical) — [DEFERRED]

**User Story:** As a system administrator, I want all traffic encrypted via HTTPS, so that JWT tokens and PHI are never transmitted in plaintext over the network.

**Current State:** Nginx listens on port 80 only (HTTP). All data including authentication tokens and patient information is transmitted unencrypted. Render.com handles TLS automatically, but Docker on-premise deployments have no TLS.

#### Acceptance Criteria

1. WHEN the nginx reverse proxy receives an HTTP request on port 80, THEN it SHALL redirect to HTTPS (port 443) with a 301 permanent redirect.
2. WHEN the nginx reverse proxy is configured with TLS, THEN it SHALL serve traffic on port 443 using the provided SSL certificate and key.
3. IF the `SSL_CERT_PATH` and `SSL_KEY_PATH` environment variables are set, THEN the nginx configuration SHALL enable HTTPS with those certificates.
4. IF the `SSL_CERT_PATH` and `SSL_KEY_PATH` environment variables are NOT set, THEN nginx SHALL serve HTTP only on port 80 (development/Render mode where TLS is handled externally).
5. WHEN HTTPS is enabled, THEN the Strict-Transport-Security header SHALL be set with `max-age=31536000; includeSubDomains`.
6. WHEN HTTPS is enabled, THEN TLS SHALL use version 1.2 or higher (TLS 1.0 and 1.1 disabled).

#### User Experience Impact
- No impact for Render.com users (TLS already handled by Render).
- Docker on-premise users must provide SSL certificates (self-signed or CA-issued).
- Users see browser lock icon when HTTPS is active.

#### Open Questions for User
- Will on-premise deployments use self-signed certificates, Let's Encrypt, or organization-issued certificates?
- Should the application include a Let's Encrypt auto-renewal helper script?

#### How to Test
- Verify HTTP requests to port 80 receive 301 redirect to HTTPS.
- Verify TLS 1.0/1.1 connections are rejected.
- Verify HSTS header is present in responses.
- Verify application functions correctly over HTTPS (login, data operations, WebSocket).

---

### REQ-SEC-02: CORS Origin Whitelist (Critical)

**User Story:** As a system administrator, I want the option to restrict CORS to specific allowed origins, so that unauthorized domains cannot make API requests on behalf of authenticated users.

**Current State:** In `backend/src/app.ts`, when `NODE_ENV=production` and `CORS_ORIGIN` is not set, CORS falls through to `origin: true` which allows ANY domain.

#### Acceptance Criteria

1. ~~WHEN the application starts in production mode AND `CORS_ORIGIN` is not set, THEN refuse to start.~~ **SUPERSEDED by user decision: keep `origin: true` as default. `CORS_ORIGIN` is optional.**
2. WHEN `CORS_ORIGIN` is set, THEN the CORS middleware SHALL accept only the comma-separated origins listed in the variable.
3. WHEN `CORS_ORIGIN` is set AND a request arrives from an origin not in the whitelist, THEN the server SHALL reject the request with a CORS error.
4. WHEN `CORS_ORIGIN` is NOT set, THEN the CORS middleware SHALL use `origin: true` (allow all origins). This is the default behavior.
5. WHEN in development mode (`NODE_ENV=development` or unset), THEN the CORS middleware SHALL allow `http://localhost:5173` and `http://localhost:3000` (Vite dev server).
6. WHEN CORS is configured, THEN `credentials: true` SHALL remain enabled for cookie-based authentication (REQ-SEC-07).

#### User Experience Impact
- No impact for end users.
- No change required by deployment operators (CORS_ORIGIN is optional).

#### Open Questions for User
- ~~Confirm production CORS origins.~~ **Decision: `CORS_ORIGIN` is optional. Default allows all origins.**

#### How to Test
- Start application in production without `CORS_ORIGIN` -- verify app starts and allows all origins.
- Set `CORS_ORIGIN=https://example.com` -- verify only that origin is allowed.
- Make cross-origin request from disallowed origin when `CORS_ORIGIN` is set -- verify rejection.

---

### REQ-SEC-03: Rate Limiting (Critical)

**User Story:** As a system administrator, I want rate limiting on all API endpoints, so that brute-force attacks, credential stuffing, and denial-of-service attempts are mitigated.

**Current State:** Zero rate limiting on any endpoint. The login endpoint, import endpoint, and all API routes accept unlimited requests.

#### Acceptance Criteria

1. WHEN a client IP sends more than 20 requests to `/api/auth/login` within a 15-minute window, THEN the server SHALL respond with HTTP 429 (Too Many Requests) and a message: `"Too many login attempts. Please try again in 15 minutes."`.
2. WHEN a client IP sends more than 5 requests to `/api/auth/forgot-password` within a 15-minute window, THEN the server SHALL respond with HTTP 429.
3. WHEN a client IP sends more than 10 requests to `/api/import/*` within a 1-minute window, THEN the server SHALL respond with HTTP 429.
4. WHEN a client IP sends more than 100 requests to any API endpoint within a 1-minute window (global limit), THEN the server SHALL respond with HTTP 429.
5. WHEN a rate limit is exceeded, THEN the response SHALL include `Retry-After` header indicating seconds until the limit resets.
6. WHEN the application is behind a reverse proxy (nginx or Render's load balancer), THEN the rate limiter SHALL use `X-Forwarded-For` to identify the true client IP. This requires adding `app.set('trust proxy', 1)` to `app.ts` (currently NOT configured). Note: This also fixes existing audit log IP logging which currently logs `::1` or `127.0.0.1` instead of the real client IP.
7. WHEN rate limiting is applied, THEN the rate limit state SHALL be stored in-process memory (no Redis dependency required for initial implementation).
8. WHEN the `RATE_LIMIT_ENABLED` environment variable is set to `false`, THEN all rate limiting SHALL be disabled (all requests pass through without limit checks). Default: `true`.
9. WHEN rate limiting is enabled, THEN all thresholds SHALL be configurable via environment variables with the following defaults:
   - `RATE_LIMIT_LOGIN_MAX=20` (max attempts per window)
   - `RATE_LIMIT_LOGIN_WINDOW_MIN=15` (window in minutes)
   - `RATE_LIMIT_IMPORT_MAX=10`
   - `RATE_LIMIT_IMPORT_WINDOW_MIN=1`
   - `RATE_LIMIT_GLOBAL_MAX=100`
   - `RATE_LIMIT_GLOBAL_WINDOW_MIN=1`
   - `RATE_LIMIT_FORGOT_PW_MAX=5`
   - `RATE_LIMIT_FORGOT_PW_WINDOW_MIN=15`

#### Deployment Configuration

Rate limiting is configured via environment variables. All settings have sensible defaults and work out of the box.

**To disable rate limiting entirely** (e.g., for debugging):
```
RATE_LIMIT_ENABLED=false
```

**To adjust thresholds** (e.g., stricter login limit):
```
RATE_LIMIT_LOGIN_MAX=10
RATE_LIMIT_LOGIN_WINDOW_MIN=30
```

**Important notes for deployment:**
- `trust proxy` is required when running behind nginx, a load balancer, or any reverse proxy. Without it, all users appear as the same IP and one user hitting the limit locks out everyone.
- Rate limit state is in-memory — it resets on app restart. This is acceptable for single-instance deployments.
- For multi-instance deployments (multiple app containers behind a load balancer), rate limits are tracked per instance. A shared store (Redis) would be needed for accurate cross-instance limiting — this is deferred.

#### User Experience Impact
- Normal users are unaffected (limits are generous for legitimate use).
- Users locked out by rate limiting see a clear error message with retry timing.
- Login page should display the rate limit error message from the API response.

#### Open Questions for User
- ~~Are the proposed thresholds acceptable?~~ **Decision: Yes (20 login/15min, 100 global/min, 10 import/min), configurable via env vars.**
- ~~Should rate limiting also apply to change-password?~~ **Decision: Yes, same limits as forgot-password (5/15min).**

#### How to Test
- Send 21 login requests in rapid succession -- verify the 21st returns 429.
- Verify `Retry-After` header is present in 429 response.
- Verify different IPs are tracked independently (set different `X-Forwarded-For` headers).
- Verify rate limit resets after the window expires.
- Set `RATE_LIMIT_ENABLED=false` -- verify no requests are blocked.
- Set `RATE_LIMIT_LOGIN_MAX=5` -- verify the 6th request returns 429.

---

### REQ-SEC-04: JWT Secret Validation (Critical)

**User Story:** As a system administrator, I want the application to refuse to start with a weak or default JWT secret, so that authentication tokens cannot be forged by attackers.

**Current State:** In `backend/src/config/index.ts`, the JWT secret falls back to `'development_jwt_secret_change_in_production'` when `JWT_SECRET` is not set. This allows the application to run in production with a publicly known secret.

#### Acceptance Criteria

1. WHEN the application starts in production mode AND `JWT_SECRET` is not set, THEN the application SHALL refuse to start and log: `"FATAL: JWT_SECRET environment variable is required in production"`.
2. WHEN the application starts in production mode AND `JWT_SECRET` is set to the default development value (`development_jwt_secret_change_in_production`), THEN the application SHALL refuse to start and log: `"FATAL: JWT_SECRET must not use the default development value in production"`.
3. WHEN the application starts in production mode AND `JWT_SECRET` is set but is fewer than 32 characters, THEN the application SHALL refuse to start and log: `"FATAL: JWT_SECRET must be at least 32 characters"`.
4. WHEN the application starts in development mode AND `JWT_SECRET` is not set, THEN the application SHALL use the development fallback and log a warning: `"WARNING: Using default JWT secret. Set JWT_SECRET for production."`.

#### User Experience Impact
- No impact for end users.
- Deployment operators see immediate, clear failure on misconfiguration.

#### Open Questions for User
- Is 32 characters an acceptable minimum length for the JWT secret?

#### How to Test
- Start application in production without `JWT_SECRET` -- verify startup failure.
- Start application in production with default secret string -- verify startup failure.
- Start application in production with 16-character secret -- verify startup failure.
- Start application in production with 64-character secret -- verify successful start.
- Start application in development without `JWT_SECRET` -- verify warning logged but app starts.

---

### REQ-SEC-05: Required Environment Variable Validation at Startup (Critical)

**User Story:** As a system administrator, I want the application to validate all required configuration at startup, so that misconfiguration is caught immediately rather than causing runtime failures.

**Current State:** The application starts silently with missing or weak configuration values. `DATABASE_URL`, `CORS_ORIGIN`, and other critical settings are not validated at startup.

#### Acceptance Criteria

1. WHEN the application starts in production mode, THEN it SHALL validate the following environment variables are set and non-empty: `JWT_SECRET`, `SMTP_HOST`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
2. IF any required environment variable is missing or empty in production, THEN the application SHALL refuse to start and log each missing variable: `"FATAL: Missing required environment variables: JWT_SECRET, SMTP_HOST"`.
3. WHEN the application starts in production mode AND `ADMIN_EMAIL` is set to the default value (`admin@clinic.com`), THEN the application SHALL refuse to start and log: `"FATAL: ADMIN_EMAIL must not use the default value in production"`.
4. WHEN the application starts in production mode AND `ADMIN_PASSWORD` is set to the default value (`changeme123`), THEN the application SHALL refuse to start and log: `"FATAL: ADMIN_PASSWORD must not use the default value in production"`.
5. WHEN validation passes, THEN the application SHALL log a summary of validated configuration (without revealing secret values): `"Configuration validated: NODE_ENV=production, PORT=3000, JWT secret length=64"`.
6. WHEN the application starts, THEN environment validation SHALL run BEFORE any database connections, HTTP listeners, or service initialization.

#### User Experience Impact
- No impact for end users.
- Deployment operators get immediate feedback on misconfiguration.

#### Open Questions for User
- ~~Should `SMTP_HOST` be required in production?~~ **Decision: Yes, required.**
- ~~Should `ADMIN_EMAIL` and `ADMIN_PASSWORD` be validated?~~ **Decision: Yes, required in production. Must not use defaults.**
- ~~Should `DATABASE_URL` be validated?~~ **Decision: No — set automatically by Docker Compose / Render, not by operators.**
- ~~Should `CORS_ORIGIN` be required?~~ **Decision: No — default is `origin: true` (allow all). Can be set optionally to restrict.**

#### How to Test
- Start application in production with all required vars -- verify success with summary log.
- Start application in production without `JWT_SECRET` -- verify failure naming the missing variable.
- Start application in production with default `ADMIN_EMAIL` (`admin@clinic.com`) -- verify failure.
- Start application in production with default `ADMIN_PASSWORD` (`changeme123`) -- verify failure.
- Start application in production without `SMTP_HOST` -- verify failure.
- Start application in development without required vars -- verify app starts with warnings.

---

### REQ-SEC-06: Account Lockout (High)

**User Story:** As a system administrator, I want accounts to be temporarily locked after repeated failed login attempts, so that brute-force password attacks are blocked.

**Current State:** In `backend/src/routes/auth.routes.ts`, the login endpoint allows unlimited attempts. Failed logins return a generic "Invalid email or password" but do not track failure count.

#### Acceptance Criteria

1. WHEN a user fails to log in 5 times consecutively for the same email address, THEN the account SHALL be locked for 15 minutes.
2. WHEN a locked account attempts to log in (even with correct credentials), THEN the server SHALL respond with HTTP 401 and message: `"Account temporarily locked. Please try again later."` (without revealing remaining lockout time).
3. WHEN the lockout period expires AND the user provides correct credentials, THEN the login SHALL succeed and the failed attempt counter SHALL reset to 0.
4. WHEN a successful login occurs before reaching the lockout threshold, THEN the failed attempt counter SHALL reset to 0.
5. WHEN an account is locked, THEN an audit log entry SHALL be created with action `ACCOUNT_LOCKED`, the email, IP address, and timestamp.
6. WHEN the lockout mechanism tracks attempts, THEN it SHALL use the User database record (new fields: `failedLoginAttempts: Int`, `lockedUntil: DateTime?`) rather than in-memory storage, so lockout persists across server restarts.
7. IF an admin sends a temporary password for a locked user via the admin panel, THEN:
   a. A random temporary password SHALL be generated (12 characters, alphanumeric + symbols).
   b. The temporary password SHALL be emailed to the user's email address via SMTP.
   c. The user's password SHALL be updated to the temporary password (bcrypt hashed).
   d. `failedLoginAttempts` SHALL reset to 0 and `lockedUntil` SHALL be set to null (account unlocked).
   e. `mustChangePassword` SHALL be set to `true`.
8. WHEN a user with `mustChangePassword: true` logs in successfully, THEN the frontend SHALL redirect to a forced password change screen that blocks all other actions until a new password is set.
9. WHEN the user sets a new password via the forced change screen, THEN `mustChangePassword` SHALL be set to `false` and the user SHALL be redirected to the main application.
10. WHEN 3 consecutive failed login attempts occur (before lockout threshold), THEN the login error response SHALL include a warning: `"Having trouble? Reset your password to avoid being locked out."` with a link to the forgot-password flow.

#### User Experience Impact
- Legitimate users who mistype their password 5 times must wait 15 minutes.
- The login page should display the lockout error message from the API response.
- No UI change needed (error message already displayed from API response).

#### Open Questions for User
- ~~Is 5 attempts / 15-minute lockout acceptable?~~ **Decision: Yes, 5 attempts / 15 min.**
- ~~Should an admin be able to manually unlock accounts?~~ **Decision: Yes, via "Send Temporary Password" button that emails a temp password, unlocks the account, and forces password change on next login.**

#### How to Test
- Attempt 5 failed logins, verify 6th attempt returns lockout message.
- Wait 15 minutes (or mock time), verify login succeeds with correct credentials.
- Attempt 4 failed logins, then succeed -- verify counter resets.
- Verify audit log entry created on lockout.
- Verify lockout persists after server restart (database-backed).

---

### REQ-SEC-07: Move JWT to httpOnly Cookie (High)

**User Story:** As a security-conscious developer, I want JWT tokens stored in httpOnly cookies rather than localStorage, so that tokens are not accessible to JavaScript and are protected from XSS attacks.

**Current State:** In `frontend/src/stores/authStore.ts` and `frontend/src/api/axios.ts`, the JWT token is stored in `localStorage` and sent via the `Authorization: Bearer` header. This makes the token accessible to any JavaScript running on the page (XSS vulnerability).

#### Acceptance Criteria

1. WHEN a user successfully logs in, THEN the backend SHALL set an httpOnly cookie containing the JWT token with the following attributes: `httpOnly: true`, `secure: true` (HTTPS only, except development), `sameSite: 'strict'` (same-origin Docker deployment where frontend and backend are behind the same nginx proxy), `path: '/'`, `maxAge: 28800000` (8 hours in milliseconds).
2. WHEN the backend receives an API request, THEN the `requireAuth` middleware SHALL read the JWT from the cookie (falling back to the `Authorization: Bearer` header for backward compatibility during migration).
3. WHEN a user logs out, THEN the backend SHALL clear the authentication cookie by setting it with `maxAge: 0`.
4. WHEN the frontend makes API requests, THEN axios SHALL send cookies automatically via `withCredentials: true` (must be added to the axios instance configuration; currently NOT set). The CORS middleware already has `credentials: true`.
5. WHEN the JWT is stored in a cookie, THEN the frontend SHALL NOT store the token in localStorage (remove `localStorage.setItem('auth_token', token)` and `localStorage.getItem('auth_token')` calls from authStore.ts). Additionally, the Zustand persist middleware in authStore.ts stores auth state including the token — the token field must be excluded from persistence or the persist middleware must be updated to not store the token.
6. WHEN the frontend receives a 401 response, THEN it SHALL redirect to the login page and clear local auth state (same behavior as current implementation, but without localStorage token removal).
7. WHEN the cookie-based auth is active, THEN the login API response SHALL still include the token in the response body during the migration period (allows existing clients to continue working).
8. IF the application detects a CSRF risk (POST/PUT/DELETE requests), THEN it SHALL validate the `Origin` or `Referer` header matches the configured CORS origins as a defense against CSRF.

#### User Experience Impact
- No visible change to end users.
- Page refreshes continue to maintain session (cookie persists).
- Socket.IO connections currently use `auth: { token }` in the handshake (not cookies). This must be updated to rely on the cookie sent during the WebSocket upgrade request, or continue sending the token in the auth payload during the migration period.

#### Open Questions for User
- Should the migration be immediate (remove Bearer header support) or gradual (support both for one release)?
- Should CSRF tokens be implemented as a separate requirement, or is Origin/Referer validation sufficient?

#### How to Test
- Log in and verify httpOnly cookie is set (visible in browser DevTools > Application > Cookies, but not accessible via `document.cookie`).
- Verify `localStorage` does not contain `auth_token` after login.
- Make authenticated API requests -- verify they succeed using cookie-based auth.
- Log out and verify cookie is cleared.
- Verify XSS script cannot access the token (`document.cookie` does not return the auth cookie).
- Verify Socket.IO reconnection works with cookie-based auth.

---

### REQ-SEC-08: Content-Security-Policy (High) — [DEFERRED]

**User Story:** As a security-conscious developer, I want a strict Content-Security-Policy header, so that XSS attacks are mitigated by restricting which scripts, styles, and resources can be loaded.

**Current State:** In `backend/src/app.ts`, Helmet.js is configured with `contentSecurityPolicy: false`, explicitly disabling CSP.

#### Acceptance Criteria

1. WHEN the backend serves responses, THEN the `Content-Security-Policy` header SHALL be set with the following directives:
   - `default-src 'self'`
   - `script-src 'self'` (no `'unsafe-inline'` or `'unsafe-eval'`)
   - `style-src 'self' 'unsafe-inline'` (required for AG Grid inline styles and Tailwind)
   - `img-src 'self' data:` (AG Grid uses data: URIs for icons)
   - `font-src 'self'`
   - `connect-src 'self' wss: https://patient-tracker-api-cwrh.onrender.com` (for Socket.IO WebSocket connections and cross-origin API requests on Render; on-premise deployments use 'self' only). Note: The connect-src must include the backend API origin when frontend and backend are on different domains (Render deployment).
   - `frame-ancestors 'none'` (prevent embedding in iframes)
   - `form-action 'self'`
   - `base-uri 'self'`
2. IF the frontend build produces inline scripts (e.g., Vite), THEN nonce-based CSP SHALL be used for those specific scripts, OR the build shall be configured to avoid inline scripts.
3. WHEN CSP is enabled, THEN no existing application functionality SHALL break (AG Grid, Tailwind CSS, Socket.IO, file upload, date pickers).
4. WHEN a CSP violation occurs, THEN the browser SHALL report it (via `report-uri` or `report-to` directive) but only if a reporting endpoint is configured.
5. IF CSP causes breakage during testing, THEN specific directives SHALL be relaxed with documentation explaining why.

#### User Experience Impact
- No visible change when CSP is correctly configured.
- Potential breakage if CSP is too strict (must be tested thoroughly with AG Grid and all UI features).

#### Open Questions for User
- Is `'unsafe-inline'` for styles acceptable? AG Grid and Tailwind both use inline styles. Removing it would require significant refactoring.
- Should CSP be initially deployed in report-only mode (`Content-Security-Policy-Report-Only`) before enforcing?

#### How to Test
- Open browser DevTools Console -- verify no CSP violation warnings on any page.
- Test all pages: Login, Patient Grid, Import, Admin, Patient Management.
- Verify Socket.IO connects without CSP blocking WebSocket.
- Verify AG Grid renders fully (icons, styles, dropdowns).
- Verify file upload works.
- Inject a test `<script>` tag -- verify CSP blocks it.

---

### REQ-SEC-09: Refresh Token Mechanism (High) — [DEFERRED]

**User Story:** As a user, I want my session to automatically renew without re-logging in, so that I do not lose my work during long editing sessions.

**Current State:** A single JWT with 8-hour expiration is issued at login. There is no renewal mechanism. Users lose their session after 8 hours and must re-authenticate, potentially losing unsaved state.

#### Acceptance Criteria

1. WHEN a user logs in, THEN the backend SHALL issue two tokens: an access token (15-minute expiry) set as an httpOnly cookie, AND a refresh token (7-day expiry) stored in the database and set as a separate httpOnly cookie.
2. WHEN the frontend receives a 401 response (access token expired), THEN the axios interceptor SHALL automatically call `POST /api/auth/refresh` with the refresh token cookie to obtain a new access token.
3. WHEN `POST /api/auth/refresh` receives a valid, non-expired refresh token, THEN it SHALL issue a new access token (15-minute expiry) and set it as an httpOnly cookie.
4. WHEN `POST /api/auth/refresh` receives an invalid or expired refresh token, THEN it SHALL respond with 401 and the frontend SHALL redirect to the login page.
5. WHEN a user logs out, THEN both the access token cookie and refresh token cookie SHALL be cleared, AND the refresh token SHALL be invalidated in the database.
6. WHEN a refresh token is used, THEN it SHALL be rotated: the old refresh token is invalidated and a new one is issued (prevents reuse of compromised tokens).
7. WHEN the frontend detects the access token is about to expire (within 1 minute of expiry), THEN it SHALL proactively refresh the token to avoid interrupting user actions.
8. WHEN multiple concurrent requests trigger token refresh simultaneously, THEN only one refresh request SHALL be sent (request queuing/deduplication).
9. IF the user's account is deactivated while they have a valid refresh token, THEN the refresh SHALL fail with 401 (user status checked during refresh).

#### User Experience Impact
- Users experience seamless sessions lasting up to 7 days without re-login.
- Session loss mid-editing is eliminated for active users.
- Users must re-authenticate after 7 days of inactivity.

#### Open Questions for User
- Is 15-minute access token / 7-day refresh token acceptable?
- Should refresh tokens have a "maximum lifetime" (e.g., 30 days) regardless of activity, forcing periodic re-authentication?
- Should active Socket.IO connections also trigger token refresh?

#### How to Test
- Log in, wait for access token to expire (15 min), make API request -- verify automatic refresh without user interaction.
- Verify refresh token rotation (old refresh token cannot be reused after refresh).
- Log out and attempt to use the old refresh token -- verify rejection.
- Deactivate a user with active refresh token -- verify next refresh fails.
- Open two browser tabs, let both tokens expire simultaneously -- verify only one refresh request is sent.
- Verify Socket.IO remains connected across access token refreshes.

---

### REQ-SEC-10: Failed Login Audit Logging (High)

**User Story:** As a system administrator, I want failed login attempts logged with IP address and timestamp, so that I can detect brute-force attacks and investigate security incidents.

**Current State:** In `backend/src/routes/auth.routes.ts`, only successful logins create an audit log entry. Failed login attempts (wrong password, non-existent email, locked account) are not logged.

#### Acceptance Criteria

1. WHEN a login attempt fails due to invalid credentials (wrong email or wrong password), THEN an audit log entry SHALL be created with: `action: 'LOGIN_FAILED'`, `userEmail: <attempted email>`, `ipAddress: <client IP>`, `details: { reason: 'INVALID_CREDENTIALS' }`.
2. WHEN a login attempt fails due to a locked account, THEN an audit log entry SHALL be created with: `action: 'LOGIN_FAILED'`, `userEmail: <attempted email>`, `ipAddress: <client IP>`, `details: { reason: 'ACCOUNT_LOCKED' }`.
3. WHEN a login attempt fails due to a deactivated account, THEN an audit log entry SHALL be created with: `action: 'LOGIN_FAILED'`, `userEmail: <attempted email>`, `ipAddress: <client IP>`, `details: { reason: 'ACCOUNT_DEACTIVATED' }`.
4. WHEN failed login attempts are logged, THEN the `userId` field SHALL be null if the email does not correspond to an existing user (do not reveal user existence in logs to non-admins, but log the attempted email for admin investigation).
5. WHEN failed login attempts are logged, THEN the attempted password SHALL NOT be included in the log entry.
6. WHEN an admin views the audit log in the admin panel, THEN `LOGIN_FAILED` entries SHALL be visible with email, IP, reason, and timestamp.

#### User Experience Impact
- No impact on end users.
- Administrators gain visibility into attack patterns via the audit log.

#### Open Questions for User
- ~~Should failed login audit entries follow existing retention?~~ **Decision: 3-month retention for failed login entries (vs 6 months for other audit logs).**

#### How to Test
- Attempt login with invalid credentials -- verify audit log entry created.
- Attempt login with locked account -- verify audit log entry with `ACCOUNT_LOCKED` reason.
- Verify the audit log does NOT contain the attempted password.
- Verify admin can view failed login entries in the admin panel.

---

### REQ-SEC-11: Hide Database Port in Docker (High) — [DEFERRED]

**User Story:** As a system administrator, I want the PostgreSQL port hidden from the host network, so that the database is not directly accessible from outside the Docker network.

**Current State:** In `docker-compose.yml`, the `db` service exposes port 5432 to the host (`ports: - "5432:5432"`), making the database directly accessible from the host machine and potentially the network.

#### Acceptance Criteria

1. WHEN the production Docker Compose configuration is used, THEN the `db` service SHALL NOT expose port 5432 to the host (remove or comment out the `ports` mapping).
2. WHEN the `db` service does not expose ports, THEN the `app` service SHALL still connect to the database via the Docker internal network (using hostname `db` and port 5432 within the `patient-tracker` network).
3. IF a separate `docker-compose.dev.yml` override file exists, THEN it MAY expose port 5432 for local development tools (e.g., pgAdmin, DBeaver).
4. WHEN the database port is hidden, THEN all existing functionality SHALL continue working (application, migrations, seed scripts, health checks).
5. WHEN the `app` service port mapping (`ports: - "3000:3000"`) is reviewed, THEN it SHALL be removed in production Docker Compose if nginx is the sole entry point (app should only be accessible via nginx).

#### User Experience Impact
- No impact on end users.
- Developers using direct database access tools must use `docker-compose.dev.yml` or `docker exec` into the container.

#### Open Questions for User
- Should a `docker-compose.dev.yml` override be created to re-expose port 5432 for local development?
- Should the `app` service port 3000 also be hidden (accessible only via nginx)?

#### How to Test
- Run `docker compose up` with production config -- verify port 5432 is not accessible from the host.
- Verify the application connects to the database and functions normally.
- Verify database migrations run successfully.
- Attempt direct connection to `localhost:5432` -- verify connection refused.

---

### REQ-SEC-12: Field-Level Encryption for PHI (High) — [DEFERRED]

**User Story:** As a system administrator, I want patient PHI (name, DOB, phone, address) encrypted at rest in the database, so that a database breach does not expose plaintext patient information.

**Current State:** In `backend/prisma/schema.prisma`, the Patient model stores `memberName`, `memberDob`, `memberTelephone`, and `memberAddress` as plaintext values in the database.

#### Acceptance Criteria

1. WHEN a patient record is created or updated, THEN the following fields SHALL be encrypted before writing to the database: `memberName`, `memberTelephone`, `memberAddress`. Note: `memberDob` is currently a `DateTime` type in Prisma and is used for date-based queries and the `@@unique([memberName, memberDob])` constraint. Encrypting it requires changing the column type to `String`, which breaks the DateTime type and the unique constraint. See acceptance criterion 10 for the approach.
2. WHEN a patient record is read from the database, THEN the encrypted fields SHALL be decrypted transparently before being returned to the API consumer.
3. WHEN encryption is applied, THEN it SHALL use AES-256-GCM with a key derived from the `PHI_ENCRYPTION_KEY` environment variable.
4. WHEN the `PHI_ENCRYPTION_KEY` environment variable is not set in production, THEN the application SHALL refuse to start and log: `"FATAL: PHI_ENCRYPTION_KEY is required in production for field-level encryption"`.
5. WHEN encryption is applied, THEN each field value SHALL use a unique initialization vector (IV) to prevent pattern detection.
6. WHEN the encryption key is rotated, THEN a migration utility SHALL re-encrypt all existing records with the new key (offline migration script).
7. WHEN encrypted fields are stored, THEN the database column types SHALL be `String` storing the encrypted ciphertext (base64-encoded IV + ciphertext + auth tag). For `memberDob`, this means changing the Prisma type from `DateTime` to `String` and handling date parsing/formatting in the application layer.
8. WHEN searching or sorting by encrypted fields (e.g., patient name search), THEN the application SHALL decrypt values for comparison in memory (or use a deterministic search index if performance requires it).
9. IF the encrypted data cannot be decrypted (wrong key, corrupted data), THEN the application SHALL log an error and return a clear error to the caller rather than crashing.
10. WHEN encryption is first deployed, THEN a one-time migration script SHALL encrypt all existing plaintext records.
11. WHEN the `@@unique([memberName, memberDob])` constraint exists, THEN it SHALL be replaced with a deterministic HMAC-based hash index: a new column `memberNameDobHash` (String, unique) SHALL store HMAC-SHA256(memberName + memberDob) to maintain duplicate detection without exposing plaintext. The existing `@@unique` constraint on the encrypted columns shall be removed.

#### User Experience Impact
- No visible change to end users (encryption/decryption is transparent).
- Patient name search may be slower for very large datasets (decryption required for matching).
- Initial migration requires downtime or a maintenance window to encrypt existing records.

#### Open Questions for User
- Is AES-256-GCM the desired algorithm, or does the organization have a specific encryption standard?
- How should the `PHI_ENCRYPTION_KEY` be managed? (environment variable, secret manager, HSM?)
- What is the acceptable performance impact on patient name search for the current dataset size?
- Should the `memberDob` be searchable without decryption (e.g., for birthday-based queries)? If so, a search hash index is needed.
- Does the deployment environment require FIPS-compliant encryption?
- Should the `@@unique([memberName, memberDob])` constraint be maintained? (Encrypted values break uniqueness checks -- a deterministic hash of the plaintext would be needed.)

#### How to Test
- Create a patient record -- verify database contains encrypted (non-plaintext) values for PHI fields.
- Read the patient record via API -- verify decrypted plaintext is returned correctly.
- Query the database directly (psql) -- verify PHI fields are not human-readable.
- Search for a patient by name -- verify search returns correct results.
- Start application with wrong `PHI_ENCRYPTION_KEY` -- verify error handling (not crash).
- Run key rotation script -- verify all records re-encrypted and readable with new key.
- Run initial migration script on existing data -- verify all records encrypted.

---

## Non-Functional Requirements

### Performance

- **NFR-PERF-01:** Rate limiting middleware SHALL add no more than 1ms latency to request processing.
- **NFR-PERF-02:** Field-level encryption/decryption (REQ-SEC-12) SHALL add no more than 50ms to a typical API response returning up to 500 patient records.
- **NFR-PERF-03:** Token refresh (REQ-SEC-09) SHALL complete within 200ms to avoid user-perceptible delay.
- **NFR-PERF-04:** Environment validation at startup (REQ-SEC-05) SHALL complete within 100ms (no network calls).

### Security

- **NFR-SEC-01:** All security hardening changes SHALL not introduce new vulnerabilities (verified via OWASP top 10 review).
- **NFR-SEC-02:** No sensitive data (passwords, encryption keys, tokens) SHALL appear in log output at any log level.
- **NFR-SEC-03:** All new environment variables SHALL be documented in `.env.example` with placeholder values (never real secrets).
- **NFR-SEC-04:** All error responses SHALL use generic messages that do not reveal system internals (database errors, stack traces, file paths).

### Reliability

- **NFR-REL-01:** Rate limiting state loss (server restart) SHALL not cause data loss or application errors (clients simply have fresh rate limit windows).
- **NFR-REL-02:** Account lockout state SHALL persist across server restarts (database-backed per REQ-SEC-06).
- **NFR-REL-03:** If encryption fails during a write operation (REQ-SEC-12), the record SHALL NOT be written in plaintext -- the operation SHALL fail with a 500 error.
- **NFR-REL-04:** Refresh token failure SHALL gracefully redirect to login rather than showing an error page.

### Usability

- **NFR-USE-01:** All rate limit and lockout error messages SHALL be clear and actionable (tell the user what to do and when to retry).
- **NFR-USE-02:** Session renewal (REQ-SEC-09) SHALL be invisible to users -- no interruption of workflow.
- **NFR-USE-03:** All new environment variables SHALL have clear documentation in installation guides explaining what they are and how to generate them.

### Compatibility

- **NFR-COMPAT-01:** All changes SHALL maintain backward compatibility with the existing Docker Compose deployment model.
- **NFR-COMPAT-02:** All changes SHALL work on the Render.com deployment (which handles TLS, DNS, and has different infrastructure from Docker).
- **NFR-COMPAT-03:** Database schema changes SHALL include Prisma migrations that work with existing data (no data loss).
- **NFR-COMPAT-04:** The httpOnly cookie auth (REQ-SEC-07) SHALL support a migration period where both Bearer header and cookie auth work simultaneously.

### Documentation

- **NFR-DOC-01:** All new environment variables SHALL be added to: `docs/QUICK_INSTALL.md`, `docs/INSTALLATION_GUIDE.md`, `docs/WINDOWS_SERVER_INSTALL.md`, `docs/RENDER_INSTALL.md`, and `.env.example`.
- **NFR-DOC-02:** Each requirement SHALL include a rollback procedure in the design document.

---

## Integration Requirements

### Existing System Integration Points

| System | Integration Impact | Requirements Affected |
|--------|-------------------|----------------------|
| `backend/src/app.ts` | CORS config, Helmet CSP, rate limiting middleware | REQ-SEC-02, REQ-SEC-03, REQ-SEC-08 |
| `backend/src/config/index.ts` | JWT secret validation, env var validation | REQ-SEC-04, REQ-SEC-05 |
| `backend/src/middleware/auth.ts` | Cookie-based JWT reading, refresh token logic | REQ-SEC-07, REQ-SEC-09 |
| `backend/src/services/authService.ts` | Account lockout fields, refresh token generation | REQ-SEC-06, REQ-SEC-09 |
| `backend/src/routes/auth.routes.ts` | Failed login logging, lockout check, refresh endpoint, cookie setting | REQ-SEC-06, REQ-SEC-07, REQ-SEC-09, REQ-SEC-10 |
| `backend/prisma/schema.prisma` | User lockout fields, RefreshToken model, encrypted PHI columns | REQ-SEC-06, REQ-SEC-09, REQ-SEC-12 |
| `backend/src/index.ts` | Startup validation, env checks | REQ-SEC-04, REQ-SEC-05 |
| `frontend/src/stores/authStore.ts` | Remove localStorage token, cookie-based auth | REQ-SEC-07 |
| `frontend/src/api/axios.ts` | Remove Bearer header, add refresh interceptor, withCredentials | REQ-SEC-07, REQ-SEC-09 |
| `frontend/src/services/socketService.ts` | Cookie-based WebSocket auth (currently uses `auth:{token}` in handshake, must migrate to cookie or keep both) | REQ-SEC-07 |
| `nginx/nginx.conf` | HTTPS config, TLS settings | REQ-SEC-01 |
| `docker-compose.yml` | Remove db port exposure, remove app port exposure | REQ-SEC-11 |
| Installation guides (4 files) | New env var documentation | All requirements |

### New Files Expected

| File | Purpose | Requirement |
|------|---------|-------------|
| `backend/src/config/validateEnv.ts` | Startup environment validation | REQ-SEC-04, REQ-SEC-05 |
| `backend/src/middleware/rateLimiter.ts` | Rate limiting middleware configuration | REQ-SEC-03 |
| `backend/src/utils/encryption.ts` | PHI field encryption/decryption utilities | REQ-SEC-12 |
| `backend/src/middleware/csrf.ts` | CSRF protection (Origin/Referer validation) | REQ-SEC-07 |
| `backend/scripts/encrypt-existing-phi.ts` | One-time migration to encrypt existing PHI | REQ-SEC-12 |
| `backend/scripts/rotate-encryption-key.ts` | Key rotation utility | REQ-SEC-12 |
| `nginx/nginx-ssl.conf` | HTTPS-enabled nginx configuration | REQ-SEC-01 |
| `docker-compose.dev.yml` | Development overrides (exposed ports) | REQ-SEC-11 |

### New Dependencies Expected

| Package | Purpose | Requirement |
|---------|---------|-------------|
| `express-rate-limit` | Rate limiting middleware | REQ-SEC-03 |
| No new dependency for encryption | Node.js built-in `crypto` module (AES-256-GCM) | REQ-SEC-12 |

---

## Assumptions and Constraints

### Assumptions

1. The Render.com deployment handles TLS termination at the infrastructure level; REQ-SEC-01 (HTTPS) only adds nginx TLS for Docker on-premise deployments.
2. The application will continue to use PostgreSQL as the sole database (no Redis for rate limiting or session storage).
3. The current audit log infrastructure (AuditLog model) is sufficient for failed login logging without schema changes beyond adding new action types.
4. Socket.IO will continue to work with cookie-based authentication (cookies are sent on WebSocket upgrade requests).
5. AG Grid inline styles make `'unsafe-inline'` necessary for the `style-src` CSP directive.
6. The current dataset size (hundreds to low thousands of patient records) makes in-memory decryption for search acceptable.

### Constraints

1. **No Redis dependency**: Rate limiting and session storage must work with in-process memory or PostgreSQL. Redis can be considered in a future phase.
2. **Backward compatibility**: Existing Docker and Render deployments must continue working during and after migration. Breaking changes require a documented migration path.
3. **Prisma ORM**: All database changes must be expressed as Prisma schema changes and migrations. Raw SQL is acceptable only for one-time migration scripts.
4. **No downtime for most changes**: Items 1-11 can be deployed without downtime. Item 12 (PHI encryption) may require a maintenance window for the initial encryption migration.
5. **Four installation guides**: All environment variable additions must be documented in `QUICK_INSTALL.md`, `INSTALLATION_GUIDE.md`, `WINDOWS_SERVER_INSTALL.md`, and `RENDER_INSTALL.md`.

---

## Scope Decisions

### Included (7 items)

| # | Requirement | Severity | Key Decisions |
|---|------------|----------|---------------|
| 2 | CORS Origin Whitelist | Critical | Require `CORS_ORIGIN` env var, no hardcoded domain |
| 3 | Rate Limiting | Critical | 20 login/15min, 10 import/min, 100 global/min |
| 4 | JWT Secret Validation | Critical | 32 char min, crash on missing/default in production |
| 5 | Env Var Validation | Critical | 6 required vars: JWT_SECRET, DATABASE_URL, CORS_ORIGIN, SMTP_HOST, ADMIN_EMAIL, ADMIN_PASSWORD |
| 6 | Account Lockout | High | 5 attempts/15min, temp password via email, forced pw change, 3-attempt warning |
| 7 | httpOnly Cookie | High | sameSite strict (same-origin Docker deployment) |
| 10 | Failed Login Logging | High | 3-month retention (vs 6 months for other audit logs) |

### Deferred (5 items)

| # | Requirement | Reason |
|---|------------|--------|
| 1 | HTTPS/TLS Enforcement | No cert info available; Render handles TLS already |
| 8 | Content-Security-Policy | Skipped by user |
| 9 | Refresh Token Mechanism | 8-hour JWT is sufficient for now |
| 11 | Hide DB Port in Docker | Deferred by user |
| 12 | Field-Level Encryption for PHI | Deferred by user |

## Implementation Priority and Dependencies

```
Priority 1 (Critical - Deploy First):
  REQ-SEC-04: JWT Secret Validation          (no dependencies)
  REQ-SEC-05: Env Var Validation at Startup   (no dependencies)
  REQ-SEC-02: CORS Origin Whitelist           (depends on REQ-SEC-05)
  REQ-SEC-03: Rate Limiting                   (no dependencies)

Priority 2 (High - Deploy Second):
  REQ-SEC-10: Failed Login Audit Logging       (no dependencies)
  REQ-SEC-06: Account Lockout                  (depends on REQ-SEC-10)
  REQ-SEC-07: Move JWT to httpOnly Cookie      (no dependencies)
```

---

## Glossary

| Term | Definition |
|------|------------|
| PHI | Protected Health Information - individually identifiable health information including names, dates, phone numbers, addresses |
| CSP | Content-Security-Policy - HTTP header that controls which resources can be loaded on a page |
| CORS | Cross-Origin Resource Sharing - mechanism controlling which domains can make API requests |
| CSRF | Cross-Site Request Forgery - attack where a malicious site submits requests to the application using the user's cookies |
| XSS | Cross-Site Scripting - attack where malicious scripts are injected into web pages |
| HSTS | HTTP Strict Transport Security - header instructing browsers to only use HTTPS |
| AES-256-GCM | Advanced Encryption Standard with 256-bit key in Galois/Counter Mode - authenticated encryption algorithm |
| IV | Initialization Vector - random value used to ensure identical plaintexts encrypt to different ciphertexts |
| httpOnly | Cookie flag preventing JavaScript access to the cookie value |
