/**
 * ForcePasswordChange Component Tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API
const mockPost = vi.fn();
vi.mock('../api/axios', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import ForcePasswordChange from './ForcePasswordChange';

describe('ForcePasswordChange', () => {
  const user = userEvent.setup();
  const mockOnPasswordChanged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the force change password modal', () => {
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    expect(screen.getByText('Password Change Required')).toBeInTheDocument();
    expect(screen.getByText(/must change your password/i)).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change password/i })).toBeInTheDocument();
  });

  it('does not have a close button', () => {
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    // No close/X button should exist in the modal
    const closeButtons = screen.queryAllByRole('button');
    const closeButton = closeButtons.find(
      (btn) => btn.textContent === 'X' || btn.textContent === 'Close' || btn.getAttribute('aria-label') === 'Close'
    );
    expect(closeButton).toBeUndefined();
  });

  it('shows error when password is too short', async () => {
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await user.type(newPasswordInput, 'short');
    await user.type(confirmPasswordInput, 'short');
    await user.click(submitButton);

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'different123');
    await user.click(submitButton);

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('calls onPasswordChanged on successful submit', async () => {
    mockPost.mockResolvedValue({ data: { success: true } });
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/force-change-password', { newPassword: 'newpassword123' });
      expect(mockOnPasswordChanged).toHaveBeenCalled();
    });
  });

  it('shows error from API on failure', async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: { message: 'Server error occurred' } } },
    });
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Server error occurred')).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    mockPost.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<ForcePasswordChange onPasswordChanged={mockOnPasswordChanged} />);

    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const submitButton = screen.getByRole('button', { name: /change password/i });

    await user.type(newPasswordInput, 'newpassword123');
    await user.type(confirmPasswordInput, 'newpassword123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Changing Password...')).toBeInTheDocument();
    });
  });
});
