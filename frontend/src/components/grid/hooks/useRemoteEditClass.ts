/**
 * Hook that provides a cellClass callback for AG Grid columns
 * to indicate when another user is remotely editing a cell.
 *
 * Returns a callback that applies the 'cell-remote-editing' CSS class
 * when the cell matches an active edit from the realtime store.
 */

import { useCallback } from 'react';
import type { CellClassParams } from 'ag-grid-community';
import type { GridRow } from '../PatientGrid';
import type { ActiveEdit } from '../../../stores/realtimeStore';

/**
 * Returns a cellClass callback that applies 'cell-remote-editing' class
 * when another user is editing the cell.
 *
 * @param activeEdits - Array of active edits from the realtime store
 * @returns Memoized callback for AG Grid cellClass
 */
export function useRemoteEditClass(
  activeEdits: ActiveEdit[]
): (params: CellClassParams<GridRow>) => string | string[] {
  return useCallback((params: CellClassParams<GridRow>): string | string[] => {
    if (!params.data || !params.colDef.field) return '';
    const rowId = params.data.id;
    const field = params.colDef.field;

    const match = activeEdits.find(
      (e) => e.rowId === rowId && e.field === field
    );
    if (match) {
      return 'cell-remote-editing';
    }
    return '';
  }, [activeEdits]);
}
