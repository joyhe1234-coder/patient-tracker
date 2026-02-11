// Realtime state store for Socket.IO connection, presence, and active edits
// Follows authStore pattern — no persist needed (ephemeral state)

import { create } from 'zustand';
import type { ConnectionStatus } from '../services/socketService';
import type { PresenceUser } from '../types/socket';

// Active edit tracked in the store (no socketId needed on frontend)
export interface ActiveEdit {
  rowId: number;
  field: string;
  userName: string;
}

// Realtime state interface
interface RealtimeState {
  // Connection
  connectionStatus: ConnectionStatus;

  // Presence
  roomUsers: PresenceUser[];

  // Active edits by other users
  activeEdits: ActiveEdit[];

  // Import state
  importInProgress: boolean;
  importedBy: string | null;

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => void;
  setRoomUsers: (users: PresenceUser[]) => void;
  addActiveEdit: (edit: ActiveEdit) => void;
  removeActiveEdit: (rowId: number, field: string) => void;
  clearActiveEdits: () => void;
  setImportInProgress: (inProgress: boolean, importedBy?: string) => void;
}

export const useRealtimeStore = create<RealtimeState>()((set) => ({
  // Initial state
  connectionStatus: 'disconnected',
  roomUsers: [],
  activeEdits: [],
  importInProgress: false,
  importedBy: null,

  // Actions
  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  setRoomUsers: (users: PresenceUser[]) => {
    set({ roomUsers: users });
  },

  addActiveEdit: (edit: ActiveEdit) => {
    set((state) => {
      // Avoid duplicates
      const exists = state.activeEdits.some(
        (e) => e.rowId === edit.rowId && e.field === edit.field
      );
      if (exists) return state;
      return { activeEdits: [...state.activeEdits, edit] };
    });
  },

  removeActiveEdit: (rowId: number, field: string) => {
    set((state) => ({
      activeEdits: state.activeEdits.filter(
        (e) => !(e.rowId === rowId && e.field === field)
      ),
    }));
  },

  clearActiveEdits: () => {
    set({ activeEdits: [] });
  },

  setImportInProgress: (inProgress: boolean, importedBy?: string) => {
    set({
      importInProgress: inProgress,
      importedBy: inProgress ? (importedBy ?? null) : null,
    });
  },
}));
