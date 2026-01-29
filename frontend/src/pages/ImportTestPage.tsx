import { useState } from 'react';
import { api } from '../api/axios';

interface ParseResult {
  fileName: string;
  fileType: string;
  totalRows: number;
  headers: string[];
  columnValidation: {
    valid: boolean;
    missing: string[];
  };
  previewRows: Record<string, string>[];
}

interface PatientWithNoMeasures {
  rowIndex: number;
  memberName: string;
  memberDob: string | null;
}

interface TransformResult {
  fileName: string;
  fileType: string;
  dataStartRow: number; // 1-indexed spreadsheet row where data starts
  stats: {
    inputRows: number;
    outputRows: number;
    errorCount: number;
    measuresPerPatient: number;
    uniquePatients: number;
    patientsWithNoMeasures: number;
  };
  mapping: {
    mapped: number;
    skipped: number;
    unmapped: number;
    unmappedColumns: string[];
    missingRequired: string[];
  };
  errors: Array<{
    rowIndex: number;
    column?: string;
    message: string;
    value?: string;
  }>;
  patientsWithNoMeasures: PatientWithNoMeasures[];
  previewRows: TransformedRow[];
}

interface TransformedRow {
  memberName: string;
  memberDob: string | null;
  memberTelephone: string | null;
  memberAddress: string | null;
  requestType: string;
  qualityMeasure: string;
  measureStatus: string | null;
  statusDate: string | null;
  sourceRowIndex: number;
  sourceMeasureColumn: string;
}

interface ValidationError {
  rowIndex: number;
  field: string;
  message: string;
  value?: string;
  severity: 'error' | 'warning';
  memberName?: string;
}

interface DuplicateGroup {
  key: string;
  rows: number[];
  patient: string;
  measure: string;
}

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

interface PreviewResult {
  previewId: string;
  systemId: string;
  mode: 'replace' | 'merge';
  fileName: string;
  expiresAt: string;
  summary: {
    inserts: number;
    updates: number;
    skips: number;
    duplicates: number;
    deletes: number;
    total: number;
    modifying: number;
  };
  patients: {
    new: number;
    existing: number;
    total: number;
  };
  validation: {
    warnings: number;
    duplicatesInFile: number;
  };
  changes: PreviewChange[];
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

interface ValidateResult {
  fileName: string;
  fileType: string;
  dataStartRow: number; // 1-indexed spreadsheet row where data starts
  transformStats: {
    inputRows: number;
    outputRows: number;
    uniquePatients: number;
    patientsWithNoMeasures: number;
  };
  patientsWithNoMeasures: PatientWithNoMeasures[];
  validation: {
    valid: boolean;
    canProceed: boolean;
    stats: {
      totalRows: number;
      validRows: number;
      errorRows: number;
      warningRows: number;
      duplicateGroups: number;
    };
    summary: {
      status: 'success' | 'warning' | 'error';
      message: string;
      canProceed: boolean;
    };
    errors: ValidationError[];
    warnings: ValidationError[];
    duplicates: {
      count: number;
      groups: DuplicateGroup[];
    };
  };
  previewRows: TransformedRow[];
}

type TabType = 'parse' | 'transform' | 'validate' | 'preview';
type ImportMode = 'replace' | 'merge';

export default function ImportTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('parse');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [transformResult, setTransformResult] = useState<TransformResult | null>(null);
  const [validateResult, setValidateResult] = useState<ValidateResult | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('merge');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseResult(null);
      setTransformResult(null);
      setValidateResult(null);
      setPreviewResult(null);
      setExecuteResult(null);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', 'hill');
      const response = await api.post('/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setParseResult(response.data.data);
        setActiveTab('parse');
      } else {
        setError(response.data.error?.message || 'Parse failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTransform = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', 'hill');
      const response = await api.post('/import/transform', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setTransformResult(response.data.data);
        setActiveTab('transform');
      } else {
        setError(response.data.error?.message || 'Transform failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Transform failed');
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', 'hill');
      const response = await api.post('/import/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setValidateResult(response.data.data);
        setActiveTab('validate');
      } else {
        setError(response.data.error?.message || 'Validate failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Validate failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setActionFilter('all');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('systemId', 'hill');
      formData.append('mode', importMode);
      const response = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setPreviewResult(response.data.data);
        setActiveTab('preview');
      } else {
        setError(response.data.error?.message || 'Preview failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!previewResult) return;
    setExecuting(true);
    setError(null);
    try {
      const response = await api.post(`/import/execute/${previewResult.previewId}`);
      if (response.data.success) {
        setExecuteResult(response.data.data);
        setPreviewResult(null); // Clear preview after successful execution
      } else {
        // Execution completed but with errors
        setExecuteResult(response.data.data);
        if (response.data.data?.errors?.length > 0) {
          setError(`Import completed with ${response.data.data.errors.length} error(s)`);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Execute failed');
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Import Test Page</h1>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload File</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full max-w-md text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleParse}
            disabled={!file || loading}
            className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
              !file || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading && activeTab === 'parse' ? 'Parsing...' : 'Parse'}
          </button>
          <button
            onClick={handleTransform}
            disabled={!file || loading}
            className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
              !file || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {loading && activeTab === 'transform' ? 'Transforming...' : 'Transform'}
          </button>
          <button
            onClick={handleValidate}
            disabled={!file || loading}
            className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
              !file || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {loading && activeTab === 'validate' ? 'Validating...' : 'Validate'}
          </button>
          <div className="flex items-center gap-2">
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value as ImportMode)}
              className="px-3 py-2 rounded border border-gray-300 text-sm"
            >
              <option value="merge">Merge Mode</option>
              <option value="replace">Replace All</option>
            </select>
            <button
              onClick={handlePreview}
              disabled={!file || loading}
              className={`px-4 py-2 rounded font-medium whitespace-nowrap ${
                !file || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {loading && activeTab === 'preview' ? 'Previewing...' : 'Preview Import'}
            </button>
          </div>
        </div>
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      {(parseResult || transformResult || validateResult || previewResult) && (
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('parse')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'parse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Parse Results
            </button>
            <button
              onClick={() => setActiveTab('transform')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'transform'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transform Results
            </button>
            <button
              onClick={() => setActiveTab('validate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'validate'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Validation Results
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preview'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Import Preview
            </button>
          </nav>
        </div>
      )}

      {/* Parse Results Tab */}
      {activeTab === 'parse' && parseResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Parse Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">File Name</div>
                <div className="font-medium">{parseResult.fileName}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">File Type</div>
                <div className="font-medium">{parseResult.fileType.toUpperCase()}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Total Rows</div>
                <div className="font-medium">{parseResult.totalRows}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Columns</div>
                <div className="font-medium">{parseResult.headers.length}</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">Column Validation</div>
              {parseResult.columnValidation.valid ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  All required columns found
                </span>
              ) : (
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Missing columns
                  </span>
                  <p className="text-sm text-red-600 mt-1">
                    Missing: {parseResult.columnValidation.missing.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Headers ({parseResult.headers.length})</h2>
            <div className="flex flex-wrap gap-2">
              {parseResult.headers.map((header, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                  {header || '(empty)'}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Transform Results Tab */}
      {activeTab === 'transform' && transformResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Transform Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Original Rows</div>
                <div className="text-2xl font-bold text-gray-700">{transformResult.stats.inputRows}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-blue-600">Generated Rows</div>
                <div className="text-2xl font-bold text-blue-700">{transformResult.stats.outputRows}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-purple-600">Unique Patients</div>
                <div className="text-2xl font-bold text-purple-700">{transformResult.stats.uniquePatients}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">Errors</div>
                <div className="text-2xl font-bold text-gray-700">{transformResult.stats.errorCount}</div>
              </div>
              <div className={`p-3 rounded ${transformResult.stats.patientsWithNoMeasures > 0 ? 'bg-purple-50' : 'bg-gray-50'}`}>
                <div className={`text-sm ${transformResult.stats.patientsWithNoMeasures > 0 ? 'text-purple-600' : 'text-gray-600'}`}>No Measures</div>
                <div className={`text-2xl font-bold ${transformResult.stats.patientsWithNoMeasures > 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                  {transformResult.stats.patientsWithNoMeasures}
                </div>
              </div>
            </div>
          </div>

          {/* Patients with No Measures - Transform Tab */}
          {transformResult.patientsWithNoMeasures && transformResult.patientsWithNoMeasures.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-purple-600">
                Patients with No Measures ({transformResult.patientsWithNoMeasures.length})
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                These patients had no quality measure data in any columns.
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-purple-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">Row #</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">Member Name</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">DOB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transformResult.patientsWithNoMeasures.map((patient, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-500">{patient.rowIndex + transformResult.dataStartRow}</td>
                        <td className="px-3 py-2 font-medium">{patient.memberName}</td>
                        <td className="px-3 py-2">{patient.memberDob || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Column Mapping</h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-sm text-green-600">Mapped</div>
                <div className="text-xl font-bold text-green-700">{transformResult.mapping.mapped}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-sm text-gray-600">Skipped</div>
                <div className="text-xl font-bold text-gray-700">{transformResult.mapping.skipped}</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded text-center">
                <div className="text-sm text-yellow-600">Unmapped</div>
                <div className="text-xl font-bold text-yellow-700">{transformResult.mapping.unmapped}</div>
              </div>
              <div className="bg-orange-50 p-3 rounded text-center">
                <div className="text-sm text-orange-600">Measure Types</div>
                <div className="text-xl font-bold text-orange-700">{transformResult.stats.measuresPerPatient}</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Transformed Data Preview</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Member Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">DOB</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Request Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Quality Measure</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Measure Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transformResult.previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-500">{rowIdx + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.memberName}</td>
                      <td className="px-3 py-2">{row.memberDob || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row.requestType === 'AWV' ? 'bg-blue-100 text-blue-800' :
                          row.requestType === 'Quality' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>{row.requestType}</span>
                      </td>
                      <td className="px-3 py-2">{row.qualityMeasure}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row.measureStatus?.includes('completed') || row.measureStatus?.includes('at goal')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>{row.measureStatus || '-'}</span>
                      </td>
                      <td className="px-3 py-2">{row.statusDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Validation Results Tab */}
      {activeTab === 'validate' && validateResult && (
        <div className="space-y-6">
          {/* Validation Summary */}
          <div className={`rounded-lg shadow p-6 ${
            validateResult.validation.summary.status === 'success' ? 'bg-green-50 border-2 border-green-200' :
            validateResult.validation.summary.status === 'warning' ? 'bg-yellow-50 border-2 border-yellow-200' :
            'bg-red-50 border-2 border-red-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`text-4xl ${
                validateResult.validation.summary.status === 'success' ? 'text-green-500' :
                validateResult.validation.summary.status === 'warning' ? 'text-yellow-500' :
                'text-red-500'
              }`}>
                {validateResult.validation.summary.status === 'success' ? '✓' :
                 validateResult.validation.summary.status === 'warning' ? '⚠' : '✗'}
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Validation {validateResult.validation.summary.status === 'success' ? 'Passed' :
                             validateResult.validation.summary.status === 'warning' ? 'Passed with Warnings' : 'Failed'}
                </h2>
                <p className="text-sm text-gray-600">{validateResult.validation.summary.message}</p>
              </div>
              <div className="ml-auto">
                {validateResult.validation.canProceed ? (
                  <span className="px-4 py-2 bg-green-600 text-white rounded font-medium">Ready to Import</span>
                ) : (
                  <span className="px-4 py-2 bg-red-600 text-white rounded font-medium">Fix Errors First</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Validation Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-sm text-gray-600">Original Rows</div>
                <div className="text-2xl font-bold text-gray-700">{validateResult.transformStats.inputRows}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-sm text-blue-600">Generated Rows</div>
                <div className="text-2xl font-bold text-blue-700">{validateResult.validation.stats.totalRows}</div>
              </div>
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-sm text-green-600">Valid Rows</div>
                <div className="text-2xl font-bold text-green-700">{validateResult.validation.stats.validRows}</div>
              </div>
              <div className={`p-3 rounded text-center ${validateResult.validation.stats.errorRows > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <div className={`text-sm ${validateResult.validation.stats.errorRows > 0 ? 'text-red-600' : 'text-gray-600'}`}>Error Rows</div>
                <div className={`text-2xl font-bold ${validateResult.validation.stats.errorRows > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                  {validateResult.validation.stats.errorRows}
                </div>
              </div>
              <div className={`p-3 rounded text-center ${validateResult.validation.stats.warningRows > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                <div className={`text-sm ${validateResult.validation.stats.warningRows > 0 ? 'text-yellow-600' : 'text-gray-600'}`}>Warning Rows</div>
                <div className={`text-2xl font-bold ${validateResult.validation.stats.warningRows > 0 ? 'text-yellow-700' : 'text-gray-700'}`}>
                  {validateResult.validation.stats.warningRows}
                </div>
              </div>
              <div className={`p-3 rounded text-center ${validateResult.validation.stats.duplicateGroups > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
                <div className={`text-sm ${validateResult.validation.stats.duplicateGroups > 0 ? 'text-orange-600' : 'text-gray-600'}`}>Duplicates</div>
                <div className={`text-2xl font-bold ${validateResult.validation.stats.duplicateGroups > 0 ? 'text-orange-700' : 'text-gray-700'}`}>
                  {validateResult.validation.stats.duplicateGroups}
                </div>
              </div>
              <div className={`p-3 rounded text-center ${validateResult.transformStats.patientsWithNoMeasures > 0 ? 'bg-purple-50' : 'bg-gray-50'}`}>
                <div className={`text-sm ${validateResult.transformStats.patientsWithNoMeasures > 0 ? 'text-purple-600' : 'text-gray-600'}`}>No Measures</div>
                <div className={`text-2xl font-bold ${validateResult.transformStats.patientsWithNoMeasures > 0 ? 'text-purple-700' : 'text-gray-700'}`}>
                  {validateResult.transformStats.patientsWithNoMeasures}
                </div>
              </div>
            </div>
          </div>

          {/* Errors */}
          {validateResult.validation.errors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-600">Errors ({validateResult.validation.errors.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validateResult.validation.errors.map((err, idx) => (
                  <div key={idx} className="bg-red-50 p-3 rounded text-sm flex items-start gap-2">
                    <span className="text-red-500 font-bold">!</span>
                    <div>
                      <span className="font-medium">Row {err.rowIndex + validateResult.dataStartRow}</span>
                      {err.memberName && <span className="text-gray-700"> ({err.memberName})</span>}
                      <span className="text-gray-500"> - {err.field}: </span>
                      <span className="text-red-600">{err.message}</span>
                      {err.value && <span className="text-gray-400 ml-1">(value: "{err.value}")</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validateResult.validation.warnings.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-yellow-600">Warnings ({validateResult.validation.warnings.length})</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validateResult.validation.warnings.map((warn, idx) => (
                  <div key={idx} className="bg-yellow-50 p-3 rounded text-sm flex items-start gap-2">
                    <span className="text-yellow-500 font-bold">⚠</span>
                    <div>
                      <span className="font-medium">Row {warn.rowIndex + validateResult.dataStartRow}</span>
                      {warn.memberName && <span className="text-gray-700"> ({warn.memberName})</span>}
                      <span className="text-gray-500"> - {warn.field}: </span>
                      <span className="text-yellow-700">{warn.message}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates */}
          {validateResult.validation.duplicates.count > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-orange-600">
                Duplicate Groups ({validateResult.validation.duplicates.count})
              </h2>
              <div className="space-y-3">
                {validateResult.validation.duplicates.groups.map((group, idx) => (
                  <div key={idx} className="bg-orange-50 p-3 rounded">
                    <div className="font-medium">{group.patient}</div>
                    <div className="text-sm text-gray-600">{group.measure}</div>
                    <div className="text-sm text-orange-600 mt-1">
                      Rows: {group.rows.map(r => r + validateResult.dataStartRow).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patients with No Measures */}
          {validateResult.patientsWithNoMeasures && validateResult.patientsWithNoMeasures.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-purple-600">
                Patients with No Measures ({validateResult.patientsWithNoMeasures.length})
              </h2>
              <p className="text-sm text-gray-600 mb-3">
                These patients had no quality measure data in any columns. They will not be imported.
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-purple-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">Row #</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">Member Name</th>
                      <th className="px-3 py-2 text-left font-medium text-purple-700">DOB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validateResult.patientsWithNoMeasures.map((patient, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-gray-500">{patient.rowIndex + validateResult.dataStartRow}</td>
                        <td className="px-3 py-2 font-medium">{patient.memberName}</td>
                        <td className="px-3 py-2">{patient.memberDob || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Data Preview (First 20 Rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Member Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">DOB</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Request Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Quality Measure</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Measure Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status Date</th>
                  </tr>
                </thead>
                <tbody>
                  {validateResult.previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-500">{rowIdx + 1}</td>
                      <td className="px-3 py-2 font-medium">{row.memberName}</td>
                      <td className="px-3 py-2">{row.memberDob || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row.requestType === 'AWV' ? 'bg-blue-100 text-blue-800' :
                          row.requestType === 'Quality' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>{row.requestType}</span>
                      </td>
                      <td className="px-3 py-2">{row.qualityMeasure}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row.measureStatus?.includes('completed') || row.measureStatus?.includes('at goal')
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>{row.measureStatus || '-'}</span>
                      </td>
                      <td className="px-3 py-2">{row.statusDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Preview Results Tab */}
      {activeTab === 'preview' && previewResult && (
        <div className="space-y-6">
          {/* Preview Header */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg shadow p-6">
            <div className="flex items-center gap-4">
              <div className="text-4xl text-orange-500">📋</div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold">
                  Import Preview - {previewResult.mode.toUpperCase()} Mode
                </h2>
                <p className="text-sm text-gray-600">
                  Preview ID: <code className="bg-gray-100 px-1 rounded">{previewResult.previewId}</code>
                  {' • '}Expires: {new Date(previewResult.expiresAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-600">{previewResult.summary.modifying}</div>
                <div className="text-sm text-gray-600">Changes to Apply</div>
              </div>
              <button
                onClick={handleExecute}
                disabled={executing || previewResult.summary.modifying === 0}
                className={`ml-4 px-6 py-3 rounded-lg font-bold text-lg ${
                  executing || previewResult.summary.modifying === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {executing ? 'Executing...' : 'Execute Import'}
              </button>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Import Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="bg-green-50 p-3 rounded text-center cursor-pointer hover:bg-green-100" onClick={() => setActionFilter('INSERT')}>
                <div className="text-sm text-green-600">Inserts</div>
                <div className="text-2xl font-bold text-green-700">{previewResult.summary.inserts}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center cursor-pointer hover:bg-blue-100" onClick={() => setActionFilter('UPDATE')}>
                <div className="text-sm text-blue-600">Updates</div>
                <div className="text-2xl font-bold text-blue-700">{previewResult.summary.updates}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center cursor-pointer hover:bg-gray-100" onClick={() => setActionFilter('SKIP')}>
                <div className="text-sm text-gray-600">Skips</div>
                <div className="text-2xl font-bold text-gray-700">{previewResult.summary.skips}</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded text-center cursor-pointer hover:bg-yellow-100" onClick={() => setActionFilter('BOTH')}>
                <div className="text-sm text-yellow-600">Duplicates</div>
                <div className="text-2xl font-bold text-yellow-700">{previewResult.summary.duplicates}</div>
              </div>
              <div className="bg-red-50 p-3 rounded text-center cursor-pointer hover:bg-red-100" onClick={() => setActionFilter('DELETE')}>
                <div className="text-sm text-red-600">Deletes</div>
                <div className="text-2xl font-bold text-red-700">{previewResult.summary.deletes}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded text-center cursor-pointer hover:bg-purple-100" onClick={() => setActionFilter('all')}>
                <div className="text-sm text-purple-600">Total</div>
                <div className="text-2xl font-bold text-purple-700">{previewResult.summary.total}</div>
              </div>
            </div>
          </div>

          {/* Patient Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Patient Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 p-3 rounded text-center">
                <div className="text-sm text-green-600">New Patients</div>
                <div className="text-2xl font-bold text-green-700">{previewResult.patients.new}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded text-center">
                <div className="text-sm text-blue-600">Existing Patients</div>
                <div className="text-2xl font-bold text-blue-700">{previewResult.patients.existing}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded text-center">
                <div className="text-sm text-gray-600">Total Patients</div>
                <div className="text-2xl font-bold text-gray-700">{previewResult.patients.total}</div>
              </div>
            </div>
          </div>

          {/* Action Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-600">Filter by action:</span>
              {['all', 'INSERT', 'UPDATE', 'SKIP', 'BOTH', 'DELETE'].map((action) => (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    actionFilter === action
                      ? action === 'INSERT' ? 'bg-green-600 text-white' :
                        action === 'UPDATE' ? 'bg-blue-600 text-white' :
                        action === 'SKIP' ? 'bg-gray-600 text-white' :
                        action === 'BOTH' ? 'bg-yellow-600 text-white' :
                        action === 'DELETE' ? 'bg-red-600 text-white' :
                        'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {action === 'all' ? 'All' : action}
                </button>
              ))}
            </div>
          </div>

          {/* Changes List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">
              Changes Preview
              {actionFilter !== 'all' && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (showing {actionFilter} only)
                </span>
              )}
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Member Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">DOB</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Request Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Quality Measure</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Old Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">New Status</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {previewResult.changes
                    .filter(change => actionFilter === 'all' || change.action === actionFilter)
                    .map((change, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          change.action === 'INSERT' ? 'bg-green-100 text-green-800' :
                          change.action === 'UPDATE' ? 'bg-blue-100 text-blue-800' :
                          change.action === 'SKIP' ? 'bg-gray-100 text-gray-800' :
                          change.action === 'BOTH' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>{change.action}</span>
                      </td>
                      <td className="px-3 py-2 font-medium">{change.memberName}</td>
                      <td className="px-3 py-2">{change.memberDob || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          change.requestType === 'AWV' ? 'bg-blue-100 text-blue-800' :
                          change.requestType === 'Quality' ? 'bg-purple-100 text-purple-800' :
                          'bg-green-100 text-green-800'
                        }`}>{change.requestType}</span>
                      </td>
                      <td className="px-3 py-2">{change.qualityMeasure}</td>
                      <td className="px-3 py-2">
                        {change.oldStatus ? (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                            {change.oldStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2">
                        {change.newStatus ? (
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            change.newStatus.toLowerCase().includes('completed') ||
                            change.newStatus.toLowerCase().includes('at goal')
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {change.newStatus}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{change.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewResult.changes.length >= 50 && (
              <p className="mt-4 text-sm text-gray-500 text-center">
                Showing first 50 changes. Full list available after import.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Execution Results */}
      {executeResult && (
        <div className="space-y-6">
          {/* Success/Error Banner */}
          <div className={`rounded-lg shadow p-6 ${
            !executeResult.errors || executeResult.errors.length === 0
              ? 'bg-green-50 border-2 border-green-200'
              : 'bg-yellow-50 border-2 border-yellow-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`text-4xl ${
                !executeResult.errors || executeResult.errors.length === 0
                  ? 'text-green-500'
                  : 'text-yellow-500'
              }`}>
                {!executeResult.errors || executeResult.errors.length === 0 ? '✓' : '⚠'}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  Import {!executeResult.errors || executeResult.errors.length === 0 ? 'Completed Successfully!' : 'Completed with Errors'}
                </h2>
                <p className="text-sm text-gray-600">
                  Mode: {executeResult.mode.toUpperCase()} • Duration: {executeResult.duration}ms
                </p>
              </div>
            </div>
          </div>

          {/* Execution Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Execution Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-green-50 p-4 rounded text-center">
                <div className="text-sm text-green-600">Inserted</div>
                <div className="text-3xl font-bold text-green-700">{executeResult.stats.inserted}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded text-center">
                <div className="text-sm text-blue-600">Updated</div>
                <div className="text-3xl font-bold text-blue-700">{executeResult.stats.updated}</div>
              </div>
              <div className="bg-red-50 p-4 rounded text-center">
                <div className="text-sm text-red-600">Deleted</div>
                <div className="text-3xl font-bold text-red-700">{executeResult.stats.deleted}</div>
              </div>
              <div className="bg-gray-50 p-4 rounded text-center">
                <div className="text-sm text-gray-600">Skipped</div>
                <div className="text-3xl font-bold text-gray-700">{executeResult.stats.skipped}</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded text-center">
                <div className="text-sm text-yellow-600">Both Kept</div>
                <div className="text-3xl font-bold text-yellow-700">{executeResult.stats.bothKept}</div>
              </div>
            </div>
          </div>

          {/* Execution Errors */}
          {executeResult.errors && executeResult.errors.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 text-red-600">
                Execution Errors ({executeResult.errors.length})
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {executeResult.errors.map((err, idx) => (
                  <div key={idx} className="bg-red-50 p-3 rounded text-sm">
                    <span className="font-medium">{err.memberName}</span>
                    <span className="text-gray-500"> - {err.qualityMeasure}: </span>
                    <span className="text-red-600">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 mb-4">
              Import complete. You can now view the data in the main grid.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Go to Patient Grid
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
