/**
 * Data Duplicate Handler Tests
 *
 * Tests for checkDuplicate and duplicateRow handlers.
 * checkDuplicate: duplicate detection logic (skip conditions, patient lookup, measure matching).
 * duplicateRow: row duplication with ownership verification.
 *
 * Uses direct handler invocation with mock req/res/next.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  patient: { findUnique: jest.fn<any>() },
  patientMeasure: {
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    create: jest.fn<any>(),
    updateMany: jest.fn<any>(),
  },
};

jest.unstable_mockModule('../../../config/database.js', () => ({
  prisma: mockPrisma,
}));

const mockGetPatientOwnerId = jest.fn<any>();
jest.unstable_mockModule('../../data.routes.js', () => ({
  getPatientOwnerId: mockGetPatientOwnerId,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

jest.unstable_mockModule('../../../services/duplicateDetector.js', () => ({
  updateDuplicateFlags: jest.fn<any>(),
}));

const mockBroadcastToRoom = jest.fn<any>();
const mockGetRoomName = jest.fn<any>().mockReturnValue('room-1');
jest.unstable_mockModule('../../../services/socketManager.js', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getRoomName: mockGetRoomName,
}));

jest.unstable_mockModule('../../../services/versionCheck.js', () => ({
  toGridRowPayload: jest.fn<any>().mockImplementation((row: any) => row),
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { checkDuplicate, duplicateRow } = await import('../dataDuplicateHandler.js');

// ── Helpers ────────────────────────────────────────────────────────

function mockReq(body: Record<string, unknown> = {}) {
  return {
    body,
    user: { id: 1, email: 'doc@example.com', displayName: 'Dr. Test' },
    socketId: 'sock-123',
  } as any;
}

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn<any>().mockReturnValue(res);
  res.json = jest.fn<any>().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn<any>();
}

// ── checkDuplicate Tests ───────────────────────────────────────────

describe('checkDuplicate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isDuplicate false when memberName is missing', async () => {
    const req = mockReq({ memberDob: '1990-01-01', requestType: 'AWV', qualityMeasure: 'BP' });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.isDuplicate).toBe(false);
    expect(body.data.existingCount).toBe(0);
  });

  it('returns isDuplicate false when requestType is empty', async () => {
    const req = mockReq({
      memberName: 'Smith',
      memberDob: '1990-01-01',
      requestType: '',
      qualityMeasure: 'BP',
    });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.isDuplicate).toBe(false);
    expect(body.data.existingCount).toBe(0);
  });

  it('returns isDuplicate false when patient not found', async () => {
    mockPrisma.patient.findUnique.mockResolvedValue(null);

    const req = mockReq({
      memberName: 'Smith, John',
      memberDob: '1990-01-01',
      requestType: 'AWV',
      qualityMeasure: 'BP',
    });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.isDuplicate).toBe(false);
    expect(body.data.existingCount).toBe(0);
  });

  it('returns isDuplicate true when matching measures exist', async () => {
    mockPrisma.patient.findUnique.mockResolvedValue({ id: 10 });
    mockPrisma.patientMeasure.findMany.mockResolvedValue([{ id: 100 }]);

    const req = mockReq({
      memberName: 'Smith, John',
      memberDob: '1990-01-01',
      requestType: 'AWV',
      qualityMeasure: 'BP',
    });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.isDuplicate).toBe(true);
    expect(body.data.existingCount).toBe(1);
  });

  it('returns isDuplicate false when no matching measures', async () => {
    mockPrisma.patient.findUnique.mockResolvedValue({ id: 10 });
    mockPrisma.patientMeasure.findMany.mockResolvedValue([]);

    const req = mockReq({
      memberName: 'Smith, John',
      memberDob: '1990-01-01',
      requestType: 'AWV',
      qualityMeasure: 'BP',
    });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.isDuplicate).toBe(false);
    expect(body.data.existingCount).toBe(0);
  });

  it('calls next(error) on database failure', async () => {
    const dbError = new Error('Connection lost');
    mockPrisma.patient.findUnique.mockRejectedValue(dbError);

    const req = mockReq({
      memberName: 'Smith, John',
      memberDob: '1990-01-01',
      requestType: 'AWV',
      qualityMeasure: 'BP',
    });
    const res = mockRes();
    const next = mockNext();

    await checkDuplicate(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ── duplicateRow Tests ─────────────────────────────────────────────

describe('duplicateRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls next with 400 error when sourceRowId is missing', async () => {
    const req = mockReq({});
    const res = mockRes();
    const next = mockNext();

    await duplicateRow(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('calls next with 404 error when source row not found', async () => {
    mockGetPatientOwnerId.mockResolvedValue(1);
    mockPrisma.patientMeasure.findUnique.mockResolvedValue(null);

    const req = mockReq({ sourceRowId: 999 });
    const res = mockRes();
    const next = mockNext();

    await duplicateRow(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });

  it('calls next with 403 error when source row belongs to another physician', async () => {
    mockGetPatientOwnerId.mockResolvedValue(1);
    mockPrisma.patientMeasure.findUnique.mockResolvedValue({
      id: 1,
      patientId: 10,
      rowOrder: 5,
      patient: { id: 10, ownerId: 99, memberName: 'Smith', memberDob: new Date() },
    });

    const req = mockReq({ sourceRowId: 1 });
    const res = mockRes();
    const next = mockNext();

    await duplicateRow(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const err = next.mock.calls[0][0] as any;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('creates duplicate row with null measure fields on success', async () => {
    mockGetPatientOwnerId.mockResolvedValue(1);

    const sourceRow = {
      id: 1,
      patientId: 10,
      rowOrder: 5,
      requestType: 'AWV',
      qualityMeasure: 'BP',
      measureStatus: 'Completed',
      patient: {
        id: 10,
        ownerId: 1,
        memberName: 'Smith, John',
        memberDob: new Date('1990-01-01'),
        memberTelephone: '555-1234',
        memberAddress: '123 Main St',
        insuranceGroup: 'Blue Cross',
      },
    };
    mockPrisma.patientMeasure.findUnique.mockResolvedValue(sourceRow);
    mockPrisma.patientMeasure.updateMany.mockResolvedValue({ count: 3 });

    const newRow = {
      id: 2,
      patientId: 10,
      rowOrder: 6,
      requestType: null,
      qualityMeasure: null,
      measureStatus: null,
      statusDate: null,
      statusDatePrompt: null,
      tracking1: null,
      tracking2: null,
      dueDate: null,
      timeIntervalDays: null,
      notes: null,
      isDuplicate: false,
      patient: sourceRow.patient,
    };
    mockPrisma.patientMeasure.create.mockResolvedValue(newRow);

    const req = mockReq({ sourceRowId: 1 });
    const res = mockRes();
    const next = mockNext();

    await duplicateRow(req, res, next);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(2);
    expect(body.data.rowOrder).toBe(6);
    // All measure fields should be null
    expect(body.data.requestType).toBeNull();
    expect(body.data.qualityMeasure).toBeNull();
    expect(body.data.measureStatus).toBeNull();
    expect(body.data.isDuplicate).toBe(false);

    // Verify create was called with rowOrder = source + 1
    expect(mockPrisma.patientMeasure.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rowOrder: 6,
          requestType: null,
          qualityMeasure: null,
        }),
      })
    );

    // Verify rows below were shifted
    expect(mockPrisma.patientMeasure.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          rowOrder: { gt: 5 },
        }),
        data: { rowOrder: { increment: 1 } },
      })
    );
  });
});
