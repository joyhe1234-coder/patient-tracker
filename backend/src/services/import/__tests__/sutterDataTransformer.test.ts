/**
 * Unit tests for sutterDataTransformer.ts
 * Tests Sutter long-format data transformation
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import {
  transformSutterData,
  SutterTransformResult,
} from '../sutterDataTransformer.js';
import { mapSutterColumns } from '../sutterColumnMapper.js';
import type { SutterSystemConfig } from '../configLoader.js';
import type { MappingResult } from '../columnMapper.js';
import type { ParsedRow } from '../fileParser.js';

// Load actual Sutter config for realistic tests
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sutterConfigPath = path.join(__dirname, '../../../config/import/sutter.json');
const sutterConfig = JSON.parse(fs.readFileSync(sutterConfigPath, 'utf-8')) as SutterSystemConfig;

// Standard Sutter headers
const SUTTER_HEADERS = [
  'Member Name', 'Member DOB', 'Member Telephone', 'Member Home Address',
  'Health Plans', 'Race-Ethnicity', 'Possible Actions Needed',
  'Request Type', 'Measure Details', 'High Priority',
];

function getMapping(headers: string[] = SUTTER_HEADERS): MappingResult {
  return mapSutterColumns(headers, sutterConfig);
}

function makeRow(overrides: Partial<ParsedRow> = {}): ParsedRow {
  return {
    'Member Name': 'Smith, John',
    'Member DOB': '01/15/1960',
    'Member Telephone': '5551234567',
    'Member Home Address': '123 Main St',
    'Health Plans': 'Gold Plan',
    'Race-Ethnicity': 'Unknown',
    'Possible Actions Needed': '',
    'Request Type': '',
    'Measure Details': '',
    'High Priority': '',
    ...overrides,
  };
}

describe('sutterDataTransformer', () => {
  let mapping: MappingResult;

  beforeAll(() => {
    mapping = getMapping();
  });

  describe('AWV request type', () => {
    it('should map AWV request type correctly', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('AWV');
      expect(result.rows[0].qualityMeasure).toBe('Annual Wellness Visit');
    });

    it('should extract patient data for AWV rows', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].memberName).toBe('Smith, John');
      expect(result.rows[0].memberDob).toBe('1960-01-15');
    });
  });

  describe('APV request type', () => {
    it('should map APV to AWV (Annual Wellness Visit)', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'APV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('AWV');
      expect(result.rows[0].qualityMeasure).toBe('Annual Wellness Visit');
    });
  });

  describe('HCC request type', () => {
    it('should map HCC to Chronic DX with notes', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'HCC',
          'Possible Actions Needed': 'Diabetes Type 2, E11.65',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('Chronic DX');
      expect(result.rows[0].qualityMeasure).toBe('Chronic Diagnosis Code');
      expect((result.rows[0] as any).notes).toBe('Diabetes Type 2, E11.65');
    });

    it('should set notes to null when HCC has empty action text', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'HCC',
          'Possible Actions Needed': '',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('Chronic DX');
      // notes should not be set (or be undefined) since actionText is empty
      expect((result.rows[0] as any).notes).toBeUndefined();
    });
  });

  describe('Quality request type with matched action', () => {
    it('should resolve Quality via action mapper for FOBT', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'FOBT in 2025 or colonoscopy in 2015-2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('Screening');
      expect(result.rows[0].qualityMeasure).toBe('Colon Cancer Screening');
      expect(result.rows[0].measureStatus).toBe('Not Addressed');
    });

    it('should resolve Quality via action mapper for HTN BP', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'HTN - Most recent 2025 BP less than 140/90',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('Quality');
      expect(result.rows[0].qualityMeasure).toBe('Hypertension Management');
      expect(result.rows[0].measureStatus).toBe('Not at goal');
    });

    it('should resolve Quality via action mapper for Vaccine', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Vaccine: Flu 2025-2026',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].requestType).toBe('Quality');
      expect(result.rows[0].qualityMeasure).toBe('Vaccination');
    });
  });

  describe('Quality request type with unmatched action', () => {
    it('should skip unmatched Quality rows and count in unmappedActions', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Annual Child and Young Adult Well-Care Visits',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.unmappedActions).toHaveLength(1);
      expect(result.unmappedActions[0].actionText).toBe('Annual Child and Young Adult Well-Care Visits');
      expect(result.unmappedActions[0].count).toBe(1);
    });

    it('should aggregate multiple occurrences of same unmapped action', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Some unmapped action',
        }),
        makeRow({
          'Member Name': 'Doe, Jane',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Some unmapped action',
        }),
        makeRow({
          'Member Name': 'Brown, Bob',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Some unmapped action',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.unmappedActions).toHaveLength(1);
      expect(result.unmappedActions[0].count).toBe(3);
    });

    it('should skip Quality row with empty action text', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': '',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('empty Possible Actions Needed'))).toBe(true);
    });
  });

  describe('unmapped actions aggregation and sorting', () => {
    it('should sort unmapped actions by count descending', () => {
      const rows: ParsedRow[] = [
        // 1 occurrence of action A
        makeRow({ 'Request Type': 'Quality', 'Possible Actions Needed': 'Action A' }),
        // 3 occurrences of action B
        makeRow({ 'Member Name': 'P2', 'Request Type': 'Quality', 'Possible Actions Needed': 'Action B' }),
        makeRow({ 'Member Name': 'P3', 'Request Type': 'Quality', 'Possible Actions Needed': 'Action B' }),
        makeRow({ 'Member Name': 'P4', 'Request Type': 'Quality', 'Possible Actions Needed': 'Action B' }),
        // 2 occurrences of action C
        makeRow({ 'Member Name': 'P5', 'Request Type': 'Quality', 'Possible Actions Needed': 'Action C' }),
        makeRow({ 'Member Name': 'P6', 'Request Type': 'Quality', 'Possible Actions Needed': 'Action C' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.unmappedActions).toHaveLength(3);
      expect(result.unmappedActions[0].actionText).toBe('Action B');
      expect(result.unmappedActions[0].count).toBe(3);
      expect(result.unmappedActions[1].actionText).toBe('Action C');
      expect(result.unmappedActions[1].count).toBe(2);
      expect(result.unmappedActions[2].actionText).toBe('Action A');
      expect(result.unmappedActions[2].count).toBe(1);
    });
  });

  describe('Measure Details parsing integration', () => {
    it('should parse semicolon Measure Details into statusDate and tracking1', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'DM - Most recent 2025 HbA1c less than 9.0',
          'Measure Details': '01/15/2025; 7.5',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].statusDate).toBe('2025-01-15');
      expect((result.rows[0] as any).tracking1).toBe('7.5');
    });

    it('should parse single date Measure Details into statusDate', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'AWV',
          'Measure Details': '03/20/2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].statusDate).toBe('2025-03-20');
      expect((result.rows[0] as any).tracking1).toBeUndefined();
    });

    it('should handle empty Measure Details gracefully', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'AWV',
          'Measure Details': '',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].statusDate).toBeNull();
    });

    it('should set tracking1 from non-date Measure Details', () => {
      // Use a value that cannot be parsed as a date (large decimal)
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'DM - Most recent 2025 HbA1c less than 9.0',
          'Measure Details': '142/72',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].statusDate).toBeNull();
      expect((result.rows[0] as any).tracking1).toBe('142/72');
    });
  });

  describe('missing Member Name', () => {
    it('should skip rows with missing Member Name and add error', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Member Name': '',
          'Request Type': 'AWV',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.message.includes('Missing required patient name'))).toBe(true);
    });
  });

  describe('unknown Request Type', () => {
    it('should skip rows with unknown Request Type and add error', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'UNKNOWN_TYPE',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.errors.some(e => e.message.includes('Unrecognized Request Type'))).toBe(true);
    });

    it('should skip rows with missing Request Type and add error', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': '',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.errors.some(e => e.message.includes('Missing Request Type'))).toBe(true);
    });
  });

  describe('mixed request types in same batch', () => {
    it('should process AWV, HCC, and Quality rows independently', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'AWV',
        }),
        makeRow({
          'Member Name': 'Doe, Jane',
          'Request Type': 'HCC',
          'Possible Actions Needed': 'Diabetes Type 2, E11.65',
        }),
        makeRow({
          'Member Name': 'Brown, Bob',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'FOBT in 2025 or colonoscopy in 2015-2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(3);

      // AWV row
      const awvRow = result.rows.find(r => r.requestType === 'AWV');
      expect(awvRow).toBeDefined();
      expect(awvRow!.qualityMeasure).toBe('Annual Wellness Visit');

      // HCC row
      const hccRow = result.rows.find(r => r.requestType === 'Chronic DX');
      expect(hccRow).toBeDefined();
      expect(hccRow!.qualityMeasure).toBe('Chronic Diagnosis Code');

      // Quality/Screening row
      const qualityRow = result.rows.find(r => r.qualityMeasure === 'Colon Cancer Screening');
      expect(qualityRow).toBeDefined();
      expect(qualityRow!.requestType).toBe('Screening');
    });

    it('should handle mix of matched, unmatched, and errors', () => {
      const rows: ParsedRow[] = [
        // Valid AWV
        makeRow({ 'Request Type': 'AWV' }),
        // Unmatched Quality
        makeRow({
          'Member Name': 'P2',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Unknown action text',
        }),
        // Missing member name
        makeRow({ 'Member Name': '', 'Request Type': 'AWV' }),
        // Unknown request type
        makeRow({ 'Member Name': 'P4', 'Request Type': 'INVALID' }),
        // Valid Quality
        makeRow({
          'Member Name': 'P5',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Vaccine: Flu 2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(2); // AWV + Vaccine
      expect(result.unmappedActions).toHaveLength(1); // Unknown action text
      expect(result.errors.length).toBeGreaterThanOrEqual(2); // Missing name + invalid type
    });
  });

  describe('empty rows', () => {
    it('should handle empty rows (all fields empty)', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Member Name': '',
          'Member DOB': '',
          'Request Type': '',
          'Possible Actions Needed': '',
          'Measure Details': '',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('stats calculation', () => {
    it('should calculate stats correctly', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
        makeRow({ 'Member Name': 'P2', 'Request Type': 'AWV' }),
        makeRow({ 'Member Name': '', 'Request Type': 'AWV' }), // Will be skipped
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.stats.inputRows).toBe(3);
      expect(result.stats.outputRows).toBe(2);
      expect(result.stats.errorCount).toBeGreaterThan(0);
    });

    it('should set dataStartRow correctly', () => {
      const rows: ParsedRow[] = [makeRow({ 'Request Type': 'AWV' })];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.dataStartRow).toBe(4);
    });
  });

  describe('source tracking', () => {
    it('should set sourceRowIndex for each row', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
        makeRow({ 'Member Name': 'P2', 'Request Type': 'AWV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].sourceRowIndex).toBe(0);
      expect(result.rows[1].sourceRowIndex).toBe(1);
    });

    it('should set sourceMeasureColumn from action or request type column', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      // sourceMeasureColumn should be set to one of the data columns
      expect(result.rows[0].sourceMeasureColumn).toBeTruthy();
    });
  });

  describe('patient data extraction', () => {
    it('should parse DOB to ISO format', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Member DOB': '03/22/1985',
          'Request Type': 'AWV',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].memberDob).toBe('1985-03-22');
    });

    it('should normalize phone number', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Member Telephone': '(555) 123-4567',
          'Request Type': 'AWV',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      // Phone should be extracted (exact format depends on normalizePhone)
      expect(result.rows[0].memberTelephone).toBeTruthy();
    });

    it('should extract address', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Member Home Address': '456 Oak Ave, Suite 100',
          'Request Type': 'AWV',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows[0].memberAddress).toBe('456 Oak Ave, Suite 100');
    });
  });

  describe('multiple rows for same patient', () => {
    it('should create separate rows for same patient with different measures', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'AWV',
        }),
        makeRow({
          'Request Type': 'HCC',
          'Possible Actions Needed': 'Diabetes Type 2',
        }),
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Mammogram in 2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(3);
      // All three should have the same patient name
      expect(result.rows[0].memberName).toBe('Smith, John');
      expect(result.rows[1].memberName).toBe('Smith, John');
      expect(result.rows[2].memberName).toBe('Smith, John');
      // But different measures
      expect(result.rows[0].qualityMeasure).toBe('Annual Wellness Visit');
      expect(result.rows[1].qualityMeasure).toBe('Chronic Diagnosis Code');
      expect(result.rows[2].qualityMeasure).toBe('Breast Cancer Screening');
    });
  });

  describe('mapping result passthrough', () => {
    it('should include the mapping result in the return value', () => {
      const rows: ParsedRow[] = [makeRow({ 'Request Type': 'AWV' })];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.mapping).toBe(mapping);
    });
  });

  describe('measureStatus defaulting for mapped actions', () => {
    it('should default measureStatus to "Not Addressed" when action match has empty measureStatus', () => {
      // FOBT action maps to Colon Cancer Screening; the config match.measureStatus
      // is set to "Not Addressed" via the || fallback in the transformer
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'FOBT in 2025 or colonoscopy in 2015-2025',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].measureStatus).toBe('Not Addressed');
    });

    it('should preserve explicit measureStatus from action match when present', () => {
      // HTN BP action maps to Hypertension Management with measureStatus "Not at goal"
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'HTN - Most recent 2025 BP less than 140/90',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].measureStatus).toBe('Not at goal');
    });

    it('should handle mixed mapped and unmapped rows correctly', () => {
      const rows: ParsedRow[] = [
        // Mapped: FOBT -> Screening / Colon Cancer Screening, status defaults to "Not Addressed"
        makeRow({
          'Request Type': 'Quality',
          'Possible Actions Needed': 'FOBT in 2025 or colonoscopy in 2015-2025',
        }),
        // Mapped: HTN -> Quality / Hypertension Management, status = "Not at goal"
        makeRow({
          'Member Name': 'Doe, Jane',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'HTN - Most recent 2025 BP less than 140/90',
        }),
        // Unmapped: skipped, no warnings about status
        makeRow({
          'Member Name': 'Brown, Bob',
          'Request Type': 'Quality',
          'Possible Actions Needed': 'Some completely unmapped action',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      // Only the two mapped rows should produce output
      expect(result.rows).toHaveLength(2);

      // First mapped row: defaulted status
      const colonRow = result.rows.find(r => r.qualityMeasure === 'Colon Cancer Screening');
      expect(colonRow).toBeDefined();
      expect(colonRow!.measureStatus).toBe('Not Addressed');

      // Second mapped row: explicit status from config
      const htnRow = result.rows.find(r => r.qualityMeasure === 'Hypertension Management');
      expect(htnRow).toBeDefined();
      expect(htnRow!.measureStatus).toBe('Not at goal');

      // Unmapped row should be in unmappedActions, not errors
      expect(result.unmappedActions).toHaveLength(1);
      expect(result.unmappedActions[0].actionText).toBe('Some completely unmapped action');
    });

    it('should NOT set measureStatus for AWV rows (direct mapping, not action match)', () => {
      const rows: ParsedRow[] = [
        makeRow({ 'Request Type': 'AWV' }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      // AWV uses direct config mapping; measureStatus is null (not set via action mapper)
      expect(result.rows[0].measureStatus).toBeNull();
    });

    it('should NOT set measureStatus for HCC rows (direct mapping, not action match)', () => {
      const rows: ParsedRow[] = [
        makeRow({
          'Request Type': 'HCC',
          'Possible Actions Needed': 'Diabetes Type 2, E11.65',
        }),
      ];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      expect(result.rows).toHaveLength(1);
      // HCC uses direct config mapping; measureStatus is null
      expect(result.rows[0].measureStatus).toBeNull();
    });
  });

  describe('patientsWithNoMeasures', () => {
    it('should return empty patientsWithNoMeasures array (Sutter is 1:1)', () => {
      const rows: ParsedRow[] = [makeRow({ 'Request Type': 'AWV' })];

      const result = transformSutterData(SUTTER_HEADERS, rows, sutterConfig, mapping, 4);

      // In Sutter long format, patientsWithNoMeasures is always empty
      // because each row is already one measure
      expect(result.patientsWithNoMeasures).toHaveLength(0);
    });
  });
});
