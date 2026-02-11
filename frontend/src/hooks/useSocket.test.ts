/**
 * useSocket Hook Tests
 *
 * Tests for the Socket.IO React hook: connection lifecycle, room management, event wiring.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock socket service
vi.mock('../services/socketService', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  emitEditingStart: vi.fn(),
  emitEditingStop: vi.fn(),
  getSocket: vi.fn(() => null),
}));

// Mock stores
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

vi.mock('../stores/realtimeStore', () => ({
  useRealtimeStore: vi.fn(),
}));

import { useSocket } from './useSocket';
import * as socketService from '../services/socketService';
import { useAuthStore } from '../stores/authStore';
import { useRealtimeStore } from '../stores/realtimeStore';

// Type the mocks
const mockConnect = vi.mocked(socketService.connect);
const mockDisconnect = vi.mocked(socketService.disconnect);
const mockJoinRoom = vi.mocked(socketService.joinRoom);
const mockLeaveRoom = vi.mocked(socketService.leaveRoom);

describe('useSocket', () => {
  const mockOptions = {
    onRowUpdated: vi.fn(),
    onRowCreated: vi.fn(),
    onRowDeleted: vi.fn(),
    onDataRefresh: vi.fn(),
  };

  // Mock store selectors
  const mockSetConnectionStatus = vi.fn();
  const mockSetRoomUsers = vi.fn();
  const mockAddActiveEdit = vi.fn();
  const mockRemoveActiveEdit = vi.fn();
  const mockClearActiveEdits = vi.fn();
  const mockSetImportInProgress = vi.fn();
  const mockLogout = vi.fn();

  let authStoreState: { token: string | null; selectedPhysicianId: number | null };

  beforeEach(() => {
    vi.clearAllMocks();

    authStoreState = { token: 'test-token', selectedPhysicianId: 5 };

    // Set up useAuthStore to return different values based on selector
    vi.mocked(useAuthStore).mockImplementation((selector: any) => {
      const state = {
        token: authStoreState.token,
        selectedPhysicianId: authStoreState.selectedPhysicianId,
        logout: mockLogout,
      };
      return selector(state);
    });

    // Set up useRealtimeStore to return action functions
    vi.mocked(useRealtimeStore).mockImplementation((selector: any) => {
      const state = {
        setConnectionStatus: mockSetConnectionStatus,
        setRoomUsers: mockSetRoomUsers,
        addActiveEdit: mockAddActiveEdit,
        removeActiveEdit: mockRemoveActiveEdit,
        clearActiveEdits: mockClearActiveEdits,
        setImportInProgress: mockSetImportInProgress,
      };
      return selector(state);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('connects on mount when token is available', () => {
    renderHook(() => useSocket(mockOptions));

    expect(mockConnect).toHaveBeenCalledWith('test-token', expect.any(Object));
  });

  it('does not connect when token is null', () => {
    authStoreState.token = null;

    renderHook(() => useSocket(mockOptions));

    expect(mockConnect).not.toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useSocket(mockOptions));

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('joins room when selectedPhysicianId is available', () => {
    renderHook(() => useSocket(mockOptions));

    expect(mockJoinRoom).toHaveBeenCalledWith(5);
  });

  it('does not join room when selectedPhysicianId is null', () => {
    authStoreState.selectedPhysicianId = null;

    renderHook(() => useSocket(mockOptions));

    expect(mockJoinRoom).not.toHaveBeenCalled();
  });

  it('leaves old room and joins new room when physician changes', () => {
    const { rerender } = renderHook(() => useSocket(mockOptions));

    // Initial join was to physician 5
    expect(mockJoinRoom).toHaveBeenCalledWith(5);

    // Change physician
    authStoreState.selectedPhysicianId = 10;
    rerender();

    expect(mockLeaveRoom).toHaveBeenCalledWith(5);
    expect(mockJoinRoom).toHaveBeenCalledWith(10);
  });

  it('sets connection status to disconnected when token is null', () => {
    authStoreState.token = null;

    renderHook(() => useSocket(mockOptions));

    expect(mockSetConnectionStatus).toHaveBeenCalledWith('disconnected');
  });

  it('passes event handlers to socket service connect', () => {
    renderHook(() => useSocket(mockOptions));

    expect(mockConnect).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({
        onConnectionChange: expect.any(Function),
        onRowUpdated: expect.any(Function),
        onRowCreated: expect.any(Function),
        onRowDeleted: expect.any(Function),
        onDataRefresh: expect.any(Function),
        onImportStarted: expect.any(Function),
        onImportCompleted: expect.any(Function),
        onEditingActive: expect.any(Function),
        onEditingInactive: expect.any(Function),
        onPresenceUpdate: expect.any(Function),
      })
    );
  });

  it('wires onConnectionChange to setConnectionStatus', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onConnectionChange('connected');

    expect(mockSetConnectionStatus).toHaveBeenCalledWith('connected');
  });

  it('clears active edits and room users on disconnected status', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onConnectionChange('disconnected');

    expect(mockClearActiveEdits).toHaveBeenCalled();
    expect(mockSetRoomUsers).toHaveBeenCalledWith([]);
  });

  it('wires onPresenceUpdate to setRoomUsers', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    const users = [{ id: 1, displayName: 'Dr. Smith' }];
    handlers.onPresenceUpdate({ users });

    expect(mockSetRoomUsers).toHaveBeenCalledWith(users);
  });

  it('wires onEditingActive to addActiveEdit', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onEditingActive({ rowId: 1, field: 'notes', userName: 'Dr. Smith' });

    expect(mockAddActiveEdit).toHaveBeenCalledWith({
      rowId: 1,
      field: 'notes',
      userName: 'Dr. Smith',
    });
  });

  it('wires onEditingInactive to removeActiveEdit', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onEditingInactive({ rowId: 1, field: 'notes' });

    expect(mockRemoveActiveEdit).toHaveBeenCalledWith(1, 'notes');
  });

  it('wires onImportStarted to setImportInProgress', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onImportStarted({ importedBy: 'Admin' });

    expect(mockSetImportInProgress).toHaveBeenCalledWith(true, 'Admin');
  });

  it('wires onImportCompleted to setImportInProgress and onDataRefresh', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    handlers.onImportCompleted({
      importedBy: 'Admin',
      stats: { inserted: 1, updated: 2, deleted: 0, skipped: 0, bothKept: 0 },
    });

    expect(mockSetImportInProgress).toHaveBeenCalledWith(false);
    expect(mockOptions.onDataRefresh).toHaveBeenCalled();
  });

  it('wires onRowUpdated to options callback', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    const payload = { row: { id: 1 } as any, changedBy: 'Dr. Smith' };
    handlers.onRowUpdated(payload);

    expect(mockOptions.onRowUpdated).toHaveBeenCalledWith(payload.row, payload.changedBy);
  });

  it('wires onRowDeleted to options callback', () => {
    renderHook(() => useSocket(mockOptions));

    const handlers = mockConnect.mock.calls[0][1];
    const payload = { rowId: 1, changedBy: 'Dr. Smith' };
    handlers.onRowDeleted(payload);

    expect(mockOptions.onRowDeleted).toHaveBeenCalledWith(1, 'Dr. Smith');
  });
});
