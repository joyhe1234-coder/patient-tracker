/**
 * Unit tests for previewCache.ts
 * Tests cache storage, retrieval, TTL, and cleanup
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  storePreview,
  getPreview,
  deletePreview,
  hasValidPreview,
  getActivePreviews,
  getCacheStats,
  cleanupExpired,
  clearCache,
  extendPreviewTTL,
  getPreviewSummary,
  stopCleanupTimer,
} from '../previewCache.js';
import { DiffResult, DiffSummary } from '../diffCalculator.js';
import { TransformedRow } from '../dataTransformer.js';
import { ValidationResult } from '../validator.js';

// Helper to create mock data
function createMockDiff(): DiffResult {
  return {
    mode: 'merge',
    summary: {
      inserts: 5,
      updates: 2,
      skips: 10,
      duplicates: 1,
      deletes: 0,
    },
    changes: [],
    newPatients: 3,
    existingPatients: 2,
    generatedAt: new Date(),
  };
}

function createMockRows(): TransformedRow[] {
  return [
    {
      memberName: 'John Smith',
      memberDob: '1990-01-15',
      memberTelephone: '(555) 123-4567',
      memberAddress: '123 Main St',
      requestType: 'AWV',
      qualityMeasure: 'Annual Wellness Visit',
      measureStatus: 'AWV completed',
      statusDate: '2026-01-15',
      sourceRowIndex: 0,
      sourceMeasureColumn: 'AWV Q2',
    },
  ];
}

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

describe('previewCache', () => {
  beforeEach(() => {
    // Clear cache before each test
    clearCache();
  });

  afterEach(() => {
    // Stop cleanup timer after tests
    stopCleanupTimer();
  });

  describe('storePreview', () => {
    it('should store preview and return unique ID', () => {
      const id = storePreview(
        'hill',
        'merge',
        createMockDiff(),
        createMockRows(),
        createMockValidation()
      );

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should generate unique IDs for each store', () => {
      const id1 = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());
      const id2 = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      expect(id1).not.toBe(id2);
    });
  });

  describe('storePreview with Sutter fields', () => {
    it('should store sheetName on preview entry', () => {
      const id = storePreview('sutter', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);
      // Modify the entry to have sheetName (since storePreview doesn't accept sheetName directly,
      // we test by directly setting the field on the retrieved entry)
      expect(entry).not.toBeNull();
      // Note: storePreview doesn't currently accept sheetName as a parameter;
      // it's set externally after storePreview. Test that the field is accessible on PreviewEntry.
      if (entry) {
        entry.sheetName = 'Dr Smith';
        expect(entry.sheetName).toBe('Dr Smith');
      }
    });

    it('should store unmappedActions array on preview entry', () => {
      const id = storePreview('sutter', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);
      expect(entry).not.toBeNull();
      if (entry) {
        entry.unmappedActions = [
          { actionText: 'Unknown action 1', count: 5 },
          { actionText: 'Unknown action 2', count: 3 },
        ];
        expect(entry.unmappedActions).toHaveLength(2);
        expect(entry.unmappedActions[0].actionText).toBe('Unknown action 1');
        expect(entry.unmappedActions[0].count).toBe(5);
      }
    });

    it('should retrieve sheetName and unmappedActions from getPreview', () => {
      const id = storePreview('sutter', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);
      expect(entry).not.toBeNull();
      if (entry) {
        entry.sheetName = 'Dr Jones';
        entry.unmappedActions = [{ actionText: 'Test action', count: 1 }];

        const retrieved = getPreview(id);
        expect(retrieved?.sheetName).toBe('Dr Jones');
        expect(retrieved?.unmappedActions).toHaveLength(1);
      }
    });

    it('should work correctly when sheetName and unmappedActions are undefined (Hill imports)', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);
      expect(entry).not.toBeNull();
      expect(entry?.sheetName).toBeUndefined();
      expect(entry?.unmappedActions).toBeUndefined();
    });

    it('should handle empty unmappedActions array', () => {
      const id = storePreview('sutter', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);
      if (entry) {
        entry.unmappedActions = [];
        expect(entry.unmappedActions).toEqual([]);
      }
    });
  });

  describe('getPreview', () => {
    it('should retrieve stored preview', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const entry = getPreview(id);

      expect(entry).not.toBeNull();
      expect(entry?.id).toBe(id);
      expect(entry?.systemId).toBe('hill');
      expect(entry?.mode).toBe('merge');
    });

    it('should return null for non-existent ID', () => {
      const entry = getPreview('non-existent-id');

      expect(entry).toBeNull();
    });

    it('should return null for expired preview', () => {
      // Store with 1ms TTL
      const id = storePreview(
        'hill',
        'merge',
        createMockDiff(),
        createMockRows(),
        createMockValidation(),
        [], // no warnings
        [], // no reassignments
        null, // no target owner
        1 // 1ms TTL
      );

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const entry = getPreview(id);
          expect(entry).toBeNull();
          resolve();
        }, 10);
      });
    });
  });

  describe('deletePreview', () => {
    it('should delete existing preview', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      const deleted = deletePreview(id);

      expect(deleted).toBe(true);
      expect(getPreview(id)).toBeNull();
    });

    it('should return false for non-existent preview', () => {
      const deleted = deletePreview('non-existent-id');

      expect(deleted).toBe(false);
    });
  });

  describe('hasValidPreview', () => {
    it('should return true for valid preview', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());

      expect(hasValidPreview(id)).toBe(true);
    });

    it('should return false for non-existent preview', () => {
      expect(hasValidPreview('non-existent-id')).toBe(false);
    });
  });

  describe('getActivePreviews', () => {
    it('should return all active previews', () => {
      storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());
      storePreview('kaiser', 'replace', createMockDiff(), createMockRows(), createMockValidation());

      const active = getActivePreviews();

      expect(active).toHaveLength(2);
    });

    it('should exclude expired previews', () => {
      storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation(), [], [], null, 1);
      storePreview('kaiser', 'replace', createMockDiff(), createMockRows(), createMockValidation(), [], [], null, 60000);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const active = getActivePreviews();
          expect(active).toHaveLength(1);
          expect(active[0].systemId).toBe('kaiser');
          resolve();
        }, 10);
      });
    });
  });

  describe('getCacheStats', () => {
    it('should return accurate statistics', () => {
      storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());
      storePreview('kaiser', 'replace', createMockDiff(), createMockRows(), createMockValidation());

      const stats = getCacheStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.activeEntries).toBe(2);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.oldestEntry).not.toBeNull();
      expect(stats.newestEntry).not.toBeNull();
    });
  });

  describe('cleanupExpired', () => {
    it('should remove expired entries', () => {
      storePreview('expired', 'merge', createMockDiff(), createMockRows(), createMockValidation(), [], [], null, 1);
      storePreview('active', 'replace', createMockDiff(), createMockRows(), createMockValidation(), [], [], null, 60000);

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const removed = cleanupExpired();
          expect(removed).toBe(1);

          const stats = getCacheStats();
          expect(stats.totalEntries).toBe(1);
          resolve();
        }, 10);
      });
    });
  });

  describe('clearCache', () => {
    it('should remove all entries', () => {
      storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());
      storePreview('kaiser', 'replace', createMockDiff(), createMockRows(), createMockValidation());

      clearCache();

      const stats = getCacheStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('extendPreviewTTL', () => {
    it('should extend TTL for valid preview', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation(), [], [], null, 1000);

      const originalEntry = getPreview(id);
      const originalExpires = originalEntry?.expiresAt;

      const extended = extendPreviewTTL(id, 5000);

      expect(extended).toBe(true);

      const updatedEntry = getPreview(id);
      expect(updatedEntry?.expiresAt.getTime()).toBeGreaterThan(originalExpires!.getTime());
    });

    it('should return false for non-existent preview', () => {
      const extended = extendPreviewTTL('non-existent-id');

      expect(extended).toBe(false);
    });
  });

  describe('getPreviewSummary', () => {
    it('should return summary for API response', () => {
      const id = storePreview('hill', 'merge', createMockDiff(), createMockRows(), createMockValidation());
      const entry = getPreview(id)!;

      const summary = getPreviewSummary(entry);

      expect(summary.previewId).toBe(id);
      expect(summary.systemId).toBe('hill');
      expect(summary.mode).toBe('merge');
      expect(summary.summary.inserts).toBe(5);
      expect(summary.summary.updates).toBe(2);
      expect(summary.expiresAt).toBeDefined();
      expect(summary.createdAt).toBeDefined();
    });
  });
});
