/**
 * Unit tests for diffCalculator.ts
 * Tests merge logic helper functions and diff generation logic
 *
 * Note: Full integration tests with database are in integration.test.ts
 * These tests focus on the pure logic functions
 */

import { describe, it, expect } from '@jest/globals';
import {
  getDiffSummaryText,
  filterChangesByAction,
  getModifyingChanges,
  DiffResult,
  DiffChange,
} from '../diffCalculator.js';

// Helper to create a mock DiffResult
function createMockDiffResult(overrides: Partial<DiffResult> = {}): DiffResult {
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
    generatedAt: new Date('2026-01-28T12:00:00Z'),
    ...overrides,
  };
}

// Helper to create a mock DiffChange
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

describe('diffCalculator', () => {
  describe('getDiffSummaryText', () => {
    it('should generate human-readable summary for merge mode', () => {
      const result = createMockDiffResult({ mode: 'merge' });

      const summary = getDiffSummaryText(result);

      expect(summary).toContain('Import Mode: MERGE');
      expect(summary).toContain('Inserts: 5');
      expect(summary).toContain('Updates: 2');
      expect(summary).toContain('Skips: 10');
      expect(summary).toContain('Duplicates (BOTH): 1');
      expect(summary).toContain('Deletes: 0');
      expect(summary).toContain('New: 3');
      expect(summary).toContain('Existing: 2');
    });

    it('should generate human-readable summary for replace mode', () => {
      const result = createMockDiffResult({
        mode: 'replace',
        summary: {
          inserts: 100,
          updates: 0,
          skips: 0,
          duplicates: 0,
          deletes: 50,
        },
      });

      const summary = getDiffSummaryText(result);

      expect(summary).toContain('Import Mode: REPLACE');
      expect(summary).toContain('Inserts: 100');
      expect(summary).toContain('Deletes: 50');
    });

    it('should include timestamp', () => {
      const result = createMockDiffResult();

      const summary = getDiffSummaryText(result);

      expect(summary).toContain('Generated:');
    });
  });

  describe('filterChangesByAction', () => {
    it('should filter INSERT actions', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'UPDATE' }),
        createMockChange({ action: 'INSERT', memberName: 'Jane Doe' }),
        createMockChange({ action: 'SKIP' }),
      ];

      const inserts = filterChangesByAction(changes, 'INSERT');

      expect(inserts).toHaveLength(2);
      expect(inserts.every(c => c.action === 'INSERT')).toBe(true);
    });

    it('should filter UPDATE actions', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'UPDATE', oldStatus: 'Not Addressed', newStatus: 'Completed' }),
        createMockChange({ action: 'UPDATE', oldStatus: 'Not Addressed', newStatus: 'At Goal' }),
      ];

      const updates = filterChangesByAction(changes, 'UPDATE');

      expect(updates).toHaveLength(2);
      expect(updates.every(c => c.action === 'UPDATE')).toBe(true);
    });

    it('should filter SKIP actions', () => {
      const changes = [
        createMockChange({ action: 'SKIP', reason: 'Both compliant' }),
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'SKIP', reason: 'Both non-compliant' }),
      ];

      const skips = filterChangesByAction(changes, 'SKIP');

      expect(skips).toHaveLength(2);
    });

    it('should filter BOTH actions', () => {
      const changes = [
        createMockChange({ action: 'BOTH', reason: 'Downgrade detected' }),
        createMockChange({ action: 'INSERT' }),
      ];

      const both = filterChangesByAction(changes, 'BOTH');

      expect(both).toHaveLength(1);
      expect(both[0].action).toBe('BOTH');
    });

    it('should filter DELETE actions', () => {
      const changes = [
        createMockChange({ action: 'DELETE', reason: 'Replace All mode' }),
        createMockChange({ action: 'DELETE', reason: 'Replace All mode' }),
        createMockChange({ action: 'INSERT' }),
      ];

      const deletes = filterChangesByAction(changes, 'DELETE');

      expect(deletes).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'INSERT' }),
      ];

      const updates = filterChangesByAction(changes, 'UPDATE');

      expect(updates).toHaveLength(0);
    });
  });

  describe('getModifyingChanges', () => {
    it('should exclude SKIP actions', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'UPDATE' }),
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'DELETE' }),
        createMockChange({ action: 'BOTH' }),
      ];

      const modifying = getModifyingChanges(changes);

      expect(modifying).toHaveLength(4);
      expect(modifying.every(c => c.action !== 'SKIP')).toBe(true);
    });

    it('should return all changes if no SKIPs', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'UPDATE' }),
        createMockChange({ action: 'DELETE' }),
      ];

      const modifying = getModifyingChanges(changes);

      expect(modifying).toHaveLength(3);
    });

    it('should return empty array if all SKIPs', () => {
      const changes = [
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'SKIP' }),
      ];

      const modifying = getModifyingChanges(changes);

      expect(modifying).toHaveLength(0);
    });
  });

  describe('DiffChange structure', () => {
    it('should have all required fields for INSERT', () => {
      const change = createMockChange({ action: 'INSERT' });

      expect(change.action).toBe('INSERT');
      expect(change.memberName).toBeDefined();
      expect(change.memberDob).toBeDefined();
      expect(change.requestType).toBeDefined();
      expect(change.qualityMeasure).toBeDefined();
      expect(change.newStatus).toBeDefined();
      expect(change.oldStatus).toBeNull();
      expect(change.reason).toBeDefined();
    });

    it('should have all required fields for UPDATE', () => {
      const change = createMockChange({
        action: 'UPDATE',
        oldStatus: 'Not Addressed',
        newStatus: 'Completed',
        existingPatientId: 1,
        existingMeasureId: 10,
      });

      expect(change.action).toBe('UPDATE');
      expect(change.oldStatus).toBe('Not Addressed');
      expect(change.newStatus).toBe('Completed');
      expect(change.existingPatientId).toBe(1);
      expect(change.existingMeasureId).toBe(10);
    });

    it('should have all required fields for BOTH', () => {
      const change = createMockChange({
        action: 'BOTH',
        oldStatus: 'Completed',
        newStatus: 'Not Addressed',
        reason: 'Downgrade detected - keeping both',
      });

      expect(change.action).toBe('BOTH');
      expect(change.oldStatus).toBe('Completed');
      expect(change.newStatus).toBe('Not Addressed');
    });
  });

  describe('DiffSummary counts', () => {
    it('should correctly count changes by action', () => {
      const changes = [
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'INSERT' }),
        createMockChange({ action: 'UPDATE' }),
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'SKIP' }),
        createMockChange({ action: 'BOTH' }),
        createMockChange({ action: 'DELETE' }),
      ];

      const inserts = filterChangesByAction(changes, 'INSERT').length;
      const updates = filterChangesByAction(changes, 'UPDATE').length;
      const skips = filterChangesByAction(changes, 'SKIP').length;
      const duplicates = filterChangesByAction(changes, 'BOTH').length;
      const deletes = filterChangesByAction(changes, 'DELETE').length;

      expect(inserts).toBe(2);
      expect(updates).toBe(1);
      expect(skips).toBe(3);
      expect(duplicates).toBe(1);
      expect(deletes).toBe(1);
    });
  });
});

describe('Merge Logic Documentation', () => {
  /**
   * This describes the expected merge behavior for reference.
   * Full integration tests with real DB should verify this.
   */

  it('documents Case 1: Old does NOT exist, new has value -> INSERT', () => {
    const change = createMockChange({
      action: 'INSERT',
      oldStatus: null,
      newStatus: 'AWV completed',
      reason: 'New patient+measure combination',
    });

    expect(change.action).toBe('INSERT');
    expect(change.oldStatus).toBeNull();
    expect(change.newStatus).not.toBeNull();
  });

  it('documents Case 2: Old exists, new blank -> SKIP', () => {
    const change = createMockChange({
      action: 'SKIP',
      oldStatus: 'AWV completed',
      newStatus: null,
      reason: 'New data is blank - keeping existing',
    });

    expect(change.action).toBe('SKIP');
    expect(change.oldStatus).not.toBeNull();
    expect(change.newStatus).toBeNull();
  });

  it('documents Case 3: Old non-compliant, new compliant -> UPDATE', () => {
    const change = createMockChange({
      action: 'UPDATE',
      oldStatus: 'Not Addressed',
      newStatus: 'AWV completed',
      reason: 'Upgrading from non-compliant to compliant',
    });

    expect(change.action).toBe('UPDATE');
    expect(change.reason).toContain('Upgrading');
  });

  it('documents Case 4: Old compliant, new compliant -> SKIP', () => {
    const change = createMockChange({
      action: 'SKIP',
      oldStatus: 'AWV completed',
      newStatus: 'AWV completed',
      reason: 'Both compliant - keeping existing',
    });

    expect(change.action).toBe('SKIP');
    expect(change.reason).toContain('Both compliant');
  });

  it('documents Case 5: Old non-compliant, new non-compliant -> SKIP', () => {
    const change = createMockChange({
      action: 'SKIP',
      oldStatus: 'Not Addressed',
      newStatus: 'Not Addressed',
      reason: 'Both non-compliant - keeping existing',
    });

    expect(change.action).toBe('SKIP');
    expect(change.reason).toContain('Both non-compliant');
  });

  it('documents Case 6: Old compliant, new non-compliant -> BOTH', () => {
    const change = createMockChange({
      action: 'BOTH',
      oldStatus: 'AWV completed',
      newStatus: 'Not Addressed',
      reason: 'Downgrade detected - keeping both (old compliant + new non-compliant)',
    });

    expect(change.action).toBe('BOTH');
    expect(change.reason).toContain('Downgrade');
  });
});
