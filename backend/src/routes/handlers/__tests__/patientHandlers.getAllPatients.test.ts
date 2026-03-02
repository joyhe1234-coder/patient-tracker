/**
 * getAllPatients handler tests (RED phase)
 *
 * Tests for the GET /api/admin/patients handler that returns all patients
 * (assigned and unassigned) with summary statistics.
 *
 * Uses jest.unstable_mockModule + dynamic imports (ESM module mocking).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// -- Mock setup (BEFORE dynamic imports) ------------------------------------

const mockPrisma = {
  patient: {
    findMany: jest.fn<any>(),
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

// -- Dynamic imports (AFTER mocks) ------------------------------------------

const { getAllPatients } = await import('../patientHandlers.js');

// -- Helpers ----------------------------------------------------------------

function mockReq() {
  return {
    user: { id: 1, email: 'admin@clinic.com' },
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

// -- Test data factories ----------------------------------------------------

function makePatientRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    memberName: 'Adams, John',
    memberDob: new Date('1985-03-15'),
    memberTelephone: '555-1234',
    ownerId: 10,
    insuranceGroup: 'Blue Cross',
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    owner: { displayName: 'Dr. Smith' },
    measures: [
      {
        qualityMeasure: 'HgbA1c',
        measureStatus: 'Complete',
        updatedAt: new Date('2025-05-20T10:00:00Z'),
      },
    ],
    _count: { measures: 3 },
    ...overrides,
  };
}

// -- Tests ------------------------------------------------------------------

describe('getAllPatients handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with { success: true, data: { patients: [], summary: {...} } } when database is empty', async () => {
    mockPrisma.patient.findMany.mockResolvedValue([]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        patients: [],
        summary: {
          totalPatients: 0,
          assignedCount: 0,
          unassignedCount: 0,
          insuranceSystemCount: 0,
        },
      },
    });
  });

  it('returns all patients regardless of ownerId (both assigned and unassigned)', async () => {
    const assignedPatient = makePatientRow({
      id: 1,
      memberName: 'Adams, John',
      ownerId: 10,
      owner: { displayName: 'Dr. Smith' },
    });
    const unassignedPatient = makePatientRow({
      id: 2,
      memberName: 'Baker, Jane',
      ownerId: null,
      owner: null,
      insuranceGroup: 'Aetna',
    });

    mockPrisma.patient.findMany.mockResolvedValue([assignedPatient, unassignedPatient]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    expect(next).not.toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.patients).toHaveLength(2);

    // Assigned patient
    expect(body.data.patients[0].ownerId).toBe(10);
    expect(body.data.patients[0].ownerName).toBe('Dr. Smith');

    // Unassigned patient
    expect(body.data.patients[1].ownerId).toBeNull();
    expect(body.data.patients[1].ownerName).toBeNull();
  });

  it('each patient in response has the expected BulkPatient fields', async () => {
    const patientRow = makePatientRow({
      id: 42,
      memberName: 'Carter, Sarah',
      memberDob: new Date('1990-07-22'),
      memberTelephone: '555-9999',
      ownerId: 5,
      insuranceGroup: 'Cigna',
      updatedAt: new Date('2025-08-10T14:30:00Z'),
      owner: { displayName: 'Dr. Jones' },
      measures: [
        {
          qualityMeasure: 'Depression Screening',
          measureStatus: 'Not Addressed',
          updatedAt: new Date('2025-08-01T09:00:00Z'),
        },
      ],
      _count: { measures: 5 },
    });

    mockPrisma.patient.findMany.mockResolvedValue([patientRow]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    const patient = res.json.mock.calls[0][0].data.patients[0];

    expect(patient).toEqual({
      id: 42,
      memberName: 'Carter, Sarah',
      memberDob: '1990-07-22',
      memberTelephone: '555-9999',
      ownerId: 5,
      ownerName: 'Dr. Jones',
      insuranceGroup: 'Cigna',
      measureCount: 5,
      latestMeasure: 'Depression Screening',
      latestStatus: 'Not Addressed',
      updatedAt: new Date('2025-08-10T14:30:00Z').toISOString(),
    });
  });

  it('summary contains correct totalPatients, assignedCount, unassignedCount, insuranceSystemCount', async () => {
    const patients = [
      makePatientRow({ id: 1, ownerId: 10, insuranceGroup: 'Blue Cross' }),
      makePatientRow({ id: 2, ownerId: 10, insuranceGroup: 'Blue Cross' }),
      makePatientRow({ id: 3, ownerId: null, owner: null, insuranceGroup: 'Aetna' }),
      makePatientRow({ id: 4, ownerId: 20, insuranceGroup: 'Cigna' }),
      makePatientRow({ id: 5, ownerId: null, owner: null, insuranceGroup: null }),
    ];

    mockPrisma.patient.findMany.mockResolvedValue(patients);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    const summary = res.json.mock.calls[0][0].data.summary;
    expect(summary.totalPatients).toBe(5);
    expect(summary.assignedCount).toBe(3);     // ids 1, 2, 4 have ownerId
    expect(summary.unassignedCount).toBe(2);   // ids 3, 5 have ownerId null
    expect(summary.insuranceSystemCount).toBe(3); // Blue Cross, Aetna, Cigna (null is not counted)
  });

  it('patients are ordered by memberName ascending (via Prisma orderBy)', async () => {
    // We verify that the Prisma call includes the correct orderBy
    mockPrisma.patient.findMany.mockResolvedValue([]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { memberName: 'asc' },
      })
    );
  });

  it('calls prisma.patient.findMany with correct select including owner, measures, _count', async () => {
    mockPrisma.patient.findMany.mockResolvedValue([]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    expect(mockPrisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          memberName: true,
          memberDob: true,
          memberTelephone: true,
          ownerId: true,
          insuranceGroup: true,
          updatedAt: true,
          owner: { select: { displayName: true } },
          measures: {
            select: {
              qualityMeasure: true,
              measureStatus: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take: 1,
          },
          _count: { select: { measures: true } },
        }),
      })
    );
  });

  it('handles patients with no measures (latestMeasure and latestStatus are null)', async () => {
    const patientNoMeasures = makePatientRow({
      id: 7,
      measures: [],
      _count: { measures: 0 },
    });

    mockPrisma.patient.findMany.mockResolvedValue([patientNoMeasures]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    const patient = res.json.mock.calls[0][0].data.patients[0];
    expect(patient.measureCount).toBe(0);
    expect(patient.latestMeasure).toBeNull();
    expect(patient.latestStatus).toBeNull();
  });

  it('calls next(error) when prisma query throws', async () => {
    const dbError = new Error('Connection lost');
    mockPrisma.patient.findMany.mockRejectedValue(dbError);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.json).not.toHaveBeenCalled();
  });

  it('converts memberDob to ISO date string (YYYY-MM-DD)', async () => {
    const patientRow = makePatientRow({
      memberDob: new Date('2000-12-25'),
    });

    mockPrisma.patient.findMany.mockResolvedValue([patientRow]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    const patient = res.json.mock.calls[0][0].data.patients[0];
    expect(patient.memberDob).toBe('2000-12-25');
  });

  it('flattens owner.displayName to ownerName', async () => {
    const patientRow = makePatientRow({
      owner: { displayName: 'Dr. Williams' },
    });

    mockPrisma.patient.findMany.mockResolvedValue([patientRow]);

    const req = mockReq();
    const res = mockRes();
    const next = jest.fn<any>();

    await getAllPatients(req, res, next);

    const patient = res.json.mock.calls[0][0].data.patients[0];
    expect(patient.ownerName).toBe('Dr. Williams');
    // Ensure the raw owner object is not in the response
    expect(patient).not.toHaveProperty('owner');
  });
});
