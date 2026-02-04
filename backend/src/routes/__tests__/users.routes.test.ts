/**
 * Users Routes Tests
 *
 * Tests for /api/users endpoints: authentication requirements.
 * Phase 12: Patient Ownership & Assignment System
 *
 * Note: Role-based authorization tests (403 for non-assigned physicians, etc.)
 * are covered by E2E Playwright tests due to ESM module mocking limitations.
 * See frontend/e2e/auth.spec.ts for comprehensive auth and access control tests.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockVerifyToken = jest.fn<any>();
const mockFindUserById = jest.fn<any>();
const mockIsStaffAssignedToPhysician = jest.fn<any>();

const mockUserFindUnique = jest.fn<any>();
const mockUserFindMany = jest.fn<any>();
const mockStaffAssignmentFindMany = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Mock the database module
jest.mock('../../config/database.js', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
    },
    staffAssignment: {
      findMany: mockStaffAssignmentFindMany,
    },
  },
}));

// Mock authService
jest.mock('../../services/authService.js', () => ({
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
  isStaffAssignedToPhysician: mockIsStaffAssignedToPhysician,
}));

// Mock config
jest.mock('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

import usersRouter from '../users.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.use(errorHandler);
  return app;
}

describe('users routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockVerifyToken.mockReturnValue(null);
  });

  describe('authentication requirements', () => {
    it('should return 401 for GET /physicians when not authenticated', async () => {
      const response = await request(app)
        .get('/api/users/physicians');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for GET /physicians/:id when not authenticated', async () => {
      const response = await request(app)
        .get('/api/users/physicians/1');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for GET /physicians with missing Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/users/physicians')
        .set('Authorization', 'InvalidToken');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for GET /physicians/:id with invalid token format', async () => {
      const response = await request(app)
        .get('/api/users/physicians/1')
        .set('Authorization', 'Basic abc123');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  // Note: The following scenarios are tested via E2E Playwright tests
  // due to ESM module mocking limitations with Jest:
  //
  // GET /physicians:
  // - PHYSICIAN returns only self
  // - STAFF returns only assigned physicians
  // - STAFF filters out inactive physicians
  // - ADMIN returns all physicians with canHavePatients
  // - STAFF with no assignments returns empty array
  //
  // GET /physicians/:id:
  // - Invalid physician ID returns 400
  // - PHYSICIAN viewing another physician returns 403
  // - PHYSICIAN viewing self returns 200
  // - STAFF viewing unassigned physician returns 403
  // - STAFF viewing assigned physician returns 200
  // - ADMIN can view any physician
  // - Non-existent physician returns 404
  // - User without canHavePatients returns 404
  //
  // See: frontend/e2e/auth.spec.ts
});
