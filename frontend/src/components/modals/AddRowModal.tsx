import { useState } from 'react';
import { X } from 'lucide-react';

interface AddRowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewRowData) => Promise<boolean>;
}

export interface NewRowData {
  memberName: string;
  memberDob: string;
  memberTelephone?: string;
  memberAddress?: string;
}

export default function AddRowModal({ isOpen, onClose, onAdd }: AddRowModalProps) {
  const [formData, setFormData] = useState<NewRowData>({
    memberName: '',
    memberDob: '',
    memberTelephone: '',
    memberAddress: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (field: keyof NewRowData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.memberName.trim()) {
      newErrors.memberName = 'Member name is required';
    }
    if (!formData.memberDob) {
      newErrors.memberDob = 'Date of birth is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Convert date to UTC noon to avoid timezone issues
      const [year, month, day] = formData.memberDob.split('-');
      const isoDate = `${year}-${month}-${day}T12:00:00.000Z`;

      const success = await onAdd({
        ...formData,
        memberDob: isoDate,
      });

      // Only reset form if creation was successful
      if (success) {
        setFormData({
          memberName: '',
          memberDob: '',
          memberTelephone: '',
          memberAddress: '',
        });
        setErrors({});
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Add New Patient</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4">
            <div className="space-y-4">
              {/* Member Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.memberName}
                  onChange={(e) => handleChange('memberName', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.memberName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter patient name"
                />
                {errors.memberName && (
                  <p className="mt-1 text-sm text-red-500">{errors.memberName}</p>
                )}
              </div>

              {/* Member DOB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.memberDob}
                  onChange={(e) => handleChange('memberDob', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.memberDob ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.memberDob && (
                  <p className="mt-1 text-sm text-red-500">{errors.memberDob}</p>
                )}
              </div>

              {/* Member Telephone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telephone
                </label>
                <input
                  type="tel"
                  value={formData.memberTelephone}
                  onChange={(e) => handleChange('memberTelephone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Member Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.memberAddress}
                  onChange={(e) => handleChange('memberAddress', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, City, State ZIP"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Row
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
