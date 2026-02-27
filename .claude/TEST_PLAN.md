# Test Gap Remediation Plan

## Overview

This document is the authoritative test plan for closing coverage gaps across the Patient Tracker system. It defines the testing philosophy, 5-layer test pyramid, role-based testing strategy, per-framework conventions, coverage targets, and detailed per-module test plans.

**Baseline (v4.13.0):**

| Layer | Framework | Tests | Suites |
|-------|-----------|------:|-------:|
| 1 | Backend Jest | 1,415 | 48 |
| 2 | Frontend Vitest | 1,208 | 48 |
| 3 | Playwright E2E | ~43 | 10 |
| 4 | Cypress E2E | ~486 | 14 |
| 5 | MCP Playwright (visual) | on-demand | — |
| **Total** | | **~3,152** | |

**Target:** ~3,306+ tests (Tier 1+2 = ~154 new tests, ~168 with Tier 3)

---

## 1. Testing Philosophy

### Principles

1. **Risk-based prioritization.** Write tests where bugs hurt most: data integrity, security boundaries, user-visible breakage. Don't waste effort on parameterized completeness of already-well-tested areas.
2. **Test behavior, not implementation.** Tests assert what the system does (API response, grid cell value, row color), not how it does it (internal state, mock call counts).
3. **One test, one concern.** Each test verifies a single behavior. If a test name contains "and", it should probably be two tests.
4. **Existing patterns first.** Extend existing test files using established helpers (`baseRow`, `addTestRow`, `cy.login`, `waitForGridLoad`). Create new files only when additions exceed 50 tests or cover a genuinely new domain.
5. **Roles are a cross-cutting dimension.** Where behavior differs by role (Admin, Physician, Staff), test the role variants in the same file alongside the feature tests — not in a separate "role testing" phase.

### What NOT to Test

- Framework internals (Prisma query syntax, Express routing, AG Grid rendering pipeline)
- Third-party library correctness (bcrypt hash, JWT signing, XLSX parsing of valid files)
- Code paths that cannot be reached in the current codebase
- Features marked DEFERRED in requirement specs (rate limiting, httpOnly cookies, CSP, refresh tokens)

---

## 2. Five-Layer Test Pyramid

```
                    ┌───────────────────┐
             Layer 5│ MCP Playwright    │  Visual review (on-demand)
                    │ ui-ux-reviewer    │  Screenshots, a11y, UX audit
                    ├───────────────────┤
             Layer 4│ Cypress E2E       │  AG Grid: dropdowns, cell editing,
                    │ ~486 tests        │  row colors, sorting, import flows
                    ├───────────────────┤
             Layer 3│ Playwright E2E    │  Page navigation, auth flows,
                    │ ~43 tests         │  import roles, visual regression
                    ├───────────────────┤
             Layer 2│ Vitest + RTL      │  React components, pages, stores,
                    │ ~1,208 tests      │  config logic (statusColors, dropdown)
                    ├───────────────────┤
             Layer 1│ Jest + supertest  │  Backend services, API routes,
                    │ ~1,415 tests      │  middleware, import pipeline
                    └───────────────────┘
```

### Layer Responsibilities

| Layer | Framework | What It Tests | Speed | Isolation |
|-------|-----------|--------------|-------|-----------|
| 1 | **Jest** | Backend business logic, API endpoints (supertest), middleware, import pipeline | Fast (<30s) | Full mocks (Prisma, SMTP) |
| 2 | **Vitest** | React components, pages, Zustand stores, config modules (statusColors, dropdownConfig, cascadingFields) | Fast (<15s) | JSDOM, vi.mock, MSW |
| 3 | **Playwright** | Multi-page flows, auth, import roles, visual regression, accessibility | Medium (~2min) | Real browser, test DB |
| 4 | **Cypress** | AG Grid interactions: dropdown selection, cell editing, row colors, sorting, filtering | Slow (~10min) | Real browser, test DB |
| 5 | **MCP Playwright** | Visual design, UX patterns, color contrast, responsive, role-specific UI | Manual trigger | Real browser, screenshots |

### When to Use Which Layer

| Scenario | Layer |
|----------|-------|
| Pure function (statusColors, dueDateCalculator, cascadingFields) | 1 (Jest) or 2 (Vitest) depending on location |
| API endpoint behavior (request → response) | 1 (Jest + supertest) |
| React component render + interaction | 2 (Vitest + RTL + userEvent) |
| Multi-page navigation, auth redirect | 3 (Playwright) |
| AG Grid dropdown selection, cell value commit | 4 (Cypress) — Playwright has known issues with AG Grid popups |
| Row color after status change | 4 (Cypress) — needs real AG Grid rendering |
| Visual review of UI changes | 5 (MCP Playwright) |

---

## 3. Role-Based Testing Strategy

### Role Behavior Matrix

| Feature | Admin | Physician | Staff |
|---------|-------|-----------|-------|
| View patients | All (via dropdown) | Own only (auto-filtered) | Assigned physician's only |
| Provider dropdown | "Select provider" + Unassigned | Hidden (auto-filtered) | "Select physician" (assigned only) |
| Add/Delete rows | Yes | Yes | Yes |
| Import access | Yes | Yes | Yes |
| Conflict resolution | Interactive form | Read-only banner | Read-only banner |
| Admin page | Yes | Redirected to / | Redirected to / |
| Unassigned patients | Yes | Sees own data | 403 error |

### Test Account Matrix

| Account | Email | Role(s) | Password |
|---------|-------|---------|----------|
| admin | admin@gmail.com | ADMIN | welcome100 |
| adminphy | adminphy@gmail.com | ADMIN + PHYSICIAN | welcome100 |
| phy1 | phy1@gmail.com | PHYSICIAN | welcome100 |
| phy2 | phy2@gmail.com | PHYSICIAN | welcome100 |
| staff1 | staff1@gmail.com | STAFF (single assignment) | welcome100 |
| staff2 | staff2@gmail.com | STAFF (multi-assignment) | welcome100 |

### Strategy: Weave Roles Into Feature Tests

Rather than a separate "role testing phase," each module's tests include role variants where behavior differs:

- **M1 Auth:** Data scoping tests per role (Jest), API 403 tests (Cypress)
- **M2 Grid:** Toolbar button visibility per role (Vitest), column editability per role (Cypress)
- **M3 Colors:** Role-agnostic (pure logic) — multi-role E2E in `row-color-roles.cy.ts`
- **M4 Import:** Non-admin conflict flow (Playwright) — read-only banner for Physician/Staff
- **M5 Admin:** Admin-only operations, deactivated user can't login
- **M6 Realtime:** Physician vs Physician concurrent editing
- **M7 Filter:** Per-role patient counts (Staff sees fewer patients than Admin)

---

## 4. Per-Framework Conventions

### Jest (Backend)

```
Location:   backend/src/services/__tests__/*.test.ts
            backend/src/routes/__tests__/*.test.ts
            backend/src/middleware/__tests__/*.test.ts
Command:    cd backend && npm test
ESM:        jest.unstable_mockModule() + dynamic imports
HTTP tests: supertest with mock middleware
```

**Patterns:**
- Import from `@jest/globals` (`describe`, `it`, `expect`, `beforeEach`, `jest`)
- Use `.js` extension in imports for ESM compatibility
- Mock Prisma via `jest.unstable_mockModule('@prisma/client', ...)`
- Group related tests in nested `describe` blocks
- Use `beforeEach` to reset mocks

### Vitest (Frontend)

```
Location:   frontend/src/components/**/*.test.tsx
            frontend/src/pages/*.test.tsx
            frontend/src/stores/*.test.ts
            frontend/src/config/*.test.ts
Command:    cd frontend && npm run test:run
Interaction: userEvent (NOT fireEvent)
```

**Patterns:**
- Import from `vitest` (`describe`, `it`, `expect`, `vi`, `beforeEach`)
- Use `@testing-library/react` for rendering + queries
- **Always use `userEvent.setup()` for interactions** (not `fireEvent`)
- Fake timers: `vi.useFakeTimers()` with `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`
- Mock API calls with `vi.mock('axios')` or MSW
- Use `baseRow` fixtures for statusColors tests
- Use `defaultCounts` fixtures for StatusFilterBar tests

### Playwright (E2E)

```
Location:   frontend/e2e/*.spec.ts
Page Objects: frontend/e2e/pages/main-page.ts, login-page.ts
Command:    cd frontend && npm run e2e
Config:     frontend/playwright.config.ts
```

**Patterns:**
- Page Object Model: `MainPage`, `LoginPage` with helper methods
- `await mainPage.goto()` → `await mainPage.waitForGridLoad()`
- Use `expect(locator).toBeVisible()` / `.toHaveText()` assertions
- **No `page.waitForTimeout()`** — use proper Playwright waits
- Multi-user tests: use `browser.newContext()` for second user

### Cypress (AG Grid E2E)

```
Location:   frontend/cypress/e2e/*.cy.ts
Commands:   frontend/cypress/support/commands.ts
Command:    cd frontend && npm run cypress:run --headed
Config:     frontend/cypress.config.ts
```

**Patterns:**
- Custom commands: `cy.login(email, password)`, `cy.waitForAgGrid()`, `cy.addTestRow(name)`, `cy.selectAgGridDropdown(row, col, value)`, `cy.getAgGridCell(row, col)`, `cy.findRowByMemberName(name)`
- **Always run `--headed`** so user can watch
- Use `cy.wait(300-500)` for AG Grid transition timing (documented necessity — AG Grid doesn't expose transition events)
- Use `window.__agGridApi.startEditingCell()` for reliable dropdown opening
- Unique test row names: `{runId}{counter}-{prefix}, E2E` to prevent cross-test pollution

### Parameterized Test Pattern

For status/color mappings with many similar cases:

```typescript
// Vitest
const cases = [
  { status: 'AWV completed', expected: 'green' },
  { status: 'AWV scheduled', expected: 'blue' },
  // ...
];
cases.forEach(({ status, expected }) => {
  it(`maps "${status}" to ${expected}`, () => {
    expect(getRowStatusColor({ ...baseRow, measureStatus: status })).toBe(`row-status-${expected}`);
  });
});
```

### Boundary Test Pattern

For overdue/date edge cases:

```typescript
// Vitest with fake timers
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-01'));
});

it('NOT overdue when dueDate = today', () => {
  expect(isRowOverdue({ ...baseRow, dueDate: '2026-03-01' })).toBe(false);
});

it('IS overdue when dueDate = yesterday', () => {
  expect(isRowOverdue({ ...baseRow, dueDate: '2026-02-28' })).toBe(true);
});
```

---

## 5. Coverage Targets

### Per-Module Targets

| Module | Baseline | New (T1+T2) | Target | Primary Frameworks |
|--------|--------:|------------:|-------:|-------------------|
| M1 Auth & Security | ~288 | ~24 | ~312 | Jest |
| M2 Patient Grid | ~460 | ~27 | ~487 | Vitest, Cypress |
| M3 Quality Measures & Colors | ~542 | ~37 | ~579 | Vitest, Jest |
| M4 Import Pipeline | ~1,359 | ~14 | ~1,373 | Jest, Playwright |
| M5 Admin & User Mgmt | ~282 | ~11 | ~293 | Jest, Playwright |
| M6 Realtime Collab | ~129 | ~13 | ~142 | Vitest, Playwright |
| M7 Filtering & Search | ~326 | ~28 | ~354 | Cypress |

### Priority Tiers

| Tier | Tests | Description |
|------|------:|-------------|
| **Tier 1 (Must Have)** | ~60 | User-visible breakage, security, data integrity |
| **Tier 2 (Should Have)** | ~94 | Important but partially-tested areas |
| **Tier 3 (Nice to Have)** | ~14 | Login assignments, JWT expiration, a11y, responsive |
| **Recommended scope** | **~154** | **Tier 1 + Tier 2** |

---

## 6. Execution Phases

### Phase 1: Core Visual & Security (Tier 1, items 1-8) — ~54 tests

| Task | Framework | File | Tests | Roles |
|------|-----------|------|------:|-------|
| Depression Screening colors | Vitest | `statusColors.test.ts` | 6 | N/A |
| Chronic DX attestation cascade | Vitest | `statusColors.test.ts` | 8 | N/A |
| Overdue boundary conditions | Vitest | `statusColors.test.ts` | 4 | N/A |
| Cascading dropdown clears | Vitest | `cascadingFields.test.ts` | 6 | N/A |
| 409 conflict recovery | Cypress | `cell-editing-conflict.cy.ts` | 8 | Admin + Physician |
| Role-based data scoping | Jest | `data.routes.test.ts` | 3 | Staff (3 new edge cases) |
| Password reset security | Jest | `auth.routes.test.ts` | 2 | All |
| Combined filters | Cypress | `combined-filters.cy.ts` | 8 | Admin + Staff |
| CORS configuration | Jest | `cors.test.ts` | 4 | N/A (infra) |
| Helmet security headers | Jest | `security-headers.test.ts` | 5 | N/A (infra) |

### Phase 2: Role-Specific UI & E2E Flows (Tier 1 items 9-11, Tier 2 items 12-17) — ~53 tests

| Task | Framework | File | Tests | Roles |
|------|-----------|------|------:|-------|
| Toolbar edge cases | Vitest | `Toolbar.test.tsx` | 3 | N/A (role-agnostic) |
| Non-admin import conflict flow | Playwright | `import-all-roles.spec.ts` | 6 | Physician, Staff |
| Row add/delete E2E | Cypress | `row-operations.cy.ts` | 6 | Admin + Staff |
| Duplicate detection edges | Jest | `duplicateDetector.test.ts` | 4 | N/A |
| Due date calculation chain | Jest | `dueDateCalculator.test.ts` | 8 | N/A |
| Tracking field validation | Vitest | `dropdownConfig.test.ts` | 5 | N/A |
| WebSocket reconnection | Vitest | `useSocket.test.ts` + `socketManager.test.ts` | 7 | N/A |
| Concurrent edit modal | Vitest + Playwright | `conflictFlow.test.tsx` + `parallel-editing-conflict.spec.ts` | 6 | Physician vs Physician |
| Import conflict detection | Jest | `conflictDetector.test.ts` | 8 | N/A |

### Phase 3: Admin, Audit & Role-Aware Filters (Tier 2 items 18-24) — ~47 tests

| Task | Framework | File | Tests | Roles |
|------|-----------|------|------:|-------|
| User deactivation cascade | Jest + Playwright | `admin.routes.test.ts` / `admin.spec.ts` | 5 | Admin + deactivated |
| Audit logging | Jest | `auth.routes.test.ts` | 7 | System |
| Password change + mustChangePassword | Jest + Vitest | `auth.routes.test.ts` / `ProtectedRoute.test.tsx` | 3 | All |
| Audit log filtering (M5) | Jest | `admin.routes.test.ts` | 3 | Admin |
| Role validation (M5) | Jest | `admin.routes.test.ts` | 3 | N/A (pure logic) |
| Filter chip count sync | Cypress | `status-filter-bar.cy.ts` | 6 | Admin + Staff |
| Sort + filter preservation | Cypress | `sort-filter-interaction.cy.ts` | 8 | Admin |
| Combined filters per role | Cypress | `combined-filters-roles.cy.ts` | 6 | Staff + Admin |
| Grid editing permissions per role | Cypress | `grid-editing-roles.cy.ts` | 6 | Admin, Physician, Staff |

### Phase 4: Tier 3 (if time permits) — ~14 tests

M1 Tier 3 (7 tests: login assignments, JWT expiration, deactivated user checks) + M7 Tier 3 (7 tests: keyboard a11y, narrow viewport). Only after Phases 1-3 complete and passing.

---

## 7. Verification Protocol

After each phase completes:

```bash
# 1. Run full 4-layer pyramid
cd backend && npm test                    # Layer 1: Jest
cd frontend && npm run test:run           # Layer 2: Vitest
cd frontend && npm run e2e               # Layer 3: Playwright
cd frontend && npm run cypress:run       # Layer 4: Cypress (--headed)

# 2. Verify zero regressions in existing suites
# 3. Compare test counts against baseline
# 4. Update .claude/REGRESSION_TEST_PLAN.md
# 5. Update .claude/TESTING.md inventory
```

---

## 8. Module Test Plans

Detailed test plans for each module follow. Each module section maps testable behaviors from its requirement spec to specific test files and frameworks, identifies the exact gaps to fill, and specifies the tests to write.

### Module Sections

Each module has its own detailed test plan file in `.claude/test-plans/`.

| Section | Module | Test Plan File | Spec | Status |
|---------|--------|---------------|------|--------|
| 8.1 | M2 Patient Grid | [`M2-patient-grid.md`](test-plans/M2-patient-grid.md) | `test-patient-grid/` | COMPLETE |
| 8.2 | M3 Quality Measures & Colors | [`M3-quality-measures-colors.md`](test-plans/M3-quality-measures-colors.md) | `test-quality-measures-colors/` | COMPLETE |
| 8.3 | M1 Auth & Security | [`M1-auth-security.md`](test-plans/M1-auth-security.md) | `test-auth-security/` | COMPLETE |
| 8.4 | M4 Import Pipeline | [`M4-import-pipeline.md`](test-plans/M4-import-pipeline.md) | `test-import-pipeline/` | COMPLETE |
| 8.5 | M7 Filtering & Search | [`M7-filtering-search.md`](test-plans/M7-filtering-search.md) | `test-filtering-search/` | COMPLETE |
| 8.6 | M5 Admin & User Mgmt | [`M5-admin-management.md`](test-plans/M5-admin-management.md) | `test-admin-management/` | COMPLETE |
| 8.7 | M6 Realtime Collaboration | [`M6-realtime-collaboration.md`](test-plans/M6-realtime-collaboration.md) | `test-realtime-collaboration/` | COMPLETE |

---

See individual test plan files linked in the table above. Each file contains:
- Current coverage inventory with test counts
- Planned new tests with tier, test names, implementation patterns, and role coverage
- Deferred items (Tier 3) with rationale
- Done criteria checklist

---

## Appendix A: Module-Level Done Criteria

| Module | Done When | Role Coverage |
|--------|-----------|---------------|
| M1 Auth | STAFF data scoping, password reset (SMTP + deactivated), audit logging, CORS, Helmet all tested | Staff edge cases verified; account lockout already covered (6 existing tests) |
| M2 Grid | 409 recovery, row CRUD E2E, duplicate edges, toolbar button states per role tested | Vitest: button visibility for 3 roles; Cypress: edit/add/delete as Admin + Staff |
| M3 Colors | All 7 Depression Screening colors, attestation cascade, overdue boundaries, cascading clears, tracking field validation, due date chain tested | Colors are role-agnostic (pure logic); no per-role testing needed |
| M4 Import | Hill + Sutter conflict detection, non-admin conflict flow tested | Admin: interactive form; Physician + Staff: read-only banner verified |
| M5 Admin | Deactivation cascade, role change effects tested | Admin-only operations; deactivated user can't re-login |
| M6 Realtime | Reconnection, conflict modal, stale lock cleanup tested | Physician vs Physician concurrent edit |
| M7 Filter | Combined filters, chip sync, sort preservation, per-role patient counts tested | Admin (all patients) vs Staff (assigned only) |

## Appendix B: Execution Workflow

For each phase:
1. Break gaps into atomic test-writing tasks
2. Write tests following TDD: red (failing test) → green (minimal code) → refactor
3. Run affected test suite to confirm green
4. After all tasks done, run full 4-layer pyramid
5. Update `REGRESSION_TEST_PLAN.md` and `TESTING.md`
6. Include test count in commit message

## Appendix C: Traceability

Each test added in this remediation should reference its gap ID from the module requirement spec:

```typescript
// Gap: GAP-2.1 (Depression Screening not in multi-role E2E)
it('Depression Screening Called to schedule shows blue as PHYSICIAN', () => { ... });
```

This enables future audits to trace from requirement → gap → test.
