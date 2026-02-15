/**
 * Edge case tests for Sutter import
 * Tests vaccine variations, mixed request types, whitespace handling, etc.
 *
 * Task 49: Validates edge case handling across the Sutter import pipeline
 */

import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { parseExcel } from '../fileParser.js';
import { transformData } from '../dataTransformer.js';
import { buildActionMapperCache, matchAction } from '../actionMapper.js';
import { parseMeasureDetails } from '../measureDetailsParser.js';
import {
  calculateMergeDiff,
  type ExistingRecord,
  type DiffSummary,
} from '../diffCalculator.js';
import { loadSystemConfig, type SutterSystemConfig } from '../configLoader.js';

/**
 * Create a multi-sheet Excel buffer.
 */
function createWorkbook(sheets: Record<string, unknown[][]>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Create standard Sutter tab data.
 */
function createSutterTabData(dataRows: unknown[][]): unknown[][] {
  return [
    ['Report Title'],
    ['Generated: 2026-01-15'],
    [''],
    ['Member Name', 'Member DOB', 'Member Telephone', 'Member Home Address',
     'Health Plans', 'Race-Ethnicity', 'Possible Actions Needed', 'Request Type',
     'Measure Details', 'High Priority'],
    ...dataRows,
  ];
}

function createEmptySummary(): DiffSummary {
  return { inserts: 0, updates: 0, skips: 0, duplicates: 0, deletes: 0 };
}

describe('Sutter Edge Cases', () => {
  describe('vaccine action text variations', () => {
    let cache: ReturnType<typeof buildActionMapperCache>;

    beforeAll(() => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;
      cache = buildActionMapperCache(config.actionMapping);
    });

    it('should match "Vaccine: Influenza" to Vaccination', () => {
      const match = matchAction('Vaccine: Influenza', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should match "Vaccine: Pneumococcal" to Vaccination', () => {
      const match = matchAction('Vaccine: Pneumococcal', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should match "Vaccine: Tdap" to Vaccination', () => {
      const match = matchAction('Vaccine: Tdap', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should match "Vaccine: Zoster" to Vaccination', () => {
      const match = matchAction('Vaccine: Zoster', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should match "Vaccine: Hepatitis B" to Vaccination', () => {
      const match = matchAction('Vaccine: Hepatitis B', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should match vaccine with mixed case', () => {
      const match = matchAction('VACCINE: COVID-19', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });
  });

  describe('mixed request types in same tab', () => {
    it('should process AWV, HCC, and Quality rows independently', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
        ['Smith, John', '01/15/1990', '', '', '', '', 'HCC: diagnosis code', 'HCC', '', ''],
        ['Smith, John', '01/15/1990', '', '', '', '', 'Mammogram in 2026', 'Quality', '', ''],
        ['Doe, Jane', '03/20/1985', '', '', '', '', '', 'AWV', '', ''],
        ['Doe, Jane', '03/20/1985', '', '', '', '', 'Vaccine: Flu', 'Quality', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // Should have 5 transformed rows
      expect(transformResult.rows).toHaveLength(5);

      // Check each request type is present
      const requestTypes = transformResult.rows.map(r => r.requestType);
      expect(requestTypes).toContain('AWV');
      expect(requestTypes).toContain('Chronic DX');
      expect(requestTypes).toContain('Screening');
      expect(requestTypes).toContain('Quality');
    });
  });

  describe('same patient with multiple actions', () => {
    it('should create separate TransformedRows for each action', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '5551234', '123 Main',
         '', '', '', 'AWV', '', ''],
        ['Smith, John', '01/15/1990', '5551234', '123 Main',
         '', '', 'DM - Eye exam in 2026', 'Quality', '', ''],
        ['Smith, John', '01/15/1990', '5551234', '123 Main',
         '', '', 'DM - Most recent 2026 HbA1c', 'Quality', '01/10/2026; 7.2', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(3);

      // All rows should have the same patient
      for (const row of transformResult.rows) {
        expect(row.memberName).toBe('Smith, John');
      }

      // But different measures
      const measures = transformResult.rows.map(r => r.qualityMeasure);
      expect(measures).toContain('Annual Wellness Visit');
      expect(measures).toContain('Diabetic Eye Exam');
      expect(measures).toContain('Diabetes Control');
    });

    it('should create separate INSERT changes for same patient different measures', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
        ['Smith, John', '01/15/1990', '', '', '', '', 'DM - Eye exam in 2026', 'Quality', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, new Map(), summary);

      expect(summary.inserts).toBe(2);
      expect(changes).toHaveLength(2);
    });
  });

  describe('action text with whitespace/line breaks', () => {
    let cache: ReturnType<typeof buildActionMapperCache>;

    beforeAll(() => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;
      cache = buildActionMapperCache(config.actionMapping);
    });

    it('should trim leading and trailing whitespace', () => {
      const match = matchAction('  Vaccine: Flu  ', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should normalize \\n line breaks to spaces', () => {
      const match = matchAction('Vaccine:\nInfluenza', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should normalize \\r\\n line breaks to spaces', () => {
      const match = matchAction('Vaccine:\r\nInfluenza', cache);
      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Vaccination');
    });

    it('should return null for empty/whitespace-only action text', () => {
      const match1 = matchAction('', cache);
      expect(match1).toBeNull();

      const match2 = matchAction('   ', cache);
      expect(match2).toBeNull();
    });
  });

  describe('Excel serial number in Measure Details', () => {
    it('should NOT convert pure numeric values to dates in Measure Details', () => {
      const result = parseMeasureDetails('45678');

      // Should be stored as tracking1, not converted to a date
      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('45678');
    });

    it('should parse pure integer values as tracking1 (not converted to date)', () => {
      // Pure integers are explicitly rejected by tryParseAsDate
      const result = parseMeasureDetails('120');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('120');
    });

    it('should handle semicolon format with numeric reading', () => {
      const result = parseMeasureDetails('01/15/2026; 7.2');

      expect(result.statusDate).toBe('2026-01-15');
      expect(result.tracking1).toBe('7.2');
    });

    it('should handle semicolon format with reading and unit', () => {
      const result = parseMeasureDetails('01/15/2026; 7.2; %');

      expect(result.statusDate).toBe('2026-01-15');
      expect(result.tracking1).toBe('7.2; %');
    });
  });

  describe('re-import same file (all SKIP)', () => {
    it('should produce all SKIP when re-importing identical data', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '5551234', '', '', '', '', 'AWV', '', ''],
        ['Doe, Jane', '03/20/1985', '5559876', '', '', '', 'HCC: Z99.1', 'HCC', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // Build existing records matching the imported data exactly
      const existingByKey = new Map<string, ExistingRecord>();
      for (const row of transformResult.rows) {
        const key = `${row.memberName}|${row.memberDob}|${row.requestType}|${row.qualityMeasure}`;
        existingByKey.set(key, {
          patientId: 1,
          measureId: 100,
          memberName: row.memberName,
          memberDob: row.memberDob || '',
          memberTelephone: row.memberTelephone,
          memberAddress: row.memberAddress,
          requestType: row.requestType,
          qualityMeasure: row.qualityMeasure,
          measureStatus: row.measureStatus,
          ownerId: null,
          ownerName: null,
        });
      }

      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, existingByKey, summary);

      // All should be SKIP (same data)
      expect(changes.every(c => c.action === 'SKIP')).toBe(true);
      expect(summary.inserts).toBe(0);
      expect(summary.updates).toBe(0);
    });
  });

  describe('action mapping pattern coverage', () => {
    let cache: ReturnType<typeof buildActionMapperCache>;

    beforeAll(() => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;
      cache = buildActionMapperCache(config.actionMapping);
    });

    it('should match FOBT pattern with any year', () => {
      const match2025 = matchAction('FOBT in 2025 or colonoscopy', cache);
      const match2026 = matchAction('FOBT in 2026 or colonoscopy', cache);

      expect(match2025?.qualityMeasure).toBe('Colon Cancer Screening');
      expect(match2026?.qualityMeasure).toBe('Colon Cancer Screening');
    });

    it('should match HTN BP pattern with any year', () => {
      const match = matchAction('HTN - Most recent 2026 BP less than 140/90', cache);
      expect(match?.qualityMeasure).toBe('Hypertension Management');
    });

    it('should match DM urine pattern', () => {
      const match = matchAction('DM - Urine albumin/creatine ratio', cache);
      expect(match?.qualityMeasure).toBe('Diabetic Nephropathy');
    });

    it('should match DM HbA1c pattern with any year', () => {
      const match = matchAction('DM - Most recent 2026 HbA1c is above 8.0', cache);
      expect(match?.qualityMeasure).toBe('Diabetes Control');
      expect(match?.measureStatus).toBe('HgbA1c NOT at goal');
    });

    it('should match DM Eye exam pattern with any year', () => {
      const match = matchAction('DM - Eye exam in 2026', cache);
      expect(match?.qualityMeasure).toBe('Diabetic Eye Exam');
    });

    it('should match Pap pattern', () => {
      const match = matchAction('Pap in 2023 - 2026 -OR- Pap & HPV in 2023 - 2026', cache);
      expect(match?.qualityMeasure).toBe('Cervical Cancer Screening');
    });

    it('should match Chlamydia pattern with any year', () => {
      const match = matchAction('Chlamydia test in 2026', cache);
      expect(match?.qualityMeasure).toBe('GC/Chlamydia Screening');
    });

    it('should match RAS Antagonists pattern', () => {
      const match = matchAction('Need dispensing events for RAS Antagonists', cache);
      expect(match?.qualityMeasure).toBe('ACE/ARB in DM or CAD');
    });

    it('should not match unknown action text', () => {
      const match = matchAction('Some completely unrelated action', cache);
      expect(match).toBeNull();
    });
  });

  describe('special characters in data', () => {
    it('should handle patient names with commas', () => {
      const tabData = createSutterTabData([
        ['Smith, John Jr.', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].memberName).toBe('Smith, John Jr.');
    });

    it('should handle patient names with special characters', () => {
      const tabData = createSutterTabData([
        ["O'Brien, Mary", '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].memberName).toBe("O'Brien, Mary");
    });
  });
});
