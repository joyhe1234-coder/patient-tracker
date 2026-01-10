import { prisma } from '../config/database.js';

export interface DueDateResult {
  dueDate: Date | null;
  timeIntervalDays: number | null;
}

/**
 * Calculate due date based on status date and business rules
 *
 * Priority:
 * 1. "Screening discussed" + tracking1 pattern "In N Month(s)"
 * 2. HgbA1c statuses + tracking2 pattern "N month(s)"
 * 3. DueDayRule for measureStatus + tracking1 combination
 * 4. MeasureStatus.baseDueDays fallback
 */
export async function calculateDueDate(
  statusDate: Date | null,
  measureStatus: string,
  tracking1: string | null,
  tracking2: string | null
): Promise<DueDateResult> {
  // No status date = no due date
  if (!statusDate) {
    return { dueDate: null, timeIntervalDays: null };
  }

  let dueDays: number | null = null;

  // Priority 1: "Screening discussed" with tracking1 month pattern
  if (measureStatus === 'Screening discussed' && tracking1) {
    const monthMatch = tracking1.match(/In (\d+) Month/i);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      const dueDate = addMonths(statusDate, months);
      const timeIntervalDays = differenceInDays(dueDate, statusDate);
      return { dueDate, timeIntervalDays };
    }
  }

  // Priority 2: HgbA1c statuses with tracking2 month pattern
  if ((measureStatus === 'HgbA1c NOT at goal' || measureStatus === 'HgbA1c at goal') && tracking2) {
    const monthMatch = tracking2.match(/(\d+)\s*[Mm]onth/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      const dueDate = addMonths(statusDate, months);
      const timeIntervalDays = differenceInDays(dueDate, statusDate);
      return { dueDate, timeIntervalDays };
    }
  }

  // Priority 3: Check DueDayRule for measureStatus + tracking1 combination
  if (tracking1) {
    const dueDayRule = await prisma.dueDayRule.findFirst({
      where: {
        measureStatus: {
          code: measureStatus,
        },
        trackingValue: tracking1,
      },
      include: {
        measureStatus: true,
      },
    });

    if (dueDayRule) {
      dueDays = dueDayRule.dueDays;
    }
  }

  // Priority 4: Fallback to MeasureStatus.baseDueDays
  if (dueDays === null) {
    const statusConfig = await prisma.measureStatus.findFirst({
      where: {
        code: measureStatus,
      },
    });

    if (statusConfig?.baseDueDays) {
      dueDays = statusConfig.baseDueDays;
    }
  }

  // Calculate due date if we have dueDays
  if (dueDays !== null) {
    const dueDate = addDays(statusDate, dueDays);
    return { dueDate, timeIntervalDays: dueDays };
  }

  return { dueDate: null, timeIntervalDays: null };
}

// Helper: Add days to a date (using UTC to avoid timezone issues)
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Helper: Add months to a date (using UTC to avoid timezone issues)
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

// Helper: Calculate difference in days between two dates
function differenceInDays(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
}
