import { UserRole } from '@prisma/client';

// Extend Express Request to include authenticated user and socket ID
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        displayName: string;
        roles: UserRole[];
        isActive: boolean;
      };
      /** Socket.IO socket ID from X-Socket-ID header, used to exclude the originating socket from broadcasts */
      socketId?: string;
    }
  }
}

export {};
