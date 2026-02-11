/**
 * Due Date Calculator Tests
 *
 * Tests the due date calculation logic for various measure statuses,
 * including the HgbA1c statuses that require Tracking #2 dropdown selection.
 *
 * Uses jest.unstable_mockModule to mock Prisma because the calculator
 * has fallback paths (Priority 3 & 4) that query the database.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock Prisma before importing the calculator
const mockPrisma = {
  dueDayRule: { findFirst: jest.fn<any>() },
  measureStatus: { findFirst: jest.fn<any>() },
};

jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: mockPrisma,
}));

const { calculateDueDate } = await import('../dueDateCalculator.js');

describe('calculateDueDate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no DueDayRule or MeasureStatus config found
    mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
    mockPrisma.measureStatus.findFirst.mockResolvedValue(null);
  });

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

    it('returns null without tracking1 for Screening discussed (no baseDueDays)', async () => {
      // No tracking1 → Priority 1 skipped, Priority 3 skipped
      // Falls through to Priority 4 (baseDueDays lookup)
      // With no baseDueDays configured, returns null
      mockPrisma.measureStatus.findFirst.mockResolvedValue(null);

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening discussed',
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });

    it('uses baseDueDays when tracking1 is null and baseDueDays exists', async () => {
      // Simulate a MeasureStatus record with baseDueDays: 30
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 1,
        code: 'Screening discussed',
        baseDueDays: 30,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening discussed',
        null,
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(30);
    });
  });

  describe('Priority 3: DueDayRule lookup', () => {
    it('uses DueDayRule when tracking1 matches a rule', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue({
        id: 1,
        dueDays: 90,
        measureStatus: { code: 'Colon cancer screening ordered' },
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Colon cancer screening ordered',
        'Colonoscopy',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(90);
    });

    it('falls through to baseDueDays when no DueDayRule matches', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 2,
        code: 'AWV completed',
        baseDueDays: 365,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'AWV completed',
        null,
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(365);
    });

    it('returns null when no rules and no baseDueDays exist', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
      mockPrisma.measureStatus.findFirst.mockResolvedValue(null);

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Unknown status',
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });
  });

  describe('Scheduled call back - BP tracking1 week pattern', () => {
    it('uses DueDayRule for BP call-back schedules', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue({
        id: 3,
        dueDays: 14,
        measureStatus: { code: 'Scheduled call back - BP not at goal' },
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Scheduled call back - BP not at goal',
        'Call every 2 wks',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(14);
    });
  });
});
