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
  const diabetesControlMeasure = qualityMeasures.find(qm => qm.code === 'Diabetes Control')!;

  // Common statuses for screening measures
  const screeningStatuses = [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'Screening discussed', label: 'Screening discussed', datePrompt: 'Date Discussed', baseDueDays: 30, sortOrder: 2 },
    { code: 'Ordered', label: 'Ordered', datePrompt: 'Date Ordered', baseDueDays: 30, sortOrder: 3 },
    { code: 'Scheduled', label: 'Scheduled', datePrompt: 'Date Scheduled', baseDueDays: null, sortOrder: 4 },
    { code: 'Completed', label: 'Completed', datePrompt: 'Date Completed', baseDueDays: 365, sortOrder: 5 },
    { code: 'N/A', label: 'N/A', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 6 },
  ];

  // Create statuses for AWV
  for (const status of screeningStatuses) {
    await prisma.measureStatus.upsert({
      where: { qualityMeasureId_code: { qualityMeasureId: awvMeasure.id, code: status.code } },
      update: {},
      create: {
        qualityMeasureId: awvMeasure.id,
        ...status,
      },
    });
  }

  // Create statuses for Breast Cancer Screening
  for (const status of screeningStatuses) {
    await prisma.measureStatus.upsert({
      where: { qualityMeasureId_code: { qualityMeasureId: breastCancerMeasure.id, code: status.code } },
      update: {},
      create: {
        qualityMeasureId: breastCancerMeasure.id,
        ...status,
      },
    });
  }

  // Create statuses for Colon Cancer Screening
  for (const status of screeningStatuses) {
    await prisma.measureStatus.upsert({
      where: { qualityMeasureId_code: { qualityMeasureId: colonCancerMeasure.id, code: status.code } },
      update: {},
      create: {
        qualityMeasureId: colonCancerMeasure.id,
        ...status,
      },
    });
  }

  // Create statuses for Diabetes Control (HgbA1c specific)
  const diabetesStatuses = [
    { code: 'Not Addressed', label: 'Not Addressed', datePrompt: null, baseDueDays: null, sortOrder: 1 },
    { code: 'HgbA1c at goal', label: 'HgbA1c at goal', datePrompt: 'Test Date', baseDueDays: 90, sortOrder: 2 },
    { code: 'HgbA1c NOT at goal', label: 'HgbA1c NOT at goal', datePrompt: 'Test Date', baseDueDays: 90, sortOrder: 3 },
    { code: 'Ordered', label: 'Ordered', datePrompt: 'Date Ordered', baseDueDays: 30, sortOrder: 4 },
    { code: 'N/A', label: 'N/A', datePrompt: 'Date Determined', baseDueDays: null, sortOrder: 5 },
  ];

  for (const status of diabetesStatuses) {
    await prisma.measureStatus.upsert({
      where: { qualityMeasureId_code: { qualityMeasureId: diabetesControlMeasure.id, code: status.code } },
      update: {},
      create: {
        qualityMeasureId: diabetesControlMeasure.id,
        ...status,
      },
    });
  }

  console.log('Created measure statuses');

  // ============================================
  // DUE DAY RULES (tracking-specific overrides)
  // ============================================

  // Get measure status IDs for creating due day rules
  const screeningDiscussedStatus = await prisma.measureStatus.findFirst({
    where: { code: 'Screening discussed' },
  });

  if (screeningDiscussedStatus) {
    // Due day rules for "Screening discussed" based on tracking1 values
    const screeningDiscussedRules = [
      { trackingValue: 'In 1 Month', dueDays: 30 },
      { trackingValue: 'In 2 Months', dueDays: 60 },
      { trackingValue: 'In 3 Months', dueDays: 90 },
      { trackingValue: 'In 4 Months', dueDays: 120 },
    ];

    for (const rule of screeningDiscussedRules) {
      await prisma.dueDayRule.upsert({
        where: {
          measureStatusId_trackingValue: {
            measureStatusId: screeningDiscussedStatus.id,
            trackingValue: rule.trackingValue,
          },
        },
        update: {},
        create: {
          measureStatusId: screeningDiscussedStatus.id,
          trackingValue: rule.trackingValue,
          dueDays: rule.dueDays,
        },
      });
    }
  }

  // Get HgbA1c NOT at goal status for callback rules
  const hgba1cNotAtGoalStatus = await prisma.measureStatus.findFirst({
    where: { code: 'HgbA1c NOT at goal' },
  });

  if (hgba1cNotAtGoalStatus) {
    // Due day rules for "Scheduled call back" based on tracking1 values
    const callbackRules = [
      { trackingValue: 'Call every 1 wk', dueDays: 7 },
      { trackingValue: 'Call every 2 wks', dueDays: 14 },
      { trackingValue: 'Call every 3 wks', dueDays: 21 },
      { trackingValue: 'Call every 4 wks', dueDays: 28 },
      { trackingValue: 'Call every 5 wks', dueDays: 35 },
      { trackingValue: 'Call every 6 wks', dueDays: 42 },
      { trackingValue: 'Call every 7 wks', dueDays: 49 },
      { trackingValue: 'Call every 8 wks', dueDays: 56 },
    ];

    for (const rule of callbackRules) {
      await prisma.dueDayRule.upsert({
        where: {
          measureStatusId_trackingValue: {
            measureStatusId: hgba1cNotAtGoalStatus.id,
            trackingValue: rule.trackingValue,
          },
        },
        update: {},
        create: {
          measureStatusId: hgba1cNotAtGoalStatus.id,
          trackingValue: rule.trackingValue,
          dueDays: rule.dueDays,
        },
      });
    }
  }

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
