#!/usr/bin/env tsx
/**
 * CLI script to clean up old audit log entries
 *
 * Usage:
 *   npm run cleanup-audit-log
 *   npm run cleanup-audit-log -- --days 180  (custom retention period)
 */

import { PrismaClient } from '@prisma/client';

const DEFAULT_RETENTION_DAYS = 180; // 6 months

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let retentionDays = DEFAULT_RETENTION_DAYS;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      retentionDays = parseInt(args[i + 1], 10);
      if (isNaN(retentionDays) || retentionDays < 1) {
        console.error('Error: --days must be a positive integer');
        process.exit(1);
      }
      i++;
    }
  }

  const prisma = new PrismaClient();

  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(`Cleaning up audit log entries older than ${retentionDays} days (before ${cutoffDate.toISOString()})...`);

    // Count entries to delete
    const countToDelete = await prisma.auditLog.count({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    if (countToDelete === 0) {
      console.log('No entries to delete.');
      return;
    }

    console.log(`Found ${countToDelete} entries to delete.`);

    // Delete old entries
    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`Deleted ${result.count} audit log entries.`);

    // Get remaining count
    const remaining = await prisma.auditLog.count();
    console.log(`Remaining entries: ${remaining}`);

  } catch (error) {
    console.error('Error cleaning up audit log:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
