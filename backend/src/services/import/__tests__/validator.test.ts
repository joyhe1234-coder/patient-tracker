/**
 * Unit tests for validator.ts
 * Tests validation rules, error deduplication, and duplicate detection
 */

import { describe, it, expect } from '@jest/globals';
import { validateRows, ValidationResult, ValidationError } from '../validator.js';
import { TransformedRow } from '../dataTransformer.js';
import { parseCSV } from '../fileParser.js';
import { transformData } from '../dataTransformer.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data files
const testDataDir = path.join(__dirname, '../../../../../test-data');
const systemId = 'hill';

// Helper to create a valid base row
function createBaseRow(overrides: Partial<TransformedRow> = {}): TransformedRow {
  return {
    memberName: 'John Smith',
    memberDob: '1990-01-15',
    memberTelephone: '(555) 123-4567',
    memberAddress: '123 Main St',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    measureStatus: 'Completed',
    statusDate: '2026-01-15',
    sourceRowIndex: 0,
    sourceMeasureColumn: 'Annual Wellness Visit Q2',
    ...overrides,
  };
}

describe('validator', () => {
  describe('required field validation', () => {
    it('should pass validation for valid row', () => {
      const rows = [createBaseRow()];

      const result = validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report error for missing memberName', () => {
      const rows = [createBaseRow({ memberName: '' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('memberName');
      expect(result.errors[0].message).toContain('required');
    });

    it('should report error for missing memberDob', () => {
      const rows = [createBaseRow({ memberDob: null })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const dobError = result.errors.find(e => e.field === 'memberDob');
      expect(dobError).toBeDefined();
      expect(dobError?.message).toContain('required');
    });

    it('should report error for invalid memberDob format', () => {
      const rows = [createBaseRow({ memberDob: 'invalid-date' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const dobError = result.errors.find(e => e.field === 'memberDob');
      expect(dobError).toBeDefined();
      expect(dobError?.message).toContain('Invalid');
    });

    it('should report error for missing requestType', () => {
      const rows = [createBaseRow({ requestType: '' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const error = result.errors.find(e => e.field === 'requestType');
      expect(error).toBeDefined();
    });

    it('should report error for missing qualityMeasure', () => {
      const rows = [createBaseRow({ qualityMeasure: '' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const error = result.errors.find(e => e.field === 'qualityMeasure');
      expect(error).toBeDefined();
    });
  });

  describe('warnings', () => {
    it('should warn for missing phone number', () => {
      const rows = [createBaseRow({ memberTelephone: null })];

      const result = validateRows(rows);

      expect(result.valid).toBe(true); // Warnings don't fail validation
      const phoneWarning = result.warnings.find(w => w.field === 'memberTelephone');
      expect(phoneWarning).toBeDefined();
      expect(phoneWarning?.severity).toBe('warning');
    });

    it('should warn for missing measureStatus', () => {
      const rows = [createBaseRow({ measureStatus: null })];

      const result = validateRows(rows);

      expect(result.valid).toBe(true);
      const statusWarning = result.warnings.find(w => w.field === 'measureStatus');
      expect(statusWarning).toBeDefined();
    });
  });

  describe('error deduplication', () => {
    it('should deduplicate errors by sourceRowIndex + field', () => {
      // Two transformed rows from same source row (different measures), both missing DOB
      const rows = [
        createBaseRow({ memberDob: null, qualityMeasure: 'Annual Wellness Visit', sourceRowIndex: 0 }),
        createBaseRow({ memberDob: null, qualityMeasure: 'Diabetic Eye Exam', sourceRowIndex: 0 }),
      ];

      const result = validateRows(rows);

      // Should only have 1 DOB error, not 2
      const dobErrors = result.errors.filter(e => e.field === 'memberDob');
      expect(dobErrors).toHaveLength(1);
    });

    it('should report separate errors for different source rows', () => {
      const rows = [
        createBaseRow({ memberDob: null, sourceRowIndex: 0 }),
        createBaseRow({ memberDob: null, sourceRowIndex: 1 }),
      ];

      const result = validateRows(rows);

      // Should have 2 DOB errors (one per source row)
      const dobErrors = result.errors.filter(e => e.field === 'memberDob');
      expect(dobErrors).toHaveLength(2);
    });

    it('should deduplicate warnings too', () => {
      const rows = [
        createBaseRow({ memberTelephone: null, qualityMeasure: 'AWV', sourceRowIndex: 0 }),
        createBaseRow({ memberTelephone: null, qualityMeasure: 'Eye Exam', sourceRowIndex: 0 }),
      ];

      const result = validateRows(rows);

      const phoneWarnings = result.warnings.filter(w => w.field === 'memberTelephone');
      expect(phoneWarnings).toHaveLength(1);
    });
  });

  describe('error includes memberName', () => {
    it('should include memberName in error for identification', () => {
      const rows = [createBaseRow({ memberDob: null, memberName: 'Jane Doe' })];

      const result = validateRows(rows);

      expect(result.errors[0].memberName).toBe('Jane Doe');
    });

    it('should show "Unknown" for missing memberName', () => {
      const rows = [createBaseRow({ memberName: '', memberDob: null })];

      const result = validateRows(rows);

      const nameError = result.errors.find(e => e.field === 'memberName');
      expect(nameError?.memberName).toBe('Unknown');
    });
  });

  describe('duplicate detection', () => {
    it('should detect duplicate rows (same patient + measure)', () => {
      const rows = [
        createBaseRow({ memberName: 'John Smith', memberDob: '1990-01-15', qualityMeasure: 'AWV', sourceRowIndex: 0 }),
        createBaseRow({ memberName: 'John Smith', memberDob: '1990-01-15', qualityMeasure: 'AWV', sourceRowIndex: 1 }),
      ];

      const result = validateRows(rows);

      expect(result.duplicates).toHaveLength(1);
      expect(result.duplicates[0].patient).toBe('John Smith');
      expect(result.duplicates[0].rows).toContain(0);
      expect(result.duplicates[0].rows).toContain(1);
    });

    it('should not flag different measures as duplicates', () => {
      const rows = [
        createBaseRow({ memberName: 'John Smith', qualityMeasure: 'Annual Wellness Visit', sourceRowIndex: 0 }),
        createBaseRow({ memberName: 'John Smith', qualityMeasure: 'Diabetic Eye Exam', sourceRowIndex: 1 }),
      ];

      const result = validateRows(rows);

      expect(result.duplicates).toHaveLength(0);
    });

    it('should not flag different patients as duplicates', () => {
      const rows = [
        createBaseRow({ memberName: 'John Smith', sourceRowIndex: 0 }),
        createBaseRow({ memberName: 'Jane Doe', sourceRowIndex: 1 }),
      ];

      const result = validateRows(rows);

      expect(result.duplicates).toHaveLength(0);
    });

    it('should add warning for duplicate rows', () => {
      const rows = [
        createBaseRow({ sourceRowIndex: 0 }),
        createBaseRow({ sourceRowIndex: 1 }),
      ];

      const result = validateRows(rows);

      const dupWarning = result.warnings.find(w => w.field === 'duplicate');
      expect(dupWarning).toBeDefined();
      expect(dupWarning?.severity).toBe('warning');
    });
  });

  describe('row index tracking', () => {
    it('should use sourceRowIndex in error reports', () => {
      const rows = [
        createBaseRow({ memberDob: null, sourceRowIndex: 5 }),
      ];

      const result = validateRows(rows);

      expect(result.errors[0].rowIndex).toBe(5); // sourceRowIndex, not array index
    });
  });

  describe('validation stats', () => {
    it('should calculate stats correctly', () => {
      const rows = [
        createBaseRow({ sourceRowIndex: 0 }),
        createBaseRow({ memberDob: null, sourceRowIndex: 1 }),
        createBaseRow({ memberTelephone: null, sourceRowIndex: 2 }),
      ];

      const result = validateRows(rows);

      expect(result.stats.totalRows).toBe(3);
      expect(result.stats.errorRows).toBe(1); // Row 1 has error
      expect(result.stats.warningRows).toBeGreaterThanOrEqual(1); // Row 2 has warning
      expect(result.stats.validRows).toBe(2); // Rows 0 and 2
    });
  });

  describe('with test data files', () => {
    it('should validate test-valid.csv with no errors', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-valid.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-valid.csv');
      const transformResult = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);
      const result = validateRows(transformResult.rows);

      expect(result.errors).toHaveLength(0);
      expect(result.valid).toBe(true);
    });

    it('should find errors in test-validation-errors.csv', () => {
      const csvPath = path.join(testDataDir, 'test-validation-errors.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-validation-errors.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-validation-errors.csv');
      const transformResult = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);
      const result = validateRows(transformResult.rows);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.valid).toBe(false);

      // Should have DOB errors
      const dobErrors = result.errors.filter(e => e.field === 'memberDob');
      expect(dobErrors.length).toBeGreaterThan(0);
    });

    it('should find duplicates in test-duplicates.csv', () => {
      const csvPath = path.join(testDataDir, 'test-duplicates.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-duplicates.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-duplicates.csv');
      const transformResult = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);
      const result = validateRows(transformResult.rows);

      expect(result.duplicates.length).toBeGreaterThan(0);
    });

    it('should have warnings but pass for test-warnings.csv', () => {
      const csvPath = path.join(testDataDir, 'test-warnings.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-warnings.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-warnings.csv');
      const transformResult = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);
      const result = validateRows(transformResult.rows);

      expect(result.valid).toBe(true); // No errors
      expect(result.warnings.length).toBeGreaterThan(0); // Has warnings
    });
  });

  describe('date validation edge cases', () => {
    it('should accept various valid date formats after transformation', () => {
      // The transformer should normalize to YYYY-MM-DD
      const validDates = [
        '1990-01-15',
        '2000-12-31',
        '1950-06-01',
      ];

      for (const date of validDates) {
        const rows = [createBaseRow({ memberDob: date })];
        const result = validateRows(rows);
        expect(result.errors.filter(e => e.field === 'memberDob')).toHaveLength(0);
      }
    });

    it('should reject invalid date formats', () => {
      const invalidDates = [
        'not-a-date',
        '01/15/1990', // Wrong format (should be transformed earlier)
        '1990-13-01', // Invalid month
        '1990-01-32', // Invalid day
        '1990-00-01', // Invalid month (zero)
        '1990-01-00', // Invalid day (zero)
      ];

      for (const date of invalidDates) {
        const rows = [createBaseRow({ memberDob: date })];
        const result = validateRows(rows);
        const dobErrors = result.errors.filter(e => e.field === 'memberDob');
        expect(dobErrors.length).toBeGreaterThan(0);
      }
    });

    it('should reject empty string as DOB', () => {
      const rows = [createBaseRow({ memberDob: '' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const dobError = result.errors.find(e => e.field === 'memberDob');
      expect(dobError).toBeDefined();
    });
  });

  describe('name validation edge cases', () => {
    it('should accept names with special characters', () => {
      const specialNames = [
        "O'Brien",
        'María García',
        'Jean-Pierre',
        'Dr. Smith, Jr.',
        '김철수', // Korean
        '田中太郎', // Japanese
      ];

      for (const name of specialNames) {
        const rows = [createBaseRow({ memberName: name })];
        const result = validateRows(rows);
        expect(result.errors.filter(e => e.field === 'memberName')).toHaveLength(0);
      }
    });

    it('should reject whitespace-only names', () => {
      const rows = [createBaseRow({ memberName: '   ' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const nameError = result.errors.find(e => e.field === 'memberName');
      expect(nameError).toBeDefined();
    });
  });

  describe('request type validation', () => {
    it('should accept all valid request types', () => {
      const validTypes = ['AWV', 'Quality', 'Screening', 'Chronic DX'];

      for (const type of validTypes) {
        const rows = [createBaseRow({ requestType: type, qualityMeasure: 'Test' })];
        const result = validateRows(rows);
        const typeErrors = result.errors.filter(e => e.field === 'requestType');
        expect(typeErrors).toHaveLength(0);
      }
    });

    it('should reject invalid request types', () => {
      const rows = [createBaseRow({ requestType: 'InvalidType' })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      const typeError = result.errors.find(e => e.field === 'requestType');
      expect(typeError).toBeDefined();
      expect(typeError?.message).toContain('Invalid request type');
    });

    it('should handle case sensitivity for request types', () => {
      const rows = [createBaseRow({ requestType: 'awv' })]; // lowercase

      const result = validateRows(rows);

      // Should be rejected as the validator is case-sensitive
      const typeErrors = result.errors.filter(e => e.field === 'requestType');
      expect(typeErrors.length).toBeGreaterThan(0);
    });
  });

  describe('quality measure validation', () => {
    it('should accept valid quality measures for each request type', () => {
      const validCombinations = [
        { requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam' },
        { requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening' },
        { requestType: 'Chronic DX', qualityMeasure: 'Chronic Diagnosis Code' },
      ];

      for (const combo of validCombinations) {
        const rows = [createBaseRow(combo)];
        const result = validateRows(rows);
        const measureErrors = result.errors.filter(e => e.field === 'qualityMeasure');
        expect(measureErrors).toHaveLength(0);
      }
    });

    it('should warn for mismatched request type and quality measure', () => {
      // AWV type with Quality measure
      const rows = [createBaseRow({
        requestType: 'AWV',
        qualityMeasure: 'Diabetic Eye Exam',
      })];

      const result = validateRows(rows);

      // Should be a warning, not an error
      const measureWarning = result.warnings.find(w => w.field === 'qualityMeasure');
      expect(measureWarning).toBeDefined();
      expect(measureWarning?.message).toContain('Invalid quality measure');
    });
  });

  describe('multiple errors per row', () => {
    it('should collect multiple errors from the same row', () => {
      const rows = [createBaseRow({
        memberName: '',
        memberDob: null,
        requestType: '',
        qualityMeasure: '',
        sourceRowIndex: 0,
      })];

      const result = validateRows(rows);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('large dataset handling', () => {
    it('should handle a large number of rows efficiently', () => {
      const rows = [];
      for (let i = 0; i < 1000; i++) {
        rows.push(createBaseRow({
          memberName: `Patient ${i}`,
          sourceRowIndex: i,
        }));
      }

      const startTime = Date.now();
      const result = validateRows(rows);
      const elapsed = Date.now() - startTime;

      expect(result.stats.totalRows).toBe(1000);
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  describe('validation result structure', () => {
    it('should have correct stats even with no errors', () => {
      const rows = [
        createBaseRow({ sourceRowIndex: 0 }),
        createBaseRow({ sourceRowIndex: 1, memberName: 'Another Patient' }),
      ];

      const result = validateRows(rows);

      expect(result.valid).toBe(true);
      expect(result.stats.totalRows).toBe(2);
      expect(result.stats.validRows).toBe(2);
      expect(result.stats.errorRows).toBe(0);
    });

    it('should have empty arrays when no issues', () => {
      const rows = [createBaseRow()];

      const result = validateRows(rows);

      expect(result.errors).toEqual([]);
      expect(result.duplicates).toEqual([]);
    });
  });
});
