import { useMemo, useCallback, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, GridReadyEvent, GridApi, SelectionChangedEvent, ICellEditorParams, RowClassParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { api } from '../../api/axios';
import {
  REQUEST_TYPES,
  getQualityMeasuresForRequestType,
  getMeasureStatusesForQualityMeasure,
  getTracking1OptionsForStatus,
  getAutoFillQualityMeasure,
} from '../../config/dropdownConfig';

export interface GridRow {
  id: number;
  patientId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
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
}

// Date formatter for display
const formatDate = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

// DOB formatter - masked for privacy
const formatDobMasked = (value: string | null): string => {
  if (!value) return '';
  return '###';
};

// Format date for editing (YYYY-MM-DD)
const formatDateForEdit = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// Date parser for editing
const parseDate = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
};

export default function PatientGrid({
  rowData,
  onRowUpdated,
  onSaveStatusChange,
  onRowSelected
}: PatientGridProps) {
  const gridRef = useRef<AgGridReact<GridRow>>(null);
  const [gridApi, setGridApi] = useState<GridApi<GridRow> | null>(null);

  const onGridReady = useCallback((params: GridReadyEvent<GridRow>) => {
    setGridApi(params.api);
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

    // Show saving status
    onSaveStatusChange?.('saving');

    try {
      const updatePayload: Record<string, unknown> = {
        [colDef.field]: newValue,
      };

      // Handle cascading logic
      if (colDef.field === 'requestType') {
        // Auto-fill Quality Measure for AWV and Chronic DX
        const autoFillQM = getAutoFillQualityMeasure(newValue);
        if (autoFillQM) {
          updatePayload.qualityMeasure = autoFillQM;
          node.setDataValue('qualityMeasure', autoFillQM);
        } else if (newValue !== oldValue) {
          // Reset Quality Measure if Request Type changed and no auto-fill
          const validMeasures = getQualityMeasuresForRequestType(newValue);
          if (!validMeasures.includes(data.qualityMeasure)) {
            updatePayload.qualityMeasure = '';
            node.setDataValue('qualityMeasure', '');
          }
        }
        // Reset Measure Status when Request Type changes
        updatePayload.measureStatus = 'Not Addressed';
        node.setDataValue('measureStatus', 'Not Addressed');
      }

      if (colDef.field === 'qualityMeasure') {
        // Reset Measure Status when Quality Measure changes
        const validStatuses = getMeasureStatusesForQualityMeasure(newValue);
        if (!validStatuses.includes(data.measureStatus)) {
          updatePayload.measureStatus = 'Not Addressed';
          node.setDataValue('measureStatus', 'Not Addressed');
        }
      }

      if (colDef.field === 'measureStatus') {
        // Reset Tracking #1 if new status doesn't have tracking options
        const trackingOptions = getTracking1OptionsForStatus(newValue);
        if (!trackingOptions && data.tracking1) {
          // Keep tracking1 as free text if no dropdown options
        } else if (trackingOptions && data.tracking1 && !trackingOptions.includes(data.tracking1)) {
          updatePayload.tracking1 = null;
          node.setDataValue('tracking1', null);
        }
      }

      const response = await api.put(`/data/${data.id}`, updatePayload);

      if (response.data.success) {
        // Update the row with server response
        onRowUpdated?.(response.data.data);
        onSaveStatusChange?.('saved');

        // Refresh cells to update dropdown options
        gridApi.refreshCells({ rowNodes: [node], force: true });

        // Reset to idle after 2 seconds
        setTimeout(() => {
          onSaveStatusChange?.('idle');
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
      onSaveStatusChange?.('error');

      // Revert to old value
      event.node.setDataValue(colDef.field, oldValue);

      // Reset to idle after 3 seconds
      setTimeout(() => {
        onSaveStatusChange?.('idle');
      }, 3000);
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
        values: REQUEST_TYPES,
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
      pinned: 'left',
      editable: true,
      valueFormatter: (params) => formatDobMasked(params.value),
      valueGetter: (params) => {
        // Return YYYY-MM-DD format for editing
        const value = params.data?.memberDob;
        if (!value) return '';
        return formatDateForEdit(value);
      },
      valueSetter: (params) => {
        // Convert YYYY-MM-DD back to ISO
        if (!params.newValue) {
          params.data.memberDob = null;
        } else {
          const date = new Date(params.newValue);
          params.data.memberDob = isNaN(date.getTime()) ? params.oldValue : date.toISOString();
        }
        return true;
      },
    },
    {
      field: 'memberTelephone',
      headerName: 'Member Telephone',
      width: 140,
      editable: true,
      valueFormatter: (params) => formatPhone(params.value),
    },
    {
      field: 'memberAddress',
      headerName: 'Member Home Address',
      width: 220,
      editable: true,
    },
    {
      field: 'qualityMeasure',
      headerName: 'Quality Measure',
      width: 200,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: getQualityMeasuresForRequestType(params.data?.requestType || ''),
      }),
    },
    {
      field: 'measureStatus',
      headerName: 'Measure Status',
      width: 220,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: (params: ICellEditorParams<GridRow>) => ({
        values: getMeasureStatusesForQualityMeasure(params.data?.qualityMeasure || ''),
      }),
    },
    {
      field: 'statusDate',
      headerName: 'Status Date',
      width: 120,
      editable: true,
      valueFormatter: (params) => formatDate(params.value),
      valueGetter: (params) => {
        const value = params.data?.statusDate;
        if (!value) return '';
        return formatDateForEdit(value);
      },
      valueSetter: (params) => {
        if (!params.newValue) {
          params.data.statusDate = null;
        } else {
          const date = new Date(params.newValue);
          params.data.statusDate = isNaN(date.getTime()) ? params.oldValue : date.toISOString();
        }
        return true;
      },
    },
    {
      field: 'tracking1',
      headerName: 'Tracking #1',
      width: 160,
      editable: true,
      cellEditor: (params: ICellEditorParams<GridRow>) => {
        const options = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        return options ? 'agSelectCellEditor' : 'agTextCellEditor';
      },
      cellEditorParams: (params: ICellEditorParams<GridRow>) => {
        const options = getTracking1OptionsForStatus(params.data?.measureStatus || '');
        return options ? { values: options } : {};
      },
    },
    {
      field: 'tracking2',
      headerName: 'Tracking #2',
      width: 150,
      editable: true,
    },
    {
      field: 'tracking3',
      headerName: 'Tracking #3',
      width: 150,
      editable: true,
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
      editable: false, // Calculated field
    },
    {
      field: 'notes',
      headerName: 'Possible Actions Needed & Notes',
      width: 300,
      flex: 1,
      editable: true,
    },
  ], []);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Row styling based on Measure Status (from Excel conditional formatting)
  const getRowStyle = useCallback((params: RowClassParams<GridRow>) => {
    const status = params.data?.measureStatus || '';

    // Priority 1: No longer applicable / Screening unnecessary (Gray)
    if (status === 'No longer applicable' ||
        status === 'Screening unnecessary' ||
        status === 'Vaccination unnecessary') {
      return { backgroundColor: '#E9EBF3' }; // Light gray
    }

    // Priority 2: Declined / Contraindicated (Light purple)
    if (status.toLowerCase().includes('declined') ||
        status.toLowerCase().includes('contraindicated')) {
      return { backgroundColor: '#E5D9F2' }; // Light purple
    }

    // Priority 3: Completed / At Goal statuses (Light green)
    if (status.toLowerCase().includes('completed') ||
        status.toLowerCase().includes('at goal') ||
        status === 'Chronic diagnosis coded' ||
        status === 'Patient currently on ACE/ARB' ||
        status === 'Blood pressure at goal') {
      return { backgroundColor: '#D4EDDA' }; // Light green
    }

    // Priority 4: Scheduled / Ordered / In Progress (Light blue)
    if (status.toLowerCase().includes('scheduled') ||
        status.toLowerCase().includes('ordered') ||
        status.toLowerCase().includes('referral made') ||
        status === 'Obtaining outside records' ||
        status === 'Will call later to schedule' ||
        status === 'HgbA1c NOT at goal' ||
        status === 'Test ordered' ||
        status === 'Appointment scheduled') {
      return { backgroundColor: '#CCE5FF' }; // Light blue
    }

    // Priority 5: Initial contact / Discussed (Pale yellow)
    if (status.toLowerCase().includes('called to schedule') ||
        status.toLowerCase().includes('discussed') ||
        status.toLowerCase().includes('contacted for')) {
      return { backgroundColor: '#FFF9E6' }; // Pale yellow
    }

    // Priority 6: Chronic diagnosis resolved/invalid (Light orange)
    if (status === 'Chronic diagnosis resolved' ||
        status === 'Chronic diagnosis invalid') {
      return { backgroundColor: '#FFE8CC' }; // Light orange
    }

    // Default: No special coloring
    return undefined;
  }, []);

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
        getRowStyle={getRowStyle}
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onSelectionChanged={onSelectionChanged}
        stopEditingWhenCellsLoseFocus={true}
        singleClickEdit={false}
      />
    </div>
  );
}
