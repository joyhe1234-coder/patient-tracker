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
});
