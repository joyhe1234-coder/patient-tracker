import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { isStaffAssignedToPhysician } from '../services/authService.js';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

/**
 * GET /api/users/physicians
 * Get list of users who can have patients assigned to them (users with PHYSICIAN role).
 * Used for physician selector dropdowns.
 *
 * - STAFF role: Returns only their assigned physicians
 * - ADMIN role: Returns all users with PHYSICIAN role
 * - PHYSICIAN role (without ADMIN/STAFF): Returns only themselves
 */
router.get('/physicians', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    // STAFF: sees only their assigned physicians
    if (user.roles.includes('STAFF')) {
      const assignments = await prisma.staffAssignment.findMany({
        where: { staffId: user.id },
        include: {
          physician: {
            select: {
              id: true,
              displayName: true,
              email: true,
              roles: true,
              isActive: true,
            },
          },
        },
      });

      // Filter to only active users with PHYSICIAN role
      const physicians = assignments
        .map(a => a.physician)
        .filter(p => p.isActive && p.roles.includes('PHYSICIAN'))
        .map(p => ({
          id: p.id,
          displayName: p.displayName,
          email: p.email,
          roles: p.roles,
        }));

      return res.json({
        success: true,
        data: physicians,
      });
    }

    // ADMIN: sees all users with PHYSICIAN role
    if (user.roles.includes('ADMIN')) {
      const users = await prisma.user.findMany({
        where: {
          roles: { has: 'PHYSICIAN' },
          isActive: true,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          roles: true,
        },
        orderBy: {
          displayName: 'asc',
        },
      });

      return res.json({
        success: true,
        data: users,
      });
    }

    // PHYSICIAN (without ADMIN/STAFF): can only see themselves
    if (user.roles.includes('PHYSICIAN')) {
      const physician = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          displayName: true,
          email: true,
          roles: true,
        },
      });

      return res.json({
        success: true,
        data: physician ? [{
          id: physician.id,
          displayName: physician.displayName,
          email: physician.email,
          roles: physician.roles,
        }] : [],
      });
    }

    throw createError('Unknown user role', 403, 'FORBIDDEN');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/users/physicians/:id
 * Get a specific physician's info (for display purposes)
 * Validates that the requesting user has access to view this physician.
 */
router.get('/physicians/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const physicianId = parseInt(req.params.id, 10);

    if (isNaN(physicianId)) {
      throw createError('Invalid physician ID', 400, 'INVALID_PHYSICIAN_ID');
    }

    // Validate access based on roles
    // STAFF can only see assigned physicians
    if (user.roles.includes('STAFF')) {
      const isAssigned = await isStaffAssignedToPhysician(user.id, physicianId);
      if (!isAssigned) {
        throw createError('You are not assigned to this physician', 403, 'NOT_ASSIGNED');
      }
    }
    // PHYSICIAN (without ADMIN) can only see themselves
    else if (user.roles.includes('PHYSICIAN') && !user.roles.includes('ADMIN')) {
      if (user.id !== physicianId) {
        throw createError('You can only view your own information', 403, 'FORBIDDEN');
      }
    }
    // ADMIN can view any physician

    const physician = await prisma.user.findUnique({
      where: { id: physicianId },
      select: {
        id: true,
        displayName: true,
        email: true,
        roles: true,
        isActive: true,
      },
    });

    if (!physician || !physician.roles.includes('PHYSICIAN')) {
      throw createError('Physician not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: physician.id,
        displayName: physician.displayName,
        email: physician.email,
        roles: physician.roles,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
