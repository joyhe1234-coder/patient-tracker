import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useRemoteEditClass } from './useRemoteEditClass';
import type { ActiveEdit } from '../../../stores/realtimeStore';

describe('useRemoteEditClass', () => {
  const makeParams = (data: { id: number } | null | undefined, field?: string) =>
    ({ data, colDef: { field } }) as never;

  it('returns empty string when params.data is null', () => {
    const { result } = renderHook(() => useRemoteEditClass([]));
    expect(result.current(makeParams(null, 'notes'))).toBe('');
  });

  it('returns empty string when params.data is undefined', () => {
    const { result } = renderHook(() => useRemoteEditClass([]));
    expect(result.current(makeParams(undefined, 'notes'))).toBe('');
  });

  it('returns empty string when params.colDef.field is undefined', () => {
    const { result } = renderHook(() => useRemoteEditClass([]));
    expect(result.current(makeParams({ id: 1 }))).toBe('');
  });

  it('returns "cell-remote-editing" when activeEdits match rowId and field', () => {
    const activeEdits: ActiveEdit[] = [
      { rowId: 1, field: 'notes', userName: 'Other User' },
    ];
    const { result } = renderHook(() => useRemoteEditClass(activeEdits));
    expect(result.current(makeParams({ id: 1 }, 'notes'))).toBe('cell-remote-editing');
  });

  it('returns empty string when rowId matches but field does not', () => {
    const activeEdits: ActiveEdit[] = [
      { rowId: 1, field: 'notes', userName: 'Other User' },
    ];
    const { result } = renderHook(() => useRemoteEditClass(activeEdits));
    expect(result.current(makeParams({ id: 1 }, 'memberName'))).toBe('');
  });

  it('returns empty string when field matches but rowId does not', () => {
    const activeEdits: ActiveEdit[] = [
      { rowId: 99, field: 'notes', userName: 'Other User' },
    ];
    const { result } = renderHook(() => useRemoteEditClass(activeEdits));
    expect(result.current(makeParams({ id: 1 }, 'notes'))).toBe('');
  });

  it('returns empty string when activeEdits is empty', () => {
    const { result } = renderHook(() => useRemoteEditClass([]));
    expect(result.current(makeParams({ id: 1 }, 'notes'))).toBe('');
  });
});
