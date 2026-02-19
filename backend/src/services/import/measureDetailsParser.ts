/**
 * Measure Details Parser for Sutter Import
 * Parses the "Measure Details" column from Sutter files into
 * statusDate and tracking1 values.
 *
 * Supported formats:
 * - Semicolon-separated: "date; reading" or "date; reading; unit"
 * - Comma-separated dates: "01/15/2025, 03/20/2025" (picks latest)
 * - Single date value: parsed as statusDate
 * - Single numeric/text value: stored as tracking1
 * - Empty/null/undefined: both null
 *
 * Important: Does NOT convert Excel serial numbers (only DOB uses that).
 * Uses parseDate() from dateParser.ts for MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD formats.
 */

import { parseDate, toISODateString } from '../../utils/dateParser.js';

/**
 * Result of parsing a Measure Details value.
 */
export interface MeasureDetailsResult {
  /** ISO date string (YYYY-MM-DD) or null */
  statusDate: string | null;
  /** Reading value, unit, or raw text, or null */
  tracking1: string | null;
}

/**
 * Try to parse a value as a date, but exclude Excel serial numbers.
 * Only recognizes text-based date formats (MM/DD/YYYY, M/D/YYYY, YYYY-MM-DD).
 * Returns the ISO date string if valid, null otherwise.
 */
function tryParseAsDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Reject pure numeric values (could be Excel serial numbers or readings)
  // We do NOT want to convert these to dates in Measure Details
  if (/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = parseDate(trimmed);
  if (
    parsed.date &&
    parsed.format !== 'excel-serial' &&
    parsed.format !== 'invalid' &&
    parsed.format !== 'native' // Reject lenient native Date parsing (false positives for free text)
  ) {
    return toISODateString(parsed.date);
  }

  return null;
}

/**
 * Parse a Measure Details column value into statusDate and tracking1.
 *
 * Parsing logic (in order):
 * 1. Empty/null/undefined -> both null
 * 2. Semicolon-separated: first part -> try parse as date -> statusDate,
 *    remaining parts -> tracking1
 * 3. Comma-separated dates: parse all as dates, pick latest -> statusDate
 * 4. Single value: try parse as date -> statusDate; if not a date, store as tracking1
 *
 * @param value - The raw Measure Details column value
 * @returns Parsed statusDate and tracking1
 */
export function parseMeasureDetails(
  value: string | undefined | null
): MeasureDetailsResult {
  // 1. Empty/null/undefined
  if (value === undefined || value === null || String(value).trim() === '') {
    return { statusDate: null, tracking1: null };
  }

  const trimmed = String(value).trim();

  // 2. Semicolon-separated format: "date; reading" or "date; reading; unit"
  if (trimmed.includes(';')) {
    const parts = trimmed.split(';').map(p => p.trim());
    const datePart = parts[0];
    const remainingParts = parts.slice(1).filter(p => p.length > 0);

    const statusDate = tryParseAsDate(datePart);
    const tracking1 = remainingParts.length > 0 ? remainingParts.join('; ') : null;

    return { statusDate, tracking1 };
  }

  // 3. Comma-separated dates: "01/15/2025, 03/20/2025"
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);

    // Try to parse all parts as dates
    const parsedDates: { date: Date; iso: string }[] = [];
    for (const part of parts) {
      const dateStr = tryParseAsDate(part);
      if (dateStr) {
        const parsed = parseDate(part);
        if (parsed.date) {
          parsedDates.push({ date: parsed.date, iso: dateStr });
        }
      }
    }

    // If all parts are valid dates, pick the latest
    if (parsedDates.length > 0 && parsedDates.length === parts.length) {
      // Sort by date descending and pick the first (latest)
      parsedDates.sort((a, b) => b.date.getTime() - a.date.getTime());
      return { statusDate: parsedDates[0].iso, tracking1: null };
    }

    // If some parts are dates and some aren't (e.g., "12/16/2025, 158/85"),
    // extract the latest date as statusDate and the non-date parts as tracking1
    if (parsedDates.length > 0) {
      parsedDates.sort((a, b) => b.date.getTime() - a.date.getTime());
      const nonDateParts = parts.filter(p => !tryParseAsDate(p));
      const tracking1 = nonDateParts.length > 0 ? nonDateParts.join(', ') : null;
      return { statusDate: parsedDates[0].iso, tracking1 };
    }

    // No dates found at all — treat the entire value as tracking1
    return { statusDate: null, tracking1: trimmed };
  }

  // 4. Single value: try as date first, then as tracking1
  const dateResult = tryParseAsDate(trimmed);
  if (dateResult) {
    return { statusDate: dateResult, tracking1: null };
  }

  // 5. Scan for embedded dates in free text (e.g., "Last HgbA1c: 7.8 on 01/15/2025")
  const embeddedResult = scanForEmbeddedDates(trimmed);
  if (embeddedResult) {
    return embeddedResult;
  }

  // Not a date -- store as tracking1
  return { statusDate: null, tracking1: trimmed };
}

/**
 * Scan free text for embedded dates in MM/DD/YYYY format.
 * Extracts all date matches, validates each, picks the latest.
 * Remaining text (dates removed, cleaned up) becomes tracking1.
 *
 * Requires dates to have 4-digit years to avoid matching blood pressure
 * readings like "142/72" or other numeric ratios.
 *
 * @param text - The raw text to scan
 * @returns MeasureDetailsResult if dates found, null otherwise
 */
function scanForEmbeddedDates(text: string): MeasureDetailsResult | null {
  // Match MM/DD/YYYY or M/D/YYYY patterns with 4-digit years only
  const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = datePattern.exec(text)) !== null) {
    matches.push(match[1]);
  }

  if (matches.length === 0) {
    return null;
  }

  // Validate each match as a real date and collect valid ones
  const validDates: { iso: string; date: Date }[] = [];
  for (const m of matches) {
    const iso = tryParseAsDate(m);
    if (iso) {
      const parsed = parseDate(m);
      if (parsed.date) {
        validDates.push({ iso, date: parsed.date });
      }
    }
  }

  if (validDates.length === 0) {
    return null;
  }

  // Pick the latest date
  validDates.sort((a, b) => b.date.getTime() - a.date.getTime());
  const statusDate = validDates[0].iso;

  // Remove all matched date strings from the text and clean up
  let remaining = text;
  for (const m of matches) {
    remaining = remaining.replace(m, '');
  }
  // Clean up: collapse multiple spaces, trim, remove trailing/leading punctuation artifacts
  remaining = remaining
    .replace(/\s{2,}/g, ' ')
    .replace(/[,;]\s*$/g, '')
    .replace(/^\s*[,;]\s*/g, '')
    .trim();

  const tracking1 = remaining.length > 0 ? remaining : null;

  return { statusDate, tracking1 };
}
