/**
 * Status Date Prompt Resolver Tests
 *
 * Tests the resolution of status date prompts based on measure status
 * and tracking values. Includes both pure function tests (getDefaultDatePrompt)
 * and async database-backed tests (resolveStatusDatePrompt).
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFindFirst = jest.fn<any>();
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use unstable_mockModule for ESM compatibility (required by this project's Jest ESM config)
jest.unstable_mockModule('../../config/database.js', () => ({
  prisma: {
    measureStatus: {
      findFirst: mockFindFirst,
    },
  },
}));

// Dynamic imports after mock setup (ESM requirement)
const {
  resolveStatusDatePrompt,
  getDefaultDatePrompt,
} = await import('../statusDatePromptResolver.js');

describe('statusDatePromptResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getDefaultDatePrompt (pure function - no database interaction)
  // ---------------------------------------------------------------------------
  describe('getDefaultDatePrompt', () => {
    it('should return null for null input', () => {
      expect(getDefaultDatePrompt(null)).toBeNull();
    });

    it('should return null for unknown status', () => {
      expect(getDefaultDatePrompt('Some Unknown Status')).toBeNull();
    });

    it('should return null for empty string', () => {
      // Empty string is falsy so !measureStatus returns true
      expect(getDefaultDatePrompt('')).toBeNull();
    });

    // --- AWV statuses ---
    describe('AWV statuses', () => {
      it('should return "Date Called" for "Patient called to schedule AWV"', () => {
        expect(getDefaultDatePrompt('Patient called to schedule AWV')).toBe('Date Called');
      });

      it('should return "Date Scheduled" for "AWV scheduled"', () => {
        expect(getDefaultDatePrompt('AWV scheduled')).toBe('Date Scheduled');
      });

      it('should return "Date Completed" for "AWV completed"', () => {
        expect(getDefaultDatePrompt('AWV completed')).toBe('Date Completed');
      });

      it('should return "Date Declined" for "Patient declined AWV"', () => {
        expect(getDefaultDatePrompt('Patient declined AWV')).toBe('Date Declined');
      });

      it('should return "Follow-up Date" for "Will call later to schedule"', () => {
        expect(getDefaultDatePrompt('Will call later to schedule')).toBe('Follow-up Date');
      });
    });

    // --- Diabetic Eye Exam statuses ---
    describe('Diabetic Eye Exam statuses', () => {
      it('should return "Date Discussed" for "Diabetic eye exam discussed"', () => {
        expect(getDefaultDatePrompt('Diabetic eye exam discussed')).toBe('Date Discussed');
      });

      it('should return "Date of Referral" for "Diabetic eye exam referral made"', () => {
        expect(getDefaultDatePrompt('Diabetic eye exam referral made')).toBe('Date of Referral');
      });

      it('should return "Date Scheduled" for "Diabetic eye exam scheduled"', () => {
        expect(getDefaultDatePrompt('Diabetic eye exam scheduled')).toBe('Date Scheduled');
      });

      it('should return "Date Completed" for "Diabetic eye exam completed"', () => {
        expect(getDefaultDatePrompt('Diabetic eye exam completed')).toBe('Date Completed');
      });

      it('should return "Date Requested" for "Obtaining outside records"', () => {
        expect(getDefaultDatePrompt('Obtaining outside records')).toBe('Date Requested');
      });
    });

    // --- Screening statuses ---
    describe('Screening statuses', () => {
      it('should return "Date Discussed" for "Screening discussed"', () => {
        expect(getDefaultDatePrompt('Screening discussed')).toBe('Date Discussed');
      });

      it('should return "Date Ordered" for "Colon cancer screening ordered"', () => {
        expect(getDefaultDatePrompt('Colon cancer screening ordered')).toBe('Date Ordered');
      });

      it('should return "Date Completed" for "Colon cancer screening completed"', () => {
        expect(getDefaultDatePrompt('Colon cancer screening completed')).toBe('Date Completed');
      });

      it('should return "Date Ordered" for "Screening test ordered"', () => {
        expect(getDefaultDatePrompt('Screening test ordered')).toBe('Date Ordered');
      });

      it('should return "Date Completed" for "Screening test completed"', () => {
        expect(getDefaultDatePrompt('Screening test completed')).toBe('Date Completed');
      });

      it('should return "Date Scheduled" for "Screening appt made"', () => {
        expect(getDefaultDatePrompt('Screening appt made')).toBe('Date Scheduled');
      });

      it('should return "Date Completed" for "Screening completed"', () => {
        expect(getDefaultDatePrompt('Screening completed')).toBe('Date Completed');
      });
    });

    // --- GC/Chlamydia statuses ---
    describe('GC/Chlamydia statuses', () => {
      it('should return "Date Contacted" for "Patient contacted for screening"', () => {
        expect(getDefaultDatePrompt('Patient contacted for screening')).toBe('Date Contacted');
      });

      it('should return "Date Ordered" for "Test ordered"', () => {
        expect(getDefaultDatePrompt('Test ordered')).toBe('Date Ordered');
      });

      it('should return "Date Completed" for "GC/Clamydia screening completed"', () => {
        expect(getDefaultDatePrompt('GC/Clamydia screening completed')).toBe('Date Completed');
      });
    });

    // --- Diabetic Nephropathy statuses ---
    describe('Diabetic Nephropathy statuses', () => {
      it('should return "Date Ordered" for "Urine microalbumin ordered"', () => {
        expect(getDefaultDatePrompt('Urine microalbumin ordered')).toBe('Date Ordered');
      });

      it('should return "Date Completed" for "Urine microalbumin completed"', () => {
        expect(getDefaultDatePrompt('Urine microalbumin completed')).toBe('Date Completed');
      });
    });

    // --- HgbA1c / Diabetes Control statuses ---
    describe('HgbA1c statuses', () => {
      it('should return "Date Ordered" for "HgbA1c ordered"', () => {
        expect(getDefaultDatePrompt('HgbA1c ordered')).toBe('Date Ordered');
      });

      it('should return "Date of Test" for "HgbA1c at goal"', () => {
        expect(getDefaultDatePrompt('HgbA1c at goal')).toBe('Date of Test');
      });

      it('should return "Date of Test" for "HgbA1c NOT at goal"', () => {
        expect(getDefaultDatePrompt('HgbA1c NOT at goal')).toBe('Date of Test');
      });
    });

    // --- Hypertension / BP statuses ---
    describe('BP statuses', () => {
      it('should return "Date Measured" for "Blood pressure at goal"', () => {
        expect(getDefaultDatePrompt('Blood pressure at goal')).toBe('Date Measured');
      });

      it('should return "Date of Last Call" for "Scheduled call back - BP not at goal"', () => {
        expect(getDefaultDatePrompt('Scheduled call back - BP not at goal')).toBe('Date of Last Call');
      });

      it('should return "Date of Last Call" for "Scheduled call back - BP at goal"', () => {
        expect(getDefaultDatePrompt('Scheduled call back - BP at goal')).toBe('Date of Last Call');
      });

      it('should return "Date Scheduled" for "Appointment scheduled"', () => {
        expect(getDefaultDatePrompt('Appointment scheduled')).toBe('Date Scheduled');
      });
    });

    // --- ACE/ARB statuses ---
    describe('ACE/ARB statuses', () => {
      it('should return "Date Verified" for "Patient on ACE/ARB"', () => {
        expect(getDefaultDatePrompt('Patient on ACE/ARB')).toBe('Date Verified');
      });

      it('should return "Date Prescribed" for "ACE/ARB prescribed"', () => {
        expect(getDefaultDatePrompt('ACE/ARB prescribed')).toBe('Date Prescribed');
      });
    });

    // --- Vaccination statuses ---
    describe('Vaccination statuses', () => {
      it('should return "Date Discussed" for "Vaccination discussed"', () => {
        expect(getDefaultDatePrompt('Vaccination discussed')).toBe('Date Discussed');
      });

      it('should return "Date Scheduled" for "Vaccination scheduled"', () => {
        expect(getDefaultDatePrompt('Vaccination scheduled')).toBe('Date Scheduled');
      });

      it('should return "Date Completed" for "Vaccination completed"', () => {
        expect(getDefaultDatePrompt('Vaccination completed')).toBe('Date Completed');
      });
    });

    // --- Annual Serum K&Cr statuses ---
    describe('Lab statuses', () => {
      it('should return "Date Ordered" for "Lab ordered"', () => {
        expect(getDefaultDatePrompt('Lab ordered')).toBe('Date Ordered');
      });

      it('should return "Date Completed" for "Lab completed"', () => {
        expect(getDefaultDatePrompt('Lab completed')).toBe('Date Completed');
      });
    });

    // --- Chronic Diagnosis statuses ---
    describe('Chronic Diagnosis statuses', () => {
      it('should return "Date Confirmed" for "Chronic diagnosis confirmed"', () => {
        expect(getDefaultDatePrompt('Chronic diagnosis confirmed')).toBe('Date Confirmed');
      });

      it('should return "Date Resolved" for "Chronic diagnosis resolved"', () => {
        expect(getDefaultDatePrompt('Chronic diagnosis resolved')).toBe('Date Resolved');
      });

      it('should return "Date Invalidated" for "Chronic diagnosis invalid"', () => {
        expect(getDefaultDatePrompt('Chronic diagnosis invalid')).toBe('Date Invalidated');
      });
    });

    // --- Common decline statuses ---
    describe('Decline statuses', () => {
      it('should return "Date Declined" for "Patient declined"', () => {
        expect(getDefaultDatePrompt('Patient declined')).toBe('Date Declined');
      });

      it('should return "Date Declined" for "Patient declined screening"', () => {
        expect(getDefaultDatePrompt('Patient declined screening')).toBe('Date Declined');
      });

      it('should return "Date Declined" for "Declined BP control"', () => {
        expect(getDefaultDatePrompt('Declined BP control')).toBe('Date Declined');
      });
    });

    // --- Common ending statuses ---
    describe('Ending statuses', () => {
      it('should return "Date Updated" for "No longer applicable"', () => {
        expect(getDefaultDatePrompt('No longer applicable')).toBe('Date Updated');
      });

      it('should return "Date Updated" for "Screening unnecessary"', () => {
        expect(getDefaultDatePrompt('Screening unnecessary')).toBe('Date Updated');
      });

      it('should return "Date Determined" for "Contraindicated"', () => {
        expect(getDefaultDatePrompt('Contraindicated')).toBe('Date Determined');
      });
    });

    // --- Case sensitivity ---
    it('should be case-sensitive (status must match exactly)', () => {
      // All lowercase should not match
      expect(getDefaultDatePrompt('awv completed')).toBeNull();
      // All uppercase should not match
      expect(getDefaultDatePrompt('AWV COMPLETED')).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // resolveStatusDatePrompt (async, uses database)
  // ---------------------------------------------------------------------------
  describe('resolveStatusDatePrompt', () => {
    describe('tracking1 overrides', () => {
      it('should return "Date of Death" when tracking1 is "Patient deceased"', async () => {
        const result = await resolveStatusDatePrompt('AWV completed', 'Patient deceased');

        expect(result).toBe('Date of Death');
        // Should NOT query the database when tracking1 overrides
        expect(mockFindFirst).not.toHaveBeenCalled();
      });

      it('should return "Date of Death" for "Patient deceased" regardless of measureStatus', async () => {
        const result = await resolveStatusDatePrompt(null, 'Patient deceased');

        expect(result).toBe('Date of Death');
        expect(mockFindFirst).not.toHaveBeenCalled();
      });

      it('should return "Date Reported" when tracking1 is "Patient in hospice"', async () => {
        const result = await resolveStatusDatePrompt('Screening discussed', 'Patient in hospice');

        expect(result).toBe('Date Reported');
        expect(mockFindFirst).not.toHaveBeenCalled();
      });

      it('should return "Date Reported" for "Patient in hospice" regardless of measureStatus', async () => {
        const result = await resolveStatusDatePrompt(null, 'Patient in hospice');

        expect(result).toBe('Date Reported');
        expect(mockFindFirst).not.toHaveBeenCalled();
      });
    });

    describe('null measureStatus', () => {
      it('should return null when measureStatus is null and no tracking1 override', async () => {
        const result = await resolveStatusDatePrompt(null, null);

        expect(result).toBeNull();
        expect(mockFindFirst).not.toHaveBeenCalled();
      });

      it('should return null when measureStatus is null and tracking1 is regular value', async () => {
        const result = await resolveStatusDatePrompt(null, 'Some tracking value');

        expect(result).toBeNull();
        expect(mockFindFirst).not.toHaveBeenCalled();
      });
    });

    describe('database lookup', () => {
      it('should return datePrompt from database config when found', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: 'Date Completed' });

        const result = await resolveStatusDatePrompt('AWV completed', null);

        expect(result).toBe('Date Completed');
        expect(mockFindFirst).toHaveBeenCalledWith({
          where: { code: 'AWV completed' },
          select: { datePrompt: true },
        });
      });

      it('should return null when database config has no datePrompt', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: null });

        const result = await resolveStatusDatePrompt('Some Status', null);

        expect(result).toBeNull();
      });

      it('should return null when no database config exists for the status', async () => {
        mockFindFirst.mockResolvedValue(null);

        const result = await resolveStatusDatePrompt('Unknown Status', null);

        expect(result).toBeNull();
      });

      it('should return null when database config has empty string datePrompt', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: '' });

        const result = await resolveStatusDatePrompt('Some Status', null);

        // Empty string is falsy, so statusConfig?.datePrompt || null returns null
        expect(result).toBeNull();
      });

      it('should query database with correct status code', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: 'Date Ordered' });

        await resolveStatusDatePrompt('HgbA1c ordered', 'Some tracking');

        expect(mockFindFirst).toHaveBeenCalledWith({
          where: { code: 'HgbA1c ordered' },
          select: { datePrompt: true },
        });
      });

      it('should ignore non-override tracking1 values and still query database', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: 'Date Scheduled' });

        const result = await resolveStatusDatePrompt('AWV scheduled', 'Some regular tracking');

        expect(result).toBe('Date Scheduled');
        expect(mockFindFirst).toHaveBeenCalled();
      });
    });

    describe('priority ordering', () => {
      it('should prioritize "Patient deceased" tracking1 over database config', async () => {
        // Even if database has a datePrompt, tracking1 override takes precedence
        mockFindFirst.mockResolvedValue({ datePrompt: 'Date Completed' });

        const result = await resolveStatusDatePrompt('AWV completed', 'Patient deceased');

        expect(result).toBe('Date of Death');
        expect(mockFindFirst).not.toHaveBeenCalled();
      });

      it('should prioritize "Patient in hospice" tracking1 over database config', async () => {
        mockFindFirst.mockResolvedValue({ datePrompt: 'Date Scheduled' });

        const result = await resolveStatusDatePrompt('AWV scheduled', 'Patient in hospice');

        expect(result).toBe('Date Reported');
        expect(mockFindFirst).not.toHaveBeenCalled();
      });
    });
  });
});
