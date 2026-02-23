/**
 * Unit tests for mappingService.ts
 *
 * Tests the merged config builder, CRUD operations (save/reset/resolve),
 * optimistic locking, and audit logging. Mocks both Prisma and configLoader.
 *
 * Minimum: 20 test cases covering:
 *   - loadMergedConfig (merge logic, fallback, errors)
 *   - saveMappingOverrides (upsert, audit, optimistic locking)
 *   - resetToDefaults (deleteMany, audit)
 *   - resolveConflicts (ACCEPT_SUGGESTION, IGNORE, REMOVE)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ConflictResolution } from '../conflictDetector.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// ---- Logger mock ----
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.unstable_mockModule('../../../utils/logger.js', () => ({
  logger: mockLogger,
}));

// ---- ConfigLoader mock ----
const mockLoadSystemConfig = jest.fn() as AnyMock;
const mockIsSutterConfig = jest.fn() as AnyMock;

jest.unstable_mockModule('../configLoader.js', () => ({
  loadSystemConfig: mockLoadSystemConfig,
  isSutterConfig: mockIsSutterConfig,
}));

// ---- Prisma mock ----
const mockMappingFindMany = jest.fn() as AnyMock;
const mockMappingFindFirst = jest.fn() as AnyMock;
const mockMappingUpsert = jest.fn() as AnyMock;
const mockMappingDeleteMany = jest.fn() as AnyMock;

const mockActionFindMany = jest.fn() as AnyMock;
const mockActionFindFirst = jest.fn() as AnyMock;
const mockActionDeleteMany = jest.fn() as AnyMock;

const mockAuditCreate = jest.fn() as AnyMock;

jest.unstable_mockModule('../../../config/database.js', () => ({
  prisma: {
    importMappingOverride: {
      findMany: mockMappingFindMany,
      findFirst: mockMappingFindFirst,
      upsert: mockMappingUpsert,
      deleteMany: mockMappingDeleteMany,
    },
    importActionOverride: {
      findMany: mockActionFindMany,
      findFirst: mockActionFindFirst,
      deleteMany: mockActionDeleteMany,
    },
    auditLog: {
      create: mockAuditCreate,
    },
  },
}));

// ---- Import after mocks ----
const {
  loadMergedConfig,
  saveMappingOverrides,
  resetToDefaults,
  resolveConflicts,
} = await import('../mappingService.js');

// ---- Helpers ----

/** Build a minimal Hill config (wide format). */
function makeHillConfig() {
  return {
    name: 'Hill Physicians',
    version: '1.0',
    patientColumns: {
      'Member Name': 'memberName',
      'Date of Birth': 'memberDob',
    },
    measureColumns: {
      'AWV Status': { requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      'A1C Status': { requestType: 'A1C', qualityMeasure: 'Hemoglobin A1C' },
    },
    statusMapping: {
      AWV: { compliant: 'AWV completed', nonCompliant: 'Not Addressed' },
    },
    skipColumns: ['Notes'],
  };
}

/** Build a minimal DB mapping override record. */
function makeOverride(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    systemId: 'hill',
    sourceColumn: 'AWV Status',
    targetType: 'MEASURE',
    targetField: null,
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit - v2',
    isActive: true,
    createdBy: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-15'),
    ...overrides,
  };
}

/** Reset all Prisma + configLoader mocks to defaults. */
function resetAllMocks() {
  jest.clearAllMocks();

  // Default: Hill config available
  mockLoadSystemConfig.mockReturnValue(makeHillConfig());
  mockIsSutterConfig.mockReturnValue(false);

  // Default: No DB overrides
  mockMappingFindMany.mockResolvedValue([]);
  mockActionFindMany.mockResolvedValue([]);
  mockMappingFindFirst.mockResolvedValue(null);
  mockActionFindFirst.mockResolvedValue(null);

  // Default: upsert / deleteMany / audit succeed
  mockMappingUpsert.mockResolvedValue(makeOverride());
  mockMappingDeleteMany.mockResolvedValue({ count: 0 });
  mockActionDeleteMany.mockResolvedValue({ count: 0 });
  mockAuditCreate.mockResolvedValue({ id: 1 });
}

// ---- Tests ----

describe('mappingService', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  // ================================================================
  // loadMergedConfig
  // ================================================================
  describe('loadMergedConfig', () => {
    it('should return seed-only config when no DB overrides exist', async () => {
      const result = await loadMergedConfig('hill');

      expect(result.systemId).toBe('hill');
      expect(result.systemName).toBe('Hill Physicians');
      expect(result.format).toBe('wide');
      expect(result.patientColumns).toHaveLength(2);
      expect(result.measureColumns).toHaveLength(2);
      expect(result.skipColumns).toHaveLength(1);
      // All columns should be seed-only (isOverride = false)
      expect(result.patientColumns.every(c => !c.isOverride)).toBe(true);
      expect(result.measureColumns.every(c => !c.isOverride)).toBe(true);
    });

    it('should replace seed entries with DB overrides for the same sourceColumn', async () => {
      const override = makeOverride({
        sourceColumn: 'AWV Status',
        qualityMeasure: 'AWV Override',
      });
      mockMappingFindMany.mockResolvedValue([override]);

      const result = await loadMergedConfig('hill');

      // The AWV Status column should now come from the override
      const awvCol = result.measureColumns.find(c => c.sourceColumn === 'AWV Status');
      expect(awvCol).toBeDefined();
      expect(awvCol!.isOverride).toBe(true);
      expect(awvCol!.qualityMeasure).toBe('AWV Override');
      expect(awvCol!.overrideId).toBe(override.id);

      // A1C should remain from seed
      const a1cCol = result.measureColumns.find(c => c.sourceColumn === 'A1C Status');
      expect(a1cCol).toBeDefined();
      expect(a1cCol!.isOverride).toBe(false);
    });

    it('should keep seed entries without overrides in the merged config', async () => {
      // Override only AWV Status
      mockMappingFindMany.mockResolvedValue([
        makeOverride({ sourceColumn: 'AWV Status' }),
      ]);

      const result = await loadMergedConfig('hill');

      // A1C should still be present from seed
      const a1cCol = result.measureColumns.find(c => c.sourceColumn === 'A1C Status');
      expect(a1cCol).toBeDefined();
      expect(a1cCol!.isOverride).toBe(false);
      expect(a1cCol!.requestType).toBe('A1C');
    });

    it('should include DB-only additions not present in JSON seed', async () => {
      const dbOnlyOverride = makeOverride({
        id: 99,
        sourceColumn: 'New Column',
        targetType: 'MEASURE',
        requestType: 'NEW',
        qualityMeasure: 'New Quality Measure',
      });
      mockMappingFindMany.mockResolvedValue([dbOnlyOverride]);

      const result = await loadMergedConfig('hill');

      // DB-only addition should appear in measureColumns
      const newCol = result.measureColumns.find(c => c.sourceColumn === 'New Column');
      expect(newCol).toBeDefined();
      expect(newCol!.isOverride).toBe(true);
      expect(newCol!.qualityMeasure).toBe('New Quality Measure');
    });

    it('should exclude isActive=false overrides from the merge (inactive columns are still present but marked)', async () => {
      // Note: The query uses `isActive: true` in the WHERE clause, so
      // inactive overrides should not be returned from DB at all.
      // This test verifies that when the DB returns only active overrides,
      // inactive ones are indeed excluded.
      const activeOverride = makeOverride({ sourceColumn: 'AWV Status', isActive: true });
      // The findMany mock only returns active overrides (simulating WHERE isActive=true)
      mockMappingFindMany.mockResolvedValue([activeOverride]);

      const result = await loadMergedConfig('hill');

      // Should have the active override
      const awvCol = result.measureColumns.find(c => c.sourceColumn === 'AWV Status');
      expect(awvCol).toBeDefined();
      expect(awvCol!.isOverride).toBe(true);
      expect(awvCol!.isActive).toBe(true);

      // Verify findMany was called with isActive: true filter
      expect(mockMappingFindMany).toHaveBeenCalledWith({
        where: { systemId: 'hill', isActive: true },
      });
    });

    it('should fall back to JSON-only when DB query fails (logs warning, does not throw)', async () => {
      mockMappingFindMany.mockRejectedValue(new Error('Connection refused'));

      const result = await loadMergedConfig('hill');

      // Should still return a valid config from JSON seed
      expect(result.systemId).toBe('hill');
      expect(result.patientColumns).toHaveLength(2);
      expect(result.measureColumns).toHaveLength(2);

      // Should have logged a warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Database error loading mapping overrides, falling back to JSON-only',
        expect.objectContaining({
          systemId: 'hill',
          error: 'Connection refused',
        }),
      );
    });

    it('should use DB-only overrides when JSON seed file fails to load, and log warning', async () => {
      mockLoadSystemConfig.mockImplementation(() => {
        throw new Error('Config file not found');
      });

      const dbOverride = makeOverride({
        sourceColumn: 'Custom Column',
        targetType: 'PATIENT',
        targetField: 'memberName',
      });
      mockMappingFindMany.mockResolvedValue([dbOverride]);

      const result = await loadMergedConfig('hill');

      // Should use DB overrides
      expect(result.patientColumns).toHaveLength(1);
      expect(result.patientColumns[0].sourceColumn).toBe('Custom Column');
      expect(result.patientColumns[0].isOverride).toBe(true);

      // Should log warning about JSON seed failure
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to load JSON seed config',
        expect.objectContaining({
          systemId: 'hill',
          error: 'Config file not found',
        }),
      );
    });

    it('should throw when neither JSON seed nor DB overrides are available', async () => {
      mockLoadSystemConfig.mockImplementation(() => {
        throw new Error('Config file not found');
      });
      mockMappingFindMany.mockResolvedValue([]);

      await expect(loadMergedConfig('hill')).rejects.toThrow(
        'No configuration available for system: hill',
      );
    });

    it('should populate lastModifiedAt and lastModifiedBy from most recent override', async () => {
      const override = makeOverride({
        updatedAt: new Date('2026-02-01'),
      });
      mockMappingFindMany.mockResolvedValue([override]);

      // populateMetadata queries for the latest override with creator
      mockMappingFindFirst.mockResolvedValue({
        ...override,
        creator: { displayName: 'Admin User' },
      });
      mockActionFindFirst.mockResolvedValue(null);

      const result = await loadMergedConfig('hill');

      expect(result.lastModifiedAt).toEqual(new Date('2026-02-01'));
      expect(result.lastModifiedBy).toBe('Admin User');
    });

    it('should place DB-only PATIENT override in patientColumns', async () => {
      const patientOverride = makeOverride({
        id: 50,
        sourceColumn: 'Custom Patient Field',
        targetType: 'PATIENT',
        targetField: 'memberTelephone',
      });
      mockMappingFindMany.mockResolvedValue([patientOverride]);

      const result = await loadMergedConfig('hill');

      const customCol = result.patientColumns.find(
        c => c.sourceColumn === 'Custom Patient Field',
      );
      expect(customCol).toBeDefined();
      expect(customCol!.targetType).toBe('PATIENT');
      expect(customCol!.targetField).toBe('memberTelephone');
    });

    it('should place DB-only IGNORED override in skipColumns', async () => {
      const skipOverride = makeOverride({
        id: 51,
        sourceColumn: 'Junk Column',
        targetType: 'IGNORED',
      });
      mockMappingFindMany.mockResolvedValue([skipOverride]);

      const result = await loadMergedConfig('hill');

      const junkCol = result.skipColumns.find(c => c.sourceColumn === 'Junk Column');
      expect(junkCol).toBeDefined();
      expect(junkCol!.targetType).toBe('IGNORED');
      expect(junkCol!.isOverride).toBe(true);
    });
  });

  // ================================================================
  // saveMappingOverrides
  // ================================================================
  describe('saveMappingOverrides', () => {
    it('should call Prisma upsert for each change', async () => {
      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
          requestType: 'AWV',
          qualityMeasure: 'Updated AWV',
        },
        {
          sourceColumn: 'A1C Status',
          targetType: 'MEASURE' as const,
          requestType: 'A1C',
          qualityMeasure: 'Updated A1C',
        },
      ];

      // findMany for "before" state returns empty (no existing overrides)
      mockMappingFindMany
        .mockResolvedValueOnce([]) // before state
        .mockResolvedValueOnce([]) // after state
        .mockResolvedValue([]);    // loadMergedConfig re-call

      await saveMappingOverrides('hill', changes, 1);

      expect(mockMappingUpsert).toHaveBeenCalledTimes(2);

      // Verify first upsert
      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            systemId_sourceColumn: { systemId: 'hill', sourceColumn: 'AWV Status' },
          },
          create: expect.objectContaining({
            systemId: 'hill',
            sourceColumn: 'AWV Status',
            targetType: 'MEASURE',
            qualityMeasure: 'Updated AWV',
            createdBy: 1,
          }),
          update: expect.objectContaining({
            targetType: 'MEASURE',
            qualityMeasure: 'Updated AWV',
          }),
        }),
      );
    });

    it('should create AuditLog entry with correct fields', async () => {
      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
          requestType: 'AWV',
          qualityMeasure: 'Updated',
        },
      ];

      // before: empty, after: the override
      const afterOverride = makeOverride({ sourceColumn: 'AWV Status', qualityMeasure: 'Updated' });
      mockMappingFindMany
        .mockResolvedValueOnce([])              // before state
        .mockResolvedValueOnce([afterOverride]) // after state
        .mockResolvedValue([]);                 // loadMergedConfig re-call

      await saveMappingOverrides('hill', changes, 42);

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 42,
          action: 'MAPPING_CHANGE',
          entity: 'import_mapping',
          entityId: null,
          changes: expect.objectContaining({
            systemId: 'hill',
            before: expect.any(Object),
            after: expect.any(Object),
          }),
        }),
      });
    });

    it('should throw 409 when expectedUpdatedAt mismatches current MAX(updatedAt)', async () => {
      // DB has override updated at Jan 20
      mockMappingFindFirst.mockResolvedValue({
        ...makeOverride(),
        updatedAt: new Date('2026-01-20'),
      });

      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
        },
      ];

      // Client expects Jan 15 (stale)
      const staleDate = new Date('2026-01-15');

      try {
        await saveMappingOverrides('hill', changes, 1, staleDate);
        // Should not reach here
        expect(true).toBe(false);
      } catch (err) {
        expect((err as Error).message).toContain('modified by another user');
        expect((err as Error & { statusCode: number }).statusCode).toBe(409);
      }
    });

    it('should NOT throw when expectedUpdatedAt matches current MAX(updatedAt)', async () => {
      const matchDate = new Date('2026-01-15');
      mockMappingFindFirst.mockResolvedValue({
        ...makeOverride(),
        updatedAt: matchDate,
      });

      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
        },
      ];

      // before + after queries for audit
      mockMappingFindMany
        .mockResolvedValueOnce([]) // before
        .mockResolvedValueOnce([]) // after
        .mockResolvedValue([]);    // loadMergedConfig

      // Should not throw
      await expect(
        saveMappingOverrides('hill', changes, 1, matchDate),
      ).resolves.toBeDefined();
    });

    it('should skip optimistic lock check when expectedUpdatedAt is not provided', async () => {
      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
        },
      ];

      mockMappingFindMany
        .mockResolvedValueOnce([]) // before
        .mockResolvedValueOnce([]) // after
        .mockResolvedValue([]);    // loadMergedConfig

      // Should not check findFirst for locking
      await saveMappingOverrides('hill', changes, 1);

      // findFirst called by populateMetadata, but NOT for optimistic lock
      // The first call to findFirst should be from populateMetadata (called inside loadMergedConfig)
      // Verify upsert was actually called (proving we didn't bail out)
      expect(mockMappingUpsert).toHaveBeenCalledTimes(1);
    });

    it('should set isActive to true by default when not specified', async () => {
      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
          // isActive not specified
        },
      ];

      mockMappingFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);

      await saveMappingOverrides('hill', changes, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ isActive: true }),
          update: expect.objectContaining({ isActive: true }),
        }),
      );
    });
  });

  // ================================================================
  // resetToDefaults
  // ================================================================
  describe('resetToDefaults', () => {
    it('should call deleteMany for both override tables', async () => {
      mockMappingDeleteMany.mockResolvedValue({ count: 5 });
      mockActionDeleteMany.mockResolvedValue({ count: 3 });

      await resetToDefaults('hill', 1);

      expect(mockMappingDeleteMany).toHaveBeenCalledWith({ where: { systemId: 'hill' } });
      expect(mockActionDeleteMany).toHaveBeenCalledWith({ where: { systemId: 'hill' } });
    });

    it('should create audit log recording the reset', async () => {
      mockMappingDeleteMany.mockResolvedValue({ count: 5 });
      mockActionDeleteMany.mockResolvedValue({ count: 3 });

      await resetToDefaults('hill', 42);

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 42,
          action: 'MAPPING_RESET',
          entity: 'import_mapping',
          entityId: null,
          changes: expect.objectContaining({
            systemId: 'hill',
            deletedMappings: 5,
            deletedActions: 3,
          }),
        }),
      });
    });

    it('should return the merged config after reset (seed-only)', async () => {
      mockMappingDeleteMany.mockResolvedValue({ count: 0 });
      mockActionDeleteMany.mockResolvedValue({ count: 0 });

      const result = await resetToDefaults('hill', 1);

      // After reset, all columns should be seed-only
      expect(result.systemId).toBe('hill');
      expect(result.patientColumns.every(c => !c.isOverride)).toBe(true);
      expect(result.measureColumns.every(c => !c.isOverride)).toBe(true);
    });
  });

  // ================================================================
  // resolveConflicts
  // ================================================================
  describe('resolveConflicts', () => {
    // Helper: stub save path (before + after findMany, loadMergedConfig findMany)
    function stubSavePath() {
      mockMappingFindMany
        .mockResolvedValueOnce([]) // before state (saveMappingOverrides)
        .mockResolvedValueOnce([]) // after state (saveMappingOverrides)
        .mockResolvedValue([]);    // loadMergedConfig (inner call from saveMappingOverrides)
    }

    it('should create a MEASURE override for ACCEPT_SUGGESTION with targetMeasure', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-0',
          sourceColumn: 'AWV Q1',
          resolution: {
            action: 'ACCEPT_SUGGESTION' as const,
            targetMeasure: { requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'AWV Q1',
            targetType: 'MEASURE',
            requestType: 'AWV',
            qualityMeasure: 'Annual Wellness Visit',
          }),
        }),
      );
    });

    it('should create a PATIENT override for ACCEPT_SUGGESTION with targetPatientField', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-1',
          sourceColumn: 'Patient Name',
          resolution: {
            action: 'ACCEPT_SUGGESTION' as const,
            targetPatientField: 'memberName',
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'Patient Name',
            targetType: 'PATIENT',
            targetField: 'memberName',
          }),
        }),
      );
    });

    it('should create an IGNORED type override for IGNORE resolution', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-2',
          sourceColumn: 'Junk Column',
          resolution: {
            action: 'IGNORE' as const,
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'Junk Column',
            targetType: 'IGNORED',
          }),
        }),
      );
    });

    it('should create an isActive=false override for REMOVE resolution', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-3',
          sourceColumn: 'Obsolete Column',
          resolution: {
            action: 'REMOVE' as const,
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'Obsolete Column',
            targetType: 'IGNORED',
            isActive: false,
          }),
        }),
      );
    });

    it('should not call saveMappingOverrides for KEEP resolution (no change needed)', async () => {
      const resolutions = [
        {
          conflictId: 'conflict-4',
          sourceColumn: 'AWV Status',
          resolution: {
            action: 'KEEP' as const,
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      // KEEP produces no changes, so no upsert is called;
      // resolveConflicts still calls loadMergedConfig to return current state
      expect(mockMappingUpsert).not.toHaveBeenCalled();
    });

    it('should handle multiple resolutions in a single call', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-0',
          sourceColumn: 'New Column A',
          resolution: {
            action: 'ACCEPT_SUGGESTION' as const,
            targetMeasure: { requestType: 'A1C', qualityMeasure: 'Hemoglobin A1C' },
          },
        },
        {
          conflictId: 'conflict-1',
          sourceColumn: 'New Column B',
          resolution: {
            action: 'IGNORE' as const,
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledTimes(2);
    });

    it('should create a MEASURE override for MAP_TO_MEASURE resolution', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-5',
          sourceColumn: 'Custom Measure',
          resolution: {
            action: 'MAP_TO_MEASURE' as const,
            targetMeasure: { requestType: 'CUSTOM', qualityMeasure: 'Custom Quality' },
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'Custom Measure',
            targetType: 'MEASURE',
            requestType: 'CUSTOM',
            qualityMeasure: 'Custom Quality',
          }),
        }),
      );
    });

    it('should create a PATIENT override for MAP_TO_PATIENT resolution', async () => {
      stubSavePath();

      const resolutions = [
        {
          conflictId: 'conflict-6',
          sourceColumn: 'Phone Number',
          resolution: {
            action: 'MAP_TO_PATIENT' as const,
            targetPatientField: 'memberTelephone',
          },
        },
      ];

      await resolveConflicts('hill', resolutions, 1);

      expect(mockMappingUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            sourceColumn: 'Phone Number',
            targetType: 'PATIENT',
            targetField: 'memberTelephone',
          }),
        }),
      );
    });
  });

  // ================================================================
  // Audit log content (GAP-02)
  // ================================================================
  describe('Audit log content (GAP-02)', () => {
    it('TC-MM-13: audit log changes JSON has "before" keyed by sourceColumn', async () => {
      const existingOverride = makeOverride({ sourceColumn: 'AWV Status', qualityMeasure: 'Original' });

      // before: existing override, after: updated override
      const updatedOverride = makeOverride({ sourceColumn: 'AWV Status', qualityMeasure: 'Updated' });
      mockMappingFindMany
        .mockResolvedValueOnce([existingOverride])   // before state
        .mockResolvedValueOnce([updatedOverride])     // after state
        .mockResolvedValue([]);                       // loadMergedConfig

      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
          requestType: 'AWV',
          qualityMeasure: 'Updated',
        },
      ];

      await saveMappingOverrides('hill', changes, 1);

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changes: expect.objectContaining({
            before: expect.objectContaining({
              'AWV Status': expect.objectContaining({
                qualityMeasure: 'Original',
                targetType: 'MEASURE',
              }),
            }),
          }),
        }),
      });
    });

    it('TC-MM-14: audit log changes JSON has "after" with updated qualityMeasure', async () => {
      const updatedOverride = makeOverride({ sourceColumn: 'AWV Status', qualityMeasure: 'NewValue' });
      mockMappingFindMany
        .mockResolvedValueOnce([])                    // before state
        .mockResolvedValueOnce([updatedOverride])     // after state
        .mockResolvedValue([]);                       // loadMergedConfig

      const changes = [
        {
          sourceColumn: 'AWV Status',
          targetType: 'MEASURE' as const,
          requestType: 'AWV',
          qualityMeasure: 'NewValue',
        },
      ];

      await saveMappingOverrides('hill', changes, 1);

      expect(mockAuditCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changes: expect.objectContaining({
            after: expect.objectContaining({
              'AWV Status': expect.objectContaining({
                qualityMeasure: 'NewValue',
                targetType: 'MEASURE',
              }),
            }),
          }),
        }),
      });
    });
  });

  // ================================================================
  // systemId passthrough (GAP-05)
  // ================================================================
  describe('systemId passthrough (GAP-05)', () => {
    it('TC-MM-15: loadMergedConfig passes correct systemId to Prisma findMany', async () => {
      await loadMergedConfig('sutter');

      expect(mockMappingFindMany).toHaveBeenCalledWith({
        where: { systemId: 'sutter', isActive: true },
      });
    });
  });
});
