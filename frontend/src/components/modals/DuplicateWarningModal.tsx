import { XCircle } from 'lucide-react';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  patientName: string;
  onClose: () => void;
}

export default function DuplicateWarningModal({
  isOpen,
  patientName,
  onClose,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Duplicate Row Error
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  A row with the same patient name, date of birth, request type, and quality measure already exists:
                </p>
                <ul className="mt-2 ml-4 list-disc">
                  <li><strong>Patient:</strong> {patientName}</li>
                </ul>
                <p className="mt-3">
                  Please use a different patient, request type, or quality measure, or update the existing row.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
