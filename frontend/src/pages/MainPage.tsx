import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Loader2, Users } from 'lucide-react';
import PatientGrid, { GridRow } from '../components/grid/PatientGrid';
import StatusBar from '../components/layout/StatusBar';
import Toolbar from '../components/layout/Toolbar';
import StatusFilterBar, { StatusColor, getRowStatusColor } from '../components/layout/StatusFilterBar';
import ConfirmModal from '../components/modals/ConfirmModal';
import AddRowModal, { NewRowData } from '../components/modals/AddRowModal';
import { api } from '../api/axios';
import { useAuthStore } from '../stores/authStore';

export default function MainPage() {
  const { user, selectedPhysicianId, assignments } = useAuthStore();

  const [rowData, setRowData] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [newRowId, setNewRowId] = useState<number | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Column visibility
  const [showMemberInfo, setShowMemberInfo] = useState(false);

  // Status color filters
  const [activeFilters, setActiveFilters] = useState<StatusColor[]>(['all']);

  // Patient name search
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Build query params for API calls (STAFF and ADMIN users need physicianId)
  const getQueryParams = useCallback(() => {
    if (user?.roles.includes('STAFF') && selectedPhysicianId) {
      return `?physicianId=${selectedPhysicianId}`;
    }
    if (user?.roles.includes('ADMIN')) {
      // ADMIN can view unassigned patients (physicianId=null) or specific physician
      return `?physicianId=${selectedPhysicianId === null ? 'unassigned' : selectedPhysicianId}`;
    }
    return '';
  }, [user?.roles, selectedPhysicianId]);

  // Calculate row counts by status color
  const rowCounts = useMemo(() => {
    const counts: Record<StatusColor, number> = {
      all: 0,
      duplicate: 0,
      white: 0,
      yellow: 0,
      blue: 0,
      green: 0,
      purple: 0,
      orange: 0,
      gray: 0,
      red: 0,
    };

    rowData.forEach((row) => {
      // Count duplicates separately (not mutually exclusive with status colors)
      if (row.isDuplicate) {
        counts.duplicate++;
      }
      // Count by status color
      const color = getRowStatusColor(row);
      counts[color]++;
    });

    return counts;
  }, [rowData]);

  // Filter row data based on active filters and name search
  const filteredRowData = useMemo(() => {
    let filtered = rowData;

    // Apply status color filter
    if (!activeFilters.includes('all') && activeFilters.length > 0) {
      filtered = filtered.filter((row) => {
        if (activeFilters.includes('duplicate')) return row.isDuplicate;
        const color = getRowStatusColor(row);
        return activeFilters.includes(color);
      });
    }

    // Apply name search filter
    if (searchText.trim()) {
      const search = searchText.trim().toLowerCase();
      filtered = filtered.filter((row) =>
        row.memberName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [rowData, activeFilters, searchText]);

  // Ctrl+F / Cmd+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Don't intercept if editing a cell in AG Grid
        if (document.querySelector('.ag-popup-editor')) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load data when component mounts or when selectedPhysicianId changes (for STAFF)
  useEffect(() => {
    loadData();
  }, [selectedPhysicianId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = getQueryParams();
      const response = await api.get(`/data${queryParams}`);
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
      // No defaults - requestType, qualityMeasure, measureStatus will be null
      const queryParams = getQueryParams();
      const response = await api.post(`/data${queryParams}`, data);

      if (response.data.success) {
        // Insert new row at beginning (it has rowOrder: 0)
        setRowData((prev) => [response.data.data, ...prev]);
        setShowAddModal(false);
        setSaveStatus('saved');
        // Set newRowId to trigger focus on Request Type cell
        setNewRowId(response.data.data.id);
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to add row:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle add new row
  // No duplicate check needed - requestType/qualityMeasure are null on new rows
  // Returns true if row was created successfully, false otherwise
  const handleAddRow = async (data: NewRowData): Promise<boolean> => {
    try {
      // No duplicate check - new rows have null requestType/qualityMeasure
      // Duplicate check is skipped when these fields are null
      await createRow(data);
      return true;
    } catch (err) {
      console.error('Failed to add row:', err);
      return false;
    }
  };

  // Handle duplicate row
  const handleDuplicateRow = async () => {
    if (!selectedRowId) return;

    try {
      setSaveStatus('saving');
      const queryParams = getQueryParams();
      const response = await api.post(`/data/duplicate${queryParams}`, { sourceRowId: selectedRowId });

      if (response.data.success) {
        const newRow = response.data.data;

        // Insert new row after the selected row in the array
        setRowData((prev) => {
          const sourceIndex = prev.findIndex((r) => r.id === selectedRowId);
          if (sourceIndex === -1) return [...prev, newRow];

          const updated = [...prev];
          updated.splice(sourceIndex + 1, 0, newRow);
          return updated;
        });

        // Focus the new row
        setNewRowId(newRow.id);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Failed to duplicate row:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // Handle delete row
  const handleDeleteRow = async () => {
    if (!selectedRowId) return;

    try {
      setSaveStatus('saving');
      const response = await api.delete(`/data/${selectedRowId}${getQueryParams()}`);

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

  // Clear newRowId after grid has focused the cell
  const handleNewRowFocused = useCallback(() => {
    setNewRowId(null);
  }, []);

  // Check if STAFF/ADMIN needs to select a physician first
  // For STAFF: must have a specific physician selected (number)
  // For ADMIN: can have a specific physician (number) OR view unassigned patients (null)
  // Only show prompt if selectedPhysicianId is undefined (not yet selected)
  const needsPhysicianSelection =
    (user?.roles.includes('STAFF') && !selectedPhysicianId) ||
    (user?.roles.includes('ADMIN') && selectedPhysicianId === undefined);

  // STAFF user with no physician assignments - show contact admin message
  const staffHasNoAssignments = user?.roles.includes('STAFF') && !user?.roles.includes('ADMIN') && assignments.length === 0;

  if (staffHasNoAssignments) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Physician Assignments
          </h2>
          <p className="text-gray-600 mb-4">
            You have not been assigned to any physicians yet.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your administrator to be assigned to a physician so you can view their patients.
          </p>
        </div>
      </div>
    );
  }

  if (needsPhysicianSelection) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Select a Physician
          </h2>
          <p className="text-gray-600 mb-4">
            Please select a physician from the dropdown in the header to view their patients.
          </p>
          <p className="text-sm text-gray-500">
            {user?.roles.includes('ADMIN')
              ? 'As an admin, you can view any physician\'s patients or select "Unassigned" to view patients not yet assigned.'
              : 'You can only view patients for physicians you are assigned to.'}
          </p>
        </div>
      </div>
    );
  }

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
        onDuplicateRow={handleDuplicateRow}
        canDuplicate={selectedRowId !== null}
        onDeleteRow={() => setShowDeleteModal(true)}
        canDelete={selectedRowId !== null}
        saveStatus={saveStatus}
        showMemberInfo={showMemberInfo}
        onToggleMemberInfo={() => setShowMemberInfo(!showMemberInfo)}
      />

      <StatusFilterBar
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
        rowCounts={rowCounts}
        searchText={searchText}
        onSearchChange={setSearchText}
        searchInputRef={searchInputRef}
      />

      <div className="flex-1 p-4">
        <PatientGrid
          rowData={filteredRowData}
          onRowUpdated={handleRowUpdated}
          onSaveStatusChange={setSaveStatus}
          onRowSelected={handleRowSelected}
          showMemberInfo={showMemberInfo}
          newRowId={newRowId}
          onNewRowFocused={handleNewRowFocused}
        />
      </div>

      <StatusBar rowCount={filteredRowData.length} totalRowCount={rowData.length} />

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
    </div>
  );
}
