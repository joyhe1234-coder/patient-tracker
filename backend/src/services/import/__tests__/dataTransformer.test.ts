/**
 * Unit tests for dataTransformer.ts
 * Tests wide-to-long format transformation and "any non-compliant wins" logic
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { transformData, TransformResult, TransformedRow } from '../dataTransformer.js';
import { parseCSV } from '../fileParser.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data files
const testDataDir = path.join(__dirname, '../../../../../test-data');
const systemId = 'hill';

describe('dataTransformer', () => {
  describe('basic transformation', () => {
    it('should transform single row with one measure', () => {
      const headers = ['Patient', 'DOB', 'Phone', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];
      const rows = [{
        'Patient': 'John Smith',
        'DOB': '01/15/1990',
        'Phone': '5551234567',
        'Annual Wellness Visit Q1': '01/10/2026',
        'Annual Wellness Visit Q2': 'Compliant',
      }];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.stats.inputRows).toBe(1);
      expect(result.stats.outputRows).toBe(1);
      expect(result.rows).toHaveLength(1);

      const row = result.rows[0];
      expect(row.memberName).toBe('John Smith');
      expect(row.memberDob).toBe('1990-01-15'); // ISO format
      expect(row.requestType).toBe('AWV');
      expect(row.qualityMeasure).toBe('Annual Wellness Visit');
      expect(row.sourceRowIndex).toBe(0);
    });

    it('should transform one patient row into multiple measure rows', () => {
      const headers = [
        'Patient', 'DOB',
        'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2',
        'Eye Exam Q1', 'Eye Exam Q2',
      ];
      const rows = [{
        'Patient': 'Jane Doe',
        'DOB': '03/22/1985',
        'Annual Wellness Visit Q1': '01/10/2026',
        'Annual Wellness Visit Q2': 'Compliant',
        'Eye Exam Q1': '01/05/2026',
        'Eye Exam Q2': 'Non Compliant',
      }];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.stats.inputRows).toBe(1);
      expect(result.stats.outputRows).toBe(2); // AWV + Eye Exam
      expect(result.rows).toHaveLength(2);

      // Both rows should have same patient data
      expect(result.rows[0].memberName).toBe('Jane Doe');
      expect(result.rows[1].memberName).toBe('Jane Doe');

      // Different measures
      const measures = result.rows.map(r => r.qualityMeasure);
      expect(measures).toContain('Annual Wellness Visit');
      expect(measures).toContain('Diabetic Eye Exam');
    });

    it('should skip measures with no data', () => {
      const headers = [
        'Patient', 'DOB',
        'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2',
        'Eye Exam Q1', 'Eye Exam Q2', // Both empty
      ];
      const rows = [{
        'Patient': 'Bob Wilson',
        'DOB': '07/08/1970',
        'Annual Wellness Visit Q1': '01/10/2026',
        'Annual Wellness Visit Q2': 'Compliant',
        'Eye Exam Q1': '',
        'Eye Exam Q2': '',
      }];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.stats.outputRows).toBe(1); // Only AWV
      expect(result.rows[0].qualityMeasure).toBe('Annual Wellness Visit');
    });

    it('should track dataStartRow correctly', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];
      const rows = [{ 'Patient': 'Test', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'Compliant' }];

      const result = transformData(headers, rows, systemId, 3); // Title row present

      expect(result.dataStartRow).toBe(3);
    });
  });

  describe('any non-compliant wins logic', () => {
    it('should set non-compliant if ANY column shows non-compliant', () => {
      // Simulating multiple age-bracket columns for Breast Cancer
      const headers = [
        'Patient', 'DOB',
        'Breast Cancer Screening E Q1', 'Breast Cancer Screening E Q2',
      ];
      const rows = [{
        'Patient': 'Alice Brown',
        'DOB': '05/15/1970',
        'Breast Cancer Screening E Q1': '01/10/2026',
        'Breast Cancer Screening E Q2': 'Non Compliant',
      }];

      const result = transformData(headers, rows, systemId, 2);

      const breastRow = result.rows.find(r => r.qualityMeasure === 'Breast Cancer Screening');
      expect(breastRow?.measureStatus).toBe('Not Addressed'); // Non-compliant mapping
    });

    it('should set compliant if ALL columns show compliant', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];
      const rows = [{
        'Patient': 'Carol Davis',
        'DOB': '09/20/1965',
        'Annual Wellness Visit Q1': '01/12/2026',
        'Annual Wellness Visit Q2': 'Compliant',
      }];

      const result = transformData(headers, rows, systemId, 2);

      const awvRow = result.rows.find(r => r.qualityMeasure === 'Annual Wellness Visit');
      // Compliant should map to a completion status
      expect(awvRow?.measureStatus).toBeTruthy();
      expect(awvRow?.measureStatus).not.toBe('Not Addressed');
    });

    it('should handle case-insensitive compliance values', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];
      const rows = [
        { 'Patient': 'Test1', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'COMPLIANT' },
        { 'Patient': 'Test2', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'compliant' },
        { 'Patient': 'Test3', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'NON COMPLIANT' },
        { 'Patient': 'Test4', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'non-compliant' },
      ];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.rows).toHaveLength(4);
      // First two should be compliant
      expect(result.rows[0].measureStatus).not.toBe('Not Addressed');
      expect(result.rows[1].measureStatus).not.toBe('Not Addressed');
      // Last two should be non-compliant
      expect(result.rows[2].measureStatus).toBe('Not Addressed');
      expect(result.rows[3].measureStatus).toBe('Not Addressed');
    });
  });

  describe('patients with no measures', () => {
    it('should track patients with all empty measure columns', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];
      const rows = [
        { 'Patient': 'Has Data', 'DOB': '01/01/1990', 'Annual Wellness Visit Q1': '01/10/2026', 'Annual Wellness Visit Q2': 'Compliant' },
        { 'Patient': 'No Data', 'DOB': '02/02/1985', 'Annual Wellness Visit Q1': '', 'Annual Wellness Visit Q2': '' },
      ];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.stats.patientsWithNoMeasures).toBe(1);
      expect(result.patientsWithNoMeasures).toHaveLength(1);
      expect(result.patientsWithNoMeasures[0].memberName).toBe('No Data');
      expect(result.patientsWithNoMeasures[0].rowIndex).toBe(1); // 0-indexed
    });
  });

  describe('date parsing', () => {
    it('should parse various date formats', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];
      const rows = [
        { 'Patient': 'Test1', 'DOB': '01/15/1990', 'Annual Wellness Visit Q2': 'Compliant' },      // MM/DD/YYYY
        { 'Patient': 'Test2', 'DOB': '1/5/1990', 'Annual Wellness Visit Q2': 'Compliant' },        // M/D/YYYY
        { 'Patient': 'Test3', 'DOB': '1.15.1990', 'Annual Wellness Visit Q2': 'Compliant' },       // M.D.YYYY
      ];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.rows[0].memberDob).toBe('1990-01-15');
      expect(result.rows[1].memberDob).toBe('1990-01-05');
      expect(result.rows[2].memberDob).toBe('1990-01-15');
    });

    it('should handle invalid dates gracefully', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];
      const rows = [
        { 'Patient': 'Invalid DOB', 'DOB': 'invalid-date', 'Annual Wellness Visit Q2': 'Compliant' },
      ];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.rows[0].memberDob).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('status date handling', () => {
    it('should set statusDate to today (import date)', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];
      const rows = [{
        'Patient': 'Test',
        'DOB': '01/01/1990',
        'Annual Wellness Visit Q1': '01/10/2026',
        'Annual Wellness Visit Q2': 'Compliant',
      }];

      const result = transformData(headers, rows, systemId, 2);

      // Status date should be today's date in ISO format
      const today = new Date().toISOString().split('T')[0];
      expect(result.rows[0].statusDate).toBe(today);
    });

    it('should set statusDate to null when no compliance status', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];
      const rows = [{
        'Patient': 'Test',
        'DOB': '01/01/1990',
        'Annual Wellness Visit Q1': '01/10/2026',
        'Annual Wellness Visit Q2': '', // No status
      }];

      const result = transformData(headers, rows, systemId, 2);

      // Row is generated (because Q1 has data) but with null measureStatus and statusDate
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].measureStatus).toBeNull();
      expect(result.rows[0].statusDate).toBeNull();
    });
  });

  describe('source tracking', () => {
    it('should track sourceRowIndex for each transformed row', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2', 'Eye Exam Q2'];
      const rows = [
        { 'Patient': 'Patient1', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'Compliant', 'Eye Exam Q2': 'Compliant' },
        { 'Patient': 'Patient2', 'DOB': '02/02/1985', 'Annual Wellness Visit Q2': 'Compliant', 'Eye Exam Q2': 'Compliant' },
      ];

      const result = transformData(headers, rows, systemId, 2);

      // 2 patients × 2 measures = 4 rows
      expect(result.rows).toHaveLength(4);

      // Check sourceRowIndex
      const patient1Rows = result.rows.filter(r => r.memberName === 'Patient1');
      const patient2Rows = result.rows.filter(r => r.memberName === 'Patient2');

      patient1Rows.forEach(r => expect(r.sourceRowIndex).toBe(0));
      patient2Rows.forEach(r => expect(r.sourceRowIndex).toBe(1));
    });

    it('should track sourceMeasureColumn', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];
      const rows = [{ 'Patient': 'Test', 'DOB': '01/01/1990', 'Annual Wellness Visit Q2': 'Compliant' }];

      const result = transformData(headers, rows, systemId, 2);

      expect(result.rows[0].sourceMeasureColumn).toBe('Annual Wellness Visit Q2');
    });
  });

  describe('with test data files', () => {
    it('should transform test-valid.csv correctly', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-valid.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-valid.csv');
      const result = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);

      expect(result.stats.inputRows).toBe(10);
      expect(result.stats.outputRows).toBeGreaterThan(10); // Multiple measures per patient
      expect(result.errors).toHaveLength(0);
      expect(result.patientsWithNoMeasures).toHaveLength(0);
    });

    it('should transform test-no-measures.csv and identify patients with no measures', () => {
      const csvPath = path.join(testDataDir, 'test-no-measures.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-no-measures.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-no-measures.csv');
      const result = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);

      // Should have 5 patients with no measures (rows 2, 4, 5, 7, 9 per README)
      expect(result.patientsWithNoMeasures.length).toBe(5);
    });

    it('should handle test-dates.csv with various date formats', () => {
      const csvPath = path.join(testDataDir, 'test-dates.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-dates.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const parseResult = parseCSV(buffer, 'test-dates.csv');
      const result = transformData(parseResult.headers, parseResult.rows, systemId, parseResult.dataStartRow);

      // Should have some parse errors for invalid dates
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
