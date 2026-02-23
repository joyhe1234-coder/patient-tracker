import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireRole, requirePatientDataAccess } from '../middleware/auth.js';
import { createError } from '../middleware/errorHandler.js';
import { systemExists } from '../services/import/configLoader.js';
import { prisma } from '../config/database.js';
import {
  loadMergedConfig,
  resetToDefaults,
  resolveConflicts,
  saveMappingOverrides,
  saveActionOverrides,
} from '../services/import/mappingService.js';
import type {
  ResolvedConflict,
  MappingChangeRequest,
  ActionChangeRequest,
} from '../services/import/mappingService.js';

const router = Router();

// All mapping routes require authentication and patient data access
router.use(requireAuth);
router.use(requirePatientDataAccess);

const VALID_RESOLUTION_ACTIONS = [
  'ACCEPT_SUGGESTION',
  'MAP_TO_MEASURE',
  'MAP_TO_PATIENT',
  'IGNORE',
  'KEEP',
  'REMOVE',
];

/**
 * GET /api/import/mappings/:systemId
 * Load merged mapping config (JSON seed + DB overrides) for a system.
 */
router.get('/:systemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { systemId } = req.params;

    if (!systemExists(systemId)) {
      return next(createError(`System not found: ${systemId}`, 404));
    }

    const data = await loadMergedConfig(systemId);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(createError(`Failed to load mapping config: ${(error as Error).message}`, 500));
  }
});

/**
 * DELETE /api/import/mappings/:systemId/reset
 * Reset all DB overrides for a system, reverting to JSON seed defaults.
 * Requires ADMIN role.
 */
router.delete(
  '/:systemId/reset',
  requireRole(['ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { systemId } = req.params;

      if (!systemExists(systemId)) {
        return next(createError(`System not found: ${systemId}`, 404));
      }

      // Query counts before resetting so we can report how many were deleted
      const [columnCount, actionCount] = await Promise.all([
        prisma.importMappingOverride.count({ where: { systemId } }),
        prisma.importActionOverride.count({ where: { systemId } }),
      ]);

      const data = await resetToDefaults(systemId, req.user!.id);

      res.json({
        success: true,
        data,
        message: `Reset to defaults. Deleted ${columnCount} column overrides and ${actionCount} action overrides.`,
      });
    } catch (error) {
      next(createError(`Failed to reset mappings: ${(error as Error).message}`, 500));
    }
  },
);

/**
 * POST /api/import/mappings/:systemId/resolve
 * Resolve column mapping conflicts from the import flow.
 * Requires ADMIN role.
 */
router.post(
  '/:systemId/resolve',
  requireRole(['ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { systemId } = req.params;

      if (!systemExists(systemId)) {
        return next(createError(`System not found: ${systemId}`, 404));
      }

      const { resolutions } = req.body as { resolutions?: ResolvedConflict[] };

      // Validate resolutions array exists and is non-empty
      if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) {
        return next(createError('resolutions array is required and must not be empty', 400));
      }

      // Validate each resolution has a valid action
      for (const resolution of resolutions) {
        if (
          !resolution.resolution ||
          !VALID_RESOLUTION_ACTIONS.includes(resolution.resolution.action)
        ) {
          return next(
            createError(
              `Invalid resolution action: ${resolution.resolution?.action ?? 'undefined'}. Valid actions: ${VALID_RESOLUTION_ACTIONS.join(', ')}`,
              400,
            ),
          );
        }
      }

      const data = await resolveConflicts(systemId, resolutions, req.user!.id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(createError(`Failed to resolve conflicts: ${(error as Error).message}`, 500));
    }
  },
);

const VALID_TARGET_TYPES = ['PATIENT', 'MEASURE', 'DATA', 'IGNORED'];
const REDOS_PATTERN = /\([^)]*[+*][^)]*\)[+*]/;

/**
 * PUT /api/import/mappings/:systemId/columns
 * Save column mapping overrides from the admin mapping editor.
 * Requires ADMIN role. Uses optimistic locking via expectedUpdatedAt.
 */
router.put(
  '/:systemId/columns',
  requireRole(['ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { systemId } = req.params;

      if (!systemExists(systemId)) {
        return next(createError(`System not found: ${systemId}`, 404));
      }

      const { changes, expectedUpdatedAt } = req.body as {
        changes?: MappingChangeRequest[];
        expectedUpdatedAt?: string;
      };

      // Validate changes array exists and is non-empty
      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return next(createError('changes array is required and must not be empty', 400));
      }

      // Validate each change entry
      const seenSourceColumns = new Set<string>();
      for (const change of changes) {
        // sourceColumn must not be blank
        if (!change.sourceColumn || change.sourceColumn.trim() === '') {
          return next(createError('sourceColumn must not be blank', 400));
        }

        // targetType must be a valid enum value
        if (!VALID_TARGET_TYPES.includes(change.targetType)) {
          return next(
            createError(
              `Invalid targetType: ${change.targetType}. Valid types: ${VALID_TARGET_TYPES.join(', ')}`,
              400,
            ),
          );
        }

        // Check for duplicate sourceColumn entries within the request
        if (seenSourceColumns.has(change.sourceColumn)) {
          return next(createError(`Duplicate source column: ${change.sourceColumn}`, 400));
        }
        seenSourceColumns.add(change.sourceColumn);

        // If targetType is MEASURE, validate that the quality measure exists
        if (change.targetType === 'MEASURE' && change.qualityMeasure) {
          const measureExists = await prisma.qualityMeasure.findFirst({
            where: { code: change.qualityMeasure },
          });
          if (!measureExists) {
            return next(
              createError(
                `Quality measure not found: ${change.qualityMeasure}`,
                400,
              ),
            );
          }
        }
      }

      const parsedExpectedUpdatedAt = expectedUpdatedAt
        ? new Date(expectedUpdatedAt)
        : undefined;

      const data = await saveMappingOverrides(
        systemId,
        changes,
        req.user!.id,
        parsedExpectedUpdatedAt,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      // Handle optimistic locking conflict
      if ((error as Error & { statusCode?: number }).statusCode === 409) {
        return next(createError((error as Error).message, 409));
      }
      next(createError(`Failed to save column mappings: ${(error as Error).message}`, 500));
    }
  },
);

/**
 * PUT /api/import/mappings/:systemId/actions
 * Save action pattern overrides from the admin mapping editor.
 * Requires ADMIN role.
 */
router.put(
  '/:systemId/actions',
  requireRole(['ADMIN']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { systemId } = req.params;

      if (!systemExists(systemId)) {
        return next(createError(`System not found: ${systemId}`, 404));
      }

      const { changes } = req.body as { changes?: ActionChangeRequest[] };

      // Validate changes array exists and is non-empty
      if (!changes || !Array.isArray(changes) || changes.length === 0) {
        return next(createError('changes array is required and must not be empty', 400));
      }

      // Validate each action change entry
      for (const change of changes) {
        // Validate pattern is a valid RegExp
        try {
          new RegExp(change.pattern);
        } catch (err) {
          if (err instanceof SyntaxError) {
            return next(
              createError(`Invalid regex pattern: ${change.pattern} — ${err.message}`, 400),
            );
          }
          throw err;
        }

        // Validate ReDoS: reject patterns with nested quantifiers
        if (REDOS_PATTERN.test(change.pattern)) {
          return next(
            createError(
              `Potentially unsafe regex pattern (nested quantifiers): ${change.pattern}`,
              400,
            ),
          );
        }

        // Validate that the quality measure exists in the database
        if (change.qualityMeasure) {
          const measureExists = await prisma.qualityMeasure.findFirst({
            where: { code: change.qualityMeasure },
          });
          if (!measureExists) {
            return next(
              createError(
                `Quality measure not found: ${change.qualityMeasure}`,
                400,
              ),
            );
          }
        }
      }

      const data = await saveActionOverrides(systemId, changes, req.user!.id);

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(createError(`Failed to save action mappings: ${(error as Error).message}`, 500));
    }
  },
);

export default router;
