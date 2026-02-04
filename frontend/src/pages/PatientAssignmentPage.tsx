import { useState, useEffect } from 'react';
import { api } from '../api/axios';
import { Users, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';

interface UnassignedPatient {
  id: number;
  memberName: string;
  memberDob: string;
  memberTelephone: string | null;
  measureCount: number;
}

interface Physician {
  id: number;
  displayName: string;
  email: string;
  role: string;
}

export default function PatientAssignmentPage() {
  const [patients, setPatients] = useState<UnassignedPatient[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<number>>(new Set());
  const [targetPhysicianId, setTargetPhysicianId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, physiciansRes] = await Promise.all([
        api.get('/admin/patients/unassigned'),
        api.get('/users/physicians'),
      ]);

      if (patientsRes.data.success) {
        setPatients(patientsRes.data.data);
      }
      if (physiciansRes.data.success) {
        setPhysicians(physiciansRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const togglePatient = (patientId: number) => {
    setSelectedPatients((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPatients.size === patients.length) {
      setSelectedPatients(new Set());
    } else {
      setSelectedPatients(new Set(patients.map((p) => p.id)));
    }
  };

  const handleAssign = async () => {
    if (selectedPatients.size === 0 || !targetPhysicianId) return;

    setAssigning(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await api.patch('/admin/patients/bulk-assign', {
        patientIds: Array.from(selectedPatients),
        ownerId: targetPhysicianId,
      });

      if (response.data.success) {
        setSuccessMessage(response.data.message);
        setSelectedPatients(new Set());
        setTargetPhysicianId(null);
        // Reload to get updated list
        loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to assign patients');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading unassigned patients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Patient Assignment</h1>
            <p className="text-gray-600">Assign unassigned patients to physicians</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-red-700">{error}</div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="text-green-700">{successMessage}</div>
        </div>
      )}

      {patients.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">All Patients Assigned</h2>
          <p className="text-gray-600">
            There are no unassigned patients at this time.
          </p>
        </div>
      ) : (
        <>
          {/* Assignment Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {selectedPatients.size} of {patients.length} selected
                </span>
                <button
                  onClick={selectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedPatients.size === patients.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Assign to:</span>
                  <select
                    value={targetPhysicianId || ''}
                    onChange={(e) => setTargetPhysicianId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Physician --</option>
                    {physicians.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleAssign}
                  disabled={selectedPatients.size === 0 || !targetPhysicianId || assigning}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPatients.size === 0 || !targetPhysicianId || assigning
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {assigning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Assign Selected
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Patient List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPatients.size === patients.length && patients.length > 0}
                      onChange={selectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date of Birth
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Measures
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {patients.map((patient) => (
                  <tr
                    key={patient.id}
                    className={`hover:bg-gray-50 cursor-pointer ${
                      selectedPatients.has(patient.id) ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => togglePatient(patient.id)}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedPatients.has(patient.id)}
                        onChange={() => togglePatient(patient.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{patient.memberName}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {patient.memberDob}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {patient.memberTelephone || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                        {patient.measureCount} measure{patient.measureCount !== 1 ? 's' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Back Link */}
      <div className="mt-6">
        <a href="/admin" className="text-blue-600 hover:text-blue-800">
          &larr; Back to Admin
        </a>
      </div>
    </div>
  );
}
