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

// Statuses that use dropdown/range for interval (NOT editable)
const DROPDOWN_INTERVAL_STATUSES = [
  // Cervical Cancer - uses "In X Months" dropdown
  'Screening discussed',
  // HgbA1c - uses tracking2 month dropdown
  'HgbA1c at goal',
  'HgbA1c NOT at goal',
  // Colon Cancer - uses test type dropdown
  'Colon cancer screening ordered',
  // Breast Cancer - uses test type dropdown
  'Screening test ordered',
  // Hypertension - uses "Call every X wks" dropdown
  'Scheduled call back - BP not at goal',
  'Scheduled call back - BP at goal',
  // Chronic DX - uses attestation dropdown
  'Chronic diagnosis resolved',
  'Chronic diagnosis invalid',
];

// Helper function to determine if time interval is editable
// Editable when: has status date + has baseDueDays default (not dropdown-based)
const isTimeIntervalEditable = (data: GridRow | undefined): boolean => {
  if (!data) return false;

  // No status date = no due date calculation possible
  if (!data.statusDate) return false;

  // No time interval calculated = status has no baseDueDays
  if (data.timeIntervalDays === null || data.timeIntervalDays === undefined) return false;

  const status = data.measureStatus || '';

  // Statuses that use dropdown for interval are NOT editable
  if (DROPDOWN_INTERVAL_STATUSES.includes(status)) {
    return false;
  }

  // Otherwise, time interval is editable (uses baseDueDays default)
  return true;
};

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
  showMemberInfo = false
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

    // Store the row ID to preserve selection after update
    const rowId = data.id;

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
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      const errorMessage = axiosError?.response?.data?.error?.message || 'Failed to save changes.';
      alert(errorMessage);

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
        const hasOptions = getTracking1OptionsForStatus(params.data.measureStatus || '');
        const isHgba1c = hgba1cStatuses.includes(params.data.measureStatus || '');

        // If cell has dropdown options, return the value as-is (don't format)
        if (hasOptions) {
          return params.value || '';
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
  // Only applies to pending statuses (blue, yellow, white) - not completed/declined/resolved
  const isRowOverdue = (data: GridRow | undefined): boolean => {
    if (!data?.dueDate) return false;

    // Don't show overdue for completed/declined/resolved statuses
    const status = data.measureStatus || '';
    if (grayStatuses.includes(status) ||
        purpleStatuses.includes(status) ||
        greenStatuses.includes(status) ||
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
  // Priority: duplicate > overdue > status-based colors
  const rowClassRules = useMemo(() => ({
    'row-status-duplicate': (params: RowClassParams<GridRow>) => params.data?.isDuplicate === true,
    'row-status-overdue': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && isRowOverdue(params.data),
    'row-status-gray': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && grayStatuses.includes(params.data?.measureStatus || ''),
    'row-status-purple': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && purpleStatuses.includes(params.data?.measureStatus || ''),
    'row-status-green': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && greenStatuses.includes(params.data?.measureStatus || ''),
    'row-status-blue': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && blueStatuses.includes(params.data?.measureStatus || ''),
    'row-status-yellow': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && yellowStatuses.includes(params.data?.measureStatus || ''),
    'row-status-orange': (params: RowClassParams<GridRow>) => !params.data?.isDuplicate && !isRowOverdue(params.data) && orangeStatuses.includes(params.data?.measureStatus || ''),
    'row-status-white': (params: RowClassParams<GridRow>) => {
      if (params.data?.isDuplicate) return false;
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
      />
    </div>
  );
}
