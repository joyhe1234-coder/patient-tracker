# Code Quality Improvement Plan

> Last Updated: 2026-02-11

## Overview

Comprehensive code quality scan and improvement plan for the Patient Tracker project. Each phase is designed to be tackled independently, in order of risk (safest first), with tests run after each step to avoid introducing regressions.

**Ground Rules:**
- One phase at a time — run full test suite after each
- No behavior changes unless explicitly noted
- Each phase produces a single commit on `develop`

---

## Phase 1: Duplicate Code Consolidation

Scan for duplicated logic — similar functions, repeated patterns, or copy-pasted blocks. Consolidate into shared modules.

### 1.1 Date Formatting Functions (HIGH)
- `formatDate()` is copy-pasted identically in `PatientGrid.tsx` and `StatusDateRenderer.tsx`
- `formatDateForEdit()` and `formatTodayDisplay()` are variations of the same logic
- `AdminPage.tsx` has its own `formatDate` variant
- **Action:** Create `frontend/src/utils/dateFormatter.ts` with shared exports; update all imports

### 1.2 Inline Status Arrays (HIGH)
- `hgba1cStatuses` and `bpStatuses` arrays are redefined 6-9 times inline within `PatientGrid.tsx`
- **Action:** Export from `frontend/src/config/dropdownConfig.ts`; replace all inline definitions with imports

### 1.3 CSS Stripe Pattern (MEDIUM)
- Diagonal stripe `background-image` is duplicated exactly in `.cell-disabled` and `.cell-prompt` in `index.css`
- **Action:** Extract shared `.stripe-overlay` base class; compose into both selectors

### 1.4 Backend Duplicate Check Logic (MEDIUM)
- `data.routes.ts` line ~686 reimplements duplicate detection instead of calling `checkForDuplicate()` from `duplicateDetector.ts`
- **Action:** Replace inline query with service function call

### 1.5 Auth Verification Pattern (LOW)
- `auth.ts` and `socketAuth.ts` share similar token extraction + user lookup logic
- **Action:** Extract common `verifyTokenAndLoadUser()` helper if pattern expands further; document for now

### 1.6 Date Parsing Logic (LOW)
- `PatientGrid.tsx` has `parseAndValidateDate()` (84 lines) — complex but only used in one place
- **Action:** Extract to `frontend/src/utils/dateParser.ts` for testability; no logic change

---

## Phase 2: Database & Query Optimization

Review Prisma calls for N+1 issues, missing indexes, repeated query patterns, and transaction safety.

### 2.1 N+1 in Duplicate Detection (HIGH)
- `duplicateDetector.ts:73` — individual `prisma.patientMeasure.update()` per empty-field row inside a loop
- Called after every create/update/delete
- **Action:** Collect empty-measure IDs, batch into single `updateMany()`

### 2.2 Missing Compound Index (HIGH)
- Duplicate detection queries filter on `(patientId, requestType, qualityMeasure)` but no compound index exists
- **Action:** Add `@@index([patientId, requestType, qualityMeasure])` to schema; run migration

### 2.3 Missing AuditLog Compound Index (MEDIUM)
- `versionCheck.ts` queries `auditLog` by `(entity, entityId, action, createdAt)` — no compound index
- **Action:** Add compound index; run migration

### 2.4 Transaction Safety: Bulk Assign (MEDIUM)
- `admin.routes.ts` bulk patient reassignment updates patients then creates audit log without transaction
- If audit log creation fails, update succeeds — data inconsistency
- **Action:** Wrap in `prisma.$transaction()`

### 2.5 N+1 in Version Check (LOW)
- `versionCheck.ts:138` — fetches audit logs then manually extracts field names in nested loop
- **Action:** Simplify extraction logic; low impact since only triggered on conflicts

### 2.6 Missing requestType Index (LOW)
- `PatientMeasure.requestType` used in queries but has no standalone index
- **Action:** Add `@@index([requestType])` to schema

---

## Phase 3: Maintainability — Large File Decomposition

Identify large files (200+ lines), deeply nested logic, and tightly coupled modules. Break into smaller, focused units.

### 3.1 PatientGrid.tsx (1,351 lines) (HIGH)
- Monolithic component handling grid rendering, cell editing, cascading updates, conflict resolution, and remote sync
- `onCellValueChanged` alone is 140+ lines with 6+ nesting levels
- **Action (incremental):**
  1. Extract `useGridCellUpdate.ts` custom hook (onCellValueChanged logic)
  2. Extract `cascadingFields.ts` utility (requestType/qualityMeasure/measureStatus cascading)
  3. Extract `useRemoteEditClass.ts` hook (remote edit indicator logic)
  4. Keep PatientGrid as thin orchestrator

### 3.2 AdminPage.tsx (917 lines) (HIGH)
- Contains two tabs (Users + Audit Log) and two embedded modal components
- **Action:**
  1. Extract `UserModal.tsx` component
  2. Extract `ResetPasswordModal.tsx` component
  3. Optionally split into `AdminUsersTab.tsx` and `AdminAuditTab.tsx`

### 3.3 data.routes.ts (855 lines) (MEDIUM)
- All CRUD operations + conflict handling + version management in one file
- **Action:** Extract handlers into controller functions or split into per-operation files

### 3.4 admin.routes.ts (769 lines) (MEDIUM)
- Mixes user management, staff assignment, audit log retrieval, and bulk reassignment
- **Action:** Split into focused route files (userRoutes, staffRoutes, auditRoutes)

### 3.5 ImportPreviewPage.tsx (705 lines) (LOW)
- Complex import workflow with multiple state machines
- **Action:** Extract `PreviewTable`, `ReassignmentWarning`, `ImportResults` components

### 3.6 diffCalculator.ts (616 lines) (LOW)
- Diff calculation, filtering, and compliance logic combined
- **Action:** Extract `ComplianceAnalyzer` and `ReassignmentDetector` if needed

---

## Phase 4: Error Handling & Async Safety

Standardize error handling, fix async issues, and add proper cleanup.

### 4.1 setTimeout Memory Leaks (MEDIUM)
- 6+ locations use `setTimeout` for state resets without cleanup on unmount
- Files: `MainPage.tsx`, `PatientGrid.tsx`, `AdminPage.tsx`
- **Action:** Store timeout IDs in refs; clear in useEffect cleanup

### 4.2 Unhandled Async in useEffect (MEDIUM)
- `MainPage.tsx:232` — `loadData()` called without await in socket handler
- Other callbacks trigger async without error boundaries
- **Action:** Wrap async calls in try/catch or use error boundary pattern

### 4.3 useEffect Dependency Staleness (MEDIUM)
- `MainPage.tsx:165-167` — `loadData()` depends on `getQueryParams()` but that function is not in the dependency array
- **Action:** Add missing dependency or move function inside effect

### 4.4 Inconsistent Error Patterns (LOW)
- Backend: some services throw, others return null/undefined
- Frontend: error casting uses `as { response?: {...} }` instead of type guards
- **Action:** Standardize to typed error approach; use `isAxiosError()` guard

---

## Phase 5: TypeScript Strictness

Strengthen types, reduce `any` usage, and add missing annotations.

### 5.1 Reduce `as any` in Tests (MEDIUM)
- `AutoOpenSelectEditor.test.tsx` has 25+ `as any` casts for mock AG Grid params
- `StatusDateRenderer.test.tsx`, `DateCellEditor.test.tsx` have similar patterns
- **Action:** Create `frontend/src/test-utils/agGridMocks.ts` with typed mock factories

### 5.2 Replace `Record<string, unknown>` (MEDIUM)
- Used in `admin.routes.ts`, `PatientGrid.tsx`, `AdminPage.tsx` for flexible data
- **Action:** Create specific types or discriminated unions where possible

### 5.3 Weak Error Type Assertions (LOW)
- `PatientGrid.tsx:626-634` casts error to complex inline type
- **Action:** Use `isAxiosError()` type guard from axios

### 5.4 Magic Strings (LOW)
- Save status values (`'idle'`, `'saving'`, `'saved'`, `'error'`) used in 10+ places
- **Action:** Create `SaveStatus` type union or enum

### 5.5 Missing Return Type Annotations (LOW)
- Many helper functions rely on type inference
- **Action:** Add explicit return types to exported functions

---

## Phase 6: Console Logging & Observability

Replace ad-hoc console statements with structured logging.

### 6.1 Production Console Statements (MEDIUM)
- 40+ `console.log/error/warn` statements across backend and frontend
- Backend: `index.ts`, `errorHandler.ts`, `emailService.ts`, `socketManager.ts`
- Frontend: `axios.ts`, `PatientGrid.tsx`, `AdminPage.tsx`, `MainPage.tsx`
- **Action:** Create logger utility; in dev: log to console; in prod: structured output
- **Scope:** Backend first (more critical), then frontend

---

## Phase 7: CSS Quality

Clean up CSS specificity and reduce override reliance.

### 7.1 Excessive `!important` (LOW)
- 33 `!important` declarations in `index.css`
- Most are needed to override AG Grid's inline styles
- **Action:** Evaluate which can be replaced with higher-specificity selectors (e.g., `.ag-theme-alpine .ag-row.row-status-gray`); document the ones that genuinely need `!important` for AG Grid overrides

### 7.2 Inline Styles (LOW)
- `PatientGrid.tsx:1313` — `style={{ width: '100%', height: 'calc(100vh - 200px)' }}`
- `PatientManagementPage.tsx` — tab visibility toggled with inline styles
- **Action:** Move to CSS classes

---

## Phase 8: Security Hardening

Review authentication, input validation, and dependency security.

### 8.1 Input Sanitization on Config Endpoints (LOW)
- `config.routes.ts` accepts URL params without trim/empty checks
- Prisma prevents SQL injection, but empty strings could cause unexpected behavior
- **Action:** Add basic validation (trim, empty check) on all URL params

### 8.2 Dependency Audit (LOW)
- Run `npm audit` on both frontend and backend
- **Action:** Update vulnerable dependencies; document any that can't be updated

### 8.3 Sensitive Data in Error Logs (LOW)
- `frontend/src/api/axios.ts:29-35` — error interceptor may log sensitive request data
- **Action:** Sanitize logged data (strip auth headers, truncate bodies)

---

## Phase 9: Performance

Profile and optimize hot paths.

### 9.1 Grid Re-render Optimization (LOW)
- PatientGrid may re-render unnecessarily on state changes
- **Action:** Profile with React DevTools; add `useMemo`/`useCallback` where measurable

### 9.2 Bundle Size Review (LOW)
- Check for heavy unused imports (tree-shaking effectiveness)
- **Action:** Run `npx vite-bundle-visualizer`; identify large chunks

---

## Phase 10: Test Quality

Audit test coverage gaps and improve test infrastructure.

### 10.1 Shared Test Utilities (MEDIUM)
- AG Grid mock params are copy-pasted across 5+ test files
- **Action:** Create shared mock factories (overlaps with Phase 5.1)

### 10.2 Coverage Gaps (LOW)
- Run coverage reports for frontend and backend
- **Action:** Identify untested critical paths; add tests

### 10.3 Flaky Test Audit (LOW)
- Review Cypress tests for timing-dependent assertions (`cy.wait(500)`)
- **Action:** Replace with proper `should()` assertions where possible

---

## Execution Order

| Step | Phase | Risk | Estimated Scope |
|------|-------|------|----------------|
| 1 | **2.1-2.2** DB: Batch duplicates + compound index | Safe | 2 files + migration |
| 2 | **2.4** DB: Transaction safety | Safe | 1 file |
| 3 | **1.1-1.2** Extract date utils + status constants | Safe | 3-4 files |
| 4 | **1.3** CSS stripe consolidation | Safe | 1 file |
| 5 | **4.1** Fix setTimeout leaks | Safe | 3 files |
| 6 | **4.2-4.3** Fix async/useEffect issues | Safe | 2 files |
| 7 | **3.1** Split PatientGrid.tsx (biggest refactor) | Medium | 4+ new files |
| 8 | **3.2** Extract AdminPage modals | Medium | 3 new files |
| 9 | **5.1** Typed test mock factories | Safe | 5+ test files |
| 10 | **6.1** Logger utility | Low risk | 10+ files |
| 11 | **3.3-3.4** Split route files | Medium | 4+ files |
| 12 | **7-10** CSS, security, perf, test quality | Low | Various |

Each step: implement -> run full test suite -> commit -> next step.
