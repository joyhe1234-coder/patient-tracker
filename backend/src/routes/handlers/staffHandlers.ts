import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';
import { assignStaffSchema } from '../admin.routes.js';

/**
 * POST /api/admin/staff-assignments
 * Assign a staff member to a physician
 */
export async function createStaffAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const parseResult = assignStaffSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw createError(parseResult.error.errors[0].message, 400, 'VALIDATION_ERROR');
    }

    const { staffId, physicianId } = parseResult.data;

    // Verify staff user exists and has STAFF role
    const staff = await prisma.user.findUnique({ where: { id: staffId } });
    if (!staff || !staff.roles.includes('STAFF')) {
      throw createError('Staff user not found', 404, 'STAFF_NOT_FOUND');
    }

    // Verify physician user exists and has PHYSICIAN role
    const physician = await prisma.user.findUnique({ where: { id: physicianId } });
    if (!physician || !physician.roles.includes('PHYSICIAN')) {
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
}

/**
 * DELETE /api/admin/staff-assignments
 * Remove a staff assignment
 */
export async function deleteStaffAssignment(req: Request, res: Response, next: NextFunction) {
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
}

/**
 * GET /api/admin/physicians
 * List all users who can have patients (for staff assignment dropdown)
 * Returns users with PHYSICIAN in their roles array
 */
export async function listPhysicians(_req: Request, res: Response, next: NextFunction) {
  try {
    const physicians = await prisma.user.findMany({
      where: {
        roles: { has: 'PHYSICIAN' },
        isActive: true,
      },
      select: {
        id: true,
        displayName: true,
        roles: true,
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
}
