# Feature: Code Quality Refactor

## Introduction

A comprehensive, incremental code quality improvement across the Patient Tracker codebase, covering 10 phases: duplicate code consolidation, database optimization, large file decomposition, error handling and async safety, TypeScript strictness, logging infrastructure, CSS quality, security hardening, performance optimization, and test quality improvement.

Each phase is designed to be executed independently and safely, with the full test suite run after every change to catch regressions. No user-visible behavior changes are introduced unless explicitly noted. The phases are ordered from safest (database indexes, utility extraction) to medium risk (file decomposition) to low risk (CSS, logging, security).

The refactoring addresses concrete findings documented in `.claude/CODE_QUALITY_PLAN.md`, with specific file paths, line numbers, and duplication counts verified against the current codebase.

## Alignment with Product Vision

The Patient Tracker replaces Excel-based quality measure tracking for medical offices. Code quality directly impacts the team's ability to deliver new features (Phase 10 HgbA1c Goal, Phase 13 Excel-like Behaviors, Phase 14 Additional Features) safely and quickly. Specific alignment points:

- **Reliability**: Database transaction safety (Phase 2) prevents data inconsistency in patient records -- critical in a healthcare context.
- **Performance**: N+1 query elimination and missing indexes (Phase 2) improve response times as patient data grows from pilot to multi-physician production use.
- **Maintainability**: PatientGrid.tsx at 1,351 lines is the most-edited file in the codebase; decomposing it (Phase 3) reduces merge conflicts and makes the cascading dropdown/cell editing logic comprehensible to new contributors.
- **Security**: Input sanitization and error log scrubbing (Phase 8) align with healthcare data handling expectations.
- **Test confidence**: Shared mock factories and flaky test remediation (Phase 10) ensure the 1,816-test suite remains a reliable safety net during future feature development.

## Requirements

### Ground Rules

All phases share these constraints:

- **GR-1**: Each phase produces exactly one commit on the `develop` branch.
- **GR-2**: The full 4-layer test suite (Jest + Vitest + Playwright + Cypress) MUST pass after each phase before committing.
- **GR-3**: No user-visible behavior changes unless the requirement explicitly states otherwise. All refactoring is internal.
- **GR-4**: Phases MUST be executed in the order specified in the Execution Order section. Later phases may depend on extractions performed in earlier phases.
- **GR-5**: If a phase introduces a new shared module (utility, constant, type), it MUST include unit tests for that module.

---

### Phase 1: Duplicate Code Consolidation

**ID:** CQR-P1

**User Story:** As a developer maintaining the Patient Tracker codebase, I want duplicated logic consolidated into shared modules, so that bug fixes and enhancements only need to be made in one place.

#### Requirement 1.1: Extract Shared Date Formatting Utilities

**ID:** CQR-P1-R1

**User Story:** As a developer, I want all date formatting functions in a single shared module, so that formatting behavior is consistent and testable in isolation.

##### Acceptance Criteria

- CQR-P1-R1-AC1: WHEN the refactoring is complete, THEN a new file `frontend/src/utils/dateFormatter.ts` SHALL exist containing the `formatDate()`, `formatDateForEdit()`, and `formatTodayDisplay()` functions, exported as named exports.
- CQR-P1-R1-AC2: WHEN `PatientGrid.tsx` formats a date value, THEN it SHALL import `formatDate` and `formatDateForEdit` from `utils/dateFormatter.ts` instead of defining them locally (currently lines 125 and 142).
- CQR-P1-R1-AC3: WHEN `StatusDateRenderer.tsx` formats a date value, THEN it SHALL import `formatDate` from `utils/dateFormatter.ts` instead of defining it locally (currently line 13).
- CQR-P1-R1-AC4: WHEN `AdminPage.tsx` formats a date value, THEN it SHALL import the shared `formatDate` from `utils/dateFormatter.ts` instead of its local variant (currently line 185).
- CQR-P1-R1-AC5: WHEN the extraction is complete, THEN a test file `frontend/src/utils/__tests__/dateFormatter.test.ts` SHALL exist with tests covering: null input, empty string input, valid ISO date string, date string with time component, and `formatDateForEdit` producing `M/D/YYYY` format (no leading zeros).
- CQR-P1-R1-AC6: All existing tests that exercise date formatting (PatientGrid.test.tsx, StatusDateRenderer.test.tsx, AdminPage.test.tsx) SHALL continue to pass without modification or with only import path changes.

##### Edge Cases

- EC1: The `AdminPage.tsx` `formatDate` variant may have slightly different null-handling logic. IF the implementations differ, THEN the shared function SHALL accommodate both behaviors (e.g., via an options parameter) OR the AdminPage SHALL use a thin wrapper.
- EC2: `parseAndValidateDate()` (84 lines in PatientGrid.tsx) is related but only used in one place. It SHALL be extracted to `frontend/src/utils/dateParser.ts` for testability, with no logic changes.

---

#### Requirement 1.2: Extract Shared Status Arrays to Constants

**ID:** CQR-P1-R2

**User Story:** As a developer, I want `hgba1cStatuses` and `bpStatuses` arrays defined once and imported everywhere, so that adding or renaming a status value does not require finding and updating 6-9 duplicate definitions.

##### Acceptance Criteria

- CQR-P1-R2-AC1: WHEN the refactoring is complete, THEN `frontend/src/config/dropdownConfig.ts` (or a new dedicated constants file) SHALL export `HGBA1C_STATUSES` and `BP_STATUSES` as readonly string arrays.
- CQR-P1-R2-AC2: WHEN any code in `PatientGrid.tsx` checks whether a measure status is an HgbA1c or BP status, THEN it SHALL use the imported constants instead of defining inline arrays. Currently there are 9 inline definitions of `hgba1cStatuses` and 3 of `bpStatuses` in PatientGrid.tsx.
- CQR-P1-R2-AC3: WHEN the extraction is complete, THEN zero inline definitions of `hgba1cStatuses` or `bpStatuses` SHALL remain in `PatientGrid.tsx`.
- CQR-P1-R2-AC4: IF other files (e.g., `statusColors.ts`) also define these arrays inline, THEN they SHALL be updated to use the shared constants.
- CQR-P1-R2-AC5: The exported constants SHALL be typed as `readonly string[]` (or `as const` tuple) to prevent accidental mutation.

##### Edge Cases

- EC1: Some inline definitions include slightly different sets of statuses. Before consolidating, each inline definition MUST be verified to contain the exact same values. Any discrepancy MUST be resolved by checking the Prisma seed data as the source of truth.

---

#### Requirement 1.3: Consolidate CSS Stripe Pattern

**ID:** CQR-P1-R3

**User Story:** As a developer maintaining CSS styles, I want the diagonal stripe overlay pattern defined once, so that adjustments to stripe appearance only need to be made in one place.

##### Acceptance Criteria

- CQR-P1-R3-AC1: WHEN the refactoring is complete, THEN `frontend/src/index.css` SHALL define a `.stripe-overlay` base class (or CSS custom property / mixin) containing the shared diagonal stripe `background-image`, `background-size`, and related properties.
- CQR-P1-R3-AC2: WHEN `.cell-disabled` needs the stripe overlay, THEN it SHALL compose/extend from the shared definition rather than duplicating the `background-image` declaration.
- CQR-P1-R3-AC3: WHEN `.cell-prompt` needs the stripe overlay, THEN it SHALL compose/extend from the shared definition rather than duplicating the `background-image` declaration.
- CQR-P1-R3-AC4: The visual appearance of both `.cell-disabled` and `.cell-prompt` cells SHALL remain identical before and after the refactoring. This SHALL be verified by visual browser review (Layer 5).

---

#### Requirement 1.4: Eliminate Backend Duplicate Check Reimplementation

**ID:** CQR-P1-R4

**User Story:** As a developer, I want the duplicate detection logic in `data.routes.ts` to call the shared `checkForDuplicate()` service function, so that duplicate detection behavior is consistent between routes and services.

##### Acceptance Criteria

- CQR-P1-R4-AC1: WHEN the refactoring is complete, THEN the inline duplicate detection query in `data.routes.ts` (approximately line 686) SHALL be replaced with a call to `checkForDuplicate()` from `duplicateDetector.ts`.
- CQR-P1-R4-AC2: The duplicate detection behavior (same patient + requestType + qualityMeasure) SHALL remain functionally identical after the change.
- CQR-P1-R4-AC3: Existing backend tests for duplicate detection (duplicateDetector.test.ts: 38 tests, data.routes.test.ts) SHALL continue to pass.

##### Edge Cases

- EC1: The inline query in `data.routes.ts` may have subtle differences from `checkForDuplicate()` (e.g., different null handling, different response format). Any differences MUST be reconciled to use the service function's behavior, which is the canonical implementation.

---

#### Requirement 1.5: Document Auth Verification Pattern

**ID:** CQR-P1-R5

**User Story:** As a developer, I want the shared token verification pattern between `auth.ts` and `socketAuth.ts` documented for future extraction.

##### Acceptance Criteria

- CQR-P1-R5-AC1: WHEN the refactoring is complete, THEN a code comment in both `auth.ts` and `socketAuth.ts` SHALL reference the shared pattern and note it as a candidate for extraction if a third verification site is added.
- CQR-P1-R5-AC2: No functional changes SHALL be made to `auth.ts` or `socketAuth.ts` in this phase. This is documentation only.

---

### Phase 2: Database and Query Optimization

**ID:** CQR-P2

**User Story:** As a system administrator deploying the Patient Tracker for a multi-physician clinic, I want database queries optimized with proper indexes, batch operations, and transaction safety, so that the system performs well as data volume grows and maintains data consistency.

#### Requirement 2.1: Batch N+1 Updates in Duplicate Detection

**ID:** CQR-P2-R1

**User Story:** As a developer, I want duplicate flag updates batched into a single query, so that updating 50 patient measures does not execute 50 individual UPDATE statements.

##### Acceptance Criteria

- CQR-P2-R1-AC1: WHEN `duplicateDetector.ts` needs to update `isDuplicate` flags for multiple rows (currently line ~73), THEN it SHALL collect the IDs and use a single `prisma.patientMeasure.updateMany()` call (or a small number of batch calls) instead of individual `update()` calls in a loop.
- CQR-P2-R1-AC2: The number of database queries executed by `syncAllDuplicateFlags()` SHALL be O(1) or O(distinct_groups) rather than O(total_rows).
- CQR-P2-R1-AC3: All 38 existing `duplicateDetector.test.ts` tests SHALL continue to pass.
- CQR-P2-R1-AC4: The duplicate detection behavior (which rows are flagged, which are unflagged) SHALL remain identical.

##### Edge Cases

- EC1: If a single `updateMany` cannot express the required conditions (some rows set to true, others to false), THEN two `updateMany` calls (one for true, one for false) are acceptable.
- EC2: Empty result sets (no rows to update) SHALL be handled gracefully without executing unnecessary queries.

---

#### Requirement 2.2: Add Compound Index for Duplicate Detection Queries

**ID:** CQR-P2-R2

**User Story:** As a system administrator, I want duplicate detection queries to use an efficient compound index, so that query performance does not degrade as the patient measure table grows.

##### Acceptance Criteria

- CQR-P2-R2-AC1: WHEN the migration is applied, THEN a compound index `@@index([patientId, requestType, qualityMeasure])` SHALL exist on the `PatientMeasure` model in `schema.prisma`.
- CQR-P2-R2-AC2: A Prisma migration file SHALL be generated and applied successfully against the development database.
- CQR-P2-R2-AC3: The migration SHALL be additive only (CREATE INDEX) with no destructive schema changes.
- CQR-P2-R2-AC4: All existing backend tests SHALL pass after the migration.

---

#### Requirement 2.3: Add Compound Index for Audit Log Queries

**ID:** CQR-P2-R3

**User Story:** As a developer, I want audit log version-check queries to be indexed, so that conflict detection does not slow down as the audit log grows.

##### Acceptance Criteria

- CQR-P2-R3-AC1: WHEN the migration is applied, THEN a compound index `@@index([entity, entityId, action, createdAt])` SHALL exist on the `AuditLog` model in `schema.prisma`.
- CQR-P2-R3-AC2: The migration SHALL be generated alongside CQR-P2-R2 in the same migration file (single migration for all index additions).
- CQR-P2-R3-AC3: Existing AuditLog query patterns in `versionCheck.ts` SHALL benefit from the new index without code changes.

---

#### Requirement 2.4: Add requestType Index

**ID:** CQR-P2-R4

**User Story:** As a developer, I want the `requestType` field indexed to support filtering queries.

##### Acceptance Criteria

- CQR-P2-R4-AC1: WHEN the migration is applied, THEN an index `@@index([requestType])` SHALL exist on the `PatientMeasure` model.
- CQR-P2-R4-AC2: This index SHALL be included in the same migration as CQR-P2-R2 and CQR-P2-R3.

---

#### Requirement 2.5: Wrap Bulk Assign in Transaction

**ID:** CQR-P2-R5

**User Story:** As a system administrator performing bulk patient reassignment, I want the operation to be atomic, so that if the audit log creation fails the patient updates are also rolled back.

##### Acceptance Criteria

- CQR-P2-R5-AC1: WHEN the bulk patient reassignment endpoint in `admin.routes.ts` executes, THEN the patient updates AND audit log creation SHALL be wrapped in a single `prisma.$transaction()` call.
- CQR-P2-R5-AC2: IF any operation within the transaction fails, THEN ALL changes (patient updates and audit logs) SHALL be rolled back.
- CQR-P2-R5-AC3: The API response SHALL remain identical (same status codes, same response body format).
- CQR-P2-R5-AC4: Existing admin.routes.test.ts tests (30 tests) SHALL continue to pass.

##### Edge Cases

- EC1: Transaction timeout -- if a bulk assignment involves a large number of patients, the transaction MUST complete within Prisma's default timeout (or a configured extended timeout).
- EC2: Partial failure -- if one patient update succeeds but a subsequent audit log fails, the entire transaction rolls back. The API SHALL return a 500 error indicating the operation failed.

---

#### Requirement 2.6: Simplify Version Check Extraction Logic

**ID:** CQR-P2-R6

**User Story:** As a developer, I want the nested loop in `versionCheck.ts` simplified for readability.

##### Acceptance Criteria

- CQR-P2-R6-AC1: WHEN the refactoring is complete, THEN the field-name extraction logic in `versionCheck.ts` (line ~138) SHALL use a simpler approach (e.g., `flatMap`, `Set`, or direct property access) instead of nested iteration.
- CQR-P2-R6-AC2: The conflict detection behavior SHALL remain identical.
- CQR-P2-R6-AC3: Existing versionCheck.test.ts tests (2 tests) SHALL continue to pass.

---

### Phase 3: Large File Decomposition

**ID:** CQR-P3

**User Story:** As a developer working on grid features, admin functionality, or API routes, I want large monolithic files broken into focused, single-responsibility modules, so that I can understand, test, and modify individual concerns without navigating 700-1,300+ line files.

#### Requirement 3.1: Decompose PatientGrid.tsx (1,351 lines)

**ID:** CQR-P3-R1

**User Story:** As a developer, I want the PatientGrid component split into a thin orchestrator with extracted hooks and utilities, so that the cell editing, cascading update, and remote sync logic can each be understood and tested independently.

##### Acceptance Criteria

- CQR-P3-R1-AC1: WHEN the decomposition is complete, THEN a new custom hook `frontend/src/components/grid/hooks/useGridCellUpdate.ts` SHALL exist containing the `onCellValueChanged` logic (currently ~140 lines with 6+ nesting levels).
- CQR-P3-R1-AC2: WHEN the decomposition is complete, THEN a new utility `frontend/src/components/grid/utils/cascadingFields.ts` SHALL exist containing the requestType/qualityMeasure/measureStatus cascading clearing logic.
- CQR-P3-R1-AC3: WHEN the decomposition is complete, THEN a new custom hook `frontend/src/components/grid/hooks/useRemoteEditClass.ts` SHALL exist containing the remote edit indicator class logic.
- CQR-P3-R1-AC4: WHEN the decomposition is complete, THEN `PatientGrid.tsx` SHALL be reduced to under 600 lines, acting as a thin orchestrator that imports and composes the extracted modules.
- CQR-P3-R1-AC5: All 50 existing `PatientGrid.test.tsx` tests SHALL continue to pass without modification to test logic (only import paths may change).
- CQR-P3-R1-AC6: All 342 Cypress E2E tests SHALL continue to pass, verifying end-to-end grid behavior is unchanged.
- CQR-P3-R1-AC7: Each extracted module SHALL have its own unit test file with tests covering the extracted logic.

##### Edge Cases

- EC1: The `onCellValueChanged` handler references multiple pieces of component state (rows, gridApi, physicianId, etc.). The extracted hook MUST accept these as parameters or use a shared context to avoid prop-drilling.
- EC2: The cascading fields logic is tightly coupled with the AG Grid API (setting cell values, refreshing cells). The extraction MUST define a clear interface boundary (e.g., callbacks for grid operations) to keep the utility testable without AG Grid.
- EC3: The column definition array (~400 lines) may be extracted as a separate configuration module. This is OPTIONAL but encouraged if it further reduces PatientGrid.tsx.

---

#### Requirement 3.2: Decompose AdminPage.tsx (917 lines)

**ID:** CQR-P3-R2

**User Story:** As a developer, I want the AdminPage's embedded modal components and tab contents extracted into separate files, so that each concern can be developed and tested independently.

##### Acceptance Criteria

- CQR-P3-R2-AC1: WHEN the decomposition is complete, THEN a new component `frontend/src/components/modals/UserModal.tsx` SHALL exist containing the user create/edit modal logic.
- CQR-P3-R2-AC2: WHEN the decomposition is complete, THEN a new component `frontend/src/components/modals/ResetPasswordModal.tsx` SHALL exist containing the password reset modal logic.
- CQR-P3-R2-AC3: WHEN the decomposition is complete, THEN `AdminPage.tsx` SHALL be reduced to under 500 lines.
- CQR-P3-R2-AC4: All 12 existing `AdminPage.test.tsx` tests SHALL continue to pass.
- CQR-P3-R2-AC5: All 31 `role-access-control.cy.ts` Cypress tests SHALL continue to pass.

##### Edge Cases

- EC1: The modals share state with the parent AdminPage (selected user, refresh callbacks). The extracted modals SHALL accept props for the data they need and callbacks for mutations.

---

#### Requirement 3.3: Decompose data.routes.ts (855 lines)

**ID:** CQR-P3-R3

**User Story:** As a developer, I want API route handlers organized by operation type, so that finding and modifying a specific endpoint does not require scanning an 855-line file.

##### Acceptance Criteria

- CQR-P3-R3-AC1: WHEN the decomposition is complete, THEN route handlers SHALL be organized into focused modules (e.g., controller functions or separate files for CRUD operations, conflict handling, and version management).
- CQR-P3-R3-AC2: The Express router definition SHALL remain in `data.routes.ts` as the entry point, importing handler functions from the extracted modules.
- CQR-P3-R3-AC3: All API endpoint URLs and HTTP methods SHALL remain unchanged.
- CQR-P3-R3-AC4: All 24 existing `data.routes.test.ts` tests SHALL continue to pass.

---

#### Requirement 3.4: Decompose admin.routes.ts (769 lines)

**ID:** CQR-P3-R4

**User Story:** As a developer, I want admin route handlers split by domain (user management, staff assignment, audit log, bulk reassignment), so that each domain's logic is self-contained.

##### Acceptance Criteria

- CQR-P3-R4-AC1: WHEN the decomposition is complete, THEN admin route handlers SHALL be split into focused modules (e.g., `userHandlers.ts`, `staffHandlers.ts`, `auditHandlers.ts`).
- CQR-P3-R4-AC2: The Express router definition SHALL remain in `admin.routes.ts` as the entry point.
- CQR-P3-R4-AC3: All API endpoint URLs, HTTP methods, and middleware chains SHALL remain unchanged.
- CQR-P3-R4-AC4: All 30 existing `admin.routes.test.ts` tests SHALL continue to pass.

---

#### Requirement 3.5: Decompose ImportPreviewPage.tsx (705 lines)

**ID:** CQR-P3-R5

**User Story:** As a developer, I want the ImportPreviewPage's sub-sections extracted into focused components.

##### Acceptance Criteria

- CQR-P3-R5-AC1: WHEN the decomposition is complete, THEN at least two sub-components SHALL be extracted (e.g., `PreviewSummaryCards.tsx`, `PreviewChangesTable.tsx`, `ImportResultsDisplay.tsx`).
- CQR-P3-R5-AC2: WHEN the decomposition is complete, THEN `ImportPreviewPage.tsx` SHALL be reduced to under 400 lines.
- CQR-P3-R5-AC3: All 23 existing `ImportPreviewPage.test.tsx` tests SHALL continue to pass.

---

### Phase 4: Error Handling and Async Safety

**ID:** CQR-P4

**User Story:** As a developer, I want memory leaks from uncleaned setTimeout calls fixed and async error handling standardized, so that the application does not leak timers on component unmount and unhandled promise rejections are caught.

#### Requirement 4.1: Fix setTimeout Memory Leaks

**ID:** CQR-P4-R1

**User Story:** As a developer, I want all setTimeout calls in React components to be cleaned up on unmount, so that state updates on unmounted components do not cause memory leaks or React warnings.

##### Acceptance Criteria

- CQR-P4-R1-AC1: WHEN a component using `setTimeout` for state resets (MainPage.tsx, PatientGrid.tsx, AdminPage.tsx, Header.tsx, ResetPasswordPage.tsx) unmounts before the timeout fires, THEN the timeout SHALL be cleared via `clearTimeout` in a `useEffect` cleanup function or equivalent pattern.
- CQR-P4-R1-AC2: The timeout IDs SHALL be stored in React refs (e.g., `useRef<ReturnType<typeof setTimeout>>()`) to persist across renders.
- CQR-P4-R1-AC3: The save status reset behavior (idle after 2-3 seconds) SHALL remain functionally identical. The user-visible timing SHALL not change.
- CQR-P4-R1-AC4: There are currently 15 `setTimeout` calls across 5 component files (excluding test files and toast utility). All 15 SHALL be audited and cleaned up.

##### Edge Cases

- EC1: The `AutoOpenSelectEditor.tsx` uses `setTimeout(() => stopEditing(), 0)` as a microtask delay. This is a valid pattern for AG Grid editor lifecycle and does NOT need cleanup because it fires synchronously within the same event loop tick.
- EC2: The `toast.ts` utility uses `setTimeout` for toast dismissal. Since toasts are DOM-appended elements (not React state), cleanup is handled by element removal. These do NOT need `useEffect` cleanup.

---

#### Requirement 4.2: Fix Unhandled Async in useEffect

**ID:** CQR-P4-R2

**User Story:** As a developer, I want async calls in useEffect callbacks and socket handlers wrapped in error handling, so that rejected promises are caught and surfaced.

##### Acceptance Criteria

- CQR-P4-R2-AC1: WHEN `MainPage.tsx` calls `loadData()` from a socket event handler (line ~232), THEN the call SHALL be wrapped in a try/catch block, with errors surfaced via the existing toast notification utility.
- CQR-P4-R2-AC2: WHEN any `useEffect` in MainPage.tsx, PatientGrid.tsx, or AdminPage.tsx calls an async function, THEN the async function SHALL be defined inside the effect and invoked with `.catch()` error handling, OR the effect SHALL use the async IIFE pattern with try/catch.
- CQR-P4-R2-AC3: No unhandled promise rejections SHALL be introduced. If an existing unhandled rejection is identified, it SHALL be wrapped in error handling.

---

#### Requirement 4.3: Fix useEffect Dependency Staleness

**ID:** CQR-P4-R3

**User Story:** As a developer, I want useEffect dependency arrays to be correct and complete, so that effects re-run when their dependencies change and ESLint exhaustive-deps warnings are eliminated.

##### Acceptance Criteria

- CQR-P4-R3-AC1: WHEN `MainPage.tsx` defines a `useEffect` that calls `loadData()` (which depends on `getQueryParams()`), THEN `getQueryParams` SHALL either be included in the dependency array, memoized with `useCallback`, or moved inside the effect.
- CQR-P4-R3-AC2: The fix SHALL NOT change the effect's firing frequency in a way that causes unnecessary API calls or infinite re-render loops.
- CQR-P4-R3-AC3: After the fix, running the frontend with ESLint's `react-hooks/exhaustive-deps` rule SHALL produce no warnings for the modified effects.

##### Edge Cases

- EC1: Adding a dependency to the array may cause the effect to fire more frequently than before. The fix MUST verify that the effect does not trigger unnecessary API calls (e.g., by using `useCallback` to memoize the dependency).

---

#### Requirement 4.4: Standardize Error Type Handling

**ID:** CQR-P4-R4

**User Story:** As a developer, I want error types handled consistently using type guards, so that error handling code is safe and readable.

##### Acceptance Criteria

- CQR-P4-R4-AC1: WHEN frontend code catches an Axios error (e.g., PatientGrid.tsx line ~626), THEN it SHALL use the `isAxiosError()` type guard from the axios library instead of casting error to an inline type.
- CQR-P4-R4-AC2: WHEN the existing `getApiErrorMessage()` utility is available, THEN error message extraction from Axios errors SHALL use that utility instead of manual property access chains.
- CQR-P4-R4-AC3: No `as { response?: { ... } }` error casts SHALL remain in the frontend codebase.

---

### Phase 5: TypeScript Strictness

**ID:** CQR-P5

**User Story:** As a developer, I want TypeScript types to be strict and explicit, so that the compiler catches more bugs at build time and the code is self-documenting.

#### Requirement 5.1: Create Typed AG Grid Mock Factories

**ID:** CQR-P5-R1

**User Story:** As a developer writing component tests, I want typed mock factories for AG Grid params objects, so that tests are type-safe and I do not need to cast to `any` for every mock parameter.

##### Acceptance Criteria

- CQR-P5-R1-AC1: WHEN the refactoring is complete, THEN a new file `frontend/src/test-utils/agGridMocks.ts` SHALL exist containing typed factory functions for common AG Grid parameter objects: `ICellRendererParams`, `ICellEditorParams`, `ValueFormatterParams`, `ValueGetterParams`, `ValueSetterParams`, `CellValueChangedEvent`.
- CQR-P5-R1-AC2: Each factory function SHALL return a properly typed mock object with sensible defaults, accepting partial overrides for test-specific values.
- CQR-P5-R1-AC3: WHEN `AutoOpenSelectEditor.test.tsx` uses AG Grid mock params, THEN it SHALL use the factory functions instead of `as any` casts. Currently there are 27 `as any` casts in this file.
- CQR-P5-R1-AC4: WHEN `StatusDateRenderer.test.tsx` uses AG Grid mock params, THEN it SHALL use the factory functions. Currently there are 18 `as any` casts.
- CQR-P5-R1-AC5: WHEN `DateCellEditor.test.tsx` uses AG Grid mock params, THEN it SHALL use the factory functions. Currently there are 14 `as any` casts.
- CQR-P5-R1-AC6: The total `as any` count across test files SHALL decrease by at least 50 (from the current ~100 across frontend test files).
- CQR-P5-R1-AC7: All existing component tests SHALL continue to pass with the mock factory replacements.

##### Edge Cases

- EC1: Some `as any` casts may be necessary for properties that AG Grid types require but tests intentionally omit (e.g., `api`, `columnApi`). The factory functions SHALL provide mock implementations for these (e.g., `{ addEventListener: vi.fn(), ... }`).
- EC2: The 12 `as any` casts in `PatientGrid.tsx` (production code, not tests) are a separate concern. They SHALL be addressed under CQR-P5-R2 or documented as technical debt if they cannot be safely removed.

---

#### Requirement 5.2: Replace Record<string, unknown> with Specific Types

**ID:** CQR-P5-R2

**User Story:** As a developer, I want flexible data typed with specific interfaces or discriminated unions, so that property access is type-checked.

##### Acceptance Criteria

- CQR-P5-R2-AC1: WHEN `admin.routes.ts`, `PatientGrid.tsx`, and `AdminPage.tsx` use `Record<string, unknown>` for data objects, THEN those usages SHALL be replaced with specific TypeScript interfaces that describe the actual shape of the data.
- CQR-P5-R2-AC2: IF a specific type cannot be determined (e.g., truly dynamic data from an external source), THEN a documented type alias with a comment explaining why it is generic SHALL be used instead of bare `Record<string, unknown>`.
- CQR-P5-R2-AC3: The 12 `as any` casts in `PatientGrid.tsx` production code SHALL be reviewed. Each SHALL either be replaced with a proper type assertion or documented with a `// eslint-disable-next-line` comment explaining why it is necessary.

---

#### Requirement 5.3: Create SaveStatus Type

**ID:** CQR-P5-R3

**User Story:** As a developer, I want save status values defined as a TypeScript type union, so that typos in status strings are caught at compile time.

##### Acceptance Criteria

- CQR-P5-R3-AC1: WHEN the refactoring is complete, THEN a type `SaveStatus = 'idle' | 'saving' | 'saved' | 'error'` SHALL be defined and exported from a shared types file (e.g., `frontend/src/types/index.ts` or `frontend/src/types/grid.ts`).
- CQR-P5-R3-AC2: All usages of save status string literals in `MainPage.tsx`, `PatientGrid.tsx`, `Toolbar.tsx`, and `StatusBar.tsx` SHALL use the `SaveStatus` type.
- CQR-P5-R3-AC3: The TypeScript compiler SHALL catch any misspelled status string (e.g., `'eror'` instead of `'error'`).

---

#### Requirement 5.4: Add Return Type Annotations to Exported Functions

**ID:** CQR-P5-R4

**User Story:** As a developer, I want exported functions to have explicit return types, so that API contracts are clear and refactoring does not accidentally change return types.

##### Acceptance Criteria

- CQR-P5-R4-AC1: WHEN the refactoring is complete, THEN all newly extracted utility functions (from Phases 1 and 3) SHALL have explicit return type annotations.
- CQR-P5-R4-AC2: WHEN an existing exported function in a service file (e.g., `dueDateCalculator.ts`, `duplicateDetector.ts`, `statusDatePromptResolver.ts`) lacks a return type annotation, THEN one SHALL be added.
- CQR-P5-R4-AC3: Internal (non-exported) helper functions MAY continue to rely on type inference.

---

### Phase 6: Logging Infrastructure

**ID:** CQR-P6

**User Story:** As a system administrator reviewing application logs, I want structured log output with severity levels, so that I can filter and search logs effectively in production.

#### Requirement 6.1: Create Backend Logger Utility

**ID:** CQR-P6-R1

**User Story:** As a developer, I want a logger utility that outputs structured JSON in production and human-readable text in development, so that log output is appropriate for each environment.

##### Acceptance Criteria

- CQR-P6-R1-AC1: WHEN the refactoring is complete, THEN a new file `backend/src/utils/logger.ts` SHALL exist exporting a logger object with methods: `info()`, `warn()`, `error()`, and `debug()`.
- CQR-P6-R1-AC2: WHEN `NODE_ENV` is `'production'`, THEN log output SHALL be structured JSON with fields: `timestamp`, `level`, `message`, and optional `context` object.
- CQR-P6-R1-AC3: WHEN `NODE_ENV` is `'development'`, THEN log output SHALL be human-readable (e.g., `[INFO] 2026-02-11T10:30:00Z - Server started on port 3000`).
- CQR-P6-R1-AC4: The logger SHALL NOT add any new npm dependencies. It SHALL wrap `console.log/warn/error` with formatting logic.
- CQR-P6-R1-AC5: The logger SHALL include unit tests covering both output modes and all log levels.

---

#### Requirement 6.2: Replace Backend Console Statements

**ID:** CQR-P6-R2

**User Story:** As a developer, I want all ad-hoc console statements in backend source files replaced with the structured logger.

##### Acceptance Criteria

- CQR-P6-R2-AC1: WHEN the refactoring is complete, THEN the following backend source files SHALL use the logger utility instead of direct console calls: `index.ts` (14 occurrences), `errorHandler.ts` (1), `emailService.ts` (2), `socketManager.ts` (6), `previewCache.ts` (1).
- CQR-P6-R2-AC2: Console statements in test files (`*.test.ts`) SHALL NOT be replaced. Test files may continue to use `console.log` for debugging.
- CQR-P6-R2-AC3: Console statements in scripts (`seedDev.ts`: 17 occurrences) SHALL NOT be replaced. Scripts have different logging needs.
- CQR-P6-R2-AC4: After replacement, zero `console.log`, `console.error`, or `console.warn` calls SHALL remain in backend source files (excluding test files and scripts).

---

#### Requirement 6.3: Create Frontend Logger Utility

**ID:** CQR-P6-R3

**User Story:** As a developer, I want frontend console statements controlled by environment, so that production builds do not leak debug information to the browser console.

##### Acceptance Criteria

- CQR-P6-R3-AC1: WHEN the refactoring is complete, THEN a new file `frontend/src/utils/logger.ts` SHALL exist exporting a logger with methods: `info()`, `warn()`, `error()`, and `debug()`.
- CQR-P6-R3-AC2: WHEN the app is built for production (`import.meta.env.PROD` is true), THEN `debug()` and `info()` calls SHALL be no-ops (suppressed). Only `warn()` and `error()` SHALL produce output.
- CQR-P6-R3-AC3: WHEN the app runs in development, THEN all log levels SHALL produce console output.
- CQR-P6-R3-AC4: The 15 `console.log/error/warn` calls across `axios.ts` (3), `AdminPage.tsx` (3), `PatientGrid.tsx` (2), `ImportPage.tsx` (1), and `MainPage.tsx` (6) SHALL be replaced with the logger utility.

---

### Phase 7: CSS Quality

**ID:** CQR-P7

**User Story:** As a developer maintaining the stylesheet, I want CSS specificity managed through selector structure rather than `!important` overrides, so that style conflicts are resolved predictably.

#### Requirement 7.1: Reduce !important Declarations

**ID:** CQR-P7-R1

**User Story:** As a developer, I want unnecessary `!important` declarations replaced with higher-specificity selectors where possible, and the remaining ones documented as necessary for AG Grid overrides.

##### Acceptance Criteria

- CQR-P7-R1-AC1: WHEN the refactoring is complete, THEN each of the 33 `!important` declarations in `index.css` SHALL be categorized as either "removable" (can be replaced with higher specificity) or "required" (necessary to override AG Grid inline styles).
- CQR-P7-R1-AC2: "Removable" `!important` declarations SHALL be replaced with higher-specificity selectors (e.g., `.ag-theme-alpine .ag-row.row-status-gray` instead of `.row-status-gray { ... !important }`).
- CQR-P7-R1-AC3: "Required" `!important` declarations SHALL have a code comment: `/* !important required: overrides AG Grid inline style */`.
- CQR-P7-R1-AC4: The total `!important` count SHALL decrease by at least 10 (from 33 to 23 or fewer).
- CQR-P7-R1-AC5: The visual appearance of the grid (row colors, cell styles, selection indicators) SHALL remain identical. This SHALL be verified by Layer 5 visual browser review.

##### Edge Cases

- EC1: AG Grid applies inline styles via JavaScript for certain features (row highlighting, cell selection). These CANNOT be overridden by CSS specificity alone -- `!important` is genuinely required for those cases. The refactoring MUST test each removal individually.
- EC2: Removing `!important` from one rule may cause a cascade failure in another rule. Each change MUST be tested visually.

---

#### Requirement 7.2: Replace Inline Styles with CSS Classes

**ID:** CQR-P7-R2

**User Story:** As a developer, I want inline styles moved to CSS classes, so that styling is centralized and maintainable.

##### Acceptance Criteria

- CQR-P7-R2-AC1: WHEN the refactoring is complete, THEN the inline style `style={{ width: '100%', height: 'calc(100vh - 200px)' }}` in `PatientGrid.tsx` (line ~1313) SHALL be replaced with a CSS class.
- CQR-P7-R2-AC2: WHEN the refactoring is complete, THEN tab visibility toggling in `PatientManagementPage.tsx` SHALL use CSS classes instead of inline `display: none` styles, where practical.
- CQR-P7-R2-AC3: The layout behavior SHALL remain identical.

---

### Phase 8: Security Hardening

**ID:** CQR-P8

**User Story:** As a system administrator deploying the Patient Tracker in a healthcare environment, I want input validation tightened and sensitive data excluded from logs, so that the application meets basic security hygiene standards.

#### Requirement 8.1: Add Input Validation on Config Endpoints

**ID:** CQR-P8-R1

**User Story:** As a developer, I want URL parameters on config endpoints validated (trimmed, empty-checked), so that empty or whitespace-only values do not cause unexpected database behavior.

##### Acceptance Criteria

- CQR-P8-R1-AC1: WHEN `config.routes.ts` receives a URL parameter, THEN the parameter SHALL be trimmed of leading/trailing whitespace before use.
- CQR-P8-R1-AC2: WHEN a required URL parameter is empty or whitespace-only after trimming, THEN the endpoint SHALL return a 400 Bad Request response with a descriptive error message.
- CQR-P8-R1-AC3: Existing config.routes.test.ts tests (14 tests) SHALL continue to pass, and new tests SHALL be added for the validation cases.

---

#### Requirement 8.2: Run Dependency Audit

**ID:** CQR-P8-R2

**User Story:** As a system administrator, I want known vulnerabilities in npm dependencies identified and patched.

##### Acceptance Criteria

- CQR-P8-R2-AC1: WHEN `npm audit` is run on both `backend/` and `frontend/` directories, THEN the results SHALL be reviewed.
- CQR-P8-R2-AC2: Any vulnerabilities rated HIGH or CRITICAL SHALL be resolved by updating the affected dependency, or documented with justification if the update introduces breaking changes.
- CQR-P8-R2-AC3: The audit results and any actions taken SHALL be documented in the commit message.

---

#### Requirement 8.3: Sanitize Error Logs

**ID:** CQR-P8-R3

**User Story:** As a security-conscious developer, I want the Axios error interceptor to strip sensitive data (authorization headers, request bodies containing passwords) before logging.

##### Acceptance Criteria

- CQR-P8-R3-AC1: WHEN the Axios error interceptor in `frontend/src/api/axios.ts` (lines 29-35) logs an error, THEN authorization headers SHALL be stripped or masked (e.g., `Authorization: Bearer ***`).
- CQR-P8-R3-AC2: WHEN the error interceptor logs a request body, THEN fields named `password`, `token`, or `secret` SHALL be masked.
- CQR-P8-R3-AC3: The error interceptor SHALL still log sufficient information for debugging (URL, status code, error message).

---

### Phase 9: Performance

**ID:** CQR-P9

**User Story:** As a user of the Patient Tracker, I want the grid to render and respond to interactions quickly, so that data entry feels responsive.

#### Requirement 9.1: Grid Re-render Optimization

**ID:** CQR-P9-R1

**User Story:** As a developer, I want unnecessary grid re-renders identified and reduced using React memoization.

##### Acceptance Criteria

- CQR-P9-R1-AC1: WHEN the optimization is complete, THEN callback functions passed to AG Grid column definitions (valueFormatter, valueSetter, valueGetter, cellRenderer, etc.) SHALL be memoized with `useCallback` or `useMemo` where profiling shows they cause unnecessary re-renders.
- CQR-P9-R1-AC2: WHEN the column definitions array is recalculated, it SHALL only change when its dependencies actually change (i.e., it SHALL be wrapped in `useMemo` with correct dependencies).
- CQR-P9-R1-AC3: The grid interaction speed (cell editing, dropdown selection, row color updates) SHALL remain unchanged or improve. No regressions in user-perceived responsiveness.
- CQR-P9-R1-AC4: Optimization SHALL be guided by React DevTools Profiler data, not speculative. Only changes that measurably reduce re-renders SHALL be committed.

##### Edge Cases

- EC1: Over-memoization can introduce stale-closure bugs. Each memoization MUST be verified by running the full E2E test suite.
- EC2: AG Grid internally manages its own rendering pipeline. React-level memoization may have limited impact on grid cell re-renders. The profiling step SHALL determine whether React-level optimization is beneficial.

---

#### Requirement 9.2: Bundle Size Review

**ID:** CQR-P9-R2

**User Story:** As a developer, I want the production bundle analyzed for unnecessary large dependencies, so that page load time is minimized.

##### Acceptance Criteria

- CQR-P9-R2-AC1: WHEN `npx vite-bundle-visualizer` is run, THEN the output SHALL be analyzed for: (a) dependencies that are imported but not used (tree-shaking failures), (b) dependencies that contribute disproportionately to bundle size.
- CQR-P9-R2-AC2: IF unused imports or tree-shaking failures are identified, THEN they SHALL be fixed (e.g., changing `import _ from 'lodash'` to `import { debounce } from 'lodash'`).
- CQR-P9-R2-AC3: The findings and any size reductions SHALL be documented in the commit message.
- CQR-P9-R2-AC4: No functional changes SHALL result from this analysis.

---

### Phase 10: Test Quality

**ID:** CQR-P10

**User Story:** As a developer, I want the test suite to be reliable, well-organized, and free of flaky timing-dependent assertions, so that test failures always indicate real bugs.

#### Requirement 10.1: Create Shared AG Grid Test Utilities

**ID:** CQR-P10-R1

**Note:** This requirement overlaps with CQR-P5-R1 (Typed AG Grid Mock Factories). If CQR-P5-R1 has already been completed, this requirement is satisfied. If not, it SHALL be completed as part of Phase 10.

##### Acceptance Criteria

- CQR-P10-R1-AC1: Same as CQR-P5-R1-AC1 through CQR-P5-R1-AC7.

---

#### Requirement 10.2: Identify and Fill Coverage Gaps

**ID:** CQR-P10-R2

**User Story:** As a developer, I want test coverage reports generated and critical untested paths identified, so that the safety net has no holes.

##### Acceptance Criteria

- CQR-P10-R2-AC1: WHEN backend coverage is run (`cd backend && npm test -- --coverage`), THEN the report SHALL be analyzed for service files with less than 70% line coverage.
- CQR-P10-R2-AC2: WHEN frontend coverage is run (`cd frontend && npm run test:coverage`), THEN the report SHALL be analyzed for component files with less than 60% line coverage.
- CQR-P10-R2-AC3: IF critical paths (authentication, data mutation, import execution) are identified with low coverage, THEN additional tests SHALL be written to bring them above the threshold.
- CQR-P10-R2-AC4: The coverage findings SHALL be documented in `.claude/TESTING.md` with the current coverage percentages.

---

#### Requirement 10.3: Remediate Flaky Cypress wait() Patterns

**ID:** CQR-P10-R3

**User Story:** As a developer, I want `cy.wait(N)` calls replaced with deterministic assertions, so that tests do not randomly fail due to timing.

##### Acceptance Criteria

- CQR-P10-R3-AC1: WHEN the remediation is complete, THEN the number of `cy.wait()` calls with hardcoded millisecond values (currently 424 occurrences across 16 Cypress test files) SHALL be reduced by at least 30%.
- CQR-P10-R3-AC2: Replaced `cy.wait(N)` calls SHALL use deterministic alternatives: `cy.should()` assertions that wait for a condition, `cy.intercept()` with `cy.wait('@alias')` for API calls, or Cypress retry-ability built into `should()` chains.
- CQR-P10-R3-AC3: All Cypress tests SHALL continue to pass after the remediation.
- CQR-P10-R3-AC4: IF a `cy.wait(N)` cannot be safely replaced (e.g., waiting for AG Grid's internal animation/rendering), THEN it SHALL be documented with a comment explaining why it is necessary.

##### Edge Cases

- EC1: Removing `cy.wait()` calls may cause tests to fail if the assertion happens before the UI has updated. Each replacement MUST be tested individually. If a replacement causes flakiness, it SHALL be reverted and the `cy.wait()` documented.
- EC2: The `cy.wait()` calls in `cypress/support/commands.ts` (8 occurrences) are shared across all tests. Changing these has a wide blast radius and MUST be done carefully.

---

## Non-Functional Requirements

### NFR-1: Zero Behavior Change (Unless Explicit)

All refactoring SHALL be behavior-preserving. The application SHALL function identically before and after each phase. This is verified by the full test suite passing (GR-2) and visual browser review for UI-touching phases (Phases 1.3, 3.1, 3.2, 7.1, 7.2).

### NFR-2: Incremental and Reversible

Each phase SHALL be a single atomic commit on `develop`. If a phase introduces a regression that is not caught immediately, it SHALL be independently revertable via `git revert` without affecting other phases.

### NFR-3: No New Dependencies

No new npm packages SHALL be added unless explicitly stated in a requirement. The logging utilities (Phase 6) SHALL wrap native console methods. The mock factories (Phase 5/10) SHALL use the existing test framework (Vitest `vi.fn()`).

### NFR-4: Performance Baseline

Database index additions (Phase 2) SHALL not degrade write performance by more than 5% (index maintenance overhead is typically negligible). Grid decomposition (Phase 3) SHALL not add measurable rendering latency.

### NFR-5: Documentation Updates

Each phase commit SHALL update `.claude/CHANGELOG.md` with a description of what changed. If test counts change, `.claude/TESTING.md` and `.claude/IMPLEMENTATION_STATUS.md` SHALL be updated to reflect the new counts.

### NFR-6: Migration Safety

Database migrations (Phase 2) SHALL be additive only (CREATE INDEX). No columns, tables, or data SHALL be removed. Migrations SHALL be tested against the development database before committing.

---

## Execution Order

The phases SHALL be executed in the following order, based on risk assessment:

| Step | Phase/Requirement | Risk | Estimated Scope |
|------|-------------------|------|-----------------|
| 1 | CQR-P2-R1 to CQR-P2-R4 (DB: batch updates, indexes) | Safe | 2 files + migration |
| 2 | CQR-P2-R5 (DB: transaction safety) | Safe | 1 file |
| 3 | CQR-P1-R1, CQR-P1-R2 (Extract date utils + status constants) | Safe | 3-4 files + new utils |
| 4 | CQR-P1-R3 (CSS stripe consolidation) | Safe | 1 file |
| 5 | CQR-P4-R1 (Fix setTimeout leaks) | Safe | 5 files |
| 6 | CQR-P4-R2, CQR-P4-R3 (Fix async/useEffect issues) | Safe | 2 files |
| 7 | CQR-P3-R1 (Split PatientGrid.tsx) | Medium | 4+ new files |
| 8 | CQR-P3-R2 (Extract AdminPage modals) | Medium | 3 new files |
| 9 | CQR-P5-R1 (Typed test mock factories) | Safe | 5+ test files |
| 10 | CQR-P6-R1 to CQR-P6-R3 (Logger utility) | Low | 10+ files |
| 11 | CQR-P3-R3, CQR-P3-R4 (Split route files) | Medium | 4+ files |
| 12 | CQR-P7, CQR-P8, CQR-P9, CQR-P10 (CSS, security, perf, tests) | Low | Various |

---

## Out of Scope

- **New features**: This refactoring does not add new functionality. HgbA1c Goal (Phase 10), Excel-like Behaviors (Phase 13), and other planned features are separate efforts.
- **Framework upgrades**: Upgrading React, AG Grid, Prisma, or other major dependencies is not part of this refactoring.
- **Architecture changes**: The existing architecture (Express backend, React frontend, Prisma ORM, PostgreSQL) is not being changed.
- **UI redesign**: No visual design changes. All UI changes are internal (CSS restructuring) and must produce identical visual output.
- **Backend API changes**: No endpoint URLs, request/response formats, or HTTP methods are changed.

---

## Assumptions and Constraints

### Assumptions

- A1: The current test suite (1,816 tests) adequately covers the application's behavior. If tests pass after a refactoring phase, the behavior is preserved.
- A2: The development database can be migrated without downtime (Phase 2 index additions are non-locking on PostgreSQL).
- A3: The existing `dropdownConfig.ts` is the appropriate home for shared status arrays (CQR-P1-R2).
- A4: AG Grid's inline styles cannot be overridden without `!important` in certain cases. The Phase 7 analysis will determine which cases these are.

### Constraints

- C1: All work MUST happen on the `develop` branch, never on `main`.
- C2: Each phase MUST be a single commit. Partial phases MUST NOT be committed.
- C3: No new npm dependencies (NFR-3).
- C4: The development environment uses Docker Compose. Migrations MUST work within the containerized PostgreSQL setup.

---

## Open Questions

None. The requirements are fully specified based on the detailed findings in `.claude/CODE_QUALITY_PLAN.md` and verified against the current codebase state.

---

## Glossary

| Term | Definition |
|------|-----------|
| N+1 query | A database anti-pattern where a loop executes N individual queries instead of a single batch query. |
| Compound index | A database index spanning multiple columns, optimizing queries that filter on those columns together. |
| `!important` | A CSS declaration that overrides normal specificity rules. Overused, it makes stylesheets hard to maintain. |
| `as any` | A TypeScript type assertion that disables type checking for a value. Overuse undermines TypeScript's safety benefits. |
| `cy.wait(N)` | A Cypress command that pauses test execution for N milliseconds. Leads to flaky tests because timing varies across environments. |
| SaveStatus | A string union type (`'idle' \| 'saving' \| 'saved' \| 'error'`) used to track the auto-save indicator state. |
| Cascading fields | When changing a parent dropdown (e.g., Request Type) automatically clears dependent child fields (Quality Measure, Measure Status, etc.). |
| Layer 5 | The visual browser review layer using MCP Playwright / ui-ux-reviewer agent. Mandatory for any UI-affecting change. |
