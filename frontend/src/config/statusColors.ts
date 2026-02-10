// Shared status-to-color mapping — single source of truth for row color logic.
// Consumed by PatientGrid (AG Grid row styling) and StatusFilterBar/MainPage (filter counting).

export type StatusColor = 'all' | 'duplicate' | 'white' | 'yellow' | 'blue' | 'green' | 'purple' | 'orange' | 'gray' | 'red';

// ── Status arrays ────────────────────────────────────────────────────────────

export const GRAY_STATUSES = [
  'No longer applicable',
  'Screening unnecessary',
] as const;

export const PURPLE_STATUSES = [
  'Patient declined AWV',
  'Patient declined',
  'Patient declined screening',
  'Declined BP control',
  'Contraindicated',
] as const;

export const GREEN_STATUSES = [
  'AWV completed',
  'Diabetic eye exam completed',
  'Colon cancer screening completed',
  'Screening test completed',
  'Screening completed',
  'GC/Clamydia screening completed',
  'Urine microalbumin completed',
  'Blood pressure at goal',
  'Lab completed',
  'Vaccination completed',
  'HgbA1c at goal',
  'Chronic diagnosis confirmed',
  'Patient on ACE/ARB',
] as const;

export const BLUE_STATUSES = [
  'AWV scheduled',
  'Diabetic eye exam scheduled',
  'Diabetic eye exam referral made',
  'Colon cancer screening ordered',
  'Screening test ordered',
  'Screening appt made',
  'Test ordered',
  'Urine microalbumin ordered',
  'Appointment scheduled',
  'ACE/ARB prescribed',
  'Vaccination scheduled',
  'HgbA1c ordered',
  'Lab ordered',
  'Obtaining outside records',
  'HgbA1c NOT at goal',
  'Scheduled call back - BP not at goal',
  'Scheduled call back - BP at goal',
  'Will call later to schedule',
] as const;

export const YELLOW_STATUSES = [
  'Patient called to schedule AWV',
  'Diabetic eye exam discussed',
  'Screening discussed',
  'Patient contacted for screening',
  'Vaccination discussed',
] as const;

export const ORANGE_STATUSES = [
  'Chronic diagnosis resolved',
  'Chronic diagnosis invalid',
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Check if a Chronic DX row has attestation sent (renders as green). */
export function isChronicDxAttestationSent(data: { measureStatus?: string | null; tracking1?: string | null } | undefined): boolean {
  const status = data?.measureStatus || '';
  return ORANGE_STATUSES.includes(status as typeof ORANGE_STATUSES[number]) && data?.tracking1 === 'Attestation sent';
}

/** Check if a row is overdue (dueDate < today in UTC).
 *  Applies to all statuses EXCEPT declined (purple), N/A (gray),
 *  and Chronic DX with attestation sent. */
export function isRowOverdue(data: { measureStatus?: string | null; dueDate?: string | null; tracking1?: string | null } | undefined): boolean {
  if (!data?.dueDate) return false;

  const status = data.measureStatus || '';
  if (GRAY_STATUSES.includes(status as typeof GRAY_STATUSES[number]) ||
      PURPLE_STATUSES.includes(status as typeof PURPLE_STATUSES[number])) {
    return false;
  }

  if (isChronicDxAttestationSent(data)) {
    return false;
  }

  const dueDate = new Date(data.dueDate);
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const dueDateUTC = new Date(Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate()));
  return dueDateUTC < todayUTC;
}

/** Determine the status color of a row. Matches AG Grid rowClassRules logic exactly. */
export function getRowStatusColor(row: {
  measureStatus: string | null;
  isDuplicate: boolean;
  dueDate: string | null;
  tracking1?: string | null;
}): Exclude<StatusColor, 'all'> {
  const status = row.measureStatus || '';

  const attestationSent = isChronicDxAttestationSent(row);

  // Check overdue
  const overdue = isRowOverdue(row);

  // Priority: overdue > status-based colors (duplicate handled separately via isDuplicate flag)
  if (overdue) return 'red';
  if (GRAY_STATUSES.includes(status as typeof GRAY_STATUSES[number])) return 'gray';
  if (PURPLE_STATUSES.includes(status as typeof PURPLE_STATUSES[number])) return 'purple';
  if (GREEN_STATUSES.includes(status as typeof GREEN_STATUSES[number]) || attestationSent) return 'green';
  if (BLUE_STATUSES.includes(status as typeof BLUE_STATUSES[number])) return 'blue';
  if (YELLOW_STATUSES.includes(status as typeof YELLOW_STATUSES[number])) return 'yellow';
  if (ORANGE_STATUSES.includes(status as typeof ORANGE_STATUSES[number])) return 'orange';

  return 'white'; // Default - Not Addressed
}
