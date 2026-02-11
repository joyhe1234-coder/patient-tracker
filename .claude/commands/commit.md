---
allowed-tools: Task
description: Smart commit with automatic documentation updates and reconciliation
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

Perform a smart git commit with documentation reconciliation. Follow ALL steps below.

## Step 1: Analyze Changes

Run these bash commands to understand what changed:
- `git status` (in /c/Users/joyxh/projects/patient-tracker)
- `git diff --staged`
- `git diff` (unstaged changes)
- `git log --oneline -5` (recent commit style)

## Step 2: Update Documentation

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

## Step 3: Reconcile Documentation

Cross-check all documentation files for consistency:
1. CHANGELOG → IMPLEMENTATION_STATUS: features reflected
2. CHANGELOG → TODO: completed features marked [x]
3. CHANGELOG → REGRESSION_TEST_PLAN: test cases exist
4. Check for contradictions between docs
5. Check for missing items

## Step 4: Stage and Commit

1. Stage documentation: `git add .claude/*.md`
2. Stage code changes if not already staged
3. Create descriptive commit message (focus on "why")
4. Commit with Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
5. Use HEREDOC format for commit message

## Step 5: Confirm

Output a summary including:
- Documentation updates made
- Reconciliation fixes applied
- The commit message used
- Result of `git log -1` to confirm success
```
