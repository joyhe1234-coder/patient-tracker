import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        db: 'connected',
        version: '2.0.0-snapshot',
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'disconnected',
        version: '2.0.0-snapshot',
      },
    });
  }
});

export default router;
