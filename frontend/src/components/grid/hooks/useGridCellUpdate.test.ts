/**
 * useGridCellUpdate Tests
 *
 * Tests for the field display name mapping and conflict field mapping logic
 * used in ConflictModal and remote edit notifications.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AxiosError } from 'axios';

// Mock modules before imports
vi.mock('axios', () => ({
  default: {
    isAxiosError: (error: unknown) => error instanceof AxiosError,
  },
  isAxiosError: (error: unknown) => error instanceof AxiosError,
  AxiosError: class extends Error {
    response: unknown;
    isAxiosError = true;
    constructor(message: string, _code?: string, _config?: unknown, _request?: unknown, response?: unknown) {
      super(message);
      this.response = response;
    }
  },
}));

vi.mock('../../../api/axios', () => ({
  api: {
    put: vi.fn(),
  },
}));

vi.mock('../../../utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('../../../utils/toast', () => ({
  showToast: vi.fn(),
}));

vi.mock('../utils/cascadingFields', () => ({
  applyCascadingUpdates: vi.fn(() => ({ updatePayload: {}, clearedFields: [] })),
}));

import { FIELD_DISPLAY_NAMES, useGridCellUpdate } from './useGridCellUpdate';
import type { ConflictData } from './useGridCellUpdate';
import { api } from '../../../api/axios';

describe('FIELD_DISPLAY_NAMES', () => {
  const EXPECTED_KEYS = [
    'requestType',
    'memberName',
    'memberDob',
    'memberTelephone',
    'memberAddress',
    'qualityMeasure',
    'measureStatus',
    'statusDate',
    'tracking1',
    'tracking2',
    'dueDate',
    'timeIntervalDays',
    'notes',
  ];

  it('contains all 13 editable grid column keys', () => {
    for (const key of EXPECTED_KEYS) {
      expect(FIELD_DISPLAY_NAMES).toHaveProperty(key);
    }
    expect(Object.keys(FIELD_DISPLAY_NAMES)).toHaveLength(13);
  });

  it('all display names are non-empty strings', () => {
    for (const [key, value] of Object.entries(FIELD_DISPLAY_NAMES)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('core field mappings are human-readable', () => {
    expect(FIELD_DISPLAY_NAMES.requestType).toBe('Request Type');
    expect(FIELD_DISPLAY_NAMES.measureStatus).toBe('Measure Status');
    expect(FIELD_DISPLAY_NAMES.tracking1).toBe('Tracking #1');
    expect(FIELD_DISPLAY_NAMES.memberDob).toBe('Member DOB');
  });

  it('no duplicate display names', () => {
    const values = Object.values(FIELD_DISPLAY_NAMES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('patient data columns are all mapped', () => {
    const patientColumns = ['memberName', 'memberDob', 'memberTelephone', 'memberAddress'];
    for (const col of patientColumns) {
      expect(FIELD_DISPLAY_NAMES).toHaveProperty(col);
      expect(FIELD_DISPLAY_NAMES[col].length).toBeGreaterThan(0);
    }
  });
});

describe('useGridCellUpdate — conflict field mapping', () => {
  let setConflictData: ReturnType<typeof vi.fn>;
  let setConflictModalOpen: ReturnType<typeof vi.fn>;
  let onSaveStatusChange: ReturnType<typeof vi.fn>;
  let mockGridApi: Record<string, ReturnType<typeof vi.fn>>;
  let mockNode: Record<string, unknown>;

  const mockRowData = {
    id: 1,
    patientId: 10,
    memberName: 'Doe, John',
    memberDob: '1990-01-15',
    memberTelephone: '555-1234',
    memberAddress: '123 Main St',
    requestType: 'AWV',
    qualityMeasure: 'BCS',
    measureStatus: 'Pending',
    statusDate: null,
    statusDatePrompt: null,
    tracking1: null,
    tracking2: null,
    dueDate: null,
    timeIntervalDays: 60,
    notes: 'My local notes',
    rowOrder: 0,
    isDuplicate: false,
    updatedAt: '2026-02-10T12:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setConflictData = vi.fn();
    setConflictModalOpen = vi.fn();
    onSaveStatusChange = vi.fn();

    mockGridApi = {
      getColumnState: vi.fn(() => []),
      forEachNodeAfterFilterAndSort: vi.fn(),
      applyColumnState: vi.fn(),
      redrawRows: vi.fn(),
      refreshCells: vi.fn(),
      applyTransaction: vi.fn(),
    };

    mockNode = {
      data: mockRowData,
      setData: vi.fn(),
      setDataValue: vi.fn(),
      setSelected: vi.fn(),
    };
  });

  function createCellEvent(field: string, newValue: string, oldValue: string | null = null) {
    return {
      data: mockRowData,
      colDef: { field },
      newValue,
      oldValue,
      node: mockNode,
      api: mockGridApi,
    };
  }

  it('string array conflictFields derives theirValue from serverRow and yourValue from local data', async () => {
    // Mock api.put to throw a 409 VERSION_CONFLICT with string[] conflictFields
    const error409 = Object.assign(new Error('conflict'), {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
          data: {
            serverRow: {
              ...mockRowData,
              notes: 'Server notes value',
              updatedAt: '2026-02-10T13:00:00.000Z',
            },
            conflictFields: ['notes'], // String array (not object array)
            changedBy: 'Other User',
          },
        },
      },
    });
    // Make axios.isAxiosError recognize this
    (error409 as any).isAxiosError = true;

    const mockPut = vi.mocked(api.put);
    mockPut.mockRejectedValueOnce(error409);

    // Patch axios.isAxiosError to work with our mock error
    const axios = await import('axios');
    const origIsAxiosError = axios.default.isAxiosError;
    axios.default.isAxiosError = (e: unknown) => (e as any)?.isAxiosError === true;

    const { result } = renderHook(() =>
      useGridCellUpdate({
        onSaveStatusChange,
        getQueryParams: () => '',
        gridRef: { current: null },
        frozenRowOrderRef: { current: null },
        saveStatusTimerRef: { current: undefined },
        setConflictData,
        setConflictModalOpen,
      }),
    );

    const event = createCellEvent('notes', 'My local notes', 'Old notes');
    await act(async () => {
      await result.current.onCellValueChanged(event as any);
    });

    // Restore
    axios.default.isAxiosError = origIsAxiosError;

    expect(setConflictModalOpen).toHaveBeenCalledWith(true);
    expect(setConflictData).toHaveBeenCalledTimes(1);

    const conflictArg: ConflictData = setConflictData.mock.calls[0][0];
    expect(conflictArg.conflicts).toHaveLength(1);

    const conflict = conflictArg.conflicts[0];
    // theirValue should come from serverRow.notes, not be null/"(empty)"
    expect(conflict.theirValue).toBe('Server notes value');
    // yourValue should come from local data.notes
    expect(conflict.yourValue).toBe('My local notes');
    // fieldName should be human-readable
    expect(conflict.fieldName).toBe('Notes');
  });

  it('object array conflictFields uses serverValue and clientValue directly', async () => {
    const error409 = Object.assign(new Error('conflict'), {
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
          data: {
            serverRow: {
              ...mockRowData,
              notes: 'Server val',
              updatedAt: '2026-02-10T13:00:00.000Z',
            },
            // Object array with explicit values
            conflictFields: [
              { field: 'notes', serverValue: 'ExplicitServer', clientValue: 'ExplicitClient' },
            ],
            changedBy: 'Other User',
          },
        },
      },
    });

    const mockPut = vi.mocked(api.put);
    mockPut.mockRejectedValueOnce(error409);

    const axios = await import('axios');
    const origIsAxiosError = axios.default.isAxiosError;
    axios.default.isAxiosError = (e: unknown) => (e as any)?.isAxiosError === true;

    const { result } = renderHook(() =>
      useGridCellUpdate({
        onSaveStatusChange,
        getQueryParams: () => '',
        gridRef: { current: null },
        frozenRowOrderRef: { current: null },
        saveStatusTimerRef: { current: undefined },
        setConflictData,
        setConflictModalOpen,
      }),
    );

    const event = createCellEvent('notes', 'ExplicitClient', 'Old');
    await act(async () => {
      await result.current.onCellValueChanged(event as any);
    });

    axios.default.isAxiosError = origIsAxiosError;

    expect(setConflictData).toHaveBeenCalledTimes(1);
    const conflictArg: ConflictData = setConflictData.mock.calls[0][0];
    const conflict = conflictArg.conflicts[0];

    // Object-style: uses values from the conflict object directly
    expect(conflict.theirValue).toBe('ExplicitServer');
    expect(conflict.yourValue).toBe('ExplicitClient');
    expect(conflict.fieldName).toBe('Notes');
  });
});
