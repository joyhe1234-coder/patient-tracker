import { PrismaClient } from '@prisma/client';

// Create a single instance of PrismaClient
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});
