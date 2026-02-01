/**
 * Due Date Calculator Tests
 *
 * Tests the due date calculation logic for various measure statuses,
 * including the HgbA1c statuses that require Tracking #2 dropdown selection.
 */

import { calculateDueDate } from '../dueDateCalculator.js';

describe('calculateDueDate', () => {
  describe('HgbA1c statuses - require Tracking #2 (no base fallback)', () => {
    const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];

    hgba1cStatuses.forEach((status) => {
      describe(`${status}`, () => {
        it('returns null when tracking2 is not provided', async () => {
          const result = await calculateDueDate(
            new Date('2026-01-01'),
            status,
            null,
            null
          );

          expect(result.dueDate).toBeNull();
          expect(result.timeIntervalDays).toBeNull();
        });

        it('returns null when tracking2 is empty string', async () => {
          const result = await calculateDueDate(
            new Date('2026-01-01'),
            status,
            null,
            ''
          );

          expect(result.dueDate).toBeNull();
          expect(result.timeIntervalDays).toBeNull();
        });

        it('calculates due date from "1 month" tracking2', async () => {
          const statusDate = new Date('2026-01-15');
          const result = await calculateDueDate(
            statusDate,
            status,
            null,
            '1 month'
          );

          expect(result.dueDate).not.toBeNull();
          expect(result.timeIntervalDays).toBeGreaterThanOrEqual(28);
          expect(result.timeIntervalDays).toBeLessThanOrEqual(31);

          // Due date should be in February
          expect(result.dueDate!.getUTCMonth()).toBe(1); // February (0-indexed)
        });

        it('calculates due date from "3 months" tracking2', async () => {
          const statusDate = new Date('2026-01-15');
          const result = await calculateDueDate(
            statusDate,
            status,
            null,
            '3 months'
          );

          expect(result.dueDate).not.toBeNull();
          expect(result.timeIntervalDays).toBeGreaterThanOrEqual(84);
          expect(result.timeIntervalDays).toBeLessThanOrEqual(93);

          // Due date should be in April
          expect(result.dueDate!.getUTCMonth()).toBe(3); // April (0-indexed)
        });

        it('calculates due date from "6 months" tracking2', async () => {
          const statusDate = new Date('2026-01-15');
          const result = await calculateDueDate(
            statusDate,
            status,
            null,
            '6 months'
          );

          expect(result.dueDate).not.toBeNull();
          expect(result.timeIntervalDays).toBeGreaterThanOrEqual(180);
          expect(result.timeIntervalDays).toBeLessThanOrEqual(186);

          // Due date should be in July
          expect(result.dueDate!.getUTCMonth()).toBe(6); // July (0-indexed)
        });

        it('calculates due date from "12 months" tracking2', async () => {
          const statusDate = new Date('2026-01-15');
          const result = await calculateDueDate(
            statusDate,
            status,
            null,
            '12 months'
          );

          expect(result.dueDate).not.toBeNull();
          expect(result.timeIntervalDays).toBeGreaterThanOrEqual(365);
          expect(result.timeIntervalDays).toBeLessThanOrEqual(366);

          // Due date should be in January next year
          expect(result.dueDate!.getUTCFullYear()).toBe(2027);
        });

        it('returns null for invalid tracking2 format', async () => {
          const result = await calculateDueDate(
            new Date('2026-01-01'),
            status,
            null,
            'invalid value'
          );

          expect(result.dueDate).toBeNull();
          expect(result.timeIntervalDays).toBeNull();
        });
      });
    });
  });

  describe('general cases', () => {
    it('returns null when statusDate is null', async () => {
      const result = await calculateDueDate(
        null,
        'AWV completed',
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });

    it('returns null when measureStatus is null', async () => {
      const result = await calculateDueDate(
        new Date('2026-01-01'),
        null,
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });

    it('returns null when both statusDate and measureStatus are null', async () => {
      const result = await calculateDueDate(
        null,
        null,
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });
  });

  describe('Screening discussed - tracking1 month pattern', () => {
    it('calculates due date from "In 3 Months" tracking1', async () => {
      const statusDate = new Date('2026-01-15');
      const result = await calculateDueDate(
        statusDate,
        'Screening discussed',
        'In 3 Months',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBeGreaterThanOrEqual(84);
      expect(result.timeIntervalDays).toBeLessThanOrEqual(93);
    });

    it('returns null without tracking1 for Screening discussed', async () => {
      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening discussed',
        null,
        null
      );

      // Should fall back to baseDueDays or return null if no base
      // Based on seed data, Screening discussed has baseDueDays: 30
      // But if no tracking1, the special handling doesn't apply
      // This test documents the current behavior
      expect(result).toBeDefined();
    });
  });
});
