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
 * Match action text against compiled regex patterns.
 * Trims whitespace and normalizes line breaks before matching.
 * Patterns are tested sequentially; first match wins.
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
      };
    }
  }

  return null;
}
