import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useAuthStore } from '../stores/authStore';

type ImportMode = 'replace' | 'merge';

interface HealthcareSystem {
  id: string;
  name: string;
}

interface Physician {
  id: number;
  displayName: string;
  email: string;
  roles: string[];
}

const HEALTHCARE_SYSTEMS: HealthcareSystem[] = [
  { id: 'hill', name: 'Hill Healthcare' },
];

export default function ImportPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [systemId, setSystemId] = useState<string>('hill');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Array<{
    rowIndex: number;
    field: string;
    message: string;
    memberName?: string;
  }>>([]);
  const [showReplaceWarning, setShowReplaceWarning] = useState(false);

  // Physician selection for STAFF/ADMIN
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<number | null>(null);
  const [loadingPhysicians, setLoadingPhysicians] = useState(false);

  // Determine if user needs to select a physician
  const needsPhysicianSelection = user?.roles.includes('STAFF') || user?.roles.includes('ADMIN');

  // Load available physicians for STAFF/ADMIN users
  useEffect(() => {
    if (needsPhysicianSelection) {
      loadPhysicians();
    }
  }, [needsPhysicianSelection]);

  const loadPhysicians = async () => {
    setLoadingPhysicians(true);
    try {
      const response = await api.get('/users/physicians');
      if (response.data.success) {
        setPhysicians(response.data.data);
        // Auto-select if only one physician available
        if (response.data.data.length === 1) {
          setSelectedPhysicianId(response.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load physicians:', err);
    } finally {
      setLoadingPhysicians(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
        setFile(null);
      }
    }
  };

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext =>
      file.name.toLowerCase().endsWith(ext)
    );
    return hasValidType || hasValidExtension;
  };

  const handleSubmitClick = () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    // Validate physician selection for STAFF/ADMIN
    if (needsPhysicianSelection && !selectedPhysicianId) {
      setError('Please select a physician to import patients for');
      return;
    }

    // Show warning for Replace mode
    if (mode === 'replace') {
      setShowReplaceWarning(true);
      return;
    }

    handleSubmit();
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setShowReplaceWarning(false);
    setLoading(true);
    setError(null);
    setValidationErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', systemId);
      formData.append('mode', mode);

      // Build URL with physicianId for STAFF/ADMIN
      let url = '/import/preview';
      if (needsPhysicianSelection && selectedPhysicianId) {
        url += `?physicianId=${selectedPhysicianId}`;
      }

      const response = await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const previewId = response.data.data.previewId;
        navigate(`/import/preview/${previewId}`);
      } else {
        // Check for validation errors
        const errors = response.data.data?.validation?.errors;
        if (errors && errors.length > 0) {
          setValidationErrors(errors);
          setError(`Validation failed: ${errors.length} error(s) found. Please fix before importing.`);
        } else {
          setError(response.data.error?.message || 'Failed to process import file');
        }
      }
    } catch (err: any) {
      const message = err.response?.data?.error?.message || err.message || 'Failed to process import file';
      setError(message);

      // Check for validation errors in error response
      const errors = err.response?.data?.data?.validation?.errors;
      if (errors && errors.length > 0) {
        setValidationErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError(null);
    setValidationErrors([]);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Import Patient Data</h1>
        <p className="mt-2 text-gray-600">
          Upload a CSV or Excel file to import patient quality measure data.
        </p>
      </div>

      {/* Step 1: Healthcare System */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
            1
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Select Healthcare System</h2>
        </div>
        <select
          value={systemId}
          onChange={(e) => setSystemId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {HEALTHCARE_SYSTEMS.map((system) => (
            <option key={system.id} value={system.id}>
              {system.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-gray-500">
          Each healthcare system has its own column mapping configuration.
        </p>
      </div>

      {/* Step 2: Import Mode */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
            2
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Choose Import Mode</h2>
        </div>
        <div className="space-y-3">
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              mode === 'merge'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="merge"
              checked={mode === 'merge'}
              onChange={() => setMode('merge')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Merge (Recommended)</div>
              <div className="text-sm text-gray-600">
                Keep existing data. Add new records and update matching records when status improves (Non Compliant to Compliant).
              </div>
            </div>
          </label>
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              mode === 'replace'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="mode"
              value="replace"
              checked={mode === 'replace'}
              onChange={() => setMode('replace')}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-gray-900">Replace All</div>
              <div className="text-sm text-red-600">
                Warning: This will delete ALL existing patient data before importing. Use only when you need a complete fresh start.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Step 3: Physician Selection (STAFF/ADMIN only) */}
      {needsPhysicianSelection && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
              3
            </span>
            <h2 className="text-lg font-semibold text-gray-900">Select Target Physician</h2>
          </div>
          {loadingPhysicians ? (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Loading physicians...
            </div>
          ) : physicians.length === 0 ? (
            <div className="text-gray-500">
              No physicians available. {user?.roles.includes('STAFF') && 'You need to be assigned to at least one physician.'}
            </div>
          ) : (
            <>
              <select
                value={selectedPhysicianId || ''}
                onChange={(e) => setSelectedPhysicianId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a physician --</option>
                {physicians.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName} {p.roles && p.roles.includes('ADMIN') && '(ADMIN)'}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                {user?.roles.includes('ADMIN')
                  ? 'Imported patients will be assigned to the selected physician.'
                  : 'You can only import for physicians you are assigned to.'}
              </p>
            </>
          )}
        </div>
      )}

      {/* Step {needsPhysicianSelection ? 4 : 3}: File Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm">
            {needsPhysicianSelection ? 4 : 3}
          </span>
          <h2 className="text-lg font-semibold text-gray-900">Upload File</h2>
        </div>

        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="text-4xl mb-3">
              {isDragging ? '📥' : '📄'}
            </div>
            <p className="text-gray-600 mb-2">
              Drag and drop your file here, or
            </p>
            <label className="inline-block">
              <span className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors">
                Browse Files
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            <p className="mt-3 text-sm text-gray-500">
              Supported formats: CSV, Excel (.xlsx, .xls)
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl">
              {file.name.endsWith('.csv') ? '📊' : '📗'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{file.name}</div>
              <div className="text-sm text-gray-500">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove file"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">!</span>
            <div className="flex-1">
              <div className="font-medium text-red-800">Error</div>
              <div className="text-sm text-red-700">{error}</div>

              {/* Validation Errors Details */}
              {validationErrors.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-red-800">Errors found:</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className="text-sm bg-white border border-red-200 rounded p-2">
                        <span className="font-medium">Row {err.rowIndex + 1}</span>
                        {err.memberName && (
                          <span className="text-gray-600"> ({err.memberName})</span>
                        )}
                        <span className="text-gray-600">: </span>
                        <span className="text-red-700">{err.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-between">
        <a
          href="/"
          className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </a>
        <button
          onClick={handleSubmitClick}
          disabled={!file || loading || (needsPhysicianSelection && !selectedPhysicianId)}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            !file || loading || (needsPhysicianSelection && !selectedPhysicianId)
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Processing...
            </span>
          ) : (
            'Preview Import'
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">What happens next?</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>1. Your file will be validated for errors</li>
          <li>2. You'll see a preview of all changes before they're applied</li>
          <li>3. Review and approve the changes to complete the import</li>
        </ul>
      </div>

      {/* Replace All Warning Modal */}
      {showReplaceWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete All Existing Data?
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  You have selected <strong>Replace All</strong> mode. This will permanently delete ALL existing patient records before importing the new data.
                </p>
                <p className="mt-2 text-sm text-red-600 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowReplaceWarning(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete All & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
