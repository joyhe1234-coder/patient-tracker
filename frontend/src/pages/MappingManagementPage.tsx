import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { api } from '../api/axios';
import { logger } from '../utils/logger';
import { useAuthStore } from '../stores/authStore';
import { MappingTable } from '../components/import/MappingTable';
import { ActionPatternTable } from '../components/import/ActionPatternTable';
import ConfirmModal from '../components/modals/ConfirmModal';
import {
  REQUEST_TYPE_TO_QUALITY_MEASURE,
  QUALITY_MEASURE_TO_STATUS,
} from '../config/dropdownConfig';
import type {
  MergedSystemConfig,
  MergedColumnMapping,
  QualityMeasureOption,
  PatientFieldOption,
  MappingChangeRequest,
  ActionChangeRequest,
} from '../types/import-mapping';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Static list of patient field options for the MappingTable dropdown. */
const PATIENT_FIELD_OPTIONS: PatientFieldOption[] = [
  { field: 'memberName', label: 'Member Name' },
  { field: 'memberDob', label: 'Date of Birth' },
  { field: 'memberPhone', label: 'Phone Number' },
  { field: 'memberAddress', label: 'Address' },
];

/** Build quality measure options from the dropdown config. */
function buildQualityMeasureOptions(): QualityMeasureOption[] {
  const options: QualityMeasureOption[] = [];
  for (const [requestType, measures] of Object.entries(REQUEST_TYPE_TO_QUALITY_MEASURE)) {
    for (const qualityMeasure of measures) {
      // Build label: include available statuses count for context
      const statuses = QUALITY_MEASURE_TO_STATUS[qualityMeasure];
      const statusCount = statuses ? statuses.length : 0;
      options.push({
        requestType,
        qualityMeasure,
        label: `${qualityMeasure} (${statusCount} statuses)`,
      });
    }
  }
  return options;
}

const QUALITY_MEASURE_OPTIONS = buildQualityMeasureOptions();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemListItem {
  id: string;
  name: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO timestamp for display, or return a fallback. */
function formatTimestamp(date: string | null): string {
  if (!date) return 'Never modified';
  return new Date(date).toLocaleString();
}

/** Check whether a system uses the long (Sutter) format based on config. */
function isLongFormat(config: MergedSystemConfig): boolean {
  return config.format === 'long';
}

/** Check whether any column mappings are DB overrides. */
function hasOverrides(config: MergedSystemConfig): boolean {
  const allMappings = [
    ...config.patientColumns,
    ...config.measureColumns,
    ...config.dataColumns,
    ...config.skipColumns,
  ];
  return allMappings.some((m) => m.isOverride);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Admin mapping management page.
 *
 * Allows administrators to view, edit, and reset column mappings for each
 * import system. Supports both wide-format (Hill) and long-format (Sutter)
 * systems, with additional action pattern management for Sutter.
 *
 * Route: /admin/import-mapping
 */
export function MappingManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // ---- Page state ----
  const [systems, setSystems] = useState<SystemListItem[]>([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  const [mergedConfig, setMergedConfig] = useState<MergedSystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<string | null>(null);

  // Modal state
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Add mapping inline form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMapping, setNewMapping] = useState<MergedColumnMapping>({
    sourceColumn: '',
    targetType: 'MEASURE',
    targetField: null,
    requestType: null,
    qualityMeasure: null,
    isOverride: true,
    isActive: true,
    overrideId: null,
  });

  // ---- Redirect if not admin ----
  useEffect(() => {
    if (user && !user.roles.includes('ADMIN')) {
      navigate('/');
    }
  }, [user, navigate]);

  // ---- Load systems list on mount ----
  useEffect(() => {
    loadSystems();
  }, []);

  // ---- Load mappings when selected system changes ----
  useEffect(() => {
    if (selectedSystemId) {
      loadMappings(selectedSystemId);
    }
  }, [selectedSystemId]);

  // ------------------------------------------------------------------
  // Data loading
  // ------------------------------------------------------------------

  const loadSystems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/import/systems');
      const systemsList: SystemListItem[] = response.data.data;
      setSystems(systemsList);

      // Auto-select the first system
      if (systemsList.length > 0) {
        const defaultSystem = systemsList.find((s) => s.isDefault) ?? systemsList[0];
        setSelectedSystemId(defaultSystem.id);
      }
    } catch (err) {
      logger.error('Failed to load systems:', err);
      setError('Failed to load import systems');
    } finally {
      setLoading(false);
    }
  };

  const loadMappings = useCallback(async (systemId: string) => {
    try {
      setLoading(true);
      setError(null);
      setEditingRow(null);
      setShowAddForm(false);

      const response = await api.get(`/import/mappings/${systemId}`);
      setMergedConfig(response.data.data);
    } catch (err) {
      logger.error('Failed to load mappings:', err);
      setError('Failed to load mapping configuration');
      setMergedConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // Column mapping handlers
  // ------------------------------------------------------------------

  const handleMappingChange = async (_sourceColumn: string, change: MappingChangeRequest) => {
    if (!selectedSystemId || !mergedConfig) return;

    try {
      setSaving(true);
      setError(null);

      const response = await api.put(`/import/mappings/${selectedSystemId}/columns`, {
        changes: [change],
        expectedUpdatedAt: mergedConfig.lastModifiedAt,
      });

      setMergedConfig(response.data.data);
      setEditingRow(null);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: { message?: string } } } };
      if (axiosError.response?.status === 409) {
        setError('Another admin has modified these mappings. Please reload and try again.');
      } else {
        const message = axiosError.response?.data?.error?.message || 'Failed to save mapping change';
        setError(message);
      }
      logger.error('Failed to save mapping change:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMapping = async (sourceColumn: string) => {
    if (!selectedSystemId || !mergedConfig) return;

    try {
      setSaving(true);
      setError(null);

      // To delete a mapping, set it to IGNORED with isActive=false
      const response = await api.put(`/import/mappings/${selectedSystemId}/columns`, {
        changes: [{
          sourceColumn,
          targetType: 'IGNORED',
          isActive: false,
        }],
        expectedUpdatedAt: mergedConfig.lastModifiedAt,
      });

      setMergedConfig(response.data.data);
    } catch (err) {
      logger.error('Failed to delete mapping:', err);
      setError('Failed to delete mapping');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Add mapping handler
  // ------------------------------------------------------------------

  const handleAddMapping = async () => {
    if (!selectedSystemId || !mergedConfig || !newMapping.sourceColumn.trim()) return;

    const change: MappingChangeRequest = {
      sourceColumn: newMapping.sourceColumn.trim(),
      targetType: newMapping.targetType,
    };

    if (newMapping.targetType === 'MEASURE') {
      change.requestType = newMapping.requestType ?? '';
      change.qualityMeasure = newMapping.qualityMeasure ?? '';
    } else if (newMapping.targetType === 'PATIENT') {
      change.targetField = newMapping.targetField ?? '';
    }

    try {
      setSaving(true);
      setError(null);

      const response = await api.put(`/import/mappings/${selectedSystemId}/columns`, {
        changes: [change],
        expectedUpdatedAt: mergedConfig.lastModifiedAt,
      });

      setMergedConfig(response.data.data);
      setShowAddForm(false);
      setNewMapping({
        sourceColumn: '',
        targetType: 'MEASURE',
        targetField: null,
        requestType: null,
        qualityMeasure: null,
        isOverride: true,
        isActive: true,
        overrideId: null,
      });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to add mapping';
      setError(message);
      logger.error('Failed to add mapping:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleNewMappingChange = (_sourceColumn: string, change: MappingChangeRequest) => {
    setNewMapping((prev) => ({
      ...prev,
      sourceColumn: change.sourceColumn || prev.sourceColumn,
      targetType: change.targetType,
      targetField: change.targetField ?? null,
      requestType: change.requestType ?? null,
      qualityMeasure: change.qualityMeasure ?? null,
    }));
  };

  // ------------------------------------------------------------------
  // Action pattern handlers (Sutter only)
  // ------------------------------------------------------------------

  const handleActionChange = async (_index: number, change: ActionChangeRequest) => {
    if (!selectedSystemId || !mergedConfig) return;

    try {
      setSaving(true);
      setError(null);

      const response = await api.put(`/import/mappings/${selectedSystemId}/actions`, {
        changes: [change],
      });

      setMergedConfig(response.data.data);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: { message?: string } } } };
      const message = axiosError.response?.data?.error?.message || 'Failed to save action pattern change';
      setError(message);
      logger.error('Failed to save action pattern change:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSkipActionAdd = async (actionText: string) => {
    if (!selectedSystemId || !mergedConfig) return;

    try {
      setSaving(true);
      setError(null);

      // Add skip action via action changes endpoint
      const response = await api.put(`/import/mappings/${selectedSystemId}/actions`, {
        changes: [],
        skipActions: [...mergedConfig.skipActions, actionText],
      });

      setMergedConfig(response.data.data);
    } catch (err) {
      logger.error('Failed to add skip action:', err);
      setError('Failed to add skip action');
    } finally {
      setSaving(false);
    }
  };

  const handleSkipActionRemove = async (actionText: string) => {
    if (!selectedSystemId || !mergedConfig) return;

    try {
      setSaving(true);
      setError(null);

      const response = await api.put(`/import/mappings/${selectedSystemId}/actions`, {
        changes: [],
        skipActions: mergedConfig.skipActions.filter((a) => a !== actionText),
      });

      setMergedConfig(response.data.data);
    } catch (err) {
      logger.error('Failed to remove skip action:', err);
      setError('Failed to remove skip action');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Reset to defaults
  // ------------------------------------------------------------------

  const handleResetToDefaults = async () => {
    if (!selectedSystemId) return;

    try {
      setSaving(true);
      setError(null);
      setShowResetConfirm(false);

      const response = await api.delete(`/import/mappings/${selectedSystemId}/reset`);
      setMergedConfig(response.data.data);
    } catch (err) {
      logger.error('Failed to reset to defaults:', err);
      setError('Failed to reset mappings to defaults');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------------
  // Guard: Admin only
  // ------------------------------------------------------------------

  if (!user?.roles.includes('ADMIN')) {
    return null;
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  const configHasOverrides = mergedConfig ? hasOverrides(mergedConfig) : false;
  const showSutterSections = mergedConfig ? isLongFormat(mergedConfig) : false;
  const hasMeasureColumns = mergedConfig ? mergedConfig.measureColumns.length > 0 : false;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-900">
              Import Column Mapping
            </h2>
          </div>
          <p className="mt-1 text-gray-600">
            Manage how spreadsheet columns are mapped to patient fields and quality measures during import.
          </p>
        </div>

        {/* System selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <label
                htmlFor="system-selector"
                className="text-sm font-medium text-gray-700 whitespace-nowrap"
              >
                Import System:
              </label>
              <select
                id="system-selector"
                value={selectedSystemId}
                onChange={(e) => setSelectedSystemId(e.target.value)}
                disabled={loading || systems.length === 0}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
              >
                {systems.length === 0 && (
                  <option value="">No systems available</option>
                )}
                {systems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name} {sys.isDefault ? '(default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Last modified info */}
            {mergedConfig && (
              <div className="text-sm text-gray-500">
                <span>
                  Last modified:{' '}
                  <span className="font-medium text-gray-700">
                    {formatTimestamp(mergedConfig.lastModifiedAt)}
                  </span>
                </span>
                {mergedConfig.lastModifiedBy && (
                  <span>
                    {' '}by{' '}
                    <span className="font-medium text-gray-700">
                      {mergedConfig.lastModifiedBy}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div role="alert" className="mb-4 p-4 bg-red-50 text-red-700 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            {selectedSystemId && (
              <button
                onClick={() => loadMappings(selectedSystemId)}
                className="px-3 py-1 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Loading spinner */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : mergedConfig ? (
          <div className="space-y-6">
            {/* Override status banner */}
            {!configHasOverrides && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Using Default Configuration
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This system is using the built-in default column mappings.
                      Use the "Edit" buttons or "Add Mapping" to create custom overrides.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action bar */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                disabled={saving || showAddForm}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Add Mapping
              </button>

              {configHasOverrides && (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset to Defaults
                </button>
              )}

              {saving && (
                <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                  Saving...
                </span>
              )}
            </div>

            {/* Add Mapping inline form */}
            {showAddForm && (
              <div className="bg-white rounded-lg shadow p-4 border-2 border-blue-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Add New Column Mapping
                </h3>

                <div className="mb-3">
                  <label
                    htmlFor="new-source-column"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Source Column Name
                  </label>
                  <input
                    id="new-source-column"
                    type="text"
                    value={newMapping.sourceColumn}
                    onChange={(e) =>
                      setNewMapping((prev) => ({ ...prev, sourceColumn: e.target.value }))
                    }
                    placeholder="Enter the spreadsheet column header..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Use MappingTable in resolve mode for inline editing */}
                <MappingTable
                  mappings={[newMapping]}
                  mode="resolve"
                  qualityMeasures={QUALITY_MEASURE_OPTIONS}
                  patientFields={PATIENT_FIELD_OPTIONS}
                  onMappingChange={handleNewMappingChange}
                />

                <div className="mt-3 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMapping}
                    disabled={!newMapping.sourceColumn.trim() || saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            )}

            {/* Patient Column Mappings */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Patient Column Mappings
              </h2>
              <MappingTable
                mappings={mergedConfig.patientColumns}
                mode={editingRow ? 'edit' : 'view'}
                qualityMeasures={QUALITY_MEASURE_OPTIONS}
                patientFields={PATIENT_FIELD_OPTIONS}
                onMappingChange={handleMappingChange}
                onDelete={handleDeleteMapping}
              />
            </section>

            {/* Measure Column Mappings */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Measure Column Mappings
              </h2>
              {hasMeasureColumns ? (
                <MappingTable
                  mappings={mergedConfig.measureColumns}
                  mode={editingRow ? 'edit' : 'view'}
                  qualityMeasures={QUALITY_MEASURE_OPTIONS}
                  patientFields={PATIENT_FIELD_OPTIONS}
                  onMappingChange={handleMappingChange}
                  onDelete={handleDeleteMapping}
                />
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">
                        No Measure Columns Configured
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        This system has no measure column mappings. Use "Add Mapping" to
                        configure measure columns for quality tracking.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Ignored Columns */}
            {mergedConfig.skipColumns.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Ignored Columns
                </h2>
                <MappingTable
                  mappings={mergedConfig.skipColumns}
                  mode={editingRow ? 'edit' : 'view'}
                  qualityMeasures={QUALITY_MEASURE_OPTIONS}
                  patientFields={PATIENT_FIELD_OPTIONS}
                  onMappingChange={handleMappingChange}
                  onDelete={handleDeleteMapping}
                />
              </section>
            )}

            {/* Action Pattern Mappings (Sutter / long-format only) */}
            {showSutterSections && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Action Pattern Configuration
                </h2>
                <ActionPatternTable
                  actionMappings={mergedConfig.actionMappings}
                  skipActions={mergedConfig.skipActions}
                  mode={editingRow ? 'edit' : 'view'}
                  qualityMeasures={QUALITY_MEASURE_OPTIONS}
                  onActionChange={handleActionChange}
                  onSkipActionAdd={handleSkipActionAdd}
                  onSkipActionRemove={handleSkipActionRemove}
                />
              </section>
            )}

            {/* Toggle edit mode button */}
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <button
                onClick={() => setEditingRow(editingRow ? null : '__all__')}
                disabled={saving}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md ${
                  editingRow
                    ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                    : 'text-white bg-blue-600 hover:bg-blue-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {editingRow ? 'Done Editing' : 'Edit Mappings'}
              </button>
            </div>
          </div>
        ) : error ? (
          /* Error state — don't show empty state when we have an error */
          null
        ) : (
          /* Empty state when no system selected */
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              Select an import system to view its column mappings.
            </p>
          </div>
        )}
      </div>

      {/* Reset to Defaults confirmation modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset to Default Mappings"
        message={`This will delete all custom column mapping overrides for "${
          systems.find((s) => s.id === selectedSystemId)?.name ?? selectedSystemId
        }" and revert to the built-in defaults. This action cannot be undone. Any column mappings or action patterns that were customized will be lost.`}
        confirmText="Reset to Defaults"
        cancelText="Cancel"
        confirmColor="red"
        onConfirm={handleResetToDefaults}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
