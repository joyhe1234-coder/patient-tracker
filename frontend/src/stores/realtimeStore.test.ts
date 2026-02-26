/**
 * Realtime Store Tests
 *
 * Tests for the Zustand realtime store: connection status, presence, active edits, import state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useRealtimeStore } from './realtimeStore';

describe('realtimeStore', () => {
  // Reset store to initial state before each test
  beforeEach(() => {
    useRealtimeStore.setState({
      connectionStatus: 'disconnected',
      roomUsers: [],
      activeEdits: [],
      importInProgress: false,
      importedBy: null,
    });
  });

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const state = useRealtimeStore.getState();

      expect(state.connectionStatus).toBe('disconnected');
      expect(state.roomUsers).toEqual([]);
      expect(state.activeEdits).toEqual([]);
      expect(state.importInProgress).toBe(false);
      expect(state.importedBy).toBeNull();
    });
  });

  // REMOVED (ln-630 audit B12.2): 'setConnectionStatus' (4 tests) —
  // trivial setState('x')/getState() round-trips testing Zustand, not business logic.

  describe('setRoomUsers', () => {
    it('updates room users list', () => {
      const users = [
        { id: 1, displayName: 'Dr. Smith' },
        { id: 2, displayName: 'Nurse Jones' },
      ];

      useRealtimeStore.getState().setRoomUsers(users);

      expect(useRealtimeStore.getState().roomUsers).toEqual(users);
    });

    it('replaces previous room users', () => {
      useRealtimeStore.getState().setRoomUsers([{ id: 1, displayName: 'Dr. Smith' }]);
      useRealtimeStore.getState().setRoomUsers([{ id: 2, displayName: 'Nurse Jones' }]);

      expect(useRealtimeStore.getState().roomUsers).toEqual([
        { id: 2, displayName: 'Nurse Jones' },
      ]);
    });

    it('handles empty user list', () => {
      useRealtimeStore.getState().setRoomUsers([{ id: 1, displayName: 'Dr. Smith' }]);
      useRealtimeStore.getState().setRoomUsers([]);

      expect(useRealtimeStore.getState().roomUsers).toEqual([]);
    });
  });

  describe('addActiveEdit', () => {
    it('adds an active edit', () => {
      const edit = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };

      useRealtimeStore.getState().addActiveEdit(edit);

      expect(useRealtimeStore.getState().activeEdits).toEqual([edit]);
    });

    it('adds multiple edits', () => {
      const edit1 = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };
      const edit2 = { rowId: 2, field: 'notes', userName: 'Nurse Jones' };

      useRealtimeStore.getState().addActiveEdit(edit1);
      useRealtimeStore.getState().addActiveEdit(edit2);

      expect(useRealtimeStore.getState().activeEdits).toEqual([edit1, edit2]);
    });

    it('does not add duplicate edits for the same rowId and field', () => {
      const edit = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };

      useRealtimeStore.getState().addActiveEdit(edit);
      useRealtimeStore.getState().addActiveEdit(edit);

      expect(useRealtimeStore.getState().activeEdits).toHaveLength(1);
    });
  });

  describe('removeActiveEdit', () => {
    it('removes an active edit by rowId and field', () => {
      const edit = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };
      useRealtimeStore.getState().addActiveEdit(edit);

      useRealtimeStore.getState().removeActiveEdit(1, 'measureStatus');

      expect(useRealtimeStore.getState().activeEdits).toEqual([]);
    });

    it('only removes the matching edit', () => {
      const edit1 = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };
      const edit2 = { rowId: 2, field: 'notes', userName: 'Nurse Jones' };
      useRealtimeStore.getState().addActiveEdit(edit1);
      useRealtimeStore.getState().addActiveEdit(edit2);

      useRealtimeStore.getState().removeActiveEdit(1, 'measureStatus');

      expect(useRealtimeStore.getState().activeEdits).toEqual([edit2]);
    });

    it('does nothing if edit does not exist', () => {
      const edit = { rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' };
      useRealtimeStore.getState().addActiveEdit(edit);

      useRealtimeStore.getState().removeActiveEdit(99, 'notes');

      expect(useRealtimeStore.getState().activeEdits).toEqual([edit]);
    });
  });

  describe('clearActiveEdits', () => {
    it('clears all active edits', () => {
      useRealtimeStore.getState().addActiveEdit({ rowId: 1, field: 'measureStatus', userName: 'Dr. Smith' });
      useRealtimeStore.getState().addActiveEdit({ rowId: 2, field: 'notes', userName: 'Nurse Jones' });

      useRealtimeStore.getState().clearActiveEdits();

      expect(useRealtimeStore.getState().activeEdits).toEqual([]);
    });

    it('is safe to call when already empty', () => {
      useRealtimeStore.getState().clearActiveEdits();

      expect(useRealtimeStore.getState().activeEdits).toEqual([]);
    });
  });

  describe('setImportInProgress', () => {
    it('sets import in progress with importedBy', () => {
      useRealtimeStore.getState().setImportInProgress(true, 'Admin User');

      const state = useRealtimeStore.getState();
      expect(state.importInProgress).toBe(true);
      expect(state.importedBy).toBe('Admin User');
    });

    it('clears import state', () => {
      useRealtimeStore.getState().setImportInProgress(true, 'Admin User');
      useRealtimeStore.getState().setImportInProgress(false);

      const state = useRealtimeStore.getState();
      expect(state.importInProgress).toBe(false);
      expect(state.importedBy).toBeNull();
    });

    it('handles missing importedBy', () => {
      useRealtimeStore.getState().setImportInProgress(true);

      const state = useRealtimeStore.getState();
      expect(state.importInProgress).toBe(true);
      expect(state.importedBy).toBeNull();
    });
  });
});
