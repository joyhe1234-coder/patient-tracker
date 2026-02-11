/**
 * Data Routes Tests
 *
 * Tests for /api/data endpoints: authentication + happy-path CRUD operations.
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
  patientMeasure: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
    updateMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
  patient: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    findFirst: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    upsert: jest.fn<any>(),
  },
  auditLog: {
    create: jest.fn<any>(),
    findFirst: jest.fn<any>(),
  },
  editLock: {
    findUnique: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  staffAssignment: {
    findFirst: jest.fn<any>(),
  },
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
}));

jest.unstable_mockModule('../../middleware/socketIdMiddleware.js', () => ({
  socketIdMiddleware: (req: any, _res: any, next: any) => {
    req.socketId = 'test-socket-id';
    next();
  },
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  isStaffAssignedToPhysician: jest.fn<any>().mockResolvedValue(true),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
  toAuthUser: (user: any) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    isActive: user.isActive,
  }),
}));

jest.unstable_mockModule('../../services/dueDateCalculator.js', () => ({
  calculateDueDate: jest.fn<any>().mockResolvedValue({ dueDate: null, timeIntervalDays: null }),
}));

jest.unstable_mockModule('../../services/statusDatePromptResolver.js', () => ({
  resolveStatusDatePrompt: jest.fn<any>().mockResolvedValue(null),
  getDefaultDatePrompt: jest.fn<any>().mockReturnValue(null),
}));

jest.unstable_mockModule('../../services/duplicateDetector.js', () => ({
  updateDuplicateFlags: jest.fn<any>(),
  checkForDuplicate: jest.fn<any>().mockResolvedValue({ isDuplicate: false }),
}));

jest.unstable_mockModule('../../services/versionCheck.js', () => ({
  checkVersion: jest.fn<any>().mockResolvedValue({ hasConflict: false }),
  toGridRowPayload: jest.fn<any>().mockImplementation((m: any) => m),
}));

jest.unstable_mockModule('../../services/socketManager.js', () => ({
  broadcastToRoom: jest.fn<any>(),
  getRoomName: jest.fn<any>().mockReturnValue('physician:1'),
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { default: dataRouter } = await import('../data.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/data', dataRouter);
  app.use(errorHandler);
  return app;
}

const samplePatient = {
  id: 1,
  memberName: 'Smith, John',
  memberDob: new Date('1990-01-15'),
  memberTelephone: '555-1234',
  memberAddress: '123 Main St',
  ownerId: 1,
};

const sampleMeasure = {
  id: 10,
  patientId: 1,
  requestType: 'AWV',
  qualityMeasure: 'Annual Wellness Visit',
  measureStatus: 'AWV completed',
  statusDate: new Date('2026-01-10'),
  statusDatePrompt: null,
  tracking1: null,
  tracking2: null,
  tracking3: null,
  dueDate: null,
  timeIntervalDays: null,
  notes: null,
  rowOrder: 0,
  isDuplicate: false,
  hgba1cGoal: null,
  hgba1cGoalReachedYear: null,
  hgba1cDeclined: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  patient: samplePatient,
};

// ── Tests ──────────────────────────────────────────────────────────

describe('Data Routes', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    authBlocked = false;
    app = createTestApp();
  });

  // ── Authentication ──────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when auth is blocked', async () => {
      authBlocked = true;
      const res = await request(app).get('/api/data');
      expect(res.status).toBe(401);
    });

    it('returns 401 for POST when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).post('/api/data').send({ memberName: 'Test', memberDob: '1990-01-01' });
      expect(res.status).toBe(401);
    });

    it('returns 401 for PUT when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).put('/api/data/1').send({ notes: 'test' });
      expect(res.status).toBe(401);
    });

    it('returns 401 for DELETE when not authenticated', async () => {
      authBlocked = true;
      const res = await request(app).delete('/api/data/1');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/data ───────────────────────────────────────────────

  describe('GET /api/data', () => {
    it('returns grid data for PHYSICIAN user', async () => {
      mockPrisma.patientMeasure.findMany.mockResolvedValue([sampleMeasure]);

      const res = await request(app).get('/api/data');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].memberName).toBe('Smith, John');
      expect(res.body.data[0].requestType).toBe('AWV');
      expect(res.body.data[0].id).toBe(10);
    });

    it('returns empty array when no data', async () => {
      mockPrisma.patientMeasure.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/data');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(0);
    });

    it('flattens patient data into grid rows', async () => {
      mockPrisma.patientMeasure.findMany.mockResolvedValue([sampleMeasure]);

      const res = await request(app).get('/api/data');

      const row = res.body.data[0];
      expect(row).toHaveProperty('patientId', 1);
      expect(row).toHaveProperty('memberDob');
      expect(row).toHaveProperty('memberTelephone', '555-1234');
      expect(row).toHaveProperty('qualityMeasure', 'Annual Wellness Visit');
    });
  });

  // ── POST /api/data ──────────────────────────────────────────────

  describe('POST /api/data', () => {
    it('creates a new row for new patient', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);
      mockPrisma.patient.create.mockResolvedValue({ ...samplePatient, id: 2 });
      mockPrisma.patientMeasure.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.patientMeasure.create.mockResolvedValue({ ...sampleMeasure, id: 20, patientId: 2, patient: { ...samplePatient, id: 2 } });
      mockPrisma.patientMeasure.findUnique.mockResolvedValue({ ...sampleMeasure, id: 20, patientId: 2, patient: { ...samplePatient, id: 2 } });

      const res = await request(app)
        .post('/api/data')
        .send({ memberName: 'Smith, John', memberDob: '1990-01-15', requestType: 'AWV' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(20);
    });

    it('returns 400 when memberName is missing', async () => {
      const res = await request(app)
        .post('/api/data')
        .send({ memberDob: '1990-01-15' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when memberDob is missing', async () => {
      const res = await request(app)
        .post('/api/data')
        .send({ memberName: 'Smith, John' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('uses existing patient when found', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(samplePatient);
      mockPrisma.patientMeasure.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.patientMeasure.create.mockResolvedValue({ ...sampleMeasure, patient: samplePatient });
      mockPrisma.patientMeasure.findUnique.mockResolvedValue({ ...sampleMeasure, patient: samplePatient });

      const res = await request(app)
        .post('/api/data')
        .send({ memberName: 'Smith, John', memberDob: '1990-01-15' });

      expect(res.status).toBe(201);
      expect(mockPrisma.patient.create).not.toHaveBeenCalled();
    });
  });

  // ── PUT /api/data/:id ───────────────────────────────────────────

  describe('PUT /api/data/:id', () => {
    it('updates a measure field', async () => {
      mockPrisma.patientMeasure.findUnique
        .mockResolvedValueOnce(sampleMeasure)  // existing check
        .mockResolvedValueOnce({ ...sampleMeasure, notes: 'Updated' }); // re-fetch
      mockPrisma.patientMeasure.update.mockResolvedValue({ ...sampleMeasure, notes: 'Updated' });

      const res = await request(app)
        .put('/api/data/10')
        .send({ notes: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when record not found', async () => {
      mockPrisma.patientMeasure.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/data/999')
        .send({ notes: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('updates patient fields (name, address)', async () => {
      mockPrisma.patientMeasure.findUnique
        .mockResolvedValueOnce(sampleMeasure)
        .mockResolvedValueOnce(sampleMeasure);
      mockPrisma.patient.findFirst.mockResolvedValue(null); // No duplicate patient
      mockPrisma.patient.update.mockResolvedValue({ ...samplePatient, memberAddress: '456 Elm St' });
      mockPrisma.patientMeasure.update.mockResolvedValue(sampleMeasure);

      const res = await request(app)
        .put('/api/data/10')
        .send({ memberAddress: '456 Elm St' });

      expect(res.status).toBe(200);
      expect(mockPrisma.patient.update).toHaveBeenCalled();
    });
  });

  // ── DELETE /api/data/:id ────────────────────────────────────────

  describe('DELETE /api/data/:id', () => {
    it('deletes an existing record', async () => {
      mockPrisma.patientMeasure.findUnique.mockResolvedValue(sampleMeasure);
      mockPrisma.patientMeasure.delete.mockResolvedValue(sampleMeasure);

      const res = await request(app).delete('/api/data/10');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(10);
    });

    it('returns 404 when record not found', async () => {
      mockPrisma.patientMeasure.findUnique.mockResolvedValue(null);

      const res = await request(app).delete('/api/data/999');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── POST /api/data/check-duplicate ──────────────────────────────

  describe('POST /api/data/check-duplicate', () => {
    it('returns isDuplicate=false for new combination', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(samplePatient);
      mockPrisma.patientMeasure.findMany.mockResolvedValue([]);

      const res = await request(app)
        .post('/api/data/check-duplicate')
        .send({
          memberName: 'Smith, John',
          memberDob: '1990-01-15',
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(false);
      expect(res.body.data.existingCount).toBe(0);
    });

    it('returns isDuplicate=true when match exists', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(samplePatient);
      mockPrisma.patientMeasure.findMany.mockResolvedValue([sampleMeasure]);

      const res = await request(app)
        .post('/api/data/check-duplicate')
        .send({
          memberName: 'Smith, John',
          memberDob: '1990-01-15',
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(true);
      expect(res.body.data.existingCount).toBe(1);
    });

    it('skips check when patient fields are missing', async () => {
      const res = await request(app)
        .post('/api/data/check-duplicate')
        .send({ requestType: 'AWV', qualityMeasure: 'AWV' });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(false);
    });

    it('skips check when requestType or qualityMeasure is empty', async () => {
      const res = await request(app)
        .post('/api/data/check-duplicate')
        .send({
          memberName: 'Smith, John',
          memberDob: '1990-01-15',
          requestType: '',
          qualityMeasure: 'AWV',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.isDuplicate).toBe(false);
    });
  });

  // ── POST /api/data/duplicate ────────────────────────────────────

  describe('POST /api/data/duplicate', () => {
    it('duplicates a row with patient data only', async () => {
      mockPrisma.patientMeasure.findUnique.mockResolvedValue(sampleMeasure);
      mockPrisma.patientMeasure.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.patientMeasure.create.mockResolvedValue({
        ...sampleMeasure,
        id: 11,
        rowOrder: 1,
        requestType: null,
        qualityMeasure: null,
        measureStatus: null,
        isDuplicate: false,
      });

      const res = await request(app)
        .post('/api/data/duplicate')
        .send({ sourceRowId: 10 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(11);
    });

    it('returns 400 when sourceRowId is missing', async () => {
      const res = await request(app)
        .post('/api/data/duplicate')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when source row not found', async () => {
      mockPrisma.patientMeasure.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/data/duplicate')
        .send({ sourceRowId: 999 });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
