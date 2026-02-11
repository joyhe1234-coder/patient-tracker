import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to read the X-Socket-ID header from requests and attach it to req.socketId.
 * This allows route handlers to exclude the originating socket from Socket.IO broadcasts,
 * preventing the user who made the change from receiving their own update event.
 */
export function socketIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const socketId = req.headers['x-socket-id'] as string | undefined;
  if (socketId) {
    req.socketId = socketId;
  }
  next();
}
