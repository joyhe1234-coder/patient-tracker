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

### Step 5: Add Tests (REQUIRED)
After implementing, you MUST add automated tests:

1. **Add test cases to REGRESSION_TEST_PLAN.md** - Document what needs testing
2. **Write automated tests** using the appropriate framework:
   - Backend logic → Jest (`backend/src/**/__tests__/*.test.ts`)
   - React components → Vitest (`frontend/src/**/*.test.tsx`)
   - General UI flows → Playwright (`frontend/e2e/*.spec.ts`)
   - AG Grid dropdowns → Cypress (`frontend/cypress/e2e/*.cy.ts`)
3. **Run all tests** before committing:
   ```bash
   cd backend && npm test
   cd frontend && npm run test:run
   cd frontend && npm run e2e
   cd frontend && npm run cypress:run
   ```

See `.claude/TESTING.md` for detailed testing patterns and examples.

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

1. **Check deployment status** using Render MCP:
   - List recent deploys for the backend service
   - Verify deploy status is "live" or "succeeded"

2. **If deployment fails:**
   - Fetch deploy logs via Render MCP
   - Report the error to the user
   - Do NOT consider the release complete until deployment succeeds

3. **Confirm to user:**
   - Report deployment status (success/failure)
   - Include deploy ID and timestamp
   - If failed, include relevant error logs

---

Read the following files before starting work:

## Project Documentation
- `README.md` - Project overview (in root)
- `.claude/IMPLEMENTATION_STATUS.md` - Current implementation status
- `.claude/TODO.md` - Task list and priorities
- `.claude/CHANGELOG.md` - Version history and changes
- `.claude/REGRESSION_TEST_PLAN.md` - Testing requirements
- `.claude/TESTING.md` - **Testing guide: framework setup, patterns, and examples**

## Claude-Specific Context
- `.claude/context.md` - Project structure and tech stack
- `.claude/patterns.md` - Code conventions and patterns
- `.claude/notes.md` - Session notes and current focus

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

## Available MCP Servers

### Render MCP (Deployment & Infrastructure)
The Render MCP server is configured and available for managing deployments.

**Use Render MCP to:**
- Check deployment status and history
- View service logs for debugging
- Query metrics (CPU, memory, response times)
- List services and their configurations
- Run read-only database queries

**Common commands:**
- After a release, check deployment status via Render MCP
- If deployment fails, use Render MCP to fetch logs and diagnose issues
- Monitor service health and performance metrics

**Limitations:**
- Cannot trigger deploys (must push to git)
- Cannot delete resources
- Cannot modify scaling settings
- Can only modify environment variables
