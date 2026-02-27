/**
 * Hook that handles cell value changes in the patient grid.
 *
 * Extracts the onCellValueChanged logic from PatientGrid.tsx, including:
 * - Cascading field clears (via applyCascadingUpdates)
 * - Sort freeze on edit
 * - API save with optimistic concurrency (expectedVersion)
 * - 409 conflict handling
 * - 404 deleted row handling
 * - Error recovery (revert / reset)
 * - Save status indicator management
 */

import { useCallback, useRef } from 'react';
import type { CellValueChangedEvent } from 'ag-grid-community';
import type { AgGridReact } from 'ag-grid-react';
import axios from 'axios';
import { api } from '../../../api/axios';
import { logger } from '../../../utils/logger';
import { getApiErrorMessage } from '../../../utils/apiError';
import { showToast } from '../../../utils/toast';
import type { GridRow } from '../PatientGrid';
import type { ConflictField } from '../../modals/ConflictModal';
import type { ConflictResponse, GridRowPayload } from '../../../types/socket';
import type { MeasureUpdatePayload, SaveStatus } from '../../../types/grid';
import { applyCascadingUpdates } from '../utils/cascadingFields';

// Field display name mapping for conflict modal and remote edit notifications
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  requestType: 'Request Type',
  memberName: 'Member Name',
  memberDob: 'Member DOB',
  memberTelephone: 'Telephone',
  memberAddress: 'Address',
  qualityMeasure: 'Quality Measure',
  measureStatus: 'Measure Status',
  statusDate: 'Status Date',
  tracking1: 'Tracking #1',
  tracking2: 'Tracking #2',
  dueDate: 'Due Date',
  timeIntervalDays: 'Time Interval',
  notes: 'Notes',
};

export interface ConflictData {
  patientName: string;
  changedBy: string;
  conflicts: ConflictField[];
  rowId: number;
  updatePayload: MeasureUpdatePayload;
  queryParams: string;
  /** Full server row from 409 response — used by "Keep Theirs" and "Cancel" to restore fresh data including updatedAt */
  serverRow: GridRowPayload | null;
}

export interface UseGridCellUpdateOptions {
  onRowUpdated?: (row: GridRow) => void;
  onRowDeleted?: (id: number) => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
  getQueryParams: () => string;
  gridRef: React.RefObject<AgGridReact<GridRow> | null>;
  frozenRowOrderRef: React.MutableRefObject<number[] | null>;
  saveStatusTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  setConflictData: (data: ConflictData | null) => void;
  setConflictModalOpen: (open: boolean) => void;
}

export interface UseGridCellUpdateReturn {
  onCellValueChanged: (event: CellValueChangedEvent<GridRow>) => Promise<void>;
  isCascadingUpdateRef: React.MutableRefObject<boolean>;
}

/**
 * Hook that provides the onCellValueChanged handler for the patient grid.
 * Manages cascading field updates, API saves, conflict resolution, and error handling.
 */
export function useGridCellUpdate(options: UseGridCellUpdateOptions): UseGridCellUpdateReturn {
  const {
    onRowUpdated,
    onRowDeleted,
    onSaveStatusChange,
    getQueryParams,
    frozenRowOrderRef,
    saveStatusTimerRef,
    setConflictData,
    setConflictModalOpen,
  } = options;

  // Ref to track when we're doing a cascading update (to prevent setDataValue from triggering additional API calls)
  const isCascadingUpdateRef = useRef(false);

  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<GridRow>) => {
    const { data, colDef, newValue, oldValue, node, api: gridApi } = event;

    // Don't save if value hasn't changed
    if (newValue === oldValue) return;
    if (!data || !colDef.field) return;

    // Skip API calls for cascading updates (triggered by setDataValue)
    // The main field update already includes all cascading field changes
    if (isCascadingUpdateRef.current) return;

    // Clear sort indicator on the edited column (if it was sorted)
    // Capture current row order first, then clear sort - postSortRows will maintain order
    const columnState = gridApi.getColumnState();
    const editedColumnState = columnState.find(col => col.colId === colDef.field);
    if (editedColumnState?.sort) {
      // Capture current visual row order BEFORE clearing sort
      const currentOrder: number[] = [];
      gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
        if (rowNode.data) {
          currentOrder.push(rowNode.data.id);
        }
      });
      frozenRowOrderRef.current = currentOrder;

      // Clear the sort - postSortRows callback will maintain the frozen order
      gridApi.applyColumnState({
        state: [{ colId: colDef.field, sort: null }],
      });
    }

    // Show saving status
    onSaveStatusChange?.('saving');

    // Capture expectedVersion before PUT
    const expectedVersion = data.updatedAt || undefined;

    try {
      // Use the processed value from data object for fields with valueSetters
      // This ensures we send the transformed value (e.g., ISO date string) not raw input
      const processedValue = data[colDef.field as keyof GridRow];
      const updatePayload: MeasureUpdatePayload = {
        [colDef.field]: processedValue,
      } as MeasureUpdatePayload;

      // Handle cascading logic - clear all downstream fields when parent changes
      // Set flag to prevent setDataValue from triggering additional API calls
      isCascadingUpdateRef.current = true;

      const cascadeResult = applyCascadingUpdates(colDef.field, newValue, node);
      Object.assign(updatePayload, cascadeResult.updatePayload);

      // Include expectedVersion in PUT request
      if (expectedVersion) {
        updatePayload.expectedVersion = expectedVersion;
      }

      const queryParams = getQueryParams();
      const response = await api.put(`/data/${data.id}${queryParams}`, updatePayload);

      if (response.data.success) {
        // Update row data directly on the node instead of using applyTransaction
        // This prevents row reordering
        const updatedData = response.data.data;
        node.setData(updatedData);

        // Redraw the row to re-evaluate rowClassRules (row background colors).
        // refreshCells only refreshes cell renderers, NOT row-level classes.
        gridApi.redrawRows({ rowNodes: [node] });

        // Ensure row stays selected
        node.setSelected(true);

        // Freeze current row order before React state update to prevent reordering
        if (!frozenRowOrderRef.current) {
          const currentOrder: number[] = [];
          gridApi.forEachNodeAfterFilterAndSort((rowNode) => {
            if (rowNode.data) {
              currentOrder.push(rowNode.data.id);
            }
          });
          frozenRowOrderRef.current = currentOrder;
        }

        // Update React state so filter chip counts stay in sync
        onRowUpdated?.(updatedData);

        onSaveStatusChange?.('saved');

        // Reset to idle after 2 seconds
        clearTimeout(saveStatusTimerRef.current);
        saveStatusTimerRef.current = setTimeout(() => {
          onSaveStatusChange?.('idle');
        }, 2000);
      }
    } catch (error: unknown) {
      logger.error('Failed to save:', error);

      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status;
        const errorCode = (error.response?.data as { error?: { code?: string } })?.error?.code;

        // Handle 409 VERSION_CONFLICT
        if (statusCode === 409 && errorCode === 'VERSION_CONFLICT') {
          const conflictResponseData = (error.response?.data as { data?: ConflictResponse['data'] })?.data;
          if (conflictResponseData) {
            const serverRow = conflictResponseData.serverRow;
            const changedBy = conflictResponseData.changedBy || 'another user';
            const conflictFields: ConflictField[] = (conflictResponseData.conflictFields || []).map(
              (cf: { field: string; serverValue: unknown; clientValue: unknown }) => ({
                fieldName: FIELD_DISPLAY_NAMES[cf.field] || cf.field,
                fieldKey: cf.field,
                baseValue: oldValue != null ? String(oldValue) : null,
                theirValue: cf.serverValue != null ? String(cf.serverValue) : null,
                yourValue: cf.clientValue != null ? String(cf.clientValue) : null,
              })
            );

            // Store conflict data and open modal
            // Include serverRow so "Keep Theirs" and "Cancel" can restore fresh data (including updatedAt)
            const queryParams = getQueryParams();
            setConflictData({
              patientName: serverRow?.memberName || data.memberName || 'Unknown',
              changedBy,
              conflicts: conflictFields,
              rowId: data.id,
              updatePayload: {
                [colDef.field]: data[colDef.field as keyof GridRow],
              } as MeasureUpdatePayload,
              queryParams,
              serverRow: serverRow || null,
            });
            setConflictModalOpen(true);

            onSaveStatusChange?.('error');
            clearTimeout(saveStatusTimerRef.current);
            saveStatusTimerRef.current = setTimeout(() => {
              onSaveStatusChange?.('idle');
            }, 3000);
          }
          return;
        }

        // Handle 404 Not Found (row deleted by another user)
        if (statusCode === 404) {
          showToast('Row deleted by another user.', 'warning');
          // Remove the row from the grid
          gridApi.applyTransaction({ remove: [data] });
          onRowDeleted?.(data.id);
          onSaveStatusChange?.('idle');
          return;
        }

        onSaveStatusChange?.('error');

        // Show error message to user
        showToast(getApiErrorMessage(error, 'Failed to save changes.'), 'error');

        // For duplicate errors (409 non-conflict), reset to empty instead of reverting
        if (statusCode === 409 && (colDef.field === 'requestType' || colDef.field === 'qualityMeasure')) {
          event.node.setDataValue(colDef.field, null);
          // Also reset dependent fields
          if (colDef.field === 'requestType') {
            event.node.setDataValue('qualityMeasure', null);
            event.node.setDataValue('measureStatus', null);
          } else if (colDef.field === 'qualityMeasure') {
            event.node.setDataValue('measureStatus', null);
          }
        } else {
          // Revert to old value for other errors
          event.node.setDataValue(colDef.field, oldValue);
        }
      } else {
        // Non-Axios error
        onSaveStatusChange?.('error');
        showToast(getApiErrorMessage(error, 'Failed to save changes.'), 'error');
        event.node.setDataValue(colDef.field, oldValue);
      }

      // Reset to idle after 3 seconds
      clearTimeout(saveStatusTimerRef.current);
      saveStatusTimerRef.current = setTimeout(() => {
        onSaveStatusChange?.('idle');
      }, 3000);
    } finally {
      // Always reset the cascading update flag
      isCascadingUpdateRef.current = false;
    }
  }, [onRowUpdated, onRowDeleted, onSaveStatusChange, getQueryParams, frozenRowOrderRef, saveStatusTimerRef, setConflictData, setConflictModalOpen]);

  return { onCellValueChanged, isCascadingUpdateRef };
}
