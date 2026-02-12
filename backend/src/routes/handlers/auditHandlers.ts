import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';

/**
 * GET /api/admin/audit-log
 * Get audit log entries with pagination and filters
 */
export async function getAuditLog(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      entity,
      userId,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = parseInt(userId as string, 10);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, unknown>).gte = new Date(startDate as string);
      if (endDate) (where.createdAt as Record<string, unknown>).lte = new Date(endDate as string);
    }

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        entries: entries.map((e) => ({
          ...e,
          userDisplayName: e.user?.displayName || e.userEmail || 'Unknown',
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
