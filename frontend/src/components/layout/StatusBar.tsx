interface StatusBarProps {
  rowCount: number;
  totalRowCount?: number;
}

export default function StatusBar({ rowCount, totalRowCount }: StatusBarProps) {
  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
      <div className="flex items-center gap-4">
        <span>Showing {rowCount.toLocaleString()} of {(totalRowCount ?? rowCount).toLocaleString()} rows</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-600">Connected</span>
      </div>
    </div>
  );
}
