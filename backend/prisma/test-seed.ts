import { PrismaClient } from '@prisma/client';
import { calculateDueDate } from '../src/services/dueDateCalculator.js';

const prisma = new PrismaClient();

// Complete dropdown configuration
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

const STATUS_TO_TRACKING1: Record<string, string[]> = {
  'Colon cancer screening ordered': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Colon cancer screening completed': ['Colonoscopy', 'Sigmoidoscopy', 'Cologuard', 'FOBT'],
  'Screening test ordered': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Screening test completed': ['Mammogram', 'Breast Ultrasound', 'Breast MRI'],
  'Scheduled call back - BP not at goal': [
    'Call every 1 wk',
    'Call every 2 wks',
    'Call every 3 wks',
    'Call every 4 wks',
    'Call every 5 wks',
    'Call every 6 wks',
    'Call every 7 wks',
    'Call every 8 wks',
  ],
  'Scheduled call back - BP at goal': [
    'Call every 1 wk',
    'Call every 2 wks',
    'Call every 3 wks',
    'Call every 4 wks',
    'Call every 5 wks',
    'Call every 6 wks',
    'Call every 7 wks',
    'Call every 8 wks',
  ],
  'Chronic diagnosis resolved': ['Attestation not sent', 'Attestation sent'],
  'Chronic diagnosis invalid': ['Attestation not sent', 'Attestation sent'],
  'Screening discussed': [
    'In 1 Month',
    'In 2 Months',
    'In 3 Months',
    'In 4 Months',
    'In 5 Months',
    'In 6 Months',
    'In 7 Months',
    'In 8 Months',
    'In 9 Months',
    'In 10 Months',
    'In 11 Months',
  ],
};

// HgbA1c tracking2 options
const HGBA1C_TRACKING2_OPTIONS = [
  '1 month', '2 months', '3 months', '4 months', '5 months', '6 months',
  '7 months', '8 months', '9 months', '10 months', '11 months', '12 months',
];

// Statuses where interval is controlled by TIME PERIOD dropdown (NOT manually editable)
// These have dropdowns like "In X Months", "X months", "Call every X wks"
// Test type dropdowns (Mammogram, Colonoscopy, etc.) are NOT included - those have editable intervals
const TIME_PERIOD_DROPDOWN_STATUSES = [
  'Screening discussed',           // Tracking #1: In 1-11 Months
  'HgbA1c at goal',                // Tracking #2: 1-12 months
  'HgbA1c NOT at goal',            // Tracking #2: 1-12 months
  'Scheduled call back - BP not at goal',  // Tracking #1: Call every 1-8 wks
  'Scheduled call back - BP at goal',      // Tracking #1: Call every 1-8 wks
];

async function main() {
  console.log('Creating COMPLETE test data for all combinations...\n');

  // Create test patient
  const patient = await prisma.patient.upsert({
    where: { memberName_memberDob: { memberName: 'Test All Combos', memberDob: new Date('1970-01-01') } },
    update: {},
    create: {
      memberName: 'Test All Combos',
      memberDob: new Date('1970-01-01'),
      memberTelephone: '5551234567',
      memberAddress: '123 Test St',
    },
  });

  // Delete existing test data
  await prisma.patientMeasure.deleteMany({
    where: { patientId: patient.id },
  });

  const statusDate = new Date('2026-01-09T12:00:00Z');
  let rowOrder = 1;
  let createdCount = 0;

  console.log('Request Type | Quality Measure | Status | Tracking1 | Tracking2 | Interval | Editable?');
  console.log('-'.repeat(120));

  // Iterate through all combinations
  for (const [requestType, qualityMeasures] of Object.entries(REQUEST_TYPE_TO_QUALITY_MEASURE)) {
    for (const qualityMeasure of qualityMeasures) {
      const statuses = QUALITY_MEASURE_TO_STATUS[qualityMeasure] || [];

      for (const measureStatus of statuses) {
        // Get tracking1 options for this status
        const tracking1Options = STATUS_TO_TRACKING1[measureStatus];

        // Check if this is HgbA1c status (uses tracking2)
        const isHgba1cStatus = ['HgbA1c at goal', 'HgbA1c NOT at goal'].includes(measureStatus);

        if (tracking1Options && tracking1Options.length > 0) {
          // Create one row for each tracking1 option
          for (const tracking1 of tracking1Options) {
            const { dueDate, timeIntervalDays } = await calculateDueDate(
              statusDate, measureStatus, tracking1, null
            );

            await prisma.patientMeasure.create({
              data: {
                patientId: patient.id,
                requestType,
                qualityMeasure,
                measureStatus,
                statusDate,
                tracking1,
                tracking2: null,
                dueDate,
                timeIntervalDays,
                rowOrder: rowOrder++,
              },
            });

            const isEditable = !TIME_PERIOD_DROPDOWN_STATUSES.includes(measureStatus);
            console.log(`${requestType.padEnd(12)} | ${qualityMeasure.padEnd(25)} | ${measureStatus.padEnd(35)} | ${(tracking1 || '-').padEnd(20)} | ${'-'.padEnd(10)} | ${String(timeIntervalDays ?? 'null').padEnd(8)} | ${isEditable ? 'YES' : 'NO'}`);
            createdCount++;
          }
        } else if (isHgba1cStatus) {
          // Create rows for HgbA1c with tracking2 options (just a few samples)
          const sampleTracking2 = ['3 months', '6 months', '12 months'];
          for (const tracking2 of sampleTracking2) {
            const { dueDate, timeIntervalDays } = await calculateDueDate(
              statusDate, measureStatus, '7.5', tracking2
            );

            await prisma.patientMeasure.create({
              data: {
                patientId: patient.id,
                requestType,
                qualityMeasure,
                measureStatus,
                statusDate,
                tracking1: '7.5', // HgbA1c value
                tracking2,
                dueDate,
                timeIntervalDays,
                rowOrder: rowOrder++,
              },
            });

            console.log(`${requestType.padEnd(12)} | ${qualityMeasure.padEnd(25)} | ${measureStatus.padEnd(35)} | ${'7.5'.padEnd(20)} | ${tracking2.padEnd(10)} | ${String(timeIntervalDays ?? 'null').padEnd(8)} | NO`);
            createdCount++;
          }
        } else {
          // No tracking options - create single row
          const { dueDate, timeIntervalDays } = await calculateDueDate(
            statusDate, measureStatus, null, null
          );

          await prisma.patientMeasure.create({
            data: {
              patientId: patient.id,
              requestType,
              qualityMeasure,
              measureStatus,
              statusDate,
              tracking1: null,
              tracking2: null,
              dueDate,
              timeIntervalDays,
              rowOrder: rowOrder++,
            },
          });

          const isEditable = timeIntervalDays !== null && !TIME_PERIOD_DROPDOWN_STATUSES.includes(measureStatus);
          console.log(`${requestType.padEnd(12)} | ${qualityMeasure.padEnd(25)} | ${measureStatus.padEnd(35)} | ${'-'.padEnd(20)} | ${'-'.padEnd(10)} | ${String(timeIntervalDays ?? 'null').padEnd(8)} | ${isEditable ? 'YES' : 'NO'}`);
          createdCount++;
        }
      }
    }
  }

  console.log('-'.repeat(120));
  console.log(`\nTotal rows created: ${createdCount}`);
  console.log('\nRefresh your browser to see all test data.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
