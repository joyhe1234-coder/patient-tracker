import { useState } from 'react';

export interface UnmappedAction {
  action: string;
  count: number;
}

export interface UnmappedActionsBannerProps {
  unmappedActions: UnmappedAction[];
}

/**
 * Info banner displayed on the import preview page when some action types
 * in a Sutter/SIP file could not be mapped to quality measures.
 *
 * Shows a summary with total skipped rows and number of unmapped action types,
 * plus an expandable details section with a table listing each action text and
 * its occurrence count.
 */
export default function UnmappedActionsBanner({
  unmappedActions,
}: UnmappedActionsBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (!unmappedActions || unmappedActions.length === 0) {
    return null;
  }

  const totalSkippedRows = unmappedActions.reduce((sum, a) => sum + a.count, 0);
  const totalActionTypes = unmappedActions.length;

  return (
    <div
      role="status"
      className="bg-blue-50 border border-blue-200 rounded-lg p-4"
    >
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <div className="font-medium text-blue-800">
            {totalSkippedRows} row{totalSkippedRows !== 1 ? 's' : ''} skipped:
            action type not yet configured ({totalActionTypes} action type
            {totalActionTypes !== 1 ? 's' : ''})
          </div>
          <p className="text-sm text-blue-700 mt-1">
            These rows contain action text that does not match any configured
            quality measure mapping. They were excluded from the import preview.
          </p>

          {/* Expand/collapse toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus:underline"
            aria-expanded={expanded}
          >
            {expanded ? 'Hide details' : 'Show details'}
          </button>

          {/* Expandable details table */}
          {expanded && (
            <div className="mt-3 max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-blue-200">
                    <th className="text-left py-1 pr-4 font-medium text-blue-800">
                      Action Text
                    </th>
                    <th className="text-right py-1 font-medium text-blue-800 w-20">
                      Rows
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unmappedActions.map((ua, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-blue-100 last:border-0"
                    >
                      <td className="py-1 pr-4 text-blue-700 break-words">
                        {ua.action}
                      </td>
                      <td className="py-1 text-right text-blue-700 font-medium">
                        {ua.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
