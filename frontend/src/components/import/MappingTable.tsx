import { Trash2 } from 'lucide-react';
import { REQUEST_TYPE_TO_QUALITY_MEASURE } from '../../config/dropdownConfig';
import type {
  MergedColumnMapping,
  QualityMeasureOption,
  PatientFieldOption,
  MappingChangeRequest,
  FuzzySuggestion,
} from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MappingTableProps {
  mappings: MergedColumnMapping[];
  mode: 'view' | 'edit' | 'resolve';
  qualityMeasures: QualityMeasureOption[];
  patientFields: PatientFieldOption[];
  onMappingChange?: (sourceColumn: string, change: MappingChangeRequest) => void;
  onDelete?: (sourceColumn: string) => void;
  /** Fuzzy suggestions per source column (resolve mode only). */
  suggestions?: Record<string, FuzzySuggestion[]>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum displayed characters for a source column name before truncation. */
const MAX_COLUMN_NAME_LENGTH = 100;

const TARGET_TYPE_OPTIONS: { value: MergedColumnMapping['targetType']; label: string }[] = [
  { value: 'MEASURE', label: 'Measure' },
  { value: 'PATIENT', label: 'Patient Field' },
  { value: 'DATA', label: 'Data' },
  { value: 'IGNORED', label: 'Ignored' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Badge classes keyed by target type. */
function getTargetTypeBadgeClasses(targetType: MergedColumnMapping['targetType']): string {
  switch (targetType) {
    case 'MEASURE':
      return 'bg-purple-100 text-purple-800';
    case 'PATIENT':
      return 'bg-blue-100 text-blue-800';
    case 'DATA':
      return 'bg-green-100 text-green-800';
    case 'IGNORED':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** Truncate text to maxLength and add ellipsis. */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\u2026';
}

/** Get the available request types from the dropdown config. */
function getRequestTypes(): string[] {
  return Object.keys(REQUEST_TYPE_TO_QUALITY_MEASURE);
}

/** Format a fuzzy score (0.0-1.0) as a percentage string. */
function formatScore(score: number): string {
  return `${Math.round(score * 100)}%`;
}

/** Build a human-readable target description for a mapping. */
function getTargetDescription(mapping: MergedColumnMapping): string {
  switch (mapping.targetType) {
    case 'MEASURE':
      if (mapping.requestType && mapping.qualityMeasure) {
        return `${mapping.requestType} / ${mapping.qualityMeasure}`;
      }
      if (mapping.requestType) return mapping.requestType;
      return 'Measure (not configured)';
    case 'PATIENT':
      return mapping.targetField ?? 'Patient field (not configured)';
    case 'DATA':
      return mapping.targetField ?? 'Data column';
    case 'IGNORED':
      return 'Ignored';
    default:
      return '-';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Read-only row for view mode. */
function ViewRow({ mapping }: { mapping: MergedColumnMapping }) {
  return (
    <tr className="hover:bg-gray-50">
      {/* Source column */}
      <td className="px-4 py-3 text-sm text-gray-900" title={mapping.sourceColumn}>
        {truncateText(mapping.sourceColumn, MAX_COLUMN_NAME_LENGTH)}
      </td>

      {/* Target type badge */}
      <td className="px-4 py-3 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${getTargetTypeBadgeClasses(mapping.targetType)}`}
        >
          {mapping.targetType}
        </span>
      </td>

      {/* Target detail */}
      <td className="px-4 py-3 text-sm text-gray-700">
        {getTargetDescription(mapping)}
      </td>

      {/* Override indicator */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        {mapping.isOverride && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Override
          </span>
        )}
      </td>
    </tr>
  );
}

/** Editable row for edit and resolve modes. */
function EditableRow({
  mapping,
  qualityMeasures,
  patientFields,
  onMappingChange,
  onDelete,
  suggestions,
  isResolveMode,
}: {
  mapping: MergedColumnMapping;
  qualityMeasures: QualityMeasureOption[];
  patientFields: PatientFieldOption[];
  onMappingChange?: (sourceColumn: string, change: MappingChangeRequest) => void;
  onDelete?: (sourceColumn: string) => void;
  suggestions?: FuzzySuggestion[];
  isResolveMode: boolean;
}) {
  const requestTypes = getRequestTypes();

  // Filter quality measure options by the currently selected request type
  const filteredMeasures = mapping.requestType
    ? qualityMeasures.filter((qm) => qm.requestType === mapping.requestType)
    : [];

  const handleTargetTypeChange = (newType: MergedColumnMapping['targetType']) => {
    const change: MappingChangeRequest = {
      sourceColumn: mapping.sourceColumn,
      targetType: newType,
    };
    // Clear dependent fields when type changes
    if (newType === 'MEASURE') {
      change.requestType = '';
      change.qualityMeasure = '';
    } else if (newType === 'PATIENT') {
      change.targetField = '';
    }
    onMappingChange?.(mapping.sourceColumn, change);
  };

  const handleRequestTypeChange = (requestType: string) => {
    const measuresForType = qualityMeasures.filter((qm) => qm.requestType === requestType);
    onMappingChange?.(mapping.sourceColumn, {
      sourceColumn: mapping.sourceColumn,
      targetType: 'MEASURE',
      requestType,
      // Auto-fill if only one measure for this request type
      qualityMeasure: measuresForType.length === 1 ? measuresForType[0].qualityMeasure : '',
    });
  };

  const handleQualityMeasureChange = (qualityMeasure: string) => {
    onMappingChange?.(mapping.sourceColumn, {
      sourceColumn: mapping.sourceColumn,
      targetType: 'MEASURE',
      requestType: mapping.requestType ?? '',
      qualityMeasure,
    });
  };

  const handlePatientFieldChange = (targetField: string) => {
    onMappingChange?.(mapping.sourceColumn, {
      sourceColumn: mapping.sourceColumn,
      targetType: 'PATIENT',
      targetField,
    });
  };

  // For resolve mode, find the best suggestion that matches current values
  const topSuggestion = suggestions && suggestions.length > 0 ? suggestions[0] : null;

  return (
    <tr className="hover:bg-gray-50">
      {/* Source column */}
      <td className="px-4 py-3 text-sm text-gray-900" title={mapping.sourceColumn}>
        <div className="flex flex-col gap-1">
          <span>{truncateText(mapping.sourceColumn, MAX_COLUMN_NAME_LENGTH)}</span>
          {isResolveMode && topSuggestion && (
            <span className="text-xs text-gray-500">
              Best match:{' '}
              <span className="font-medium">{topSuggestion.columnName}</span>
              <span
                className={`ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                  topSuggestion.score >= 0.8
                    ? 'bg-green-100 text-green-800'
                    : topSuggestion.score >= 0.6
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                }`}
              >
                {formatScore(topSuggestion.score)} match
              </span>
            </span>
          )}
        </div>
      </td>

      {/* Target type selector */}
      <td className="px-4 py-3 whitespace-nowrap">
        <select
          value={mapping.targetType}
          onChange={(e) => handleTargetTypeChange(e.target.value as MergedColumnMapping['targetType'])}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label={`Target type for ${mapping.sourceColumn}`}
        >
          {TARGET_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </td>

      {/* Conditional target detail */}
      <td className="px-4 py-3">
        {mapping.targetType === 'MEASURE' && (
          <div className="flex flex-col gap-2">
            {/* Request type dropdown */}
            <select
              value={mapping.requestType ?? ''}
              onChange={(e) => handleRequestTypeChange(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label={`Request type for ${mapping.sourceColumn}`}
            >
              <option value="">-- Select request type --</option>
              {requestTypes.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>

            {/* Quality measure dropdown (only shown when request type is selected) */}
            {mapping.requestType && (
              <select
                value={mapping.qualityMeasure ?? ''}
                onChange={(e) => handleQualityMeasureChange(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label={`Quality measure for ${mapping.sourceColumn}`}
              >
                <option value="">-- Select quality measure --</option>
                {filteredMeasures.map((qmOpt) => {
                  // In resolve mode, show fuzzy match score next to suggestions
                  const matchingSuggestion =
                    isResolveMode && suggestions
                      ? suggestions.find(
                          (s) =>
                            s.measureInfo?.requestType === qmOpt.requestType &&
                            s.measureInfo?.qualityMeasure === qmOpt.qualityMeasure,
                        )
                      : null;
                  return (
                    <option key={qmOpt.qualityMeasure} value={qmOpt.qualityMeasure}>
                      {qmOpt.label}
                      {matchingSuggestion ? ` (${formatScore(matchingSuggestion.score)} match)` : ''}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {mapping.targetType === 'PATIENT' && (
          <select
            value={mapping.targetField ?? ''}
            onChange={(e) => handlePatientFieldChange(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label={`Patient field for ${mapping.sourceColumn}`}
          >
            <option value="">-- Select patient field --</option>
            {patientFields.map((pf) => (
              <option key={pf.field} value={pf.field}>
                {pf.label}
              </option>
            ))}
          </select>
        )}

        {mapping.targetType === 'DATA' && (
          <span className="text-sm text-gray-500">Data column</span>
        )}

        {mapping.targetType === 'IGNORED' && (
          <span className="text-sm text-gray-400 italic">Ignored</span>
        )}
      </td>

      {/* Override indicator */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        {mapping.isOverride && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            Override
          </span>
        )}
      </td>

      {/* Delete button */}
      <td className="px-4 py-3 whitespace-nowrap text-center">
        <button
          type="button"
          onClick={() => onDelete?.(mapping.sourceColumn)}
          className="inline-flex items-center p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label={`Delete mapping for ${mapping.sourceColumn}`}
          title={`Delete mapping for ${mapping.sourceColumn}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// MappingTable component
// ---------------------------------------------------------------------------

/**
 * Reusable column mapping table for displaying and editing column mappings.
 *
 * Supports three modes:
 * - **view**: Read-only table showing mapping configuration.
 * - **edit**: Inline dropdowns for changing target type, request type, quality
 *   measure, or patient field. Includes a delete button per row.
 * - **resolve**: Like edit mode, but also displays fuzzy match suggestions
 *   with score percentage badges to help admins resolve column conflicts.
 */
export function MappingTable({
  mappings,
  mode,
  qualityMeasures,
  patientFields,
  onMappingChange,
  onDelete,
  suggestions,
}: MappingTableProps) {
  const isEditable = mode === 'edit' || mode === 'resolve';
  const isResolveMode = mode === 'resolve';

  if (mappings.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-500">
        No column mappings to display.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Source Column
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Target Type
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Target
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Override
              </th>
              {isEditable && (
                <th
                  scope="col"
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((mapping) =>
              isEditable ? (
                <EditableRow
                  key={mapping.sourceColumn}
                  mapping={mapping}
                  qualityMeasures={qualityMeasures}
                  patientFields={patientFields}
                  onMappingChange={onMappingChange}
                  onDelete={onDelete}
                  suggestions={suggestions?.[mapping.sourceColumn]}
                  isResolveMode={isResolveMode}
                />
              ) : (
                <ViewRow key={mapping.sourceColumn} mapping={mapping} />
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
