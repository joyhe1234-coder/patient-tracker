/**
 * PatientAssignmentPage Tests
 *
 * Tests for the patient assignment page: rendering, patient selection,
 * select-all/deselect, physician dropdown, bulk assignment, and states.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock API
const mockGet = vi.fn();
const mockPatch = vi.fn();

vi.mock('../api/axios', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

import PatientAssignmentPage, { ReassignTabContent } from './PatientAssignmentPage';

const mockPatients = [
  {
    id: 1,
    memberName: 'John Doe',
    memberDob: '1980-01-15',
    memberTelephone: '555-1234',
    measureCount: 3,
  },
  {
    id: 2,
    memberName: 'Jane Smith',
    memberDob: '1975-08-20',
    memberTelephone: null,
    measureCount: 1,
  },
  {
    id: 3,
    memberName: 'Bob Wilson',
    memberDob: '1990-03-10',
    memberTelephone: '555-5678',
    measureCount: 5,
  },
];

const mockPhysicians = [
  { id: 10, displayName: 'Dr. Adams', email: 'adams@test.com', role: 'PHYSICIAN' },
  { id: 20, displayName: 'Dr. Baker', email: 'baker@test.com', role: 'PHYSICIAN' },
];

function renderReassignTab(isActive = true) {
  return render(
    <MemoryRouter>
      <ReassignTabContent isActive={isActive} />
    </MemoryRouter>
  );
}

function renderFullPage() {
  return render(
    <MemoryRouter>
      <PatientAssignmentPage />
    </MemoryRouter>
  );
}

describe('PatientAssignmentPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url === '/admin/patients/unassigned') {
        return Promise.resolve({ data: { success: true, data: mockPatients } });
      }
      if (url === '/users/physicians') {
        return Promise.resolve({ data: { success: true, data: mockPhysicians } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  // ── Full page wrapper ─────────────────────────────────────────

  describe('PatientAssignmentPage wrapper', () => {
    it('renders page title and subtitle', async () => {
      renderFullPage();
      await waitFor(() => {
        expect(screen.getByText('Patient Assignment')).toBeInTheDocument();
        expect(screen.getByText('Assign unassigned patients to physicians')).toBeInTheDocument();
      });
    });

    it('renders back to admin link', async () => {
      renderFullPage();
      await waitFor(() => {
        expect(screen.getByText(/Back to Admin/)).toBeInTheDocument();
      });
    });
  });

  // ── ReassignTabContent ────────────────────────────────────────

  describe('ReassignTabContent', () => {
    it('does not load data when tab is not active', () => {
      renderReassignTab(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('loads data on first activation', async () => {
      renderReassignTab(true);
      await waitFor(() => {
        expect(mockGet).toHaveBeenCalledWith('/admin/patients/unassigned');
        expect(mockGet).toHaveBeenCalledWith('/users/physicians');
      });
    });

    it('renders patient list with names', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('shows patient DOB and phone', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('1980-01-15')).toBeInTheDocument();
        expect(screen.getByText('555-1234')).toBeInTheDocument();
        expect(screen.getByText('-')).toBeInTheDocument(); // null phone
      });
    });

    it('shows measure count for each patient', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('3 measures')).toBeInTheDocument();
        expect(screen.getByText('1 measure')).toBeInTheDocument(); // singular
        expect(screen.getByText('5 measures')).toBeInTheDocument();
      });
    });

    it('shows "0 of N selected" initially', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
      });
    });

    it('selects a patient on checkbox click', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      // First checkbox is the header select-all, then one per patient
      await user.click(checkboxes[1]); // First patient checkbox

      expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();
    });

    it('select all toggles all patients', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click Select All button
      await user.click(screen.getByText('Select All'));
      expect(screen.getByText('3 of 3 selected')).toBeInTheDocument();

      // Click Deselect All
      await user.click(screen.getByText('Deselect All'));
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });

    it('renders physician dropdown', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('-- Select Physician --')).toBeInTheDocument();
        expect(screen.getByText('Dr. Adams')).toBeInTheDocument();
        expect(screen.getByText('Dr. Baker')).toBeInTheDocument();
      });
    });

    it('Assign button is disabled when no patients selected', async () => {
      renderReassignTab();
      await waitFor(() => {
        const assignButton = screen.getByText('Assign Selected');
        expect(assignButton.closest('button')).toBeDisabled();
      });
    });

    it('Assign button is disabled when no physician selected', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select a patient
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Still disabled because no physician selected
      const assignButton = screen.getByText('Assign Selected');
      expect(assignButton.closest('button')).toBeDisabled();
    });

    it('performs bulk assignment on button click', async () => {
      mockPatch.mockResolvedValue({
        data: { success: true, message: 'Assigned 2 patients to Dr. Adams' },
      });

      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Select patients
      await user.click(screen.getByText('Select All'));

      // Select physician
      const select = screen.getByDisplayValue('-- Select Physician --');
      await user.selectOptions(select, '10');

      // Click assign
      const assignButton = screen.getByText('Assign Selected');
      await user.click(assignButton);

      await waitFor(() => {
        expect(mockPatch).toHaveBeenCalledWith('/admin/patients/bulk-assign', {
          patientIds: [1, 2, 3],
          ownerId: 10,
        });
      });
    });

    it('shows success message after assignment', async () => {
      mockPatch.mockResolvedValue({
        data: { success: true, message: 'Assigned 3 patients to Dr. Adams' },
      });

      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select All'));
      const select = screen.getByDisplayValue('-- Select Physician --');
      await user.selectOptions(select, '10');
      await user.click(screen.getByText('Assign Selected'));

      await waitFor(() => {
        expect(screen.getByText('Assigned 3 patients to Dr. Adams')).toBeInTheDocument();
      });
    });

    it('shows error when assignment fails', async () => {
      mockPatch.mockRejectedValue({
        response: { data: { error: { message: 'Assignment failed' } } },
      });

      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Select All'));
      const select = screen.getByDisplayValue('-- Select Physician --');
      await user.selectOptions(select, '10');
      await user.click(screen.getByText('Assign Selected'));

      await waitFor(() => {
        expect(screen.getByText('Assignment failed')).toBeInTheDocument();
      });
    });

    it('shows "All Patients Assigned" when list is empty', async () => {
      mockGet.mockImplementation((url: string) => {
        if (url === '/admin/patients/unassigned') {
          return Promise.resolve({ data: { success: true, data: [] } });
        }
        if (url === '/users/physicians') {
          return Promise.resolve({ data: { success: true, data: mockPhysicians } });
        }
        return Promise.resolve({ data: { success: true, data: [] } });
      });

      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('All Patients Assigned')).toBeInTheDocument();
        expect(screen.getByText('There are no unassigned patients at this time.')).toBeInTheDocument();
      });
    });

    it('shows error when data loading fails', async () => {
      mockGet.mockRejectedValue({
        response: { data: { error: { message: 'Server error' } } },
      });

      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('toggles patient selection on row click', async () => {
      renderReassignTab();
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      // Click the row itself (not the checkbox)
      await user.click(screen.getByText('John Doe'));
      expect(screen.getByText('1 of 3 selected')).toBeInTheDocument();

      // Click again to deselect
      await user.click(screen.getByText('John Doe'));
      expect(screen.getByText('0 of 3 selected')).toBeInTheDocument();
    });
  });
});
