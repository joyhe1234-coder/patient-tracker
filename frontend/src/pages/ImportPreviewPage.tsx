import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';

interface PreviewChange {
  action: 'INSERT' | 'UPDATE' | 'SKIP' | 'BOTH' | 'DELETE';
  memberName: string;
  memberDob: string | null;
  requestType: string;
  qualityMeasure: string;
  oldStatus: string | null;
  newStatus: string | null;
  reason: string;
}

interface ValidationWarning {
  rowIndex: number;
  field: string;
  message: string;
  memberName?: string;
}

interface PatientReassignment {
  patientId: number;
  memberName: string;
  memberDob: string;
  currentOwnerId: number | null;
  currentOwnerName: string | null;
  newOwnerId: number | null;
  newOwnerName: string | null;
}

interface PreviewResult {
  previewId: string;
  systemId: string;
  mode: 'replace' | 'merge';
  fileName?: string;
  expiresAt: string;
  totalChanges: number;
  targetOwnerId?: number | null;
  summary: {
    inserts: number;
    updates: number;
    skips: number;
    duplicates: number;
    deletes: number;
  };
  patients: {
    new: number;
    existing: number;
    total: number;
  };
  warnings?: ValidationWarning[];
  reassignments?: {
    count: number;
    requiresConfirmation: boolean;
    items: PatientReassignment[];
  };
  changes: {
    total: number;
    page: number;
    limit: number;
    items: PreviewChange[];
  };
}

interface ExecuteResult {
  mode: 'replace' | 'merge';
  stats: {
    inserted: number;
    updated: number;
    deleted: number;
    skipped: number;
    bothKept: number;
  };
  duration: number;
  errors?: Array<{
    action: string;
    memberName: string;
    qualityMeasure: string;
    error: string;
  }>;
}

type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'SKIP' | 'BOTH' | 'DELETE';

export default function ImportPreviewPage() {
  const { previewId } = useParams<{ previewId: string }>();
  const navigate = useNavigate();

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [executing, setExecuting] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [showReassignWarning, setShowReassignWarning] = useState(false);

  useEffect(() => {
    if (previewId) {
      fetchPreview();
    }
  }, [previewId]);

  const fetchPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/import/preview/${previewId}`);
      if (response.data.success) {
        setPreview(response.data.data);
      } else {
        setError(response.data.error?.message || 'Failed to load preview');
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Failed to load preview';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteClick = () => {
    if (!preview) return;

    // Check if there are reassignments that need confirmation
    if (preview.reassignments?.requiresConfirmation) {
      setShowReassignWarning(true);
      return;
    }

    handleExecute(false);
  };

  const handleExecute = async (confirmReassign: boolean) => {
    if (!preview) return;

    setShowReassignWarning(false);
    setExecuting(true);
    setError(null);

    try {
      // Build URL with confirmReassign flag if needed
      let url = `/import/execute/${preview.previewId}`;
      if (confirmReassign) {
        url += '?confirmReassign=true';
      }

      const response = await api.post(url);
      if (response.data.success) {
        setExecuteResult(response.data.data);
        setPreview(null);
      } else {
        // Check for reassignment error
        if (response.data.error?.code === 'REASSIGNMENT_REQUIRES_CONFIRMATION') {
          setShowReassignWarning(true);
          setExecuting(false);
          return;
        }
        setExecuteResult(response.data.data);
        if (response.data.data?.errors?.length > 0) {
          setError(`Import completed with ${response.data.data.errors.length} error(s)`);
        }
      }
    } catch (err: any) {
      // Check for reassignment error in catch block too
      if (err.response?.data?.error?.code === 'REASSIGNMENT_REQUIRES_CONFIRMATION') {
        setShowReassignWarning(true);
        setExecuting(false);
        return;
      }
      setError(err.response?.data?.error?.message || err.message || 'Execute failed');
    } finally {
      setExecuting(false);
    }
  };

  const handleCancel = async () => {
    if (preview) {
      try {
        await api.delete(`/import/preview/${preview.previewId}`);
      } catch {
        // Ignore cleanup errors
      }
    }
    navigate('/import');
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'SKIP': return 'bg-gray-100 text-gray-800';
      case 'BOTH': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'AWV': return 'bg-blue-100 text-blue-800';
      case 'Quality': return 'bg-purple-100 text-purple-800';
      case 'Screening': return 'bg-green-100 text-green-800';
      case 'Chronic DX': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredChanges = preview?.changes.items.filter(
    change => actionFilter === 'all' || change.action === actionFilter
  ) || [];

  // Calculate modifying count (all changes except SKIP)
  const modifyingCount = preview
    ? preview.summary.inserts + preview.summary.updates + preview.summary.duplicates + preview.summary.deletes
    : 0;

  // Loading state
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preview...</p>
        </div>
      </div>
    );
  }

  // Error state (no preview)
  if (error && !preview && !executeResult) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-red-800 mb-2">Preview Not Found</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <p className="text-sm text-gray-600 mb-6">
            The preview may have expired or been already processed.
          </p>
          <button
            onClick={() => navigate('/import')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start New Import
          </button>
        </div>
      </div>
    );
  }

  // Execution complete
  if (executeResult) {
    const hasErrors = executeResult.errors && executeResult.errors.length > 0;
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Success Banner */}
        <div className={`rounded-lg shadow p-6 ${hasErrors ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-green-50 border-2 border-green-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`text-5xl ${hasErrors ? 'text-yellow-500' : 'text-green-500'}`}>
              {hasErrors ? '!' : '✓'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Import {hasErrors ? 'Completed with Warnings' : 'Successful'}
              </h1>
              <p className="text-gray-600">
                Mode: {executeResult.mode.toUpperCase()} | Duration: {(executeResult.duration / 1000).toFixed(1)}s
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Import Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-700">{executeResult.stats.inserted}</div>
              <div className="text-sm text-green-600">Inserted</div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-700">{executeResult.stats.updated}</div>
              <div className="text-sm text-blue-600">Updated</div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-700">{executeResult.stats.deleted}</div>
              <div className="text-sm text-red-600">Deleted</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-gray-700">{executeResult.stats.skipped}</div>
              <div className="text-sm text-gray-600">Skipped</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-700">{executeResult.stats.bothKept}</div>
              <div className="text-sm text-yellow-600">Both Kept</div>
            </div>
          </div>
        </div>

        {/* Errors */}
        {hasErrors && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 text-red-600">
              Errors ({executeResult.errors!.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {executeResult.errors!.map((err, idx) => (
                <div key={idx} className="bg-red-50 p-3 rounded text-sm">
                  <span className="font-medium">{err.memberName}</span>
                  <span className="text-gray-500"> - {err.qualityMeasure}: </span>
                  <span className="text-red-600">{err.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-600 mb-4">
            Import complete. You can now view the updated data in the patient grid.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/import')}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Import More
            </button>
            <a
              href="/"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Go to Patient Grid
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Preview display
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Preview</h1>
          <p className="text-gray-600">
            Review the changes before applying them to your data.
          </p>
        </div>
        <div className="text-right text-sm text-gray-500">
          <div>File: <span className="font-medium">{preview?.fileName}</span></div>
          <div>Mode: <span className="font-medium uppercase">{preview?.mode}</span></div>
          <div>Expires: {preview && new Date(preview.expiresAt).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">!</span>
            <div className="text-red-700">{error}</div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <button
          onClick={() => setActionFilter('INSERT')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'INSERT' ? 'ring-2 ring-green-500' : ''
          } bg-green-50 hover:bg-green-100`}
        >
          <div className="text-2xl font-bold text-green-700">{preview?.summary.inserts}</div>
          <div className="text-sm text-green-600">Insert</div>
        </button>
        <button
          onClick={() => setActionFilter('UPDATE')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'UPDATE' ? 'ring-2 ring-blue-500' : ''
          } bg-blue-50 hover:bg-blue-100`}
        >
          <div className="text-2xl font-bold text-blue-700">{preview?.summary.updates}</div>
          <div className="text-sm text-blue-600">Update</div>
        </button>
        <button
          onClick={() => setActionFilter('SKIP')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'SKIP' ? 'ring-2 ring-gray-500' : ''
          } bg-gray-50 hover:bg-gray-100`}
        >
          <div className="text-2xl font-bold text-gray-700">{preview?.summary.skips}</div>
          <div className="text-sm text-gray-600">Skip</div>
        </button>
        <button
          onClick={() => setActionFilter('BOTH')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'BOTH' ? 'ring-2 ring-yellow-500' : ''
          } bg-yellow-50 hover:bg-yellow-100`}
        >
          <div className="text-2xl font-bold text-yellow-700">{preview?.summary.duplicates}</div>
          <div className="text-sm text-yellow-600">Both</div>
        </button>
        <button
          onClick={() => setActionFilter('DELETE')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'DELETE' ? 'ring-2 ring-red-500' : ''
          } bg-red-50 hover:bg-red-100`}
        >
          <div className="text-2xl font-bold text-red-700">{preview?.summary.deletes}</div>
          <div className="text-sm text-red-600">Delete</div>
        </button>
        <div
          className={`p-4 rounded-lg text-center ${
            (preview?.warnings?.length || 0) > 0 ? 'bg-orange-50' : 'bg-gray-50'
          }`}
        >
          <div className={`text-2xl font-bold ${
            (preview?.warnings?.length || 0) > 0 ? 'text-orange-700' : 'text-gray-700'
          }`}>{preview?.warnings?.length || 0}</div>
          <div className={`text-sm ${
            (preview?.warnings?.length || 0) > 0 ? 'text-orange-600' : 'text-gray-600'
          }`}>Warnings</div>
        </div>
        <button
          onClick={() => setActionFilter('all')}
          className={`p-4 rounded-lg text-center transition-all ${
            actionFilter === 'all' ? 'ring-2 ring-purple-500' : ''
          } bg-purple-50 hover:bg-purple-100`}
        >
          <div className="text-2xl font-bold text-purple-700">{preview?.totalChanges}</div>
          <div className="text-sm text-purple-600">Total</div>
        </button>
      </div>

      {/* Patient Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="text-sm text-gray-500">New Patients:</span>
              <span className="ml-2 font-semibold text-green-600">{preview?.patients.new}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Existing Patients:</span>
              <span className="ml-2 font-semibold text-blue-600">{preview?.patients.existing}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Total Patients:</span>
              <span className="ml-2 font-semibold">{preview?.patients.total}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {actionFilter !== 'all' && (
              <span>Showing {filteredChanges.length} of {preview?.changes.items.length} changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Warnings Section */}
      {preview?.warnings && preview.warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-medium text-yellow-800">
                {preview.warnings.length} Warning{preview.warnings.length > 1 ? 's' : ''} Found
              </div>
              <div className="text-sm text-yellow-700 mt-1 mb-2">
                The following issues were found but will not block the import:
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {preview.warnings.map((warning, idx) => (
                  <div key={idx} className="text-sm bg-white border border-yellow-200 rounded p-2">
                    <span className="font-medium">Row {warning.rowIndex + 1}</span>
                    {warning.memberName && (
                      <span className="text-gray-600"> ({warning.memberName})</span>
                    )}
                    <span className="text-gray-600">: </span>
                    <span className="text-yellow-700">{warning.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reassignment Warning Section */}
      {preview?.reassignments && preview.reassignments.count > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-orange-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <div className="font-semibold text-orange-800">
                {preview.reassignments.count} Patient{preview.reassignments.count > 1 ? 's' : ''} Will Be Reassigned
              </div>
              <div className="text-sm text-orange-700 mt-1 mb-2">
                The following patients currently belong to a different physician and will be reassigned:
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {preview.reassignments.items.map((reassign, idx) => (
                  <div key={idx} className="text-sm bg-white border border-orange-200 rounded p-3">
                    <div className="font-medium text-gray-900">{reassign.memberName}</div>
                    <div className="text-gray-600 text-xs">DOB: {reassign.memberDob}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-gray-100 rounded">
                        {reassign.currentOwnerName || 'Unassigned'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                        {reassign.newOwnerName || 'Unassigned'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-sm text-orange-600 font-medium">
                You will need to confirm the reassignment when applying changes.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Changes Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality Measure</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredChanges.map((change, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(change.action)}`}>
                      {change.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{change.memberName}</div>
                    {change.memberDob && (
                      <div className="text-xs text-gray-500">{change.memberDob}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getRequestTypeColor(change.requestType)}`}>
                      {change.requestType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{change.qualityMeasure}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{change.oldStatus || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {change.newStatus ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        change.newStatus.toLowerCase().includes('completed') ||
                        change.newStatus.toLowerCase().includes('at goal')
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {change.newStatus}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{change.reason}</td>
                </tr>
              ))}
              {filteredChanges.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No changes match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {(preview?.totalChanges || 0) > 50 && (
          <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center border-t">
            Showing first 50 changes. Full list available after import.
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between bg-white rounded-lg shadow p-4">
        <button
          onClick={handleCancel}
          disabled={executing}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            {modifyingCount} records will be modified
            {preview?.reassignments && preview.reassignments.count > 0 && (
              <span className="text-orange-600 ml-2">
                ({preview.reassignments.count} patient{preview.reassignments.count > 1 ? 's' : ''} will be reassigned)
              </span>
            )}
          </div>
          <button
            onClick={handleExecuteClick}
            disabled={executing || modifyingCount === 0}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              executing || modifyingCount === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {executing ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Importing...
              </span>
            ) : (
              `Apply ${modifyingCount} Changes`
            )}
          </button>
        </div>
      </div>

      {/* Reassignment Confirmation Modal */}
      {showReassignWarning && preview?.reassignments && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Confirm Patient Reassignment
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  This import will reassign <strong>{preview.reassignments.count} patient{preview.reassignments.count > 1 ? 's' : ''}</strong> from their current physician to a new one.
                </p>
                <div className="mt-3 max-h-40 overflow-y-auto">
                  <div className="text-sm text-gray-700 space-y-1">
                    {preview.reassignments.items.slice(0, 10).map((r, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 border-b border-gray-100">
                        <span className="font-medium">{r.memberName}</span>
                        <span className="text-gray-500 text-xs">
                          {r.currentOwnerName || 'Unassigned'} → {r.newOwnerName || 'Unassigned'}
                        </span>
                      </div>
                    ))}
                    {preview.reassignments.count > 10 && (
                      <div className="text-gray-500 text-xs pt-2">
                        ... and {preview.reassignments.count - 10} more
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm text-orange-600">
                  Are you sure you want to proceed with the reassignment?
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowReassignWarning(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleExecute(true)}
                className="px-4 py-2 text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors"
              >
                Yes, Reassign & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
