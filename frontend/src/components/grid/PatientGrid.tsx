import { useMemo, useCallback, useRef, useEffect } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, GridReadyEvent, SelectionChangedEvent, ICellEditorParams, RowClassParams, PostSortRowsParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { api } from '../../api/axios';
import { useAuthStore } from '../../stores/authStore';
import {
  REQUEST_TYPES,
  getQualityMeasuresForRequestType,
  getMeasureStatusesForQualityMeasure,
  getTracking1OptionsForStatus,
  getAutoFillQualityMeasure,
} from '../../config/dropdownConfig';

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

export default function PatientGrid({
  rowData,
  onRowUpdated,
  onSaveStatusChange,
  onRowSelected,
  showMemberInfo = false,
  newRowId,
  onNewRowFocused,
}: PatientGridProps) {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const { user, selectedPhysicianId } = useAuthStore();

  // Build query params for API calls (STAFF users need physicianId)
  const getQueryParams = useCallback(() => {
    if (user?.role === 'STAFF' && selectedPhysicianId) {
      return `?physicianId=${selectedPhysicianId}`;
    }
    return '';
  }, [user?.role, selectedPhysicianId]);

  // Store the frozen row order when sort is cleared during editing
  const frozenRowOrderRef = useRef<number[] | null>(null);

  // Ref to track when we're doing a cascading update (to prevent setDataValue from triggering additional API calls)
  const isCascadingUpdateRef = useRef(false);

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

    try {
      // Use the processed value from data object for fields with valueSetters
      // This ensures we send the transformed value (e.g., ISO date string) not raw input
      const processedValue = data[colDef.field as keyof GridRow];
      const updatePayload: Record<string, unknown> = {
        [colDef.field]: processedValue,
      };

      // Handle cascading logic - clear all downstream fields when parent changes
      // Hierarchy: requestType → qualityMeasure → measureStatus → statusDate → tracking1/2/3 → dueDate/timeInterval
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

        // Note: We intentionally don't call onRowUpdated here to prevent
        // React state update which causes AG Grid to re-render and potentially reorder rows.
        // The grid already has the updated data via node.setData().
        // Filter counts may be slightly out of sync until next data reload.

        onSaveStatusChange?.('saved');

        // Reset to idle after 2 seconds
        setTimeout(() => {
          onSaveStatusChange?.('idle');
        }, 2000);
      }
    } catch (error: unknown) {
      console.error('Failed to save:', error);
      onSaveStatusChange?.('error');

      // Show error message to user
      const axiosError = error as { response?: { data?: { error?: { message?: string } }, status?: number } };
      const errorMessage = axiosError?.response?.data?.error?.message || 'Failed to save changes.';
      const statusCode = axiosError?.response?.status;
      alert(errorMessage);

      // For duplicate errors (409), reset to empty instead of reverting
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
  }, [onRowUpdated, onSaveStatusChange]);

  const columnDefs: ColDef<GridRow>[] = useMemo(() => [
    {
      field: 'requestType',
      headerName: 'Request Type',
      width: 130,
      pinned: 'left',
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['', ...REQUEST_TYPES], // Empty option first for new rows
      },
      valueGetter: (params) => params.data?.requestType || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.requestType = params.newValue === '' ? null : params.newValue;
        return true;
      },
    },
    {
      field: 'memberName',
      headerName: 'Member Name',
      width: 180,
      pinned: 'left',
      editable: true,
    },
    {
      field: 'memberDob',
      headerName: 'Member DOB',
      width: 130,
      hide: !showMemberInfo,
      editable: true,
      valueFormatter: (params) => formatDobMasked(params.value),
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
    },
    {
      field: 'memberTelephone',
      headerName: 'Member Telephone',
      width: 140,
      hide: !showMemberInfo,
      editable: true,
      valueFormatter: (params) => formatPhone(params.value),
    },
    {
      field: 'memberAddress',
      headerName: 'Member Home Address',
      width: 220,
      hide: !showMemberInfo,
      editable: true,
    },
    {
      field: 'qualityMeasure',
      headerName: 'Quality Measure',
      width: 200,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: ['', ...getQualityMeasuresForRequestType(params.data?.requestType || '')],
      }),
      valueGetter: (params) => params.data?.qualityMeasure || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.qualityMeasure = params.newValue === '' ? null : params.newValue;
        return true;
      },
    },
    {
      field: 'measureStatus',
      headerName: 'Measure Status',
      width: 220,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: ['', ...getMeasureStatusesForQualityMeasure(params.data?.qualityMeasure || '')],
      }),
      valueGetter: (params) => params.data?.measureStatus || '', // Convert null to '' for dropdown
      valueSetter: (params) => {
        params.data.measureStatus = params.newValue === '' ? null : params.newValue;
        return true;
      },
    },
    {
      field: 'statusDate',
      headerName: 'Status Date',
      width: 140,
      editable: true,
      valueFormatter: (params) => {
        // Show prompt text if no date and prompt exists
        if (!params.value && params.data?.statusDatePrompt) {
          return params.data.statusDatePrompt;
        }
        return formatDate(params.value);
      },
      cellClass: (params) => {
        // Gray prompt for cells missing status date
        if (!params.value && params.data?.statusDatePrompt) {
          return 'cell-prompt';
        }
        return '';
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
    },
    {
      field: 'tracking1',
      headerName: 'Tracking #1',
      width: 160,
      editable: (params) => {
        // Editable if has dropdown options OR is HgbA1c status
        const hasOptions = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        return !!hasOptions || hgba1cStatuses.includes(params.data?.measureStatus || '');
      },
      cellEditorSelector: (params: ICellEditorParams<GridRow>) => {
        const options = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        if (options) {
          return {
            component: 'agSelectCellEditor',
            params: { values: options, useFormatter: false },
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
      cellClass: (params) => {
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const hasOptions = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        const isHgba1c = hgba1cStatuses.includes(params.data?.measureStatus || '');

        // Dropdown options need prompt when empty
        if (hasOptions && !params.value) {
          return 'cell-prompt';
        }
        // HgbA1c needs prompt when empty
        if (isHgba1c && !params.value) {
          return 'cell-prompt';
        }
        // Disabled (N/A) - no dropdown options and not HgbA1c
        if (!hasOptions && !isHgba1c) {
          return 'cell-disabled';
        }
        // All other cells inherit row color (no special styling)
        return '';
      },
    },
    {
      field: 'tracking2',
      headerName: 'Tracking #2',
      width: 150,
      editable: (params) => {
        // Editable for HgbA1c statuses (testing interval) and Hypertension call back (BP reading)
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const bpStatuses = ['Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal'];
        const status = params.data?.measureStatus || '';
        return hgba1cStatuses.includes(status) || bpStatuses.includes(status);
      },
      cellEditorSelector: (params: ICellEditorParams<GridRow>) => {
        // HgbA1c statuses get dropdown for testing interval
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        if (hgba1cStatuses.includes(params.data?.measureStatus || '')) {
          return {
            component: 'agSelectCellEditor',
            params: {
              values: ['1 month', '2 months', '3 months', '4 months', '5 months', '6 months', '7 months', '8 months', '9 months', '10 months', '11 months', '12 months'],
              useFormatter: false,
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
      cellClass: (params) => {
        const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
        const bpStatuses = ['Scheduled call back - BP not at goal', 'Scheduled call back - BP at goal'];
        const status = params.data?.measureStatus || '';
        const isEditable = hgba1cStatuses.includes(status) || bpStatuses.includes(status);

        // Show prompt for empty editable fields
        if (isEditable && !params.value) {
          return 'cell-prompt';
        }
        // Disabled (N/A) - not editable
        if (!isEditable) {
          return 'cell-disabled';
        }
        // All other cells inherit row color (no special styling)
        return '';
      },
    },
    {
      field: 'tracking3',
      headerName: 'Tracking #3',
      width: 150,
      editable: true, // Placeholder for future use
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      width: 120,
      editable: false, // Calculated field
      valueFormatter: (params) => formatDate(params.value),
    },
    {
      field: 'timeIntervalDays',
      headerName: 'Time Interval (Days)',
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
    },
    {
      field: 'notes',
      headerName: 'Possible Actions Needed & Notes',
      width: 300,
      flex: 1,
      editable: true,
    },
  ], [showMemberInfo]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Status arrays for row class rules
  const grayStatuses = [
    'No longer applicable',
    'Screening unnecessary',
  ];

  const purpleStatuses = [
    'Patient declined AWV',
    'Patient declined',
    'Patient declined screening',
    'Declined BP control',
    'Contraindicated',
  ];

  const greenStatuses = [
    'AWV completed',
    'Diabetic eye exam completed',
    'Colon cancer screening completed',
    'Screening test completed',
    'Screening completed',
    'GC/Clamydia screening completed',
    'Urine microalbumin completed',
    'Blood pressure at goal',
    'Lab completed',
    'Vaccination completed',
    'HgbA1c at goal',
    'Chronic diagnosis confirmed',
    'Patient on ACE/ARB',
  ];

  const blueStatuses = [
    'AWV scheduled',
    'Diabetic eye exam scheduled',
    'Diabetic eye exam referral made',
    'Colon cancer screening ordered',
    'Screening test ordered',
    'Screening appt made',
    'Test ordered',
    'Urine microalbumin ordered',
    'Appointment scheduled',
    'ACE/ARB prescribed',
    'Vaccination scheduled',
    'HgbA1c ordered',
    'Lab ordered',
    'Obtaining outside records',
    'HgbA1c NOT at goal',
    'Scheduled call back - BP not at goal',
    'Scheduled call back - BP at goal',
    'Will call later to schedule',
  ];

  const yellowStatuses = [
    'Patient called to schedule AWV',
    'Diabetic eye exam discussed',
    'Screening discussed',
    'Patient contacted for screening',
    'Vaccination discussed',
  ];

  const orangeStatuses = [
    'Chronic diagnosis resolved',
    'Chronic diagnosis invalid',
  ];

  // Helper function to check if a row is overdue (dueDate < today)
  // Applies to all statuses EXCEPT declined (purple), N/A (gray), and resolved (orange)
  // Completed (green) statuses CAN be overdue - indicates need for new annual measure
  const isRowOverdue = (data: GridRow | undefined): boolean => {
    if (!data?.dueDate) return false;

    // Don't show overdue for declined/N/A/resolved statuses
    const status = data.measureStatus || '';
    if (grayStatuses.includes(status) ||
        purpleStatuses.includes(status) ||
        orangeStatuses.includes(status)) {
      return false;
    }

    // Compare dueDate with today (using UTC to match date storage)
    const dueDate = new Date(data.dueDate);
    const today = new Date();
    // Set today to UTC midnight for accurate date comparison
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));

    return dueDateUTC < todayUTC;
  };

  // Row class rules based on Measure Status, duplicate detection, and overdue status
  // Duplicate is ADDITIVE (left stripe via CSS) - can combine with status colors
  // Priority for background: overdue > status-based colors
  const rowClassRules = useMemo(() => ({
    'row-status-duplicate': (params: RowClassParams<GridRow>) => params.data?.isDuplicate === true,
    'row-status-overdue': (params: RowClassParams<GridRow>) => isRowOverdue(params.data),
    'row-status-gray': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && grayStatuses.includes(params.data?.measureStatus || ''),
    'row-status-purple': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && purpleStatuses.includes(params.data?.measureStatus || ''),
    'row-status-green': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && greenStatuses.includes(params.data?.measureStatus || ''),
    'row-status-blue': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && blueStatuses.includes(params.data?.measureStatus || ''),
    'row-status-yellow': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && yellowStatuses.includes(params.data?.measureStatus || ''),
    'row-status-orange': (params: RowClassParams<GridRow>) => !isRowOverdue(params.data) && orangeStatuses.includes(params.data?.measureStatus || ''),
    'row-status-white': (params: RowClassParams<GridRow>) => {
      if (isRowOverdue(params.data)) return false;
      const status = params.data?.measureStatus || '';
      return !grayStatuses.includes(status) &&
             !purpleStatuses.includes(status) &&
             !greenStatuses.includes(status) &&
             !blueStatuses.includes(status) &&
             !yellowStatuses.includes(status) &&
             !orangeStatuses.includes(status);
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
        onSelectionChanged={onSelectionChanged}
        stopEditingWhenCellsLoseFocus={true}
        singleClickEdit={true}
        deltaSort={false}
        postSortRows={postSortRows}
      />
    </div>
  );
}
