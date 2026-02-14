import { prisma } from '../config/database.js';
import type { GridRowPayload } from '../types/socket.js';

/**
 * Result of a version check for optimistic concurrency control.
 */
export interface ConflictResult {
  hasConflict: boolean;
  conflictFields: string[];
  serverRow: GridRowPayload | null;
  changedBy: string | null;
}

/**
 * Convert a PatientMeasure (with included patient) to a GridRowPayload.
 */
function toGridRowPayload(measure: {
  id: number;
  patientId: number;
  patient: {
    memberName: string;
    memberDob: Date;
    memberTelephone: string | null;
    memberAddress: string | null;
    insuranceGroup: string | null;
  };
  requestType: string | null;
  qualityMeasure: string | null;
  measureStatus: string | null;
  statusDate: Date | null;
  statusDatePrompt: string | null;
  tracking1: string | null;
  tracking2: string | null;
  tracking3: string | null;
  dueDate: Date | null;
  timeIntervalDays: number | null;
  notes: string | null;
  rowOrder: number;
  isDuplicate: boolean;
  hgba1cGoal: string | null;
  hgba1cGoalReachedYear: boolean;
  hgba1cDeclined: boolean;
  updatedAt: Date;
}): GridRowPayload {
  return {
    id: measure.id,
    patientId: measure.patientId,
    memberName: measure.patient.memberName,
    memberDob: measure.patient.memberDob.toISOString(),
    memberTelephone: measure.patient.memberTelephone,
    memberAddress: measure.patient.memberAddress,
    insuranceGroup: measure.patient.insuranceGroup,
    requestType: measure.requestType,
    qualityMeasure: measure.qualityMeasure,
    measureStatus: measure.measureStatus,
    statusDate: measure.statusDate ? measure.statusDate.toISOString() : null,
    statusDatePrompt: measure.statusDatePrompt,
    tracking1: measure.tracking1,
    tracking2: measure.tracking2,
    tracking3: measure.tracking3,
    dueDate: measure.dueDate ? measure.dueDate.toISOString() : null,
    timeIntervalDays: measure.timeIntervalDays,
    notes: measure.notes,
    rowOrder: measure.rowOrder,
    isDuplicate: measure.isDuplicate,
    hgba1cGoal: measure.hgba1cGoal,
    hgba1cGoalReachedYear: measure.hgba1cGoalReachedYear,
    hgba1cDeclined: measure.hgba1cDeclined,
    updatedAt: measure.updatedAt.toISOString(),
  };
}

export { toGridRowPayload };

/**
 * Check if an update to a PatientMeasure row would conflict with a concurrent change.
 *
 * Uses optimistic concurrency control: the client sends the `expectedVersion`
 * (the `updatedAt` timestamp it last read) along with the fields it changed.
 * If another user has updated the row since then:
 *   - If the changed fields overlap: return a conflict with details.
 *   - If the changed fields do NOT overlap: no conflict (auto-merge).
 *
 * @param measureId - The ID of the PatientMeasure row being updated.
 * @param expectedVersion - ISO timestamp the client believes is current.
 * @param incomingChangedFields - The field names the client is changing.
 * @returns ConflictResult indicating whether there is a conflict.
 */
export async function checkVersion(
  measureId: number,
  expectedVersion: string,
  incomingChangedFields: string[],
): Promise<ConflictResult> {
  // Fetch the current row from the database
  const currentRow = await prisma.patientMeasure.findUnique({
    where: { id: measureId },
    include: { patient: true },
  });

  if (!currentRow) {
    // Row has been deleted — caller should handle 404 separately
    return { hasConflict: false, conflictFields: [], serverRow: null, changedBy: null };
  }

  // Compare timestamps
  const expectedDate = new Date(expectedVersion);
  const actualDate = currentRow.updatedAt;

  // If timestamps match, no conflict
  if (expectedDate.getTime() === actualDate.getTime()) {
    return { hasConflict: false, conflictFields: [], serverRow: null, changedBy: null };
  }

  // Timestamps differ — another user has changed this row.
  // Look up who changed it via AuditLog.
  let changedBy: string | null = null;
  try {
    const recentLog = await prisma.auditLog.findFirst({
      where: {
        entity: 'patient_measure',
        entityId: measureId,
        action: 'UPDATE',
        createdAt: { gte: expectedDate },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { displayName: true, email: true } },
      },
    });
    if (recentLog) {
      changedBy = recentLog.user?.displayName || recentLog.userEmail || null;
    }
  } catch {
    // Non-fatal: if we can't look up who changed it, continue
  }

  // Determine which fields the other user changed by checking AuditLog changes
  let serverChangedFields: string[] = [];
  try {
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'patient_measure',
        entityId: measureId,
        action: 'UPDATE',
        createdAt: { gte: expectedDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Use flatMap + Set for deduplication instead of nested loops
    serverChangedFields = [...new Set(recentLogs.flatMap((log) => {
      const changes = log.changes as { fields?: Array<{ field: string }> } | null;
      return changes?.fields?.map((c) => c.field) ?? [];
    }))];
  } catch {
    // Non-fatal: if we can't determine fields, treat as full conflict
  }

  // If we found no field-level info in audit log, we must assume full conflict
  // (since we cannot determine overlap).
  if (serverChangedFields.length === 0) {
    return {
      hasConflict: true,
      conflictFields: incomingChangedFields,
      serverRow: toGridRowPayload(currentRow),
      changedBy,
    };
  }

  // Check for field overlap
  const overlappingFields = incomingChangedFields.filter(
    (field) => serverChangedFields.includes(field),
  );

  if (overlappingFields.length === 0) {
    // No overlap — auto-merge is safe
    return { hasConflict: false, conflictFields: [], serverRow: null, changedBy: null };
  }

  // Overlap found — conflict
  return {
    hasConflict: true,
    conflictFields: overlappingFields,
    serverRow: toGridRowPayload(currentRow),
    changedBy,
  };
}
