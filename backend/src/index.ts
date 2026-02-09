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

const server = createServer(app);

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

  console.log(`Created initial admin user: ${email}`);
}

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Ensure an admin user exists on first run (no-op if one already exists)
    await bootstrapAdminUser();

    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`Health check: http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
  });
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
