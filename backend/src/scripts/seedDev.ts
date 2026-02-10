/**
 * seedDev.ts — Local dev seed: 6 users + ~200 patients with diverse measures.
 *
 * Triple guard:
 *   1. DEV_SEED env must be 'true'          (entrypoint gate)
 *   2. NODE_ENV must be 'development'        (script-level gate)
 *   3. User count must be ≤ 1               (already-seeded gate)
 *
 * Compiled to dist/scripts/seedDev.js and invoked by docker-entrypoint.sh.
 * Can also be run manually: cd backend && npx tsx src/scripts/seedDev.ts
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────────
// Triple Guard
// ──────────────────────────────────────────────────────────────────────────────

function checkGuards(): boolean {
  // Guard 1: DEV_SEED env
  if (process.env.DEV_SEED !== 'true') {
    console.log('[dev-seed] Guard 1: DEV_SEED is not "true" — skipping.');
    return false;
  }

  // Guard 2: NODE_ENV
  if (process.env.NODE_ENV !== 'development') {
    console.log(`[dev-seed] Guard 2: NODE_ENV is "${process.env.NODE_ENV}" (not "development") — skipping.`);
    return false;
  }

  console.log('[dev-seed] Guards 1 & 2 passed (DEV_SEED=true, NODE_ENV=development).');
  return true;
}

async function checkAlreadySeeded(): Promise<boolean> {
  const userCount = await prisma.user.count();
  if (userCount > 1) {
    console.log(`[dev-seed] Guard 3: ${userCount} users already exist — skipping (already seeded).`);
    return true;
  }
  console.log(`[dev-seed] Guard 3 passed (${userCount} user(s) found — needs seeding).`);
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────
// User definitions
// ──────────────────────────────────────────────────────────────────────────────

const PASSWORD = 'welcome100';
const BCRYPT_ROUNDS = 10; // Fast rounds for dev seed

interface UserDef {
  email: string;
  displayName: string;
  roles: ('ADMIN' | 'PHYSICIAN' | 'STAFF')[];
}

const USERS: UserDef[] = [
  { email: 'admin@gmail.com',       displayName: 'Admin User',      roles: ['ADMIN'] },
  { email: 'ko037291@gmail.com',    displayName: 'Ko Admin-Phy',    roles: ['ADMIN', 'PHYSICIAN'] },
  { email: 'phy1@gmail.com',        displayName: 'Physician One',   roles: ['PHYSICIAN'] },
  { email: 'joyhe1234@gmail.com',   displayName: 'Joy He',          roles: ['PHYSICIAN'] },
  { email: 'staff1@gmail.com',      displayName: 'Staff One',       roles: ['STAFF'] },
  { email: 'staff2@gmail.com',      displayName: 'Staff Two',       roles: ['STAFF'] },
];

// Staff → Physician assignments
const STAFF_ASSIGNMENTS: Array<{ staffEmail: string; physicianEmail: string }> = [
  { staffEmail: 'staff1@gmail.com', physicianEmail: 'phy1@gmail.com' },
  { staffEmail: 'staff2@gmail.com', physicianEmail: 'phy1@gmail.com' },
  { staffEmail: 'staff2@gmail.com', physicianEmail: 'joyhe1234@gmail.com' },
  { staffEmail: 'staff2@gmail.com', physicianEmail: 'ko037291@gmail.com' },
];

// Physician emails for patient distribution
const PHYSICIAN_EMAILS = ['phy1@gmail.com', 'joyhe1234@gmail.com', 'ko037291@gmail.com'];

// ──────────────────────────────────────────────────────────────────────────────
// Name / address / phone generators (from seed-200.ts patterns)
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
// Dropdown configuration (mirrors dropdownConfig.ts)
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
    'Not Addressed', 'Patient called to schedule AWV', 'AWV scheduled',
    'AWV completed', 'Patient declined AWV', 'Will call later to schedule', 'No longer applicable',
  ],
  'Diabetic Eye Exam': [
    'Not Addressed', 'Diabetic eye exam discussed', 'Diabetic eye exam referral made',
    'Diabetic eye exam scheduled', 'Diabetic eye exam completed', 'Obtaining outside records',
    'Patient declined', 'No longer applicable',
  ],
  'Colon Cancer Screening': [
    'Not Addressed', 'Screening discussed', 'Colon cancer screening ordered',
    'Colon cancer screening completed', 'Obtaining outside records', 'Patient declined screening',
    'No longer applicable', 'Screening unnecessary',
  ],
  'Breast Cancer Screening': [
    'Not Addressed', 'Screening discussed', 'Screening test ordered',
    'Screening test completed', 'Obtaining outside records', 'Patient declined screening',
    'No longer applicable', 'Screening unnecessary',
  ],
  'Cervical Cancer Screening': [
    'Not Addressed', 'Screening discussed', 'Screening appt made', 'Screening completed',
    'Obtaining outside records', 'Patient declined', 'No longer applicable', 'Screening unnecessary',
  ],
  'GC/Chlamydia Screening': [
    'Not Addressed', 'Patient contacted for screening', 'Test ordered',
    'GC/Clamydia screening completed', 'Patient declined screening', 'No longer applicable',
  ],
  'Diabetic Nephropathy': [
    'Not Addressed', 'Patient contacted for screening', 'Urine microalbumin ordered',
    'Urine microalbumin completed', 'Patient declined screening', 'No longer applicable',
  ],
  'Hypertension Management': [
    'Not Addressed', 'Blood pressure at goal', 'Scheduled call back - BP not at goal',
    'Scheduled call back - BP at goal', 'Appointment scheduled', 'Declined BP control', 'No longer applicable',
  ],
  'ACE/ARB in DM or CAD': [
    'Not Addressed', 'Patient on ACE/ARB', 'ACE/ARB prescribed',
    'Patient declined', 'Contraindicated', 'No longer applicable',
  ],
  'Vaccination': [
    'Not Addressed', 'Vaccination discussed', 'Vaccination scheduled',
    'Vaccination completed', 'Patient declined', 'No longer applicable',
  ],
  'Diabetes Control': [
    'Not Addressed', 'HgbA1c ordered', 'HgbA1c at goal',
    'HgbA1c NOT at goal', 'Patient declined', 'No longer applicable',
  ],
  'Annual Serum K&Cr': [
    'Not Addressed', 'Lab ordered', 'Lab completed',
    'Patient declined', 'No longer applicable',
  ],
  'Chronic Diagnosis Code': [
    'Not Addressed', 'Chronic diagnosis confirmed', 'Chronic diagnosis resolved',
    'Chronic diagnosis invalid', 'No longer applicable',
  ],
};

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

const BASE_DUE_DAYS: Record<string, number | null> = {
  'Not Addressed': null,
  'Patient called to schedule AWV': 7, 'AWV scheduled': 1, 'AWV completed': 365,
  'Patient declined AWV': null, 'Will call later to schedule': 30,
  'Screening discussed': 30, 'Screening test ordered': 14, 'Screening test completed': 365,
  'Patient declined screening': null, 'Screening unnecessary': null,
  'Colon cancer screening ordered': 42, 'Colon cancer screening completed': 365,
  'Screening appt made': 1, 'Screening completed': 365,
  'Diabetic eye exam discussed': 42, 'Diabetic eye exam referral made': 42,
  'Diabetic eye exam scheduled': 1, 'Diabetic eye exam completed': 365,
  'Obtaining outside records': 14,
  'Patient contacted for screening': 10, 'Test ordered': 5, 'GC/Clamydia screening completed': 365,
  'Urine microalbumin ordered': 5, 'Urine microalbumin completed': 365,
  'Blood pressure at goal': null, 'Scheduled call back - BP not at goal': 7,
  'Scheduled call back - BP at goal': 7, 'Appointment scheduled': 1, 'Declined BP control': null,
  'Patient on ACE/ARB': null, 'ACE/ARB prescribed': 14,
  'Patient declined': null, 'Contraindicated': null,
  'Vaccination discussed': 7, 'Vaccination scheduled': 1, 'Vaccination completed': 365,
  'HgbA1c ordered': null, 'HgbA1c at goal': null, 'HgbA1c NOT at goal': null,
  'Lab ordered': 7, 'Lab completed': 365,
  'Chronic diagnosis confirmed': 365, 'Chronic diagnosis resolved': null,
  'Chronic diagnosis invalid': null, 'No longer applicable': null,
};

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

const HGBA1C_TRACKING2 = ['3 months', '6 months', '9 months', '12 months'];
const HGBA1C_GOALS = ['less_than_7', 'less_than_8', 'less_than_9'];

// ──────────────────────────────────────────────────────────────────────────────
// Due date calculation (same logic as dueDateCalculator.ts)
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
  tracking3: string | null;
  notes: string | null;
  hgba1cGoal: string | null;
  hgba1cGoalReachedYear: boolean;
  hgba1cDeclined: boolean;
}

function buildMeasure(
  requestType: string,
  qualityMeasure: string,
  measureStatus: string,
  intent: 'normal' | 'overdue' | 'completed-overdue' = 'normal'
): MeasureConfig {
  let statusDate: Date | null = null;
  let tracking1: string | null = null;
  let tracking2: string | null = null;
  const tracking3: string | null = null;
  let hgba1cGoal: string | null = null;
  let hgba1cGoalReachedYear = false;
  const hgba1cDeclined = false;

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
      if (measureStatus === 'HgbA1c at goal') {
        tracking1 = `${(5.5 + rand() * 1.5).toFixed(1)}`;
      } else {
        tracking1 = `${(8.0 + rand() * 3.0).toFixed(1)}`;
      }
    }
    hgba1cGoal = pick(HGBA1C_GOALS);
    hgba1cGoalReachedYear = measureStatus === 'HgbA1c at goal' && rand() > 0.5;
  }

  // Hypertension: tracking2 = BP reading
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
    const baseDays = BASE_DUE_DAYS[measureStatus] ?? 30;
    const extraDays = baseDays !== null ? baseDays + randInt(5, 30) : randInt(40, 90);
    statusDate = daysAgo(extraDays);
  } else if (intent === 'completed-overdue') {
    statusDate = daysAgo(randInt(370, 500));
  } else {
    if (['AWV scheduled', 'Appointment scheduled', 'Vaccination scheduled',
         'Screening appt made', 'Diabetic eye exam scheduled'].includes(measureStatus)) {
      statusDate = daysFromNow(randInt(1, 30));
    } else {
      statusDate = daysAgo(randInt(1, 90));
    }
  }

  // Build notes
  const { dueDate } = calculateDueDateLocal(statusDate, measureStatus, tracking1, tracking2);
  const notesParts = [`Status: ${measureStatus}`];
  if (tracking1) notesParts.push(`T1: ${tracking1}`);
  if (tracking2) notesParts.push(`T2: ${tracking2}`);
  if (dueDate) notesParts.push(`Due: ${dueDate.toISOString().slice(0, 10)}`);

  return {
    requestType, qualityMeasure, measureStatus, statusDate,
    tracking1, tracking2, tracking3,
    notes: notesParts.join(' | '),
    hgba1cGoal, hgba1cGoalReachedYear, hgba1cDeclined,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Generate measure combinations for coverage
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

  // Phase 2: Tracking1 coverage extras
  for (const t1 of ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT']) {
    const m = buildMeasure('Screening', 'Colon Cancer Screening', 'Colon cancer screening ordered');
    m.tracking1 = t1;
    measures.push(m);
  }
  for (const t1 of ['Mammogram', 'Breast Ultrasound', 'Breast MRI']) {
    const m = buildMeasure('Screening', 'Breast Cancer Screening', 'Screening test ordered');
    m.tracking1 = t1;
    measures.push(m);
  }
  for (const t1 of ['Call every 1 wk', 'Call every 2 wks', 'Call every 4 wks', 'Call every 8 wks']) {
    const m = buildMeasure('Quality', 'Hypertension Management', 'Scheduled call back - BP not at goal');
    m.tracking1 = t1;
    m.tracking2 = `${randInt(140, 175)}/${randInt(88, 105)}`;
    measures.push(m);
  }
  for (const t1 of ['Call every 2 wks', 'Call every 6 wks']) {
    const m = buildMeasure('Quality', 'Hypertension Management', 'Scheduled call back - BP at goal');
    m.tracking1 = t1;
    m.tracking2 = `${randInt(112, 132)}/${randInt(68, 82)}`;
    measures.push(m);
  }
  for (const t1 of ['In 1 Month', 'In 3 Months', 'In 6 Months', 'In 9 Months', 'In 11 Months']) {
    const m = buildMeasure('Screening', 'Cervical Cancer Screening', 'Screening discussed');
    m.tracking1 = t1;
    measures.push(m);
  }
  for (const status of ['Chronic diagnosis resolved', 'Chronic diagnosis invalid'] as const) {
    for (const t1 of ['Attestation not sent', 'Attestation sent']) {
      const m = buildMeasure('Chronic DX', 'Chronic Diagnosis Code', status);
      m.tracking1 = t1;
      measures.push(m);
    }
  }
  for (const t2 of HGBA1C_TRACKING2) {
    const m = buildMeasure('Quality', 'Diabetes Control', 'HgbA1c at goal');
    m.tracking1 = `${(5.5 + rand() * 1.3).toFixed(1)}`;
    m.tracking2 = t2;
    m.hgba1cGoal = pick(HGBA1C_GOALS);
    m.hgba1cGoalReachedYear = rand() > 0.5;
    measures.push(m);
  }
  for (const t2 of ['3 months', '6 months']) {
    const m = buildMeasure('Quality', 'Diabetes Control', 'HgbA1c NOT at goal');
    m.tracking1 = `${(8.0 + rand() * 3.0).toFixed(1)}`;
    m.tracking2 = t2;
    m.hgba1cGoal = pick(HGBA1C_GOALS);
    measures.push(m);
  }

  // Phase 3: Overdue measures
  const overdueConfigs = [
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
    if (oc.ms === 'Chronic diagnosis resolved') m.tracking1 = 'Attestation not sent';
    measures.push(m);
  }

  // Phase 4: Completed measures with passed annual due date
  const completedOverdueConfigs = [
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
// Seed users
// ──────────────────────────────────────────────────────────────────────────────

async function seedUsers(): Promise<Map<string, number>> {
  console.log('[dev-seed] Creating users...');
  const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);
  const emailToId = new Map<string, number>();

  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        displayName: u.displayName,
        roles: u.roles,
        isActive: true,
      },
    });
    emailToId.set(u.email, user.id);
    console.log(`  [user] ${u.email} (${u.roles.join(', ')}) → id=${user.id}`);
  }

  return emailToId;
}

// ──────────────────────────────────────────────────────────────────────────────
// Seed staff assignments
// ──────────────────────────────────────────────────────────────────────────────

async function seedStaffAssignments(emailToId: Map<string, number>): Promise<void> {
  console.log('[dev-seed] Creating staff assignments...');

  for (const sa of STAFF_ASSIGNMENTS) {
    const staffId = emailToId.get(sa.staffEmail);
    const physicianId = emailToId.get(sa.physicianEmail);
    if (!staffId || !physicianId) {
      console.log(`  [skip] Missing user for ${sa.staffEmail} → ${sa.physicianEmail}`);
      continue;
    }

    await prisma.staffAssignment.upsert({
      where: {
        staffId_physicianId: { staffId, physicianId },
      },
      update: {},
      create: { staffId, physicianId },
    });
    console.log(`  [assignment] ${sa.staffEmail} → ${sa.physicianEmail}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Seed patients
// ──────────────────────────────────────────────────────────────────────────────

async function seedPatients(emailToId: Map<string, number>): Promise<void> {
  console.log('[dev-seed] Creating ~200 patients with measures...');

  // Get physician IDs for distribution
  const physicianIds = PHYSICIAN_EMAILS.map(e => emailToId.get(e)).filter((id): id is number => id !== undefined);

  // Build all desired measures
  const allMeasures = generateAllMeasureCombinations();
  console.log(`  Generated ${allMeasures.length} measure configurations`);

  // Generate 200 unique patient identities
  const usedNames = new Set<string>();
  interface PatientIdentity {
    name: string;
    dob: Date;
    phone: string;
    address: string;
  }

  const patientIdentities: PatientIdentity[] = [];
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
    patientIdentities.push({ name, dob, phone: generatePhone(), address: generateAddress() });
  }

  // Fill remaining with numbered names
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

  // Distribute measures across patients
  const assignments: MeasureConfig[][] = Array.from({ length: 200 }, () => []);
  let patientIdx = 0;
  for (const measure of allMeasures) {
    assignments[patientIdx].push(measure);
    patientIdx = (patientIdx + 1) % 200;
  }

  // Ensure every patient has at least 1 measure
  for (let i = 0; i < 200; i++) {
    if (assignments[i].length === 0) {
      const rt = pick(Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE));
      const qm = pick(REQUEST_TYPE_TO_QUALITY_MEASURE[rt]);
      const statuses = QUALITY_MEASURE_TO_STATUS[qm] || ['Not Addressed'];
      const ms = pick(statuses);
      assignments[i].push(buildMeasure(rt, qm, ms));
    }
  }

  // Cap at 5 measures per patient
  for (let i = 0; i < 200; i++) {
    if (assignments[i].length > 5) {
      assignments[i] = assignments[i].slice(0, 5);
    }
  }

  // Create 10 deliberate duplicates (same name+dob)
  for (let i = 0; i < 10; i++) {
    patientIdentities[190 + i] = {
      ...patientIdentities[i],
      phone: generatePhone(),
      address: generateAddress(),
    };
    const rt = pick(Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE));
    const qm = pick(REQUEST_TYPE_TO_QUALITY_MEASURE[rt]);
    const statuses = QUALITY_MEASURE_TO_STATUS[qm] || ['Not Addressed'];
    assignments[190 + i] = [buildMeasure(rt, qm, pick(statuses))];
  }

  // Get the current max rowOrder
  const maxRowOrderResult = await prisma.patientMeasure.aggregate({ _max: { rowOrder: true } });
  let rowOrder = (maxRowOrderResult._max.rowOrder ?? 0) + 1;

  const createdPatients = new Map<string, number>();
  const patientMeasureCounts = new Map<number, number>();
  let patientsCreated = 0;
  let measuresCreated = 0;

  for (let i = 0; i < 200; i++) {
    const identity = patientIdentities[i];
    const key = `${identity.name}|${identity.dob.toISOString().slice(0, 10)}`;

    let patientId: number;

    if (createdPatients.has(key)) {
      patientId = createdPatients.get(key)!;
    } else {
      // Assign to physician: distribute roughly evenly, some unassigned
      let ownerId: number | null = null;
      if (i < 180 && physicianIds.length > 0) {
        // First 60% → phy1, next 20% → joyhe, next 10% → ko, last 10% → unassigned
        if (i < 120) ownerId = physicianIds[0];
        else if (i < 160) ownerId = physicianIds[1];
        else if (i < 180) ownerId = physicianIds[2];
      }
      // i >= 180 → unassigned (null)

      const patient = await prisma.patient.upsert({
        where: { memberName_memberDob: { memberName: identity.name, memberDob: identity.dob } },
        update: {},
        create: {
          memberName: identity.name,
          memberDob: identity.dob,
          memberTelephone: identity.phone,
          memberAddress: identity.address,
          ownerId,
        },
      });
      patientId = patient.id;
      createdPatients.set(key, patientId);
      patientsCreated++;
    }

    // Check existing measure count
    if (!patientMeasureCounts.has(patientId)) {
      const existingCount = await prisma.patientMeasure.count({ where: { patientId } });
      patientMeasureCounts.set(patientId, existingCount);
    }

    const measures = assignments[i];
    for (const measure of measures) {
      const currentCount = patientMeasureCounts.get(patientId) || 0;
      const isDuplicate = currentCount > 0;

      const { dueDate, timeIntervalDays } = calculateDueDateLocal(
        measure.statusDate, measure.measureStatus, measure.tracking1, measure.tracking2
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
          tracking3: measure.tracking3,
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

    // Mark as duplicate if >1 measure
    const finalCount = patientMeasureCounts.get(patientId) || 0;
    if (finalCount > 1) {
      await prisma.patientMeasure.updateMany({
        where: { patientId },
        data: { isDuplicate: true },
      });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Progress: ${i + 1}/200 patients (${measuresCreated} measures)`);
    }
  }

  console.log(`  Patients created: ${patientsCreated}, Measures created: ${measuresCreated}`);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[dev-seed] === Local Dev Seed Script ===');

  // Guard 1 & 2: env checks
  if (!checkGuards()) return;

  // Guard 3: already seeded?
  if (await checkAlreadySeeded()) return;

  // Seed users
  const emailToId = await seedUsers();

  // Seed staff assignments
  await seedStaffAssignments(emailToId);

  // Seed patients + measures
  await seedPatients(emailToId);

  console.log('[dev-seed] === Done ===');
}

main()
  .catch((e) => {
    console.error('[dev-seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
