/**
 * Unit tests for actionMapper.ts
 * Tests regex-based action mapping for Sutter import
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  buildActionMapperCache,
  matchAction,
  ActionMapperCache,
  ActionMatch,
} from '../actionMapper.js';
import type { ActionMappingEntry } from '../configLoader.js';

// Load the actual Sutter config action mappings for realistic test data
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sutterConfigPath = path.join(__dirname, '../../../config/import/sutter.json');
const sutterConfig = JSON.parse(fs.readFileSync(sutterConfigPath, 'utf-8'));
const realActionMapping: ActionMappingEntry[] = sutterConfig.actionMapping;

describe('actionMapper', () => {
  describe('buildActionMapperCache', () => {
    it('should compile all 10 action mapping patterns', () => {
      const cache = buildActionMapperCache(realActionMapping);

      expect(cache.compiledPatterns).toHaveLength(10);
    });

    it('should set case-insensitive flag on compiled patterns', () => {
      const cache = buildActionMapperCache(realActionMapping);

      for (const pattern of cache.compiledPatterns) {
        expect(pattern.regex.flags).toContain('i');
      }
    });

    it('should preserve requestType, qualityMeasure, measureStatus from entries', () => {
      const cache = buildActionMapperCache(realActionMapping);

      // First pattern is FOBT
      expect(cache.compiledPatterns[0].requestType).toBe('Screening');
      expect(cache.compiledPatterns[0].qualityMeasure).toBe('Colon Cancer Screening');
      expect(cache.compiledPatterns[0].measureStatus).toBe('Not Addressed');
    });

    it('should handle empty action mapping array', () => {
      const cache = buildActionMapperCache([]);

      expect(cache.compiledPatterns).toHaveLength(0);
    });

    it('should skip malformed regex patterns gracefully', () => {
      const mappings: ActionMappingEntry[] = [
        {
          pattern: '^Valid pattern',
          requestType: 'Quality',
          qualityMeasure: 'Test Measure',
          measureStatus: 'Not Addressed',
        },
        {
          pattern: '[invalid regex((',
          requestType: 'Quality',
          qualityMeasure: 'Bad Measure',
          measureStatus: 'Not Addressed',
        },
        {
          pattern: '^Another valid',
          requestType: 'Screening',
          qualityMeasure: 'Good Measure',
          measureStatus: 'Not Addressed',
        },
      ];

      const cache = buildActionMapperCache(mappings);

      // Should compile 2 valid patterns, skip 1 malformed
      expect(cache.compiledPatterns).toHaveLength(2);
      expect(cache.compiledPatterns[0].qualityMeasure).toBe('Test Measure');
      expect(cache.compiledPatterns[1].qualityMeasure).toBe('Good Measure');
    });

    it('should not crash when all patterns are malformed', () => {
      const mappings: ActionMappingEntry[] = [
        {
          pattern: '[bad((',
          requestType: 'Quality',
          qualityMeasure: 'Bad1',
          measureStatus: 'Not Addressed',
        },
        {
          pattern: '**invalid**',
          requestType: 'Quality',
          qualityMeasure: 'Bad2',
          measureStatus: 'Not Addressed',
        },
      ];

      const cache = buildActionMapperCache(mappings);

      expect(cache.compiledPatterns).toHaveLength(0);
    });
  });

  describe('matchAction', () => {
    let cache: ActionMapperCache;

    beforeAll(() => {
      cache = buildActionMapperCache(realActionMapping);
    });

    // Test all 10 regex patterns with matching action texts

    it('should match FOBT/colonoscopy pattern (pattern 0)', () => {
      const result = matchAction('FOBT in 2025 or colonoscopy in 2015-2025', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Screening');
      expect(result!.qualityMeasure).toBe('Colon Cancer Screening');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(0);
    });

    it('should match HTN BP pattern (pattern 1)', () => {
      const result = matchAction('HTN - Most recent 2025 BP less than 140/90', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('Hypertension Management');
      expect(result!.measureStatus).toBe('Not at goal');
      expect(result!.patternIndex).toBe(1);
    });

    it('should match DM urine albumin/creatine ratio pattern (pattern 2)', () => {
      const result = matchAction('DM - Urine albumin/creatine ratio test result in 2025', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('Diabetic Nephropathy');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(2);
    });

    it('should match DM HbA1c pattern (pattern 3)', () => {
      const result = matchAction('DM - Most recent 2025 HbA1c less than 9.0', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('Diabetes Control');
      expect(result!.measureStatus).toBe('HgbA1c NOT at goal');
      expect(result!.patternIndex).toBe(3);
    });

    it('should match DM eye exam pattern (pattern 4)', () => {
      const result = matchAction('DM - Eye exam in 2025 or 2024', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('Diabetic Eye Exam');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(4);
    });

    it('should match Pap/HPV pattern (pattern 5)', () => {
      const result = matchAction('Pap in 2022 - 2025 -OR- Pap & HPV co-test in 2020 - 2025', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Screening');
      expect(result!.qualityMeasure).toBe('Cervical Cancer Screening');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(5);
    });

    it('should match Mammogram pattern (pattern 6)', () => {
      const result = matchAction('Mammogram in 2024 or 2025', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Screening');
      expect(result!.qualityMeasure).toBe('Breast Cancer Screening');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(6);
    });

    it('should match Chlamydia pattern (pattern 7)', () => {
      const result = matchAction('Chlamydia test in 2025 for women 16-24', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('GC/Chlamydia Screening');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(7);
    });

    it('should match RAS Antagonists pattern (pattern 8)', () => {
      const result = matchAction('Need dispensing events for RAS Antagonists in 2025', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('ACE/ARB in DM or CAD');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(8);
    });

    it('should match Vaccine pattern (pattern 9)', () => {
      const result = matchAction('Vaccine: Flu 2025-2026', cache);

      expect(result).not.toBeNull();
      expect(result!.requestType).toBe('Quality');
      expect(result!.qualityMeasure).toBe('Vaccination');
      expect(result!.measureStatus).toBe('Not Addressed');
      expect(result!.patternIndex).toBe(9);
    });

    // Test unmapped text

    it('should return null for unmapped text', () => {
      const result = matchAction('Some unknown action text that does not match any pattern', cache);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = matchAction('', cache);

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only string', () => {
      const result = matchAction('   \t  ', cache);

      expect(result).toBeNull();
    });

    // Test case-insensitive matching

    it('should match case-insensitively (lowercase)', () => {
      const result = matchAction('fobt in 2025 or colonoscopy in 2015-2025', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Colon Cancer Screening');
    });

    it('should match case-insensitively (uppercase)', () => {
      const result = matchAction('VACCINE: FLU 2025-2026', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Vaccination');
    });

    it('should match case-insensitively (mixed case)', () => {
      const result = matchAction('Mammogram In 2025', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Breast Cancer Screening');
    });

    // Test whitespace and line break normalization

    it('should trim leading and trailing whitespace', () => {
      const result = matchAction('  Vaccine: Flu 2025-2026  ', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Vaccination');
    });

    it('should normalize \\n line breaks to spaces', () => {
      const result = matchAction('FOBT in 2025\nor colonoscopy in 2015-2025', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Colon Cancer Screening');
    });

    it('should normalize \\r\\n line breaks to spaces', () => {
      const result = matchAction('FOBT in 2025\r\nor colonoscopy in 2015-2025', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Colon Cancer Screening');
    });

    // Test year-agnostic matching

    it('should match with year 2024', () => {
      const result = matchAction('FOBT in 2024 or colonoscopy in 2014-2024', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Colon Cancer Screening');
    });

    it('should match with year 2026', () => {
      const result = matchAction('HTN - Most recent 2026 BP less than 140/90', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Hypertension Management');
    });

    it('should match with year 2030 (future-proof)', () => {
      const result = matchAction('DM - Most recent 2030 HbA1c less than 9.0', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Diabetes Control');
    });

    // Test first match wins

    it('should return first matching pattern when multiple could match', () => {
      // Build a cache where multiple patterns could match
      const testMappings: ActionMappingEntry[] = [
        {
          pattern: '^Test',
          requestType: 'First',
          qualityMeasure: 'First Measure',
          measureStatus: 'First Status',
        },
        {
          pattern: '^Test Action',
          requestType: 'Second',
          qualityMeasure: 'Second Measure',
          measureStatus: 'Second Status',
        },
      ];
      const testCache = buildActionMapperCache(testMappings);

      const result = matchAction('Test Action Text', testCache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('First Measure');
      expect(result!.patternIndex).toBe(0);
    });

    // Test vaccine variations

    it('should match various vaccine types (Flu)', () => {
      const result = matchAction('Vaccine: Flu 2025-2026', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Vaccination');
    });

    it('should match various vaccine types (Pneumococcal)', () => {
      const result = matchAction('Vaccine: Pneumococcal', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Vaccination');
    });

    it('should match various vaccine types (Tdap)', () => {
      const result = matchAction('Vaccine: Tdap for adults', cache);

      expect(result).not.toBeNull();
      expect(result!.qualityMeasure).toBe('Vaccination');
    });

    // Test with empty cache

    it('should return null when cache has no patterns', () => {
      const emptyCache = buildActionMapperCache([]);

      const result = matchAction('Some action text', emptyCache);

      expect(result).toBeNull();
    });

    // Test skip actions (these should NOT match any pattern)

    it('should not match skip action text', () => {
      const skipActions = sutterConfig.skipActions as string[];

      for (const skipAction of skipActions) {
        const result = matchAction(skipAction, cache);
        // Skip actions should return null (no regex match)
        expect(result).toBeNull();
      }
    });
  });
});
