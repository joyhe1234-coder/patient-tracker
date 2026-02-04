/**
 * Admin Routes Tests
 *
 * Tests for /api/admin endpoints: authorization checks.
 * Note: Full integration testing of admin functionality is done via E2E tests,
 * as ESM module mocking with Jest has limitations for complex middleware chains.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockVerifyToken = jest.fn<any>();
const mockFindUserById = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mock the database module
jest.mock('../../config/database.js', () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    staffAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock authService
jest.mock('../../services/authService.js', () => ({
  hashPassword: jest.fn(),
  toAuthUser: jest.fn(),
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
}));

// Mock emailService
jest.mock('../../services/emailService.js', () => ({
  isSmtpConfigured: jest.fn<() => boolean>().mockReturnValue(false),
  sendAdminPasswordResetNotification: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
}));

// Mock config
jest.mock('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

import adminRouter from '../admin.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRouter);
  app.use(errorHandler);
  return app;
}

describe('admin routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockVerifyToken.mockReturnValue(null);
  });

  describe('authentication requirements', () => {
    it('should return 401 for GET /users when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /users/:id when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/users/1');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /users when not authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/users')
        .send({
          email: 'new@clinic.com',
          password: 'password123',
          displayName: 'New User',
          role: 'STAFF',
        });

      expect(response.status).toBe(401);
    });

    it('should return 401 for PUT /users/:id when not authenticated', async () => {
      const response = await request(app)
        .put('/api/admin/users/1')
        .send({ displayName: 'Updated Name' });

      expect(response.status).toBe(401);
    });

    it('should return 401 for DELETE /users/:id when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/admin/users/1');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /users/:id/reset-password when not authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/users/1/reset-password')
        .send({ newPassword: 'newpassword123' });

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /physicians when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/physicians');

      expect(response.status).toBe(401);
    });

    it('should return 401 for POST /staff-assignments when not authenticated', async () => {
      const response = await request(app)
        .post('/api/admin/staff-assignments')
        .send({ staffId: 2, physicianId: 1 });

      expect(response.status).toBe(401);
    });

    it('should return 401 for DELETE /staff-assignments when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/admin/staff-assignments')
        .send({ staffId: 2, physicianId: 1 });

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /audit-log when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/audit-log');

      expect(response.status).toBe(401);
    });

    it('should return 401 for PATCH /patients/bulk-assign when not authenticated', async () => {
      const response = await request(app)
        .patch('/api/admin/patients/bulk-assign')
        .send({ patientIds: [1, 2], ownerId: 1 });

      expect(response.status).toBe(401);
    });

    it('should return 401 for GET /patients/unassigned when not authenticated', async () => {
      const response = await request(app)
        .get('/api/admin/patients/unassigned');

      expect(response.status).toBe(401);
    });
  });

  // Note: Authorization tests (403 for non-ADMIN roles) are covered by E2E Playwright tests
  // due to ESM module mocking limitations with middleware chains.
  //
  // The following scenarios should be tested via E2E:
  // - PHYSICIAN/STAFF accessing admin routes -> 403
  // - Inactive ADMIN user -> 401
  // - Valid ADMIN can access all admin routes
  // - Bulk patient assignment with valid/invalid data
  // - Get unassigned patients list
  //
  // See: frontend/e2e/auth.spec.ts
});
