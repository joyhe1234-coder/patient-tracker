import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';
import { updateDuplicateFlags } from '../../services/duplicateDetector.js';
import { toGridRowPayload } from '../../services/versionCheck.js';
import { broadcastToRoom, getRoomName } from '../../services/socketManager.js';
import { getPatientOwnerId } from '../data.routes.js';

/**
 * POST /api/data/check-duplicate
 * Check if a duplicate would be created.
 * Duplicate = same patient (name + DOB) + requestType + qualityMeasure
 * Skip check if requestType or qualityMeasure is null/empty
 */
export async function checkDuplicate(req: Request, res: Response, next: NextFunction) {
  try {
    const { memberName, memberDob, requestType, qualityMeasure } = req.body;

    // Skip duplicate check if required patient fields are missing
    if (!memberName || !memberDob) {
      return res.json({
        success: true,
        data: { isDuplicate: false, existingCount: 0 },
      });
    }

    // Skip duplicate check if requestType or qualityMeasure is null/empty
    const isNullOrEmpty = (value: string | null | undefined) => !value || value.trim() === '';
    if (isNullOrEmpty(requestType) || isNullOrEmpty(qualityMeasure)) {
      return res.json({
        success: true,
        data: { isDuplicate: false, existingCount: 0 },
      });
    }

    // Find patient by name and DOB
    const patient = await prisma.patient.findUnique({
      where: {
        memberName_memberDob: {
          memberName,
          memberDob: new Date(memberDob),
        },
      },
    });

    if (!patient) {
      return res.json({
        success: true,
        data: { isDuplicate: false, existingCount: 0 },
      });
    }

    // Check for existing measures with same patient + requestType + qualityMeasure
    const existingMeasures = await prisma.patientMeasure.findMany({
      where: {
        patientId: patient.id,
        requestType,
        qualityMeasure,
      },
    });

    res.json({
      success: true,
      data: {
        isDuplicate: existingMeasures.length > 0,
        existingCount: existingMeasures.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/data/duplicate
 * Duplicate a row with patient data only
 */
export async function duplicateRow(req: Request, res: Response, next: NextFunction) {
  try {
    const { sourceRowId } = req.body;

    if (!sourceRowId) {
      throw createError('Missing required field: sourceRowId', 400, 'VALIDATION_ERROR');
    }

    // Get the owner ID the user has access to
    const ownerId = await getPatientOwnerId(req);

    // 1. Fetch source row with patient data
    const sourceRow = await prisma.patientMeasure.findUnique({
      where: { id: sourceRowId },
      include: { patient: true },
    });

    if (!sourceRow) {
      throw createError('Source row not found', 404, 'NOT_FOUND');
    }

    // Verify the patient belongs to the user's scope
    if (sourceRow.patient.ownerId !== ownerId) {
      throw createError('You do not have permission to duplicate this row', 403, 'FORBIDDEN');
    }

    // 2. Get the rowOrder of source row
    const sourceRowOrder = sourceRow.rowOrder;

    // 3. Shift rows below source down (only for this owner's patients)
    await prisma.patientMeasure.updateMany({
      where: {
        rowOrder: { gt: sourceRowOrder },
        patient: { ownerId },
      },
      data: { rowOrder: { increment: 1 } },
    });

    // 4. Create new measure with patient data only (all measure fields null)
    const newMeasure = await prisma.patientMeasure.create({
      data: {
        patientId: sourceRow.patientId,
        rowOrder: sourceRowOrder + 1, // Right below source
        // All measure fields left null
        requestType: null,
        qualityMeasure: null,
        measureStatus: null,
        statusDate: null,
        statusDatePrompt: null,
        tracking1: null,
        tracking2: null,
        tracking3: null,
        dueDate: null,
        timeIntervalDays: null,
        notes: null,
        isDuplicate: false, // New row with empty fields is not a duplicate
      },
      include: { patient: true },
    });

    // Emit row:created event via Socket.IO
    try {
      const room = getRoomName(ownerId ?? 'unassigned');
      const rowPayload = toGridRowPayload(newMeasure);
      broadcastToRoom(room, 'row:created', { row: rowPayload, changedBy: req.user!.displayName }, req.socketId);
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    // 5. Return flattened data (same format as create)
    res.status(201).json({
      success: true,
      data: {
        id: newMeasure.id,
        patientId: newMeasure.patientId,
        memberName: newMeasure.patient.memberName,
        memberDob: newMeasure.patient.memberDob,
        memberTelephone: newMeasure.patient.memberTelephone,
        memberAddress: newMeasure.patient.memberAddress,
        requestType: newMeasure.requestType,
        qualityMeasure: newMeasure.qualityMeasure,
        measureStatus: newMeasure.measureStatus,
        statusDate: newMeasure.statusDate,
        statusDatePrompt: newMeasure.statusDatePrompt,
        tracking1: newMeasure.tracking1,
        tracking2: newMeasure.tracking2,
        tracking3: newMeasure.tracking3,
        dueDate: newMeasure.dueDate,
        timeIntervalDays: newMeasure.timeIntervalDays,
        notes: newMeasure.notes,
        rowOrder: newMeasure.rowOrder,
        isDuplicate: newMeasure.isDuplicate,
      },
    });
  } catch (error) {
    next(error);
  }
}
