import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // ============================================
  // REQUEST TYPES
  // ============================================
  const requestTypes = await Promise.all([
    prisma.requestType.upsert({
      where: { code: 'AWV' },
      update: {},
      create: {
        code: 'AWV',
        label: 'AWV',
        autoQualityMeasure: 'Annual Wellness Visit',
        sortOrder: 1,
      },
    }),
    prisma.requestType.upsert({
      where: { code: 'Screening' },
      update: {},
      create: {
        code: 'Screening',
        label: 'Screening',
        autoQualityMeasure: null,
        sortOrder: 2,
      },
    }),
    prisma.requestType.upsert({
      where: { code: 'Quality' },
      update: {},
      create: {
        code: 'Quality',
        label: 'Quality',
        autoQualityMeasure: null,
        sortOrder: 3,
      },
    }),
    prisma.requestType.upsert({
      where: { code: 'Chronic DX' },
      update: {},
      create: {
        code: 'Chronic DX',
        label: 'Chronic DX',
        autoQualityMeasure: 'Chronic Diagnosis Code',
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`Created ${requestTypes.length} request types`);

  // Get request type IDs for reference
  const awvType = requestTypes.find(rt => rt.code === 'AWV')!;
  const screeningType = requestTypes.find(rt => rt.code === 'Screening')!;
  const qualityType = requestTypes.find(rt => rt.code === 'Quality')!;
  const chronicDxType = requestTypes.find(rt => rt.code === 'Chronic DX')!;

  // ============================================
  // QUALITY MEASURES
  // ============================================
  const qualityMeasures = await Promise.all([
    // AWV
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: awvType.id, code: 'Annual Wellness Visit' } },
      update: {},
      create: {
        requestTypeId: awvType.id,
        code: 'Annual Wellness Visit',
        label: 'Annual Wellness Visit',
        allowDuplicates: false,
        sortOrder: 1,
      },
    }),

    // Screening
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: screeningType.id, code: 'Breast Cancer Screening' } },
      update: {},
      create: {
        requestTypeId: screeningType.id,
        code: 'Breast Cancer Screening',
        label: 'Breast Cancer Screening',
        allowDuplicates: false,
        sortOrder: 1,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: screeningType.id, code: 'Colon Cancer Screening' } },
      update: {},
      create: {
        requestTypeId: screeningType.id,
        code: 'Colon Cancer Screening',
        label: 'Colon Cancer Screening',
        allowDuplicates: false,
        sortOrder: 2,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: screeningType.id, code: 'Cervical Cancer Screening' } },
      update: {},
      create: {
        requestTypeId: screeningType.id,
        code: 'Cervical Cancer Screening',
        label: 'Cervical Cancer Screening',
        allowDuplicates: false,
        sortOrder: 3,
      },
    }),

    // Quality
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Diabetic Eye Exam' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Diabetic Eye Exam',
        label: 'Diabetic Eye Exam',
        allowDuplicates: false,
        sortOrder: 1,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'GC/Chlamydia Screening' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'GC/Chlamydia Screening',
        label: 'GC/Chlamydia Screening',
        allowDuplicates: false,
        sortOrder: 2,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Diabetic Nephropathy' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Diabetic Nephropathy',
        label: 'Diabetic Nephropathy',
        allowDuplicates: false,
        sortOrder: 3,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Hypertension Management' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Hypertension Management',
        label: 'Hypertension Management',
        allowDuplicates: false,
        sortOrder: 4,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'ACE/ARB in DM or CAD' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'ACE/ARB in DM or CAD',
        label: 'ACE/ARB in DM or CAD',
        allowDuplicates: false,
        sortOrder: 5,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Vaccination' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Vaccination',
        label: 'Vaccination',
        allowDuplicates: true,
        sortOrder: 6,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Diabetes Control' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Diabetes Control',
        label: 'Diabetes Control',
        allowDuplicates: false,
        sortOrder: 7,
      },
    }),
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: qualityType.id, code: 'Annual Serum K&Cr' } },
      update: {},
      create: {
        requestTypeId: qualityType.id,
        code: 'Annual Serum K&Cr',
        label: 'Annual Serum K&Cr',
        allowDuplicates: false,
        sortOrder: 8,
      },
    }),

    // Chronic DX
    prisma.qualityMeasure.upsert({
      where: { requestTypeId_code: { requestTypeId: chronicDxType.id, code: 'Chronic Diagnosis Code' } },
      update: {},
      create: {
        requestTypeId: chronicDxType.id,
        code: 'Chronic Diagnosis Code',
        label: 'Chronic Diagnosis Code',
        allowDuplicates: true,
        sortOrder: 1,
      },
    }),
  ]);

  console.log(`Created ${qualityMeasures.length} quality measures`);

  // ============================================
  // MEASURE STATUSES (for each quality measure)
  // ============================================

  // Get quality measure IDs
  const awvMeasure = qualityMeasures.find(qm => qm.code === 'Annual Wellness Visit')!;
  const breastCancerMeasure = qualityMeasures.find(qm => qm.code === 'Breast Cancer Screening')!;
  const colonCancerMeasure = qualityMeasures.find(qm => qm.code === 'Colon Cancer Screening')!;
  const cervicalCancerMeasure = qualityMeasures.find(qm => qm.code === 'Cervical Cancer Screening')!;
  const diabeticEyeMeasure = qualityMeasures.find(qm => qm.code === 'Diabetic Eye Exam')!;
  const gcChlamydiaMeasure = qualityMeasures.find(qm => qm.code === 'GC/Chlamydia Screening')!;
  const diabeticNephropathyMeasure = qualityMeasures.find(qm => qm.code === 'Diabetic Nephropathy')!;
  const hypertensionMeasure = qualityMeasures.find(qm => qm.code === 'Hypertension Management')!;
  const aceArbMeasure = qualityMeasures.find(qm => qm.code === 'ACE/ARB in DM or CAD')!;
  const vaccinationMeasure = qualityMeasures.find(qm => qm.code === 'Vaccination')!;
  const diabetesControlMeasure = qualityMeasures.find(qm => qm.code === 'Diabetes Control')!;
  const annualSerumMeasure = qualityMeasures.find(qm => qm.code === 'Annual Serum K&Cr')!;
  const chronicDxMeasure = qualityMeasures.find(qm => qm.code === 'Chronic Diagnosis Code')!;

  // Helper function to create statuses for a quality measure
  async function createStatuses(qualityMeasureId: number, statuses: Array<{ code: string; label: string; datePrompt: string | null; baseDueDays: number | null; sortOrder: number }>) {
    for (const status of statuses) {
      await prisma.measureStatus.upsert({
        where: { qualityMeasureId_code: { qualityMeasureId, code: status.code } },
        update: { datePrompt: status.datePrompt, baseDueDays: status.baseDueDays },
        create: { qualityMeasureId, ...status },
      });
    }
  }

  // Annual Wellness Visit statuses
  await createStatuses(awvMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Patient called to schedule AWV', label: 'Patient called to schedule AWV', datePrompt: 'Date Called', baseDueDays: 7, sortOrder: 2 },
    { code: 'AWV scheduled', label: 'AWV scheduled', datePrompt: 'Date Scheduled', baseDueDays: 1, sortOrder: 3 },
    { code: 'AWV completed', label: 'AWV completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Patient declined AWV', label: 'Patient declined AWV', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 5 },
    { code: 'Will call later to schedule', label: 'Will call later to schedule', datePrompt: 'Date Noted', baseDueDays: 30, sortOrder: 6 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
  ]);

  // Breast Cancer Screening statuses
  await createStatuses(breastCancerMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Screening discussed', label: 'Screening discussed', datePrompt: 'Date Discussed', baseDueDays: 30, sortOrder: 2 },
    { code: 'Screening test ordered', label: 'Screening test ordered', datePrompt: 'Date Ordered', baseDueDays: 14, sortOrder: 3 },
    { code: 'Screening test completed', label: 'Screening test completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Obtaining outside records', label: 'Obtaining outside records', datePrompt: 'Date Requested', baseDueDays: 14, sortOrder: 5 },
    { code: 'Patient declined screening', label: 'Patient declined screening', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 6 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
    { code: 'Screening unnecessary', label: 'Screening unnecessary', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 8 },
  ]);

  // Colon Cancer Screening statuses
  await createStatuses(colonCancerMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Screening discussed', label: 'Screening discussed', datePrompt: 'Date Discussed', baseDueDays: 30, sortOrder: 2 },
    { code: 'Colon cancer screening ordered', label: 'Colon cancer screening ordered', datePrompt: 'Date Ordered', baseDueDays: 42, sortOrder: 3 },
    { code: 'Colon cancer screening completed', label: 'Colon cancer screening completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Obtaining outside records', label: 'Obtaining outside records', datePrompt: 'Date Requested', baseDueDays: 14, sortOrder: 5 },
    { code: 'Patient declined screening', label: 'Patient declined screening', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 6 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
    { code: 'Screening unnecessary', label: 'Screening unnecessary', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 8 },
  ]);

  // Cervical Cancer Screening statuses
  await createStatuses(cervicalCancerMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Screening discussed', label: 'Screening discussed', datePrompt: 'Date Discussed', baseDueDays: 30, sortOrder: 2 },
    { code: 'Screening appt made', label: 'Screening appt made', datePrompt: 'Appt Date', baseDueDays: 1, sortOrder: 3 },
    { code: 'Screening completed', label: 'Screening completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Obtaining outside records', label: 'Obtaining outside records', datePrompt: 'Date Requested', baseDueDays: 14, sortOrder: 5 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 6 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
    { code: 'Screening unnecessary', label: 'Screening unnecessary', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 8 },
  ]);

  // Diabetic Eye Exam statuses
  await createStatuses(diabeticEyeMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Diabetic eye exam discussed', label: 'Diabetic eye exam discussed', datePrompt: 'Date Discussed', baseDueDays: 42, sortOrder: 2 },
    { code: 'Diabetic eye exam referral made', label: 'Diabetic eye exam referral made', datePrompt: 'Date Referred', baseDueDays: 42, sortOrder: 3 },
    { code: 'Diabetic eye exam scheduled', label: 'Diabetic eye exam scheduled', datePrompt: 'Appt Date', baseDueDays: 1, sortOrder: 4 },
    { code: 'Diabetic eye exam completed', label: 'Diabetic eye exam completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 5 },
    { code: 'Obtaining outside records', label: 'Obtaining outside records', datePrompt: 'Date Requested', baseDueDays: 14, sortOrder: 6 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 7 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 8 },
  ]);

  // GC/Chlamydia Screening statuses
  await createStatuses(gcChlamydiaMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Patient contacted for screening', label: 'Patient contacted for screening', datePrompt: 'Date Contacted', baseDueDays: 10, sortOrder: 2 },
    { code: 'Test ordered', label: 'Test ordered', datePrompt: 'Date Ordered', baseDueDays: 5, sortOrder: 3 },
    { code: 'GC/Clamydia screening completed', label: 'GC/Chlamydia screening completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Patient declined screening', label: 'Patient declined screening', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 5 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ]);

  // Diabetic Nephropathy statuses
  await createStatuses(diabeticNephropathyMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Patient contacted for screening', label: 'Patient contacted for screening', datePrompt: 'Date Contacted', baseDueDays: 10, sortOrder: 2 },
    { code: 'Urine microalbumin ordered', label: 'Urine microalbumin ordered', datePrompt: 'Date Ordered', baseDueDays: 5, sortOrder: 3 },
    { code: 'Urine microalbumin completed', label: 'Urine microalbumin completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Patient declined screening', label: 'Patient declined screening', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 5 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ]);

  // Hypertension Management statuses
  await createStatuses(hypertensionMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Blood pressure at goal', label: 'Blood pressure at goal', datePrompt: 'Date Checked', baseDueDays: null, sortOrder: 2 },
    { code: 'Scheduled call back - BP not at goal', label: 'Scheduled call back - BP not at goal', datePrompt: 'Date of Call', baseDueDays: 7, sortOrder: 3 },
    { code: 'Scheduled call back - BP at goal', label: 'Scheduled call back - BP at goal', datePrompt: 'Date of Call', baseDueDays: 7, sortOrder: 4 },
    { code: 'Appointment scheduled', label: 'Appointment scheduled', datePrompt: 'Appt Date', baseDueDays: 1, sortOrder: 5 },
    { code: 'Declined BP control', label: 'Declined BP control', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 6 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 7 },
  ]);

  // ACE/ARB in DM or CAD statuses
  await createStatuses(aceArbMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Patient on ACE/ARB', label: 'Patient on ACE/ARB', datePrompt: 'Date Started', baseDueDays: null, sortOrder: 2 },
    { code: 'ACE/ARB prescribed', label: 'ACE/ARB prescribed', datePrompt: 'Date Prescribed', baseDueDays: 14, sortOrder: 3 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 4 },
    { code: 'Contraindicated', label: 'Contraindicated', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 5 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ]);

  // Vaccination statuses
  await createStatuses(vaccinationMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Vaccination discussed', label: 'Vaccination discussed', datePrompt: 'Date Discussed', baseDueDays: 7, sortOrder: 2 },
    { code: 'Vaccination scheduled', label: 'Vaccination scheduled', datePrompt: 'Date Scheduled', baseDueDays: 1, sortOrder: 3 },
    { code: 'Vaccination completed', label: 'Vaccination completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 4 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 5 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ]);

  // Diabetes Control (HgbA1c) statuses
  await createStatuses(diabetesControlMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'HgbA1c ordered', label: 'HgbA1c ordered', datePrompt: 'Date Ordered', baseDueDays: 14, sortOrder: 2 },
    { code: 'HgbA1c at goal', label: 'HgbA1c at goal', datePrompt: 'Test Date', baseDueDays: 90, sortOrder: 3 },
    { code: 'HgbA1c NOT at goal', label: 'HgbA1c NOT at goal', datePrompt: 'Test Date', baseDueDays: 90, sortOrder: 4 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 5 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ]);

  // Annual Serum K&Cr statuses
  await createStatuses(annualSerumMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Lab ordered', label: 'Lab ordered', datePrompt: 'Date Ordered', baseDueDays: 7, sortOrder: 2 },
    { code: 'Lab completed', label: 'Lab completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 3 },
    { code: 'Patient declined', label: 'Patient declined', datePrompt: 'Date Declined', baseDueDays: null, sortOrder: 4 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 5 },
  ]);

  // Chronic Diagnosis Code statuses
  await createStatuses(chronicDxMeasure.id, [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Chronic diagnosis confirmed', label: 'Chronic diagnosis confirmed', datePrompt: 'Date Confirmed', baseDueDays: 365, sortOrder: 2 },
    { code: 'Chronic diagnosis resolved', label: 'Chronic diagnosis resolved', datePrompt: 'Date Resolved', baseDueDays: null, sortOrder: 3 },
    { code: 'Chronic diagnosis invalid', label: 'Chronic diagnosis invalid', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 4 },
    { code: 'No longer applicable', label: 'No longer applicable', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 5 },
  ]);

  console.log('Created measure statuses');

  // ============================================
  // DUE DAY RULES (tracking-specific overrides)
  // ============================================

  // Helper function to create due day rules for a status
  async function createDueDayRules(statusCode: string, rules: Array<{ trackingValue: string; dueDays: number }>) {
    const status = await prisma.measureStatus.findFirst({ where: { code: statusCode } });
    if (status) {
      for (const rule of rules) {
        await prisma.dueDayRule.upsert({
          where: {
            measureStatusId_trackingValue: {
              measureStatusId: status.id,
              trackingValue: rule.trackingValue,
            },
          },
          update: { dueDays: rule.dueDays },
          create: {
            measureStatusId: status.id,
            trackingValue: rule.trackingValue,
            dueDays: rule.dueDays,
          },
        });
      }
    }
  }

  // Screening discussed - month-based countdown (Cervical Cancer)
  // Extended to 11 months per requirements
  await createDueDayRules('Screening discussed', [
    { trackingValue: 'In 1 Month', dueDays: 30 },
    { trackingValue: 'In 2 Months', dueDays: 60 },
    { trackingValue: 'In 3 Months', dueDays: 90 },
    { trackingValue: 'In 4 Months', dueDays: 120 },
    { trackingValue: 'In 5 Months', dueDays: 150 },
    { trackingValue: 'In 6 Months', dueDays: 180 },
    { trackingValue: 'In 7 Months', dueDays: 210 },
    { trackingValue: 'In 8 Months', dueDays: 240 },
    { trackingValue: 'In 9 Months', dueDays: 270 },
    { trackingValue: 'In 10 Months', dueDays: 300 },
    { trackingValue: 'In 11 Months', dueDays: 330 },
  ]);

  // Colon cancer screening ordered - test type dependent
  await createDueDayRules('Colon cancer screening ordered', [
    { trackingValue: 'Colonoscopy', dueDays: 42 },      // 6 weeks
    { trackingValue: 'Sigmoidoscopy', dueDays: 42 },   // 6 weeks
    { trackingValue: 'Cologuard', dueDays: 21 },       // 3 weeks
    { trackingValue: 'FOBT', dueDays: 21 },            // 3 weeks
  ]);

  // Breast cancer screening test ordered - test type dependent
  await createDueDayRules('Screening test ordered', [
    { trackingValue: 'Mammogram', dueDays: 14 },         // 2 weeks
    { trackingValue: 'Breast Ultrasound', dueDays: 14 }, // 2 weeks
    { trackingValue: 'Breast MRI', dueDays: 21 },        // 3 weeks
  ]);

  // Hypertension - scheduled call back (BP not at goal)
  const bpCallbackRules = [
    { trackingValue: 'Call every 1 wk', dueDays: 7 },
    { trackingValue: 'Call every 2 wks', dueDays: 14 },
    { trackingValue: 'Call every 3 wks', dueDays: 21 },
    { trackingValue: 'Call every 4 wks', dueDays: 28 },
    { trackingValue: 'Call every 5 wks', dueDays: 35 },
    { trackingValue: 'Call every 6 wks', dueDays: 42 },
    { trackingValue: 'Call every 7 wks', dueDays: 49 },
    { trackingValue: 'Call every 8 wks', dueDays: 56 },
  ];
  await createDueDayRules('Scheduled call back - BP not at goal', bpCallbackRules);
  await createDueDayRules('Scheduled call back - BP at goal', bpCallbackRules);

  // Chronic diagnosis - attestation status (only add rule for "not sent")
  await createDueDayRules('Chronic diagnosis resolved', [
    { trackingValue: 'Attestation not sent', dueDays: 14 },
  ]);
  await createDueDayRules('Chronic diagnosis invalid', [
    { trackingValue: 'Attestation not sent', dueDays: 14 },
  ]);

  console.log('Created due day rules');

  // ============================================
  // HgbA1c GOAL OPTIONS
  // ============================================
  await Promise.all([
    prisma.hgbA1cGoalOption.upsert({
      where: { code: 'less_than_7' },
      update: {},
      create: {
        code: 'less_than_7',
        label: 'Less than 7',
        threshold: 7.0,
        sortOrder: 1,
      },
    }),
    prisma.hgbA1cGoalOption.upsert({
      where: { code: 'less_than_8' },
      update: {},
      create: {
        code: 'less_than_8',
        label: 'Less than 8',
        threshold: 8.0,
        sortOrder: 2,
      },
    }),
    prisma.hgbA1cGoalOption.upsert({
      where: { code: 'less_than_9' },
      update: {},
      create: {
        code: 'less_than_9',
        label: 'Less than 9',
        threshold: 9.0,
        sortOrder: 3,
      },
    }),
  ]);

  console.log('Created HgbA1c goal options');

  // ============================================
  // CONDITIONAL FORMATS
  // ============================================
  await Promise.all([
    prisma.conditionalFormat.upsert({
      where: { id: 1 },
      update: {},
      create: {
        name: 'Completed',
        conditionType: 'status',
        conditionValue: 'Completed',
        backgroundColor: '#C8E6C9',
        textColor: '#1B5E20',
        priority: 10,
      },
    }),
    prisma.conditionalFormat.upsert({
      where: { id: 2 },
      update: {},
      create: {
        name: 'N/A',
        conditionType: 'status',
        conditionValue: 'N/A',
        backgroundColor: '#E0E0E0',
        textColor: '#424242',
        priority: 9,
      },
    }),
    prisma.conditionalFormat.upsert({
      where: { id: 3 },
      update: {},
      create: {
        name: 'Overdue',
        conditionType: 'dueDate',
        conditionValue: 'overdue',
        backgroundColor: '#FFCDD2',
        textColor: '#B71C1C',
        priority: 8,
      },
    }),
    prisma.conditionalFormat.upsert({
      where: { id: 4 },
      update: {},
      create: {
        name: 'Due Soon',
        conditionType: 'dueDate',
        conditionValue: 'dueSoon',
        backgroundColor: '#FFF9C4',
        textColor: '#F57F17',
        priority: 7,
      },
    }),
  ]);

  console.log('Created conditional formats');

  // ============================================
  // EDIT LOCK (Initialize single row)
  // ============================================
  await prisma.editLock.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      lockedByUsername: null,
      lockedByDisplayName: null,
      lockedAt: null,
      lastActivity: null,
    },
  });

  console.log('Initialized edit lock');

  // ============================================
  // COMPREHENSIVE SAMPLE DATA (all combinations)
  // ============================================

  // Clean up ALL existing patients and measures for a fresh start
  console.log('Cleaning up all existing patient data...');
  await prisma.patientMeasure.deleteMany({});
  await prisma.patient.deleteMany({});
  console.log('All patient data cleaned up');

  // Helper to create dates relative to today
  const today = new Date();
  const daysAgo = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return d;
  };
  const daysFromNow = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return d;
  };

  // Create patients for comprehensive testing (realistic names)
  const testPatients = [
    // AWV patients
    { name: 'Smith, John', dob: new Date('1955-01-15'), phone: '5551001001', address: '101 Oak Street' },
    { name: 'Johnson, Mary', dob: new Date('1956-02-20'), phone: '5551001002', address: '102 Maple Ave' },
    { name: 'Williams, Robert', dob: new Date('1957-03-25'), phone: '5551001003', address: '103 Pine Road' },
    { name: 'Brown, Patricia', dob: new Date('1958-04-10'), phone: '5551001004', address: '104 Cedar Lane' },
    { name: 'Jones, Michael', dob: new Date('1959-05-15'), phone: '5551001005', address: '105 Birch Blvd' },
    { name: 'Garcia, Linda', dob: new Date('1960-06-20'), phone: '5551001006', address: '106 Elm Court' },

    // Screening - Breast Cancer
    { name: 'Miller, Barbara', dob: new Date('1961-07-01'), phone: '5552001001', address: '201 First St' },
    { name: 'Davis, Elizabeth', dob: new Date('1962-08-02'), phone: '5552001002', address: '202 Second Ave' },
    { name: 'Martinez, Susan', dob: new Date('1963-09-03'), phone: '5552001003', address: '203 Third Blvd' },
    { name: 'Rodriguez, Jessica', dob: new Date('1964-10-04'), phone: '5552001004', address: '204 Fourth Lane' },
    { name: 'Wilson, Sarah', dob: new Date('1965-11-05'), phone: '5552001005', address: '205 Fifth Road' },
    { name: 'Anderson, Karen', dob: new Date('1966-12-06'), phone: '5552001006', address: '206 Sixth Court' },
    { name: 'Taylor, Nancy', dob: new Date('1967-01-07'), phone: '5552001007', address: '207 Seventh Way' },

    // Screening - Colon Cancer
    { name: 'Thomas, James', dob: new Date('1950-02-08'), phone: '5552002001', address: '208 Main Street' },
    { name: 'Hernandez, David', dob: new Date('1951-03-09'), phone: '5552002002', address: '209 Center Ave' },
    { name: 'Moore, Richard', dob: new Date('1952-04-10'), phone: '5552002003', address: '210 Park Blvd' },
    { name: 'Martin, Charles', dob: new Date('1953-05-11'), phone: '5552002004', address: '211 Lake Road' },

    // Screening - Cervical Cancer (with month tracking)
    { name: 'Jackson, Jennifer', dob: new Date('1980-06-12'), phone: '5552003001', address: '212 River Lane' },
    { name: 'Thompson, Michelle', dob: new Date('1981-07-13'), phone: '5552003002', address: '213 Hill Court' },
    { name: 'White, Amanda', dob: new Date('1982-08-14'), phone: '5552003003', address: '214 Valley Way' },
    { name: 'Lopez, Melissa', dob: new Date('1983-09-15'), phone: '5552003004', address: '215 Forest Dr' },
    { name: 'Lee, Stephanie', dob: new Date('1984-10-16'), phone: '5552003005', address: '216 Mountain Ave' },

    // Quality - Diabetic Eye Exam
    { name: 'Gonzalez, Joseph', dob: new Date('1954-11-17'), phone: '5553001001', address: '301 Spring St' },
    { name: 'Harris, Thomas', dob: new Date('1955-12-18'), phone: '5553001002', address: '302 Summer Lane' },
    { name: 'Clark, Christopher', dob: new Date('1956-01-19'), phone: '5553001003', address: '303 Autumn Blvd' },
    { name: 'Lewis, Daniel', dob: new Date('1957-02-20'), phone: '5553001004', address: '304 Winter Road' },

    // Quality - GC/Chlamydia
    { name: 'Robinson, Ashley', dob: new Date('1990-03-21'), phone: '5553002001', address: '305 North Ave' },
    { name: 'Walker, Brittany', dob: new Date('1991-04-22'), phone: '5553002002', address: '306 South Blvd' },
    { name: 'Perez, Samantha', dob: new Date('1992-05-23'), phone: '5553002003', address: '307 East Lane' },

    // Quality - Diabetic Nephropathy
    { name: 'Hall, Matthew', dob: new Date('1958-06-24'), phone: '5553003001', address: '308 West Court' },
    { name: 'Young, Anthony', dob: new Date('1959-07-25'), phone: '5553003002', address: '309 Central Way' },
    { name: 'Allen, Mark', dob: new Date('1960-08-26'), phone: '5553003003', address: '310 Plaza Dr' },

    // Quality - Hypertension (with call interval tracking)
    { name: 'Sanchez, Donald', dob: new Date('1961-09-27'), phone: '5553004001', address: '311 Commerce St' },
    { name: 'Wright, Steven', dob: new Date('1962-10-28'), phone: '5553004002', address: '312 Market Ave' },
    { name: 'King, Paul', dob: new Date('1963-11-29'), phone: '5553004003', address: '313 Trade Blvd' },
    { name: 'Scott, Andrew', dob: new Date('1964-12-30'), phone: '5553004004', address: '314 Business Lane' },
    { name: 'Green, Joshua', dob: new Date('1965-01-01'), phone: '5553004005', address: '315 Corporate Road' },
    { name: 'Baker, Kenneth', dob: new Date('1966-02-02'), phone: '5553004006', address: '316 Industrial Way' },

    // Quality - ACE/ARB
    { name: 'Adams, Kevin', dob: new Date('1967-03-03'), phone: '5553005001', address: '317 Harbor St' },
    { name: 'Nelson, Brian', dob: new Date('1968-04-04'), phone: '5553005002', address: '318 Marina Ave' },
    { name: 'Hill, George', dob: new Date('1969-05-05'), phone: '5553005003', address: '319 Beach Blvd' },

    // Quality - Vaccination
    { name: 'Ramirez, Edward', dob: new Date('1970-06-06'), phone: '5553006001', address: '320 Ocean Lane' },
    { name: 'Campbell, Ronald', dob: new Date('1971-07-07'), phone: '5553006002', address: '321 Bay Road' },
    { name: 'Mitchell, Timothy', dob: new Date('1972-08-08'), phone: '5553006003', address: '322 Shore Court' },
    { name: 'Roberts, Jason', dob: new Date('1973-09-09'), phone: '5553006004', address: '323 Coastal Way' },

    // Quality - Diabetes Control (HgbA1c with tracking)
    { name: 'Carter, Jeffrey', dob: new Date('1974-10-10'), phone: '5553007001', address: '324 Garden St' },
    { name: 'Phillips, Ryan', dob: new Date('1975-11-11'), phone: '5553007002', address: '325 Flower Ave' },
    { name: 'Evans, Jacob', dob: new Date('1976-12-12'), phone: '5553007003', address: '326 Rose Blvd' },
    { name: 'Turner, Gary', dob: new Date('1977-01-13'), phone: '5553007004', address: '327 Lily Lane' },
    { name: 'Torres, Nicholas', dob: new Date('1978-02-14'), phone: '5553007005', address: '328 Daisy Road' },

    // Quality - Annual Serum K&Cr
    { name: 'Parker, Eric', dob: new Date('1979-03-15'), phone: '5553008001', address: '329 Sunrise Court' },
    { name: 'Collins, Stephen', dob: new Date('1980-04-16'), phone: '5553008002', address: '330 Sunset Way' },

    // Chronic DX
    { name: 'Edwards, Larry', dob: new Date('1948-05-17'), phone: '5554001001', address: '401 Heritage St' },
    { name: 'Stewart, Frank', dob: new Date('1949-06-18'), phone: '5554001002', address: '402 Legacy Ave' },
    { name: 'Morris, Scott', dob: new Date('1950-07-19'), phone: '5554001003', address: '403 Tradition Blvd' },
    { name: 'Nguyen, Raymond', dob: new Date('1951-08-20'), phone: '5554001004', address: '404 Classic Lane' },

    // Additional test patients
    { name: 'Murphy, Patrick', dob: new Date('1985-09-21'), phone: '5555001001', address: '501 Twin Oaks Dr' },
    { name: 'Cox, Diana', dob: new Date('1986-10-22'), phone: '5555001002', address: '502 Willow Lane' },

    // Overdue patients (various statuses)
    { name: 'Rivera, Jack', dob: new Date('1987-11-23'), phone: '5556001001', address: '601 Deadline Ave' },
    { name: 'Cook, Adam', dob: new Date('1988-12-24'), phone: '5556001002', address: '602 Urgent Lane' },

    // Test: Completed measure with passed due date (annual measure needing renewal)
    { name: 'Bennett, Carol', dob: new Date('1952-03-15'), phone: '5557001001', address: '701 Renewal St' },
    { name: 'Foster, William', dob: new Date('1953-04-20'), phone: '5557001002', address: '702 Annual Ave' },
  ];

  // Define measures for each patient
  const measureConfigs: Array<{
    patientName: string;
    requestType: string;
    qualityMeasure: string;
    measureStatus: string;
    statusDate: Date | null;
    tracking1: string | null;
    tracking2: string | null;
    notes: string | null;
  }> = [
    // AWV
    { patientName: 'Smith, John', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'Not Addressed', statusDate: null, tracking1: null, tracking2: null, notes: 'White row - default' },
    { patientName: 'Johnson, Mary', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'Patient called to schedule AWV', statusDate: daysAgo(3), tracking1: null, tracking2: null, notes: 'Yellow row - contacted' },
    { patientName: 'Williams, Robert', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'AWV scheduled', statusDate: daysFromNow(7), tracking1: null, tracking2: null, notes: 'Blue row - scheduled' },
    { patientName: 'Brown, Patricia', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'AWV completed', statusDate: daysAgo(30), tracking1: null, tracking2: null, notes: 'Green row - completed' },
    { patientName: 'Jones, Michael', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'Patient declined AWV', statusDate: daysAgo(10), tracking1: null, tracking2: null, notes: 'Purple row - declined' },
    { patientName: 'Garcia, Linda', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'Patient called to schedule AWV', statusDate: daysAgo(14), tracking1: null, tracking2: null, notes: 'Red row - overdue (called 14 days ago, due in 7)' },

    // Breast Cancer Screening
    { patientName: 'Miller, Barbara', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Not Addressed', statusDate: null, tracking1: null, tracking2: null, notes: null },
    { patientName: 'Davis, Elizabeth', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Screening discussed', statusDate: daysAgo(5), tracking1: null, tracking2: null, notes: 'Yellow - discussed' },
    { patientName: 'Martinez, Susan', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Screening test ordered', statusDate: daysAgo(3), tracking1: 'Mammogram', tracking2: null, notes: 'Blue - Mammogram ordered (14 days)' },
    { patientName: 'Rodriguez, Jessica', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Screening test ordered', statusDate: daysAgo(5), tracking1: 'Breast MRI', tracking2: null, notes: 'Blue - MRI ordered (21 days)' },
    { patientName: 'Wilson, Sarah', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Screening test completed', statusDate: daysAgo(60), tracking1: null, tracking2: null, notes: 'Green - completed' },
    { patientName: 'Anderson, Karen', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Patient declined screening', statusDate: daysAgo(20), tracking1: null, tracking2: null, notes: 'Purple - declined' },
    { patientName: 'Taylor, Nancy', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Screening unnecessary', statusDate: daysAgo(30), tracking1: null, tracking2: null, notes: 'Gray - unnecessary' },

    // Colon Cancer Screening
    { patientName: 'Thomas, James', requestType: 'Screening', qualityMeasure: 'Colon Cancer Screening', measureStatus: 'Colon cancer screening ordered', statusDate: daysAgo(10), tracking1: 'Colonoscopy', tracking2: null, notes: 'Blue - Colonoscopy (42 days)' },
    { patientName: 'Hernandez, David', requestType: 'Screening', qualityMeasure: 'Colon Cancer Screening', measureStatus: 'Colon cancer screening ordered', statusDate: daysAgo(5), tracking1: 'Cologuard', tracking2: null, notes: 'Blue - Cologuard (21 days)' },
    { patientName: 'Moore, Richard', requestType: 'Screening', qualityMeasure: 'Colon Cancer Screening', measureStatus: 'Colon cancer screening ordered', statusDate: daysAgo(3), tracking1: 'FOBT', tracking2: null, notes: 'Blue - FOBT (21 days)' },
    { patientName: 'Martin, Charles', requestType: 'Screening', qualityMeasure: 'Colon Cancer Screening', measureStatus: 'Colon cancer screening completed', statusDate: daysAgo(90), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // Cervical Cancer Screening (month tracking)
    { patientName: 'Jackson, Jennifer', requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening', measureStatus: 'Screening discussed', statusDate: daysAgo(5), tracking1: 'In 1 Month', tracking2: null, notes: 'Yellow - In 1 Month (30 days)' },
    { patientName: 'Thompson, Michelle', requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening', measureStatus: 'Screening discussed', statusDate: daysAgo(10), tracking1: 'In 3 Months', tracking2: null, notes: 'Yellow - In 3 Months (90 days)' },
    { patientName: 'White, Amanda', requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening', measureStatus: 'Screening discussed', statusDate: daysAgo(30), tracking1: 'In 6 Months', tracking2: null, notes: 'Yellow - In 6 Months (180 days)' },
    { patientName: 'Lopez, Melissa', requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening', measureStatus: 'Screening appt made', statusDate: daysFromNow(14), tracking1: null, tracking2: null, notes: 'Blue - appointment made' },
    { patientName: 'Lee, Stephanie', requestType: 'Screening', qualityMeasure: 'Cervical Cancer Screening', measureStatus: 'Screening completed', statusDate: daysAgo(120), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // Diabetic Eye Exam
    { patientName: 'Gonzalez, Joseph', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam discussed', statusDate: daysAgo(7), tracking1: null, tracking2: null, notes: 'Yellow - discussed (42 days)' },
    { patientName: 'Harris, Thomas', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam referral made', statusDate: daysAgo(14), tracking1: null, tracking2: null, notes: 'Blue - referral (42 days)' },
    { patientName: 'Clark, Christopher', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam scheduled', statusDate: daysFromNow(10), tracking1: null, tracking2: null, notes: 'Blue - scheduled' },
    { patientName: 'Lewis, Daniel', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam completed', statusDate: daysAgo(45), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // GC/Chlamydia
    { patientName: 'Robinson, Ashley', requestType: 'Quality', qualityMeasure: 'GC/Chlamydia Screening', measureStatus: 'Patient contacted for screening', statusDate: daysAgo(3), tracking1: null, tracking2: null, notes: 'Yellow - contacted (10 days)' },
    { patientName: 'Walker, Brittany', requestType: 'Quality', qualityMeasure: 'GC/Chlamydia Screening', measureStatus: 'Test ordered', statusDate: daysAgo(2), tracking1: null, tracking2: null, notes: 'Blue - ordered (5 days)' },
    { patientName: 'Perez, Samantha', requestType: 'Quality', qualityMeasure: 'GC/Chlamydia Screening', measureStatus: 'GC/Clamydia screening completed', statusDate: daysAgo(30), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // Diabetic Nephropathy
    { patientName: 'Hall, Matthew', requestType: 'Quality', qualityMeasure: 'Diabetic Nephropathy', measureStatus: 'Patient contacted for screening', statusDate: daysAgo(4), tracking1: null, tracking2: null, notes: 'Yellow - contacted (10 days)' },
    { patientName: 'Young, Anthony', requestType: 'Quality', qualityMeasure: 'Diabetic Nephropathy', measureStatus: 'Urine microalbumin ordered', statusDate: daysAgo(2), tracking1: null, tracking2: null, notes: 'Blue - ordered (5 days)' },
    { patientName: 'Allen, Mark', requestType: 'Quality', qualityMeasure: 'Diabetic Nephropathy', measureStatus: 'Urine microalbumin completed', statusDate: daysAgo(60), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // Hypertension (with call intervals and BP reading)
    { patientName: 'Sanchez, Donald', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Blood pressure at goal', statusDate: daysAgo(7), tracking1: null, tracking2: null, notes: 'Green - BP at goal' },
    { patientName: 'Wright, Steven', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Scheduled call back - BP not at goal', statusDate: daysAgo(3), tracking1: 'Call every 1 wk', tracking2: '145/92', notes: 'Blue - call in 1 wk, BP reading in tracking2' },
    { patientName: 'King, Paul', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Scheduled call back - BP not at goal', statusDate: daysAgo(5), tracking1: 'Call every 2 wks', tracking2: '150/95', notes: 'Blue - call in 2 wks' },
    { patientName: 'Scott, Andrew', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Scheduled call back - BP at goal', statusDate: daysAgo(10), tracking1: 'Call every 4 wks', tracking2: '128/82', notes: 'Blue - call in 4 wks, at goal' },
    { patientName: 'Green, Joshua', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Appointment scheduled', statusDate: daysFromNow(5), tracking1: null, tracking2: null, notes: 'Blue - appointment' },
    { patientName: 'Baker, Kenneth', requestType: 'Quality', qualityMeasure: 'Hypertension Management', measureStatus: 'Declined BP control', statusDate: daysAgo(15), tracking1: null, tracking2: null, notes: 'Purple - declined' },

    // ACE/ARB
    { patientName: 'Adams, Kevin', requestType: 'Quality', qualityMeasure: 'ACE/ARB in DM or CAD', measureStatus: 'Patient on ACE/ARB', statusDate: daysAgo(90), tracking1: null, tracking2: null, notes: 'Green - on medication' },
    { patientName: 'Nelson, Brian', requestType: 'Quality', qualityMeasure: 'ACE/ARB in DM or CAD', measureStatus: 'ACE/ARB prescribed', statusDate: daysAgo(5), tracking1: null, tracking2: null, notes: 'Blue - prescribed (14 days)' },
    { patientName: 'Hill, George', requestType: 'Quality', qualityMeasure: 'ACE/ARB in DM or CAD', measureStatus: 'Contraindicated', statusDate: daysAgo(30), tracking1: null, tracking2: null, notes: 'Purple - contraindicated' },

    // Vaccination
    { patientName: 'Ramirez, Edward', requestType: 'Quality', qualityMeasure: 'Vaccination', measureStatus: 'Vaccination discussed', statusDate: daysAgo(2), tracking1: null, tracking2: null, notes: 'Yellow - discussed (7 days)' },
    { patientName: 'Campbell, Ronald', requestType: 'Quality', qualityMeasure: 'Vaccination', measureStatus: 'Vaccination scheduled', statusDate: daysFromNow(3), tracking1: null, tracking2: null, notes: 'Blue - scheduled' },
    { patientName: 'Mitchell, Timothy', requestType: 'Quality', qualityMeasure: 'Vaccination', measureStatus: 'Vaccination completed', statusDate: daysAgo(14), tracking1: null, tracking2: null, notes: 'Green - completed' },
    { patientName: 'Roberts, Jason', requestType: 'Quality', qualityMeasure: 'Vaccination', measureStatus: 'Patient declined', statusDate: daysAgo(7), tracking1: null, tracking2: null, notes: 'Purple - declined' },

    // Diabetes Control (HgbA1c with tracking1=value, tracking2=interval)
    { patientName: 'Carter, Jeffrey', requestType: 'Quality', qualityMeasure: 'Diabetes Control', measureStatus: 'HgbA1c ordered', statusDate: daysAgo(5), tracking1: null, tracking2: null, notes: 'Blue - ordered (14 days)' },
    { patientName: 'Phillips, Ryan', requestType: 'Quality', qualityMeasure: 'Diabetes Control', measureStatus: 'HgbA1c at goal', statusDate: daysAgo(30), tracking1: '6.5', tracking2: '3 months', notes: 'Green - at goal, value 6.5, retest 3mo' },
    { patientName: 'Evans, Jacob', requestType: 'Quality', qualityMeasure: 'Diabetes Control', measureStatus: 'HgbA1c at goal', statusDate: daysAgo(60), tracking1: '6.8', tracking2: '6 months', notes: 'Green - at goal, value 6.8, retest 6mo' },
    { patientName: 'Turner, Gary', requestType: 'Quality', qualityMeasure: 'Diabetes Control', measureStatus: 'HgbA1c NOT at goal', statusDate: daysAgo(45), tracking1: '8.2', tracking2: '3 months', notes: 'Blue - NOT at goal, value 8.2, retest 3mo' },
    { patientName: 'Torres, Nicholas', requestType: 'Quality', qualityMeasure: 'Diabetes Control', measureStatus: 'Patient declined', statusDate: daysAgo(20), tracking1: null, tracking2: null, notes: 'Purple - declined' },

    // Annual Serum K&Cr
    { patientName: 'Parker, Eric', requestType: 'Quality', qualityMeasure: 'Annual Serum K&Cr', measureStatus: 'Lab ordered', statusDate: daysAgo(3), tracking1: null, tracking2: null, notes: 'Blue - ordered (7 days)' },
    { patientName: 'Collins, Stephen', requestType: 'Quality', qualityMeasure: 'Annual Serum K&Cr', measureStatus: 'Lab completed', statusDate: daysAgo(45), tracking1: null, tracking2: null, notes: 'Green - completed' },

    // Chronic DX
    { patientName: 'Edwards, Larry', requestType: 'Chronic DX', qualityMeasure: 'Chronic Diagnosis Code', measureStatus: 'Chronic diagnosis confirmed', statusDate: daysAgo(60), tracking1: null, tracking2: null, notes: 'Green - confirmed' },
    { patientName: 'Stewart, Frank', requestType: 'Chronic DX', qualityMeasure: 'Chronic Diagnosis Code', measureStatus: 'Chronic diagnosis resolved', statusDate: daysAgo(5), tracking1: 'Attestation not sent', tracking2: null, notes: 'Orange - resolved, attestation not sent (14 days)' },
    { patientName: 'Morris, Scott', requestType: 'Chronic DX', qualityMeasure: 'Chronic Diagnosis Code', measureStatus: 'Chronic diagnosis resolved', statusDate: daysAgo(30), tracking1: 'Attestation sent', tracking2: null, notes: 'Orange - resolved, attested' },
    { patientName: 'Nguyen, Raymond', requestType: 'Chronic DX', qualityMeasure: 'Chronic Diagnosis Code', measureStatus: 'Chronic diagnosis invalid', statusDate: daysAgo(20), tracking1: null, tracking2: null, notes: 'Orange - invalid' },

    // Additional test patients
    { patientName: 'Murphy, Patrick', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'Not Addressed', statusDate: null, tracking1: null, tracking2: null, notes: 'White - not addressed' },
    { patientName: 'Cox, Diana', requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', measureStatus: 'Not Addressed', statusDate: null, tracking1: null, tracking2: null, notes: 'White - not addressed' },

    // Overdue patients
    { patientName: 'Rivera, Jack', requestType: 'Quality', qualityMeasure: 'Vaccination', measureStatus: 'Vaccination scheduled', statusDate: daysAgo(10), tracking1: null, tracking2: null, notes: 'Red - overdue (was scheduled 10 days ago, due in 1 day)' },
    { patientName: 'Cook, Adam', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam discussed', statusDate: daysAgo(50), tracking1: null, tracking2: null, notes: 'Red - overdue (discussed 50 days ago, due in 42)' },

    // Completed measures with passed due date (annual renewal needed) - should turn RED
    { patientName: 'Bennett, Carol', requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', measureStatus: 'AWV completed', statusDate: daysAgo(400), tracking1: null, tracking2: null, notes: 'Red - completed 400 days ago, due date passed (365 day interval)' },
    { patientName: 'Foster, William', requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', measureStatus: 'Diabetic eye exam completed', statusDate: daysAgo(380), tracking1: null, tracking2: null, notes: 'Red - completed 380 days ago, due date passed (365 day interval)' },
  ];

  // Create patients and measures
  let rowOrder = 1;
  for (const config of measureConfigs) {
    const patientData = testPatients.find(p => p.name === config.patientName);
    if (!patientData) continue;

    // Create or get patient
    const patient = await prisma.patient.upsert({
      where: {
        memberName_memberDob: {
          memberName: patientData.name,
          memberDob: patientData.dob,
        },
      },
      update: {},
      create: {
        memberName: patientData.name,
        memberDob: patientData.dob,
        memberTelephone: patientData.phone,
        memberAddress: patientData.address,
      },
    });

    // Check if this patient already has measures (for duplicates)
    const existingMeasures = await prisma.patientMeasure.count({
      where: { patientId: patient.id },
    });
    const isDuplicate = existingMeasures > 0;

    // Create measure
    await prisma.patientMeasure.create({
      data: {
        patientId: patient.id,
        requestType: config.requestType,
        qualityMeasure: config.qualityMeasure,
        measureStatus: config.measureStatus,
        statusDate: config.statusDate,
        tracking1: config.tracking1,
        tracking2: config.tracking2,
        notes: config.notes,
        rowOrder: rowOrder++,
        isDuplicate,
      },
    });

    // Update duplicate flags if needed
    if (isDuplicate) {
      await prisma.patientMeasure.updateMany({
        where: { patientId: patient.id },
        data: { isDuplicate: true },
      });
    }
  }

  console.log(`Created ${measureConfigs.length} comprehensive sample measures`);

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
