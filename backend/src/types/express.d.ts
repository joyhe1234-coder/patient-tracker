import { UserRole } from '@prisma/client';

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
        displayName: string;
        role: UserRole;
        isActive: boolean;
      };
    }
  }
}

export {};
