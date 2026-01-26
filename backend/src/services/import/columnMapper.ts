/**
 * Column Mapper for Import
 * Maps CSV/Excel column headers to internal field names using system config
 */

import { loadSystemConfig, SystemConfig } from './configLoader.js';

export interface ColumnMapping {
  // Source column name from CSV/Excel
  sourceColumn: string;
  // Target field name in our system
  targetField: string;
  // Type of column: 'patient' for patient data, 'measure' for quality measures
  columnType: 'patient' | 'measure';
  // For measure columns: the measure info
  measureInfo?: {
    requestType: string;
    qualityMeasure: string;
  };
}

export interface MappingResult {
  // Successfully mapped columns
  mappedColumns: ColumnMapping[];
  // Columns that will be skipped (in skipColumns config)
  skippedColumns: string[];
  // Columns not found in config (unknown)
  unmappedColumns: string[];
  // Required patient columns that are missing
  missingRequired: string[];
  // Summary stats
  stats: {
    total: number;
    mapped: number;
    skipped: number;
    unmapped: number;
  };
}

/**
 * Analyze headers and create column mappings based on system config
 */
export function mapColumns(headers: string[], systemId: string): MappingResult {
  const config = loadSystemConfig(systemId);

  const mappedColumns: ColumnMapping[] = [];
  const skippedColumns: string[] = [];
  const unmappedColumns: string[] = [];
  const missingRequired: string[] = [];

  // Track which patient columns we found
  const foundPatientColumns = new Set<string>();

  // Process each header
  for (const header of headers) {
    const trimmedHeader = header.trim();

    if (!trimmedHeader) continue;

    // Check if it's a patient column
    const patientField = config.patientColumns[trimmedHeader];
    if (patientField) {
      mappedColumns.push({
        sourceColumn: trimmedHeader,
        targetField: patientField,
        columnType: 'patient',
      });
      foundPatientColumns.add(trimmedHeader);
      continue;
    }

    // Check if it's a skip column
    if (config.skipColumns.includes(trimmedHeader)) {
      skippedColumns.push(trimmedHeader);
      continue;
    }

    // Check if it's a measure column (could be Q1 or Q2 suffixed)
    const measureMapping = findMeasureMapping(trimmedHeader, config);
    if (measureMapping) {
      mappedColumns.push({
        sourceColumn: trimmedHeader,
        targetField: measureMapping.field,
        columnType: 'measure',
        measureInfo: {
          requestType: measureMapping.requestType,
          qualityMeasure: measureMapping.qualityMeasure,
        },
      });
      continue;
    }

    // Unknown column
    unmappedColumns.push(trimmedHeader);
  }

  // Check for missing required patient columns
  const requiredPatientColumns = Object.keys(config.patientColumns).filter(
    col => col === 'Patient' || col === 'DOB' // Name and DOB are required
  );
  for (const required of requiredPatientColumns) {
    if (!foundPatientColumns.has(required)) {
      missingRequired.push(required);
    }
  }

  return {
    mappedColumns,
    skippedColumns,
    unmappedColumns,
    missingRequired,
    stats: {
      total: headers.filter(h => h.trim()).length,
      mapped: mappedColumns.length,
      skipped: skippedColumns.length,
      unmapped: unmappedColumns.length,
    },
  };
}

/**
 * Find measure mapping for a column header
 * Handles Q1 (date) and Q2 (status) suffixes
 */
function findMeasureMapping(
  header: string,
  config: SystemConfig
): { field: 'statusDate' | 'complianceStatus'; requestType: string; qualityMeasure: string } | null {
  // Check for Q1 suffix (date column)
  if (header.endsWith(' Q1')) {
    const baseName = header.slice(0, -3); // Remove ' Q1'
    const measureConfig = config.measureColumns[baseName];
    if (measureConfig) {
      return {
        field: 'statusDate',
        requestType: measureConfig.requestType,
        qualityMeasure: measureConfig.qualityMeasure,
      };
    }
  }

  // Check for Q2 suffix (compliance status column)
  if (header.endsWith(' Q2')) {
    const baseName = header.slice(0, -3); // Remove ' Q2'
    const measureConfig = config.measureColumns[baseName];
    if (measureConfig) {
      return {
        field: 'complianceStatus',
        requestType: measureConfig.requestType,
        qualityMeasure: measureConfig.qualityMeasure,
      };
    }
  }

  // Check exact match (for columns without Q1/Q2 suffix)
  const measureConfig = config.measureColumns[header];
  if (measureConfig) {
    return {
      field: 'complianceStatus',
      requestType: measureConfig.requestType,
      qualityMeasure: measureConfig.qualityMeasure,
    };
  }

  return null;
}

/**
 * Get patient column mappings only
 */
export function getPatientColumnMappings(mappings: ColumnMapping[]): ColumnMapping[] {
  return mappings.filter(m => m.columnType === 'patient');
}

/**
 * Get measure column mappings only
 */
export function getMeasureColumnMappings(mappings: ColumnMapping[]): ColumnMapping[] {
  return mappings.filter(m => m.columnType === 'measure');
}

/**
 * Group measure columns by quality measure
 * Returns a map of qualityMeasure -> { q1Column, q2Column }
 */
export function groupMeasureColumns(
  mappings: ColumnMapping[]
): Map<string, { q1Column?: string; q2Column?: string; requestType: string; qualityMeasure: string }> {
  const grouped = new Map<string, { q1Column?: string; q2Column?: string; requestType: string; qualityMeasure: string }>();

  for (const mapping of getMeasureColumnMappings(mappings)) {
    if (!mapping.measureInfo) continue;

    const key = `${mapping.measureInfo.requestType}|${mapping.measureInfo.qualityMeasure}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        requestType: mapping.measureInfo.requestType,
        qualityMeasure: mapping.measureInfo.qualityMeasure,
      });
    }

    const entry = grouped.get(key)!;
    if (mapping.targetField === 'statusDate') {
      entry.q1Column = mapping.sourceColumn;
    } else if (mapping.targetField === 'complianceStatus') {
      entry.q2Column = mapping.sourceColumn;
    }
  }

  return grouped;
}
