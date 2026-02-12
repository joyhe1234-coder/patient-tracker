/**
 * Cascading field update logic for the patient grid.
 *
 * When a parent field changes, all downstream fields must be cleared.
 * Hierarchy: requestType -> qualityMeasure -> measureStatus -> tracking/dates
 *
 * Notes field is never cleared by cascading logic.
 */

import type { IRowNode } from 'ag-grid-community';
import type { GridRow } from '../PatientGrid';
import { getAutoFillQualityMeasure } from '../../../config/dropdownConfig';

/**
 * Fields that are cleared when a parent field changes.
 * Hierarchy: requestType -> qualityMeasure -> measureStatus -> tracking/dates
 */
export interface CascadeResult {
  /** Key-value pairs to include in the API update payload */
  updatePayload: Record<string, unknown>;
}

/** Fields downstream from requestType (excluding qualityMeasure, handled separately) */
const DOWNSTREAM_FROM_REQUEST_TYPE = [
  'measureStatus', 'statusDate', 'tracking1', 'tracking2',
  'tracking3', 'dueDate', 'timeIntervalDays',
] as const;

/** Fields downstream from measureStatus */
const DOWNSTREAM_FROM_MEASURE_STATUS = [
  'statusDate', 'tracking1', 'tracking2',
  'tracking3', 'dueDate', 'timeIntervalDays',
] as const;

/**
 * Compute the cascading field clears and auto-fills when a parent field changes.
 * Also applies setDataValue calls to the AG Grid row node for immediate UI update.
 *
 * @param field - The field that changed
 * @param newValue - The new value of the changed field
 * @param node - AG Grid RowNode for calling setDataValue
 * @returns CascadeResult with update payload additions
 */
export function applyCascadingUpdates(
  field: string,
  newValue: unknown,
  node: IRowNode<GridRow>
): CascadeResult {
  const updatePayload: Record<string, unknown> = {};

  const clearDownstream = (fields: readonly string[]) => {
    for (const f of fields) {
      updatePayload[f] = null;
      node.setDataValue(f, null);
    }
  };

  if (field === 'requestType') {
    // Auto-fill Quality Measure for AWV and Chronic DX (single-QM request types)
    const autoFillQM = getAutoFillQualityMeasure(newValue as string);
    if (autoFillQM) {
      updatePayload.qualityMeasure = autoFillQM;
      node.setDataValue('qualityMeasure', autoFillQM);
    } else {
      // Clear Quality Measure (always, not just if invalid)
      updatePayload.qualityMeasure = null;
      node.setDataValue('qualityMeasure', null);
    }
    // Clear all downstream fields including calculated fields
    clearDownstream(DOWNSTREAM_FROM_REQUEST_TYPE);
  }

  if (field === 'qualityMeasure') {
    // Clear all downstream fields including calculated fields
    clearDownstream(DOWNSTREAM_FROM_REQUEST_TYPE);
  }

  if (field === 'measureStatus') {
    // Clear statusDate, tracking fields, and calculated fields
    clearDownstream(DOWNSTREAM_FROM_MEASURE_STATUS);
  }

  return { updatePayload };
}
