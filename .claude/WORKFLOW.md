# Claude Code Development Workflow - Patient Tracking App

This document describes the standard workflow for implementing features and fixes for healthcare applications with sensitive patient data.

---

## Quick Reference

```
Plan → Implement → Test → Security Review → Document → Code Review → Commit → Release
```

---

## 1. Understand Requirements

**Goal:** Fully understand what needs to be built before writing code.

- [ ] Read the task/feature request carefully
- [ ] Check `.claude/TODO.md` for context and priorities
- [ ] Review `.claude/IMPLEMENTATION_STATUS.md` for current state
- [ ] Ask clarifying questions using `AskUserQuestion` if needed
- [ ] Identify dependencies and related features
- [ ] **Identify if patient data (PHI) is involved**

**Key Questions:**
- What problem does this solve?
- What are the acceptance criteria?
- Are there existing patterns to follow?
- **Does this feature touch patient data?**
- **What audit logging is required?**

---

## 2. Security & Compliance

**Goal:** Ensure all development meets healthcare data protection requirements.

### 2.1 HIPAA Compliance Checklist

Before implementing any feature involving patient data:

- [ ] **Minimum Necessary**: Only access/display data required for the feature
- [ ] **Access Controls**: Verify role-based permissions are enforced
- [ ] **Audit Trail**: All PHI access must be logged
- [ ] **Encryption**: Data encrypted at rest and in transit
- [ ] **Authentication**: Verify user identity before PHI access

### 2.2 Protected Health Information (PHI) Categories

Always treat these as sensitive:
- Patient names, addresses, phone numbers, email
- Dates (birth, admission, discharge, appointment)
- Medical record numbers, account numbers
- Health conditions, diagnoses, treatments
- Insurance information
- Any unique identifying numbers

### 2.3 Data Handling Rules

```typescript
// CORRECT: Log access without exposing PHI
logger.info('Patient record accessed', {
  patientId: hashedId,
  userId: currentUser.id,
  action: 'VIEW',
  timestamp: new Date().toISOString()
});

// WRONG: Never log actual PHI
logger.info(`Viewed patient ${patient.name} with SSN ${patient.ssn}`);
```

### 2.4 Encryption Requirements

| Data State | Requirement | Implementation |
|------------|-------------|----------------|
| At Rest | AES-256 | Database encryption, encrypted backups |
| In Transit | TLS 1.2+ | HTTPS only, secure WebSocket |
| In Memory | Minimize exposure | Clear sensitive data after use |

### 2.5 Security Review Checkpoint

Before any commit involving PHI:
- [ ] No PHI in logs, error messages, or stack traces
- [ ] No PHI in URLs or query parameters
- [ ] Session timeout implemented (15 min recommended)
- [ ] Failed login attempts are rate-limited
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

---

## 3. Environment Separation

**Goal:** Protect production patient data by maintaining strict environment boundaries.

### 3.1 Environment Configuration

| Environment | Purpose | Data Type | Access |
|-------------|---------|-----------|--------|
| Development | Local coding | Synthetic only | All developers |
| Staging | Integration testing | Anonymized | Dev team + QA |
| Production | Live system | Real PHI | Restricted |

### 3.2 Critical Rules

```bash
# NEVER: Copy production data to lower environments
pg_dump production_db | psql dev_db  # PROHIBITED

# CORRECT: Use synthetic data generator
npm run seed:synthetic -- --patients=1000
```

### 3.3 Environment-Specific Configuration

```typescript
// config/environment.ts
export const config = {
  development: {
    database: process.env.DEV_DATABASE_URL,
    logLevel: 'debug',
    auditLog: false,  // No PHI in dev
    sessionTimeout: 3600,  // 1 hour for dev convenience
  },
  staging: {
    database: process.env.STAGING_DATABASE_URL,
    logLevel: 'info',
    auditLog: true,
    sessionTimeout: 1800,  // 30 min
  },
  production: {
    database: process.env.PROD_DATABASE_URL,
    logLevel: 'warn',
    auditLog: true,
    sessionTimeout: 900,  // 15 min - HIPAA recommended
  }
};
```

### 3.4 Synthetic Data Strategy

Use realistic but fake data for development:

```typescript
// prisma/seed-synthetic.ts
import { faker } from '@faker-js/faker';

function generateSyntheticPatient() {
  return {
    id: faker.string.uuid(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 90 }),
    mrn: `MRN-${faker.string.alphanumeric(8).toUpperCase()}`,
    // Use obviously fake SSN format
    ssn: `000-00-${faker.string.numeric(4)}`,
  };
}
```

---

## 4. Plan (for non-trivial features)

**Goal:** Design the implementation approach before coding.

**When to Plan:**
- New features with multiple components
- Changes affecting multiple files
- Architectural decisions needed
- **Any feature involving patient data flows**
- Unclear requirements

**Steps:**
1. Enter plan mode with `EnterPlanMode`
2. Explore codebase using `Glob`, `Grep`, `Read`
3. Identify files to create/modify
4. Write implementation plan with:
   - Files to create/modify
   - Data structures/interfaces
   - Implementation steps
   - Test cases
   - **Security considerations**
   - **Audit logging points**
5. Get user approval via `ExitPlanMode`

**Skip Planning For:**
- Single-file bug fixes
- Simple UI tweaks
- Documentation updates
- Typo corrections

---

## 5. Implement

**Goal:** Write clean, tested, secure code following project patterns.

### 5.1 Track Progress
```
Use TodoWrite to create task list:
- Break feature into small, actionable items
- Mark items in_progress when starting
- Mark items completed immediately when done
```

### 5.2 Follow Patterns
- Check `.claude/patterns.md` for code conventions
- Match existing code style in the file/directory
- Use existing utilities and helpers

### 5.3 Code Quality
- Keep changes focused (avoid scope creep)
- Don't over-engineer (YAGNI principle)
- Handle errors appropriately **without exposing PHI**
- Avoid security vulnerabilities (OWASP top 10)

### 5.4 Backend Patterns (Node/Express/Prisma)

```typescript
// Routes: backend/src/routes/*.routes.ts
// Services: backend/src/services/*.ts
// Tests: backend/src/services/__tests__/*.test.ts
// Middleware: backend/src/middleware/*.ts
// Audit: backend/src/audit/*.ts
```

**Patient Data Access Pattern:**
```typescript
// services/patient.service.ts
export async function getPatient(
  patientId: string,
  requestingUser: User,
  reason: AccessReason
): Promise<Patient> {
  // 1. Verify authorization
  await verifyAccess(requestingUser, patientId, 'READ');

  // 2. Fetch data
  const patient = await prisma.patient.findUnique({
    where: { id: patientId }
  });

  // 3. Audit log (ALWAYS)
  await auditLog.record({
    action: 'PATIENT_VIEW',
    userId: requestingUser.id,
    patientId: patientId,
    reason: reason,
    timestamp: new Date(),
    ipAddress: requestingUser.ipAddress
  });

  return patient;
}
```

### 5.5 Frontend Patterns (React/TypeScript)

```typescript
// Pages: frontend/src/pages/*.tsx
// Components: frontend/src/components/*.tsx
// API: frontend/src/api/*.ts
// Tests: frontend/src/**/*.test.tsx
// Hooks: frontend/src/hooks/*.ts
```

**Sensitive Data Display Pattern:**
```tsx
// components/PatientInfo.tsx
export function PatientInfo({ patient }: Props) {
  const { hasPermission } = useAuth();

  return (
    <div>
      <span>{patient.lastName}, {patient.firstName}</span>
      {/* Only show SSN to authorized users */}
      {hasPermission('VIEW_SSN') && (
        <SensitiveField
          value={patient.ssn}
          maskable={true}
          auditOnReveal={true}
        />
      )}
    </div>
  );
}
```

### 5.6 Audit Logging Implementation

**What to Log:**
| Event | Required Fields |
|-------|-----------------|
| Login/Logout | userId, timestamp, IP, success/failure |
| PHI View | userId, patientId, dataType, timestamp |
| PHI Modify | userId, patientId, fieldChanged, oldValue (hashed), newValue (hashed) |
| PHI Export | userId, patientIds[], format, timestamp |
| Permission Change | adminId, targetUserId, permissionChanged |

**Audit Log Schema:**
```prisma
model AuditLog {
  id          String   @id @default(uuid())
  timestamp   DateTime @default(now())
  userId      String
  action      String
  resourceType String
  resourceId  String?
  details     Json?
  ipAddress   String
  userAgent   String?

  @@index([userId, timestamp])
  @@index([resourceType, resourceId])
  @@index([action, timestamp])
}
```

---

## 6. Database Management

**Goal:** Safely manage database changes with proper migration and backup strategies.

### 6.1 Migration Best Practices

```bash
# Create migration with descriptive name
cd backend && npx prisma migrate dev --name add_patient_allergies

# Review migration SQL before applying
cat prisma/migrations/[timestamp]_add_patient_allergies/migration.sql

# Apply to staging first, verify, then production
npx prisma migrate deploy
```

### 6.2 Migration Checklist

Before applying any migration:
- [ ] Migration reviewed by another developer
- [ ] Rollback script prepared and tested
- [ ] Backup verified and restorable
- [ ] Estimated downtime communicated (if any)
- [ ] Off-peak deployment scheduled for production

### 6.3 Rollback Procedures

```bash
# 1. Identify the migration to rollback
npx prisma migrate status

# 2. Create rollback migration
npx prisma migrate dev --name rollback_patient_allergies

# 3. Or restore from backup (nuclear option)
./scripts/restore-backup.sh backup_20260129_pre_migration.sql
```

### 6.4 Backup Strategy

| Type | Frequency | Retention | Verification |
|------|-----------|-----------|--------------|
| Full backup | Daily | 30 days | Weekly restore test |
| Transaction log | Every 15 min | 7 days | Daily spot check |
| Pre-migration | Before each migration | 90 days | Immediate test |

```bash
# Verify backup before schema changes
./scripts/verify-backup.sh
if [ $? -eq 0 ]; then
  npx prisma migrate deploy
else
  echo "Backup verification failed - aborting migration"
  exit 1
fi
```

### 6.5 Query Optimization

```typescript
// WRONG: N+1 query problem
const patients = await prisma.patient.findMany();
for (const patient of patients) {
  const appointments = await prisma.appointment.findMany({
    where: { patientId: patient.id }
  });
}

// CORRECT: Eager loading
const patients = await prisma.patient.findMany({
  include: { appointments: true }
});

// CORRECT: Pagination for large datasets
const patients = await prisma.patient.findMany({
  skip: page * pageSize,
  take: pageSize,
  orderBy: { lastName: 'asc' }
});
```

---

## 7. Test

**Goal:** Ensure code works correctly, securely, and doesn't break existing functionality.

### 7.1 Unit Tests

**Backend (Jest):**
```bash
cd backend && npm test -- <filename>
cd backend && npm test -- --coverage  # Full coverage report
```

**Frontend (Vitest):**
```bash
cd frontend && npm test
cd frontend && npm run test:coverage
```

### 7.2 Integration Tests

**API + Database Integration:**
```typescript
// backend/src/services/__tests__/patient.integration.test.ts
describe('PatientService Integration', () => {
  beforeEach(async () => {
    await prisma.patient.deleteMany();
    await seedTestPatients();
  });

  it('should create patient with audit log', async () => {
    const patient = await patientService.create(testPatient, adminUser);

    // Verify patient created
    expect(patient.id).toBeDefined();

    // Verify audit log entry
    const auditEntry = await prisma.auditLog.findFirst({
      where: {
        action: 'PATIENT_CREATE',
        resourceId: patient.id
      }
    });
    expect(auditEntry).toBeDefined();
    expect(auditEntry.userId).toBe(adminUser.id);
  });
});
```

### 7.3 Security Tests

```typescript
// backend/src/__tests__/security.test.ts
describe('Security', () => {
  it('should reject unauthorized PHI access', async () => {
    const response = await request(app)
      .get('/api/patients/123')
      .set('Authorization', `Bearer ${unauthorizedUserToken}`);

    expect(response.status).toBe(403);
  });

  it('should not expose PHI in error messages', async () => {
    const response = await request(app)
      .get('/api/patients/invalid-id')
      .set('Authorization', `Bearer ${validToken}`);

    expect(response.body.message).not.toMatch(/SSN|social security/i);
    expect(response.body.message).not.toMatch(/\d{3}-\d{2}-\d{4}/);
  });

  it('should rate limit login attempts', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app).post('/api/auth/login').send(invalidCredentials);
    }

    const response = await request(app)
      .post('/api/auth/login')
      .send(validCredentials);

    expect(response.status).toBe(429);
  });
});
```

### 7.4 E2E Tests

**Playwright (general E2E):**
```bash
cd frontend && npm run test:e2e
cd frontend && npm run test:e2e:ui  # Interactive mode
```

**Cypress (AG Grid interactions):**
```bash
cd frontend && npm run cypress:open  # Interactive
cd frontend && npm run cypress:run   # Headless
```

### 7.5 Load Testing

```bash
# Install k6
brew install k6

# Run load test for expected patient volume
k6 run --vus 50 --duration 5m tests/load/patient-search.js
```

```javascript
// tests/load/patient-search.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    http_req_failed: ['rate<0.01'],     // <1% errors
  },
};

export default function() {
  const res = http.get(`${BASE_URL}/api/patients?search=Smith`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

### 7.6 Test File Locations

| Type | Location | Framework |
|------|----------|-----------|
| Backend unit | `backend/src/**/__tests__/*.test.ts` | Jest |
| Backend integration | `backend/src/**/__tests__/*.integration.test.ts` | Jest |
| Frontend unit | `frontend/src/**/*.test.tsx` | Vitest |
| E2E general | `frontend/e2e/*.spec.ts` | Playwright |
| E2E AG Grid | `frontend/cypress/e2e/*.cy.ts` | Cypress |
| Security | `backend/src/__tests__/security.test.ts` | Jest |
| Load | `tests/load/*.js` | k6 |

### 7.7 Test Coverage Requirements

- New features: Write tests for all new functionality
- Bug fixes: Add regression test for the bug
- Security features: 100% coverage required
- Aim for >80% coverage on new code

---

## 8. Code Review

**Goal:** Ensure code quality and security through peer review.

### 8.1 Pull Request Requirements

Every PR must have:
- [ ] Descriptive title and summary
- [ ] Link to related issue/task
- [ ] At least one reviewer assigned
- [ ] All CI checks passing
- [ ] No unresolved conversations

### 8.2 Review Checklist for Reviewer

**General:**
- [ ] Code is readable and well-organized
- [ ] No unnecessary complexity
- [ ] Error handling is appropriate
- [ ] Tests cover the changes

**Security (for PHI-related changes):**
- [ ] No PHI in logs or error messages
- [ ] Access controls verified
- [ ] Audit logging implemented
- [ ] Input validation present
- [ ] SQL injection prevented
- [ ] XSS prevention verified

### 8.3 PR Template

```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Security fix
- [ ] Database migration

## PHI Impact
- [ ] This PR accesses/modifies patient data
- [ ] Audit logging implemented
- [ ] Security review completed

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested in dev environment

## Checklist
- [ ] Code follows project patterns
- [ ] Documentation updated
- [ ] No PHI in logs/errors
- [ ] Migration rollback tested (if applicable)
```

---

## 9. Document

**Goal:** Keep project documentation up-to-date.

### Before EVERY Commit, Update:

#### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features/components implemented
- Update status (In Progress -> Complete)
- Update file structure if files added
- Update "Last Updated" date

#### `.claude/CHANGELOG.md`
- Add entry at top with today's date
- Describe what changed (Added/Changed/Fixed/Removed)
- **Note any security-related changes**
- Keep entries concise but informative

#### `.claude/REGRESSION_TEST_PLAN.md`
- Add test cases for new functionality
- Update existing test cases if behavior changed
- Include steps to reproduce and expected results

#### `.claude/TODO.md`
- Mark completed tasks as done `[x]`
- Add any new tasks discovered
- Update priorities if needed

---

## 10. Commit

**Goal:** Create clean, atomic commits with good messages.

### Commit Message Format
```
<type>: <short description>

<detailed description if needed>

Security: <note if security-related>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types
- `Add` - New feature
- `Fix` - Bug fix
- `Security` - Security improvement
- `Update` - Enhancement to existing feature
- `Refactor` - Code restructure (no behavior change)
- `Remove` - Removing code/feature
- `Docs` - Documentation only

### Git Commands
```bash
git status                    # Check what changed
git diff                      # Review changes
git add -A                    # Stage all changes
git commit -m "message"       # Commit
git log -1                    # Verify commit
```

---

## 11. Monitoring & Observability

**Goal:** Maintain visibility into system health without exposing PHI.

### 11.1 Logging Strategy

```typescript
// Safe logging - no PHI
logger.info('Patient search completed', {
  userId: user.id,
  resultCount: results.length,
  searchDuration: duration,
  // NO: patientNames, SSNs, diagnoses
});

// Error logging - sanitized
logger.error('Failed to update patient', {
  userId: user.id,
  patientId: hashPatientId(patient.id),  // Hashed for debugging
  errorCode: error.code,
  // NO: actual patient data, full error with PHI
});
```

### 11.2 Health Checks

```typescript
// routes/health.routes.ts
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    disk: await checkDiskSpace(),
  };

  const healthy = Object.values(checks).every(c => c.status === 'ok');
  res.status(healthy ? 200 : 503).json(checks);
});
```

### 11.3 Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API response time (p95) | > 500ms | > 2000ms |
| Error rate | > 1% | > 5% |
| Failed logins (per IP) | > 5/min | > 20/min |
| Database connections | > 80% | > 95% |
| Disk space | < 20% | < 10% |

### 11.4 Dashboard Metrics

Track without exposing PHI:
- Request count by endpoint
- Response times (p50, p95, p99)
- Error rates by type
- Active sessions
- Database query times
- Audit log volume

---

## 12. Release (When Requested)

**Goal:** Deploy changes to production safely.

### Pre-Release Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Security review completed (if PHI changes)
- [ ] Database migration tested and rollback ready
- [ ] Backup verified
- [ ] Deployment scheduled for off-peak hours

### Steps
```bash
# 1. Push to develop
git push origin develop

# 2. Merge to main
git checkout main
git merge develop
git push origin main

# 3. Monitor deployment
# Check Render dashboard or use API
```

### Post-Deployment Verification

- [ ] Health check endpoints responding
- [ ] Key user flows working
- [ ] No spike in error rates
- [ ] Audit logging active
- [ ] Database migrations applied

### Rollback Procedure

```bash
# If issues detected:
# 1. Revert to previous version
git revert HEAD
git push origin main

# 2. If database migration involved:
./scripts/rollback-migration.sh

# 3. Notify team
./scripts/notify-rollback.sh "Reason for rollback"
```

---

## Workflow Checklist

Use this for every feature:

```
[ ] 1. Understand: Read requirements, check TODO.md, identify PHI impact
[ ] 2. Security: Review compliance requirements if PHI involved
[ ] 3. Plan: Enter plan mode for complex features
[ ] 4. Implement: Create TodoWrite list, write secure code
[ ] 5. Test: Run unit, integration, security tests
[ ] 6. Code Review: Submit PR, address feedback
[ ] 7. Document: Update STATUS, CHANGELOG, TEST_PLAN, TODO
[ ] 8. Commit: Stage, commit with good message
[ ] 9. Release: Push, merge, monitor (when requested)
```

---

## Common Commands

```bash
# Development
cd backend && npm run dev      # Start backend
cd frontend && npm run dev     # Start frontend
docker-compose up              # Start with Docker

# Testing
cd backend && npm test                    # Backend unit tests
cd backend && npm run test:integration    # Integration tests
cd backend && npm run test:security       # Security tests
cd frontend && npm test                   # Frontend tests
cd frontend && npm run test:e2e           # E2E tests
k6 run tests/load/patient-search.js      # Load tests

# Database
cd backend && npx prisma studio           # Visual DB editor
cd backend && npx prisma migrate dev      # Create migration
cd backend && npx prisma migrate deploy   # Apply migration
cd backend && npm run seed:synthetic      # Seed with synthetic data

# Security
npm run audit                  # Check dependencies
npm run lint:security          # Security linting

# Git
git status && git diff         # Review changes
git add -A && git commit       # Commit all
git push origin develop        # Push to develop
```

---

## Quick Reference Cards

### PHI Handling Quick Reference

| Do | Don't |
|----|-------|
| Hash IDs in logs | Log patient names |
| Use parameterized queries | Concatenate SQL strings |
| Encrypt data at rest | Store PHI in plaintext |
| Implement session timeouts | Keep sessions indefinitely |
| Audit all PHI access | Skip logging for "simple" reads |
| Use synthetic test data | Copy production data to dev |

### Security Review Quick Reference

```
Before committing PHI-related code, verify:
- No PHI in logs
- No PHI in error messages
- No PHI in URLs
- Access control enforced
- Audit logging present
- Input validated
- Output encoded
```

---

## Last Updated

January 29, 2026
