/**
 * Users Routes Tests
 *
 * Tests for /api/users endpoints: authentication + happy-path operations.
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
    findUnique: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  staffAssignment: {
    findMany: jest.fn<any>(),
  },
};

const physicianUser = {
  id: 1,
  email: 'doc@example.com',
  displayName: 'Dr. Test',
  roles: ['PHYSICIAN'],
  isActive: true,
};

const adminUser = {
  id: 2,
  email: 'admin@example.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
};

const staffUser = {
  id: 3,
  email: 'staff@example.com',
  displayName: 'Staff User',
  roles: ['STAFF'],
  isActive: true,
};

let currentUser: any = physicianUser;
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
    req.user = currentUser;
    next();
  },
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  isStaffAssignedToPhysician: jest.fn<any>().mockResolvedValue(true),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: usersRouter } = await import('../users.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Users Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    currentUser = physicianUser;
    app = createTestApp();
  });

  // ── Auth ────────────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 for GET /physicians when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/users/physicians');
      expect(res.status).toBe(401);
    });

    it('returns 401 for GET /physicians/:id when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/users/physicians/1');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/users/physicians ──────────────────────────────────

  describe('GET /api/users/physicians', () => {
    it('returns only self for PHYSICIAN role', async () => {
      currentUser = physicianUser;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        displayName: 'Dr. Test',
        email: 'doc@example.com',
        roles: ['PHYSICIAN'],
      });

      const res = await request(app).get('/api/users/physicians');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(1);
      expect(res.body.data[0].displayName).toBe('Dr. Test');
    });

    it('returns all physicians for ADMIN role', async () => {
      currentUser = adminUser;
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 1, displayName: 'Dr. Test', email: 'doc@example.com', roles: ['PHYSICIAN'] },
        { id: 5, displayName: 'Dr. Other', email: 'other@example.com', roles: ['PHYSICIAN'] },
      ]);

      const res = await request(app).get('/api/users/physicians');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('returns assigned physicians for STAFF role', async () => {
      currentUser = staffUser;
      mockPrisma.staffAssignment.findMany.mockResolvedValue([
        {
          physician: {
            id: 1,
            displayName: 'Dr. Test',
            email: 'doc@example.com',
            roles: ['PHYSICIAN'],
            isActive: true,
          },
        },
      ]);

      const res = await request(app).get('/api/users/physicians');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].displayName).toBe('Dr. Test');
    });

    it('filters out inactive physicians for STAFF role', async () => {
      currentUser = staffUser;
      mockPrisma.staffAssignment.findMany.mockResolvedValue([
        {
          physician: {
            id: 1,
            displayName: 'Dr. Active',
            email: 'active@example.com',
            roles: ['PHYSICIAN'],
            isActive: true,
          },
        },
        {
          physician: {
            id: 2,
            displayName: 'Dr. Inactive',
            email: 'inactive@example.com',
            roles: ['PHYSICIAN'],
            isActive: false,
          },
        },
      ]);

      const res = await request(app).get('/api/users/physicians');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].displayName).toBe('Dr. Active');
    });
  });

  // ── GET /api/users/physicians/:id ──────────────────────────────

  describe('GET /api/users/physicians/:id', () => {
    it('returns physician details for valid ID', async () => {
      currentUser = physicianUser;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        displayName: 'Dr. Test',
        email: 'doc@example.com',
        roles: ['PHYSICIAN'],
        isActive: true,
      });

      const res = await request(app).get('/api/users/physicians/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.displayName).toBe('Dr. Test');
    });

    it('returns 400 for invalid ID format', async () => {
      const res = await request(app).get('/api/users/physicians/abc');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PHYSICIAN_ID');
    });

    it('returns 403 when PHYSICIAN tries to view another physician', async () => {
      currentUser = physicianUser; // id=1, tries to view id=999
      const res = await request(app).get('/api/users/physicians/999');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 for non-existent physician (as ADMIN)', async () => {
      currentUser = adminUser;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/users/physicians/999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 404 for user without PHYSICIAN role', async () => {
      currentUser = adminUser;
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        displayName: 'Admin Only',
        email: 'admin@example.com',
        roles: ['ADMIN'],
        isActive: true,
      });

      const res = await request(app).get('/api/users/physicians/3');

      expect(res.status).toBe(404);
    });
  });
});
