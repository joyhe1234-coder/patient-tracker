import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Key,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Shield,
  UserCircle,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { api } from '../api/axios';
import { useAuthStore, UserRole } from '../stores/authStore';

interface AdminUser {
  id: number;
  email: string;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  canHavePatients: boolean;
  lastLoginAt: string | null;
  patientCount: number;
  assignedPhysicians: { physicianId: number; physicianName: string }[];
  assignedStaff: { staffId: number; staffName: string }[];
}

interface Physician {
  id: number;
  displayName: string;
}

interface AuditLogEntry {
  id: number;
  userId: number | null;
  username: string | null;
  userDisplayName: string;
  action: string;
  entity: string | null;
  entityId: number | null;
  changes: object | null;
  details: object | null;
  createdAt: string;
}

type TabType = 'users' | 'audit';

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<number | null>(null);

  // Expanded user rows (to show assignments)
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    } else {
      loadAuditLog();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const [usersRes, physiciansRes] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/physicians'),
      ]);
      setUsers(usersRes.data.data);
      setPhysicians(physiciansRes.data.data);
    } catch (err) {
      console.error('Failed to load users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/audit-log?limit=100');
      setAuditLog(response.data.data.entries);
    } catch (err) {
      console.error('Failed to load audit log:', err);
      setError('Failed to load audit log');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
      setError('Failed to deactivate user');
    }
  };

  const toggleUserExpanded = (userId: number) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'PHYSICIAN':
        return <Stethoscope className="w-4 h-4 text-blue-600" />;
      case 'STAFF':
        return <UserCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-800',
      PHYSICIAN: 'bg-blue-100 text-blue-800',
      STAFF: 'bg-green-100 text-green-800',
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}>
        {getRoleIcon(role)}
        {role}
      </span>
    );
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage users and view system activity</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm ${
                activeTab === 'audit'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              Audit Log
            </button>
          </nav>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        ) : activeTab === 'users' ? (
          <div className="bg-white rounded-lg shadow">
            {/* Users header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Users ({users.length})
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/admin/patient-assignment')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Patients
                </button>
                <button
                  onClick={() => {
                    setEditingUser(null);
                    setShowUserModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              </div>
            </div>

            {/* Users table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Patients
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((u) => (
                    <>
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {(u.role === 'STAFF' && u.assignedPhysicians.length > 0) ||
                            (u.role === 'PHYSICIAN' && u.assignedStaff.length > 0) ? (
                              <button
                                onClick={() => toggleUserExpanded(u.id)}
                                className="p-1 hover:bg-gray-100 rounded"
                              >
                                {expandedUsers.has(u.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6" />
                            )}
                            <div>
                              <div className="font-medium text-gray-900">{u.displayName}</div>
                              <div className="text-sm text-gray-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                        <td className="px-6 py-4">
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              <Check className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              <X className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {formatDate(u.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {u.role === 'PHYSICIAN' ? u.patientCount : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setShowUserModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600"
                              title="Edit user"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setResetPasswordUserId(u.id);
                                setShowResetPasswordModal(true);
                              }}
                              className="p-2 text-gray-400 hover:text-yellow-600"
                              title="Reset password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-2 text-gray-400 hover:text-red-600"
                                title="Deactivate user"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded row for assignments */}
                      {expandedUsers.has(u.id) && (
                        <tr key={`${u.id}-expanded`}>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            {u.role === 'STAFF' && u.assignedPhysicians.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  Assigned to physicians:
                                </span>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {u.assignedPhysicians.map((a) => (
                                    <span
                                      key={a.physicianId}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                                    >
                                      {a.physicianName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {u.role === 'PHYSICIAN' && u.assignedStaff.length > 0 && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">
                                  Staff assigned:
                                </span>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {u.assignedStaff.map((a) => (
                                    <span
                                      key={a.staffId}
                                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
                                    >
                                      {a.staffName}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Audit Log */
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Recent Activity
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Entity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                        {formatDate(entry.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {entry.userDisplayName}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                            entry.action === 'CREATE'
                              ? 'bg-green-100 text-green-800'
                              : entry.action === 'UPDATE'
                              ? 'bg-blue-100 text-blue-800'
                              : entry.action === 'DELETE'
                              ? 'bg-red-100 text-red-800'
                              : entry.action === 'LOGIN'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.entity} {entry.entityId ? `#${entry.entityId}` : ''}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {entry.changes
                          ? JSON.stringify(entry.changes).substring(0, 50) + '...'
                          : entry.details
                          ? JSON.stringify(entry.details).substring(0, 50) + '...'
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          physicians={physicians}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSaved={() => {
            setShowUserModal(false);
            setEditingUser(null);
            loadUsers();
          }}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUserId && (
        <ResetPasswordModal
          userId={resetPasswordUserId}
          onClose={() => {
            setShowResetPasswordModal(false);
            setResetPasswordUserId(null);
          }}
        />
      )}
    </div>
  );
}

// User Modal Component
function UserModal({
  user,
  physicians,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  physicians: Physician[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!user;
  const [formData, setFormData] = useState({
    email: user?.email || '',
    username: user?.username || '',
    password: '',
    displayName: user?.displayName || '',
    role: user?.role || 'PHYSICIAN',
    isActive: user?.isActive ?? true,
    canHavePatients: user?.canHavePatients ?? false,
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
        const updateData: Record<string, unknown> = {
          email: formData.email,
          username: formData.username,
          displayName: formData.displayName,
          role: formData.role,
          isActive: formData.isActive,
        };
        // Include canHavePatients for ADMIN role (PHYSICIAN is always true, STAFF is always false)
        if (formData.role === 'ADMIN') {
          updateData.canHavePatients = formData.canHavePatients;
        }
        await api.put(`/admin/users/${user!.id}`, updateData);

        // Update staff assignments if role is STAFF
        if (formData.role === 'STAFF') {
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
        const createData: Record<string, unknown> = {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          displayName: formData.displayName,
          role: formData.role,
        };
        // Include canHavePatients for ADMIN role
        if (formData.role === 'ADMIN') {
          createData.canHavePatients = formData.canHavePatients;
        }
        const response = await api.post('/admin/users', createData);

        // Add staff assignments if role is STAFF
        if (formData.role === 'STAFF') {
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
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to save user');
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="PHYSICIAN">Physician</option>
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          {/* Can Have Patients toggle - only for ADMIN role, always true for PHYSICIAN, always false for STAFF */}
          {formData.role === 'ADMIN' && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <input
                type="checkbox"
                id="canHavePatients"
                checked={formData.canHavePatients}
                onChange={(e) => setFormData({ ...formData, canHavePatients: e.target.checked })}
                className="mt-1 rounded"
              />
              <div>
                <label htmlFor="canHavePatients" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Can Have Patients
                </label>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enable this if this admin user should also be able to have patients assigned to them like a physician.
                </p>
              </div>
            </div>
          )}

          {formData.role === 'PHYSICIAN' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Can Have Patients:</span>
                <span className="text-sm text-green-600 font-medium">Always enabled for physicians</span>
              </div>
            </div>
          )}

          {formData.role === 'STAFF' && (
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

// Reset Password Modal
function ResetPasswordModal({
  userId,
  onClose,
}: {
  userId: number;
  onClose: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/admin/users/${userId}/reset-password`, { newPassword: password });
      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
        </div>

        {success ? (
          <div className="p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <p className="mt-4 text-sm text-gray-600">Password reset successfully!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                minLength={8}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

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
                {saving ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
