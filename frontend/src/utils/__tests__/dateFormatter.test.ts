import { describe, it, expect } from 'vitest';
import { formatDate, formatDateForEdit, formatTodayDisplay } from '../dateFormatter';

describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats a valid ISO date without leading zeros', () => {
    expect(formatDate('2023-01-05T12:00:00.000Z')).toBe('1/5/2023');
  });

  it('formats a date with time component correctly (UTC)', () => {
    expect(formatDate('2024-12-25T18:30:00.000Z')).toBe('12/25/2024');
  });

  it('formats a double-digit month and day', () => {
    expect(formatDate('2023-11-15T12:00:00.000Z')).toBe('11/15/2023');
  });

  it('formats a date at midnight UTC boundary', () => {
    // Stored at noon UTC — should still resolve to the correct date
    expect(formatDate('2023-06-01T00:00:00.000Z')).toBe('6/1/2023');
  });
});

describe('formatDateForEdit', () => {
  it('returns empty string for null', () => {
    expect(formatDateForEdit(null)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDateForEdit('')).toBe('');
  });

  it('produces M/D/YYYY without leading zeros', () => {
    expect(formatDateForEdit('2023-03-07T12:00:00.000Z')).toBe('3/7/2023');
  });

  it('matches formatDate output for the same input', () => {
    const iso = '2024-02-14T12:00:00.000Z';
    expect(formatDateForEdit(iso)).toBe(formatDate(iso));
  });
});

describe('formatTodayDisplay', () => {
  it('returns today\'s date in M/D/YYYY format', () => {
    const result = formatTodayDisplay();
    const now = new Date();
    const expected = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    expect(result).toBe(expected);
  });

  it('matches M/D/YYYY pattern', () => {
    const result = formatTodayDisplay();
    // Pattern: 1-2 digit month / 1-2 digit day / 4 digit year
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}\/\d{4}$/);
  });
});
