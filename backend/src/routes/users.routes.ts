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
 * Get list of users who can have patients assigned to them.
 * Used for physician selector dropdowns.
 *
 * - PHYSICIAN: Not typically needed (they only see their own patients)
 * - STAFF: Returns only their assigned physicians
 * - ADMIN: Returns all users with canHavePatients=true
 */
router.get('/physicians', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    if (user.role === 'PHYSICIAN') {
      // PHYSICIAN can only see themselves (they don't need a selector)
      // Return just themselves for consistency
      const physician = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
        },
      });

      return res.json({
        success: true,
        data: physician ? [{
          id: physician.id,
          displayName: physician.displayName,
          email: physician.email,
          role: physician.role,
        }] : [],
      });
    }

    if (user.role === 'STAFF') {
      // STAFF sees only their assigned physicians
      const assignments = await prisma.staffAssignment.findMany({
        where: { staffId: user.id },
        include: {
          physician: {
            select: {
              id: true,
              displayName: true,
              email: true,
              role: true,
              canHavePatients: true,
              isActive: true,
            },
          },
        },
      });

      // Filter to only active users with canHavePatients
      const physicians = assignments
        .map(a => a.physician)
        .filter(p => p.isActive && p.canHavePatients)
        .map(p => ({
          id: p.id,
          displayName: p.displayName,
          email: p.email,
          role: p.role,
        }));

      return res.json({
        success: true,
        data: physicians,
      });
    }

    if (user.role === 'ADMIN') {
      // ADMIN sees all users with canHavePatients=true
      const users = await prisma.user.findMany({
        where: {
          canHavePatients: true,
          isActive: true,
        },
        select: {
          id: true,
          displayName: true,
          email: true,
          role: true,
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

    // Validate access
    if (user.role === 'PHYSICIAN') {
      // PHYSICIAN can only see themselves
      if (user.id !== physicianId) {
        throw createError('You can only view your own information', 403, 'FORBIDDEN');
      }
    } else if (user.role === 'STAFF') {
      // STAFF can only see assigned physicians
      const isAssigned = await isStaffAssignedToPhysician(user.id, physicianId);
      if (!isAssigned) {
        throw createError('You are not assigned to this physician', 403, 'NOT_ASSIGNED');
      }
    }
    // ADMIN can view any physician

    const physician = await prisma.user.findUnique({
      where: { id: physicianId },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        canHavePatients: true,
        isActive: true,
      },
    });

    if (!physician || !physician.canHavePatients) {
      throw createError('Physician not found', 404, 'NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: physician.id,
        displayName: physician.displayName,
        email: physician.email,
        role: physician.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
