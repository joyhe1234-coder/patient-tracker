/**
 * Import Executor
 * Executes import operations by writing to the database based on previewed diff changes
 */

import { prisma } from '../../config/database.js';
import { getPreview, deletePreview, PreviewEntry } from './previewCache.js';
import { DiffChange, DiffAction } from './diffCalculator.js';
import { calculateDueDate } from '../dueDateCalculator.js';
import { syncAllDuplicateFlags } from '../duplicateDetector.js';
import { Prisma } from '@prisma/client';

/**
 * Execution error for individual operations
 */
export interface ExecutionError {
  action: DiffAction;
  memberName: string;
  qualityMeasure: string;
  error: string;
  sourceRowIndex?: number;
}

/**
 * Result of import execution
 */
export interface ExecutionResult {
  success: boolean;
  mode: 'replace' | 'merge';
  stats: {
    inserted: number;
    updated: number;
    deleted: number;
    skipped: number;
    bothKept: number;
  };
  errors: ExecutionError[];
  duration: number;
}

/**
 * Prisma transaction type
 */
type PrismaTransaction = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * Execute an import based on a cached preview
 * @param previewId The ID of the preview to execute
 * @returns ExecutionResult with stats and any errors
 */
export async function executeImport(previewId: string): Promise<ExecutionResult> {
  const startTime = Date.now();

  // Get preview from cache
  const preview = getPreview(previewId);
  if (!preview) {
    throw new Error(`Preview not found or expired: ${previewId}`);
  }

  const stats = {
    inserted: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    bothKept: 0,
  };
  const errors: ExecutionError[] = [];

  try {
    // Execute in a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      if (preview.mode === 'replace') {
        await executeReplaceMode(preview.diff.changes, tx, stats, errors);
      } else {
        await executeMergeMode(preview.diff.changes, tx, stats, errors);
      }
    });

    // Post-execution: sync duplicate flags
    await syncAllDuplicateFlags();

    // Delete preview from cache on success
    deletePreview(previewId);

    return {
      success: errors.length === 0,
      mode: preview.mode,
      stats,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      mode: preview.mode,
      stats,
      errors: [...errors, {
        action: 'INSERT',
        memberName: 'Transaction',
        qualityMeasure: '',
        error: `Transaction failed: ${errorMessage}`,
      }],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Execute Replace mode: Delete all existing, then insert all new
 */
async function executeReplaceMode(
  changes: DiffChange[],
  tx: PrismaTransaction,
  stats: ExecutionResult['stats'],
  errors: ExecutionError[]
): Promise<void> {
  // Step 1: Delete all existing (DELETE actions)
  const deleteChanges = changes.filter(c => c.action === 'DELETE');
  const deleteIds = deleteChanges
    .map(c => c.existingMeasureId)
    .filter((id): id is number => id !== undefined);

  if (deleteIds.length > 0) {
    await tx.patientMeasure.deleteMany({
      where: { id: { in: deleteIds } }
    });
    stats.deleted = deleteIds.length;
  }

  // Step 2: Insert all new (INSERT actions)
  const insertChanges = changes.filter(c => c.action === 'INSERT');
  for (const change of insertChanges) {
    try {
      await insertMeasure(change, tx);
      stats.inserted++;
    } catch (error) {
      errors.push({
        action: change.action,
        memberName: change.memberName,
        qualityMeasure: change.qualityMeasure,
        error: error instanceof Error ? error.message : String(error),
        sourceRowIndex: change.sourceRowIndex,
      });
    }
  }
}

/**
 * Execute Merge mode: Process each change by action type
 */
async function executeMergeMode(
  changes: DiffChange[],
  tx: PrismaTransaction,
  stats: ExecutionResult['stats'],
  errors: ExecutionError[]
): Promise<void> {
  for (const change of changes) {
    try {
      switch (change.action) {
        case 'INSERT':
          await insertMeasure(change, tx);
          stats.inserted++;
          break;

        case 'UPDATE':
          await updateMeasure(change, tx);
          stats.updated++;
          break;

        case 'BOTH':
          // Keep existing (no action needed) + insert new record
          await insertMeasure(change, tx);
          stats.bothKept++;
          break;

        case 'SKIP':
          stats.skipped++;
          break;

        case 'DELETE':
          // DELETE actions are not processed in merge mode
          stats.skipped++;
          break;
      }
    } catch (error) {
      errors.push({
        action: change.action,
        memberName: change.memberName,
        qualityMeasure: change.qualityMeasure,
        error: error instanceof Error ? error.message : String(error),
        sourceRowIndex: change.sourceRowIndex,
      });
    }
  }
}

/**
 * Insert a new measure record
 */
async function insertMeasure(
  change: DiffChange,
  tx: PrismaTransaction
): Promise<void> {
  // Handle null DOB - use a default or skip
  if (!change.memberDob) {
    throw new Error(`Cannot insert measure for ${change.memberName}: DOB is required`);
  }

  const memberDob = new Date(change.memberDob);

  // Find or create patient
  let patient = await tx.patient.findUnique({
    where: {
      memberName_memberDob: {
        memberName: change.memberName,
        memberDob: memberDob,
      }
    }
  });

  if (!patient) {
    patient = await tx.patient.create({
      data: {
        memberName: change.memberName,
        memberDob: memberDob,
        memberTelephone: change.memberTelephone,
        memberAddress: change.memberAddress,
      }
    });
  }

  // Get next rowOrder (append to end)
  const maxRow = await tx.patientMeasure.aggregate({
    _max: { rowOrder: true }
  });
  const rowOrder = (maxRow._max.rowOrder ?? -1) + 1;

  // Calculate due date based on status
  const statusDate = new Date();
  const { dueDate, timeIntervalDays } = await calculateDueDate(
    statusDate,
    change.newStatus,
    null,  // tracking1
    null   // tracking2
  );

  // Create the measure
  await tx.patientMeasure.create({
    data: {
      patientId: patient.id,
      requestType: change.requestType,
      qualityMeasure: change.qualityMeasure,
      measureStatus: change.newStatus,
      statusDate: statusDate,
      dueDate: dueDate,
      timeIntervalDays: timeIntervalDays,
      rowOrder: rowOrder,
      isDuplicate: false,  // Will be recalculated after execution
    }
  });
}

/**
 * Update an existing measure record
 */
async function updateMeasure(
  change: DiffChange,
  tx: PrismaTransaction
): Promise<void> {
  if (!change.existingMeasureId) {
    throw new Error(`Cannot update measure for ${change.memberName}: no existing measure ID`);
  }

  // Calculate due date based on new status
  const statusDate = new Date();
  const { dueDate, timeIntervalDays } = await calculateDueDate(
    statusDate,
    change.newStatus,
    null,  // tracking1
    null   // tracking2
  );

  await tx.patientMeasure.update({
    where: { id: change.existingMeasureId },
    data: {
      measureStatus: change.newStatus,
      statusDate: statusDate,
      dueDate: dueDate,
      timeIntervalDays: timeIntervalDays,
    }
  });
}

/**
 * Get a preview entry (re-export for convenience)
 */
export { getPreview, deletePreview, hasValidPreview } from './previewCache.js';
