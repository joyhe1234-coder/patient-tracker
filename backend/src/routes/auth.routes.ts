import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  authenticateUser,
  verifyPassword,
  updatePassword,
  toAuthUser,
  findUserById,
  getStaffAssignments,
  getAllPhysicians,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { prisma } from '../config/database.js';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password } = parseResult.data;

    // Authenticate user
    const result = await authenticateUser(email, password);
    if (!result) {
      throw createError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Log the login
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        userEmail: result.user.email,
        action: 'LOGIN',
        entity: 'user',
        entityId: result.user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        assignments: result.assignments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Log out user (clear edit lock if held)
 */
router.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Release edit lock if held by this user
    await prisma.editLock.updateMany({
      where: {
        id: 1,
        lockedByEmail: user.email,
      },
      data: {
        lockedByEmail: null,
        lockedByDisplayName: null,
        lockedAt: null,
        lastActivity: null,
      },
    });

    // Log the logout
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'LOGOUT',
        entity: 'user',
        entityId: user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Get full user details from database
    const fullUser = await findUserById(user.id);
    if (!fullUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get staff assignments if user is STAFF, or all physicians if ADMIN
    let assignments;
    if (fullUser.role === 'STAFF') {
      assignments = await getStaffAssignments(fullUser.id);
    } else if (fullUser.role === 'ADMIN') {
      assignments = await getAllPhysicians();
    }

    res.json({
      success: true,
      data: {
        user: toAuthUser(fullUser),
        assignments,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/password
 * Change current user's password
 */
router.put('/password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // Validate request body
    const parseResult = changePasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { currentPassword, newPassword } = parseResult.data;

    // Get user with password hash
    const fullUser = await findUserById(user.id);
    if (!fullUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, fullUser.passwordHash);
    if (!isValidPassword) {
      throw createError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Check new password is different
    const isSamePassword = await verifyPassword(newPassword, fullUser.passwordHash);
    if (isSamePassword) {
      throw createError('New password must be different from current password', 400, 'SAME_PASSWORD');
    }

    // Update password
    await updatePassword(user.id, newPassword);

    // Log the password change
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_CHANGE',
        entity: 'user',
        entityId: user.id,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
