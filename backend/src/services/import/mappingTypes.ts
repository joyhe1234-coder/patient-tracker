/**
 * Shared types for the Smart Column Mapping feature.
 *
 * Defines the merged configuration types used by both conflictDetector.ts
 * and mappingService.ts, plus request/response types for CRUD operations.
 */

import type { ConflictResolution } from './conflictDetector.js';

// ---- Merged configuration types ----

export interface MergedColumnMapping {
  sourceColumn: string;
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'IGNORED';
  targetField: string | null;        // For patient columns (e.g., "memberName")
  requestType: string | null;        // For measure columns
  qualityMeasure: string | null;     // For measure columns
  isOverride: boolean;               // true = from DB, false = from JSON seed
  isActive: boolean;
  overrideId: number | null;         // DB record ID if override
}

export interface MergedActionMapping {
  pattern: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  isOverride: boolean;
  isActive: boolean;
  overrideId: number | null;
}

export interface MergedSystemConfig {
  systemId: string;
  systemName: string;
  format: 'wide' | 'long';
  patientColumns: MergedColumnMapping[];
  measureColumns: MergedColumnMapping[];
  dataColumns: MergedColumnMapping[];
  skipColumns: MergedColumnMapping[];
  actionMappings: MergedActionMapping[];
  skipActions: string[];
  statusMapping: Record<string, { compliant: string; nonCompliant: string }>;
  lastModifiedAt: Date | null;
  lastModifiedBy: string | null;
}

// ---- CRUD request types ----

export interface MappingChangeRequest {
  sourceColumn: string;
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'IGNORED';
  targetField?: string;
  requestType?: string;
  qualityMeasure?: string;
  isActive?: boolean;
}

export interface ActionChangeRequest {
  pattern: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  isActive?: boolean;
}

export interface ResolvedConflict {
  conflictId: string;
  sourceColumn: string;           // The file header / config column this resolution applies to
  resolution: ConflictResolution;
}
