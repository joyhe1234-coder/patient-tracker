import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Loader2, Users } from 'lucide-react';
import PatientGrid, { GridRow, PatientGridHandle } from '../components/grid/PatientGrid';
import StatusBar from '../components/layout/StatusBar';
import Toolbar from '../components/layout/Toolbar';
import StatusFilterBar from '../components/layout/StatusFilterBar';
import { StatusColor, getRowStatusColor } from '../config/statusColors';
import { QUALITY_MEASURE_TO_STATUS } from '../config/dropdownConfig';
import ConfirmModal from '../components/modals/ConfirmModal';
import AddRowModal, { NewRowData } from '../components/modals/AddRowModal';
import { api } from '../api/axios';
import { getApiErrorMessage } from '../utils/apiError';
import { showToast } from '../utils/toast';
import { useAuthStore } from '../stores/authStore';
import { useSocket } from '../hooks/useSocket';
import { useRealtimeStore } from '../stores/realtimeStore';
import type { GridRowPayload } from '../types/socket';

export default function MainPage() {
  const { user, selectedPhysicianId, assignments } = useAuthStore();
  const importInProgress = useRealtimeStore((s) => s.importInProgress);
  const importedBy = useRealtimeStore((s) => s.importedBy);

  const [rowData, setRowData] = useState<GridRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null);
  const [newRowId, setNewRowId] = useState<number | null>(null);

  // Ref to PatientGrid for remote operations
  const gridHandleRef = useRef<PatientGridHandle>(null);

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

  // Quality measure filter
  const [selectedMeasure, setSelectedMeasure] = useState<string>('All Measures');
  const measureOptions = useMemo(() => Object.keys(QUALITY_MEASURE_TO_STATUS).sort(), []);

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

  // Calculate row counts by status color, scoped by selected measure
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

    const scopedRows = selectedMeasure === 'All Measures'
      ? rowData
      : rowData.filter(row => row.qualityMeasure === selectedMeasure);

    scopedRows.forEach((row) => {
      // Count duplicates separately (not mutually exclusive with status colors)
      if (row.isDuplicate) {
        counts.duplicate++;
      }
      // Count by status color
      const color = getRowStatusColor(row);
      counts[color]++;
    });

    return counts;
  }, [rowData, selectedMeasure]);

  // Filter row data based on measure, active color filters, and name search
  const filteredRowData = useMemo(() => {
    let filtered = rowData;

    // Apply quality measure filter
    if (selectedMeasure !== 'All Measures') {
      filtered = filtered.filter(row => row.qualityMeasure === selectedMeasure);
    }

    // Apply status color filter
    if (!activeFilters.includes('all') && activeFilters.length > 0) {
      filtered = filtered.filter((row) => {
        if (activeFilters.includes('duplicate')) return row.isDuplicate;
        const color = getRowStatusColor(row);
        return activeFilters.includes(color);
      });
    }

    // Apply name search filter — each word matches independently
    // so "williams robert" matches "williams, robert"
    if (searchText.trim()) {
      const searchWords = searchText.trim().toLowerCase().split(/\s+/);
      filtered = filtered.filter((row) => {
        const name = row.memberName?.toLowerCase() || '';
        return searchWords.every((word) => name.includes(word));
      });
    }

    return filtered;
  }, [rowData, selectedMeasure, activeFilters, searchText]);

  // Build human-readable filter summary for status bar
  const STATUS_LABELS: Record<string, string> = {
    white: 'Not Addressed', red: 'Overdue', blue: 'In Progress',
    yellow: 'Contacted', green: 'Completed', purple: 'Declined',
    orange: 'Resolved', gray: 'N/A', duplicate: 'Duplicates',
  };

  const filterSummary = useMemo(() => {
    const parts: string[] = [];

    if (!activeFilters.includes('all') && activeFilters.length > 0) {
      const labels = activeFilters.map(f => STATUS_LABELS[f] || f).join(', ');
      parts.push(`Color: ${labels}`);
    }

    if (selectedMeasure !== 'All Measures') {
      parts.push(`Measure: ${selectedMeasure}`);
    }

    return parts.length > 0 ? parts.join(' | ') : undefined;
  }, [activeFilters, selectedMeasure]);

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
      // Only show full-screen loading spinner on initial load.
      // Subsequent re-fetches update data silently to preserve search/filter state.
      if (!hasLoadedOnce.current) {
        setLoading(true);
      }
      setError(null);
      const queryParams = getQueryParams();
      const response = await api.get(`/data${queryParams}`);
      console.log('Loaded data:', response.data);
      setRowData(response.data.data || []);
      hasLoadedOnce.current = true;
    } catch (err) {
      console.error('Failed to load data:', err);
      setError(getApiErrorMessage(err, 'Failed to load patient data. Please try again.'));
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

  // Handle row added (from remote create)
  const handleRowAdded = useCallback((newRow: GridRow) => {
    setRowData((prev) => {
      // Dedup: don't add if already exists
      if (prev.some(r => r.id === newRow.id)) return prev;
      return [newRow, ...prev];
    });
  }, []);

  // Handle row deleted (from remote or local delete)
  const handleRowDeleted = useCallback((id: number) => {
    setRowData((prev) => prev.filter((row) => row.id !== id));
    if (selectedRowId === id) {
      setSelectedRowId(null);
    }
  }, [selectedRowId]);

  // Task 51: Socket callbacks for remote operations
  const handleSocketRowUpdated = useCallback((row: GridRowPayload, changedBy: string) => {
    gridHandleRef.current?.handleRemoteRowUpdate(row, changedBy);
  }, []);

  const handleSocketRowCreated = useCallback((row: GridRowPayload) => {
    gridHandleRef.current?.handleRemoteRowCreate(row);
    // Also update React state
    handleRowAdded(row as unknown as GridRow);
  }, [handleRowAdded]);

  const handleSocketRowDeleted = useCallback((rowId: number, changedBy: string) => {
    gridHandleRef.current?.handleRemoteRowDelete(rowId, changedBy);
    // Also update React state
    handleRowDeleted(rowId);
  }, [handleRowDeleted]);

  const handleSocketDataRefresh = useCallback(() => {
    loadData();
  }, []);

  // Task 51: Integrate useSocket
  useSocket({
    onRowUpdated: handleSocketRowUpdated,
    onRowCreated: handleSocketRowCreated,
    onRowDeleted: handleSocketRowDeleted,
    onDataRefresh: handleSocketDataRefresh,
  });

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
      showToast(getApiErrorMessage(err, 'Failed to create row'), 'error');
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
      showToast(getApiErrorMessage(err, 'Failed to duplicate row'), 'error');
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
      showToast(getApiErrorMessage(err, 'Failed to delete row'), 'error');
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
      {/* Task 52: Import in-progress banner */}
      {importInProgress && (
        <div
          className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 flex items-center gap-2"
          data-testid="import-banner"
        >
          <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
          <span>
            A data import is in progress{importedBy ? ` (started by ${importedBy})` : ''}. You can continue working -- the grid will update automatically when complete.
          </span>
        </div>
      )}

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
        selectedMeasure={selectedMeasure}
        onMeasureChange={setSelectedMeasure}
        measureOptions={measureOptions}
      />

      <div className="flex-1 p-4">
        <PatientGrid
          ref={gridHandleRef}
          rowData={filteredRowData}
          onRowAdded={handleRowAdded}
          onRowDeleted={handleRowDeleted}
          onRowUpdated={handleRowUpdated}
          onSaveStatusChange={setSaveStatus}
          onRowSelected={handleRowSelected}
          showMemberInfo={showMemberInfo}
          newRowId={newRowId}
          onNewRowFocused={handleNewRowFocused}
          onDataRefresh={loadData}
        />
      </div>

      <StatusBar rowCount={filteredRowData.length} totalRowCount={rowData.length} filterSummary={filterSummary} />

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
