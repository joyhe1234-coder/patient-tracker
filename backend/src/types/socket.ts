// Socket.IO event type definitions for real-time collaborative editing
// Used by both socketManager and socketAuth to ensure type-safe event handling

// --- Payload Types ---

export interface GridRowPayload {
  id: number;
  patientId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  insuranceGroup: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
  measureStatus: string | null;
  statusDate: string | null;
  statusDatePrompt: string | null;
  tracking1: string | null;
  tracking2: string | null;
  dueDate: string | null;
  timeIntervalDays: number | null;
  notes: string | null;
  rowOrder: number;
  isDuplicate: boolean;
  hgba1cGoal: string | null;
  hgba1cGoalReachedYear: boolean;
  hgba1cDeclined: boolean;
  updatedAt: string;
}

export interface ImportStats {
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  bothKept: number;
}

export interface PresenceUser {
  id: number;
  displayName: string;
}

export interface ActiveEdit {
  rowId: number;
  field: string;
  userName: string;
  socketId: string;
}

// --- Socket.IO Event Maps ---

export interface ServerToClientEvents {
  'row:updated': (payload: { row: GridRowPayload; changedBy: string }) => void;
  'row:created': (payload: { row: GridRowPayload; changedBy: string }) => void;
  'row:deleted': (payload: { rowId: number; changedBy: string }) => void;
  'data:refresh': (payload: { reason: string }) => void;
  'import:started': (payload: { importedBy: string }) => void;
  'import:completed': (payload: { importedBy: string; stats: ImportStats }) => void;
  'editing:active': (payload: { rowId: number; field: string; userName: string }) => void;
  'editing:inactive': (payload: { rowId: number; field: string }) => void;
  'presence:update': (payload: { users: PresenceUser[] }) => void;
}

export interface ClientToServerEvents {
  'room:join': (payload: { physicianId: number | 'unassigned' }) => void;
  'room:leave': (payload: { physicianId: number | 'unassigned' }) => void;
  'editing:start': (payload: { rowId: number; field: string }) => void;
  'editing:stop': (payload: { rowId: number; field: string }) => void;
}

// --- Socket Data (attached to socket.data after auth) ---

export interface SocketData {
  userId: number;
  email: string;
  displayName: string;
  roles: string[];
  currentRoom: string | null;
}
