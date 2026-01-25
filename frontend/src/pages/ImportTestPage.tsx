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

export default function ImportTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
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
        setResult(response.data.data);
      } else {
        setError(response.data.error?.message || 'Parse failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Parse failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Import Test Page</h1>

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Upload File</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleParse}
            disabled={!file || loading}
            className={`px-4 py-2 rounded font-medium ${
              !file || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Parsing...' : 'Parse File'}
          </button>
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

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Parse Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">File Name</div>
                <div className="font-medium">{result.fileName}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">File Type</div>
                <div className="font-medium">{result.fileType.toUpperCase()}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Total Rows</div>
                <div className="font-medium">{result.totalRows}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-500">Columns</div>
                <div className="font-medium">{result.headers.length}</div>
              </div>
            </div>

            {/* Column Validation */}
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-1">Column Validation</div>
              {result.columnValidation.valid ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✓ All required columns found
                </span>
              ) : (
                <div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ✗ Missing columns
                  </span>
                  <p className="text-sm text-red-600 mt-1">
                    Missing: {result.columnValidation.missing.join(', ')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Headers */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Headers ({result.headers.length})</h2>
            <div className="flex flex-wrap gap-2">
              {result.headers.map((header, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                >
                  {header || '(empty)'}
                </span>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Preview (First 10 Rows)</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">#</th>
                    {result.headers.slice(0, 10).map((header, idx) => (
                      <th key={idx} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">
                        {header || '(empty)'}
                      </th>
                    ))}
                    {result.headers.length > 10 && (
                      <th className="px-3 py-2 text-left font-medium text-gray-400">
                        +{result.headers.length - 10} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {result.previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 text-gray-500">{rowIdx + 1}</td>
                      {result.headers.slice(0, 10).map((header, colIdx) => (
                        <td key={colIdx} className="px-3 py-2 whitespace-nowrap">
                          {row[header] || <span className="text-gray-300">-</span>}
                        </td>
                      ))}
                      {result.headers.length > 10 && (
                        <td className="px-3 py-2 text-gray-400">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
