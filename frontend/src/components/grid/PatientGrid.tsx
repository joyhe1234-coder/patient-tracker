import { useMemo, useCallback, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, GridReadyEvent, GridApi, SelectionChangedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { api } from '../../api/axios';

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

  // Handle cell value change - auto-save
  const onCellValueChanged = useCallback(async (event: CellValueChangedEvent<GridRow>) => {
    const { data, colDef, newValue, oldValue } = event;

    // Don't save if value hasn't changed
    if (newValue === oldValue) return;
    if (!data || !colDef.field) return;

    // Show saving status
    onSaveStatusChange?.('saving');

    try {
      const updatePayload: Record<string, unknown> = {
        [colDef.field]: newValue,
      };

      const response = await api.put(`/data/${data.id}`, updatePayload);

      if (response.data.success) {
        // Update the row with server response
        onRowUpdated?.(response.data.data);
        onSaveStatusChange?.('saved');

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
      width: 120,
      pinned: 'left',
      editable: true,
      valueFormatter: (params) => formatDate(params.value),
      valueParser: (params) => parseDate(params.newValue),
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
      width: 180,
      editable: true,
    },
    {
      field: 'measureStatus',
      headerName: 'Measure Status',
      width: 180,
      editable: true,
    },
    {
      field: 'statusDate',
      headerName: 'Status Date',
      width: 120,
      editable: true,
      valueFormatter: (params) => formatDate(params.value),
      valueParser: (params) => parseDate(params.newValue),
    },
    {
      field: 'tracking1',
      headerName: 'Tracking #1',
      width: 150,
      editable: true,
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
        onGridReady={onGridReady}
        onCellValueChanged={onCellValueChanged}
        onSelectionChanged={onSelectionChanged}
        stopEditingWhenCellsLoseFocus={true}
        singleClickEdit={false}
      />
    </div>
  );
}
