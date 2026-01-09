import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { createError } from '../middleware/errorHandler.js';

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

    // Create patient measure
    const measure = await prisma.patientMeasure.create({
      data: {
        patientId: patient.id,
        requestType,
        qualityMeasure,
        measureStatus: measureStatus || 'Not Addressed',
        statusDate: statusDate ? new Date(statusDate) : null,
        tracking1: tracking1 || null,
        tracking2: tracking2 || null,
        tracking3: tracking3 || null,
        notes: notes || null,
        rowOrder: (maxOrder._max.rowOrder || 0) + 1,
      },
      include: {
        patient: true,
      },
    });

    // Return flattened data
    res.status(201).json({
      success: true,
      data: {
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
        tracking1: measure.tracking1,
        tracking2: measure.tracking2,
        tracking3: measure.tracking3,
        dueDate: measure.dueDate,
        timeIntervalDays: measure.timeIntervalDays,
        notes: measure.notes,
        rowOrder: measure.rowOrder,
        isDuplicate: measure.isDuplicate,
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
      await prisma.patient.update({
        where: { id: existing.patientId },
        data: patientUpdate,
      });
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

    // Return flattened data
    res.json({
      success: true,
      data: {
        id: updated.id,
        patientId: updated.patientId,
        memberName: updated.patient.memberName,
        memberDob: updated.patient.memberDob,
        memberTelephone: updated.patient.memberTelephone,
        memberAddress: updated.patient.memberAddress,
        requestType: updated.requestType,
        qualityMeasure: updated.qualityMeasure,
        measureStatus: updated.measureStatus,
        statusDate: updated.statusDate,
        tracking1: updated.tracking1,
        tracking2: updated.tracking2,
        tracking3: updated.tracking3,
        dueDate: updated.dueDate,
        timeIntervalDays: updated.timeIntervalDays,
        notes: updated.notes,
        rowOrder: updated.rowOrder,
        isDuplicate: updated.isDuplicate,
        hgba1cGoal: updated.hgba1cGoal,
        hgba1cGoalReachedYear: updated.hgba1cGoalReachedYear,
        hgba1cDeclined: updated.hgba1cDeclined,
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

    await prisma.patientMeasure.delete({
      where: { id: parseInt(id, 10) },
    });

    res.json({
      success: true,
      data: { id: parseInt(id, 10) },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
