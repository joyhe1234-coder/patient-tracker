import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  Trash2,
  CheckSquare,
  XSquare,
  Search,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../api/axios';
import { useAuthStore } from '../stores/authStore';
import { useBulkPatientStore } from '../stores/bulkPatientStore';
import AssignModal from '../components/modals/AssignModal';
import UnassignModal from '../components/modals/UnassignModal';
import DeleteModal from '../components/modals/DeleteModal';
import Toast from '../components/layout/Toast';
import type { BulkPatient } from '../types/bulkPatient';

interface BulkOperationsTabProps {
  isActive: boolean;
}

type ModalType = 'assign' | 'unassign' | 'delete' | null;

export function BulkOperationsTab({ isActive }: BulkOperationsTabProps) {
  const hasActivated = useRef(false);
  const { user } = useAuthStore();

  const {
    patients,
    summary,
    physicians,
    filters,
    selectedIds,
    loading,
    operationLoading,
    error,
    filteredPatients,
    fetchPatients,
    fetchPhysicians,
    setFilter,
    clearFilters,
    toggleSelection,
    selectAllFiltered,
    deselectAll,
    toggleAllFiltered,
    setOperationLoading,
    setError,
  } = useBulkPatientStore();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Lazy-load data on first activation
  useEffect(() => {
    if (isActive && !hasActivated.current) {
      hasActivated.current = true;
      fetchPatients();
      fetchPhysicians();
    }
  }, [isActive, fetchPatients, fetchPhysicians]);

  const filtered = filteredPatients();
  const selectedCount = selectedIds.size;
  const allFilteredSelected = filtered.length > 0 && filtered.every(p => selectedIds.has(p.id));

  // Get selected patients for modal previews
  const selectedPatients = useMemo(
    () => patients.filter(p => selectedIds.has(p.id)),
    [patients, selectedIds]
  );

  // Derive unique filter options from the full patient list
  const physicianOptions = useMemo(() => {
    const names = new Set(patients.map(p => p.ownerName).filter((n): n is string => n !== null));
    return [...names].sort();
  }, [patients]);

  const insuranceOptions = useMemo(() => {
    const groups = new Set(patients.map(p => p.insuranceGroup).filter((g): g is string => g !== null));
    return [...groups].sort();
  }, [patients]);

  const measureOptions = useMemo(() => {
    const measures = new Set(patients.map(p => p.latestMeasure).filter((m): m is string => m !== null));
    return [...measures].sort();
  }, [patients]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
  }, []);

  // Bulk Assign handler
  const handleAssign = async (physicianId: number) => {
    setOperationLoading(true);
    try {
      const response = await api.patch('/admin/patients/bulk-assign', {
        patientIds: [...selectedIds],
        ownerId: physicianId,
      });
      setActiveModal(null);
      showToast(response.data.message, 'success');
      await fetchPatients();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
      showToast(
        error.response?.data?.error?.message || error.response?.data?.message || 'Failed to assign patients',
        'error'
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Bulk Unassign handler
  const handleUnassign = async () => {
    setOperationLoading(true);
    try {
      const response = await api.patch('/admin/patients/bulk-assign', {
        patientIds: [...selectedIds],
        ownerId: null,
      });
      setActiveModal(null);
      showToast(response.data.message, 'success');
      await fetchPatients();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
      showToast(
        error.response?.data?.error?.message || error.response?.data?.message || 'Failed to unassign patients',
        'error'
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Bulk Delete handler
  const handleDelete = async () => {
    setOperationLoading(true);
    try {
      const response = await api.delete('/admin/patients/bulk-delete', {
        data: { patientIds: [...selectedIds] },
      });
      setActiveModal(null);
      showToast(response.data.message, 'success');
      await fetchPatients();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string };
      showToast(
        error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete patients',
        'error'
      );
    } finally {
      setOperationLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading patients...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { setError(null); fetchPatients(); }}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Total Patients" value={summary.totalPatients} color="blue" />
        <SummaryCard label="Assigned" value={summary.assignedCount} color="green" />
        <SummaryCard label="Unassigned" value={summary.unassignedCount} color="amber" />
        <SummaryCard label="Insurance Systems" value={summary.insuranceSystemCount} color="purple" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 pb-4 border-b border-gray-200">
        {/* Selection buttons */}
        <div className="flex items-center gap-2">
          {!allFilteredSelected && (
            <button
              onClick={selectAllFiltered}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <CheckSquare className="w-4 h-4" />
              Select All ({filtered.length.toLocaleString()})
            </button>
          )}
          {selectedCount > 0 && (
            <button
              onClick={deselectAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
            >
              <XSquare className="w-4 h-4" />
              Deselect All
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveModal('assign')}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-4 h-4" />
            Assign{selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ''}
          </button>
          <button
            onClick={() => setActiveModal('unassign')}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserMinus className="w-4 h-4" />
            Unassign{selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ''}
          </button>
          <button
            onClick={() => setActiveModal('delete')}
            disabled={selectedCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            Delete{selectedCount > 0 ? ` (${selectedCount.toLocaleString()})` : ''}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Physician filter */}
        <select
          value={filters.physician}
          onChange={(e) => setFilter('physician', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by physician"
        >
          <option value="">All Physicians</option>
          <option value="__unassigned__">Unassigned</option>
          {physicianOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Insurance filter */}
        <select
          value={filters.insurance}
          onChange={(e) => setFilter('insurance', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by insurance"
        >
          <option value="">All Insurance</option>
          {insuranceOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Measure filter */}
        <select
          value={filters.measure}
          onChange={(e) => setFilter('measure', e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by measure"
        >
          <option value="">All Measures</option>
          {measureOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name..."
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Search patients"
          />
          {filters.search && (
            <button
              onClick={() => setFilter('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Clear filters */}
        {(filters.physician || filters.insurance || filters.measure || filters.search) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:underline whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Empty state */}
      {patients.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No patients found</p>
          <p className="text-sm">Import patients to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No patients match your filters</p>
          <button
            onClick={clearFilters}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Patient Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="w-10 px-3 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAllFiltered}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        aria-label="Select all visible patients"
                      />
                    </th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Patient Name</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">DOB</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Physician</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Insurance</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Measure</th>
                    <th className="px-3 py-3 text-left font-medium text-gray-700">Status</th>
                    <th className="px-3 py-3 text-right font-medium text-gray-700">Measures</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((patient) => (
                    <PatientRow
                      key={patient.id}
                      patient={patient}
                      isSelected={selectedIds.has(patient.id)}
                      onToggle={() => toggleSelection(patient.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Table Footer */}
          <div className="mt-2 text-sm text-gray-500 flex justify-between">
            <span>{filtered.length.toLocaleString()} patient{filtered.length !== 1 ? 's' : ''}</span>
            {selectedCount > 0 && (
              <span>
                {selectedCount.toLocaleString()} of {filtered.length.toLocaleString()} selected
              </span>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <AssignModal
        isOpen={activeModal === 'assign'}
        patients={selectedPatients}
        physicians={physicians}
        totalCount={selectedCount}
        adminEmail={user?.email || ''}
        loading={operationLoading}
        onConfirm={handleAssign}
        onClose={() => setActiveModal(null)}
      />
      <UnassignModal
        isOpen={activeModal === 'unassign'}
        patients={selectedPatients}
        totalCount={selectedCount}
        adminEmail={user?.email || ''}
        loading={operationLoading}
        onConfirm={handleUnassign}
        onClose={() => setActiveModal(null)}
      />
      <DeleteModal
        isOpen={activeModal === 'delete'}
        patients={selectedPatients}
        totalCount={selectedCount}
        adminEmail={user?.email || ''}
        loading={operationLoading}
        onConfirm={handleDelete}
        onClose={() => setActiveModal(null)}
      />

      {/* Toast */}
      <Toast
        message={toast?.message || ''}
        type={toast?.type || 'success'}
        isVisible={toast !== null}
        onDismiss={dismissToast}
      />
    </div>
  );
}

// --- Sub-components ---

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`rounded-lg border p-4 ${c.bg} ${c.border}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${c.text}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function PatientRow({
  patient,
  isSelected,
  onToggle,
}: {
  patient: BulkPatient;
  isSelected: boolean;
  onToggle: () => void;
}) {
  return (
    <tr
      onClick={onToggle}
      className={`cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <td className="px-3 py-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </td>
      <td className="px-3 py-2 font-medium text-gray-900">{patient.memberName}</td>
      <td className="px-3 py-2 text-gray-600">{patient.memberDob}</td>
      <td className="px-3 py-2">
        {patient.ownerName ? (
          <span className="text-gray-700">{patient.ownerName}</span>
        ) : (
          <span className="text-red-500 italic text-xs font-medium bg-red-50 px-2 py-0.5 rounded">
            Unassigned
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-gray-600">{patient.insuranceGroup || '--'}</td>
      <td className="px-3 py-2 text-gray-600">{patient.latestMeasure || '--'}</td>
      <td className="px-3 py-2 text-gray-600">{patient.latestStatus || '--'}</td>
      <td className="px-3 py-2 text-right text-gray-600">{patient.measureCount}</td>
    </tr>
  );
}
