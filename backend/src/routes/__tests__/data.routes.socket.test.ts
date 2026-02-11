/**
 * Data Routes Socket.IO Event Emission Tests
 *
 * Tests that successful CRUD operations on /api/data emit the correct
 * Socket.IO events via broadcastToRoom.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express, { Express } from 'express';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockCheckVersion = jest.fn<any>();
const mockToGridRowPayload = jest.fn<any>();
const mockBroadcastToRoom = jest.fn<any>();
const mockGetRoomName = jest.fn<any>();
const mockPatientMeasureFindUnique = jest.fn<any>();
const mockPatientMeasureFindMany = jest.fn<any>();
const mockPatientMeasureCreate = jest.fn<any>();
const mockPatientMeasureUpdate = jest.fn<any>();
const mockPatientMeasureUpdateMany = jest.fn<any>();
const mockPatientMeasureDelete = jest.fn<any>();
const mockPatientFindUnique = jest.fn<any>();
const mockPatientFindFirst = jest.fn<any>();
const mockPatientCreate = jest.fn<any>();
const mockPatientUpdate = jest.fn<any>();
const mockCalculateDueDate = jest.fn<any>();
const mockResolveStatusDatePrompt = jest.fn<any>();
const mockGetDefaultDatePrompt = jest.fn<any>();
const mockUpdateDuplicateFlags = jest.fn<any>();
const mockCheckForDuplicate = jest.fn<any>();
const mockVerifyToken = jest.fn<any>();
const mockFindUserById = jest.fn<any>();

/* eslint-enable @typescript-eslint/no-explicit-any */

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: {
    patientMeasure: {
      findMany: mockPatientMeasureFindMany,
      findUnique: mockPatientMeasureFindUnique,
      create: mockPatientMeasureCreate,
      update: mockPatientMeasureUpdate,
      updateMany: mockPatientMeasureUpdateMany,
      delete: mockPatientMeasureDelete,
      count: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
      findUnique: mockPatientFindUnique,
      findFirst: mockPatientFindFirst,
      create: mockPatientCreate,
      update: mockPatientUpdate,
      upsert: jest.fn(),
    },
    requestType: { findMany: jest.fn() },
    qualityMeasure: { findMany: jest.fn() },
    measureStatus: { findFirst: jest.fn() },
    dueDayRule: { findFirst: jest.fn() },
    auditLog: { create: jest.fn(), findFirst: jest.fn() },
    editLock: { findUnique: jest.fn(), update: jest.fn() },
    staffAssignment: { findFirst: jest.fn() },
  },
}));

jest.unstable_mockModule('../../services/authService.js', () => ({
  verifyToken: mockVerifyToken,
  findUserById: mockFindUserById,
  isStaffAssignedToPhysician: jest.fn(),
  toAuthUser: (user: any) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    roles: user.roles,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt || null,
  }),
}));

jest.unstable_mockModule('../../services/versionCheck.js', () => ({
  checkVersion: mockCheckVersion,
  toGridRowPayload: mockToGridRowPayload,
}));

jest.unstable_mockModule('../../services/socketManager.js', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getRoomName: mockGetRoomName,
}));

jest.unstable_mockModule('../../services/dueDateCalculator.js', () => ({
  calculateDueDate: mockCalculateDueDate,
}));

jest.unstable_mockModule('../../services/statusDatePromptResolver.js', () => ({
  resolveStatusDatePrompt: mockResolveStatusDatePrompt,
  getDefaultDatePrompt: mockGetDefaultDatePrompt,
}));

jest.unstable_mockModule('../../services/duplicateDetector.js', () => ({
  updateDuplicateFlags: mockUpdateDuplicateFlags,
  checkForDuplicate: mockCheckForDuplicate,
}));

jest.unstable_mockModule('../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

// Dynamic imports after mock setup (ESM requirement)
const { default: dataRouter } = await import('../data.routes.js');
const { errorHandler } = await import('../../middleware/errorHandler.js');

function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/data', dataRouter);
  app.use(errorHandler);
  return app;
}

function setupAuth(userId = 1) {
  mockVerifyToken.mockReturnValue({ userId, email: 'doc@clinic.com', roles: ['PHYSICIAN'] });
  mockFindUserById.mockResolvedValue({
    id: userId,
    email: 'doc@clinic.com',
    displayName: 'Dr. Smith',
    roles: ['PHYSICIAN'],
    isActive: true,
  });
}

function createMockMeasure(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-02-10T12:00:00.000Z');
  return {
    id: 1,
    patientId: 10,
    patient: {
      id: 10,
      memberName: 'Doe, John',
      memberDob: new Date('1990-01-15'),
      memberTelephone: '555-1234',
      memberAddress: '123 Main St',
      ownerId: 1,
    },
    requestType: 'AWV',
    qualityMeasure: 'BCS',
    measureStatus: 'Pending',
    statusDate: new Date('2026-01-01'),
    statusDatePrompt: null,
    tracking1: null,
    tracking2: null,
    tracking3: null,
    dueDate: new Date('2026-03-01'),
    timeIntervalDays: 60,
    notes: null,
    rowOrder: 0,
    isDuplicate: false,
    hgba1cGoal: null,
    hgba1cGoalReachedYear: false,
    hgba1cDeclined: false,
    updatedAt: now,
    createdAt: now,
    ...overrides,
  };
}

const mockGridRowPayload = {
  id: 1,
  patientId: 10,
  memberName: 'Doe, John',
  memberDob: '1990-01-15T00:00:00.000Z',
  memberTelephone: '555-1234',
  memberAddress: '123 Main St',
  requestType: 'AWV',
  qualityMeasure: 'BCS',
  measureStatus: 'Pending',
  statusDate: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-10T12:00:00.000Z',
};

describe('data routes - Socket.IO event emissions', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockGetRoomName.mockReturnValue('physician:1');
    mockToGridRowPayload.mockReturnValue(mockGridRowPayload);
    mockCalculateDueDate.mockResolvedValue({ dueDate: null, timeIntervalDays: null });
    mockResolveStatusDatePrompt.mockResolvedValue(null);
    mockGetDefaultDatePrompt.mockReturnValue(null);
    mockCheckForDuplicate.mockResolvedValue({ isDuplicate: false });
    mockUpdateDuplicateFlags.mockResolvedValue(undefined);
    mockPatientMeasureUpdateMany.mockResolvedValue({ count: 0 });
  });

  describe('PUT /api/data/:id - row:updated event', () => {
    it('should emit row:updated event after successful update', async () => {
      setupAuth();
      const measure = createMockMeasure();
      mockPatientMeasureFindUnique.mockResolvedValue(measure);
      mockPatientMeasureUpdate.mockResolvedValue(measure);

      await request(app)
        .put('/api/data/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ notes: 'Updated' });

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:1',
        'row:updated',
        { row: mockGridRowPayload, changedBy: 'Dr. Smith' },
        undefined, // No socket ID header
      );
    });

    it('should exclude originating socket from broadcast when X-Socket-ID is set', async () => {
      setupAuth();
      const measure = createMockMeasure();
      mockPatientMeasureFindUnique.mockResolvedValue(measure);
      mockPatientMeasureUpdate.mockResolvedValue(measure);

      await request(app)
        .put('/api/data/1')
        .set('Authorization', 'Bearer valid-token')
        .set('X-Socket-ID', 'abc123')
        .send({ notes: 'Updated' });

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:1',
        'row:updated',
        expect.any(Object),
        'abc123',
      );
    });

    it('should broadcast to correct room based on patient ownerId', async () => {
      setupAuth(5);
      const measure = createMockMeasure({ patient: { ...createMockMeasure().patient, ownerId: 5 } });
      mockPatientMeasureFindUnique.mockResolvedValue(measure);
      mockPatientMeasureUpdate.mockResolvedValue(measure);
      mockGetRoomName.mockReturnValue('physician:5');

      await request(app)
        .put('/api/data/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ notes: 'Updated' });

      expect(mockGetRoomName).toHaveBeenCalledWith(5);
    });
  });

  describe('POST /api/data - row:created event', () => {
    it('should emit row:created event after successful create', async () => {
      setupAuth();
      const patient = {
        id: 10,
        memberName: 'Doe, John',
        memberDob: new Date('1990-01-15'),
        memberTelephone: null,
        memberAddress: null,
        ownerId: 1,
      };
      const newMeasure = createMockMeasure({ id: 5 });
      mockPatientFindUnique.mockResolvedValue(patient);
      mockPatientMeasureCreate.mockResolvedValue(newMeasure);
      mockPatientMeasureFindUnique.mockResolvedValue(newMeasure);

      await request(app)
        .post('/api/data')
        .set('Authorization', 'Bearer valid-token')
        .send({
          memberName: 'Doe, John',
          memberDob: '1990-01-15',
          requestType: 'AWV',
        });

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:1',
        'row:created',
        expect.objectContaining({ changedBy: 'Dr. Smith' }),
        undefined,
      );
    });
  });

  describe('DELETE /api/data/:id - row:deleted event', () => {
    it('should emit row:deleted event after successful delete', async () => {
      setupAuth();
      const measure = createMockMeasure();
      mockPatientMeasureFindUnique.mockResolvedValue(measure);
      mockPatientMeasureDelete.mockResolvedValue(measure);

      await request(app)
        .delete('/api/data/1')
        .set('Authorization', 'Bearer valid-token');

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:1',
        'row:deleted',
        { rowId: 1, changedBy: 'Dr. Smith' },
        undefined,
      );
    });
  });

  describe('POST /api/data/duplicate - row:created event', () => {
    it('should emit row:created event after successful duplicate', async () => {
      setupAuth();
      const sourceRow = createMockMeasure();
      const newMeasure = createMockMeasure({ id: 2, rowOrder: 1 });
      mockPatientMeasureFindUnique.mockResolvedValue(sourceRow);
      mockPatientMeasureCreate.mockResolvedValue(newMeasure);

      await request(app)
        .post('/api/data/duplicate')
        .set('Authorization', 'Bearer valid-token')
        .send({ sourceRowId: 1 });

      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:1',
        'row:created',
        expect.objectContaining({ changedBy: 'Dr. Smith' }),
        undefined,
      );
    });
  });
});
