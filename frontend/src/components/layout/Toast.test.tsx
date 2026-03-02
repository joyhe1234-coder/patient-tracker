import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultProps = {
    message: 'Operation successful',
    type: 'success' as const,
    isVisible: true,
    onDismiss: vi.fn(),
  };

  it('renders nothing when isVisible is false', () => {
    render(<Toast {...defaultProps} isVisible={false} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders the toast when isVisible is true', () => {
    render(<Toast {...defaultProps} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('renders success variant with green styling', () => {
    render(<Toast {...defaultProps} type="success" />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-green-50');
  });

  it('renders error variant with red styling', () => {
    render(<Toast {...defaultProps} type="error" />);
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-red-50');
  });

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = vi.fn();
    render(<Toast {...defaultProps} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    vi.useRealTimers();
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    render(<Toast {...defaultProps} onDismiss={onDismiss} />);

    await user.click(screen.getByLabelText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
