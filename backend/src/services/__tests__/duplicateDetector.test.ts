/**
 * Duplicate Detector Tests
 *
 * Tests the duplicate detection logic for patient measures.
 * Duplicates are defined as: same patient + requestType + qualityMeasure.
 * Rows with null/empty requestType or qualityMeasure are never duplicates.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindMany = jest.fn<any>();
const mockUpdate = jest.fn<any>();
const mockUpdateMany = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use unstable_mockModule for ESM compatibility (required by this project's Jest ESM config)
jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: {
    patientMeasure: {
      findMany: mockFindMany,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
  },
}));

// Dynamic imports after mock setup (ESM requirement)
const {
  checkForDuplicate,
  updateDuplicateFlags,
  detectAllDuplicates,
  syncAllDuplicateFlags,
} = await import('../duplicateDetector.js');

describe('duplicateDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // checkForDuplicate
  // ---------------------------------------------------------------------------
  describe('checkForDuplicate', () => {
    it('should return false when requestType is null', async () => {
      const result = await checkForDuplicate(1, null, 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      // Should NOT call prisma at all when requestType is null
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when requestType is undefined', async () => {
      const result = await checkForDuplicate(1, undefined, 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when requestType is empty string', async () => {
      const result = await checkForDuplicate(1, '', 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when requestType is whitespace-only', async () => {
      const result = await checkForDuplicate(1, '   ', 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when qualityMeasure is null', async () => {
      const result = await checkForDuplicate(1, 'AWV', null);

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when qualityMeasure is undefined', async () => {
      const result = await checkForDuplicate(1, 'AWV', undefined);

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when qualityMeasure is empty string', async () => {
      const result = await checkForDuplicate(1, 'AWV', '');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when qualityMeasure is whitespace-only', async () => {
      const result = await checkForDuplicate(1, 'AWV', '  \t  ');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return false when both requestType and qualityMeasure are null', async () => {
      const result = await checkForDuplicate(1, null, null);

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
      expect(mockFindMany).not.toHaveBeenCalled();
    });

    it('should return true when existing measures are found', async () => {
      mockFindMany.mockResolvedValue([{ id: 10 }, { id: 20 }]);

      const result = await checkForDuplicate(1, 'AWV', 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateIds).toEqual([10, 20]);
    });

    it('should return false when no existing measures are found', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await checkForDuplicate(1, 'AWV', 'Annual Wellness Visit');

      expect(result.isDuplicate).toBe(false);
      expect(result.duplicateIds).toEqual([]);
    });

    it('should return correct duplicateIds array with single match', async () => {
      mockFindMany.mockResolvedValue([{ id: 42 }]);

      const result = await checkForDuplicate(5, 'Screening', 'Colon Cancer');

      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateIds).toEqual([42]);
    });

    it('should pass correct where clause to prisma without excludeMeasureId', async () => {
      mockFindMany.mockResolvedValue([]);

      await checkForDuplicate(7, 'AWV', 'Annual Wellness Visit');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          patientId: 7,
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
        },
        select: { id: true },
      });
    });

    it('should pass excludeMeasureId in where clause when provided', async () => {
      mockFindMany.mockResolvedValue([]);

      await checkForDuplicate(7, 'AWV', 'Annual Wellness Visit', 99);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          patientId: 7,
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
          id: { not: 99 },
        },
        select: { id: true },
      });
    });

    it('should NOT include excludeMeasureId when it is 0 (falsy)', async () => {
      mockFindMany.mockResolvedValue([]);

      await checkForDuplicate(7, 'AWV', 'Annual Wellness Visit', 0);

      // 0 is falsy, so the spread won't add the id filter
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          patientId: 7,
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
        },
        select: { id: true },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // detectAllDuplicates
  // ---------------------------------------------------------------------------
  describe('detectAllDuplicates', () => {
    it('should return empty map when there are no measures', async () => {
      mockFindMany.mockResolvedValue([]);

      const result = await detectAllDuplicates();

      expect(result.size).toBe(0);
    });

    it('should mark single measures as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: 'Screening', qualityMeasure: 'Colon Cancer' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should mark groups of 2+ measures with same key as duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(true);
      expect(result.get(2)).toBe(true);
    });

    it('should mark groups of 3+ measures as duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 3, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(true);
      expect(result.get(2)).toBe(true);
      expect(result.get(3)).toBe(true);
    });

    it('should mark measures with null requestType as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: null, qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: null, qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should mark measures with null qualityMeasure as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: null },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: null },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should mark measures with empty requestType as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: '', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: '', qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should mark measures with empty qualityMeasure as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: '' },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: '' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should group by patientId - different patients with same fields are NOT duplicates', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 200, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(false);
      expect(result.get(2)).toBe(false);
    });

    it('should handle mixed duplicates and non-duplicates correctly', async () => {
      mockFindMany.mockResolvedValue([
        // Duplicate pair for patient 100
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        // Unique measure for patient 100
        { id: 3, patientId: 100, requestType: 'Screening', qualityMeasure: 'Colon Cancer' },
        // Same fields as patient 100 but different patient - NOT duplicate
        { id: 4, patientId: 200, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        // Null field - never duplicate
        { id: 5, patientId: 100, requestType: null, qualityMeasure: 'Annual Wellness Visit' },
      ]);

      const result = await detectAllDuplicates();

      expect(result.get(1)).toBe(true);  // Duplicate
      expect(result.get(2)).toBe(true);  // Duplicate
      expect(result.get(3)).toBe(false); // Unique
      expect(result.get(4)).toBe(false); // Different patient
      expect(result.get(5)).toBe(false); // Null requestType
    });

    it('should call findMany with correct select fields', async () => {
      mockFindMany.mockResolvedValue([]);

      await detectAllDuplicates();

      expect(mockFindMany).toHaveBeenCalledWith({
        select: {
          id: true,
          patientId: true,
          requestType: true,
          qualityMeasure: true,
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // updateDuplicateFlags
  // ---------------------------------------------------------------------------
  describe('updateDuplicateFlags', () => {
    it('should mark groups with 2+ rows as duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      ]);
      mockUpdate.mockResolvedValue({});
      mockUpdateMany.mockResolvedValue({ count: 2 });

      await updateDuplicateFlags(100);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isDuplicate: true },
      });
    });

    it('should mark single rows as not duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, requestType: 'Screening', qualityMeasure: 'Colon Cancer' },
      ]);
      mockUpdate.mockResolvedValue({});
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await updateDuplicateFlags(100);

      // Each unique group should be marked as not duplicate
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [1] } },
        data: { isDuplicate: false },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [2] } },
        data: { isDuplicate: false },
      });
    });

    it('should set isDuplicate=false for rows with null requestType', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: null, qualityMeasure: 'Annual Wellness Visit' },
      ]);
      mockUpdate.mockResolvedValue({});

      await updateDuplicateFlags(100);

      // Null requestType rows are individually updated to isDuplicate: false
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: false },
      });
      // Should NOT be passed to updateMany
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('should set isDuplicate=false for rows with null qualityMeasure', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: 'AWV', qualityMeasure: null },
      ]);
      mockUpdate.mockResolvedValue({});

      await updateDuplicateFlags(100);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: false },
      });
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('should set isDuplicate=false for rows with empty requestType', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: '', qualityMeasure: 'Annual Wellness Visit' },
      ]);
      mockUpdate.mockResolvedValue({});

      await updateDuplicateFlags(100);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: false },
      });
    });

    it('should set isDuplicate=false for rows with empty qualityMeasure', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: 'AWV', qualityMeasure: '' },
      ]);
      mockUpdate.mockResolvedValue({});

      await updateDuplicateFlags(100);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: false },
      });
    });

    it('should handle mix of null and valid measures', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, requestType: null, qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 3, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
      ]);
      mockUpdate.mockResolvedValue({});
      mockUpdateMany.mockResolvedValue({ count: 2 });

      await updateDuplicateFlags(100);

      // Null row updated individually
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: false },
      });
      // Valid pair marked as duplicate via updateMany
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [2, 3] } },
        data: { isDuplicate: true },
      });
    });

    it('should pass correct patientId to findMany', async () => {
      mockFindMany.mockResolvedValue([]);

      await updateDuplicateFlags(42);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { patientId: 42 },
        select: {
          id: true,
          requestType: true,
          qualityMeasure: true,
        },
      });
    });

    it('should handle empty measures list', async () => {
      mockFindMany.mockResolvedValue([]);

      await updateDuplicateFlags(100);

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockUpdateMany).not.toHaveBeenCalled();
    });

    it('should handle multiple distinct groups correctly', async () => {
      mockFindMany.mockResolvedValue([
        // Group 1: AWV + Annual Wellness Visit (duplicate pair)
        { id: 1, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        // Group 2: Screening + Colon Cancer (single, not duplicate)
        { id: 3, requestType: 'Screening', qualityMeasure: 'Colon Cancer' },
      ]);
      mockUpdate.mockResolvedValue({});
      mockUpdateMany.mockResolvedValue({ count: 2 });

      await updateDuplicateFlags(100);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] } },
        data: { isDuplicate: true },
      });
      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: { in: [3] } },
        data: { isDuplicate: false },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // syncAllDuplicateFlags
  // ---------------------------------------------------------------------------
  describe('syncAllDuplicateFlags', () => {
    it('should update each measure with its duplicate status', async () => {
      mockFindMany.mockResolvedValue([
        { id: 1, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 2, patientId: 100, requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit' },
        { id: 3, patientId: 100, requestType: 'Screening', qualityMeasure: 'Colon Cancer' },
      ]);
      mockUpdate.mockResolvedValue({});

      await syncAllDuplicateFlags();

      // Duplicates
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isDuplicate: true },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isDuplicate: true },
      });
      // Non-duplicate
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { isDuplicate: false },
      });
    });

    it('should handle no measures without errors', async () => {
      mockFindMany.mockResolvedValue([]);

      await syncAllDuplicateFlags();

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
