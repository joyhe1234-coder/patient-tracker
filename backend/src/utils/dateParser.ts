/**
 * Flexible date parser for import functionality
 * Handles multiple date formats including Excel serial numbers
 */

export interface ParsedDate {
  date: Date | null;
  original: string;
  format: string;
}

/**
 * Excel serial number epoch (January 1, 1900)
 * Excel incorrectly treats 1900 as a leap year, so we adjust
 */
const EXCEL_EPOCH = new Date(1899, 11, 30);

/**
 * Check if a value is an Excel serial number
 * Must be a pure numeric string or number (no date separators like / or -)
 */
function isExcelSerialNumber(value: string | number): boolean {
  if (typeof value === 'number') {
    // Pure number - check range
    return !isNaN(value) && value > 1 && value < 100000 && Number.isInteger(value);
  }

  // String - must be entirely numeric (no slashes, dashes, etc.)
  const trimmed = String(value).trim();
  if (!/^\d+$/.test(trimmed)) {
    return false;  // Contains non-digit characters
  }

  const num = parseInt(trimmed, 10);
  // Excel dates are typically > 1 and < 2958465 (year 9999)
  // Realistic range for modern dates: 1 to 100000 (covers 1900-2173)
  return !isNaN(num) && num > 1 && num < 100000;
}

/**
 * Convert Excel serial number to JavaScript Date
 */
function excelSerialToDate(serial: number): Date {
  // Excel serial number represents days since epoch
  const msPerDay = 24 * 60 * 60 * 1000;
  return new Date(EXCEL_EPOCH.getTime() + serial * msPerDay);
}

/**
 * Parse a date string in various formats
 */
export function parseDate(value: string | number | undefined | null): ParsedDate {
  if (value === undefined || value === null || value === '') {
    return { date: null, original: '', format: 'empty' };
  }

  const original = String(value).trim();

  // Handle Excel serial number (numeric value)
  if (isExcelSerialNumber(value)) {
    const serial = typeof value === 'string' ? parseInt(value, 10) : value;
    const date = excelSerialToDate(serial);
    return { date, original, format: 'excel-serial' };
  }

  // Try various date formats
  const formats = [
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, parse: parseMMDDYYYY },        // MM/DD/YYYY or M/D/YYYY
    { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/, parse: parseMMDDYY },          // MM/DD/YY or M/D/YY
    { regex: /^(\d{4})-(\d{2})-(\d{2})$/, parse: parseYYYYMMDD },              // YYYY-MM-DD (ISO)
    { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, parse: parseDotFormat },       // M.D.YYYY
    { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, parse: parseMMDDYYYYDash },      // MM-DD-YYYY
    { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, parse: parseYYYYMMDDSlash },   // YYYY/MM/DD
  ];

  for (const { regex, parse } of formats) {
    const match = original.match(regex);
    if (match) {
      const result = parse(match);
      if (result.date && isValidDate(result.date)) {
        return result;
      }
    }
  }

  // Try native Date parsing as last resort
  const nativeDate = new Date(original);
  if (isValidDate(nativeDate)) {
    return { date: nativeDate, original, format: 'native' };
  }

  return { date: null, original, format: 'invalid' };
}

function parseMMDDYYYY(match: RegExpMatchArray): ParsedDate {
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  // Use UTC noon to avoid timezone issues
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'MM/DD/YYYY' };
}

function parseMMDDYY(match: RegExpMatchArray): ParsedDate {
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);
  // Assume 2000s for 00-99
  year = year < 50 ? 2000 + year : 1900 + year;
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'MM/DD/YY' };
}

function parseYYYYMMDD(match: RegExpMatchArray): ParsedDate {
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'YYYY-MM-DD' };
}

function parseDotFormat(match: RegExpMatchArray): ParsedDate {
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'M.D.YYYY' };
}

function parseMMDDYYYYDash(match: RegExpMatchArray): ParsedDate {
  const month = parseInt(match[1], 10) - 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'MM-DD-YYYY' };
}

function parseYYYYMMDDSlash(match: RegExpMatchArray): ParsedDate {
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
  return { date, original: match[0], format: 'YYYY/MM/DD' };
}

/**
 * Check if a date is valid
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Format a date to ISO string (YYYY-MM-DD) for database storage
 */
export function toISODateString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Format a date to display format (MM/DD/YYYY)
 */
export function toDisplayDate(date: Date | null): string {
  if (!date) return '';
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}/${day}/${year}`;
}
