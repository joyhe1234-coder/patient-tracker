import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import dataRoutes from './data.routes.js';
import configRoutes from './config.routes.js';
import importRoutes from './import.routes.js';

const router = Router();

// Health check (public)
router.use('/health', healthRoutes);

// Authentication (public)
router.use('/auth', authRoutes);

// Admin routes (ADMIN role only)
router.use('/admin', adminRoutes);

// Patient data (grid data) - protected
router.use('/data', dataRoutes);

// Configuration data - protected
router.use('/config', configRoutes);

// Import data - protected
router.use('/import', importRoutes);

export default router;
