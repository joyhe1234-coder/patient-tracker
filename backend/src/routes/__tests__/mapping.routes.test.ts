/**
 * Mapping Routes Tests
 *
 * Tests for /api/import/mappings endpoints: authentication, authorization,
 * validation, and happy-path operations.
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
  importMappingOverride: { count: jest.fn<any>().mockResolvedValue(0) },
  importActionOverride: { count: jest.fn<any>().mockResolvedValue(0) },
  qualityMeasure: { findFirst: jest.fn<any>().mockResolvedValue({ code: 'AWV' }) },
};

const adminUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
};

const physicianUser = {
  id: 2,
  email: 'doc@example.com',
  displayName: 'Dr. Test',
  roles: ['PHYSICIAN'],
  isActive: true,
};

let currentUser: any = adminUser;
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
  requireRole: (allowedRoles: string[]) => (req: any, _res: any, next: any) => {
    if (!req.user) {
      const err: any = new Error('Authentication required');
      err.statusCode = 401;
      err.code = 'UNAUTHORIZED';
      return next(err);
    }
    const hasRole = req.user.roles.some((r: string) => allowedRoles.includes(r));
    if (!hasRole) {
      const err: any = new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`);
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      return next(err);
    }
    next();
  },
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
  },
}));

// Mock configLoader
const mockSystemExists = jest.fn<any>().mockReturnValue(true);

jest.unstable_mockModule('../../services/import/configLoader.js', () => ({
  systemExists: mockSystemExists,
  listSystems: jest.fn<any>().mockReturnValue([]),
  loadSystemConfig: jest.fn<any>().mockReturnValue(null),
  isHillConfig: jest.fn<any>().mockReturnValue(false),
  isSutterConfig: jest.fn<any>().mockReturnValue(false),
  getRequiredColumns: jest.fn<any>().mockReturnValue({ patientColumns: [], dataColumns: [], minDataColumns: 0 }),
}));

// Mock mappingService
const mockLoadMergedConfig = jest.fn<any>().mockResolvedValue({
  systemId: 'hill',
  systemName: 'Hill Healthcare',
  columns: [],
  actions: [],
  lastModifiedAt: null,
  lastModifiedBy: null,
});
const mockResetToDefaults = jest.fn<any>().mockResolvedValue({
  systemId: 'hill',
  systemName: 'Hill Healthcare',
  columns: [],
  actions: [],
  lastModifiedAt: null,
  lastModifiedBy: null,
});
const mockResolveConflicts = jest.fn<any>().mockResolvedValue({
  applied: 1,
  skipped: 0,
});
const mockSaveMappingOverrides = jest.fn<any>().mockResolvedValue({
  saved: 1,
  updatedAt: new Date().toISOString(),
});
const mockSaveActionOverrides = jest.fn<any>().mockResolvedValue({
  saved: 1,
});

jest.unstable_mockModule('../../services/import/mappingService.js', () => ({
  loadMergedConfig: mockLoadMergedConfig,
  resetToDefaults: mockResetToDefaults,
  resolveConflicts: mockResolveConflicts,
  saveMappingOverrides: mockSaveMappingOverrides,
  saveActionOverrides: mockSaveActionOverrides,
}));

// Mock authService
jest.unstable_mockModule('../../services/authService.js', () => ({
  isStaffAssignedToPhysician: jest.fn<any>().mockResolvedValue(true),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: mappingRouter } = await import('../mapping.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/import/mappings', mappingRouter);
  app.use(errorHandler);
  return app;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('Mapping Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    currentUser = adminUser;
    app = createTestApp();

    // Re-set defaults after clearAllMocks
    mockSystemExists.mockReturnValue(true);
    mockLoadMergedConfig.mockResolvedValue({
      systemId: 'hill',
      systemName: 'Hill Healthcare',
      columns: [],
      actions: [],
      lastModifiedAt: null,
      lastModifiedBy: null,
    });
    mockResetToDefaults.mockResolvedValue({
      systemId: 'hill',
      systemName: 'Hill Healthcare',
      columns: [],
      actions: [],
      lastModifiedAt: null,
      lastModifiedBy: null,
    });
    mockResolveConflicts.mockResolvedValue({ applied: 1, skipped: 0 });
    mockSaveMappingOverrides.mockResolvedValue({
      saved: 1,
      updatedAt: new Date().toISOString(),
    });
    mockSaveActionOverrides.mockResolvedValue({ saved: 1 });
    mockPrisma.importMappingOverride.count.mockResolvedValue(3);
    mockPrisma.importActionOverride.count.mockResolvedValue(2);
    mockPrisma.qualityMeasure.findFirst.mockResolvedValue({ code: 'AWV' });
  });

  // ── Authentication ──────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 for GET /:systemId without token', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/import/mappings/hill');
      expect(res.status).toBe(401);
    });

    it('returns 401 for PUT /:systemId/columns without token', async () => {
      authBlocked = true;
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({ changes: [{ sourceColumn: 'A', targetType: 'PATIENT' }] });
      expect(res.status).toBe(401);
    });

    it('returns 401 for DELETE /:systemId/reset without token', async () => {
      authBlocked = true;
      const res = await request(app).delete('/api/import/mappings/hill/reset');
      expect(res.status).toBe(401);
    });
  });

  // ── Authorization (role-based) ──────────────────────────────────

  describe('authorization', () => {
    it('returns 403 for PUT /:systemId/columns when user is not ADMIN', async () => {
      currentUser = physicianUser;
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({ changes: [{ sourceColumn: 'A', targetType: 'PATIENT' }] });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for DELETE /:systemId/reset when user is not ADMIN', async () => {
      currentUser = physicianUser;
      const res = await request(app).delete('/api/import/mappings/hill/reset');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for POST /:systemId/resolve when user is not ADMIN', async () => {
      currentUser = physicianUser;
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({
          resolutions: [{
            conflictId: 'c1',
            sourceColumn: 'ColA',
            resolution: { action: 'KEEP' },
          }],
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 403 for PUT /:systemId/actions when user is not ADMIN', async () => {
      currentUser = physicianUser;
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: 'AWV',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // ── GET /api/import/mappings/:systemId ───────────────────────────

  describe('GET /:systemId', () => {
    it('returns 200 with merged config for valid systemId', async () => {
      const res = await request(app).get('/api/import/mappings/hill');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.systemId).toBe('hill');
      expect(res.body.data.systemName).toBe('Hill Healthcare');
      expect(mockLoadMergedConfig).toHaveBeenCalledWith('hill');
    });

    it('returns 404 for unknown system', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app).get('/api/import/mappings/unknown');

      expect(res.status).toBe(404);
    });

    it('allows non-admin users to read mappings', async () => {
      currentUser = physicianUser;

      const res = await request(app).get('/api/import/mappings/hill');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── PUT /api/import/mappings/:systemId/columns ──────────────────

  describe('PUT /:systemId/columns', () => {
    it('returns 200 for valid column mapping changes', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: 'Patient Name',
            targetType: 'PATIENT',
            targetField: 'memberName',
          }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSaveMappingOverrides).toHaveBeenCalledWith(
        'hill',
        expect.any(Array),
        adminUser.id,
        undefined,
      );
    });

    it('returns 400 for empty sourceColumn', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: '',
            targetType: 'PATIENT',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('sourceColumn must not be blank');
    });

    it('returns 400 for whitespace-only sourceColumn', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: '   ',
            targetType: 'PATIENT',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('sourceColumn must not be blank');
    });

    it('returns 400 for duplicate sourceColumn in request', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [
            { sourceColumn: 'Patient', targetType: 'PATIENT' },
            { sourceColumn: 'Patient', targetType: 'IGNORED' },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Duplicate source column: Patient');
    });

    it('returns 400 for invalid targetType', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: 'Patient',
            targetType: 'INVALID_TYPE',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid targetType: INVALID_TYPE');
    });

    it('returns 400 when changes array is empty', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({ changes: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('changes array is required');
    });

    it('returns 400 when changes is missing', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('changes array is required');
    });

    it('returns 409 for optimistic lock conflict', async () => {
      const conflictError: any = new Error('Mapping has been modified by another user');
      conflictError.statusCode = 409;
      mockSaveMappingOverrides.mockRejectedValue(conflictError);

      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: 'Patient',
            targetType: 'PATIENT',
          }],
          expectedUpdatedAt: '2026-01-01T00:00:00.000Z',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('modified by another user');
    });

    it('passes expectedUpdatedAt to service when provided', async () => {
      const timestamp = '2026-02-15T12:00:00.000Z';

      await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: 'Patient',
            targetType: 'PATIENT',
          }],
          expectedUpdatedAt: timestamp,
        });

      expect(mockSaveMappingOverrides).toHaveBeenCalledWith(
        'hill',
        expect.any(Array),
        adminUser.id,
        new Date(timestamp),
      );
    });

    it('returns 404 for unknown systemId', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app)
        .put('/api/import/mappings/unknown/columns')
        .send({
          changes: [{
            sourceColumn: 'Patient',
            targetType: 'PATIENT',
          }],
        });

      expect(res.status).toBe(404);
    });
  });

  // ── PUT /api/import/mappings/:systemId/actions ──────────────────

  describe('PUT /:systemId/actions', () => {
    it('returns 200 for valid action pattern changes', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: '^AWV$',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSaveActionOverrides).toHaveBeenCalledWith(
        'hill',
        expect.any(Array),
        adminUser.id,
      );
    });

    it('returns 400 for invalid regex pattern', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: '[invalid(regex',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid regex pattern');
    });

    it('returns 400 for nested quantifier ReDoS pattern', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: '(a+)+',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('nested quantifiers');
    });

    it('returns 400 when changes array is empty', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({ changes: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('changes array is required');
    });

    it('returns 404 for unknown systemId', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app)
        .put('/api/import/mappings/unknown/actions')
        .send({
          changes: [{
            pattern: '^AWV$',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(404);
    });
  });

  // ── DELETE /api/import/mappings/:systemId/reset ─────────────────

  describe('DELETE /:systemId/reset', () => {
    it('returns 200 with confirmation message', async () => {
      const res = await request(app).delete('/api/import/mappings/hill/reset');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Reset to defaults');
      expect(res.body.message).toContain('3 column overrides');
      expect(res.body.message).toContain('2 action overrides');
      expect(mockResetToDefaults).toHaveBeenCalledWith('hill', adminUser.id);
    });

    it('returns 404 for unknown systemId', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app).delete('/api/import/mappings/unknown/reset');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /api/import/mappings/:systemId/resolve ─────────────────

  describe('POST /:systemId/resolve', () => {
    it('returns 200 for valid resolutions', async () => {
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({
          resolutions: [{
            conflictId: 'conflict-1',
            sourceColumn: 'Patient Name',
            resolution: { action: 'ACCEPT_SUGGESTION', targetField: 'memberName' },
          }],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockResolveConflicts).toHaveBeenCalledWith(
        'hill',
        expect.any(Array),
        adminUser.id,
      );
    });

    it('returns 400 for empty resolutions array', async () => {
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({ resolutions: [] });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('resolutions array is required');
    });

    it('returns 400 when resolutions is missing', async () => {
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('resolutions array is required');
    });

    it('returns 400 for invalid resolution action', async () => {
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({
          resolutions: [{
            conflictId: 'conflict-1',
            sourceColumn: 'Patient Name',
            resolution: { action: 'INVALID_ACTION' },
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid resolution action');
    });

    it('returns 400 for missing resolution object', async () => {
      const res = await request(app)
        .post('/api/import/mappings/hill/resolve')
        .send({
          resolutions: [{
            conflictId: 'conflict-1',
            sourceColumn: 'Patient Name',
            // resolution is missing
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('Invalid resolution action');
    });

    it('returns 404 for unknown systemId', async () => {
      mockSystemExists.mockReturnValue(false);

      const res = await request(app)
        .post('/api/import/mappings/unknown/resolve')
        .send({
          resolutions: [{
            conflictId: 'c1',
            sourceColumn: 'ColA',
            resolution: { action: 'KEEP' },
          }],
        });

      expect(res.status).toBe(404);
    });
  });

  // ── XSS in column names (GAP-20) ──────────────────────────────────

  describe('XSS in column names (GAP-20)', () => {
    it('TC-SV-14: accepts script tag in sourceColumn as data (Prisma stores safely)', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: '<script>alert(1)</script>',
            targetType: 'PATIENT',
            targetField: 'memberName',
          }],
        });

      expect(res.status).toBe(200);
      expect(mockSaveMappingOverrides).toHaveBeenCalledWith(
        'hill',
        expect.arrayContaining([
          expect.objectContaining({
            sourceColumn: '<script>alert(1)</script>',
          }),
        ]),
        adminUser.id,
        undefined,
      );
    });

    it('TC-SV-15: accepts event handler attribute in sourceColumn as data', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: '" onmouseover="alert(1)"',
            targetType: 'PATIENT',
            targetField: 'memberName',
          }],
        });

      expect(res.status).toBe(200);
    });
  });

  // ── SQL injection defense (GAP-21) ────────────────────────────────

  describe('SQL injection defense (GAP-21)', () => {
    it('TC-SV-16: accepts SQL injection string in sourceColumn (Prisma parameterizes)', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: "'; DROP TABLE import_mapping_override; --",
            targetType: 'PATIENT',
            targetField: 'memberName',
          }],
        });

      expect(res.status).toBe(200);
      expect(mockSaveMappingOverrides).toHaveBeenCalledWith(
        'hill',
        expect.arrayContaining([
          expect.objectContaining({
            sourceColumn: "'; DROP TABLE import_mapping_override; --",
          }),
        ]),
        adminUser.id,
        undefined,
      );
    });
  });

  // ── Request body limits (GAP-22) ──────────────────────────────────

  describe('Request body limits (GAP-22)', () => {
    it('TC-SV-17: accepts large (100 entries) changes array', async () => {
      const changes = Array.from({ length: 100 }, (_, i) => ({
        sourceColumn: `Column ${i}`,
        targetType: 'MEASURE',
        requestType: 'AWV',
        qualityMeasure: 'AWV',
      }));

      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({ changes });

      expect(res.status).toBe(200);
    });

    it('TC-SV-18: handles very long sourceColumn (5000 chars) without 500', async () => {
      const longName = 'A'.repeat(5000);

      const res = await request(app)
        .put('/api/import/mappings/hill/columns')
        .send({
          changes: [{
            sourceColumn: longName,
            targetType: 'PATIENT',
            targetField: 'memberName',
          }],
        });

      // Should not crash (either 200 or 400, but never 500)
      expect([200, 400]).toContain(res.status);
    });
  });

  // ── ReDoS bypass variants (GAP-23) ────────────────────────────────

  describe('ReDoS bypass variants (GAP-23)', () => {
    it('TC-SV-19: rejects (a*)*b nested quantifier pattern', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: '(a*)*b',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('nested quantifiers');
    });

    it('TC-SV-20: rejects ([a-z]+)+ nested quantifier pattern', async () => {
      const res = await request(app)
        .put('/api/import/mappings/hill/actions')
        .send({
          changes: [{
            pattern: '([a-z]+)+',
            requestType: 'AWV',
            qualityMeasure: 'AWV',
            measureStatus: 'Compliant',
          }],
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('nested quantifiers');
    });
  });

  // ── loadMergedConfig failure (GAP-27) ─────────────────────────────

  describe('loadMergedConfig failure (GAP-27)', () => {
    it('TC-IF-10: GET /:systemId returns 500 when loadMergedConfig rejects', async () => {
      mockLoadMergedConfig.mockRejectedValue(new Error('Config file corrupted'));

      const res = await request(app).get('/api/import/mappings/hill');

      expect(res.status).toBe(500);
    });
  });

  // ── Route ordering (GAP-28) ───────────────────────────────────────

  describe('Route ordering (GAP-28)', () => {
    it('TC-IF-11: GET /mappings/hill returns mapping config (not swallowed by other routes)', async () => {
      const res = await request(app).get('/api/import/mappings/hill');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.systemId).toBe('hill');
      expect(mockLoadMergedConfig).toHaveBeenCalledWith('hill');
    });
  });
});
