/**
 * Typed AG Grid mock factories for unit tests.
 *
 * Replaces `as any` casts with factory functions that return properly typed
 * objects with sensible defaults. Each factory accepts `Partial<T>` overrides
 * so tests only specify the fields they care about.
 *
 * Usage:
 *   import { createCellEditorParams } from '../../test-utils/agGridMocks';
 *   const params = createCellEditorParams({ value: 'test', stopEditing: vi.fn() });
 */

import { vi } from 'vitest';
import type {
  GridApi,
  IRowNode,
  Column,
  ColDef,
  ICellEditorParams,
  ICellRendererParams,
  ValueFormatterParams,
  ValueGetterParams,
  ValueSetterParams,
  CellValueChangedEvent,
  RowPinnedType,
} from 'ag-grid-community';

// ---------------------------------------------------------------------------
// Low-level mock builders
// ---------------------------------------------------------------------------

/**
 * Creates a mock GridApi with vi.fn() stubs for common methods.
 * Override any method via the `overrides` parameter.
 */
export function createMockGridApi<TData = any>(
  overrides: Partial<GridApi<TData>> = {},
): GridApi<TData> {
  return {
    getColumnState: vi.fn(() => []),
    applyColumnState: vi.fn(),
    forEachNodeAfterFilterAndSort: vi.fn(),
    refreshCells: vi.fn(),
    applyTransaction: vi.fn(),
    getSelectedRows: vi.fn(() => []),
    getSelectedNodes: vi.fn(() => []),
    deselectAll: vi.fn(),
    setRowData: vi.fn(),
    setColumnDefs: vi.fn(),
    sizeColumnsToFit: vi.fn(),
    ...overrides,
  } as unknown as GridApi<TData>;
}

/**
 * Creates a mock IRowNode with vi.fn() stubs.
 */
export function createMockRowNode<TData = any>(
  overrides: Partial<IRowNode<TData>> = {},
): IRowNode<TData> {
  return {
    setData: vi.fn(),
    setDataValue: vi.fn(),
    setSelected: vi.fn(),
    rowIndex: 0,
    id: '1',
    data: {} as TData,
    ...overrides,
  } as unknown as IRowNode<TData>;
}

/**
 * Creates a mock Column object.
 */
export function createMockColumn<TValue = any>(
  overrides: Partial<Column<TValue>> = {},
): Column<TValue> {
  return {
    getColId: vi.fn(() => 'mockCol'),
    getColDef: vi.fn(() => ({})),
    ...overrides,
  } as unknown as Column<TValue>;
}

// ---------------------------------------------------------------------------
// ICellEditorParams factory
// ---------------------------------------------------------------------------

/**
 * Creates typed ICellEditorParams with sensible defaults.
 * All AG Grid interface fields are populated so tests do not need `as any`.
 */
export function createCellEditorParams<TData = any, TValue = any>(
  overrides: Partial<ICellEditorParams<TData, TValue>> & Record<string, unknown> = {},
): ICellEditorParams<TData, TValue> {
  const {
    api,
    column,
    colDef,
    node,
    data,
    ...rest
  } = overrides;

  return {
    value: undefined as TValue | null | undefined,
    eventKey: null,
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    node: node ?? createMockRowNode<TData>(),
    data: data ?? ({} as TData),
    rowIndex: 0,
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    context: undefined,
    cellStartedEdit: true,
    onKeyDown: vi.fn(),
    stopEditing: vi.fn(),
    eGridCell: document.createElement('div'),
    parseValue: vi.fn(),
    formatValue: vi.fn(),
    ...rest,
  } as ICellEditorParams<TData, TValue>;
}

// ---------------------------------------------------------------------------
// ICellRendererParams factory
// ---------------------------------------------------------------------------

/**
 * Creates typed ICellRendererParams with sensible defaults.
 */
export function createCellRendererParams<TData = any, TValue = any>(
  overrides: Partial<ICellRendererParams<TData, TValue>> & Record<string, unknown> = {},
): ICellRendererParams<TData, TValue> {
  const {
    api,
    column,
    colDef,
    node,
    data,
    ...rest
  } = overrides;

  return {
    value: undefined as TValue | null | undefined,
    valueFormatted: null,
    data: data ?? ({} as TData),
    node: node ?? createMockRowNode<TData>(),
    rowIndex: 0,
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    context: undefined,
    eGridCell: document.createElement('div'),
    eParentOfValue: document.createElement('div'),
    getValue: vi.fn(),
    setValue: vi.fn(),
    formatValue: vi.fn(),
    refreshCell: vi.fn(),
    registerRowDragger: vi.fn(),
    setTooltip: vi.fn(),
    ...rest,
  } as ICellRendererParams<TData, TValue>;
}

// ---------------------------------------------------------------------------
// ValueFormatterParams factory
// ---------------------------------------------------------------------------

/**
 * Creates typed ValueFormatterParams with sensible defaults.
 */
export function createValueFormatterParams<TData = any, TValue = any>(
  overrides: Partial<ValueFormatterParams<TData, TValue>> & Record<string, unknown> = {},
): ValueFormatterParams<TData, TValue> {
  const { api, column, colDef, node, data, ...rest } = overrides;

  return {
    value: undefined as TValue | null | undefined,
    data: data ?? ({} as TData),
    node: node ?? createMockRowNode<TData>(),
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    context: undefined,
    ...rest,
  } as ValueFormatterParams<TData, TValue>;
}

// ---------------------------------------------------------------------------
// ValueGetterParams factory
// ---------------------------------------------------------------------------

/**
 * Creates typed ValueGetterParams with sensible defaults.
 */
export function createValueGetterParams<TData = any, TValue = any>(
  overrides: Partial<ValueGetterParams<TData, TValue>> & Record<string, unknown> = {},
): ValueGetterParams<TData, TValue> {
  const { api, column, colDef, node, data, ...rest } = overrides;

  return {
    data: data ?? ({} as TData),
    node: node ?? createMockRowNode<TData>(),
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    context: undefined,
    getValue: vi.fn(),
    ...rest,
  } as ValueGetterParams<TData, TValue>;
}

// ---------------------------------------------------------------------------
// ValueSetterParams factory
// ---------------------------------------------------------------------------

/**
 * Creates typed ValueSetterParams with sensible defaults.
 */
export function createValueSetterParams<TData = any, TValue = any>(
  overrides: Partial<ValueSetterParams<TData, TValue>> & Record<string, unknown> = {},
): ValueSetterParams<TData, TValue> {
  const { api, column, colDef, node, data, ...rest } = overrides;

  return {
    data: data ?? ({} as TData),
    node: node ?? createMockRowNode<TData>(),
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    context: undefined,
    oldValue: undefined as TValue | null | undefined,
    newValue: undefined as TValue | null | undefined,
    ...rest,
  } as ValueSetterParams<TData, TValue>;
}

// ---------------------------------------------------------------------------
// CellValueChangedEvent factory
// ---------------------------------------------------------------------------

/**
 * Creates a typed CellValueChangedEvent with sensible defaults.
 * Useful for testing onCellValueChanged handlers.
 */
export function createCellValueChangedEvent<TData = any, TValue = any>(
  overrides: Partial<CellValueChangedEvent<TData, TValue>> & Record<string, unknown> = {},
): CellValueChangedEvent<TData, TValue> {
  const { api, column, colDef, node, data, ...rest } = overrides;

  const resolvedNode = node ?? createMockRowNode<TData>();
  const resolvedData = data ?? ({} as TData);

  return {
    type: 'cellValueChanged',
    data: resolvedData,
    node: resolvedNode,
    column: column ?? createMockColumn<TValue>(),
    colDef: colDef ?? ({} as ColDef<TData, TValue>),
    value: undefined as TValue | null | undefined,
    oldValue: undefined as TValue | null | undefined,
    newValue: undefined as TValue | null | undefined,
    source: undefined,
    rowIndex: 0,
    rowPinned: null as RowPinnedType,
    event: null,
    context: undefined,
    api: api ?? createMockGridApi<TData>(),
    columnApi: {} as any,
    ...rest,
  } as CellValueChangedEvent<TData, TValue>;
}
