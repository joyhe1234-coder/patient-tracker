import { Router } from 'express';
import healthRoutes from './health.routes.js';
import dataRoutes from './data.routes.js';
import configRoutes from './config.routes.js';

const router = Router();

// Health check
router.use('/health', healthRoutes);

// Patient data (grid data)
router.use('/data', dataRoutes);

// Configuration data
router.use('/config', configRoutes);

export default router;
