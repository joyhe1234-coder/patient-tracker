import { describe, it, expect } from 'vitest';
import { isTimeIntervalEditable, TIME_PERIOD_DROPDOWN_STATUSES } from '../PatientGrid';
import type { GridRow } from '../PatientGrid';

/** Minimal GridRow factory — only sets fields relevant to isTimeIntervalEditable. */
function makeRow(overrides: Partial<GridRow> = {}): GridRow {
  return {
    id: 1,
    patientId: 1,
    memberName: 'Test, User',
    memberDob: '1990-01-01',
    memberTelephone: null,
    memberAddress: null,
    insuranceGroup: null,
    requestType: null,
    qualityMeasure: null,
    measureStatus: null,
    statusDate: null,
    statusDatePrompt: null,
    tracking1: null,
    tracking2: null,
    dueDate: null,
    timeIntervalDays: null,
    notes: null,
    rowOrder: 0,
    isDuplicate: false,
    ...overrides,
  };
}

describe('isTimeIntervalEditable', () => {
  describe('returns false', () => {
    it('when data is undefined', () => {
      expect(isTimeIntervalEditable(undefined)).toBe(false);
    });

    it('when statusDate is null', () => {
      const row = makeRow({ statusDate: null, timeIntervalDays: 30, measureStatus: 'AWV completed' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when statusDate is empty string', () => {
      const row = makeRow({ statusDate: '', timeIntervalDays: 30, measureStatus: 'AWV completed' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when timeIntervalDays is null', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: null, measureStatus: 'AWV completed' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when timeIntervalDays is undefined', () => {
      const row = makeRow({ statusDate: '2026-01-01', measureStatus: 'AWV completed' });
      // makeRow sets timeIntervalDays: null by default; override to undefined
      (row as any).timeIntervalDays = undefined;
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when measureStatus is "Screening discussed" (dropdown status)', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: 90, measureStatus: 'Screening discussed' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when measureStatus is "HgbA1c ordered" (dropdown status)', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: 90, measureStatus: 'HgbA1c ordered' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });

    it('when measureStatus is "Scheduled call back - BP not at goal" (dropdown status)', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: 90, measureStatus: 'Scheduled call back - BP not at goal' });
      expect(isTimeIntervalEditable(row)).toBe(false);
    });
  });

  describe('returns true', () => {
    it('for a normal editable status with valid statusDate and timeIntervalDays', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: 365, measureStatus: 'AWV completed' });
      expect(isTimeIntervalEditable(row)).toBe(true);
    });

    it('when measureStatus is null (non-dropdown)', () => {
      const row = makeRow({ statusDate: '2026-01-01', timeIntervalDays: 30, measureStatus: null });
      expect(isTimeIntervalEditable(row)).toBe(true);
    });
  });

  describe('TIME_PERIOD_DROPDOWN_STATUSES constant', () => {
    it('contains the expected dropdown statuses', () => {
      expect(TIME_PERIOD_DROPDOWN_STATUSES).toContain('Screening discussed');
      expect(TIME_PERIOD_DROPDOWN_STATUSES).toContain('HgbA1c ordered');
      expect(TIME_PERIOD_DROPDOWN_STATUSES).toContain('Scheduled call back - BP not at goal');
      expect(TIME_PERIOD_DROPDOWN_STATUSES).toContain('Scheduled call back - BP at goal');
    });
  });
});
