import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ResetPasswordModal from './ResetPasswordModal';

// Mock the API module
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock the apiError utility
vi.mock('../../utils/apiError', () => ({
  getApiErrorMessage: vi.fn((_err: unknown, fallback: string) => fallback),
}));

import { api } from '../../api/axios';
import { getApiErrorMessage } from '../../utils/apiError';

describe('ResetPasswordModal', () => {
  const defaultProps = {
    userId: 42,
    userEmail: 'doctor@clinic.com',
    onClose: vi.fn(),
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the modal with title and form fields', () => {
      render(<ResetPasswordModal {...defaultProps} />);

      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByLabelText('New Password')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders Cancel and Reset Password buttons', () => {
      render(<ResetPasswordModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reset Password' })).toBeInTheDocument();
    });
  });

  describe('Validation', () => {
    it('shows error when password is less than 8 characters', async () => {
      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'short');
      await user.type(screen.getByLabelText('Confirm Password'), 'short');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm Password'), 'different123');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Submission', () => {
    it('calls API with correct userId and password on valid submit', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/admin/users/42/reset-password', {
          newPassword: 'newpassword123',
        });
      });
    });

    it('shows success message after successful reset', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: {} });

      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      await waitFor(() => {
        expect(screen.getByText('Password reset successfully!')).toBeInTheDocument();
      });
    });

    it('shows error message on API failure', async () => {
      const error = new Error('Network error');
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
      (getApiErrorMessage as ReturnType<typeof vi.fn>).mockReturnValueOnce('Failed to reset password');

      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      await waitFor(() => {
        expect(screen.getByText('Failed to reset password')).toBeInTheDocument();
      });
    });

    it('shows Resetting... text while saving', async () => {
      // Create a promise that won't resolve immediately
      let resolveApi: () => void;
      const apiPromise = new Promise<{ data: object }>((resolve) => {
        resolveApi = () => resolve({ data: {} });
      });
      (api.post as ReturnType<typeof vi.fn>).mockReturnValueOnce(apiPromise);

      render(<ResetPasswordModal {...defaultProps} />);

      await user.type(screen.getByLabelText('New Password'), 'newpassword123');
      await user.type(screen.getByLabelText('Confirm Password'), 'newpassword123');
      await user.click(screen.getByRole('button', { name: 'Reset Password' }));

      await waitFor(() => {
        expect(screen.getByText('Resetting...')).toBeInTheDocument();
      });

      // Clean up
      resolveApi!();
    });
  });

  describe('Cancel', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      render(<ResetPasswordModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
