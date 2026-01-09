import { prisma } from '../config/database.js';

/**
 * Check if a patient measure is a duplicate
 * Duplicates are defined as: same patient (memberName + memberDob) + same qualityMeasure
 */
export async function checkForDuplicate(
  patientId: number,
  qualityMeasure: string,
  excludeMeasureId?: number
): Promise<{ isDuplicate: boolean; duplicateIds: number[] }> {
  // Find all measures for this patient with the same quality measure
  const existingMeasures = await prisma.patientMeasure.findMany({
    where: {
      patientId,
      qualityMeasure,
      ...(excludeMeasureId && { id: { not: excludeMeasureId } }),
    },
    select: {
      id: true,
    },
  });

  const isDuplicate = existingMeasures.length > 0;
  const duplicateIds = existingMeasures.map((m) => m.id);

  return { isDuplicate, duplicateIds };
}

/**
 * Update isDuplicate flags for all measures in a duplicate group
 * Call this when a measure is created, updated, or deleted
 */
export async function updateDuplicateFlags(
  patientId: number,
  qualityMeasure: string
): Promise<void> {
  // Find all measures for this patient + quality measure combination
  const measures = await prisma.patientMeasure.findMany({
    where: {
      patientId,
      qualityMeasure,
    },
    select: {
      id: true,
    },
  });

  // If more than one measure exists, they're all duplicates
  const isDuplicate = measures.length > 1;

  // Update all measures in this group
  await prisma.patientMeasure.updateMany({
    where: {
      patientId,
      qualityMeasure,
    },
    data: {
      isDuplicate,
    },
  });
}

/**
 * Check for duplicates across all rows (for initial data load or bulk operations)
 * Returns a map of measure ID -> duplicate status
 */
export async function detectAllDuplicates(): Promise<Map<number, boolean>> {
  const measures = await prisma.patientMeasure.findMany({
    include: {
      patient: {
        select: {
          memberName: true,
          memberDob: true,
        },
      },
    },
  });

  // Group by patient + quality measure
  const groups = new Map<string, number[]>();

  for (const measure of measures) {
    const key = `${measure.patient.memberName}-${measure.patient.memberDob.toISOString()}-${measure.qualityMeasure}`;
    const existing = groups.get(key) || [];
    existing.push(measure.id);
    groups.set(key, existing);
  }

  // Build result map
  const duplicateMap = new Map<number, boolean>();

  for (const [, ids] of groups) {
    const isDuplicate = ids.length > 1;
    for (const id of ids) {
      duplicateMap.set(id, isDuplicate);
    }
  }

  return duplicateMap;
}

/**
 * Sync all duplicate flags in the database
 * Use this for data migration or fixing inconsistent states
 */
export async function syncAllDuplicateFlags(): Promise<void> {
  const duplicateMap = await detectAllDuplicates();

  // Update each measure
  for (const [id, isDuplicate] of duplicateMap) {
    await prisma.patientMeasure.update({
      where: { id },
      data: { isDuplicate },
    });
  }
}
