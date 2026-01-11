# Release Workflow

This document describes the branching strategy and release process for the Patient Quality Measure Tracking System.

---

## Branch Structure

| Branch | Purpose | Version Format | Deploys To |
|--------|---------|----------------|------------|
| `main` | Production-ready code | `X.Y.Z` (e.g., 1.0.0) | Render (auto-deploy) |
| `develop` | Active development | `X.Y.Z-snapshot` (e.g., 2.0.0-snapshot) | Local only |

---

## Current State

- **Production:** `main` @ v1.0.0
- **Development:** `develop` @ 2.0.0-snapshot

---

## Version Files

Update these files when changing versions:

| File | Location |
|------|----------|
| `package.json` | `backend/package.json` |
| `package.json` | `frontend/package.json` |
| `health.routes.ts` | `backend/src/routes/health.routes.ts` |

---

## Development Workflow

### 1. Daily Development

All work happens on `develop` branch:

```bash
git checkout develop
# Make changes
git add -A
git commit -m "Description of changes"
git push origin develop
```

### 2. Feature Branches (Optional)

For larger features:

```bash
git checkout develop
git checkout -b feature/feature-name
# Make changes
git commit -m "Add feature"
git push origin feature/feature-name
# Create PR to develop, merge when ready
```

---

## Release Process

### 1. Prepare Release

```bash
# Ensure on develop branch
git checkout develop
git pull origin develop

# Run tests
cd backend && npm test
cd ../frontend && npm run build

# Verify everything works locally
```

### 2. Update Version Numbers

Change version from `X.Y.Z-snapshot` to `X.Y.Z` in:
- `backend/package.json`
- `frontend/package.json`
- `backend/src/routes/health.routes.ts`

```bash
git add -A
git commit -m "Prepare release vX.Y.Z"
```

### 3. Merge to Main

```bash
git checkout main
git pull origin main
git merge develop
git push origin main
```

### 4. Create Release Tag

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z - Description

## Features
- Feature 1
- Feature 2

## Bug Fixes
- Fix 1
"

git push origin vX.Y.Z
```

### 5. Bump Development Version

```bash
git checkout develop

# Update versions to next snapshot (e.g., 2.1.0-snapshot)
# Edit backend/package.json, frontend/package.json, health.routes.ts

git add -A
git commit -m "Bump version to X.Y.Z-snapshot for development"
git push origin develop
```

---

## Render Deployment

### Auto-Deploy

Render automatically deploys when changes are pushed to `main`:

1. Detects push to `main`
2. Builds backend: `npm install && prisma generate && npm run build`
3. Runs migrations: `prisma migrate deploy`
4. Seeds database: `npx tsx prisma/seed.ts`
5. Builds frontend: `npm install && npm run build`
6. Deploys both services

### Manual Deploy

If needed, trigger manual deploy from Render Dashboard:
https://dashboard.render.com

### Rollback

To rollback to a previous version:

```bash
git checkout main
git reset --hard vX.Y.Z  # Previous stable tag
git push --force origin main
```

**Warning:** Force push to main requires caution.

---

## Release History

| Version | Date | Description |
|---------|------|-------------|
| v1.0.0 | 2026-01-10 | Initial release - Phases 1-6 complete |

---

## Hotfix Process

For urgent production fixes:

```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/description

# Make fix
git commit -m "Fix: description"

# Merge to main
git checkout main
git merge hotfix/description
git tag -a vX.Y.Z -m "Hotfix: description"
git push origin main --tags

# Merge back to develop
git checkout develop
git merge main
git push origin develop

# Delete hotfix branch
git branch -d hotfix/description
```

---

## Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Build succeeds locally
- [ ] Documentation updated
- [ ] IMPLEMENTATION_STATUS.md current
- [ ] TODO.md reviewed

### Release
- [ ] Version numbers updated (remove -snapshot)
- [ ] Merged to main
- [ ] Tag created with release notes
- [ ] Pushed to origin

### Post-Release
- [ ] Render deployment successful
- [ ] Production health check passing
- [ ] Development version bumped
- [ ] Release notes published (GitHub)

---

## Contacts

- **Repository:** https://github.com/joyhe1234-coder/patient-tracker
- **Render Dashboard:** https://dashboard.render.com
- **Production URL:** (Configure after first deploy)

---

## Last Updated

January 10, 2026
