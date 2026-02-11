/**
 * Admin Routes Tests
 *
 * Tests for /api/admin endpoints: authentication + happy-path CRUD operations.
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
  user: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  patient: {
    updateMany: jest.fn<any>(),
    findMany: jest.fn<any>(),
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
};

const adminUser = {
  id: 1,
  email: 'admin@clinic.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
};

let authBlocked = false;

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
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  hashPassword: jest.fn<any>().mockResolvedValue('$2b$04$hashedpassword'),
  toAuthUser: jest.fn<any>().mockImplementation((user: any) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    isActive: user.isActive,
  })),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
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

describe('Admin Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    app = createTestApp();
  });

  // ── Authentication ──────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 for all endpoints when not authenticated', async () => {
      authBlocked = true;

      const endpoints = [
        { method: 'get', path: '/api/admin/users' },
        { method: 'get', path: '/api/admin/users/1' },
        { method: 'post', path: '/api/admin/users' },
        { method: 'put', path: '/api/admin/users/1' },
        { method: 'delete', path: '/api/admin/users/1' },
        { method: 'get', path: '/api/admin/physicians' },
        { method: 'get', path: '/api/admin/audit-log' },
        { method: 'get', path: '/api/admin/patients/unassigned' },
      ];

      for (const ep of endpoints) {
        const res = await (request(app) as any)[ep.method](ep.path);
        expect(res.status).toBe(401);
      }
    });
  });

  // ── GET /api/admin/users ────────────────────────────────────────

  describe('GET /api/admin/users', () => {
    it('returns list of all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 1,
          email: 'admin@clinic.com',
          displayName: 'Admin',
          roles: ['ADMIN'],
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignedPhysicians: [],
          assignedStaff: [],
          _count: { patients: 0 },
        },
        {
          id: 2,
          email: 'doc@clinic.com',
          displayName: 'Dr. Smith',
          roles: ['PHYSICIAN'],
          isActive: true,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          assignedPhysicians: [],
          assignedStaff: [{ staff: { id: 3, displayName: 'Staff Member' } }],
          _count: { patients: 5 },
        },
      ]);

      const res = await request(app).get('/api/admin/users');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[1].patientCount).toBe(5);
      expect(res.body.data[1].assignedStaff).toHaveLength(1);
    });
  });

  // ── GET /api/admin/users/:id ────────────────────────────────────

  describe('GET /api/admin/users/:id', () => {
    it('returns a specific user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'doc@clinic.com',
        displayName: 'Dr. Smith',
        roles: ['PHYSICIAN'],
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedPhysicians: [],
        assignedStaff: [],
        _count: { patients: 3 },
      });

      const res = await request(app).get('/api/admin/users/2');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(2);
      expect(res.body.data.email).toBe('doc@clinic.com');
      expect(res.body.data.patientCount).toBe(3);
    });

    it('returns 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/admin/users/999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  // ── POST /api/admin/users ───────────────────────────────────────

  describe('POST /api/admin/users', () => {
    it('creates a new user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // No existing email
      mockPrisma.user.create.mockResolvedValue({
        id: 10,
        email: 'new@clinic.com',
        displayName: 'New User',
        roles: ['PHYSICIAN'],
        isActive: true,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/admin/users')
        .send({
          email: 'new@clinic.com',
          password: 'password123',
          displayName: 'New User',
          roles: ['PHYSICIAN'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('new@clinic.com');
    });

    it('returns 409 for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'existing@clinic.com' });

      const res = await request(app)
        .post('/api/admin/users')
        .send({
          email: 'existing@clinic.com',
          password: 'password123',
          displayName: 'Existing User',
          roles: ['PHYSICIAN'],
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('returns 400 for invalid role combination (STAFF + PHYSICIAN)', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .send({
          email: 'bad@clinic.com',
          password: 'password123',
          displayName: 'Bad Combo',
          roles: ['STAFF', 'PHYSICIAN'],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ROLE_COMBINATION');
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .send({ email: 'incomplete@clinic.com' });

      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .send({
          email: 'not-an-email',
          password: 'password123',
          displayName: 'Invalid',
          roles: ['PHYSICIAN'],
        });

      expect(res.status).toBe(400);
    });
  });

  // ── PUT /api/admin/users/:id ────────────────────────────────────

  describe('PUT /api/admin/users/:id', () => {
    it('updates user display name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'doc@clinic.com',
        displayName: 'Old Name',
        roles: ['PHYSICIAN'],
        isActive: true,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 2,
        email: 'doc@clinic.com',
        displayName: 'New Name',
        roles: ['PHYSICIAN'],
        isActive: true,
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .put('/api/admin/users/2')
        .send({ displayName: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/admin/users/999')
        .send({ displayName: 'Updated' });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/admin/users/:id ─────────────────────────────────

  describe('DELETE /api/admin/users/:id', () => {
    it('deactivates a user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'doc@clinic.com',
        displayName: 'Dr. Smith',
        roles: ['PHYSICIAN'],
        isActive: true,
      });
      mockPrisma.patient.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app).delete('/api/admin/users/2');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deactivated');
    });

    it('returns 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/admin/users/999');

      expect(res.status).toBe(404);
    });

    it('prevents deleting self', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const res = await request(app).delete('/api/admin/users/1');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  // ── POST /api/admin/users/:id/reset-password ───────────────────

  describe('POST /api/admin/users/:id/reset-password', () => {
    it('resets user password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        email: 'doc@clinic.com',
        displayName: 'Dr. Smith',
      });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .post('/api/admin/users/2/reset-password')
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/users/999/reset-password')
        .send({ newPassword: 'newpassword123' });

      expect(res.status).toBe(404);
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/admin/users/2/reset-password')
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ── GET /api/admin/physicians ───────────────────────────────────

  describe('GET /api/admin/physicians', () => {
    it('returns active physicians', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 2, displayName: 'Dr. Smith', roles: ['PHYSICIAN'] },
        { id: 3, displayName: 'Dr. Jones', roles: ['ADMIN', 'PHYSICIAN'] },
      ]);

      const res = await request(app).get('/api/admin/physicians');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  // ── POST /api/admin/staff-assignments ───────────────────────────

  describe('POST /api/admin/staff-assignments', () => {
    it('creates a staff assignment', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 3, roles: ['STAFF'] })     // staff
        .mockResolvedValueOnce({ id: 2, roles: ['PHYSICIAN'] }); // physician
      mockPrisma.staffAssignment.upsert.mockResolvedValue({
        id: 1,
        staffId: 3,
        physicianId: 2,
      });

      const res = await request(app)
        .post('/api/admin/staff-assignments')
        .send({ staffId: 3, physicianId: 2 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 for invalid staff user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/admin/staff-assignments')
        .send({ staffId: 999, physicianId: 2 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('STAFF_NOT_FOUND');
    });

    it('returns 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/admin/staff-assignments')
        .send({ staffId: 'abc', physicianId: 2 });

      expect(res.status).toBe(400);
    });
  });

  // ── DELETE /api/admin/staff-assignments ──────────────────────────

  describe('DELETE /api/admin/staff-assignments', () => {
    it('removes a staff assignment', async () => {
      mockPrisma.staffAssignment.delete.mockResolvedValue({});

      const res = await request(app)
        .delete('/api/admin/staff-assignments')
        .send({ staffId: 3, physicianId: 2 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── GET /api/admin/audit-log ────────────────────────────────────

  describe('GET /api/admin/audit-log', () => {
    it('returns paginated audit log entries', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 1,
          userEmail: 'admin@clinic.com',
          action: 'LOGIN',
          entity: 'user',
          entityId: 1,
          createdAt: new Date(),
          user: { displayName: 'Admin' },
        },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const res = await request(app).get('/api/admin/audit-log');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.entries).toHaveLength(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('supports pagination params', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([]);
      mockPrisma.auditLog.count.mockResolvedValue(100);

      const res = await request(app).get('/api/admin/audit-log?page=2&limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.limit).toBe(10);
    });
  });

  // ── PATCH /api/admin/patients/bulk-assign ───────────────────────

  describe('PATCH /api/admin/patients/bulk-assign', () => {
    it('assigns patients to a physician', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 2,
        roles: ['PHYSICIAN'],
        isActive: true,
        displayName: 'Dr. Smith',
      });
      mockPrisma.patient.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .patch('/api/admin/patients/bulk-assign')
        .send({ patientIds: [1, 2, 3], ownerId: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBe(3);
    });

    it('unassigns patients when ownerId is null', async () => {
      mockPrisma.patient.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const res = await request(app)
        .patch('/api/admin/patients/bulk-assign')
        .send({ patientIds: [1, 2], ownerId: null });

      expect(res.status).toBe(200);
      expect(res.body.data.updated).toBe(2);
      expect(res.body.data.newOwnerId).toBeNull();
    });

    it('returns 400 for empty patientIds', async () => {
      const res = await request(app)
        .patch('/api/admin/patients/bulk-assign')
        .send({ patientIds: [], ownerId: 1 });

      expect(res.status).toBe(400);
    });

    it('returns 404 for non-existent target user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/admin/patients/bulk-assign')
        .send({ patientIds: [1], ownerId: 999 });

      expect(res.status).toBe(404);
    });
  });

  // ── GET /api/admin/patients/unassigned ──────────────────────────

  describe('GET /api/admin/patients/unassigned', () => {
    it('returns unassigned patients', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([
        {
          id: 1,
          memberName: 'Smith, John',
          memberDob: new Date('1990-01-15'),
          memberTelephone: '555-1234',
          _count: { measures: 2 },
        },
      ]);

      const res = await request(app).get('/api/admin/patients/unassigned');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].memberName).toBe('Smith, John');
      expect(res.body.data[0].measureCount).toBe(2);
    });

    it('returns empty array when no unassigned patients', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/admin/patients/unassigned');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });
});
