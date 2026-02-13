type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'SKIP' | 'BOTH' | 'DELETE';

export interface PreviewSummaryCardsProps {
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
  totalChanges: number;
  warningCount: number;
  activeFilter: ActionFilter;
  onFilterChange: (filter: ActionFilter) => void;
  filteredCount: number;
  totalItemCount: number;
}

export default function PreviewSummaryCards({
  summary,
  patients,
  totalChanges,
  warningCount,
  activeFilter,
  onFilterChange,
  filteredCount,
  totalItemCount,
}: PreviewSummaryCardsProps) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
        <button
          onClick={() => onFilterChange('INSERT')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'INSERT' ? 'ring-2 ring-green-500' : ''
          } bg-green-50 hover:bg-green-100`}
        >
          <div className="text-2xl font-bold text-green-700">{summary.inserts}</div>
          <div className="text-sm text-green-600">Insert</div>
        </button>
        <button
          onClick={() => onFilterChange('UPDATE')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'UPDATE' ? 'ring-2 ring-blue-500' : ''
          } bg-blue-50 hover:bg-blue-100`}
        >
          <div className="text-2xl font-bold text-blue-700">{summary.updates}</div>
          <div className="text-sm text-blue-600">Update</div>
        </button>
        <button
          onClick={() => onFilterChange('SKIP')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'SKIP' ? 'ring-2 ring-gray-500' : ''
          } bg-gray-50 hover:bg-gray-100`}
        >
          <div className="text-2xl font-bold text-gray-700">{summary.skips}</div>
          <div className="text-sm text-gray-600">Skip</div>
        </button>
        <button
          onClick={() => onFilterChange('BOTH')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'BOTH' ? 'ring-2 ring-yellow-500' : ''
          } bg-yellow-50 hover:bg-yellow-100`}
        >
          <div className="text-2xl font-bold text-yellow-700">{summary.duplicates}</div>
          <div className="text-sm text-yellow-600">Both</div>
        </button>
        <button
          onClick={() => onFilterChange('DELETE')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'DELETE' ? 'ring-2 ring-red-500' : ''
          } bg-red-50 hover:bg-red-100`}
        >
          <div className="text-2xl font-bold text-red-700">{summary.deletes}</div>
          <div className="text-sm text-red-600">Delete</div>
        </button>
        <div
          className={`p-4 rounded-lg text-center ${
            warningCount > 0 ? 'bg-orange-50' : 'bg-gray-50'
          }`}
        >
          <div className={`text-2xl font-bold ${
            warningCount > 0 ? 'text-orange-700' : 'text-gray-700'
          }`}>{warningCount}</div>
          <div className={`text-sm ${
            warningCount > 0 ? 'text-orange-600' : 'text-gray-600'
          }`}>Warnings</div>
        </div>
        <button
          onClick={() => onFilterChange('all')}
          className={`p-4 rounded-lg text-center transition-all ${
            activeFilter === 'all' ? 'ring-2 ring-purple-500' : ''
          } bg-purple-50 hover:bg-purple-100`}
        >
          <div className="text-2xl font-bold text-purple-700">{totalChanges}</div>
          <div className="text-sm text-purple-600">Total</div>
        </button>
      </div>

      {/* Patient Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <span className="text-sm text-gray-500">New Patients:</span>
              <span className="ml-2 font-semibold text-green-600">{patients.new}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Existing Patients:</span>
              <span className="ml-2 font-semibold text-blue-600">{patients.existing}</span>
            </div>
            <div>
              <span className="text-sm text-gray-500">Total Patients:</span>
              <span className="ml-2 font-semibold">{patients.total}</span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {activeFilter !== 'all' && (
              <span>Showing {filteredCount} of {totalItemCount} changes</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
