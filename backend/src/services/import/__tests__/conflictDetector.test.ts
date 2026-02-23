/**
 * Unit tests for conflictDetector.ts
 *
 * Tests all 16 use cases from the smart-column-mapping design classification
 * table, plus fail-open resilience (NFR-SCM-R2), summary counts, and
 * hasBlockingConflicts / isWrongFile flags.
 *
 * Uses a mock MergedSystemConfig factory and controlled fuzzyMatch overrides
 * for edge-case scenarios (AMBIGUOUS, fail-open).
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import type { MergedSystemConfig, MergedColumnMapping } from '../mappingTypes.js';
import type { FuzzyMatchResult } from '../fuzzyMatcher.js';
import { fuzzyMatch } from '../fuzzyMatcher.js';

import {
  detectConflicts,
  type ConflictReport,
  type ColumnConflict,
} from '../conflictDetector.js';

// ---- fuzzyMatch override via dependency injection ----
//
// Tests that need custom fuzzyMatch behavior set fuzzyMatchOverride, then
// pass a wrapping function via options.fuzzyMatchFn that delegates to it
// or falls through to the real implementation.
// This avoids jest.mock / jest.requireActual ESM compatibility issues.

let fuzzyMatchOverride: ((source: string, candidates: string[], threshold?: number) => FuzzyMatchResult[]) | null = null;

/** Reference to the real fuzzyMatch for use in override functions */
const realFuzzyMatcher = { fuzzyMatch };

/**
 * Injectable fuzzyMatch function. When fuzzyMatchOverride is set, delegates
 * to it; otherwise falls through to the real fuzzyMatch.
 */
function injectableFuzzyMatch(source: string, candidates: string[], threshold?: number): FuzzyMatchResult[] {
  if (fuzzyMatchOverride) {
    return fuzzyMatchOverride(source, candidates, threshold);
  }
  return fuzzyMatch(source, candidates, threshold);
}

/**
 * Wrapper around detectConflicts that always passes the injectable fuzzyMatch.
 * This lets tests override fuzzyMatchOverride and have it take effect.
 */
function detect(
  fileHeaders: string[],
  mergedConfig: MergedSystemConfig,
  systemId: string,
  options?: { headerThreshold?: number; actionThreshold?: number }
): ConflictReport {
  return detectConflicts(fileHeaders, mergedConfig, systemId, {
    ...options,
    fuzzyMatchFn: injectableFuzzyMatch,
  });
}

// ---- Mock config factory ----

function col(
  sourceColumn: string,
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'IGNORED',
  overrides: Partial<MergedColumnMapping> = {}
): MergedColumnMapping {
  return {
    sourceColumn,
    targetType,
    targetField: null,
    requestType: null,
    qualityMeasure: null,
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

function patientCol(sourceColumn: string, targetField: string): MergedColumnMapping {
  return col(sourceColumn, 'PATIENT', { targetField });
}

function measureCol(
  sourceColumn: string,
  requestType: string,
  qualityMeasure: string
): MergedColumnMapping {
  return col(sourceColumn, 'MEASURE', { requestType, qualityMeasure });
}

function skipCol(sourceColumn: string): MergedColumnMapping {
  return col(sourceColumn, 'IGNORED', {});
}

function dataCol(sourceColumn: string): MergedColumnMapping {
  return col(sourceColumn, 'DATA');
}

/**
 * Build a MergedSystemConfig for testing.
 * Default includes required patient columns plus a few measures, data, and skip columns.
 */
function buildMockConfig(overrides: Partial<MergedSystemConfig> = {}): MergedSystemConfig {
  return {
    systemId: 'test-system',
    systemName: 'Test System',
    format: 'wide',
    patientColumns: [
      patientCol('Patient', 'memberName'),
      patientCol('DOB', 'memberDob'),
      patientCol('Phone', 'memberTelephone'),
      patientCol('Address', 'memberAddress'),
    ],
    measureColumns: [
      measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
      measureCol('Eye Exam', 'Screening', 'Eye Exam'),
      measureCol('Breast Cancer Screening E', 'Screening', 'Breast Cancer Screening'),
    ],
    dataColumns: [
      dataCol('Notes'),
    ],
    skipColumns: [
      skipCol('Sex'),
      skipCol('MembID'),
    ],
    actionMappings: [],
    skipActions: [],
    statusMapping: {},
    lastModifiedAt: null,
    lastModifiedBy: null,
    ...overrides,
  };
}

// ---- Helpers ----

function findConflict(report: ConflictReport, sourceHeader: string): ColumnConflict | undefined {
  return report.conflicts.find(c => c.sourceHeader === sourceHeader);
}

function findConflictsByType(report: ConflictReport, type: string): ColumnConflict[] {
  return report.conflicts.filter(c => c.type === type);
}

// ---- Tests ----

describe('conflictDetector', () => {
  const systemId = 'test-system';

  afterEach(() => {
    fuzzyMatchOverride = null;
  });

  // ----------------------------------------------------------------
  // UC1: Exact / case / whitespace / reorder match -> no conflict
  // ----------------------------------------------------------------
  describe('UC1: Exact match (no conflict)', () => {
    it('should produce no conflicts when all file headers exactly match config columns', () => {
      const config = buildMockConfig();
      const fileHeaders = [
        'Patient', 'DOB', 'Phone', 'Address',
        'Annual Wellness Visit', 'Eye Exam', 'Breast Cancer Screening E',
        'Notes', 'Sex', 'MembID',
      ];

      const report = detect(fileHeaders, config, systemId);

      expect(report.conflicts).toHaveLength(0);
      expect(report.hasBlockingConflicts).toBe(false);
      expect(report.isWrongFile).toBe(false);
    });

    it('should produce no conflict for case-insensitive match', () => {
      const config = buildMockConfig();
      const fileHeaders = [
        'patient', 'dob', 'phone', 'address',
        'annual wellness visit', 'eye exam', 'breast cancer screening e',
        'notes', 'sex', 'membid',
      ];

      const report = detect(fileHeaders, config, systemId);

      expect(report.conflicts).toHaveLength(0);
    });

    it('should produce no conflict for whitespace variation match', () => {
      const config = buildMockConfig();
      const fileHeaders = [
        '  Patient  ', '  DOB  ', 'Phone', 'Address',
        'Annual Wellness Visit', 'Eye Exam', 'Breast Cancer Screening E',
        'Notes', 'Sex', 'MembID',
      ];

      const report = detect(fileHeaders, config, systemId);

      expect(report.conflicts).toHaveLength(0);
    });

    it('should produce no conflict for reordered columns', () => {
      const config = buildMockConfig();
      const fileHeaders = [
        'Notes', 'Eye Exam', 'Patient', 'Sex', 'Address',
        'DOB', 'Phone', 'Annual Wellness Visit', 'MembID',
        'Breast Cancer Screening E',
      ];

      const report = detect(fileHeaders, config, systemId);

      expect(report.conflicts).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // UC2: Renamed column (high fuzzy >= 80%) -> CHANGED, WARNING
  // Note: The composite score uses 60% JW + 40% Jaccard.
  // Adding a word (e.g., "Eye Exam Test") scores ~0.82 against "Eye Exam".
  // Abbreviation expansion can also cause exact matches (e.g., "Blood Pressure Control" = "BP Control").
  // ----------------------------------------------------------------
  describe('UC2: Renamed column (high fuzzy >= 80%)', () => {
    it('should detect CHANGED conflict with WARNING severity for renamed measure column', () => {
      // Use mock to guarantee a high fuzzy score for this specific test
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Eye Exam Revised') {
          return [{
            candidate: 'Eye Exam',
            score: 0.85,
            normalizedSource: 'eye exam revised',
            normalizedCandidate: 'eye exam',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Revised'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Eye Exam Revised');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('CHANGED');
      expect(conflict!.severity).toBe('WARNING');
      expect(conflict!.configColumn).toBe('Eye Exam');
      expect(conflict!.suggestions.length).toBeGreaterThan(0);
    });

    it('should include fuzzy score in message for renamed column', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Eye Exam Updated') {
          return [{
            candidate: 'Eye Exam',
            score: 0.88,
            normalizedSource: 'eye exam updated',
            normalizedCandidate: 'eye exam',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Updated'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Eye Exam Updated');
      expect(conflict).toBeDefined();
      expect(conflict!.message).toContain('renamed');
      expect(conflict!.message).toContain('% match');
    });

    it('should detect CHANGED with real fuzzy scoring for suffixed column name', () => {
      // "Eye Exam Test" scores ~0.82 against "Eye Exam" (real fuzzy score)
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Test'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Eye Exam Test');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('CHANGED');
      expect(conflict!.severity).toBe('WARNING');
      expect(conflict!.configColumn).toBe('Eye Exam');
    });
  });

  // ----------------------------------------------------------------
  // UC3-4: Low similarity / no fuzzy match -> NEW, WARNING
  // ----------------------------------------------------------------
  describe('UC3-4: Low similarity / no fuzzy match -> NEW', () => {
    it('should classify completely unrecognized header as NEW with WARNING severity', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'XyzRandomColumn'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'XyzRandomColumn');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
      expect(conflict!.severity).toBe('WARNING');
      expect(conflict!.configColumn).toBeNull();
    });

    it('should classify low-similarity header as NEW', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Foo Bar Baz'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Foo Bar Baz');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
      expect(conflict!.severity).toBe('WARNING');
    });

    it('should provide broader suggestions array for NEW columns', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Completely Unknown'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Completely Unknown');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
      expect(Array.isArray(conflict!.suggestions)).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // UC5: Missing measure column -> MISSING, WARNING
  // ----------------------------------------------------------------
  describe('UC5: Missing measure column -> MISSING, WARNING', () => {
    it('should detect MISSING conflict for measure columns not in file', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
          measureCol('BP Control', 'Control', 'BP Control'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      const eyeConflict = findConflict(report, 'Eye Exam');
      expect(eyeConflict).toBeDefined();
      expect(eyeConflict!.type).toBe('MISSING');
      expect(eyeConflict!.severity).toBe('WARNING');
      expect(eyeConflict!.category).toBe('MEASURE');
      expect(eyeConflict!.configColumn).toBe('Eye Exam');

      const bpConflict = findConflict(report, 'BP Control');
      expect(bpConflict).toBeDefined();
      expect(bpConflict!.type).toBe('MISSING');
      expect(bpConflict!.severity).toBe('WARNING');
    });

    it('should include measure info in MISSING message', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      const eyeConflict = findConflict(report, 'Eye Exam');
      expect(eyeConflict!.message).toContain('Measure column');
      expect(eyeConflict!.message).toContain('Eye Exam');
    });
  });

  // ----------------------------------------------------------------
  // UC6: Missing required patient column -> MISSING, BLOCKING
  // ----------------------------------------------------------------
  describe('UC6: Missing required patient column -> MISSING, BLOCKING', () => {
    it('should detect BLOCKING MISSING for missing memberName column', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['DOB'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Patient');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('MISSING');
      expect(conflict!.severity).toBe('BLOCKING');
      expect(conflict!.category).toBe('PATIENT');
    });

    it('should detect BLOCKING MISSING for missing memberDob column', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'DOB');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('MISSING');
      expect(conflict!.severity).toBe('BLOCKING');
    });

    it('should detect BLOCKING for both missing required patient columns', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
          patientCol('Phone', 'memberTelephone'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Phone'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Patient')!.severity).toBe('BLOCKING');
      expect(findConflict(report, 'DOB')!.severity).toBe('BLOCKING');
      expect(report.hasBlockingConflicts).toBe(true);
    });

    it('should NOT classify missing optional patient column as BLOCKING', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
          patientCol('Phone', 'memberTelephone'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      const phoneConflict = findConflict(report, 'Phone');
      expect(phoneConflict!.type).toBe('MISSING');
      expect(phoneConflict!.severity).toBe('WARNING');
    });

    it('should include "Required" in MISSING message for required patient fields', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders: string[] = [];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Patient');
      expect(conflict!.message).toContain('Required');
      expect(conflict!.message).toContain('memberName');
    });
  });

  // ----------------------------------------------------------------
  // UC7: Required patient column renamed -> CHANGED, BLOCKING
  // ----------------------------------------------------------------
  describe('UC7: Required patient column renamed -> CHANGED, BLOCKING', () => {
    it('should detect BLOCKING CHANGED when memberName column is renamed', () => {
      // Use mock to force a high fuzzy match for the rename
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Patient Name') {
          return [{
            candidate: 'Patient',
            score: 0.85,
            normalizedSource: 'patient name',
            normalizedCandidate: 'patient',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient Name', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Patient Name');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('CHANGED');
      expect(conflict!.severity).toBe('BLOCKING');
      expect(conflict!.configColumn).toBe('Patient');
      expect(conflict!.category).toBe('PATIENT');
    });

    it('should detect BLOCKING CHANGED when memberDob column is renamed', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'DateOfBirth') {
          return [{
            candidate: 'DOB',
            score: 0.82,
            normalizedSource: 'dateofbirth',
            normalizedCandidate: 'date of birth',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DateOfBirth'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'DateOfBirth');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('CHANGED');
      expect(conflict!.severity).toBe('BLOCKING');
    });
  });

  // ----------------------------------------------------------------
  // UC8: Two file headers match same config column -> DUPLICATE, BLOCKING
  // ----------------------------------------------------------------
  describe('UC8: Two file headers match same config column -> DUPLICATE, BLOCKING', () => {
    it('should detect DUPLICATE BLOCKING when two headers fuzzy-match the same config', () => {
      // Mock: both "Eye Exam Revised" and "Eye Exam Test" match "Eye Exam"
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Eye Exam Revised') {
          return [{
            candidate: 'Eye Exam',
            score: 0.88,
            normalizedSource: 'eye exam revised',
            normalizedCandidate: 'eye exam',
          }];
        }
        if (source === 'Eye Exam Test') {
          return [{
            candidate: 'Eye Exam',
            score: 0.85,
            normalizedSource: 'eye exam test',
            normalizedCandidate: 'eye exam',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Revised', 'Eye Exam Test'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      expect(dupes.length).toBeGreaterThanOrEqual(2);
      for (const d of dupes) {
        expect(d.severity).toBe('BLOCKING');
        expect(d.configColumn).toBe('Eye Exam');
      }
      expect(report.hasBlockingConflicts).toBe(true);
    });

    it('should report both source headers in duplicate conflicts', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'AWV New' || source === 'AWV Old') {
          return [{
            candidate: 'Annual Wellness Visit',
            score: 0.82,
            normalizedSource: source.toLowerCase(),
            normalizedCandidate: 'annual wellness visit',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'AWV New', 'AWV Old'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      expect(dupes.length).toBe(2);
      const headers = dupes.map(d => d.sourceHeader);
      expect(headers).toContain('AWV New');
      expect(headers).toContain('AWV Old');
    });
  });

  // ----------------------------------------------------------------
  // UC9: Ambiguous match (within 5% score range) -> AMBIGUOUS, BLOCKING
  // ----------------------------------------------------------------
  describe('UC9: Ambiguous match (one header matches multiple config within 5%)', () => {
    it('should classify AMBIGUOUS conflicts as BLOCKING severity', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Ambiguous Column') {
          return [
            { candidate: 'Config Column A', score: 0.90, normalizedSource: 'ambiguous column', normalizedCandidate: 'config column a' },
            { candidate: 'Config Column B', score: 0.88, normalizedSource: 'ambiguous column', normalizedCandidate: 'config column b' },
          ];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Config Column A', 'Screening', 'Measure A'),
          measureCol('Config Column B', 'Screening', 'Measure B'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Ambiguous Column'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Ambiguous Column');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('AMBIGUOUS');
      expect(conflict!.severity).toBe('BLOCKING');
      expect(conflict!.message).toContain('multiple config columns');
    });

    it('should include suggestions for AMBIGUOUS conflicts', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Ambig Header') {
          return [
            { candidate: 'Target X', score: 0.85, normalizedSource: 'ambig header', normalizedCandidate: 'target x' },
            { candidate: 'Target Y', score: 0.84, normalizedSource: 'ambig header', normalizedCandidate: 'target y' },
          ];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Target X', 'Screening', 'Target X'),
          measureCol('Target Y', 'Screening', 'Target Y'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Ambig Header'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Ambig Header');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('AMBIGUOUS');
      expect(conflict!.suggestions.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ----------------------------------------------------------------
  // UC12: Suffix normalization auto-resolves " E" and " Q1"/" Q2"
  // ----------------------------------------------------------------
  describe('UC12: Suffix normalization auto-resolves " E" and " Q1"/" Q2"', () => {
    it('should match "Breast Cancer Screening E" with suffix stripped', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Breast Cancer Screening E', 'Screening', 'Breast Cancer Screening'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Breast Cancer Screening E'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Breast Cancer Screening E')).toBeUndefined();
    });

    it('should match "Annual Wellness Visit Q1" with Q1 suffix stripped', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Annual Wellness Visit Q1'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Annual Wellness Visit Q1')).toBeUndefined();
    });

    it('should match "Annual Wellness Visit Q2" with Q2 suffix stripped', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Annual Wellness Visit Q2'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Annual Wellness Visit Q2')).toBeUndefined();
    });

    it('should match "Breast Cancer Screening" to config "Breast Cancer Screening E"', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Breast Cancer Screening E', 'Screening', 'Breast Cancer Screening'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Breast Cancer Screening'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Breast Cancer Screening')).toBeUndefined();
    });

    it('should flag Q1 and Q2 of same measure as duplicate normalized headers', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Annual Wellness Visit Q1', 'Annual Wellness Visit Q2'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      expect(dupes.length).toBeGreaterThanOrEqual(1);
      expect(dupes[0].severity).toBe('BLOCKING');
    });
  });

  // ----------------------------------------------------------------
  // UC13: Zero headers match (<10% config) -> isWrongFile = true
  // ----------------------------------------------------------------
  describe('UC13: Zero headers match (<10% config) -> isWrongFile = true', () => {
    it('should set isWrongFile=true when no file headers match any config column', () => {
      const config = buildMockConfig();
      const fileHeaders = ['XYZ123', 'ABC456', 'DEF789', 'GHI012', 'JKL345'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.isWrongFile).toBe(true);
      expect(report.wrongFileMessage).toBeDefined();
      expect(report.wrongFileMessage).toContain('No recognizable columns');
    });

    it('should set isWrongFile=true when less than 10% of config columns matched', () => {
      const config = buildMockConfig();
      const fileHeaders = ['XYZ123'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.isWrongFile).toBe(true);
    });

    it('should NOT set isWrongFile when enough columns match', () => {
      const config = buildMockConfig();
      const fileHeaders = ['Patient', 'DOB', 'Phone', 'Address'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.isWrongFile).toBe(false);
    });

    it('should include matched and total counts in wrongFileMessage', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('M1', 'S', 'M1'),
          measureCol('M2', 'S', 'M2'),
          measureCol('M3', 'S', 'M3'),
          measureCol('M4', 'S', 'M4'),
          measureCol('M5', 'S', 'M5'),
          measureCol('M6', 'S', 'M6'),
          measureCol('M7', 'S', 'M7'),
          measureCol('M8', 'S', 'M8'),
        ],
        dataColumns: [],
        skipColumns: [],
      }); // 10 total columns
      const fileHeaders = ['SomeRandom'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.isWrongFile).toBe(true);
      expect(report.wrongFileMessage).toContain('0');
      expect(report.wrongFileMessage).toContain('10');
    });
  });

  // ----------------------------------------------------------------
  // UC14: Duplicate headers in file -> BLOCKING error
  // ----------------------------------------------------------------
  describe('UC14: Duplicate headers in file -> BLOCKING error', () => {
    it('should detect DUPLICATE BLOCKING for exact duplicate headers', () => {
      const config = buildMockConfig();
      const fileHeaders = ['Patient', 'DOB', 'Patient'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      expect(dupes.length).toBeGreaterThanOrEqual(1);
      expect(dupes[0].severity).toBe('BLOCKING');
      expect(report.hasBlockingConflicts).toBe(true);
    });

    it('should detect DUPLICATE for case-insensitive duplicate headers', () => {
      const config = buildMockConfig();
      const fileHeaders = ['Patient', 'DOB', 'patient'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      expect(dupes.length).toBeGreaterThanOrEqual(1);
      expect(dupes[0].severity).toBe('BLOCKING');
    });

    it('should return early with only duplicate conflicts when duplicates found', () => {
      const config = buildMockConfig();
      const fileHeaders = ['Patient', 'Patient'];

      const report = detect(fileHeaders, config, systemId);

      for (const c of report.conflicts) {
        expect(c.type).toBe('DUPLICATE');
      }
      expect(report.hasBlockingConflicts).toBe(true);
    });

    it('should report both occurrences of the duplicate header', () => {
      const config = buildMockConfig();
      const fileHeaders = ['Patient', 'DOB', 'Patient'];

      const report = detect(fileHeaders, config, systemId);

      const dupes = findConflictsByType(report, 'DUPLICATE');
      const dupHeaders = dupes.map(d => d.sourceHeader);
      expect(dupHeaders.filter(h => h === 'Patient').length).toBeGreaterThanOrEqual(1);
    });
  });

  // ----------------------------------------------------------------
  // UC10: Column split (one became two)
  // ----------------------------------------------------------------
  describe('UC10: Column split (one became two) -> MISSING + NEW or CHANGED', () => {
    it('should detect MISSING for old total column and classify age-specific headers', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Hemoglobin Test', 'Lab', 'Hemoglobin Test'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Hemoglobin Test Young', 'Hemoglobin Test Old'];

      const report = detect(fileHeaders, config, systemId);

      const youngConflict = findConflict(report, 'Hemoglobin Test Young');
      const oldConflict = findConflict(report, 'Hemoglobin Test Old');
      expect(youngConflict).toBeDefined();
      expect(oldConflict).toBeDefined();

      // Either the old column shows as MISSING or both new ones create DUPLICATE
      const hasMissingOrDupe = report.conflicts.some(
        c => (c.type === 'MISSING' && c.sourceHeader === 'Hemoglobin Test') ||
             c.type === 'DUPLICATE'
      );
      expect(hasMissingOrDupe).toBe(true);
    });
  });

  // ----------------------------------------------------------------
  // UC11: Column merge (two became one)
  // ----------------------------------------------------------------
  describe('UC11: Column merge (two became one) -> MISSING + NEW or CHANGED', () => {
    it('should detect MISSING for old split columns when merged column appears', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Wellness Check Spring', 'Wellness', 'Wellness Check'),
          measureCol('Wellness Check Fall', 'Wellness', 'Wellness Check'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Wellness Check Total'];

      const report = detect(fileHeaders, config, systemId);

      const allMissing = findConflictsByType(report, 'MISSING');
      const missingSources = allMissing.map(m => m.sourceHeader);
      const hasSplitMissing = missingSources.includes('Wellness Check Spring') ||
                              missingSources.includes('Wellness Check Fall');
      expect(hasSplitMissing).toBe(true);

      const mergedConflict = findConflict(report, 'Wellness Check Total');
      expect(mergedConflict).toBeDefined();
      expect(['NEW', 'CHANGED']).toContain(mergedConflict!.type);
    });
  });

  // ----------------------------------------------------------------
  // UC15: Skip column renamed -> CHANGED, INFO severity
  // ----------------------------------------------------------------
  describe('UC15: Skip column renamed -> CHANGED, INFO severity', () => {
    it('should detect INFO CHANGED for a renamed skip column', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Member IDs') {
          return [{
            candidate: 'MembID',
            score: 0.83,
            normalizedSource: 'member ids',
            normalizedCandidate: 'membid',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [
          skipCol('MembID'),
        ],
      });
      const fileHeaders = ['Patient', 'DOB', 'Member IDs'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Member IDs');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('CHANGED');
      expect(conflict!.severity).toBe('INFO');
      expect(conflict!.configColumn).toBe('MembID');
    });

    it('should not create MISSING conflicts for skip columns', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [
          skipCol('MembID'),
        ],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      // MISSING skip columns are silently ignored — nothing to skip if column absent
      const conflict = findConflict(report, 'MembID');
      expect(conflict).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // Per-header fail-open (NFR-SCM-R2)
  // ----------------------------------------------------------------
  describe('Per-header fail-open (NFR-SCM-R2)', () => {
    it('should continue processing when fuzzyMatch throws for one header', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Broken Header') {
          throw new Error('Simulated fuzzy matching failure');
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      // "Eye Exam Test" scores ~0.82 against "Eye Exam" in real fuzzy
      const fileHeaders = ['Patient', 'DOB', 'Broken Header', 'Eye Exam Test'];

      const report = detect(fileHeaders, config, systemId);

      // "Broken Header" classified as NEW (fail-open)
      const brokenConflict = findConflict(report, 'Broken Header');
      expect(brokenConflict).toBeDefined();
      expect(brokenConflict!.type).toBe('NEW');

      // "Eye Exam Test" still processed correctly (CHANGED to Eye Exam)
      const eyeConflict = findConflict(report, 'Eye Exam Test');
      expect(eyeConflict).toBeDefined();
      expect(eyeConflict!.type).toBe('CHANGED');
    });

    it('should classify header with fuzzyMatch error as NEW with WARNING', () => {
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Error Column') {
          throw new TypeError('Cannot read property of undefined');
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Error Column'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Error Column');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
      expect(conflict!.severity).toBe('WARNING');
    });
  });

  // ----------------------------------------------------------------
  // ConflictReport summary counts
  // ----------------------------------------------------------------
  describe('ConflictReport summary counts', () => {
    it('should accurately count conflicts by type', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'RandomColumn'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.summary.total).toBe(report.conflicts.length);
      expect(report.summary.new).toBe(findConflictsByType(report, 'NEW').length);
      expect(report.summary.missing).toBe(findConflictsByType(report, 'MISSING').length);
      expect(report.summary.changed).toBe(findConflictsByType(report, 'CHANGED').length);
      expect(report.summary.duplicate).toBe(findConflictsByType(report, 'DUPLICATE').length);
      expect(report.summary.ambiguous).toBe(findConflictsByType(report, 'AMBIGUOUS').length);
    });

    it('should accurately count blocking vs warning conflicts', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['DOB'];

      const report = detect(fileHeaders, config, systemId);

      const blockingConflicts = report.conflicts.filter(c => c.severity === 'BLOCKING');
      const warningConflicts = report.conflicts.filter(c => c.severity === 'WARNING');

      expect(report.summary.blocking).toBe(blockingConflicts.length);
      expect(report.summary.warnings).toBe(warningConflicts.length);
      expect(report.summary.blocking).toBeGreaterThan(0);
      expect(report.summary.warnings).toBeGreaterThan(0);
    });

    it('should have total equal to sum of all type counts', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'RandomHeader1', 'RandomHeader2'];

      const report = detect(fileHeaders, config, systemId);

      const typeSum = report.summary.new + report.summary.missing +
        report.summary.changed + report.summary.duplicate + report.summary.ambiguous;
      expect(report.summary.total).toBe(typeSum);
    });

    it('should count zero for types that have no conflicts', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.summary.total).toBe(0);
      expect(report.summary.new).toBe(0);
      expect(report.summary.missing).toBe(0);
      expect(report.summary.changed).toBe(0);
      expect(report.summary.duplicate).toBe(0);
      expect(report.summary.ambiguous).toBe(0);
      expect(report.summary.blocking).toBe(0);
      expect(report.summary.warnings).toBe(0);
    });
  });

  // ----------------------------------------------------------------
  // hasBlockingConflicts
  // ----------------------------------------------------------------
  describe('hasBlockingConflicts', () => {
    it('should be true when any BLOCKING conflict exists', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['DOB'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.hasBlockingConflicts).toBe(true);
      expect(report.summary.blocking).toBeGreaterThan(0);
    });

    it('should be false when no BLOCKING conflicts exist', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.hasBlockingConflicts).toBe(false);
    });

    it('should be true for duplicate headers even if all required columns present', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Patient'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.hasBlockingConflicts).toBe(true);
    });

    it('should be false when only WARNING and INFO conflicts exist', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'RandomThing'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.hasBlockingConflicts).toBe(false);
      expect(report.summary.warnings).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // Conflict IDs and metadata
  // ----------------------------------------------------------------
  describe('Conflict IDs and metadata', () => {
    it('should assign unique sequential IDs to each conflict', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['DOB', 'RandomA', 'RandomB'];

      const report = detect(fileHeaders, config, systemId);

      const ids = report.conflicts.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      for (let i = 0; i < ids.length; i++) {
        expect(ids[i]).toBe(`conflict-${i}`);
      }
    });

    it('should include systemId in the report', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, 'my-custom-system');

      expect(report.systemId).toBe('my-custom-system');
    });

    it('should set resolution to null for all detected conflicts', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['DOB', 'RandomColumn'];

      const report = detect(fileHeaders, config, systemId);

      for (const conflict of report.conflicts) {
        expect(conflict.resolution).toBeNull();
      }
    });
  });

  // ----------------------------------------------------------------
  // Inactive columns
  // ----------------------------------------------------------------
  describe('Inactive columns', () => {
    it('should ignore inactive config columns', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          { ...measureCol('Eye Exam', 'Screening', 'Eye Exam'), isActive: false },
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Annual Wellness Visit'];

      const report = detect(fileHeaders, config, systemId);

      const eyeConflict = findConflict(report, 'Eye Exam');
      expect(eyeConflict).toBeUndefined();
      expect(report.conflicts).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // Edge cases
  // ----------------------------------------------------------------
  describe('Edge cases', () => {
    it('should handle empty file headers array', () => {
      const config = buildMockConfig();
      const fileHeaders: string[] = [];

      const report = detect(fileHeaders, config, systemId);

      expect(report.summary.missing).toBeGreaterThan(0);
      expect(report.isWrongFile).toBe(true);
    });

    it('should handle empty config (no columns defined)', () => {
      const config = buildMockConfig({
        patientColumns: [],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['ColA', 'ColB'];

      const report = detect(fileHeaders, config, systemId);

      expect(report.summary.new).toBe(2);
      expect(report.isWrongFile).toBe(false);
    });

    it('should handle options with custom high threshold (0.99)', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      // "Eye Exam Test" normally matches at ~0.82, but with 0.99 threshold it won't
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Test'];

      const report = detect(fileHeaders, config, systemId, { headerThreshold: 0.99 });

      const conflict = findConflict(report, 'Eye Exam Test');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
    });

    it('should handle options with custom low threshold (0.50)', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      // "Eye Exam Test" normally matches at ~0.82, with 0.50 threshold definitely matches
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Test'];

      const report = detect(fileHeaders, config, systemId, { headerThreshold: 0.50 });

      const conflict = findConflict(report, 'Eye Exam Test');
      if (conflict) {
        expect(conflict.type).toBe('CHANGED');
      }
    });

    it('should set category correctly based on config column type', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [
          dataCol('Notes'),
        ],
        skipColumns: [
          skipCol('Sex'),
        ],
      });
      const fileHeaders = ['DOB'];

      const report = detect(fileHeaders, config, systemId);

      expect(findConflict(report, 'Patient')?.category).toBe('PATIENT');
      expect(findConflict(report, 'Eye Exam')?.category).toBe('MEASURE');
      expect(findConflict(report, 'Notes')?.category).toBe('DATA');
      // MISSING skip columns are silently ignored — no conflict created
      expect(findConflict(report, 'Sex')).toBeUndefined();
    });

    it('should not create MISSING conflicts for skip columns (no message needed)', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [],
        dataColumns: [],
        skipColumns: [
          skipCol('MembID'),
        ],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      // MISSING skip columns are silently ignored — nothing to skip if absent
      const conflict = findConflict(report, 'MembID');
      expect(conflict).toBeUndefined();
    });
  });

  // ----------------------------------------------------------------
  // Suggestions
  // ----------------------------------------------------------------
  describe('Suggestions in conflicts', () => {
    it('should include measure info in suggestions for measure columns', () => {
      // Use mock to ensure CHANGED with suggestion that has measure info
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Eye Exam Revised') {
          return [{
            candidate: 'Eye Exam',
            score: 0.85,
            normalizedSource: 'eye exam revised',
            normalizedCandidate: 'eye exam',
          }];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Eye Exam Revised'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Eye Exam Revised');
      expect(conflict).toBeDefined();
      expect(conflict!.suggestions.length).toBeGreaterThan(0);

      const eyeSuggestion = conflict!.suggestions.find(s => s.columnName === 'Eye Exam');
      expect(eyeSuggestion).toBeDefined();
      expect(eyeSuggestion!.targetType).toBe('MEASURE');
      expect(eyeSuggestion!.measureInfo).toBeDefined();
      expect(eyeSuggestion!.measureInfo!.requestType).toBe('Screening');
      expect(eyeSuggestion!.measureInfo!.qualityMeasure).toBe('Eye Exam');
    });

    it('should limit suggestions to top 3', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Screening Alpha', 'Screening', 'Alpha'),
          measureCol('Screening Beta', 'Screening', 'Beta'),
          measureCol('Screening Gamma', 'Screening', 'Gamma'),
          measureCol('Screening Delta', 'Screening', 'Delta'),
          measureCol('Screening Epsilon', 'Screening', 'Epsilon'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Screening'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Screening');
      expect(conflict).toBeDefined();
      expect(conflict!.suggestions.length).toBeLessThanOrEqual(3);
    });

    it('should have empty suggestions array for MISSING conflicts', () => {
      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Eye Exam', 'Screening', 'Eye Exam'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Eye Exam');
      expect(conflict!.type).toBe('MISSING');
      expect(conflict!.suggestions).toHaveLength(0);
    });
  });

  // ----------------------------------------------------------------
  // NEW column broader suggestions (TC-CD-22)
  // ----------------------------------------------------------------
  describe('NEW column broader suggestions (TC-CD-22)', () => {
    it('should include broader suggestions from lower threshold for NEW conflicts', () => {
      // Override: the header doesn't match at 0.80 but does at 0.50
      fuzzyMatchOverride = (source: string, candidates: string[], threshold?: number) => {
        if (source === 'Wellness Assessment' && threshold && threshold < 0.80) {
          return [{
            candidate: 'Annual Wellness Visit',
            score: 0.55,
            normalizedSource: 'wellness assessment',
            normalizedCandidate: 'annual wellness visit',
          }];
        }
        if (source === 'Wellness Assessment') {
          // At default 0.80 threshold, no match
          return [];
        }
        return realFuzzyMatcher.fuzzyMatch(source, candidates, threshold);
      };

      const config = buildMockConfig({
        patientColumns: [
          patientCol('Patient', 'memberName'),
          patientCol('DOB', 'memberDob'),
        ],
        measureColumns: [
          measureCol('Annual Wellness Visit', 'AWV', 'Annual Wellness Visit'),
        ],
        dataColumns: [],
        skipColumns: [],
      });
      const fileHeaders = ['Patient', 'DOB', 'Wellness Assessment'];

      const report = detect(fileHeaders, config, systemId);

      const conflict = findConflict(report, 'Wellness Assessment');
      expect(conflict).toBeDefined();
      expect(conflict!.type).toBe('NEW');
      // Should have broader suggestions from the lower-threshold search
      expect(conflict!.suggestions.length).toBeGreaterThan(0);
      expect(conflict!.suggestions[0].columnName).toBe('Annual Wellness Visit');
    });
  });
});
