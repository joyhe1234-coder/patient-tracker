import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from project root (parent of backend/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import bcrypt from 'bcryptjs';
import { createServer } from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { prisma } from './config/database.js';
import { initializeSocketIO, getIO } from './services/socketManager.js';
import { logger } from './utils/logger.js';

const server = createServer(app);

// Initialize Socket.IO (non-fatal: HTTP server continues if Socket.IO fails)
try {
  initializeSocketIO(server);
  logger.info('Socket.IO initialized successfully');
} catch (error) {
  logger.error('Failed to initialize Socket.IO (HTTP server will continue)', { error: String(error) });
}

/**
 * Ensure at least one ADMIN user exists on first startup.
 * If any ADMIN already exists, this does nothing — existing users are never modified.
 */
async function bootstrapAdminUser() {
  const adminCount = await prisma.user.count({
    where: { roles: { has: 'ADMIN' } },
  });

  if (adminCount > 0) return;

  const email = process.env.ADMIN_EMAIL || 'admin@clinic.com';
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const passwordHash = await bcrypt.hash(password, config.bcryptSaltRounds);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      displayName: 'System Admin',
      roles: ['ADMIN'],
      isActive: true,
    },
  });

  logger.info('Created initial admin user', { email });
}

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Ensure an admin user exists on first run (no-op if one already exists)
    await bootstrapAdminUser();

    server.listen(config.port, () => {
      logger.info('Server running', { port: config.port });
      logger.info('Environment', { nodeEnv: config.nodeEnv });
      logger.info('Health check available', { url: `http://localhost:${config.port}/api/health` });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: String(error) });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const io = getIO();
  if (io) {
    logger.info('Closing Socket.IO connections');
    io.close();
  }
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  const io = getIO();
  if (io) {
    logger.info('Closing Socket.IO connections');
    io.close();
  }
  server.close(() => {
    logger.info('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
