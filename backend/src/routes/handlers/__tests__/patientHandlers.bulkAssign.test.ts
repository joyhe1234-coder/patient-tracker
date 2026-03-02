/**
 * bulkAssignPatients -- Socket.IO broadcast tests
 *
 * Tests that the bulkAssignPatients handler broadcasts data:refresh
 * events via Socket.IO to the correct rooms after a successful
 * assign or unassign operation.
 *
 * RED phase: These tests should FAIL because the handler does not
 * yet call broadcastToRoom / getRoomName / getIO.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM module mocking).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn<any>(),
  },
  patient: {
    updateMany: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  auditLog: {
    create: jest.fn<any>(),
  },
  $transaction: jest.fn<any>(),
};

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

const mockBroadcastToRoom = jest.fn<any>();
const mockGetRoomName = jest.fn<any>();
const mockGetIO = jest.fn<any>();

jest.unstable_mockModule('../../../services/socketManager.js', () => ({
  broadcastToRoom: mockBroadcastToRoom,
  getRoomName: mockGetRoomName,
  getIO: mockGetIO,
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────
const { bulkAssignPatients } = await import('../patientHandlers.js');

// ── Helpers ────────────────────────────────────────────────────────

function mockReq(body: Record<string, unknown>) {
  return {
    body,
    user: { id: 99, email: 'admin@clinic.com', displayName: 'Admin User' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    socketId: 'sock-abc-123',
  } as any;
}

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn<any>().mockReturnValue(res);
  res.json = jest.fn<any>().mockReturnValue(res);
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('bulkAssignPatients -- Socket.IO broadcasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default: getIO returns a truthy IO instance (socket server available)
    mockGetIO.mockReturnValue({});

    // getRoomName follows the standard pattern
    mockGetRoomName.mockImplementation((id: number | 'unassigned') => `physician:${id}`);
  });

  describe('assign (ownerId = physicianId)', () => {
    it('broadcasts data:refresh to the new physician room after successful assign', async () => {
      const targetPhysician = {
        id: 5,
        roles: ['PHYSICIAN'],
        isActive: true,
        displayName: 'Dr. Smith',
      };
      mockPrisma.user.findUnique.mockResolvedValue(targetPhysician);

      // Patients previously had various owners (or were unassigned)
      const previousPatients = [
        { id: 1, ownerId: null },
        { id: 2, ownerId: null },
      ];

      // $transaction: query previous owners, then updateMany, then auditLog
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        // Simulate the transaction callback
        const tx = {
          patient: {
            findMany: jest.fn<any>().mockResolvedValue(previousPatients),
            updateMany: jest.fn<any>().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: jest.fn<any>().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const req = mockReq({ patientIds: [1, 2], ownerId: 5 });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      // Should not have errored
      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();

      // Should broadcast to the new physician's room
      expect(mockGetRoomName).toHaveBeenCalledWith(5);
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:5',
        'data:refresh',
        { reason: 'bulk-assign' },
        'sock-abc-123',
      );
    });

    it('broadcasts data:refresh to each previous owner room when patients are reassigned from other physicians', async () => {
      const targetPhysician = {
        id: 5,
        roles: ['PHYSICIAN'],
        isActive: true,
        displayName: 'Dr. Smith',
      };
      mockPrisma.user.findUnique.mockResolvedValue(targetPhysician);

      // Patients 1 and 2 previously belonged to physician 3, patient 3 to physician 7
      const previousPatients = [
        { id: 1, ownerId: 3 },
        { id: 2, ownerId: 3 },
        { id: 3, ownerId: 7 },
      ];

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          patient: {
            findMany: jest.fn<any>().mockResolvedValue(previousPatients),
            updateMany: jest.fn<any>().mockResolvedValue({ count: 3 }),
          },
          auditLog: {
            create: jest.fn<any>().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const req = mockReq({ patientIds: [1, 2, 3], ownerId: 5 });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // Should broadcast to the new physician room (5)
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:5',
        'data:refresh',
        { reason: 'bulk-assign' },
        'sock-abc-123',
      );

      // Should broadcast to previous owner room 3 (different from new owner 5)
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:3',
        'data:refresh',
        { reason: 'bulk-reassign' },
        'sock-abc-123',
      );

      // Should broadcast to previous owner room 7 (different from new owner 5)
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:7',
        'data:refresh',
        { reason: 'bulk-reassign' },
        'sock-abc-123',
      );
    });
  });

  describe('unassign (ownerId = null)', () => {
    it('broadcasts data:refresh to the unassigned room after successful unassign', async () => {
      // Patients previously belonged to physician 3
      const previousPatients = [
        { id: 1, ownerId: 3 },
        { id: 2, ownerId: 3 },
      ];

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          patient: {
            findMany: jest.fn<any>().mockResolvedValue(previousPatients),
            updateMany: jest.fn<any>().mockResolvedValue({ count: 2 }),
          },
          auditLog: {
            create: jest.fn<any>().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const req = mockReq({ patientIds: [1, 2], ownerId: null });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).not.toHaveBeenCalled();

      // Should broadcast to the 'unassigned' room
      expect(mockGetRoomName).toHaveBeenCalledWith('unassigned');
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:unassigned',
        'data:refresh',
        { reason: 'bulk-unassign' },
        'sock-abc-123',
      );

      // Should also broadcast to previous owner room 3
      expect(mockBroadcastToRoom).toHaveBeenCalledWith(
        'physician:3',
        'data:refresh',
        { reason: 'bulk-reassign' },
        'sock-abc-123',
      );
    });
  });

  describe('input validation', () => {
    it('rejects non-array patientIds', async () => {
      const req = mockReq({ patientIds: 'not-array', ownerId: 1 });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as any;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty patientIds array', async () => {
      const req = mockReq({ patientIds: [], ownerId: 1 });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as any;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-integer ownerId', async () => {
      const req = mockReq({ patientIds: [1, 2], ownerId: 'abc' });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as any;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-integer values in patientIds array', async () => {
      const req = mockReq({ patientIds: [1, 'abc', 3], ownerId: 1 });
      const res = mockRes();
      const next = jest.fn<any>();

      await bulkAssignPatients(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = next.mock.calls[0][0] as any;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('no socket server available', () => {
    it('does not throw when getIO() returns null', async () => {
      mockGetIO.mockReturnValue(null);

      // Unassign scenario (simple case)
      const previousPatients = [
        { id: 1, ownerId: 3 },
      ];

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          patient: {
            findMany: jest.fn<any>().mockResolvedValue(previousPatients),
            updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
          },
          auditLog: {
            create: jest.fn<any>().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      const req = mockReq({ patientIds: [1], ownerId: null });
      const res = mockRes();
      const next = jest.fn<any>();

      // Should NOT throw
      await bulkAssignPatients(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();

      // broadcastToRoom should NOT have been called (no IO available)
      expect(mockBroadcastToRoom).not.toHaveBeenCalled();
    });
  });
});
