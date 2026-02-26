/**
 * dropdownConfig Tests
 *
 * Tests for cascading dropdown configuration: mappings, helper functions,
 * auto-fill logic, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  REQUEST_TYPE_TO_QUALITY_MEASURE,
  QUALITY_MEASURE_TO_STATUS,
  STATUS_TO_TRACKING1,
  REQUEST_TYPES,
  getQualityMeasuresForRequestType,
  getMeasureStatusesForQualityMeasure,
  getTracking1OptionsForStatus,
  shouldAutoFillQualityMeasure,
  getAutoFillQualityMeasure,
} from './dropdownConfig';

describe('dropdownConfig', () => {
  // ── Constants / Data integrity ──────────────────────────────────────

  describe('REQUEST_TYPES', () => {
    it('contains exactly 4 request types', () => {
      expect(REQUEST_TYPES).toEqual(['AWV', 'Chronic DX', 'Quality', 'Screening']);
    });

    it('matches the keys of REQUEST_TYPE_TO_QUALITY_MEASURE', () => {
      const mappingKeys = Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE).sort();
      const requestTypes = [...REQUEST_TYPES].sort();
      expect(mappingKeys).toEqual(requestTypes);
    });
  });

  describe('REQUEST_TYPE_TO_QUALITY_MEASURE', () => {
    it('maps AWV to a single quality measure', () => {
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['AWV']).toEqual(['Annual Wellness Visit']);
    });

    it('maps Chronic DX to a single quality measure', () => {
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Chronic DX']).toEqual(['Chronic Diagnosis Code']);
    });

    it('maps Quality to 8 quality measures', () => {
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Quality']).toHaveLength(8);
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Quality']).toContain('Diabetic Eye Exam');
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Quality']).toContain('Diabetes Control');
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Quality']).toContain('Hypertension Management');
    });

    it('maps Screening to 4 screening measures', () => {
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toHaveLength(4);
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toContain('Breast Cancer Screening');
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toContain('Colon Cancer Screening');
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toContain('Cervical Cancer Screening');
      expect(REQUEST_TYPE_TO_QUALITY_MEASURE['Screening']).toContain('Depression Screening');
    });
  });

  describe('QUALITY_MEASURE_TO_STATUS', () => {
    it('has entries for all quality measures across all request types', () => {
      const allMeasures = Object.values(REQUEST_TYPE_TO_QUALITY_MEASURE).flat();
      for (const measure of allMeasures) {
        expect(QUALITY_MEASURE_TO_STATUS[measure]).toBeDefined();
        expect(QUALITY_MEASURE_TO_STATUS[measure].length).toBeGreaterThan(0);
      }
    });

    it('every quality measure has "Not Addressed" as first status', () => {
      for (const [measure, statuses] of Object.entries(QUALITY_MEASURE_TO_STATUS)) {
        expect(statuses[0]).toBe('Not Addressed');
      }
    });

    it('AWV measure has correct statuses including completed and declined', () => {
      const statuses = QUALITY_MEASURE_TO_STATUS['Annual Wellness Visit'];
      expect(statuses).toContain('AWV completed');
      expect(statuses).toContain('Patient declined AWV');
      expect(statuses).toContain('AWV scheduled');
    });

    it('Diabetes Control has HgbA1c statuses', () => {
      const statuses = QUALITY_MEASURE_TO_STATUS['Diabetes Control'];
      expect(statuses).toContain('HgbA1c ordered');
      expect(statuses).toContain('HgbA1c at goal');
      expect(statuses).toContain('HgbA1c NOT at goal');
    });

    it('Chronic Diagnosis Code has unique chronic statuses', () => {
      const statuses = QUALITY_MEASURE_TO_STATUS['Chronic Diagnosis Code'];
      expect(statuses).toContain('Chronic diagnosis confirmed');
      expect(statuses).toContain('Chronic diagnosis resolved');
      expect(statuses).toContain('Chronic diagnosis invalid');
    });

    describe('Depression Screening', () => {
      it('has exactly 7 statuses', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses).toHaveLength(7);
      });

      it('has "Not Addressed" as the first status', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses[0]).toBe('Not Addressed');
      });

      it('contains all 7 required statuses', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        expect(statuses).toContain('Called to schedule');
        expect(statuses).toContain('Visit scheduled');
        expect(statuses).toContain('Screening complete');
        expect(statuses).toContain('Screening unnecessary');
        expect(statuses).toContain('Patient declined');
        expect(statuses).toContain('No longer applicable');
      });

      it('has no Tracking #1 options for any Depression Screening status', () => {
        const statuses = QUALITY_MEASURE_TO_STATUS['Depression Screening'];
        for (const status of statuses) {
          expect(getTracking1OptionsForStatus(status)).toBeNull();
        }
      });
    });
  });

  describe('STATUS_TO_TRACKING1', () => {
    it('maps colon cancer screening statuses to test types', () => {
      expect(STATUS_TO_TRACKING1['Colon cancer screening ordered']).toEqual(
        ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT']
      );
      expect(STATUS_TO_TRACKING1['Colon cancer screening completed']).toEqual(
        ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT']
      );
    });

    it('maps breast cancer screening statuses to imaging types', () => {
      expect(STATUS_TO_TRACKING1['Screening test ordered']).toEqual(
        ['Mammogram', 'Breast Ultrasound', 'Breast MRI']
      );
    });

    it('maps BP callback statuses to weekly call intervals', () => {
      const bpOptions = STATUS_TO_TRACKING1['Scheduled call back - BP not at goal'];
      expect(bpOptions).toHaveLength(8);
      expect(bpOptions![0]).toBe('Call every 1 wk');
      expect(bpOptions![7]).toBe('Call every 8 wks');
    });

    it('maps chronic diagnosis resolved/invalid to attestation options', () => {
      expect(STATUS_TO_TRACKING1['Chronic diagnosis resolved']).toEqual(
        ['Attestation not sent', 'Attestation sent']
      );
      expect(STATUS_TO_TRACKING1['Chronic diagnosis invalid']).toEqual(
        ['Attestation not sent', 'Attestation sent']
      );
    });

    it('maps Screening discussed to month intervals', () => {
      const options = STATUS_TO_TRACKING1['Screening discussed'];
      expect(options).toHaveLength(11);
      expect(options![0]).toBe('In 1 Month');
      expect(options![10]).toBe('In 11 Months');
    });

    it('does not have tracking for statuses without tracking options', () => {
      expect(STATUS_TO_TRACKING1['Not Addressed']).toBeUndefined();
      expect(STATUS_TO_TRACKING1['AWV completed']).toBeUndefined();
      expect(STATUS_TO_TRACKING1['Patient declined']).toBeUndefined();
    });
  });

  // ── Helper functions ────────────────────────────────────────────────

  describe('getQualityMeasuresForRequestType', () => {
    it('returns sorted quality measures for AWV', () => {
      const result = getQualityMeasuresForRequestType('AWV');
      expect(result).toEqual(['Annual Wellness Visit']);
    });

    it('returns sorted quality measures for Quality', () => {
      const result = getQualityMeasuresForRequestType('Quality');
      // Should be alphabetically sorted
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].localeCompare(result[i + 1])).toBeLessThan(0);
      }
    });

    it('returns sorted quality measures for Screening', () => {
      const result = getQualityMeasuresForRequestType('Screening');
      expect(result).toEqual([
        'Breast Cancer Screening',
        'Cervical Cancer Screening',
        'Colon Cancer Screening',
        'Depression Screening',
      ]);
    });

    it('returns empty array for unknown request type', () => {
      expect(getQualityMeasuresForRequestType('Unknown')).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(getQualityMeasuresForRequestType('')).toEqual([]);
    });

    it('returns a new array each call (no mutation risk)', () => {
      const a = getQualityMeasuresForRequestType('AWV');
      const b = getQualityMeasuresForRequestType('AWV');
      expect(a).toEqual(b);
      expect(a).not.toBe(b); // Different references
    });
  });

  describe('getMeasureStatusesForQualityMeasure', () => {
    it('returns statuses for Annual Wellness Visit', () => {
      const result = getMeasureStatusesForQualityMeasure('Annual Wellness Visit');
      expect(result).toContain('Not Addressed');
      expect(result).toContain('AWV completed');
      expect(result.length).toBe(7);
    });

    it('returns statuses for Diabetes Control', () => {
      const result = getMeasureStatusesForQualityMeasure('Diabetes Control');
      expect(result).toContain('HgbA1c ordered');
      expect(result).toContain('HgbA1c at goal');
      expect(result).toContain('HgbA1c NOT at goal');
    });

    it('returns ["Not Addressed"] for unknown quality measure', () => {
      expect(getMeasureStatusesForQualityMeasure('Unknown')).toEqual(['Not Addressed']);
    });

    it('returns ["Not Addressed"] for empty string', () => {
      expect(getMeasureStatusesForQualityMeasure('')).toEqual(['Not Addressed']);
    });
  });

  describe('getTracking1OptionsForStatus', () => {
    it('returns tracking options for colon cancer screening ordered', () => {
      const result = getTracking1OptionsForStatus('Colon cancer screening ordered');
      expect(result).toEqual(['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT']);
    });

    it('returns tracking options for BP callback statuses', () => {
      const result = getTracking1OptionsForStatus('Scheduled call back - BP not at goal');
      expect(result).toHaveLength(8);
    });

    it('returns attestation options for chronic diagnosis resolved', () => {
      const result = getTracking1OptionsForStatus('Chronic diagnosis resolved');
      expect(result).toEqual(['Attestation not sent', 'Attestation sent']);
    });

    it('returns null for statuses without tracking options', () => {
      expect(getTracking1OptionsForStatus('Not Addressed')).toBeNull();
      expect(getTracking1OptionsForStatus('AWV completed')).toBeNull();
      expect(getTracking1OptionsForStatus('Patient declined')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getTracking1OptionsForStatus('')).toBeNull();
    });

    it('returns null for unknown status', () => {
      expect(getTracking1OptionsForStatus('Non-existent status')).toBeNull();
    });
  });

  describe('shouldAutoFillQualityMeasure', () => {
    it('returns true for AWV (single quality measure)', () => {
      expect(shouldAutoFillQualityMeasure('AWV')).toBe(true);
    });

    it('returns true for Chronic DX (single quality measure)', () => {
      expect(shouldAutoFillQualityMeasure('Chronic DX')).toBe(true);
    });

    it('returns false for Quality (multiple quality measures)', () => {
      expect(shouldAutoFillQualityMeasure('Quality')).toBe(false);
    });

    it('returns false for Screening (multiple quality measures)', () => {
      expect(shouldAutoFillQualityMeasure('Screening')).toBe(false);
    });

    it('returns false for unknown request type', () => {
      expect(shouldAutoFillQualityMeasure('Unknown')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(shouldAutoFillQualityMeasure('')).toBe(false);
    });
  });

  describe('getAutoFillQualityMeasure', () => {
    it('returns "Annual Wellness Visit" for AWV', () => {
      expect(getAutoFillQualityMeasure('AWV')).toBe('Annual Wellness Visit');
    });

    it('returns "Chronic Diagnosis Code" for Chronic DX', () => {
      expect(getAutoFillQualityMeasure('Chronic DX')).toBe('Chronic Diagnosis Code');
    });

    it('returns null for Quality (multiple measures)', () => {
      expect(getAutoFillQualityMeasure('Quality')).toBeNull();
    });

    it('returns null for Screening (multiple measures)', () => {
      expect(getAutoFillQualityMeasure('Screening')).toBeNull();
    });

    it('returns null for unknown request type', () => {
      expect(getAutoFillQualityMeasure('Unknown')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(getAutoFillQualityMeasure('')).toBeNull();
    });
  });

  // ── Cascade chain validation ────────────────────────────────────────

  describe('cascading chain integrity', () => {
    it('every request type leads to valid quality measures', () => {
      for (const requestType of REQUEST_TYPES) {
        const measures = getQualityMeasuresForRequestType(requestType);
        expect(measures.length).toBeGreaterThan(0);
      }
    });

    it('every quality measure leads to valid statuses', () => {
      for (const requestType of REQUEST_TYPES) {
        const measures = getQualityMeasuresForRequestType(requestType);
        for (const measure of measures) {
          const statuses = getMeasureStatusesForQualityMeasure(measure);
          expect(statuses.length).toBeGreaterThan(0);
          expect(statuses[0]).toBe('Not Addressed');
        }
      }
    });

    it('statuses with tracking options map to valid tracking arrays', () => {
      for (const [status, options] of Object.entries(STATUS_TO_TRACKING1)) {
        expect(options.length).toBeGreaterThan(0);
        // Verify every status in tracking map is a valid measure status somewhere
        const allStatuses = Object.values(QUALITY_MEASURE_TO_STATUS).flat();
        expect(allStatuses).toContain(status);
      }
    });
  });
});
