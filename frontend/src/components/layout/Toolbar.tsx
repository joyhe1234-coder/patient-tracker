import { Plus, Trash2, Loader2, Check, AlertCircle, Eye, EyeOff, Copy } from 'lucide-react';

interface ToolbarProps {
  onAddRow: () => void;
  onDuplicateRow: () => void;
  canDuplicate: boolean;
  onDeleteRow: () => void;
  canDelete: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  showMemberInfo: boolean;
  onToggleMemberInfo: () => void;
}

export default function Toolbar({
  onAddRow,
  onDuplicateRow,
  canDuplicate,
  onDeleteRow,
  canDelete,
  saveStatus,
  showMemberInfo,
  onToggleMemberInfo
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2">
        <button
          onClick={onAddRow}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>

        <button
          onClick={onDuplicateRow}
          disabled={!canDuplicate}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
            canDuplicate
              ? 'text-white bg-green-600 hover:bg-green-700'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          <Copy className="w-4 h-4" />
          Duplicate Mbr
        </button>

        <button
          onClick={onDeleteRow}
          disabled={!canDelete}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
            canDelete
              ? 'text-white bg-red-600 hover:bg-red-700'
              : 'text-gray-400 bg-gray-100 cursor-not-allowed'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Delete Row
        </button>

        <div className="w-px h-6 bg-gray-300 mx-2" />

        <button
          onClick={onToggleMemberInfo}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${
            showMemberInfo
              ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {showMemberInfo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Member Info
        </button>
      </div>

      <div className="flex items-center gap-2">
        <SaveStatusIndicator status={saveStatus} />
      </div>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (status === 'idle') {
    return null;
  }

  if (status === 'saving') {
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Saving...</span>
      </div>
    );
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <Check className="w-4 h-4" />
        <span className="text-sm">Saved</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-2 text-red-600">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm">Save failed</span>
      </div>
    );
  }

  return null;
}
