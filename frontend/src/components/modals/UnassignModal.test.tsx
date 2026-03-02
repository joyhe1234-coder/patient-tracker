import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnassignModal from './UnassignModal';
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

describe('UnassignModal', () => {
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
    render(<UnassignModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Unassign Patients')).not.toBeInTheDocument();
  });

  it('renders modal with title and patient count', () => {
    render(<UnassignModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Unassign Patients' })).toBeInTheDocument();
    expect(screen.getByText(/2 patients selected/)).toBeInTheDocument();
  });

  it('shows warning message', () => {
    render(<UnassignModal {...defaultProps} />);
    expect(screen.getByText(/will not appear in any physician/)).toBeInTheDocument();
  });

  it('shows patient preview', () => {
    render(<UnassignModal {...defaultProps} />);
    expect(screen.getByText('Adams, John')).toBeInTheDocument();
    expect(screen.getByText('Baker, Jane')).toBeInTheDocument();
  });

  it('shows overflow count', () => {
    const manyPatients = Array.from({ length: 12 }, (_, i) => makePatient(i + 1, `Patient ${i + 1}`));
    render(<UnassignModal {...defaultProps} patients={manyPatients} totalCount={12} />);
    expect(screen.getByText('...and 2 more')).toBeInTheDocument();
  });

  it('shows audit note', () => {
    render(<UnassignModal {...defaultProps} />);
    expect(screen.getByText(/admin@clinic.com/)).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    render(<UnassignModal {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: /Unassign Patients/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<UnassignModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables confirm button when loading', () => {
    render(<UnassignModal {...defaultProps} loading={true} />);
    const confirmBtn = screen.getByRole('button', { name: /Unassign Patients/i });
    expect(confirmBtn).toBeDisabled();
  });
});
