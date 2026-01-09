import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

const router = Router();

// GET /api/config/all - Get all configuration data
router.get('/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      requestTypes,
      qualityMeasures,
      measureStatuses,
      trackingOptions,
      dueDayRules,
      hgba1cGoalOptions,
      conditionalFormats,
    ] = await Promise.all([
      prisma.requestType.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.qualityMeasure.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.measureStatus.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.trackingOption.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.dueDayRule.findMany(),
      prisma.hgbA1cGoalOption.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.conditionalFormat.findMany({ orderBy: { priority: 'desc' } }),
    ]);

    res.json({
      success: true,
      data: {
        requestTypes,
        qualityMeasures,
        measureStatuses,
        trackingOptions,
        dueDayRules,
        hgba1cGoalOptions,
        conditionalFormats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/request-types
router.get('/request-types', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const requestTypes = await prisma.requestType.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: requestTypes,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/quality-measures/:requestTypeCode
router.get('/quality-measures/:requestTypeCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestTypeCode } = req.params;

    const requestType = await prisma.requestType.findUnique({
      where: { code: requestTypeCode },
    });

    if (!requestType) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const qualityMeasures = await prisma.qualityMeasure.findMany({
      where: { requestTypeId: requestType.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: qualityMeasures,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/measure-statuses/:qualityMeasureCode
router.get('/measure-statuses/:qualityMeasureCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { qualityMeasureCode } = req.params;

    const qualityMeasure = await prisma.qualityMeasure.findFirst({
      where: { code: qualityMeasureCode },
    });

    if (!qualityMeasure) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const measureStatuses = await prisma.measureStatus.findMany({
      where: { qualityMeasureId: qualityMeasure.id },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: measureStatuses,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/tracking-options/:measureStatusCode
router.get('/tracking-options/:measureStatusCode', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { measureStatusCode } = req.params;

    const measureStatus = await prisma.measureStatus.findFirst({
      where: { code: measureStatusCode },
    });

    if (!measureStatus) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const trackingOptions = await prisma.trackingOption.findMany({
      where: { measureStatusId: measureStatus.id },
      orderBy: [{ trackingNumber: 'asc' }, { sortOrder: 'asc' }],
    });

    res.json({
      success: true,
      data: trackingOptions,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/hgba1c-goals
router.get('/hgba1c-goals', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await prisma.hgbA1cGoalOption.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/config/conditional-formats
router.get('/conditional-formats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const formats = await prisma.conditionalFormat.findMany({
      orderBy: { priority: 'desc' },
    });

    res.json({
      success: true,
      data: formats,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
