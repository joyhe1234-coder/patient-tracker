import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';

/**
 * PATCH /api/admin/patients/bulk-assign
 * Bulk assign patients to a physician
 * Body: { patientIds: number[], ownerId: number | null }
 */
export async function bulkAssignPatients(req: Request, res: Response, next: NextFunction) {
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

      // Verify the target user exists and has PHYSICIAN role
      const targetUser = await prisma.user.findUnique({
        where: { id: ownerId },
        select: { id: true, roles: true, isActive: true, displayName: true },
      });

      if (!targetUser) {
        throw createError('Target user not found', 404, 'USER_NOT_FOUND');
      }

      if (!targetUser.isActive) {
        throw createError('Target user is not active', 400, 'USER_INACTIVE');
      }

      if (!targetUser.roles.includes('PHYSICIAN')) {
        throw createError('Target user cannot have patients assigned', 400, 'USER_CANNOT_HAVE_PATIENTS');
      }
    }

    // Update all patients and create audit log atomically
    const { result, auditEntry } = await prisma.$transaction(async (tx) => {
      const result = await tx.patient.updateMany({
        where: { id: { in: patientIds } },
        data: { ownerId },
      });

      const auditEntry = await tx.auditLog.create({
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

      return { result, auditEntry };
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
}

/**
 * GET /api/admin/patients/unassigned
 * Get list of unassigned patients (for bulk assignment UI)
 */
export async function getUnassignedPatients(req: Request, res: Response, next: NextFunction) {
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
}
