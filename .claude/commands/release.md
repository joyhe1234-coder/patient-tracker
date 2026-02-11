---
allowed-tools: Task
description: Release workflow - commit, push, merge to main, and verify Render deployment
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

Perform a full release: commit, push develop, merge to main, push main, verify Render deployment. Follow ALL steps.

## Step 1: Analyze Changes

Run bash commands (use /c/Users/joyxh/projects/patient-tracker paths):
- `git status`
- `git diff --staged` and `git diff`
- `git log --oneline -5`

## Step 2: Update Documentation

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

## Step 3: Reconcile Documentation

Cross-check for consistency:
1. CHANGELOG → IMPLEMENTATION_STATUS
2. CHANGELOG → TODO
3. CHANGELOG → REGRESSION_TEST_PLAN
4. Check for contradictions and missing items

## Step 4: Stage and Commit on Develop

1. Stage docs: `git add .claude/*.md`
2. Stage code if not staged
3. Commit with descriptive message + Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
4. Use HEREDOC for commit message

## Step 5: Push Develop

1. `git push origin develop`
2. Confirm push succeeded

## Step 6: Merge to Main

1. `git checkout main`
2. `git pull origin main`
3. `git merge develop --no-edit`
4. Resolve conflicts if any

## Step 7: Push Main

1. `git push origin main`
2. Confirm push succeeded

## Step 8: Return to Develop

1. `git checkout develop`
2. Confirm: `git branch --show-current`

## Step 9: Verify Render Deployment

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

## Step 10: Output Summary

Report:
- Documentation updates made
- Commit message used
- Develop push status
- Main merge and push status
- Current branch (should be develop)
- `git log -1` result
- Render deployment status for BOTH services (backend + frontend)
```
