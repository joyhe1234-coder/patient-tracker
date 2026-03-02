import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';
import { broadcastToRoom, getRoomName, getIO } from '../../services/socketManager.js';

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
    const { result, previousOwnerIds } = await prisma.$transaction(async (tx) => {
      // Query previous owners before the update (for Socket.IO broadcasts)
      const previousPatients = await tx.patient.findMany({
        where: { id: { in: patientIds } },
        select: { id: true, ownerId: true },
      });
      const previousOwnerIds = [...new Set(
        previousPatients.map(p => p.ownerId).filter((id): id is number => id !== null)
      )];

      const result = await tx.patient.updateMany({
        where: { id: { in: patientIds } },
        data: { ownerId },
      });

      await tx.auditLog.create({
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

      return { result, previousOwnerIds };
    });

    // Broadcast Socket.IO events to affected rooms
    const io = getIO();
    if (io) {
      // Broadcast to the new owner's room (assign) or unassigned room (unassign)
      if (ownerId) {
        broadcastToRoom(getRoomName(ownerId), 'data:refresh', { reason: 'bulk-assign' }, req.socketId);
      } else {
        broadcastToRoom(getRoomName('unassigned'), 'data:refresh', { reason: 'bulk-unassign' }, req.socketId);
      }

      // Broadcast to previous owners' rooms (patients may have been reassigned)
      for (const prevOwnerId of previousOwnerIds) {
        if (prevOwnerId !== ownerId) {
          broadcastToRoom(getRoomName(prevOwnerId), 'data:refresh', { reason: 'bulk-reassign' }, req.socketId);
        }
      }
    }

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

/**
 * GET /api/admin/patients
 * Get all patients (assigned and unassigned) with summary statistics.
 * Returns data shaped for the Bulk Operations tab.
 */
export async function getAllPatients(req: Request, res: Response, next: NextFunction) {
  try {
    const patients = await prisma.patient.findMany({
      select: {
        id: true,
        memberName: true,
        memberDob: true,
        memberTelephone: true,
        ownerId: true,
        insuranceGroup: true,
        updatedAt: true,
        owner: {
          select: { displayName: true },
        },
        measures: {
          select: {
            qualityMeasure: true,
            measureStatus: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        _count: {
          select: { measures: true },
        },
      },
      orderBy: { memberName: 'asc' },
    });

    // Compute summary counts
    const totalPatients = patients.length;
    const assignedCount = patients.filter(p => p.ownerId !== null).length;
    const unassignedCount = totalPatients - assignedCount;
    const insuranceSystems = new Set(
      patients.map(p => p.insuranceGroup).filter((g): g is string => g !== null)
    );
    const insuranceSystemCount = insuranceSystems.size;

    res.json({
      success: true,
      data: {
        patients: patients.map(p => ({
          id: p.id,
          memberName: p.memberName,
          memberDob: p.memberDob.toISOString().split('T')[0],
          memberTelephone: p.memberTelephone,
          ownerId: p.ownerId,
          ownerName: p.owner?.displayName ?? null,
          insuranceGroup: p.insuranceGroup,
          measureCount: p._count.measures,
          latestMeasure: p.measures.length > 0 ? p.measures[0].qualityMeasure : null,
          latestStatus: p.measures.length > 0 ? p.measures[0].measureStatus : null,
          updatedAt: p.updatedAt.toISOString(),
        })),
        summary: {
          totalPatients,
          assignedCount,
          unassignedCount,
          insuranceSystemCount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/patients/bulk-delete
 * Bulk delete patients (permanent hard delete).
 * Body: { patientIds: number[] }
 */
export async function bulkDeletePatients(req: Request, res: Response, next: NextFunction) {
  try {
    const { patientIds } = req.body;

    // Validate patientIds
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      throw createError('patientIds must be a non-empty array', 400, 'VALIDATION_ERROR');
    }

    if (!patientIds.every((id: unknown) => typeof id === 'number' && Number.isInteger(id))) {
      throw createError('patientIds must be an array of integers', 400, 'VALIDATION_ERROR');
    }

    if (patientIds.length > 5000) {
      throw createError('Cannot process more than 5,000 patients in a single operation', 400, 'PAYLOAD_TOO_LARGE');
    }

    // Query affected patients before deletion (for Socket.IO broadcasts)
    const affectedPatients = await prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { ownerId: true },
    });

    const affectedOwnerIds = [...new Set(
      affectedPatients.map(p => p.ownerId).filter((id): id is number => id !== null)
    )];
    const hasUnassigned = affectedPatients.some(p => p.ownerId === null);

    // Delete patients and create audit log atomically
    const result = await prisma.$transaction(async (tx) => {
      // PatientMeasure records cascade-delete automatically
      const deleteResult = await tx.patient.deleteMany({
        where: { id: { in: patientIds } },
      });

      await tx.auditLog.create({
        data: {
          action: 'BULK_DELETE_PATIENTS',
          entity: 'Patient',
          entityId: null,
          userId: req.user!.id,
          userEmail: req.user!.email,
          details: {
            patientIds,
            count: deleteResult.count,
          },
          ipAddress: req.ip || req.socket.remoteAddress,
        },
      });

      return deleteResult;
    });

    // Broadcast Socket.IO events to affected rooms
    const io = getIO();
    if (io) {
      for (const ownerId of affectedOwnerIds) {
        broadcastToRoom(
          getRoomName(ownerId),
          'data:refresh',
          { reason: 'bulk-delete' },
          req.socketId
        );
      }
      if (hasUnassigned) {
        broadcastToRoom(
          getRoomName('unassigned'),
          'data:refresh',
          { reason: 'bulk-delete' },
          req.socketId
        );
      }
    }

    res.json({
      success: true,
      data: { deleted: result.count },
      message: `Successfully deleted ${result.count} patient(s)`,
    });
  } catch (error) {
    next(error);
  }
}
