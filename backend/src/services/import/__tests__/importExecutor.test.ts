/**
 * Unit tests for importExecutor.ts
 * Tests import execution logic for Replace and Merge modes
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DiffChange, DiffResult } from '../diffCalculator.js';
import { PreviewEntry } from '../previewCache.js';
import { ValidationResult } from '../validator.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// Mock the modules
jest.unstable_mockModule('../previewCache.js', () => ({
  getPreview: jest.fn() as AnyMock,
  deletePreview: jest.fn() as AnyMock,
  hasValidPreview: jest.fn() as AnyMock,
}));

jest.unstable_mockModule('../../duplicateDetector.js', () => ({
  syncAllDuplicateFlags: (jest.fn() as AnyMock).mockResolvedValue(undefined),
}));

jest.unstable_mockModule('../../dueDateCalculator.js', () => ({
  calculateDueDate: (jest.fn() as AnyMock).mockResolvedValue({
    dueDate: new Date('2026-02-28'),
    timeIntervalDays: 30,
  }),
}));

const mockTransaction = jest.fn() as AnyMock;
const mockPatientFindUnique = jest.fn() as AnyMock;
const mockPatientCreate = jest.fn() as AnyMock;
const mockPatientUpdate = jest.fn() as AnyMock;
const mockMeasureAggregate = jest.fn() as AnyMock;
const mockMeasureCreate = jest.fn() as AnyMock;
const mockMeasureUpdate = jest.fn() as AnyMock;
const mockMeasureDeleteMany = jest.fn() as AnyMock;

jest.unstable_mockModule('../../../config/database.js', () => ({
  prisma: {
    $transaction: mockTransaction,
    patient: {
      findUnique: mockPatientFindUnique,
      create: mockPatientCreate,
      update: mockPatientUpdate,
    },
    patientMeasure: {
      aggregate: mockMeasureAggregate,
      create: mockMeasureCreate,
      update: mockMeasureUpdate,
      deleteMany: mockMeasureDeleteMany,
    },
  },
}));

// Import after mocks
const { executeImport } = await import('../importExecutor.js');
const { getPreview, deletePreview } = await import('../previewCache.js');
const { syncAllDuplicateFlags } = await import('../../duplicateDetector.js');

// Helper to create mock DiffChange
function createMockChange(overrides: Partial<DiffChange> = {}): DiffChange {
  return {
    action: 'INSERT',
    memberName: 'John Smith',
    memberDob: '1990-01-15',
    memberTelephone: '(555) 123-4567',
    memberAddress: '123 Main St',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    oldStatus: null,
    newStatus: 'AWV completed',
    reason: 'New patient+measure combination',
    ...overrides,
  };
}

// Helper to create mock DiffResult
function createMockDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
  return {
    mode: 'merge',
    summary: {
      inserts: 1,
      updates: 0,
      skips: 0,
      duplicates: 0,
      deletes: 0,
    },
    changes: [createMockChange()],
    newPatients: 1,
    existingPatients: 0,
    generatedAt: new Date('2026-01-28T12:00:00Z'),
    ...overrides,
  };
}

// Helper to create mock ValidationResult
function createMockValidation(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
    duplicates: [],
    stats: {
      totalRows: 1,
      validRows: 1,
      errorRows: 0,
      warningRows: 0,
      duplicateGroups: 0,
    },
  };
}

// Helper to create mock PreviewEntry
function createMockPreview(overrides: Partial<PreviewEntry> = {}): PreviewEntry {
  return {
    id: 'test-preview-123',
    systemId: 'hill',
    mode: 'merge',
    diff: createMockDiffResult(),
    rows: [],
    validation: createMockValidation(),
    warnings: [],
    reassignments: [],
    targetOwnerId: null,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    ...overrides,
  };
}

describe('importExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock implementations
    mockTransaction.mockImplementation(async (callback: any) => callback({
      patient: {
        findUnique: mockPatientFindUnique,
        create: mockPatientCreate,
        update: mockPatientUpdate,
      },
      patientMeasure: {
        aggregate: mockMeasureAggregate,
        create: mockMeasureCreate,
        update: mockMeasureUpdate,
        deleteMany: mockMeasureDeleteMany,
      },
    }));
    mockPatientFindUnique.mockResolvedValue(null);
    mockPatientCreate.mockResolvedValue({ id: 1, memberName: 'John Smith' });
    mockPatientUpdate.mockResolvedValue({ id: 1, memberName: 'John Smith', ownerId: 10 });
    mockMeasureAggregate.mockResolvedValue({ _max: { rowOrder: 0 } });
    mockMeasureCreate.mockResolvedValue({ id: 1 });
    mockMeasureUpdate.mockResolvedValue({ id: 1 });
    mockMeasureDeleteMany.mockResolvedValue({ count: 0 });
    (deletePreview as jest.Mock).mockReturnValue(true);
  });

  describe('preview validation', () => {
    it('should throw error when preview not found', async () => {
      (getPreview as jest.Mock).mockReturnValue(null);

      await expect(executeImport('invalid-id')).rejects.toThrow('Preview not found or expired');
    });

    it('should throw error when preview is expired', async () => {
      (getPreview as jest.Mock).mockReturnValue(null);

      await expect(executeImport('expired-id')).rejects.toThrow('Preview not found or expired');
    });
  });

  describe('merge mode - INSERT action', () => {
    it('should create new patient and measure for INSERT action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT' })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(mockPatientCreate).toHaveBeenCalled();
      expect(mockMeasureCreate).toHaveBeenCalled();
    });

    it('should reuse existing patient for INSERT action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith' });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(1);
      expect(mockPatientCreate).not.toHaveBeenCalled();
      expect(mockMeasureCreate).toHaveBeenCalled();
    });

    it('should update existing patient ownerId when importing with different owner', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      // Existing patient has ownerId: null (unassigned), insuranceGroup: null
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: null, insuranceGroup: null });
      mockPatientUpdate.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: 10, insuranceGroup: 'hill' });

      // Execute with ownerId = 10 (assigning to physician)
      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      expect(mockPatientUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: { insuranceGroup: 'hill', ownerId: 10 },
        })
      );
    });

    it('should not update ownerId when existing patient already has same owner and same insuranceGroup', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      // Existing patient already has ownerId: 10 and insuranceGroup: 'hill' (same as default systemId)
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: 10, insuranceGroup: 'hill' });

      // Execute with same ownerId = 10 (systemId defaults to 'hill')
      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      // No update needed since ownerId and insuranceGroup are already correct
      expect(mockPatientUpdate).not.toHaveBeenCalled();
    });

    it('should update insuranceGroup even when importing with null owner', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      // Existing patient has ownerId: 10, insuranceGroup: null (needs update)
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: 10, insuranceGroup: null });
      mockPatientUpdate.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: 10, insuranceGroup: 'hill' });

      // Execute with null ownerId (admin import without specifying physician)
      const result = await executeImport('test-preview-123', null);

      expect(result.success).toBe(true);
      // Should update insuranceGroup even though ownerId is null
      expect(mockPatientUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: { insuranceGroup: 'hill' },
        })
      );
    });
  });

  describe('merge mode - UPDATE action', () => {
    it('should update existing measure for UPDATE action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingMeasureId: 10,
            oldStatus: 'Not Addressed',
            newStatus: 'AWV completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      expect(mockMeasureUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
        })
      );
    });

    it('should recalculate due date on UPDATE', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'UPDATE',
            existingMeasureId: 10,
            newStatus: 'AWV completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');

      expect(mockMeasureUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            measureStatus: 'AWV completed',
            dueDate: expect.any(Date),
            timeIntervalDays: 30,
          }),
        })
      );
    });
  });

  describe('merge mode - SKIP action', () => {
    it('should not modify database for SKIP action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 0, skips: 1, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'SKIP',
            existingMeasureId: 10,
            reason: 'Both compliant, keeping existing',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.skipped).toBe(1);
      expect(mockMeasureCreate).not.toHaveBeenCalled();
      expect(mockMeasureUpdate).not.toHaveBeenCalled();
      expect(mockMeasureDeleteMany).not.toHaveBeenCalled();
    });
  });

  describe('merge mode - BOTH action', () => {
    it('should keep existing and insert new for BOTH action (downgrade)', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 0, skips: 0, duplicates: 1, deletes: 0 },
          changes: [createMockChange({
            action: 'BOTH',
            existingMeasureId: 10,
            existingPatientId: 5,
            oldStatus: 'AWV completed',
            newStatus: 'Not Addressed',
            reason: 'Downgrade detected - keeping both',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith' });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.bothKept).toBe(1);
      expect(mockMeasureCreate).toHaveBeenCalled();
      expect(mockMeasureUpdate).not.toHaveBeenCalled();
    });
  });

  describe('replace mode', () => {
    it('should delete all existing records in replace mode', async () => {
      const preview = createMockPreview({
        mode: 'replace',
        diff: createMockDiffResult({
          mode: 'replace',
          summary: { inserts: 2, updates: 0, skips: 0, duplicates: 0, deletes: 3 },
          changes: [
            createMockChange({ action: 'DELETE', existingMeasureId: 1 }),
            createMockChange({ action: 'DELETE', existingMeasureId: 2 }),
            createMockChange({ action: 'DELETE', existingMeasureId: 3 }),
            createMockChange({ action: 'INSERT', memberName: 'Alice' }),
            createMockChange({ action: 'INSERT', memberName: 'Bob' }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.deleted).toBe(3);
      expect(result.stats.inserted).toBe(2);
      expect(mockMeasureDeleteMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2, 3] } }
      });
    });

    it('should insert all new records in replace mode', async () => {
      const preview = createMockPreview({
        mode: 'replace',
        diff: createMockDiffResult({
          mode: 'replace',
          summary: { inserts: 2, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          changes: [
            createMockChange({ action: 'INSERT', memberName: 'Alice' }),
            createMockChange({ action: 'INSERT', memberName: 'Bob' }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(result.stats.inserted).toBe(2);
      expect(mockMeasureCreate).toHaveBeenCalledTimes(2);
    });
  });

  describe('transaction and cleanup', () => {
    it('should execute operations in a transaction', async () => {
      const preview = createMockPreview();
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should sync duplicate flags after execution', async () => {
      const preview = createMockPreview();
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');

      expect(syncAllDuplicateFlags).toHaveBeenCalled();
    });

    it('should delete preview from cache after successful execution', async () => {
      const preview = createMockPreview();
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');

      expect(deletePreview).toHaveBeenCalledWith('test-preview-123');
    });

    it('should return failure result on transaction error', async () => {
      const preview = createMockPreview();
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockTransaction.mockRejectedValue(new Error('Database error'));

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Transaction failed');
    });
  });

  describe('error handling', () => {
    it('should handle null DOB gracefully', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'INSERT',
            memberDob: null,
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('DOB is required');
    });

    it('should return accurate stats counts', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 2, updates: 1, skips: 3, duplicates: 1, deletes: 0 },
          changes: [
            createMockChange({ action: 'INSERT', memberName: 'Alice' }),
            createMockChange({ action: 'INSERT', memberName: 'Bob' }),
            createMockChange({ action: 'UPDATE', existingMeasureId: 10, memberName: 'Carol' }),
            createMockChange({ action: 'SKIP', memberName: 'Dave' }),
            createMockChange({ action: 'SKIP', memberName: 'Eve' }),
            createMockChange({ action: 'SKIP', memberName: 'Frank' }),
            createMockChange({ action: 'BOTH', existingMeasureId: 20, memberName: 'Grace' }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue({ id: 1, memberName: 'Test' });

      const result = await executeImport('test-preview-123');

      expect(result.stats.inserted).toBe(2);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.skipped).toBe(3);
      expect(result.stats.bothKept).toBe(1);
      expect(result.stats.deleted).toBe(0);
    });
  });

  describe('notes/tracking1 persistence', () => {
    it('should persist notes on INSERT action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'INSERT',
            notes: 'HCC coding review needed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockMeasureCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'HCC coding review needed',
          }),
        })
      );
    });

    it('should persist tracking1 on INSERT action', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'INSERT',
            tracking1: '7.2',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockMeasureCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tracking1: '7.2',
          }),
        })
      );
    });

    it('should update notes on UPDATE action when non-null', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingMeasureId: 10,
            existingPatientId: 5,
            notes: 'Updated HCC notes',
            oldStatus: 'Not Addressed',
            newStatus: 'Completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockMeasureUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Updated HCC notes',
          }),
        })
      );
    });

    it('should update tracking1 on UPDATE action when non-null', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingMeasureId: 10,
            existingPatientId: 5,
            tracking1: '6.5',
            oldStatus: 'Not Addressed',
            newStatus: 'Completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockMeasureUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tracking1: '6.5',
          }),
        })
      );
    });

    it('should not include notes in UPDATE when null', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingMeasureId: 10,
            existingPatientId: 5,
            notes: null,
            tracking1: null,
            oldStatus: 'Not Addressed',
            newStatus: 'Completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      // When null, notes/tracking1 should NOT be in the update data
      const updateCall = mockMeasureUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
      expect(updateCall.data).not.toHaveProperty('notes');
      expect(updateCall.data).not.toHaveProperty('tracking1');
    });

    it('should pass tracking1 to calculateDueDate on INSERT', async () => {
      const { calculateDueDate } = await import('../../dueDateCalculator.js');

      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'INSERT',
            tracking1: '8.1',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');

      expect(calculateDueDate).toHaveBeenCalledWith(
        expect.any(Date),
        'AWV completed',
        '8.1',  // tracking1 passed
        null    // tracking2
      );
    });

    it('should handle INSERT with both notes and tracking1', async () => {
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({
            action: 'INSERT',
            notes: 'HCC review',
            tracking1: '7.0',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockMeasureCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'HCC review',
            tracking1: '7.0',
          }),
        })
      );
    });
  });

  describe('insuranceGroup', () => {
    it('should create patient with insuranceGroup from systemId', async () => {
      const preview = createMockPreview({
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT' })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue(null);
      mockPatientCreate.mockResolvedValue({ id: 1, memberName: 'John Smith', insuranceGroup: 'hill' });
      mockMeasureAggregate.mockResolvedValue({ _max: { rowOrder: 0 } });
      mockMeasureCreate.mockResolvedValue({ id: 1 });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockPatientCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insuranceGroup: 'hill',
          }),
        })
      );
    });

    it('should update existing patient insuranceGroup on re-import', async () => {
      const preview = createMockPreview({
        systemId: 'kaiser',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: null, insuranceGroup: 'hill' });
      mockPatientUpdate.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: null, insuranceGroup: 'kaiser' });
      mockMeasureAggregate.mockResolvedValue({ _max: { rowOrder: 0 } });
      mockMeasureCreate.mockResolvedValue({ id: 1 });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockPatientUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insuranceGroup: 'kaiser',
          }),
        })
      );
    });

    it('should default to hill when systemId missing from preview cache', async () => {
      const preview = createMockPreview({
        systemId: undefined as unknown as string,
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT' })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue(null);
      mockPatientCreate.mockResolvedValue({ id: 1, memberName: 'John Smith', insuranceGroup: 'hill' });
      mockMeasureAggregate.mockResolvedValue({ _max: { rowOrder: 0 } });
      mockMeasureCreate.mockResolvedValue({ id: 1 });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockPatientCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insuranceGroup: 'hill',
          }),
        })
      );
    });

    it('should not update patient when insuranceGroup already matches', async () => {
      const preview = createMockPreview({
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT', existingPatientId: 5 })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue({ id: 5, memberName: 'John Smith', ownerId: 10, insuranceGroup: 'hill' });
      mockMeasureAggregate.mockResolvedValue({ _max: { rowOrder: 0 } });
      mockMeasureCreate.mockResolvedValue({ id: 1 });

      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      expect(mockPatientUpdate).not.toHaveBeenCalled();
    });

    it('should update patient insuranceGroup on re-import via UPDATE action', async () => {
      const preview = createMockPreview({
        systemId: 'kaiser',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingPatientId: 5,
            existingMeasureId: 10,
            oldStatus: 'Not Addressed',
            newStatus: 'AWV completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockMeasureUpdate.mockResolvedValue({ id: 10 });
      mockPatientUpdate.mockResolvedValue({ id: 5, insuranceGroup: 'kaiser' });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      expect(mockPatientUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 5 },
          data: { insuranceGroup: 'kaiser' },
        })
      );
    });
  });

  describe('BUG FIX: Reassignment duplicate prevention (BUG-REASSIGN-DUP-001)', () => {
    // When importing data for Physician B and a patient already exists under Physician A,
    // the diff produces SKIP/UPDATE (not INSERT) thanks to loadReassignmentRecords().
    // The executor must also reassign the patient's ownerId on SKIP and UPDATE.

    it('should reassign patient ownerId on UPDATE for reassigned patient', async () => {
      // Patient 42 exists under Physician A (ownerId=5), import targets Physician B (ownerId=10)
      // Diff says UPDATE because import has better status
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 1, skips: 0, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'UPDATE',
            existingPatientId: 42,
            existingMeasureId: 200,
            oldStatus: 'Not Addressed',
            newStatus: 'Completed',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockMeasureUpdate.mockResolvedValue({ id: 200 });
      // Patient currently belongs to ownerId=5 (different from target 10)
      mockPatientFindUnique.mockResolvedValue({ id: 42, ownerId: 5 });
      mockPatientUpdate.mockResolvedValue({ id: 42, ownerId: 10 });

      // Pass ownerId=10 as second argument (mirrors route behavior)
      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      // Should have called patient.update for BOTH insuranceGroup AND ownerId reassignment
      const updateCalls = mockPatientUpdate.mock.calls.map((c: any) => c[0]?.data);
      expect(updateCalls).toContainEqual({ insuranceGroup: 'hill' }); // from updateMeasure
      expect(updateCalls).toContainEqual({ ownerId: 10 }); // from reassignPatientIfNeeded
    });

    it('should reassign patient ownerId on SKIP for reassigned patient', async () => {
      // Patient 42 has identical status but different owner — SKIP measure, but still reassign patient
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 0, skips: 1, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'SKIP',
            existingPatientId: 42,
            existingMeasureId: 200,
            oldStatus: 'Not Addressed',
            newStatus: 'Not Addressed',
            reason: 'Both non-compliant',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      // Patient currently under different owner
      mockPatientFindUnique.mockResolvedValue({ id: 42, ownerId: 5 });
      mockPatientUpdate.mockResolvedValue({ id: 42, ownerId: 10 });

      // Pass ownerId=10 (mirrors route behavior)
      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      expect(result.stats.skipped).toBe(1);
      // CRITICAL: Even on SKIP, patient ownerId must be updated for reassignment
      expect(mockPatientFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          select: { ownerId: true },
        })
      );
      expect(mockPatientUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          data: { ownerId: 10 },
        })
      );
    });

    it('should NOT reassign when patient already belongs to target owner', async () => {
      // Patient already under ownerId=10, no reassignment needed
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 0, updates: 0, skips: 1, duplicates: 0, deletes: 0 },
          changes: [createMockChange({
            action: 'SKIP',
            existingPatientId: 42,
            existingMeasureId: 200,
            oldStatus: 'Completed',
            newStatus: 'Completed',
            reason: 'Both compliant',
          })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      // Patient already belongs to target owner
      mockPatientFindUnique.mockResolvedValue({ id: 42, ownerId: 10 });

      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      // findUnique is called to check, but update should NOT be called for ownerId
      // (insuranceGroup update may still be called)
      const ownerUpdateCalls = mockPatientUpdate.mock.calls.filter(
        (call: any) => call[0]?.data?.ownerId !== undefined
      );
      expect(ownerUpdateCalls).toHaveLength(0);
    });

    it('should handle multiple reassigned patients in one import', async () => {
      // 2 patients being reassigned + 1 new patient INSERT
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'hill',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 1, updates: 1, skips: 1, duplicates: 0, deletes: 0 },
          changes: [
            createMockChange({
              action: 'UPDATE',
              memberName: 'Smith, John',
              existingPatientId: 42,
              existingMeasureId: 200,
              oldStatus: 'Not Addressed',
              newStatus: 'Completed',
            }),
            createMockChange({
              action: 'SKIP',
              memberName: 'Doe, Jane',
              existingPatientId: 43,
              existingMeasureId: 201,
              oldStatus: 'Not Addressed',
              newStatus: 'Not Addressed',
              reason: 'Both non-compliant',
            }),
            createMockChange({
              action: 'INSERT',
              memberName: 'New, Patient',
              existingPatientId: undefined,
              existingMeasureId: undefined,
              oldStatus: null,
              newStatus: 'Not Addressed',
            }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockMeasureUpdate.mockResolvedValue({ id: 200 });
      // findUnique calls: Smith (UPDATE reassign check), Doe (SKIP reassign check), New (INSERT patient lookup)
      mockPatientFindUnique
        .mockResolvedValueOnce({ id: 42, ownerId: 5 })   // Smith UPDATE → reassign
        .mockResolvedValueOnce({ id: 43, ownerId: 7 })   // Doe SKIP → reassign
        .mockResolvedValueOnce(null);                      // New patient INSERT → create
      mockPatientCreate.mockResolvedValue({ id: 99 });
      mockPatientUpdate.mockResolvedValue({ id: 42, ownerId: 10 });

      // Pass ownerId=10
      const result = await executeImport('test-preview-123', 10);

      expect(result.success).toBe(true);
      expect(result.stats.updated).toBe(1);
      expect(result.stats.skipped).toBe(1);
      expect(result.stats.inserted).toBe(1);
      // Should have reassigned both Smith and Doe
      const ownerUpdateCalls = mockPatientUpdate.mock.calls.filter(
        (call: any) => call[0]?.data?.ownerId === 10
      );
      expect(ownerUpdateCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('transaction rollback on failure', () => {
    it('should return success=false when transaction throws mid-execution constraint violation', async () => {
      // Arrange: preview has 3 INSERT changes, transaction throws after being called
      const preview = createMockPreview({
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          summary: { inserts: 3, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          changes: [
            createMockChange({ action: 'INSERT', memberName: 'Alice' }),
            createMockChange({ action: 'INSERT', memberName: 'Bob' }),
            createMockChange({ action: 'INSERT', memberName: 'Carol' }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      // Mock transaction to throw a constraint violation mid-execution
      mockTransaction.mockRejectedValue(
        new Error('Unique constraint violation on field: memberName_memberDob')
      );

      const result = await executeImport('test-preview-123');

      // Assert: result indicates failure, 0 rows persisted (transaction rolled back)
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Transaction failed');
      expect(result.errors[0].error).toContain('constraint violation');
      // Stats should show 0 since transaction was rolled back atomically
      expect(result.stats.inserted).toBe(0);
      expect(result.stats.updated).toBe(0);
    });

    it('should include systemId from preview in import execution context', async () => {
      // Verify the systemId ('hill' or 'sutter') flows through to patient creation
      const preview = createMockPreview({
        systemId: 'sutter',
        mode: 'merge',
        diff: createMockDiffResult({
          mode: 'merge',
          changes: [createMockChange({ action: 'INSERT' })],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      // Verify patient was created with systemId='sutter' as insuranceGroup
      expect(mockPatientCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insuranceGroup: 'sutter',
          }),
        })
      );
    });

    it('should call syncAllDuplicateFlags after successful import only', async () => {
      // Test 1: Successful import should call syncAllDuplicateFlags
      const preview = createMockPreview();
      (getPreview as jest.Mock).mockReturnValue(preview);

      await executeImport('test-preview-123');
      expect(syncAllDuplicateFlags).toHaveBeenCalled();

      // Test 2: Failed transaction should NOT call syncAllDuplicateFlags
      jest.clearAllMocks();
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockTransaction.mockRejectedValue(new Error('DB constraint error'));

      await executeImport('test-preview-123');
      expect(syncAllDuplicateFlags).not.toHaveBeenCalled();
    });
  });

  describe('BUG FIX: Replace All insurance group scoping', () => {
    // Replace All mode should only delete records from the same insurance group.
    // The fix filters records at the loadExistingRecords level (diffCalculator),
    // but the executor should correctly process the filtered DELETE + INSERT list.

    it('should only delete the records present in the diff (insurance-filtered)', async () => {
      // Diff was calculated with insurance filter — only 2 Hill records to delete
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'hill',
        mode: 'replace',
        diff: createMockDiffResult({
          mode: 'replace',
          summary: { inserts: 3, updates: 0, skips: 0, duplicates: 0, deletes: 2 },
          changes: [
            createMockChange({
              action: 'DELETE',
              memberName: 'Hill Patient A',
              existingPatientId: 1,
              existingMeasureId: 101,
            }),
            createMockChange({
              action: 'DELETE',
              memberName: 'Hill Patient B',
              existingPatientId: 2,
              existingMeasureId: 102,
            }),
            // Sutter patients (IDs 3, 4) are NOT in the diff — they were filtered out
            createMockChange({
              action: 'INSERT',
              memberName: 'New Hill Patient 1',
              newStatus: 'Completed',
            }),
            createMockChange({
              action: 'INSERT',
              memberName: 'New Hill Patient 2',
              newStatus: 'Not Addressed',
            }),
            createMockChange({
              action: 'INSERT',
              memberName: 'New Hill Patient 3',
              newStatus: 'AWV completed',
            }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockMeasureDeleteMany.mockResolvedValue({ count: 2 });
      mockPatientFindUnique.mockResolvedValue(null);
      mockPatientCreate.mockResolvedValue({ id: 99 });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      // deleteMany should only receive the 2 Hill measure IDs, not Sutter IDs
      expect(mockMeasureDeleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: { in: [101, 102] },
          },
        })
      );
      expect(result.stats.inserted).toBe(3);
    });

    it('should not delete any records when diff has zero DELETEs (empty physician)', async () => {
      // First import for a physician — no existing records to delete
      const preview = createMockPreview({
        targetOwnerId: 10,
        systemId: 'sutter',
        mode: 'replace',
        diff: createMockDiffResult({
          mode: 'replace',
          summary: { inserts: 2, updates: 0, skips: 0, duplicates: 0, deletes: 0 },
          changes: [
            createMockChange({ action: 'INSERT', memberName: 'Patient A', newStatus: 'Completed' }),
            createMockChange({ action: 'INSERT', memberName: 'Patient B', newStatus: 'Not Addressed' }),
          ],
        }),
      });
      (getPreview as jest.Mock).mockReturnValue(preview);
      mockPatientFindUnique.mockResolvedValue(null);
      mockPatientCreate.mockResolvedValue({ id: 99 });

      const result = await executeImport('test-preview-123');

      expect(result.success).toBe(true);
      // No deleteMany call at all — no records to delete
      expect(mockMeasureDeleteMany).not.toHaveBeenCalled();
      expect(result.stats.inserted).toBe(2);
    });
  });
});
