---
allowed-tools: Bash(git:*), Read, Edit, Glob, Grep
description: Smart commit with automatic documentation updates
---

# Smart Commit

Before creating the git commit, you MUST update the project documentation.

## Step 1: Analyze Changes

Run these commands to understand what changed:
- `git status` to see all changed files
- `git diff --staged` to see staged changes
- `git diff` to see unstaged changes

## Step 2: Update Documentation

Read and update each of these files based on the code changes:

### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features/components that were implemented
- Update status of existing items (e.g., "In Progress" → "Complete")
- Note any changes to existing functionality
- Update the "Last Updated" date

### `.claude/REGRESSION_TEST_PLAN.md`
- Add test cases for new functionality
- Update existing test cases if behavior changed
- Mark tests as needed/completed

### `.claude/CHANGELOG.md`
- Add new entry at the top with today's date
- Describe what changed (Added/Changed/Fixed/Removed)
- Keep entries concise but informative

### `.claude/TODO.md`
- Mark completed tasks as done
- Add any new tasks discovered
- Update priorities if needed
- Update the "Last Updated" date

## Step 3: Stage and Commit

1. Stage all documentation updates: `git add .claude/*.md`
2. Stage code changes if not already staged
3. Create a descriptive commit message summarizing all changes
4. Execute the commit

## Step 4: Confirm

Show the user:
- Summary of documentation updates made
- The commit message used
- Result of `git log -1` to confirm success

$ARGUMENTS
