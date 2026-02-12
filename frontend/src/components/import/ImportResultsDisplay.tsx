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

export interface ImportResultsDisplayProps {
  results: ExecuteResult;
  onImportMore: () => void;
  onGoToGrid?: () => void;
}

export default function ImportResultsDisplay({
  results,
  onImportMore,
}: ImportResultsDisplayProps) {
  const hasErrors = results.errors && results.errors.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Success Banner */}
      <div className={`rounded-lg shadow p-6 ${hasErrors ? 'bg-yellow-50 border-2 border-yellow-200' : 'bg-green-50 border-2 border-green-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`text-5xl ${hasErrors ? 'text-yellow-500' : 'text-green-500'}`}>
            {hasErrors ? '!' : '\u2713'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Import {hasErrors ? 'Completed with Warnings' : 'Successful'}
            </h1>
            <p className="text-gray-600">
              Mode: {results.mode.toUpperCase()} | Duration: {(results.duration / 1000).toFixed(1)}s
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Import Results</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-700">{results.stats.inserted}</div>
            <div className="text-sm text-green-600">Inserted</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-700">{results.stats.updated}</div>
            <div className="text-sm text-blue-600">Updated</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-red-700">{results.stats.deleted}</div>
            <div className="text-sm text-red-600">Deleted</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-gray-700">{results.stats.skipped}</div>
            <div className="text-sm text-gray-600">Skipped</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-yellow-700">{results.stats.bothKept}</div>
            <div className="text-sm text-yellow-600">Both Kept</div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-600">
            Errors ({results.errors!.length})
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results.errors!.map((err, idx) => (
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
            onClick={onImportMore}
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
