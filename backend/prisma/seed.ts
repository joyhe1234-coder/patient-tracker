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
  // SAMPLE PATIENT DATA (for development)
  // ============================================
  if (process.env.NODE_ENV === 'development') {
    const samplePatients = [
      {
        memberName: 'John Smith',
        memberDob: new Date('1955-03-15'),
        memberTelephone: '5551234567',
        memberAddress: '123 Main St, Anytown, CA 90210',
      },
      {
        memberName: 'Jane Doe',
        memberDob: new Date('1962-07-22'),
        memberTelephone: '5559876543',
        memberAddress: '456 Oak Ave, Somewhere, CA 90211',
      },
      {
        memberName: 'Robert Johnson',
        memberDob: new Date('1948-11-08'),
        memberTelephone: '5555551234',
        memberAddress: '789 Elm Blvd, Elsewhere, CA 90212',
      },
    ];

    for (const patientData of samplePatients) {
      const patient = await prisma.patient.upsert({
        where: {
          memberName_memberDob: {
            memberName: patientData.memberName,
            memberDob: patientData.memberDob,
          },
        },
        update: {},
        create: patientData,
      });

      // Create some sample measures
      await prisma.patientMeasure.upsert({
        where: { id: patient.id * 100 + 1 },
        update: {},
        create: {
          id: patient.id * 100 + 1,
          patientId: patient.id,
          requestType: 'AWV',
          qualityMeasure: 'Annual Wellness Visit',
          measureStatus: 'Not Addressed',
          rowOrder: patient.id * 10,
        },
      });

      await prisma.patientMeasure.upsert({
        where: { id: patient.id * 100 + 2 },
        update: {},
        create: {
          id: patient.id * 100 + 2,
          patientId: patient.id,
          requestType: 'Screening',
          qualityMeasure: 'Breast Cancer Screening',
          measureStatus: 'Not Addressed',
          rowOrder: patient.id * 10 + 1,
        },
      });
    }

    console.log('Created sample patient data');
  }

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
