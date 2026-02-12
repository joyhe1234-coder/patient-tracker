/**
 * Date formatting utilities for the patient tracker grid.
 *
 * These formatters use UTC to avoid timezone-boundary shifts when
 * displaying date-only values stored as ISO strings (e.g. "2024-01-15T12:00:00.000Z").
 *
 * NOTE: AdminPage.tsx has a separate `formatTimestamp` that uses
 * locale-aware `toLocaleString()` for full datetime display — that is
 * intentionally NOT consolidated here.
 */

/**
 * Format an ISO date string for display using UTC components.
 * Produces M/D/YYYY without leading zeros (e.g. "1/5/2023").
 *
 * @param value - ISO date string or null
 * @returns Formatted date string, or empty string if value is falsy
 */
export const formatDate = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
};

/**
 * Format an ISO date string for cell editing using UTC components.
 * Semantically identical to {@link formatDate} but named separately
 * to clarify intent at call sites (editing vs. display).
 *
 * @param value - ISO date string or null
 * @returns Formatted date string in M/D/YYYY, or empty string if value is falsy
 */
export const formatDateForEdit = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
};

/**
 * Format today's date for display using local time.
 * Used by the "Today" quick-stamp button in StatusDateRenderer.
 *
 * @returns Today's date in M/D/YYYY format (local timezone)
 */
export const formatTodayDisplay = (): string => {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
};
