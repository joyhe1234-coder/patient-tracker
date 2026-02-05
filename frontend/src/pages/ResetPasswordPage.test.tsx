/**
 * ResetPasswordPage Tests
 *
 * Tests for the reset password page: token validation, form validation, and password reset.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock axios api
const mockPost = vi.fn();

vi.mock('../api/axios', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import { ResetPasswordPage } from './ResetPasswordPage';

// Helper to render with router and query params
function renderResetPasswordPage(token?: string) {
  const initialEntries = token ? [`/reset-password?token=${token}`] : ['/reset-password'];

  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('No Token Provided', () => {
    it('shows invalid link message when no token in URL', () => {
      renderResetPasswordPage();

      expect(screen.getByText('Invalid Link')).toBeInTheDocument();
      expect(screen.getByText(/password reset link is invalid/i)).toBeInTheDocument();
    });

    it('shows link to request new reset', () => {
      renderResetPasswordPage();

      expect(screen.getByRole('link', { name: /request new reset/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('does not show password form', () => {
      renderResetPasswordPage();

      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    });
  });

  describe('Token Provided - Form Rendering', () => {
    it('shows password form when token is present', () => {
      renderResetPasswordPage('valid-token-123');

      expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('shows description text', () => {
      renderResetPasswordPage('valid-token-123');

      expect(screen.getByText(/enter your new password/i)).toBeInTheDocument();
    });

    it('shows back to login link', () => {
      renderResetPasswordPage('valid-token-123');

      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'password123');
      await user.type(confirmInput, 'different456');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });

      expect(mockPost).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'short');
      await user.type(confirmInput, 'short');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
      });

      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('calls API with token and new password on valid submit', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
          token: 'valid-token-123',
          newPassword: 'newpassword123',
        });
      });
    });

    it('shows success message after successful reset', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password Reset')).toBeInTheDocument();
      });

      expect(screen.getByText(/password has been reset successfully/i)).toBeInTheDocument();
      expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
    });

    it('redirects to login after success', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/redirecting to login/i)).toBeInTheDocument();
      });

      // Fast-forward the 3 second timeout
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    it('shows loading state during submission', async () => {
      mockPost.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Resetting...')).toBeInTheDocument();
      });
    });

    it('disables inputs while loading', async () => {
      mockPost.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token-123');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(passwordInput).toBeDisabled();
        expect(confirmInput).toBeDisabled();
        expect(screen.getByRole('button', { name: /resetting/i })).toBeDisabled();
      });
    });
  });

  describe('API Errors', () => {
    it('shows error message for expired token', async () => {
      mockPost.mockRejectedValue({
        response: { data: { message: 'Reset link has expired' } },
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('expired-token');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Reset link has expired')).toBeInTheDocument();
      });
    });

    it('shows error message for invalid token', async () => {
      mockPost.mockRejectedValue({
        response: { data: { message: 'Invalid or expired reset token' } },
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('invalid-token');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid or expired reset token')).toBeInTheDocument();
      });
    });

    it('shows error message for already used token', async () => {
      mockPost.mockRejectedValue({
        response: { data: { message: 'Reset link has already been used' } },
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('used-token');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Reset link has already been used')).toBeInTheDocument();
      });
    });

    it('shows generic error message when API error has no message', async () => {
      mockPost.mockRejectedValue({});
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      renderResetPasswordPage('valid-token');

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, 'newpassword123');
      await user.type(confirmInput, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to reset password')).toBeInTheDocument();
      });
    });
  });
});
