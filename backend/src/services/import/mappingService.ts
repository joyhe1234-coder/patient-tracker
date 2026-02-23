/**
 * Mapping Service -- Database override CRUD and merge logic
 *
 * Encapsulates all CRUD operations for import mapping overrides.
 * Provides the merge logic that combines database overrides with JSON seed
 * defaults. Used by both API routes and the import flow.
 *
 * Merge Algorithm:
 *   1. Load JSON seed config via loadSystemConfig(systemId)
 *   2. Query DB for active ImportMappingOverride records
 *   3. Merge: DB overrides replace same sourceColumn seed entries;
 *      DB-only additions included; seed entries without overrides remain
 *   4. Build merged action list (Sutter only)
 *   5. Populate lastModifiedAt/lastModifiedBy metadata
 *   6. Return full MergedSystemConfig
 *
 * Fallback Priority:
 *   Priority 1: DB override (isActive = true)
 *   Priority 2: JSON seed file
 *   Priority 3: Error (no config available)
 */

import { prisma } from '../../config/database.js';
import { logger } from '../../utils/logger.js';
import {
  loadSystemConfig,
  isSutterConfig,
} from './configLoader.js';
import type { SystemConfig } from './configLoader.js';
import type { ImportMappingOverride, ImportActionOverride, Prisma } from '@prisma/client';
import type { ConflictResolution } from './conflictDetector.js';
import type {
  MergedColumnMapping,
  MergedActionMapping,
  MergedSystemConfig,
  MappingChangeRequest,
  ActionChangeRequest,
  ResolvedConflict,
} from './mappingTypes.js';

// Re-export types for consumers
export type {
  MergedColumnMapping,
  MergedActionMapping,
  MergedSystemConfig,
  MappingChangeRequest,
  ActionChangeRequest,
  ResolvedConflict,
} from './mappingTypes.js';

// ---- Public API ----

/**
 * Load merged config: DB overrides + JSON seed fallback.
 * Returns the complete mapping configuration for a system.
 * Falls back to JSON-only if DB is unavailable (logs warning).
 */
export async function loadMergedConfig(systemId: string): Promise<MergedSystemConfig> {
  // Step 1: Load JSON seed config
  let seedConfig: SystemConfig | null = null;
  try {
    seedConfig = loadSystemConfig(systemId);
  } catch (err) {
    logger.warn('Failed to load JSON seed config', {
      systemId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Step 2: Query DB for active overrides
  let dbOverrides: ImportMappingOverride[] = [];
  let dbActionOverrides: (ImportActionOverride & { creator: { displayName: string } })[] = [];
  let dbAvailable = true;

  try {
    dbOverrides = await prisma.importMappingOverride.findMany({
      where: { systemId, isActive: true },
    });

    dbActionOverrides = await prisma.importActionOverride.findMany({
      where: { systemId, isActive: true },
      include: { creator: { select: { displayName: true } } },
    });
  } catch (err) {
    dbAvailable = false;
    logger.warn('Database error loading mapping overrides, falling back to JSON-only', {
      systemId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // If no seed config and no DB overrides, throw
  if (!seedConfig && dbOverrides.length === 0) {
    throw new Error(`No configuration available for system: ${systemId}`);
  }

  // Step 3-4: Build merged column and action lists
  const merged = buildMergedConfig(systemId, seedConfig, dbOverrides, dbActionOverrides);

  // Step 5: Populate metadata
  await populateMetadata(merged, systemId, dbAvailable);

  return merged;
}

/**
 * Save column mapping overrides from admin edits or conflict resolution.
 * Upserts ImportMappingOverride records, creates AuditLog entry.
 * Uses optimistic locking via updatedAt comparison.
 */
export async function saveMappingOverrides(
  systemId: string,
  changes: MappingChangeRequest[],
  userId: number,
  expectedUpdatedAt?: Date,
): Promise<MergedSystemConfig> {
  // Optimistic locking: compare expectedUpdatedAt to current MAX(updatedAt)
  if (expectedUpdatedAt) {
    const latestOverride = await prisma.importMappingOverride.findFirst({
      where: { systemId },
      orderBy: { updatedAt: 'desc' },
    });

    if (latestOverride && latestOverride.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      const error = new Error(
        'Mapping configuration has been modified by another user. Please reload and try again.',
      );
      (error as Error & { statusCode: number }).statusCode = 409;
      throw error;
    }
  }

  // Capture before state for audit log
  const existingOverrides = await prisma.importMappingOverride.findMany({
    where: {
      systemId,
      sourceColumn: { in: changes.map(c => c.sourceColumn) },
    },
  });
  const beforeMap = new Map(existingOverrides.map(o => [o.sourceColumn, o]));

  // Upsert each change
  for (const change of changes) {
    await prisma.importMappingOverride.upsert({
      where: {
        systemId_sourceColumn: {
          systemId,
          sourceColumn: change.sourceColumn,
        },
      },
      create: {
        systemId,
        sourceColumn: change.sourceColumn,
        targetType: change.targetType,
        targetField: change.targetField ?? null,
        requestType: change.requestType ?? null,
        qualityMeasure: change.qualityMeasure ?? null,
        isActive: change.isActive ?? true,
        createdBy: userId,
      },
      update: {
        targetType: change.targetType,
        targetField: change.targetField ?? null,
        requestType: change.requestType ?? null,
        qualityMeasure: change.qualityMeasure ?? null,
        isActive: change.isActive ?? true,
      },
    });
  }

  // Create audit log entry
  const afterOverrides = await prisma.importMappingOverride.findMany({
    where: {
      systemId,
      sourceColumn: { in: changes.map(c => c.sourceColumn) },
    },
  });
  const afterMap = new Map(afterOverrides.map(o => [o.sourceColumn, o]));

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MAPPING_CHANGE',
      entity: 'import_mapping',
      entityId: null,
      changes: {
        systemId,
        before: Object.fromEntries(
          changes.map(c => [c.sourceColumn, serializeOverrideForAudit(beforeMap.get(c.sourceColumn))]),
        ),
        after: Object.fromEntries(
          changes.map(c => [c.sourceColumn, serializeOverrideForAudit(afterMap.get(c.sourceColumn))]),
        ),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return loadMergedConfig(systemId);
}

/**
 * Save action pattern overrides (Sutter format only).
 * Upserts ImportActionOverride records, creates AuditLog entry.
 */
export async function saveActionOverrides(
  systemId: string,
  changes: ActionChangeRequest[],
  userId: number,
): Promise<MergedSystemConfig> {
  // Capture before state for audit log
  const existingOverrides = await prisma.importActionOverride.findMany({
    where: {
      systemId,
      pattern: { in: changes.map(c => c.pattern) },
    },
  });
  const beforeMap = new Map(existingOverrides.map(o => [o.pattern, o]));

  // Upsert each change
  for (const change of changes) {
    await prisma.importActionOverride.upsert({
      where: {
        systemId_pattern: {
          systemId,
          pattern: change.pattern,
        },
      },
      create: {
        systemId,
        pattern: change.pattern,
        requestType: change.requestType,
        qualityMeasure: change.qualityMeasure,
        measureStatus: change.measureStatus,
        isActive: change.isActive ?? true,
        createdBy: userId,
      },
      update: {
        requestType: change.requestType,
        qualityMeasure: change.qualityMeasure,
        measureStatus: change.measureStatus,
        isActive: change.isActive ?? true,
      },
    });
  }

  // Create audit log entry
  const afterOverrides = await prisma.importActionOverride.findMany({
    where: {
      systemId,
      pattern: { in: changes.map(c => c.pattern) },
    },
  });
  const afterMap = new Map(afterOverrides.map(o => [o.pattern, o]));

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MAPPING_CHANGE',
      entity: 'import_mapping',
      entityId: null,
      changes: {
        systemId,
        type: 'action_overrides',
        before: Object.fromEntries(
          changes.map(c => [c.pattern, serializeActionOverrideForAudit(beforeMap.get(c.pattern))]),
        ),
        after: Object.fromEntries(
          changes.map(c => [c.pattern, serializeActionOverrideForAudit(afterMap.get(c.pattern))]),
        ),
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return loadMergedConfig(systemId);
}

/**
 * Delete all DB overrides for a system, reverting to JSON seed defaults.
 * Creates AuditLog entry recording the reset.
 */
export async function resetToDefaults(
  systemId: string,
  userId: number,
): Promise<MergedSystemConfig> {
  const [deletedMappings, deletedActions] = await Promise.all([
    prisma.importMappingOverride.deleteMany({ where: { systemId } }),
    prisma.importActionOverride.deleteMany({ where: { systemId } }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'MAPPING_RESET',
      entity: 'import_mapping',
      entityId: null,
      changes: {
        systemId,
        deletedMappings: deletedMappings.count,
        deletedActions: deletedActions.count,
      } as Prisma.InputJsonValue,
    },
  });

  return loadMergedConfig(systemId);
}

/**
 * Save conflict resolutions from inline import flow.
 * Converts ConflictResolution[] to MappingChangeRequest[] and saves.
 * Returns the updated MergedSystemConfig for immediate use.
 */
export async function resolveConflicts(
  systemId: string,
  resolutions: ResolvedConflict[],
  userId: number,
): Promise<MergedSystemConfig> {
  const changes: MappingChangeRequest[] = [];

  for (const { sourceColumn, resolution } of resolutions) {
    const change = convertResolutionToChange(resolution);
    if (change) {
      change.sourceColumn = sourceColumn;
      changes.push(change);
    }
  }

  if (changes.length === 0) {
    return loadMergedConfig(systemId);
  }

  return saveMappingOverrides(systemId, changes, userId);
}

// ---- Internal helpers ----

/**
 * Build the merged configuration from JSON seed and DB overrides.
 */
function buildMergedConfig(
  systemId: string,
  seedConfig: SystemConfig | null,
  dbOverrides: ImportMappingOverride[],
  dbActionOverrides: (ImportActionOverride & { creator: { displayName: string } })[],
): MergedSystemConfig {
  // Build override lookup by sourceColumn
  const overrideMap = new Map(dbOverrides.map(o => [o.sourceColumn, o]));

  // Determine format and system name
  const format = seedConfig ? (isSutterConfig(seedConfig) ? 'long' : 'wide') : 'wide';
  const systemName = seedConfig?.name ?? systemId;

  // Build seed column lists
  const seedPatient: MergedColumnMapping[] = [];
  const seedMeasure: MergedColumnMapping[] = [];
  const seedData: MergedColumnMapping[] = [];
  const seedSkip: MergedColumnMapping[] = [];

  if (seedConfig) {
    // Patient columns (both Hill and Sutter)
    for (const [columnName, targetField] of Object.entries(seedConfig.patientColumns)) {
      seedPatient.push({
        sourceColumn: columnName,
        targetType: 'PATIENT',
        targetField: targetField,
        requestType: null,
        qualityMeasure: null,
        isOverride: false,
        isActive: true,
        overrideId: null,
      });
    }

    if (isSutterConfig(seedConfig)) {
      // Sutter: dataColumns are simple string array
      for (const columnName of seedConfig.dataColumns) {
        seedData.push({
          sourceColumn: columnName,
          targetType: 'DATA',
          targetField: null,
          requestType: null,
          qualityMeasure: null,
          isOverride: false,
          isActive: true,
          overrideId: null,
        });
      }

      // Sutter: requestTypeMapping acts like measure columns
      for (const [columnName, mapping] of Object.entries(seedConfig.requestTypeMapping)) {
        if (mapping.requestType !== null) {
          seedMeasure.push({
            sourceColumn: columnName,
            targetType: 'MEASURE',
            targetField: null,
            requestType: mapping.requestType,
            qualityMeasure: mapping.qualityMeasure,
            isOverride: false,
            isActive: true,
            overrideId: null,
          });
        }
      }
    } else {
      // Hill: measureColumns with requestType/qualityMeasure
      for (const [columnName, mapping] of Object.entries(seedConfig.measureColumns)) {
        seedMeasure.push({
          sourceColumn: columnName,
          targetType: 'MEASURE',
          targetField: null,
          requestType: mapping.requestType,
          qualityMeasure: mapping.qualityMeasure,
          isOverride: false,
          isActive: true,
          overrideId: null,
        });
      }

      // Hill: skipColumns
      for (const columnName of seedConfig.skipColumns) {
        seedSkip.push({
          sourceColumn: columnName,
          targetType: 'IGNORED',
          targetField: null,
          requestType: null,
          qualityMeasure: null,
          isOverride: false,
          isActive: true,
          overrideId: null,
        });
      }
    }
  }

  // Merge: DB overrides replace same sourceColumn seed entries
  const allSeedColumns = [...seedPatient, ...seedMeasure, ...seedData, ...seedSkip];
  const seedColumnNames = new Set(allSeedColumns.map(c => c.sourceColumn));

  // Apply DB overrides to seed columns
  const mergedPatient = mergeColumnSection(seedPatient, overrideMap);
  const mergedMeasure = mergeColumnSection(seedMeasure, overrideMap);
  const mergedData = mergeColumnSection(seedData, overrideMap);
  const mergedSkip = mergeColumnSection(seedSkip, overrideMap);

  // Add DB-only overrides (not in seed)
  for (const override of dbOverrides) {
    if (!seedColumnNames.has(override.sourceColumn)) {
      const mapping = overrideToMergedColumn(override);
      switch (override.targetType) {
        case 'PATIENT':
          mergedPatient.push(mapping);
          break;
        case 'MEASURE':
          mergedMeasure.push(mapping);
          break;
        case 'DATA':
          mergedData.push(mapping);
          break;
        case 'IGNORED':
          mergedSkip.push(mapping);
          break;
      }
    }
  }

  // Build merged action list (Sutter only)
  const seedActionMappings: MergedActionMapping[] = [];
  let seedSkipActions: string[] = [];

  if (seedConfig && isSutterConfig(seedConfig)) {
    for (const action of seedConfig.actionMapping) {
      seedActionMappings.push({
        pattern: action.pattern,
        requestType: action.requestType,
        qualityMeasure: action.qualityMeasure,
        measureStatus: action.measureStatus,
        isOverride: false,
        isActive: true,
        overrideId: null,
      });
    }
    seedSkipActions = [...seedConfig.skipActions];
  }

  // Merge action overrides
  const actionOverrideMap = new Map(dbActionOverrides.map(o => [o.pattern, o]));
  const mergedActions = mergeActionSection(seedActionMappings, actionOverrideMap);

  // Add DB-only action overrides (not in seed)
  const seedActionPatterns = new Set(seedActionMappings.map(a => a.pattern));
  for (const override of dbActionOverrides) {
    if (!seedActionPatterns.has(override.pattern)) {
      mergedActions.push({
        pattern: override.pattern,
        requestType: override.requestType,
        qualityMeasure: override.qualityMeasure,
        measureStatus: override.measureStatus,
        isOverride: true,
        isActive: true,
        overrideId: override.id,
      });
    }
  }

  // Build status mapping (from seed only -- not overridable)
  const statusMapping: Record<string, { compliant: string; nonCompliant: string }> = {};
  if (seedConfig && !isSutterConfig(seedConfig)) {
    Object.assign(statusMapping, seedConfig.statusMapping);
  }

  return {
    systemId,
    systemName,
    format,
    patientColumns: mergedPatient,
    measureColumns: mergedMeasure,
    dataColumns: mergedData,
    skipColumns: mergedSkip,
    actionMappings: mergedActions,
    skipActions: seedSkipActions,
    statusMapping,
    lastModifiedAt: null,
    lastModifiedBy: null,
  };
}

/**
 * Merge a section of seed columns with DB overrides.
 * DB overrides replace same sourceColumn seed entries.
 */
function mergeColumnSection(
  seedColumns: MergedColumnMapping[],
  overrideMap: Map<string, ImportMappingOverride>,
): MergedColumnMapping[] {
  return seedColumns.map(seed => {
    const override = overrideMap.get(seed.sourceColumn);
    if (override) {
      return overrideToMergedColumn(override);
    }
    return { ...seed };
  });
}

/**
 * Convert a DB override record to a MergedColumnMapping.
 */
function overrideToMergedColumn(override: ImportMappingOverride): MergedColumnMapping {
  return {
    sourceColumn: override.sourceColumn,
    targetType: override.targetType,
    targetField: override.targetField,
    requestType: override.requestType,
    qualityMeasure: override.qualityMeasure,
    isOverride: true,
    isActive: override.isActive,
    overrideId: override.id,
  };
}

/**
 * Merge seed action mappings with DB action overrides.
 */
function mergeActionSection(
  seedActions: MergedActionMapping[],
  overrideMap: Map<string, ImportActionOverride & { creator: { displayName: string } }>,
): MergedActionMapping[] {
  return seedActions.map(seed => {
    const override = overrideMap.get(seed.pattern);
    if (override) {
      return {
        pattern: override.pattern,
        requestType: override.requestType,
        qualityMeasure: override.qualityMeasure,
        measureStatus: override.measureStatus,
        isOverride: true,
        isActive: override.isActive,
        overrideId: override.id,
      };
    }
    return { ...seed };
  });
}

/**
 * Populate lastModifiedAt and lastModifiedBy metadata from DB overrides.
 */
async function populateMetadata(
  merged: MergedSystemConfig,
  systemId: string,
  dbAvailable: boolean,
): Promise<void> {
  if (!dbAvailable) return;

  try {
    // Find the most recently updated override (mapping or action)
    const [latestMapping, latestAction] = await Promise.all([
      prisma.importMappingOverride.findFirst({
        where: { systemId },
        orderBy: { updatedAt: 'desc' },
        include: { creator: { select: { displayName: true } } },
      }),
      prisma.importActionOverride.findFirst({
        where: { systemId },
        orderBy: { updatedAt: 'desc' },
        include: { creator: { select: { displayName: true } } },
      }),
    ]);

    // Determine which is more recent
    let mostRecent: { updatedAt: Date; creator: { displayName: string } } | null = null;

    if (latestMapping && latestAction) {
      mostRecent = latestMapping.updatedAt >= latestAction.updatedAt
        ? latestMapping
        : latestAction;
    } else {
      mostRecent = latestMapping || latestAction;
    }

    if (mostRecent) {
      merged.lastModifiedAt = mostRecent.updatedAt;
      merged.lastModifiedBy = mostRecent.creator.displayName;
    }
  } catch (err) {
    logger.warn('Failed to populate metadata for merged config', {
      systemId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Convert a ConflictResolution into a MappingChangeRequest.
 * Returns null if the resolution does not produce a mapping change.
 */
function convertResolutionToChange(resolution: ConflictResolution): MappingChangeRequest | null {
  switch (resolution.action) {
    case 'ACCEPT_SUGGESTION': {
      // Accept a fuzzy match suggestion -- the suggestion determines the targetType and mapping
      if (resolution.targetMeasure) {
        return {
          sourceColumn: '', // Will be filled by the caller context from the conflict
          targetType: 'MEASURE',
          requestType: resolution.targetMeasure.requestType,
          qualityMeasure: resolution.targetMeasure.qualityMeasure,
        };
      }
      if (resolution.targetPatientField) {
        return {
          sourceColumn: '',
          targetType: 'PATIENT',
          targetField: resolution.targetPatientField,
        };
      }
      return null;
    }

    case 'MAP_TO_MEASURE': {
      if (!resolution.targetMeasure) return null;
      return {
        sourceColumn: '',
        targetType: 'MEASURE',
        requestType: resolution.targetMeasure.requestType,
        qualityMeasure: resolution.targetMeasure.qualityMeasure,
      };
    }

    case 'MAP_TO_PATIENT': {
      if (!resolution.targetPatientField) return null;
      return {
        sourceColumn: '',
        targetType: 'PATIENT',
        targetField: resolution.targetPatientField,
      };
    }

    case 'IGNORE': {
      return {
        sourceColumn: '',
        targetType: 'IGNORED',
      };
    }

    case 'KEEP': {
      // Keep the existing mapping -- no change needed
      return null;
    }

    case 'REMOVE': {
      return {
        sourceColumn: '',
        targetType: 'IGNORED',
        isActive: false,
      };
    }

    default:
      return null;
  }
}

/**
 * Serialize an ImportMappingOverride for audit log storage.
 */
function serializeOverrideForAudit(
  override: ImportMappingOverride | undefined | null,
): Record<string, unknown> | null {
  if (!override) return null;
  return {
    targetType: override.targetType,
    targetField: override.targetField,
    requestType: override.requestType,
    qualityMeasure: override.qualityMeasure,
    isActive: override.isActive,
  };
}

/**
 * Serialize an ImportActionOverride for audit log storage.
 */
function serializeActionOverrideForAudit(
  override: ImportActionOverride | undefined | null,
): Record<string, unknown> | null {
  if (!override) return null;
  return {
    pattern: override.pattern,
    requestType: override.requestType,
    qualityMeasure: override.qualityMeasure,
    measureStatus: override.measureStatus,
    isActive: override.isActive,
  };
}
