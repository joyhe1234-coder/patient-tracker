/**
 * Tests for import reassignment merge behavior
 *
 * BUG-REASSIGN-DUP-001: When importing data for Physician B and patients
 * already exist under Physician A, the diff calculator was producing INSERT
 * (duplicates) instead of SKIP/UPDATE because loadExistingRecords() only
 * loaded records for the target owner.
 *
 * Fix: calculateDiff() now also loads existing measures for patients being
 * reassigned (via loadReassignmentRecords), so the merge diff can properly
 * compare old vs new and produce SKIP/UPDATE/BOTH instead of INSERT.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { TransformedRow } from '../dataTransformer.js';
import type { ExistingRecord } from '../diffCalculator.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// --- Mock Prisma ---
const mockPatientMeasureFindMany = jest.fn() as AnyMock;
const mockPatientFindMany = jest.fn() as AnyMock;
const mockUserFindUnique = jest.fn() as AnyMock;

jest.unstable_mockModule('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    patientMeasure: {
      findMany: mockPatientMeasureFindMany,
    },
    patient: {
      findMany: mockPatientFindMany,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  })),
}));

// Import after mocks (runtime values only)
const {
  calculateDiff,
} = await import('../diffCalculator.js');

// Helper: create a mock TransformedRow
function createRow(overrides: Partial<TransformedRow> = {}): TransformedRow {
  return {
    memberName: 'Smith, John',
    memberDob: '1990-01-15',
    memberTelephone: '(555) 111-2222',
    memberAddress: '100 Main St',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    measureStatus: 'Not Addressed',
    statusDate: null,
    sourceRowIndex: 0,
    sourceMeasureColumn: 'Annual Wellness Visit',
    ...overrides,
  };
}

// Helper: build a mock Prisma PatientMeasure record (as returned by findMany with includes)
function buildPrismaMeasure(opts: {
  id: number;
  patientId: number;
  memberName: string;
  memberDob: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  ownerId: number | null;
  ownerDisplayName?: string | null;
  insuranceGroup?: string | null;
}) {
  return {
    id: opts.id,
    patientId: opts.patientId,
    requestType: opts.requestType,
    qualityMeasure: opts.qualityMeasure,
    measureStatus: opts.measureStatus,
    patient: {
      memberName: opts.memberName,
      memberDob: new Date(opts.memberDob),
      memberTelephone: null,
      memberAddress: null,
      ownerId: opts.ownerId,
      insuranceGroup: opts.insuranceGroup ?? 'hill',
      owner: opts.ownerId !== null
        ? { id: opts.ownerId, displayName: opts.ownerDisplayName ?? `Dr. Owner ${opts.ownerId}` }
        : null,
    },
  };
}

describe('Reassignment Merge Bug Fix (BUG-REASSIGN-DUP-001)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('calculateDiff with reassignment - merge mode', () => {
    it('should produce SKIP (not INSERT) when re-importing identical data with different owner', async () => {
      // Scenario: Patient "Smith, John" exists under Physician A (ownerId=5)
      // Import targets Physician B (ownerId=10) with identical data

      // loadExistingRecords(10) returns nothing for Physician B
      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // First call: loadExistingRecords(targetOwnerId=10) -> empty
        .mockResolvedValueOnce([   // Second call: loadReassignmentRecords -> Smith's measures under Physician A
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed', // non-compliant
            ownerId: 5,
            ownerDisplayName: 'Dr. A',
          }),
        ]);

      // loadReassignmentRecords: find patients that exist under different owner
      mockPatientFindMany.mockResolvedValueOnce([
        { id: 1 }, // Smith, John exists under ownerId=5 (not 10)
      ]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed' }), // Same status as existing
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      // Should be SKIP because both statuses are non-compliant (identical)
      expect(result.summary.skips).toBe(1);
      expect(result.summary.inserts).toBe(0);
      expect(result.changes[0].action).toBe('SKIP');
      expect(result.changes[0].reason).toContain('Both non-compliant');
    });

    it('should produce UPDATE when importing upgraded status with different owner', async () => {
      // Patient exists under Physician A with "Not Addressed" (non-compliant)
      // Import for Physician B with "Completed" (compliant) -> should UPDATE

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords -> old measures
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Completed' }), // compliant (upgrade)
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      expect(result.summary.updates).toBe(1);
      expect(result.summary.inserts).toBe(0);
      expect(result.changes[0].action).toBe('UPDATE');
      expect(result.changes[0].reason).toContain('Upgrading');
      expect(result.changes[0].existingMeasureId).toBe(100);
      expect(result.changes[0].existingPatientId).toBe(1);
    });

    it('should produce BOTH when importing downgraded status with different owner', async () => {
      // Patient exists under Physician A with "Completed" (compliant)
      // Import for Physician B with "Not Addressed" (non-compliant) -> should BOTH

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Completed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed' }), // non-compliant (downgrade)
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      expect(result.summary.duplicates).toBe(1);
      expect(result.summary.inserts).toBe(0);
      expect(result.changes[0].action).toBe('BOTH');
      expect(result.changes[0].reason).toContain('Downgrade');
    });

    it('should produce INSERT for truly new patients (not reassignment)', async () => {
      // New patient that doesn't exist in DB at all -> still INSERT

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords -> empty
        .mockResolvedValueOnce([]); // loadReassignmentRecords -> empty (no reassigned patients)

      mockPatientFindMany.mockResolvedValueOnce([]); // No matching patients

      const rows: TransformedRow[] = [
        createRow({ memberName: 'NewPatient, Brand', measureStatus: 'Completed' }),
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      expect(result.summary.inserts).toBe(1);
      expect(result.changes[0].action).toBe('INSERT');
    });

    it('should handle mix of reassigned and new patients', async () => {
      // Patient A exists under Physician 5, Patient B is brand new
      // Import targets Physician 10

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords -> Patient A's measures
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]); // Only Smith matches

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed', sourceRowIndex: 0 }), // Reassigned Smith -> SKIP
        createRow({ memberName: 'New, Patient', memberDob: '2000-05-20', measureStatus: 'Completed', sourceRowIndex: 1 }), // New -> INSERT
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      expect(result.summary.skips).toBe(1);
      expect(result.summary.inserts).toBe(1);
      expect(result.changes.find(c => c.memberName === 'Smith, John')?.action).toBe('SKIP');
      expect(result.changes.find(c => c.memberName === 'New, Patient')?.action).toBe('INSERT');
    });

    it('should handle multiple measures per reassigned patient', async () => {
      // Patient has 2 measures under Physician A, import has same 2 measures for Physician B

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords -> both measures
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
          buildPrismaMeasure({
            id: 101,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'DM',
            qualityMeasure: 'Diabetes Control',
            measureStatus: 'Completed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed', sourceRowIndex: 0 }),
        createRow({ requestType: 'DM', qualityMeasure: 'Diabetes Control', measureStatus: 'Completed', sourceRowIndex: 1 }),
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      // Both should be SKIP (identical statuses)
      expect(result.summary.skips).toBe(2);
      expect(result.summary.inserts).toBe(0);
    });

    it('should not duplicate records when patient exists under target AND another owner', async () => {
      // Edge case: target owner already has records AND reassignment records exist
      // Target owner's records should take precedence

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([   // loadExistingRecords(10) -> target owner has a record
          buildPrismaMeasure({
            id: 200,
            patientId: 2,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Completed',
            ownerId: 10,
          }),
        ])
        .mockResolvedValueOnce([]); // loadReassignmentRecords -> no reassigned patients (Smith already belongs to target)

      // No patients to reassign (Smith is already under ownerId=10)
      mockPatientFindMany.mockResolvedValueOnce([]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed', sourceRowIndex: 0 }), // Downgrade -> BOTH
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      // Should match against target owner's record (compliant -> non-compliant = BOTH)
      expect(result.summary.duplicates).toBe(1);
      expect(result.changes[0].action).toBe('BOTH');
      expect(result.changes[0].existingMeasureId).toBe(200);
    });

    it('should not load reassignment records when no patients have DOB', async () => {
      // Edge case: all import rows have null DOB -> no reassignment lookup

      mockPatientMeasureFindMany.mockResolvedValueOnce([]); // loadExistingRecords -> empty

      const rows: TransformedRow[] = [
        createRow({ memberDob: null, measureStatus: 'Completed', sourceRowIndex: 0 }),
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      // Should still be INSERT (new patient, no DOB match possible)
      expect(result.summary.inserts).toBe(1);
      // loadReassignmentRecords should return early without querying
      // patientFindMany should not be called
      expect(mockPatientFindMany).not.toHaveBeenCalled();
    });

    it('should count reassigned patients as existing (not new)', async () => {
      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed', sourceRowIndex: 0 }),
      ];

      const result = await calculateDiff(rows, 'merge', 10);

      // Patient should be counted as existing (not new)
      expect(result.existingPatients).toBe(1);
      expect(result.newPatients).toBe(0);
    });
  });

  describe('calculateDiff with reassignment - replace mode', () => {
    it('should include reassigned patients measures in DELETE actions for replace mode', async () => {
      // In replace mode, old measures from reassigned patients should be deleted

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(10) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Completed', sourceRowIndex: 0 }),
      ];

      const result = await calculateDiff(rows, 'replace', 10);

      // Should have DELETE for the old measure + INSERT for the new one
      expect(result.summary.deletes).toBe(1);
      expect(result.summary.inserts).toBe(1);

      const deleteChange = result.changes.find(c => c.action === 'DELETE');
      expect(deleteChange).toBeDefined();
      expect(deleteChange!.existingMeasureId).toBe(100);

      const insertChange = result.changes.find(c => c.action === 'INSERT');
      expect(insertChange).toBeDefined();
    });
  });

  describe('calculateDiff with null targetOwnerId', () => {
    it('should handle reassignment from physician to unassigned', async () => {
      // Patient exists under Physician A (ownerId=5)
      // Import targets unassigned (targetOwnerId=null)

      mockPatientMeasureFindMany
        .mockResolvedValueOnce([]) // loadExistingRecords(null) -> empty
        .mockResolvedValueOnce([   // loadReassignmentRecords
          buildPrismaMeasure({
            id: 100,
            patientId: 1,
            memberName: 'Smith, John',
            memberDob: '1990-01-15',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
            measureStatus: 'Not Addressed',
            ownerId: 5,
          }),
        ]);

      mockPatientFindMany.mockResolvedValueOnce([{ id: 1 }]);

      const rows: TransformedRow[] = [
        createRow({ measureStatus: 'Not Addressed', sourceRowIndex: 0 }),
      ];

      const result = await calculateDiff(rows, 'merge', null);

      // Should be SKIP (same status, not INSERT)
      expect(result.summary.skips).toBe(1);
      expect(result.summary.inserts).toBe(0);
    });
  });
});
