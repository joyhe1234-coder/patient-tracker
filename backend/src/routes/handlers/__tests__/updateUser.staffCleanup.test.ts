/**
 * updateUser — StaffAssignment cleanup on role change
 *
 * Tests that StaffAssignment records are cleaned up when a user's role
 * changes FROM STAFF or FROM PHYSICIAN to a different role.
 *
 * GAP-04: Previously, only deleteUser did this cleanup.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM module mocking).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// ── Mock setup (BEFORE dynamic imports) ────────────────────────────

const mockPrisma = {
  user: {
    findUnique: jest.fn<any>(),
    findMany: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
  },
  staffAssignment: {
    deleteMany: jest.fn<any>(),
    findMany: jest.fn<any>(),
    findUnique: jest.fn<any>(),
    upsert: jest.fn<any>(),
    delete: jest.fn<any>(),
  },
  patient: {
    updateMany: jest.fn<any>(),
    findMany: jest.fn<any>(),
  },
  auditLog: {
    create: jest.fn<any>(),
    findMany: jest.fn<any>(),
    count: jest.fn<any>(),
  },
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

jest.unstable_mockModule('../../../services/authService.js', () => ({
  hashPassword: jest.fn<any>().mockResolvedValue('$2b$04$hashed'),
  toAuthUser: jest.fn<any>().mockImplementation((u: any) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    roles: u.roles,
    isActive: u.isActive,
  })),
  verifyToken: jest.fn<any>(),
  findUserById: jest.fn<any>(),
  sendTempPassword: jest.fn<any>(),
  verifyPassword: jest.fn<any>(),
}));

jest.unstable_mockModule('../../../services/emailService.js', () => ({
  isSmtpConfigured: jest.fn<any>().mockReturnValue(false),
  sendAdminPasswordResetNotification: jest.fn<any>().mockResolvedValue(false),
}));

jest.unstable_mockModule('../../../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
    bcryptSaltRounds: 4,
  },
}));

jest.unstable_mockModule('../../../middleware/auth.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
  requirePatientDataAccess: (_req: any, _res: any, next: any) => next(),
}));

// ── Dynamic imports (AFTER mocks) ──────────────────────────────────
const { updateUser } = await import('../userHandlers.js');

// ── Helpers ────────────────────────────────────────────────────────

function mockReq(params: Record<string, string>, body: Record<string, unknown>, userId = 99) {
  return {
    params,
    body,
    user: { id: userId, email: 'admin@clinic.com' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as any;
}

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = jest.fn<any>().mockReturnValue(res);
  res.json = jest.fn<any>().mockReturnValue(res);
  return res;
}

// ── Tests ──────────────────────────────────────────────────────────

describe('updateUser – StaffAssignment cleanup on role change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes StaffAssignment (staffId) when role changes from STAFF to PHYSICIAN', async () => {
    const existingUser = {
      id: 5,
      email: 'staff@clinic.com',
      displayName: 'Staff User',
      roles: ['STAFF'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['PHYSICIAN'],
    });
    mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 2 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = mockReq({ id: '5' }, { roles: ['PHYSICIAN'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    // Should succeed (no error passed to next)
    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();

    // StaffAssignment records where staffId=5 should be deleted
    expect(mockPrisma.staffAssignment.deleteMany).toHaveBeenCalledWith({
      where: { staffId: 5 },
    });
  });

  it('deletes StaffAssignment (physicianId) when role changes from PHYSICIAN to ADMIN', async () => {
    const existingUser = {
      id: 6,
      email: 'doc@clinic.com',
      displayName: 'Dr. Doc',
      roles: ['PHYSICIAN'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['ADMIN'],
    });
    mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.patient.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = mockReq({ id: '6' }, { roles: ['ADMIN'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();

    // StaffAssignment records where physicianId=6 should be deleted
    expect(mockPrisma.staffAssignment.deleteMany).toHaveBeenCalledWith({
      where: { physicianId: 6 },
    });
  });

  it('unassigns patients when role changes from PHYSICIAN to non-PHYSICIAN', async () => {
    const existingUser = {
      id: 6,
      email: 'doc@clinic.com',
      displayName: 'Dr. Doc',
      roles: ['PHYSICIAN'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['ADMIN'],
    });
    mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.patient.updateMany.mockResolvedValue({ count: 5 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = mockReq({ id: '6' }, { roles: ['ADMIN'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();

    // Patients owned by this physician should be unassigned
    expect(mockPrisma.patient.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 6 },
      data: { ownerId: null },
    });
  });

  it('does NOT clean up StaffAssignment when roles are not being changed', async () => {
    const existingUser = {
      id: 5,
      email: 'staff@clinic.com',
      displayName: 'Staff User',
      roles: ['STAFF'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      displayName: 'Updated Staff',
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    // Only updating displayName — no roles change
    const req = mockReq({ id: '5' }, { displayName: 'Updated Staff' });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    // StaffAssignment should NOT be touched
    expect(mockPrisma.staffAssignment.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('does NOT clean up StaffAssignment when user keeps STAFF role', async () => {
    const existingUser = {
      id: 5,
      email: 'staff@clinic.com',
      displayName: 'Staff User',
      roles: ['STAFF'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['STAFF'],
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    // Sending roles: ['STAFF'] — same role, no change
    const req = mockReq({ id: '5' }, { roles: ['STAFF'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.staffAssignment.deleteMany).not.toHaveBeenCalled();
  });

  it('does NOT clean up StaffAssignment when user keeps PHYSICIAN role', async () => {
    const existingUser = {
      id: 6,
      email: 'doc@clinic.com',
      displayName: 'Dr. Doc',
      roles: ['PHYSICIAN'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['PHYSICIAN'],
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = mockReq({ id: '6' }, { roles: ['PHYSICIAN'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(mockPrisma.staffAssignment.deleteMany).not.toHaveBeenCalled();
    expect(mockPrisma.patient.updateMany).not.toHaveBeenCalled();
  });

  it('cleans up BOTH physicianId assignments and patients when ADMIN,PHYSICIAN changes to STAFF', async () => {
    // User had ADMIN+PHYSICIAN roles, now changing to STAFF
    const existingUser = {
      id: 7,
      email: 'adminphy@clinic.com',
      displayName: 'Admin Physician',
      roles: ['ADMIN', 'PHYSICIAN'],
      isActive: true,
    };

    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.user.update.mockResolvedValue({
      ...existingUser,
      roles: ['STAFF'],
    });
    mockPrisma.staffAssignment.deleteMany.mockResolvedValue({ count: 1 });
    mockPrisma.patient.updateMany.mockResolvedValue({ count: 2 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const req = mockReq({ id: '7' }, { roles: ['STAFF'] });
    const res = mockRes();
    const next = jest.fn<any>();

    await updateUser(req, res, next);

    expect(next).not.toHaveBeenCalled();

    // Lost PHYSICIAN role -> clean up physicianId assignments + unassign patients
    expect(mockPrisma.staffAssignment.deleteMany).toHaveBeenCalledWith({
      where: { physicianId: 7 },
    });
    expect(mockPrisma.patient.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 7 },
      data: { ownerId: null },
    });
  });
});
