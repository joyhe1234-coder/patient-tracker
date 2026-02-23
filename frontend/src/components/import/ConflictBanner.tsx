import { AlertTriangle, Copy } from 'lucide-react';
import type { ColumnConflict, ConflictType } from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConflictBannerProps {
  conflicts: ColumnConflict[];
  systemName: string;
  onCancel: () => void;
  onCopyDetails: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Human-readable labels for each conflict type. */
const TYPE_LABELS: Record<ConflictType, string> = {
  NEW: 'New',
  CHANGED: 'Renamed',
  MISSING: 'Missing',
  DUPLICATE: 'Duplicate',
  AMBIGUOUS: 'Ambiguous',
};

/** Tailwind badge classes keyed by conflict type. */
const BADGE_CLASSES: Record<ConflictType, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CHANGED: 'bg-amber-100 text-amber-800',
  MISSING: 'bg-red-100 text-red-800',
  DUPLICATE: 'bg-red-100 text-red-800',
  AMBIGUOUS: 'bg-red-100 text-red-800',
};

/** Build a count summary string such as "2 new columns, 1 renamed column, 3 missing columns". */
function buildCountSummary(conflicts: ColumnConflict[]): string {
  const counts: Partial<Record<ConflictType, number>> = {};
  for (const c of conflicts) {
    counts[c.type] = (counts[c.type] ?? 0) + 1;
  }

  const parts: string[] = [];

  const labels: Record<ConflictType, string> = {
    NEW: 'new',
    CHANGED: 'renamed',
    MISSING: 'missing',
    DUPLICATE: 'duplicate',
    AMBIGUOUS: 'ambiguous',
  };

  const order: ConflictType[] = ['NEW', 'CHANGED', 'MISSING', 'DUPLICATE', 'AMBIGUOUS'];

  for (const type of order) {
    const n = counts[type];
    if (n && n > 0) {
      parts.push(`${n} ${labels[type]} column${n !== 1 ? 's' : ''}`);
    }
  }

  return parts.join(', ');
}

/** Group conflicts by their type. */
function groupByType(conflicts: ColumnConflict[]): Map<ConflictType, ColumnConflict[]> {
  const groups = new Map<ConflictType, ColumnConflict[]>();
  for (const c of conflicts) {
    const list = groups.get(c.type) ?? [];
    list.push(c);
    groups.set(c.type, list);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Read-only blocking banner shown to non-admin users when column mapping
 * conflicts are detected during file import.
 *
 * The banner prevents the user from proceeding with the import and instructs
 * them to contact an administrator. It shows a count summary, a grouped list
 * of conflicts with color-coded badges, and Cancel / Copy Details buttons.
 */
export function ConflictBanner({
  conflicts,
  systemName,
  onCancel,
  onCopyDetails,
}: ConflictBannerProps) {
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  const grouped = groupByType(conflicts);
  const summary = buildCountSummary(conflicts);

  return (
    <div
      role="alert"
      className="bg-amber-50 border border-amber-300 rounded-lg p-4"
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          {/* Title */}
          <div className="font-medium text-amber-900">
            Column mapping conflicts detected
          </div>

          {/* Instruction */}
          <p className="text-sm text-amber-800 mt-1">
            Please contact your administrator to resolve the mapping for{' '}
            <span className="font-semibold">{systemName}</span> before importing.
          </p>

          {/* Count summary */}
          <p className="text-sm text-amber-700 mt-2 font-medium">
            {summary}
          </p>

          {/* Grouped conflict list */}
          <div className="mt-3 space-y-3 max-h-60 overflow-y-auto">
            {Array.from(grouped.entries()).map(([type, items]) => (
              <div key={type}>
                {/* Group header with badge */}
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${BADGE_CLASSES[type]}`}
                  >
                    {TYPE_LABELS[type]}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({items.length})
                  </span>
                </div>

                {/* Individual conflicts */}
                <ul className="ml-4 space-y-1">
                  {items.map((conflict) => (
                    <li
                      key={conflict.id}
                      className="text-sm text-gray-700"
                    >
                      <span className="font-medium">{conflict.sourceHeader}</span>
                      {conflict.configColumn && (
                        <span className="text-gray-500">
                          {' '}&rarr; {conflict.configColumn}
                        </span>
                      )}
                      {conflict.message && (
                        <span className="text-gray-500 ml-1">
                          &mdash; {conflict.message}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onCopyDetails}
              aria-label="Copy conflict details to clipboard"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-blue-700 bg-white border border-blue-300 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400"
            >
              <Copy className="w-4 h-4" />
              Copy Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
