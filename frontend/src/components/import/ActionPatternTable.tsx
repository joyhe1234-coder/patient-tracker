import { useState } from 'react';
import { Trash2, Plus } from 'lucide-react';
import type {
  MergedActionMapping,
  ActionChangeRequest,
  QualityMeasureOption,
} from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ActionPatternTableProps {
  actionMappings: MergedActionMapping[];
  skipActions: string[];
  mode: 'view' | 'edit';
  qualityMeasures: QualityMeasureOption[];
  onActionChange?: (index: number, change: ActionChangeRequest) => void;
  onSkipActionAdd?: (actionText: string) => void;
  onSkipActionRemove?: (actionText: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Validate a regex pattern string; returns an error message or null. */
function validateRegex(pattern: string): string | null {
  if (!pattern.trim()) return 'Pattern is required';
  try {
    new RegExp(pattern);
    return null;
  } catch {
    return 'Invalid regex';
  }
}

/** Derive unique request types from the quality measure options. */
function getUniqueRequestTypes(
  qualityMeasures: QualityMeasureOption[],
): string[] {
  const set = new Set<string>();
  for (const qm of qualityMeasures) {
    set.add(qm.requestType);
  }
  return Array.from(set);
}

/** Filter quality measures by a given request type. */
function filterByRequestType(
  qualityMeasures: QualityMeasureOption[],
  requestType: string,
): QualityMeasureOption[] {
  return qualityMeasures.filter((qm) => qm.requestType === requestType);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Table for viewing and editing Sutter action regex patterns.
 *
 * In **view** mode the table is read-only, displaying each pattern with its
 * associated requestType, qualityMeasure, measureStatus, and an override badge
 * when the mapping comes from the database rather than the JSON seed.
 *
 * In **edit** mode each row provides inline editing: a text input for the
 * regex pattern (with client-side validation feedback), and dropdowns for
 * requestType and qualityMeasure.
 *
 * A separate "Skip Actions" section lists action texts that should be silently
 * skipped during import. In edit mode the list provides remove buttons and an
 * input to add new entries.
 */
export function ActionPatternTable({
  actionMappings,
  skipActions,
  mode,
  qualityMeasures,
  onActionChange,
  onSkipActionAdd,
  onSkipActionRemove,
}: ActionPatternTableProps) {
  const isEdit = mode === 'edit';

  // Track per-row regex validation errors keyed by index
  const [regexErrors, setRegexErrors] = useState<Record<number, string | null>>(
    {},
  );

  // Skip action input state
  const [newSkipAction, setNewSkipAction] = useState('');

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  function handlePatternChange(index: number, value: string) {
    const error = validateRegex(value);
    setRegexErrors((prev) => ({ ...prev, [index]: error }));

    const mapping = actionMappings[index];
    onActionChange?.(index, {
      pattern: value,
      requestType: mapping.requestType,
      qualityMeasure: mapping.qualityMeasure,
      measureStatus: mapping.measureStatus,
      isActive: mapping.isActive,
    });
  }

  function handleRequestTypeChange(index: number, value: string) {
    const mapping = actionMappings[index];
    // When the request type changes, reset the quality measure to the first
    // available option for the new type (or empty if none match).
    const available = filterByRequestType(qualityMeasures, value);
    const newQualityMeasure =
      available.length > 0 ? available[0].qualityMeasure : '';

    onActionChange?.(index, {
      pattern: mapping.pattern,
      requestType: value,
      qualityMeasure: newQualityMeasure,
      measureStatus: mapping.measureStatus,
      isActive: mapping.isActive,
    });
  }

  function handleQualityMeasureChange(index: number, value: string) {
    const mapping = actionMappings[index];
    onActionChange?.(index, {
      pattern: mapping.pattern,
      requestType: mapping.requestType,
      qualityMeasure: value,
      measureStatus: mapping.measureStatus,
      isActive: mapping.isActive,
    });
  }

  function handleAddSkipAction() {
    const trimmed = newSkipAction.trim();
    if (!trimmed) return;
    onSkipActionAdd?.(trimmed);
    setNewSkipAction('');
  }

  function handleSkipActionKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkipAction();
    }
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const requestTypes = getUniqueRequestTypes(qualityMeasures);

  return (
    <div className="space-y-6">
      {/* ---- Action Pattern Mappings ---- */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Action Pattern Mappings
        </h3>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="max-h-96 overflow-y-auto overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pattern
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Request Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Quality Measure
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Measure Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Source
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {actionMappings.map((mapping, idx) => {
                  const availableMeasures = filterByRequestType(
                    qualityMeasures,
                    mapping.requestType,
                  );
                  const regexError = regexErrors[idx] ?? null;

                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-gray-50 ${
                        !mapping.isActive ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Pattern */}
                      <td className="px-4 py-3">
                        {isEdit ? (
                          <div>
                            <input
                              type="text"
                              value={mapping.pattern}
                              onChange={(e) =>
                                handlePatternChange(idx, e.target.value)
                              }
                              className={`w-full px-2 py-1 text-sm font-mono border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                regexError
                                  ? 'border-red-400 focus:ring-red-500'
                                  : 'border-gray-300'
                              }`}
                              aria-label={`Pattern for row ${idx + 1}`}
                              aria-invalid={regexError ? 'true' : 'false'}
                            />
                            {regexError && (
                              <p className="mt-1 text-xs text-red-600">
                                {regexError}
                              </p>
                            )}
                          </div>
                        ) : (
                          <code className="text-sm font-mono text-gray-800 break-all">
                            {mapping.pattern}
                          </code>
                        )}
                      </td>

                      {/* Request Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEdit ? (
                          <select
                            value={mapping.requestType}
                            onChange={(e) =>
                              handleRequestTypeChange(idx, e.target.value)
                            }
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={`Request type for row ${idx + 1}`}
                          >
                            {requestTypes.map((rt) => (
                              <option key={rt} value={rt}>
                                {rt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {mapping.requestType}
                          </span>
                        )}
                      </td>

                      {/* Quality Measure */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isEdit ? (
                          <select
                            value={mapping.qualityMeasure}
                            onChange={(e) =>
                              handleQualityMeasureChange(idx, e.target.value)
                            }
                            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={`Quality measure for row ${idx + 1}`}
                          >
                            {availableMeasures.map((qm) => (
                              <option
                                key={qm.qualityMeasure}
                                value={qm.qualityMeasure}
                              >
                                {qm.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-700">
                            {mapping.qualityMeasure}
                          </span>
                        )}
                      </td>

                      {/* Measure Status */}
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                        {mapping.measureStatus}
                      </td>

                      {/* Source (override badge) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {mapping.isOverride ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">
                            Override
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-600">
                            Default
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {actionMappings.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No action pattern mappings configured.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ---- Skip Actions ---- */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Skip Actions
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          Action texts listed here will be silently skipped during import.
        </p>

        <div className="bg-white rounded-lg shadow p-4">
          {skipActions.length > 0 ? (
            <ul className="space-y-2">
              {skipActions.map((action, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 rounded"
                >
                  <span className="text-sm text-gray-700 break-all">
                    {action}
                  </span>
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => onSkipActionRemove?.(action)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400"
                      aria-label={`Remove skip action: ${action}`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              No skip actions configured.
            </p>
          )}

          {isEdit && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={newSkipAction}
                onChange={(e) => setNewSkipAction(e.target.value)}
                onKeyDown={handleSkipActionKeyDown}
                placeholder="Enter action text to skip..."
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="New skip action text"
              />
              <button
                type="button"
                onClick={handleAddSkipAction}
                disabled={!newSkipAction.trim()}
                className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                  newSkipAction.trim()
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
                aria-label="Add skip action"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
