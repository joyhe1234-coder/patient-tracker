/**
 * seed-200.ts — Seed 200 unassigned patients with diverse quality measures.
 *
 * Usage:  cd backend && npx tsx prisma/seed-200.ts
 *
 * This script:
 *  - Does NOT delete existing data; it only inserts new rows.
 *  - Creates 200 patients (ownerId = null) with programmatic names.
 *  - Assigns 1-5 PatientMeasure records per patient covering ALL request types,
 *    quality measures, statuses, tracking values, and color states.
 *  - Generates realistic due dates, including overdue rows.
 *  - Creates a handful of deliberate duplicates (same name+dob, different measures).
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (one level above backend/)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Also try backend-local .env if it exists
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────────
// Name / address / phone generators
// ──────────────────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa',
  'Timothy', 'Deborah', 'Ronald', 'Stephanie', 'Edward', 'Rebecca', 'Jason', 'Sharon',
  'Jeffrey', 'Laura', 'Ryan', 'Cynthia', 'Jacob', 'Kathleen', 'Gary', 'Amy',
  'Nicholas', 'Angela', 'Eric', 'Shirley', 'Jonathan', 'Anna', 'Stephen', 'Brenda',
  'Larry', 'Pamela', 'Justin', 'Emma', 'Scott', 'Nicole', 'Brandon', 'Helen',
  'Benjamin', 'Samantha', 'Samuel', 'Katherine', 'Raymond', 'Christine', 'Gregory', 'Debra',
  'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Patrick', 'Janet', 'Jack', 'Catherine',
  'Dennis', 'Maria', 'Jerry', 'Heather', 'Tyler', 'Diane', 'Aaron', 'Ruth',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
  'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy',
];

const STREET_NAMES = [
  'Oak', 'Maple', 'Pine', 'Cedar', 'Elm', 'Birch', 'Walnut', 'Willow',
  'Cherry', 'Spruce', 'Aspen', 'Magnolia', 'Chestnut', 'Sycamore', 'Poplar', 'Laurel',
  'Cypress', 'Dogwood', 'Hazel', 'Juniper',
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Rd', 'Ln', 'Dr', 'Ct', 'Way', 'Pl', 'Cir'];

const CITIES = [
  'Springfield', 'Riverside', 'Lakewood', 'Fairview', 'Greenville',
  'Oakland', 'Franklin', 'Madison', 'Georgetown', 'Arlington',
];

// Deterministic pseudo-random based on a seed integer
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rand = seededRandom(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  return shuffled.slice(0, n);
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function generatePhone(): string {
  return `555${String(randInt(1000000, 9999999))}`;
}

function generateAddress(): string {
  const num = randInt(100, 9999);
  return `${num} ${pick(STREET_NAMES)} ${pick(STREET_TYPES)}, ${pick(CITIES)}`;
}

function generateDob(): Date {
  const year = randInt(1940, 2000);
  const month = randInt(0, 11);
  const day = randInt(1, 28);
  return new Date(Date.UTC(year, month, day));
}

// ──────────────────────────────────────────────────────────────────────────────
// Date helpers
// ──────────────────────────────────────────────────────────────────────────────

const TODAY = new Date();
const TODAY_UTC = new Date(Date.UTC(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate()));

function daysAgo(days: number): Date {
  const d = new Date(TODAY_UTC);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date(TODAY_UTC);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addDaysToDate(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function addMonthsToDate(date: Date, months: number): Date {
  const d = new Date(date);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────────
// Full dropdown configuration (mirrors dropdownConfig.ts)
// ──────────────────────────────────────────────────────────────────────────────

const REQUEST_TYPE_TO_QUALITY_MEASURE: Record<string, string[]> = {
  'AWV': ['Annual Wellness Visit'],
  'Chronic DX': ['Chronic Diagnosis Code'],
  'Quality': [
    'Diabetic Eye Exam',
    'GC/Chlamydia Screening',
    'Diabetic Nephropathy',
    'Hypertension Management',
    'ACE/ARB in DM or CAD',
    'Vaccination',
    'Diabetes Control',
    'Annual Serum K&Cr',
  ],
  'Screening': [
    'Breast Cancer Screening',
    'Colon Cancer Screening',
    'Cervical Cancer Screening',
  ],
};

const QUALITY_MEASURE_TO_STATUS: Record<string, string[]> = {
  'Annual Wellness Visit': [
    'Not Addressed',
    'Patient called to schedule AWV',
    'AWV scheduled',
    'AWV completed',
    'Patient declined AWV',
    'Will call later to schedule',
    'No longer applicable',
  ],
  'Diabetic Eye Exam': [
    'Not Addressed',
    'Diabetic eye exam discussed',
    'Diabetic eye exam referral made',
    'Diabetic eye exam scheduled',
    'Diabetic eye exam completed',
    'Obtaining outside records',
    'Patient declined',
    'No longer applicable',
  ],
  'Colon Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Colon cancer screening ordered',
    'Colon cancer screening completed',
    'Obtaining outside records',
    'Patient declined screening',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'Breast Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Screening test ordered',
    'Screening test completed',
    'Obtaining outside records',
    'Patient declined screening',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'Cervical Cancer Screening': [
    'Not Addressed',
    'Screening discussed',
    'Screening appt made',
    'Screening completed',
    'Obtaining outside records',
    'Patient declined',
    'No longer applicable',
    'Screening unnecessary',
  ],
  'GC/Chlamydia Screening': [
    'Not Addressed',
    'Patient contacted for screening',
    'Test ordered',
    'GC/Clamydia screening completed',
    'Patient declined screening',
    'No longer applicable',
  ],
  'Diabetic Nephropathy': [
    'Not Addressed',
    'Patient contacted for screening',
    'Urine microalbumin ordered',
    'Urine microalbumin completed',
    'Patient declined screening',
    'No longer applicable',
  ],
  'Hypertension Management': [
    'Not Addressed',
    'Blood pressure at goal',
    'Scheduled call back - BP not at goal',
    'Scheduled call back - BP at goal',
    'Appointment scheduled',
    'Declined BP control',
    'No longer applicable',
  ],
  'ACE/ARB in DM or CAD': [
    'Not Addressed',
    'Patient on ACE/ARB',
    'ACE/ARB prescribed',
    'Patient declined',
    'Contraindicated',
    'No longer applicable',
  ],
  'Vaccination': [
    'Not Addressed',
    'Vaccination discussed',
    'Vaccination scheduled',
    'Vaccination completed',
    'Patient declined',
    'No longer applicable',
  ],
  'Diabetes Control': [
    'Not Addressed',
    'HgbA1c ordered',
    'HgbA1c at goal',
    'HgbA1c NOT at goal',
    'Patient declined',
    'No longer applicable',
  ],
  'Annual Serum K&Cr': [
    'Not Addressed',
    'Lab ordered',
    'Lab completed',
    'Patient declined',
    'No longer applicable',
  ],
  'Chronic Diagnosis Code': [
    'Not Addressed',
    'Chronic diagnosis confirmed',
    'Chronic diagnosis resolved',
    'Chronic diagnosis invalid',
    'No longer applicable',
  ],
};

// Tracking #1 options keyed by status code
const STATUS_TO_TRACKING1: Record<string, string[]> = {
  'Colon cancer screening ordered': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Colon cancer screening completed': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Screening test ordered': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Screening test completed': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Scheduled call back - BP not at goal': [
    'Call every 1 wk', 'Call every 2 wks', 'Call every 3 wks', 'Call every 4 wks',
    'Call every 5 wks', 'Call every 6 wks', 'Call every 7 wks', 'Call every 8 wks',
  ],
  'Scheduled call back - BP at goal': [
    'Call every 1 wk', 'Call every 2 wks', 'Call every 3 wks', 'Call every 4 wks',
    'Call every 5 wks', 'Call every 6 wks', 'Call every 7 wks', 'Call every 8 wks',
  ],
  'Chronic diagnosis resolved': ['Attestation not sent', 'Attestation sent'],
  'Chronic diagnosis invalid': ['Attestation not sent', 'Attestation sent'],
  'Screening discussed': [
    'In 1 Month', 'In 2 Months', 'In 3 Months', 'In 4 Months', 'In 5 Months',
    'In 6 Months', 'In 7 Months', 'In 8 Months', 'In 9 Months', 'In 10 Months',
    'In 11 Months',
  ],
};

// Base due days from seed.ts (status -> baseDueDays)
const BASE_DUE_DAYS: Record<string, number | null> = {
  // AWV
  'Not Addressed': null,
  'Patient called to schedule AWV': 7,
  'AWV scheduled': 1,
  'AWV completed': 365,
  'Patient declined AWV': null,
  'Will call later to schedule': 30,
  // Breast Cancer
  'Screening discussed': 30,
  'Screening test ordered': 14,
  'Screening test completed': 365,
  'Patient declined screening': null,
  'Screening unnecessary': null,
  // Colon Cancer
  'Colon cancer screening ordered': 42,
  'Colon cancer screening completed': 365,
  // Cervical Cancer
  'Screening appt made': 1,
  'Screening completed': 365,
  // Diabetic Eye
  'Diabetic eye exam discussed': 42,
  'Diabetic eye exam referral made': 42,
  'Diabetic eye exam scheduled': 1,
  'Diabetic eye exam completed': 365,
  'Obtaining outside records': 14,
  // GC/Chlamydia
  'Patient contacted for screening': 10,
  'Test ordered': 5,
  'GC/Clamydia screening completed': 365,
  // Nephropathy
  'Urine microalbumin ordered': 5,
  'Urine microalbumin completed': 365,
  // Hypertension
  'Blood pressure at goal': null,
  'Scheduled call back - BP not at goal': 7,
  'Scheduled call back - BP at goal': 7,
  'Appointment scheduled': 1,
  'Declined BP control': null,
  // ACE/ARB
  'Patient on ACE/ARB': null,
  'ACE/ARB prescribed': 14,
  'Patient declined': null,
  'Contraindicated': null,
  // Vaccination
  'Vaccination discussed': 7,
  'Vaccination scheduled': 1,
  'Vaccination completed': 365,
  // Diabetes Control (HgbA1c) — uses tracking2 for months, no baseDueDays
  'HgbA1c ordered': null,
  'HgbA1c at goal': null,
  'HgbA1c NOT at goal': null,
  // Annual Serum
  'Lab ordered': 7,
  'Lab completed': 365,
  // Chronic DX
  'Chronic diagnosis confirmed': 365,
  'Chronic diagnosis resolved': null,
  'Chronic diagnosis invalid': null,
  'No longer applicable': null,
};

// Due day rule overrides (status+tracking1 → days)
const DUE_DAY_RULES: Record<string, Record<string, number>> = {
  'Colon cancer screening ordered': { 'Colonoscopy': 42, 'Sigmoidoscopy': 42, 'Cologuard': 21, 'FOBT': 21 },
  'Screening test ordered': { 'Mammogram': 14, 'Breast Ultrasound': 14, 'Breast MRI': 21 },
  'Scheduled call back - BP not at goal': {
    'Call every 1 wk': 7, 'Call every 2 wks': 14, 'Call every 3 wks': 21, 'Call every 4 wks': 28,
    'Call every 5 wks': 35, 'Call every 6 wks': 42, 'Call every 7 wks': 49, 'Call every 8 wks': 56,
  },
  'Scheduled call back - BP at goal': {
    'Call every 1 wk': 7, 'Call every 2 wks': 14, 'Call every 3 wks': 21, 'Call every 4 wks': 28,
    'Call every 5 wks': 35, 'Call every 6 wks': 42, 'Call every 7 wks': 49, 'Call every 8 wks': 56,
  },
  'Chronic diagnosis resolved': { 'Attestation not sent': 14 },
  'Chronic diagnosis invalid': { 'Attestation not sent': 14 },
};

// HgbA1c tracking2 options
const HGBA1C_TRACKING2 = ['3 months', '6 months', '9 months', '12 months'];

// HgbA1c goal options
const HGBA1C_GOALS = ['less_than_7', 'less_than_8', 'less_than_9'];

// ──────────────────────────────────────────────────────────────────────────────
// Color classification for statuses (for notes / intentional coverage)
// ──────────────────────────────────────────────────────────────────────────────

const GRAY_STATUSES = ['No longer applicable', 'Screening unnecessary'];
const PURPLE_STATUSES = ['Patient declined AWV', 'Patient declined', 'Patient declined screening', 'Declined BP control', 'Contraindicated'];
const GREEN_STATUSES = [
  'AWV completed', 'Diabetic eye exam completed', 'Colon cancer screening completed',
  'Screening test completed', 'Screening completed', 'GC/Clamydia screening completed',
  'Urine microalbumin completed', 'Blood pressure at goal', 'Lab completed',
  'Vaccination completed', 'HgbA1c at goal', 'Chronic diagnosis confirmed', 'Patient on ACE/ARB',
];
const BLUE_STATUSES = [
  'AWV scheduled', 'Diabetic eye exam scheduled', 'Diabetic eye exam referral made',
  'Colon cancer screening ordered', 'Screening test ordered', 'Screening appt made',
  'Test ordered', 'Urine microalbumin ordered', 'Appointment scheduled',
  'ACE/ARB prescribed', 'Vaccination scheduled', 'HgbA1c ordered', 'Lab ordered',
  'Obtaining outside records', 'HgbA1c NOT at goal', 'Scheduled call back - BP not at goal',
  'Scheduled call back - BP at goal', 'Will call later to schedule',
];
const YELLOW_STATUSES = [
  'Patient called to schedule AWV', 'Diabetic eye exam discussed', 'Screening discussed',
  'Patient contacted for screening', 'Vaccination discussed',
];
const ORANGE_STATUSES = ['Chronic diagnosis resolved', 'Chronic diagnosis invalid'];

function getStatusColor(status: string, tracking1: string | null): string {
  if (GRAY_STATUSES.includes(status)) return 'gray';
  if (PURPLE_STATUSES.includes(status)) return 'purple';
  if (ORANGE_STATUSES.includes(status) && tracking1 === 'Attestation sent') return 'green (attestation sent)';
  if (GREEN_STATUSES.includes(status)) return 'green';
  if (BLUE_STATUSES.includes(status)) return 'blue';
  if (YELLOW_STATUSES.includes(status)) return 'yellow';
  if (ORANGE_STATUSES.includes(status)) return 'orange';
  if (status === 'Not Addressed') return 'white';
  return 'white';
}

// ──────────────────────────────────────────────────────────────────────────────
// Calculate due date and time interval locally (same logic as dueDateCalculator.ts)
// ──────────────────────────────────────────────────────────────────────────────

interface DueDateResult {
  dueDate: Date | null;
  timeIntervalDays: number | null;
}

function calculateDueDateLocal(
  statusDate: Date | null,
  measureStatus: string | null,
  tracking1: string | null,
  tracking2: string | null
): DueDateResult {
  if (!statusDate || !measureStatus) {
    return { dueDate: null, timeIntervalDays: null };
  }

  // Priority 1: "Screening discussed" with tracking1 month pattern
  if (measureStatus === 'Screening discussed' && tracking1) {
    const monthMatch = tracking1.match(/In (\d+) Month/i);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      const dueDate = addMonthsToDate(statusDate, months);
      const timeDiff = Math.round(Math.abs((dueDate.getTime() - statusDate.getTime()) / (24 * 60 * 60 * 1000)));
      return { dueDate, timeIntervalDays: timeDiff };
    }
  }

  // Priority 2: HgbA1c statuses with tracking2 month pattern
  const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
  if (hgba1cStatuses.includes(measureStatus)) {
    if (!tracking2) return { dueDate: null, timeIntervalDays: null };
    const monthMatch = tracking2.match(/(\d+)\s*[Mm]onth/);
    if (monthMatch) {
      const months = parseInt(monthMatch[1], 10);
      const dueDate = addMonthsToDate(statusDate, months);
      const timeDiff = Math.round(Math.abs((dueDate.getTime() - statusDate.getTime()) / (24 * 60 * 60 * 1000)));
      return { dueDate, timeIntervalDays: timeDiff };
    }
    return { dueDate: null, timeIntervalDays: null };
  }

  // Priority 3: DueDayRule for status+tracking1
  let dueDays: number | null = null;
  if (tracking1 && DUE_DAY_RULES[measureStatus]?.[tracking1] !== undefined) {
    dueDays = DUE_DAY_RULES[measureStatus][tracking1];
  }

  // Priority 4: baseDueDays fallback
  if (dueDays === null) {
    const baseDays = BASE_DUE_DAYS[measureStatus];
    if (baseDays !== null && baseDays !== undefined) {
      dueDays = baseDays;
    }
  }

  if (dueDays !== null) {
    const dueDate = addDaysToDate(statusDate, dueDays);
    return { dueDate, timeIntervalDays: dueDays };
  }

  return { dueDate: null, timeIntervalDays: null };
}

// ──────────────────────────────────────────────────────────────────────────────
// Measure configuration builder
// ──────────────────────────────────────────────────────────────────────────────

interface MeasureConfig {
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  statusDate: Date | null;
  tracking1: string | null;
  tracking2: string | null;
  notes: string | null;
  hgba1cGoal: string | null;
  hgba1cGoalReachedYear: boolean;
  hgba1cDeclined: boolean;
}

/**
 * Build a single measure configuration with context-appropriate values.
 * The `intent` parameter controls whether we try to make it overdue, etc.
 */
function buildMeasure(
  requestType: string,
  qualityMeasure: string,
  measureStatus: string,
  intent: 'normal' | 'overdue' | 'completed-overdue' = 'normal'
): MeasureConfig {
  let statusDate: Date | null = null;
  let tracking1: string | null = null;
  let tracking2: string | null = null;
  let hgba1cGoal: string | null = null;
  let hgba1cGoalReachedYear = false;
  let hgba1cDeclined = false;

  // Determine tracking1 if the status has dropdown options
  const t1Options = STATUS_TO_TRACKING1[measureStatus];
  if (t1Options) {
    tracking1 = pick(t1Options);
  }

  // HgbA1c-specific handling
  const hgba1cStatuses = ['HgbA1c ordered', 'HgbA1c at goal', 'HgbA1c NOT at goal'];
  if (hgba1cStatuses.includes(measureStatus)) {
    tracking2 = pick(HGBA1C_TRACKING2);
    if (measureStatus === 'HgbA1c at goal' || measureStatus === 'HgbA1c NOT at goal') {
      // tracking1 = HgbA1c value (free text)
      if (measureStatus === 'HgbA1c at goal') {
        tracking1 = `${(5.5 + rand() * 1.5).toFixed(1)}`;
      } else {
        tracking1 = `${(8.0 + rand() * 3.0).toFixed(1)}`;
      }
    }
    hgba1cGoal = pick(HGBA1C_GOALS);
    hgba1cGoalReachedYear = measureStatus === 'HgbA1c at goal' && rand() > 0.5;
    hgba1cDeclined = measureStatus === 'Patient declined' && qualityMeasure === 'Diabetes Control';
  }

  // Hypertension: tracking2 = BP reading (free text)
  if (measureStatus === 'Scheduled call back - BP not at goal') {
    tracking2 = `${randInt(140, 180)}/${randInt(88, 110)}`;
  } else if (measureStatus === 'Scheduled call back - BP at goal') {
    tracking2 = `${randInt(110, 135)}/${randInt(70, 85)}`;
  } else if (measureStatus === 'Blood pressure at goal') {
    tracking2 = `${randInt(110, 130)}/${randInt(65, 80)}`;
  }

  // Set statusDate based on intent
  if (measureStatus === 'Not Addressed') {
    statusDate = null;
  } else if (intent === 'overdue') {
    // Make statusDate far enough in the past so dueDate is in the past
    const baseDays = BASE_DUE_DAYS[measureStatus] ?? 30;
    const extraDays = baseDays !== null ? baseDays + randInt(5, 30) : randInt(40, 90);
    statusDate = daysAgo(extraDays);
  } else if (intent === 'completed-overdue') {
    // Completed status but >365 days ago so annual due date has passed
    statusDate = daysAgo(randInt(370, 500));
  } else {
    // Normal: statusDate within last 0-90 days for active, or scheduled in future
    if (measureStatus === 'AWV scheduled' || measureStatus === 'Appointment scheduled' ||
        measureStatus === 'Vaccination scheduled' || measureStatus === 'Screening appt made' ||
        measureStatus === 'Diabetic eye exam scheduled') {
      statusDate = daysFromNow(randInt(1, 30));
    } else {
      statusDate = daysAgo(randInt(1, 90));
    }
  }

  // Calculate due date
  const { dueDate, timeIntervalDays } = calculateDueDateLocal(statusDate, measureStatus, tracking1, tracking2);

  const color = getStatusColor(measureStatus, tracking1);
  const isOverdue = dueDate && dueDate < TODAY_UTC && !GRAY_STATUSES.includes(measureStatus) && !PURPLE_STATUSES.includes(measureStatus);
  const displayColor = isOverdue ? 'RED (overdue)' : color;

  return {
    requestType,
    qualityMeasure,
    measureStatus,
    statusDate,
    tracking1,
    tracking2,
    notes: `Color: ${displayColor} | Status: ${measureStatus}${tracking1 ? ` | T1: ${tracking1}` : ''}${tracking2 ? ` | T2: ${tracking2}` : ''}${dueDate ? ` | Due: ${dueDate.toISOString().slice(0, 10)}` : ''}${timeIntervalDays ? ` | Interval: ${timeIntervalDays}d` : ''}`,
    hgba1cGoal,
    hgba1cGoalReachedYear,
    hgba1cDeclined,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Generate all measure combinations we want coverage for
// ──────────────────────────────────────────────────────────────────────────────

function generateAllMeasureCombinations(): MeasureConfig[] {
  const measures: MeasureConfig[] = [];

  // Phase 1: One measure per (qualityMeasure, status) for exhaustive coverage
  for (const [requestType, qualityMeasures] of Object.entries(REQUEST_TYPE_TO_QUALITY_MEASURE)) {
    for (const qualityMeasure of qualityMeasures) {
      const statuses = QUALITY_MEASURE_TO_STATUS[qualityMeasure] || [];
      for (const status of statuses) {
        measures.push(buildMeasure(requestType, qualityMeasure, status, 'normal'));
      }
    }
  }

  // Phase 2: Extra measures for tracking1 coverage (each dropdown option)
  // Colon cancer screening ordered — all test types
  for (const t1 of ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT']) {
    const m = buildMeasure('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
    m.tracking1 = t1;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
    m.notes = `Color: blue | Colon ordered: ${t1} | Due: ${dueDate?.toISOString().slice(0, 10)} | Interval: ${timeIntervalDays}d`;
    measures.push(m);
  }

  // Breast cancer screening ordered — all test types
  for (const t1 of ['Mammogram', 'Breast Ultrasound', 'Breast MRI']) {
    const m = buildMeasure('Screening', 'Breast Cancer Screening', 'Screening test ordered');
    m.tracking1 = t1;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
    m.notes = `Color: blue | Breast ordered: ${t1} | Due: ${dueDate?.toISOString().slice(0, 10)} | Interval: ${timeIntervalDays}d`;
    measures.push(m);
  }

  // Hypertension BP not at goal — several call intervals
  for (const t1 of ['Call every 1 wk', 'Call every 2 wks', 'Call every 4 wks', 'Call every 8 wks']) {
    const m = buildMeasure('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
    m.tracking1 = t1;
    m.tracking2 = `${randInt(140, 175)}/${randInt(88, 105)}`;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
    m.notes = `Color: blue | BP callback: ${t1} | BP: ${m.tracking2} | Due: ${dueDate?.toISOString().slice(0, 10)}`;
    measures.push(m);
  }

  // Hypertension BP at goal — several call intervals
  for (const t1 of ['Call every 2 wks', 'Call every 6 wks']) {
    const m = buildMeasure('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
    m.tracking1 = t1;
    m.tracking2 = `${randInt(112, 132)}/${randInt(68, 82)}`;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
    m.notes = `Color: blue | BP at goal callback: ${t1} | BP: ${m.tracking2} | Due: ${dueDate?.toISOString().slice(0, 10)}`;
    measures.push(m);
  }

  // Screening discussed — several month intervals
  for (const t1 of ['In 1 Month', 'In 3 Months', 'In 6 Months', 'In 9 Months', 'In 11 Months']) {
    const m = buildMeasure('Screening', 'Cervical Cancer Screening', 'Screening discussed');
    m.tracking1 = t1;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
    m.notes = `Color: yellow | Screening discussed: ${t1} | Due: ${dueDate?.toISOString().slice(0, 10)}`;
    measures.push(m);
  }

  // Chronic DX — attestation variations
  for (const status of ['Chronic diagnosis resolved', 'Chronic diagnosis invalid']) {
    for (const t1 of ['Attestation not sent', 'Attestation sent']) {
      const m = buildMeasure('Chronic DX', 'Chronic Diagnosis Code', status);
      m.tracking1 = t1;
      const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, t1, null);
      const color = t1 === 'Attestation sent' ? 'green (attestation sent)' : 'orange';
      m.notes = `Color: ${color} | ${status}: ${t1} | Due: ${dueDate?.toISOString().slice(0, 10) ?? 'none'}`;
      measures.push(m);
    }
  }

  // HgbA1c — all tracking2 intervals
  for (const t2 of HGBA1C_TRACKING2) {
    const m = buildMeasure('Quality', 'Diabetes Control', 'HgbA1c at goal');
    m.tracking1 = `${(5.5 + rand() * 1.3).toFixed(1)}`;
    m.tracking2 = t2;
    m.hgba1cGoal = pick(HGBA1C_GOALS);
    m.hgba1cGoalReachedYear = rand() > 0.5;
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, m.tracking1, t2);
    m.notes = `Color: green | HgbA1c at goal: ${m.tracking1} | Retest: ${t2} | Due: ${dueDate?.toISOString().slice(0, 10)}`;
    measures.push(m);
  }

  for (const t2 of ['3 months', '6 months']) {
    const m = buildMeasure('Quality', 'Diabetes Control', 'HgbA1c NOT at goal');
    m.tracking1 = `${(8.0 + rand() * 3.0).toFixed(1)}`;
    m.tracking2 = t2;
    m.hgba1cGoal = pick(HGBA1C_GOALS);
    const { dueDate, timeIntervalDays } = calculateDueDateLocal(m.statusDate, m.measureStatus, m.tracking1, t2);
    m.notes = `Color: blue | HgbA1c NOT at goal: ${m.tracking1} | Retest: ${t2} | Due: ${dueDate?.toISOString().slice(0, 10)}`;
    measures.push(m);
  }

  // Phase 3: Overdue measures (various types)
  const overdueConfigs: Array<{ rt: string; qm: string; ms: string }> = [
    { rt: 'AWV', qm: 'Annual Wellness Visit', ms: 'Patient called to schedule AWV' },
    { rt: 'AWV', qm: 'Annual Wellness Visit', ms: 'Will call later to schedule' },
    { rt: 'Screening', qm: 'Breast Cancer Screening', ms: 'Screening test ordered' },
    { rt: 'Screening', qm: 'Colon Cancer Screening', ms: 'Colon cancer screening ordered' },
    { rt: 'Quality', qm: 'Diabetic Eye Exam', ms: 'Diabetic eye exam discussed' },
    { rt: 'Quality', qm: 'Diabetic Eye Exam', ms: 'Obtaining outside records' },
    { rt: 'Quality', qm: 'GC/Chlamydia Screening', ms: 'Test ordered' },
    { rt: 'Quality', qm: 'Diabetic Nephropathy', ms: 'Urine microalbumin ordered' },
    { rt: 'Quality', qm: 'Vaccination', ms: 'Vaccination discussed' },
    { rt: 'Quality', qm: 'Vaccination', ms: 'Vaccination scheduled' },
    { rt: 'Quality', qm: 'ACE/ARB in DM or CAD', ms: 'ACE/ARB prescribed' },
    { rt: 'Quality', qm: 'Annual Serum K&Cr', ms: 'Lab ordered' },
    { rt: 'Chronic DX', qm: 'Chronic Diagnosis Code', ms: 'Chronic diagnosis resolved' },
  ];
  for (const oc of overdueConfigs) {
    const m = buildMeasure(oc.rt, oc.qm, oc.ms, 'overdue');
    // For chronic DX overdue, force "Attestation not sent"
    if (oc.ms === 'Chronic diagnosis resolved') {
      m.tracking1 = 'Attestation not sent';
    }
    measures.push(m);
  }

  // Phase 4: Completed measures with passed annual due date (shows red for renewal)
  const completedOverdueConfigs: Array<{ rt: string; qm: string; ms: string }> = [
    { rt: 'AWV', qm: 'Annual Wellness Visit', ms: 'AWV completed' },
    { rt: 'Quality', qm: 'Diabetic Eye Exam', ms: 'Diabetic eye exam completed' },
    { rt: 'Screening', qm: 'Colon Cancer Screening', ms: 'Colon cancer screening completed' },
    { rt: 'Screening', qm: 'Breast Cancer Screening', ms: 'Screening test completed' },
    { rt: 'Quality', qm: 'GC/Chlamydia Screening', ms: 'GC/Clamydia screening completed' },
    { rt: 'Quality', qm: 'Vaccination', ms: 'Vaccination completed' },
    { rt: 'Quality', qm: 'Annual Serum K&Cr', ms: 'Lab completed' },
    { rt: 'Chronic DX', qm: 'Chronic Diagnosis Code', ms: 'Chronic diagnosis confirmed' },
  ];
  for (const coc of completedOverdueConfigs) {
    measures.push(buildMeasure(coc.rt, coc.qm, coc.ms, 'completed-overdue'));
  }

  return measures;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main seed function
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== seed-200.ts: Seeding 200 unassigned patients ===\n');

  // Build all desired measures
  const allMeasures = generateAllMeasureCombinations();
  console.log(`Generated ${allMeasures.length} measure configurations\n`);

  // Generate 200 unique patient identities
  // We need names that won't collide with the existing seed data
  // (existing seed uses "LastName, FirstName" format too)
  const usedNames = new Set<string>();
  interface PatientIdentity {
    name: string;
    dob: Date;
    phone: string;
    address: string;
  }

  const patientIdentities: PatientIdentity[] = [];

  // Use a prefix "Seed-" to avoid collision with existing seed patients
  let nameAttempts = 0;
  while (patientIdentities.length < 200 && nameAttempts < 2000) {
    nameAttempts++;
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    const name = `${last}, ${first}`;
    const dob = generateDob();
    const key = `${name}|${dob.toISOString().slice(0, 10)}`;

    if (usedNames.has(key)) continue;
    usedNames.add(key);

    patientIdentities.push({
      name,
      dob,
      phone: generatePhone(),
      address: generateAddress(),
    });
  }

  // If we didn't get 200 unique combos, fill remaining with numbered names
  let suffix = 1;
  while (patientIdentities.length < 200) {
    const name = `TestPatient-${suffix}, Seed`;
    const dob = generateDob();
    const key = `${name}|${dob.toISOString().slice(0, 10)}`;
    if (!usedNames.has(key)) {
      usedNames.add(key);
      patientIdentities.push({ name, dob, phone: generatePhone(), address: generateAddress() });
    }
    suffix++;
  }

  console.log(`Generated ${patientIdentities.length} unique patient identities\n`);

  // Distribute measures across patients
  // Strategy: assign measures round-robin, then add extras so each patient has 1-5 measures
  // First, we want to ensure all measure combinations are used at least once

  // Build assignment: patientIndex -> list of MeasureConfig
  const assignments: MeasureConfig[][] = Array.from({ length: 200 }, () => []);

  // Round-robin assignment of all generated measures
  let patientIdx = 0;
  for (const measure of allMeasures) {
    assignments[patientIdx].push(measure);
    patientIdx = (patientIdx + 1) % 200;
  }

  // Ensure every patient has at least 1 measure (fill empties with random picks)
  for (let i = 0; i < 200; i++) {
    if (assignments[i].length === 0) {
      // Pick a random requestType and generate a measure
      const rt = pick(Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE));
      const qm = pick(REQUEST_TYPE_TO_QUALITY_MEASURE[rt]);
      const statuses = QUALITY_MEASURE_TO_STATUS[qm] || ['Not Addressed'];
      const ms = pick(statuses);
      assignments[i].push(buildMeasure(rt, qm, ms));
    }
  }

  // Cap patients at 5 measures max (shouldn't exceed given the distribution)
  for (let i = 0; i < 200; i++) {
    if (assignments[i].length > 5) {
      assignments[i] = assignments[i].slice(0, 5);
    }
  }

  // Create 10 deliberate duplicate patients (same name+dob, extra measures)
  // We'll pick patients 0-9 and create a duplicate record for patients 190-199
  const DUPLICATE_COUNT = 10;
  for (let i = 0; i < DUPLICATE_COUNT; i++) {
    const sourceIdx = i;
    const dupeIdx = 190 + i;
    // Make the duplicate use the same name + dob
    patientIdentities[dupeIdx] = {
      ...patientIdentities[sourceIdx],
      // same name + dob but different phone/address
      phone: generatePhone(),
      address: generateAddress(),
    };
    // Give the duplicate a different set of measures
    const rt = pick(Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE));
    const qm = pick(REQUEST_TYPE_TO_QUALITY_MEASURE[rt]);
    const statuses = QUALITY_MEASURE_TO_STATUS[qm] || ['Not Addressed'];
    const ms = pick(statuses);
    // Replace existing assignments for the dupe slot
    assignments[dupeIdx] = [buildMeasure(rt, qm, ms)];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Insert into database
  // ──────────────────────────────────────────────────────────────────────────

  // Get the current max rowOrder so we don't collide
  const maxRowOrderResult = await prisma.patientMeasure.aggregate({
    _max: { rowOrder: true },
  });
  let rowOrder = (maxRowOrderResult._max.rowOrder ?? 0) + 1;

  // Track created patients for duplicate detection
  const createdPatients = new Map<string, number>(); // key -> patientId
  const patientMeasureCounts = new Map<number, number>(); // patientId -> measure count

  let patientsCreated = 0;
  let measuresCreated = 0;
  let duplicatePatients = 0;

  for (let i = 0; i < 200; i++) {
    const identity = patientIdentities[i];
    const key = `${identity.name}|${identity.dob.toISOString().slice(0, 10)}`;

    let patientId: number;
    let isNewPatient = false;

    // Check if this is a duplicate within our seed data
    if (createdPatients.has(key)) {
      patientId = createdPatients.get(key)!;
      duplicatePatients++;
    } else {
      // Try to upsert (in case existing data has same name+dob)
      try {
        const patient = await prisma.patient.upsert({
          where: {
            memberName_memberDob: {
              memberName: identity.name,
              memberDob: identity.dob,
            },
          },
          update: {}, // Don't overwrite existing data
          create: {
            memberName: identity.name,
            memberDob: identity.dob,
            memberTelephone: identity.phone,
            memberAddress: identity.address,
            ownerId: null,
          },
        });
        patientId = patient.id;
        isNewPatient = true;
        patientsCreated++;
      } catch (e: any) {
        // If unique constraint violation, find existing
        const existing = await prisma.patient.findFirst({
          where: {
            memberName: identity.name,
            memberDob: identity.dob,
          },
        });
        if (existing) {
          patientId = existing.id;
          duplicatePatients++;
        } else {
          console.error(`  Failed to create patient ${identity.name}: ${e.message}`);
          continue;
        }
      }
      createdPatients.set(key, patientId);
    }

    // Check existing measure count for this patient
    if (!patientMeasureCounts.has(patientId)) {
      const existingCount = await prisma.patientMeasure.count({
        where: { patientId },
      });
      patientMeasureCounts.set(patientId, existingCount);
    }

    const measures = assignments[i];
    for (const measure of measures) {
      const currentCount = patientMeasureCounts.get(patientId) || 0;
      const isDuplicate = currentCount > 0;

      // Calculate due date
      const { dueDate, timeIntervalDays } = calculateDueDateLocal(
        measure.statusDate,
        measure.measureStatus,
        measure.tracking1,
        measure.tracking2
      );

      await prisma.patientMeasure.create({
        data: {
          patientId,
          requestType: measure.requestType,
          qualityMeasure: measure.qualityMeasure,
          measureStatus: measure.measureStatus,
          statusDate: measure.statusDate,
          tracking1: measure.tracking1,
          tracking2: measure.tracking2,
          dueDate,
          timeIntervalDays,
          notes: measure.notes,
          rowOrder: rowOrder++,
          isDuplicate,
          hgba1cGoal: measure.hgba1cGoal,
          hgba1cGoalReachedYear: measure.hgba1cGoalReachedYear,
          hgba1cDeclined: measure.hgba1cDeclined,
        },
      });

      patientMeasureCounts.set(patientId, currentCount + 1);
      measuresCreated++;
    }

    // If this patient now has >1 measure, mark all measures as duplicate
    const finalCount = patientMeasureCounts.get(patientId) || 0;
    if (finalCount > 1) {
      await prisma.patientMeasure.updateMany({
        where: { patientId },
        data: { isDuplicate: true },
      });
    }

    // Log progress every 20 patients
    if ((i + 1) % 20 === 0) {
      console.log(`  Progress: ${i + 1}/200 patients processed (${measuresCreated} measures so far)`);
    }
  }

  console.log(`\n=== Seed Complete ===`);
  console.log(`  Patients created/reused: ${patientsCreated} new, ${duplicatePatients} duplicates`);
  console.log(`  Measures created: ${measuresCreated}`);
  console.log(`  Row order range: ${(maxRowOrderResult._max.rowOrder ?? 0) + 1} - ${rowOrder - 1}`);

  // Summary of color coverage
  const colorCounts: Record<string, number> = {};
  for (const assignments_i of assignments) {
    for (const m of assignments_i) {
      const color = getStatusColor(m.measureStatus, m.tracking1);
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  console.log(`\n  Color coverage:`);
  for (const [color, count] of Object.entries(colorCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${color}: ${count} measures`);
  }

  // Count overdue
  let overdueCount = 0;
  for (const assignments_i of assignments) {
    for (const m of assignments_i) {
      const { dueDate } = calculateDueDateLocal(m.statusDate, m.measureStatus, m.tracking1, m.tracking2);
      if (dueDate && dueDate < TODAY_UTC &&
          !GRAY_STATUSES.includes(m.measureStatus) &&
          !PURPLE_STATUSES.includes(m.measureStatus) &&
          !(ORANGE_STATUSES.includes(m.measureStatus) && m.tracking1 === 'Attestation sent')) {
        overdueCount++;
      }
    }
  }
  console.log(`\n  Overdue measures: ${overdueCount}`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
