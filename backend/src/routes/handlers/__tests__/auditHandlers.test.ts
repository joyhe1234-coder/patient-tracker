/**
 * Audit Handlers Tests
 *
 * Tests for getAuditLog handler: pagination, filtering, display name
 * fallback, and error handling.
 *
 * Uses direct handler invocation with mock req/res/next (same pattern
 * as patientHandlers.bulkAssign.test.ts).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  auditLog: {
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
};

jest.unstable_mockModule('../../../config/database.js', () => ({
  prisma: mockPrisma,
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────

const { getAuditLog } = await import('../auditHandlers.js');

// ── Helpers ────────────────────────────────────────────────────────

function mockReq(query: Record<string, string> = {}) {
  return { query } as any;
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

const sampleEntry = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  action: 'UPDATE',
  entity: 'patient',
  userId: 1,
  userEmail: 'doc@example.com',
  details: '{}',
  createdAt: new Date('2026-01-15'),
  user: { displayName: 'Dr. Test' },
  ...overrides,
});

// ── Tests ──────────────────────────────────────────────────────────

describe('getAuditLog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns paginated entries with defaults (page=1, limit=50)', async () => {
    const entries = [sampleEntry(), sampleEntry({ id: 2 })];
    mockPrisma.auditLog.findMany.mockResolvedValue(entries);
    mockPrisma.auditLog.count.mockResolvedValue(2);

    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    expect(res.json).toHaveBeenCalledTimes(1);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.limit).toBe(50);
    expect(body.data.pagination.total).toBe(2);
    expect(body.data.pagination.totalPages).toBe(1);
    expect(body.data.entries).toHaveLength(2);
    expect(body.data.entries[0].userDisplayName).toBe('Dr. Test');

    // Verify skip/take passed to Prisma
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it('caps limit at 100 when client requests more', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const req = mockReq({ limit: '500' });
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.pagination.limit).toBe(100);
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('filters by action', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([sampleEntry({ action: 'CREATE' })]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const req = mockReq({ action: 'CREATE' });
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'CREATE' }),
      })
    );
  });

  it('filters by userId (parsed to int)', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([sampleEntry()]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const req = mockReq({ userId: '5' });
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 5 }),
      })
    );
  });

  it('filters by date range (startDate + endDate)', async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([sampleEntry()]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const req = mockReq({ startDate: '2026-01-01', endDate: '2026-01-31' });
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    const call = mockPrisma.auditLog.findMany.mock.calls[0][0] as any;
    expect(call.where.createdAt).toBeDefined();
    expect(call.where.createdAt.gte).toEqual(new Date('2026-01-01'));
    expect(call.where.createdAt.lte).toEqual(new Date('2026-01-31'));
  });

  it('falls back to email when user.displayName is null', async () => {
    const entry = sampleEntry({ user: null, userEmail: 'fallback@x.com' });
    mockPrisma.auditLog.findMany.mockResolvedValue([entry]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    const body = res.json.mock.calls[0][0];
    expect(body.data.entries[0].userDisplayName).toBe('fallback@x.com');
  });

  it('calls next(error) on database failure', async () => {
    const dbError = new Error('Connection lost');
    mockPrisma.auditLog.findMany.mockRejectedValue(dbError);

    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    await getAuditLog(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.json).not.toHaveBeenCalled();
  });
});
