import { Router, Request } from 'express';
import { createError } from '../middleware/errorHandler.js';
import { requireAuth, requirePatientDataAccess } from '../middleware/auth.js';
import { isStaffAssignedToPhysician } from '../services/authService.js';
import { socketIdMiddleware } from '../middleware/socketIdMiddleware.js';
import { getPatientMeasures, createPatientMeasure, updatePatientMeasure, deletePatientMeasure } from './handlers/dataHandlers.js';
import { checkDuplicate, duplicateRow } from './handlers/dataDuplicateHandler.js';

const router = Router();

// All data routes require authentication and patient data access (PHYSICIAN or STAFF)
router.use(requireAuth);
router.use(requirePatientDataAccess);
router.use(socketIdMiddleware);

/**
 * Result of getPatientOwnerFilter - contains ownerId or special flag for unassigned
 */
export interface OwnerFilter {
  ownerId: number | null;
  isUnassigned: boolean;
}

/**
 * Get patient filter based on user role
 * @param req - Express request with authenticated user
 * @returns OwnerFilter with ownerId (or null for unassigned) and isUnassigned flag
 */
export async function getPatientOwnerFilter(req: Request): Promise<OwnerFilter> {
  const user = req.user!;

  // STAFF role: must specify physicianId and can only view assigned physicians
  if (user.roles.includes('STAFF')) {
    const physicianIdParam = req.query.physicianId as string | undefined;
    if (!physicianIdParam) {
      throw createError('physicianId query parameter is required for STAFF users', 400, 'MISSING_PHYSICIAN_ID');
    }

    // STAFF cannot view unassigned patients
    if (physicianIdParam === 'unassigned' || physicianIdParam === 'null') {
      throw createError('STAFF users cannot view unassigned patients', 403, 'FORBIDDEN');
    }

    const physicianId = parseInt(physicianIdParam, 10);
    if (isNaN(physicianId)) {
      throw createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID');
    }

    // Verify STAFF is assigned to this physician
    const isAssigned = await isStaffAssignedToPhysician(user.id, physicianId);
    if (!isAssigned) {
      throw createError('You are not assigned to this physician', 403, 'NOT_ASSIGNED');
    }

    return { ownerId: physicianId, isUnassigned: false };
  }

  // ADMIN role: can view any physician's patients or unassigned
  if (user.roles.includes('ADMIN')) {
    const physicianIdParam = req.query.physicianId as string | undefined;
    if (!physicianIdParam) {
      throw createError('physicianId query parameter is required for ADMIN users', 400, 'MISSING_PHYSICIAN_ID');
    }

    // ADMIN can view unassigned patients with physicianId=unassigned or physicianId=null
    if (physicianIdParam === 'unassigned' || physicianIdParam === 'null') {
      return { ownerId: null, isUnassigned: true };
    }

    const physicianId = parseInt(physicianIdParam, 10);
    if (isNaN(physicianId)) {
      throw createError('Invalid physicianId', 400, 'INVALID_PHYSICIAN_ID');
    }

    // ADMIN can view any physician's patients (no assignment check needed)
    return { ownerId: physicianId, isUnassigned: false };
  }

  // PHYSICIAN role (without ADMIN or STAFF): sees only their own patients
  if (user.roles.includes('PHYSICIAN')) {
    return { ownerId: user.id, isUnassigned: false };
  }

  throw createError('Unknown user role', 403, 'FORBIDDEN');
}

/**
 * Legacy helper - returns just the ownerId (for backward compatibility)
 * @deprecated Use getPatientOwnerFilter instead
 */
export async function getPatientOwnerId(req: Request): Promise<number | null> {
  const filter = await getPatientOwnerFilter(req);
  return filter.ownerId;
}

// Route definitions
router.get('/', getPatientMeasures);
router.post('/', createPatientMeasure);
router.put('/:id', updatePatientMeasure);
router.post('/check-duplicate', checkDuplicate);
router.post('/duplicate', duplicateRow);
router.delete('/:id', deletePatientMeasure);

export default router;
