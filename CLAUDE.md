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

## IMPORTANT: Implementation Request Workflow

**When the user asks to implement a requirement, ALWAYS follow this workflow:**

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

### Step 4: Implement
Only after approval, proceed with implementation.

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
# Run ALL test suites - ALL must pass
cd backend && npm test                    # Jest (130+ tests)
cd frontend && npm run test:run           # Vitest (45+ tests)
cd frontend && npm run e2e                # Playwright (26+ tests)
cd frontend && npm run cypress:run        # Cypress (19+ tests)
```

#### 5h. Update Test Documentation

After tests pass:
1. Update `.claude/REGRESSION_TEST_PLAN.md` - Mark test cases as "Automated"
2. Update `.claude/TESTING.md` - Add new test file to the inventory
3. Include test count in commit message

See `.claude/TESTING.md` for detailed patterns and troubleshooting.

---

## IMPORTANT: Pre-Commit Workflow

**Before ANY git commit, you MUST update these documents first:**

1. **`.claude/IMPLEMENTATION_STATUS.md`** - Update to reflect:
   - New features/components added
   - Changes to existing functionality
   - Current completion status of each module

2. **`.claude/REGRESSION_TEST_PLAN.md`** - Update to reflect:
   - New test cases needed for added functionality
   - Modified test cases for changed behavior
   - Mark completed tests

3. **`.claude/CHANGELOG.md`** - Add entry for:
   - What changed (features, fixes, refactors)
   - Date of change
   - Brief description of impact

4. **`.claude/TODO.md`** - Update to reflect:
   - Mark completed tasks as done
   - Add new tasks discovered during implementation
   - Update priorities if needed

**Workflow:** Read current docs → Make updates based on staged changes → Stage doc updates → Then commit all together.

---

## IMPORTANT: Installation Documentation

**The file `docs/INSTALLATION_GUIDE.md` documents how to deploy this application on a self-hosted server.**

**When making ANY decision that affects installation or deployment, you MUST update the installation guide:**

- New environment variables
- New dependencies or version requirements
- Configuration file changes
- Database schema changes requiring migration
- New services or components
- Changes to build or deployment process
- SMTP/email configuration
- SSL/security requirements

**Examples of changes requiring doc updates:**
- Adding SMTP support for password reset → Update environment variables section
- Adding Redis for caching → Add to system requirements and architecture
- Changing Node.js version → Update prerequisites
- Adding new API endpoints that need proxy config → Update Nginx section

---

## IMPORTANT: Release Workflow

**When the user runs `/release` or asks to release, follow these steps:**

### Step 1: Verify Clean State
```bash
git status  # Should show clean working tree
git branch  # Should be on develop
```

### Step 2: Push and Merge
```bash
git push origin develop           # Push develop to remote
git checkout main                 # Switch to main
git pull origin main              # Get latest main
git merge develop --no-edit       # Merge develop into main
git push origin main              # Push main to remote
git checkout develop              # Return to develop
```

### Step 3: Monitor Render Deployment
After pushing to main, Render auto-deploys. **You MUST monitor the deployment:**

#### 3a. Decrypt the Render API Key
```bash
RENDER_API_KEY=$(gpg --decrypt --batch --passphrase "patient-tracker-render" ~/.claude/render-api-key.gpg 2>/dev/null)
```

#### 3b. Check Deployment Status
Wait 30 seconds for deploy to start, then check both services:

```bash
# Check backend (patient-tracker-api)
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d5hh4ui4d50c73932ta0/deploys?limit=1"

# Check frontend (patient-tracker-frontend)
curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
  "https://api.render.com/v1/services/srv-d5hh7a24d50c739344hg/deploys?limit=1"
```

**Service IDs:**
- Backend API: `srv-d5hh4ui4d50c73932ta0`
- Frontend: `srv-d5hh7a24d50c739344hg`

#### 3c. Interpret Status
- `"status":"live"` = Deployment successful
- `"status":"build_in_progress"` or `"status":"update_in_progress"` = Still deploying, wait and check again
- `"status":"build_failed"` = Build failed, investigate

#### 3d. If Deployment Fails
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

#### 3e. Confirm to User
Report deployment status for BOTH services:
- Service name and status (live/failed)
- Deploy ID and timestamp
- If failed, include error details and fix applied

---

Read the following files before starting work:

## Project Documentation
- `README.md` - Project overview (in root)
- `docs/INSTALLATION_GUIDE.md` - **Self-hosted deployment guide (Docker Compose & manual)**
- `.claude/IMPLEMENTATION_STATUS.md` - Current implementation status
- `.claude/TODO.md` - Task list and priorities
- `.claude/CHANGELOG.md` - Version history and changes
- `.claude/REGRESSION_TEST_PLAN.md` - Testing requirements
- `.claude/TESTING.md` - **Testing guide: framework setup, patterns, and examples**

## Claude-Specific Context
- `.claude/context.md` - Project structure and tech stack
- `.claude/patterns.md` - Code conventions and patterns
- `.claude/notes.md` - Session notes and current focus
- `.claude/WORKFLOW.md` - **Feature development workflow (Plan → Implement → Test → Document → Commit)**

## Quick Commands

### Development
- Dev server: `docker-compose up`
- Build: `cd frontend && npm run build`

### Testing (Run all before commit)
- Backend unit tests: `cd backend && npm test` (130 tests)
- Frontend component tests: `cd frontend && npm run test:run` (45 tests)
- Playwright E2E: `cd frontend && npm run e2e` (25 tests)
- Cypress E2E: `cd frontend && npm run cypress:run` (19 tests)
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
| Backend API | `srv-d5hh4ui4d50c73932ta0` | https://patient-tracker-api-feu8.onrender.com |
| Frontend | `srv-d5hh7a24d50c739344hg` | https://patient-tracker-frontend.onrender.com |

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
