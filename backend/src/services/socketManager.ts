import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
  PresenceUser,
  ActiveEdit,
} from '../types/socket.js';
import { socketAuthMiddleware } from '../middleware/socketAuth.js';
import { isStaffAssignedToPhysician } from './authService.js';
import { logger } from '../utils/logger.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

// Module-level singleton
let io: SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null = null;

// In-memory presence tracking: roomName → Set of SocketData entries (keyed by socketId)
const roomPresence = new Map<string, Map<string, SocketData>>();

// In-memory active edit tracking: roomName → list of active edits
const roomEdits = new Map<string, ActiveEdit[]>();

/**
 * Initialize Socket.IO server and attach it to the existing HTTP server.
 * Uses the same CORS configuration as the Express app.
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> {
  if (io) {
    return io;
  }

  const corsOrigins = process.env.NODE_ENV === 'production'
    ? process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : true
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  // Authenticate every connection using JWT (same as HTTP auth)
  io.use(socketAuthMiddleware);

  // Wire connection handlers
  io.on('connection', (socket: TypedSocket) => {
    logger.debug(`[socket] connected: ${socket.data.email} (${socket.id})`);

    socket.on('room:join', async (payload) => {
      try {
        await handleRoomJoin(socket, payload.physicianId);
      } catch (err) {
        logger.error(`[socket] room:join error for ${socket.data.email}`, { error: String(err) });
      }
    });

    socket.on('room:leave', (payload) => {
      handleRoomLeave(socket, payload.physicianId);
    });

    socket.on('editing:start', (payload) => {
      handleEditingStart(socket, payload.rowId, payload.field);
    });

    socket.on('editing:stop', (payload) => {
      handleEditingStop(socket, payload.rowId, payload.field);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });

  return io;
}

// --- Connection Event Handlers ---

/**
 * Handle room:join — verify authorization then join the Socket.IO room.
 * Authorization follows the same rules as data.routes.ts:
 *  - ADMIN: can join any room
 *  - PHYSICIAN: can only join their own room (physicianId === userId)
 *  - STAFF: can only join rooms for physicians they are assigned to
 */
async function handleRoomJoin(socket: TypedSocket, physicianId: number | 'unassigned'): Promise<void> {
  const room = getRoomName(physicianId);
  const { userId, roles } = socket.data;

  // Authorization check for non-unassigned rooms
  if (physicianId !== 'unassigned') {
    const isAdmin = roles.includes('ADMIN');
    const isOwnRoom = roles.includes('PHYSICIAN') && physicianId === userId;
    const isAssignedStaff = roles.includes('STAFF')
      ? await isStaffAssignedToPhysician(userId, physicianId)
      : false;

    if (!isAdmin && !isOwnRoom && !isAssignedStaff) {
      logger.warn(`[socket] unauthorized room:join`, { email: socket.data.email, physicianId });
      return;
    }
  }

  // Leave current room first (if any)
  if (socket.data.currentRoom && socket.data.currentRoom !== room) {
    handleRoomLeave(socket, socket.data.currentRoom);
  }

  // Join the new room
  await socket.join(room);
  socket.data.currentRoom = room;
  addUserToRoom(room, socket.id, socket.data);
  broadcastPresenceUpdate(room);

  logger.debug(`[socket] ${socket.data.email} joined room ${room}`);
}

/**
 * Handle room:leave — leave the Socket.IO room and clean up.
 */
function handleRoomLeave(socket: TypedSocket, physicianIdOrRoom: number | 'unassigned' | string): void {
  // Accept either a physicianId (from client event) or a room name (from internal calls)
  const room = typeof physicianIdOrRoom === 'string' && physicianIdOrRoom.startsWith('physician:')
    ? physicianIdOrRoom
    : getRoomName(physicianIdOrRoom as number | 'unassigned');

  socket.leave(room);
  removeUserFromRoom(room, socket.id);

  if (socket.data.currentRoom === room) {
    socket.data.currentRoom = null;
  }

  broadcastPresenceUpdate(room);
  logger.debug(`[socket] ${socket.data.email} left room ${room}`);
}

/**
 * Handle editing:start — record the active edit and broadcast to the room.
 */
function handleEditingStart(socket: TypedSocket, rowId: number, field: string): void {
  const room = socket.data.currentRoom;
  if (!room) return;

  addActiveEdit(room, rowId, field, socket.data.displayName, socket.id);
  broadcastToRoom(room, 'editing:active', { rowId, field, userName: socket.data.displayName }, socket.id);
}

/**
 * Handle editing:stop — remove the active edit and broadcast to the room.
 */
function handleEditingStop(socket: TypedSocket, rowId: number, field: string): void {
  const room = socket.data.currentRoom;
  if (!room) return;

  removeActiveEdit(room, rowId, field);
  broadcastToRoom(room, 'editing:inactive', { rowId, field }, socket.id);
}

/**
 * Handle disconnect — clean up all presence and active edits for the socket.
 */
function handleDisconnect(socket: TypedSocket): void {
  logger.debug(`[socket] disconnected: ${socket.data.email} (${socket.id})`);

  // Clean up active edits and broadcast editing:inactive for each
  const clearedEdits = clearEditsForSocket(socket.id);
  for (const edit of clearedEdits) {
    broadcastToRoom(edit.room, 'editing:inactive', { rowId: edit.rowId, field: edit.field });
  }

  // Clean up presence from all rooms and broadcast updates
  const affectedRooms = removeUserFromAllRooms(socket.id);
  for (const room of affectedRooms) {
    broadcastPresenceUpdate(room);
  }
}

/**
 * Retrieve the Socket.IO server instance.
 * Returns null if initializeSocketIO has not been called yet.
 */
export function getIO(): SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData> | null {
  return io;
}

/**
 * Format a room name for a physician's data scope.
 * Rooms isolate Socket.IO events to users viewing the same physician's patients.
 */
export function getRoomName(physicianId: number | 'unassigned'): string {
  return `physician:${physicianId}`;
}

// --- Presence Tracking ---

/**
 * Add a user to a room's presence list.
 * Called when a socket joins a physician room.
 */
export function addUserToRoom(room: string, socketId: string, userData: SocketData): void {
  if (!roomPresence.has(room)) {
    roomPresence.set(room, new Map());
  }
  roomPresence.get(room)!.set(socketId, userData);
}

/**
 * Remove a user from a room's presence list.
 * Called when a socket leaves a room or disconnects.
 */
export function removeUserFromRoom(room: string, socketId: string): void {
  const roomUsers = roomPresence.get(room);
  if (!roomUsers) return;
  roomUsers.delete(socketId);
  if (roomUsers.size === 0) {
    roomPresence.delete(room);
  }
}

/**
 * Remove a socket from all rooms (used on disconnect).
 * Returns the rooms the socket was in, so callers can broadcast presence updates.
 */
export function removeUserFromAllRooms(socketId: string): string[] {
  const affectedRooms: string[] = [];
  for (const [room, users] of roomPresence) {
    if (users.has(socketId)) {
      users.delete(socketId);
      affectedRooms.push(room);
      if (users.size === 0) {
        roomPresence.delete(room);
      }
    }
  }
  return affectedRooms;
}

/**
 * Get the list of unique users present in a room.
 * Deduplicates by userId (a user may have multiple tabs/sockets).
 */
export function getPresenceForRoom(room: string): PresenceUser[] {
  const roomUsers = roomPresence.get(room);
  if (!roomUsers) return [];

  const seen = new Set<number>();
  const users: PresenceUser[] = [];
  for (const userData of roomUsers.values()) {
    if (!seen.has(userData.userId)) {
      seen.add(userData.userId);
      users.push({ id: userData.userId, displayName: userData.displayName });
    }
  }
  return users;
}

/**
 * Broadcast a presence:update event to all sockets in a room.
 * Called after any join/leave to keep all clients in sync.
 */
export function broadcastPresenceUpdate(room: string): void {
  if (!io) return;
  const users = getPresenceForRoom(room);
  io.to(room).emit('presence:update', { users });
}

// --- Broadcast Helpers ---

/**
 * Broadcast an event to all sockets in a room, optionally excluding a specific socket.
 * Used by route handlers to notify other users of data changes.
 *
 * Type safety is enforced at call sites via the ServerToClientEvents map —
 * callers use typed wrapper functions (e.g., broadcastRowUpdated) or cast manually.
 */
export function broadcastToRoom(
  room: string,
  event: keyof ServerToClientEvents,
  data: unknown,
  excludeSocketId?: string,
): void {
  if (!io) return;
  const target = excludeSocketId ? io.to(room).except(excludeSocketId) : io.to(room);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target as any).emit(event, data);
}

/**
 * Emit an event to a specific socket by ID.
 * Used for targeted messages (e.g., sending conflict info back to the saving user).
 */
export function emitToSocket(
  socketId: string,
  event: keyof ServerToClientEvents,
  data: unknown,
): void {
  if (!io) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (io.to(socketId) as any).emit(event, data);
}

// --- Active Edit Tracking ---

/**
 * Record that a user has started editing a cell.
 * If a different user is already editing this cell, the new edit replaces it.
 */
export function addActiveEdit(room: string, rowId: number, field: string, userName: string, socketId: string): void {
  if (!roomEdits.has(room)) {
    roomEdits.set(room, []);
  }
  const edits = roomEdits.get(room)!;
  // Remove any existing edit for the same row+field (only one editor per cell)
  const idx = edits.findIndex(e => e.rowId === rowId && e.field === field);
  if (idx !== -1) {
    edits.splice(idx, 1);
  }
  edits.push({ rowId, field, userName, socketId });
}

/**
 * Record that editing of a cell has stopped.
 */
export function removeActiveEdit(room: string, rowId: number, field: string): void {
  const edits = roomEdits.get(room);
  if (!edits) return;
  const idx = edits.findIndex(e => e.rowId === rowId && e.field === field);
  if (idx !== -1) {
    edits.splice(idx, 1);
  }
  if (edits.length === 0) {
    roomEdits.delete(room);
  }
}

/**
 * Remove all active edits for a specific socket (used on disconnect).
 * Returns affected rooms and the edits that were removed, so callers can broadcast editing:inactive.
 */
export function clearEditsForSocket(socketId: string): Array<{ room: string; rowId: number; field: string }> {
  const cleared: Array<{ room: string; rowId: number; field: string }> = [];
  for (const [room, edits] of roomEdits) {
    for (let i = edits.length - 1; i >= 0; i--) {
      if (edits[i].socketId === socketId) {
        cleared.push({ room, rowId: edits[i].rowId, field: edits[i].field });
        edits.splice(i, 1);
      }
    }
    if (edits.length === 0) {
      roomEdits.delete(room);
    }
  }
  return cleared;
}

/**
 * Get all active edits in a room.
 */
export function getActiveEditsForRoom(room: string): ActiveEdit[] {
  return roomEdits.get(room) || [];
}
