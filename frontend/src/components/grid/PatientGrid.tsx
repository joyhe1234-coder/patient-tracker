import { useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, CellValueChangedEvent, GridReadyEvent, SelectionChangedEvent, ICellEditorParams, RowClassParams } from 'ag-grid-community';
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
  showMemberInfo?: boolean;
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

// Format date for editing (MM/DD/YYYY)
const formatDateForEdit = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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

// Parse date with MM/DD/YYYY format validation
const parseAndValidateDate = (input: string): Date | null => {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();

  // Only accept MM/DD/YYYY format
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
};

// Show date format error
const showDateFormatError = () => {
  alert('Invalid date format.\n\nAccepted format: MM/DD/YYYY (e.g., 01/09/2026)');
};

export default function PatientGrid({
  rowData,
  onRowUpdated,
  onSaveStatusChange,
  onRowSelected,
  showMemberInfo = true
}: PatientGridProps) {
  const gridRef = useRef<AgGridReact<GridRow>>(null);

  const onGridReady = useCallback((_params: GridReadyEvent<GridRow>) => {
    // Grid is ready, can access API via gridRef.current.api if needed
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
      // Use the processed value from data object for fields with valueSetters
      // This ensures we send the transformed value (e.g., ISO date string) not raw input
      const processedValue = data[colDef.field as keyof GridRow];
      const updatePayload: Record<string, unknown> = {
        [colDef.field]: processedValue,
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
        // Update the row data in the grid using transaction API
        // This properly updates the grid's internal state and triggers getRowStyle
        gridApi.applyTransaction({ update: [response.data.data] });

        // Update the row with server response (for React state)
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
        const date = parseAndValidateDate(params.newValue);
        if (!date) {
          showDateFormatError();
          return false;
        }
        params.data.memberDob = date.toISOString();
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
      width: 140,
      editable: true,
      valueFormatter: (params) => {
        // Show prompt text if no date and prompt exists
        if (!params.value && params.data?.statusDatePrompt) {
          return params.data.statusDatePrompt;
        }
        return formatDate(params.value);
      },
      cellStyle: (params) => {
        // Dark gray background for cells missing status date
        if (!params.value && params.data?.statusDatePrompt) {
          return {
            backgroundColor: '#6B7280', // Dark gray background
            color: '#FFFFFF', // White text
            fontStyle: 'italic'
          };
        }
        // Reset to default styling when value is present
        return {
          backgroundColor: 'transparent',
          color: 'inherit',
          fontStyle: 'normal'
        };
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
        const date = parseAndValidateDate(params.newValue);
        if (!date) {
          showDateFormatError();
          return false; // Reject the change
        }
        params.data.statusDate = date.toISOString();
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
  ], [showMemberInfo]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Row styling based on Measure Status and duplicate detection
  const getRowStyle = useCallback((params: RowClassParams<GridRow>) => {
    const status = params.data?.measureStatus || '';
    const isDuplicate = params.data?.isDuplicate || false;

    // Priority 0: Duplicate rows (highest priority)
    if (isDuplicate) {
      return { backgroundColor: '#FEF3C7' }; // Light yellow for duplicates
    }

    // Color mapping based on status categories
    // Gray (#E9EBF3): No longer applicable, Screening unnecessary
    const grayStatuses = [
      'No longer applicable',
      'Screening unnecessary',
    ];

    // Light Purple (#E5D9F2): Declined, Contraindicated
    const purpleStatuses = [
      'Patient declined AWV',
      'Patient declined',
      'Patient declined screening',
      'Declined BP control',
      'Contraindicated',
    ];

    // Light Green (#D4EDDA): Completed, At Goal
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

    // Light Blue (#CCE5FF): Scheduled, Ordered, In Progress
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

    // Pale Yellow (#FFF9E6): Called to schedule, Discussed, Contacted
    const yellowStatuses = [
      'Patient called to schedule AWV',
      'Diabetic eye exam discussed',
      'Screening discussed',
      'Patient contacted for screening',
      'Vaccination discussed',
    ];

    // Light Orange (#FFE8CC): Chronic diagnosis resolved/invalid
    const orangeStatuses = [
      'Chronic diagnosis resolved',
      'Chronic diagnosis invalid',
    ];

    if (grayStatuses.includes(status)) {
      return { backgroundColor: '#E9EBF3' };
    }
    if (purpleStatuses.includes(status)) {
      return { backgroundColor: '#E5D9F2' };
    }
    if (greenStatuses.includes(status)) {
      return { backgroundColor: '#D4EDDA' };
    }
    if (blueStatuses.includes(status)) {
      return { backgroundColor: '#CCE5FF' };
    }
    if (yellowStatuses.includes(status)) {
      return { backgroundColor: '#FFF9E6' };
    }
    if (orangeStatuses.includes(status)) {
      return { backgroundColor: '#FFE8CC' };
    }

    // Default: White (no special coloring)
    return { backgroundColor: '#FFFFFF' };
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
