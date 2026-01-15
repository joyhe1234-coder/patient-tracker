---
allowed-tools: Bash(git:*), Read, Edit, Glob, Grep
description: Release workflow - commit, push develop, merge to main, push main
---

# Release Workflow

This skill performs a complete release cycle: commit changes, push develop, merge to main, and push main.

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

## Step 3: Stage and Commit on Develop

1. Stage all documentation updates: `git add .claude/*.md`
2. Stage code changes if not already staged: `git add -A`
3. Create a descriptive commit message summarizing all changes
4. Execute the commit

## Step 4: Push Develop to Remote

1. Push the develop branch to remote: `git push origin develop`
2. Confirm the push succeeded

## Step 5: Merge Develop into Main

1. Switch to main branch: `git checkout main`
2. Pull latest main (if any): `git pull origin main`
3. Merge develop into main: `git merge develop`
4. Resolve any conflicts if necessary

## Step 6: Push Main to Remote

1. Push the main branch to remote: `git push origin main`
2. Confirm the push succeeded

## Step 7: Switch Back to Develop

1. Switch back to develop branch: `git checkout develop`
2. Confirm you're on develop: `git branch --show-current`

## Step 8: Confirm

Show the user:
- Summary of documentation updates made
- The commit message used
- Confirmation that develop was pushed
- Confirmation that main was updated and pushed
- Current branch (should be develop)
- Result of `git log -1` on both branches

$ARGUMENTS
