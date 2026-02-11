/**
 * ConflictModal Tests
 *
 * Tests for the conflict resolution modal: rendering, field comparison, action buttons.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ConflictModal, { type ConflictField } from './ConflictModal';

const sampleConflicts: ConflictField[] = [
  {
    fieldName: 'Measure Status',
    fieldKey: 'measureStatus',
    baseValue: 'Called to schedule',
    theirValue: 'Completed',
    yourValue: 'Scheduled',
  },
];

const defaultProps = {
  isOpen: true,
  patientName: 'John Doe',
  changedBy: 'Dr. Smith',
  conflicts: sampleConflicts,
  onKeepMine: vi.fn(),
  onKeepTheirs: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConflictModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <ConflictModal {...defaultProps} isOpen={false} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders modal when isOpen is true', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Edit Conflict')).toBeInTheDocument();
  });

  it('displays patient name', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('displays changedBy user name', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
  });

  it('displays conflict field name', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Measure Status')).toBeInTheDocument();
  });

  it('shows all three value columns', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Their Version')).toBeInTheDocument();
    expect(screen.getByText('Your Version')).toBeInTheDocument();
  });

  it('displays original, their, and your values', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Called to schedule')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
  });

  it('displays "(empty)" for null values', () => {
    const conflicts: ConflictField[] = [
      {
        fieldName: 'Notes',
        fieldKey: 'notes',
        baseValue: null,
        theirValue: 'Some note',
        yourValue: null,
      },
    ];

    render(<ConflictModal {...defaultProps} conflicts={conflicts} />);

    const emptyLabels = screen.getAllByText('(empty)');
    expect(emptyLabels).toHaveLength(2); // baseValue and yourValue
  });

  it('handles multiple conflicting fields', () => {
    const conflicts: ConflictField[] = [
      {
        fieldName: 'Measure Status',
        fieldKey: 'measureStatus',
        baseValue: 'Pending',
        theirValue: 'Completed',
        yourValue: 'Scheduled',
      },
      {
        fieldName: 'Notes',
        fieldKey: 'notes',
        baseValue: 'Initial note',
        theirValue: 'Updated note',
        yourValue: 'My note',
      },
    ];

    render(<ConflictModal {...defaultProps} conflicts={conflicts} />);

    expect(screen.getByText('Measure Status')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
  });

  it('"Keep Mine" button triggers onKeepMine callback', () => {
    const onKeepMine = vi.fn();
    render(<ConflictModal {...defaultProps} onKeepMine={onKeepMine} />);

    fireEvent.click(screen.getByText('Keep Mine'));

    expect(onKeepMine).toHaveBeenCalledTimes(1);
  });

  it('"Keep Theirs" button triggers onKeepTheirs callback', () => {
    const onKeepTheirs = vi.fn();
    render(<ConflictModal {...defaultProps} onKeepTheirs={onKeepTheirs} />);

    fireEvent.click(screen.getByText('Keep Theirs'));

    expect(onKeepTheirs).toHaveBeenCalledTimes(1);
  });

  it('"Cancel" button triggers onCancel callback', () => {
    const onCancel = vi.fn();
    render(<ConflictModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('backdrop click triggers onCancel callback', () => {
    const onCancel = vi.fn();
    render(<ConflictModal {...defaultProps} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId('conflict-backdrop'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders all three action buttons', () => {
    render(<ConflictModal {...defaultProps} />);

    expect(screen.getByText('Keep Mine')).toBeInTheDocument();
    expect(screen.getByText('Keep Theirs')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
