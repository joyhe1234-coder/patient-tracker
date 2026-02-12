import { describe, it, expect, vi } from 'vitest';
import { parseAndValidateDate, showDateFormatError } from '../dateParser';

describe('parseAndValidateDate', () => {
  describe('returns null for invalid input', () => {
    it('returns null for empty string', () => {
      expect(parseAndValidateDate('')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parseAndValidateDate('   ')).toBeNull();
    });

    it('returns null for random text', () => {
      expect(parseAndValidateDate('not a date')).toBeNull();
    });

    it('returns null for month > 12', () => {
      expect(parseAndValidateDate('13/01/2023')).toBeNull();
    });

    it('returns null for day > 31', () => {
      expect(parseAndValidateDate('01/32/2023')).toBeNull();
    });

    it('returns null for invalid day in month (Feb 30)', () => {
      expect(parseAndValidateDate('2/30/2023')).toBeNull();
    });

    it('returns null for year < 1900', () => {
      expect(parseAndValidateDate('01/01/1899')).toBeNull();
    });

    it('returns null for year > 2100', () => {
      expect(parseAndValidateDate('01/01/2101')).toBeNull();
    });

    it('returns null for month = 0', () => {
      expect(parseAndValidateDate('0/15/2023')).toBeNull();
    });

    it('returns null for day = 0', () => {
      expect(parseAndValidateDate('1/0/2023')).toBeNull();
    });
  });

  describe('slash format (M/D/YYYY)', () => {
    it('parses M/D/YYYY', () => {
      expect(parseAndValidateDate('1/5/2023')).toBe('2023-01-05T12:00:00.000Z');
    });

    it('parses MM/DD/YYYY', () => {
      expect(parseAndValidateDate('12/25/2023')).toBe('2023-12-25T12:00:00.000Z');
    });

    it('parses M/D/YY (short year)', () => {
      expect(parseAndValidateDate('3/7/24')).toBe('2024-03-07T12:00:00.000Z');
    });
  });

  describe('dash format (M-D-YYYY)', () => {
    it('parses M-D-YYYY', () => {
      expect(parseAndValidateDate('1-5-2023')).toBe('2023-01-05T12:00:00.000Z');
    });

    it('parses MM-DD-YYYY', () => {
      expect(parseAndValidateDate('12-25-2023')).toBe('2023-12-25T12:00:00.000Z');
    });

    it('parses M-D-YY (short year)', () => {
      expect(parseAndValidateDate('1-5-23')).toBe('2023-01-05T12:00:00.000Z');
    });
  });

  describe('dot format (M.D.YYYY)', () => {
    it('parses M.D.YYYY', () => {
      expect(parseAndValidateDate('1.5.2023')).toBe('2023-01-05T12:00:00.000Z');
    });

    it('parses MM.DD.YYYY', () => {
      expect(parseAndValidateDate('12.25.2023')).toBe('2023-12-25T12:00:00.000Z');
    });
  });

  describe('ISO format (YYYY-MM-DD)', () => {
    it('parses YYYY-MM-DD', () => {
      expect(parseAndValidateDate('2023-12-25')).toBe('2023-12-25T12:00:00.000Z');
    });

    it('parses YYYY/MM/DD', () => {
      expect(parseAndValidateDate('2023/01/05')).toBe('2023-01-05T12:00:00.000Z');
    });
  });

  describe('no-separator format (MMDDYYYY)', () => {
    it('parses MMDDYYYY (8 digits)', () => {
      expect(parseAndValidateDate('12252023')).toBe('2023-12-25T12:00:00.000Z');
    });

    it('parses 01052023', () => {
      expect(parseAndValidateDate('01052023')).toBe('2023-01-05T12:00:00.000Z');
    });
  });

  describe('returns ISO string at UTC noon', () => {
    it('all valid dates end with T12:00:00.000Z', () => {
      const formats = [
        '1/5/2023',
        '12-25-2023',
        '2023-06-15',
        '03072024',
      ];
      for (const input of formats) {
        const result = parseAndValidateDate(input);
        expect(result).not.toBeNull();
        expect(result!.endsWith('T12:00:00.000Z')).toBe(true);
      }
    });
  });

  describe('trims whitespace', () => {
    it('handles leading and trailing whitespace', () => {
      expect(parseAndValidateDate('  1/5/2023  ')).toBe('2023-01-05T12:00:00.000Z');
    });
  });

  describe('leap year handling', () => {
    it('accepts Feb 29 on a leap year', () => {
      expect(parseAndValidateDate('2/29/2024')).toBe('2024-02-29T12:00:00.000Z');
    });

    it('rejects Feb 29 on a non-leap year', () => {
      expect(parseAndValidateDate('2/29/2023')).toBeNull();
    });
  });
});

describe('showDateFormatError', () => {
  it('calls alert with the expected message', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    showDateFormatError();
    expect(alertSpy).toHaveBeenCalledOnce();
    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid date format')
    );
    alertSpy.mockRestore();
  });
});
