import { useState, useEffect } from 'react';
import { Trash2, X, AlertTriangle } from 'lucide-react';
import type { BulkPatient } from '../../types/bulkPatient';

interface DeleteModalProps {
  isOpen: boolean;
  patients: BulkPatient[];
  totalCount: number;
  adminEmail: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteModal({
  isOpen,
  patients,
  totalCount,
  adminEmail,
  loading,
  onConfirm,
  onClose,
}: DeleteModalProps) {
  const [confirmText, setConfirmText] = useState('');

  // Reset confirmation input when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const previewPatients = patients.slice(0, 10);
  const overflowCount = totalCount - previewPatients.length;
  const isConfirmed = confirmText === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Patients</h3>
                <p className="text-sm text-red-600 font-medium">
                  {totalCount.toLocaleString()} patient{totalCount !== 1 ? 's' : ''} will be permanently deleted
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Danger Warning */}
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              This action cannot be undone. All selected patients and their associated measures will be permanently removed.
            </p>
          </div>

          {/* Patient Preview */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Patients to be deleted:</p>
            <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded-md">
              {previewPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="px-3 py-2 text-sm border-b border-gray-100 last:border-b-0"
                >
                  <span className="font-medium text-gray-900">{patient.memberName}</span>
                  <span className="text-gray-500 ml-2">ID: {patient.id}</span>
                </div>
              ))}
            </div>
            {overflowCount > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                ...and {overflowCount.toLocaleString()} more
              </p>
            )}
          </div>

          {/* Confirmation Input */}
          <div className="mb-4">
            <label htmlFor="delete-confirm" className="block text-sm font-medium text-gray-700 mb-1">
              Type <span className="font-bold text-red-600">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              autoComplete="off"
            />
          </div>

          {/* Audit Note */}
          <p className="text-xs text-gray-400 mb-4">
            Recorded in audit log &mdash; {adminEmail}
          </p>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!isConfirmed || loading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Delete Patients
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
