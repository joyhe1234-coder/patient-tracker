import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteModal from './DeleteModal';
import type { BulkPatient } from '../../types/bulkPatient';

const makePatient = (id: number, name: string): BulkPatient => ({
  id,
  memberName: name,
  memberDob: '1990-01-01',
  memberTelephone: null,
  ownerId: 1,
  ownerName: 'Dr. Smith',
  insuranceGroup: 'Blue Cross',
  measureCount: 2,
  latestMeasure: 'HgbA1c',
  latestStatus: 'Complete',
  updatedAt: '2025-01-01T00:00:00Z',
});

describe('DeleteModal', () => {
  const defaultProps = {
    isOpen: true,
    patients: [makePatient(1, 'Adams, John'), makePatient(2, 'Baker, Jane')],
    totalCount: 2,
    adminEmail: 'admin@clinic.com',
    loading: false,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
  };

  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    render(<DeleteModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Delete Patients')).not.toBeInTheDocument();
  });

  it('renders modal with title and patient count', () => {
    render(<DeleteModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Delete Patients' })).toBeInTheDocument();
    expect(screen.getByText(/2 patients will be permanently deleted/)).toBeInTheDocument();
  });

  it('shows danger warning message', () => {
    render(<DeleteModal {...defaultProps} />);
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('shows patient preview list', () => {
    render(<DeleteModal {...defaultProps} />);
    expect(screen.getByText('Adams, John')).toBeInTheDocument();
    expect(screen.getByText('Baker, Jane')).toBeInTheDocument();
  });

  it('shows overflow count when more than 10 patients', () => {
    const manyPatients = Array.from({ length: 12 }, (_, i) => makePatient(i + 1, `Patient ${i + 1}`));
    render(<DeleteModal {...defaultProps} patients={manyPatients} totalCount={12} />);
    expect(screen.getByText('...and 2 more')).toBeInTheDocument();
  });

  it('shows audit note with admin email', () => {
    render(<DeleteModal {...defaultProps} />);
    expect(screen.getByText(/admin@clinic.com/)).toBeInTheDocument();
  });

  it('disables confirm button when confirmation text is empty', () => {
    render(<DeleteModal {...defaultProps} />);
    const confirmBtn = screen.getByRole('button', { name: /Delete Patients/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('enables confirm button when "DELETE" is typed', async () => {
    render(<DeleteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'DELETE');

    const confirmBtn = screen.getByRole('button', { name: /Delete Patients/i });
    expect(confirmBtn).not.toBeDisabled();
  });

  it('does not enable confirm button for partial match', async () => {
    render(<DeleteModal {...defaultProps} />);
    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'DELET');

    const confirmBtn = screen.getByRole('button', { name: /Delete Patients/i });
    expect(confirmBtn).toBeDisabled();
  });

  it('calls onConfirm when confirmed', async () => {
    const onConfirm = vi.fn();
    render(<DeleteModal {...defaultProps} onConfirm={onConfirm} />);

    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'DELETE');
    await user.click(screen.getByRole('button', { name: /Delete Patients/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteModal {...defaultProps} onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables confirm button when loading', async () => {
    render(<DeleteModal {...defaultProps} loading={true} />);
    const input = screen.getByPlaceholderText('DELETE');
    await user.type(input, 'DELETE');

    const confirmBtn = screen.getByRole('button', { name: /Delete Patients/i });
    expect(confirmBtn).toBeDisabled();
  });
});
