# Testing Guide

This document defines the testing strategy and patterns for the Patient Quality Measure Tracking System.

---

## Testing Approaches Overview

We use **two complementary testing approaches** for the import transformation pipeline:

| Approach | Purpose | When to Use |
|----------|---------|-------------|
| **Option 1: Jest Unit Tests** | Fast, isolated unit tests | During development, CI pipeline |
| **Option 3: CLI Test Script** | End-to-end validation with real files | Manual testing, regression checks, baseline updates |

Both approaches use the same test data files in `test-data/` folder.

---

## Option 1: Jest Unit Tests

### Overview

- **Framework:** Jest + ts-jest (ESM mode)
- **Location:** `backend/src/services/import/__tests__/`
- **Total Tests:** 130 tests across 7 test files
- **Run Time:** ~4 seconds

### Test Files

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `fileParser.test.ts` | 16 | CSV parsing, title row detection, column validation |
| `columnMapper.test.ts` | 13 | Column mapping, Q1/Q2 grouping, skip columns, stats |
| `dataTransformer.test.ts` | 17 | Wide-to-long transformation, "any non-compliant wins", date parsing |
| `validator.test.ts` | 23 | Validation rules, error deduplication, duplicate detection |
| `configLoader.test.ts` | 22 | System config loading, registry, validation |
| `errorReporter.test.ts` | 25 | Error report generation, formatting, condensed reports |
| `integration.test.ts` | 14 | Full pipeline tests, edge cases, error propagation |

### Running Jest Tests

```bash
cd backend

# Run all tests
npm test

# Run in watch mode (re-runs on file changes)
npm test -- --watch

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test -- fileParser
npm test -- validator

# Run specific test by name
npm test -- -t "should parse CSV"
```

### Expected Output

```
PASS src/services/import/__tests__/columnMapper.test.ts (13 tests)
PASS src/services/import/__tests__/fileParser.test.ts (16 tests)
PASS src/services/import/__tests__/dataTransformer.test.ts (17 tests)
PASS src/services/import/__tests__/validator.test.ts (23 tests)
PASS src/services/import/__tests__/configLoader.test.ts (22 tests)
PASS src/services/import/__tests__/errorReporter.test.ts (25 tests)
PASS src/services/import/__tests__/integration.test.ts (14 tests)

Test Suites: 7 passed, 7 total
Tests:       130 passed, 130 total
Time:        ~4s
```

---

## Option 3: CLI Test Script

### Overview

- **Script:** `backend/scripts/test-transform.ts`
- **Purpose:** Run full transformation pipeline on test files without server
- **Baselines:** `test-data/expected/*.json`
- **Use Cases:** Manual testing, regression checks, updating baselines

### Running CLI Tests

```bash
cd backend

# Run all 7 test files, display results
npm run test:cli

# Run specific test file
npm run test:cli -- test-valid.csv
npm run test:cli -- test-duplicates.csv

# Compare results against saved baselines (for CI)
npm run test:cli -- --compare

# Save current results as new baselines
npm run test:cli -- --save

# Include detailed row-by-row data
npm run test:cli -- --details
```

### Expected Output (Run Mode)

```
🧪 Import Transform Test Script
Mode: RUN
Files: 7

============================================================
File: test-valid.csv
============================================================

📄 Parse:
   Total rows: 10
   Data starts at row: 2
   Headers: 14 columns

🗺️  Mapping:
   Mapped: 14
   Skipped: 0
   Unmapped: 0
   Measure types: 5

🔄 Transform:
   Input rows: 10
   Output rows: 42
   Patients with no measures: 0
   Transform errors: 0

✅ Validation:
   Valid: ✅ YES
   Errors: 0
   Warnings: 0
   Duplicate groups: 0

... (repeats for all 7 files)

============================================================
SUMMARY
============================================================
Files processed: 7
```

### Expected Output (Compare Mode)

```
🧪 Import Transform Test Script
Mode: COMPARE
Files: 7

✅ test-valid.csv: PASSED
✅ test-dates.csv: PASSED
✅ test-multi-column.csv: PASSED
✅ test-validation-errors.csv: PASSED
✅ test-duplicates.csv: PASSED
✅ test-no-measures.csv: PASSED
✅ test-warnings.csv: PASSED

============================================================
SUMMARY
============================================================
Files processed: 7
Result: ✅ ALL PASSED
```

### Baseline Files

Located in `test-data/expected/`:

| Baseline File | Source Test File |
|---------------|------------------|
| `test-valid.csv.json` | test-valid.csv |
| `test-dates.csv.json` | test-dates.csv |
| `test-multi-column.csv.json` | test-multi-column.csv |
| `test-validation-errors.csv.json` | test-validation-errors.csv |
| `test-duplicates.csv.json` | test-duplicates.csv |
| `test-no-measures.csv.json` | test-no-measures.csv |
| `test-warnings.csv.json` | test-warnings.csv |

### When to Update Baselines

Run `npm run test:cli -- --save` when:
- You intentionally change transformation behavior
- You add new test data files
- You fix a bug and the correct output is different

**DO NOT** update baselines if tests fail unexpectedly - investigate the failure first!

---

## Test Data Files

All test data is in `test-data/` folder:

| File | Rows | Purpose | Expected Behavior |
|------|------|---------|-------------------|
| `test-valid.csv` | 10 | Happy path, all valid | 42 output rows, 0 errors |
| `test-dates.csv` | 8 | Date format variations | 1 transform error, 2 validation errors |
| `test-multi-column.csv` | 8 | Multiple columns → same measure | Tests "any non-compliant wins" |
| `test-validation-errors.csv` | 10 | Missing/invalid fields | 2 validation errors, 1 no-measure patient |
| `test-duplicates.csv` | 8 | Duplicate detection | 6 duplicate groups, 9 warnings |
| `test-no-measures.csv` | 10 | Empty measure columns | 5 patients with no measures |
| `test-warnings.csv` | 10 | Warnings only (missing phone) | Valid=true, 5 warnings |

---

## Directory Structure

```
patient-tracker/
├── backend/
│   ├── jest.config.js                    # Jest configuration
│   ├── package.json                      # Test scripts
│   ├── scripts/
│   │   └── test-transform.ts             # CLI test script (Option 3)
│   └── src/services/import/
│       └── __tests__/                    # Jest tests (Option 1)
│           ├── fileParser.test.ts
│           ├── columnMapper.test.ts
│           ├── dataTransformer.test.ts
│           ├── validator.test.ts
│           ├── configLoader.test.ts
│           ├── errorReporter.test.ts
│           └── integration.test.ts
└── test-data/
    ├── test-valid.csv                    # Test input files
    ├── test-dates.csv
    ├── test-multi-column.csv
    ├── test-validation-errors.csv
    ├── test-duplicates.csv
    ├── test-no-measures.csv
    ├── test-warnings.csv
    ├── README.md
    └── expected/                         # Baseline files (Option 3)
        ├── test-valid.csv.json
        ├── test-dates.csv.json
        └── ... (7 files)
```

---

## Workflow Recommendations

### During Development

1. Make code changes
2. Run `npm test` to verify unit tests pass
3. If behavior changed intentionally, run `npm run test:cli -- --save`

### Before Commit

```bash
cd backend
npm test                          # All 130 unit tests pass
npm run test:cli -- --compare     # All 7 files match baselines
```

### For CI Pipeline

```yaml
- name: Run unit tests
  run: cd backend && npm test

- name: Run regression tests
  run: cd backend && npm run test:cli -- --compare
```

### When Adding New Functionality

1. Add unit tests to appropriate `__tests__/*.test.ts` file
2. If needed, create new test data CSV in `test-data/`
3. Run `npm run test:cli -- --save` to create baseline
4. Commit both test file and baseline

---

## Writing New Tests

### Jest Unit Test Template

```typescript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '../myModule.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const testDataDir = path.join(__dirname, '../../../../../test-data');

describe('myModule', () => {
  describe('myFunction', () => {
    it('should handle valid input', () => {
      const result = myFunction(validInput);
      expect(result.success).toBe(true);
    });

    it('should handle edge case', () => {
      const result = myFunction(null);
      expect(result.errors).toHaveLength(1);
    });

    it('should work with test data files', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      const buffer = fs.readFileSync(csvPath);
      // ... test with real file
    });
  });
});
```

### Key Patterns

1. **Use ESM imports** - Import with `.js` extension
2. **Use `fileURLToPath`** - For ESM-compatible `__dirname`
3. **Group related tests** - Use nested `describe` blocks
4. **Test with real files** - Use `test-data/*.csv` for integration tests
5. **Test error cases** - Always test invalid/edge case inputs

---

## Troubleshooting

### "ReferenceError: __dirname is not defined"

Add ESM-compatible dirname:
```typescript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

### Tests timeout

Increase timeout in jest.config.js:
```javascript
testTimeout: 10000,
```

### CLI script fails to find test files

Run from `backend/` directory:
```bash
cd backend && npm run test:cli
```

---

## Last Updated

January 26, 2026 - Expanded to 130 tests across 7 test files (added configLoader, errorReporter, integration tests)
