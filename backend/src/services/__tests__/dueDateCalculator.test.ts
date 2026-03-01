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

    it.each([
      ['Call every 1 wks', 7],
      ['Call every 3 wks', 21],
      ['Call every 4 wks', 28],
      ['Call every 5 wks', 35],
      ['Call every 6 wks', 42],
      ['Call every 7 wks', 49],
      ['Call every 8 wks', 56],
    ] as const)(
      'uses DueDayRule for BP "%s" → %i days',
      async (tracking1, expectedDays) => {
        mockPrisma.dueDayRule.findFirst.mockResolvedValue({
          id: 100,
          dueDays: expectedDays,
          measureStatus: { code: 'Scheduled call back - BP not at goal' },
        });

        const result = await calculateDueDate(
          new Date('2026-01-15'),
          'Scheduled call back - BP not at goal',
          tracking1,
          null
        );

        expect(result.dueDate).not.toBeNull();
        expect(result.timeIntervalDays).toBe(expectedDays);

        // Verify the correct due date
        const expectedDate = new Date('2026-01-15');
        expectedDate.setUTCDate(expectedDate.getUTCDate() + expectedDays);
        expect(result.dueDate!.getUTCDate()).toBe(expectedDate.getUTCDate());
        expect(result.dueDate!.getUTCMonth()).toBe(expectedDate.getUTCMonth());
      }
    );
  });

  describe('Chronic DX Attestation DueDayRule', () => {
    it('returns 14 days for "Chronic diagnosis resolved" with tracking1 "Attestation not sent"', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue({
        id: 50,
        dueDays: 14,
        measureStatus: { code: 'Chronic diagnosis resolved' },
      });

      const result = await calculateDueDate(
        new Date('2026-02-01'),
        'Chronic diagnosis resolved',
        'Attestation not sent',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(14);

      // Feb 1 + 14 = Feb 15
      expect(result.dueDate!.getUTCDate()).toBe(15);
      expect(result.dueDate!.getUTCMonth()).toBe(1); // February (0-indexed)
    });
  });

  describe('Screening discussed - boundary month patterns', () => {
    it('handles singular "In 1 Month" tracking1', async () => {
      const statusDate = new Date('2026-03-15');
      const result = await calculateDueDate(
        statusDate,
        'Screening discussed',
        'In 1 Month',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.dueDate!.getUTCMonth()).toBe(3); // April
      expect(result.timeIntervalDays).toBeGreaterThanOrEqual(28);
      expect(result.timeIntervalDays).toBeLessThanOrEqual(31);
    });

    it('handles max "In 11 Months" tracking1', async () => {
      const statusDate = new Date('2026-01-15');
      const result = await calculateDueDate(
        statusDate,
        'Screening discussed',
        'In 11 Months',
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.dueDate!.getUTCMonth()).toBe(11); // December
      expect(result.dueDate!.getUTCFullYear()).toBe(2026);
    });

    it('falls through to baseDueDays when tracking1 does not match month pattern', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 10,
        code: 'Screening discussed',
        baseDueDays: 30,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening discussed',
        'Some non-matching value',
        null
      );

      // tracking1 present but no month match → Priority 1 skipped
      // Priority 3: DueDayRule lookup with tracking1 (mock returns null)
      // Priority 4: baseDueDays = 30
      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(30);
    });
  });

  describe('Priority ordering - DueDayRule overrides baseDueDays', () => {
    it('Priority 3 (DueDayRule) wins over Priority 4 (baseDueDays) when both exist', async () => {
      // DueDayRule says 42 days for Colonoscopy
      mockPrisma.dueDayRule.findFirst.mockResolvedValue({
        id: 5,
        dueDays: 42,
        measureStatus: { code: 'Colon cancer screening ordered' },
      });
      // baseDueDays says 14 days (should NOT be used)
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 6,
        code: 'Colon cancer screening ordered',
        baseDueDays: 14,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Colon cancer screening ordered',
        'Colonoscopy',
        null
      );

      expect(result.timeIntervalDays).toBe(42); // DueDayRule wins
    });

    it('tracking1 present but no DueDayRule match falls to baseDueDays', async () => {
      mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 7,
        code: 'Screening test ordered',
        baseDueDays: 14,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening test ordered',
        'Unknown test type',
        null
      );

      expect(result.timeIntervalDays).toBe(14); // baseDueDays fallback
    });
  });

  describe('baseDueDays edge cases', () => {
    it('baseDueDays = 1 calculates next-day due date (AWV scheduled)', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 20,
        code: 'AWV scheduled',
        baseDueDays: 1,
      });

      const result = await calculateDueDate(
        new Date('2026-06-10'),
        'AWV scheduled',
        null,
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(1);
      expect(result.dueDate!.getUTCDate()).toBe(11); // June 10 + 1 = June 11
    });

    it('baseDueDays = 7 for Depression "Called to schedule"', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 21,
        code: 'Called to schedule',
        baseDueDays: 7,
      });

      const result = await calculateDueDate(
        new Date('2026-02-01'),
        'Called to schedule',
        null,
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(7);
      expect(result.dueDate!.getUTCDate()).toBe(8); // Feb 1 + 7 = Feb 8
    });

    it('baseDueDays = 365 for completed statuses (annual follow-up)', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 22,
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
      expect(result.dueDate!.getUTCFullYear()).toBe(2027);
    });

    it('baseDueDays = null returns no due date', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 23,
        code: 'Screening unnecessary',
        baseDueDays: null,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening unnecessary',
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });

    it('Depression Screening complete has 365-day annual rescreening', async () => {
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 23,
        code: 'Screening complete',
        baseDueDays: 365,
      });

      const result = await calculateDueDate(
        new Date('2026-01-15'),
        'Screening complete',
        null,
        null
      );

      expect(result.dueDate).not.toBeNull();
      expect(result.timeIntervalDays).toBe(365);
      expect(result.dueDate!.getUTCFullYear()).toBe(2027);
    });
  });

  describe('Depression Screening baseDueDays', () => {
    it('Visit scheduled baseDueDays=1 uses 1-day interval', async () => {
      // No DueDayRule match
      mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
      // baseDueDays = 1 for Depression Screening + Visit scheduled
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 30,
        code: 'Visit scheduled',
        baseDueDays: 1,
      });

      const result = await calculateDueDate(
        new Date('2025-02-01'),
        'Visit scheduled',
        null,
        null
      );

      expect(result.timeIntervalDays).toBe(1);
      expect(result.dueDate).not.toBeNull();
      // Feb 1 + 1 day = Feb 2
      expect(result.dueDate!.getUTCDate()).toBe(2);
      expect(result.dueDate!.getUTCMonth()).toBe(1); // February (0-indexed)
    });

    it('Screening complete baseDueDays=null means no due date', async () => {
      // No DueDayRule match
      mockPrisma.dueDayRule.findFirst.mockResolvedValue(null);
      // baseDueDays = null for Depression Screening + Screening complete
      mockPrisma.measureStatus.findFirst.mockResolvedValue({
        id: 31,
        code: 'Screening complete',
        baseDueDays: null,
      });

      const result = await calculateDueDate(
        new Date('2025-02-01'),
        'Screening complete',
        null,
        null
      );

      expect(result.dueDate).toBeNull();
      expect(result.timeIntervalDays).toBeNull();
    });
  });
});
