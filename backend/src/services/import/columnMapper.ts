/**
 * Column Mapper for Import
 * Maps CSV/Excel column headers to internal field names using system config
 */

import { loadSystemConfig, isSutterConfig, type HillSystemConfig } from './configLoader.js';
import { mapSutterColumns } from './sutterColumnMapper.js';
import type { MergedSystemConfig } from './mappingTypes.js';

export interface ColumnMapping {
  // Source column name from CSV/Excel
  sourceColumn: string;
  // Target field name in our system
  targetField: string;
  /**
   * Type of column:
   * - 'patient': patient demographic data (name, DOB, phone, address)
   * - 'measure': quality measure columns with Q1/Q2 suffixes (Hill format)
   * - 'data': non-measure data columns used by Sutter long format
   *           (e.g., Request Type, Possible Actions Needed, Measure Details)
   */
  columnType: 'patient' | 'measure' | 'data';
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
 * Analyze headers and create column mappings based on system config.
 * Loads the system configuration and dispatches to the appropriate mapper:
 * - Sutter (long format) -> mapSutterColumns
 * - Hill (wide format)   -> mapHillColumns
 *
 * When mergedConfig is provided, its column sets are used instead of the
 * raw JSON config. This allows the import pipeline to use DB overrides.
 */
export function mapColumns(headers: string[], systemId: string, mergedConfig?: MergedSystemConfig): MappingResult {
  const config = loadSystemConfig(systemId);

  if (isSutterConfig(config)) {
    return mapSutterColumns(headers, config, mergedConfig);
  }

  return mapHillColumns(headers, config as HillSystemConfig, mergedConfig);
}

/**
 * Hill-specific column mapping logic.
 * Maps patient columns, skip columns, and measure columns with Q1/Q2 suffix matching.
 * When mergedConfig is provided, its column sets override the JSON config lookups.
 */
export function mapHillColumns(headers: string[], config: HillSystemConfig, mergedConfig?: MergedSystemConfig): MappingResult {
  const mappedColumns: ColumnMapping[] = [];
  const skippedColumns: string[] = [];
  const unmappedColumns: string[] = [];
  const missingRequired: string[] = [];

  // Build lookups from mergedConfig if provided, otherwise from raw config
  const patientLookup: Record<string, string> = mergedConfig
    ? Object.fromEntries(
        mergedConfig.patientColumns.filter(c => c.isActive).map(c => [c.sourceColumn, c.targetField ?? ''])
      )
    : config.patientColumns;

  const skipSet: Set<string> = mergedConfig
    ? new Set(mergedConfig.skipColumns.filter(c => c.isActive).map(c => c.sourceColumn))
    : new Set(config.skipColumns);

  // Track which patient columns we found
  const foundPatientColumns = new Set<string>();

  // Process each header
  for (const header of headers) {
    const trimmedHeader = header.trim();

    if (!trimmedHeader) continue;

    // Check if it's a patient column
    const patientField = patientLookup[trimmedHeader];
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
    if (skipSet.has(trimmedHeader)) {
      skippedColumns.push(trimmedHeader);
      continue;
    }

    // Check if it's a measure column (could be Q1 or Q2 suffixed)
    const measureMapping = mergedConfig
      ? findMergedMeasureMapping(trimmedHeader, mergedConfig)
      : findMeasureMapping(trimmedHeader, config);
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
  const requiredPatientColumns = mergedConfig
    ? mergedConfig.patientColumns
        .filter(c => c.isActive && (c.targetField === 'memberName' || c.targetField === 'memberDob'))
        .map(c => c.sourceColumn)
    : Object.keys(config.patientColumns).filter(col => col === 'Patient' || col === 'DOB');
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
  config: HillSystemConfig
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
 * Find measure mapping using mergedConfig's measureColumns array.
 * Handles Q1 (date) and Q2 (status) suffixes, same as findMeasureMapping.
 */
function findMergedMeasureMapping(
  header: string,
  mergedConfig: MergedSystemConfig
): { field: 'statusDate' | 'complianceStatus'; requestType: string; qualityMeasure: string } | null {
  const activeMeasures = mergedConfig.measureColumns.filter(c => c.isActive);

  // Build a lookup by sourceColumn for quick matching
  const measureLookup = new Map(activeMeasures.map(c => [c.sourceColumn, c]));

  // Check for Q1 suffix (date column)
  if (header.endsWith(' Q1')) {
    const baseName = header.slice(0, -3);
    const measure = measureLookup.get(baseName);
    if (measure && measure.requestType && measure.qualityMeasure) {
      return { field: 'statusDate', requestType: measure.requestType, qualityMeasure: measure.qualityMeasure };
    }
  }

  // Check for Q2 suffix (compliance status column)
  if (header.endsWith(' Q2')) {
    const baseName = header.slice(0, -3);
    const measure = measureLookup.get(baseName);
    if (measure && measure.requestType && measure.qualityMeasure) {
      return { field: 'complianceStatus', requestType: measure.requestType, qualityMeasure: measure.qualityMeasure };
    }
  }

  // Check exact match (for columns without Q1/Q2 suffix)
  const measure = measureLookup.get(header);
  if (measure && measure.requestType && measure.qualityMeasure) {
    return { field: 'complianceStatus', requestType: measure.requestType, qualityMeasure: measure.qualityMeasure };
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
 * Returns a map of qualityMeasure -> { q1Columns, q2Columns }
 * Multiple columns can map to the same quality measure (e.g., age-specific columns)
 */
export function groupMeasureColumns(
  mappings: ColumnMapping[]
): Map<string, { q1Columns: string[]; q2Columns: string[]; requestType: string; qualityMeasure: string }> {
  const grouped = new Map<string, { q1Columns: string[]; q2Columns: string[]; requestType: string; qualityMeasure: string }>();

  for (const mapping of getMeasureColumnMappings(mappings)) {
    if (!mapping.measureInfo) continue;

    const key = `${mapping.measureInfo.requestType}|${mapping.measureInfo.qualityMeasure}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        q1Columns: [],
        q2Columns: [],
        requestType: mapping.measureInfo.requestType,
        qualityMeasure: mapping.measureInfo.qualityMeasure,
      });
    }

    const entry = grouped.get(key)!;
    if (mapping.targetField === 'statusDate') {
      entry.q1Columns.push(mapping.sourceColumn);
    } else if (mapping.targetField === 'complianceStatus') {
      entry.q2Columns.push(mapping.sourceColumn);
    }
  }

  return grouped;
}
