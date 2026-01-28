import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Toolbar from './Toolbar';

describe('Toolbar', () => {
  const defaultProps = {
    onAddRow: vi.fn(),
    onDuplicateRow: vi.fn(),
    canDuplicate: false,
    onDeleteRow: vi.fn(),
    canDelete: false,
    saveStatus: 'idle' as const,
    showMemberInfo: false,
    onToggleMemberInfo: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Button rendering', () => {
    it('renders all toolbar buttons', () => {
      render(<Toolbar {...defaultProps} />);

      expect(screen.getByText('Add Row')).toBeInTheDocument();
      expect(screen.getByText('Duplicate Mbr')).toBeInTheDocument();
      expect(screen.getByText('Delete Row')).toBeInTheDocument();
      expect(screen.getByText('Member Info')).toBeInTheDocument();
    });

    it('Add Row button is always enabled', () => {
      render(<Toolbar {...defaultProps} />);

      const addButton = screen.getByText('Add Row').closest('button');
      expect(addButton).not.toBeDisabled();
    });
  });

  describe('Duplicate button', () => {
    it('is disabled when canDuplicate is false', () => {
      render(<Toolbar {...defaultProps} canDuplicate={false} />);

      const duplicateButton = screen.getByText('Duplicate Mbr').closest('button');
      expect(duplicateButton).toBeDisabled();
    });

    it('is enabled when canDuplicate is true', () => {
      render(<Toolbar {...defaultProps} canDuplicate={true} />);

      const duplicateButton = screen.getByText('Duplicate Mbr').closest('button');
      expect(duplicateButton).not.toBeDisabled();
    });

    it('calls onDuplicateRow when clicked and enabled', () => {
      const onDuplicateRow = vi.fn();
      render(<Toolbar {...defaultProps} canDuplicate={true} onDuplicateRow={onDuplicateRow} />);

      fireEvent.click(screen.getByText('Duplicate Mbr'));
      expect(onDuplicateRow).toHaveBeenCalledTimes(1);
    });

    it('does not call onDuplicateRow when disabled', () => {
      const onDuplicateRow = vi.fn();
      render(<Toolbar {...defaultProps} canDuplicate={false} onDuplicateRow={onDuplicateRow} />);

      fireEvent.click(screen.getByText('Duplicate Mbr'));
      expect(onDuplicateRow).not.toHaveBeenCalled();
    });
  });

  describe('Delete button', () => {
    it('is disabled when canDelete is false', () => {
      render(<Toolbar {...defaultProps} canDelete={false} />);

      const deleteButton = screen.getByText('Delete Row').closest('button');
      expect(deleteButton).toBeDisabled();
    });

    it('is enabled when canDelete is true', () => {
      render(<Toolbar {...defaultProps} canDelete={true} />);

      const deleteButton = screen.getByText('Delete Row').closest('button');
      expect(deleteButton).not.toBeDisabled();
    });

    it('calls onDeleteRow when clicked and enabled', () => {
      const onDeleteRow = vi.fn();
      render(<Toolbar {...defaultProps} canDelete={true} onDeleteRow={onDeleteRow} />);

      fireEvent.click(screen.getByText('Delete Row'));
      expect(onDeleteRow).toHaveBeenCalledTimes(1);
    });
  });

  describe('Add Row button', () => {
    it('calls onAddRow when clicked', () => {
      const onAddRow = vi.fn();
      render(<Toolbar {...defaultProps} onAddRow={onAddRow} />);

      fireEvent.click(screen.getByText('Add Row'));
      expect(onAddRow).toHaveBeenCalledTimes(1);
    });
  });

  describe('Member Info toggle', () => {
    it('calls onToggleMemberInfo when clicked', () => {
      const onToggleMemberInfo = vi.fn();
      render(<Toolbar {...defaultProps} onToggleMemberInfo={onToggleMemberInfo} />);

      fireEvent.click(screen.getByText('Member Info'));
      expect(onToggleMemberInfo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save status indicator', () => {
    it('shows nothing when status is idle', () => {
      render(<Toolbar {...defaultProps} saveStatus="idle" />);

      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      expect(screen.queryByText('Saved')).not.toBeInTheDocument();
      expect(screen.queryByText('Save failed')).not.toBeInTheDocument();
    });

    it('shows "Saving..." when status is saving', () => {
      render(<Toolbar {...defaultProps} saveStatus="saving" />);

      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    it('shows "Saved" when status is saved', () => {
      render(<Toolbar {...defaultProps} saveStatus="saved" />);

      expect(screen.getByText('Saved')).toBeInTheDocument();
    });

    it('shows "Save failed" when status is error', () => {
      render(<Toolbar {...defaultProps} saveStatus="error" />);

      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });
});
