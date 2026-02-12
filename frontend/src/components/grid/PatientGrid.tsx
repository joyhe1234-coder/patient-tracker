import { useMemo, useCallback, useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, GridReadyEvent, SelectionChangedEvent, ICellEditorParams, RowClassParams, PostSortRowsParams, CellEditingStartedEvent, CellEditingStoppedEvent, CellClassParams, CellClickedEvent, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/authStore';
import { useRealtimeStore } from '../../stores/realtimeStore';
import { emitEditingStart, emitEditingStop } from '../../services/socketService';
import { showToast } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import AutoOpenSelectEditor from './AutoOpenSelectEditor';
import DateCellEditor from './DateCellEditor';
import StatusDateRenderer from './StatusDateRenderer';
import ConflictModal, { ConflictField } from '../modals/ConflictModal';
import type { GridRowPayload, ConflictResponse } from '../../types/socket';
import {
  REQUEST_TYPES,
  getQualityMeasuresForRequestType,
  getMeasureStatusesForQualityMeasure,
  getTracking1OptionsForStatus,
  getAutoFillQualityMeasure,
} from '../../config/dropdownConfig';
import {
  GRAY_STATUSES, PURPLE_STATUSES, GREEN_STATUSES,
  BLUE_STATUSES, YELLOW_STATUSES, ORANGE_STATUSES,
  isRowOverdue, isChronicDxAttestationSent,
} from '../../config/statusColors';

// Statuses where interval is controlled by TIME PERIOD dropdown (NOT manually editable)
// These have dropdowns like "In X Months", "X months", "Call every X wks"
const TIME_PERIOD_DROPDOWN_STATUSES = [
  'Screening discussed',           // Tracking #1: In 1-11 Months
  'HgbA1c ordered',                // Tracking #2: 1-12 months
  'HgbA1c at goal',                // Tracking #2: 1-12 months
  'HgbA1c NOT at goal',            // Tracking #2: 1-12 months
  'Scheduled call back - BP not at goal',  // Tracking #1: Call every 1-8 wks
  'Scheduled call back - BP at goal',      // Tracking #1: Call every 1-8 wks
];

// Helper function to determine if time interval is editable
// Editable when: has status date + has time interval + NOT a time-period dropdown status
const isTimeIntervalEditable = (data: GridRow | undefined): boolean => {
  if (!data) return false;

  // No status date = no due date calculation possible
  if (!data.statusDate) return false;

  // No time interval calculated = status has no baseDueDays
  if (data.timeIntervalDays === null || data.timeIntervalDays === undefined) return false;

  // Time period dropdown statuses: interval controlled by dropdown, not manually editable
  if (data.measureStatus && TIME_PERIOD_DROPDOWN_STATUSES.includes(data.measureStatus)) {
    return false;
  }

  // All other statuses: allow manual override of default interval
  return true;
};

// Field display name mapping for conflict modal
const FIELD_DISPLAY_NAMES: Record<string, string> = {
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
  tracking3: 'Tracking #3',
  dueDate: 'Due Date',
  timeIntervalDays: 'Time Interval',
  notes: 'Notes',
};

export interface GridRow {
  id: number;
  patientId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
  measureStatus: string | null;
  statusDate: string | null;
  statusDatePrompt: string | null;
  tracking1: string | null;
  tracking2: string | null;
  tracking3: string | null;
  dueDate: string | null;
  timeIntervalDays: number | null;
  notes: string | null;
  rowOrder: number;
  isDuplicate: boolean;
  updatedAt?: string;
}

// Public methods exposed via ref for remote operations
export interface PatientGridHandle {
  handleRemoteRowUpdate: (row: GridRowPayload, changedBy: string) => void;
  handleRemoteRowCreate: (row: GridRowPayload) => void;
  handleRemoteRowDelete: (rowId: number, changedBy: string) => void;
  handleDataRefresh: () => void;
}

interface PatientGridProps {
  rowData: GridRow[];
  onRowAdded?: (row: GridRow) => void;
  onRowDeleted?: (id: number) => void;
  onRowUpdated?: (row: GridRow) => void;
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  onRowSelected?: (id: number | null) => void;
  showMemberInfo?: boolean;
  newRowId?: number | null;
  onNewRowFocused?: () => void;
  onDataRefresh?: () => void;
}

// Date formatter for display - use UTC to avoid timezone shifts
// Display without leading zeros: 1/5/2023 instead of 01/05/2023
const formatDate = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
};

// DOB formatter - masked for privacy
const formatDobMasked = (value: string | null): string => {
  if (!value) return '';
  return '###';
};

// Format date for editing (M/D/YYYY) - use UTC to avoid timezone shifts
// No leading zeros for easier editing
const formatDateForEdit = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
};

// Phone formatter for display
const formatPhone = (value: string | null): string => {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return value;
};

// Parse date with flexible format validation - returns ISO string at UTC noon
// Supports: M/D/YYYY, MM/DD/YYYY, M-D-YYYY, MM-DD-YYYY, M.D.YYYY, YYYY-MM-DD, short year (YY)
const parseAndValidateDate = (input: string): string | null => {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();
  let m = 0, d = 0, y = 0;

  // Try MM/DD/YYYY or M/D/YYYY or M/D/YY (with slashes)
  let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    m = parseInt(match[1]);
    d = parseInt(match[2]);
    y = parseInt(match[3]);
    if (y < 100) y += 2000; // Convert 2-digit year to 4-digit (assumes 2000s)
  }

  // Try MM-DD-YYYY or M-D-YYYY or M-D-YY (with dashes, US format)
  if (!match) {
    match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (match) {
      m = parseInt(match[1]);
      d = parseInt(match[2]);
      y = parseInt(match[3]);
      if (y < 100) y += 2000;
    }
  }

  // Try MM.DD.YYYY or M.D.YYYY (with dots)
  if (!match) {
    match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (match) {
      m = parseInt(match[1]);
      d = parseInt(match[2]);
      y = parseInt(match[3]);
      if (y < 100) y += 2000;
    }
  }

  // Try YYYY-MM-DD or YYYY/MM/DD (ISO format)
  if (!match) {
    match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      y = parseInt(match[1]);
      m = parseInt(match[2]);
      d = parseInt(match[3]);
    }
  }

  // Try MMDDYYYY or MDYYYY (no separators, 8 digits)
  if (!match) {
    match = trimmed.match(/^(\d{8})$/);
    if (match) {
      const digits = match[1];
      m = parseInt(digits.substring(0, 2));
      d = parseInt(digits.substring(2, 4));
      y = parseInt(digits.substring(4, 8));
    }
  }

  // If no format matched, return null
  if (!match) {
    return null;
  }

  // Validate date values
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }

  // Additional validation: check if day is valid for the month
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) {
    return null;
  }

  // Return ISO string at UTC noon to avoid timezone boundary issues
  const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
  return isoString;
};

// Show date format error
const showDateFormatError = () => {
  alert('Invalid date format.\n\nAccepted formats:\n• 12/25/2023 or 1/5/2023\n• 12-25-2023 or 1-5-23\n• 2023-12-25\n• 12252023');
};

const PatientGrid = forwardRef<PatientGridHandle, PatientGridProps>(function PatientGrid({
  rowData,
  onRowAdded,
  onRowDeleted,
  onRowUpdated,
  onSaveStatusChange,
  onRowSelected,
  showMemberInfo = false,
  newRowId,
  onNewRowFocused,
  onDataRefresh,
}, ref) {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const { user, selectedPhysicianId } = useAuthStore();
  const activeEdits = useRealtimeStore((s) => s.activeEdits);

  // Conflict modal state (Task 44)
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictData, setConflictData] = useState<{
    patientName: string;
    changedBy: string;
    conflicts: ConflictField[];
    rowId: number;
    updatePayload: Record<string, unknown>;
    queryParams: string;
  } | null>(null);

  // Build query params for API calls (STAFF and ADMIN users need physicianId)
  const getQueryParams = useCallback(() => {
    if (user?.roles.includes('STAFF') && selectedPhysicianId) {
      return `?physicianId=${selectedPhysicianId}`;
    }
    if (user?.roles.includes('ADMIN')) {
      return `?physicianId=${selectedPhysicianId === null ? 'unassigned' : selectedPhysicianId}`;
    }
    return '';
  }, [user?.roles, selectedPhysicianId]);

  // Store the frozen row order when sort is cleared during editing
  const frozenRowOrderRef = useRef<number[] | null>(null);

  // Ref to track when we're doing a cascading update (to prevent setDataValue from triggering additional API calls)
  const isCascadingUpdateRef = useRef(false);

  // Task 45: Remote row update handler with out-of-order protection
  const handleRemoteRowUpdate = useCallback((row: GridRowPayload, changedBy: string) => {
    const gridApi = gridRef.current?.api;
    if (!gridApi) return;

    const rowNode = gridApi.getRowNode(String(row.id));
    if (!rowNode || !rowNode.data) return;

    // Out-of-order protection: compare updatedAt timestamps
    const localUpdatedAt = rowNode.data.updatedAt;
    if (localUpdatedAt && row.updatedAt) {
      if (new Date(row.updatedAt) <= new Date(localUpdatedAt)) {
        // Incoming update is older or same as local — discard
        return;
      }
    }

    // Task 44b: Cascading edit conflict detection
    // Check if remote update affects a cell the user is currently editing
    const editingCells = gridApi.getEditingCells();
    if (editingCells.length > 0) {
      const editingCell = editingCells[0];
      if (editingCell.rowIndex !== undefined && editingCell.rowIndex !== null) {
        const editingNode = gridApi.getDisplayedRowAtIndex(editingCell.rowIndex);
        if (editingNode && editingNode.data?.id === row.id) {
          // The remote update is for the same row we're editing
          const editingField = editingCell.column.getColId();
          const serverValue = row[editingField as keyof GridRowPayload];
          const localValue = editingNode.data[editingField as keyof GridRow];
          if (serverValue !== localValue) {
            // Stop editing and notify user
            gridApi.stopEditing(true);
            showToast(`${changedBy} modified "${FIELD_DISPLAY_NAMES[editingField] || editingField}" while you were editing. Their changes have been applied.`, 'warning');
          }
        }
      }
    }

    // Update the row data
    rowNode.setData(row as unknown as GridRow);

    // Flash changed cells to highlight the update
    gridApi.flashCells({ rowNodes: [rowNode], fadeDelay: 500 });

    // Refresh to update row styling
    gridApi.refreshCells({ rowNodes: [rowNode], force: true });

    // Update React state
    onRowUpdated?.(row as unknown as GridRow);
  }, [onRowUpdated]);

  // Task 46: Remote row create handler
  const handleRemoteRowCreate = useCallback((row: GridRowPayload) => {
    const gridApi = gridRef.current?.api;
    if (!gridApi) return;

    // Check if row already exists (dedup)
    const existing = gridApi.getRowNode(String(row.id));
    if (existing) return;

    gridApi.applyTransaction({ add: [row as unknown as GridRow] });

    // Also update parent state
    onRowAdded?.(row as unknown as GridRow);
  }, [onRowAdded]);

  // Task 46: Remote row delete handler
  const handleRemoteRowDelete = useCallback((rowId: number, changedBy: string) => {
    const gridApi = gridRef.current?.api;
    if (!gridApi) return;

    const rowNode = gridApi.getRowNode(String(rowId));
    if (!rowNode) return;

    // If user was editing this row, stop editing
    const editingCells = gridApi.getEditingCells();
    if (editingCells.length > 0) {
      const editingNode = gridApi.getDisplayedRowAtIndex(editingCells[0].rowIndex);
      if (editingNode && editingNode.data?.id === rowId) {
        gridApi.stopEditing(true);
      }
    }

    gridApi.applyTransaction({ remove: [rowNode.data!] });
    showToast(`Row deleted by ${changedBy}.`, 'warning');

    // Update parent state
    onRowDeleted?.(rowId);
  }, [onRowDeleted]);

  // Task 47: Full data refresh handler
  const handleDataRefresh = useCallback(() => {
    onDataRefresh?.();
  }, [onDataRefresh]);

  // Expose handlers via ref (Task 51 — used by MainPage)
  useImperativeHandle(ref, () => ({
    handleRemoteRowUpdate,
    handleRemoteRowCreate,
    handleRemoteRowDelete,
    handleDataRefresh,
  }), [handleRemoteRowUpdate, handleRemoteRowCreate, handleRemoteRowDelete, handleDataRefresh]);

  // Handle new row focus - clear sort and focus Request Type cell
  useEffect(() => {
    if (newRowId && gridRef.current?.api) {
      const api = gridRef.current.api;

      // Clear any existing sort
      api.applyColumnState({ defaultState: { sort: null } });

      // Find the row node with the new row ID
      const rowNode = api.getRowNode(String(newRowId));
      if (rowNode) {
        // Select the new row
        rowNode.setSelected(true);

        // Focus the Request Type cell (first editable column after patient info)
        api.setFocusedCell(rowNode.rowIndex!, 'requestType');
        api.startEditingCell({
          rowIndex: rowNode.rowIndex!,
          colKey: 'requestType',
        });
      }

      // Notify parent that focus is complete
      onNewRowFocused?.();
    }
  }, [newRowId, onNewRowFocused]);

  const onGridReady = useCallback((_params: GridReadyEvent<GridRow>) => {
    // Grid is ready, can access API via gridRef.current.api if needed
  }, []);

  // Post-sort callback to maintain frozen row order when sort is cleared
  const postSortRows = useCallback((params: PostSortRowsParams<GridRow>) => {
    if (frozenRowOrderRef.current && frozenRowOrderRef.current.length > 0) {
      const orderMap = new Map(frozenRowOrderRef.current.map((id, index) => [id, index]));
      params.nodes.sort((a, b) => {
        const idA = a.data?.id;
        const idB = b.data?.id;
        const orderA = idA !== undefined ? (orderMap.get(idA) ?? Infinity) : Infinity;
        const orderB = idB !== undefined ? (orderMap.get(idB) ?? Infinity) : Infinity;
        return orderA - orderB;
      });
      // Clear the frozen order after applying it once
      frozenRowOrderRef.current = null;
    }
  }, []);

  // Handle row selection change
  const onSelectionChanged = useCallback((event: SelectionChangedEvent<GridRow>) => {
    const selectedRows = event.api.getSelectedRows();
    if (selectedRows.length > 0) {
      onRowSelected?.(selectedRows[0].id);
    } else {
      onRowSelected?.(null);
    }
  }, [onRowSelected]);

  // Task 50: Emit editing:start when user starts editing a cell
  const onCellEditingStarted = useCallback((event: CellEditingStartedEvent<GridRow>) => {
    const { data, colDef } = event;
    if (data && colDef.field) {
      emitEditingStart(data.id, colDef.field);
    }
  }, []);

  // Task 50: Emit editing:stop when user stops editing a cell
  const onCellEditingStopped = useCallback((event: CellEditingStoppedEvent<GridRow>) => {
    const { data, colDef } = event;
    if (data && colDef.field) {
      emitEditingStop(data.id, colDef.field);
    }
  }, []);

  // Handle cell value change - auto-save with cascading logic
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

    // Task 42: Capture expectedVersion before PUT
    const expectedVersion = data.updatedAt || undefined;

    try {
      // Use the processed value from data object for fields with valueSetters
      // This ensures we send the transformed value (e.g., ISO date string) not raw input
      const processedValue = data[colDef.field as keyof GridRow];
      const updatePayload: Record<string, unknown> = {
        [colDef.field]: processedValue,
      };

      // Handle cascading logic - clear all downstream fields when parent changes
      // Hierarchy: requestType -> qualityMeasure -> measureStatus -> statusDate -> tracking1/2/3 -> dueDate/timeInterval
      // Keep: notes (not cleared on cascade)

      // Set flag to prevent setDataValue from triggering additional API calls
      isCascadingUpdateRef.current = true;

      if (colDef.field === 'requestType') {
        // Auto-fill Quality Measure for AWV and Chronic DX
        const autoFillQM = getAutoFillQualityMeasure(newValue);
        if (autoFillQM) {
          updatePayload.qualityMeasure = autoFillQM;
          node.setDataValue('qualityMeasure', autoFillQM);
        } else {
          // Clear Quality Measure (always, not just if invalid)
          updatePayload.qualityMeasure = null;
          node.setDataValue('qualityMeasure', null);
        }
        // Clear all downstream fields including calculated fields
        updatePayload.measureStatus = null;
        updatePayload.statusDate = null;
        updatePayload.tracking1 = null;
        updatePayload.tracking2 = null;
        updatePayload.tracking3 = null;
        updatePayload.dueDate = null;
        updatePayload.timeIntervalDays = null;
        node.setDataValue('measureStatus', null);
        node.setDataValue('statusDate', null);
        node.setDataValue('tracking1', null);
        node.setDataValue('tracking2', null);
        node.setDataValue('tracking3', null);
        node.setDataValue('dueDate', null);
        node.setDataValue('timeIntervalDays', null);
      }

      if (colDef.field === 'qualityMeasure') {
        // Clear all downstream fields including calculated fields
        updatePayload.measureStatus = null;
        updatePayload.statusDate = null;
        updatePayload.tracking1 = null;
        updatePayload.tracking2 = null;
        updatePayload.tracking3 = null;
        updatePayload.dueDate = null;
        updatePayload.timeIntervalDays = null;
        node.setDataValue('measureStatus', null);
        node.setDataValue('statusDate', null);
        node.setDataValue('tracking1', null);
        node.setDataValue('tracking2', null);
        node.setDataValue('tracking3', null);
        node.setDataValue('dueDate', null);
        node.setDataValue('timeIntervalDays', null);
      }

      if (colDef.field === 'measureStatus') {
        // Clear statusDate, tracking fields, and calculated fields
        updatePayload.statusDate = null;
        updatePayload.tracking1 = null;
        updatePayload.tracking2 = null;
        updatePayload.tracking3 = null;
        updatePayload.dueDate = null;
        updatePayload.timeIntervalDays = null;
        node.setDataValue('statusDate', null);
        node.setDataValue('tracking1', null);
        node.setDataValue('tracking2', null);
        node.setDataValue('tracking3', null);
        node.setDataValue('dueDate', null);
        node.setDataValue('timeIntervalDays', null);
      }

      // Task 42: Include expectedVersion in PUT request
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

        // Refresh the row to update styling (row colors)
        gridApi.refreshCells({ rowNodes: [node], force: true });

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
        setTimeout(() => {
          onSaveStatusChange?.('idle');
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Failed to save:', error);

      const axiosError = error as {
        response?: {
          data?: {
            error?: { message?: string; code?: string };
            data?: ConflictResponse['data'];
          };
          status?: number;
        };
      };
      const statusCode = axiosError?.response?.status;
      const errorCode = axiosError?.response?.data?.error?.code;

      // Task 43: Handle 409 VERSION_CONFLICT
      if (statusCode === 409 && errorCode === 'VERSION_CONFLICT') {
        const conflictResponseData = axiosError?.response?.data?.data;
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
          const queryParams = getQueryParams();
          setConflictData({
            patientName: serverRow?.memberName || data.memberName || 'Unknown',
            changedBy,
            conflicts: conflictFields,
            rowId: data.id,
            updatePayload: {
              [colDef.field]: data[colDef.field as keyof GridRow],
            },
            queryParams,
          });
          setConflictModalOpen(true);

          onSaveStatusChange?.('error');
          setTimeout(() => {
            onSaveStatusChange?.('idle');
          }, 3000);
        }
        return;
      }

      // Task 43: Handle 404 Not Found (row deleted by another user)
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
      const errorMessage = axiosError?.response?.data?.error?.message || 'Failed to save changes.';
      showToast(errorMessage, 'error');

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

      // Reset to idle after 3 seconds
      setTimeout(() => {
        onSaveStatusChange?.('idle');
      }, 3000);
    } finally {
      // Always reset the cascading update flag
      isCascadingUpdateRef.current = false;
    }
  }, [onRowUpdated, onRowDeleted, onSaveStatusChange, getQueryParams]);

  // Task 43: Handle "Keep Mine" — retry PUT with forceOverwrite
  const handleConflictKeepMine = useCallback(async () => {
    if (!conflictData) return;

    setConflictModalOpen(false);
    onSaveStatusChange?.('saving');

    try {
      const forcePayload = {
        ...conflictData.updatePayload,
        forceOverwrite: true,
      };
      const response = await api.put(
        `/data/${conflictData.rowId}${conflictData.queryParams}`,
        forcePayload
      );

      if (response.data.success) {
        const gridApi = gridRef.current?.api;
        if (gridApi) {
          const rowNode = gridApi.getRowNode(String(conflictData.rowId));
          if (rowNode) {
            rowNode.setData(response.data.data);
            gridApi.refreshCells({ rowNodes: [rowNode], force: true });
          }
        }
        onRowUpdated?.(response.data.data);
        onSaveStatusChange?.('saved');
        setTimeout(() => onSaveStatusChange?.('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to force save:', err);
      onSaveStatusChange?.('error');
      showToast(getApiErrorMessage(err, 'Failed to save your changes.'), 'error');
      setTimeout(() => onSaveStatusChange?.('idle'), 3000);
    } finally {
      setConflictData(null);
    }
  }, [conflictData, onRowUpdated, onSaveStatusChange]);

  // Task 43: Handle "Keep Theirs" — revert cell to server value
  const handleConflictKeepTheirs = useCallback(() => {
    if (!conflictData) return;

    setConflictModalOpen(false);

    // Re-fetch the row from the conflict data's server row and apply it
    // The server row was included in the 409 response
    const gridApi = gridRef.current?.api;
    if (gridApi) {
      const rowNode = gridApi.getRowNode(String(conflictData.rowId));
      if (rowNode) {
        // Revert each conflicting field to server's value
        for (const conflict of conflictData.conflicts) {
          const serverValue = conflict.theirValue;
          rowNode.setDataValue(conflict.fieldKey, serverValue);
        }
        gridApi.refreshCells({ rowNodes: [rowNode], force: true });
      }
    }

    setConflictData(null);
    onSaveStatusChange?.('idle');
  }, [conflictData, onSaveStatusChange]);

  // Handle conflict cancel
  const handleConflictCancel = useCallback(() => {
    setConflictModalOpen(false);
    setConflictData(null);
    onSaveStatusChange?.('idle');
  }, [onSaveStatusChange]);

  // Task 49: cellClass callback for edit indicators
  // Returns class names based on whether another user is editing a cell
  const getRemoteEditCellClass = useCallback((params: CellClassParams<GridRow>): string | string[] => {
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

  // Determine if a cell should behave as a dropdown (show arrow + single-click open)
  const isDropdownCell = useCallback((field: string, data: GridRow | undefined): boolean => {
    // Always-dropdown columns
    if (field === 'requestType' || field === 'qualityMeasure' || field === 'measureStatus') {
      return true;
    }
    // tracking1: dropdown when options exist for the current status
    if (field === 'tracking1') {
      return !!getTracking1OptionsForStatus(data?.measureStatus || '');
    }
    // tracking2: dropdown only for HgbA1c statuses (BP statuses use text input)
    if (field === 'tracking2') {
      const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
      return hgba1cStatuses.includes(data?.measureStatus || '');
    }
    return false;
  }, []);

  // Cell renderer that wraps dropdown cells with a hover-reveal arrow indicator
  // Returns JSX for AG Grid React mode
  const dropdownCellRenderer = useCallback((params: ICellRendererParams<GridRow>) => {
    const field = params.colDef?.field || '';
    const data = params.data;
    const displayValue = params.valueFormatted ?? params.value ?? '';

    // Non-dropdown rows (e.g. tracking1 N/A, tracking2 BP text) — render plain value
    if (!isDropdownCell(field, data)) {
      return <>{displayValue}</>;
    }

    return (
      <div className="cell-dropdown-wrapper">
        <span className="cell-dropdown-value">{displayValue}</span>
        <span className="cell-dropdown-arrow">{'\u25BE'}</span>
      </div>
    );
  }, [isDropdownCell]);

  // Single-click handler for dropdown cells — opens editor programmatically
  const onCellClicked = useCallback((event: CellClickedEvent<GridRow>) => {
    const { data, colDef, api: gridApi, rowIndex } = event;
    const field = colDef.field || '';

    // Only act on dropdown cells
    if (!isDropdownCell(field, data)) return;

    // Skip if another user is remotely editing this cell
    if (data) {
      const isRemote = activeEdits.some(
        (e) => e.rowId === data.id && e.field === field
      );
      if (isRemote) return;
    }

    // Skip if cell is disabled (N/A)
    if (field === 'tracking1') {
      const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
      const hasOptions = getTracking1OptionsForStatus(data?.measureStatus || '');
      const isHgba1c = hgba1cStatuses.includes(data?.measureStatus || '');
      if (!hasOptions && !isHgba1c) return;
    }

    if (rowIndex !== null && rowIndex !== undefined) {
      gridApi.startEditingCell({
        rowIndex,
        colKey: field,
      });
    }
  }, [isDropdownCell, activeEdits]);

  const columnDefs: ColDef<GridRow>[] = useMemo(() => [
    {
      field: 'requestType',
      headerName: 'Request Type',
      headerTooltip: 'Request Type',
      width: 130,
      pinned: 'left',
      editable: true,
      cellEditor: AutoOpenSelectEditor,
      cellEditorPopup: true,
      cellEditorParams: {
        values: ['', ...REQUEST_TYPES], // Empty option first for new rows
      },
      cellRenderer: dropdownCellRenderer,
      valueGetter: (params) => params.data?.requestType || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.requestType = params.newValue === '' ? null : params.newValue;
        return true;
      },
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'memberName',
      headerName: 'Member Name',
      headerTooltip: 'Member Name',
      width: 180,
      pinned: 'left',
      editable: true,
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'memberDob',
      headerName: 'Member DOB',
      headerTooltip: 'Member Date of Birth',
      width: 130,
      hide: !showMemberInfo,
      editable: true,
      valueFormatter: (params) => formatDobMasked(params.value),
      cellRenderer: (params: { value: string | null }) => {
        const display = formatDobMasked(params.value);
        if (!display) return '';
        return `<span aria-label="Date of birth hidden for privacy">${display}</span>`;
      },
      valueGetter: (params) => {
        // Return YYYY-MM-DD format for editing
        const value = params.data?.memberDob;
        if (!value) return '';
        return formatDateForEdit(value);
      },
      valueSetter: (params) => {
        // Convert date back to ISO - DOB is required
        if (!params.newValue) {
          alert('Date of Birth is required and cannot be empty.');
          return false;
        }
        const isoDate = parseAndValidateDate(params.newValue);
        if (!isoDate) {
          showDateFormatError();
          return false;
        }
        params.data.memberDob = isoDate;
        return true;
      },
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'memberTelephone',
      headerName: 'Member Telephone',
      headerTooltip: 'Member Telephone',
      width: 140,
      hide: !showMemberInfo,
      editable: true,
      valueFormatter: (params) => formatPhone(params.value),
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'memberAddress',
      headerName: 'Member Home Address',
      headerTooltip: 'Member Home Address',
      width: 220,
      hide: !showMemberInfo,
      editable: true,
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'qualityMeasure',
      headerName: 'Quality Measure',
      headerTooltip: 'Quality Measure',
      width: 200,
      editable: true,
      cellEditor: AutoOpenSelectEditor,
      cellEditorPopup: true,
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: ['', ...getQualityMeasuresForRequestType(params.data?.requestType || '')],
      }),
      cellRenderer: dropdownCellRenderer,
      valueGetter: (params) => params.data?.qualityMeasure || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.qualityMeasure = params.newValue === '' ? null : params.newValue;
        return true;
      },
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'measureStatus',
      headerName: 'Measure Status',
      headerTooltip: 'Measure Status',
      width: 220,
      editable: true,
      cellEditor: AutoOpenSelectEditor,
      cellEditorPopup: true,
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: ['', ...getMeasureStatusesForQualityMeasure(params.data?.qualityMeasure || '')],
      }),
      cellRenderer: dropdownCellRenderer,
      valueGetter: (params) => params.data?.measureStatus || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.measureStatus = params.newValue === '' ? null : params.newValue;
        return true;
      },
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'statusDate',
      headerName: 'Status Date',
      headerTooltip: 'Status Date',
      width: 140,
      editable: true,
      cellEditor: DateCellEditor,
      cellRenderer: StatusDateRenderer,
      valueFormatter: (params) => {
        // Used for clipboard/export; renderer handles display
        if (!params.value && params.data?.statusDatePrompt) {
          return params.data.statusDatePrompt;
        }
        return formatDate(params.value);
      },
      cellClass: (params: CellClassParams<GridRow>) => {
        const classes: string[] = [];
        // Gray prompt for cells missing status date
        if (!params.value && params.data?.statusDatePrompt) {
          classes.push('cell-prompt');
        }
        // Remote editing indicator
        const remoteClass = getRemoteEditCellClass(params);
        if (remoteClass) {
          classes.push(...(Array.isArray(remoteClass) ? remoteClass : [remoteClass]));
        }
        return classes.length > 0 ? classes.join(' ') : '';
      },
      valueGetter: (params) => {
        const value = params.data?.statusDate;
        if (!value) return '';
        return formatDateForEdit(value);
      },
      valueSetter: (params) => {
        if (!params.newValue) {
          params.data.statusDate = null;
          return true;
        }
        const isoDate = parseAndValidateDate(params.newValue);
        if (!isoDate) {
          showDateFormatError();
          return false; // Reject the change
        }
        params.data.statusDate = isoDate;
        return true;
      },
      // Custom comparator for proper date sorting (compares ISO date strings)
      comparator: (_valueA, _valueB, nodeA, nodeB) => {
        const dateA = nodeA?.data?.statusDate;
        const dateB = nodeB?.data?.statusDate;
        // Null/empty dates sort to the end
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        // Compare ISO date strings chronologically
        return dateA.localeCompare(dateB);
      },
    },
    {
      field: 'tracking1',
      headerName: 'Tracking #1',
      headerTooltip: 'Tracking #1',
      width: 160,
      cellEditorPopup: true,
      editable: (params) => {
        // Editable if has dropdown options OR is HgbA1c status
        const hasOptions = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        return !!hasOptions || hgba1cStatuses.includes(params.data?.measureStatus || '');
      },
      cellRenderer: dropdownCellRenderer,
      cellEditorSelector: (params: ICellEditorParams<GridRow>) => {
        const options = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        if (options) {
          return {
            component: AutoOpenSelectEditor,
            params: { values: options },
          };
        }
        return { component: 'agTextCellEditor' };
      },
      valueFormatter: (params) => {
        // When rendering dropdown options, params.data may be undefined
        // In that case, just return the value as-is
        if (!params.data) {
          return params.value || '';
        }

        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const status = params.data.measureStatus || '';
        const hasOptions = getTracking1OptionsForStatus(status);
        const isHgba1c = hgba1cStatuses.includes(status);

        // If cell has dropdown options, show appropriate prompt when empty
        if (hasOptions) {
          if (!params.value) {
            // Different prompts based on measure status
            if (status.includes('Colon cancer')) {
              return 'Select screening type';
            }
            if (status === 'Screening test ordered' || status === 'Screening test completed') {
              return 'Select test type';
            }
            if (status === 'Chronic diagnosis resolved' || status === 'Chronic diagnosis invalid') {
              return 'Select status';
            }
            return 'Select time period';
          }
          return params.value;
        }

        // Disabled - show N/A (no dropdown options and not HgbA1c)
        if (!isHgba1c) {
          return 'N/A';
        }

        // Show prompt text for HgbA1c statuses when tracking1 is empty
        if (!params.value) {
          return 'HgbA1c value';
        }
        return params.value || '';
      },
      cellClass: (params: CellClassParams<GridRow>) => {
        const classes: string[] = [];
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const hasOptions = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        const isHgba1c = hgba1cStatuses.includes(params.data?.measureStatus || '');

        // Dropdown options need prompt when empty
        if (hasOptions && !params.value) {
          classes.push('cell-prompt');
        }
        // HgbA1c needs prompt when empty
        else if (isHgba1c && !params.value) {
          classes.push('cell-prompt');
        }
        // Disabled (N/A) - no dropdown options and not HgbA1c
        else if (!hasOptions && !isHgba1c) {
          classes.push('cell-disabled');
        }

        // Remote editing indicator
        const remoteClass = getRemoteEditCellClass(params);
        if (remoteClass) {
          classes.push(...(Array.isArray(remoteClass) ? remoteClass : [remoteClass]));
        }
        return classes.length > 0 ? classes.join(' ') : '';
      },
    },
    {
      field: 'tracking2',
      headerName: 'Tracking #2',
      headerTooltip: 'Tracking #2',
      width: 150,
      cellEditorPopup: true,
      editable: (params) => {
        // Editable for HgbA1c statuses (testing interval) and Hypertension call back (BP reading)
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const bpStatuses = ['Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal'];
        const status = params.data?.measureStatus || '';
        return hgba1cStatuses.includes(status) || bpStatuses.includes(status);
      },
      cellRenderer: dropdownCellRenderer,
      cellEditorSelector: (params: ICellEditorParams<GridRow>) => {
        // HgbA1c statuses get dropdown for testing interval
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        if (hgba1cStatuses.includes(params.data?.measureStatus || '')) {
          return {
            component: AutoOpenSelectEditor,
            params: {
              values: ['1 month', '2 months', '3 months', '4 months', '5 months', '6 months', '7 months', '8 months', '9 months', '10 months', '11 months', '12 months'],
            },
          };
        }
        // BP statuses get free text
        return { component: 'agTextCellEditor' };
      },
      valueFormatter: (params) => {
        // When rendering dropdown options, params.data may be undefined
        // In that case, just return the value as-is
        if (!params.data) {
          return params.value || '';
        }

        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const bpStatuses = ['Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal'];
        const status = params.data.measureStatus || '';
        const isEditable = hgba1cStatuses.includes(status) || bpStatuses.includes(status);

        // Disabled - show N/A
        if (!isEditable) {
          return 'N/A';
        }
        // Show prompt for empty fields
        if (!params.value && hgba1cStatuses.includes(status)) {
          return 'Testing interval';
        }
        if (!params.value && bpStatuses.includes(status)) {
          return 'BP reading';
        }
        return params.value || '';
      },
      cellClass: (params: CellClassParams<GridRow>) => {
        const classes: string[] = [];
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const bpStatuses = ['Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal'];
        const status = params.data?.measureStatus || '';
        const isEditable = hgba1cStatuses.includes(status) || bpStatuses.includes(status);

        // Show prompt for empty editable fields
        if (isEditable && !params.value) {
          classes.push('cell-prompt');
        }
        // Disabled (N/A) - not editable
        else if (!isEditable) {
          classes.push('cell-disabled');
        }

        // Remote editing indicator
        const remoteClass = getRemoteEditCellClass(params);
        if (remoteClass) {
          classes.push(...(Array.isArray(remoteClass) ? remoteClass : [remoteClass]));
        }
        return classes.length > 0 ? classes.join(' ') : '';
      },
    },
    {
      field: 'tracking3',
      headerName: 'Tracking #3',
      headerTooltip: 'Tracking #3',
      width: 150,
      editable: true, // Placeholder for future use
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      headerTooltip: 'Due Date',
      width: 120,
      editable: false, // Calculated field
      valueFormatter: (params) => formatDate(params.value),
      // Custom comparator for proper date sorting
      comparator: (valueA, valueB) => {
        // Null/empty dates sort to the end
        if (!valueA && !valueB) return 0;
        if (!valueA) return 1;
        if (!valueB) return -1;
        // Compare ISO date strings chronologically
        return valueA.localeCompare(valueB);
      },
    },
    {
      field: 'timeIntervalDays',
      headerName: 'Time Interval (Days)',
      headerTooltip: 'Time Interval (Days)',
      width: 150,
      editable: (params) => isTimeIntervalEditable(params.data),
      valueSetter: (params) => {
        const newValue = params.newValue;
        if (newValue === null || newValue === '' || newValue === undefined) {
          return false; // Don't allow clearing
        }
        const parsed = parseInt(newValue, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
          alert('Please enter a valid number between 1 and 1000.');
          return false;
        }
        params.data.timeIntervalDays = parsed;
        return true;
      },
      cellClass: getRemoteEditCellClass,
    },
    {
      field: 'notes',
      headerName: 'Possible Actions Needed & Notes',
      headerTooltip: 'Possible Actions Needed & Notes',
      width: 300,
      flex: 1,
      editable: true,
      cellClass: getRemoteEditCellClass,
    },
  ], [showMemberInfo, getRemoteEditCellClass]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Row class rules based on Measure Status, duplicate detection, and overdue status
  // Duplicate is ADDITIVE (left stripe via CSS) - can combine with status colors
  // Priority for background: overdue > status-based colors
  const rowClassRules = useMemo(() => ({
    'row-status-duplicate': (params: RowClassParams<GridRow>) => params.data?.isDuplicate === true,
    'row-status-overdue': (params: RowClassParams<GridRow>) => isRowOverdue(params.data),
    'row-status-gray': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && GRAY_STATUSES.includes(params.data?.measureStatus as any || ''),
    'row-status-purple': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && PURPLE_STATUSES.includes(params.data?.measureStatus as any || ''),
    'row-status-green': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && (GREEN_STATUSES.includes(params.data?.measureStatus as any || '') || isChronicDxAttestationSent(params.data)),
    'row-status-blue': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && BLUE_STATUSES.includes(params.data?.measureStatus as any || ''),
    'row-status-yellow': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && YELLOW_STATUSES.includes(params.data?.measureStatus as any || ''),
    'row-status-orange': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && ORANGE_STATUSES.includes(params.data?.measureStatus as any || '') && !isChronicDxAttestationSent(params.data),
    'row-status-white': (params: RowClassParams<GridRow>) => {
      if (isRowOverdue(params.data)) return false;
      const status = params.data?.measureStatus || '';
      return !GRAY_STATUSES.includes(status as any) &&
             !PURPLE_STATUSES.includes(status as any) &&
             !GREEN_STATUSES.includes(status as any) &&
             !BLUE_STATUSES.includes(status as any) &&
             !YELLOW_STATUSES.includes(status as any) &&
             !ORANGE_STATUSES.includes(status as any);
    },
  }), []);

  return (
    <div
      className="ag-theme-alpine"
      style={{ width: '100%', height: 'calc(100vh - 200px)' }}
    >
      <AgGridReact<GridRow>
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        animateRows={true}
        rowSelection="single"
        suppressRowClickSelection={false}
        getRowId={(params) => String(params.data.id)}
        rowClassRules={rowClassRules}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onCellClicked={onCellClicked}
        onCellEditingStarted={onCellEditingStarted}
        onCellEditingStopped={onCellEditingStopped}
        onSelectionChanged={onSelectionChanged}
        stopEditingWhenCellsLoseFocus={true}
        singleClickEdit={false}
        deltaSort={false}
        postSortRows={postSortRows}
      />

      {/* Task 44: Conflict Resolution Modal */}
      <ConflictModal
        isOpen={conflictModalOpen}
        patientName={conflictData?.patientName || ''}
        changedBy={conflictData?.changedBy || ''}
        conflicts={conflictData?.conflicts || []}
        onKeepMine={handleConflictKeepMine}
        onKeepTheirs={handleConflictKeepTheirs}
        onCancel={handleConflictCancel}
      />
    </div>
  );
});

export default PatientGrid;
