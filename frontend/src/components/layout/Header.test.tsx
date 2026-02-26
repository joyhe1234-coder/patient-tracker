import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';

// Mock the auth store
const mockLogout = vi.fn();
const mockSetSelectedPhysicianId = vi.fn();

vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    logout: mockLogout,
    assignments: [],
    selectedPhysicianId: null,
    setSelectedPhysicianId: mockSetSelectedPhysicianId,
  })),
}));

// Import the mocked module to control return values
import { useAuthStore } from '../../stores/authStore';
const mockUseAuthStore = vi.mocked(useAuthStore);

describe('Header', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Dropdown Visibility', () => {
    const adminUser = {
      id: 1,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['ADMIN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const staffUser = {
      id: 2,
      email: 'staff@test.com',
      displayName: 'Test Staff',
      roles: ['STAFF'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const physicianUser = {
      id: 3,
      email: 'physician@test.com',
      displayName: 'Dr. Test',
      roles: ['PHYSICIAN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const mockAssignments = [
      { physicianId: 10, physicianName: 'Dr. Smith' },
      { physicianId: 20, physicianName: 'Dr. Jones' },
    ];

    it('should show provider dropdown for ADMIN on Patient Grid page', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByText('Viewing provider:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should NOT show provider dropdown for ADMIN on Import page', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/patient-management']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.queryByText('Viewing provider:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should NOT show provider dropdown for ADMIN on Admin page', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.queryByText('Viewing provider:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should show provider dropdown for STAFF on Patient Grid page', () => {
      mockUseAuthStore.mockReturnValue({
        user: staffUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByText('Viewing as:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should NOT show provider dropdown for PHYSICIAN user', () => {
      mockUseAuthStore.mockReturnValue({
        user: physicianUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [],
        selectedPhysicianId: 3,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.queryByText('Viewing provider:')).not.toBeInTheDocument();
      expect(screen.queryByText('Viewing as:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('Unassigned Patients Option', () => {
    const adminUser = {
      id: 1,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['ADMIN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const staffUser = {
      id: 2,
      email: 'staff@test.com',
      displayName: 'Test Staff',
      roles: ['STAFF'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const mockAssignments = [
      { physicianId: 10, physicianName: 'Dr. Smith' },
    ];

    it('should show "Unassigned patients" option for ADMIN users', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();

      // Check for unassigned option
      const unassignedOption = screen.getByRole('option', { name: 'Unassigned patients' });
      expect(unassignedOption).toBeInTheDocument();
    });

    it('should NOT show "Unassigned patients" option for STAFF users', () => {
      mockUseAuthStore.mockReturnValue({
        user: staffUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      const dropdown = screen.getByRole('combobox');
      expect(dropdown).toBeInTheDocument();

      // Check that unassigned option is NOT present
      expect(screen.queryByRole('option', { name: 'Unassigned patients' })).not.toBeInTheDocument();
    });

    it('should select "unassigned" value when selectedPhysicianId is null', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: null,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      const dropdown = screen.getByRole('combobox') as HTMLSelectElement;
      expect(dropdown.value).toBe('unassigned');
    });

    it('should call setSelectedPhysicianId with null when selecting "Unassigned patients"', async () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      const dropdown = screen.getByRole('combobox');
      await user.selectOptions(dropdown, 'unassigned');

      expect(mockSetSelectedPhysicianId).toHaveBeenCalledWith(null);
    });

    it('should call setSelectedPhysicianId with number when selecting a physician', async () => {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: null,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      const dropdown = screen.getByRole('combobox');
      await user.selectOptions(dropdown, '10');

      expect(mockSetSelectedPhysicianId).toHaveBeenCalledWith(10);
    });
  });

  describe('Change Password Modal', () => {
    const adminUser = {
      id: 1,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['ADMIN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    async function openPasswordModal() {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [],
        selectedPhysicianId: null,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      // Open user menu
      await user.click(screen.getByText('Test Admin'));
      // Click Change Password
      await user.click(screen.getByText('Change Password'));
    }

    it('opens password modal and shows all 3 fields', async () => {
      await openPasswordModal();

      expect(screen.getByText('Current Password')).toBeInTheDocument();
      expect(screen.getByText('New Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    });

    it('shows "Must be at least 8 characters" helper text', async () => {
      await openPasswordModal();

      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('has password visibility toggle buttons with aria-labels', async () => {
      await openPasswordModal();

      expect(screen.getByLabelText('Show current password')).toBeInTheDocument();
      expect(screen.getByLabelText('Show new password')).toBeInTheDocument();
      expect(screen.getByLabelText('Show confirm password')).toBeInTheDocument();
    });

    it('toggles password visibility when eye icon is clicked', async () => {
      await openPasswordModal();

      // All fields start as password type
      const inputs = screen.getAllByDisplayValue('');
      const passwordInputs = inputs.filter(
        (input) => input.getAttribute('type') === 'password' || input.getAttribute('type') === 'text'
      );
      expect(passwordInputs.length).toBe(3);

      // Click the "Show current password" toggle
      await user.click(screen.getByLabelText('Show current password'));

      // After click, aria-label should change to "Hide"
      expect(screen.getByLabelText('Hide current password')).toBeInTheDocument();
    });
  });

  describe('Role Display', () => {
    it('should show "ADMIN + PHYSICIAN" for user with both roles', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@test.com',
          displayName: 'Admin Doc',
          roles: ['ADMIN', 'PHYSICIAN'] as const,
          isActive: true,
          lastLoginAt: null,
        },
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [],
        selectedPhysicianId: 1,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByText('(ADMIN + PHYSICIAN)')).toBeInTheDocument();
    });

    it('should show just "ADMIN" for user with only ADMIN role', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 1,
          email: 'admin@test.com',
          displayName: 'Test Admin',
          roles: ['ADMIN'] as const,
          isActive: true,
          lastLoginAt: null,
        },
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [{ physicianId: 10, physicianName: 'Dr. Test' }],
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByText('(ADMIN)')).toBeInTheDocument();
    });
  });

  describe('ADMIN+PHYSICIAN Dual Role Behavior', () => {
    const adminPhyUser = {
      id: 4,
      email: 'adminphy@test.com',
      displayName: 'Admin Doctor',
      roles: ['ADMIN', 'PHYSICIAN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    const mockAssignments = [
      { physicianId: 10, physicianName: 'Dr. Smith' },
      { physicianId: 20, physicianName: 'Dr. Jones' },
    ];

    it('should show provider dropdown on Patient Grid (ADMIN behavior)', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminPhyUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      // ADMIN+PHYSICIAN gets ADMIN behavior: "Viewing provider:" label and dropdown
      expect(screen.getByText('Viewing provider:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should show "Unassigned patients" option (ADMIN behavior)', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminPhyUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByRole('option', { name: 'Unassigned patients' })).toBeInTheDocument();
    });

    it('should show Admin link in navigation', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminPhyUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('should NOT show dropdown on non-grid pages', () => {
      mockUseAuthStore.mockReturnValue({
        user: adminPhyUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: mockAssignments,
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/patient-management']}>
          <Header />
        </MemoryRouter>
      );

      expect(screen.queryByText('Viewing provider:')).not.toBeInTheDocument();
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Visibility by Role', () => {
    const roles = {
      admin: {
        user: { id: 1, email: 'admin@test.com', displayName: 'Admin', roles: ['ADMIN'] as const, isActive: true, lastLoginAt: null },
        expectAdmin: true,
      },
      physician: {
        user: { id: 2, email: 'phy@test.com', displayName: 'Doctor', roles: ['PHYSICIAN'] as const, isActive: true, lastLoginAt: null },
        expectAdmin: false,
      },
      staff: {
        user: { id: 3, email: 'staff@test.com', displayName: 'Staff', roles: ['STAFF'] as const, isActive: true, lastLoginAt: null },
        expectAdmin: false,
      },
      adminPhysician: {
        user: { id: 4, email: 'adminphy@test.com', displayName: 'Admin Doc', roles: ['ADMIN', 'PHYSICIAN'] as const, isActive: true, lastLoginAt: null },
        expectAdmin: true,
      },
    };

    it.each([
      ['ADMIN', roles.admin],
      ['PHYSICIAN', roles.physician],
      ['STAFF', roles.staff],
      ['ADMIN+PHYSICIAN', roles.adminPhysician],
    ])('%s: Admin link visible=%s', (roleName, { user, expectAdmin }) => {
      mockUseAuthStore.mockReturnValue({
        user,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [{ physicianId: 10, physicianName: 'Dr. Smith' }],
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      render(
        <MemoryRouter initialEntries={['/']}>
          <Header />
        </MemoryRouter>
      );

      if (expectAdmin) {
        expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
      }
    });

    it('all roles see Patient Management link', () => {
      for (const { user } of Object.values(roles)) {
        vi.clearAllMocks();
        mockUseAuthStore.mockReturnValue({
          user,
          isAuthenticated: true,
          logout: mockLogout,
          assignments: [{ physicianId: 10, physicianName: 'Dr. Smith' }],
          selectedPhysicianId: 10,
          setSelectedPhysicianId: mockSetSelectedPhysicianId,
        });

        const { unmount } = render(
          <MemoryRouter initialEntries={['/']}>
            <Header />
          </MemoryRouter>
        );

        expect(screen.getByText('Patient Mgmt')).toBeInTheDocument();
        unmount();
      }
    });
  });
});
