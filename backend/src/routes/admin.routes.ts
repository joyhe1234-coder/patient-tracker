import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { UserRole } from '@prisma/client';
import { listUsers, getUser, createUser, updateUser, deleteUser, resetPassword } from './handlers/userHandlers.js';
import { createStaffAssignment, deleteStaffAssignment, listPhysicians } from './handlers/staffHandlers.js';
import { getAuditLog } from './handlers/auditHandlers.js';
import { bulkAssignPatients, getUnassignedPatients } from './handlers/patientHandlers.js';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(requireAuth);
router.use(requireRole(['ADMIN']));

// Valid role combinations:
// - [PHYSICIAN] - Standard physician
// - [ADMIN] - Pure admin, no patients
// - [STAFF] - Standard staff (cannot combine with other roles)
// - [ADMIN, PHYSICIAN] - Admin who can also have patients
const validRoleCombinations = [
  ['PHYSICIAN'],
  ['ADMIN'],
  ['STAFF'],
  ['ADMIN', 'PHYSICIAN'],
];

export function isValidRoleCombination(roles: UserRole[]): boolean {
  const sorted = [...roles].sort();
  return validRoleCombinations.some(valid => {
    const validSorted = [...valid].sort();
    return sorted.length === validSorted.length &&
      sorted.every((r, i) => r === validSorted[i]);
  });
}

// Validation schemas (exported for use by handler modules)
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  roles: z.array(z.enum(['PHYSICIAN', 'STAFF', 'ADMIN'])).min(1, 'At least one role is required'),
});

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  displayName: z.string().min(1, 'Display name is required').optional(),
  roles: z.array(z.enum(['PHYSICIAN', 'STAFF', 'ADMIN'])).min(1).optional(),
  isActive: z.boolean().optional(),
});

export const assignStaffSchema = z.object({
  staffId: z.number().int().positive(),
  physicianId: z.number().int().positive(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// Route definitions — User management
router.get('/users', listUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetPassword);

// Route definitions — Physicians & Staff assignments
router.get('/physicians', listPhysicians);
router.post('/staff-assignments', createStaffAssignment);
router.delete('/staff-assignments', deleteStaffAssignment);

// Route definitions — Audit log
router.get('/audit-log', getAuditLog);

// Route definitions — Patient management
router.patch('/patients/bulk-assign', bulkAssignPatients);
router.get('/patients/unassigned', getUnassignedPatients);

export default router;
