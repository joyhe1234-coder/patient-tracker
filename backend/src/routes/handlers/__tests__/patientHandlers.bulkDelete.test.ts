/**
 * bulkDeletePatients handler — Jest unit tests (RED phase)
 *
 * Tests the DELETE /api/admin/patients/bulk-delete handler logic:
 * validation, Prisma transaction, audit log, Socket.IO broadcasts.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM module mocking).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockDeleteMany = jest.fn<any>();
const mockFindMany = jest.fn<any>();
const mockAuditLogCreate = jest.fn<any>();

const mockTx = {
  patient: {
    deleteMany: mockDeleteMany,
    findMany: mockFindMany,
  },
  auditLog: {
    create: mockAuditLogCreate,
  },
};

const mockPrisma = {
  patient: {
    deleteMany: mockDeleteMany,
    findMany: mockFindMany,
  },
  auditLog: {
    create: mockAuditLogCreate,
  },
  $transaction: jest.fn<any>().mockImplementation(
    (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)
  ),
};

const mockBroadcastToRoom = jest.fn<any>();
const mockGetRoomName = jest.fn<any>().mockImplementation(
  (id: number | 'unassigned') => `physician:${id}`
);
const mockGetIO = jest.fn<any>().mockReturnValue({});

jest.unstable_mockModule('../../../config/database.js', () => ({
  prisma: mockPrisma,
}));

jest.unstable_mockModule('../../../middleware/errorHandler.js', () => ({
  createError: (msg: string, status: number, code: string) => {
    const err: any = new Error(msg);
    err.statusCode = status;
    err.code = code;
    return err;
  },
  errorHandler: (_err: any, _req: any, _res: any, _next: any) => {},
}));

jest.unstable_mockModule('../../../services/socketManager.js', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getRoomName: mockGetRoomName,
  getIO: mockGetIO,
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { bulkDeletePatients } = await import('../patientHandlers.js');

// ── Helpers ────────────────────────────────────────────────────────

function mockReq(body: Record<string, unknown> = {}) {
  return {
    body,
    user: { id: 1, email: 'admin@clinic.com' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    socketId: 'socket-abc-123',
  } as any;
}

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn<any>().mockReturnValue(res);
  res.json = jest.fn<any>().mockReturnValue(res);
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('bulkDeletePatients handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetIO.mockReturnValue({});
    mockGetRoomName.mockImplementation(
      (id: number | 'unassigned') => `physician:${id}`
    );
  });

  // ── Validation ─────────────────────────────────────────────────

  describe('validation', () => {
    it('returns 400 VALIDATION_ERROR when patientIds is missing', async () => {
      const req = mockReq({});
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('returns 400 VALIDATION_ERROR when patientIds is an empty array', async () => {
      const req = mockReq({ patientIds: [] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('returns 400 VALIDATION_ERROR when patientIds contains non-integers', async () => {
      const req = mockReq({ patientIds: [1, 'abc', 3] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });

    it('returns 400 PAYLOAD_TOO_LARGE when patientIds has more than 5,000 elements', async () => {
      const patientIds = Array.from({ length: 5001 }, (_, i) => i + 1);
      const req = mockReq({ patientIds });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'PAYLOAD_TOO_LARGE',
        })
      );
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  // ── Successful deletion ────────────────────────────────────────

  describe('successful deletion', () => {
    it('returns 200 with correct response shape on success', async () => {
      // Patients to be deleted: two assigned to physician 2, one unassigned
      mockFindMany.mockResolvedValue([
        { ownerId: 2 },
        { ownerId: 2 },
        { ownerId: null },
      ]);
      mockDeleteMany.mockResolvedValue({ count: 3 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [10, 11, 12] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { deleted: 3 },
        message: 'Successfully deleted 3 patient(s)',
      });
    });

    it('calls prisma.$transaction with patient.deleteMany and auditLog.create', async () => {
      mockFindMany.mockResolvedValue([{ ownerId: 5 }]);
      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [42] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // Verify $transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      // Verify deleteMany was called with correct where clause
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: [42] } },
      });

      // Verify audit log was created
      expect(mockAuditLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'BULK_DELETE_PATIENTS',
          entity: 'Patient',
          entityId: null,
          userId: 1,
          userEmail: 'admin@clinic.com',
          details: {
            patientIds: [42],
            count: 1,
          },
          ipAddress: '127.0.0.1',
        }),
      });
    });

    it('handles non-existent IDs gracefully (deleteMany skips them; reports actual count)', async () => {
      // Only 1 of 3 IDs exists
      mockFindMany.mockResolvedValue([{ ownerId: 3 }]);
      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [100, 200, 300] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { deleted: 1 },
          message: 'Successfully deleted 1 patient(s)',
        })
      );
    });
  });

  // ── Socket.IO broadcasts ──────────────────────────────────────

  describe('Socket.IO broadcasts', () => {
    it('calls broadcastToRoom with affected physician room names after delete', async () => {
      // Patients owned by physicians 2 and 5
      mockFindMany.mockResolvedValue([
        { ownerId: 2 },
        { ownerId: 5 },
        { ownerId: 2 },
      ]);
      mockDeleteMany.mockResolvedValue({ count: 3 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [10, 11, 12] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // Should broadcast to physician:2 and physician:5
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:2',
        'data:refresh',
        { reason: 'bulk-delete' },
        'socket-abc-123'
      );
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:5',
        'data:refresh',
        { reason: 'bulk-delete' },
        'socket-abc-123'
      );
    });

    it('calls broadcastToRoom with "unassigned" room when unassigned patients are deleted', async () => {
      // Mix of assigned and unassigned
      mockFindMany.mockResolvedValue([
        { ownerId: 3 },
        { ownerId: null },
      ]);
      mockDeleteMany.mockResolvedValue({ count: 2 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [20, 21] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // Should broadcast to physician:3 room
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:3',
        'data:refresh',
        { reason: 'bulk-delete' },
        'socket-abc-123'
      );

      // Should broadcast to physician:unassigned room
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:unassigned',
        'data:refresh',
        { reason: 'bulk-delete' },
        'socket-abc-123'
      );
    });

    it('does not broadcast when getIO() returns null', async () => {
      mockGetIO.mockReturnValue(null);
      mockFindMany.mockResolvedValue([{ ownerId: 2 }]);
      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockAuditLogCreate.mockResolvedValue({});

      const req = mockReq({ patientIds: [10] });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkDeletePatients(req, res, next);

      expect(next).not.toHaveBeenCalled();
      // Should still return success
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { deleted: 1 },
        })
      );
      // But should NOT have broadcast
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });
  });
});
