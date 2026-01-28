# Test Improvement Plan

This document analyzes the current test coverage and proposes additional tests for the import transformation pipeline.

---

## Current Test Coverage Summary (UPDATED)

| Module | Tests | Coverage Areas | Status |
|--------|-------|----------------|--------|
| **fileParser.ts** | 16 | CSV parsing, title rows, validation | ✅ |
| **columnMapper.ts** | 13 | Column mapping, Q1/Q2 grouping, stats | ✅ |
| **dataTransformer.ts** | 17 | Wide-to-long transform, compliance logic | ✅ |
| **validator.ts** | 23 | Validation rules, deduplication, duplicates | ✅ |
| **configLoader.ts** | 22 | Config loading, registry, validation | ✅ NEW |
| **errorReporter.ts** | 25 | Report generation, formatting | ✅ NEW |
| **integration.test.ts** | 14 | Full pipeline, edge cases | ✅ NEW |

**Total: 130 tests across 7 test files (all modules covered)**

---

## Test Categories

### Category 1: Unit Tests (Current Focus)
Fast, isolated tests for individual functions.

### Category 2: Integration Tests (Partial)
Tests using real CSV files from `test-data/` folder.

### Category 3: Edge Case Tests (Gaps Identified)
Boundary conditions, unusual inputs, error scenarios.

### Category 4: Performance Tests (Not Implemented)
Large file handling, memory usage.

---

## Gap Analysis by Module

### 1. configLoader.ts - NO TESTS ❌

| Function | Priority | Test Cases Needed |
|----------|----------|-------------------|
| `loadSystemsRegistry()` | High | Load valid registry, missing file error |
| `loadSystemConfig()` | High | Load valid config, unknown system error, missing file error |
| `listSystems()` | Medium | Returns correct system list with default flag |
| `getDefaultSystemId()` | Medium | Returns default from registry |
| `systemExists()` | Medium | True for existing, false for non-existing |

**Estimated Tests: 8-10**

---

### 2. errorReporter.ts - NO TESTS ❌

| Function | Priority | Test Cases Needed |
|----------|----------|-------------------|
| `generateErrorReport()` | High | Generate full report with all sections |
| `generateSummary()` | High | Success state, warning state, error state |
| `groupErrorsByField()` | Medium | Group errors correctly, limit sample errors to 5 |
| `groupErrorsByRow()` | Medium | Group by row with patient name |
| `generateDuplicateReport()` | Medium | Calculate totals correctly |
| `formatReportAsText()` | Low | Format includes all sections |
| `getCondensedReport()` | Medium | Limits errors/warnings to 10, duplicates to 5 |

**Estimated Tests: 12-15**

---

### 3. fileParser.ts - GAPS IDENTIFIED

| Gap | Priority | Test Cases Needed |
|-----|----------|-------------------|
| Excel (.xlsx) parsing | High | Parse simple Excel, multi-sheet (use first), dates |
| BOM handling | Medium | UTF-8 BOM prefix doesn't break parsing |
| Windows line endings | Low | \r\n handled correctly |
| Empty file vs empty data | Medium | Distinguish between no file and empty content |
| Title row edge cases | Medium | Multiple title rows, title with commas |

**Estimated Additional Tests: 6-8**

---

### 4. columnMapper.ts - GAPS IDENTIFIED

| Gap | Priority | Test Cases Needed |
|-----|----------|-------------------|
| Case-insensitive headers | High | "PATIENT" maps same as "Patient" |
| Q1 without Q2 (orphan) | Medium | What happens with partial pairs? |
| Q2 without Q1 | Medium | Status-only columns |
| Duplicate headers | Low | Same header appears twice |

**Estimated Additional Tests: 4-6**

---

### 5. dataTransformer.ts - GAPS IDENTIFIED

| Gap | Priority | Test Cases Needed |
|-----|----------|-------------------|
| Empty row (all blank) | Medium | Skip completely blank rows |
| Special characters | Medium | Names with quotes, commas, unicode |
| Excel date serial numbers | High | 45678 → proper date |
| Very long values | Low | 1000+ char address |
| Null vs empty string | Medium | Distinguish null from "" |

**Estimated Additional Tests: 5-7**

---

### 6. validator.ts - GAPS IDENTIFIED

| Gap | Priority | Test Cases Needed |
|-----|----------|-------------------|
| Future DOB | Medium | DOB in future should warn/error |
| Age validation | Low | Unrealistic ages (150+ years) |
| Phone format validation | Low | Validate phone number format |
| Address validation | Low | Minimum length check |
| Multiple error types same row | Medium | Row with both missing name and DOB |

**Estimated Additional Tests: 5-7**

---

## Integration Test Gaps

| Test Scenario | Priority | Description |
|---------------|----------|-------------|
| Full pipeline success | High | parse → map → transform → validate → report (all pass) |
| Full pipeline with errors | High | Errors propagate correctly through pipeline |
| Full pipeline with warnings | Medium | Warnings don't block, appear in report |
| Config switching | Medium | Different system configs produce different mappings |

**Estimated Tests: 4-6**

---

## Proposed Test Files

| New Test File | Module | Estimated Tests |
|---------------|--------|-----------------|
| `configLoader.test.ts` | configLoader.ts | 10 |
| `errorReporter.test.ts` | errorReporter.ts | 15 |
| `integration.test.ts` | Full pipeline | 6 |

---

## Implementation Priority

### Phase 1: Critical Gaps (Untested Modules) ✅ COMPLETED
1. `configLoader.test.ts` - 22 tests added
2. `errorReporter.test.ts` - 25 tests added

**Result: 47 tests added**

### Phase 2: High-Priority Gaps ✅ COMPLETED (via integration tests)
1. Column mapping integration tests
2. Multi-column measure handling
3. Edge case coverage

**Result: Covered in integration.test.ts**

### Phase 3: Integration Tests ✅ COMPLETED
1. `integration.test.ts` - 14 tests added
2. Full pipeline tests with all test data files

**Result: 14 tests added**

### Phase 4: Edge Cases (Future Enhancement)
1. Special characters, unicode
2. Future DOB validation
3. Very long values
4. Excel file parsing (.xlsx)

**Status: Not yet implemented - available for future enhancement**

---

## Test Data Enhancements Needed

| New Test File | Purpose |
|---------------|---------|
| `test-excel.xlsx` | Excel format parsing |
| `test-special-chars.csv` | Unicode, quotes, special characters |
| `test-large.csv` | Performance testing (1000+ rows) |

---

## Final Coverage Achieved

| Phase | Tests Added | Cumulative |
|-------|-------------|------------|
| Original | 69 | 69 |
| Phase 1 (configLoader + errorReporter) | +47 | 116 |
| Phase 3 (integration) | +14 | 130 |

**Result: 130 tests covering all 6 modules + integration**

---

## Quick Wins (Can Do Now)

These tests can be added quickly with minimal effort:

1. **configLoader basic tests** - Just load existing configs
2. **Error report summary states** - 3 simple tests
3. **Case-insensitive header test** - 1 test
4. **Excel date serial test** - 1 test

---

## Last Updated

January 26, 2026
