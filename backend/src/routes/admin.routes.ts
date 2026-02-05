import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { hashPassword, toAuthUser } from '../services/authService.js';
import { isSmtpConfigured, sendAdminPasswordResetNotification } from '../services/emailService.js';
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
  canHavePatients: z.boolean().optional(), // Only applicable for ADMIN role
});

const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().min(1, 'Display name is required').optional(),
  role: z.enum(['PHYSICIAN', 'STAFF', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  canHavePatients: z.boolean().optional(), // Only applicable for ADMIN role
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
        canHavePatients: true,
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
      canHavePatients: user.canHavePatients,
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
        canHavePatients: true,
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
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        canHavePatients: user.canHavePatients,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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

    const { email, password, displayName, role, canHavePatients } = parseResult.data;

    // Check for existing email
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw createError('Email already in use', 409, 'EMAIL_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Determine canHavePatients based on role:
    // - PHYSICIAN: always true
    // - STAFF: always false
    // - ADMIN: use provided value or default to false
    let resolvedCanHavePatients: boolean;
    if (role === 'PHYSICIAN') {
      resolvedCanHavePatients = true;
    } else if (role === 'STAFF') {
      resolvedCanHavePatients = false;
    } else {
      // ADMIN: use provided value or default to false
      resolvedCanHavePatients = canHavePatients ?? false;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: role as UserRole,
        canHavePatients: resolvedCanHavePatients,
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

    // Determine the final role (updated or existing)
    const finalRole = updates.role || existing.role;

    // Build the update data with role-enforced canHavePatients
    const updateData: Record<string, unknown> = { ...updates };

    // Enforce canHavePatients based on role:
    // - PHYSICIAN: always true (override any provided value)
    // - STAFF: always false (override any provided value)
    // - ADMIN: allow toggling via canHavePatients field
    if (finalRole === 'PHYSICIAN') {
      updateData.canHavePatients = true;
    } else if (finalRole === 'STAFF') {
      updateData.canHavePatients = false;
    } else if (finalRole === 'ADMIN' && updates.canHavePatients !== undefined) {
      updateData.canHavePatients = updates.canHavePatients;
    }
    // If ADMIN and canHavePatients not provided, leave it unchanged

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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

    // Send notification email to user (non-blocking)
    let emailSent = false;
    if (isSmtpConfigured()) {
      emailSent = await sendAdminPasswordResetNotification(
        user.email,
        req.user!.displayName
      );
    }

    res.json({
      success: true,
      message: 'Password reset successfully',
      emailSent,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/physicians
 * List all users who can have patients (for staff assignment dropdown)
 * Includes PHYSICIAN role and ADMIN users with canHavePatients=true
 */
router.get('/physicians', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const physicians = await prisma.user.findMany({
      where: {
        canHavePatients: true,
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        role: true,
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

    // Verify physician user exists and can have patients
    const physician = await prisma.user.findUnique({ where: { id: physicianId } });
    if (!physician || !physician.canHavePatients) {
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

/**
 * PATCH /api/admin/patients/bulk-assign
 * Bulk assign patients to a physician
 * Body: { patientIds: number[], ownerId: number | null }
 */
router.patch('/patients/bulk-assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { patientIds, ownerId } = req.body;

    // Validate patientIds
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      throw createError('patientIds must be a non-empty array', 400, 'VALIDATION_ERROR');
    }

    if (!patientIds.every((id: unknown) => typeof id === 'number' && Number.isInteger(id))) {
      throw createError('patientIds must be an array of integers', 400, 'VALIDATION_ERROR');
    }

    // Validate ownerId (can be null for unassigning)
    if (ownerId !== null) {
      if (typeof ownerId !== 'number' || !Number.isInteger(ownerId)) {
        throw createError('ownerId must be an integer or null', 400, 'VALIDATION_ERROR');
      }

      // Verify the target user exists and can have patients
      const targetUser = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, canHavePatients: true, isActive: true, displayName: true },
      });

      if (!targetUser) {
        throw createError('Target user not found', 404, 'USER_NOT_FOUND');
      }

      if (!targetUser.isActive) {
        throw createError('Target user is not active', 400, 'USER_INACTIVE');
      }

      if (!targetUser.canHavePatients) {
        throw createError('Target user cannot have patients assigned', 400, 'USER_CANNOT_HAVE_PATIENTS');
      }
    }

    // Update all patients
    const result = await prisma.patient.updateMany({
      where: { id: { in: patientIds } },
      data: { ownerId },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'BULK_ASSIGN_PATIENTS',
        entity: 'Patient',
        entityId: null,
        userId: req.user!.id,
        userEmail: req.user!.email,
        details: {
          patientIds,
          newOwnerId: ownerId,
          count: result.count,
        },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      data: {
        updated: result.count,
        newOwnerId: ownerId,
      },
      message: `Successfully ${ownerId ? 'assigned' : 'unassigned'} ${result.count} patient(s)`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/patients/unassigned
 * Get list of unassigned patients (for bulk assignment UI)
 */
router.get('/patients/unassigned', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { ownerId: null },
      select: {
        id: true,
        memberName: true,
        memberDob: true,
        memberTelephone: true,
        _count: {
          select: { measures: true },
        },
      },
      orderBy: { memberName: 'asc' },
    });

    res.json({
      success: true,
      data: patients.map((p) => ({
        id: p.id,
        memberName: p.memberName,
        memberDob: p.memberDob.toISOString().split('T')[0],
        memberTelephone: p.memberTelephone,
        measureCount: p._count.measures,
      })),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
