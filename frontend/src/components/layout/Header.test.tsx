import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

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

// Mock the axios API module (covers both static and dynamic imports)
const mockApi = {
  put: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
};

vi.mock('../../api/axios', () => ({
  api: mockApi,
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

  describe('ChangePasswordModal - validation, API, errors', () => {
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

      await user.click(screen.getByText('Test Admin'));
      await user.click(screen.getByText('Change Password'));
    }

    /** Helper to get the 3 password inputs in order: current, new, confirm */
    function getPasswordInputs(): HTMLInputElement[] {
      const form = document.querySelector('form');
      if (!form) throw new Error('Password form not found');
      return Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"], input[type="text"]'));
    }

    // --- Validation ---

    it('rejects empty fields with error message', async () => {
      await openPasswordModal();

      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('All fields are required')).toBeInTheDocument();
      expect(mockApi.put).not.toHaveBeenCalled();
    });

    it('rejects password shorter than 8 characters', async () => {
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'short');
      await user.type(inputs[2], 'short');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('New password must be at least 8 characters')).toBeInTheDocument();
      expect(mockApi.put).not.toHaveBeenCalled();
    });

    it('rejects mismatched passwords', async () => {
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'different1');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(mockApi.put).not.toHaveBeenCalled();
    });

    // --- API calls ---

    it('sends correct payload on valid submission', async () => {
      mockApi.put.mockResolvedValue({ data: { message: 'ok' } });
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith('/auth/password', {
          currentPassword: 'oldpass123',
          newPassword: 'newpass123',
        });
      });
    });

    it('shows success message after successful password change', async () => {
      mockApi.put.mockResolvedValue({ data: { message: 'ok' } });
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
      });
    });

    it('auto-closes modal 2 seconds after success', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const timerUser = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      mockApi.put.mockResolvedValue({ data: { message: 'ok' } });

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

      await timerUser.click(screen.getByText('Test Admin'));
      await timerUser.click(screen.getByText('Change Password'));

      const inputs = screen.getAllByDisplayValue('').filter(
        (el) => el.tagName === 'INPUT' && (el.getAttribute('type') === 'password' || el.getAttribute('type') === 'text')
      );

      await timerUser.type(inputs[0], 'oldpass123');
      await timerUser.type(inputs[1], 'newpass123');
      await timerUser.type(inputs[2], 'newpass123');
      await timerUser.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
      });

      // Advance 2 seconds for auto-close
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.queryByText('Password changed successfully!')).not.toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    // --- Error handling ---

    it('shows API error message from response', async () => {
      mockApi.put.mockRejectedValue({
        response: { data: { error: { message: 'Current password is incorrect' } } },
      });
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'wrongpass1');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
      });
    });

    it('shows fallback error on network failure', async () => {
      mockApi.put.mockRejectedValue(new Error('Network Error'));
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to change password')).toBeInTheDocument();
      });
    });

    it('displays error in red-styled container', async () => {
      mockApi.put.mockRejectedValue(new Error('Network Error'));
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        const errorDiv = screen.getByText('Failed to change password').closest('div');
        expect(errorDiv).toHaveClass('bg-red-50');
        expect(errorDiv).toHaveClass('text-red-700');
      });
    });

    // --- Loading state ---

    it('shows "Saving..." text during API call', async () => {
      let resolveApi!: (value: unknown) => void;
      mockApi.put.mockReturnValue(new Promise((resolve) => { resolveApi = resolve; }));
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      expect(screen.getByText('Saving...')).toBeInTheDocument();

      resolveApi({ data: { message: 'ok' } });
    });

    it('disables inputs and button during save', async () => {
      let resolveApi!: (value: unknown) => void;
      mockApi.put.mockReturnValue(new Promise((resolve) => { resolveApi = resolve; }));
      await openPasswordModal();
      const inputs = getPasswordInputs();

      await user.type(inputs[0], 'oldpass123');
      await user.type(inputs[1], 'newpass123');
      await user.type(inputs[2], 'newpass123');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // All 3 inputs should be disabled
      const disabledInputs = getPasswordInputs();
      for (const input of disabledInputs) {
        expect(input).toBeDisabled();
      }

      // Save button should show Saving... and be disabled
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByText('Saving...').closest('button')).toBeDisabled();

      resolveApi({ data: { message: 'ok' } });
    });

    // --- Visibility toggles ---

    it('toggles input type between password and text', async () => {
      await openPasswordModal();
      const inputs = getPasswordInputs();

      // All start as password
      expect(inputs[0]).toHaveAttribute('type', 'password');

      // Toggle current password visibility
      await user.click(screen.getByLabelText('Show current password'));

      expect(inputs[0]).toHaveAttribute('type', 'text');

      // Toggle back
      await user.click(screen.getByLabelText('Hide current password'));
      expect(inputs[0]).toHaveAttribute('type', 'password');
    });

    it('each visibility toggle works independently', async () => {
      await openPasswordModal();
      const inputs = getPasswordInputs();

      // Toggle only the new password field
      await user.click(screen.getByLabelText('Show new password'));

      expect(inputs[0]).toHaveAttribute('type', 'password');
      expect(inputs[1]).toHaveAttribute('type', 'text');
      expect(inputs[2]).toHaveAttribute('type', 'password');
    });

    // --- Cancel behavior ---

    it('cancel closes modal without API call', async () => {
      await openPasswordModal();

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Current Password')).not.toBeInTheDocument();
      expect(mockApi.put).not.toHaveBeenCalled();
    });

    it('reopening modal after close shows empty fields', async () => {
      await openPasswordModal();
      const inputs = getPasswordInputs();

      // Type into fields
      await user.type(inputs[0], 'oldpass123');

      // Close
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      // Reopen
      await user.click(screen.getByText('Test Admin'));
      await user.click(screen.getByText('Change Password'));

      // Fields should be empty (component remounts)
      const newInputs = getPasswordInputs();
      for (const input of newInputs) {
        expect(input).toHaveValue('');
      }
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

  // ── Unauthenticated state ────────────────────────────────────

  describe('Unauthenticated state', () => {
    it('shows Login link when not authenticated', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        isAuthenticated: false,
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

      expect(screen.getByText('Login')).toBeInTheDocument();
      // No nav links or user menu when unauthenticated
      expect(screen.queryByText('Patient Grid')).not.toBeInTheDocument();
      expect(screen.queryByText('Patient Mgmt')).not.toBeInTheDocument();
    });
  });

  // ── User menu behavior ───────────────────────────────────────

  describe('User menu behavior', () => {
    const adminUser = {
      id: 1,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['ADMIN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    it('clicking user button opens dropdown menu', async () => {
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

      await user.click(screen.getByText('Test Admin'));

      expect(screen.getByText('Change Password')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('clicking Logout calls logout() and navigates to /login', async () => {
      mockLogout.mockResolvedValue(undefined);
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

      await user.click(screen.getByText('Test Admin'));
      await user.click(screen.getByText('Logout'));

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  // ── Navigation active styling ────────────────────────────────

  describe('Navigation active styling', () => {
    const adminUser = {
      id: 1,
      email: 'admin@test.com',
      displayName: 'Test Admin',
      roles: ['ADMIN'] as const,
      isActive: true,
      lastLoginAt: null,
    };

    function renderOnPath(path: string) {
      mockUseAuthStore.mockReturnValue({
        user: adminUser,
        isAuthenticated: true,
        logout: mockLogout,
        assignments: [{ physicianId: 10, physicianName: 'Dr. Smith' }],
        selectedPhysicianId: 10,
        setSelectedPhysicianId: mockSetSelectedPhysicianId,
      });

      return render(
        <MemoryRouter initialEntries={[path]}>
          <Header />
        </MemoryRouter>
      );
    }

    it('Patient Grid link active on /', () => {
      renderOnPath('/');
      const link = screen.getByText('Patient Grid');
      expect(link).toHaveClass('text-blue-600');
    });

    it('Patient Mgmt link active on /patient-management', () => {
      renderOnPath('/patient-management');
      const link = screen.getByText('Patient Mgmt');
      expect(link).toHaveClass('text-blue-600');
    });

    it('Admin link active on /admin', () => {
      renderOnPath('/admin');
      const link = screen.getByText('Admin');
      expect(link).toHaveClass('text-blue-600');
    });
  });

  // ── Provider dropdown edge cases ─────────────────────────────

  describe('Provider dropdown edge cases', () => {
    it('dropdown hidden when assignments array is empty for STAFF', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 2,
          email: 'staff@test.com',
          displayName: 'Test Staff',
          roles: ['STAFF'] as const,
          isActive: true,
          lastLoginAt: null,
        },
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

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('STAFF dropdown aria-label is "Select physician"', () => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: 2,
          email: 'staff@test.com',
          displayName: 'Test Staff',
          roles: ['STAFF'] as const,
          isActive: true,
          lastLoginAt: null,
        },
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

      expect(screen.getByLabelText('Select physician')).toBeInTheDocument();
    });
  });

  // ── App title visibility ─────────────────────────────────────

  it('app title always shown regardless of auth state', () => {
    mockUseAuthStore.mockReturnValue({
      user: null,
      isAuthenticated: false,
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

    expect(screen.getByText('Patient Quality Measure Tracker')).toBeInTheDocument();
  });
});
