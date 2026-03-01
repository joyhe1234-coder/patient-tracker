# Task Breakdown -- Module 4: Import Pipeline Comprehensive Test Plan

## Overview

This document breaks down the 38 proposed new tests from `requirements.md` into atomic, executable tasks grouped by framework and target file. Each task maps directly to identified coverage gaps (GAP-01A through GAP-25C) and proposed test IDs (NEW-01 through NEW-38).

**Total proposed tests:** 38
**Frameworks:** Jest (22), Vitest (3), Cypress (6), Playwright (4), Documented-for-Future (3)
**Priority breakdown:** HIGH (10), MEDIUM (12), LOW (16)

---

## HIGH Priority Tasks (P1 -- Critical Functional Correctness)

### Task T1-1: Import Executor -- Transaction Rollback and Audit Logging

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/importExecutor.test.ts`
- **Tests to Write**: 3
- **Description**: Fill three critical gaps in import execution: (1) verify that a database constraint violation occurring after N successful inserts causes the entire transaction to roll back with zero partial state, (2) verify that import audit logging includes the systemId field for traceability, and (3) verify that Socket.IO broadcast fires after successful import execution. These are the highest-risk gaps because undetected partial imports or missing audit trails could corrupt production data.
- **Gap IDs**: GAP-11A (NEW-01), GAP-S10A (NEW-24), GAP-12A (NEW-34)
- **Acceptance Criteria**:
  - [ ] Test: transaction rollback on mid-execution constraint violation after N successful inserts -- verify 0 rows persisted
  - [ ] Test: import audit log entry includes correct systemId ('hill' or 'sutter')
  - [ ] Test: Socket.IO io.emit('patients:updated') called after successful executeImport
  - [ ] All existing importExecutor tests still pass (31 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T1-2: Diff Calculator -- Re-Import Idempotency and Sutter Data

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/diffCalculator.test.ts`
- **Tests to Write**: 3
- **Description**: Fill three critical diff calculation gaps: (1) re-import idempotency -- importing the same Hill file twice must produce all SKIP actions on the second run, (2) diff calculation with Sutter data where notes and tracking1 fields are non-null must propagate correctly to DiffChange objects, and (3) merge behavior when the existing measure status is null or empty string must handle the "unknown" category gracefully.
- **Gap IDs**: GAP-09A (NEW-02), GAP-09B (NEW-03), GAP-09C (NEW-06)
- **Acceptance Criteria**:
  - [ ] Test: same file imported twice produces all SKIP actions on second diff (idempotency)
  - [ ] Test: Sutter diff with non-null notes and tracking1 includes values in DiffChange
  - [ ] Test: merge with existing status null/empty treats as non-compliant category
  - [ ] All existing diffCalculator tests still pass (81 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T1-3: Sutter Data Transformer -- Unrecognized Request Type

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/sutterDataTransformer.test.ts`
- **Tests to Write**: 1
- **Description**: Verify that a Sutter row with an unrecognized Request Type value (not AWV, APV, HCC, or Quality) is skipped and a transform error is recorded. This is a critical gap because unrecognized request types in production Sutter files would silently produce incorrect data without this coverage.
- **Gap IDs**: GAP-14C (NEW-04)
- **Acceptance Criteria**:
  - [ ] Test: row with Request Type = "Unknown" is skipped with transform error
  - [ ] All existing sutterDataTransformer tests still pass (51 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T1-4: Preview Cache + Import Executor -- Preview Expiration

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/previewCache.test.ts`
- **Tests to Write**: 1
- **Description**: Verify that attempting to execute an import with an expired preview (TTL exceeded) returns the correct error message "Preview not found or expired: {id}". Mock the TTL expiration and verify the executor handles it gracefully.
- **Gap IDs**: GAP-18A (NEW-05)
- **Acceptance Criteria**:
  - [ ] Test: generate preview, advance time past 30min TTL, call executeImport, verify "Preview not found or expired" error
  - [ ] All existing previewCache tests still pass (17 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T1-5: Conflict Detector -- Sutter Config and Validator -- Sutter Specifics

- **Priority**: HIGH
- **Framework**: Jest
- **Target Files**: `backend/src/services/import/__tests__/conflictDetector.test.ts`, `backend/src/services/import/__tests__/validator.test.ts`
- **Tests to Write**: 3
- **Description**: Fill three critical gaps in Sutter-specific processing: (1) conflict detection using a Sutter config (long-format with direct column mapping vs. Hill Q1/Q2 pattern), (2) validation with Sutter-specific request type list including "Chronic DX" and "Screening" values, and (3) row number offset calculation for Sutter files where headerRow=3 means data starts at 1-indexed row 5.
- **Gap IDs**: GAP-07B (NEW-07), GAP-20A (NEW-08), GAP-20B (NEW-09)
- **Acceptance Criteria**:
  - [ ] Test: conflict detection with Sutter config detects MISSING/NEW/CHANGED correctly for Sutter column names
  - [ ] Test: validator accepts "Chronic DX" and "Screening" as valid Sutter request types
  - [ ] Test: error report row numbers account for Sutter headerRow=3 offset (data row 1 = spreadsheet row 5)
  - [ ] All existing conflictDetector tests still pass (64 tests)
  - [ ] All existing validator tests still pass (47 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T1-6: Import Routes -- Full Pipeline Integration Test

- **Priority**: HIGH
- **Framework**: Jest
- **Target File**: `backend/src/routes/__tests__/import.routes.test.ts`
- **Tests to Write**: 1
- **Description**: Create a single integration test that exercises the full import pipeline from file upload through preview generation through execution, verifying the end-to-end data flow within the Jest test environment using mocked auth. This is the most complex individual test but validates that all pipeline stages connect correctly.
- **Gap IDs**: GAP-23D (NEW-10)
- **Acceptance Criteria**:
  - [ ] Test: POST /sheets -> POST /preview -> POST /execute pipeline produces correct stats
  - [ ] All existing import.routes tests still pass (52 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: T1-1, T1-2 (should run after executor and diff tests are stable)
- **Estimated Effort**: L

---

## MEDIUM Priority Tasks (P2 -- Edge Cases and Boundary Conditions)

### Task T2-1: File Parser -- Password Protection and Merged Cells

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/fileParser.test.ts`
- **Tests to Write**: 2
- **Description**: Fill two file parsing edge case gaps: (1) verify that a password-protected Excel file returns a descriptive error message instead of an unhandled exception, and (2) verify that merged cells in the header row cause the sheet to be treated as invalid. Both require fixture files -- a password-protected .xlsx and a .xlsx with merged header cells.
- **Gap IDs**: GAP-01A (NEW-11), GAP-01B (NEW-12)
- **Acceptance Criteria**:
  - [ ] Test: password-protected .xlsx returns error with message containing "password" or "encrypted"
  - [ ] Test: .xlsx with merged cells in header row is excluded as invalid during sheet validation
  - [ ] Fixture files created: `backend/src/services/import/__tests__/fixtures/password-protected.xlsx`, `backend/src/services/import/__tests__/fixtures/merged-headers.xlsx`
  - [ ] All existing fileParser tests still pass (53 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None (fixture files must be created)
- **Estimated Effort**: M

---

### Task T2-2: Import Routes -- Hill Multi-Tab and Column Mapper Edge Cases

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target Files**: `backend/src/routes/__tests__/import.routes.test.ts`, `backend/src/services/import/__tests__/columnMapper.test.ts`
- **Tests to Write**: 2
- **Description**: Fill two mapping/discovery edge case gaps: (1) verify that a Hill multi-tab file (unexpected scenario -- Hill files are normally single-tab) has all tabs validated by header inspection since Hill has no skipTabs config, and (2) verify behavior when a Hill file has a Q1 column but no matching Q2 column for a measure (or vice versa).
- **Gap IDs**: GAP-02C (NEW-13), GAP-13C (NEW-14)
- **Acceptance Criteria**:
  - [ ] Test: Hill file with 3 tabs has all tabs checked via header validation (no name-based filtering)
  - [ ] Test: Hill file with Q1 only (no Q2) for a measure produces a warning or partial mapping
  - [ ] All existing import.routes tests still pass (52 tests)
  - [ ] All existing columnMapper tests still pass (13 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T2-3: Action Mapper and Measure Details Parser -- Matching Order and Multi-Part Details

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target Files**: `backend/src/services/import/__tests__/actionMapper.test.ts`, `backend/src/services/import/__tests__/measureDetailsParser.test.ts`
- **Tests to Write**: 2
- **Description**: Fill two Sutter parsing edge cases: (1) verify that when action text could match multiple regex patterns, the first match wins (matching order determinism), and (2) verify Measure Details parsing with exactly 3 semicolon-separated parts (e.g., "01/15/2025; 7.5; mg/dL") where parts 2+ become tracking1.
- **Gap IDs**: GAP-14A (NEW-15), GAP-14B (NEW-16)
- **Acceptance Criteria**:
  - [ ] Test: action text matching multiple patterns uses first regex match
  - [ ] Test: Measure Details "01/15/2025; 7.5; mg/dL" parses date as statusDate, "7.5; mg/dL" as tracking1
  - [ ] All existing actionMapper tests still pass (56 tests)
  - [ ] All existing measureDetailsParser tests still pass (42 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T2-4: Data Transformer and File Parser -- Date Parsing Edge Cases

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target Files**: `backend/src/services/import/__tests__/dataTransformer.test.ts`, `backend/src/services/import/__tests__/fileParser.test.ts`
- **Tests to Write**: 2
- **Description**: Fill two date parsing boundary conditions: (1) verify M/D/YY format with century boundary ambiguity (e.g., "1/1/30" -- determine if the system interprets as 1930 or 2030 and document the behavior), and (2) verify that extremely large Excel serial numbers producing future dates are handled without error.
- **Gap IDs**: GAP-19A (NEW-17), GAP-19B (NEW-18)
- **Acceptance Criteria**:
  - [ ] Test: "1/1/30" date format produces a deterministic and documented century interpretation
  - [ ] Test: Excel serial number 99999 (year 2173) is converted without throwing
  - [ ] All existing dataTransformer tests still pass (23 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T2-5: Preview Cache -- TTL Race Condition

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/previewCache.test.ts`
- **Tests to Write**: 1
- **Description**: Test the race condition where TTL expires between the getPreview() check and the executeImport() call. Simulate by having getPreview() return a valid preview but then having the execution find it expired/deleted.
- **Gap IDs**: GAP-22C (NEW-19)
- **Acceptance Criteria**:
  - [ ] Test: preview valid at lookup time but expired at execution time produces "Preview not found or expired" error
  - [ ] All existing previewCache tests still pass (17 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: T1-4 (builds on preview expiration test)
- **Estimated Effort**: S

---

### Task T2-6: Sheet Selector -- Physician Auto-Match Ambiguity

- **Priority**: MEDIUM
- **Framework**: Vitest
- **Target File**: `frontend/src/components/SheetSelector.test.tsx`
- **Tests to Write**: 1
- **Description**: Verify that when multiple physicians share the same last name (e.g., "Dr. Smith, Alice" and "Dr. Smith, Bob"), the physician auto-match feature for Sutter tab names does not incorrectly assign or throws an ambiguity indicator.
- **Gap IDs**: GAP-17A (NEW-20)
- **Acceptance Criteria**:
  - [ ] Test: Sutter tab name matching partial last name shared by 2 physicians does not auto-assign (or picks first match deterministically)
  - [ ] All existing SheetSelector tests still pass (58 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T2-7: Fuzzy Matcher and Mapping Service -- Edge Cases

- **Priority**: MEDIUM
- **Framework**: Jest
- **Target Files**: `backend/src/services/import/__tests__/fuzzyMatcher.test.ts`, `backend/src/services/import/__tests__/mappingService.test.ts`
- **Tests to Write**: 2
- **Description**: Fill two matching/mapping edge cases: (1) verify that year-stripped action text which becomes empty after stripping (e.g., "2025 2024 2023") returns no match instead of crashing, and (2) verify behavior when a DB override changes a column from MEASURE type to IGNORED type and the next import skips it.
- **Gap IDs**: GAP-05C (NEW-21), GAP-04C (NEW-22)
- **Acceptance Criteria**:
  - [ ] Test: fuzzyMatchAction with text "2025 2024 2023" (becomes empty after year strip) returns no match
  - [ ] Test: DB override changing column type from MEASURE to IGNORED causes that column to be excluded from mapping
  - [ ] All existing fuzzyMatcher tests still pass (56 tests)
  - [ ] All existing mappingService tests still pass (31 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

## LOW Priority Tasks (P3/P4 -- Security, Performance, UI/UX, E2E)

### Task T3-1: Import Routes -- XSS Sanitization and Performance

- **Priority**: LOW
- **Framework**: Jest
- **Target Files**: `backend/src/routes/__tests__/import.routes.test.ts`, `backend/src/services/import/__tests__/fuzzyMatcher.test.ts`
- **Tests to Write**: 3
- **Description**: Fill security and performance gaps: (1) verify that XSS payload in the sheetName parameter is sanitized and does not execute, (2) verify sheets endpoint performance completes in under 2 seconds for files under 5MB, and (3) benchmark fuzzy matching performance with 100 headers against 200 known columns within 500ms.
- **Gap IDs**: GAP-S5A (NEW-23), GAP-P2A (NEW-25), GAP-P3A (NEW-26)
- **Acceptance Criteria**:
  - [ ] Test: sheetName containing `<script>alert(1)</script>` does not produce unescaped HTML in response
  - [ ] Test: sheets endpoint for a 5MB file completes within 2 seconds
  - [ ] Test: fuzzy matching 100 headers vs 200 columns completes within 500ms
  - [ ] All existing import.routes tests still pass (52 tests)
  - [ ] All existing fuzzyMatcher tests still pass (56 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T3-2: Fuzzy Matcher -- Performance Benchmark

- **Priority**: LOW
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/fuzzyMatcher.test.ts`
- **Tests to Write**: 1
- **Description**: Create a performance benchmark test that exercises fuzzy matching with realistic column counts (100+ headers against 200+ known columns) and asserts completion within 500ms. This may need to be marked with `.skip` in CI due to variable machine speed per ASM-TIP-7.
- **Gap IDs**: GAP-05A (NEW-27)
- **Acceptance Criteria**:
  - [ ] Test: fuzzy matching with 100 headers against 200 known columns completes within 500ms
  - [ ] Test is marked with conditional skip for CI environments
  - [ ] All existing fuzzyMatcher tests still pass (56 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T3-3: Mapping Management -- ReDoS via UI Submission (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/mapping-management.cy.ts`
- **Tests to Write**: 1
- **Description**: Verify that a catastrophic backtracking regex pattern (ReDoS) submitted through the mapping management UI action pattern editor is rejected with a validation error. This tests the full stack path from UI input through API validation.
- **Gap IDs**: GAP-06D (NEW-28)
- **Acceptance Criteria**:
  - [ ] Test: entering `(a+)+$` as an action pattern in the UI produces a visible error message
  - [ ] All existing mapping-management Cypress tests still pass (9 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T3-4: Preview Changes Table -- Action Override Not Available

- **Priority**: LOW
- **Framework**: Vitest
- **Target File**: `frontend/src/components/PreviewChangesTable.test.tsx`
- **Tests to Write**: 1
- **Description**: Document that the action override feature (changing SKIP to UPDATE in the preview table) is NOT currently implemented. Write a test that verifies action badges in PreviewChangesTable are display-only and not interactive. This prevents future regression if the feature is accidentally partially implemented.
- **Gap IDs**: GAP-10A (NEW-29)
- **Acceptance Criteria**:
  - [ ] Test: action badges in PreviewChangesTable are not clickable and have no onChange handlers
  - [ ] All existing PreviewChangesTable tests still pass (21 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T3-5: Import Flow -- Drag-and-Drop and File Re-Upload (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target File**: `frontend/cypress/e2e/import-flow.cy.ts`
- **Tests to Write**: 2
- **Description**: Fill two UI interaction gaps: (1) test drag-and-drop file upload in the E2E import flow (currently only click-to-select is tested), and (2) test removing a file from the dropzone and re-uploading a different file, verifying the UI resets correctly.
- **Gap IDs**: GAP-16B (NEW-30), GAP-16C (NEW-31)
- **Acceptance Criteria**:
  - [ ] Test: drag-and-drop file onto dropzone displays file info and enables preview button
  - [ ] Test: remove file, upload different file, verify new file info displayed
  - [ ] All existing import-flow Cypress tests still pass (48 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T3-6: Conflict Resolution -- DUPLICATE/AMBIGUOUS in E2E (Playwright)

- **Priority**: LOW
- **Framework**: Playwright
- **Target File**: `frontend/e2e/import-conflict-resolution.spec.ts`
- **Tests to Write**: 1
- **Description**: Test DUPLICATE and AMBIGUOUS conflict type resolution in an E2E context. Currently these types are only unit-tested in ConflictResolutionStep.test.tsx. The E2E test should verify the full flow: upload a file that triggers DUPLICATE or AMBIGUOUS conflicts, verify the conflict resolution UI displays correctly, and resolve them.
- **Gap IDs**: GAP-08C (NEW-32)
- **Acceptance Criteria**:
  - [ ] Test: file with duplicate headers triggers DUPLICATE conflict, admin resolves via UI, import proceeds
  - [ ] All existing import-conflict-resolution Playwright tests still pass (6 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None (may require a test fixture file with duplicate headers)
- **Estimated Effort**: M

---

### Task T3-7: Reassignment -- Additional E2E Coverage (Playwright)

- **Priority**: LOW
- **Framework**: Playwright
- **Target File**: `frontend/e2e/import-reassignment.spec.ts`
- **Tests to Write**: 1
- **Description**: Add more E2E test coverage for the reassignment warning flow. Currently only 1 Playwright E2E test exists. Add a test for the cancel flow (user declines reassignment) to verify no changes are made when reassignment is rejected.
- **Gap IDs**: GAP-25C (NEW-33)
- **Acceptance Criteria**:
  - [ ] Test: reassignment warning displayed, user cancels, verify no patient ownership changes
  - [ ] All existing import-reassignment Playwright tests still pass (1 test)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T3-8: Sutter Import -- Tab Names with Special Characters (Playwright)

- **Priority**: LOW
- **Framework**: Playwright
- **Target File**: `frontend/e2e/sutter-import.spec.ts`
- **Tests to Write**: 1
- **Description**: Test that Sutter tab names containing special characters (parentheses, slashes, periods, commas) are correctly displayed in the sheet selector and can be selected for import in an E2E context. This is partially covered in unit tests but not in E2E.
- **Gap IDs**: GAP-17B (NEW-35)
- **Acceptance Criteria**:
  - [ ] Test: Sutter file with tab name "Dr. Smith (Primary)" displays correctly and is selectable
  - [ ] All existing sutter-import Playwright tests still pass (11 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None (may require a test fixture file with special-character tab names)
- **Estimated Effort**: S

---

### Task T3-9: Import Preview Page -- Double-Submission Prevention

- **Priority**: LOW
- **Framework**: Vitest
- **Target File**: `frontend/src/pages/ImportPreviewPage.test.tsx`
- **Tests to Write**: 1
- **Description**: Verify that the "Apply Changes" button is disabled while an import execution is in progress, preventing double-submission. Simulate clicking the execute button twice rapidly and verify only one API call is made.
- **Gap IDs**: GAP-18B (NEW-36)
- **Acceptance Criteria**:
  - [ ] Test: execute button disabled after first click while loading, preventing second submission
  - [ ] All existing ImportPreviewPage tests still pass (33 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

### Task T3-10: Import Flow -- Keyboard Accessibility and Insurance Group Filters (Cypress)

- **Priority**: LOW
- **Framework**: Cypress
- **Target Files**: `frontend/cypress/e2e/import-flow.cy.ts`, `frontend/cypress/e2e/insurance-group-filter.cy.ts`
- **Tests to Write**: 2
- **Description**: Fill two accessibility/filter gaps: (1) verify the file dropzone is operable via keyboard (Tab to focus, Enter/Space to activate file picker), and (2) verify the insurance group filter works correctly when combined with other active filters (status filter + insurance group + name search simultaneously).
- **Gap IDs**: GAP-A5A (NEW-37), GAP-15B (NEW-38)
- **Acceptance Criteria**:
  - [ ] Test: file dropzone receives keyboard focus via Tab and opens file picker on Enter
  - [ ] Test: insurance group filter "Sutter/SIP" combined with status filter and name search returns correct intersection
  - [ ] All existing import-flow Cypress tests still pass (48 tests)
  - [ ] All existing insurance-group-filter Cypress tests still pass (12 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: M

---

### Task T3-11: Reassignment -- STAFF Role and Merge Mode (Jest)

- **Priority**: LOW
- **Framework**: Jest
- **Target File**: `backend/src/services/import/__tests__/reassignment.test.ts`
- **Tests to Write**: 1
- **Description**: Test reassignment detection when the import is performed by a STAFF user for their assigned physician and the patient currently belongs to a different physician. Verify the reassignment is detected correctly regardless of the importing user's role.
- **Gap IDs**: GAP-25A (NEW-25A -- supplementary to existing reassignment gaps)
- **Acceptance Criteria**:
  - [ ] Test: STAFF importing for physician B detects reassignment for patient owned by physician A
  - [ ] All existing reassignment tests still pass (21 tests)
  - [ ] No regressions in existing tests
- **Dependencies**: None
- **Estimated Effort**: S

---

## Regression Verification Task

### Task T4-1: Full Regression Suite -- Post-Gap-Fill Verification

- **Priority**: HIGH (run after all other tasks complete)
- **Framework**: All (Jest + Vitest + Playwright + Cypress)
- **Target File**: All import-related test files (49 existing + additions from above)
- **Tests to Write**: 0 (verification only)
- **Description**: After all gap-filling tasks are complete, run the full 5-layer test pyramid to verify zero regressions. This is a validation gate, not a test-writing task.
- **Acceptance Criteria**:
  - [ ] `cd backend && npm test` -- all backend Jest tests pass (expected: 926 + ~22 new = ~948)
  - [ ] `cd frontend && npm run test:run` -- all frontend Vitest tests pass (expected: 315 + ~3 new = ~318)
  - [ ] `cd frontend && npm run e2e` -- all Playwright E2E tests pass (expected: 71 + ~4 new = ~75)
  - [ ] `cd frontend && npm run cypress:run` -- all Cypress E2E tests pass (expected: 83 + ~6 new = ~89)
  - [ ] No flaky test failures
  - [ ] Total test count verified matches expectations (~1,433 total)
- **Dependencies**: All tasks T1-1 through T3-11
- **Estimated Effort**: M

---

## Task Execution Order (Recommended)

### Phase 1: HIGH Priority Jest Tests (Backend)

Execute these first as they cover the most critical functional correctness risks:

```
T1-1  Import Executor (rollback, audit, Socket.IO)     3 tests   Jest
T1-2  Diff Calculator (idempotency, Sutter, null)      3 tests   Jest
T1-3  Sutter Transformer (unrecognized request type)   1 test    Jest
T1-4  Preview Cache (TTL expiration)                   1 test    Jest
T1-5  Conflict Detector + Validator (Sutter-specific)  3 tests   Jest
T1-6  Import Routes (full pipeline integration)        1 test    Jest
                                              Subtotal: 12 tests
```

### Phase 2: MEDIUM Priority Edge Case Tests

Execute after Phase 1 is stable:

```
T2-1  File Parser (password, merged cells)             2 tests   Jest
T2-2  Import Routes + Column Mapper (Hill edge cases)  2 tests   Jest
T2-3  Action Mapper + Measure Details (order, 3-part)  2 tests   Jest
T2-4  Data Transformer (date edge cases)               2 tests   Jest
T2-5  Preview Cache (race condition)                   1 test    Jest
T2-6  Sheet Selector (physician auto-match ambiguity)  1 test    Vitest
T2-7  Fuzzy Matcher + Mapping Service (edge cases)     2 tests   Jest
                                              Subtotal: 12 tests
```

### Phase 3: LOW Priority Security, Performance, and E2E Tests

Execute after Phase 2:

```
T3-1  Import Routes + Fuzzy Matcher (XSS, perf)       3 tests   Jest
T3-2  Fuzzy Matcher (performance benchmark)            1 test    Jest
T3-3  Mapping Management (ReDoS via UI)                1 test    Cypress
T3-4  Preview Changes Table (action override N/A)      1 test    Vitest
T3-5  Import Flow (drag-drop, re-upload)               2 tests   Cypress
T3-6  Conflict Resolution (DUPLICATE/AMBIGUOUS E2E)    1 test    Playwright
T3-7  Reassignment (additional E2E)                    1 test    Playwright
T3-8  Sutter Import (special char tab names)           1 test    Playwright
T3-9  Import Preview Page (double-submit prevention)   1 test    Vitest
T3-10 Import Flow + Insurance Group (a11y, filters)    2 tests   Cypress
T3-11 Reassignment (STAFF role)                        1 test    Jest
                                              Subtotal: 15 tests
```

### Phase 4: Regression Verification

```
T4-1  Full regression suite                            0 tests   All frameworks
```

---

## Summary

| Phase | Tasks | Tests | Frameworks |
|-------|-------|-------|------------|
| Phase 1 (HIGH) | T1-1 through T1-6 | 12 | Jest |
| Phase 2 (MEDIUM) | T2-1 through T2-7 | 12 | Jest (11), Vitest (1) |
| Phase 3 (LOW) | T3-1 through T3-11 | 15 | Jest (5), Vitest (2), Cypress (5), Playwright (3) |
| Phase 4 (Regression) | T4-1 | 0 | All |
| **Total** | **19 tasks** | **39** | Jest (28), Vitest (3), Playwright (3), Cypress (5) |

**Note:** The total of 39 tests (vs. 38 in requirements.md) reflects the addition of the GAP-25A supplementary reassignment test in T3-11 which was identified during task breakdown as a natural companion to the existing GAP-25B/25C gaps.

### Traceability Matrix: Task to Gap ID

| Task | Gap IDs | NEW IDs |
|------|---------|---------|
| T1-1 | GAP-11A, GAP-S10A, GAP-12A | NEW-01, NEW-24, NEW-34 |
| T1-2 | GAP-09A, GAP-09B, GAP-09C | NEW-02, NEW-03, NEW-06 |
| T1-3 | GAP-14C | NEW-04 |
| T1-4 | GAP-18A | NEW-05 |
| T1-5 | GAP-07B, GAP-20A, GAP-20B | NEW-07, NEW-08, NEW-09 |
| T1-6 | GAP-23D | NEW-10 |
| T2-1 | GAP-01A, GAP-01B | NEW-11, NEW-12 |
| T2-2 | GAP-02C, GAP-13C | NEW-13, NEW-14 |
| T2-3 | GAP-14A, GAP-14B | NEW-15, NEW-16 |
| T2-4 | GAP-19A, GAP-19B | NEW-17, NEW-18 |
| T2-5 | GAP-22C | NEW-19 |
| T2-6 | GAP-17A | NEW-20 |
| T2-7 | GAP-05C, GAP-04C | NEW-21, NEW-22 |
| T3-1 | GAP-S5A, GAP-P2A, GAP-P3A | NEW-23, NEW-25, NEW-26 |
| T3-2 | GAP-05A | NEW-27 |
| T3-3 | GAP-06D | NEW-28 |
| T3-4 | GAP-10A | NEW-29 |
| T3-5 | GAP-16B, GAP-16C | NEW-30, NEW-31 |
| T3-6 | GAP-08C | NEW-32 |
| T3-7 | GAP-25C | NEW-33 |
| T3-8 | GAP-17B | NEW-35 |
| T3-9 | GAP-18B | NEW-36 |
| T3-10 | GAP-A5A, GAP-15B | NEW-37, NEW-38 |
| T3-11 | GAP-25A | (supplementary) |
| T4-1 | (all) | (regression verification) |
