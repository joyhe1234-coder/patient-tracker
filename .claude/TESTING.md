# Testing Guide

This document defines the testing strategy and patterns for the Patient Quality Measure Tracking System.

---

## Test Framework

| Component | Framework | Config File |
|-----------|-----------|-------------|
| Backend | Jest + ts-jest | `backend/jest.config.js` |
| Frontend | Vitest | `frontend/vite.config.ts` |

---

## Directory Structure

```
patient-tracker/
├── backend/
│   ├── src/
│   │   └── services/
│   │       └── import/
│   │           └── __tests__/           # Unit tests for import services
│   │               ├── fileParser.test.ts
│   │               ├── columnMapper.test.ts
│   │               ├── dataTransformer.test.ts
│   │               └── validator.test.ts
│   └── jest.config.js
├── frontend/
│   └── src/
│       └── __tests__/                   # Frontend component tests
└── test-data/                           # Shared test CSV/Excel files
    ├── test-valid.csv
    ├── test-dates.csv
    ├── test-multi-column.csv
    ├── test-validation-errors.csv
    ├── test-duplicates.csv
    ├── test-no-measures.csv
    ├── test-warnings.csv
    └── README.md
```

---

## Running Tests

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm test -- --watch         # Watch mode
npm test -- --coverage      # With coverage report
npm test -- fileParser      # Run specific test file
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:ui             # With Vitest UI
```

---

## Backend Jest Configuration

Create `backend/jest.config.js`:

```javascript
/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
```

Add to `backend/package.json`:
```json
{
  "scripts": {
    "test": "NODE_OPTIONS='--experimental-vm-modules' jest",
    "test:watch": "NODE_OPTIONS='--experimental-vm-modules' jest --watch",
    "test:coverage": "NODE_OPTIONS='--experimental-vm-modules' jest --coverage"
  }
}
```

---

## Test Patterns

### 1. Unit Test Structure

```typescript
// backend/src/services/import/__tests__/fileParser.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';
import { parseCSV, parseExcel, ParseResult } from '../fileParser.js';
import * as fs from 'fs';
import * as path from 'path';

describe('fileParser', () => {
  describe('parseCSV', () => {
    it('should parse CSV with headers on first row', () => {
      const csv = 'Name,DOB,Phone\nJohn,01/01/1990,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.rows).toHaveLength(1);
      expect(result.dataStartRow).toBe(2);
    });

    it('should detect title row and skip it', () => {
      const csv = 'Report Generated 2026-01-01\nName,DOB,Phone\nJohn,01/01/1990,5551234567';
      const buffer = Buffer.from(csv);

      const result = parseCSV(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'DOB', 'Phone']);
      expect(result.dataStartRow).toBe(3);
    });
  });
});
```

### 2. Using Test Data Files

```typescript
// Load test data from test-data/ folder
describe('dataTransformer', () => {
  const testDataDir = path.join(__dirname, '../../../../test-data');

  it('should transform valid CSV data', () => {
    const csvPath = path.join(testDataDir, 'test-valid.csv');
    const buffer = fs.readFileSync(csvPath);
    const parseResult = parseCSV(buffer, 'test-valid.csv');

    const result = transformData(
      parseResult.headers,
      parseResult.rows,
      'hill',
      parseResult.dataStartRow
    );

    expect(result.stats.inputRows).toBe(10);
    expect(result.stats.outputRows).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

### 3. Testing Error Cases

```typescript
describe('validator', () => {
  it('should report error for missing DOB', () => {
    const rows: TransformedRow[] = [{
      memberName: 'John Smith',
      memberDob: null,  // Missing DOB
      memberTelephone: '5551234567',
      memberAddress: '123 Main St',
      requestType: 'AWV',
      qualityMeasure: 'Annual Wellness Visit',
      measureStatus: 'Completed',
      statusDate: '2026-01-15',
      sourceRowIndex: 0,
      sourceMeasureColumn: 'AWV Q2',
    }];

    const result = validateRows(rows);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('memberDob');
    expect(result.errors[0].rowIndex).toBe(0);
  });

  it('should deduplicate errors by sourceRowIndex + field', () => {
    // Two transformed rows from same source row, both missing DOB
    const rows: TransformedRow[] = [
      { ...baseRow, sourceRowIndex: 0, qualityMeasure: 'AWV' },
      { ...baseRow, sourceRowIndex: 0, qualityMeasure: 'Eye Exam' },
    ];

    const result = validateRows(rows);

    // Should only have 1 DOB error, not 2
    const dobErrors = result.errors.filter(e => e.field === 'memberDob');
    expect(dobErrors).toHaveLength(1);
  });
});
```

### 4. Testing Data Transformations

```typescript
describe('dataTransformer - any non-compliant wins', () => {
  it('should set non-compliant if ANY column is non-compliant', () => {
    // CSV with multiple columns for same measure
    const headers = ['Patient', 'DOB', 'Breast E 40-49 Q2', 'Breast E 50-74 Q2'];
    const rows = [{
      'Patient': 'Jane Doe',
      'DOB': '01/15/1970',
      'Breast E 40-49 Q2': 'Compliant',
      'Breast E 50-74 Q2': 'Non Compliant',  // This should win
    }];

    const result = transformData(headers, rows, 'hill', 2);

    const breastRow = result.rows.find(r => r.qualityMeasure === 'Breast Cancer Screening');
    expect(breastRow?.measureStatus).toBe('Not Addressed');
  });
});
```

---

## Test Data Files Reference

| File | Purpose | Key Test Cases |
|------|---------|----------------|
| `test-valid.csv` | Happy path - all valid data | Basic transformation, no errors |
| `test-dates.csv` | Date parsing variations | Excel serial, MM/DD/YYYY, M/D/YY, invalid dates |
| `test-multi-column.csv` | Multiple columns → same measure | "Any non-compliant wins" logic |
| `test-validation-errors.csv` | Trigger validation errors | Missing name, missing DOB, invalid DOB |
| `test-duplicates.csv` | Duplicate detection | Same patient + measure rows |
| `test-no-measures.csv` | Empty measure columns | Patients with no measures tracking |
| `test-warnings.csv` | Warnings (not errors) | Missing phone, canProceed=true |

---

## Expected Test Results

### test-valid.csv
```
Input: 10 rows
Output: ~40 generated rows (10 patients × 4 measures)
Errors: 0
Warnings: possible phone/status warnings
```

### test-validation-errors.csv
```
Input: 10 rows
Errors:
  - Row 3: Missing member name
  - Row 4: Missing DOB
  - Row 5: Invalid DOB format
Patients with no measures: 1 (Row 7)
```

### test-multi-column.csv
```
Row 1 (AllCompliant): All columns compliant → "Screening test completed"
Row 2 (AnyNonCompliant): One column non-compliant → "Not Addressed"
Row 6 (AllEmpty): No data → No rows generated for that measure
```

---

## Mocking Guidelines

### Mocking Config Loader
```typescript
import { jest } from '@jest/globals';

jest.mock('../configLoader.js', () => ({
  loadSystemConfig: jest.fn(() => ({
    name: 'Test System',
    patientColumns: { 'Patient': 'memberName' },
    measureColumns: {},
    statusMapping: {},
    skipColumns: [],
  })),
  systemExists: jest.fn(() => true),
}));
```

### Mocking File System (for file reads)
```typescript
import { jest } from '@jest/globals';
import * as fs from 'fs';

jest.spyOn(fs, 'readFileSync').mockReturnValue(Buffer.from('mock,csv,data'));
```

---

## Coverage Requirements

| Module | Minimum Coverage |
|--------|------------------|
| fileParser.ts | 80% |
| columnMapper.ts | 80% |
| dataTransformer.ts | 85% |
| validator.ts | 85% |
| errorReporter.ts | 70% |

---

## CI Integration

Tests run automatically on:
- Pull request to `main` or `develop`
- Push to `develop`

GitHub Actions workflow (`.github/workflows/test.yml`):
```yaml
name: Tests
on:
  push:
    branches: [develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install backend deps
        run: cd backend && npm ci
      - name: Run backend tests
        run: cd backend && npm test
```

---

## Adding New Tests Checklist

When adding new functionality:

1. [ ] Create test file in `__tests__/` directory
2. [ ] Follow naming convention: `{module}.test.ts`
3. [ ] Import from source using `.js` extension (ESM)
4. [ ] Add test cases for:
   - [ ] Happy path (valid input)
   - [ ] Edge cases (empty, null, boundary values)
   - [ ] Error cases (invalid input)
5. [ ] Use test data files from `test-data/` when applicable
6. [ ] Update this document if new patterns emerge
7. [ ] Run `npm test` to verify all tests pass

---

## Last Updated

January 26, 2026
