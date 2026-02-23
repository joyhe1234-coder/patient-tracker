/**
 * Sutter Column Mapper for Import
 * Maps Sutter column headers to internal field names using direct lookup.
 * Unlike Hill's Q1/Q2 suffix matching, Sutter uses fixed patient columns
 * and data columns defined in the sutter.json configuration.
 */

import type { SutterSystemConfig } from './configLoader.js';
import type { ColumnMapping, MappingResult } from './columnMapper.js';
import type { MergedSystemConfig } from './mappingTypes.js';

/**
 * Map Sutter column headers to internal fields using direct lookup.
 * Patient columns are mapped via config.patientColumns.
 * Data columns are mapped with columnType 'data'.
 * No Q1/Q2 suffix logic is applied.
 * When mergedConfig is provided, its column sets override the JSON config lookups.
 */
export function mapSutterColumns(
  headers: string[],
  config: SutterSystemConfig,
  mergedConfig?: MergedSystemConfig
): MappingResult {
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

  const dataColumnSet: Set<string> = mergedConfig
    ? new Set(mergedConfig.dataColumns.filter(c => c.isActive).map(c => c.sourceColumn))
    : new Set(config.dataColumns);

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

    // Check if it's a data column
    if (dataColumnSet.has(trimmedHeader)) {
      mappedColumns.push({
        sourceColumn: trimmedHeader,
        targetField: trimmedHeader,
        columnType: 'data',
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
    : Object.entries(config.patientColumns)
        .filter(([, field]) => field === 'memberName' || field === 'memberDob')
        .map(([col]) => col);

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
