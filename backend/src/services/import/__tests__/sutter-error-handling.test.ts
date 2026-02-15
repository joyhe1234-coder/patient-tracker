/**
 * Error scenario tests for Sutter import
 * Tests malformed data, corrupted files, format mismatches, and edge cases
 *
 * Task 48: Validates error handling across the Sutter import pipeline
 */

import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { parseExcel, getSheetNames } from '../fileParser.js';
import { mapColumns } from '../columnMapper.js';
import { transformData } from '../dataTransformer.js';
import { validateRows } from '../validator.js';
import { buildActionMapperCache, matchAction } from '../actionMapper.js';
import { loadSystemConfig, type SutterSystemConfig, type ActionMappingEntry } from '../configLoader.js';

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
 * Create standard Sutter tab data with 3 info rows + header row + data rows.
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

describe('Sutter Error Handling', () => {
  describe('malformed action mapping regex', () => {
    it('should skip malformed regex patterns without crashing', () => {
      const actionMapping: ActionMappingEntry[] = [
        {
          pattern: '[invalid regex',  // malformed - unmatched bracket
          requestType: 'Quality',
          qualityMeasure: 'Test',
          measureStatus: 'Not Addressed',
        },
        {
          pattern: '^Valid pattern',
          requestType: 'Quality',
          qualityMeasure: 'Valid Measure',
          measureStatus: 'Not Addressed',
        },
      ];

      // Should not throw - malformed patterns are skipped
      const cache = buildActionMapperCache(actionMapping);

      // Only the valid pattern should be compiled
      expect(cache.compiledPatterns).toHaveLength(1);
      expect(cache.compiledPatterns[0].qualityMeasure).toBe('Valid Measure');
    });

    it('should still match valid patterns when some are malformed', () => {
      const actionMapping: ActionMappingEntry[] = [
        {
          pattern: '(unclosed group',
          requestType: 'Quality',
          qualityMeasure: 'Bad',
          measureStatus: 'Not Addressed',
        },
        {
          pattern: '^Mammogram',
          requestType: 'Screening',
          qualityMeasure: 'Breast Cancer Screening',
          measureStatus: 'Not Addressed',
        },
      ];

      const cache = buildActionMapperCache(actionMapping);
      const match = matchAction('Mammogram in 2026', cache);

      expect(match).not.toBeNull();
      expect(match?.qualityMeasure).toBe('Breast Cancer Screening');
    });
  });

  describe('corrupted Excel file', () => {
    it('should throw or produce empty result for non-Excel buffer', () => {
      const badBuffer = Buffer.from('This is not an Excel file at all and has no valid Excel structure');

      // XLSX library may either throw or produce an empty/unreadable workbook
      // depending on the content. We verify the pipeline handles it gracefully.
      try {
        const result = parseExcel(badBuffer, 'bad.xlsx');
        // If it doesn't throw, the result should have no useful data
        expect(result.rows.length).toBeLessThanOrEqual(1);
      } catch (error) {
        // If it throws, that's also acceptable behavior
        expect(error).toBeDefined();
      }
    });

    it('should throw error for truncated Excel file', () => {
      // Create a valid Excel buffer and truncate it
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['Name'], ['Test']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const validBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      // Truncate to 50% of the original size
      const truncated = validBuffer.subarray(0, Math.floor(validBuffer.length / 2));

      expect(() => parseExcel(truncated, 'truncated.xlsx')).toThrow();
    });
  });

  describe('header row not at expected index', () => {
    it('should throw error when headerRow is beyond the data range', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['Name'], ['Test']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseExcel(buffer, 'test.xlsx', { headerRow: 100 }))
        .toThrow('Header row index 100 is out of range');
    });

    it('should handle headerRow at negative index', () => {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['Name'], ['Test']]);
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;

      expect(() => parseExcel(buffer, 'test.xlsx', { headerRow: -1 }))
        .toThrow('Header row index -1 is out of range');
    });
  });

  describe('empty physician tab', () => {
    it('should return empty rows when tab has only headers', () => {
      const tabData = createSutterTabData([]); // No data rows
      const buffer = createWorkbook({ 'Dr Empty': tabData });

      const result = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Empty', headerRow: 3 });

      expect(result.rows).toHaveLength(0);
    });

    it('should produce zero transformed rows from empty tab', () => {
      const tabData = createSutterTabData([]);
      const buffer = createWorkbook({ 'Dr Empty': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Empty', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(0);
    });
  });

  describe('format mismatch', () => {
    it('should handle Hill file processed with Sutter system (missing Sutter columns)', () => {
      // Hill format has Patient, DOB columns - not Sutter format columns
      const hillData = [
        ['Patient', 'DOB', 'Phone', 'Address', 'Annual Wellness Visit Q1'],
        ['John Smith', '01/15/1990', '5551234567', '123 Main St', 'AWV completed'],
      ];
      const buffer = createWorkbook({ 'Sheet1': hillData });

      // Parse without headerRow option (auto-detect for Hill format)
      const parseResult = parseExcel(buffer, 'test.xlsx');

      // Column mapping should show missing required columns for Sutter
      const mapping = mapColumns(parseResult.headers, 'sutter');

      // Sutter requires "Member Name" and "Member DOB" - Hill has "Patient" and "DOB"
      expect(mapping.missingRequired.length).toBeGreaterThan(0);
    });

    it('should handle Sutter file processed with Hill system (missing Hill measure columns)', () => {
      const sutterData = [
        ['Member Name', 'Member DOB', 'Request Type', 'Possible Actions Needed'],
        ['Smith, John', '01/15/1990', 'AWV', ''],
      ];
      const buffer = createWorkbook({ 'Sheet1': sutterData });

      const parseResult = parseExcel(buffer, 'test.xlsx');

      // Hill column mapping should find no measure columns
      const mapping = mapColumns(parseResult.headers, 'hill');

      // Hill expects columns like "Annual Wellness Visit Q1" - Sutter doesn't have those
      const measureMappings = mapping.mappedColumns.filter(m => m.columnType === 'measure');
      expect(measureMappings).toHaveLength(0);
    });
  });

  describe('missing required data in rows', () => {
    it('should skip rows with missing Request Type', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', 'Some action', '', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(0);
      expect(transformResult.errors.length).toBeGreaterThan(0);
    });

    it('should skip rows with unrecognized Request Type', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'Unknown', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(0);
      const rtError = transformResult.errors.find(e => e.column === 'Request Type');
      expect(rtError).toBeDefined();
      expect(rtError?.message).toContain('Unrecognized');
    });

    it('should skip Quality rows with empty action text', () => {
      const tabData = createSutterTabData([
        ['Smith, John', '01/15/1990', '', '', '', '', '', 'Quality', '', ''],
      ]);
      const buffer = createWorkbook({ 'Dr Test': tabData });

      const parseResult = parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr Test', headerRow: 3 });
      const transformResult = transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);

      expect(transformResult.rows).toHaveLength(0);
      const actionError = transformResult.errors.find(e => e.column === 'Possible Actions Needed');
      expect(actionError).toBeDefined();
    });
  });

  describe('invalid sheet name', () => {
    it('should throw descriptive error for non-existent sheet name', () => {
      const buffer = createWorkbook({
        'Dr Smith': [['Name'], ['Test']],
      });

      expect(() => parseExcel(buffer, 'test.xlsx', { sheetName: 'Dr NonExistent' }))
        .toThrow('Sheet "Dr NonExistent" not found in workbook');
    });

    it('should include available sheet names in error message', () => {
      const buffer = createWorkbook({
        'Tab1': [['Name'], ['Test']],
        'Tab2': [['Name'], ['Test']],
      });

      try {
        parseExcel(buffer, 'test.xlsx', { sheetName: 'BadTab' });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect((error as Error).message).toContain('Tab1');
        expect((error as Error).message).toContain('Tab2');
      }
    });
  });
});
