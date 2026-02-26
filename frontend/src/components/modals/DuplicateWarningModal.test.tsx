import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DuplicateWarningModal from './DuplicateWarningModal';

describe('DuplicateWarningModal', () => {
  const defaultProps = {
    isOpen: true,
    patientName: 'Johnson, Daron',
    onClose: vi.fn(),
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<DuplicateWarningModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Duplicate Row Error')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      expect(screen.getByText('Duplicate Row Error')).toBeInTheDocument();
    });

    it('displays the patient name', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      expect(screen.getByText('Johnson, Daron')).toBeInTheDocument();
    });

    it('displays duplicate explanation text', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      expect(
        screen.getByText(/same patient name, date of birth, request type, and quality measure/)
      ).toBeInTheDocument();
    });

    it('displays guidance to use different values', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      expect(
        screen.getByText(/Please use a different patient, request type, or quality measure/)
      ).toBeInTheDocument();
    });

    it('renders OK button', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument();
    });

    it('shows Patient label with name', () => {
      render(<DuplicateWarningModal {...defaultProps} patientName="Chen, David" />);

      expect(screen.getByText('Chen, David')).toBeInTheDocument();
      expect(screen.getByText('Patient:')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when OK button is clicked', async () => {
      const onClose = vi.fn();
      render(<DuplicateWarningModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'OK' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(<DuplicateWarningModal {...defaultProps} onClose={onClose} />);

      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('displays red error icon', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      const iconContainer = document.querySelector('.bg-red-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('OK button has blue styling', () => {
      render(<DuplicateWarningModal {...defaultProps} />);

      const okButton = screen.getByRole('button', { name: 'OK' });
      expect(okButton.className).toContain('bg-blue-600');
    });
  });
});
