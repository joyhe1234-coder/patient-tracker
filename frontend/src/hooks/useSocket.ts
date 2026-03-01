// React hook for Socket.IO connection lifecycle management
// Connects on mount, disconnects on unmount, switches rooms on physician change

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useRealtimeStore } from '../stores/realtimeStore';
import * as socketService from '../services/socketService';
import type { GridRowPayload } from '../types/socket';

export interface UseSocketOptions {
  onRowUpdated: (row: GridRowPayload, changedBy: string) => void;
  onRowCreated: (row: GridRowPayload, changedBy: string) => void;
  onRowDeleted: (rowId: number, changedBy: string) => void;
  onDataRefresh: () => void;
}

export function useSocket(options: UseSocketOptions): void {
  const token = useAuthStore((s) => s.token);
  const selectedPhysicianId = useAuthStore((s) => s.selectedPhysicianId);

  const setConnectionStatus = useRealtimeStore((s) => s.setConnectionStatus);
  const setRoomUsers = useRealtimeStore((s) => s.setRoomUsers);
  const addActiveEdit = useRealtimeStore((s) => s.addActiveEdit);
  const removeActiveEdit = useRealtimeStore((s) => s.removeActiveEdit);
  const clearActiveEdits = useRealtimeStore((s) => s.clearActiveEdits);
  const setImportInProgress = useRealtimeStore((s) => s.setImportInProgress);

  // Track previous physician ID for room switching
  const prevPhysicianIdRef = useRef<number | null>(null);

  // Track whether we have been connected before (to distinguish reconnect from initial connect)
  const hasBeenConnectedRef = useRef(false);
  const wasDisconnectedRef = useRef(false);

  // Keep callbacks in refs to avoid reconnection on callback changes
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // selectedPhysicianId ref for use inside handleConnectionChange without adding it as a dependency
  const selectedPhysicianIdRef = useRef(selectedPhysicianId);
  selectedPhysicianIdRef.current = selectedPhysicianId;

  // Stable handler references
  const handleConnectionChange = useCallback(
    (status: socketService.ConnectionStatus) => {
      setConnectionStatus(status);
      if (status === 'disconnected' || status === 'offline') {
        clearActiveEdits();
        setRoomUsers([]);
        if (hasBeenConnectedRef.current) {
          wasDisconnectedRef.current = true;
        }
      }
      if (status === 'connected') {
        if (wasDisconnectedRef.current) {
          // This is a reconnection — re-join the physician room and refresh data
          const physicianId = selectedPhysicianIdRef.current;
          if (physicianId !== null) {
            socketService.joinRoom(physicianId);
          }
          optionsRef.current.onDataRefresh();
        }
        hasBeenConnectedRef.current = true;
        wasDisconnectedRef.current = false;
      }
    },
    [setConnectionStatus, clearActiveEdits, setRoomUsers]
  );

  // Connect/disconnect based on token
  useEffect(() => {
    if (!token) {
      socketService.disconnect();
      setConnectionStatus('disconnected');
      return;
    }

    socketService.connect(token, {
      onConnectionChange: handleConnectionChange,
      onRowUpdated: (payload) => {
        optionsRef.current.onRowUpdated(payload.row, payload.changedBy);
      },
      onRowCreated: (payload) => {
        optionsRef.current.onRowCreated(payload.row, payload.changedBy);
      },
      onRowDeleted: (payload) => {
        optionsRef.current.onRowDeleted(payload.rowId, payload.changedBy);
      },
      onDataRefresh: () => {
        optionsRef.current.onDataRefresh();
      },
      onImportStarted: (payload) => {
        setImportInProgress(true, payload.importedBy);
      },
      onImportCompleted: () => {
        setImportInProgress(false);
        optionsRef.current.onDataRefresh();
      },
      onEditingActive: (payload) => {
        addActiveEdit({
          rowId: payload.rowId,
          field: payload.field,
          userName: payload.userName,
        });
      },
      onEditingInactive: (payload) => {
        removeActiveEdit(payload.rowId, payload.field);
      },
      onPresenceUpdate: (payload) => {
        // Filter out the current user — only show *other* users online
        const currentUserId = useAuthStore.getState().user?.id;
        const others = payload.users.filter((u: { id: number }) => u.id !== currentUserId);
        setRoomUsers(others);
      },
    });

    return () => {
      socketService.disconnect();
      setConnectionStatus('disconnected');
      clearActiveEdits();
      setRoomUsers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Room join/leave based on selectedPhysicianId
  useEffect(() => {
    const prevId = prevPhysicianIdRef.current;

    // Leave previous room if we had one
    if (prevId !== null && prevId !== selectedPhysicianId) {
      socketService.leaveRoom(prevId);
      clearActiveEdits();
    }

    // Join new room
    if (selectedPhysicianId !== null) {
      socketService.joinRoom(selectedPhysicianId);
    }

    prevPhysicianIdRef.current = selectedPhysicianId;
  }, [selectedPhysicianId, clearActiveEdits]);
}
