import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModal from './UserModal';
import type { AdminUser, Physician } from './UserModal';

// Mock the API module
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../utils/apiError', () => ({
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

import { api } from '../../api/axios';

const mockPhysicians: Physician[] = [
  { id: 1, displayName: 'Dr. Smith' },
  { id: 2, displayName: 'Dr. Jones' },
];

const mockUser: AdminUser = {
  id: 10,
  email: 'doc@clinic.com',
  displayName: 'Dr. Brown',
  roles: ['PHYSICIAN'],
  isActive: true,
  lastLoginAt: '2026-02-01T00:00:00Z',
  patientCount: 5,
  assignedPhysicians: [],
  assignedStaff: [],
};

describe('UserModal', () => {
  const defaultCreateProps = {
    user: null,
    physicians: mockPhysicians,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  const defaultEditProps = {
    user: mockUser,
    physicians: mockPhysicians,
    onClose: vi.fn(),
    onSaved: vi.fn(),
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create mode', () => {
    it('renders Add User title', () => {
      render(<UserModal {...defaultCreateProps} />);

      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    it('shows password field for new users', () => {
      render(<UserModal {...defaultCreateProps} />);

      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('calls API to create user on submit', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { data: { id: 99 } },
      });

      render(<UserModal {...defaultCreateProps} />);

      await user.type(screen.getByLabelText('Email'), 'new@clinic.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.clear(screen.getByLabelText('Display Name'));
      await user.type(screen.getByLabelText('Display Name'), 'New Doctor');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/admin/users', {
          email: 'new@clinic.com',
          password: 'password123',
          displayName: 'New Doctor',
          roles: ['PHYSICIAN'],
        });
      });
      expect(defaultCreateProps.onSaved).toHaveBeenCalled();
    });

    it('does not submit when password is empty for new user', async () => {
      render(<UserModal {...defaultCreateProps} />);

      await user.type(screen.getByLabelText('Email'), 'new@clinic.com');
      await user.clear(screen.getByLabelText('Display Name'));
      await user.type(screen.getByLabelText('Display Name'), 'New Doctor');
      // Don't fill password — the HTML5 required attribute prevents submission
      await user.click(screen.getByRole('button', { name: 'Save' }));

      // Form should not submit since the required password field is empty
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Edit mode', () => {
    it('renders Edit User title', () => {
      render(<UserModal {...defaultEditProps} />);

      expect(screen.getByText('Edit User')).toBeInTheDocument();
    });

    it('does not show password field for existing users', () => {
      render(<UserModal {...defaultEditProps} />);

      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
    });

    it('pre-fills form with existing user data', () => {
      render(<UserModal {...defaultEditProps} />);

      expect(screen.getByLabelText('Email')).toHaveValue('doc@clinic.com');
      expect(screen.getByLabelText('Display Name')).toHaveValue('Dr. Brown');
    });

    it('shows Active checkbox for existing users', () => {
      render(<UserModal {...defaultEditProps} />);

      expect(screen.getByLabelText('Active')).toBeInTheDocument();
      expect(screen.getByLabelText('Active')).toBeChecked();
    });

    it('calls API to update user on submit', async () => {
      (api.put as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

      render(<UserModal {...defaultEditProps} />);

      const displayNameInput = screen.getByLabelText('Display Name');
      await user.clear(displayNameInput);
      await user.type(displayNameInput, 'Dr. Brown Updated');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/admin/users/10', expect.objectContaining({
          displayName: 'Dr. Brown Updated',
          roles: ['PHYSICIAN'],
        }));
      });
      expect(defaultEditProps.onSaved).toHaveBeenCalled();
    });
  });

  describe('Role selection', () => {
    it('shows physician assignment list when Staff role is selected', async () => {
      render(<UserModal {...defaultCreateProps} />);

      // Default is PHYSICIAN — no assignment list
      expect(screen.queryByText('Assigned Physicians')).not.toBeInTheDocument();

      // Select Staff role
      await user.click(screen.getByLabelText('Staff'));

      expect(screen.getByText('Assigned Physicians')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Dr. Jones')).toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows error message on API failure', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Server error'));

      render(<UserModal {...defaultCreateProps} />);

      await user.type(screen.getByLabelText('Email'), 'new@clinic.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.clear(screen.getByLabelText('Display Name'));
      await user.type(screen.getByLabelText('Display Name'), 'Test');
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to save user')).toBeInTheDocument();
      });
    });
  });

  describe('Cancel', () => {
    it('calls onClose when Cancel is clicked', async () => {
      render(<UserModal {...defaultCreateProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(defaultCreateProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
