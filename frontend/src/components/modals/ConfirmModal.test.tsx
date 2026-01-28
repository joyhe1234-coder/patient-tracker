import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConfirmModal from './ConfirmModal';

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Delete Row',
    message: 'Are you sure you want to delete this row?',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<ConfirmModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Delete Row')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Delete Row')).toBeInTheDocument();
    });

    it('displays title and message', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByText('Delete Row')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this row?')).toBeInTheDocument();
    });

    it('uses default button text when not provided', () => {
      render(<ConfirmModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('uses custom button text when provided', () => {
      render(
        <ConfirmModal
          {...defaultProps}
          confirmText="Delete"
          cancelText="Keep"
        />
      );

      expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
    });
  });

  describe('Button actions', () => {
    it('calls onConfirm when confirm button is clicked', () => {
      const onConfirm = vi.fn();
      render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when backdrop is clicked', () => {
      const onCancel = vi.fn();
      render(<ConfirmModal {...defaultProps} onCancel={onCancel} />);

      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button styling', () => {
    it('applies red color to confirm button by default', () => {
      render(<ConfirmModal {...defaultProps} />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toContain('bg-red-600');
    });

    it('applies blue color when confirmColor is blue', () => {
      render(<ConfirmModal {...defaultProps} confirmColor="blue" />);

      const confirmButton = screen.getByRole('button', { name: 'Confirm' });
      expect(confirmButton.className).toContain('bg-blue-600');
    });
  });

  describe('Alert icon', () => {
    it('displays alert triangle icon', () => {
      render(<ConfirmModal {...defaultProps} />);

      // The icon is rendered inside a red background circle
      const iconContainer = document.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();
    });
  });
});
