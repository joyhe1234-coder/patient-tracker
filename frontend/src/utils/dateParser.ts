/**
 * Date parsing and validation utilities for the patient tracker grid.
 *
 * `parseAndValidateDate` accepts flexible user input and returns a
 * normalised ISO string at UTC noon, or null for invalid input.
 *
 * Supported input formats:
 * - M/D/YYYY, MM/DD/YYYY, M/D/YY  (slashes)
 * - M-D-YYYY, MM-DD-YYYY, M-D-YY  (dashes, US order)
 * - M.D.YYYY, MM.DD.YYYY           (dots)
 * - YYYY-MM-DD, YYYY/MM/DD         (ISO)
 * - MMDDYYYY                        (8 digits, no separators)
 */

/**
 * Parse a user-entered date string and return an ISO string at UTC noon.
 *
 * @param input - Raw date string from the user
 * @returns ISO 8601 string (e.g. "2023-01-05T12:00:00.000Z") or null if invalid
 */
export const parseAndValidateDate = (input: string): string | null => {
  if (!input || !input.trim()) return null;

  const trimmed = input.trim();
  let m = 0, d = 0, y = 0;

  // Try MM/DD/YYYY or M/D/YYYY or M/D/YY (with slashes)
  let match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (match) {
    m = parseInt(match[1]);
    d = parseInt(match[2]);
    y = parseInt(match[3]);
    if (y < 100) y += 2000; // Convert 2-digit year to 4-digit (assumes 2000s)
  }

  // Try MM-DD-YYYY or M-D-YYYY or M-D-YY (with dashes, US format)
  if (!match) {
    match = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (match) {
      m = parseInt(match[1]);
      d = parseInt(match[2]);
      y = parseInt(match[3]);
      if (y < 100) y += 2000;
    }
  }

  // Try MM.DD.YYYY or M.D.YYYY (with dots)
  if (!match) {
    match = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (match) {
      m = parseInt(match[1]);
      d = parseInt(match[2]);
      y = parseInt(match[3]);
      if (y < 100) y += 2000;
    }
  }

  // Try YYYY-MM-DD or YYYY/MM/DD (ISO format)
  if (!match) {
    match = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (match) {
      y = parseInt(match[1]);
      m = parseInt(match[2]);
      d = parseInt(match[3]);
    }
  }

  // Try MMDDYYYY or MDYYYY (no separators, 8 digits)
  if (!match) {
    match = trimmed.match(/^(\d{8})$/);
    if (match) {
      const digits = match[1];
      m = parseInt(digits.substring(0, 2));
      d = parseInt(digits.substring(2, 4));
      y = parseInt(digits.substring(4, 8));
    }
  }

  // If no format matched, return null
  if (!match) {
    return null;
  }

  // Validate date values
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) {
    return null;
  }

  // Additional validation: check if day is valid for the month
  const daysInMonth = new Date(y, m, 0).getDate();
  if (d > daysInMonth) {
    return null;
  }

  // Return ISO string at UTC noon to avoid timezone boundary issues
  const isoString = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
  return isoString;
};

/**
 * Show an alert with accepted date format examples.
 */
export const showDateFormatError = (): void => {
  alert('Invalid date format.\n\nAccepted formats:\n• 12/25/2023 or 1/5/2023\n• 12-25-2023 or 1-5-23\n• 2023-12-25\n• 12252023');
};
