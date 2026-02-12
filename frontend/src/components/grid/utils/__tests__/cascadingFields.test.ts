import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IRowNode } from 'ag-grid-community';
import type { GridRow } from '../../PatientGrid';
import { createMockRowNode } from '../../../../test-utils/agGridMocks';

// Mock dropdownConfig
vi.mock('../../../../config/dropdownConfig', () => ({
  getAutoFillQualityMeasure: vi.fn((requestType: string) => {
    // AWV -> Annual Wellness Visit, Chronic DX -> Chronic Diagnosis Code
    const autoFillMap: Record<string, string> = {
      'AWV': 'Annual Wellness Visit',
      'Chronic DX': 'Chronic Diagnosis Code',
    };
    return autoFillMap[requestType] || null;
  }),
}));

import { applyCascadingUpdates, CascadeResult } from '../cascadingFields';

describe('cascadingFields', () => {
  let mockNode: IRowNode<GridRow>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNode = createMockRowNode<GridRow>();
  });

  describe('applyCascadingUpdates', () => {
    describe('requestType change', () => {
      it('auto-fills qualityMeasure for AWV and clears downstream', () => {
        const result: CascadeResult = applyCascadingUpdates('requestType', 'AWV', mockNode);

        // Should auto-fill qualityMeasure
        expect(result.updatePayload.qualityMeasure).toBe('Annual Wellness Visit');
        expect(mockNode.setDataValue).toHaveBeenCalledWith('qualityMeasure', 'Annual Wellness Visit');

        // Should clear all downstream fields
        expect(result.updatePayload.measureStatus).toBeNull();
        expect(result.updatePayload.statusDate).toBeNull();
        expect(result.updatePayload.tracking1).toBeNull();
        expect(result.updatePayload.tracking2).toBeNull();
        expect(result.updatePayload.tracking3).toBeNull();
        expect(result.updatePayload.dueDate).toBeNull();
        expect(result.updatePayload.timeIntervalDays).toBeNull();
      });

      it('auto-fills qualityMeasure for Chronic DX and clears downstream', () => {
        const result = applyCascadingUpdates('requestType', 'Chronic DX', mockNode);

        expect(result.updatePayload.qualityMeasure).toBe('Chronic Diagnosis Code');
        expect(mockNode.setDataValue).toHaveBeenCalledWith('qualityMeasure', 'Chronic Diagnosis Code');
      });

      it('clears qualityMeasure for multi-QM request types (Quality)', () => {
        const result = applyCascadingUpdates('requestType', 'Quality', mockNode);

        expect(result.updatePayload.qualityMeasure).toBeNull();
        expect(mockNode.setDataValue).toHaveBeenCalledWith('qualityMeasure', null);
      });

      it('clears qualityMeasure for multi-QM request types (Screening)', () => {
        const result = applyCascadingUpdates('requestType', 'Screening', mockNode);

        expect(result.updatePayload.qualityMeasure).toBeNull();
        expect(mockNode.setDataValue).toHaveBeenCalledWith('qualityMeasure', null);
      });

      it('calls setDataValue for all downstream fields', () => {
        applyCascadingUpdates('requestType', 'Quality', mockNode);

        const setDataValue = mockNode.setDataValue as ReturnType<typeof vi.fn>;
        const calls = setDataValue.mock.calls.map((c: unknown[]) => c[0]);

        expect(calls).toContain('qualityMeasure');
        expect(calls).toContain('measureStatus');
        expect(calls).toContain('statusDate');
        expect(calls).toContain('tracking1');
        expect(calls).toContain('tracking2');
        expect(calls).toContain('tracking3');
        expect(calls).toContain('dueDate');
        expect(calls).toContain('timeIntervalDays');
      });

      it('returns updatePayload with all downstream keys', () => {
        const result = applyCascadingUpdates('requestType', 'Quality', mockNode);

        const keys = Object.keys(result.updatePayload);
        expect(keys).toContain('qualityMeasure');
        expect(keys).toContain('measureStatus');
        expect(keys).toContain('statusDate');
        expect(keys).toContain('tracking1');
        expect(keys).toContain('tracking2');
        expect(keys).toContain('tracking3');
        expect(keys).toContain('dueDate');
        expect(keys).toContain('timeIntervalDays');
      });
    });

    describe('qualityMeasure change', () => {
      it('clears all downstream fields', () => {
        const result = applyCascadingUpdates('qualityMeasure', 'Diabetic Eye Exam', mockNode);

        expect(result.updatePayload.measureStatus).toBeNull();
        expect(result.updatePayload.statusDate).toBeNull();
        expect(result.updatePayload.tracking1).toBeNull();
        expect(result.updatePayload.tracking2).toBeNull();
        expect(result.updatePayload.tracking3).toBeNull();
        expect(result.updatePayload.dueDate).toBeNull();
        expect(result.updatePayload.timeIntervalDays).toBeNull();
      });

      it('does NOT include qualityMeasure itself in the payload', () => {
        const result = applyCascadingUpdates('qualityMeasure', 'Diabetic Eye Exam', mockNode);

        // qualityMeasure should not be in the cascade payload
        // (the caller already sets it as the primary field)
        expect(result.updatePayload).not.toHaveProperty('qualityMeasure');
      });

      it('calls setDataValue for each cleared field', () => {
        applyCascadingUpdates('qualityMeasure', 'Diabetic Eye Exam', mockNode);

        expect(mockNode.setDataValue).toHaveBeenCalledWith('measureStatus', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('statusDate', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking1', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking2', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking3', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('dueDate', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('timeIntervalDays', null);
      });
    });

    describe('measureStatus change', () => {
      it('clears statusDate, tracking, and calculated fields', () => {
        const result = applyCascadingUpdates('measureStatus', 'AWV scheduled', mockNode);

        expect(result.updatePayload.statusDate).toBeNull();
        expect(result.updatePayload.tracking1).toBeNull();
        expect(result.updatePayload.tracking2).toBeNull();
        expect(result.updatePayload.tracking3).toBeNull();
        expect(result.updatePayload.dueDate).toBeNull();
        expect(result.updatePayload.timeIntervalDays).toBeNull();
      });

      it('does NOT include measureStatus or qualityMeasure in the payload', () => {
        const result = applyCascadingUpdates('measureStatus', 'AWV scheduled', mockNode);

        expect(result.updatePayload).not.toHaveProperty('measureStatus');
        expect(result.updatePayload).not.toHaveProperty('qualityMeasure');
      });

      it('calls setDataValue for each cleared field', () => {
        applyCascadingUpdates('measureStatus', 'AWV scheduled', mockNode);

        expect(mockNode.setDataValue).toHaveBeenCalledWith('statusDate', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking1', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking2', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('tracking3', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('dueDate', null);
        expect(mockNode.setDataValue).toHaveBeenCalledWith('timeIntervalDays', null);
      });
    });

    describe('non-cascading fields', () => {
      it('returns empty payload for notes change', () => {
        const result = applyCascadingUpdates('notes', 'Some note', mockNode);

        expect(Object.keys(result.updatePayload)).toHaveLength(0);
        expect(mockNode.setDataValue).not.toHaveBeenCalled();
      });

      it('returns empty payload for statusDate change', () => {
        const result = applyCascadingUpdates('statusDate', '2025-01-01', mockNode);

        expect(Object.keys(result.updatePayload)).toHaveLength(0);
        expect(mockNode.setDataValue).not.toHaveBeenCalled();
      });

      it('returns empty payload for tracking1 change', () => {
        const result = applyCascadingUpdates('tracking1', 'In 3 Months', mockNode);

        expect(Object.keys(result.updatePayload)).toHaveLength(0);
        expect(mockNode.setDataValue).not.toHaveBeenCalled();
      });

      it('returns empty payload for memberName change', () => {
        const result = applyCascadingUpdates('memberName', 'New Name', mockNode);

        expect(Object.keys(result.updatePayload)).toHaveLength(0);
        expect(mockNode.setDataValue).not.toHaveBeenCalled();
      });
    });
  });
});
