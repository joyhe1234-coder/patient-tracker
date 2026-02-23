import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../../api/axios';
import { ConflictBanner } from './ConflictBanner';
import type {
  ColumnConflict,
  ConflictResolution,
  ConflictType,
  MergedSystemConfig,
  ResolvedConflict,
} from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConflictResolutionStepProps {
  conflicts: ColumnConflict[];
  systemId: string;
  isAdmin: boolean;
  onResolved: (updatedMapping: MergedSystemConfig) => void;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Tailwind badge classes keyed by conflict type. */
const BADGE_CLASSES: Record<ConflictType, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CHANGED: 'bg-amber-100 text-amber-800',
  MISSING: 'bg-red-100 text-red-800',
  DUPLICATE: 'bg-red-100 text-red-800',
  AMBIGUOUS: 'bg-red-100 text-red-800',
};

/** Human-readable labels for each conflict type. */
const TYPE_LABELS: Record<ConflictType, string> = {
  NEW: 'New',
  CHANGED: 'Renamed',
  MISSING: 'Missing',
  DUPLICATE: 'Duplicate',
  AMBIGUOUS: 'Ambiguous',
};

/** Resolution options by conflict type. */
const RESOLUTION_OPTIONS: Record<ConflictType, { value: ConflictResolution['action']; label: string }[]> = {
  NEW: [
    { value: 'MAP_TO_MEASURE', label: 'Map to measure' },
    { value: 'MAP_TO_PATIENT', label: 'Map to patient field' },
    { value: 'IGNORE', label: 'Ignore' },
  ],
  MISSING: [
    { value: 'KEEP', label: 'Keep mapping' },
    { value: 'REMOVE', label: 'Remove mapping' },
  ],
  CHANGED: [
    { value: 'ACCEPT_SUGGESTION', label: 'Accept suggestion' },
    { value: 'MAP_TO_MEASURE', label: 'Map to different measure' },
    { value: 'IGNORE', label: 'Ignore' },
  ],
  DUPLICATE: [
    { value: 'ACCEPT_SUGGESTION', label: 'Select this mapping' },
    { value: 'IGNORE', label: 'Ignore others' },
  ],
  AMBIGUOUS: [
    { value: 'ACCEPT_SUGGESTION', label: 'Select correct mapping' },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a clipboard-ready text summary of all conflicts. */
function buildConflictSummaryText(
  conflicts: ColumnConflict[],
  systemId: string,
): string {
  const lines: string[] = [];
  lines.push(`Column Mapping Conflicts - System: ${systemId}`);
  lines.push(`Total conflicts: ${conflicts.length}`);
  lines.push('');

  for (const conflict of conflicts) {
    lines.push(`[${conflict.type}] "${conflict.sourceHeader}"`);
    if (conflict.configColumn) {
      lines.push(`  Config column: ${conflict.configColumn}`);
    }
    lines.push(`  Severity: ${conflict.severity}`);
    lines.push(`  Message: ${conflict.message}`);
    if (conflict.suggestions.length > 0) {
      lines.push(`  Suggestions:`);
      for (const s of conflict.suggestions) {
        lines.push(`    - ${s.columnName} (${Math.round(s.score * 100)}% match)`);
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Format a fuzzy score (0.0-1.0) as a percentage string. */
function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Count conflicts by type. */
function countByType(conflicts: ColumnConflict[]): Partial<Record<ConflictType, number>> {
  const counts: Partial<Record<ConflictType, number>> = {};
  for (const c of conflicts) {
    counts[c.type] = (counts[c.type] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Color-coded count chip for the summary banner. */
function CountChip({
  label,
  count,
  colorClass,
}: {
  label: string;
  count: number;
  colorClass: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold ${colorClass}`}>
      {count} {label}
    </span>
  );
}

/** A single conflict row in the resolution form. */
function ConflictRow({
  conflict,
  resolution,
  onResolve,
  rowRef,
}: {
  conflict: ColumnConflict;
  resolution: ConflictResolution | undefined;
  onResolve: (conflictId: string, resolution: ConflictResolution) => void;
  rowRef?: React.RefObject<HTMLDivElement>;
}) {
  const options = RESOLUTION_OPTIONS[conflict.type] ?? [];
  const topSuggestion = conflict.suggestions.length > 0 ? conflict.suggestions[0] : null;

  const handleActionChange = (action: ConflictResolution['action']) => {
    const newResolution: ConflictResolution = { action };

    // Auto-populate suggestion data for ACCEPT_SUGGESTION
    if (action === 'ACCEPT_SUGGESTION' && topSuggestion) {
      newResolution.suggestionIndex = 0;
      if (topSuggestion.measureInfo) {
        newResolution.targetMeasure = {
          requestType: topSuggestion.measureInfo.requestType,
          qualityMeasure: topSuggestion.measureInfo.qualityMeasure,
        };
      }
      if (topSuggestion.patientFieldInfo) {
        newResolution.targetPatientField = topSuggestion.patientFieldInfo.targetField;
      }
    }

    onResolve(conflict.id, newResolution);
  };

  const isResolved = resolution !== undefined;

  return (
    <div
      ref={rowRef}
      tabIndex={-1}
      className={`border rounded-lg p-4 transition-colors ${
        isResolved
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
      data-testid={`conflict-row-${conflict.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: source header + type badge + suggestions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 break-all">
              {conflict.sourceHeader}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${BADGE_CLASSES[conflict.type]}`}
            >
              {TYPE_LABELS[conflict.type]}
            </span>
            {isResolved && (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mt-1">{conflict.message}</p>

          {/* Config column reference */}
          {conflict.configColumn && (
            <p className="text-xs text-gray-500 mt-1">
              Config column: <span className="font-medium">{conflict.configColumn}</span>
            </p>
          )}

          {/* Top suggestions */}
          {conflict.suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {conflict.suggestions.slice(0, 3).map((s, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      s.score >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : s.score >= 0.6
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {s.columnName}
                    <span className="font-semibold">{formatScore(s.score)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: resolution dropdown */}
        <div className="sm:w-56 flex-shrink-0">
          <label
            htmlFor={`resolution-${conflict.id}`}
            className="sr-only"
          >
            Resolution for {conflict.sourceHeader}
          </label>
          <select
            id={`resolution-${conflict.id}`}
            value={resolution?.action ?? ''}
            onChange={(e) => {
              if (e.target.value) {
                handleActionChange(e.target.value as ConflictResolution['action']);
              }
            }}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label={`Resolution for ${conflict.sourceHeader}`}
          >
            <option value="">-- Select resolution --</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Interactive conflict resolution step for the import workflow.
 *
 * - Non-admin users see the read-only `ConflictBanner` with a "Copy Details"
 *   button that copies a structured summary to the clipboard.
 * - Admin users see a full interactive resolution form with per-conflict
 *   dropdowns, a progress indicator, and Save/Cancel actions.
 */
export function ConflictResolutionStep({
  conflicts,
  systemId,
  isAdmin,
  onResolved,
  onCancel,
}: ConflictResolutionStepProps) {
  // Resolution state: map of conflictId -> chosen resolution
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref for focus management
  const firstRowRef = useRef<HTMLDivElement>(null);

  // Derived counts
  const resolvedCount = Object.keys(resolutions).length;
  const totalConflicts = conflicts.length;
  const counts = countByType(conflicts);

  // Focus the first unresolved conflict row on mount
  useEffect(() => {
    // Delay slightly to ensure DOM is rendered
    const timer = setTimeout(() => {
      firstRowRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Handle resolution selection
  const handleResolve = useCallback(
    (conflictId: string, resolution: ConflictResolution) => {
      setResolutions((prev) => ({
        ...prev,
        [conflictId]: resolution,
      }));
      setError(null);
    },
    [],
  );

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const resolvedConflicts: ResolvedConflict[] = conflicts.map((c) => ({
        conflictId: c.id,
        sourceColumn: c.sourceHeader,
        resolution: resolutions[c.id],
      }));

      const response = await api.post(
        `/import/mappings/${encodeURIComponent(systemId)}/resolve`,
        { resolutions: resolvedConflicts },
      );

      const updatedMapping: MergedSystemConfig = response.data.data ?? response.data;
      onResolved(updatedMapping);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const message =
        axiosErr.response?.data?.error?.message ??
        axiosErr.message ??
        'Failed to save conflict resolutions. Please try again.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [conflicts, resolutions, systemId, onResolved]);

  // Handle copy details for non-admin view
  const handleCopyDetails = useCallback(() => {
    const text = buildConflictSummaryText(conflicts, systemId);
    navigator.clipboard.writeText(text);
  }, [conflicts, systemId]);

  // -------------------------------------------------------------------------
  // Non-admin: delegate to ConflictBanner
  // -------------------------------------------------------------------------
  if (!isAdmin) {
    return (
      <ConflictBanner
        conflicts={conflicts}
        systemName={systemId}
        onCancel={onCancel}
        onCopyDetails={handleCopyDetails}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Admin: full interactive resolution form
  // -------------------------------------------------------------------------
  const allResolved = resolvedCount === totalConflicts;

  return (
    <div className="space-y-4">
      {/* Color-coded summary banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-medium text-amber-900">
              Column mapping conflicts detected
            </div>
            <p className="text-sm text-amber-800 mt-1">
              Resolve each conflict below before continuing with the import for{' '}
              <span className="font-semibold">{systemId}</span>.
            </p>

            {/* Color-coded counts */}
            <div className="flex flex-wrap gap-2 mt-3">
              {(counts.NEW ?? 0) > 0 && (
                <CountChip label="new" count={counts.NEW!} colorClass="bg-blue-100 text-blue-800" />
              )}
              {(counts.CHANGED ?? 0) > 0 && (
                <CountChip label="renamed" count={counts.CHANGED!} colorClass="bg-amber-100 text-amber-800" />
              )}
              {(counts.MISSING ?? 0) > 0 && (
                <CountChip label="missing" count={counts.MISSING!} colorClass="bg-red-100 text-red-800" />
              )}
              {(counts.DUPLICATE ?? 0) > 0 && (
                <CountChip label="duplicate" count={counts.DUPLICATE!} colorClass="bg-red-100 text-red-800" />
              )}
              {(counts.AMBIGUOUS ?? 0) > 0 && (
                <CountChip label="ambiguous" count={counts.AMBIGUOUS!} colorClass="bg-red-100 text-red-800" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aria-live region: progress announcement */}
      <div aria-live="polite" className="sr-only">
        {resolvedCount} of {totalConflicts} conflicts resolved
      </div>

      {/* Visible progress bar */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          {resolvedCount} of {totalConflicts} conflicts resolved
        </span>
        {allResolved && (
          <span className="text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            All resolved
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            allResolved ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${totalConflicts > 0 ? (resolvedCount / totalConflicts) * 100 : 0}%` }}
          role="progressbar"
          aria-valuenow={resolvedCount}
          aria-valuemin={0}
          aria-valuemax={totalConflicts}
          aria-label="Conflict resolution progress"
        />
      </div>

      {/* Conflict rows */}
      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <ConflictRow
            key={conflict.id}
            conflict={conflict}
            resolution={resolutions[conflict.id]}
            onResolve={handleResolve}
            rowRef={index === 0 ? firstRowRef : undefined}
          />
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div
          role="alert"
          className="bg-red-50 border border-red-300 rounded-lg p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!allResolved || isSaving}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? 'Saving...' : 'Save & Continue'}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-5 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
