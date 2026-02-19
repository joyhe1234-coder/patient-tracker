/**
 * Data Routes Version Check Integration Tests
 *
 * Tests for optimistic concurrency control via expectedVersion / forceOverwrite
 * in PUT /api/data/:id.
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
const mockPatientMeasureUpdate = jest.fn<any>();
const mockPatientFindFirst = jest.fn<any>();
const mockPatientUpdate = jest.fn<any>();
const mockAuditLogCreate = jest.fn<any>();
const mockAuditLogFindFirst = jest.fn<any>();
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
      findMany: jest.fn(),
      findUnique: mockPatientMeasureFindUnique,
      create: jest.fn(),
      update: mockPatientMeasureUpdate,
      delete: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: mockPatientFindFirst,
      create: jest.fn(),
      update: mockPatientUpdate,
      upsert: jest.fn(),
    },
    requestType: { findMany: jest.fn() },
    qualityMeasure: { findMany: jest.fn() },
    measureStatus: { findFirst: jest.fn() },
    dueDayRule: { findFirst: jest.fn() },
    auditLog: {
      create: mockAuditLogCreate,
      findFirst: mockAuditLogFindFirst,
    },
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

// Helper to set up authenticated physician
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

// Helper to create a mock measure row
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

describe('data routes - version check', () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    mockGetRoomName.mockReturnValue('physician:1');
    mockToGridRowPayload.mockReturnValue({ id: 1, updatedAt: '2026-02-10T12:00:00.000Z' });
    mockCalculateDueDate.mockResolvedValue({ dueDate: null, timeIntervalDays: null });
    mockResolveStatusDatePrompt.mockResolvedValue(null);
    mockGetDefaultDatePrompt.mockReturnValue(null);
    mockCheckForDuplicate.mockResolvedValue({ isDuplicate: false });
    mockAuditLogCreate.mockResolvedValue({});
    mockAuditLogFindFirst.mockResolvedValue(null);
  });

  it('should return 200 when PUT has no expectedVersion (backward compatibility)', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockPatientMeasureUpdate.mockResolvedValue(measure);

    const response = await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({ notes: 'Updated notes' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // checkVersion should NOT have been called
    expect(mockCheckVersion).not.toHaveBeenCalled();
  });

  it('should return 200 when PUT has matching expectedVersion (no conflict)', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockPatientMeasureUpdate.mockResolvedValue(measure);
    mockCheckVersion.mockResolvedValue({
      hasConflict: false,
      conflictFields: [],
      serverRow: null,
      changedBy: null,
    });

    const response = await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({
        notes: 'Updated notes',
        expectedVersion: '2026-02-10T12:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(mockCheckVersion).toHaveBeenCalledWith(
      1,
      '2026-02-10T12:00:00.000Z',
      ['notes'],
    );
  });

  it('should return 409 when PUT has mismatched expectedVersion and conflicting fields', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockCheckVersion.mockResolvedValue({
      hasConflict: true,
      conflictFields: ['notes'],
      serverRow: { id: 1, notes: 'Server notes', updatedAt: '2026-02-10T12:30:00.000Z' },
      changedBy: 'Dr. Other',
    });

    const response = await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({
        notes: 'My notes',
        expectedVersion: '2026-02-10T11:00:00.000Z',
      });

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('VERSION_CONFLICT');
    expect(response.body.data.conflictFields).toEqual(['notes']);
    expect(response.body.data.changedBy).toBe('Dr. Other');
    expect(response.body.data.serverRow).toBeDefined();
  });

  it('should return 200 when PUT has forceOverwrite: true (skip version check)', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockPatientMeasureUpdate.mockResolvedValue(measure);

    const response = await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({
        notes: 'Force override notes',
        expectedVersion: '2026-02-10T11:00:00.000Z',
        forceOverwrite: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    // checkVersion should NOT have been called because forceOverwrite is true
    expect(mockCheckVersion).not.toHaveBeenCalled();
  });

  it('should create audit log with conflictOverride when forceOverwrite is true', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockPatientMeasureUpdate.mockResolvedValue(measure);

    await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({
        notes: 'Force override notes',
        expectedVersion: '2026-02-10T11:00:00.000Z',
        forceOverwrite: true,
      });

    expect(mockAuditLogCreate).toHaveBeenCalledTimes(1);
    const auditLogData = (mockAuditLogCreate.mock.calls[0][0] as any).data;
    expect(auditLogData.action).toBe('UPDATE');
    expect(auditLogData.entity).toBe('patient_measure');
    expect(auditLogData.entityId).toBe(1);
    expect(auditLogData.changes.conflictOverride).toBe(true);
  });

  it('should return 200 when PUT has non-overlapping fields (auto-merge)', async () => {
    setupAuth();
    const measure = createMockMeasure();
    mockPatientMeasureFindUnique.mockResolvedValue(measure);
    mockPatientMeasureUpdate.mockResolvedValue(measure);
    mockCheckVersion.mockResolvedValue({
      hasConflict: false,
      conflictFields: [],
      serverRow: null,
      changedBy: null,
    });

    const response = await request(app)
      .put('/api/data/1')
      .set('Authorization', 'Bearer valid-token')
      .send({
        notes: 'My notes change',
        expectedVersion: '2026-02-10T11:00:00.000Z',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
