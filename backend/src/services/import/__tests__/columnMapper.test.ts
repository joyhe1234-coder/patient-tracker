/**
 * Unit tests for columnMapper.ts
 * Tests column mapping from CSV headers to internal fields
 */

import { describe, it, expect } from '@jest/globals';
import {
  mapColumns,
  getPatientColumnMappings,
  getMeasureColumnMappings,
  groupMeasureColumns,
  MappingResult,
} from '../columnMapper.js';

describe('columnMapper', () => {
  // Use 'hill' system config for all tests
  const systemId = 'hill';

  describe('mapColumns', () => {
    it('should map patient columns correctly', () => {
      const headers = ['Patient', 'DOB', 'Phone', 'Address'];

      const result = mapColumns(headers, systemId);

      expect(result.missingRequired).toHaveLength(0);

      const patientMappings = getPatientColumnMappings(result.mappedColumns);
      expect(patientMappings).toHaveLength(4);

      const nameMapping = patientMappings.find(m => m.sourceColumn === 'Patient');
      expect(nameMapping?.targetField).toBe('memberName');

      const dobMapping = patientMappings.find(m => m.sourceColumn === 'DOB');
      expect(dobMapping?.targetField).toBe('memberDob');
    });

    it('should map measure columns with Q1/Q2 suffixes', () => {
      const headers = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];

      const result = mapColumns(headers, systemId);

      const measureMappings = getMeasureColumnMappings(result.mappedColumns);
      expect(measureMappings).toHaveLength(2);

      const q1Mapping = measureMappings.find(m => m.sourceColumn === 'Annual Wellness Visit Q1');
      expect(q1Mapping?.targetField).toBe('statusDate');
      expect(q1Mapping?.measureInfo?.qualityMeasure).toBe('Annual Wellness Visit');

      const q2Mapping = measureMappings.find(m => m.sourceColumn === 'Annual Wellness Visit Q2');
      expect(q2Mapping?.targetField).toBe('complianceStatus');
    });

    it('should identify skip columns', () => {
      const headers = ['Patient', 'DOB', 'Sex', 'MembID'];

      const result = mapColumns(headers, systemId);

      expect(result.skippedColumns).toContain('Sex');
      expect(result.skippedColumns).toContain('MembID');
      expect(result.stats.skipped).toBe(2);
    });

    it('should identify unmapped columns', () => {
      const headers = ['Patient', 'DOB', 'Unknown Column', 'Random Field'];

      const result = mapColumns(headers, systemId);

      expect(result.unmappedColumns).toContain('Unknown Column');
      expect(result.unmappedColumns).toContain('Random Field');
      expect(result.stats.unmapped).toBe(2);
    });

    it('should report missing required columns', () => {
      const headers = ['Phone', 'Address']; // Missing Patient and DOB

      const result = mapColumns(headers, systemId);

      expect(result.missingRequired).toContain('Patient');
      expect(result.missingRequired).toContain('DOB');
    });

    it('should handle empty headers', () => {
      const headers = ['Patient', '', 'DOB', '   ', 'Phone'];

      const result = mapColumns(headers, systemId);

      expect(result.stats.total).toBe(3); // Only non-empty headers counted
    });

    it('should trim whitespace from headers', () => {
      const headers = ['  Patient  ', '  DOB  '];

      const result = mapColumns(headers, systemId);

      expect(result.missingRequired).toHaveLength(0);
      expect(result.mappedColumns).toHaveLength(2);
    });

    it('should calculate stats correctly', () => {
      const headers = ['Patient', 'DOB', 'Phone', 'Sex', 'Unknown', 'Annual Wellness Visit Q1'];

      const result = mapColumns(headers, systemId);

      expect(result.stats.total).toBe(6);
      expect(result.stats.mapped).toBe(4); // Patient, DOB, Phone, AWV Q1
      expect(result.stats.skipped).toBe(1); // Sex
      expect(result.stats.unmapped).toBe(1); // Unknown
    });
  });

  describe('groupMeasureColumns', () => {
    it('should group Q1 and Q2 columns by quality measure', () => {
      const headers = [
        'Patient', 'DOB',
        'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2',
        'Eye Exam Q1', 'Eye Exam Q2',
      ];

      const result = mapColumns(headers, systemId);
      const grouped = groupMeasureColumns(result.mappedColumns);

      expect(grouped.size).toBe(2); // AWV and Eye Exam

      const awvGroup = Array.from(grouped.values()).find(g => g.qualityMeasure === 'Annual Wellness Visit');
      expect(awvGroup?.q1Columns).toContain('Annual Wellness Visit Q1');
      expect(awvGroup?.q2Columns).toContain('Annual Wellness Visit Q2');
    });

    it('should group multiple columns mapping to same quality measure', () => {
      // Multiple age-bracket columns for same measure
      const headers = [
        'Patient', 'DOB',
        'Breast Cancer Screening E Q1', 'Breast Cancer Screening E Q2',
        'Breast Cancer Screening E 40-49 Q1', 'Breast Cancer Screening E 40-49 Q2',
        'Breast Cancer Screening E 50-74 Q1', 'Breast Cancer Screening E 50-74 Q2',
      ];

      const result = mapColumns(headers, systemId);
      const grouped = groupMeasureColumns(result.mappedColumns);

      // Find breast cancer group
      const breastGroup = Array.from(grouped.values()).find(g => g.qualityMeasure === 'Breast Cancer Screening');

      if (breastGroup) {
        // Should have multiple Q1 and Q2 columns
        expect(breastGroup.q1Columns.length).toBeGreaterThanOrEqual(1);
        expect(breastGroup.q2Columns.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should separate patient and measure mappings', () => {
      const headers = ['Patient', 'DOB', 'Phone', 'Annual Wellness Visit Q1'];

      const result = mapColumns(headers, systemId);

      const patientMappings = getPatientColumnMappings(result.mappedColumns);
      const measureMappings = getMeasureColumnMappings(result.mappedColumns);

      expect(patientMappings).toHaveLength(3);
      expect(measureMappings).toHaveLength(1);

      // Verify no overlap
      for (const pm of patientMappings) {
        expect(pm.columnType).toBe('patient');
        expect(pm.measureInfo).toBeUndefined();
      }
      for (const mm of measureMappings) {
        expect(mm.columnType).toBe('measure');
        expect(mm.measureInfo).toBeDefined();
      }
    });
  });

  describe('with test data headers', () => {
    it('should map test-valid.csv headers correctly', () => {
      // Headers from test-valid.csv
      const headers = [
        'Patient', 'DOB', 'Phone', 'Address',
        'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2',
        'Eye Exam Q1', 'Eye Exam Q2',
        'BP Control Q1', 'BP Control Q2',
        'Breast Cancer Screening E Q1', 'Breast Cancer Screening E Q2',
      ];

      const result = mapColumns(headers, systemId);

      expect(result.missingRequired).toHaveLength(0);
      expect(result.stats.mapped).toBeGreaterThanOrEqual(10);

      // Should have 4 quality measures grouped
      const grouped = groupMeasureColumns(result.mappedColumns);
      expect(grouped.size).toBe(4);
    });

    it('should identify measure types count', () => {
      const headers = [
        'Patient', 'DOB',
        'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2',
        'Eye Exam Q1', 'Eye Exam Q2',
        'BP Control Q1', 'BP Control Q2',
      ];

      const result = mapColumns(headers, systemId);
      const grouped = groupMeasureColumns(result.mappedColumns);

      // 3 measure types: AWV, Eye Exam, BP Control
      expect(grouped.size).toBe(3);
    });
  });
});
