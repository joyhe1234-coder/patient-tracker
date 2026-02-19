interface PreviewColumnDef {
  field: string;
  label: string;
  source: string;
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
  extraColumns?: Record<string, string | null>;
}

type ActionFilter = 'all' | 'INSERT' | 'UPDATE' | 'SKIP' | 'BOTH' | 'DELETE';

export interface PreviewChangesTableProps {
  changes: PreviewChange[];
  activeFilter: ActionFilter;
  totalChanges: number;
  previewColumns?: PreviewColumnDef[];
}

function getActionColor(action: string): string {
  switch (action) {
    case 'INSERT': return 'bg-green-100 text-green-800';
    case 'UPDATE': return 'bg-blue-100 text-blue-800';
    case 'SKIP': return 'bg-gray-100 text-gray-800';
    case 'BOTH': return 'bg-yellow-100 text-yellow-800';
    case 'DELETE': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function getRequestTypeColor(type: string): string {
  switch (type) {
    case 'AWV': return 'bg-blue-100 text-blue-800';
    case 'Quality': return 'bg-purple-100 text-purple-800';
    case 'Screening': return 'bg-green-100 text-green-800';
    case 'Chronic DX': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

export default function PreviewChangesTable({
  changes,
  activeFilter,
  totalChanges,
  previewColumns,
}: PreviewChangesTableProps) {
  const filteredChanges = changes.filter(
    change => activeFilter === 'all' || change.action === activeFilter
  );

  const extraCols = previewColumns || [];
  const totalCols = 7 + extraCols.length;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="max-h-96 overflow-y-auto overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality Measure</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Status</th>
              {extraCols.map(col => (
                <th key={col.field} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {col.label}
                </th>
              ))}
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
                {extraCols.map(col => (
                  <td key={col.field} className="px-4 py-3 text-sm text-gray-600">
                    {change.extraColumns?.[col.field] || '-'}
                  </td>
                ))}
                <td className="px-4 py-3 text-xs text-gray-500">{change.reason}</td>
              </tr>
            ))}
            {filteredChanges.length === 0 && (
              <tr>
                <td colSpan={totalCols} className="px-4 py-8 text-center text-gray-500">
                  No changes match the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalChanges > 50 && (
        <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center border-t">
          Showing first 50 changes. Full list available after import.
        </div>
      )}
    </div>
  );
}
