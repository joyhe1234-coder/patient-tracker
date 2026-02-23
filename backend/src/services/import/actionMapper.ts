/**
 * Action Mapper for Sutter Import
 * Maps "Possible Actions Needed" text to requestType, qualityMeasure,
 * and measureStatus using regex patterns from the Sutter configuration.
 *
 * Regex patterns are compiled once per import via buildActionMapperCache()
 * and reused for each row via matchAction(). This avoids recompiling
 * regexes on every row (NFR-SI-3).
 */

import { logger } from '../../utils/logger.js';
import type { ActionMappingEntry } from './configLoader.js';
import { fuzzyMatch } from './fuzzyMatcher.js';

/**
 * A single compiled regex pattern with its associated measure mapping.
 */
export interface CachedPattern {
  regex: RegExp;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
}

/**
 * Pre-compiled regex cache for action mapping.
 * Built once per import session via buildActionMapperCache().
 */
export interface ActionMapperCache {
  compiledPatterns: CachedPattern[];
}

/**
 * Result of a successful action text match.
 */
export interface ActionMatch {
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  /** Index of the matched pattern in the actionMapping array (for debugging) */
  patternIndex: number;
  /** Indicates how the match was found */
  matchedBy: 'regex' | 'fuzzy';
  /** Fuzzy match score (0.0-1.0), only present for fuzzy matches */
  fuzzyScore?: number;
}

/**
 * Compile action mapping entries into a regex cache.
 * Each pattern string is compiled into a RegExp with case-insensitive flag.
 * Malformed patterns are caught, logged as warnings, and skipped.
 *
 * @param actionMapping - Array of action mapping entries from sutter.json
 * @returns Cache of compiled regex patterns
 */
export function buildActionMapperCache(
  actionMapping: ActionMappingEntry[]
): ActionMapperCache {
  const compiledPatterns: CachedPattern[] = [];

  for (let i = 0; i < actionMapping.length; i++) {
    const entry = actionMapping[i];
    try {
      const regex = new RegExp(entry.pattern, 'i');
      compiledPatterns.push({
        regex,
        requestType: entry.requestType,
        qualityMeasure: entry.qualityMeasure,
        measureStatus: entry.measureStatus,
      });
    } catch (error) {
      logger.warn(
        `Skipping malformed action mapping regex at index ${i}: "${entry.pattern}" - ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return { compiledPatterns };
}

/**
 * Fuzzy-match action text against compiled regex pattern descriptive text.
 * Used as a fallback when no regex pattern matches exactly.
 *
 * Normalizes the input: line breaks to spaces, truncate to 500 chars, trim.
 * Strips year patterns (\d{4}) before scoring to improve year-agnostic matching.
 * Builds candidate list from cache pattern regex.source strings.
 *
 * @param actionText - The action text to match
 * @param cache - Pre-compiled regex cache from buildActionMapperCache()
 * @param threshold - Minimum fuzzy score to accept (default 0.75)
 * @returns ActionMatch if a fuzzy match is found above threshold, null otherwise
 */
export function fuzzyMatchAction(
  actionText: string,
  cache: ActionMapperCache,
  threshold: number = 0.75
): ActionMatch | null {
  // Normalize: line breaks to spaces, truncate to 500 chars, trim
  const normalized = actionText
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ')
    .substring(0, 500)
    .trim();

  if (!normalized) {
    return null;
  }

  // Strip year patterns before scoring for year-agnostic matching
  const yearStripped = normalized.replace(/\d{4}/g, '').replace(/\s+/g, ' ').trim();

  if (!yearStripped) {
    return null;
  }

  // Build candidate list from compiled pattern regex.source strings
  const candidates: string[] = cache.compiledPatterns.map(p => p.regex.source);

  if (candidates.length === 0) {
    return null;
  }

  // Find best fuzzy match
  const matches = fuzzyMatch(yearStripped, candidates, threshold);

  if (matches.length === 0) {
    return null;
  }

  // Best match is first (fuzzyMatch returns sorted descending by score)
  const best = matches[0];

  // Find the pattern index that corresponds to the matched candidate
  const patternIndex = candidates.indexOf(best.candidate);

  if (patternIndex === -1) {
    return null;
  }

  const pattern = cache.compiledPatterns[patternIndex];
  return {
    requestType: pattern.requestType,
    qualityMeasure: pattern.qualityMeasure,
    measureStatus: pattern.measureStatus,
    patternIndex,
    matchedBy: 'fuzzy',
    fuzzyScore: best.score,
  };
}

/**
 * Match action text against compiled regex patterns.
 * Trims whitespace and normalizes line breaks before matching.
 * Patterns are tested sequentially; first match wins.
 *
 * If no regex pattern matches, falls back to fuzzy matching via fuzzyMatchAction().
 *
 * @param actionText - The "Possible Actions Needed" column value
 * @param cache - Pre-compiled regex cache from buildActionMapperCache()
 * @returns ActionMatch if a pattern matches, null otherwise
 */
export function matchAction(
  actionText: string,
  cache: ActionMapperCache
): ActionMatch | null {
  // Trim whitespace and normalize line breaks to spaces
  const normalized = actionText
    .trim()
    .replace(/\r\n/g, ' ')
    .replace(/\n/g, ' ');

  if (!normalized) {
    return null;
  }

  // Test each compiled pattern in order; first match wins
  for (let i = 0; i < cache.compiledPatterns.length; i++) {
    const pattern = cache.compiledPatterns[i];
    if (pattern.regex.test(normalized)) {
      return {
        requestType: pattern.requestType,
        qualityMeasure: pattern.qualityMeasure,
        measureStatus: pattern.measureStatus,
        patternIndex: i,
        matchedBy: 'regex',
      };
    }
  }

  // Fuzzy fallback: try fuzzy matching if no regex matched
  return fuzzyMatchAction(actionText, cache);
}
