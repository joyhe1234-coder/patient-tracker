---
allowed-tools: Task
description: Smart commit with tests, build check, documentation updates and reconciliation
---

# Smart Commit (Background Agent)

**IMPORTANT:** Do NOT execute these steps yourself. Instead, launch a background Task agent to handle the entire commit workflow autonomously.

Use the Task tool with:
- `subagent_type`: `"general-purpose"`
- `run_in_background`: `true`
- `description`: `"Smart commit with doc updates"`
- `prompt`: the full workflow below (copy it verbatim into the prompt field), prepended with the project path `C:\Users\joyxh\projects\patient-tracker` and any user arguments: $ARGUMENTS

Tell the user: "Commit running in background. I'll notify you when it's done — you can keep working."

---

## Workflow prompt to pass to the background agent:

```
Working directory: C:\Users\joyxh\projects\patient-tracker

Perform a smart git commit with tests, build verification, and documentation reconciliation. Follow ALL steps below. If a GATE step fails, STOP and report the failure.

## Step 1: Verify Branch & Analyze Changes

Run these bash commands (use /c/Users/joyxh/projects/patient-tracker paths):
- `git branch --show-current` — MUST be `develop` or a feature branch. If on `main`, STOP and report error.
- `git status` — If working tree is clean AND nothing is staged, STOP and report "Nothing to commit."
- `git diff --staged` and `git diff` (unstaged changes)
- `git log --oneline -5` (recent commit style)

## Step 2: Check for Sensitive Files

Review `git status` output. WARN (do not stage) if any of these are present:
- `.env`, `.env.*` files
- `credentials.json`, `*.pem`, `*.key` files
- `node_modules/` directories
- Large binary files (images, ZIPs, etc. over 1MB)
- `nul` (Windows artifact)

If found, explicitly EXCLUDE them from staging and warn in the summary.

## Step 3: Run Tests (GATE — must pass before committing)

Run both test suites. If EITHER fails, STOP and report failures — do NOT commit.

```bash
cd /c/Users/joyxh/projects/patient-tracker/backend && npm test
```

```bash
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run test:run
```

Record test counts (e.g., "527 backend, 753 frontend") for the commit message.

## Step 4: Build Verification (GATE)

Verify the code compiles cleanly:

```bash
cd /c/Users/joyxh/projects/patient-tracker/frontend && npm run build
```

```bash
cd /c/Users/joyxh/projects/patient-tracker/backend && npx tsc --noEmit
```

If EITHER fails, STOP and report the error — do NOT commit.

## Step 5: Update Documentation

Read and update each of these files based on the code changes:

### `.claude/CHANGELOG.md`
- Add new entry at the top with today's date
- Describe what changed (Added/Changed/Fixed/Removed)
- Keep entries concise but informative
- This is the PRIMARY source of truth

### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features/components that were implemented
- Update status of existing items
- Update the "Last Updated" date

### `.claude/TODO.md`
- Mark completed tasks as done
- Add any new tasks discovered
- Update the "Last Updated" date

### `.claude/REGRESSION_TEST_PLAN.md`
- Add test cases for new functionality
- Update existing test cases if behavior changed

## Step 6: Reconcile Documentation

Cross-check all documentation files for consistency:
1. CHANGELOG → IMPLEMENTATION_STATUS: features reflected
2. CHANGELOG → TODO: completed features marked [x]
3. CHANGELOG → REGRESSION_TEST_PLAN: test cases exist
4. Check for contradictions between docs
5. Check for missing items

## Step 7: Stage and Commit

1. Stage documentation: `git add .claude/*.md`
2. Stage code changes if not already staged (by specific file name — NOT `git add .` or `git add -A`)
3. Do NOT stage sensitive files, screenshots, or build artifacts
4. Create descriptive commit message:
   - Focus on "why" not "what"
   - Include test count: e.g., "(+22 Vitest, ~36 Cypress tests)"
   - End with Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
5. Use HEREDOC format for commit message

## Step 8: Confirm

Output a summary including:
- Branch confirmed (develop/feature)
- Sensitive files excluded (if any found)
- Test results: backend (X passed), frontend (X passed)
- Build verification: frontend (pass), backend (pass)
- Documentation updates made
- Reconciliation fixes applied
- The commit message used
- Result of `git log -1` to confirm success
```
