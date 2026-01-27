/**
 * Unit tests for errorReporter.ts
 * Tests error report generation and formatting
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateErrorReport,
  formatReportAsText,
  getCondensedReport,
  ErrorReport,
} from '../errorReporter.js';
import { ValidationResult, ValidationError, DuplicateGroup } from '../validator.js';
import { TransformedRow } from '../dataTransformer.js';

// Helper to create a base transformed row
function createRow(overrides: Partial<TransformedRow> = {}): TransformedRow {
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

// Helper to create validation result
function createValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    duplicates: [],
    stats: {
      totalRows: 10,
      validRows: 10,
      errorRows: 0,
      warningRows: 0,
      duplicateGroups: 0,
    },
    ...overrides,
  };
}

// Helper to create validation error
function createError(overrides: Partial<ValidationError> = {}): ValidationError {
  return {
    rowIndex: 0,
    field: 'memberDob',
    message: 'DOB is required',
    severity: 'error',
    memberName: 'John Smith',
    ...overrides,
  };
}

describe('errorReporter', () => {
  describe('generateErrorReport', () => {
    it('should generate report for successful validation', () => {
      const validation = createValidationResult();
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.errorsByField).toBeDefined();
      expect(report.errorsByRow).toBeDefined();
      expect(report.duplicateReport).toBeDefined();
    });

    it('should include all report sections', () => {
      const validation = createValidationResult({
        errors: [createError()],
        warnings: [createError({ severity: 'warning', field: 'memberTelephone', message: 'Phone missing' })],
        duplicates: [{ key: 'John Smith|1990-01-15|AWV', patient: 'John Smith', measure: 'AWV', rows: [0, 1] }],
      });
      const rows = [createRow(), createRow({ sourceRowIndex: 1 })];

      const report = generateErrorReport(validation, rows);

      expect(Object.keys(report.errorsByField).length).toBeGreaterThan(0);
      expect(Object.keys(report.errorsByRow).length).toBeGreaterThan(0);
      expect(report.duplicateReport.totalGroups).toBe(1);
    });
  });

  describe('summary generation', () => {
    it('should generate success summary when no errors or warnings', () => {
      const validation = createValidationResult();
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.summary.status).toBe('success');
      expect(report.summary.canProceed).toBe(true);
      expect(report.summary.errorCount).toBe(0);
      expect(report.summary.warningCount).toBe(0);
    });

    it('should generate warning summary when only warnings', () => {
      const validation = createValidationResult({
        warnings: [createError({ severity: 'warning', message: 'Phone missing' })],
        stats: { totalRows: 10, validRows: 10, errorRows: 0, warningRows: 1, duplicateGroups: 0 },
      });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.summary.status).toBe('warning');
      expect(report.summary.canProceed).toBe(true);
      expect(report.summary.warningCount).toBe(1);
    });

    it('should generate error summary when errors present', () => {
      const validation = createValidationResult({
        valid: false,
        errors: [createError()],
        stats: { totalRows: 10, validRows: 9, errorRows: 1, warningRows: 0, duplicateGroups: 0 },
      });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.summary.status).toBe('error');
      expect(report.summary.canProceed).toBe(false);
      expect(report.summary.errorCount).toBe(1);
    });

    it('should include row counts in summary', () => {
      const validation = createValidationResult({
        stats: { totalRows: 100, validRows: 95, errorRows: 5, warningRows: 10, duplicateGroups: 0 },
      });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.summary.totalRows).toBe(100);
      expect(report.summary.validRows).toBe(95);
    });
  });

  describe('groupErrorsByField', () => {
    it('should group errors by field name', () => {
      const validation = createValidationResult({
        errors: [
          createError({ rowIndex: 0, field: 'memberDob' }),
          createError({ rowIndex: 1, field: 'memberDob' }),
          createError({ rowIndex: 2, field: 'memberName' }),
        ],
      });
      const rows = [createRow(), createRow({ sourceRowIndex: 1 }), createRow({ sourceRowIndex: 2 })];

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByField['memberDob']).toBeDefined();
      expect(report.errorsByField['memberDob'].errorCount).toBe(2);
      expect(report.errorsByField['memberName']).toBeDefined();
      expect(report.errorsByField['memberName'].errorCount).toBe(1);
    });

    it('should count errors and warnings separately', () => {
      const validation = createValidationResult({
        errors: [createError({ field: 'memberDob' })],
        warnings: [
          createError({ field: 'memberDob', severity: 'warning' }),
          createError({ field: 'memberDob', severity: 'warning' }),
        ],
      });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByField['memberDob'].errorCount).toBe(1);
      expect(report.errorsByField['memberDob'].warningCount).toBe(2);
    });

    it('should limit sample errors to 5 per field', () => {
      const errors = [];
      for (let i = 0; i < 10; i++) {
        errors.push(createError({ rowIndex: i, field: 'memberDob' }));
      }
      const validation = createValidationResult({ errors });
      const rows = errors.map((_, i) => createRow({ sourceRowIndex: i }));

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByField['memberDob'].sampleErrors).toHaveLength(5);
      expect(report.errorsByField['memberDob'].errorCount).toBe(10);
    });
  });

  describe('groupErrorsByRow', () => {
    it('should group errors by row index', () => {
      const validation = createValidationResult({
        errors: [
          createError({ rowIndex: 0, field: 'memberDob' }),
          createError({ rowIndex: 0, field: 'memberName' }),
          createError({ rowIndex: 1, field: 'memberDob' }),
        ],
      });
      const rows = [
        createRow({ memberName: 'Patient A' }),
        createRow({ sourceRowIndex: 1, memberName: 'Patient B' }),
      ];

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByRow[0]).toBeDefined();
      expect(report.errorsByRow[0].errors).toHaveLength(2);
      expect(report.errorsByRow[1]).toBeDefined();
      expect(report.errorsByRow[1].errors).toHaveLength(1);
    });

    it('should include patient name in row summary', () => {
      const validation = createValidationResult({
        errors: [createError({ rowIndex: 0 })],
      });
      const rows = [createRow({ memberName: 'Jane Doe' })];

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByRow[0].patientName).toBe('Jane Doe');
    });

    it('should separate errors and warnings in row summary', () => {
      const validation = createValidationResult({
        errors: [createError({ rowIndex: 0 })],
        warnings: [createError({ rowIndex: 0, severity: 'warning', field: 'phone' })],
      });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.errorsByRow[0].errors).toHaveLength(1);
      expect(report.errorsByRow[0].warnings).toHaveLength(1);
    });
  });

  describe('duplicateReport', () => {
    it('should report zero duplicates when none exist', () => {
      const validation = createValidationResult({ duplicates: [] });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.duplicateReport.totalGroups).toBe(0);
      expect(report.duplicateReport.totalDuplicateRows).toBe(0);
      expect(report.duplicateReport.groups).toHaveLength(0);
    });

    it('should calculate total duplicate groups correctly', () => {
      const duplicates: DuplicateGroup[] = [
        { key: 'John Smith|1990-01-15|AWV', patient: 'John Smith', measure: 'AWV', rows: [0, 1] },
        { key: 'Jane Doe|1985-02-02|Eye Exam', patient: 'Jane Doe', measure: 'Eye Exam', rows: [2, 3, 4] },
      ];
      const validation = createValidationResult({ duplicates });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.duplicateReport.totalGroups).toBe(2);
    });

    it('should calculate total duplicate rows correctly', () => {
      // 2 rows in first group = 1 duplicate (first is original)
      // 3 rows in second group = 2 duplicates
      const duplicates: DuplicateGroup[] = [
        { key: 'John Smith|1990-01-15|AWV', patient: 'John Smith', measure: 'AWV', rows: [0, 1] },
        { key: 'Jane Doe|1985-02-02|Eye Exam', patient: 'Jane Doe', measure: 'Eye Exam', rows: [2, 3, 4] },
      ];
      const validation = createValidationResult({ duplicates });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.duplicateReport.totalDuplicateRows).toBe(3); // 1 + 2
    });

    it('should include all duplicate groups', () => {
      const duplicates: DuplicateGroup[] = [
        { key: 'John Smith|1990-01-15|AWV', patient: 'John Smith', measure: 'AWV', rows: [0, 1] },
      ];
      const validation = createValidationResult({ duplicates });
      const rows = [createRow()];

      const report = generateErrorReport(validation, rows);

      expect(report.duplicateReport.groups).toHaveLength(1);
      expect(report.duplicateReport.groups[0].patient).toBe('John Smith');
      expect(report.duplicateReport.groups[0].measure).toBe('AWV');
    });
  });

  describe('formatReportAsText', () => {
    it('should format success report', () => {
      const validation = createValidationResult();
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const text = formatReportAsText(report);

      expect(text).toContain('IMPORT VALIDATION REPORT');
      expect(text).toContain('Status: SUCCESS');
      expect(text).toContain('Can Proceed: Yes');
    });

    it('should format error report with errors section', () => {
      const validation = createValidationResult({
        errors: [createError({ field: 'memberDob', message: 'DOB is required' })],
      });
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const text = formatReportAsText(report);

      expect(text).toContain('Status: ERROR');
      expect(text).toContain('ERRORS BY FIELD');
      expect(text).toContain('memberDob');
      expect(text).toContain('DOB is required');
    });

    it('should format report with duplicates section', () => {
      const duplicates: DuplicateGroup[] = [
        { key: 'John Smith|1990-01-15|AWV', patient: 'John Smith', measure: 'AWV', rows: [0, 1] },
      ];
      const validation = createValidationResult({ duplicates });
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const text = formatReportAsText(report);

      expect(text).toContain('DUPLICATE ROWS');
      expect(text).toContain('John Smith');
      expect(text).toContain('AWV');
    });

    it('should include row numbers (1-indexed) in text output', () => {
      const validation = createValidationResult({
        errors: [createError({ rowIndex: 0 })],
      });
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const text = formatReportAsText(report);

      expect(text).toContain('Row 1:'); // 0-indexed becomes 1-indexed in display
    });
  });

  describe('getCondensedReport', () => {
    it('should include summary in condensed report', () => {
      const validation = createValidationResult();
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const condensed = getCondensedReport(report);

      expect(condensed.summary).toBeDefined();
      expect(condensed.summary.status).toBe('success');
    });

    it('should limit top errors to 10', () => {
      const errors = [];
      for (let i = 0; i < 15; i++) {
        errors.push(createError({ rowIndex: i, field: `field${i}` }));
      }
      const validation = createValidationResult({ errors });
      const rows = errors.map((_, i) => createRow({ sourceRowIndex: i }));
      const report = generateErrorReport(validation, rows);

      const condensed = getCondensedReport(report);

      expect(condensed.topErrors.length).toBeLessThanOrEqual(10);
    });

    it('should limit top warnings to 10', () => {
      const warnings = [];
      for (let i = 0; i < 15; i++) {
        warnings.push(createError({ rowIndex: i, field: `field${i}`, severity: 'warning' }));
      }
      const validation = createValidationResult({ warnings });
      const rows = warnings.map((_, i) => createRow({ sourceRowIndex: i }));
      const report = generateErrorReport(validation, rows);

      const condensed = getCondensedReport(report);

      expect(condensed.topWarnings.length).toBeLessThanOrEqual(10);
    });

    it('should limit duplicates to 5 groups', () => {
      const duplicates: DuplicateGroup[] = [];
      for (let i = 0; i < 10; i++) {
        duplicates.push({ key: `Patient ${i}|1990-01-01|AWV`, patient: `Patient ${i}`, measure: 'AWV', rows: [i, i + 10] });
      }
      const validation = createValidationResult({ duplicates });
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const condensed = getCondensedReport(report);

      expect(condensed.duplicates.groups.length).toBeLessThanOrEqual(5);
      expect(condensed.duplicates.count).toBe(10); // Total count preserved
    });

    it('should separate errors and warnings correctly', () => {
      const validation = createValidationResult({
        errors: [createError({ field: 'memberDob' })],
        warnings: [createError({ field: 'memberTelephone', severity: 'warning' })],
      });
      const rows = [createRow()];
      const report = generateErrorReport(validation, rows);

      const condensed = getCondensedReport(report);

      expect(condensed.topErrors.every(e => e.severity === 'error')).toBe(true);
      expect(condensed.topWarnings.every(w => w.severity === 'warning')).toBe(true);
    });
  });
});
