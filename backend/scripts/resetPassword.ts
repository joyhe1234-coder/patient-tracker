#!/usr/bin/env tsx
/**
 * CLI script to reset a user's password
 *
 * Usage:
 *   npm run reset-password -- --email user@example.com --password newpassword123
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let email: string | undefined;
  let password: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1];
      i++;
    } else if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
      i++;
    }
  }

  // Validate arguments
  if (!email) {
    console.error('Error: --email is required');
    console.error('Usage: npm run reset-password -- --email user@example.com --password newpassword');
    process.exit(1);
  }

  if (!password) {
    console.error('Error: --password is required');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(`Error: User not found`);
      process.exit(1);
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: 'PASSWORD_RESET_CLI',
        entity: 'user',
        entityId: user.id,
        details: { method: 'CLI script' },
      },
    });

    console.log(`Password reset successfully for user: ${user.email} (${user.displayName})`);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
