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
  if (parsed.date && parsed.format !== 'excel-serial' && parsed.format !== 'invalid') {
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

    // If not all parts are dates, treat the entire value as tracking1
    return { statusDate: null, tracking1: trimmed };
  }

  // 4. Single value: try as date first, then as tracking1
  const dateResult = tryParseAsDate(trimmed);
  if (dateResult) {
    return { statusDate: dateResult, tracking1: null };
  }

  // Not a date -- store as tracking1
  return { statusDate: null, tracking1: trimmed };
}
