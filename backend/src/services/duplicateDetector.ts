import { prisma } from '../config/database.js';

/**
 * Check if a patient measure is a duplicate
 * Duplicates are defined as: same patient (memberName + memberDob)
 * Any row with the same patient name and DOB is a duplicate
 */
export async function checkForDuplicate(
  patientId: number,
  excludeMeasureId?: number
): Promise<{ isDuplicate: boolean; duplicateIds: number[] }> {
  // Find all measures for this patient (same name + DOB)
  const existingMeasures = await prisma.patientMeasure.findMany({
    where: {
      patientId,
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
 * Update isDuplicate flags for all measures belonging to a patient
 * Call this when a measure is created, updated, or deleted
 * Duplicates = more than one row with same patient (name + DOB)
 */
export async function updateDuplicateFlags(
  patientId: number
): Promise<void> {
  // Find all measures for this patient
  const measures = await prisma.patientMeasure.findMany({
    where: {
      patientId,
    },
    select: {
      id: true,
    },
  });

  // If more than one measure exists for this patient, they're all duplicates
  const isDuplicate = measures.length > 1;

  // Update all measures for this patient
  await prisma.patientMeasure.updateMany({
    where: {
      patientId,
    },
    data: {
      isDuplicate,
    },
  });
}

/**
 * Check for duplicates across all rows (for initial data load or bulk operations)
 * Returns a map of measure ID -> duplicate status
 * Duplicates = same patient (name + DOB) appearing in multiple rows
 */
export async function detectAllDuplicates(): Promise<Map<number, boolean>> {
  const measures = await prisma.patientMeasure.findMany({
    select: {
      id: true,
      patientId: true,
    },
  });

  // Group by patientId (which represents unique name + DOB)
  const groups = new Map<number, number[]>();

  for (const measure of measures) {
    const existing = groups.get(measure.patientId) || [];
    existing.push(measure.id);
    groups.set(measure.patientId, existing);
  }

  // Build result map - duplicates are patients with more than one row
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
