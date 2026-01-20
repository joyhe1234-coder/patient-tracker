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

Read the following files before starting work:

## Project Documentation
- `README.md` - Project overview (in root)
- `.claude/IMPLEMENTATION_STATUS.md` - Current implementation status
- `.claude/TODO.md` - Task list and priorities
- `.claude/CHANGELOG.md` - Version history and changes
- `.claude/REGRESSION_TEST_PLAN.md` - Testing requirements

## Claude-Specific Context
- `.claude/context.md` - Project structure and tech stack
- `.claude/patterns.md` - Code conventions and patterns
- `.claude/notes.md` - Session notes and current focus

## Quick Commands
- Dev server: `docker-compose up`
- Build: `cd frontend && npm run build`
- Test: [add command]

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
