# Claude Project Context

## IMPORTANT: Git Branching Rules

**All new implementation work MUST happen on `develop` or feature branches, NEVER on `main`.**

- **develop**: Primary development branch for ongoing work
- **feature/xxx**: Feature branches for specific features (branch from develop)
- **main**: Production-ready code only - updated via `/release` command

Before starting any implementation:
1. Verify you're on `develop` or a feature branch: `git branch --show-current`
2. If on `main`, switch to develop first: `git checkout develop`
3. Never commit directly to `main`

---

## IMPORTANT: Implementation Request Workflow (Spec-Driven + TDD)

**When the user asks to implement a requirement, use the FULL spec-driven workflow with TDD:**

### Option A: Use Per-Phase Workflow (Recommended for New Features)

```bash
# 1. Set up project steering documents (first time only)
/spec-steering-setup

# 2. Create specification (per-phase — recommended)
/jh-1-requirements feature-name "description"   # → requirements.md
/jh-2-design feature-name                       # → design.md
/jh-3-tasks feature-name                        # → tasks.md

# Or use /spec-create feature-name "description" to run all 3 phases sequentially

# 3. Implement with TDD
/spec-execute 1 feature-name

# 4. Quality gates (post-implementation)
/jh-4-test-audit feature-name     # Run 4-layer test suite + coverage audit
/jh-5-security-audit               # OWASP + dependency audit
/jh-6-code-review                  # 4-dimension code review
/jh-7-deploy-validate              # GO/NO-GO readiness check
/jh-8-code-quality-scan            # Code quality scan (duplicates, maintainability, DB, etc.)

# 5. Release
/commit
/release
```

### Option B: Manual Workflow (For Quick Fixes)

### Step 1: Clarify & Rephrase
Before any implementation, rephrase the requirement in an organized format:
- **Summary**: One-sentence description of what needs to be done
- **Current Behavior**: How the system works now (if applicable)
- **New Behavior**: How it should work after implementation
- **Affected Components**: List files/modules that will change
- **Edge Cases**: Any special scenarios to handle

### Step 2: Show Implementation Plan
Present a clear plan with:
- Database/schema changes (if any)
- Backend changes (services, routes, models)
- Frontend changes (components, pages, state)
- Documentation updates needed
- Migration or manual steps required

### Step 3: Get Approval
Wait for user confirmation before writing any code. Ask:
- "Does this plan look correct?"
- Clarify any ambiguities before proceeding

### Step 4: Implement with TDD
Use the TDD workflow for each acceptance criterion:

```
┌─────────────────────────────────────────────────────────┐
│  RED: Write failing test first                          │
│  - Use tdd-test-writer agent                            │
│  - Test MUST fail before proceeding                     │
├─────────────────────────────────────────────────────────┤
│  GREEN: Write minimal code to pass                      │
│  - Use tdd-implementer agent                            │
│  - Test MUST pass before proceeding                     │
├─────────────────────────────────────────────────────────┤
│  REFACTOR: Improve while keeping green                  │
│  - Use tdd-refactorer agent                             │
│  - All tests MUST stay green                            │
└─────────────────────────────────────────────────────────┘
```

> ⚠️ **CRITICAL: Implementation is NOT complete until tests are written and passing.**
> Do NOT commit code without corresponding tests. Proceed directly to Step 5.

### Step 5: Add Tests (MANDATORY - Implementation Incomplete Without This)
After implementing, you MUST add comprehensive automated tests covering ALL use cases. **A feature without tests is an incomplete feature.**

#### 5a. Document Test Cases
Add test cases to `.claude/REGRESSION_TEST_PLAN.md` FIRST:
- List all scenarios the feature should handle
- Include happy path, edge cases, and error cases
- Assign test case IDs (e.g., TC-XX.1, TC-XX.2)

#### 5b. Create Test Files for ALL Applicable Frameworks

**You MUST create tests in EVERY applicable framework:**

| Layer | Framework | File Pattern | When to Use |
|-------|-----------|--------------|-------------|
| Backend Logic | **Jest** | `backend/src/services/**/__tests__/*.test.ts` | ANY backend service, utility, or business logic |
| Backend API | **Jest** | `backend/src/routes/__tests__/*.test.ts` | ANY new or modified API endpoint |
| React Components | **Vitest** | `frontend/src/components/**/*.test.tsx` | ANY new or modified component |
| UI Pages | **Vitest** | `frontend/src/pages/*.test.tsx` | ANY new or modified page |
| UI Flows | **Playwright** | `frontend/e2e/*.spec.ts` | User journeys, navigation, modals, buttons |
| AG Grid Editing | **Cypress** | `frontend/cypress/e2e/*.cy.ts` | Dropdowns, cell editing, row selection, colors |
| Visual Review | **MCP Playwright** | ui-ux-reviewer agent | **MANDATORY for ANY UI change** — real browser clicks, screenshots, visual verification |

#### 5c. Test Coverage Requirements

**Minimum Coverage Targets:**
| Layer | Target | Notes |
|-------|--------|-------|
| Backend Services | **80%+ line coverage** | Business logic must be well-tested |
| API Routes | **All endpoints tested** | Happy path + at least 2 error cases per endpoint |
| Frontend Components | **Render + interactions** | Each component renders and handles user input |
| E2E Flows | **Critical user journeys** | Login, main workflows, error states |

**Each feature MUST have tests covering:**

1. **Happy Path** - Normal expected usage
2. **Edge Cases** - Boundary conditions, empty states, max values
3. **Error Cases** - Invalid input, missing data, API failures
4. **UI Interactions** - Clicks, typing, selections work correctly
5. **Visual State** - Correct colors, visibility, disabled states

#### 5d. Pre-Commit Test Checklist

**Before committing ANY implementation, verify ALL applicable boxes:**

```
[ ] Backend unit tests written and passing (Jest)
[ ] API endpoint tests written and passing (Jest + supertest)
[ ] Frontend component tests written and passing (Vitest)
[ ] E2E tests written for user flows (Playwright or Cypress)
[ ] Visual browser review completed (ui-ux-reviewer agent — MANDATORY for UI changes)
[ ] All existing tests still pass
[ ] Test count included in commit message (e.g., "Adds 25 tests")
```

**If ANY test is missing, the implementation is INCOMPLETE. Do NOT commit.**

#### 5f. Test File Templates

**Backend Service (Jest):**
```typescript
// backend/src/services/__tests__/myService.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { myFunction } from '../myService.js';

describe('myService', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => { /* ... */ });
    it('should handle empty input', () => { /* ... */ });
    it('should throw on invalid input', () => { /* ... */ });
  });
});
```

**React Component (Vitest):**
```typescript
// frontend/src/components/MyComponent.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => { /* ... */ });
  it('handles click events', () => { /* ... */ });
  it('shows error state', () => { /* ... */ });
  it('disables when loading', () => { /* ... */ });
});
```

**UI Flow (Playwright):**
```typescript
// frontend/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { MainPage } from './pages/main-page';

test.describe('My Feature', () => {
  let mainPage: MainPage;

  test.beforeEach(async ({ page }) => {
    mainPage = new MainPage(page);
    await mainPage.goto();
    await mainPage.waitForGridLoad();
  });

  test('should complete user flow', async () => { /* ... */ });
  test('should handle cancellation', async () => { /* ... */ });
  test('should show validation errors', async () => { /* ... */ });
});
```

**AG Grid (Cypress):**
```typescript
// frontend/cypress/e2e/my-grid-feature.cy.ts
describe('My Grid Feature', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.waitForAgGrid();
  });

  it('should select dropdown value', () => {
    cy.selectAgGridDropdown(0, 'columnId', 'Value');
    cy.getAgGridCell(0, 'columnId').should('contain.text', 'Value');
  });

  it('should update row color', () => {
    cy.get('[row-index="0"]').first().should('have.class', 'row-status-green');
  });
});
```

#### 5g. Run ALL Tests Before Commit

```bash
# Run ALL test suites - ALL must pass (5-layer pyramid)
cd backend && npm test                    # Layer 1: Jest (527 tests)
cd frontend && npm run test:run           # Layer 2: Vitest (296 tests)
cd frontend && npm run e2e               # Layer 3: Playwright E2E (35 tests)
cd frontend && npm run cypress:run       # Layer 4: Cypress E2E (283 tests)
# Layer 5: MCP Playwright visual review — MANDATORY for ANY UI change
# Run ui-ux-reviewer agent to open real browser, click through features, take screenshots
```

#### 5h. Update Test Documentation

After tests pass:
1. Update `.claude/REGRESSION_TEST_PLAN.md` - Mark test cases as "Automated"
2. Update `.claude/TESTING.md` - Add new test file to the inventory
3. Include test count in commit message

See `.claude/TESTING.md` for detailed patterns and troubleshooting.

---

## IMPORTANT: Pre-Commit Workflow

**Before ANY git commit, follow these steps IN ORDER:**

### Step 1: Update CHANGELOG First (Source of Truth)

**`.claude/CHANGELOG.md`** is the authoritative source for current UI/feature state.

Add entry for:
- What changed (features, fixes, refactors)
- Date of change
- Brief description of impact

### Step 2: Reconcile Other Documents Against CHANGELOG

**CRITICAL:** Before committing, read CHANGELOG and update all other documents to match it.

| Document | Reconcile Against CHANGELOG |
|----------|----------------------------|
| `IMPLEMENTATION_STATUS.md` | Feature descriptions, completion status, test counts |
| `TODO.md` | Mark completed tasks, remove obsolete items |
| `REGRESSION_TEST_PLAN.md` | Test cases match current features |
| Requirements docs | Specs match current implementation |
| Page guides (`.claude/agent-memory/ui-ux-reviewer/page-guides/`) | Use cases, interactions, and expected behaviors match current UI |

**If there are conflicts between documents:**
1. **CHANGELOG wins** - It reflects the actual implemented state
2. **Update other docs to match CHANGELOG** - Never the other way around

**Common conflicts to check:**
- Removed features still listed as active (e.g., username field)
- Changed UI fields or behavior
- Modified API endpoints or parameters
- Outdated test counts
- Page guide use cases no longer matching actual UI behavior (new columns, changed interactions, new roles)

### Step 3: Stage and Commit Together

```bash
git add .claude/CHANGELOG.md .claude/IMPLEMENTATION_STATUS.md .claude/TODO.md [code files]
git commit -m "description"
```

**Complete Workflow:**
```
1. Make code changes
2. Update CHANGELOG.md (describe what changed)
3. Read CHANGELOG, then update other docs to match
4. Stage code + ALL doc updates together
5. Commit
```

---

## IMPORTANT: Installation Documentation

**Three installation guides exist for different deployment targets:**

| Guide | Purpose |
|-------|---------|
| `docs/QUICK_INSTALL.md` | Fast Docker install (for network admins) |
| `docs/INSTALLATION_GUIDE.md` | Full self-hosted guide (Docker + manual options) |
| `docs/WINDOWS_SERVER_INSTALL.md` | Windows Server on-premise deployment (PowerShell scripts) |
| `docs/RENDER_INSTALL.md` | Render.com cloud deployment |

**When making ANY decision that affects installation or deployment, you MUST update ALL applicable guides:**

- New environment variables → Update all 3 guides
- New dependencies or version requirements → Update INSTALLATION_GUIDE.md
- Configuration file changes → Update QUICK_INSTALL.md and INSTALLATION_GUIDE.md
- Database schema changes requiring migration → Update all 3 guides
- New services or components → Update all 3 guides
- Changes to build or deployment process → Update applicable guides
- SMTP/email configuration → Update all 3 guides
- SSL/security requirements → Update INSTALLATION_GUIDE.md

**Examples of changes requiring doc updates:**
- Adding SMTP support for password reset → Update environment variables in all 3 guides
- Adding Redis for caching → Add to system requirements in INSTALLATION_GUIDE.md and RENDER_INSTALL.md
- Changing Node.js version → Update prerequisites in INSTALLATION_GUIDE.md
- Adding new API endpoints that need proxy config → Update Nginx section in INSTALLATION_GUIDE.md

---

## IMPORTANT: Release Workflow

**When the user runs `/release` or asks to release, follow these steps:**

### Step 1: Verify Clean State
```bash
git branch --show-current  # MUST be develop — STOP if on main
git status                 # Check for uncommitted changes
```

### Step 2: Run Tests (GATE)
```bash
cd backend && npm test              # Backend tests must pass
cd frontend && npm run test:run     # Frontend tests must pass
```
**If ANY test fails, STOP — do NOT proceed to commit or push.**

### Step 3: Build Verification (GATE)
```bash
cd frontend && npm run build        # Frontend must compile
cd backend && npx tsc --noEmit      # Backend must type-check
```
**If EITHER build fails, STOP — do NOT proceed.**

### Step 4: Update & Reconcile Documentation
- Update CHANGELOG.md (source of truth), IMPLEMENTATION_STATUS.md, TODO.md, REGRESSION_TEST_PLAN.md
- Cross-check for consistency between all docs

### Step 5: Commit & Push Develop
```bash
git add .claude/*.md [code files]
git commit -m "descriptive message"
git push origin develop
```

### Step 6: Merge to Main & Push
```bash
git checkout main
git pull origin main
git merge develop --no-edit       # Merge develop into main
git push origin main              # Push main to remote
git checkout develop              # Return to develop
```

### Step 7: Monitor Render Deployment
After pushing to main, Render auto-deploys. **You MUST monitor the deployment:**

#### 7a. Decrypt the Render API Key
```bash
RENDER_API_KEY=$(gpg --decrypt --batch --passphrase "patient-tracker-render" ~/.claude/render-api-key.gpg 2>/dev/null)
```

#### 7b. Check Deployment Status
Wait 30 seconds for deploy to start, then check both services:

```bash
# Check backend (patient-tracker-api)
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d64p1524d50c73ekm41g/deploys?limit=1"

# Check frontend (patient-tracker-frontend)
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d64p1gur433s73edldl0/deploys?limit=1"
```

**Service IDs:**
- Backend API: `srv-d64p1524d50c73ekm41g`
- Frontend: `srv-d64p1gur433s73edldl0`

#### 7c. Interpret Status
- `"status":"live"` = Deployment successful
- `"status":"build_in_progress"` or `"status":"update_in_progress"` = Still deploying, wait and check again
- `"status":"build_failed"` = Build failed, investigate

#### 7d. If Deployment Fails
1. **Try to build locally** to reproduce the error:
   ```bash
   cd frontend && npm run build  # or cd backend && npm run build
   ```
2. **Check service events** for error details:
   ```bash
   curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
     "https://api.render.com/v1/services/{SERVICE_ID}/events?limit=5"
   ```
3. **Fix the issue**, commit, and re-release

### Step 8: Post-Deploy Health Check
After both services show "live", verify they are actually responding:
```bash
curl -s -o /dev/null -w "%{http_code}" https://patient-tracker-api-cwrh.onrender.com/api/health
curl -s -o /dev/null -w "%{http_code}" https://patient-tracker-frontend.onrender.com/
```
Expected: HTTP 200 for both.

#### 8a. Confirm to User
Report:
- Test results (backend X passed, frontend X passed)
- Build verification (pass/fail)
- Deployment status for BOTH services (live/failed)
- Post-deploy health check (200/fail)
- Deploy ID and timestamp
- If failed, include error details and fix applied

---

Read the following files before starting work:

## Project Documentation
- `README.md` - Project overview (in root)
- `.claude/IMPLEMENTATION_STATUS.md` - Current implementation status
- `.claude/TODO.md` - Task list and priorities
- `.claude/CHANGELOG.md` - Version history and changes
- `.claude/REGRESSION_TEST_PLAN.md` - Testing requirements
- `.claude/TESTING.md` - **Testing guide: framework setup, patterns, and examples**

## Installation Guides
- `docs/QUICK_INSTALL.md` - **Fast Docker install for network admins**
- `docs/INSTALLATION_GUIDE.md` - **Full self-hosted guide (Docker + manual)**
- `docs/RENDER_INSTALL.md` - **Render.com cloud deployment**

## Claude-Specific Context
- `.claude/context.md` - Project structure and tech stack
- `.claude/patterns.md` - Code conventions and patterns
- `.claude/notes.md` - Session notes and current focus
- `.claude/WORKFLOW.md` - **Feature development workflow (Plan → Implement → Test → Document → Commit)**

## Quick Commands

### Development
- Dev server: `docker-compose up`
- Build: `cd frontend && npm run build`
- **Fast local deploy (frontend):** Use `cd frontend && npx vite dev --host` for Vite hot-reload instead of rebuilding the Docker container. This is much faster for testing UI changes.

### Testing (Run all before commit — 5-layer pyramid)
- **Layer 1** Backend unit tests: `cd backend && npm test` (527 tests)
- **Layer 2** Frontend component tests: `cd frontend && npm run test:run` (296 tests)
- **Layer 3** Playwright E2E: `cd frontend && npm run e2e` (35 tests)
- **Layer 4** Cypress E2E: `cd frontend && npm run cypress:run` (283 tests)
- **Layer 5** MCP Playwright visual review: ui-ux-reviewer agent (for UI changes)
- Cypress interactive: `cd frontend && npm run cypress`

### Test Locations
- Backend: `backend/src/services/import/__tests__/*.test.ts`
- Components: `frontend/src/components/**/*.test.tsx`
- Playwright: `frontend/e2e/*.spec.ts`
- Cypress: `frontend/cypress/e2e/*.cy.ts`

---

## Render API Access

**IMPORTANT:** Use the Render REST API with curl commands. Do NOT use the Render MCP server (not configured).

### API Key Location
The Render API key is stored encrypted at `~/.claude/render-api-key.gpg`

**Decrypt the key:**
```bash
RENDER_API_KEY=$(gpg --decrypt --batch --passphrase "patient-tracker-render" ~/.claude/render-api-key.gpg 2>/dev/null)
```

### Service IDs
| Service | ID | URL |
|---------|-----|-----|
| Backend API | `srv-d64p1524d50c73ekm41g` | https://patient-tracker-api-cwrh.onrender.com |
| Frontend | `srv-d64p1gur433s73edldl0` | https://patient-tracker-frontend.onrender.com |

### Common API Calls
```bash
# List services
curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services?limit=10"

# Check recent deploys for a service
curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/{SERVICE_ID}/deploys?limit=3"

# Get service events (for debugging)
curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/{SERVICE_ID}/events?limit=10"
```

### Deploy Status Values
- `live` - Deployment successful and running
- `build_in_progress` - Building
- `update_in_progress` - Deploying after successful build
- `build_failed` - Build failed (check events for details)
- `deactivated` - Previous deploy, replaced by newer one

---

## Available Skills & Commands

### Spec Workflow (Requirements → Implementation)

| Command | Purpose |
|---------|---------|
| `/spec-steering-setup` | Create project context (product.md, tech.md, structure.md) |
| `/spec-create <name> "desc"` | Thin orchestrator: delegates to `/jh-1-requirements` → `/jh-2-design` → `/jh-3-tasks` |
| `/spec-execute <task-id> <name>` | Execute a task with TDD |
| `/spec-status` | Show spec progress |
| `/spec-list` | List all specs |

### Bug Fix Workflow

| Command | Purpose |
|---------|---------|
| `/bug-create <name> "desc"` | Document bug with structured format |
| `/bug-analyze` | Investigate root cause |
| `/bug-fix` | Implement fix |
| `/bug-verify` | Verify resolution |
| `/bug-status` | Show bug fix progress |

### Test Planning Skills

> **User-facing command:** `/jh-4-test-audit` runs the full 4-layer test suite and coordinates these skills.

| Skill | Purpose | Location |
|-------|---------|----------|
| `ln-510-test-planner` | Orchestrate testing workflow | `.claude/skills/` |
| `ln-511-test-researcher` | Research edge cases | `.claude/skills/` |
| `ln-513-auto-test-planner` | Plan E2E/integration/unit tests | `.claude/skills/` |
| `ln-630-test-auditor` | Audit test quality | `.claude/skills/` |
| `ln-634-test-coverage-auditor` | Find coverage gaps | `.claude/skills/` |

### TDD Agents

| Agent | Purpose | Location |
|-------|---------|----------|
| `tdd-test-writer` | Write failing tests (RED phase) | `.claude/agents/` |
| `tdd-implementer` | Write minimal passing code (GREEN phase) | `.claude/agents/` |
| `tdd-refactorer` | Improve code quality (REFACTOR phase) | `.claude/agents/` |

### JH Workflow Commands (Per-Phase SDLC)

| # | Command | Purpose |
|---|---------|---------|
| 1 | `/jh-1-requirements <name> "desc"` | Requirements (requirements-planner agent) |
| 2 | `/jh-2-design <name>` | Design (architecture-designer agent) |
| 3 | `/jh-3-tasks <name>` | Task breakdown (task-planner agent) |
| 4 | `/jh-4-test-audit [name]` | Test suite + coverage audit (test-orchestrator agent) |
| 5 | `/jh-5-security-audit [scope]` | OWASP + dependency audit (security-auditor agent) |
| 6 | `/jh-6-code-review [branch]` | Code review: bugs, security, compliance, perf (code-reviewer agent) |
| 7 | `/jh-7-deploy-validate` | Pre-deployment GO/NO-GO check (deployment-validator agent) |
| 8 | `/jh-8-code-quality-scan [scope]` | Code quality scan: duplicates, maintainability, DB, types, security (4 parallel agents) |

### Release & Version

| Command | Purpose |
|---------|---------|
| `/release` | Merge develop → main, deploy to Render |
| `/commit` | Smart commit with doc updates |
| `/version` | Bump version number |

---

## Full Development Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: STEERING SETUP (first time only)                          │
│  /spec-steering-setup                                               │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 2: REQUIREMENTS                                              │
│  /jh-1-requirements feature-name "description"                      │
│  (or /spec-create for all-in-one)                                   │
│                                                                     │
│  Agent: requirements-planner → spec-requirements-validator          │
│  Output: .claude/specs/feature-name/requirements.md                 │
│  → USER REVIEWS & APPROVES                                          │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 3: DESIGN                                                    │
│  /jh-2-design feature-name                                          │
│                                                                     │
│  Agent: architecture-designer → spec-design-validator               │
│  Output: .claude/specs/feature-name/design.md                       │
│  → USER REVIEWS & APPROVES                                          │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 4: TASKS                                                     │
│  /jh-3-tasks feature-name                                           │
│                                                                     │
│  Agent: task-planner → spec-task-validator                          │
│  Output: .claude/specs/feature-name/tasks.md                        │
│  → USER REVIEWS & APPROVES                                          │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 5: IMPLEMENTATION (TDD)                                      │
│  /spec-execute 1 feature-name                                       │
│                                                                     │
│  For each task:                                                     │
│    RED:    tdd-test-writer → failing test                           │
│    GREEN:  tdd-implementer → minimal passing code                   │
│    REFACTOR: tdd-refactorer → improve quality                       │
│  → TESTS RUN AUTOMATICALLY                                          │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 6: TESTING & QA                                              │
│  /jh-4-test-audit feature-name                                      │
│                                                                     │
│  Agent: test-orchestrator (4-layer test suite + coverage audit)     │
│  → FIX ANY GAPS                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 7: SECURITY AUDIT                                            │
│  /jh-5-security-audit                                               │
│                                                                     │
│  Agent: security-auditor (OWASP top 10 + deps + auth review)       │
│  → FIX CRITICAL/HIGH FINDINGS                                       │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 8: CODE REVIEW                                               │
│  /jh-6-code-review                                                  │
│                                                                     │
│  Agent: code-reviewer (bugs, security, compliance, perf)            │
│  → ADDRESS REQUEST_CHANGES                                           │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 9: CODE QUALITY SCAN (periodic)                              │
│  /jh-8-code-quality-scan                                            │
│                                                                     │
│  4 parallel agents: duplicates, maintainability, types, DB/perf     │
│  Output: .claude/CODE_QUALITY_REPORT.md                             │
│  → FIX CRITICAL/HIGH FINDINGS                                       │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 10: PRE-DEPLOY VALIDATION                                    │
│  /jh-7-deploy-validate                                              │
│                                                                     │
│  Agent: deployment-validator (GO/NO-GO readiness check)             │
│  → MUST BE "GO" BEFORE RELEASE                                       │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 11: RELEASE                                                   │
│  /release                                                           │
│                                                                     │
│  GATES (automated inside /release):                                 │
│    1. Branch check (must be develop)                                │
│    2. Backend tests pass                                            │
│    3. Frontend tests pass                                           │
│    4. Frontend build succeeds                                       │
│    5. Backend type-check succeeds                                   │
│  Then: commit → push develop → merge main → push main               │
│  Then: verify Render deploy → post-deploy health check              │
└─────────────────────────────────────────────────────────────────────┘
```
