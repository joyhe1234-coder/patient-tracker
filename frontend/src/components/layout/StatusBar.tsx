interface StatusBarProps {
  rowCount: number;
  totalRowCount?: number;
  filterSummary?: string;
}

export default function StatusBar({ rowCount, totalRowCount, filterSummary }: StatusBarProps) {
  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
      <div className="flex items-center gap-4">
        <span>Showing {rowCount.toLocaleString()} of {(totalRowCount ?? rowCount).toLocaleString()} rows</span>
        {filterSummary && (
          <span className="text-gray-500 border-l border-gray-300 pl-4">{filterSummary}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">Connected</span>
      </div>
    </div>
  );
}
