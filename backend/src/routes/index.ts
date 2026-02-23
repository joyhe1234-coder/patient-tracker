import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import usersRoutes from './users.routes.js';
import dataRoutes from './data.routes.js';
import configRoutes from './config.routes.js';
import importRoutes from './import.routes.js';
import mappingRoutes from './mapping.routes.js';

const router = Router();

// Health check (public)
router.use('/health', healthRoutes);

// Authentication (public)
router.use('/auth', authRoutes);

// Admin routes (ADMIN role only)
router.use('/admin', adminRoutes);

// User routes (physicians list, etc.) - protected
router.use('/users', usersRoutes);

// Patient data (grid data) - protected
router.use('/data', dataRoutes);

// Configuration data - protected
router.use('/config', configRoutes);

// Import mapping management - protected (ADMIN for writes)
// Must be mounted BEFORE /import so /import/mappings/:systemId is not swallowed
router.use('/import/mappings', mappingRoutes);

// Import data - protected
router.use('/import', importRoutes);

export default router;
