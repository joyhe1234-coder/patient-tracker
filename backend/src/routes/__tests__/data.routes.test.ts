/**
 * Data Routes Tests
 *
 * Tests for /api/data endpoints: authentication requirements.
 * Note: physicianId validation for ADMIN/STAFF users is tested via E2E Playwright tests,
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
    patientMeasure: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    requestType: {
      findMany: jest.fn(),
    },
    qualityMeasure: {
      findMany: jest.fn(),
    },
    measureStatus: {
      findFirst: jest.fn(),
    },
    dueDayRule: {
      findFirst: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    editLock: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock authService
jest.mock('../../services/authService.js', () => ({
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
}));

// Mock config
jest.mock('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

import dataRouter from '../data.routes.js';
import { errorHandler } from '../../middleware/errorHandler.js';

// Create test app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/data', dataRouter);
  app.use(errorHandler);
  return app;
}

describe('data routes', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    // Default: unauthenticated
    mockVerifyToken.mockReturnValue(null);
  });

  describe('authentication requirements', () => {
    it('should return 401 for GET /api/data when not authenticated', async () => {
      const response = await request(app)
        .get('/api/data');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for DELETE /api/data/:id when not authenticated', async () => {
      const response = await request(app)
        .delete('/api/data/1');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 for POST /api/data when not authenticated', async () => {
      const response = await request(app)
        .post('/api/data')
        .send({ memberName: 'Test, User', memberDob: '1990-01-01' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for PUT /api/data/:id when not authenticated', async () => {
      const response = await request(app)
        .put('/api/data/1')
        .send({ field: 'notes', value: 'test' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 for POST /api/data/duplicate when not authenticated', async () => {
      const response = await request(app)
        .post('/api/data/duplicate')
        .send({ sourceRowId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // Note: physicianId validation tests for ADMIN/STAFF users require complex ESM mocking
  // that doesn't work reliably with Jest. These scenarios are covered by:
  // - E2E Playwright tests in frontend/e2e/
  // - Manual QA verification
  //
  // The fix for the delete endpoint (adding getQueryParams() to include physicianId)
  // was verified manually and prevents the MISSING_PHYSICIAN_ID error for ADMIN users.
});
