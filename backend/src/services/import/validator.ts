/**
 * Validator for Import Data
 * Validates transformed data before import
 */

import { TransformedRow } from './dataTransformer.js';

export interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  value?: string;
  severity: 'error' | 'warning';
  memberName?: string;
}

export interface DuplicateGroup {
  key: string;
  rows: number[];
  patient: string;
  measure: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  duplicates: DuplicateGroup[];
  stats: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    warningRows: number;
    duplicateGroups: number;
  };
}

/**
 * Valid request types in the system
 */
const VALID_REQUEST_TYPES = ['AWV', 'Quality', 'Screening', 'Chronic DX'];

/**
 * Valid quality measures by request type
 */
const VALID_QUALITY_MEASURES: Record<string, string[]> = {
  'AWV': ['Annual Wellness Visit'],
  'Chronic DX': ['Chronic Diagnosis Code'],
  'Quality': [
    'Diabetic Eye Exam',
    'Diabetes Control',
    'Diabetic Nephropathy',
    'GC/Chlamydia Screening',
    'Hypertension Management',
    'ACE/ARB in DM or CAD',
    'Vaccination',
    'Annual Serum K&Cr',
  ],
  'Screening': [
    'Breast Cancer Screening',
    'Colon Cancer Screening',
    'Cervical Cancer Screening',
  ],
};

/**
 * Validate all transformed rows
 * Errors are reported by original spreadsheet row number and deduplicated per patient+field
 */
export function validateRows(rows: TransformedRow[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const rowsWithErrors = new Set<number>();
  const rowsWithWarnings = new Set<number>();

  // Track errors we've already reported to deduplicate per patient/source row
  // Key: "sourceRowIndex|field"
  const reportedErrors = new Set<string>();
  const reportedWarnings = new Set<string>();

  // Validate each row
  for (const row of rows) {
    // Use sourceRowIndex from the row (original spreadsheet row, 0-indexed)
    const sourceRowIndex = row.sourceRowIndex;
    const rowErrors = validateRow(row, sourceRowIndex);

    for (const error of rowErrors) {
      // Create dedup key: sourceRowIndex + field
      const dedupKey = `${sourceRowIndex}|${error.field}`;

      if (error.severity === 'error') {
        // Only add if we haven't reported this error for this source row
        if (!reportedErrors.has(dedupKey)) {
          reportedErrors.add(dedupKey);
          errors.push(error);
          rowsWithErrors.add(sourceRowIndex);
        }
      } else {
        // Only add if we haven't reported this warning for this source row
        if (!reportedWarnings.has(dedupKey)) {
          reportedWarnings.add(dedupKey);
          warnings.push(error);
          rowsWithWarnings.add(sourceRowIndex);
        }
      }
    }
  }

  // Check for duplicates within the import (by source row)
  const duplicates = findDuplicates(rows);

  // Add warnings for duplicates (using source row indices)
  for (const dup of duplicates) {
    for (const rowIndex of dup.rows.slice(1)) {
      // Dedup key for duplicates
      const dedupKey = `${rowIndex}|duplicate|${dup.measure}`;
      if (!reportedWarnings.has(dedupKey)) {
        reportedWarnings.add(dedupKey);
        warnings.push({
          rowIndex,
          field: 'duplicate',
          message: `Duplicate entry: same patient + measure combination`,
          severity: 'warning',
          memberName: dup.patient,
        });
        rowsWithWarnings.add(rowIndex);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    duplicates,
    stats: {
      totalRows: rows.length,
      validRows: rows.length - rowsWithErrors.size,
      errorRows: rowsWithErrors.size,
      warningRows: rowsWithWarnings.size,
      duplicateGroups: duplicates.length,
    },
  };
}

/**
 * Validate a single row
 */
function validateRow(row: TransformedRow, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const memberName = row.memberName || 'Unknown';

  // Required: memberName
  if (!row.memberName || row.memberName.trim() === '') {
    errors.push({
      rowIndex,
      field: 'memberName',
      message: 'Member name is required',
      severity: 'error',
      memberName: 'Unknown',
    });
  }

  // Required: memberDob
  if (!row.memberDob) {
    errors.push({
      rowIndex,
      field: 'memberDob',
      message: 'Date of birth is required',
      severity: 'error',
      memberName,
    });
  } else if (!isValidDateString(row.memberDob)) {
    errors.push({
      rowIndex,
      field: 'memberDob',
      message: 'Invalid date of birth format',
      value: row.memberDob,
      severity: 'error',
      memberName,
    });
  }

  // Required: requestType
  if (!row.requestType || row.requestType.trim() === '') {
    errors.push({
      rowIndex,
      field: 'requestType',
      message: 'Request type is required',
      severity: 'error',
      memberName,
    });
  } else if (!VALID_REQUEST_TYPES.includes(row.requestType)) {
    errors.push({
      rowIndex,
      field: 'requestType',
      message: `Invalid request type: ${row.requestType}`,
      value: row.requestType,
      severity: 'error',
      memberName,
    });
  }

  // Required: qualityMeasure
  if (!row.qualityMeasure || row.qualityMeasure.trim() === '') {
    errors.push({
      rowIndex,
      field: 'qualityMeasure',
      message: 'Quality measure is required',
      severity: 'error',
      memberName,
    });
  } else if (row.requestType && VALID_REQUEST_TYPES.includes(row.requestType)) {
    const validMeasures = VALID_QUALITY_MEASURES[row.requestType] || [];
    if (!validMeasures.includes(row.qualityMeasure)) {
      errors.push({
        rowIndex,
        field: 'qualityMeasure',
        message: `Invalid quality measure "${row.qualityMeasure}" for request type "${row.requestType}"`,
        value: row.qualityMeasure,
        severity: 'warning', // Warning because config might be different
        memberName,
      });
    }
  }

  // Warning: missing measureStatus
  if (!row.measureStatus) {
    errors.push({
      rowIndex,
      field: 'measureStatus',
      message: 'Measure status is empty - will be set to "Not Addressed"',
      severity: 'warning',
      memberName,
    });
  }

  // Warning: missing phone
  if (!row.memberTelephone) {
    errors.push({
      rowIndex,
      field: 'memberTelephone',
      message: 'Phone number is missing',
      severity: 'warning',
      memberName,
    });
  }

  return errors;
}

/**
 * Check if a string is a valid ISO date (YYYY-MM-DD)
 */
function isValidDateString(dateStr: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;

  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Find duplicate rows within the import
 * Duplicates are defined as same patient (name + DOB) + same quality measure
 * Uses sourceRowIndex to track original spreadsheet row numbers
 */
function findDuplicates(rows: TransformedRow[]): DuplicateGroup[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    // Create key from patient + measure
    const key = `${row.memberName}|${row.memberDob}|${row.requestType}|${row.qualityMeasure}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    // Use sourceRowIndex (original spreadsheet row, 0-indexed)
    groups.get(key)!.push(row.sourceRowIndex);
  }

  // Return only groups with more than 1 row (actual duplicates)
  // Deduplicate the row indices in case multiple transformed rows came from same source
  const duplicates: DuplicateGroup[] = [];
  for (const [key, rowIndices] of groups) {
    // Deduplicate source row indices
    const uniqueRowIndices = [...new Set(rowIndices)];
    if (uniqueRowIndices.length > 1) {
      const parts = key.split('|');
      duplicates.push({
        key,
        rows: uniqueRowIndices,
        patient: parts[0],
        measure: parts[3],
      });
    }
  }

  return duplicates;
}

/**
 * Get validation summary as human-readable text
 */
export function getValidationSummary(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push(`Validation ${result.valid ? 'PASSED' : 'FAILED'}`);
  lines.push(`Total rows: ${result.stats.totalRows}`);
  lines.push(`Valid rows: ${result.stats.validRows}`);

  if (result.stats.errorRows > 0) {
    lines.push(`Rows with errors: ${result.stats.errorRows}`);
  }

  if (result.stats.warningRows > 0) {
    lines.push(`Rows with warnings: ${result.stats.warningRows}`);
  }

  if (result.stats.duplicateGroups > 0) {
    lines.push(`Duplicate groups: ${result.stats.duplicateGroups}`);
  }

  return lines.join('\n');
}
