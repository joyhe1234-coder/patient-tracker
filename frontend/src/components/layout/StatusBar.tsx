import { useState } from 'react';
import { Users } from 'lucide-react';
import { useRealtimeStore } from '../../stores/realtimeStore';
import type { ConnectionStatus } from '../../services/socketService';

interface StatusBarProps {
  rowCount: number;
  totalRowCount?: number;
  filterSummary?: string;
  pinnedRowId?: number | null;
}

function getStatusConfig(status: ConnectionStatus): {
  dotColor: string;
  label: string;
} | null {
  switch (status) {
    case 'connected':
      return { dotColor: 'bg-green-500', label: 'Connected' };
    case 'reconnecting':
      return { dotColor: 'bg-yellow-500', label: 'Reconnecting...' };
    case 'disconnected':
      return { dotColor: 'bg-red-500', label: 'Disconnected' };
    case 'offline':
      return { dotColor: 'bg-gray-400', label: 'Offline mode' };
    case 'connecting':
      // Brief transitional state, no indicator
      return null;
    default:
      return null;
  }
}

export default function StatusBar({ rowCount, totalRowCount, filterSummary, pinnedRowId }: StatusBarProps) {
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus);
  const roomUsers = useRealtimeStore((s) => s.roomUsers);
  const [showTooltip, setShowTooltip] = useState(false);

  const statusConfig = getStatusConfig(connectionStatus);

  return (
    <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-sm text-gray-600">
      <div className="flex items-center gap-4">
        <span>
          Showing {rowCount.toLocaleString()} of {(totalRowCount ?? rowCount).toLocaleString()} rows
          {pinnedRowId != null && <span className="text-amber-600 italic" data-testid="status-bar-pinned"> (new row pinned)</span>}
        </span>
        {filterSummary && (
          <span className="text-gray-500 border-l border-gray-300 pl-4">{filterSummary}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Presence indicator */}
        {roomUsers.length > 0 && (
          <div
            className="relative flex items-center gap-1 text-gray-500"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            data-testid="presence-indicator"
          >
            <Users className="w-4 h-4" />
            <span>{roomUsers.length} {roomUsers.length === 1 ? 'other' : 'others'} online</span>

            {/* Tooltip */}
            {showTooltip && (
              <div
                className="absolute bottom-full right-0 mb-2 bg-gray-800 text-white text-xs rounded px-3 py-2 whitespace-nowrap shadow-lg z-10"
                data-testid="presence-tooltip"
              >
                {roomUsers.map((user) => (
                  <div key={user.id}>{user.displayName}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Connection status */}
        {statusConfig && (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} data-testid="connection-dot" />
            <span
              className={
                connectionStatus === 'connected'
                  ? 'text-green-600'
                  : connectionStatus === 'reconnecting'
                    ? 'text-yellow-600'
                    : connectionStatus === 'disconnected'
                      ? 'text-red-600'
                      : 'text-gray-500'
              }
            >
              {statusConfig.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
