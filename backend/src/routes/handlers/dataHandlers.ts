import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { createError } from '../../middleware/errorHandler.js';
import { calculateDueDate } from '../../services/dueDateCalculator.js';
import { updateDuplicateFlags, checkForDuplicate } from '../../services/duplicateDetector.js';
import { resolveStatusDatePrompt, getDefaultDatePrompt } from '../../services/statusDatePromptResolver.js';
import { checkVersion, toGridRowPayload } from '../../services/versionCheck.js';
import { broadcastToRoom, getRoomName } from '../../services/socketManager.js';
import { getPatientOwnerFilter, getPatientOwnerId } from '../data.routes.js';

/**
 * GET /api/data
 * Get all patient measures (grid data)
 * PHYSICIAN: sees own patients (auto-filtered)
 * STAFF: sees selected physician's patients (requires physicianId query param)
 * ADMIN: sees selected physician's patients OR unassigned (physicianId=unassigned)
 */
export async function getPatientMeasures(req: Request, res: Response, next: NextFunction) {
  try {
    // Get the owner filter
    const { ownerId, isUnassigned } = await getPatientOwnerFilter(req);

    // Build the where clause - for unassigned, we need ownerId: null
    const ownerWhere = isUnassigned
      ? { ownerId: null }
      : { ownerId: ownerId };

    const measures = await prisma.patientMeasure.findMany({
      where: {
        patient: ownerWhere,
      },
      include: {
        patient: true,
      },
      orderBy: {
        rowOrder: 'asc',
      },
    });

    // Flatten the data for the grid
    const gridData = measures.map((measure) => ({
      id: measure.id,
      patientId: measure.patientId,
      memberName: measure.patient.memberName,
      memberDob: measure.patient.memberDob,
      memberTelephone: measure.patient.memberTelephone,
      memberAddress: measure.patient.memberAddress,
      requestType: measure.requestType,
      qualityMeasure: measure.qualityMeasure,
      measureStatus: measure.measureStatus,
      statusDate: measure.statusDate,
      statusDatePrompt: measure.statusDatePrompt,
      tracking1: measure.tracking1,
      tracking2: measure.tracking2,
      tracking3: measure.tracking3,
      dueDate: measure.dueDate,
      timeIntervalDays: measure.timeIntervalDays,
      notes: measure.notes,
      rowOrder: measure.rowOrder,
      isDuplicate: measure.isDuplicate,
      hgba1cGoal: measure.hgba1cGoal,
      hgba1cGoalReachedYear: measure.hgba1cGoalReachedYear,
      hgba1cDeclined: measure.hgba1cDeclined,
      createdAt: measure.createdAt,
      updatedAt: measure.updatedAt,
    }));

    res.json({
      success: true,
      data: gridData,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/data
 * Create new row
 */
export async function createPatientMeasure(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      memberName,
      memberDob,
      memberTelephone,
      memberAddress,
      requestType,
      qualityMeasure,
      measureStatus,
      statusDate,
      tracking1,
      tracking2,
      tracking3,
      notes,
    } = req.body;

    if (!memberName || !memberDob) {
      throw createError('Missing required fields (memberName, memberDob)', 400, 'VALIDATION_ERROR');
    }

    // Get the owner ID for the new patient
    const ownerId = await getPatientOwnerId(req);

    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: {
        memberName_memberDob: {
          memberName,
          memberDob: new Date(memberDob),
        },
      },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          memberName,
          memberDob: new Date(memberDob),
          memberTelephone: memberTelephone || null,
          memberAddress: memberAddress || null,
          ownerId, // Assign to the current user/physician
        },
      });
    } else if (patient.ownerId !== ownerId) {
      // Patient exists but belongs to different physician
      throw createError('This patient belongs to a different physician', 403, 'FORBIDDEN');
    }

    // Shift all existing rows for this owner down by incrementing their rowOrder
    await prisma.patientMeasure.updateMany({
      where: {
        patient: {
          ownerId,
        },
      },
      data: {
        rowOrder: { increment: 1 },
      },
    });

    // Parse status date
    const parsedStatusDate = statusDate ? new Date(statusDate) : null;
    // measureStatus is now nullable with no default
    const finalMeasureStatus = measureStatus || null;

    // Calculate due date and time interval
    const { dueDate, timeIntervalDays } = await calculateDueDate(
      parsedStatusDate,
      finalMeasureStatus,
      tracking1 || null,
      tracking2 || null
    );

    // Resolve status date prompt
    let statusDatePrompt = await resolveStatusDatePrompt(finalMeasureStatus, tracking1 || null);
    if (!statusDatePrompt) {
      statusDatePrompt = getDefaultDatePrompt(finalMeasureStatus);
    }

    // Check for duplicates before creating (same patient + requestType + qualityMeasure)
    const { isDuplicate } = await checkForDuplicate(patient.id, requestType, qualityMeasure);

    // Create patient measure
    const measure = await prisma.patientMeasure.create({
      data: {
        patientId: patient.id,
        requestType: requestType || null,
        qualityMeasure: qualityMeasure || null,
        measureStatus: finalMeasureStatus,
        statusDate: parsedStatusDate,
        statusDatePrompt,
        tracking1: tracking1 || null,
        tracking2: tracking2 || null,
        tracking3: tracking3 || null,
        dueDate,
        timeIntervalDays,
        notes: notes || null,
        rowOrder: 0, // New row is always first
        isDuplicate,
      },
      include: {
        patient: true,
      },
    });

    // Update duplicate flags for all measures for this patient
    await updateDuplicateFlags(patient.id);

    // Re-fetch measure to get updated isDuplicate flag
    const updatedMeasure = await prisma.patientMeasure.findUnique({
      where: { id: measure.id },
      include: { patient: true },
    });

    // Emit row:created event via Socket.IO
    try {
      const room = getRoomName(ownerId ?? 'unassigned');
      const rowPayload = toGridRowPayload(updatedMeasure!);
      broadcastToRoom(room, 'row:created', { row: rowPayload, changedBy: req.user!.displayName }, req.socketId);
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    // Return flattened data
    res.status(201).json({
      success: true,
      data: {
        id: updatedMeasure!.id,
        patientId: updatedMeasure!.patientId,
        memberName: updatedMeasure!.patient.memberName,
        memberDob: updatedMeasure!.patient.memberDob,
        memberTelephone: updatedMeasure!.patient.memberTelephone,
        memberAddress: updatedMeasure!.patient.memberAddress,
        requestType: updatedMeasure!.requestType,
        qualityMeasure: updatedMeasure!.qualityMeasure,
        measureStatus: updatedMeasure!.measureStatus,
        statusDate: updatedMeasure!.statusDate,
        statusDatePrompt: updatedMeasure!.statusDatePrompt,
        tracking1: updatedMeasure!.tracking1,
        tracking2: updatedMeasure!.tracking2,
        tracking3: updatedMeasure!.tracking3,
        dueDate: updatedMeasure!.dueDate,
        timeIntervalDays: updatedMeasure!.timeIntervalDays,
        notes: updatedMeasure!.notes,
        rowOrder: updatedMeasure!.rowOrder,
        isDuplicate: updatedMeasure!.isDuplicate,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/data/:id
 * Update row
 */
export async function updatePatientMeasure(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { expectedVersion, forceOverwrite } = updateData;

    // Get the owner ID the user has access to
    const ownerId = await getPatientOwnerId(req);

    // Get existing measure with patient
    const existing = await prisma.patientMeasure.findUnique({
      where: { id: parseInt(id, 10) },
      include: { patient: true },
    });

    if (!existing) {
      throw createError('Record not found', 404, 'NOT_FOUND');
    }

    // Verify the patient belongs to the user's scope
    if (existing.patient.ownerId !== ownerId) {
      throw createError('You do not have permission to modify this record', 403, 'FORBIDDEN');
    }

    // Separate patient fields from measure fields
    const patientFields = ['memberName', 'memberDob', 'memberTelephone', 'memberAddress'];
    const measureFields = [
      'requestType', 'qualityMeasure', 'measureStatus', 'statusDate',
      'statusDatePrompt', 'tracking1', 'tracking2', 'tracking3',
      'dueDate', 'timeIntervalDays', 'notes', 'rowOrder',
      'hgba1cGoal', 'hgba1cGoalReachedYear', 'hgba1cDeclined',
    ];

    // Fields that are NOT data fields (should not be included in version check)
    const metaFields = ['expectedVersion', 'forceOverwrite'];

    const patientUpdate: Record<string, unknown> = {};
    const measureUpdate: Record<string, unknown> = {};
    const incomingChangedFields: string[] = [];

    for (const [key, value] of Object.entries(updateData)) {
      if (metaFields.includes(key)) continue;
      if (patientFields.includes(key)) {
        if (key === 'memberDob' && value) {
          patientUpdate[key] = new Date(value as string);
        } else {
          patientUpdate[key] = value;
        }
        incomingChangedFields.push(key);
      } else if (measureFields.includes(key)) {
        if ((key === 'statusDate' || key === 'dueDate') && value) {
          measureUpdate[key] = new Date(value as string);
        } else {
          measureUpdate[key] = value;
        }
        incomingChangedFields.push(key);
      }
    }

    // Optimistic concurrency control: version check
    if (expectedVersion && forceOverwrite !== true) {
      const conflict = await checkVersion(
        parseInt(id, 10),
        expectedVersion,
        incomingChangedFields,
      );

      if (conflict.hasConflict) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'VERSION_CONFLICT',
            message: 'This record was modified by another user since you last loaded it.',
          },
          data: {
            serverRow: conflict.serverRow,
            conflictFields: conflict.conflictFields,
            changedBy: conflict.changedBy,
          },
        });
      }
    }

    // Update patient if needed
    if (Object.keys(patientUpdate).length > 0) {
      // Check if updating name or DOB would create a duplicate patient
      const newName = (patientUpdate.memberName as string) || existing.patient.memberName;
      const newDob = (patientUpdate.memberDob as Date) || existing.patient.memberDob;

      // Check if another patient exists with the same name + DOB
      const duplicatePatient = await prisma.patient.findFirst({
        where: {
          memberName: newName,
          memberDob: newDob,
          id: { not: existing.patientId }, // Exclude current patient
        },
      });

      if (duplicatePatient) {
        throw createError(
          `Cannot update: Another patient with the same name and date of birth already exists.`,
          400,
          'DUPLICATE_PATIENT'
        );
      }

      await prisma.patient.update({
        where: { id: existing.patientId },
        data: patientUpdate,
      });
    }

    // Determine final values for calculation (use updated value if provided, else existing)
    const finalStatusDate = measureUpdate.statusDate !== undefined
      ? measureUpdate.statusDate as Date | null
      : existing.statusDate;
    const finalMeasureStatus = (measureUpdate.measureStatus as string) || existing.measureStatus;
    const finalTracking1 = measureUpdate.tracking1 !== undefined
      ? measureUpdate.tracking1 as string | null
      : existing.tracking1;
    const finalTracking2 = measureUpdate.tracking2 !== undefined
      ? measureUpdate.tracking2 as string | null
      : existing.tracking2;

    // Check if timeIntervalDays was explicitly updated by user
    const timeIntervalExplicitlySet = 'timeIntervalDays' in updateData;

    // Statuses where interval is controlled by TIME PERIOD dropdown (NOT manually editable)
    // These have dropdowns like "In X Months", "X months", "Call every X wks"
    const TIME_PERIOD_DROPDOWN_STATUSES = [
      'Screening discussed',           // Tracking #1: In 1-11 Months
      'HgbA1c ordered',                // Tracking #2: 1-12 months
      'HgbA1c at goal',                // Tracking #2: 1-12 months
      'HgbA1c NOT at goal',            // Tracking #2: 1-12 months
      'Scheduled call back - BP not at goal',  // Tracking #1: Call every 1-8 wks
      'Scheduled call back - BP at goal',      // Tracking #1: Call every 1-8 wks
    ];

    // Check if due date related fields changed
    const dueDateFieldsChanged =
      'statusDate' in updateData ||
      'measureStatus' in updateData ||
      'tracking1' in updateData ||
      'tracking2' in updateData;

    // Check if interval edit should be allowed
    // Time period dropdown statuses cannot have interval manually edited
    const isTimePeriodDropdownStatus = TIME_PERIOD_DROPDOWN_STATUSES.includes(finalMeasureStatus || '');
    const canEditInterval = timeIntervalExplicitlySet && finalStatusDate && !isTimePeriodDropdownStatus;

    if (canEditInterval) {
      // User edited time interval - recalculate dueDate (manual override allowed)
      const interval = measureUpdate.timeIntervalDays as number;
      if (interval !== null && interval !== undefined) {
        const dueDate = new Date(finalStatusDate);
        dueDate.setUTCDate(dueDate.getUTCDate() + interval);
        measureUpdate.dueDate = dueDate;
      }
    } else if (dueDateFieldsChanged) {
      // Recalculate due date and time interval using normal rules
      const { dueDate, timeIntervalDays } = await calculateDueDate(
        finalStatusDate,
        finalMeasureStatus,
        finalTracking1,
        finalTracking2
      );
      measureUpdate.dueDate = dueDate;
      measureUpdate.timeIntervalDays = timeIntervalDays;
    }

    // Check if status date prompt related fields changed
    const promptFieldsChanged =
      'measureStatus' in updateData ||
      'tracking1' in updateData;

    if (promptFieldsChanged) {
      // Recalculate status date prompt
      let statusDatePrompt = await resolveStatusDatePrompt(finalMeasureStatus, finalTracking1);
      if (!statusDatePrompt) {
        statusDatePrompt = getDefaultDatePrompt(finalMeasureStatus);
      }
      measureUpdate.statusDatePrompt = statusDatePrompt;
    }

    // Check for duplicates if requestType or qualityMeasure changed
    const duplicateFieldsChanging =
      'requestType' in updateData ||
      'qualityMeasure' in updateData;

    if (duplicateFieldsChanging) {
      // Determine final values for duplicate check
      const finalRequestType = measureUpdate.requestType !== undefined
        ? measureUpdate.requestType as string | null
        : existing.requestType;
      const finalQualityMeasure = measureUpdate.qualityMeasure !== undefined
        ? measureUpdate.qualityMeasure as string | null
        : existing.qualityMeasure;

      // Check if this would create a duplicate (exclude current row from check)
      const { isDuplicate } = await checkForDuplicate(
        existing.patientId,
        finalRequestType,
        finalQualityMeasure,
        existing.id // Exclude current row from duplicate check
      );

      if (isDuplicate) {
        return next(createError(
          'A row with the same patient, request type, and quality measure already exists.',
          409
        ));
      }
    }

    // Update measure
    const updated = await prisma.patientMeasure.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...measureUpdate,
        updatedAt: new Date(),
      },
      include: {
        patient: true,
      },
    });

    // Update duplicate flags if requestType or qualityMeasure changed
    const duplicateFieldsChanged =
      'requestType' in updateData ||
      'qualityMeasure' in updateData;

    if (duplicateFieldsChanged) {
      await updateDuplicateFlags(updated.patientId);
    }

    // Re-fetch to get updated isDuplicate flag
    const finalMeasure = await prisma.patientMeasure.findUnique({
      where: { id: updated.id },
      include: { patient: true },
    });

    // Task 20: Add conflict-override metadata to audit log when forceOverwrite is used
    if (forceOverwrite === true) {
      try {
        // Query the AuditLog for the most recent change to identify the overwritten user
        const recentLog = await prisma.auditLog.findFirst({
          where: {
            entity: 'patient_measure',
            entityId: parseInt(id, 10),
            action: 'UPDATE',
          },
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { displayName: true, email: true } },
          },
        });

        await prisma.auditLog.create({
          data: {
            userId: req.user!.id,
            userEmail: req.user!.email,
            action: 'UPDATE',
            entity: 'patient_measure',
            entityId: parseInt(id, 10),
            changes: {
              fields: incomingChangedFields.map((field) => ({
                field,
                old: null,
                new: updateData[field] ?? null,
              })),
              conflictOverride: true,
              overwrittenUserId: recentLog?.userId ?? null,
              overwrittenUserEmail: recentLog?.userEmail ?? recentLog?.user?.email ?? null,
            },
            ipAddress: req.ip || req.socket?.remoteAddress,
          },
        });
      } catch {
        // Audit log failure is non-fatal
      }
    }

    // Emit row:updated event via Socket.IO to the physician room
    try {
      const room = getRoomName(existing.patient.ownerId ?? 'unassigned');
      const rowPayload = toGridRowPayload(finalMeasure!);
      broadcastToRoom(room, 'row:updated', { row: rowPayload, changedBy: req.user!.displayName }, req.socketId);
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    // Return flattened data
    res.json({
      success: true,
      data: {
        id: finalMeasure!.id,
        patientId: finalMeasure!.patientId,
        memberName: finalMeasure!.patient.memberName,
        memberDob: finalMeasure!.patient.memberDob,
        memberTelephone: finalMeasure!.patient.memberTelephone,
        memberAddress: finalMeasure!.patient.memberAddress,
        requestType: finalMeasure!.requestType,
        qualityMeasure: finalMeasure!.qualityMeasure,
        measureStatus: finalMeasure!.measureStatus,
        statusDate: finalMeasure!.statusDate,
        statusDatePrompt: finalMeasure!.statusDatePrompt,
        tracking1: finalMeasure!.tracking1,
        tracking2: finalMeasure!.tracking2,
        tracking3: finalMeasure!.tracking3,
        dueDate: finalMeasure!.dueDate,
        timeIntervalDays: finalMeasure!.timeIntervalDays,
        notes: finalMeasure!.notes,
        rowOrder: finalMeasure!.rowOrder,
        isDuplicate: finalMeasure!.isDuplicate,
        hgba1cGoal: finalMeasure!.hgba1cGoal,
        hgba1cGoalReachedYear: finalMeasure!.hgba1cGoalReachedYear,
        hgba1cDeclined: finalMeasure!.hgba1cDeclined,
        updatedAt: finalMeasure!.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/data/:id
 * Delete row
 */
export async function deletePatientMeasure(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    // Get the owner ID the user has access to
    const ownerId = await getPatientOwnerId(req);

    const existing = await prisma.patientMeasure.findUnique({
      where: { id: parseInt(id, 10) },
      include: { patient: true },
    });

    if (!existing) {
      throw createError('Record not found', 404, 'NOT_FOUND');
    }

    // Verify the patient belongs to the user's scope
    if (existing.patient.ownerId !== ownerId) {
      throw createError('You do not have permission to delete this record', 403, 'FORBIDDEN');
    }

    // Store patient info before deletion
    const { patientId } = existing;

    await prisma.patientMeasure.delete({
      where: { id: parseInt(id, 10) },
    });

    // Update duplicate flags for remaining measures for this patient
    await updateDuplicateFlags(patientId);

    // Emit row:deleted event via Socket.IO
    try {
      const room = getRoomName(existing.patient.ownerId ?? 'unassigned');
      broadcastToRoom(room, 'row:deleted', { rowId: parseInt(id, 10), changedBy: req.user!.displayName }, req.socketId);
    } catch {
      // Socket.IO broadcast failure is non-fatal
    }

    res.json({
      success: true,
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    next(error);
  }
}
