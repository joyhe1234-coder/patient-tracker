/**
 * ForgotPasswordPage Tests
 *
 * Tests for the forgot password page: SMTP status checking, form validation, and submission.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

// Mock axios api
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('../api/axios', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import { ForgotPasswordPage } from './ForgotPasswordPage';

// Helper to render with router
function renderForgotPasswordPage() {
  return render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading indicator while checking SMTP status', () => {
      // Never resolve the promise to keep loading state
      mockGet.mockReturnValue(new Promise(() => {}));

      renderForgotPasswordPage();

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('SMTP Not Configured', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { data: { configured: false } },
      });
    });

    it('shows unavailable message when SMTP is not configured', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText('Password Reset Unavailable')).toBeInTheDocument();
      });

      expect(screen.getByText(/Password reset via email is not available/i)).toBeInTheDocument();
      expect(screen.getByText(/contact your administrator/i)).toBeInTheDocument();
    });

    it('shows link to request new reset', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText('Password Reset Unavailable')).toBeInTheDocument();
      });

      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });

    it('does not show email form', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText('Password Reset Unavailable')).toBeInTheDocument();
      });

      expect(screen.queryByLabelText(/email address/i)).not.toBeInTheDocument();
    });
  });

  describe('SMTP Configured - Form Rendering', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { data: { configured: true } },
      });
    });

    it('shows email form when SMTP is configured', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText('Forgot Password')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    it('shows description text', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText(/enter your email to receive a reset link/i)).toBeInTheDocument();
      });
    });

    it('shows back to login link', async () => {
      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
      });
    });
  });

  describe('SMTP Configured - Form Submission', () => {
    beforeEach(() => {
      mockGet.mockResolvedValue({
        data: { data: { configured: true } },
      });
    });

    it('calls API with email on form submit', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/forgot-password', {
          email: 'test@example.com',
        });
      });
    });

    it('shows success message after successful submission', async () => {
      mockPost.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Check Your Email')).toBeInTheDocument();
      });

      expect(screen.getByText(/if an account exists with/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/expire in 1 hour/i)).toBeInTheDocument();
    });

    it('shows loading state during submission', async () => {
      // Keep the promise pending to show loading state
      mockPost.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });
    });

    it('shows error message on API failure', async () => {
      mockPost.mockRejectedValue({
        response: { data: { message: 'Server error' } },
      });
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('shows generic error message when API error has no message', async () => {
      mockPost.mockRejectedValue({});
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to send reset email')).toBeInTheDocument();
      });
    });

    it('disables input and button while loading', async () => {
      mockPost.mockReturnValue(new Promise(() => {}));
      const user = userEvent.setup();

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      });

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /send reset link/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
      });
    });
  });

  describe('SMTP Status Check Error', () => {
    it('shows unavailable message when SMTP status check fails', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      renderForgotPasswordPage();

      await waitFor(() => {
        expect(screen.getByText('Password Reset Unavailable')).toBeInTheDocument();
      });
    });
  });
});
