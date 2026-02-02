import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { hashPassword, toAuthUser } from '../services/authService.js';
import { UserRole } from '@prisma/client';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['PHYSICIAN', 'STAFF', 'ADMIN']),
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().min(1, 'Display name is required').optional(),
  role: z.enum(['PHYSICIAN', 'STAFF', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
});

const assignStaffSchema = z.object({
  staffId: z.number().int().positive(),
  physicianId: z.number().int().positive(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        assignedPhysicians: {
          include: {
            physician: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        assignedStaff: {
          include: {
            staff: {
              select: {
                id: true,
                displayName: true,
              },
            },
          },
        },
        _count: {
          select: {
            patients: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { displayName: 'asc' },
      ],
    });

    // Transform to include assignment arrays
    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      patientCount: user._count.patients,
      // For STAFF: list of physicians they're assigned to
      assignedPhysicians: user.assignedPhysicians.map((a) => ({
        physicianId: a.physician.id,
        physicianName: a.physician.displayName,
      })),
      // For PHYSICIAN: list of staff assigned to them
      assignedStaff: user.assignedStaff.map((a) => ({
        staffId: a.staff.id,
        staffName: a.staff.displayName,
      })),
    }));

    res.json({
      success: true,
      data: transformedUsers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        assignedPhysicians: {
          include: {
            physician: {
              select: { id: true, displayName: true },
            },
          },
        },
        assignedStaff: {
          include: {
            staff: {
              select: { id: true, displayName: true },
            },
          },
        },
        _count: {
          select: { patients: true },
        },
      },
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        ...user,
        patientCount: user._count.patients,
        assignedPhysicians: user.assignedPhysicians.map((a) => ({
          physicianId: a.physician.id,
          physicianName: a.physician.displayName,
        })),
        assignedStaff: user.assignedStaff.map((a) => ({
          staffId: a.staff.id,
          staffName: a.staff.displayName,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password, displayName, role } = parseResult.data;

    // Check for existing email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw createError('Email already in use', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: role as UserRole,
        isActive: true,
      },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'CREATE',
        entity: 'user',
        entityId: user.id,
        details: { email, role },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.status(201).json({
      success: true,
      data: toAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id
 * Update a user
 */
router.put('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const updates = parseResult.data;

    // Check user exists
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent admin from changing their own role
    if (req.user!.id === userId && updates.role && updates.role !== existing.role) {
      throw createError('You cannot change your own role', 400, 'CANNOT_CHANGE_OWN_ROLE');
    }

    // Check for email conflicts
    if (updates.email && updates.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: updates.email } });
      if (emailConflict) {
        throw createError('Email already in use', 409, 'EMAIL_EXISTS');
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updates,
    });

    // Log the action
    const changedFields = Object.keys(updates).map(k => ({
      field: k,
      old: (existing as Record<string, unknown>)[k],
      new: (updates as Record<string, unknown>)[k],
    }));
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'UPDATE',
        entity: 'user',
        entityId: user.id,
        changes: { fields: changedFields } as object,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      data: toAuthUser(user),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Soft delete (deactivate) a user
 * For PHYSICIAN: unassign their patients first
 */
router.delete('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Prevent deleting yourself
    if (req.user!.id === userId) {
      throw createError('You cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
    }

    // If PHYSICIAN, unassign their patients
    if (user.role === 'PHYSICIAN') {
      await prisma.patient.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null },
      });

      // Also remove staff assignments
      await prisma.staffAssignment.deleteMany({
        where: { physicianId: userId },
      });
    }

    // If STAFF, remove their assignments
    if (user.role === 'STAFF') {
      await prisma.staffAssignment.deleteMany({
        where: { staffId: userId },
      });
    }

    // Soft delete by setting isActive = false
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'DELETE',
        entity: 'user',
        entityId: userId,
        details: { email: user.email, role: user.role },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Reset a user's password
 */
router.post('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { newPassword } = parseResult.data;

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Hash and update password
    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'PASSWORD_RESET',
        entity: 'user',
        entityId: userId,
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/physicians
 * List all physicians (for staff assignment dropdown)
 */
router.get('/physicians', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const physicians = await prisma.user.findMany({
      where: {
        role: 'PHYSICIAN',
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
      },
      orderBy: { displayName: 'asc' },
    });

    res.json({
      success: true,
      data: physicians,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/staff-assignments
 * Assign a staff member to a physician
 */
router.post('/staff-assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = assignStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { staffId, physicianId } = parseResult.data;

    // Verify staff user exists and is STAFF role
    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || staff.role !== 'STAFF') {
      throw createError('Staff user not found', 404, 'STAFF_NOT_FOUND');
    }

    // Verify physician user exists and is PHYSICIAN role
    const physician = await prisma.user.findUnique({ where: { id: physicianId } });
    if (!physician || physician.role !== 'PHYSICIAN') {
      throw createError('Physician user not found', 404, 'PHYSICIAN_NOT_FOUND');
    }

    // Create assignment (upsert to avoid duplicates)
    const assignment = await prisma.staffAssignment.upsert({
      where: {
        staffId_physicianId: { staffId, physicianId },
      },
      create: { staffId, physicianId },
      update: {},
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/staff-assignments
 * Remove a staff assignment
 */
router.delete('/staff-assignments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = assignStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { staffId, physicianId } = parseResult.data;

    await prisma.staffAssignment.delete({
      where: {
        staffId_physicianId: { staffId, physicianId },
      },
    });

    res.json({
      success: true,
      message: 'Assignment removed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit-log
 * Get audit log entries with pagination and filters
 */
router.get('/audit-log', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = parseInt(userId as string, 10);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate as string);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate as string);
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        entries: entries.map((e) => ({
          ...e,
          userDisplayName: e.user?.displayName || e.userEmail || 'Unknown',
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
