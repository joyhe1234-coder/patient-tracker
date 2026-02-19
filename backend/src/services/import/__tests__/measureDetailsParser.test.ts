/**
 * Unit tests for measureDetailsParser.ts
 * Tests parsing of the "Measure Details" column from Sutter files
 */

import { describe, it, expect } from '@jest/globals';
import { parseMeasureDetails, MeasureDetailsResult } from '../measureDetailsParser.js';

describe('measureDetailsParser', () => {
  describe('empty/null/undefined input', () => {
    it('should return both null for null input', () => {
      const result = parseMeasureDetails(null);

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBeNull();
    });

    it('should return both null for undefined input', () => {
      const result = parseMeasureDetails(undefined);

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBeNull();
    });

    it('should return both null for empty string', () => {
      const result = parseMeasureDetails('');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBeNull();
    });

    it('should return both null for whitespace-only string', () => {
      const result = parseMeasureDetails('   ');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBeNull();
    });
  });

  describe('semicolon format: "date; reading"', () => {
    it('should parse date and reading from semicolon format', () => {
      const result = parseMeasureDetails('01/15/2025; 7.5');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('7.5');
    });

    it('should parse date and reading with extra whitespace', () => {
      const result = parseMeasureDetails('  01/15/2025 ;  7.5  ');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('7.5');
    });

    it('should handle 3+ parts: "date; reading; unit"', () => {
      const result = parseMeasureDetails('01/15/2025; 7.5; mg/dL');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('7.5; mg/dL');
    });

    it('should handle semicolon with invalid date part', () => {
      const result = parseMeasureDetails('abc; 7.5');

      // "abc" is not a valid date, so statusDate should be null
      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('7.5');
    });

    it('should handle semicolon with empty reading part', () => {
      const result = parseMeasureDetails('01/15/2025;');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBeNull();
    });

    it('should handle semicolon with date and text reading', () => {
      const result = parseMeasureDetails('03/20/2025; Positive');

      expect(result.statusDate).toBe('2025-03-20');
      expect(result.tracking1).toBe('Positive');
    });

    it('should parse M/D/YYYY date format in semicolon', () => {
      const result = parseMeasureDetails('1/5/2025; 8.2');

      expect(result.statusDate).toBe('2025-01-05');
      expect(result.tracking1).toBe('8.2');
    });
  });

  describe('comma-separated dates', () => {
    it('should pick the latest date from comma-separated dates', () => {
      const result = parseMeasureDetails('01/15/2025, 03/20/2025');

      expect(result.statusDate).toBe('2025-03-20');
      expect(result.tracking1).toBeNull();
    });

    it('should pick latest even when first date is later', () => {
      const result = parseMeasureDetails('06/10/2025, 01/05/2025');

      expect(result.statusDate).toBe('2025-06-10');
      expect(result.tracking1).toBeNull();
    });

    it('should handle three comma-separated dates', () => {
      const result = parseMeasureDetails('01/15/2025, 03/20/2025, 02/10/2025');

      expect(result.statusDate).toBe('2025-03-20');
      expect(result.tracking1).toBeNull();
    });

    it('should treat comma-separated non-dates as tracking1', () => {
      const result = parseMeasureDetails('abc, def');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('abc, def');
    });

    it('should extract date and non-date parts from mixed comma values', () => {
      // "12/16/2025, 158/85" -> date extracted, reading as tracking1
      const result = parseMeasureDetails('12/16/2025, 158/85');

      expect(result.statusDate).toBe('2025-12-16');
      expect(result.tracking1).toBe('158/85');
    });

    it('should extract date from mixed comma values with text', () => {
      const result = parseMeasureDetails('01/15/2025, not-a-date');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('not-a-date');
    });

    it('should pick latest date and collect non-date parts from mixed comma values', () => {
      const result = parseMeasureDetails('01/15/2025, 06/20/2025, 158/85');

      expect(result.statusDate).toBe('2025-06-20');
      expect(result.tracking1).toBe('158/85');
    });
  });

  describe('single numeric value', () => {
    it('should return pure integer as tracking1 (not converted to date)', () => {
      // Pure integers are rejected by tryParseAsDate's /^\d+$/ check
      const result = parseMeasureDetails('120');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('120');
    });

    it('should handle zero as tracking1', () => {
      const result = parseMeasureDetails('0');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('0');
    });

    it('should return large decimal as tracking1 when not parseable as date', () => {
      // "15.3" is not a valid date (month 15 doesn't exist)
      const result = parseMeasureDetails('15.3');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('15.3');
    });

    it('should treat small decimals as tracking1 (native Date parsing rejected)', () => {
      // "8.9" would be interpreted by native Date as August 9, but native format
      // is rejected in tryParseAsDate to avoid false positives for free text
      const result = parseMeasureDetails('8.9');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('8.9');
    });
  });

  describe('single date value', () => {
    it('should parse single date as statusDate (MM/DD/YYYY)', () => {
      const result = parseMeasureDetails('01/15/2025');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBeNull();
    });

    it('should parse single date as statusDate (M/D/YYYY)', () => {
      const result = parseMeasureDetails('1/5/2025');

      expect(result.statusDate).toBe('2025-01-05');
      expect(result.tracking1).toBeNull();
    });

    it('should parse YYYY-MM-DD format as statusDate', () => {
      const result = parseMeasureDetails('2025-01-15');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBeNull();
    });
  });

  describe('unrecognized text', () => {
    it('should return unrecognized text as tracking1', () => {
      const result = parseMeasureDetails('Pending review');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('Pending review');
    });

    it('should handle free-form text as tracking1', () => {
      const result = parseMeasureDetails('Not yet completed');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('Not yet completed');
    });
  });

  describe('blood pressure readings', () => {
    it('should return blood pressure as tracking1', () => {
      const result = parseMeasureDetails('142/72');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('142/72');
    });

    it('should return complex BP reading as tracking1', () => {
      const result = parseMeasureDetails('120/80');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('120/80');
    });
  });

  describe('Excel serial numbers', () => {
    it('should NOT convert Excel serial number to date', () => {
      // Excel serial 45523 = ~August 2024
      // In Measure Details, pure numbers should be tracking1, NOT dates
      const result = parseMeasureDetails('45523');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('45523');
    });

    it('should NOT convert 5-digit number to date', () => {
      const result = parseMeasureDetails('44927');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('44927');
    });
  });

  describe('embedded dates in free text (strategy 5)', () => {
    it('should extract date from prose text with reading', () => {
      const result = parseMeasureDetails('Last HgbA1c: 7.8 on 01/15/2025');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('Last HgbA1c: 7.8 on');
    });

    it('should pick the latest date when multiple dates in text', () => {
      const result = parseMeasureDetails('Screened 01/15/2025 and 06/20/2025 for follow-up');

      expect(result.statusDate).toBe('2025-06-20');
      expect(result.tracking1).toBe('Screened and for follow-up');
    });

    it('should return null for text with no dates (falls through to tracking1)', () => {
      const result = parseMeasureDetails('Pending review next quarter');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('Pending review next quarter');
    });

    it('should NOT mistake blood pressure "142/72" for a date', () => {
      const result = parseMeasureDetails('BP reading 142/72 today');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('BP reading 142/72 today');
    });

    it('should NOT mistake "120/80" for a date', () => {
      const result = parseMeasureDetails('120/80');

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('120/80');
    });

    it('should not affect existing semicolon format', () => {
      const result = parseMeasureDetails('01/15/2025; 7.5');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('7.5');
    });

    it('should not affect existing comma-separated dates', () => {
      const result = parseMeasureDetails('01/15/2025, 03/20/2025');

      expect(result.statusDate).toBe('2025-03-20');
      expect(result.tracking1).toBeNull();
    });

    it('should extract single embedded date and keep remaining text as tracking1', () => {
      const result = parseMeasureDetails('Completed colonoscopy 03/20/2025');

      expect(result.statusDate).toBe('2025-03-20');
      expect(result.tracking1).toBe('Completed colonoscopy');
    });

    it('should handle date at start of prose text', () => {
      const result = parseMeasureDetails('01/15/2025 result was 8.2%');

      expect(result.statusDate).toBe('2025-01-15');
      expect(result.tracking1).toBe('result was 8.2%');
    });
  });

  describe('edge cases', () => {
    it('should handle value with only semicolons', () => {
      const result = parseMeasureDetails(';;;');

      // All parts are empty after split
      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBeNull();
    });

    it('should handle value that stringifies from number type', () => {
      // parseMeasureDetails does String(value).trim()
      // "200" is a pure integer, so tryParseAsDate rejects it
      const result = parseMeasureDetails('200' as string);

      expect(result.statusDate).toBeNull();
      expect(result.tracking1).toBe('200');
    });
  });
});
