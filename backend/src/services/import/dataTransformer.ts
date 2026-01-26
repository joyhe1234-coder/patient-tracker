/**
 * Data Transformer for Import
 * Transforms wide format (multiple measure columns per row) to long format (one row per measure)
 */

import { ParsedRow } from './fileParser.js';
import { mapColumns, groupMeasureColumns, getPatientColumnMappings, MappingResult } from './columnMapper.js';
import { loadSystemConfig } from './configLoader.js';
import { parseDate, toISODateString } from '../../utils/dateParser.js';

/**
 * Transformed patient measure row ready for database
 */
export interface TransformedRow {
  // Patient data
  memberName: string;
  memberDob: string | null;
  memberTelephone: string | null;
  memberAddress: string | null;

  // Measure data
  requestType: string;
  qualityMeasure: string;
  measureStatus: string | null;
  statusDate: string | null;

  // Source info for debugging/auditing
  sourceRowIndex: number;
  sourceMeasureColumn: string;
}

export interface TransformResult {
  // Successfully transformed rows
  rows: TransformedRow[];
  // Errors encountered during transformation
  errors: TransformError[];
  // Patients that had no measures generated (all measure columns empty)
  patientsWithNoMeasures: PatientWithNoMeasures[];
  // Mapping result from column analysis
  mapping: MappingResult;
  // Summary stats
  stats: {
    inputRows: number;
    outputRows: number;
    errorCount: number;
    measuresPerPatient: number;
    patientsWithNoMeasures: number;
  };
}

export interface TransformError {
  rowIndex: number;
  column?: string;
  message: string;
  value?: string;
}

export interface PatientWithNoMeasures {
  rowIndex: number;
  memberName: string;
  memberDob: string | null;
}

/**
 * Transform parsed data from wide format to long format
 */
export function transformData(
  headers: string[],
  rows: ParsedRow[],
  systemId: string
): TransformResult {
  const config = loadSystemConfig(systemId);
  const mapping = mapColumns(headers, systemId);
  const transformedRows: TransformedRow[] = [];
  const errors: TransformError[] = [];
  const patientsWithNoMeasures: PatientWithNoMeasures[] = [];

  // Get patient column mappings
  const patientMappings = getPatientColumnMappings(mapping.mappedColumns);

  // Group measure columns by quality measure
  const measureGroups = groupMeasureColumns(mapping.mappedColumns);

  // Process each input row
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Extract patient data
    const patientData = extractPatientData(row, patientMappings, rowIndex, errors);

    if (!patientData.memberName) {
      errors.push({
        rowIndex,
        column: 'Patient',
        message: 'Missing required patient name',
      });
      continue;
    }

    // Track how many measures were generated for this patient row
    let measuresGenerated = 0;

    // Process each measure group and create a row for each
    for (const [, measureGroup] of measureGroups) {
      const measureRow = transformMeasureRow(
        row,
        patientData,
        measureGroup,
        config,
        rowIndex,
        errors
      );

      if (measureRow) {
        transformedRows.push(measureRow);
        measuresGenerated++;
      }
    }

    // Track patients with no measures generated
    if (measuresGenerated === 0) {
      patientsWithNoMeasures.push({
        rowIndex,
        memberName: patientData.memberName,
        memberDob: patientData.memberDob,
      });
    }
  }

  return {
    rows: transformedRows,
    errors,
    patientsWithNoMeasures,
    mapping,
    stats: {
      inputRows: rows.length,
      outputRows: transformedRows.length,
      errorCount: errors.length,
      measuresPerPatient: measureGroups.size,
      patientsWithNoMeasures: patientsWithNoMeasures.length,
    },
  };
}

/**
 * Extract patient data from a row
 */
function extractPatientData(
  row: ParsedRow,
  patientMappings: { sourceColumn: string; targetField: string }[],
  rowIndex: number,
  errors: TransformError[]
): {
  memberName: string;
  memberDob: string | null;
  memberTelephone: string | null;
  memberAddress: string | null;
} {
  const data: Record<string, string | null> = {
    memberName: '',
    memberDob: null,
    memberTelephone: null,
    memberAddress: null,
  };

  for (const mapping of patientMappings) {
    const value = row[mapping.sourceColumn];

    if (mapping.targetField === 'memberDob') {
      // Parse DOB with flexible date handling
      const parsed = parseDate(value);
      if (parsed.date) {
        data.memberDob = toISODateString(parsed.date);
      } else if (value && parsed.format === 'invalid') {
        errors.push({
          rowIndex,
          column: mapping.sourceColumn,
          message: `Invalid date format: ${value}`,
          value: String(value),
        });
      }
    } else if (mapping.targetField === 'memberTelephone') {
      // Normalize phone number
      data.memberTelephone = normalizePhone(value);
    } else {
      data[mapping.targetField] = value?.trim() || null;
    }
  }

  return data as {
    memberName: string;
    memberDob: string | null;
    memberTelephone: string | null;
    memberAddress: string | null;
  };
}

/**
 * Get today's date as ISO string (for import date)
 */
function getTodayISOString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Transform a single measure from a row
 * Handles multiple columns mapping to the same quality measure
 * Uses "any non-compliant wins" logic
 */
function transformMeasureRow(
  row: ParsedRow,
  patientData: {
    memberName: string;
    memberDob: string | null;
    memberTelephone: string | null;
    memberAddress: string | null;
  },
  measureGroup: {
    q1Columns: string[];
    q2Columns: string[];
    requestType: string;
    qualityMeasure: string;
  },
  config: ReturnType<typeof loadSystemConfig>,
  rowIndex: number,
  _errors: TransformError[]
): TransformedRow | null {
  // Collect all Q2 (compliance status) values from all columns
  const q2Values: string[] = [];
  let primaryQ2Column: string | undefined;

  for (const col of measureGroup.q2Columns) {
    const value = row[col];
    if (value && value.trim()) {
      q2Values.push(value.trim());
      if (!primaryQ2Column) {
        primaryQ2Column = col;
      }
    }
  }

  // Check if any Q1 columns have data
  let hasQ1Data = false;
  for (const col of measureGroup.q1Columns) {
    if (row[col] && row[col].trim()) {
      hasQ1Data = true;
      break;
    }
  }

  // Skip if no Q1 and no Q2 data for this measure
  if (!hasQ1Data && q2Values.length === 0) {
    return null;
  }

  // Apply "any non-compliant wins" logic
  // Check if ANY column shows non-compliant
  let measureStatus: string | null = null;
  let hasNonCompliant = false;
  let hasCompliant = false;

  for (const q2Value of q2Values) {
    const normalizedValue = q2Value.toLowerCase().trim();

    // Check for non-compliant values
    if (
      normalizedValue === 'non compliant' ||
      normalizedValue === 'non-compliant' ||
      normalizedValue === 'noncompliant' ||
      normalizedValue === 'nc' ||
      normalizedValue === 'no'
    ) {
      hasNonCompliant = true;
    }

    // Check for compliant values
    if (
      normalizedValue === 'compliant' ||
      normalizedValue === 'c' ||
      normalizedValue === 'yes'
    ) {
      hasCompliant = true;
    }
  }

  // Determine final status: non-compliant wins over compliant
  if (hasNonCompliant) {
    const statusMapping = config.statusMapping[measureGroup.qualityMeasure];
    measureStatus = statusMapping?.nonCompliant || 'Not Addressed';
  } else if (hasCompliant) {
    const statusMapping = config.statusMapping[measureGroup.qualityMeasure];
    measureStatus = statusMapping?.compliant || null;
  } else if (q2Values.length > 0) {
    // Has values but not recognized as compliant/non-compliant, use first raw value
    measureStatus = q2Values[0];
  }

  // Status date is set to import date (today) when we have measure status data
  // This represents when the compliance data was imported/recorded
  const statusDate = measureStatus ? getTodayISOString() : null;

  return {
    ...patientData,
    requestType: measureGroup.requestType,
    qualityMeasure: measureGroup.qualityMeasure,
    measureStatus,
    statusDate,
    sourceRowIndex: rowIndex,
    sourceMeasureColumn: primaryQ2Column || measureGroup.q1Columns[0] || '',
  };
}

/**
 * Map compliance value to measure status using config
 */
function mapComplianceToStatus(
  complianceValue: string,
  qualityMeasure: string,
  config: ReturnType<typeof loadSystemConfig>
): string | null {
  const statusMapping = config.statusMapping[qualityMeasure];
  if (!statusMapping) return null;

  const normalizedValue = complianceValue.toLowerCase().trim();

  // Check for compliant values
  if (normalizedValue === 'compliant' || normalizedValue === 'c' || normalizedValue === 'yes') {
    return statusMapping.compliant;
  }

  // Check for non-compliant values
  if (
    normalizedValue === 'non compliant' ||
    normalizedValue === 'non-compliant' ||
    normalizedValue === 'noncompliant' ||
    normalizedValue === 'nc' ||
    normalizedValue === 'no'
  ) {
    return statusMapping.nonCompliant;
  }

  return null;
}

/**
 * Normalize phone number to standard format
 */
function normalizePhone(value: string | undefined): string | null {
  if (!value) return null;

  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Handle 10-digit US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit numbers starting with 1
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if can't normalize
  return value.trim() || null;
}

/**
 * Get unique patients from transformed rows
 */
export function getUniquePatients(rows: TransformedRow[]): Map<string, TransformedRow> {
  const patients = new Map<string, TransformedRow>();

  for (const row of rows) {
    const key = `${row.memberName}|${row.memberDob}`;
    if (!patients.has(key)) {
      patients.set(key, row);
    }
  }

  return patients;
}

/**
 * Group transformed rows by patient
 */
export function groupByPatient(rows: TransformedRow[]): Map<string, TransformedRow[]> {
  const grouped = new Map<string, TransformedRow[]>();

  for (const row of rows) {
    const key = `${row.memberName}|${row.memberDob}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  }

  return grouped;
}
