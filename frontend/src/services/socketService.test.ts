/**
 * Socket Service Tests
 *
 * Tests for the Socket.IO client service: connection, disconnect, room management, event emitters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock socket.io-client before importing the service
const mockOn = vi.fn();
const mockEmit = vi.fn();
const mockDisconnect = vi.fn();
const mockRemoveAllListeners = vi.fn();
const mockIoOn = vi.fn();

const mockSocket = {
  id: 'test-socket-id',
  connected: false,
  on: mockOn,
  emit: mockEmit,
  disconnect: mockDisconnect,
  removeAllListeners: mockRemoveAllListeners,
  io: {
    on: mockIoOn,
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Import after mock
import {
  connect,
  disconnect,
  joinRoom,
  leaveRoom,
  emitEditingStart,
  emitEditingStop,
  getSocket,
  getServerUrl,
  type SocketServiceHandlers,
} from './socketService';
import { io } from 'socket.io-client';

function createMockHandlers(): SocketServiceHandlers {
  return {
    onConnectionChange: vi.fn(),
    onRowUpdated: vi.fn(),
    onRowCreated: vi.fn(),
    onRowDeleted: vi.fn(),
    onDataRefresh: vi.fn(),
    onImportStarted: vi.fn(),
    onImportCompleted: vi.fn(),
    onEditingActive: vi.fn(),
    onEditingInactive: vi.fn(),
    onPresenceUpdate: vi.fn(),
  };
}

describe('socketService', () => {
  let handlers: SocketServiceHandlers;

  beforeEach(() => {
    vi.clearAllMocks();
    handlers = createMockHandlers();
    mockSocket.connected = false;
    // Ensure clean state
    disconnect();
  });

  afterEach(() => {
    disconnect();
  });

  describe('getServerUrl', () => {
    it('returns window.location.origin when no VITE_API_URL', () => {
      // In test environment, import.meta.env.VITE_API_URL is undefined
      const url = getServerUrl();
      expect(url).toBe(window.location.origin);
    });
  });

  describe('connect', () => {
    it('creates socket.io connection with JWT auth', () => {
      connect('test-token', handlers);

      expect(io).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          auth: { token: 'test-token' },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 30000,
          reconnectionAttempts: 10,
        })
      );
    });

    it('calls onConnectionChange with connecting', () => {
      connect('test-token', handlers);

      expect(handlers.onConnectionChange).toHaveBeenCalledWith('connecting');
    });

    it('registers all server-to-client event listeners', () => {
      connect('test-token', handlers);

      const registeredEvents = mockOn.mock.calls.map((call) => call[0]);
      expect(registeredEvents).toContain('connect');
      expect(registeredEvents).toContain('disconnect');
      expect(registeredEvents).toContain('connect_error');
      expect(registeredEvents).toContain('row:updated');
      expect(registeredEvents).toContain('row:created');
      expect(registeredEvents).toContain('row:deleted');
      expect(registeredEvents).toContain('data:refresh');
      expect(registeredEvents).toContain('import:started');
      expect(registeredEvents).toContain('import:completed');
      expect(registeredEvents).toContain('editing:active');
      expect(registeredEvents).toContain('editing:inactive');
      expect(registeredEvents).toContain('presence:update');
    });

    it('registers reconnection lifecycle events on io manager', () => {
      connect('test-token', handlers);

      const ioEvents = mockIoOn.mock.calls.map((call) => call[0]);
      expect(ioEvents).toContain('reconnect_attempt');
      expect(ioEvents).toContain('reconnect');
      expect(ioEvents).toContain('reconnect_failed');
    });

    it('does not create duplicate connections when already connected', () => {
      // First, establish a connection
      connect('test-token', handlers);
      vi.clearAllMocks();

      // Now mark socket as connected
      mockSocket.connected = true;

      // Try to connect again - should bail out early
      const handlers2 = createMockHandlers();
      connect('test-token-2', handlers2);

      // io() should not be called again since socket is already connected
      expect(io).not.toHaveBeenCalled();
      expect(handlers2.onConnectionChange).not.toHaveBeenCalled();
    });

    it('invokes handler callbacks when events fire', () => {
      connect('test-token', handlers);

      // Find and invoke the 'row:updated' listener
      const rowUpdatedCall = mockOn.mock.calls.find((call) => call[0] === 'row:updated');
      expect(rowUpdatedCall).toBeDefined();

      const payload = { row: { id: 1 }, changedBy: 'Dr. Smith' };
      rowUpdatedCall![1](payload);
      expect(handlers.onRowUpdated).toHaveBeenCalledWith(payload);
    });

    it('invokes connect handler on connect event', () => {
      connect('test-token', handlers);

      const connectCall = mockOn.mock.calls.find((call) => call[0] === 'connect');
      connectCall![1]();
      expect(handlers.onConnectionChange).toHaveBeenCalledWith('connected');
    });

    it('invokes disconnect handler on disconnect event', () => {
      connect('test-token', handlers);

      const disconnectCall = mockOn.mock.calls.find((call) => call[0] === 'disconnect');
      disconnectCall![1]();
      expect(handlers.onConnectionChange).toHaveBeenCalledWith('disconnected');
    });

    it('handles authentication failure on connect_error', () => {
      connect('test-token', handlers);

      const errorCall = mockOn.mock.calls.find((call) => call[0] === 'connect_error');
      errorCall![1](new Error('Authentication failed'));
      expect(handlers.onConnectionChange).toHaveBeenCalledWith('offline');
    });

    it('handles generic connect_error', () => {
      connect('test-token', handlers);

      const errorCall = mockOn.mock.calls.find((call) => call[0] === 'connect_error');
      errorCall![1](new Error('Network error'));
      expect(handlers.onConnectionChange).toHaveBeenCalledWith('disconnected');
    });
  });

  describe('disconnect', () => {
    it('disconnects and cleans up socket', () => {
      connect('test-token', handlers);
      disconnect();

      expect(mockRemoveAllListeners).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('sets socket to null after disconnect', () => {
      connect('test-token', handlers);
      disconnect();

      expect(getSocket()).toBeNull();
    });

    it('is safe to call when no socket exists', () => {
      expect(() => disconnect()).not.toThrow();
    });
  });

  describe('joinRoom', () => {
    it('emits room:join when connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = true;

      joinRoom(5);

      expect(mockEmit).toHaveBeenCalledWith('room:join', { physicianId: 5 });
    });

    it('handles unassigned physician ID', () => {
      connect('test-token', handlers);
      mockSocket.connected = true;

      joinRoom('unassigned');

      expect(mockEmit).toHaveBeenCalledWith('room:join', { physicianId: 'unassigned' });
    });

    it('does not emit when not connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = false;

      joinRoom(5);

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('leaveRoom', () => {
    it('emits room:leave when connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = true;

      leaveRoom(5);

      expect(mockEmit).toHaveBeenCalledWith('room:leave', { physicianId: 5 });
    });

    it('does not emit when not connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = false;

      leaveRoom(5);

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('emitEditingStart', () => {
    it('emits editing:start when connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = true;

      emitEditingStart(1, 'measureStatus');

      expect(mockEmit).toHaveBeenCalledWith('editing:start', { rowId: 1, field: 'measureStatus' });
    });

    it('does not emit when not connected', () => {
      emitEditingStart(1, 'measureStatus');

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('emitEditingStop', () => {
    it('emits editing:stop when connected', () => {
      connect('test-token', handlers);
      mockSocket.connected = true;

      emitEditingStop(1, 'measureStatus');

      expect(mockEmit).toHaveBeenCalledWith('editing:stop', { rowId: 1, field: 'measureStatus' });
    });

    it('does not emit when not connected', () => {
      emitEditingStop(1, 'measureStatus');

      expect(mockEmit).not.toHaveBeenCalled();
    });
  });

  describe('getSocket', () => {
    it('returns null when no connection', () => {
      expect(getSocket()).toBeNull();
    });

    it('returns socket when connected', () => {
      connect('test-token', handlers);

      expect(getSocket()).toBeTruthy();
    });
  });
});
