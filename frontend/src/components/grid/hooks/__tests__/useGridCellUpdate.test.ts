import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AxiosError, AxiosHeaders } from 'axios';
import type { GridRow } from '../../PatientGrid';
import {
  createCellValueChangedEvent,
  createMockRowNode,
  createMockGridApi,
  createMockColumn,
} from '../../../../test-utils/agGridMocks';

/**
 * Helper to create a proper AxiosError instance that passes axios.isAxiosError().
 * Tests previously used plain objects which don't pass the isAxiosError type guard.
 */
function createAxiosError(status: number, data: unknown): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError(
    'Request failed',
    AxiosError.ERR_BAD_RESPONSE,
    undefined,
    undefined,
    {
      status,
      data,
      statusText: 'Error',
      headers,
      config: { headers },
    }
  );
}

// Mock api
const mockPut = vi.fn();
vi.mock('../../../../api/axios', () => ({
  api: { put: (...args: unknown[]) => mockPut(...args) },
}));

// Mock toast
const mockShowToast = vi.fn();
vi.mock('../../../../utils/toast', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}));

// Mock cascadingFields
const mockApplyCascadingUpdates = vi.fn(() => ({ updatePayload: {} }));
vi.mock('../../utils/cascadingFields', () => ({
  applyCascadingUpdates: (...args: unknown[]) => mockApplyCascadingUpdates(...args),
}));

import { useGridCellUpdate, UseGridCellUpdateOptions } from '../useGridCellUpdate';

// Helper to create a mock GridRow
function createMockRow(overrides: Partial<GridRow> = {}): GridRow {
  return {
    id: 1,
    patientId: 100,
    memberName: 'John Doe',
    memberDob: '1980-01-15T12:00:00.000Z',
    memberTelephone: null,
    memberAddress: null,
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
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Helper to create a mock CellValueChangedEvent using typed factory
function createMockEvent(overrides: Partial<{
  data: GridRow;
  colDef: { field: string };
  newValue: unknown;
  oldValue: unknown;
  node: Partial<{ setData: ReturnType<typeof vi.fn>; setDataValue: ReturnType<typeof vi.fn>; setSelected: ReturnType<typeof vi.fn> }>;
  api: Record<string, unknown>;
}> = {}) {
  const mockData = 'data' in overrides ? overrides.data : createMockRow();
  const mockNode = createMockRowNode<GridRow>({
    setData: vi.fn(),
    setDataValue: vi.fn(),
    setSelected: vi.fn(),
    ...(overrides.node || {}),
  });
  const mockApi = createMockGridApi<GridRow>({
    getColumnState: vi.fn(() => []),
    applyColumnState: vi.fn(),
    forEachNodeAfterFilterAndSort: vi.fn(),
    refreshCells: vi.fn(),
    applyTransaction: vi.fn(),
    ...(overrides.api || {}),
  });

  return createCellValueChangedEvent<GridRow>({
    data: mockData,
    colDef: overrides.colDef || { field: 'notes' },
    newValue: overrides.newValue ?? 'new value',
    oldValue: overrides.oldValue ?? 'old value',
    node: mockNode,
    api: mockApi,
    column: createMockColumn(),
    value: overrides.newValue ?? 'new value',
  });
}

// Default options factory
function createMockOptions(overrides: Partial<UseGridCellUpdateOptions> = {}): UseGridCellUpdateOptions {
  return {
    onRowUpdated: vi.fn(),
    onRowDeleted: vi.fn(),
    onSaveStatusChange: vi.fn(),
    getQueryParams: vi.fn(() => ''),
    gridRef: { current: null },
    frozenRowOrderRef: { current: null },
    saveStatusTimerRef: { current: undefined },
    setConflictData: vi.fn(),
    setConflictModalOpen: vi.fn(),
    ...overrides,
  };
}

describe('useGridCellUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns onCellValueChanged handler and isCascadingUpdateRef', () => {
    const options = createMockOptions();
    const { result } = renderHook(() => useGridCellUpdate(options));

    expect(typeof result.current.onCellValueChanged).toBe('function');
    expect(result.current.isCascadingUpdateRef).toBeDefined();
    expect(result.current.isCascadingUpdateRef.current).toBe(false);
  });

  describe('no-op scenarios', () => {
    it('does nothing when newValue equals oldValue', async () => {
      const options = createMockOptions();
      const { result } = renderHook(() => useGridCellUpdate(options));

      const event = createMockEvent({ newValue: 'same', oldValue: 'same' });
      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).not.toHaveBeenCalled();
      expect(options.onSaveStatusChange).not.toHaveBeenCalled();
    });

    it('does nothing when data is falsy', async () => {
      const options = createMockOptions();
      const { result } = renderHook(() => useGridCellUpdate(options));

      // Explicitly set data to undefined to test the guard clause
      const event = createMockEvent();
      (event as any).data = undefined;
      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).not.toHaveBeenCalled();
    });

    it('does nothing when colDef.field is falsy', async () => {
      const options = createMockOptions();
      const { result } = renderHook(() => useGridCellUpdate(options));

      const event = createMockEvent({ colDef: { field: '' } });
      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).not.toHaveBeenCalled();
    });

    it('does nothing when isCascadingUpdateRef is true', async () => {
      const options = createMockOptions();
      const { result } = renderHook(() => useGridCellUpdate(options));

      // Set cascading flag
      result.current.isCascadingUpdateRef.current = true;

      const event = createMockEvent();
      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).not.toHaveBeenCalled();

      // Reset for cleanup
      result.current.isCascadingUpdateRef.current = false;
    });
  });

  describe('successful save', () => {
    it('calls API with correct payload and updates node', async () => {
      const options = createMockOptions();
      const updatedRow = createMockRow({ notes: 'new value' });
      mockPut.mockResolvedValueOnce({ data: { success: true, data: updatedRow } });

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'notes' },
        newValue: 'new value',
        oldValue: 'old value',
        data: createMockRow({ updatedAt: '2025-01-01T00:00:00.000Z' }),
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).toHaveBeenCalledWith(
        '/data/1',
        expect.objectContaining({
          notes: null, // processedValue from data (null in our mock)
          expectedVersion: '2025-01-01T00:00:00.000Z',
        })
      );

      expect(event.node.setData).toHaveBeenCalledWith(updatedRow);
      expect(options.onRowUpdated).toHaveBeenCalledWith(updatedRow);
      expect(options.onSaveStatusChange).toHaveBeenCalledWith('saving');
      expect(options.onSaveStatusChange).toHaveBeenCalledWith('saved');
    });

    it('calls applyCascadingUpdates for cascading fields', async () => {
      const options = createMockOptions();
      mockApplyCascadingUpdates.mockReturnValueOnce({
        updatePayload: { qualityMeasure: null, measureStatus: null },
      });
      const updatedRow = createMockRow({ requestType: 'Quality' });
      mockPut.mockResolvedValueOnce({ data: { success: true, data: updatedRow } });

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'requestType' },
        newValue: 'Quality',
        oldValue: 'AWV',
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockApplyCascadingUpdates).toHaveBeenCalledWith(
        'requestType',
        'Quality',
        event.node
      );
    });

    it('includes query params in API call', async () => {
      const options = createMockOptions({
        getQueryParams: vi.fn(() => '?physicianId=5'),
      });
      const updatedRow = createMockRow();
      mockPut.mockResolvedValueOnce({ data: { success: true, data: updatedRow } });

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent();

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockPut).toHaveBeenCalledWith(
        '/data/1?physicianId=5',
        expect.any(Object)
      );
    });

    it('resets save status to idle after 2 seconds', async () => {
      const options = createMockOptions();
      const updatedRow = createMockRow();
      mockPut.mockResolvedValueOnce({ data: { success: true, data: updatedRow } });

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent();

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(options.onSaveStatusChange).toHaveBeenCalledWith('saved');

      // Advance timer by 2 seconds
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(options.onSaveStatusChange).toHaveBeenCalledWith('idle');
    });
  });

  describe('409 VERSION_CONFLICT', () => {
    it('opens conflict modal with correct data', async () => {
      const options = createMockOptions();
      const conflictError = createAxiosError(409, {
        error: { code: 'VERSION_CONFLICT', message: 'Conflict' },
        data: {
          serverRow: { memberName: 'Jane Doe' },
          conflictFields: [
            { field: 'notes', serverValue: 'server notes', clientValue: 'client notes' },
          ],
          changedBy: 'Alice',
        },
      });
      mockPut.mockRejectedValueOnce(conflictError);

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'notes' },
        newValue: 'client notes',
        oldValue: 'original notes',
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(options.setConflictModalOpen).toHaveBeenCalledWith(true);
      expect(options.setConflictData).toHaveBeenCalledWith(
        expect.objectContaining({
          patientName: 'Jane Doe',
          changedBy: 'Alice',
          rowId: 1,
        })
      );
      expect(options.onSaveStatusChange).toHaveBeenCalledWith('error');
    });
  });

  describe('404 Not Found', () => {
    it('shows toast and removes row from grid', async () => {
      const options = createMockOptions();
      const notFoundError = createAxiosError(404, {
        error: { message: 'Not found' },
      });
      mockPut.mockRejectedValueOnce(notFoundError);

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent();

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Row deleted by another user.', 'warning');
      expect(options.onRowDeleted).toHaveBeenCalledWith(1);
      expect(options.onSaveStatusChange).toHaveBeenCalledWith('idle');
    });
  });

  describe('general error handling', () => {
    it('shows error toast and reverts value for non-conflict errors', async () => {
      const options = createMockOptions();
      const genericError = createAxiosError(500, {
        error: { message: 'Internal server error' },
      });
      mockPut.mockRejectedValueOnce(genericError);

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'notes' },
        newValue: 'new',
        oldValue: 'old',
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(mockShowToast).toHaveBeenCalledWith('Internal server error', 'error');
      expect(event.node.setDataValue).toHaveBeenCalledWith('notes', 'old');
      expect(options.onSaveStatusChange).toHaveBeenCalledWith('error');
    });

    it('resets to empty for 409 non-conflict on requestType', async () => {
      const options = createMockOptions();
      const duplicateError = createAxiosError(409, {
        error: { message: 'Duplicate', code: 'DUPLICATE' },
      });
      mockPut.mockRejectedValueOnce(duplicateError);

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'requestType' },
        newValue: 'AWV',
        oldValue: null,
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(event.node.setDataValue).toHaveBeenCalledWith('requestType', null);
      expect(event.node.setDataValue).toHaveBeenCalledWith('qualityMeasure', null);
      expect(event.node.setDataValue).toHaveBeenCalledWith('measureStatus', null);
    });

    it('resets to empty for 409 non-conflict on qualityMeasure', async () => {
      const options = createMockOptions();
      const duplicateError = createAxiosError(409, {
        error: { message: 'Duplicate', code: 'DUPLICATE' },
      });
      mockPut.mockRejectedValueOnce(duplicateError);

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent({
        colDef: { field: 'qualityMeasure' },
        newValue: 'Diabetic Eye Exam',
        oldValue: null,
      });

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(event.node.setDataValue).toHaveBeenCalledWith('qualityMeasure', null);
      expect(event.node.setDataValue).toHaveBeenCalledWith('measureStatus', null);
    });

    it('always resets isCascadingUpdateRef in finally block', async () => {
      const options = createMockOptions();
      mockPut.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useGridCellUpdate(options));
      const event = createMockEvent();

      await act(async () => {
        await result.current.onCellValueChanged(event);
      });

      expect(result.current.isCascadingUpdateRef.current).toBe(false);
    });
  });
});
