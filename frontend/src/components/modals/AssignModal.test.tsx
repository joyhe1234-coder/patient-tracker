import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AssignModal from './AssignModal';
import type { BulkPatient, Physician } from '../../types/bulkPatient';

const makePatient = (id: number, name: string): BulkPatient => ({
  id,
  memberName: name,
  memberDob: '1990-01-01',
  memberTelephone: null,
  ownerId: null,
  ownerName: null,
  insuranceGroup: 'Blue Cross',
  measureCount: 2,
  latestMeasure: 'HgbA1c',
  latestStatus: 'Complete',
  updatedAt: '2025-01-01T00:00:00Z',
});

const physicians: Physician[] = [
  { id: 1, displayName: 'Dr. Smith', email: 'smith@clinic.com', roles: ['PHYSICIAN'] },
  { id: 2, displayName: 'Dr. Jones', email: 'jones@clinic.com', roles: ['PHYSICIAN'] },
];

describe('AssignModal', () => {
  const defaultProps = {
    isOpen: true,
    patients: [makePatient(1, 'Adams, John'), makePatient(2, 'Baker, Jane')],
    physicians,
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
    render(<AssignModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Assign Patients')).not.toBeInTheDocument();
  });

  it('renders modal with title and patient count', () => {
    render(<AssignModal {...defaultProps} />);
    expect(screen.getByText('Assign Patients')).toBeInTheDocument();
    expect(screen.getByText(/2 patients selected/)).toBeInTheDocument();
  });

  it('shows physician dropdown', () => {
    render(<AssignModal {...defaultProps} />);
    expect(screen.getByLabelText('Assign to Physician')).toBeInTheDocument();
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
    expect(screen.getByText('Dr. Jones')).toBeInTheDocument();
  });

  it('disables confirm button when no physician selected', () => {
    render(<AssignModal {...defaultProps} />);
    const assignBtn = screen.getByRole('button', { name: 'Assign' });
    expect(assignBtn).toBeDisabled();
  });

  it('enables confirm button when physician is selected', async () => {
    render(<AssignModal {...defaultProps} />);
    const select = screen.getByLabelText('Assign to Physician');
    await user.selectOptions(select, '1');

    const assignBtn = screen.getByRole('button', { name: 'Assign' });
    expect(assignBtn).not.toBeDisabled();
  });

  it('calls onConfirm with physician ID', async () => {
    const onConfirm = vi.fn();
    render(<AssignModal {...defaultProps} onConfirm={onConfirm} />);

    const select = screen.getByLabelText('Assign to Physician');
    await user.selectOptions(select, '1');
    await user.click(screen.getByRole('button', { name: 'Assign' }));

    expect(onConfirm).toHaveBeenCalledWith(1);
  });

  it('shows patient preview', () => {
    render(<AssignModal {...defaultProps} />);
    expect(screen.getByText('Adams, John')).toBeInTheDocument();
    expect(screen.getByText('Baker, Jane')).toBeInTheDocument();
  });

  it('shows overflow count', () => {
    const manyPatients = Array.from({ length: 15 }, (_, i) => makePatient(i + 1, `Patient ${i + 1}`));
    render(<AssignModal {...defaultProps} patients={manyPatients} totalCount={15} />);
    expect(screen.getByText('...and 5 more')).toBeInTheDocument();
  });

  it('shows audit note', () => {
    render(<AssignModal {...defaultProps} />);
    expect(screen.getByText(/admin@clinic.com/)).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<AssignModal {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
