import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AddRowModal from './AddRowModal';

describe('AddRowModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<AddRowModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Add New Patient')).not.toBeInTheDocument();
    });

    it('renders modal when isOpen is true', () => {
      render(<AddRowModal {...defaultProps} />);

      expect(screen.getByText('Add New Patient')).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      render(<AddRowModal {...defaultProps} />);

      expect(screen.getByText('Member Name')).toBeInTheDocument();
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Telephone')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    it('renders Add Row and Cancel buttons', () => {
      render(<AddRowModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Add Row' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows required indicator for name and DOB', () => {
      render(<AddRowModal {...defaultProps} />);

      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBe(2);
    });
  });

  describe('Validation', () => {
    it('shows error when submitting without member name', async () => {
      render(<AddRowModal {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Member name is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without date of birth', async () => {
      render(<AddRowModal {...defaultProps} />);

      const nameInput = screen.getByPlaceholderText('Enter patient name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
      });
    });

    it('clears error when field is edited', async () => {
      render(<AddRowModal {...defaultProps} />);

      // Submit to trigger error
      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Member name is required')).toBeInTheDocument();
      });

      // Edit the field
      const nameInput = screen.getByPlaceholderText('Enter patient name');
      fireEvent.change(nameInput, { target: { value: 'John Doe' } });

      // Error should be cleared
      expect(screen.queryByText('Member name is required')).not.toBeInTheDocument();
    });

    it('does not call onAdd when validation fails', async () => {
      const onAdd = vi.fn();
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Member name is required')).toBeInTheDocument();
      });

      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('Form submission', () => {
    it('calls onAdd with form data when valid', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      const nameInput = screen.getByPlaceholderText('Enter patient name');
      // Date input doesn't have placeholder, find by type
      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      const addressInput = screen.getByPlaceholderText('123 Main St, City, State ZIP');

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(dobInput, { target: { value: '1980-01-15' } });
      fireEvent.change(phoneInput, { target: { value: '5551234567' } });
      fireEvent.change(addressInput, { target: { value: '123 Test St' } });

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith({
          memberName: 'John Doe',
          memberDob: '1980-01-15T12:00:00.000Z',
          memberTelephone: '5551234567',
          memberAddress: '123 Test St',
        });
      });
    });

    it('resets form after successful submission', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      const nameInput = screen.getByPlaceholderText('Enter patient name') as HTMLInputElement;
      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(dobInput, { target: { value: '1980-01-15' } });

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(nameInput.value).toBe('');
        expect(dobInput.value).toBe('');
      });
    });

    it('does not reset form when onAdd returns false', async () => {
      const onAdd = vi.fn().mockResolvedValue(false);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      const nameInput = screen.getByPlaceholderText('Enter patient name') as HTMLInputElement;
      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(dobInput, { target: { value: '1980-01-15' } });

      fireEvent.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalled();
      });

      // Form should retain values
      expect(nameInput.value).toBe('John Doe');
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when Cancel button is clicked', () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X button is clicked', () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      // Find the X button (it's the button with no text in the header)
      const closeButton = screen.getByRole('button', { name: '' });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the dark overlay)
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
