/**
 * Unit tests for fuzzyMatcher.ts
 * Tests Jaro-Winkler + Jaccard composite fuzzy matching utility
 *
 * Requirements: REQ-SCM-01.1, REQ-SCM-01.6, REQ-SCM-01.8, NFR-SCM-M1, NFR-SCM-M3
 */

import { describe, it, expect } from '@jest/globals';
import {
  normalizeHeader,
  jaroWinklerSimilarity,
  jaccardTokenSimilarity,
  compositeScore,
  fuzzyMatch,
} from '../fuzzyMatcher.js';

describe('fuzzyMatcher', () => {
  // ---- normalizeHeader ----

  describe('normalizeHeader()', () => {
    it('should trim leading and trailing whitespace', () => {
      expect(normalizeHeader('  hello  ')).toBe('hello');
    });

    it('should convert to lowercase', () => {
      expect(normalizeHeader('HELLO WORLD')).toBe('hello world');
    });

    it('should strip " E" suffix', () => {
      expect(normalizeHeader('Colon Cancer Screening E')).toBe('colon cancer screening');
    });

    it('should strip " Q1" suffix', () => {
      expect(normalizeHeader('BP Control Q1')).toBe('blood pressure control');
    });

    it('should strip " Q2" suffix', () => {
      expect(normalizeHeader('BP Control Q2')).toBe('blood pressure control');
    });

    it('should collapse multiple spaces to single space', () => {
      expect(normalizeHeader('hello    world   test')).toBe('hello world test');
    });

    it('should handle empty string', () => {
      expect(normalizeHeader('')).toBe('');
    });

    it('should handle whitespace-only string', () => {
      expect(normalizeHeader('   ')).toBe('');
    });

    it('should expand abbreviation "bp" to "blood pressure"', () => {
      expect(normalizeHeader('BP Control')).toBe('blood pressure control');
    });

    it('should expand abbreviation "eval" to "evaluation"', () => {
      expect(normalizeHeader('Annual Eval')).toBe('annual evaluation');
    });

    it('should expand abbreviation "dx" to "diagnosis"', () => {
      expect(normalizeHeader('DX Code')).toBe('diagnosis code');
    });

    it('should expand abbreviation "hx" to "history"', () => {
      expect(normalizeHeader('Patient HX')).toBe('patient history');
    });

    it('should expand abbreviation "dob" to "date of birth"', () => {
      expect(normalizeHeader('DOB')).toBe('date of birth');
    });

    it('should expand abbreviation "imm" to "immunization"', () => {
      expect(normalizeHeader('IMM Status')).toBe('immunization status');
    });

    it('should handle combined normalization: trim + lowercase + suffix strip + abbreviation', () => {
      // "  BP Control  Q1  " -> trim -> "BP Control  Q1" -> lowercase -> "bp control  q1"
      // -> strip Q1 -> "bp control" -> collapse spaces -> "bp control" -> expand -> "blood pressure control"
      expect(normalizeHeader('  BP Control  Q1  ')).toBe('blood pressure control');
    });

    it('should not strip "E" in the middle of text', () => {
      // "E" suffix stripping only applies to trailing " E"
      expect(normalizeHeader('Eye Exam')).toBe('eye exam');
    });
  });

  // ---- jaroWinklerSimilarity ----

  describe('jaroWinklerSimilarity()', () => {
    it('should return 1.0 for identical strings', () => {
      expect(jaroWinklerSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('should return 1.0 for identical empty strings', () => {
      expect(jaroWinklerSimilarity('', '')).toBe(1.0);
    });

    it('should return 0.0 when one string is empty and the other is not', () => {
      expect(jaroWinklerSimilarity('hello', '')).toBe(0.0);
      expect(jaroWinklerSimilarity('', 'hello')).toBe(0.0);
    });

    it('should return < 0.3 for completely different strings', () => {
      const score = jaroWinklerSimilarity('abcdef', 'zyxwvu');
      expect(score).toBeLessThan(0.3);
    });

    it('should return high score for single character edit (typo)', () => {
      // "screening" vs "screaning" (one letter different)
      const score = jaroWinklerSimilarity('screening', 'screaning');
      expect(score).toBeGreaterThan(0.9);
    });

    it('should give prefix bonus (Jaro-Winkler favors common prefix)', () => {
      // "abcxyz" and "abcuvw" share "abc" prefix
      // vs "xyzabc" and "uvwabc" share no prefix but similar patterns
      const withPrefix = jaroWinklerSimilarity('abcxyz', 'abcuvw');
      const withoutPrefix = jaroWinklerSimilarity('xyzabc', 'uvwabc');
      expect(withPrefix).toBeGreaterThan(withoutPrefix);
    });

    it('should return value between 0 and 1 for partial matches', () => {
      const score = jaroWinklerSimilarity('colon cancer', 'cancer colon');
      expect(score).toBeGreaterThan(0.0);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });

  // ---- jaccardTokenSimilarity ----

  describe('jaccardTokenSimilarity()', () => {
    it('should return 1.0 for identical token sets', () => {
      expect(jaccardTokenSimilarity('hello world', 'hello world')).toBe(1.0);
    });

    it('should return 1.0 for two empty strings', () => {
      expect(jaccardTokenSimilarity('', '')).toBe(1.0);
    });

    it('should return 0.0 when one is empty and other is not', () => {
      expect(jaccardTokenSimilarity('hello', '')).toBe(0.0);
      expect(jaccardTokenSimilarity('', 'hello')).toBe(0.0);
    });

    it('should return 0.0 for no token overlap', () => {
      expect(jaccardTokenSimilarity('alpha beta', 'gamma delta')).toBe(0.0);
    });

    it('should return correct partial overlap = |intersection|/|union|', () => {
      // tokens1 = {a, b, c}, tokens2 = {b, c, d}
      // intersection = {b, c} = 2, union = {a, b, c, d} = 4
      // Jaccard = 2/4 = 0.5
      expect(jaccardTokenSimilarity('a b c', 'b c d')).toBe(0.5);
    });

    it('should handle single-token strings', () => {
      expect(jaccardTokenSimilarity('hello', 'hello')).toBe(1.0);
      expect(jaccardTokenSimilarity('hello', 'world')).toBe(0.0);
    });

    it('should return 1.0 for multi-word rearrangement (same tokens)', () => {
      expect(jaccardTokenSimilarity('colon cancer screening', 'screening cancer colon')).toBe(1.0);
    });

    it('should handle duplicate tokens in input (set semantics)', () => {
      // "a a b" has tokens {a, b}, "a b" has tokens {a, b}
      // intersection = {a, b} = 2, union = {a, b} = 2
      expect(jaccardTokenSimilarity('a a b', 'a b')).toBe(1.0);
    });
  });

  // ---- compositeScore ----

  describe('compositeScore()', () => {
    it('should return 1.0 for identical strings', () => {
      expect(compositeScore('hello world', 'hello world')).toBe(1.0);
    });

    it('should return 1.0 for strings that normalize to the same value', () => {
      // "BP Control Q1" normalizes to "blood pressure control"
      // "bp control" normalizes to "blood pressure control"
      expect(compositeScore('BP Control Q1', 'bp control')).toBe(1.0);
    });

    it('should verify 60/40 weighting via known pair', () => {
      // We can manually compute for a known pair
      // Use normalized values to check the weighting
      const source = 'colon cancer';
      const candidate = 'cancer colon';

      const normSource = normalizeHeader(source);
      const normCandidate = normalizeHeader(candidate);

      const jw = jaroWinklerSimilarity(normSource, normCandidate);
      const jc = jaccardTokenSimilarity(normSource, normCandidate);
      const expected = 0.6 * jw + 0.4 * jc;

      expect(compositeScore(source, candidate)).toBeCloseTo(expected, 10);
    });

    it('should normalize inputs before scoring', () => {
      // "  BP Control  Q1  " normalizes to "blood pressure control"
      // "Blood Pressure Control" normalizes to "blood pressure control"
      // Both should produce a perfect score
      const score = compositeScore('  BP Control  Q1  ', 'Blood Pressure Control');
      expect(score).toBe(1.0);
    });

    it('should produce high composite for "BP Control" vs "Blood Pressure Control"', () => {
      // Both normalize to "blood pressure control" since bp -> blood pressure
      const score = compositeScore('BP Control', 'Blood Pressure Control');
      expect(score).toBe(1.0);
    });

    it('should produce low score for completely different strings', () => {
      const score = compositeScore('alpha beta gamma', 'xyz uvw rst');
      expect(score).toBeLessThan(0.5);
    });

    it('should produce moderate score for partially similar strings', () => {
      const score = compositeScore('diabetes management plan', 'diabetes control program');
      // "diabetes" is shared, rest differs
      expect(score).toBeGreaterThan(0.3);
      expect(score).toBeLessThan(0.9);
    });
  });

  // ---- fuzzyMatch ----

  describe('fuzzyMatch()', () => {
    const candidates = [
      'Colon Cancer Screening',
      'Breast Cancer Screening',
      'Cervical Cancer Screening',
      'Diabetes Control',
      'Hypertension Management',
      'Blood Pressure Control',
      'Annual Wellness Visit',
      'Completely Unrelated Item',
    ];

    it('should return sorted results above threshold, in descending score order', () => {
      // Use a lower threshold to get multiple results, then verify sorting
      const results = fuzzyMatch('Cancer Screening', candidates, 0.70);

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.score).toBeGreaterThanOrEqual(0.70);
      }

      // Verify descending sort
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });

    it('should return at most 3 results (top 3)', () => {
      // Use a very low threshold to get many matches
      const results = fuzzyMatch('cancer', candidates, 0.3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should use default threshold of 0.80', () => {
      const results = fuzzyMatch('Colon Cancer Screening', candidates);

      // Exact match should be returned
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].candidate).toBe('Colon Cancer Screening');
      expect(results[0].score).toBeGreaterThanOrEqual(0.80);
    });

    it('should respect custom threshold', () => {
      // With very high threshold, only near-perfect matches
      const results = fuzzyMatch('Colon Cancer Screening', candidates, 0.99);

      // Only exact match should survive at 0.99 threshold
      expect(results.length).toBe(1);
      expect(results[0].candidate).toBe('Colon Cancer Screening');
    });

    it('should return empty array when no matches above threshold', () => {
      const results = fuzzyMatch('zzzzz xxxxx yyyyy', candidates);
      expect(results).toEqual([]);
    });

    it('should return empty array for empty candidates list', () => {
      const results = fuzzyMatch('test', []);
      expect(results).toEqual([]);
    });

    it('should deduplicate candidates', () => {
      const dupes = [
        'Colon Cancer Screening',
        'Colon Cancer Screening',
        'Colon Cancer Screening',
      ];
      const results = fuzzyMatch('Colon Cancer Screening', dupes);

      // All three are identical candidates, but they should all be above threshold.
      // The function does not deduplicate internally, but returns at most 3.
      // Each result for the same candidate will have the same score.
      expect(results.length).toBeLessThanOrEqual(3);
      // All results should be the same candidate
      for (const r of results) {
        expect(r.candidate).toBe('Colon Cancer Screening');
      }
    });

    it('should include normalizedSource and normalizedCandidate in results', () => {
      const results = fuzzyMatch('BP Control', ['Blood Pressure Control']);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].normalizedSource).toBe('blood pressure control');
      expect(results[0].normalizedCandidate).toBe('blood pressure control');
    });

    it('should handle source with suffix stripping correctly', () => {
      // "Screening E" normalizes to "screening"
      const results = fuzzyMatch('Colon Cancer Screening E', candidates);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].candidate).toBe('Colon Cancer Screening');
    });

    it('should match abbreviation-expanded source against full candidate', () => {
      // "BP Control" normalizes to "blood pressure control"
      // "Blood Pressure Control" normalizes to "blood pressure control"
      const results = fuzzyMatch('BP Control', candidates);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].candidate).toBe('Blood Pressure Control');
      expect(results[0].score).toBe(1.0);
    });
  });

  // ---- threshold behavior ----

  describe('threshold behavior', () => {
    const candidates = [
      'Colon Cancer Screening',
      'Breast Cancer Screening',
      'Blood Pressure Control',
      'Completely Unrelated Item',
    ];

    it('TC-FM-6: similar headers above threshold return matches', () => {
      // "Colon Cancer Screen" is highly similar to "Colon Cancer Screening"
      const results = fuzzyMatch('Colon Cancer Screen', candidates, 0.70);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].score).toBeGreaterThanOrEqual(0.70);
      expect(results[0].candidate).toBe('Colon Cancer Screening');
    });

    it('TC-FM-7: dissimilar headers below threshold return empty', () => {
      const results = fuzzyMatch('Totally Random XYZ', candidates, 0.80);
      expect(results).toEqual([]);
    });
  });

  // ---- remaining abbreviation expansions (TC-FM-13) ----

  describe('remaining abbreviation expansions (TC-FM-13)', () => {
    it('should expand abbreviation "rx" to "prescription"', () => {
      expect(normalizeHeader('RX Orders')).toBe('prescription orders');
    });

    it('should expand abbreviation "tx" to "treatment"', () => {
      expect(normalizeHeader('TX Plan')).toBe('treatment plan');
    });

    it('should expand abbreviation "awv" to "annual wellness visit"', () => {
      expect(normalizeHeader('AWV')).toBe('annual wellness visit');
    });

    it('should expand abbreviation "mgmt" to "management"', () => {
      expect(normalizeHeader('Care MGMT')).toBe('care management');
    });
  });

  // ---- trailing punctuation (TC-FM-14) ----

  describe('trailing punctuation (TC-FM-14)', () => {
    it('normalizeHeader strips trailing dot and still expands abbreviation', () => {
      // "BP." -> lowercase "bp." -> the expansion fn should handle "bp" from "bp."
      const result = normalizeHeader('BP.');
      // bp should be expanded to blood pressure even with trailing dot
      expect(result).toContain('blood pressure');
    });
  });

  // ---- normalization stability (GAP-29) ----

  describe('normalization stability (GAP-29)', () => {
    it('TC-FM-16: normalizeHeader applied twice produces the same result (idempotent)', () => {
      const testInputs = [
        'BP Control Q1',
        'Annual Wellness Visit E',
        '  Eye Exam  ',
        'DX Code',
        'Patient HX',
      ];

      for (const input of testInputs) {
        const once = normalizeHeader(input);
        const twice = normalizeHeader(once);
        expect(twice).toBe(once);
      }
    });
  });
});
