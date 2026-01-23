---
allowed-tools: Bash(git:*), Read, Edit, Glob, Grep, mcp__render__*
description: Version bump - increment major/minor/patch, tag release, push to Render
---

# Version Bump Workflow

This skill increments the version, tags the release on main, and pushes to Render.

**Usage:** `/version [major|minor|patch]`

- `major`: Breaking changes, big milestones (2.0.0 → 3.0.0)
- `minor`: New features (2.0.0 → 2.1.0)
- `patch`: Bug fixes only (2.0.0 → 2.0.1)

---

## Step 0: Pre-flight Checks

Ensure branches are in sync before making changes:

1. Check for uncommitted changes: `git status`
   - If dirty, STOP and ask user to commit or stash first
2. Switch to main and pull: `git checkout main && git pull origin main`
3. Switch to develop and pull: `git checkout develop && git pull origin develop`
4. Verify develop is ahead of or equal to main
5. Confirm working tree is clean

---

## Step 1: Parse Argument

Read the argument from `$ARGUMENTS`:
- If `major` → increment major, reset minor and patch to 0
- If `minor` → increment minor, reset patch to 0
- If `patch` → increment patch
- If missing or invalid → STOP and ask user to specify

---

## Step 2: Read Current Version

Read version from `frontend/package.json`:
- Extract the version field (e.g., "3.0.0-snapshot" or "3.0.0")
- Strip `-snapshot` suffix if present to get base version
- Parse into major.minor.patch components

---

## Step 3: Calculate New Version

Apply the increment:
```
Current: 2.0.0-snapshot (base: 2.0.0)

major → 3.0.0
minor → 2.1.0
patch → 2.0.1
```

---

## Step 4: Update package.json Files

Update version in both files (remove -snapshot for release):

1. `frontend/package.json` → set version to new version (e.g., "3.0.0")
2. `backend/package.json` → set version to new version (e.g., "3.0.0")

---

## Step 5: Update CHANGELOG.md

Find the unreleased section and update it:

1. Find line matching `## [X.X.X-snapshot] - Unreleased`
2. Replace with `## [NEW_VERSION] - YYYY-MM-DD` (today's date)
3. If no unreleased section found, add one at the top

---

## Step 6: Commit on Develop

1. Stage all changes: `git add -A`
2. Commit with message: `Release vX.X.X`

---

## Step 7: Push Develop

1. Push develop to remote: `git push origin develop`

---

## Step 8: Merge to Main

1. Switch to main: `git checkout main`
2. Merge develop: `git merge develop`
3. Resolve conflicts if any (prefer develop version)

---

## Step 9: Tag Main

Create annotated tag on main:

```bash
git tag -a vX.X.X -m "Release vX.X.X"
```

---

## Step 10: Push Main + Tags

1. Push main with tags: `git push origin main --tags`

---

## Step 11: Switch Back to Develop

1. Switch to develop: `git checkout develop`

---

## Step 12: Bump to Next Snapshot

Prepare for next development cycle:

1. Calculate next snapshot version:
   - After major release (3.0.0) → 3.1.0-snapshot
   - After minor release (2.1.0) → 2.2.0-snapshot
   - After patch release (2.0.1) → 2.0.2-snapshot
2. Update `frontend/package.json` with snapshot version
3. Update `backend/package.json` with snapshot version
4. Add new unreleased section to CHANGELOG.md:
   ```markdown
   ## [X.X.X-snapshot] - Unreleased

   ### Added

   ### Changed

   ### Fixed

   ---
   ```

---

## Step 13: Commit & Push Snapshot

1. Stage all changes: `git add -A`
2. Commit: `Start vX.X.X-snapshot development`
3. Push develop: `git push origin develop`

---

## Step 14: Verify Render Deployment

Use Render MCP to check deployment:

1. Wait 30-60 seconds for Render to detect the push
2. Check deployment status for:
   - `patient-tracker-api` (backend)
   - `patient-tracker-frontend` (frontend)
3. Report status to user

---

## Step 15: Summary

Show the user:
- Previous version → New release version
- Git tag created (vX.X.X)
- Next development version (X.X.X-snapshot)
- Commits created (release + snapshot)
- Render deployment status

Example output:
```
Version Release Complete!

Release:     2.0.0-snapshot → 3.0.0
Tag:         v3.0.0
Next dev:    3.1.0-snapshot

Commits:
- develop: "Release v3.0.0"
- main:    merged from develop, tagged v3.0.0
- develop: "Start v3.1.0-snapshot development"

Render: Deploying...
```

$ARGUMENTS
