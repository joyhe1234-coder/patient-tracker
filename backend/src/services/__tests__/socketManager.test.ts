/**
 * Socket Manager Tests
 *
 * Tests for Socket.IO server initialization, room management,
 * presence tracking, active edit tracking, and broadcast helpers.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock socket.io before importing socketManager
jest.mock('socket.io', () => {
  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({
    emit: mockEmit,
    except: jest.fn().mockReturnValue({ emit: mockEmit }),
  });
  const mockUse = jest.fn();
  const mockOn = jest.fn();

  class MockServer {
    use = mockUse;
    on = mockOn;
    to = mockTo;
    close = jest.fn();
  }

  return {
    Server: MockServer,
    __mockEmit: mockEmit,
    __mockTo: mockTo,
    __mockUse: mockUse,
    __mockOn: mockOn,
  };
});

// Mock the auth middleware
jest.mock('../../middleware/socketAuth.js', () => ({
  socketAuthMiddleware: jest.fn(),
}));

// Mock authService
jest.mock('../authService.js', () => ({
  isStaffAssignedToPhysician: jest.fn(),
}));

import {
  getRoomName,
  addUserToRoom,
  removeUserFromRoom,
  removeUserFromAllRooms,
  getPresenceForRoom,
  addActiveEdit,
  removeActiveEdit,
  clearEditsForSocket,
  getActiveEditsForRoom,
  clearAllState,
} from '../socketManager.js';
import type { SocketData } from '../../types/socket.js';

describe('socketManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearAllState();
  });

  describe('getRoomName', () => {
    it('should format room name for a physician ID', () => {
      expect(getRoomName(5)).toBe('physician:5');
    });

    it('should format room name for unassigned', () => {
      expect(getRoomName('unassigned')).toBe('physician:unassigned');
    });

    it('should handle different physician IDs', () => {
      expect(getRoomName(1)).toBe('physician:1');
      expect(getRoomName(100)).toBe('physician:100');
      expect(getRoomName(999)).toBe('physician:999');
    });
  });

  describe('presence tracking', () => {
    const userData: SocketData = {
      userId: 1,
      email: 'doc@clinic.com',
      displayName: 'Dr. Smith',
      roles: ['PHYSICIAN'],
      currentRoom: 'physician:1',
    };

    const userData2: SocketData = {
      userId: 2,
      email: 'nurse@clinic.com',
      displayName: 'Nurse Jones',
      roles: ['STAFF'],
      currentRoom: 'physician:1',
    };

    it('should add user to room presence', () => {
      const room = 'test-presence-add';
      addUserToRoom(room, 'socket-1', userData);

      const users = getPresenceForRoom(room);
      expect(users).toHaveLength(1);
      expect(users[0]).toEqual({ id: 1, displayName: 'Dr. Smith' });
    });

    it('should add multiple users to the same room', () => {
      const room = 'test-presence-multi';
      addUserToRoom(room, 'socket-1', userData);
      addUserToRoom(room, 'socket-2', userData2);

      const users = getPresenceForRoom(room);
      expect(users).toHaveLength(2);
    });

    it('should deduplicate users with multiple sockets', () => {
      const room = 'test-presence-dedup';
      addUserToRoom(room, 'socket-1', userData);
      addUserToRoom(room, 'socket-2', userData); // Same user, different socket

      const users = getPresenceForRoom(room);
      expect(users).toHaveLength(1);
    });

    it('should remove user from room presence', () => {
      const room = 'test-presence-remove';
      addUserToRoom(room, 'socket-1', userData);
      addUserToRoom(room, 'socket-2', userData2);

      removeUserFromRoom(room, 'socket-1');

      const users = getPresenceForRoom(room);
      expect(users).toHaveLength(1);
      expect(users[0].displayName).toBe('Nurse Jones');
    });

    it('should return empty array for non-existent room', () => {
      const users = getPresenceForRoom('non-existent-room-xyz');
      expect(users).toEqual([]);
    });

    it('should clean up room map when last user leaves', () => {
      const room = 'test-presence-cleanup';
      addUserToRoom(room, 'socket-1', userData);
      removeUserFromRoom(room, 'socket-1');

      const users = getPresenceForRoom(room);
      expect(users).toEqual([]);
    });

    it('should remove user from all rooms on disconnect', () => {
      const room1 = 'test-presence-disconnect-1';
      const room2 = 'test-presence-disconnect-2';
      addUserToRoom(room1, 'socket-1', userData);
      addUserToRoom(room2, 'socket-1', userData);

      const affectedRooms = removeUserFromAllRooms('socket-1');

      expect(affectedRooms).toContain(room1);
      expect(affectedRooms).toContain(room2);
      expect(getPresenceForRoom(room1)).toEqual([]);
      expect(getPresenceForRoom(room2)).toEqual([]);
    });

    it('should return empty array when removing non-existent socket from all rooms', () => {
      const affectedRooms = removeUserFromAllRooms('non-existent-socket-xyz');
      expect(affectedRooms).toEqual([]);
    });

    it('should handle removing from non-existent room gracefully', () => {
      // Should not throw
      removeUserFromRoom('totally-fake-room', 'socket-999');
    });
  });

  describe('active edit tracking', () => {
    it('should add an active edit', () => {
      const room = 'test-edit-add';
      addActiveEdit(room, 1, 'notes', 'Dr. Smith', 'socket-1');

      const edits = getActiveEditsForRoom(room);
      expect(edits).toHaveLength(1);
      expect(edits[0]).toEqual({
        rowId: 1,
        field: 'notes',
        userName: 'Dr. Smith',
        socketId: 'socket-1',
      });
    });

    it('should replace existing edit for the same row+field', () => {
      const room = 'test-edit-replace';
      addActiveEdit(room, 1, 'notes', 'Dr. Smith', 'socket-1');
      addActiveEdit(room, 1, 'notes', 'Nurse Jones', 'socket-2');

      const edits = getActiveEditsForRoom(room);
      expect(edits).toHaveLength(1);
      expect(edits[0].userName).toBe('Nurse Jones');
      expect(edits[0].socketId).toBe('socket-2');
    });

    it('should track multiple edits in the same room', () => {
      const room = 'test-edit-multi';
      addActiveEdit(room, 1, 'notes', 'Dr. Smith', 'socket-1');
      addActiveEdit(room, 2, 'measureStatus', 'Nurse Jones', 'socket-2');

      const edits = getActiveEditsForRoom(room);
      expect(edits).toHaveLength(2);
    });

    it('should remove a specific active edit', () => {
      const room = 'test-edit-remove';
      addActiveEdit(room, 1, 'notes', 'Dr. Smith', 'socket-1');
      addActiveEdit(room, 2, 'measureStatus', 'Nurse Jones', 'socket-2');

      removeActiveEdit(room, 1, 'notes');

      const edits = getActiveEditsForRoom(room);
      expect(edits).toHaveLength(1);
      expect(edits[0].rowId).toBe(2);
    });

    it('should return empty array for room with no edits', () => {
      const edits = getActiveEditsForRoom('no-edits-room-xyz');
      expect(edits).toEqual([]);
    });

    it('should clear all edits for a socket on disconnect', () => {
      const room1 = 'test-edit-clear-1';
      const room2 = 'test-edit-clear-2';
      // Use unique socket IDs to avoid state leakage from earlier tests
      const clearSocket = 'socket-clear-target';
      const keepSocket = 'socket-clear-keep';
      addActiveEdit(room1, 1, 'notes', 'Dr. Smith', clearSocket);
      addActiveEdit(room1, 2, 'measureStatus', 'Dr. Smith', clearSocket);
      addActiveEdit(room2, 3, 'tracking1', 'Dr. Smith', clearSocket);
      addActiveEdit(room1, 4, 'notes', 'Nurse Jones', keepSocket);

      const cleared = clearEditsForSocket(clearSocket);

      expect(cleared).toHaveLength(3);
      expect(cleared).toEqual(
        expect.arrayContaining([
          { room: room1, rowId: 1, field: 'notes' },
          { room: room1, rowId: 2, field: 'measureStatus' },
          { room: room2, rowId: 3, field: 'tracking1' },
        ]),
      );

      // keepSocket's edit should still be there
      const edits = getActiveEditsForRoom(room1);
      expect(edits).toHaveLength(1);
      expect(edits[0].socketId).toBe(keepSocket);
    });

    it('should return empty array when clearing non-existent socket', () => {
      const cleared = clearEditsForSocket('non-existent-socket-xyz');
      expect(cleared).toEqual([]);
    });

    it('should handle removing non-existent edit gracefully', () => {
      // Should not throw
      removeActiveEdit('no-such-room', 999, 'no-such-field');
    });
  });
});
