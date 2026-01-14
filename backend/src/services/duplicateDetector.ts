import { prisma } from '../config/database.js';

/**
 * Helper function to check if a value is null, undefined, or empty string
 */
function isNullOrEmpty(value: string | null | undefined): boolean {
  return !value || value.trim() === '';
}

/**
 * Check if a patient measure is a duplicate
 * Duplicates are defined as: same patient (memberName + memberDob) + requestType + qualityMeasure
 * Skip duplicate check if requestType OR qualityMeasure is null/empty
 */
export async function checkForDuplicate(
  patientId: number,
  requestType: string | null | undefined,
  qualityMeasure: string | null | undefined,
  excludeMeasureId?: number
): Promise<{ isDuplicate: boolean; duplicateIds: number[] }> {
  // Skip duplicate check if requestType or qualityMeasure is null/empty
  if (isNullOrEmpty(requestType) || isNullOrEmpty(qualityMeasure)) {
    return { isDuplicate: false, duplicateIds: [] };
  }

  // Find all measures for this patient with same requestType and qualityMeasure
  const existingMeasures = await prisma.patientMeasure.findMany({
    where: {
      patientId,
      requestType,
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
 * Update isDuplicate flags for all measures belonging to a patient
 * Call this when a measure is created, updated, or deleted
 * Duplicates = more than one row with same patient + requestType + qualityMeasure
 * Rows with null/empty requestType or qualityMeasure are never marked as duplicate
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
      requestType: true,
      qualityMeasure: true,
    },
  });

  // Group by (requestType, qualityMeasure) - only non-empty values
  const groups = new Map<string, number[]>();

  for (const measure of measures) {
    // Skip rows with null/empty requestType or qualityMeasure
    if (isNullOrEmpty(measure.requestType) || isNullOrEmpty(measure.qualityMeasure)) {
      // These rows are never duplicates - mark them as not duplicate
      await prisma.patientMeasure.update({
        where: { id: measure.id },
        data: { isDuplicate: false },
      });
      continue;
    }

    const key = `${measure.requestType}|${measure.qualityMeasure}`;
    const existing = groups.get(key) || [];
    existing.push(measure.id);
    groups.set(key, existing);
  }

  // Update duplicate flags for grouped measures
  for (const [, ids] of groups) {
    const isDuplicate = ids.length > 1;
    await prisma.patientMeasure.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        isDuplicate,
      },
    });
  }
}

/**
 * Check for duplicates across all rows (for initial data load or bulk operations)
 * Returns a map of measure ID -> duplicate status
 * Duplicates = same patient + requestType + qualityMeasure appearing in multiple rows
 * Rows with null/empty requestType or qualityMeasure are never duplicates
 */
export async function detectAllDuplicates(): Promise<Map<number, boolean>> {
  const measures = await prisma.patientMeasure.findMany({
    select: {
      id: true,
      patientId: true,
      requestType: true,
      qualityMeasure: true,
    },
  });

  // Group by (patientId, requestType, qualityMeasure)
  const groups = new Map<string, number[]>();
  const duplicateMap = new Map<number, boolean>();

  for (const measure of measures) {
    // Rows with null/empty requestType or qualityMeasure are never duplicates
    if (isNullOrEmpty(measure.requestType) || isNullOrEmpty(measure.qualityMeasure)) {
      duplicateMap.set(measure.id, false);
      continue;
    }

    const key = `${measure.patientId}|${measure.requestType}|${measure.qualityMeasure}`;
    const existing = groups.get(key) || [];
    existing.push(measure.id);
    groups.set(key, existing);
  }

  // Build result map - duplicates are groups with more than one row
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
