import { AlertTriangle } from 'lucide-react';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  patientName: string;
  qualityMeasure: string;
  onProceed: () => void;
  onCancel: () => void;
}

export default function DuplicateWarningModal({
  isOpen,
  patientName,
  qualityMeasure,
  onProceed,
  onCancel,
}: DuplicateWarningModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Duplicate Entry Detected
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                <p>
                  A record already exists for this patient with the same quality measure:
                </p>
                <ul className="mt-2 ml-4 list-disc">
                  <li><strong>Patient:</strong> {patientName}</li>
                  <li><strong>Quality Measure:</strong> {qualityMeasure}</li>
                </ul>
                <p className="mt-3">
                  Do you want to proceed? The row will be marked as a duplicate.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
            >
              Proceed Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
