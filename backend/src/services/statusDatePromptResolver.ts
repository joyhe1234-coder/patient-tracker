import { prisma } from '../config/database.js';

/**
 * Resolve the status date prompt text based on measure status and tracking values
 *
 * Priority:
 * 1. Special tracking1 overrides (Patient deceased, Patient in hospice)
 * 2. MeasureStatus.datePrompt from configuration
 */
export async function resolveStatusDatePrompt(
  measureStatus: string | null,
  tracking1: string | null
): Promise<string | null> {
  // Priority 1: Special tracking1 overrides
  if (tracking1 === 'Patient deceased') {
    return 'Date of Death';
  }

  if (tracking1 === 'Patient in hospice') {
    return 'Date Reported';
  }

  // No measure status = no prompt
  if (!measureStatus) {
    return null;
  }

  // Priority 2: Lookup from MeasureStatus configuration
  const statusConfig = await prisma.measureStatus.findFirst({
    where: {
      code: measureStatus,
    },
    select: {
      datePrompt: true,
    },
  });

  return statusConfig?.datePrompt || null;
}

/**
 * Get default date prompts for common statuses
 * Used when database config is not yet seeded
 */
export function getDefaultDatePrompt(measureStatus: string | null): string | null {
  if (!measureStatus) {
    return null;
  }
  const defaultPrompts: Record<string, string> = {
    // AWV statuses
    'Patient called to schedule AWV': 'Date Called',
    'AWV scheduled': 'Date Scheduled',
    'AWV completed': 'Date Completed',
    'Patient declined AWV': 'Date Declined',
    'Will call later to schedule': 'Follow-up Date',

    // Diabetic Eye Exam
    'Diabetic eye exam discussed': 'Date Discussed',
    'Diabetic eye exam referral made': 'Date of Referral',
    'Diabetic eye exam scheduled': 'Date Scheduled',
    'Diabetic eye exam completed': 'Date Completed',
    'Obtaining outside records': 'Date Requested',

    // Screening statuses
    'Screening discussed': 'Date Discussed',
    'Colon cancer screening ordered': 'Date Ordered',
    'Colon cancer screening completed': 'Date Completed',
    'Screening test ordered': 'Date Ordered',
    'Screening test completed': 'Date Completed',
    'Screening appt made': 'Date Scheduled',
    'Screening completed': 'Date Completed',

    // GC/Chlamydia
    'Patient contacted for screening': 'Date Contacted',
    'Test ordered': 'Date Ordered',
    'GC/Clamydia screening completed': 'Date Completed',

    // Diabetic Nephropathy
    'Urine microalbumin ordered': 'Date Ordered',
    'Urine microalbumin completed': 'Date Completed',

    // Hypertension Management
    'Blood pressure at goal': 'Date Measured',
    'Scheduled call back - BP not at goal': 'Date of Last Call',
    'Scheduled call back - BP at goal': 'Date of Last Call',
    'Appointment scheduled': 'Date Scheduled',

    // ACE/ARB
    'Patient on ACE/ARB': 'Date Verified',
    'ACE/ARB prescribed': 'Date Prescribed',

    // Vaccination
    'Vaccination discussed': 'Date Discussed',
    'Vaccination scheduled': 'Date Scheduled',
    'Vaccination completed': 'Date Completed',

    // Diabetes Control
    'HgbA1c ordered': 'Date Ordered',
    'HgbA1c at goal': 'Date of Test',
    'HgbA1c NOT at goal': 'Date of Test',

    // Annual Serum K&Cr
    'Lab ordered': 'Date Ordered',
    'Lab completed': 'Date Completed',

    // Chronic Diagnosis
    'Chronic diagnosis confirmed': 'Date Confirmed',
    'Chronic diagnosis resolved': 'Date Resolved',
    'Chronic diagnosis invalid': 'Date Invalidated',

    // Common declines
    'Patient declined': 'Date Declined',
    'Patient declined screening': 'Date Declined',
    'Declined BP control': 'Date Declined',

    // Common endings
    'No longer applicable': 'Date Updated',
    'Screening unnecessary': 'Date Updated',
    'Contraindicated': 'Date Determined',
  };

  return defaultPrompts[measureStatus] || null;
}
