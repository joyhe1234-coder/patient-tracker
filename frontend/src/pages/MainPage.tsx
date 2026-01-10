import { useEffect, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import PatientGrid, { GridRow } from '../components/grid/PatientGrid';
import StatusBar from '../components/layout/StatusBar';
import Toolbar from '../components/layout/Toolbar';
import ConfirmModal from '../components/modals/ConfirmModal';
import AddRowModal, { NewRowData } from '../components/modals/AddRowModal';
import DuplicateWarningModal from '../components/modals/DuplicateWarningModal';
import { api } from '../api/axios';

export default function MainPage() {
  const [rowData, setRowData] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [pendingRowData, setPendingRowData] = useState<NewRowData | null>(null);

  // Column visibility
  const [showMemberInfo, setShowMemberInfo] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/data');
      console.log('Loaded data:', response.data);
      setRowData(response.data.data || []);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load patient data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle row update from grid
  const handleRowUpdated = useCallback((updatedRow: GridRow) => {
    setRowData((prev) =>
      prev.map((row) => (row.id === updatedRow.id ? updatedRow : row))
    );
  }, []);

  // Create row (called after duplicate check passes or user confirms)
  const createRow = async (data: NewRowData) => {
    try {
      setSaveStatus('saving');
      const response = await api.post('/data', {
        ...data,
        requestType: 'AWV',
        qualityMeasure: 'Annual Wellness Visit',
        measureStatus: 'Not Addressed',
      });

      if (response.data.success) {
        setRowData((prev) => [...prev, response.data.data]);
        setShowAddModal(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to add row:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle add new row - check for duplicates first
  // Duplicate = same patient name + DOB already exists
  // Returns true if row was created successfully, false otherwise
  const handleAddRow = async (data: NewRowData): Promise<boolean> => {
    try {
      // Check if this would create a duplicate (same name + DOB)
      const checkResponse = await api.post('/data/check-duplicate', {
        memberName: data.memberName,
        memberDob: data.memberDob,
      });

      if (checkResponse.data.success && checkResponse.data.data.isDuplicate) {
        // Show duplicate error modal - don't allow creation
        setPendingRowData(data);
        setShowDuplicateWarning(true);
        return false; // Signal failure - keep form data
      }

      // No duplicate, proceed with creation
      await createRow(data);
      return true; // Signal success
    } catch (err) {
      console.error('Failed to check duplicate:', err);
      // If check fails, proceed with creation anyway
      await createRow(data);
      return true;
    }
  };

  // Handle closing duplicate error modal
  const handleCloseDuplicateError = () => {
    // Keep pendingRowData so form retains the values
    setShowDuplicateWarning(false);
  };

  // Handle delete row
  const handleDeleteRow = async () => {
    if (!selectedRowId) return;

    try {
      setSaveStatus('saving');
      const response = await api.delete(`/data/${selectedRowId}`);

      if (response.data.success) {
        setRowData((prev) => prev.filter((row) => row.id !== selectedRowId));
        setSelectedRowId(null);
        setShowDeleteModal(false);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to delete row:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle row selection from grid
  const handleRowSelected = useCallback((id: number | null) => {
    setSelectedRowId(id);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Toolbar
        onAddRow={() => setShowAddModal(true)}
        onDeleteRow={() => setShowDeleteModal(true)}
        canDelete={selectedRowId !== null}
        saveStatus={saveStatus}
        showMemberInfo={showMemberInfo}
        onToggleMemberInfo={() => setShowMemberInfo(!showMemberInfo)}
      />

      <div className="flex-1 p-4">
        <PatientGrid
          rowData={rowData}
          onRowUpdated={handleRowUpdated}
          onSaveStatusChange={setSaveStatus}
          onRowSelected={handleRowSelected}
          showMemberInfo={showMemberInfo}
        />
      </div>

      <StatusBar rowCount={rowData.length} />

      {/* Add Row Modal */}
      <AddRowModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddRow}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Row"
        message="Are you sure you want to delete this row? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
        onConfirm={handleDeleteRow}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Duplicate Error Modal */}
      <DuplicateWarningModal
        isOpen={showDuplicateWarning}
        patientName={pendingRowData?.memberName || ''}
        onClose={handleCloseDuplicateError}
      />
    </div>
  );
}
