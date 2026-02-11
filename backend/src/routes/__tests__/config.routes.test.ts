/**
 * Config Routes Tests
 *
 * Tests for /api/config endpoints: all config data, request types,
 * quality measures, measure statuses, tracking options, HgbA1c goals,
 * and conditional formats.
 *
 * Uses jest.unstable_mockModule + dynamic imports because ESM module
 * mocking with jest.mock() does not intercept transitive dependencies.
 * Auth logic is tested separately in middleware/__tests__/auth.test.ts.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  requestType: { findMany: jest.fn<any>(), findUnique: jest.fn<any>() },
  qualityMeasure: { findMany: jest.fn<any>(), findFirst: jest.fn<any>() },
  measureStatus: { findMany: jest.fn<any>(), findFirst: jest.fn<any>() },
  trackingOption: { findMany: jest.fn<any>() },
  dueDayRule: { findMany: jest.fn<any>() },
  hgbA1cGoalOption: { findMany: jest.fn<any>() },
  conditionalFormat: { findMany: jest.fn<any>() },
};

const testUser = {
  id: 1,
  email: 'doc@example.com',
  displayName: 'Dr. Test',
  roles: ['PHYSICIAN'],
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
    req.user = testUser;
    next();
  },
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: configRouter } = await import('../config.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Config Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    app = createTestApp();
  });

  // ── Auth middleware ──────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when auth is blocked', async () => {
      authBlocked = true;

      const res = await request(app).get('/api/config/all');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/config/all ─────────────────────────────────────────

  describe('GET /api/config/all', () => {
    it('returns all configuration data', async () => {
      const mockData = {
        requestTypes: [{ id: 1, code: 'AWV', name: 'Annual Wellness Visit', sortOrder: 1 }],
        qualityMeasures: [{ id: 1, code: 'AWV', name: 'Annual Wellness Visit', sortOrder: 1 }],
        measureStatuses: [{ id: 1, code: 'not_addressed', name: 'Not Addressed', sortOrder: 1 }],
        trackingOptions: [{ id: 1, code: 'colonoscopy', name: 'Colonoscopy', sortOrder: 1 }],
        dueDayRules: [{ id: 1, qualityMeasureId: 1, dueDays: 30 }],
        hgba1cGoalOptions: [{ id: 1, value: '< 7%', sortOrder: 1 }],
        conditionalFormats: [{ id: 1, status: 'AWV completed', color: 'green', priority: 1 }],
      };

      mockPrisma.requestType.findMany.mockResolvedValue(mockData.requestTypes);
      mockPrisma.qualityMeasure.findMany.mockResolvedValue(mockData.qualityMeasures);
      mockPrisma.measureStatus.findMany.mockResolvedValue(mockData.measureStatuses);
      mockPrisma.trackingOption.findMany.mockResolvedValue(mockData.trackingOptions);
      mockPrisma.dueDayRule.findMany.mockResolvedValue(mockData.dueDayRules);
      mockPrisma.hgbA1cGoalOption.findMany.mockResolvedValue(mockData.hgba1cGoalOptions);
      mockPrisma.conditionalFormat.findMany.mockResolvedValue(mockData.conditionalFormats);

      const res = await request(app)
        .get('/api/config/all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('requestTypes');
      expect(res.body.data).toHaveProperty('qualityMeasures');
      expect(res.body.data).toHaveProperty('measureStatuses');
      expect(res.body.data).toHaveProperty('trackingOptions');
      expect(res.body.data).toHaveProperty('dueDayRules');
      expect(res.body.data).toHaveProperty('hgba1cGoalOptions');
      expect(res.body.data).toHaveProperty('conditionalFormats');
    });

    it('queries all 7 tables in parallel', async () => {
      mockPrisma.requestType.findMany.mockResolvedValue([]);
      mockPrisma.qualityMeasure.findMany.mockResolvedValue([]);
      mockPrisma.measureStatus.findMany.mockResolvedValue([]);
      mockPrisma.trackingOption.findMany.mockResolvedValue([]);
      mockPrisma.dueDayRule.findMany.mockResolvedValue([]);
      mockPrisma.hgbA1cGoalOption.findMany.mockResolvedValue([]);
      mockPrisma.conditionalFormat.findMany.mockResolvedValue([]);

      await request(app)
        .get('/api/config/all')
        .set('Authorization', 'Bearer valid-token');

      expect(mockPrisma.requestType.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.qualityMeasure.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.measureStatus.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.trackingOption.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.dueDayRule.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.hgbA1cGoalOption.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.conditionalFormat.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── GET /api/config/request-types ───────────────────────────────

  describe('GET /api/config/request-types', () => {
    it('returns request types sorted by sortOrder', async () => {
      const mockTypes = [
        { id: 1, code: 'AWV', name: 'Annual Wellness Visit', sortOrder: 1 },
        { id: 2, code: 'Quality', name: 'Quality', sortOrder: 2 },
      ];
      mockPrisma.requestType.findMany.mockResolvedValue(mockTypes);

      const res = await request(app)
        .get('/api/config/request-types')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockTypes);
    });
  });

  // ── GET /api/config/quality-measures/:requestTypeCode ───────────

  describe('GET /api/config/quality-measures/:requestTypeCode', () => {
    it('returns quality measures for a valid request type', async () => {
      mockPrisma.requestType.findUnique.mockResolvedValue({ id: 1, code: 'Quality' });
      const mockMeasures = [
        { id: 1, code: 'diabetic_eye', name: 'Diabetic Eye Exam', sortOrder: 1 },
      ];
      mockPrisma.qualityMeasure.findMany.mockResolvedValue(mockMeasures);

      const res = await request(app)
        .get('/api/config/quality-measures/Quality')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockMeasures);
    });

    it('returns empty array for unknown request type code', async () => {
      mockPrisma.requestType.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/config/quality-measures/Unknown')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  // ── GET /api/config/measure-statuses/:qualityMeasureCode ────────

  describe('GET /api/config/measure-statuses/:qualityMeasureCode', () => {
    it('returns measure statuses for a valid quality measure', async () => {
      mockPrisma.qualityMeasure.findFirst.mockResolvedValue({ id: 1, code: 'AWV' });
      const mockStatuses = [
        { id: 1, code: 'not_addressed', name: 'Not Addressed', sortOrder: 1 },
        { id: 2, code: 'awv_completed', name: 'AWV completed', sortOrder: 2 },
      ];
      mockPrisma.measureStatus.findMany.mockResolvedValue(mockStatuses);

      const res = await request(app)
        .get('/api/config/measure-statuses/AWV')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStatuses);
    });

    it('returns empty array for unknown quality measure code', async () => {
      mockPrisma.qualityMeasure.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/config/measure-statuses/Unknown')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  // ── GET /api/config/tracking-options/:measureStatusCode ─────────

  describe('GET /api/config/tracking-options/:measureStatusCode', () => {
    it('returns tracking options for a valid measure status', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({ id: 1, code: 'colon_ordered' });
      const mockOptions = [
        { id: 1, name: 'Colonoscopy', trackingNumber: 1, sortOrder: 1 },
        { id: 2, name: 'FOBT', trackingNumber: 1, sortOrder: 2 },
      ];
      mockPrisma.trackingOption.findMany.mockResolvedValue(mockOptions);

      const res = await request(app)
        .get('/api/config/tracking-options/colon_ordered')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockOptions);
    });

    it('returns empty array for unknown measure status code', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/config/tracking-options/unknown_status')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  // ── GET /api/config/hgba1c-goals ────────────────────────────────

  describe('GET /api/config/hgba1c-goals', () => {
    it('returns HgbA1c goal options sorted by sortOrder', async () => {
      const mockGoals = [
        { id: 1, value: '< 7%', sortOrder: 1 },
        { id: 2, value: '< 8%', sortOrder: 2 },
      ];
      mockPrisma.hgbA1cGoalOption.findMany.mockResolvedValue(mockGoals);

      const res = await request(app)
        .get('/api/config/hgba1c-goals')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockGoals);
    });
  });

  // ── GET /api/config/conditional-formats ─────────────────────────

  describe('GET /api/config/conditional-formats', () => {
    it('returns conditional formats sorted by priority desc', async () => {
      const mockFormats = [
        { id: 1, status: 'AWV completed', color: 'green', priority: 10 },
        { id: 2, status: 'Not Addressed', color: 'white', priority: 1 },
      ];
      mockPrisma.conditionalFormat.findMany.mockResolvedValue(mockFormats);

      const res = await request(app)
        .get('/api/config/conditional-formats')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockFormats);
    });
  });

  // ── Error handling ──────────────────────────────────────────────

  describe('error handling', () => {
    it('passes database errors to error handler', async () => {
      mockPrisma.requestType.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.qualityMeasure.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.measureStatus.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.trackingOption.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.dueDayRule.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.hgbA1cGoalOption.findMany.mockRejectedValue(new Error('DB connection failed'));
      mockPrisma.conditionalFormat.findMany.mockRejectedValue(new Error('DB connection failed'));

      const res = await request(app)
        .get('/api/config/all')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(500);
    });
  });
});
