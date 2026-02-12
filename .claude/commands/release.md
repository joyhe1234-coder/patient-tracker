---
allowed-tools: Task
description: Release workflow - tests, build, commit, push, merge to main, and verify Render deployment
---

# Release Workflow (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Instead, launch a background Task agent to handle the entire release workflow autonomously.

Use the Task tool with:
- `subagent_type`: `"general-purpose"`
- `run_in_background`: `true`
- `description`: `"Release to production"`
- `prompt`: the full workflow below (copy it verbatim into the prompt field), prepended with the project path `C:\Users\joyxh\projects\patient-tracker` and any user arguments: $ARGUMENTS

Tell the user: "Release running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Working directory: C:\Users\joyxh\projects\patient-tracker

Perform a full release: verify, test, build, commit, push develop, merge to main, push main, verify Render deployment. Follow ALL steps. If any step fails, STOP and report the failure — do NOT continue to push/merge broken code.

## Step 1: Verify Clean State & Branch

Run bash commands (use /c/Users/joyxh/projects/patient-tracker paths):
- `git branch --show-current` — MUST be `develop`. If on `main`, STOP and report error.
- `git status` — Check for uncommitted changes (expected — we'll commit them)
- `git diff --staged` and `git diff` — Understand what will be committed
- `git log --oneline -5` — Recent commit style

## Step 2: Run Tests (GATE — must pass before proceeding)

Run both test suites. If EITHER fails, STOP and report failures — do NOT proceed to commit.

```bash
cd /c/Users/joyxh/projects/patient-tracker/backend && npm test
```

```bash
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run test:run
```

Report test counts for both. If any test fails, STOP here.

## Step 3: Build Verification (GATE — must pass before proceeding)

Verify both frontend and backend build cleanly:

```bash
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run build
```

```bash
cd /c/Users/joyxh/projects/patient-tracker/backend && npx tsc --noEmit
```

If EITHER build fails, STOP and report the error — do NOT proceed to commit.

## Step 4: Update Documentation

Read and update these files based on code changes:

### `.claude/CHANGELOG.md`
- Add entry at top with today's date (Added/Changed/Fixed/Removed)
- This is the PRIMARY source of truth

### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features, update statuses, update "Last Updated"

### `.claude/TODO.md`
- Mark completed tasks, update "Last Updated"

### `.claude/REGRESSION_TEST_PLAN.md`
- Add/update test cases for changed functionality

## Step 5: Reconcile Documentation

Cross-check for consistency:
1. CHANGELOG → IMPLEMENTATION_STATUS
2. CHANGELOG → TODO
3. CHANGELOG → REGRESSION_TEST_PLAN
4. Check for contradictions and missing items

## Step 6: Stage and Commit on Develop

1. Stage docs: `git add .claude/*.md`
2. Stage code if not staged
3. Commit with descriptive message + Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
4. Use HEREDOC for commit message

## Step 7: Push Develop

1. `git push origin develop`
2. Confirm push succeeded

## Step 8: Merge to Main

1. `git checkout main`
2. `git pull origin main`
3. `git merge develop --no-edit`
4. Resolve conflicts if any

## Step 9: Push Main

1. `git push origin main`
2. Confirm push succeeded

## Step 10: Return to Develop

1. `git checkout develop`
2. Confirm: `git branch --show-current`

## Step 11: Verify Render Deployment

Decrypt the Render API key:
```bash
RENDER_API_KEY=$(gpg --decrypt --batch --passphrase "patient-tracker-render" ~/.claude/render-api-key.gpg 2>/dev/null)
```

Wait 30 seconds, then check both services:

Backend (srv-d64p1524d50c73ekm41g):
```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/srv-d64p1524d50c73ekm41g/deploys?limit=1"
```

Frontend (srv-d64p1gur433s73edldl0):
```bash
curl -s -H "Authorization: Bearer $RENDER_API_KEY" "https://api.render.com/v1/services/srv-d64p1gur433s73edldl0/deploys?limit=1"
```

If status is "build_in_progress" or "update_in_progress", wait 30s and check again (up to 5 retries).
If "build_failed", report the error.

## Step 12: Post-Deploy Health Check

After both services show "live", verify they are actually responding:

```bash
curl -s -o /dev/null -w "%{http_code}" https://patient-tracker-api-cwrh.onrender.com/api/health
```

```bash
curl -s -o /dev/null -w "%{http_code}" https://patient-tracker-frontend.onrender.com/
```

Expected: HTTP 200 for both. If not 200, report the status code and response.

## Step 13: Output Summary

Report:
- Branch verified (develop)
- Test results: backend (X passed), frontend (X passed)
- Build verification: frontend (pass/fail), backend (pass/fail)
- Documentation updates made
- Commit message used
- Develop push status
- Main merge and push status
- Current branch (should be develop)
- `git log -1` result
- Render deployment status for BOTH services (backend + frontend)
- Post-deploy health check results
```
