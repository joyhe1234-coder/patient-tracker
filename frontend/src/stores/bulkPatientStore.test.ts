import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBulkPatientStore } from './bulkPatientStore';
import type { BulkPatient } from '../types/bulkPatient';

// Mock axios
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const makePatient = (overrides: Partial<BulkPatient> = {}): BulkPatient => ({
  id: 1,
  memberName: 'Adams, John',
  memberDob: '1990-01-01',
  memberTelephone: null,
  ownerId: 10,
  ownerName: 'Dr. Smith',
  insuranceGroup: 'Blue Cross',
  measureCount: 3,
  latestMeasure: 'HgbA1c',
  latestStatus: 'Complete',
  updatedAt: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('bulkPatientStore', () => {
  beforeEach(() => {
    // Reset the store between tests
    useBulkPatientStore.setState({
      patients: [],
      summary: { totalPatients: 0, assignedCount: 0, unassignedCount: 0, insuranceSystemCount: 0 },
      physicians: [],
      filters: { physician: '', insurance: '', measure: '', search: '' },
      selectedIds: new Set<number>(),
      loading: false,
      operationLoading: false,
      error: null,
    });
  });

  describe('filteredPatients', () => {
    it('returns all patients when no filters are active', () => {
      const patients = [
        makePatient({ id: 1, memberName: 'Adams' }),
        makePatient({ id: 2, memberName: 'Baker' }),
      ];
      useBulkPatientStore.setState({ patients });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(2);
    });

    it('filters by physician name', () => {
      const patients = [
        makePatient({ id: 1, ownerName: 'Dr. Smith' }),
        makePatient({ id: 2, ownerName: 'Dr. Jones' }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: 'Dr. Smith', insurance: '', measure: '', search: '' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].ownerName).toBe('Dr. Smith');
    });

    it('filters by __unassigned__', () => {
      const patients = [
        makePatient({ id: 1, ownerId: 10, ownerName: 'Dr. Smith' }),
        makePatient({ id: 2, ownerId: null, ownerName: null }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: '__unassigned__', insurance: '', measure: '', search: '' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].ownerId).toBeNull();
    });

    it('filters by insurance', () => {
      const patients = [
        makePatient({ id: 1, insuranceGroup: 'Blue Cross' }),
        makePatient({ id: 2, insuranceGroup: 'Aetna' }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: '', insurance: 'Blue Cross', measure: '', search: '' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].insuranceGroup).toBe('Blue Cross');
    });

    it('filters by measure', () => {
      const patients = [
        makePatient({ id: 1, latestMeasure: 'HgbA1c' }),
        makePatient({ id: 2, latestMeasure: 'Depression' }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: '', insurance: '', measure: 'HgbA1c', search: '' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].latestMeasure).toBe('HgbA1c');
    });

    it('filters by search (case-insensitive)', () => {
      const patients = [
        makePatient({ id: 1, memberName: 'Adams, John' }),
        makePatient({ id: 2, memberName: 'Baker, Jane' }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: '', insurance: '', measure: '', search: 'adams' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].memberName).toBe('Adams, John');
    });

    it('applies AND conditions for multiple filters', () => {
      const patients = [
        makePatient({ id: 1, ownerName: 'Dr. Smith', insuranceGroup: 'Blue Cross' }),
        makePatient({ id: 2, ownerName: 'Dr. Smith', insuranceGroup: 'Aetna' }),
        makePatient({ id: 3, ownerName: 'Dr. Jones', insuranceGroup: 'Blue Cross' }),
      ];
      useBulkPatientStore.setState({
        patients,
        filters: { physician: 'Dr. Smith', insurance: 'Blue Cross', measure: '', search: '' },
      });

      const result = useBulkPatientStore.getState().filteredPatients();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('selection actions', () => {
    it('toggleSelection adds and removes IDs', () => {
      useBulkPatientStore.getState().toggleSelection(1);
      expect(useBulkPatientStore.getState().selectedIds.has(1)).toBe(true);

      useBulkPatientStore.getState().toggleSelection(1);
      expect(useBulkPatientStore.getState().selectedIds.has(1)).toBe(false);
    });

    it('selectAllFiltered selects all filtered patients', () => {
      const patients = [
        makePatient({ id: 1, memberName: 'Adams' }),
        makePatient({ id: 2, memberName: 'Baker' }),
        makePatient({ id: 3, memberName: 'Carter' }),
      ];
      useBulkPatientStore.setState({ patients });

      useBulkPatientStore.getState().selectAllFiltered();
      const selectedIds = useBulkPatientStore.getState().selectedIds;
      expect(selectedIds.size).toBe(3);
      expect(selectedIds.has(1)).toBe(true);
      expect(selectedIds.has(2)).toBe(true);
      expect(selectedIds.has(3)).toBe(true);
    });

    it('deselectAll clears selection', () => {
      useBulkPatientStore.setState({ selectedIds: new Set([1, 2, 3]) });
      useBulkPatientStore.getState().deselectAll();
      expect(useBulkPatientStore.getState().selectedIds.size).toBe(0);
    });

    it('setFilter clears selection', () => {
      useBulkPatientStore.setState({ selectedIds: new Set([1, 2]) });
      useBulkPatientStore.getState().setFilter('physician', 'Dr. Smith');
      expect(useBulkPatientStore.getState().selectedIds.size).toBe(0);
      expect(useBulkPatientStore.getState().filters.physician).toBe('Dr. Smith');
    });

    it('clearFilters resets filters and selection', () => {
      useBulkPatientStore.setState({
        filters: { physician: 'Dr. Smith', insurance: 'Blue Cross', measure: 'HgbA1c', search: 'test' },
        selectedIds: new Set([1, 2]),
      });
      useBulkPatientStore.getState().clearFilters();
      const state = useBulkPatientStore.getState();
      expect(state.filters.physician).toBe('');
      expect(state.filters.insurance).toBe('');
      expect(state.filters.measure).toBe('');
      expect(state.filters.search).toBe('');
      expect(state.selectedIds.size).toBe(0);
    });
  });

  describe('loading and error actions', () => {
    it('setOperationLoading updates operationLoading', () => {
      useBulkPatientStore.getState().setOperationLoading(true);
      expect(useBulkPatientStore.getState().operationLoading).toBe(true);

      useBulkPatientStore.getState().setOperationLoading(false);
      expect(useBulkPatientStore.getState().operationLoading).toBe(false);
    });

    it('setError updates error', () => {
      useBulkPatientStore.getState().setError('Something went wrong');
      expect(useBulkPatientStore.getState().error).toBe('Something went wrong');

      useBulkPatientStore.getState().setError(null);
      expect(useBulkPatientStore.getState().error).toBeNull();
    });
  });
});
