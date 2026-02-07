import { render, screen, fireEvent } from '@testing-library/react';
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

    it('should call setSelectedPhysicianId with null when selecting "Unassigned patients"', () => {
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
      fireEvent.change(dropdown, { target: { value: 'unassigned' } });

      expect(mockSetSelectedPhysicianId).toHaveBeenCalledWith(null);
    });

    it('should call setSelectedPhysicianId with number when selecting a physician', () => {
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
      fireEvent.change(dropdown, { target: { value: '10' } });

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

    function openPasswordModal() {
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
      fireEvent.click(screen.getByText('Test Admin'));
      // Click Change Password
      fireEvent.click(screen.getByText('Change Password'));
    }

    it('opens password modal and shows all 3 fields', () => {
      openPasswordModal();

      expect(screen.getByText('Current Password')).toBeInTheDocument();
      expect(screen.getByText('New Password')).toBeInTheDocument();
      expect(screen.getByText('Confirm New Password')).toBeInTheDocument();
    });

    it('shows "Must be at least 8 characters" helper text', () => {
      openPasswordModal();

      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });

    it('has password visibility toggle buttons with aria-labels', () => {
      openPasswordModal();

      expect(screen.getByLabelText('Show current password')).toBeInTheDocument();
      expect(screen.getByLabelText('Show new password')).toBeInTheDocument();
      expect(screen.getByLabelText('Show confirm password')).toBeInTheDocument();
    });

    it('toggles password visibility when eye icon is clicked', () => {
      openPasswordModal();

      // All fields start as password type
      const inputs = screen.getAllByDisplayValue('');
      const passwordInputs = inputs.filter(
        (input) => input.getAttribute('type') === 'password' || input.getAttribute('type') === 'text'
      );
      expect(passwordInputs.length).toBe(3);

      // Click the "Show current password" toggle
      fireEvent.click(screen.getByLabelText('Show current password'));

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
});
