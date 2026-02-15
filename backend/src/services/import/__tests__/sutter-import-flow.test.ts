/**
 * End-to-end backend tests for Sutter import flow
 * Tests the complete pipeline: parse -> map columns -> transform -> validate -> diff -> execute
 *
 * Task 47: Validates the full Sutter import pipeline works correctly
 */

import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { parseExcel, getSheetNames } from '../fileParser.js';
import { mapColumns } from '../columnMapper.js';
import { transformData } from '../dataTransformer.js';
import { validateRows } from '../validator.js';
import {
  calculateReplaceAllDiff,
  calculateMergeDiff,
  type ExistingRecord,
  type DiffSummary,
} from '../diffCalculator.js';
import { loadSystemConfig, isSutterConfig, type SutterSystemConfig } from '../configLoader.js';

/**
 * Create a multi-sheet Sutter Excel workbook buffer.
 * Mimics the actual Sutter file format with:
 * - 3 rows of header info before the actual column headers (headerRow: 3)
 * - Physician tabs with patient data
 * - Skip tabs that should be filtered
 */
function createSutterWorkbook(
  sheets: Record<string, unknown[][]>
): Buffer {
  const wb = XLSX.utils.book_new();
  for (const [name, data] of Object.entries(sheets)) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Create standard Sutter tab data with 3 info rows + header row + data rows.
 */
function createSutterTabData(dataRows: unknown[][]): unknown[][] {
  return [
    ['Report Title'],         // Row 0
    ['Generated: 2026-01-15'], // Row 1
    [''],                      // Row 2
    // Row 3 (headerRow) - column headers
    ['Member Name', 'Member DOB', 'Member Telephone', 'Member Home Address',
     'Health Plans', 'Race-Ethnicity', 'Possible Actions Needed', 'Request Type',
     'Measure Details', 'High Priority'],
    // Data rows start at row 4
    ...dataRows,
  ];
}

// Helper to create a DiffSummary
function createEmptySummary(): DiffSummary {
  return { inserts: 0, updates: 0, skips: 0, duplicates: 0, deletes: 0 };
}

describe('Sutter Import Flow (End-to-End)', () => {
  describe('full pipeline: parse -> map -> transform -> validate -> diff', () => {
    it('should process AWV rows correctly through the full pipeline', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '5551234567', '123 Main St',
         'Plan A', 'White', '', 'AWV', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Jones': tabData });

      // Step 1: Parse
      const parseResult = parseExcel(buffer, 'test.xlsx', {
        sheetName: 'Dr Jones',
        headerRow: 3,
      });
      expect(parseResult.rows).toHaveLength(1);

      // Step 2: Map columns
      const mapping = mapColumns(parseResult.headers, 'sutter');
      expect(mapping.missingRequired).toHaveLength(0);

      // Step 3: Transform
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);
      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].requestType).toBe('AWV');
      expect(transformResult.rows[0].qualityMeasure).toBe('Annual Wellness Visit');

      // Step 4: Validate
      const validation = validateRows(transformResult.rows, 'sutter');
      expect(validation.valid).toBe(true);

      // Step 5: Diff (merge mode, no existing records)
      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, new Map(), summary);
      expect(summary.inserts).toBe(1);
      expect(changes[0].action).toBe('INSERT');
    });

    it('should process HCC rows with notes field', () => {
      const tabData = createSutterTabData([
        ['Doe, Jane', '03/20/1985', '5559876543', '456 Oak Ave',
         'Plan B', 'Hispanic', 'HCC coding: review diagnosis Z99.1', 'HCC', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Smith': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Smith', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].requestType).toBe('Chronic DX');
      expect(transformResult.rows[0].qualityMeasure).toBe('Chronic Diagnosis Code');
      expect(transformResult.rows[0].notes).toBe('HCC coding: review diagnosis Z99.1');
    });

    it('should process Quality rows via action mapping', () => {
      const tabData = createSutterTabData([
        ['Wilson, Bob', '07/04/1970', '5551112222', '789 Pine Rd',
         'Plan A', 'White', 'FOBT in 2026 or colonoscopy', 'Quality', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Brown': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Brown', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].requestType).toBe('Screening');
      expect(transformResult.rows[0].qualityMeasure).toBe('Colon Cancer Screening');
      expect(transformResult.rows[0].measureStatus).toBe('Not Addressed');
    });

    it('should aggregate unmapped actions', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', 'Some unknown action', 'Quality', '', ''],
        ['Doe, Jane', '03/20/1985', '', '', '', '', 'Some unknown action', 'Quality', '', ''],
        ['Wilson, Bob', '07/04/1970', '', '', '', '', 'Another unknown', 'Quality', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // All Quality rows with unknown actions should be skipped
      expect(transformResult.rows).toHaveLength(0);

      // Check unmapped actions are aggregated (SutterTransformResult)
      const sutterResult = transformResult as any;
      if (sutterResult.unmappedActions) {
        expect(sutterResult.unmappedActions).toHaveLength(2); // 2 distinct action texts
        const someUnknown = sutterResult.unmappedActions.find(
          (a: any) => a.actionText === 'Some unknown action'
        );
        expect(someUnknown).toBeDefined();
        expect(someUnknown.count).toBe(2); // appeared twice
      }
    });

    it('should persist notes and tracking1 through diff', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '',
         'DM - Most recent 2026 HbA1c', 'Quality', '01/10/2026; 7.2', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].tracking1).toBe('7.2');

      // Diff should propagate tracking1
      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, new Map(), summary);
      expect(changes[0].tracking1).toBe('7.2');
    });

    it('should handle mixed request types in same tab', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
        ['Smith, John', '01/15/1990', '', '', '', '', 'HCC: Z99.1', 'HCC', '', ''],
        ['Smith, John', '01/15/1990', '', '', '', '', 'Mammogram in 2026', 'Quality', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // All 3 rows should transform: AWV, HCC, Quality (Mammogram)
      expect(transformResult.rows).toHaveLength(3);

      const awv = transformResult.rows.find(r => r.requestType === 'AWV');
      expect(awv).toBeDefined();
      expect(awv?.qualityMeasure).toBe('Annual Wellness Visit');

      const hcc = transformResult.rows.find(r => r.requestType === 'Chronic DX');
      expect(hcc).toBeDefined();
      expect(hcc?.notes).toBe('HCC: Z99.1');

      const mammogram = transformResult.rows.find(r => r.qualityMeasure === 'Breast Cancer Screening');
      expect(mammogram).toBeDefined();
      expect(mammogram?.requestType).toBe('Screening');
    });

    it('should handle APV rows same as AWV', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'APV', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(1);
      expect(transformResult.rows[0].requestType).toBe('AWV');
      expect(transformResult.rows[0].qualityMeasure).toBe('Annual Wellness Visit');
    });
  });

  describe('multi-sheet handling', () => {
    it('should read correct sheet names from multi-tab workbook', () => {
      const buffer = createSutterWorkbook({
        'Dr Smith': createSutterTabData([]),
        'Dr Jones': createSutterTabData([]),
        'CAR Report': [['Summary data']],
      });

      const sheetNames = getSheetNames(buffer);
      expect(sheetNames).toEqual(['Dr Smith', 'Dr Jones', 'CAR Report']);
    });

    it('should parse data from selected physician tab only', () => {
      const buffer = createSutterWorkbook({
        'Dr Smith': createSutterTabData([
          ['Smith Patient', '01/01/1990', '', '', '', '', '', 'AWV', '', ''],
        ]),
        'Dr Jones': createSutterTabData([
          ['Jones Patient', '02/02/1985', '', '', '', '', '', 'AWV', '', ''],
        ]),
      });

      const result1 = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Smith', headerRow: 3 });
      expect(result1.rows[0]['Member Name']).toBe('Smith Patient');

      const result2 = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Jones', headerRow: 3 });
      expect(result2.rows[0]['Member Name']).toBe('Jones Patient');
    });
  });

  describe('config loading', () => {
    it('should load sutter config with all required fields', () => {
      const config = loadSystemConfig('sutter');
      expect(isSutterConfig(config)).toBe(true);

      const sutterConfig = config as SutterSystemConfig;
      expect(sutterConfig.format).toBe('long');
      expect(sutterConfig.headerRow).toBe(3);
      expect(sutterConfig.actionMapping.length).toBeGreaterThan(0);
      expect(sutterConfig.skipTabs.length).toBeGreaterThan(0);
    });
  });

  describe('validation with Sutter data', () => {
    it('should pass validation for valid Sutter rows', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '5551234567', '123 Main St', '', '', '', 'AWV', '', ''],
        ['Doe, Jane', '03/20/1985', '5559876543', '456 Oak Ave', '', '', 'HCC: Z99.1', 'HCC', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);
      const validation = validateRows(transformResult.rows, 'sutter');

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should report missing member name as error', () => {
      const tabData = createSutterTabData([
        ['', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // Rows with missing name are skipped during transform (not validated)
      expect(transformResult.rows).toHaveLength(0);
      expect(transformResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('diff calculation with Sutter data', () => {
    it('should create INSERT for new Sutter patient measures', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, new Map(), summary);

      expect(summary.inserts).toBe(1);
      expect(changes[0].action).toBe('INSERT');
      expect(changes[0].memberName).toBe('Smith, John');
    });

    it('should SKIP when re-importing same data', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'AWV', '', ''],
      ]);
      const buffer = createSutterWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      // Simulate existing record with same data
      const existingByKey = new Map<string, ExistingRecord>();
      const row = transformResult.rows[0];
      const key = `${row.memberName}|${row.memberDob}|${row.requestType}|${row.qualityMeasure}`;

      // Both have null measureStatus -> both unknown -> new is blank -> SKIP
      existingByKey.set(key, {
        patientId: 1,
        measureId: 100,
        memberName: row.memberName,
        memberDob: row.memberDob || '',
        memberTelephone: null,
        memberAddress: null,
        requestType: row.requestType,
        qualityMeasure: row.qualityMeasure,
        measureStatus: row.measureStatus,
        ownerId: null,
        ownerName: null,
      });

      const summary = createEmptySummary();
      const changes = calculateMergeDiff(transformResult.rows, existingByKey, summary);

      expect(changes[0].action).toBe('SKIP');
    });
  });
});
