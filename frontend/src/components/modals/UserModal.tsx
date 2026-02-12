import { useState } from 'react';
import { api } from '../../api/axios';
import { getApiErrorMessage } from '../../utils/apiError';
import { UserRole } from '../../stores/authStore';
import type { UserUpdatePayload, UserCreatePayload } from '../../types/grid';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  roles: UserRole[];
  isActive: boolean;
  lastLoginAt: string | null;
  patientCount: number;
  assignedPhysicians: { physicianId: number; physicianName: string }[];
  assignedStaff: { staffId: number; staffName: string }[];
}

export interface Physician {
  id: number;
  displayName: string;
}

export interface UserModalProps {
  user: AdminUser | null;
  physicians: Physician[];
  onClose: () => void;
  onSaved: () => void;
}

export default function UserModal({
  user,
  physicians,
  onClose,
  onSaved,
}: UserModalProps) {
  const isEditing = !!user;
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    displayName: user?.displayName || '',
    roles: user?.roles || ['PHYSICIAN'] as UserRole[],
    isActive: user?.isActive ?? true,
    assignedPhysicianIds: user?.assignedPhysicians.map((a) => a.physicianId) || [],
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (isEditing) {
        // Update user
        const updateData: UserUpdatePayload = {
          email: formData.email,
          displayName: formData.displayName,
          roles: formData.roles,
          isActive: formData.isActive,
        };
        await api.put(`/admin/users/${user!.id}`, updateData);

        // Update staff assignments if role is STAFF
        if (formData.roles.includes('STAFF')) {
          // Remove old assignments not in new list
          for (const old of user!.assignedPhysicians) {
            if (!formData.assignedPhysicianIds.includes(old.physicianId)) {
              await api.delete('/admin/staff-assignments', {
                data: { staffId: user!.id, physicianId: old.physicianId },
              });
            }
          }
          // Add new assignments not in old list
          const oldIds = user!.assignedPhysicians.map((a) => a.physicianId);
          for (const newId of formData.assignedPhysicianIds) {
            if (!oldIds.includes(newId)) {
              await api.post('/admin/staff-assignments', {
                staffId: user!.id,
                physicianId: newId,
              });
            }
          }
        }
      } else {
        // Create user
        if (!formData.password) {
          setError('Password is required for new users');
          setSaving(false);
          return;
        }
        const createData: UserCreatePayload = {
          email: formData.email,
          password: formData.password,
          displayName: formData.displayName,
          roles: formData.roles,
        };
        const response = await api.post('/admin/users', createData);

        // Add staff assignments if role is STAFF
        if (formData.roles.includes('STAFF')) {
          const newUserId = response.data.data.id;
          for (const physicianId of formData.assignedPhysicianIds) {
            await api.post('/admin/staff-assignments', {
              staffId: newUserId,
              physicianId,
            });
          }
        }
      }

      onSaved();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to save user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit User' : 'Add User'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                minLength={8}
                required={!isEditing}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles
            </label>
            <div className="space-y-2 p-3 border border-gray-300 rounded-md">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="roleSelection"
                  checked={formData.roles.length === 1 && formData.roles[0] === 'PHYSICIAN'}
                  onChange={() => setFormData({ ...formData, roles: ['PHYSICIAN'] })}
                  className="rounded"
                />
                <span className="text-sm">Physician</span>
                <span className="text-xs text-gray-500">- Can have patients assigned</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="roleSelection"
                  checked={formData.roles.length === 1 && formData.roles[0] === 'STAFF'}
                  onChange={() => setFormData({ ...formData, roles: ['STAFF'] })}
                  className="rounded"
                />
                <span className="text-sm">Staff</span>
                <span className="text-xs text-gray-500">- Can view assigned physicians' patients</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="roleSelection"
                  checked={formData.roles.length === 1 && formData.roles[0] === 'ADMIN'}
                  onChange={() => setFormData({ ...formData, roles: ['ADMIN'] })}
                  className="rounded"
                />
                <span className="text-sm">Admin</span>
                <span className="text-xs text-gray-500">- Can manage users and view all patients</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="roleSelection"
                  checked={formData.roles.includes('ADMIN') && formData.roles.includes('PHYSICIAN')}
                  onChange={() => setFormData({ ...formData, roles: ['ADMIN', 'PHYSICIAN'] })}
                  className="rounded"
                />
                <span className="text-sm">Admin + Physician</span>
                <span className="text-xs text-gray-500">- Admin who can also have patients</span>
              </label>
            </div>
          </div>

          {formData.roles.includes('STAFF') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assigned Physicians
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                {physicians.map((p) => (
                  <label key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.assignedPhysicianIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assignedPhysicianIds: [...formData.assignedPhysicianIds, p.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedPhysicianIds: formData.assignedPhysicianIds.filter(
                              (id) => id !== p.id
                            ),
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{p.displayName}</span>
                  </label>
                ))}
                {physicians.length === 0 && (
                  <p className="text-sm text-gray-500">No physicians available</p>
                )}
              </div>
            </div>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                Active
              </label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
