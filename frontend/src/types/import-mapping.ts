/**
 * Types for the Smart Column Mapping feature.
 *
 * These mirror the backend Prisma enums and service interfaces so that
 * frontend components can consume conflict-detection and mapping data
 * in a type-safe way.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type ConflictType =
  | 'NEW'
  | 'MISSING'
  | 'CHANGED'
  | 'DUPLICATE'
  | 'AMBIGUOUS';

export type ConflictSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

// ---------------------------------------------------------------------------
// Fuzzy matching
// ---------------------------------------------------------------------------

export interface FuzzySuggestion {
  columnName: string;
  score: number;
  targetType: string;
  measureInfo?: {
    requestType: string;
    qualityMeasure: string;
  };
}

// ---------------------------------------------------------------------------
// Column conflict (returned by conflict-detection endpoint)
// ---------------------------------------------------------------------------

export interface ColumnConflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  category: string;
  sourceHeader: string;
  configColumn: string | null;
  suggestions: FuzzySuggestion[];
  resolution: null;
  message: string;
}

// ---------------------------------------------------------------------------
// Column mapping (merged view of JSON seed + DB overrides)
// ---------------------------------------------------------------------------

export interface MergedColumnMapping {
  sourceColumn: string;
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'IGNORED';
  targetField: string | null;
  requestType: string | null;
  qualityMeasure: string | null;
  isOverride: boolean;
  isActive: boolean;
  overrideId: number | null;
}

// ---------------------------------------------------------------------------
// Dropdown options for mapping UI
// ---------------------------------------------------------------------------

export interface QualityMeasureOption {
  requestType: string;
  qualityMeasure: string;
  label: string;
}

export interface PatientFieldOption {
  field: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Action mapping (merged view for Sutter action patterns)
// ---------------------------------------------------------------------------

export interface MergedActionMapping {
  pattern: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  isOverride: boolean;
  isActive: boolean;
  overrideId: number | null;
}

// ---------------------------------------------------------------------------
// Mapping change request (sent from UI to parent)
// ---------------------------------------------------------------------------

export interface MappingChangeRequest {
  sourceColumn: string;
  targetType: 'PATIENT' | 'MEASURE' | 'DATA' | 'IGNORED';
  targetField?: string;
  requestType?: string;
  qualityMeasure?: string;
}

export interface ActionChangeRequest {
  pattern: string;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string;
  isActive?: boolean;
}

// ---------------------------------------------------------------------------
// Conflict resolution (sent from ConflictResolutionStep to backend)
// ---------------------------------------------------------------------------

export interface ConflictResolution {
  action: 'ACCEPT_SUGGESTION' | 'MAP_TO_MEASURE' | 'MAP_TO_PATIENT' | 'IGNORE' | 'KEEP' | 'REMOVE';
  targetMeasure?: {
    requestType: string;
    qualityMeasure: string;
  };
  targetPatientField?: string;
  suggestionIndex?: number;
}

export interface ResolvedConflict {
  conflictId: string;
  sourceColumn: string;
  resolution: ConflictResolution;
}

// ---------------------------------------------------------------------------
// Merged system config (returned after conflict resolution)
// ---------------------------------------------------------------------------

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
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
}
