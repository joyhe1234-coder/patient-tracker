// Conflict resolution modal for parallel editing
// Follows ConfirmModal pattern: fixed overlay, centered card, action buttons

import { AlertTriangle } from 'lucide-react';

export interface ConflictField {
  fieldName: string;
  fieldKey: string;
  baseValue: string | null;
  theirValue: string | null;
  yourValue: string | null;
}

interface ConflictModalProps {
  isOpen: boolean;
  patientName: string;
  changedBy: string;
  conflicts: ConflictField[];
  onKeepMine: () => void;
  onKeepTheirs: () => void;
  onCancel: () => void;
}

function formatValue(value: string | null): string {
  if (value === null || value === undefined || value === '') {
    return '(empty)';
  }
  return value;
}

export default function ConflictModal({
  isOpen,
  patientName,
  changedBy,
  conflicts,
  onKeepMine,
  onKeepTheirs,
  onCancel,
}: ConflictModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        data-testid="conflict-backdrop"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Edit Conflict</h3>
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-medium">{patientName}</span> was modified by{' '}
                <span className="font-medium">{changedBy}</span> while you were editing.
              </p>
            </div>
          </div>

          {/* Conflict field comparisons */}
          <div className="mt-4 space-y-3">
            {conflicts.map((conflict) => (
              <div key={conflict.fieldKey} className="border border-gray-200 rounded-md p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">{conflict.fieldName}</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Original</div>
                    <div className="bg-gray-50 rounded px-2 py-1 text-gray-700 break-words">
                      {formatValue(conflict.baseValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Their Version</div>
                    <div className="bg-orange-50 rounded px-2 py-1 text-orange-800 break-words">
                      {formatValue(conflict.theirValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Your Version</div>
                    <div className="bg-blue-50 rounded px-2 py-1 text-blue-800 break-words">
                      {formatValue(conflict.yourValue)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onKeepTheirs}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Keep Theirs
            </button>
            <button
              onClick={onKeepMine}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Keep Mine
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
