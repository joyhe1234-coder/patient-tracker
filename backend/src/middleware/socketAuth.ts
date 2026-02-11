import { Socket } from 'socket.io';
import { verifyToken, findUserById } from '../services/authService.js';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  SocketData,
} from '../types/socket.js';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

/**
 * Socket.IO authentication middleware.
 * Verifies JWT from socket.handshake.auth.token, looks up the user,
 * and attaches user data to socket.data.
 *
 * Follows the same verification logic as backend/src/middleware/auth.ts (requireAuth).
 */
export async function socketAuthMiddleware(
  socket: TypedSocket,
  next: (err?: Error) => void,
): Promise<void> {
  try {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('Authentication failed: no token provided'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Authentication failed: invalid or expired token'));
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return next(new Error('Authentication failed: user not found'));
    }

    if (!user.isActive) {
      return next(new Error('Authentication failed: user account is deactivated'));
    }

    // Attach user data to socket.data (available for the lifetime of the connection)
    socket.data.userId = user.id;
    socket.data.email = user.email;
    socket.data.displayName = user.displayName;
    socket.data.roles = user.roles;
    socket.data.currentRoom = null;

    next();
  } catch {
    next(new Error('Authentication failed'));
  }
}
