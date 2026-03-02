/**
 * Admin Routes — Bulk Patient Endpoints Tests
 *
 * Tests for:
 *   GET    /api/admin/patients           (getAllPatients)
 *   DELETE /api/admin/patients/bulk-delete (bulkDeletePatients)
 *
 * Covers authentication (401), authorization (403), and happy-path (200).
 *
 * Uses jest.unstable_mockModule + dynamic imports because ESM module
 * mocking with jest.mock() does not intercept transitive dependencies.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  patient: {
    findMany: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
    updateMany: jest.fn<any>(),
  },
  user: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  staffAssignment: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    upsert: jest.fn<any>(),
    delete: jest.fn<any>(),
    deleteMany: jest.fn<any>(),
  },
  auditLog: {
    create: jest.fn<any>(),
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  $transaction: jest.fn<any>().mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

// Toggle auth blocking for 401 tests
let authBlocked = false;
// Toggle role blocking for 403 tests
let roleBlocked = false;

const adminUser = {
  id: 1,
  email: 'admin@clinic.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
};

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    if (authBlocked) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    req.user = adminUser;
    next();
  },
  requireRole: () => (req: any, _res: any, next: any) => {
    if (roleBlocked) {
      const err: any = new Error('Forbidden');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  },
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  hashPassword: jest.fn<any>(),
  toAuthUser: jest.fn<any>(),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
  sendTempPassword: jest.fn<any>(),
  isStaffAssignedToPhysician: jest.fn<any>(),
}));

jest.unstable_mockModule('../../services/socketManager.js', () => ({
  broadcastToRoom: jest.fn<any>(),
  getRoomName: jest.fn<any>(),
  getIO: jest.fn<any>(),
}));

jest.unstable_mockModule('../../services/emailService.js', () => ({
  isSmtpConfigured: jest.fn<any>().mockReturnValue(false),
  sendAdminPasswordResetNotification: jest.fn<any>().mockResolvedValue(false),
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: adminRouter } = await import('../admin.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Admin Routes — Bulk Patient Endpoints', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    roleBlocked = false;
    app = createTestApp();
  });

  // ── GET /api/admin/patients ─────────────────────────────────────

  describe('GET /api/admin/patients', () => {
    it('returns 401 without Authorization header', async () => {
      authBlocked = true;

      const res = await request(app).get('/api/admin/patients');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 with a non-ADMIN JWT token', async () => {
      roleBlocked = true;

      const res = await request(app).get('/api/admin/patients');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 for ADMIN users (happy path)', async () => {
      const now = new Date();
      mockPrisma.patient.findMany.mockResolvedValue([
        {
          id: 1,
          memberName: 'Smith, John',
          memberDob: new Date('1990-01-15'),
          memberTelephone: '555-1234',
          ownerId: 2,
          insuranceGroup: 'Hill',
          updatedAt: now,
          owner: { displayName: 'Dr. Smith' },
          measures: [
            { qualityMeasure: 'A1C', measureStatus: 'Complete', updatedAt: now },
          ],
          _count: { measures: 3 },
        },
        {
          id: 2,
          memberName: 'Doe, Jane',
          memberDob: new Date('1985-06-20'),
          memberTelephone: '555-5678',
          ownerId: null,
          insuranceGroup: 'Sutter',
          updatedAt: now,
          owner: null,
          measures: [],
          _count: { measures: 0 },
        },
      ]);

      const res = await request(app).get('/api/admin/patients');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patients).toHaveLength(2);

      // Verify first patient shape
      const p1 = res.body.data.patients[0];
      expect(p1.id).toBe(1);
      expect(p1.memberName).toBe('Smith, John');
      expect(p1.memberDob).toBe('1990-01-15');
      expect(p1.ownerName).toBe('Dr. Smith');
      expect(p1.insuranceGroup).toBe('Hill');
      expect(p1.measureCount).toBe(3);
      expect(p1.latestMeasure).toBe('A1C');
      expect(p1.latestStatus).toBe('Complete');

      // Verify second patient (unassigned, no measures)
      const p2 = res.body.data.patients[1];
      expect(p2.ownerId).toBeNull();
      expect(p2.ownerName).toBeNull();
      expect(p2.latestMeasure).toBeNull();
      expect(p2.latestStatus).toBeNull();

      // Verify summary statistics
      expect(res.body.data.summary.totalPatients).toBe(2);
      expect(res.body.data.summary.assignedCount).toBe(1);
      expect(res.body.data.summary.unassignedCount).toBe(1);
      expect(res.body.data.summary.insuranceSystemCount).toBe(2);
    });
  });

  // ── DELETE /api/admin/patients/bulk-delete ────────────────────────

  describe('DELETE /api/admin/patients/bulk-delete', () => {
    it('returns 401 without Authorization header', async () => {
      authBlocked = true;

      const res = await request(app)
        .delete('/api/admin/patients/bulk-delete')
        .send({ patientIds: [1, 2] });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 with a non-ADMIN JWT token', async () => {
      roleBlocked = true;

      const res = await request(app)
        .delete('/api/admin/patients/bulk-delete')
        .send({ patientIds: [1, 2] });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 200 for ADMIN users with valid body', async () => {
      // Pre-deletion query for affected patients (Socket.IO broadcast)
      mockPrisma.patient.findMany.mockResolvedValue([
        { ownerId: 2 },
        { ownerId: null },
      ]);

      // Transaction: deleteMany + auditLog.create
      mockPrisma.patient.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/admin/patients/bulk-delete')
        .send({ patientIds: [10, 20] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.deleted).toBe(2);
      expect(res.body.message).toContain('deleted');

      // Verify deleteMany was called with the correct IDs
      expect(mockPrisma.patient.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [10, 20] } },
      });

      // Verify audit log was created
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'BULK_DELETE_PATIENTS',
          entity: 'Patient',
          userId: adminUser.id,
          userEmail: adminUser.email,
        }),
      });
    });
  });
});
