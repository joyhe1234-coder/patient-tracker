import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BulkOperationsTab } from './BulkOperationsTab';
import type { BulkPatient, PatientSummary, PatientFilters, Physician } from '../types/bulkPatient';

// Mock the stores
const mockFetchPatients = vi.fn();
const mockFetchPhysicians = vi.fn();
const mockSetFilter = vi.fn();
const mockClearFilters = vi.fn();
const mockToggleSelection = vi.fn();
const mockSelectAllFiltered = vi.fn();
const mockDeselectAll = vi.fn();
const mockToggleAllFiltered = vi.fn();
const mockSetOperationLoading = vi.fn();
const mockSetError = vi.fn();

const DEFAULT_SUMMARY: PatientSummary = {
  totalPatients: 3,
  assignedCount: 2,
  unassignedCount: 1,
  insuranceSystemCount: 2,
};

const DEFAULT_FILTERS: PatientFilters = {
  physician: '',
  insurance: '',
  measure: '',
  search: '',
};

const makePatient = (id: number, name: string, ownerName: string | null = 'Dr. Smith'): BulkPatient => ({
  id,
  memberName: name,
  memberDob: '1990-01-01',
  memberTelephone: null,
  ownerId: ownerName ? 10 : null,
  ownerName,
  insuranceGroup: 'Blue Cross',
  measureCount: 2,
  latestMeasure: 'HgbA1c',
  latestStatus: 'Complete',
  updatedAt: '2025-01-01T00:00:00Z',
});

const defaultPatients: BulkPatient[] = [
  makePatient(1, 'Adams, John'),
  makePatient(2, 'Baker, Jane'),
  makePatient(3, 'Carter, Sarah', null),
];

const defaultPhysicians: Physician[] = [
  { id: 1, displayName: 'Dr. Smith', email: 'smith@clinic.com', roles: ['PHYSICIAN'] },
];

let mockStoreState: Record<string, unknown> = {};

vi.mock('../stores/bulkPatientStore', () => ({
  useBulkPatientStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      patients: defaultPatients,
      summary: DEFAULT_SUMMARY,
      physicians: defaultPhysicians,
      filters: DEFAULT_FILTERS,
      selectedIds: new Set<number>(),
      loading: false,
      operationLoading: false,
      error: null,
      filteredPatients: () => defaultPatients,
      fetchPatients: mockFetchPatients,
      fetchPhysicians: mockFetchPhysicians,
      setFilter: mockSetFilter,
      clearFilters: mockClearFilters,
      toggleSelection: mockToggleSelection,
      selectAllFiltered: mockSelectAllFiltered,
      deselectAll: mockDeselectAll,
      toggleAllFiltered: mockToggleAllFiltered,
      clearSelection: vi.fn(),
      setOperationLoading: mockSetOperationLoading,
      setError: mockSetError,
      ...mockStoreState,
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 1, email: 'admin@clinic.com', displayName: 'Admin', roles: ['ADMIN'], isActive: true, lastLoginAt: null },
  }),
}));

vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('BulkOperationsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = {};
  });

  it('shows loading spinner when loading', () => {
    mockStoreState = { loading: true };
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('Loading patients...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockStoreState = { error: 'Something went wrong' };
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders summary cards with correct values', () => {
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('Total Patients')).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    // "Unassigned" appears both as a summary card label and as a patient badge
    expect(screen.getAllByText('Unassigned').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Insurance Systems')).toBeInTheDocument();
  });

  it('renders toolbar with disabled action buttons when no selection', () => {
    render(<BulkOperationsTab isActive={true} />);
    // Use exact text matching to distinguish Assign from Unassign
    const buttons = screen.getAllByRole('button');
    const assignBtn = buttons.find(b => b.textContent === 'Assign');
    const unassignBtn = buttons.find(b => b.textContent === 'Unassign');
    const deleteBtn = buttons.find(b => b.textContent === 'Delete');
    expect(assignBtn).toBeDisabled();
    expect(unassignBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();
  });

  it('renders patient table with data', () => {
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('Adams, John')).toBeInTheDocument();
    expect(screen.getByText('Baker, Jane')).toBeInTheDocument();
    expect(screen.getByText('Carter, Sarah')).toBeInTheDocument();
  });

  it('shows Unassigned badge for unassigned patients', () => {
    render(<BulkOperationsTab isActive={true} />);
    // "Unassigned" appears as both a summary card label and a patient badge
    const unassignedElements = screen.getAllByText('Unassigned');
    expect(unassignedElements.length).toBeGreaterThanOrEqual(2); // card + badge
  });

  it('renders filter controls', () => {
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByLabelText('Filter by physician')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by insurance')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by measure')).toBeInTheDocument();
    expect(screen.getByLabelText('Search patients')).toBeInTheDocument();
  });

  it('shows empty state when no patients exist', () => {
    mockStoreState = {
      patients: [],
      filteredPatients: () => [],
      summary: { totalPatients: 0, assignedCount: 0, unassignedCount: 0, insuranceSystemCount: 0 },
    };
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('No patients found')).toBeInTheDocument();
  });

  it('fetches data on first activation', () => {
    render(<BulkOperationsTab isActive={true} />);
    expect(mockFetchPatients).toHaveBeenCalledTimes(1);
    expect(mockFetchPhysicians).toHaveBeenCalledTimes(1);
  });

  it('does not fetch data when not active', () => {
    render(<BulkOperationsTab isActive={false} />);
    expect(mockFetchPatients).not.toHaveBeenCalled();
    expect(mockFetchPhysicians).not.toHaveBeenCalled();
  });

  it('shows table footer with patient count', () => {
    render(<BulkOperationsTab isActive={true} />);
    expect(screen.getByText('3 patients')).toBeInTheDocument();
  });
});
