import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Track the props passed to AgGridReact
let capturedGridProps: Record<string, unknown> = {};

// Mock ag-grid-react to capture all props and render a testable placeholder
vi.mock('ag-grid-react', () => ({
  AgGridReact: vi.fn((props: Record<string, unknown>) => {
    capturedGridProps = props;
    const rowData = props.rowData as unknown[] | undefined;
    const columnDefs = props.columnDefs as unknown[] | undefined;
    return (
      <div data-testid="ag-grid-mock">
        <span data-testid="row-count">{rowData?.length || 0}</span>
        <span data-testid="col-count">{columnDefs?.length || 0}</span>
      </div>
    );
  }),
}));

// Mock ag-grid-community styles (no-op)
vi.mock('ag-grid-community/styles/ag-grid.css', () => ({}));
vi.mock('ag-grid-community/styles/ag-theme-alpine.css', () => ({}));

// Mock API
vi.mock('../../api/axios', () => ({
  api: { put: vi.fn(), get: vi.fn(), post: vi.fn() },
}));

// Mock auth store
const mockUseAuthStore = vi.fn(() => ({
  user: { id: 1, email: 'admin@test.com', displayName: 'Admin', roles: ['ADMIN'], isActive: true, lastLoginAt: null },
  selectedPhysicianId: 1,
}));

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (...args: unknown[]) => mockUseAuthStore(...args),
}));

// Mock dropdownConfig with minimal exports
vi.mock('../../config/dropdownConfig', () => ({
  REQUEST_TYPES: ['AWV', 'Chronic DX', 'Quality', 'Screening'],
  getQualityMeasuresForRequestType: vi.fn(() => []),
  getMeasureStatusesForQualityMeasure: vi.fn(() => []),
  getTracking1OptionsForStatus: vi.fn(() => null),
  getAutoFillQualityMeasure: vi.fn(() => null),
}));

// Import the component after mocks are set up
import PatientGrid, { GridRow } from './PatientGrid';

// Helper to create a mock GridRow
const createMockRow = (overrides: Partial<GridRow> = {}): GridRow => ({
  id: 1,
  patientId: 100,
  memberName: 'John Doe',
  memberDob: '1980-01-15T12:00:00.000Z',
  memberTelephone: '5551234567',
  memberAddress: '123 Main St',
  requestType: 'AWV',
  qualityMeasure: 'Annual Wellness Visit',
  measureStatus: 'Not Addressed',
  statusDate: null,
  statusDatePrompt: null,
  tracking1: null,
  tracking2: null,
  tracking3: null,
  dueDate: null,
  timeIntervalDays: null,
  notes: null,
  rowOrder: 1,
  isDuplicate: false,
  ...overrides,
});

describe('PatientGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedGridProps = {};
    mockUseAuthStore.mockReturnValue({
      user: { id: 1, email: 'admin@test.com', displayName: 'Admin', roles: ['ADMIN'], isActive: true, lastLoginAt: null },
      selectedPhysicianId: 1,
    });
  });

  describe('Rendering', () => {
    it('renders AG Grid with provided rowData', () => {
      const rows = [createMockRow({ id: 1 }), createMockRow({ id: 2, memberName: 'Jane Smith' })];
      render(<PatientGrid rowData={rows} />);

      expect(screen.getByTestId('ag-grid-mock')).toBeInTheDocument();
      expect(screen.getByTestId('row-count')).toHaveTextContent('2');
    });

    it('renders AG Grid with empty rowData', () => {
      render(<PatientGrid rowData={[]} />);

      expect(screen.getByTestId('ag-grid-mock')).toBeInTheDocument();
      expect(screen.getByTestId('row-count')).toHaveTextContent('0');
    });

    it('renders inside an ag-theme-alpine container', () => {
      render(<PatientGrid rowData={[]} />);

      const container = screen.getByTestId('ag-grid-mock').parentElement;
      expect(container?.className).toContain('ag-theme-alpine');
    });
  });

  describe('Column Definitions', () => {
    it('passes correct number of column definitions', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field?: string; headerName?: string }[];
      // Expected columns: # (row number) + requestType, memberName, memberDob, memberTelephone, memberAddress,
      // qualityMeasure, measureStatus, statusDate, tracking1, tracking2, tracking3,
      // dueDate, timeIntervalDays, notes = 15 columns
      expect(columnDefs).toHaveLength(15);
    });

    it('includes all expected column fields', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string }[];
      const fields = columnDefs.map((col) => col.field);

      expect(fields).toContain('requestType');
      expect(fields).toContain('memberName');
      expect(fields).toContain('memberDob');
      expect(fields).toContain('memberTelephone');
      expect(fields).toContain('memberAddress');
      expect(fields).toContain('qualityMeasure');
      expect(fields).toContain('measureStatus');
      expect(fields).toContain('statusDate');
      expect(fields).toContain('tracking1');
      expect(fields).toContain('tracking2');
      expect(fields).toContain('tracking3');
      expect(fields).toContain('dueDate');
      expect(fields).toContain('timeIntervalDays');
      expect(fields).toContain('notes');
    });

    it('has row number column as first column', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field?: string; headerName?: string; editable?: boolean; sortable?: boolean; pinned?: string }[];
      const firstCol = columnDefs[0];

      expect(firstCol.headerName).toBe('#');
      expect(firstCol.editable).toBe(false);
      expect(firstCol.sortable).toBe(false);
      expect(firstCol.pinned).toBe('left');
      expect(firstCol.field).toBeUndefined();
    });

    it('row number column has valueGetter that returns row index + 1', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { valueGetter?: (params: { node: { rowIndex: number } | null }) => number | string }[];
      const firstCol = columnDefs[0];

      expect(firstCol.valueGetter).toBeDefined();
      expect(firstCol.valueGetter!({ node: { rowIndex: 0 } })).toBe(1);
      expect(firstCol.valueGetter!({ node: { rowIndex: 4 } })).toBe(5);
      expect(firstCol.valueGetter!({ node: null })).toBe('');
    });

    it('has requestType and memberName pinned to the left', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; pinned?: string }[];
      const requestTypeCol = columnDefs.find((col) => col.field === 'requestType');
      const memberNameCol = columnDefs.find((col) => col.field === 'memberName');

      expect(requestTypeCol?.pinned).toBe('left');
      expect(memberNameCol?.pinned).toBe('left');
    });

    it('requestType uses agSelectCellEditor', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; cellEditor?: string }[];
      const requestTypeCol = columnDefs.find((col) => col.field === 'requestType');

      expect(requestTypeCol?.cellEditor).toBe('agSelectCellEditor');
    });

    it('qualityMeasure uses agSelectCellEditor', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; cellEditor?: string }[];
      const qualityMeasureCol = columnDefs.find((col) => col.field === 'qualityMeasure');

      expect(qualityMeasureCol?.cellEditor).toBe('agSelectCellEditor');
    });

    it('measureStatus uses agSelectCellEditor', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; cellEditor?: string }[];
      const measureStatusCol = columnDefs.find((col) => col.field === 'measureStatus');

      expect(measureStatusCol?.cellEditor).toBe('agSelectCellEditor');
    });

    it('dueDate column is NOT editable (calculated field)', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; editable: boolean | ((...args: unknown[]) => boolean) }[];
      const dueDateCol = columnDefs.find((col) => col.field === 'dueDate');

      expect(dueDateCol?.editable).toBe(false);
    });

    it('notes column IS always editable', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; editable: boolean | ((...args: unknown[]) => boolean) }[];
      const notesCol = columnDefs.find((col) => col.field === 'notes');

      expect(notesCol?.editable).toBe(true);
    });

    it('memberName column is editable', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; editable: boolean | ((...args: unknown[]) => boolean) }[];
      const memberNameCol = columnDefs.find((col) => col.field === 'memberName');

      expect(memberNameCol?.editable).toBe(true);
    });

    it('notes column has flex=1 to fill remaining space', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; flex?: number }[];
      const notesCol = columnDefs.find((col) => col.field === 'notes');

      expect(notesCol?.flex).toBe(1);
    });
  });

  describe('Member Info Columns', () => {
    it('hides member info columns when showMemberInfo is false (default)', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; hide?: boolean }[];
      const dobCol = columnDefs.find((col) => col.field === 'memberDob');
      const phoneCol = columnDefs.find((col) => col.field === 'memberTelephone');
      const addressCol = columnDefs.find((col) => col.field === 'memberAddress');

      expect(dobCol?.hide).toBe(true);
      expect(phoneCol?.hide).toBe(true);
      expect(addressCol?.hide).toBe(true);
    });

    it('shows member info columns when showMemberInfo is true', () => {
      render(<PatientGrid rowData={[]} showMemberInfo={true} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; hide?: boolean }[];
      const dobCol = columnDefs.find((col) => col.field === 'memberDob');
      const phoneCol = columnDefs.find((col) => col.field === 'memberTelephone');
      const addressCol = columnDefs.find((col) => col.field === 'memberAddress');

      expect(dobCol?.hide).toBe(false);
      expect(phoneCol?.hide).toBe(false);
      expect(addressCol?.hide).toBe(false);
    });

    it('does NOT hide requestType or qualityMeasure regardless of showMemberInfo', () => {
      render(<PatientGrid rowData={[]} showMemberInfo={false} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; hide?: boolean }[];
      const requestTypeCol = columnDefs.find((col) => col.field === 'requestType');
      const qualityMeasureCol = columnDefs.find((col) => col.field === 'qualityMeasure');

      expect(requestTypeCol?.hide).toBeUndefined();
      expect(qualityMeasureCol?.hide).toBeUndefined();
    });
  });

  describe('Grid Configuration', () => {
    it('has single row selection mode', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.rowSelection).toBe('single');
    });

    it('passes onSelectionChanged callback', () => {
      const onRowSelected = vi.fn();
      render(<PatientGrid rowData={[]} onRowSelected={onRowSelected} />);

      expect(capturedGridProps.onSelectionChanged).toBeDefined();
      expect(typeof capturedGridProps.onSelectionChanged).toBe('function');
    });

    it('uses double-click edit (not single-click)', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.singleClickEdit).toBe(false);
    });

    it('enables stop editing when cells lose focus', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.stopEditingWhenCellsLoseFocus).toBe(true);
    });

    it('enables row animation', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.animateRows).toBe(true);
    });

    it('does not suppress row click selection', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.suppressRowClickSelection).toBe(false);
    });

    it('provides a getRowId function', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.getRowId).toBeDefined();
      expect(typeof capturedGridProps.getRowId).toBe('function');
    });

    it('getRowId returns string version of data.id', () => {
      render(<PatientGrid rowData={[]} />);

      const getRowId = capturedGridProps.getRowId as (params: { data: { id: number } }) => string;
      expect(getRowId({ data: { id: 42 } })).toBe('42');
      expect(getRowId({ data: { id: 1 } })).toBe('1');
    });

    it('provides rowClassRules for status-based coloring', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, unknown>;
      expect(rowClassRules).toBeDefined();
      expect(rowClassRules['row-status-green']).toBeDefined();
      expect(rowClassRules['row-status-blue']).toBeDefined();
      expect(rowClassRules['row-status-yellow']).toBeDefined();
      expect(rowClassRules['row-status-gray']).toBeDefined();
      expect(rowClassRules['row-status-purple']).toBeDefined();
      expect(rowClassRules['row-status-orange']).toBeDefined();
      expect(rowClassRules['row-status-white']).toBeDefined();
      expect(rowClassRules['row-status-overdue']).toBeDefined();
      expect(rowClassRules['row-status-duplicate']).toBeDefined();
    });

    it('provides default column definitions with sortable, filter, and resizable', () => {
      render(<PatientGrid rowData={[]} />);

      const defaultColDef = capturedGridProps.defaultColDef as { sortable: boolean; filter: boolean; resizable: boolean };
      expect(defaultColDef.sortable).toBe(true);
      expect(defaultColDef.filter).toBe(true);
      expect(defaultColDef.resizable).toBe(true);
    });

    it('disables deltaSort', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.deltaSort).toBe(false);
    });
  });

  describe('Row Class Rules Logic', () => {
    // Test the row class rule functions directly through captured props
    it('marks duplicate rows with row-status-duplicate', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const duplicateRule = rowClassRules['row-status-duplicate'];

      expect(duplicateRule({ data: { isDuplicate: true } })).toBe(true);
      expect(duplicateRule({ data: { isDuplicate: false } })).toBe(false);
      expect(duplicateRule({ data: undefined })).toBe(false);
    });

    it('applies green status for completed measure statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const greenRule = rowClassRules['row-status-green'];

      expect(greenRule({ data: { measureStatus: 'AWV completed' } })).toBe(true);
      expect(greenRule({ data: { measureStatus: 'Screening completed' } })).toBe(true);
      expect(greenRule({ data: { measureStatus: 'Blood pressure at goal' } })).toBe(true);
      expect(greenRule({ data: { measureStatus: 'HgbA1c at goal' } })).toBe(true);
    });

    it('applies blue status for in-progress measure statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const blueRule = rowClassRules['row-status-blue'];

      expect(blueRule({ data: { measureStatus: 'AWV scheduled' } })).toBe(true);
      expect(blueRule({ data: { measureStatus: 'HgbA1c ordered' } })).toBe(true);
    });

    it('applies gray status for not-applicable statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const grayRule = rowClassRules['row-status-gray'];

      expect(grayRule({ data: { measureStatus: 'No longer applicable' } })).toBe(true);
      expect(grayRule({ data: { measureStatus: 'Screening unnecessary' } })).toBe(true);
    });

    it('applies purple status for declined statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const purpleRule = rowClassRules['row-status-purple'];

      expect(purpleRule({ data: { measureStatus: 'Patient declined AWV' } })).toBe(true);
      expect(purpleRule({ data: { measureStatus: 'Patient declined' } })).toBe(true);
      expect(purpleRule({ data: { measureStatus: 'Contraindicated' } })).toBe(true);
    });

    it('applies yellow status for discussion statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const yellowRule = rowClassRules['row-status-yellow'];

      expect(yellowRule({ data: { measureStatus: 'Screening discussed' } })).toBe(true);
      expect(yellowRule({ data: { measureStatus: 'Patient called to schedule AWV' } })).toBe(true);
    });

    it('applies orange status for chronic diagnosis resolved/invalid', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const orangeRule = rowClassRules['row-status-orange'];

      expect(orangeRule({ data: { measureStatus: 'Chronic diagnosis resolved' } })).toBe(true);
      expect(orangeRule({ data: { measureStatus: 'Chronic diagnosis invalid' } })).toBe(true);
    });

    it('applies white status for unknown/unmatched statuses', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const whiteRule = rowClassRules['row-status-white'];

      expect(whiteRule({ data: { measureStatus: 'Not Addressed' } })).toBe(true);
      expect(whiteRule({ data: { measureStatus: null } })).toBe(true);
      expect(whiteRule({ data: { measureStatus: '' } })).toBe(true);
    });

    it('does not apply status color when row is overdue (overdue takes priority)', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const greenRule = rowClassRules['row-status-green'];
      const overdueRule = rowClassRules['row-status-overdue'];

      // A completed row with an overdue due date (past date)
      const overdueCompletedRow: Partial<GridRow> = {
        measureStatus: 'AWV completed',
        dueDate: '2020-01-01T12:00:00.000Z', // Past date
      };

      // Overdue should be true for completed statuses with past due dates
      expect(overdueRule({ data: overdueCompletedRow })).toBe(true);
      // Green should be false when overdue
      expect(greenRule({ data: overdueCompletedRow })).toBe(false);
    });

    it('does NOT mark declined (purple) statuses as overdue even with past due date', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const overdueRule = rowClassRules['row-status-overdue'];
      const purpleRule = rowClassRules['row-status-purple'];

      const declinedRow: Partial<GridRow> = {
        measureStatus: 'Patient declined AWV',
        dueDate: '2020-01-01T12:00:00.000Z',
      };

      expect(overdueRule({ data: declinedRow })).toBe(false);
      expect(purpleRule({ data: declinedRow })).toBe(true);
    });

    it('does NOT mark gray (N/A) statuses as overdue even with past due date', () => {
      render(<PatientGrid rowData={[]} />);

      const rowClassRules = capturedGridProps.rowClassRules as Record<string, (params: { data?: Partial<GridRow> }) => boolean>;
      const overdueRule = rowClassRules['row-status-overdue'];

      const naRow: Partial<GridRow> = {
        measureStatus: 'No longer applicable',
        dueDate: '2020-01-01T12:00:00.000Z',
      };

      expect(overdueRule({ data: naRow })).toBe(false);
    });
  });

  describe('Prop Passing', () => {
    it('passes rowData to AgGridReact', () => {
      const rows = [createMockRow({ id: 1 }), createMockRow({ id: 2 })];
      render(<PatientGrid rowData={rows} />);

      expect(capturedGridProps.rowData).toBe(rows);
      expect(capturedGridProps.rowData).toHaveLength(2);
    });

    it('provides onCellValueChanged handler', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.onCellValueChanged).toBeDefined();
      expect(typeof capturedGridProps.onCellValueChanged).toBe('function');
    });

    it('provides postSortRows callback', () => {
      render(<PatientGrid rowData={[]} />);

      expect(capturedGridProps.postSortRows).toBeDefined();
      expect(typeof capturedGridProps.postSortRows).toBe('function');
    });
  });

  describe('Column Header Names', () => {
    it('uses correct header names for all columns', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field: string; headerName: string }[];
      const headerMap = Object.fromEntries(columnDefs.map((col) => [col.field, col.headerName]));

      expect(headerMap['requestType']).toBe('Request Type');
      expect(headerMap['memberName']).toBe('Member Name');
      expect(headerMap['memberDob']).toBe('Member DOB');
      expect(headerMap['memberTelephone']).toBe('Member Telephone');
      expect(headerMap['memberAddress']).toBe('Member Home Address');
      expect(headerMap['qualityMeasure']).toBe('Quality Measure');
      expect(headerMap['measureStatus']).toBe('Measure Status');
      expect(headerMap['statusDate']).toBe('Status Date');
      expect(headerMap['tracking1']).toBe('Tracking #1');
      expect(headerMap['tracking2']).toBe('Tracking #2');
      expect(headerMap['tracking3']).toBe('Tracking #3');
      expect(headerMap['dueDate']).toBe('Due Date');
      expect(headerMap['timeIntervalDays']).toBe('Time Interval (Days)');
      expect(headerMap['notes']).toBe('Possible Actions Needed & Notes');
    });

    it('all columns have headerTooltip set', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field?: string; headerName?: string; headerTooltip?: string }[];
      // All columns (including row number) should have headerTooltip
      columnDefs.forEach((col) => {
        expect(col.headerTooltip).toBeDefined();
        expect(col.headerTooltip!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DOB Column', () => {
    it('has cellRenderer that wraps masked value with aria-label', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field?: string; cellRenderer?: (params: { value: string | null }) => string }[];
      const dobCol = columnDefs.find((col) => col.field === 'memberDob');

      expect(dobCol?.cellRenderer).toBeDefined();

      const result = dobCol!.cellRenderer!({ value: '2000-01-15' });
      expect(result).toContain('aria-label="Date of birth hidden for privacy"');
      expect(result).toContain('###');
    });

    it('DOB cellRenderer returns empty string for null value', () => {
      render(<PatientGrid rowData={[]} />);

      const columnDefs = capturedGridProps.columnDefs as { field?: string; cellRenderer?: (params: { value: string | null }) => string }[];
      const dobCol = columnDefs.find((col) => col.field === 'memberDob');

      expect(dobCol!.cellRenderer!({ value: null })).toBe('');
    });
  });
});
