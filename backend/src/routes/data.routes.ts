import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';
import { calculateDueDate } from '../services/dueDateCalculator.js';
import { updateDuplicateFlags, checkForDuplicate } from '../services/duplicateDetector.js';
import { resolveStatusDatePrompt, getDefaultDatePrompt } from '../services/statusDatePromptResolver.js';

const router = Router();

// GET /api/data - Get all patient measures (grid data)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const measures = await prisma.patientMeasure.findMany({
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
});

// POST /api/data - Create new row
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
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

    if (!memberName || !memberDob || !requestType || !qualityMeasure) {
      throw createError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

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
        },
      });
    }

    // Get max row order
    const maxOrder = await prisma.patientMeasure.aggregate({
      _max: { rowOrder: true },
    });

    // Parse status date
    const parsedStatusDate = statusDate ? new Date(statusDate) : null;
    const finalMeasureStatus = measureStatus || 'Not Addressed';

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

    // Check for duplicates before creating (same patient name + DOB)
    const { isDuplicate } = await checkForDuplicate(patient.id);

    // Create patient measure
    const measure = await prisma.patientMeasure.create({
      data: {
        patientId: patient.id,
        requestType,
        qualityMeasure,
        measureStatus: finalMeasureStatus,
        statusDate: parsedStatusDate,
        statusDatePrompt,
        tracking1: tracking1 || null,
        tracking2: tracking2 || null,
        tracking3: tracking3 || null,
        dueDate,
        timeIntervalDays,
        notes: notes || null,
        rowOrder: (maxOrder._max.rowOrder || 0) + 1,
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
});

// PUT /api/data/:id - Update row
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get existing measure with patient
    const existing = await prisma.patientMeasure.findUnique({
      where: { id: parseInt(id, 10) },
      include: { patient: true },
    });

    if (!existing) {
      throw createError('Record not found', 404, 'NOT_FOUND');
    }

    // Separate patient fields from measure fields
    const patientFields = ['memberName', 'memberDob', 'memberTelephone', 'memberAddress'];
    const measureFields = [
      'requestType', 'qualityMeasure', 'measureStatus', 'statusDate',
      'statusDatePrompt', 'tracking1', 'tracking2', 'tracking3',
      'dueDate', 'timeIntervalDays', 'notes', 'rowOrder',
      'hgba1cGoal', 'hgba1cGoalReachedYear', 'hgba1cDeclined',
    ];

    const patientUpdate: Record<string, unknown> = {};
    const measureUpdate: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (patientFields.includes(key)) {
        if (key === 'memberDob' && value) {
          patientUpdate[key] = new Date(value as string);
        } else {
          patientUpdate[key] = value;
        }
      } else if (measureFields.includes(key)) {
        if ((key === 'statusDate' || key === 'dueDate') && value) {
          measureUpdate[key] = new Date(value as string);
        } else {
          measureUpdate[key] = value;
        }
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

    // Statuses that use dropdown/range for interval (time interval NOT editable)
    const DROPDOWN_INTERVAL_STATUSES = [
      'Screening discussed',
      'HgbA1c at goal',
      'HgbA1c NOT at goal',
      'Colon cancer screening ordered',
      'Screening test ordered',
      'Scheduled call back - BP not at goal',
      'Scheduled call back - BP at goal',
      'Chronic diagnosis resolved',
      'Chronic diagnosis invalid',
    ];

    // Check if timeIntervalDays was explicitly updated by user
    const timeIntervalExplicitlySet = 'timeIntervalDays' in updateData;
    const isDropdownIntervalStatus = DROPDOWN_INTERVAL_STATUSES.includes(finalMeasureStatus);

    // Check if due date related fields changed
    const dueDateFieldsChanged =
      'statusDate' in updateData ||
      'measureStatus' in updateData ||
      'tracking1' in updateData ||
      'tracking2' in updateData;

    if (timeIntervalExplicitlySet && !isDropdownIntervalStatus && finalStatusDate) {
      // User edited time interval for a baseDueDays status
      // Calculate dueDate = statusDate + timeIntervalDays
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

    // Re-fetch to get updated isDuplicate flag
    const finalMeasure = await prisma.patientMeasure.findUnique({
      where: { id: updated.id },
      include: { patient: true },
    });

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
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/data/check-duplicate - Check if a duplicate would be created
// Duplicate = same patient (name + DOB) already has existing rows
router.post('/check-duplicate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { memberName, memberDob } = req.body;

    if (!memberName || !memberDob) {
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

    // Check for existing measures for this patient
    const existingMeasures = await prisma.patientMeasure.findMany({
      where: {
        patientId: patient.id,
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
});

// DELETE /api/data/:id - Delete row
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await prisma.patientMeasure.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!existing) {
      throw createError('Record not found', 404, 'NOT_FOUND');
    }

    // Store patient info before deletion
    const { patientId } = existing;

    await prisma.patientMeasure.delete({
      where: { id: parseInt(id, 10) },
    });

    // Update duplicate flags for remaining measures for this patient
    await updateDuplicateFlags(patientId);

    res.json({
      success: true,
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
