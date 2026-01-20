---
allowed-tools: Bash(git:*), Read, Edit, Glob, Grep
description: Smart commit with automatic documentation updates and reconciliation
---

# Smart Commit

Before creating the git commit, you MUST update and reconcile the project documentation.

## Step 1: Analyze Changes

Run these commands to understand what changed:
- `git status` to see all changed files
- `git diff --staged` to see staged changes
- `git diff` to see unstaged changes

## Step 2: Update Documentation

Read and update each of these files based on the code changes:

### `.claude/CHANGELOG.md`
- Add new entry at the top with today's date
- Describe what changed (Added/Changed/Fixed/Removed)
- Keep entries concise but informative
- This is the PRIMARY source of truth for what changed

### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features/components that were implemented
- Update status of existing items (e.g., "In Progress" → "Complete")
- Note any changes to existing functionality
- Update the "Last Updated" date

### `.claude/TODO.md`
- Mark completed tasks as done
- Add any new tasks discovered
- Update priorities if needed
- Update the "Last Updated" date

### `.claude/REGRESSION_TEST_PLAN.md`
- Add test cases for new functionality
- Update existing test cases if behavior changed
- Mark tests as needed/completed

## Step 3: Reconcile Documentation

**IMPORTANT:** Cross-check all documentation files to ensure consistency:

1. **CHANGELOG → IMPLEMENTATION_STATUS**: Every feature in CHANGELOG should be reflected in IMPLEMENTATION_STATUS
2. **CHANGELOG → TODO**: Completed features should be marked [x] in TODO
3. **CHANGELOG → REGRESSION_TEST_PLAN**: New/changed features should have corresponding test cases
4. **Check for contradictions**: If one doc says "NOT editable" and another says "editable", fix it
5. **Check for missing items**: If TODO has an item marked complete, it should be in IMPLEMENTATION_STATUS

Common inconsistencies to look for:
- Feature marked complete in one doc but not others
- Behavior described differently across docs (e.g., "modal" vs "alert")
- Test cases that reference old/changed behavior
- Missing test cases for new features

## Step 4: Stage and Commit

1. Stage all documentation updates: `git add .claude/*.md`
2. Stage code changes if not already staged
3. Create a descriptive commit message summarizing all changes
4. Execute the commit

## Step 5: Confirm

Show the user:
- Summary of documentation updates made
- Any reconciliation fixes applied
- The commit message used
- Result of `git log -1` to confirm success

$ARGUMENTS
