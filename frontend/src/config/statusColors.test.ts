/**
 * statusColors Tests
 *
 * Tests for row color logic: status arrays, overdue detection,
 * chronic DX attestation, and getRowStatusColor priority ordering.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  GRAY_STATUSES,
  PURPLE_STATUSES,
  GREEN_STATUSES,
  BLUE_STATUSES,
  YELLOW_STATUSES,
  ORANGE_STATUSES,
  isChronicDxAttestationSent,
  isRowOverdue,
  getRowStatusColor,
} from './statusColors';

describe('statusColors', () => {
  // ── Status arrays ──────────────────────────────────────────────────

  describe('status arrays', () => {
    it('GRAY_STATUSES contains N/A-type statuses', () => {
      expect(GRAY_STATUSES).toContain('No longer applicable');
      expect(GRAY_STATUSES).toContain('Screening unnecessary');
      expect(GRAY_STATUSES).toHaveLength(2);
    });

    it('PURPLE_STATUSES contains declined/contraindicated statuses', () => {
      expect(PURPLE_STATUSES).toContain('Patient declined AWV');
      expect(PURPLE_STATUSES).toContain('Patient declined');
      expect(PURPLE_STATUSES).toContain('Patient declined screening');
      expect(PURPLE_STATUSES).toContain('Declined BP control');
      expect(PURPLE_STATUSES).toContain('Contraindicated');
      expect(PURPLE_STATUSES).toHaveLength(5);
    });

    it('GREEN_STATUSES contains completed/at-goal statuses', () => {
      expect(GREEN_STATUSES).toContain('AWV completed');
      expect(GREEN_STATUSES).toContain('HgbA1c at goal');
      expect(GREEN_STATUSES).toContain('Blood pressure at goal');
      expect(GREEN_STATUSES).toContain('Lab completed');
      expect(GREEN_STATUSES).toContain('Patient on ACE/ARB');
      expect(GREEN_STATUSES).toContain('Screening complete');
    });

    it('BLUE_STATUSES contains scheduled/ordered/in-progress statuses', () => {
      expect(BLUE_STATUSES).toContain('AWV scheduled');
      expect(BLUE_STATUSES).toContain('HgbA1c ordered');
      expect(BLUE_STATUSES).toContain('HgbA1c NOT at goal');
      expect(BLUE_STATUSES).toContain('Obtaining outside records');
      expect(BLUE_STATUSES).toContain('Called to schedule');
    });

    it('YELLOW_STATUSES contains discussed/contacted statuses', () => {
      expect(YELLOW_STATUSES).toContain('Patient called to schedule AWV');
      expect(YELLOW_STATUSES).toContain('Screening discussed');
      expect(YELLOW_STATUSES).toContain('Patient contacted for screening');
      expect(YELLOW_STATUSES).toContain('Visit scheduled');
    });

    it('ORANGE_STATUSES contains chronic diagnosis resolved/invalid', () => {
      expect(ORANGE_STATUSES).toContain('Chronic diagnosis resolved');
      expect(ORANGE_STATUSES).toContain('Chronic diagnosis invalid');
      expect(ORANGE_STATUSES).toHaveLength(2);
    });

    it('no status appears in more than one color array', () => {
      const allArrays = [
        GRAY_STATUSES,
        PURPLE_STATUSES,
        GREEN_STATUSES,
        BLUE_STATUSES,
        YELLOW_STATUSES,
        ORANGE_STATUSES,
      ];
      const allStatuses = allArrays.flatMap((arr) => [...arr]);
      const uniqueStatuses = new Set(allStatuses);
      expect(uniqueStatuses.size).toBe(allStatuses.length);
    });
  });

  // ── isChronicDxAttestationSent ────────────────────────────────────

  describe('isChronicDxAttestationSent', () => {
    it('returns true when chronic resolved + attestation sent', () => {
      expect(
        isChronicDxAttestationSent({
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation sent',
        })
      ).toBe(true);
    });

    it('returns true when chronic invalid + attestation sent', () => {
      expect(
        isChronicDxAttestationSent({
          measureStatus: 'Chronic diagnosis invalid',
          tracking1: 'Attestation sent',
        })
      ).toBe(true);
    });

    it('returns false when chronic resolved + attestation NOT sent', () => {
      expect(
        isChronicDxAttestationSent({
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation not sent',
        })
      ).toBe(false);
    });

    it('returns false when chronic resolved + null tracking1', () => {
      expect(
        isChronicDxAttestationSent({
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: null,
        })
      ).toBe(false);
    });

    it('returns false for non-chronic status even with attestation sent', () => {
      expect(
        isChronicDxAttestationSent({
          measureStatus: 'AWV completed',
          tracking1: 'Attestation sent',
        })
      ).toBe(false);
    });

    it('returns false for undefined data', () => {
      expect(isChronicDxAttestationSent(undefined)).toBe(false);
    });

    it('returns false for empty data', () => {
      expect(isChronicDxAttestationSent({})).toBe(false);
    });
  });

  // ── isRowOverdue ──────────────────────────────────────────────────

  describe('isRowOverdue', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns false when no dueDate', () => {
      expect(isRowOverdue({ dueDate: null })).toBe(false);
    });

    it('returns false when dueDate is undefined', () => {
      expect(isRowOverdue(undefined)).toBe(false);
    });

    it('returns true when dueDate is in the past', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-01', measureStatus: 'Not Addressed' })
      ).toBe(true);
    });

    it('returns false when dueDate is today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Not Addressed' })
      ).toBe(false);
    });

    it('returns false when dueDate is in the future', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-12-31', measureStatus: 'Not Addressed' })
      ).toBe(false);
    });

    it('returns false for gray statuses even if overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-01-01', measureStatus: 'No longer applicable' })
      ).toBe(false);
      expect(
        isRowOverdue({ dueDate: '2025-01-01', measureStatus: 'Screening unnecessary' })
      ).toBe(false);
    });

    it('returns false for purple (declined) statuses even if overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-01-01', measureStatus: 'Patient declined AWV' })
      ).toBe(false);
      expect(
        isRowOverdue({ dueDate: '2025-01-01', measureStatus: 'Patient declined' })
      ).toBe(false);
      expect(
        isRowOverdue({ dueDate: '2025-01-01', measureStatus: 'Contraindicated' })
      ).toBe(false);
    });

    it('returns false for chronic DX with attestation sent even if overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({
          dueDate: '2025-01-01',
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation sent',
        })
      ).toBe(false);
    });

    it('returns true for chronic DX without attestation sent when overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({
          dueDate: '2025-01-01',
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation not sent',
        })
      ).toBe(true);
    });

    // ── Boundary tests (gap analysis items 6.4, 6.5) ──────────────────

    it('due date = yesterday is overdue (1 day past)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-14', measureStatus: 'Called to schedule' })
      ).toBe(true);
    });

    it('due date = today is NOT overdue (boundary — strict less-than)', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Called to schedule' })
      ).toBe(false);
    });

    it('due date = tomorrow is NOT overdue', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-16', measureStatus: 'Called to schedule' })
      ).toBe(false);
    });

    it('7-day timer boundary: day 7 exactly is NOT overdue ("Called to schedule")', () => {
      // If status date was 2025-06-08 and baseDueDays=7, dueDate=2025-06-15
      // On 2025-06-15, dueDate === today → NOT overdue
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Called to schedule' })
      ).toBe(false);
    });

    it('7-day timer boundary: day 8 (one day past) IS overdue ("Called to schedule")', () => {
      // Day after the 7-day dueDate → overdue
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-16T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Called to schedule' })
      ).toBe(true);
    });

    it('1-day timer boundary: visit date = today is NOT overdue ("Visit scheduled")', () => {
      // If status date was 2025-06-14 and baseDueDays=1, dueDate=2025-06-15
      // On 2025-06-15, dueDate === today → NOT overdue
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Visit scheduled' })
      ).toBe(false);
    });

    it('1-day timer boundary: day after visit date IS overdue ("Visit scheduled")', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-16T12:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Visit scheduled' })
      ).toBe(true);
    });

    it('overdue comparison uses local date (timezone-sensitive boundary)', () => {
      // isRowOverdue uses today.getDate() (local time), not getUTCDate().
      // At noon UTC, all US timezones see "today" as the same calendar day.
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-16T18:00:00Z'));
      expect(
        isRowOverdue({ dueDate: '2025-06-15', measureStatus: 'Called to schedule' })
      ).toBe(true);
    });
  });

  // ── getRowStatusColor ─────────────────────────────────────────────

  describe('getRowStatusColor', () => {
    const baseRow = {
      measureStatus: null as string | null,
      isDuplicate: false,
      dueDate: null as string | null,
      tracking1: null as string | null,
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns white for null/empty/unknown status', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: null })).toBe('white');
      expect(getRowStatusColor({ ...baseRow, measureStatus: '' })).toBe('white');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Not Addressed' })).toBe('white');
    });

    it('returns gray for N/A statuses', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'No longer applicable' })).toBe('gray');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening unnecessary' })).toBe('gray');
    });

    it('returns purple for declined statuses', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined AWV' })).toBe('purple');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined' })).toBe('purple');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Contraindicated' })).toBe('purple');
    });

    it('returns green for completed statuses', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'AWV completed' })).toBe('green');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'HgbA1c at goal' })).toBe('green');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Lab completed' })).toBe('green');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient on ACE/ARB' })).toBe('green');
    });

    it('returns blue for scheduled/ordered statuses', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'AWV scheduled' })).toBe('blue');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'HgbA1c ordered' })).toBe('blue');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'HgbA1c NOT at goal' })).toBe('blue');
    });

    it('returns yellow for discussed/contacted statuses', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient called to schedule AWV' })).toBe('yellow');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening discussed' })).toBe('yellow');
    });

    it('returns orange for chronic diagnosis resolved/invalid', () => {
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Chronic diagnosis resolved' })).toBe('orange');
      expect(getRowStatusColor({ ...baseRow, measureStatus: 'Chronic diagnosis invalid' })).toBe('orange');
    });

    it('returns green for chronic DX with attestation sent (overrides orange)', () => {
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation sent',
        })
      ).toBe('green');
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'Chronic diagnosis invalid',
          tracking1: 'Attestation sent',
        })
      ).toBe('green');
    });

    it('returns red for overdue rows', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'Not Addressed',
          dueDate: '2025-01-01',
        })
      ).toBe('red');
    });

    it('overdue takes priority over all status-based colors', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      // An overdue blue row should be red
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'AWV scheduled',
          dueDate: '2025-01-01',
        })
      ).toBe('red');
      // An overdue green row should be red
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'AWV completed',
          dueDate: '2025-01-01',
        })
      ).toBe('red');
    });

    it('overdue does NOT override gray (N/A) statuses', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'No longer applicable',
          dueDate: '2025-01-01',
        })
      ).toBe('gray');
    });

    it('overdue does NOT override purple (declined) statuses', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'Patient declined AWV',
          dueDate: '2025-01-01',
        })
      ).toBe('purple');
    });

    it('overdue does NOT override chronic DX with attestation sent', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
      expect(
        getRowStatusColor({
          ...baseRow,
          measureStatus: 'Chronic diagnosis resolved',
          tracking1: 'Attestation sent',
          dueDate: '2025-01-01',
        })
      ).toBe('green');
    });

    describe('Depression Screening colors', () => {
      it('returns blue for "Called to schedule"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Called to schedule' })).toBe('blue');
      });

      it('returns yellow for "Visit scheduled"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Visit scheduled' })).toBe('yellow');
      });

      it('returns green for "Screening complete"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening complete' })).toBe('green');
      });

      it('returns green for "Screening completed" (Cervical Cancer, unaffected)', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening completed' })).toBe('green');
      });

      it('returns gray for "Screening unnecessary"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Screening unnecessary' })).toBe('gray');
      });

      it('returns purple for "Patient declined"', () => {
        expect(getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined' })).toBe('purple');
      });

      it('returns red for overdue "Called to schedule"', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Called to schedule', dueDate: '2025-06-01' })
        ).toBe('red');
      });

      it('returns red for overdue "Visit scheduled"', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Visit scheduled', dueDate: '2025-06-01' })
        ).toBe('red');
      });

      it('does NOT return red for overdue "Patient declined" (purple is terminal)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Patient declined', dueDate: '2025-06-01' })
        ).toBe('purple');
      });

      it('does NOT return red for overdue "Screening unnecessary" (gray is terminal)', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
        expect(
          getRowStatusColor({ ...baseRow, measureStatus: 'Screening unnecessary', dueDate: '2025-06-01' })
        ).toBe('gray');
      });
    });
  });
});
