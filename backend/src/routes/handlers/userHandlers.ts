import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';
import { hashPassword, toAuthUser, sendTempPassword } from '../../services/authService.js';
import { isSmtpConfigured, sendAdminPasswordResetNotification } from '../../services/emailService.js';
import { UserRole } from '@prisma/client';
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  isValidRoleCombination,
} from '../admin.routes.js';

/**
 * GET /api/admin/users
 * List all users
 */
export async function listUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
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
        { displayName: 'asc' },
      ],
    });

    // Transform to include assignment arrays
    const transformedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles,
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
}

/**
 * GET /api/admin/users/:id
 * Get a specific user
 */
export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      select: {
        id: true,
        email: true,
        displayName: true,
        roles: true,
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
        roles: user.roles,
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
}

/**
 * POST /api/admin/users
 * Create a new user
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { email, password, displayName, roles } = parseResult.data;

    // Validate role combination
    if (!isValidRoleCombination(roles as UserRole[])) {
      throw createError(
        'Invalid role combination. STAFF cannot be combined with other roles.',
        400,
        'INVALID_ROLE_COMBINATION'
      );
    }

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
        roles: roles as UserRole[],
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
        details: { email, roles },
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
}

/**
 * PUT /api/admin/users/:id
 * Update a user
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
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

    // Prevent admin from changing their own roles
    if (req.user!.id === userId && updates.roles) {
      const existingRolesSorted = [...existing.roles].sort().join(',');
      const newRolesSorted = [...updates.roles].sort().join(',');
      if (existingRolesSorted !== newRolesSorted) {
        throw createError('You cannot change your own roles', 400, 'CANNOT_CHANGE_OWN_ROLE');
      }
    }

    // Validate role combination if roles are being updated
    if (updates.roles && !isValidRoleCombination(updates.roles as UserRole[])) {
      throw createError(
        'Invalid role combination. STAFF cannot be combined with other roles.',
        400,
        'INVALID_ROLE_COMBINATION'
      );
    }

    // Check for email conflicts
    if (updates.email && updates.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: updates.email } });
      if (emailConflict) {
        throw createError('Email already in use', 409, 'EMAIL_EXISTS');
      }
    }

    // Build the update data — spread preserves the Zod-validated shape
    const updateData = { ...updates };

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
    });

    // Log the action — cast to indexable for dynamic field access in audit log
    type Indexable = Record<string, unknown>;
    const changedFields = Object.keys(updates).map(k => ({
      field: k,
      old: (existing as Indexable)[k],
      new: (updates as Indexable)[k],
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
}

/**
 * DELETE /api/admin/users/:id
 * Soft delete (deactivate) a user
 * For PHYSICIAN: unassign their patients first
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction) {
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

    // If user has PHYSICIAN role, unassign their patients and remove staff assignments
    if (user.roles.includes('PHYSICIAN')) {
      await prisma.patient.updateMany({
        where: { ownerId: userId },
        data: { ownerId: null },
      });

      // Also remove staff assignments where this user is the physician
      await prisma.staffAssignment.deleteMany({
        where: { physicianId: userId },
      });
    }

    // If user has STAFF role, remove their assignments
    if (user.roles.includes('STAFF')) {
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
        details: { email: user.email, roles: user.roles },
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
}

/**
 * POST /api/admin/users/:id/reset-password
 * Reset a user's password
 */
export async function resetPassword(req: Request, res: Response, next: NextFunction) {
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
}

/**
 * POST /api/admin/users/:id/send-temp-password
 * Generate a temporary password, set mustChangePassword, and email if SMTP configured
 */
export async function sendTempPasswordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const result = await sendTempPassword(userId);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'SEND_TEMP_PASSWORD',
        entity: 'user',
        entityId: userId,
        details: { emailSent: result.emailSent, targetEmail: result.email },
        ipAddress: req.ip || req.socket.remoteAddress,
      },
    });

    res.json({
      success: true,
      data: {
        emailSent: result.emailSent,
        tempPassword: result.tempPassword,
      },
    });
  } catch (error) {
    next(error);
  }
}
