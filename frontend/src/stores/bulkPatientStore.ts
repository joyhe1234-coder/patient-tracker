// Bulk Patient Management store — Zustand (no persist needed)
// Holds patient data, filters, selection, and loading state for the Bulk Operations tab.

import { create } from 'zustand';
import { api } from '../api/axios';
import type { BulkPatient, PatientSummary, PatientFilters, Physician } from '../types/bulkPatient';

const DEFAULT_FILTERS: PatientFilters = {
  physician: '',
  insurance: '',
  measure: '',
  search: '',
};

const DEFAULT_SUMMARY: PatientSummary = {
  totalPatients: 0,
  assignedCount: 0,
  unassignedCount: 0,
  insuranceSystemCount: 0,
};

interface BulkPatientState {
  // Data
  patients: BulkPatient[];
  summary: PatientSummary;
  physicians: Physician[];

  // Filters
  filters: PatientFilters;

  // Selection
  selectedIds: Set<number>;

  // Loading
  loading: boolean;
  operationLoading: boolean;
  error: string | null;

  // Computed
  filteredPatients: () => BulkPatient[];

  // Actions
  fetchPatients: () => Promise<void>;
  fetchPhysicians: () => Promise<void>;
  setFilter: (key: keyof PatientFilters, value: string) => void;
  clearFilters: () => void;
  toggleSelection: (id: number) => void;
  selectAllFiltered: () => void;
  deselectAll: () => void;
  toggleAllFiltered: () => void;
  clearSelection: () => void;
  setOperationLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useBulkPatientStore = create<BulkPatientState>()((set, get) => ({
  // Initial state
  patients: [],
  summary: DEFAULT_SUMMARY,
  physicians: [],
  filters: { ...DEFAULT_FILTERS },
  selectedIds: new Set<number>(),
  loading: false,
  operationLoading: false,
  error: null,

  // Computed: filter patients client-side (AND conditions)
  filteredPatients: () => {
    const { patients, filters } = get();
    return patients.filter(p => {
      // Physician filter
      if (filters.physician === '__unassigned__' && p.ownerId !== null) return false;
      if (filters.physician && filters.physician !== '__unassigned__' && p.ownerName !== filters.physician) return false;

      // Insurance filter
      if (filters.insurance && p.insuranceGroup !== filters.insurance) return false;

      // Measure filter
      if (filters.measure && p.latestMeasure !== filters.measure) return false;

      // Text search (case-insensitive substring on memberName)
      if (filters.search && !p.memberName.toLowerCase().includes(filters.search.toLowerCase())) return false;

      return true;
    });
  },

  // Actions
  fetchPatients: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/admin/patients');
      const { patients, summary } = response.data.data;
      set({ patients, summary, loading: false, selectedIds: new Set<number>() });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const message = error.response?.data?.error?.message || error.message || 'Failed to fetch patients';
      set({ error: message, loading: false });
    }
  },

  fetchPhysicians: async () => {
    try {
      const response = await api.get('/admin/physicians');
      const physicians = response.data.data
        .filter((u: { roles: string[] }) => u.roles.includes('PHYSICIAN'))
        .map((u: { id: number; displayName: string; email: string; roles: string[] }) => ({
          id: u.id,
          displayName: u.displayName,
          email: u.email,
          roles: u.roles,
        }));
      set({ physicians });
    } catch {
      // Non-critical — fail silently; physician dropdown will be empty
    }
  },

  setFilter: (key: keyof PatientFilters, value: string) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
      selectedIds: new Set<number>(), // Clear selection on filter change
    }));
  },

  clearFilters: () => {
    set({
      filters: { ...DEFAULT_FILTERS },
      selectedIds: new Set<number>(),
    });
  },

  toggleSelection: (id: number) => {
    set(state => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    });
  },

  selectAllFiltered: () => {
    const filtered = get().filteredPatients();
    set({ selectedIds: new Set(filtered.map(p => p.id)) });
  },

  deselectAll: () => {
    set({ selectedIds: new Set<number>() });
  },

  toggleAllFiltered: () => {
    const filtered = get().filteredPatients();
    const { selectedIds } = get();
    const allSelected = filtered.every(p => selectedIds.has(p.id));
    if (allSelected) {
      // Deselect all filtered
      const next = new Set(selectedIds);
      filtered.forEach(p => next.delete(p.id));
      set({ selectedIds: next });
    } else {
      // Select all filtered
      const next = new Set(selectedIds);
      filtered.forEach(p => next.add(p.id));
      set({ selectedIds: next });
    }
  },

  clearSelection: () => {
    set({ selectedIds: new Set<number>() });
  },

  setOperationLoading: (loading: boolean) => {
    set({ operationLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
