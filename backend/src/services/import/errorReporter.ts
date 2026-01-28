/**
 * Error Reporter for Import Validation
 * Generates detailed reports and summaries of validation results
 */

import { ValidationResult, ValidationError, DuplicateGroup } from './validator.js';
import { TransformedRow } from './dataTransformer.js';

export interface ErrorReport {
  summary: ReportSummary;
  errorsByField: Record<string, FieldErrorSummary>;
  errorsByRow: Record<number, RowErrorSummary>;
  duplicateReport: DuplicateReport;
}

export interface ReportSummary {
  status: 'success' | 'warning' | 'error';
  message: string;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  canProceed: boolean;
}

export interface FieldErrorSummary {
  field: string;
  errorCount: number;
  warningCount: number;
  sampleErrors: ValidationError[];
}

export interface RowErrorSummary {
  rowIndex: number;
  patientName: string;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface DuplicateReport {
  totalGroups: number;
  totalDuplicateRows: number;
  groups: DuplicateGroup[];
}

/**
 * Generate a comprehensive error report from validation results
 */
export function generateErrorReport(
  validation: ValidationResult,
  rows: TransformedRow[]
): ErrorReport {
  return {
    summary: generateSummary(validation),
    errorsByField: groupErrorsByField(validation),
    errorsByRow: groupErrorsByRow(validation, rows),
    duplicateReport: generateDuplicateReport(validation.duplicates),
  };
}

/**
 * Generate summary section of report
 */
function generateSummary(validation: ValidationResult): ReportSummary {
  const { stats, errors, warnings } = validation;

  let status: 'success' | 'warning' | 'error';
  let message: string;
  let canProceed: boolean;

  if (errors.length === 0 && warnings.length === 0) {
    status = 'success';
    message = `All ${stats.totalRows} rows passed validation.`;
    canProceed = true;
  } else if (errors.length === 0) {
    status = 'warning';
    message = `${stats.totalRows} rows validated with ${warnings.length} warning(s). Import can proceed.`;
    canProceed = true;
  } else {
    status = 'error';
    message = `Validation failed: ${errors.length} error(s) in ${stats.errorRows} row(s). Please fix errors before importing.`;
    canProceed = false;
  }

  return {
    status,
    message,
    totalRows: stats.totalRows,
    validRows: stats.validRows,
    errorCount: errors.length,
    warningCount: warnings.length,
    canProceed,
  };
}

/**
 * Group errors by field for field-level analysis
 */
function groupErrorsByField(validation: ValidationResult): Record<string, FieldErrorSummary> {
  const byField: Record<string, FieldErrorSummary> = {};
  const allErrors = [...validation.errors, ...validation.warnings];

  for (const error of allErrors) {
    if (!byField[error.field]) {
      byField[error.field] = {
        field: error.field,
        errorCount: 0,
        warningCount: 0,
        sampleErrors: [],
      };
    }

    const fieldSummary = byField[error.field];

    if (error.severity === 'error') {
      fieldSummary.errorCount++;
    } else {
      fieldSummary.warningCount++;
    }

    // Keep up to 5 sample errors per field
    if (fieldSummary.sampleErrors.length < 5) {
      fieldSummary.sampleErrors.push(error);
    }
  }

  return byField;
}

/**
 * Group errors by row for row-level analysis
 */
function groupErrorsByRow(
  validation: ValidationResult,
  rows: TransformedRow[]
): Record<number, RowErrorSummary> {
  const byRow: Record<number, RowErrorSummary> = {};
  const allErrors = [...validation.errors, ...validation.warnings];

  for (const error of allErrors) {
    const rowIndex = error.rowIndex;

    if (!byRow[rowIndex]) {
      byRow[rowIndex] = {
        rowIndex,
        patientName: rows[rowIndex]?.memberName || 'Unknown',
        errors: [],
        warnings: [],
      };
    }

    if (error.severity === 'error') {
      byRow[rowIndex].errors.push(error);
    } else {
      byRow[rowIndex].warnings.push(error);
    }
  }

  return byRow;
}

/**
 * Generate duplicate report section
 */
function generateDuplicateReport(duplicates: DuplicateGroup[]): DuplicateReport {
  const totalDuplicateRows = duplicates.reduce(
    (sum, group) => sum + group.rows.length - 1, // -1 because first row is not a "duplicate"
    0
  );

  return {
    totalGroups: duplicates.length,
    totalDuplicateRows,
    groups: duplicates,
  };
}

/**
 * Format error report as plain text for logging/display
 */
export function formatReportAsText(report: ErrorReport): string {
  const lines: string[] = [];

  // Summary
  lines.push('='.repeat(60));
  lines.push('IMPORT VALIDATION REPORT');
  lines.push('='.repeat(60));
  lines.push('');
  lines.push(`Status: ${report.summary.status.toUpperCase()}`);
  lines.push(report.summary.message);
  lines.push('');
  lines.push(`Total Rows: ${report.summary.totalRows}`);
  lines.push(`Valid Rows: ${report.summary.validRows}`);
  lines.push(`Errors: ${report.summary.errorCount}`);
  lines.push(`Warnings: ${report.summary.warningCount}`);
  lines.push(`Can Proceed: ${report.summary.canProceed ? 'Yes' : 'No'}`);
  lines.push('');

  // Errors by field
  if (Object.keys(report.errorsByField).length > 0) {
    lines.push('-'.repeat(60));
    lines.push('ERRORS BY FIELD');
    lines.push('-'.repeat(60));

    for (const [field, summary] of Object.entries(report.errorsByField)) {
      lines.push(`\n${field}:`);
      lines.push(`  Errors: ${summary.errorCount}, Warnings: ${summary.warningCount}`);
      for (const error of summary.sampleErrors) {
        lines.push(`  - Row ${error.rowIndex + 1}: ${error.message}`);
      }
    }
    lines.push('');
  }

  // Duplicates
  if (report.duplicateReport.totalGroups > 0) {
    lines.push('-'.repeat(60));
    lines.push('DUPLICATE ROWS');
    lines.push('-'.repeat(60));
    lines.push(`Found ${report.duplicateReport.totalGroups} duplicate group(s)`);
    lines.push(`${report.duplicateReport.totalDuplicateRows} row(s) are duplicates`);

    for (const group of report.duplicateReport.groups) {
      lines.push(`\n  ${group.patient} - ${group.measure}`);
      lines.push(`  Rows: ${group.rows.map(r => r + 1).join(', ')}`);
    }
    lines.push('');
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Get a condensed version of the report for API responses
 */
export function getCondensedReport(report: ErrorReport): {
  summary: ReportSummary;
  topErrors: ValidationError[];
  topWarnings: ValidationError[];
  duplicates: { count: number; groups: DuplicateGroup[] };
} {
  // Get top 10 errors and warnings
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];

  for (const fieldSummary of Object.values(report.errorsByField)) {
    for (const error of fieldSummary.sampleErrors) {
      if (error.severity === 'error') {
        allErrors.push(error);
      } else {
        allWarnings.push(error);
      }
    }
  }

  return {
    summary: report.summary,
    topErrors: allErrors.slice(0, 10),
    topWarnings: allWarnings.slice(0, 10),
    duplicates: {
      count: report.duplicateReport.totalGroups,
      groups: report.duplicateReport.groups.slice(0, 5),
    },
  };
}
