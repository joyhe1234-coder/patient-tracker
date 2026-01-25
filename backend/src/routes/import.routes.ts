import { Router, Request, Response, NextFunction } from 'express';
import { listSystems, loadSystemConfig, systemExists } from '../services/import/configLoader.js';
import { createError } from '../middleware/errorHandler.js';

const router = Router();

/**
 * GET /api/import/systems
 * List all available healthcare systems for import
 */
router.get('/systems', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const systems = listSystems();

    res.json({
      success: true,
      data: systems
    });
  } catch (error) {
    next(createError(`Failed to load systems: ${(error as Error).message}`, 500));
  }
});

/**
 * GET /api/import/systems/:systemId
 * Get configuration for a specific healthcare system
 */
router.get('/systems/:systemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { systemId } = req.params;

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    const config = loadSystemConfig(systemId);

    res.json({
      success: true,
      data: {
        id: systemId,
        name: config.name,
        version: config.version,
        patientColumns: Object.keys(config.patientColumns),
        measureColumns: Object.keys(config.measureColumns),
        qualityMeasures: [...new Set(Object.values(config.measureColumns).map(m => m.qualityMeasure))],
        skipColumns: config.skipColumns
      }
    });
  } catch (error) {
    next(createError(`Failed to load system config: ${(error as Error).message}`, 500));
  }
});

export default router;
