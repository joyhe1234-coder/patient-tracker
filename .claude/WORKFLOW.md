# Claude Code Development Workflow

This document describes the standard workflow for implementing features and fixes.

---

## Quick Reference

```
Plan → Implement → Test → Document → Commit → Release
```

---

## 1. Understand Requirements

**Goal:** Fully understand what needs to be built before writing code.

- [ ] Read the task/feature request carefully
- [ ] Check `.claude/TODO.md` for context and priorities
- [ ] Review `.claude/IMPLEMENTATION_STATUS.md` for current state
- [ ] Ask clarifying questions using `AskUserQuestion` if needed
- [ ] Identify dependencies and related features

**Key Questions:**
- What problem does this solve?
- What are the acceptance criteria?
- Are there existing patterns to follow?

---

## 2. Plan (for non-trivial features)

**Goal:** Design the implementation approach before coding.

**When to Plan:**
- New features with multiple components
- Changes affecting multiple files
- Architectural decisions needed
- Unclear requirements

**Steps:**
1. Enter plan mode with `EnterPlanMode`
2. Explore codebase using `Glob`, `Grep`, `Read`
3. Identify files to create/modify
4. Write implementation plan with:
   - Files to create/modify
   - Data structures/interfaces
   - Implementation steps
   - Test cases
5. Get user approval via `ExitPlanMode`

**Skip Planning For:**
- Single-file bug fixes
- Simple UI tweaks
- Documentation updates
- Typo corrections

---

## 3. Implement

**Goal:** Write clean, tested code following project patterns.

### 3.1 Track Progress
```
Use TodoWrite to create task list:
- Break feature into small, actionable items
- Mark items in_progress when starting
- Mark items completed immediately when done
```

### 3.2 Follow Patterns
- Check `.claude/patterns.md` for code conventions
- Match existing code style in the file/directory
- Use existing utilities and helpers

### 3.3 Code Quality
- Keep changes focused (avoid scope creep)
- Don't over-engineer (YAGNI principle)
- Handle errors appropriately
- Avoid security vulnerabilities (OWASP top 10)

### 3.4 Backend Patterns (Node/Express/Prisma)
```typescript
// Routes: backend/src/routes/*.routes.ts
// Services: backend/src/services/*.ts
// Tests: backend/src/services/__tests__/*.test.ts
```

### 3.5 Frontend Patterns (React/TypeScript)
```typescript
// Pages: frontend/src/pages/*.tsx
// Components: frontend/src/components/*.tsx
// API: frontend/src/api/*.ts
// Tests: frontend/src/**/*.test.tsx
```

---

## 4. Test

**Goal:** Ensure code works correctly and doesn't break existing functionality.

### 4.1 Unit Tests

**Backend (Jest):**
```bash
cd backend && npm test -- <filename>
cd backend && npm test -- --coverage  # Full coverage report
```

**Frontend (Vitest):**
```bash
cd frontend && npm test
cd frontend && npm run test:coverage
```

### 4.2 E2E Tests

**Playwright (general E2E):**
```bash
cd frontend && npm run test:e2e
cd frontend && npm run test:e2e:ui  # Interactive mode
```

**Cypress (AG Grid interactions):**
```bash
cd frontend && npm run cypress:open  # Interactive
cd frontend && npm run cypress:run   # Headless
```

### 4.3 Test File Locations
| Type | Location | Framework |
|------|----------|-----------|
| Backend unit | `backend/src/**/__tests__/*.test.ts` | Jest |
| Frontend unit | `frontend/src/**/*.test.tsx` | Vitest |
| E2E general | `frontend/e2e/*.spec.ts` | Playwright |
| E2E AG Grid | `frontend/cypress/e2e/*.cy.ts` | Cypress |

### 4.4 Test Coverage Requirements
- New features: Write tests for all new functionality
- Bug fixes: Add regression test for the bug
- Aim for >80% coverage on new code

---

## 5. Document

**Goal:** Keep project documentation up-to-date.

### Before EVERY Commit, Update:

#### `.claude/IMPLEMENTATION_STATUS.md`
- Add new features/components implemented
- Update status (In Progress → Complete)
- Update file structure if files added
- Update "Last Updated" date

#### `.claude/CHANGELOG.md`
- Add entry at top with today's date
- Describe what changed (Added/Changed/Fixed/Removed)
- Keep entries concise but informative

#### `.claude/REGRESSION_TEST_PLAN.md`
- Add test cases for new functionality
- Update existing test cases if behavior changed
- Include steps to reproduce and expected results

#### `.claude/TODO.md`
- Mark completed tasks as done `[x]`
- Add any new tasks discovered
- Update priorities if needed

---

## 6. Commit

**Goal:** Create clean, atomic commits with good messages.

### Commit Message Format
```
<type>: <short description>

<detailed description if needed>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Types
- `Add` - New feature
- `Fix` - Bug fix
- `Update` - Enhancement to existing feature
- `Refactor` - Code restructure (no behavior change)
- `Remove` - Removing code/feature
- `Docs` - Documentation only

### Git Commands
```bash
git status                    # Check what changed
git diff                      # Review changes
git add -A                    # Stage all changes
git commit -m "message"       # Commit
git log -1                    # Verify commit
```

---

## 7. Release (When Requested)

**Goal:** Deploy changes to production safely.

### Steps
```bash
# 1. Push to develop
git push origin develop

# 2. Merge to main
git checkout main
git merge develop
git push origin main

# 3. Monitor deployment
# Check Render dashboard or use API
```

### Verify Deployment
- Check Render deployment status
- Verify both frontend and backend are live
- Test critical functionality in production

---

## Workflow Checklist

Use this for every feature:

```
[ ] 1. Understand: Read requirements, check TODO.md
[ ] 2. Plan: Enter plan mode for complex features
[ ] 3. Implement: Create TodoWrite list, write code
[ ] 4. Test: Run unit tests, add new tests
[ ] 5. Document: Update STATUS, CHANGELOG, TEST_PLAN, TODO
[ ] 6. Commit: Stage, commit with good message
[ ] 7. Release: Push, merge, monitor (when requested)
```

---

## Common Commands

```bash
# Development
cd backend && npm run dev      # Start backend
cd frontend && npm run dev     # Start frontend
docker-compose up              # Start with Docker

# Testing
cd backend && npm test         # Backend tests
cd frontend && npm test        # Frontend tests
cd frontend && npm run test:e2e # E2E tests

# Database
cd backend && npx prisma studio           # Visual DB editor
cd backend && npx prisma migrate reset    # Reset DB
cd backend && npx tsx prisma/seed.ts      # Seed data

# Git
git status && git diff         # Review changes
git add -A && git commit       # Commit all
git push origin develop        # Push to develop
```

---

## Last Updated

January 28, 2026
