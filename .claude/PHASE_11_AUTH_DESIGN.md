# Phase 11: Authentication & Multi-Physician Support

## Overview

Add JWT-based authentication with multi-physician data isolation. Each physician sees only their own patients. Admins can manage users and see all data.

## Design Decisions

| Decision | Choice |
|----------|--------|
| User Model | **Simple User** - email, password, displayName, role (no medical fields) |
| Data Migration | **Keep as unassigned** - existing patients get ownerId=null, STAFF assigns them |
| Delete Behavior | **Soft delete** - deactivate user, preserve audit history |
| Physician Delete | **Unassign patients** - patients become unassigned, STAFF can reassign |
| Public Access | **Require Login** - must authenticate to see any patient data |
| Admin Limit | **Unlimited** - multiple users can have admin role |
| Roles | **PHYSICIAN, STAFF, ADMIN** |
| Staff Permissions | **Full Edit** - STAFF can create/edit/delete for assigned physicians |

---

## Role Structure

| Role | Description | Patient Data Access | Admin Access |
|------|-------------|---------------------|--------------|
| **PHYSICIAN** | Doctor who owns patients | Own patients only | None |
| **STAFF** | PA/MA covering multiple physicians | Assigned physicians' patients (full edit) | None |
| **ADMIN** | System administrator | **NONE** (cannot see patient data) | Full (user management, audit logs, system settings) |

**Key point:** ADMIN is for IT/system administration only - they manage users and system settings but have no access to patient data (HIPAA separation of duties).

**Staff-Physician Assignment (many-to-many):**
```
Example:
- Dr. Smith (PHYSICIAN) → owns 50 patients
- Dr. Jones (PHYSICIAN) → owns 40 patients
- Sarah (STAFF) → assigned to Dr. Smith + Dr. Jones
- Admin (ADMIN) → can manage users, but CANNOT see any patient data
```

**STAFF Physician Selector (toggle in header):**

STAFF users see a physician dropdown in the header to switch between assigned physicians:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Patient Quality Measure Tracker         Viewing as: [Dr. Smith ▼]     │
│                                                      - Dr. Smith       │
│  [Patient Grid]  [Import]                            - Dr. Jones       │
│                                                                        │
│                                          Sarah (Staff) | [Logout]      │
└─────────────────────────────────────────────────────────────────────────┘

When "Dr. Smith" selected → see only Dr. Smith's patients (50 patients)
When "Dr. Jones" selected → see only Dr. Jones's patients (40 patients)
```

- Dropdown shows only assigned physicians + "Unassigned" option
- Selection persists in localStorage (remembers last viewed)
- All actions (create, edit, import) apply to selected physician
- PHYSICIAN users don't see this dropdown (they only see their own patients)

**STAFF Unassigned Patients Page:**

STAFF can view and reassign unassigned patients (e.g., when a physician leaves):

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Unassigned Patients (15)                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ☐ Select All                                      Assign to: [     ▼] │
│                                                               Dr. Smith │
│  ☑ John Doe      │ DOB: 1965-01-15 │ 3 measures   │                    │
│  ☑ Jane Smith    │ DOB: 1970-03-22 │ 5 measures   │         Dr. Jones  │
│  ☐ Bob Wilson    │ DOB: 1958-07-08 │ 2 measures   │                    │
│  ☐ Mary Johnson  │ DOB: 1982-11-30 │ 4 measures   │                    │
│                                                                         │
│                                              [Assign Selected (2)]      │
└─────────────────────────────────────────────────────────────────────────┘
```

**Flow:**
1. STAFF sees "Unassigned" in physician dropdown (shows count badge if > 0)
2. Selecting "Unassigned" shows list of patients without owner
3. STAFF selects patients, chooses physician from their assigned list
4. Click "Assign Selected" → patients get new ownerId
5. Patients now appear in that physician's grid

**API endpoints:**
```
GET  /api/data/unassigned           - List unassigned patients (STAFF only)
POST /api/data/assign               - Assign patients to physician
     { patientIds: [1, 2], physicianId: 3 }
```

**Access control:**
- STAFF can only assign to physicians they're assigned to
- PHYSICIAN cannot see unassigned patients (not theirs)
- ADMIN cannot access this (no patient data)

---

## Current State

**Already in place:**
- JWT config exists (`jwtSecret`, `jwtExpiresIn: '8h'`)
- bcryptjs + jsonwebtoken packages installed
- Axios interceptor reads `auth_token` from localStorage
- EditLock table tracks `lockedByUsername`
- AuditLog table tracks actions by username
- Header has "Login to Edit" button placeholder

**Missing:**
- User model in database
- Auth middleware and routes
- Frontend auth state/context
- Login UI
- Data filtering by owner

---

## Implementation Steps (Detailed Breakdown)

### Step 1: Database Schema - User Model
**Files:** `backend/prisma/schema.prisma`

- [ ] 1.1 Add `UserRole` enum (PHYSICIAN, STAFF, ADMIN)
- [ ] 1.2 Add `User` model with fields: id, email, username, passwordHash, displayName, role, isActive, lastLoginAt, createdAt, updatedAt
- [ ] 1.3 Add `StaffAssignment` model for many-to-many staff-physician relationship
- [ ] 1.4 Add `Patient.ownerId` field (nullable foreign key to User)
- [ ] 1.5 Update `AuditLog` model - add userId relation
- [ ] 1.6 Run migration: `npx prisma migrate dev --name add_user_model`

### Step 2: Database Schema - Seed Script
**Files:** `backend/prisma/seed.ts`

- [ ] 2.1 Add bcrypt import for password hashing
- [ ] 2.2 Read ADMIN_EMAIL, ADMIN_PASSWORD from environment
- [ ] 2.3 Create initial admin user with upsert
- [ ] 2.4 Add npm script: `"seed": "tsx prisma/seed.ts"`
- [ ] 2.5 Test seed script locally

### Step 3: Backend Auth Service
**Files:** `backend/src/services/authService.ts`

- [ ] 3.1 Create `hashPassword(password)` function using bcrypt
- [ ] 3.2 Create `verifyPassword(password, hash)` function
- [ ] 3.3 Create `generateToken(user)` function using jsonwebtoken
- [ ] 3.4 Create `verifyToken(token)` function
- [ ] 3.5 Create `findUserByEmail(email)` function
- [ ] 3.6 Create `updateLastLogin(userId)` function
- [ ] 3.7 Write unit tests for authService

### Step 4: Backend Auth Middleware
**Files:** `backend/src/middleware/auth.ts`, `backend/src/types/express.d.ts`

- [ ] 4.1 Create Express type extension for `req.user`
- [ ] 4.2 Create `requireAuth` middleware (verify JWT, attach user to req)
- [ ] 4.3 Create `requireRole(roles[])` middleware (check user role)
- [ ] 4.4 Create `optionalAuth` middleware (attach user if token present)
- [ ] 4.5 Write unit tests for auth middleware

### Step 5: Backend Auth Routes
**Files:** `backend/src/routes/auth.routes.ts`, `backend/src/routes/index.ts`

- [ ] 5.1 Create POST `/api/auth/login` endpoint
- [ ] 5.2 Create POST `/api/auth/logout` endpoint (clear edit lock)
- [ ] 5.3 Create GET `/api/auth/me` endpoint (current user info)
- [ ] 5.4 Create PUT `/api/auth/password` endpoint (change password)
- [ ] 5.5 Register auth routes in index.ts
- [ ] 5.6 Write integration tests for auth routes

### Step 6: Protect Existing Routes
**Files:** `backend/src/routes/data.routes.ts`, `backend/src/routes/import.routes.ts`, `backend/src/routes/config.routes.ts`

- [ ] 6.1 Add `requireAuth` to all data routes
- [ ] 6.2 Add `requireAuth` to all import routes
- [ ] 6.3 Add `requireAuth` to all config routes
- [ ] 6.4 Add `requireRole(['PHYSICIAN', 'STAFF'])` to patient data routes
- [ ] 6.5 Keep health routes public
- [ ] 6.6 Test protected routes return 401 without token

### Step 7: Frontend Auth Store
**Files:** `frontend/src/stores/authStore.ts`

- [ ] 7.1 Create Zustand store with state: user, token, isAuthenticated, isLoading
- [ ] 7.2 Add `login(email, password)` action
- [ ] 7.3 Add `logout()` action
- [ ] 7.4 Add `refreshUser()` action (fetch /api/auth/me)
- [ ] 7.5 Add `selectedPhysicianId` for STAFF physician selector
- [ ] 7.6 Persist token to localStorage
- [ ] 7.7 Write unit tests for authStore

### Step 8: Frontend Login Page
**Files:** `frontend/src/pages/LoginPage.tsx`, `frontend/src/App.tsx`

- [ ] 8.1 Create LoginPage component with email/password form
- [ ] 8.2 Add form validation (required fields, email format)
- [ ] 8.3 Add error handling and display
- [ ] 8.4 Add loading state during login
- [ ] 8.5 Redirect to main page on success
- [ ] 8.6 Add `/login` route to App.tsx
- [ ] 8.7 Write component tests for LoginPage

### Step 9: Frontend Protected Routes
**Files:** `frontend/src/components/auth/ProtectedRoute.tsx`, `frontend/src/App.tsx`

- [ ] 9.1 Create ProtectedRoute component
- [ ] 9.2 Check authentication state
- [ ] 9.3 Redirect to /login if not authenticated
- [ ] 9.4 Show loading while checking auth
- [ ] 9.5 Wrap all routes (except /login) with ProtectedRoute
- [ ] 9.6 Write component tests for ProtectedRoute

### Step 10: Frontend Header Updates
**Files:** `frontend/src/components/layout/Header.tsx`

- [ ] 10.1 Show user info when logged in (name, role)
- [ ] 10.2 Add user dropdown menu (Profile, Change Password, Logout)
- [ ] 10.3 Add physician selector dropdown for STAFF users
- [ ] 10.4 Add "Unassigned" option with count badge
- [ ] 10.5 Persist selected physician to localStorage
- [ ] 10.6 Write component tests for Header auth UI

### Step 11: Frontend Change Password Modal
**Files:** `frontend/src/components/auth/ChangePasswordModal.tsx`

- [ ] 11.1 Create modal with current/new/confirm password fields
- [ ] 11.2 Add form validation
- [ ] 11.3 Call PUT /api/auth/password on submit
- [ ] 11.4 Show success/error messages
- [ ] 11.5 Write component tests

### Step 12: Backend Data Filtering by Owner
**Files:** `backend/src/routes/data.routes.ts`

- [ ] 12.1 Create `getPatientFilter(user, physicianId)` function
- [ ] 12.2 PHYSICIAN: filter by ownerId = user.id
- [ ] 12.3 STAFF: validate assignment, filter by selected physicianId
- [ ] 12.4 ADMIN: throw 403 (no patient data access)
- [ ] 12.5 Apply filter to GET /api/data endpoint
- [ ] 12.6 Apply filter to all CRUD operations
- [ ] 12.7 Write integration tests for data filtering

### Step 13: Backend Unassigned Patients Endpoints
**Files:** `backend/src/routes/data.routes.ts`

- [ ] 13.1 Create GET `/api/data/unassigned` endpoint (STAFF only)
- [ ] 13.2 Create POST `/api/data/assign` endpoint
- [ ] 13.3 Validate STAFF can only assign to their physicians
- [ ] 13.4 Write integration tests

### Step 14: Frontend Unassigned Patients Page
**Files:** `frontend/src/pages/UnassignedPatientsPage.tsx`

- [ ] 14.1 Create page with patient list (checkbox selection)
- [ ] 14.2 Add physician dropdown for assignment
- [ ] 14.3 Add "Assign Selected" button
- [ ] 14.4 Call POST /api/data/assign on submit
- [ ] 14.5 Add route to App.tsx
- [ ] 14.6 Write component tests

### Step 15: Backend Import Owner Assignment
**Files:** `backend/src/routes/import.routes.ts`

- [ ] 15.1 PHYSICIAN: set ownerId to user.id automatically
- [ ] 15.2 STAFF: require physicianId parameter, validate assignment
- [ ] 15.3 ADMIN: block access (403)
- [ ] 15.4 Write integration tests

### Step 16: Frontend Import Page Updates
**Files:** `frontend/src/pages/ImportPage.tsx`

- [ ] 16.1 Add physician selector for STAFF users
- [ ] 16.2 Pass physicianId to preview/execute API calls
- [ ] 16.3 Hide import page from ADMIN (redirect to admin panel)
- [ ] 16.4 Write component tests

### Step 17: Backend Admin Routes
**Files:** `backend/src/routes/admin.routes.ts`, `backend/src/routes/index.ts`

- [ ] 17.1 Create GET `/api/admin/users` (list all users)
- [ ] 17.2 Create POST `/api/admin/users` (create user with password hashing)
- [ ] 17.3 Create PUT `/api/admin/users/:id` (update user)
- [ ] 17.4 Create DELETE `/api/admin/users/:id` (soft delete)
- [ ] 17.5 Create GET `/api/admin/physicians` (list physicians for dropdown)
- [ ] 17.6 Create PUT `/api/admin/users/:id/assignments` (update staff assignments)
- [ ] 17.7 Add `requireRole(['ADMIN'])` to all admin routes
- [ ] 17.8 Register admin routes in index.ts
- [ ] 17.9 Write integration tests

### Step 18: Backend Soft Delete Logic
**Files:** `backend/src/routes/admin.routes.ts`

- [ ] 18.1 On PHYSICIAN delete: unassign all their patients (ownerId = null)
- [ ] 18.2 On PHYSICIAN delete: remove staff assignments
- [ ] 18.3 Set isActive = false (soft delete)
- [ ] 18.4 Write integration tests

### Step 19: Frontend Admin Page
**Files:** `frontend/src/pages/AdminPage.tsx`

- [ ] 19.1 Create admin dashboard layout
- [ ] 19.2 Add navigation tabs (Users, Audit Log, Settings)
- [ ] 19.3 Restrict access to ADMIN role only
- [ ] 19.4 Add route to App.tsx
- [ ] 19.5 Write component tests

### Step 20: Frontend User Management
**Files:** `frontend/src/components/admin/UserList.tsx`, `frontend/src/components/admin/UserForm.tsx`

- [ ] 20.1 Create UserList component (table with users)
- [ ] 20.2 Add Edit/Deactivate action buttons
- [ ] 20.3 Create UserForm modal (create/edit)
- [ ] 20.4 Add role dropdown
- [ ] 20.5 Add physician checkboxes for STAFF role
- [ ] 20.6 Write component tests

### Step 21: Backend Audit Service
**Files:** `backend/src/services/auditService.ts`

- [ ] 21.1 Create `calculateFieldChanges(oldRecord, newRecord)` function
- [ ] 21.2 Create `logChange(userId, action, entity, entityId, changes)` function
- [ ] 21.3 Write unit tests

### Step 22: Backend Audit Logging Integration
**Files:** `backend/src/routes/data.routes.ts`

- [ ] 22.1 Add audit logging to CREATE endpoint
- [ ] 22.2 Add audit logging to UPDATE endpoint (with field diffs)
- [ ] 22.3 Add audit logging to DELETE endpoint
- [ ] 22.4 Write integration tests

### Step 23: Backend Audit Log Endpoints
**Files:** `backend/src/routes/admin.routes.ts`

- [ ] 23.1 Create GET `/api/admin/audit-log` with pagination
- [ ] 23.2 Add filters: date range, user, action type
- [ ] 23.3 Write integration tests

### Step 24: Frontend Audit Log Viewer
**Files:** `frontend/src/components/admin/AuditLogViewer.tsx`

- [ ] 24.1 Create audit log table with pagination
- [ ] 24.2 Add filter controls (date, user, action)
- [ ] 24.3 Add "View Details" expansion for field changes
- [ ] 24.4 Add export to CSV button
- [ ] 24.5 Write component tests

### Step 25: Backend Audit Log Cleanup Job
**Files:** `backend/src/jobs/auditLogCleanup.ts`, `backend/package.json`

- [ ] 25.1 Create cleanup function (delete logs > 6 months)
- [ ] 25.2 Add npm script: `"cleanup-logs": "tsx src/jobs/auditLogCleanup.ts"`
- [ ] 25.3 Document cron setup for different environments
- [ ] 25.4 Write unit tests

### Step 26: CLI Password Reset Script
**Files:** `backend/src/scripts/resetPassword.ts`, `backend/package.json`

- [ ] 26.1 Create CLI script with --email and --password args
- [ ] 26.2 Hash new password and update user
- [ ] 26.3 Log reset in audit log
- [ ] 26.4 Add npm script: `"reset-password": "tsx src/scripts/resetPassword.ts"`
- [ ] 26.5 Write unit tests

### Step 27: E2E Tests - Auth Flow
**Files:** `frontend/e2e/auth.spec.ts`

- [ ] 27.1 Test login with valid credentials
- [ ] 27.2 Test login with invalid credentials
- [ ] 27.3 Test logout
- [ ] 27.4 Test protected route redirect
- [ ] 27.5 Test session persistence

### Step 28: E2E Tests - Admin Flow
**Files:** `frontend/cypress/e2e/admin.cy.ts`

- [ ] 28.1 Test create physician
- [ ] 28.2 Test create staff with assignments
- [ ] 28.3 Test edit staff assignments
- [ ] 28.4 Test deactivate user

### Step 29: E2E Tests - Data Isolation
**Files:** `frontend/e2e/data-isolation.spec.ts`

- [ ] 29.1 Test PHYSICIAN sees only own patients
- [ ] 29.2 Test STAFF sees selected physician's patients
- [ ] 29.3 Test ADMIN cannot see patient data
- [ ] 29.4 Test unassigned patient assignment

### Step 30: Documentation & Deployment
**Files:** `.claude/`, `README.md`

- [ ] 30.1 Update README with auth setup instructions
- [ ] 30.2 Update IMPLEMENTATION_STATUS.md
- [ ] 30.3 Update CHANGELOG.md
- [ ] 30.4 Update TODO.md
- [ ] 30.5 Document environment variables
- [ ] 30.6 Document deployment steps for different environments

---

## Implementation Phases (Summary)

### Phase 11a: Database Schema (Day 1)

**Create User model** in `backend/prisma/schema.prisma`:

```prisma
model User {
  id              Int       @id @default(autoincrement())
  email           String    @unique
  username        String    @unique
  passwordHash    String    @map("password_hash")
  displayName     String    @map("display_name")
  role            UserRole  @default(PHYSICIAN)
  isActive        Boolean   @default(true) @map("is_active")
  lastLoginAt     DateTime? @map("last_login_at")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  // Patients owned by this physician
  patients        Patient[]

  // Staff assignments (for STAFF role - which physicians they cover)
  assignedPhysicians  StaffAssignment[] @relation("StaffUser")
  // Staff assigned to this physician (for PHYSICIAN role)
  assignedStaff       StaffAssignment[] @relation("PhysicianUser")

  @@map("users")
}

enum UserRole {
  PHYSICIAN
  STAFF
  ADMIN
}

// Many-to-many: Staff can cover multiple Physicians
model StaffAssignment {
  id            Int      @id @default(autoincrement())
  staffId       Int      @map("staff_id")
  physicianId   Int      @map("physician_id")
  createdAt     DateTime @default(now()) @map("created_at")

  staff         User     @relation("StaffUser", fields: [staffId], references: [id])
  physician     User     @relation("PhysicianUser", fields: [physicianId], references: [id])

  @@unique([staffId, physicianId])
  @@map("staff_assignments")
}
```

**Modify Patient model** - add owner relation (nullable for unassigned):
```prisma
model Patient {
  // ... existing fields ...
  ownerId    Int?   @map("owner_id")  // Nullable - can be unassigned when physician deleted
  owner      User?  @relation(fields: [ownerId], references: [id])
  @@index([ownerId])
}
```

**When physician is soft-deleted:**
```typescript
// Unassign all their patients
await prisma.patient.updateMany({
  where: { ownerId: physicianId },
  data: { ownerId: null }
});

// Remove staff assignments
await prisma.staffAssignment.deleteMany({
  where: { physicianId }
});

// Soft delete the user
await prisma.user.update({
  where: { id: physicianId },
  data: { isActive: false }
});
```

**Migration steps:**
1. Run migration: `npx prisma migrate dev --name add_user_model`
   - Adds User table, StaffAssignment table
   - Adds Patient.ownerId column (nullable, defaults to null)
   - Existing patients automatically get ownerId = null (unassigned)
2. Set admin credentials via environment variables
3. Run seed script to create initial admin
4. Admin creates physician accounts
5. STAFF uses "Unassigned Patients" page to bulk assign existing patients to physicians

**Admin Seed Script** (`backend/prisma/seed.ts`):

```typescript
// Read admin credentials from environment
const adminEmail = process.env.ADMIN_EMAIL || 'admin@localhost';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

// Create admin user (upsert to avoid duplicates)
await prisma.user.upsert({
  where: { email: adminEmail },
  create: {
    email: adminEmail,
    username: 'admin',
    passwordHash: await bcrypt.hash(adminPassword, 12),
    displayName: 'System Admin',
    role: 'ADMIN',
  },
  update: {}, // Don't overwrite if exists
});
```

**Deployment (any environment):**

```bash
# 1. Set environment variables (choose one method)

# Option A: .env file
echo "ADMIN_EMAIL=admin@clinic.local" >> .env
echo "ADMIN_PASSWORD=SecurePassword123" >> .env

# Option B: Shell export
export ADMIN_EMAIL=admin@clinic.local
export ADMIN_PASSWORD=SecurePassword123

# Option C: Inline with command
ADMIN_EMAIL=admin@clinic.local ADMIN_PASSWORD=SecurePassword123 npm run seed

# 2. Run migration + seed
npm run db:migrate
npm run seed

# 3. Start app
npm start
```

**Works on:** Bare metal, VM, Docker, Render, any platform that supports env vars.

---

### Phase 11b: Backend Auth (Days 2-3)

**New files:**

| File | Purpose |
|------|---------|
| `backend/src/services/authService.ts` | Password hashing, JWT generation/verification |
| `backend/src/middleware/auth.ts` | `requireAuth`, `requireRole`, `optionalAuth` |
| `backend/src/routes/auth.routes.ts` | Login, logout, me, refresh endpoints |
| `backend/src/types/express.d.ts` | Extend Request with `user` property |

**Auth endpoints:**
```
POST /api/auth/login     - Authenticate, return JWT
POST /api/auth/logout    - Clear edit lock, invalidate session
GET  /api/auth/me        - Get current user info
PUT  /api/auth/password  - Change own password
```

**Modify existing routes:**
- `data.routes.ts` - Add `requireAuth` to ALL endpoints (login required to view data)
- `import.routes.ts` - Add `requireAuth` to all endpoints
- `config.routes.ts` - Add `requireAuth` (dropdown options need login)
- `health.routes.ts` - Keep public (for monitoring)

---

### Phase 11c: Frontend Auth (Days 4-5)

**New files:**

| File | Purpose |
|------|---------|
| `frontend/src/stores/authStore.ts` | Zustand store: user, token, login(), logout() |
| `frontend/src/components/auth/LoginModal.tsx` | Login form modal |
| `frontend/src/components/auth/ProtectedRoute.tsx` | Route guard component |
| `frontend/src/pages/LoginPage.tsx` | Standalone login page |

**Modify existing files:**
- `App.tsx` - Add login route, wrap all routes with ProtectedRoute (except /login)
- `Header.tsx` - Show user info when logged in, logout button
- `MainPage.tsx` - No changes needed (ProtectedRoute handles redirect)

---

### Phase 11d: Multi-Physician Data Filtering (Day 6)

**Modify `data.routes.ts`:**
```typescript
// GET /api/data?physicianId=2  (STAFF passes selected physician)
async function getPatientFilter(user: AuthUser, selectedPhysicianId?: number) {
  if (user.role === 'ADMIN') {
    throw createError(403, 'FORBIDDEN', 'Admins cannot access patient data');
  }

  if (user.role === 'PHYSICIAN') {
    return { patient: { ownerId: user.id } }; // Own patients only
  }

  if (user.role === 'STAFF') {
    // Verify STAFF is assigned to the selected physician
    const assignment = await prisma.staffAssignment.findFirst({
      where: { staffId: user.id, physicianId: selectedPhysicianId }
    });
    if (!assignment) {
      throw createError(403, 'FORBIDDEN', 'Not assigned to this physician');
    }
    return { patient: { ownerId: selectedPhysicianId } }; // Selected physician's patients
  }
}
```

**Frontend sends selectedPhysicianId:**
```typescript
// STAFF: pass selected physician from header dropdown
const physicianId = useAuthStore(s => s.selectedPhysicianId);
const { data } = useQuery(['patients', physicianId], () =>
  api.get(`/data?physicianId=${physicianId}`)
);
```

**Route protection by role:**
```typescript
// Patient data routes - PHYSICIAN and STAFF only
router.use('/data', requireAuth, requireRole(['PHYSICIAN', 'STAFF']));
router.use('/import', requireAuth, requireRole(['PHYSICIAN', 'STAFF']));
router.use('/config', requireAuth, requireRole(['PHYSICIAN', 'STAFF']));

// Admin routes - ADMIN only
router.use('/admin', requireAuth, requireRole(['ADMIN']));
```

**Modify `import.routes.ts`:**
- PHYSICIAN: Imported patients automatically owned by self
- STAFF: Must select which physician to import for (dropdown of assigned physicians)
- ADMIN: Cannot access import (no patient data access)

**Import page for STAFF:**
```
┌─────────────────────────────────────┐
│  Import Patients                    │
│                                     │
│  Import for: [Dr. Smith ▼]          │  ← STAFF sees dropdown of assigned physicians
│              - Dr. Smith            │
│              - Dr. Jones            │
│                                     │
│  [Upload File...]                   │
└─────────────────────────────────────┘
```

**Modify duplicate detection:**
- Only check duplicates within same owner's patients

---

### Phase 11e: Admin Panel (Days 7-8)

**New files:**

| File | Purpose |
|------|---------|
| `frontend/src/pages/AdminPage.tsx` | Admin dashboard |
| `frontend/src/components/admin/UserList.tsx` | User management table |
| `frontend/src/components/admin/UserForm.tsx` | Create/edit user form |
| `backend/src/routes/admin.routes.ts` | User CRUD, lock management |

**Admin endpoints:**
```
GET    /api/admin/users              - List all users
POST   /api/admin/users              - Create user
PUT    /api/admin/users/:id          - Update user
DELETE /api/admin/users/:id          - Deactivate user
DELETE /api/admin/lock               - Force release edit lock
GET    /api/admin/stats              - System statistics

# Staff Assignment endpoints
GET    /api/admin/users/:id/assignments     - Get staff's assigned physicians
PUT    /api/admin/users/:id/assignments     - Update staff's assigned physicians
GET    /api/admin/physicians                - List all physicians (for assignment dropdown)
```

**Admin Create User Flows:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ADMIN PANEL (/admin)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Users                                              [+ Create User]     │
│  ───────────────────────────────────────────────────────────────────    │
│  Name          │ Email              │ Role      │ Status  │ Actions    │
│  Dr. Smith     │ smith@clinic       │ PHYSICIAN │ Active  │ [Edit]     │
│  Dr. Jones     │ jones@clinic       │ PHYSICIAN │ Active  │ [Edit]     │
│  Sarah (PA)    │ sarah@clinic       │ STAFF     │ Active  │ [Edit]     │
│  Admin         │ admin@clinic       │ ADMIN     │ Active  │ [Edit]     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

**Flow 1: Create PHYSICIAN**

```
1. Admin clicks [+ Create User]
2. Form opens:
   ┌─────────────────────────────────────┐
   │  Create New User                    │
   │                                     │
   │  Email:        [dr.lee@clinic.local]│
   │  Username:     [drlee_____________] │
   │  Display Name: [Dr. Lee___________] │
   │  Password:     [TempPass123_______] │
   │  Role:         [PHYSICIAN ▼]        │
   │                                     │
   │         [Cancel]  [Create User]     │
   └─────────────────────────────────────┘

3. Admin clicks [Create User]
4. API: POST /api/admin/users
   {
     email: "dr.lee@clinic.local",
     username: "drlee",
     displayName: "Dr. Lee",
     password: "TempPass123",
     role: "PHYSICIAN"
   }

5. Backend creates user → Dr. Lee can now:
   - Log in
   - Create/import patients (owned by them)
   - Edit their own patients
```

---

**Flow 2: Create STAFF (with physician assignments)**

```
1. Admin clicks [+ Create User]
2. Form opens, admin selects STAFF role:
   ┌─────────────────────────────────────┐
   │  Create New User                    │
   │                                     │
   │  Email:        [mary@clinic.local_] │
   │  Username:     [mary______________] │
   │  Display Name: [Mary (MA)_________] │
   │  Password:     [TempPass123_______] │
   │  Role:         [STAFF ▼]            │
   │                                     │
   │  ┌─ Assign to Physicians ─────────┐ │
   │  │ (Select which doctors this     │ │
   │  │  staff member can work for)    │ │
   │  │                                │ │
   │  │ ☑ Dr. Smith                    │ │
   │  │ ☑ Dr. Jones                    │ │
   │  │ ☐ Dr. Lee                      │ │
   │  │ ☐ Dr. Williams                 │ │
   │  └────────────────────────────────┘ │
   │                                     │
   │         [Cancel]  [Create User]     │
   └─────────────────────────────────────┘

3. Admin selects physicians, clicks [Create User]
4. API: POST /api/admin/users
   {
     email: "mary@clinic.local",
     username: "mary",
     displayName: "Mary (MA)",
     password: "TempPass123",
     role: "STAFF",
     assignedPhysicianIds: [1, 2]  // Dr. Smith & Dr. Jones
   }

5. Backend:
   - Creates user with role=STAFF
   - Creates StaffAssignment records:
     - { staffId: 5, physicianId: 1 }  // Mary → Dr. Smith
     - { staffId: 5, physicianId: 2 }  // Mary → Dr. Jones

6. Mary can now:
   - Log in
   - See patients owned by Dr. Smith AND Dr. Jones
   - Create/edit/delete those patients
   - Cannot see Dr. Lee's or Dr. Williams' patients
```

---

**Flow 3: Create ADMIN**

```
1. Admin clicks [+ Create User]
2. Form opens:
   ┌─────────────────────────────────────┐
   │  Create New User                    │
   │                                     │
   │  Email:        [admin2@clinic_____] │
   │  Username:     [admin2____________] │
   │  Display Name: [Admin Two_________] │
   │  Password:     [SecurePass456_____] │
   │  Role:         [ADMIN ▼]            │
   │                                     │
   │         [Cancel]  [Create User]     │
   └─────────────────────────────────────┘

3. Admin clicks [Create User]
4. API: POST /api/admin/users
   {
     email: "admin2@clinic.local",
     username: "admin2",
     displayName: "Admin Two",
     password: "SecurePass456",
     role: "ADMIN"
   }

5. New admin can now:
   - Log in
   - Manage users (create/edit/deactivate)
   - Manage staff-physician assignments
   - View audit logs
   - Force release edit locks
   - View system statistics
   - **CANNOT see or edit patient data**
```

---

**Flow 4: Edit STAFF assignments**

```
1. Admin clicks [Edit] on existing STAFF user
2. Form opens with current assignments:
   ┌─────────────────────────────────────┐
   │  Edit User: Mary (MA)               │
   │                                     │
   │  Email:        [mary@clinic.local_] │
   │  Display Name: [Mary (MA)_________] │
   │  Role:         [STAFF ▼]            │
   │                                     │
   │  ┌─ Assign to Physicians ─────────┐ │
   │  │ ☑ Dr. Smith      (current)     │ │
   │  │ ☑ Dr. Jones      (current)     │ │
   │  │ ☑ Dr. Lee        (adding)      │ │
   │  │ ☐ Dr. Williams                 │ │
   │  └────────────────────────────────┘ │
   │                                     │
   │         [Cancel]  [Save Changes]    │
   └─────────────────────────────────────┘

3. Admin adds Dr. Lee, clicks [Save Changes]
4. API: PUT /api/admin/users/5
   {
     displayName: "Mary (MA)",
     role: "STAFF",
     assignedPhysicianIds: [1, 2, 3]  // Now includes Dr. Lee
   }

5. Mary can now also see/edit Dr. Lee's patients
```

---

**New user onboarding:**
1. Admin shares credentials with new user (email + temporary password)
2. New user logs in at `/login`
3. User changes password via profile settings

---

**Self-Service Password Change (All Users):**

Any logged-in user can change their own password via the UI:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Header:                                    [Dr. Smith ▼] [Logout]      │
│                                              └─────────────────────┐    │
│                                              │ My Profile          │    │
│                                              │ Change Password     │    │
│                                              │ ────────────────    │    │
│                                              │ Logout              │    │
│                                              └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

Change Password Modal:
┌─────────────────────────────────────┐
│  Change Password                    │
│                                     │
│  Current Password: [______________] │
│  New Password:     [______________] │
│  Confirm Password: [______________] │
│                                     │
│         [Cancel]  [Save]            │
└─────────────────────────────────────┘
```

**API endpoint:**
```
PUT /api/auth/password
{
  currentPassword: "OldPass123",
  newPassword: "NewSecurePass456"
}

Validation:
- Current password must match
- New password minimum 8 characters
- New password != current password
```

**Available to:** PHYSICIAN, STAFF, ADMIN (all roles)

---

**Password Reset (CLI Command):**

If admin/user loses password, system admin runs CLI command on server:

```bash
# Reset password for any user by email
npm run reset-password -- --email admin@clinic.local --password NewSecurePass123

# Or interactive mode (prompts for new password)
npm run reset-password -- --email admin@clinic.local
```

**Implementation** (`backend/src/scripts/resetPassword.ts`):
```typescript
import { prisma } from '../config/database.js';
import bcrypt from 'bcryptjs';

const email = process.argv.find(a => a.startsWith('--email='))?.split('=')[1];
const password = process.argv.find(a => a.startsWith('--password='))?.split('=')[1];

const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  console.error(`User not found: ${email}`);
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);
await prisma.user.update({
  where: { email },
  data: { passwordHash }
});

console.log(`Password reset for ${user.displayName} (${email})`);
```

**package.json script:**
```json
{
  "scripts": {
    "reset-password": "tsx src/scripts/resetPassword.ts"
  }
}
```

**Security notes:**
- Requires server access (only system admin can do this)
- No email service required
- Works on any deployment (Render, bare metal, Docker)
- Log the reset in audit log (action: 'PASSWORD_RESET_CLI')

---

### Phase 11f: Testing (Days 9-10)

**Backend tests:**
- `authService.test.ts` - Password hashing, JWT
- `auth.routes.test.ts` - Login/logout/me endpoints
- `admin.routes.test.ts` - User management

**Frontend tests:**
- `authStore.test.ts` - Login/logout actions
- `LoginModal.test.tsx` - Form validation
- `AdminPage.test.tsx` - User management UI

**E2E tests:**
- `auth.spec.ts` (Playwright) - Login/logout flow
- `auth-flow.cy.ts` (Cypress) - Login + grid editing

---

## Key Files to Modify

| File | Changes |
|------|---------|
| `backend/prisma/schema.prisma` | Add User model, Patient.ownerId |
| `backend/src/routes/data.routes.ts` | Add auth middleware, owner filtering |
| `backend/src/routes/import.routes.ts` | Add auth, assign owner on import |
| `frontend/src/App.tsx` | Add auth provider, login route |
| `frontend/src/components/layout/Header.tsx` | User info, logout button |

---

## Verification Checklist

**Auth Flow:**
- [ ] Login with valid credentials returns JWT
- [ ] Login with invalid credentials returns 401
- [ ] Logout clears token and edit lock
- [ ] Token persists across page refresh

**Protected Routes:**
- [ ] GET /api/data without token returns 401
- [ ] GET /api/data with invalid token returns 401
- [ ] GET /api/data with valid token returns data

**Role-Based Access:**
- [ ] PHYSICIAN sees only own patients
- [ ] STAFF sees selected physician's patients
- [ ] STAFF can switch between assigned physicians
- [ ] ADMIN cannot access /api/data (returns 403)
- [ ] ADMIN can access /api/admin routes

**User Management:**
- [ ] Admin can create PHYSICIAN
- [ ] Admin can create STAFF with assignments
- [ ] Admin can create ADMIN
- [ ] Admin can edit user details
- [ ] Admin can deactivate user (soft delete)
- [ ] Deactivated PHYSICIAN's patients become unassigned

**Unassigned Patients:**
- [ ] STAFF sees unassigned patients in dropdown
- [ ] STAFF can bulk assign patients to physicians
- [ ] Assigned patients appear in physician's grid

**Password Management:**
- [ ] User can change own password via UI
- [ ] CLI reset-password script works

**Audit Log:**
- [ ] CREATE actions logged with user info
- [ ] UPDATE actions logged with field changes
- [ ] DELETE actions logged
- [ ] Admin can view audit log
- [ ] Cleanup job removes logs > 6 months

**Tests:**
- [ ] Backend Jest tests pass (auth, admin routes)
- [ ] Frontend Vitest tests pass (authStore, components)
- [ ] Playwright E2E tests pass (auth flow)
- [ ] Cypress E2E tests pass (admin, data isolation)

---

## Environment Variables

```env
JWT_SECRET=<strong-random-secret>  # Already exists
JWT_EXPIRES_IN=8h                  # Already exists
BCRYPT_SALT_ROUNDS=12              # New
```

---

---

## Audit Log (Change Tracking)

**Requirements:**
- Track who updated which patient and what changed
- Field-level detail (old value → new value)
- Retain logs for 6 months, then auto-purge

**Enhanced AuditLog Schema:**

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  user        User     @relation(fields: [userId], references: [id])
  action      String   // CREATE, UPDATE, DELETE
  entity      String   // "Patient", "PatientMeasure"
  entityId    Int      @map("entity_id")
  changes     Json?    // Field-level changes (see below)
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([createdAt])
  @@index([userId])
  @@index([entity, entityId])
  @@map("audit_log")
}
```

**Changes JSON format (field-level):**

```json
{
  "fields": [
    { "field": "measureStatus", "old": "Compliant", "new": "Non Compliant" },
    { "field": "phone", "old": "555-1234", "new": "555-5678" },
    { "field": "notes", "old": null, "new": "Called patient" }
  ]
}
```

**Example log entries:**

| Time | User | Action | Entity | Changes |
|------|------|--------|--------|---------|
| 2026-02-01 10:30 | Dr. Smith | UPDATE | PatientMeasure #45 | measureStatus: Compliant → Non Compliant |
| 2026-02-01 10:25 | Mary (MA) | CREATE | Patient #123 | (new patient: John Doe) |
| 2026-02-01 09:15 | Dr. Jones | DELETE | PatientMeasure #44 | (deleted row) |

**Implementation in routes:**

```typescript
// data.routes.ts - UPDATE endpoint
router.put('/:id', requireAuth, async (req, res) => {
  const oldRecord = await prisma.patientMeasure.findUnique({ where: { id } });
  const newRecord = await prisma.patientMeasure.update({ ... });

  // Calculate changes
  const changes = calculateFieldChanges(oldRecord, newRecord);

  // Log the change
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'UPDATE',
      entity: 'PatientMeasure',
      entityId: id,
      changes: { fields: changes },
      ipAddress: req.ip
    }
  });
});
```

**Automatic cleanup (6 month retention):**

```typescript
// backend/src/jobs/auditLogCleanup.ts
export async function cleanupOldAuditLogs() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const deleted = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: sixMonthsAgo } }
  });

  console.log(`Deleted ${deleted.count} audit logs older than 6 months`);
}

// Run daily via cron (node-cron or external scheduler)
// "0 2 * * *" = every day at 2 AM
```

**Deployment options for cleanup job:**

| Environment | Method |
|-------------|--------|
| Render | Cron Job service (separate from web service) |
| Bare metal/VM | System cron: `0 2 * * * cd /app && npm run cleanup-logs` |
| Docker | Separate container with cron, or use node-cron in main app |

**Admin Panel - Audit Log Viewer:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Audit Log                                    [Filter ▼] [Export CSV]   │
├─────────────────────────────────────────────────────────────────────────┤
│  Time              │ User       │ Action │ Patient      │ Changes       │
│  2026-02-01 10:30  │ Dr. Smith  │ UPDATE │ John Doe     │ [View Details]│
│  2026-02-01 10:25  │ Mary (MA)  │ CREATE │ Jane Smith   │ [View Details]│
│  2026-02-01 09:15  │ Dr. Jones  │ DELETE │ Bob Wilson   │ [View Details]│
│                                                                         │
│  Filters: Date range, User, Action type, Patient name                   │
└─────────────────────────────────────────────────────────────────────────┘

[View Details] expands to show:
┌─────────────────────────────────────────┐
│  Changes made:                          │
│  • measureStatus: Compliant → Non Compliant
│  • notes: (empty) → "Called patient"    │
│  • statusDate: 2026-01-15 → 2026-02-01  │
└─────────────────────────────────────────┘
```

**New files for audit log:**

| File | Purpose |
|------|---------|
| `backend/src/services/auditService.ts` | Log changes, calculate field diffs |
| `backend/src/jobs/auditLogCleanup.ts` | Cleanup job for 6-month retention |
| `backend/src/routes/admin.routes.ts` | Add GET /api/admin/audit-log endpoint |
| `frontend/src/components/admin/AuditLogViewer.tsx` | Admin UI for viewing logs |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Existing patients unassigned | STAFF uses bulk assign page to assign to physicians |
| Token expires during edit | Auto-save draft, prompt re-login |
| Edit lock not released | Auto-release on logout + timeout fallback |
| No initial users | Seed script creates default admin user |
| STAFF forgets to select physician | Dropdown required, defaults to first assigned physician |
| Admin loses password | CLI reset script: `npm run reset-password` |

