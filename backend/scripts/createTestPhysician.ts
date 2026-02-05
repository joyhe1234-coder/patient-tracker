#!/usr/bin/env tsx
/**
 * Create a test physician user and assign unassigned patients to them
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('changeme123', 12);

  const physician = await prisma.user.upsert({
    where: { email: 'drsmith@clinic.com' },
    create: {
      email: 'drsmith@clinic.com',
      passwordHash: hash,
      displayName: 'Dr. Smith',
      role: 'PHYSICIAN',
      isActive: true,
    },
    update: {
      passwordHash: hash,
    },
  });

  console.log('Created physician:', physician.displayName, '(ID:', physician.id, ')');

  // Assign existing patients to this physician
  const result = await prisma.patient.updateMany({
    where: { ownerId: null },
    data: { ownerId: physician.id },
  });

  console.log('Assigned', result.count, 'patients to', physician.displayName);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
