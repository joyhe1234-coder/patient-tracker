/**
 * Diff Calculator for Import
 * Compares imported data against existing database records
 * Generates diff for preview before committing changes
 */

import { PrismaClient } from '@prisma/client';
import { TransformedRow } from './dataTransformer.js';

const prisma = new PrismaClient();

/**
 * Import mode
 */
export type ImportMode = 'replace' | 'merge';

/**
 * Action to take for a row
 */
export type DiffAction = 'INSERT' | 'UPDATE' | 'SKIP' | 'BOTH' | 'DELETE';

/**
 * Single change in the diff
 */
export interface DiffChange {
  action: DiffAction;
  // Patient info
  memberName: string;
  memberDob: string | null;
  memberTelephone: string | null;
  memberAddress: string | null;
  // Measure info
  requestType: string;
  qualityMeasure: string;
  // Status comparison
  oldStatus: string | null;
  newStatus: string | null;
  // Database IDs for updates
  existingPatientId?: number;
  existingMeasureId?: number;
  // Source row info (for debugging)
  sourceRowIndex?: number;
  // Reason for action
  reason: string;
}

/**
 * Summary of diff changes
 */
export interface DiffSummary {
  inserts: number;
  updates: number;
  skips: number;
  duplicates: number; // BOTH action - keep old + insert new
  deletes: number;
}

/**
 * Complete diff result
 */
export interface DiffResult {
  mode: ImportMode;
  summary: DiffSummary;
  changes: DiffChange[];
  // Unique patients in the import
  newPatients: number;
  existingPatients: number;
  // Timestamps
  generatedAt: Date;
}

/**
 * Existing database record for comparison
 * Exported for testing
 */
export interface ExistingRecord {
  patientId: number;
  measureId: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
  measureStatus: string | null;
  ownerId: number | null;
  ownerName: string | null;
}

/**
 * Status categories for merge logic
 */
export type ComplianceCategory = 'compliant' | 'non-compliant' | 'unknown';

/**
 * Compliant status keywords (case-insensitive matching)
 */
const COMPLIANT_STATUSES = [
  'completed',
  'at goal',
  'confirmed',
  'scheduled',
  'ordered',
];

/**
 * Non-compliant status keywords (case-insensitive matching)
 */
const NON_COMPLIANT_STATUSES = [
  'not addressed',
  'not at goal',
  'declined',
  'invalid',
  'resolved',
  'discussed',
  'unnecessary',
];

/**
 * Categorize a measure status as compliant, non-compliant, or unknown
 * Exported for testing
 */
export function categorizeStatus(status: string | null): ComplianceCategory {
  if (!status) return 'unknown';

  const lowerStatus = status.toLowerCase();

  // Check compliant statuses
  for (const keyword of COMPLIANT_STATUSES) {
    if (lowerStatus.includes(keyword)) {
      return 'compliant';
    }
  }

  // Check non-compliant statuses
  for (const keyword of NON_COMPLIANT_STATUSES) {
    if (lowerStatus.includes(keyword)) {
      return 'non-compliant';
    }
  }

  return 'unknown';
}

/**
 * Calculate diff between imported data and existing database
 */
export async function calculateDiff(
  rows: TransformedRow[],
  mode: ImportMode
): Promise<DiffResult> {
  // Load existing data from database
  const existingRecords = await loadExistingRecords();

  // Build lookup map: "memberName|memberDob|requestType|qualityMeasure" -> record
  const existingByKey = new Map<string, ExistingRecord>();
  const existingPatientKeys = new Set<string>();

  for (const record of existingRecords) {
    const measureKey = `${record.memberName}|${record.memberDob}|${record.requestType}|${record.qualityMeasure}`;
    existingByKey.set(measureKey, record);

    const patientKey = `${record.memberName}|${record.memberDob}`;
    existingPatientKeys.add(patientKey);
  }

  const changes: DiffChange[] = [];
  const summary: DiffSummary = {
    inserts: 0,
    updates: 0,
    skips: 0,
    duplicates: 0,
    deletes: 0,
  };

  // Track unique patients in import
  const importPatientKeys = new Set<string>();

  if (mode === 'replace') {
    // Replace All mode: Delete everything, then insert all new rows
    changes.push(...calculateReplaceAllDiff(rows, existingRecords, summary));
  } else {
    // Merge mode: Apply merge logic
    changes.push(...calculateMergeDiff(rows, existingByKey, summary));
  }

  // Count patients
  for (const row of rows) {
    const patientKey = `${row.memberName}|${row.memberDob}`;
    importPatientKeys.add(patientKey);
  }

  let newPatients = 0;
  let existingPatients = 0;
  for (const patientKey of importPatientKeys) {
    if (existingPatientKeys.has(patientKey)) {
      existingPatients++;
    } else {
      newPatients++;
    }
  }

  return {
    mode,
    summary,
    changes,
    newPatients,
    existingPatients,
    generatedAt: new Date(),
  };
}

/**
 * Load all existing patient measures from database
 */
async function loadExistingRecords(): Promise<ExistingRecord[]> {
  const measures = await prisma.patientMeasure.findMany({
    include: {
      patient: {
        include: {
          owner: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
      },
    },
  });

  return measures.map((m) => ({
    patientId: m.patientId,
    measureId: m.id,
    memberName: m.patient.memberName,
    memberDob: m.patient.memberDob.toISOString().split('T')[0],
    memberTelephone: m.patient.memberTelephone,
    memberAddress: m.patient.memberAddress,
    requestType: m.requestType,
    qualityMeasure: m.qualityMeasure,
    measureStatus: m.measureStatus,
    ownerId: m.patient.ownerId,
    ownerName: m.patient.owner?.displayName ?? null,
  }));
}

/**
 * Calculate diff for Replace All mode
 * Delete all existing, insert all new
 * Exported for testing
 */
export function calculateReplaceAllDiff(
  rows: TransformedRow[],
  existingRecords: ExistingRecord[],
  summary: DiffSummary
): DiffChange[] {
  const changes: DiffChange[] = [];

  // Add DELETE for all existing records
  for (const record of existingRecords) {
    changes.push({
      action: 'DELETE',
      memberName: record.memberName,
      memberDob: record.memberDob,
      memberTelephone: record.memberTelephone,
      memberAddress: record.memberAddress,
      requestType: record.requestType || '',
      qualityMeasure: record.qualityMeasure || '',
      oldStatus: record.measureStatus,
      newStatus: null,
      existingPatientId: record.patientId,
      existingMeasureId: record.measureId,
      reason: 'Replace All mode - deleting existing record',
    });
    summary.deletes++;
  }

  // Add INSERT for all new rows
  for (const row of rows) {
    changes.push({
      action: 'INSERT',
      memberName: row.memberName,
      memberDob: row.memberDob,
      memberTelephone: row.memberTelephone,
      memberAddress: row.memberAddress,
      requestType: row.requestType,
      qualityMeasure: row.qualityMeasure,
      oldStatus: null,
      newStatus: row.measureStatus,
      sourceRowIndex: row.sourceRowIndex,
      reason: 'Replace All mode - inserting new record',
    });
    summary.inserts++;
  }

  return changes;
}

/**
 * Calculate diff for Merge mode
 * Apply merge logic based on compliance states
 * Exported for testing
 */
export function calculateMergeDiff(
  rows: TransformedRow[],
  existingByKey: Map<string, ExistingRecord>,
  summary: DiffSummary
): DiffChange[] {
  const changes: DiffChange[] = [];

  for (const row of rows) {
    const measureKey = `${row.memberName}|${row.memberDob}|${row.requestType}|${row.qualityMeasure}`;
    const existing = existingByKey.get(measureKey);

    if (!existing) {
      // Case 1: Old does NOT exist, new has value -> INSERT
      changes.push({
        action: 'INSERT',
        memberName: row.memberName,
        memberDob: row.memberDob,
        memberTelephone: row.memberTelephone,
        memberAddress: row.memberAddress,
        requestType: row.requestType,
        qualityMeasure: row.qualityMeasure,
        oldStatus: null,
        newStatus: row.measureStatus,
        sourceRowIndex: row.sourceRowIndex,
        reason: 'New patient+measure combination',
      });
      summary.inserts++;
    } else {
      // Existing record found - apply merge logic
      const change = applyMergeLogic(row, existing);
      changes.push(change);

      switch (change.action) {
        case 'UPDATE':
          summary.updates++;
          break;
        case 'SKIP':
          summary.skips++;
          break;
        case 'BOTH':
          summary.duplicates++;
          break;
      }
    }
  }

  return changes;
}

/**
 * Apply merge logic for a single row against existing record
 * Exported for testing
 *
 * Merge Logic Matrix:
 * | Old Status      | New Status      | Action |
 * |-----------------|-----------------|--------|
 * | Non Compliant   | Compliant       | UPDATE |
 * | Compliant       | Compliant       | SKIP   |
 * | Non Compliant   | Non Compliant   | SKIP   |
 * | Compliant       | Non Compliant   | BOTH   |
 */
export function applyMergeLogic(
  row: TransformedRow,
  existing: ExistingRecord
): DiffChange {
  const oldCategory = categorizeStatus(existing.measureStatus);
  const newCategory = categorizeStatus(row.measureStatus);

  const baseChange: Omit<DiffChange, 'action' | 'reason'> = {
    memberName: row.memberName,
    memberDob: row.memberDob,
    memberTelephone: row.memberTelephone,
    memberAddress: row.memberAddress,
    requestType: row.requestType,
    qualityMeasure: row.qualityMeasure,
    oldStatus: existing.measureStatus,
    newStatus: row.measureStatus,
    existingPatientId: existing.patientId,
    existingMeasureId: existing.measureId,
    sourceRowIndex: row.sourceRowIndex,
  };

  // Case 2: New data is blank/unknown - SKIP (keep old)
  if (newCategory === 'unknown' && !row.measureStatus) {
    return {
      ...baseChange,
      action: 'SKIP',
      reason: 'New data is blank - keeping existing',
    };
  }

  // Case 3: Old non-compliant, new compliant -> UPDATE
  if (oldCategory === 'non-compliant' && newCategory === 'compliant') {
    return {
      ...baseChange,
      action: 'UPDATE',
      reason: 'Upgrading from non-compliant to compliant',
    };
  }

  // Case 4: Old compliant, new compliant -> SKIP
  if (oldCategory === 'compliant' && newCategory === 'compliant') {
    return {
      ...baseChange,
      action: 'SKIP',
      reason: 'Both compliant - keeping existing',
    };
  }

  // Case 5: Old non-compliant, new non-compliant -> SKIP
  if (oldCategory === 'non-compliant' && newCategory === 'non-compliant') {
    return {
      ...baseChange,
      action: 'SKIP',
      reason: 'Both non-compliant - keeping existing',
    };
  }

  // Case 6: Old compliant, new non-compliant -> BOTH (keep old + insert new)
  if (oldCategory === 'compliant' && newCategory === 'non-compliant') {
    return {
      ...baseChange,
      action: 'BOTH',
      reason: 'Downgrade detected - keeping both (old compliant + new non-compliant)',
    };
  }

  // Unknown categories - default to SKIP
  if (oldCategory === 'unknown' || newCategory === 'unknown') {
    // If old is unknown and new has a value, update
    if (oldCategory === 'unknown' && row.measureStatus) {
      return {
        ...baseChange,
        action: 'UPDATE',
        reason: 'Old status unknown, updating with new value',
      };
    }

    return {
      ...baseChange,
      action: 'SKIP',
      reason: 'Cannot determine compliance category - keeping existing',
    };
  }

  // Fallback - shouldn't reach here
  return {
    ...baseChange,
    action: 'SKIP',
    reason: 'Fallback - keeping existing',
  };
}

/**
 * Get a human-readable summary of the diff
 */
export function getDiffSummaryText(result: DiffResult): string {
  const lines: string[] = [];

  lines.push(`Import Mode: ${result.mode.toUpperCase()}`);
  lines.push(`Generated: ${result.generatedAt.toISOString()}`);
  lines.push('');
  lines.push('Summary:');
  lines.push(`  Inserts: ${result.summary.inserts}`);
  lines.push(`  Updates: ${result.summary.updates}`);
  lines.push(`  Skips: ${result.summary.skips}`);
  lines.push(`  Duplicates (BOTH): ${result.summary.duplicates}`);
  lines.push(`  Deletes: ${result.summary.deletes}`);
  lines.push('');
  lines.push('Patients:');
  lines.push(`  New: ${result.newPatients}`);
  lines.push(`  Existing: ${result.existingPatients}`);

  return lines.join('\n');
}

/**
 * Filter changes by action
 */
export function filterChangesByAction(
  changes: DiffChange[],
  action: DiffAction
): DiffChange[] {
  return changes.filter((c) => c.action === action);
}

/**
 * Get changes that will modify the database (INSERT, UPDATE, DELETE, BOTH)
 */
export function getModifyingChanges(changes: DiffChange[]): DiffChange[] {
  return changes.filter((c) => c.action !== 'SKIP');
}

/**
 * Patient reassignment info - when import would change patient's owner
 */
export interface PatientReassignment {
  patientId: number;
  memberName: string;
  memberDob: string;
  currentOwnerId: number | null;
  currentOwnerName: string | null;
  newOwnerId: number | null;
}

/**
 * Detect patients that would be reassigned during import
 * A reassignment occurs when a patient exists with owner A but is being imported for owner B
 *
 * @param rows The transformed import rows
 * @param targetOwnerId The physician ID the import is targeting (null for unassigned)
 * @returns Array of patients that would be reassigned
 */
export async function detectReassignments(
  rows: TransformedRow[],
  targetOwnerId: number | null
): Promise<PatientReassignment[]> {
  // Get unique patients from import
  const importPatients = new Map<string, { memberName: string; memberDob: string }>();
  for (const row of rows) {
    if (row.memberDob) {
      const key = `${row.memberName}|${row.memberDob}`;
      importPatients.set(key, {
        memberName: row.memberName,
        memberDob: row.memberDob,
      });
    }
  }

  if (importPatients.size === 0) {
    return [];
  }

  // Load existing patients from database with their owners
  const existingPatients = await prisma.patient.findMany({
    where: {
      OR: Array.from(importPatients.values()).map((p) => ({
        memberName: p.memberName,
        memberDob: new Date(p.memberDob),
      })),
    },
    include: {
      owner: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });

  // Find reassignments - patients whose owner would change
  const reassignments: PatientReassignment[] = [];

  for (const patient of existingPatients) {
    // Skip if owner would not change
    if (patient.ownerId === targetOwnerId) {
      continue;
    }

    // Skip if patient is unassigned and import would keep it unassigned
    if (patient.ownerId === null && targetOwnerId === null) {
      continue;
    }

    // This patient would be reassigned
    reassignments.push({
      patientId: patient.id,
      memberName: patient.memberName,
      memberDob: patient.memberDob.toISOString().split('T')[0],
      currentOwnerId: patient.ownerId,
      currentOwnerName: patient.owner?.displayName ?? null,
      newOwnerId: targetOwnerId,
    });
  }

  return reassignments;
}
