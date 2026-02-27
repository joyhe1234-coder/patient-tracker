import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AddRowModal from './AddRowModal';

describe('AddRowModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onAdd: vi.fn().mockResolvedValue(true),
  };

  const user = userEvent.setup();

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

      expect(screen.getByText('Last Name')).toBeInTheDocument();
      expect(screen.getByText('First Name')).toBeInTheDocument();
      expect(screen.getByText('MI')).toBeInTheDocument();
      expect(screen.getByText('Date of Birth')).toBeInTheDocument();
      expect(screen.getByText('Telephone')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
    });

    it('renders Add Row and Cancel buttons', () => {
      render(<AddRowModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: 'Add Row' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('shows required indicator for last name, first name, and DOB', () => {
      render(<AddRowModal {...defaultProps} />);

      const requiredMarkers = screen.getAllByText('*');
      expect(requiredMarkers.length).toBe(3);
    });
  });

  describe('Validation', () => {
    it('shows error when submitting without last name', async () => {
      render(<AddRowModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without first name', async () => {
      render(<AddRowModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });
    });

    it('shows error when submitting without date of birth', async () => {
      render(<AddRowModal {...defaultProps} />);

      const lastNameInput = screen.getByPlaceholderText('Last name');
      const firstNameInput = screen.getByPlaceholderText('First name');
      await user.type(lastNameInput, 'Doe');
      await user.type(firstNameInput, 'John');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Date of birth is required')).toBeInTheDocument();
      });
    });

    it('clears last name error when field is edited', async () => {
      render(<AddRowModal {...defaultProps} />);

      // Submit to trigger errors
      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });

      // Edit the last name field
      const lastNameInput = screen.getByPlaceholderText('Last name');
      await user.type(lastNameInput, 'Doe');

      // Error should be cleared
      expect(screen.queryByText('Last name is required')).not.toBeInTheDocument();
    });

    it('clears first name error when field is edited', async () => {
      render(<AddRowModal {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('First name is required')).toBeInTheDocument();
      });

      const firstNameInput = screen.getByPlaceholderText('First name');
      await user.type(firstNameInput, 'John');

      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });

    it('does not call onAdd when validation fails', async () => {
      const onAdd = vi.fn();
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(screen.getByText('Last name is required')).toBeInTheDocument();
      });

      expect(onAdd).not.toHaveBeenCalled();
    });
  });

  describe('Name concatenation', () => {
    it('concatenates as "Last, First" without middle name', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.type(screen.getByPlaceholderText('Last name'), 'Smith');
      await user.type(screen.getByPlaceholderText('First name'), 'John');

      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ memberName: 'Smith, John' })
        );
      });
    });

    it('concatenates as "Last, First Middle" with middle name', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.type(screen.getByPlaceholderText('Last name'), 'Smith');
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Middle'), 'Robert');

      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ memberName: 'Smith, John Robert' })
        );
      });
    });

    it('trims whitespace from name fields', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.type(screen.getByPlaceholderText('Last name'), '  Smith  ');
      await user.type(screen.getByPlaceholderText('First name'), '  John  ');
      await user.type(screen.getByPlaceholderText('Middle'), '  R  ');

      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ memberName: 'Smith, John R' })
        );
      });
    });

    it('ignores whitespace-only middle name', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.type(screen.getByPlaceholderText('Last name'), 'Smith');
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Middle'), '   ');

      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith(
          expect.objectContaining({ memberName: 'Smith, John' })
        );
      });
    });
  });

  describe('Form submission', () => {
    it('calls onAdd with form data when valid', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('First name'), 'John');

      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      const phoneInput = screen.getByPlaceholderText('(555) 123-4567');
      const addressInput = screen.getByPlaceholderText('123 Main St, City, State ZIP');

      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');
      await user.type(phoneInput, '5551234567');
      await user.type(addressInput, '123 Test St');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalledWith({
          memberName: 'Doe, John',
          memberDob: '1980-01-15T12:00:00.000Z',
          memberTelephone: '5551234567',
          memberAddress: '123 Test St',
        });
      });
    });

    it('resets form after successful submission', async () => {
      const onAdd = vi.fn().mockResolvedValue(true);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      const lastNameInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;
      const firstNameInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      await user.type(lastNameInput, 'Doe');
      await user.type(firstNameInput, 'John');
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(lastNameInput.value).toBe('');
        expect(firstNameInput.value).toBe('');
        expect(dobInput.value).toBe('');
      });
    });

    it('does not reset form when onAdd returns false', async () => {
      const onAdd = vi.fn().mockResolvedValue(false);
      render(<AddRowModal {...defaultProps} onAdd={onAdd} />);

      const lastNameInput = screen.getByPlaceholderText('Last name') as HTMLInputElement;
      const firstNameInput = screen.getByPlaceholderText('First name') as HTMLInputElement;
      const dobInput = document.querySelector('input[type="date"]') as HTMLInputElement;

      await user.type(lastNameInput, 'Doe');
      await user.type(firstNameInput, 'John');
      await user.clear(dobInput);
      await user.type(dobInput, '1980-01-15');

      await user.click(screen.getByRole('button', { name: 'Add Row' }));

      await waitFor(() => {
        expect(onAdd).toHaveBeenCalled();
      });

      // Form should retain values
      expect(lastNameInput.value).toBe('Doe');
      expect(firstNameInput.value).toBe('John');
    });
  });

  describe('Close behavior', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when X button is clicked', async () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      // Find the X button (it's the button with no text in the header)
      const closeButton = screen.getByRole('button', { name: '' });
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const onClose = vi.fn();
      render(<AddRowModal {...defaultProps} onClose={onClose} />);

      // Click on the backdrop (the dark overlay)
      const backdrop = document.querySelector('.bg-black.bg-opacity-50');
      if (backdrop) {
        await user.click(backdrop as HTMLElement);
      }

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
