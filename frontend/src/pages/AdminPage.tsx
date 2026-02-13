import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, FileText, Plus, Edit2, Trash2, Key, Check, X,
  ChevronDown, ChevronUp, Shield, UserCircle, Stethoscope } from 'lucide-react';
import { api } from '../api/axios';
import { logger } from '../utils/logger';
import { useAuthStore, UserRole } from '../stores/authStore';
import UserModal, { type AdminUser, type Physician } from '../components/modals/UserModal';
import ResetPasswordModal from '../components/modals/ResetPasswordModal';

interface AuditLogEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userDisplayName: string;
  action: string;
  entity: string | null;
  entityId: number | null;
  changes: object | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
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
    if (user && !user.roles.includes('ADMIN')) {
      navigate('/');
    }
  }, [user, navigate]);

  // Load data
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers().catch((err) => {
        logger.error('Failed to load users:', err);
        setError('Failed to load users');
      });
    } else {
      loadAuditLog().catch((err) => {
        logger.error('Failed to load audit log:', err);
        setError('Failed to load audit log');
      });
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
      logger.error('Failed to load users:', err);
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
      logger.error('Failed to load audit log:', err);
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
      logger.error('Failed to delete user:', err);
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

  const getRoleBadge = (roles: UserRole[]) => {
    const colors = {
      ADMIN: 'bg-purple-100 text-purple-800',
      PHYSICIAN: 'bg-blue-100 text-blue-800',
      STAFF: 'bg-green-100 text-green-800',
    };

    // Multiple roles - show all badges
    if (roles.length > 1) {
      return (
        <div className="flex gap-1">
          {roles.map((role) => (
            <span key={role} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}>
              {getRoleIcon(role)}
              {role}
            </span>
          ))}
        </div>
      );
    }

    // Single role
    const role = roles[0];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[role]}`}>
        {getRoleIcon(role)}
        {role}
      </span>
    );
  };

  // NOTE: Uses locale-aware DateTime formatting for timestamps (different from dateFormatter.ts UTC date-only formatting)
  const formatTimestamp = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const formatSecurityDetails = (entry: AuditLogEntry) => {
    const parts: string[] = [];
    if (entry.details && typeof entry.details === 'object') {
      const reason = (entry.details as Record<string, unknown>).reason;
      if (reason) parts.push(`Reason: ${String(reason)}`);
    }
    if (entry.userEmail) parts.push(`Email: ${entry.userEmail}`);
    if (entry.ipAddress) parts.push(`IP: ${entry.ipAddress}`);
    return parts.length > 0 ? parts.join(' | ') : '-';
  };

  if (!user?.roles.includes('ADMIN')) {
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
                            {(u.roles.includes('STAFF') && u.assignedPhysicians.length > 0) ||
                            (u.roles.includes('PHYSICIAN') && u.assignedStaff.length > 0) ? (
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
                        <td className="px-6 py-4">{getRoleBadge(u.roles)}</td>
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
                          {formatTimestamp(u.lastLoginAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {u.roles.includes('PHYSICIAN') ? u.patientCount : '-'}
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
                            {u.roles.includes('STAFF') && u.assignedPhysicians.length > 0 && (
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
                            {u.roles.includes('PHYSICIAN') && u.assignedStaff.length > 0 && (
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
                        {formatTimestamp(entry.createdAt)}
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
                              : entry.action === 'LOGIN_FAILED'
                              ? 'bg-orange-100 text-orange-800'
                              : entry.action === 'ACCOUNT_LOCKED'
                              ? 'bg-red-100 text-red-800'
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
                        {entry.action === 'LOGIN_FAILED' || entry.action === 'ACCOUNT_LOCKED'
                          ? formatSecurityDetails(entry)
                          : entry.changes
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
