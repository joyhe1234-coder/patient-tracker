import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';
import { requireAuth, requirePatientDataAccess } from '../middleware/auth.js';
import { isStaffAssignedToPhysician } from '../services/authService.js';
import { calculateDueDate } from '../services/dueDateCalculator.js';
import { updateDuplicateFlags, checkForDuplicate } from '../services/duplicateDetector.js';
import { resolveStatusDatePrompt, getDefaultDatePrompt } from '../services/statusDatePromptResolver.js';

const router = Router();

// All data routes require authentication and patient data access (PHYSICIAN or STAFF)
router.use(requireAuth);
router.use(requirePatientDataAccess);

/**
 * Get patient filter based on user role
 * @param req - Express request with authenticated user
 * @returns Prisma where clause for filtering patients by owner
 */
async function getPatientOwnerId(req: Request): Promise<number | null> {
  const user = req.user!;

  if (user.role === 'PHYSICIAN') {
    // PHYSICIAN sees only their own patients
    return user.id;
  }

  if (user.role === 'STAFF') {
    // STAFF must specify physicianId to view that physician's patients
    const physicianIdParam = req.query.physicianId as string | undefined;
    if (!physicianIdParam) {
      throw createError('physicianId query parameter is required for STAFF users', 400, 'MISSING_PHYSICIAN_ID');
    }

    const physicianId = parseInt(physicianIdParam, 10);
    if (isNaN(physicianId)) {
      throw createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID');
    }

    // Verify STAFF is assigned to this physician
    const isAssigned = await isStaffAssignedToPhysician(user.id, physicianId);
    if (!isAssigned) {
      throw createError('You are not assigned to this physician', 403, 'NOT_ASSIGNED');
    }

    return physicianId;
  }

  if (user.role === 'ADMIN') {
    // ADMIN must specify physicianId to view any physician's patients
    const physicianIdParam = req.query.physicianId as string | undefined;
    if (!physicianIdParam) {
      throw createError('physicianId query parameter is required for ADMIN users', 400, 'MISSING_PHYSICIAN_ID');
    }

    const physicianId = parseInt(physicianIdParam, 10);
    if (isNaN(physicianId)) {
      throw createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID');
    }

    // ADMIN can view any physician's patients (no assignment check needed)
    return physicianId;
  }

  throw createError('Unknown user role', 403, 'FORBIDDEN');
}

// GET /api/data - Get all patient measures (grid data)
// PHYSICIAN: sees own patients
// STAFF: sees selected physician's patients (requires physicianId query param)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the owner ID to filter by
    const ownerId = await getPatientOwnerId(req);

    const measures = await prisma.patientMeasure.findMany({
      where: {
        patient: {
          ownerId: ownerId,
        },
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
// Duplicate = same patient (name + DOB) + requestType + qualityMeasure
// Skip check if requestType or qualityMeasure is null/empty
router.post('/check-duplicate', async (req: Request, res: Response, next: NextFunction) => {
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
});

// POST /api/data/duplicate - Duplicate a row with patient data only
router.post('/duplicate', async (req: Request, res: Response, next: NextFunction) => {
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
});

// DELETE /api/data/:id - Delete row
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    res.json({
      success: true,
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
