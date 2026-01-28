/**
 * Integration tests for the import transformation pipeline
 * Tests the full flow: parse → map → transform → validate → report
 */

import { describe, it, expect } from '@jest/globals';
import { parseCSV, parseFile } from '../fileParser.js';
import { mapColumns, groupMeasureColumns } from '../columnMapper.js';
import { transformData } from '../dataTransformer.js';
import { validateRows } from '../validator.js';
import { generateErrorReport, getCondensedReport } from '../errorReporter.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to test data files
const testDataDir = path.join(__dirname, '../../../../../test-data');
const systemId = 'hill';

/**
 * Run the full import pipeline on a CSV buffer
 */
function runFullPipeline(buffer: Buffer, fileName: string) {
  // Step 1: Parse
  const parseResult = parseFile(buffer, fileName);

  // Step 2: Map columns
  const mappingResult = mapColumns(parseResult.headers, systemId);

  // Step 3: Transform
  const transformResult = transformData(
    parseResult.headers,
    parseResult.rows,
    systemId,
    parseResult.dataStartRow
  );

  // Step 4: Validate
  const validationResult = validateRows(transformResult.rows);

  // Step 5: Generate report
  const report = generateErrorReport(validationResult, transformResult.rows);
  const condensedReport = getCondensedReport(report);

  return {
    parse: parseResult,
    mapping: mappingResult,
    transform: transformResult,
    validation: validationResult,
    report,
    condensedReport,
  };
}

describe('Import Pipeline Integration', () => {
  describe('full pipeline with test-valid.csv', () => {
    it('should process valid file end-to-end with no errors', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-valid.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-valid.csv');

      // Parse should succeed
      expect(result.parse.totalRows).toBe(10);
      expect(result.parse.fileType).toBe('csv');

      // Mapping should find no missing required
      expect(result.mapping.missingRequired).toHaveLength(0);

      // Transform should produce output rows
      expect(result.transform.stats.inputRows).toBe(10);
      expect(result.transform.stats.outputRows).toBeGreaterThan(10);
      expect(result.transform.errors).toHaveLength(0);

      // Validation should pass
      expect(result.validation.valid).toBe(true);
      expect(result.validation.errors).toHaveLength(0);

      // Report should show success
      expect(result.report.summary.status).toBe('success');
      expect(result.report.summary.canProceed).toBe(true);
    });
  });

  describe('full pipeline with test-validation-errors.csv', () => {
    it('should detect validation errors and propagate to report', () => {
      const csvPath = path.join(testDataDir, 'test-validation-errors.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-validation-errors.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-validation-errors.csv');

      // Should have validation errors
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors.length).toBeGreaterThan(0);

      // Report should show error status
      expect(result.report.summary.status).toBe('error');
      expect(result.report.summary.canProceed).toBe(false);
      expect(result.report.summary.errorCount).toBeGreaterThan(0);

      // Errors should be grouped by field
      expect(Object.keys(result.report.errorsByField).length).toBeGreaterThan(0);
    });
  });

  describe('full pipeline with test-duplicates.csv', () => {
    it('should detect duplicates and include in report', () => {
      const csvPath = path.join(testDataDir, 'test-duplicates.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-duplicates.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-duplicates.csv');

      // Should detect duplicates
      expect(result.validation.duplicates.length).toBeGreaterThan(0);

      // Report should include duplicate info
      expect(result.report.duplicateReport.totalGroups).toBeGreaterThan(0);
    });
  });

  describe('full pipeline with test-warnings.csv', () => {
    it('should detect warnings but allow proceed', () => {
      const csvPath = path.join(testDataDir, 'test-warnings.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-warnings.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-warnings.csv');

      // Should be valid (no errors)
      expect(result.validation.valid).toBe(true);

      // Should have warnings
      expect(result.validation.warnings.length).toBeGreaterThan(0);

      // Report should show warning status but allow proceed
      expect(result.report.summary.status).toBe('warning');
      expect(result.report.summary.canProceed).toBe(true);
    });
  });

  describe('full pipeline with test-no-measures.csv', () => {
    it('should track patients with no measures', () => {
      const csvPath = path.join(testDataDir, 'test-no-measures.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-no-measures.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-no-measures.csv');

      // Should identify patients with no measures
      expect(result.transform.patientsWithNoMeasures.length).toBe(5);

      // Output rows should be less than input * measures
      expect(result.transform.stats.patientsWithNoMeasures).toBe(5);
    });
  });

  describe('full pipeline with test-multi-column.csv', () => {
    it('should apply any-non-compliant-wins logic', () => {
      const csvPath = path.join(testDataDir, 'test-multi-column.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-multi-column.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-multi-column.csv');

      // Should transform successfully
      expect(result.transform.errors).toHaveLength(0);

      // Find rows for different compliance scenarios
      const allCompliantRow = result.transform.rows.find(
        r => r.memberName?.includes('AllCompliant') && r.qualityMeasure === 'Breast Cancer Screening'
      );
      const anyNonCompliantRow = result.transform.rows.find(
        r => r.memberName?.includes('AnyNonCompliant') && r.qualityMeasure === 'Breast Cancer Screening'
      );

      // AllCompliant should have compliant status
      if (allCompliantRow) {
        expect(allCompliantRow.measureStatus).not.toBe('Not Addressed');
      }

      // AnyNonCompliant should have non-compliant status
      if (anyNonCompliantRow) {
        expect(anyNonCompliantRow.measureStatus).toBe('Not Addressed');
      }
    });
  });

  describe('error propagation', () => {
    it('should maintain error context through pipeline', () => {
      const csvPath = path.join(testDataDir, 'test-validation-errors.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-validation-errors.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-validation-errors.csv');

      // Errors should have meaningful context
      for (const error of result.validation.errors) {
        expect(error.rowIndex).toBeDefined();
        expect(typeof error.rowIndex).toBe('number');
        expect(error.field).toBeDefined();
        expect(error.message).toBeDefined();
        expect(error.memberName).toBeDefined();
      }

      // Report errors should match validation errors
      expect(result.report.summary.errorCount).toBe(result.validation.errors.length);
    });
  });

  describe('row number consistency', () => {
    it('should track source row indices through transform and validate', () => {
      const csvPath = path.join(testDataDir, 'test-valid.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-valid.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-valid.csv');

      // Every transformed row should have a valid sourceRowIndex
      for (const row of result.transform.rows) {
        expect(row.sourceRowIndex).toBeDefined();
        expect(row.sourceRowIndex).toBeGreaterThanOrEqual(0);
        expect(row.sourceRowIndex).toBeLessThan(result.parse.totalRows);
      }

      // dataStartRow should be set
      expect(result.transform.dataStartRow).toBeGreaterThanOrEqual(2);
    });
  });

  describe('condensed report', () => {
    it('should provide limited results for API responses', () => {
      const csvPath = path.join(testDataDir, 'test-validation-errors.csv');
      if (!fs.existsSync(csvPath)) {
        console.log('Skipping: test-validation-errors.csv not found');
        return;
      }

      const buffer = fs.readFileSync(csvPath);
      const result = runFullPipeline(buffer, 'test-validation-errors.csv');

      // Condensed report should have summary
      expect(result.condensedReport.summary).toBeDefined();

      // Should limit top errors
      expect(result.condensedReport.topErrors.length).toBeLessThanOrEqual(10);

      // Should limit top warnings
      expect(result.condensedReport.topWarnings.length).toBeLessThanOrEqual(10);
    });
  });
});

describe('Column Mapping Integration', () => {
  it('should correctly map and group Q1/Q2 columns', () => {
    const csv = `Patient,DOB,Phone,Annual Wellness Visit Q1,Annual Wellness Visit Q2
John Smith,01/15/1990,5551234567,01/10/2026,Compliant`;
    const buffer = Buffer.from(csv);
    const parseResult = parseCSV(buffer, 'test.csv');

    const mappingResult = mapColumns(parseResult.headers, systemId);
    const groups = groupMeasureColumns(mappingResult.mappedColumns);

    // Should have AWV group
    expect(groups.size).toBe(1);
    const awvGroup = Array.from(groups.values()).find(g => g.qualityMeasure === 'Annual Wellness Visit');
    expect(awvGroup).toBeDefined();
    expect(awvGroup?.q1Columns).toContain('Annual Wellness Visit Q1');
    expect(awvGroup?.q2Columns).toContain('Annual Wellness Visit Q2');
  });

  it('should handle multiple age-bracket columns for same measure', () => {
    const csv = `Patient,DOB,Breast Cancer Screening E Q1,Breast Cancer Screening E Q2,Breast Cancer Screening 42-51 Years E Q1,Breast Cancer Screening 42-51 Years E Q2
Jane Doe,05/20/1970,01/10/2026,Compliant,01/10/2026,Non Compliant`;
    const buffer = Buffer.from(csv);
    const parseResult = parseCSV(buffer, 'test.csv');

    const mappingResult = mapColumns(parseResult.headers, systemId);
    const groups = groupMeasureColumns(mappingResult.mappedColumns);

    // All breast cancer columns should map to same measure
    const breastGroup = Array.from(groups.values()).find(g => g.qualityMeasure === 'Breast Cancer Screening');
    expect(breastGroup).toBeDefined();
    expect(breastGroup?.q1Columns.length).toBeGreaterThan(1);
    expect(breastGroup?.q2Columns.length).toBeGreaterThan(1);
  });
});

describe('Edge Cases', () => {
  it('should handle file with title row', () => {
    const csv = `Report Generated 2026-01-01
Patient,DOB,Annual Wellness Visit Q2
John Smith,01/15/1990,Compliant`;
    const buffer = Buffer.from(csv);
    const result = runFullPipeline(buffer, 'test.csv');

    // Should detect title row and start data at row 3
    expect(result.parse.dataStartRow).toBe(3);
    expect(result.parse.rows).toHaveLength(1);
  });

  it('should handle empty measure columns gracefully', () => {
    const csv = `Patient,DOB,Annual Wellness Visit Q1,Annual Wellness Visit Q2
John Smith,01/15/1990,,`;
    const buffer = Buffer.from(csv);
    const result = runFullPipeline(buffer, 'test.csv');

    // Patient should be tracked as having no measures
    expect(result.transform.patientsWithNoMeasures).toHaveLength(1);
    expect(result.transform.rows).toHaveLength(0);
  });

  it('should handle mixed valid and invalid rows', () => {
    const csv = `Patient,DOB,Annual Wellness Visit Q2
John Smith,01/15/1990,Compliant
,02/20/1985,Compliant
Bob Wilson,invalid-date,Compliant`;
    const buffer = Buffer.from(csv);
    const result = runFullPipeline(buffer, 'test.csv');

    // Should have both valid rows and errors
    expect(result.transform.rows.length).toBeGreaterThan(0);
    expect(result.validation.errors.length).toBeGreaterThan(0);
  });
});
