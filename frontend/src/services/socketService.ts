// Socket.IO client service for real-time collaborative editing
// Singleton pattern: one socket connection per browser tab

import { io, Socket } from 'socket.io-client';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  GridRowPayload,
  PresenceUser,
  ImportStats,
} from '../types/socket';

// --- Types ---

export type ConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected'
  | 'offline';

export interface SocketServiceHandlers {
  onConnectionChange: (status: ConnectionStatus) => void;
  onRowUpdated: (payload: { row: GridRowPayload; changedBy: string }) => void;
  onRowCreated: (payload: { row: GridRowPayload; changedBy: string }) => void;
  onRowDeleted: (payload: { rowId: number; changedBy: string }) => void;
  onDataRefresh: (payload: { reason: string }) => void;
  onImportStarted: (payload: { importedBy: string }) => void;
  onImportCompleted: (payload: { importedBy: string; stats: ImportStats }) => void;
  onEditingActive: (payload: { rowId: number; field: string; userName: string }) => void;
  onEditingInactive: (payload: { rowId: number; field: string }) => void;
  onPresenceUpdate: (payload: { users: PresenceUser[] }) => void;
}

// --- Module-level singleton ---

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

// --- URL Derivation ---

export function getServerUrl(): string {
  // In production with VITE_API_URL, connect directly to the backend
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    const host = envUrl.includes('.') ? envUrl : `${envUrl}.onrender.com`;
    return `https://${host}`;
  }
  // In local dev / Docker, connect to the same origin (nginx proxies /socket.io)
  return window.location.origin;
}

// --- Connection Management ---

export function connect(token: string, handlers: SocketServiceHandlers): void {
  // Don't create multiple connections
  if (socket?.connected) {
    return;
  }

  // Clean up any existing socket
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  handlers.onConnectionChange('connecting');

  const serverUrl = getServerUrl();

  socket = io(serverUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    reconnectionAttempts: 10,
    timeout: 10000,
  });

  // --- Connection lifecycle events ---

  socket.on('connect', () => {
    handlers.onConnectionChange('connected');
  });

  socket.on('disconnect', () => {
    handlers.onConnectionChange('disconnected');
  });

  socket.io.on('reconnect_attempt', () => {
    handlers.onConnectionChange('reconnecting');
  });

  socket.io.on('reconnect', () => {
    handlers.onConnectionChange('connected');
  });

  socket.io.on('reconnect_failed', () => {
    handlers.onConnectionChange('offline');
  });

  socket.on('connect_error', (err) => {
    if (err.message === 'Authentication failed') {
      handlers.onConnectionChange('offline');
    } else {
      handlers.onConnectionChange('disconnected');
    }
  });

  // --- Server-to-client event listeners ---

  socket.on('row:updated', (payload) => {
    handlers.onRowUpdated(payload);
  });

  socket.on('row:created', (payload) => {
    handlers.onRowCreated(payload);
  });

  socket.on('row:deleted', (payload) => {
    handlers.onRowDeleted(payload);
  });

  socket.on('data:refresh', (payload) => {
    handlers.onDataRefresh(payload);
  });

  socket.on('import:started', (payload) => {
    handlers.onImportStarted(payload);
  });

  socket.on('import:completed', (payload) => {
    handlers.onImportCompleted(payload);
  });

  socket.on('editing:active', (payload) => {
    handlers.onEditingActive(payload);
  });

  socket.on('editing:inactive', (payload) => {
    handlers.onEditingInactive(payload);
  });

  socket.on('presence:update', (payload) => {
    handlers.onPresenceUpdate(payload);
  });
}

// --- Room Management ---

export function joinRoom(physicianId: number | 'unassigned'): void {
  if (socket?.connected) {
    socket.emit('room:join', { physicianId });
  }
}

export function leaveRoom(physicianId: number | 'unassigned'): void {
  if (socket?.connected) {
    socket.emit('room:leave', { physicianId });
  }
}

// --- Editing Event Emitters ---

export function emitEditingStart(rowId: number, field: string): void {
  if (socket?.connected) {
    socket.emit('editing:start', { rowId, field });
  }
}

export function emitEditingStop(rowId: number, field: string): void {
  if (socket?.connected) {
    socket.emit('editing:stop', { rowId, field });
  }
}

// --- Cleanup ---

export function disconnect(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

// --- Accessor ---

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  return socket;
}
