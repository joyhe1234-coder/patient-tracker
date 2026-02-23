/**
 * Conflict Detector -- Header conflict classification engine
 *
 * Compares file headers against a merged mapping configuration and classifies
 * each difference as a conflict. Handles all 16 use cases from the design spec.
 *
 * Used by the import preview route to detect column mapping conflicts before
 * proceeding with the full import pipeline.
 *
 * Classification Pipeline:
 *   Step 1: Normalize all file headers
 *   Step 2: Pre-check for duplicate headers in file (BLOCKING)
 *   Step 3: Build lookup sets from merged config
 *   Step 4: Per-header exact/fuzzy match and conflict classification
 *   Step 5: Detect MISSING config columns
 *   Step 6: Classify severity
 *   Step 7: Wrong-file check
 */

import { normalizeHeader, fuzzyMatch } from './fuzzyMatcher.js';
import type { FuzzyMatchResult } from './fuzzyMatcher.js';
import { logger } from '../../utils/logger.js';
import type { MergedColumnMapping, MergedActionMapping, MergedSystemConfig } from './mappingTypes.js';

// Re-export shared types so existing consumers don't break
export type { MergedColumnMapping, MergedActionMapping, MergedSystemConfig } from './mappingTypes.js';

// ---- Types ----

export type ConflictType = 'NEW' | 'MISSING' | 'CHANGED' | 'DUPLICATE' | 'AMBIGUOUS';
export type ConflictSeverity = 'BLOCKING' | 'WARNING' | 'INFO';
export type ColumnCategory = 'PATIENT' | 'MEASURE' | 'DATA' | 'SKIP' | 'ACTION';

export interface ColumnConflict {
  id: string;                        // Unique ID for UI tracking (e.g., "conflict-0")
  type: ConflictType;
  severity: ConflictSeverity;
  category: ColumnCategory;
  sourceHeader: string;              // File header (for NEW/CHANGED) or config column (for MISSING)
  configColumn: string | null;       // Known config column (for CHANGED/MISSING)
  suggestions: FuzzySuggestion[];    // Top 3 fuzzy matches (for NEW/CHANGED)
  resolution: ConflictResolution | null;  // Admin's chosen resolution (null = unresolved)
  message: string;                   // Human-readable description
}

export interface FuzzySuggestion {
  columnName: string;
  score: number;                     // 0.0 - 1.0
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'SKIP';
  measureInfo?: {
    requestType: string;
    qualityMeasure: string;
  };
  patientFieldInfo?: {
    targetField: string;
  };
}

export interface ConflictResolution {
  action: 'ACCEPT_SUGGESTION' | 'MAP_TO_MEASURE' | 'MAP_TO_PATIENT' | 'IGNORE' | 'KEEP' | 'REMOVE';
  targetMeasure?: {
    requestType: string;
    qualityMeasure: string;
  };
  targetPatientField?: string;
  suggestionIndex?: number;          // Which suggestion was accepted
}

export interface ConflictReport {
  systemId: string;
  conflicts: ColumnConflict[];
  summary: {
    total: number;
    new: number;
    missing: number;
    changed: number;
    duplicate: number;
    ambiguous: number;
    blocking: number;
    warnings: number;
  };
  hasBlockingConflicts: boolean;     // True if any BLOCKING severity conflicts exist
  isWrongFile: boolean;              // True if matched < 10% of config columns
  wrongFileMessage?: string;         // "No recognizable columns found..."
}

// MergedSystemConfig types are imported from ./mappingTypes.js and re-exported above

// ---- Internal types ----

/** Tracks what category and measure info a config column belongs to */
interface ConfigColumnInfo {
  sourceColumn: string;
  category: ColumnCategory;
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'SKIP';
  targetField: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
}

/** Tracks per-header fuzzy match results for duplicate/ambiguous detection */
interface HeaderMatchInfo {
  fileHeader: string;
  normalizedHeader: string;
  exactMatch: boolean;
  matchedConfigColumn: string | null;
  fuzzyResults: FuzzyMatchResult[];
  category: ColumnCategory | null;
}

// ---- Options ----

export interface DetectConflictsOptions {
  headerThreshold?: number;        // default 0.80
  actionThreshold?: number;        // default 0.75
  /** Optional override for fuzzyMatch function (used in tests) */
  fuzzyMatchFn?: typeof fuzzyMatch;
}

// ---- Constants ----

/** Patient fields that are required and trigger BLOCKING severity */
const REQUIRED_PATIENT_FIELDS = ['memberName', 'memberDob'];

/** Threshold for AMBIGUOUS detection: scores within this range of each other */
const AMBIGUOUS_SCORE_RANGE = 0.05;

/** Wrong-file threshold: matched must be at least this fraction of config columns */
const WRONG_FILE_THRESHOLD = 0.10;

// ---- Public API ----

/**
 * Detect conflicts between file headers and the merged mapping configuration.
 * This is the main entry point, called from the preview route.
 *
 * Implements the 7-step classification pipeline from the design spec.
 * Per-header fuzzy matching is wrapped in try/catch so that an error on one
 * header does not prevent remaining headers from processing (NFR-SCM-R2).
 */
export function detectConflicts(
  fileHeaders: string[],
  mergedConfig: MergedSystemConfig,
  systemId: string,
  options?: DetectConflictsOptions
): ConflictReport {
  const threshold = options?.headerThreshold ?? 0.80;
  const matchFn = options?.fuzzyMatchFn ?? fuzzyMatch;
  const conflicts: ColumnConflict[] = [];
  let conflictIndex = 0;

  // Step 1: Normalize all file headers
  const normalizedFileHeaders = fileHeaders.map(h => normalizeHeader(h));

  // Step 2: Pre-check for duplicate headers in file (BLOCKING)
  const duplicateHeaders = findDuplicateHeaders(fileHeaders, normalizedFileHeaders);
  if (duplicateHeaders.length > 0) {
    for (const dupHeader of duplicateHeaders) {
      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'DUPLICATE',
        severity: 'BLOCKING',
        category: 'DATA',
        sourceHeader: dupHeader,
        configColumn: null,
        suggestions: [],
        resolution: null,
        message: `Duplicate header "${dupHeader}" found in file. Each column header must be unique.`,
      });
    }

    // Duplicate headers are a blocking error -- return early with the report
    return buildReport(systemId, conflicts, 0, 0, fileHeaders.length);
  }

  // Step 3: Build lookup sets from merged config
  const configColumns = buildConfigColumnLookup(mergedConfig);
  const allConfigColumnNames = configColumns.map(c => c.sourceColumn);
  const normalizedConfigMap = new Map<string, ConfigColumnInfo>();
  for (const col of configColumns) {
    normalizedConfigMap.set(normalizeHeader(col.sourceColumn), col);
  }
  const totalConfigColumns = configColumns.length;

  // Step 4: For each file header -- exact match, fuzzy match, classification
  const headerMatches: HeaderMatchInfo[] = [];
  const matchedConfigColumns = new Set<string>(); // track which config columns were matched
  // Maps normalized config column -> list of file headers that fuzzy-matched it
  const fuzzyMatchTargets = new Map<string, string[]>();

  for (let i = 0; i < fileHeaders.length; i++) {
    const fileHeader = fileHeaders[i];
    const normalizedHeader = normalizedFileHeaders[i];

    const matchInfo: HeaderMatchInfo = {
      fileHeader,
      normalizedHeader,
      exactMatch: false,
      matchedConfigColumn: null,
      fuzzyResults: [],
      category: null,
    };

    // Step 4a: Check exact match against all config column sets
    const exactMatchConfig = normalizedConfigMap.get(normalizedHeader);
    if (exactMatchConfig) {
      matchInfo.exactMatch = true;
      matchInfo.matchedConfigColumn = exactMatchConfig.sourceColumn;
      matchInfo.category = exactMatchConfig.category;
      matchedConfigColumns.add(normalizeHeader(exactMatchConfig.sourceColumn));
      headerMatches.push(matchInfo);
      continue;
    }

    // Step 4b: If no exact match, run fuzzyMatch() against all known columns
    // Wrap in try/catch per NFR-SCM-R2: on error, classify as "unmapped" and continue
    try {
      const fuzzyResults = matchFn(fileHeader, allConfigColumnNames, threshold);
      matchInfo.fuzzyResults = fuzzyResults;

      if (fuzzyResults.length > 0) {
        // Best match is first (sorted by descending score)
        const bestMatch = fuzzyResults[0];
        const bestMatchNormalized = normalizeHeader(bestMatch.candidate);
        const bestMatchConfig = normalizedConfigMap.get(bestMatchNormalized);

        if (bestMatchConfig) {
          matchInfo.matchedConfigColumn = bestMatchConfig.sourceColumn;
          matchInfo.category = bestMatchConfig.category;
          matchedConfigColumns.add(bestMatchNormalized);

          // Track this fuzzy match target for duplicate detection (Step 4e)
          const existing = fuzzyMatchTargets.get(bestMatchNormalized) || [];
          existing.push(fileHeader);
          fuzzyMatchTargets.set(bestMatchNormalized, existing);
        }
      }
    } catch (err) {
      // NFR-SCM-R2: Per-header fail-open -- log and continue
      logger.warn(`Fuzzy matching error for header "${fileHeader}": ${err instanceof Error ? err.message : String(err)}`);
      // Leave fuzzyResults empty -- will be classified as NEW in Step 4c/4d
    }

    headerMatches.push(matchInfo);
  }

  // Step 4e: Check if multiple file headers fuzzy-matched same config column -> DUPLICATE
  const duplicateFuzzyTargets = new Set<string>();
  for (const [normalizedTarget, fileHeadersList] of fuzzyMatchTargets.entries()) {
    if (fileHeadersList.length > 1) {
      duplicateFuzzyTargets.add(normalizedTarget);
    }
  }

  // Now classify each non-exact-matched header
  for (const matchInfo of headerMatches) {
    if (matchInfo.exactMatch) continue; // No conflict for exact matches

    const { fileHeader, fuzzyResults, matchedConfigColumn } = matchInfo;

    // Step 4e: DUPLICATE detection -- multiple file headers matched same config column
    if (matchedConfigColumn) {
      const normalizedTarget = normalizeHeader(matchedConfigColumn);
      if (duplicateFuzzyTargets.has(normalizedTarget)) {
        const targetConfig = normalizedConfigMap.get(normalizedTarget)!;
        conflicts.push({
          id: `conflict-${conflictIndex++}`,
          type: 'DUPLICATE',
          severity: 'BLOCKING',
          category: targetConfig.category,
          sourceHeader: fileHeader,
          configColumn: matchedConfigColumn,
          suggestions: buildSuggestions(fuzzyResults, normalizedConfigMap),
          resolution: null,
          message: `Multiple file headers match the same config column "${matchedConfigColumn}". Resolve the ambiguity.`,
        });
        continue;
      }
    }

    // Step 4f: AMBIGUOUS detection -- one file header has 2+ close-scoring matches
    if (fuzzyResults.length >= 2) {
      const topScore = fuzzyResults[0].score;
      const closeMatches = fuzzyResults.filter(r => topScore - r.score <= AMBIGUOUS_SCORE_RANGE);
      if (closeMatches.length >= 2) {
        const bestConfig = matchedConfigColumn
          ? normalizedConfigMap.get(normalizeHeader(matchedConfigColumn))
          : null;
        // Skip columns that are ambiguous are harmless (WARNING, not BLOCKING)
        const ambiguousSeverity: ConflictSeverity = bestConfig?.category === 'SKIP' ? 'WARNING' : 'BLOCKING';
        conflicts.push({
          id: `conflict-${conflictIndex++}`,
          type: 'AMBIGUOUS',
          severity: ambiguousSeverity,
          category: bestConfig?.category ?? 'DATA',
          sourceHeader: fileHeader,
          configColumn: matchedConfigColumn,
          suggestions: buildSuggestions(fuzzyResults, normalizedConfigMap),
          resolution: null,
          message: `Header "${fileHeader}" matches multiple config columns with similar scores. Select the correct mapping.`,
        });
        continue;
      }
    }

    // Step 4c: If best score >= threshold -> CHANGED conflict
    if (fuzzyResults.length > 0 && matchedConfigColumn) {
      const bestMatchConfig = normalizedConfigMap.get(normalizeHeader(matchedConfigColumn))!;
      const category = bestMatchConfig.category;

      // Determine severity based on category and whether it's a required patient field
      const severity = classifyChangedSeverity(bestMatchConfig);

      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'CHANGED',
        severity,
        category,
        sourceHeader: fileHeader,
        configColumn: matchedConfigColumn,
        suggestions: buildSuggestions(fuzzyResults, normalizedConfigMap),
        resolution: null,
        message: `Header "${fileHeader}" appears to be a renamed version of "${matchedConfigColumn}" (${(fuzzyResults[0].score * 100).toFixed(0)}% match).`,
      });
      continue;
    }

    // Step 4d: If best score < threshold or no fuzzy match -> NEW conflict
    // Build suggestions from a broader fuzzy search (lower threshold) for user guidance
    let newSuggestions: FuzzySuggestion[] = [];
    try {
      // Try a lower threshold to provide suggestions even for NEW columns
      const broaderResults = matchFn(fileHeader, allConfigColumnNames, 0.50);
      newSuggestions = buildSuggestions(broaderResults, normalizedConfigMap);
    } catch {
      // Fail-open: no suggestions is fine
    }

    conflicts.push({
      id: `conflict-${conflictIndex++}`,
      type: 'NEW',
      severity: 'WARNING',
      category: 'DATA',
      sourceHeader: fileHeader,
      configColumn: null,
      suggestions: newSuggestions,
      resolution: null,
      message: `Header "${fileHeader}" is not recognized in the current column mapping configuration.`,
    });
  }

  // Step 5: For each config column NOT matched by any file header -> MISSING conflict
  // Skip columns are excluded: a missing skip column is harmless (nothing to skip).
  // Also skip config columns whose targetField is already covered by a matched column
  // (e.g., "Patient Full Name" is CHANGED → "Patient", so "Patient Full Name" is not truly missing).
  const coveredTargetFields = new Set<string>();
  for (const matchInfo of headerMatches) {
    if (matchInfo.exactMatch && matchInfo.matchedConfigColumn) {
      const configCol = normalizedConfigMap.get(normalizeHeader(matchInfo.matchedConfigColumn));
      if (configCol?.targetField) coveredTargetFields.add(configCol.targetField);
    }
    // Also count fuzzy-matched columns that will be resolved via CHANGED conflicts
    if (!matchInfo.exactMatch && matchInfo.matchedConfigColumn) {
      const configCol = normalizedConfigMap.get(normalizeHeader(matchInfo.matchedConfigColumn));
      if (configCol?.targetField) coveredTargetFields.add(configCol.targetField);
    }
  }

  for (const configCol of configColumns) {
    if (configCol.category === 'SKIP') continue; // Skip columns don't need MISSING conflicts

    const normalizedConfigCol = normalizeHeader(configCol.sourceColumn);
    if (!matchedConfigColumns.has(normalizedConfigCol)) {
      // If another column already covers this targetField, skip the MISSING conflict
      if (configCol.targetField && coveredTargetFields.has(configCol.targetField)) continue;
      const severity = classifyMissingSeverity(configCol);

      conflicts.push({
        id: `conflict-${conflictIndex++}`,
        type: 'MISSING',
        severity,
        category: configCol.category,
        sourceHeader: configCol.sourceColumn,
        configColumn: configCol.sourceColumn,
        suggestions: [],
        resolution: null,
        message: buildMissingMessage(configCol),
      });
    }
  }

  // Step 6: Severity classification is done inline above in classifyChangedSeverity
  // and classifyMissingSeverity. DUPLICATE and AMBIGUOUS are always BLOCKING.

  // Step 7: Wrong-file check
  const matchedCount = matchedConfigColumns.size;

  return buildReport(systemId, conflicts, matchedCount, totalConfigColumns, fileHeaders.length);
}

// ---- Internal helpers ----

/**
 * Find duplicate headers in the file by checking normalized forms.
 * Returns the original header names that appear more than once.
 */
function findDuplicateHeaders(
  fileHeaders: string[],
  normalizedHeaders: string[]
): string[] {
  const seen = new Map<string, number>(); // normalized -> first index
  const duplicates = new Set<string>();

  for (let i = 0; i < normalizedHeaders.length; i++) {
    const norm = normalizedHeaders[i];
    if (seen.has(norm)) {
      // Add both the original occurrence and this one
      duplicates.add(fileHeaders[seen.get(norm)!]);
      duplicates.add(fileHeaders[i]);
    } else {
      seen.set(norm, i);
    }
  }

  return Array.from(duplicates);
}

/**
 * Build a flat list of all config columns with their category and metadata.
 * Only includes active columns.
 */
function buildConfigColumnLookup(mergedConfig: MergedSystemConfig): ConfigColumnInfo[] {
  const columns: ConfigColumnInfo[] = [];

  for (const col of mergedConfig.patientColumns) {
    if (!col.isActive) continue;
    columns.push({
      sourceColumn: col.sourceColumn,
      category: 'PATIENT',
      targetType: 'PATIENT',
      targetField: col.targetField,
      requestType: null,
      qualityMeasure: null,
    });
  }

  for (const col of mergedConfig.measureColumns) {
    if (!col.isActive) continue;
    columns.push({
      sourceColumn: col.sourceColumn,
      category: 'MEASURE',
      targetType: 'MEASURE',
      targetField: null,
      requestType: col.requestType,
      qualityMeasure: col.qualityMeasure,
    });
  }

  for (const col of mergedConfig.dataColumns) {
    if (!col.isActive) continue;
    columns.push({
      sourceColumn: col.sourceColumn,
      category: 'DATA',
      targetType: 'DATA',
      targetField: null,
      requestType: null,
      qualityMeasure: null,
    });
  }

  for (const col of mergedConfig.skipColumns) {
    if (!col.isActive) continue;
    columns.push({
      sourceColumn: col.sourceColumn,
      category: 'SKIP',
      targetType: 'SKIP',
      targetField: null,
      requestType: null,
      qualityMeasure: null,
    });
  }

  return columns;
}

/**
 * Convert FuzzyMatchResult[] to FuzzySuggestion[] with config metadata.
 * Returns top 3 suggestions with measure info populated from config lookup.
 */
function buildSuggestions(
  fuzzyResults: FuzzyMatchResult[],
  configMap: Map<string, ConfigColumnInfo>
): FuzzySuggestion[] {
  return fuzzyResults.slice(0, 3).map(result => {
    const normalizedCandidate = normalizeHeader(result.candidate);
    const configInfo = configMap.get(normalizedCandidate);

    const suggestion: FuzzySuggestion = {
      columnName: result.candidate,
      score: result.score,
      targetType: configInfo?.targetType ?? 'DATA',
    };

    if (configInfo && configInfo.requestType && configInfo.qualityMeasure) {
      suggestion.measureInfo = {
        requestType: configInfo.requestType,
        qualityMeasure: configInfo.qualityMeasure,
      };
    }

    if (configInfo?.category === 'PATIENT' && configInfo.targetField) {
      suggestion.patientFieldInfo = { targetField: configInfo.targetField };
    }

    return suggestion;
  });
}

/**
 * Classify severity for a CHANGED conflict based on the config column category.
 * - Patient required fields (memberName/memberDob) -> BLOCKING
 * - Skip columns -> INFO
 * - Everything else -> WARNING
 */
function classifyChangedSeverity(configInfo: ConfigColumnInfo): ConflictSeverity {
  if (configInfo.category === 'PATIENT' && configInfo.targetField &&
      REQUIRED_PATIENT_FIELDS.includes(configInfo.targetField)) {
    return 'BLOCKING';
  }
  if (configInfo.category === 'SKIP') {
    return 'INFO';
  }
  return 'WARNING';
}

/**
 * Classify severity for a MISSING conflict based on the config column category.
 * - Patient required fields (memberName/memberDob) -> BLOCKING
 * - Everything else -> WARNING
 */
function classifyMissingSeverity(configInfo: ConfigColumnInfo): ConflictSeverity {
  if (configInfo.category === 'PATIENT' && configInfo.targetField &&
      REQUIRED_PATIENT_FIELDS.includes(configInfo.targetField)) {
    return 'BLOCKING';
  }
  return 'WARNING';
}

/**
 * Build a human-readable message for a MISSING conflict.
 */
function buildMissingMessage(configInfo: ConfigColumnInfo): string {
  const isRequired = configInfo.category === 'PATIENT' && configInfo.targetField &&
    REQUIRED_PATIENT_FIELDS.includes(configInfo.targetField);

  if (isRequired) {
    return `Required patient column "${configInfo.sourceColumn}" (${configInfo.targetField}) is missing from the file.`;
  }

  if (configInfo.category === 'MEASURE') {
    return `Measure column "${configInfo.sourceColumn}" (${configInfo.requestType} / ${configInfo.qualityMeasure}) is missing from the file.`;
  }

  if (configInfo.category === 'SKIP') {
    return `Skip column "${configInfo.sourceColumn}" is missing from the file.`;
  }

  return `Column "${configInfo.sourceColumn}" is missing from the file.`;
}

/**
 * Build the final ConflictReport with summary counts and wrong-file detection.
 */
function buildReport(
  systemId: string,
  conflicts: ColumnConflict[],
  matchedCount: number,
  totalConfigColumns: number,
  totalFileColumns: number
): ConflictReport {
  const summary = {
    total: conflicts.length,
    new: conflicts.filter(c => c.type === 'NEW').length,
    missing: conflicts.filter(c => c.type === 'MISSING').length,
    changed: conflicts.filter(c => c.type === 'CHANGED').length,
    duplicate: conflicts.filter(c => c.type === 'DUPLICATE').length,
    ambiguous: conflicts.filter(c => c.type === 'AMBIGUOUS').length,
    blocking: conflicts.filter(c => c.severity === 'BLOCKING').length,
    warnings: conflicts.filter(c => c.severity === 'WARNING').length,
  };

  const hasBlockingConflicts = summary.blocking > 0;

  // Step 7: Wrong-file check -- matched < 10% of config columns
  // Exception: if >= 50% of the FILE's columns matched config columns,
  // it's clearly the right system (just a small/partial file).
  const configRatio = totalConfigColumns > 0 ? matchedCount / totalConfigColumns : 0;
  const fileRatio = totalFileColumns > 0 ? matchedCount / totalFileColumns : 0;
  const isWrongFile = totalConfigColumns > 0 &&
    configRatio < WRONG_FILE_THRESHOLD &&
    fileRatio < 0.50;

  const report: ConflictReport = {
    systemId,
    conflicts,
    summary,
    hasBlockingConflicts,
    isWrongFile,
  };

  if (isWrongFile) {
    report.wrongFileMessage = `No recognizable columns found. Only ${matchedCount} of ${totalConfigColumns} expected columns matched. This file may not be from the selected insurance system.`;
  }

  return report;
}
