/**
 * Sutter Column Mapper for Import
 * Maps Sutter column headers to internal field names using direct lookup.
 * Unlike Hill's Q1/Q2 suffix matching, Sutter uses fixed patient columns
 * and data columns defined in the sutter.json configuration.
 */

import type { SutterSystemConfig } from './configLoader.js';
import type { ColumnMapping, MappingResult } from './columnMapper.js';

/**
 * Map Sutter column headers to internal fields using direct lookup.
 * Patient columns are mapped via config.patientColumns.
 * Data columns are mapped with columnType 'data'.
 * No Q1/Q2 suffix logic is applied.
 */
export function mapSutterColumns(
  headers: string[],
  config: SutterSystemConfig
): MappingResult {
  const mappedColumns: ColumnMapping[] = [];
  const skippedColumns: string[] = [];
  const unmappedColumns: string[] = [];
  const missingRequired: string[] = [];

  // Track which patient columns we found
  const foundPatientColumns = new Set<string>();

  // Build a set of data columns for quick lookup
  const dataColumnSet = new Set(config.dataColumns);

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
  // For Sutter, "Member Name" and "Member DOB" are required
  const requiredPatientColumns = Object.entries(config.patientColumns)
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
