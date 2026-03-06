/**
 * Version Check Service Tests
 *
 * Tests for optimistic concurrency control: version checking,
 * field-level conflict detection, and auto-merge logic.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindUnique = jest.fn<any>();
const mockAuditLogFindFirst = jest.fn<any>();
const mockAuditLogFindMany = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use unstable_mockModule for ESM compatibility
jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: {
    patientMeasure: {
      findUnique: mockFindUnique,
    },
    auditLog: {
      findFirst: mockAuditLogFindFirst,
      findMany: mockAuditLogFindMany,
    },
  },
}));

// Dynamic import after mock setup (ESM requirement)
const { checkVersion, toGridRowPayload } = await import('../versionCheck.js');

// Helper to create a mock PatientMeasure with patient
function createMockMeasure(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-02-10T12:00:00.000Z');
  return {
    id: 1,
    patientId: 10,
    patient: {
      memberName: 'Doe, John',
      memberDob: new Date('1990-01-15'),
      memberTelephone: '555-1234',
      memberAddress: '123 Main St',
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

describe('versionCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkVersion', () => {
    it('should return no conflict when timestamps match', async () => {
      const now = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: now });
      mockFindUnique.mockResolvedValue(measure);

      const result = await checkVersion(1, now.toISOString(), ['notes']);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
      expect(result.serverRow).toBeNull();
      expect(result.changedBy).toBeNull();
    });

    it('should return conflict when timestamps differ and fields overlap', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      // AuditLog says "notes" was changed by someone
      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        {
          changes: { fields: [{ field: 'notes' }] },
        },
      ]);

      const result = await checkVersion(1, clientVersion.toISOString(), ['notes']);

      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['notes']);
      expect(result.serverRow).not.toBeNull();
      expect(result.serverRow!.id).toBe(1);
      expect(result.changedBy).toBe('Other User');
    });

    it('should return no conflict when timestamps differ but fields do NOT overlap (auto-merge)', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      // AuditLog says "measureStatus" was changed (different from incoming "notes")
      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        {
          changes: { fields: [{ field: 'measureStatus' }] },
        },
      ]);

      const result = await checkVersion(1, clientVersion.toISOString(), ['notes']);

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should return conflict when timestamps differ and no audit log field info is available', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      // AuditLog has no field-level change data
      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: null },
      ]);

      const result = await checkVersion(1, clientVersion.toISOString(), ['notes']);

      // When no field info, assume full conflict
      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['notes']);
    });

    it('should return no conflict when row is not found (deleted)', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await checkVersion(1, '2026-02-10T12:00:00.000Z', ['notes']);

      expect(result.hasConflict).toBe(false);
      expect(result.serverRow).toBeNull();
    });

    it('should correctly identify changedBy from audit log userEmail fallback', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      // AuditLog has user email but no displayName
      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: null, // User might have been deleted
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: { fields: [{ field: 'notes' }] } },
      ]);

      const result = await checkVersion(1, clientVersion.toISOString(), ['notes']);

      expect(result.hasConflict).toBe(true);
      expect(result.changedBy).toBe('other@clinic.com');
    });

    it('should handle multiple overlapping fields', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        {
          changes: { fields: [{ field: 'notes' }, { field: 'measureStatus' }] },
        },
      ]);

      const result = await checkVersion(
        1,
        clientVersion.toISOString(),
        ['notes', 'measureStatus', 'tracking1'],
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['notes', 'measureStatus']);
    });

    it('should return no conflict when overlapping field values are identical (same-value suppression)', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      // Server has notes: null (the default)
      const measure = createMockMeasure({ updatedAt: serverVersion, notes: null });
      mockFindUnique.mockResolvedValue(measure);

      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: { fields: [{ field: 'notes' }] } },
      ]);

      // Client sends the same value (null) with a stale expectedVersion
      const result = await checkVersion(
        1,
        clientVersion.toISOString(),
        ['notes'],
        { notes: null },
      );

      // Same value → no real conflict
      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should only report fields with different values when some overlap same and some differ', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({
        updatedAt: serverVersion,
        notes: 'Same note',
        measureStatus: 'Completed',
      });
      mockFindUnique.mockResolvedValue(measure);

      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: { fields: [{ field: 'notes' }, { field: 'measureStatus' }] } },
      ]);

      // Client sends notes (same value) and measureStatus (different value)
      const result = await checkVersion(
        1,
        clientVersion.toISOString(),
        ['notes', 'measureStatus'],
        { notes: 'Same note', measureStatus: 'Pending' },
      );

      // Only measureStatus should be a real conflict
      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['measureStatus']);
    });

    it('should treat null and empty string as equivalent (null/empty normalization)', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      // Server has notes: null
      const measure = createMockMeasure({ updatedAt: serverVersion, notes: null });
      mockFindUnique.mockResolvedValue(measure);

      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: { fields: [{ field: 'notes' }] } },
      ]);

      // Client sends notes: '' (empty string) — should be treated as same as null
      const result = await checkVersion(
        1,
        clientVersion.toISOString(),
        ['notes'],
        { notes: '' },
      );

      expect(result.hasConflict).toBe(false);
      expect(result.conflictFields).toEqual([]);
    });

    it('should fall back to field-name-only conflict when incomingValues is omitted (backward compat)', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      mockAuditLogFindFirst.mockResolvedValue({
        userId: 2,
        userEmail: 'other@clinic.com',
        user: { displayName: 'Other User', email: 'other@clinic.com' },
      });
      mockAuditLogFindMany.mockResolvedValue([
        { changes: { fields: [{ field: 'notes' }] } },
      ]);

      // No incomingValues parameter — backward compatibility mode
      const result = await checkVersion(
        1,
        clientVersion.toISOString(),
        ['notes'],
        // incomingValues omitted
      );

      // Should still report conflict (can't compare values without incomingValues)
      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['notes']);
      expect(result.serverRow).not.toBeNull();
    });

    it('should handle audit log query failures gracefully', async () => {
      const clientVersion = new Date('2026-02-10T11:00:00.000Z');
      const serverVersion = new Date('2026-02-10T12:00:00.000Z');
      const measure = createMockMeasure({ updatedAt: serverVersion });
      mockFindUnique.mockResolvedValue(measure);

      // Audit log queries fail
      mockAuditLogFindFirst.mockRejectedValue(new Error('DB error'));
      mockAuditLogFindMany.mockRejectedValue(new Error('DB error'));

      const result = await checkVersion(1, clientVersion.toISOString(), ['notes']);

      // When audit queries fail, assume full conflict
      expect(result.hasConflict).toBe(true);
      expect(result.conflictFields).toEqual(['notes']);
      expect(result.changedBy).toBeNull();
    });
  });

  describe('toGridRowPayload', () => {
    it('should convert a PatientMeasure to GridRowPayload format', () => {
      const measure = createMockMeasure();
      const payload = toGridRowPayload(measure as any);

      expect(payload.id).toBe(1);
      expect(payload.patientId).toBe(10);
      expect(payload.memberName).toBe('Doe, John');
      expect(payload.memberDob).toBe('1990-01-15T00:00:00.000Z');
      expect(payload.requestType).toBe('AWV');
      expect(payload.qualityMeasure).toBe('BCS');
      expect(payload.measureStatus).toBe('Pending');
      expect(payload.rowOrder).toBe(0);
      expect(payload.isDuplicate).toBe(false);
      expect(typeof payload.updatedAt).toBe('string');
    });

    it('should handle null dates correctly', () => {
      const measure = createMockMeasure({
        statusDate: null,
        dueDate: null,
      });
      const payload = toGridRowPayload(measure as any);

      expect(payload.statusDate).toBeNull();
      expect(payload.dueDate).toBeNull();
    });

    it('should include insuranceGroup in payload', () => {
      const measure = createMockMeasure({
        patient: {
          memberName: 'Doe, John',
          memberDob: new Date('1990-01-15'),
          memberTelephone: '555-1234',
          memberAddress: '123 Main St',
          insuranceGroup: 'hill',
        },
      });
      const payload = toGridRowPayload(measure as any);

      expect(payload.insuranceGroup).toBe('hill');
    });

    it('should handle null insuranceGroup', () => {
      const measure = createMockMeasure({
        patient: {
          memberName: 'Doe, John',
          memberDob: new Date('1990-01-15'),
          memberTelephone: '555-1234',
          memberAddress: '123 Main St',
          insuranceGroup: null,
        },
      });
      const payload = toGridRowPayload(measure as any);

      expect(payload.insuranceGroup).toBeNull();
    });

    // T4-2: Type safety payload assertions
    it('toGridRowPayload does NOT include tracking3 or depressionScreeningStatus', () => {
      const measure = createMockMeasure();
      const payload = toGridRowPayload(measure as any);

      // These fields should NOT exist on the payload
      expect(payload).not.toHaveProperty('tracking3');
      expect(payload).not.toHaveProperty('depressionScreeningStatus');
      // Also verify other internal-only fields are excluded
      expect(payload).not.toHaveProperty('createdAt');
      expect(payload).not.toHaveProperty('patient');
    });

    it('toGridRowPayload includes all current GridRowPayload fields', () => {
      const measure = createMockMeasure();
      const payload = toGridRowPayload(measure as any);

      // All expected GridRowPayload fields must be present
      const expectedFields = [
        'id', 'patientId', 'memberName', 'memberDob',
        'memberTelephone', 'memberAddress', 'insuranceGroup',
        'requestType', 'qualityMeasure', 'measureStatus',
        'statusDate', 'statusDatePrompt',
        'tracking1', 'tracking2',
        'dueDate', 'timeIntervalDays', 'notes',
        'rowOrder', 'isDuplicate',
        'hgba1cGoal', 'hgba1cGoalReachedYear', 'hgba1cDeclined',
        'updatedAt',
      ];

      for (const field of expectedFields) {
        expect(payload).toHaveProperty(field);
      }

      // Verify the payload has exactly the expected number of fields (no extras)
      expect(Object.keys(payload).sort()).toEqual(expectedFields.sort());
    });
  });
});
