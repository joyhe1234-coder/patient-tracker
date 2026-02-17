/**
 * Sutter Data Transformer for Import
 * Transforms Sutter long-format rows (one row per measure per patient)
 * into TransformedRow[] with action mapping and measure details parsing.
 *
 * Unlike Hill's wide-to-long pivot, Sutter rows are already in long format:
 * each input row produces at most one output TransformedRow.
 *
 * Processing per row:
 * 1. Extract patient data via shared extractPatientData()
 * 2. Resolve Request Type via config.requestTypeMapping
 * 3. For Quality rows, resolve via actionMapper
 * 4. Parse Measure Details via measureDetailsParser
 * 5. Handle DOB via parseDate() (supports Excel serial numbers)
 */

import type { ParsedRow } from './fileParser.js';
import type { MappingResult } from './columnMapper.js';
import type { SutterSystemConfig } from './configLoader.js';
import {
  extractPatientData,
  type TransformedRow,
  type TransformResult,
  type TransformError,
  type PatientWithNoMeasures,
} from './dataTransformer.js';
import { getPatientColumnMappings } from './columnMapper.js';
import { buildActionMapperCache, matchAction } from './actionMapper.js';
import { parseMeasureDetails } from './measureDetailsParser.js';

/**
 * An action text that could not be mapped to a quality measure.
 * Aggregated by text with occurrence counts.
 */
export interface UnmappedAction {
  actionText: string;
  count: number;
}

/**
 * Result of Sutter data transformation.
 * Extends TransformResult with unmapped actions tracking.
 */
export interface SutterTransformResult extends TransformResult {
  /** Distinct unmapped action texts with counts, sorted by count descending */
  unmappedActions: UnmappedAction[];
}

/**
 * Transform Sutter long-format data into TransformedRow[].
 *
 * Each input row produces at most one output TransformedRow (no pivoting).
 * Request Type determines how the row is processed:
 * - AWV/APV: mapped to AWV / Annual Wellness Visit
 * - HCC: mapped to Chronic DX / Chronic Diagnosis Code, notes = action text
 * - Quality: resolved via action mapper regex patterns
 * - Unknown: row skipped with error
 *
 * Measure Details are parsed for every row to extract statusDate and tracking1.
 *
 * @param headers - Column headers from the parsed sheet
 * @param rows - Data rows from the parsed sheet
 * @param config - Sutter system configuration
 * @param mapping - Column mapping result from sutterColumnMapper
 * @param dataStartRow - 1-indexed spreadsheet row where data starts
 * @returns Transformation result with rows, errors, and unmapped actions
 */
export function transformSutterData(
  headers: string[],
  rows: ParsedRow[],
  config: SutterSystemConfig,
  mapping: MappingResult,
  dataStartRow: number
): SutterTransformResult {
  const transformedRows: TransformedRow[] = [];
  const errors: TransformError[] = [];
  const patientsWithNoMeasures: PatientWithNoMeasures[] = [];

  // Build action mapper cache once for the entire import (not per-row)
  const actionCache = buildActionMapperCache(config.actionMapping);

  // Track unmapped actions: text -> count
  const unmappedActionsMap = new Map<string, number>();

  // Get patient column mappings for extractPatientData
  const patientMappings = getPatientColumnMappings(mapping.mappedColumns);

  // Find column names for key data fields
  const requestTypeCol = findDataColumn(mapping, 'Request Type');
  const actionsNeededCol = findDataColumn(mapping, 'Possible Actions Needed');
  const measureDetailsCol = findDataColumn(mapping, 'Measure Details');

  // Process each input row
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // 1. Extract patient data using shared utility
    const patientData = extractPatientData(row, patientMappings, rowIndex, errors);

    // Skip rows with missing Member Name
    if (!patientData.memberName) {
      errors.push({
        rowIndex,
        column: 'Member Name',
        message: 'Missing required patient name',
      });
      continue;
    }

    // 2. Look up Request Type column value
    const requestTypeValue = requestTypeCol ? row[requestTypeCol]?.trim() : undefined;

    if (!requestTypeValue) {
      errors.push({
        rowIndex,
        column: 'Request Type',
        message: 'Missing Request Type value',
        value: requestTypeValue || '',
      });
      continue;
    }

    // 3. Resolve via config.requestTypeMapping
    const rtMapping = config.requestTypeMapping[requestTypeValue];

    if (!rtMapping) {
      // Unknown Request Type -> skip row, add error
      errors.push({
        rowIndex,
        column: 'Request Type',
        message: `Unrecognized Request Type: "${requestTypeValue}"`,
        value: requestTypeValue,
      });
      continue;
    }

    // Get action text for HCC notes and Quality resolution
    const actionText = actionsNeededCol ? row[actionsNeededCol]?.trim() || '' : '';

    let requestType: string;
    let qualityMeasure: string;
    let measureStatus: string | null = null;
    let notes: string | null = null;

    if (rtMapping.requestType !== null && rtMapping.qualityMeasure !== null) {
      // AWV, APV, or HCC -- direct mapping from config
      requestType = rtMapping.requestType;
      qualityMeasure = rtMapping.qualityMeasure;

      // HCC: set notes to the Possible Actions Needed text
      if (requestTypeValue === 'HCC') {
        notes = actionText || null;
      }
    } else {
      // Quality -- resolve via action mapper
      if (!actionText) {
        errors.push({
          rowIndex,
          column: 'Possible Actions Needed',
          message: 'Quality row has empty Possible Actions Needed',
        });
        continue;
      }

      const match = matchAction(actionText, actionCache);

      if (!match) {
        // No match -> skip row, aggregate in unmapped actions
        const currentCount = unmappedActionsMap.get(actionText) || 0;
        unmappedActionsMap.set(actionText, currentCount + 1);
        continue;
      }

      // Use mapped values from action matcher; default to "Not Addressed" if empty
      requestType = match.requestType;
      qualityMeasure = match.qualityMeasure;
      measureStatus = match.measureStatus || 'Not Addressed';
    }

    // 4. Parse Measure Details for statusDate and tracking1
    const measureDetailsValue = measureDetailsCol ? row[measureDetailsCol] : undefined;
    const measureDetails = parseMeasureDetails(measureDetailsValue);

    // Build the TransformedRow
    const transformedRow: TransformedRow & { notes?: string | null; tracking1?: string | null; sourceActionText?: string | null } = {
      ...patientData,
      requestType,
      qualityMeasure,
      measureStatus: measureStatus,
      statusDate: measureDetails.statusDate,
      sourceRowIndex: rowIndex,
      sourceMeasureColumn: actionsNeededCol || requestTypeCol || '',
    };

    // Set notes, tracking1, and sourceActionText as additional properties
    if (notes !== null) {
      transformedRow.notes = notes;
    }
    if (measureDetails.tracking1 !== null) {
      transformedRow.tracking1 = measureDetails.tracking1;
    }
    // Capture raw action text for preview columns
    if (actionText) {
      transformedRow.sourceActionText = actionText;
    }

    transformedRows.push(transformedRow as TransformedRow);
  }

  // Convert unmapped actions map to sorted array (count descending)
  const unmappedActions: UnmappedAction[] = Array.from(unmappedActionsMap.entries())
    .map(([actionText, count]) => ({ actionText, count }))
    .sort((a, b) => b.count - a.count);

  return {
    rows: transformedRows,
    errors,
    patientsWithNoMeasures,
    mapping,
    dataStartRow,
    unmappedActions,
    stats: {
      inputRows: rows.length,
      outputRows: transformedRows.length,
      errorCount: errors.length,
      measuresPerPatient: 0, // Not applicable for long format (1:1 mapping)
      patientsWithNoMeasures: patientsWithNoMeasures.length,
    },
  };
}

/**
 * Find a data column's source name from the mapping result.
 * Data columns in Sutter have columnType 'data' and targetField set to the header name.
 */
function findDataColumn(mapping: MappingResult, columnName: string): string | undefined {
  const col = mapping.mappedColumns.find(
    m => m.columnType === 'data' && m.sourceColumn === columnName
  );
  return col?.sourceColumn;
}
