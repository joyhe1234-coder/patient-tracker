import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken, findUserById, toAuthUser } from '../services/authService.js';
import { createError } from './errorHandler.js';

/**
 * Middleware that requires a valid JWT token.
 * Attaches the user to req.user if valid.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      throw createError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    // Get user from database to ensure they still exist and are active
    const user = await findUserById(payload.userId);
    if (!user) {
      throw createError('User not found', 401, 'USER_NOT_FOUND');
    }

    if (!user.isActive) {
      throw createError('User account is deactivated', 401, 'USER_DEACTIVATED');
    }

    // Attach user to request (without sensitive data)
    const authUser = toAuthUser(user);
    req.user = {
      id: authUser.id,
      email: authUser.email,
      displayName: authUser.displayName,
      roles: authUser.roles,
      isActive: authUser.isActive,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware that requires specific roles.
 * Must be used after requireAuth.
 * User must have at least one of the allowed roles.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw createError('Authentication required', 401, 'UNAUTHORIZED');
      }

      // Check if user has ANY of the allowed roles
      const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
      if (!hasRole) {
        throw createError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}`,
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware that optionally attaches user if token is present.
 * Does not fail if no token or invalid token.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    if (!payload) {
      // Invalid token, continue without user
      return next();
    }

    const user = await findUserById(payload.userId);
    if (user && user.isActive) {
      const authUser = toAuthUser(user);
      req.user = {
        id: authUser.id,
        email: authUser.email,
        displayName: authUser.displayName,
        roles: authUser.roles,
        isActive: authUser.isActive,
      };
    }

    next();
  } catch {
    // Any error, just continue without user
    next();
  }
}

/**
 * Middleware that requires patient data access.
 * PHYSICIAN, STAFF, and ADMIN can all access patient data.
 * ADMIN can view any physician's patients (must specify physicianId).
 */
export function requirePatientDataAccess(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    if (!req.user) {
      throw createError('Authentication required', 401, 'UNAUTHORIZED');
    }

    // All roles can access patient data
    // Access control is handled by the data routes based on role
    next();
  } catch (error) {
    next(error);
  }
}
