/**
 * Fuzzy Matcher -- Jaro-Winkler + Jaccard composite scoring utility
 *
 * Standalone string similarity module with zero import-specific dependencies.
 * Used by conflictDetector.ts and actionMapper.ts for fuzzy column/action matching.
 *
 * Algorithm: 60% Jaro-Winkler distance + 40% Jaccard token overlap
 * Default threshold: 0.80 for header matching
 *
 * Ported from poc-fuzzy-matching.ts (root directory).
 */

// ---- Types ----

/**
 * Result from a fuzzy match operation.
 */
export interface FuzzyMatchResult {
  candidate: string;
  score: number;              // 0.0 - 1.0
  normalizedSource: string;
  normalizedCandidate: string;
}

// ---- Abbreviation Expansion ----

/** Common medical/column abbreviation expansions */
const ABBREVIATIONS: Record<string, string> = {
  'bp': 'blood pressure',
  'hgba1c': 'glycemic status assessment',
  'hba1c': 'glycemic status assessment',
  'eval': 'evaluation',
  'dx': 'diagnosis',
  'rx': 'prescription',
  'tx': 'treatment',
  'hx': 'history',
  'pt': 'patient',
  'dob': 'date of birth',
  'addr': 'address',
  'tel': 'telephone',
  'ph': 'phone',
  'imm': 'immunization',
  'immun': 'immunization',
  'vax': 'vaccination',
  'vacc': 'vaccination',
  'scr': 'screening',
  'ctrl': 'control',
  'mgmt': 'management',
  'pcp': 'primary care physician',
  'awv': 'annual wellness visit',
  'gc': 'gonococcal',
  'hep': 'hepatitis',
  'dtap': 'diphtheria tetanus pertussis',
  'ipv': 'inactivated poliovirus',
  'mmr': 'measles mumps rubella',
  'hib': 'haemophilus influenzae type b',
  'vzv': 'varicella zoster virus',
  'pcv': 'pneumococcal conjugate',
  'rota': 'rotavirus',
  'tdap': 'tetanus diphtheria pertussis',
  'combo': 'combination',
  'ppc': 'prenatal postpartum care',
  'phq': 'patient health questionnaire',
};

/**
 * Expand known abbreviations in a string.
 * Each token is checked against the abbreviation map.
 * Also handles tokens with trailing punctuation/numbers.
 */
function expandAbbreviations(text: string): string {
  return text.split(/\s+/).map(token => {
    // Check exact token match (already lowercase from normalizeHeader)
    const expanded = ABBREVIATIONS[token];
    if (expanded) return expanded;

    // Check token without trailing punctuation/numbers
    const cleaned = token.replace(/[-/\\:;,.()\d]+$/g, '');
    const expandedCleaned = ABBREVIATIONS[cleaned];
    if (expandedCleaned) {
      const suffix = token.slice(cleaned.length);
      return expandedCleaned + suffix;
    }

    return token;
  }).join(' ');
}

// ---- Public API ----

/**
 * Normalize a string for comparison:
 * trim, lowercase, strip common suffixes (" E", " Q1", " Q2"),
 * collapse whitespace, expand abbreviations.
 */
export function normalizeHeader(header: string): string {
  let normalized = header
    .trim()
    .toLowerCase()
    .replace(/\s+q[12]$/i, '')   // Strip " Q1" / " Q2" suffix
    .replace(/\s+e$/i, '')        // Strip " E" suffix
    .trim();

  // Collapse multiple spaces to single space
  normalized = normalized.replace(/\s+/g, ' ');

  // Expand abbreviations
  normalized = expandAbbreviations(normalized);

  return normalized;
}

/**
 * Calculate Jaro similarity between two strings.
 * This is the base calculation used by Jaro-Winkler.
 */
function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const matchWindow = Math.max(0, Math.floor(Math.max(s1.length, s2.length) / 2) - 1);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matches
  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, s2.length);

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  );
}

/**
 * Calculate Jaro-Winkler similarity between two strings.
 * Returns a value between 0.0 (no match) and 1.0 (exact match).
 * Uses a prefix scale factor of 0.1 with max prefix length 4.
 */
export function jaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);

  // Common prefix length (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  // Winkler modification: boost for common prefix (p = 0.1)
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Calculate Jaccard index on word tokens.
 * Splits both strings on whitespace, computes |intersection| / |union|.
 * Returns 0.0 to 1.0.
 */
export function jaccardTokenSimilarity(s1: string, s2: string): number {
  const tokens1 = new Set(s1.split(/\s+/).filter(Boolean));
  const tokens2 = new Set(s2.split(/\s+/).filter(Boolean));

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0;
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return intersection / union;
}

/**
 * Composite similarity score: 60% Jaro-Winkler + 40% Jaccard.
 * Both inputs are normalized before scoring.
 */
export function compositeScore(source: string, candidate: string): number {
  const normSource = normalizeHeader(source);
  const normCandidate = normalizeHeader(candidate);
  const jw = jaroWinklerSimilarity(normSource, normCandidate);
  const jc = jaccardTokenSimilarity(normSource, normCandidate);
  return 0.6 * jw + 0.4 * jc;
}

/**
 * Find the best fuzzy matches for a source string against a list of candidates.
 * Returns matches above the threshold, sorted by descending score.
 * Returns at most 3 results (top 3).
 *
 * @param source - The string to match against candidates
 * @param candidates - List of candidate strings to compare
 * @param threshold - Minimum score to include in results (default 0.80)
 */
export function fuzzyMatch(
  source: string,
  candidates: string[],
  threshold: number = 0.80
): FuzzyMatchResult[] {
  const normSource = normalizeHeader(source);

  const results: FuzzyMatchResult[] = [];

  for (const candidate of candidates) {
    const normCandidate = normalizeHeader(candidate);
    const jw = jaroWinklerSimilarity(normSource, normCandidate);
    const jc = jaccardTokenSimilarity(normSource, normCandidate);
    const score = 0.6 * jw + 0.4 * jc;

    if (score >= threshold) {
      results.push({
        candidate,
        score,
        normalizedSource: normSource,
        normalizedCandidate: normCandidate,
      });
    }
  }

  // Sort by descending score
  results.sort((a, b) => b.score - a.score);

  // Return top 3 only
  return results.slice(0, 3);
}
