/**
 * Performance tests for Sutter import
 * Tests processing speed and resource usage for large datasets
 *
 * Task 50: Validates NFR-SI-1 (1,000 rows < 1 second) and NFR-SI-3 (regex cache reuse)
 */

import { describe, it, expect } from '@jest/globals';
import * as XLSX from 'xlsx';
import { parseExcel } from '../fileParser.js';
import { transformData } from '../dataTransformer.js';
import { buildActionMapperCache, matchAction } from '../actionMapper.js';
import { loadSystemConfig, type SutterSystemConfig } from '../configLoader.js';

/**
 * Create a Sutter workbook with a single sheet containing many rows.
 */
function createLargeSutterWorkbook(rowCount: number): Buffer {
  const wb = XLSX.utils.book_new();

  // Build data: 3 info rows + header row + N data rows
  const data: unknown[][] = [
    ['Report Title'],
    ['Generated: 2026-01-15'],
    [''],
    ['Member Name', 'Member DOB', 'Member Telephone', 'Member Home Address',
     'Health Plans', 'Race-Ethnicity', 'Possible Actions Needed', 'Request Type',
     'Measure Details', 'High Priority'],
  ];

  const requestTypes = ['AWV', 'HCC', 'Quality', 'Quality', 'Quality'];
  const actionTexts = [
    '',
    'HCC coding review',
    'FOBT in 2026 or colonoscopy',
    'Mammogram in 2026',
    'DM - Most recent 2026 HbA1c',
  ];

  for (let i = 0; i < rowCount; i++) {
    const typeIndex = i % requestTypes.length;
    data.push([
      `Patient ${i}, Test`,
      '01/15/1990',
      '5551234567',
      `${i} Main St`,
      'Plan A',
      'White',
      actionTexts[typeIndex],
      requestTypes[typeIndex],
      i % 3 === 0 ? '01/10/2026; 7.2' : '',
      '',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Dr Performance');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Sutter Performance', () => {
  describe('transform performance', () => {
    it('should transform 1,000 rows within 1 second', () => {
      const buffer = createLargeSutterWorkbook(1000);

      const parseResult = parseExcel(buffer, 'test.xlsx', {
        sheetName: 'Dr Performance',
        headerRow: 3,
      });

      expect(parseResult.rows).toHaveLength(1000);

      const startTime = Date.now();
      const transformResult = transformData(
        parseResult.headers,
        parseResult.rows,
        'sutter',
        parseResult.dataStartRow
      );
      const elapsed = Date.now() - startTime;

      // NFR-SI-1: 1,000 rows should transform within 1 second
      expect(elapsed).toBeLessThan(1000);

      // Should have produced transformed rows (some may be filtered out by unmapped actions)
      expect(transformResult.rows.length).toBeGreaterThan(0);
      expect(transformResult.stats.inputRows).toBe(1000);
    });

    it('should transform 500 rows within 500ms', () => {
      const buffer = createLargeSutterWorkbook(500);

      const parseResult = parseExcel(buffer, 'test.xlsx', {
        sheetName: 'Dr Performance',
        headerRow: 3,
      });

      const startTime = Date.now();
      transformData(parseResult.headers, parseResult.rows, 'sutter', parseResult.dataStartRow);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('action mapping regex cache performance', () => {
    it('should build cache once and reuse for all matches', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      // Build cache once
      const buildStart = Date.now();
      const cache = buildActionMapperCache(config.actionMapping);
      const buildTime = Date.now() - buildStart;

      // Cache should build quickly
      expect(buildTime).toBeLessThan(50);
      expect(cache.compiledPatterns.length).toBe(config.actionMapping.length);

      // Match 10,000 times using the same cache
      const actionTexts = [
        'FOBT in 2026 or colonoscopy',
        'Mammogram in 2026',
        'Vaccine: Influenza',
        'DM - Most recent 2026 HbA1c',
        'Unknown action text',
      ];

      const matchStart = Date.now();
      for (let i = 0; i < 10000; i++) {
        matchAction(actionTexts[i % actionTexts.length], cache);
      }
      const matchTime = Date.now() - matchStart;

      // 10,000 matches should complete well under 1 second
      expect(matchTime).toBeLessThan(1000);
    });

    it('should not rebuild regex patterns per row', () => {
      const config = loadSystemConfig('sutter') as SutterSystemConfig;

      // Build cache once
      const cache = buildActionMapperCache(config.actionMapping);

      // The cache object should contain pre-compiled RegExp objects
      for (const pattern of cache.compiledPatterns) {
        expect(pattern.regex).toBeInstanceOf(RegExp);
        expect(pattern.regex.flags).toContain('i');
      }

      // Matching should not modify the cache
      const initialLength = cache.compiledPatterns.length;
      matchAction('FOBT in 2026 or colonoscopy', cache);
      matchAction('Unknown text', cache);
      expect(cache.compiledPatterns.length).toBe(initialLength);
    });
  });

  describe('overall preview performance', () => {
    it('should complete full parse + transform for typical tab (200 rows) in under 2 seconds', () => {
      const buffer = createLargeSutterWorkbook(200);

      const startTime = Date.now();

      // Full pipeline: parse + transform
      const parseResult = parseExcel(buffer, 'test.xlsx', {
        sheetName: 'Dr Performance',
        headerRow: 3,
      });
      const transformResult = transformData(
        parseResult.headers,
        parseResult.rows,
        'sutter',
        parseResult.dataStartRow
      );

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(2000);
      expect(parseResult.rows).toHaveLength(200);
      expect(transformResult.rows.length).toBeGreaterThan(0);
    });
  });
});
