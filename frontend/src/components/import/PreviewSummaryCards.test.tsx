import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PreviewSummaryCards from './PreviewSummaryCards';

describe('PreviewSummaryCards', () => {
  const user = userEvent.setup();

  const defaultProps = {
    summary: { inserts: 5, updates: 3, skips: 2, duplicates: 1, deletes: 0 },
    patients: { new: 3, existing: 4, total: 7 },
    totalChanges: 11,
    warningCount: 0,
    activeFilter: 'all' as const,
    onFilterChange: vi.fn(),
    filteredCount: 11,
    totalItemCount: 11,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Summary cards', () => {
    it('renders all action counts', () => {
      const { container } = render(<PreviewSummaryCards {...defaultProps} />);

      // Use specific class selectors to avoid duplicate number collisions
      const inserts = container.querySelector('.text-green-700');
      expect(inserts?.textContent).toBe('5');
      const updates = container.querySelector('.text-blue-700');
      expect(updates?.textContent).toBe('3');
      const skips = container.querySelector('.text-gray-700');
      expect(skips?.textContent).toBe('2');
      const duplicates = container.querySelector('.text-yellow-700');
      expect(duplicates?.textContent).toBe('1');
      const deletes = container.querySelector('.text-red-700');
      expect(deletes?.textContent).toBe('0');
    });

    it('renders action labels', () => {
      render(<PreviewSummaryCards {...defaultProps} />);

      expect(screen.getByText('Insert')).toBeInTheDocument();
      expect(screen.getByText('Update')).toBeInTheDocument();
      expect(screen.getByText('Skip')).toBeInTheDocument();
      expect(screen.getByText('Both')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Warnings')).toBeInTheDocument();
    });

    it('renders total changes count', () => {
      render(<PreviewSummaryCards {...defaultProps} />);

      expect(screen.getByText('11')).toBeInTheDocument();
    });

    it('renders warning count', () => {
      const { container } = render(<PreviewSummaryCards {...defaultProps} warningCount={4} />);

      const warningValue = container.querySelector('.text-orange-700');
      expect(warningValue?.textContent).toBe('4');
    });
  });

  describe('Filter interactions', () => {
    it('calls onFilterChange with INSERT when Insert card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Insert').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('INSERT');
    });

    it('calls onFilterChange with UPDATE when Update card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Update').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('UPDATE');
    });

    it('calls onFilterChange with SKIP when Skip card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Skip').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('SKIP');
    });

    it('calls onFilterChange with BOTH when Both card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Both').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('BOTH');
    });

    it('calls onFilterChange with DELETE when Delete card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Delete').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('DELETE');
    });

    it('calls onFilterChange with all when Total card clicked', async () => {
      const onFilterChange = vi.fn();
      render(<PreviewSummaryCards {...defaultProps} onFilterChange={onFilterChange} />);

      await user.click(screen.getByText('Total').closest('button')!);

      expect(onFilterChange).toHaveBeenCalledWith('all');
    });

    it('Warnings card is not clickable (no button)', () => {
      render(<PreviewSummaryCards {...defaultProps} warningCount={3} />);

      const warningsLabel = screen.getByText('Warnings');
      expect(warningsLabel.closest('button')).toBeNull();
    });
  });

  describe('Active filter ring', () => {
    it('shows ring on INSERT card when active', () => {
      const { container } = render(
        <PreviewSummaryCards {...defaultProps} activeFilter="INSERT" />
      );

      const greenRing = container.querySelector('.ring-2.ring-green-500');
      expect(greenRing).toBeInTheDocument();
    });

    it('shows ring on all (Total) card when active', () => {
      const { container } = render(
        <PreviewSummaryCards {...defaultProps} activeFilter="all" />
      );

      const purpleRing = container.querySelector('.ring-2.ring-purple-500');
      expect(purpleRing).toBeInTheDocument();
    });
  });

  describe('Patient summary', () => {
    it('displays new, existing, and total patient counts', () => {
      render(<PreviewSummaryCards {...defaultProps} />);

      expect(screen.getByText('New Patients:')).toBeInTheDocument();
      expect(screen.getByText('Existing Patients:')).toBeInTheDocument();
      expect(screen.getByText('Total Patients:')).toBeInTheDocument();

      // Use specific class selectors for patient counts to avoid collisions with card numbers
      const newCount = document.querySelector('.text-green-600.font-semibold');
      expect(newCount?.textContent).toBe('3');
      const existingCount = document.querySelector('.text-blue-600.font-semibold');
      expect(existingCount?.textContent).toBe('4');
    });

    it('shows filtered count when filter is not "all"', () => {
      render(
        <PreviewSummaryCards
          {...defaultProps}
          activeFilter="INSERT"
          filteredCount={5}
          totalItemCount={11}
        />
      );

      expect(screen.getByText('Showing 5 of 11 changes')).toBeInTheDocument();
    });

    it('hides filtered count when filter is "all"', () => {
      render(<PreviewSummaryCards {...defaultProps} activeFilter="all" />);

      expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
    });
  });

  describe('Warning styling', () => {
    it('uses orange styling when warnings > 0', () => {
      const { container } = render(
        <PreviewSummaryCards {...defaultProps} warningCount={2} />
      );

      const orangeCard = container.querySelector('.bg-orange-50');
      expect(orangeCard).toBeInTheDocument();
    });

    it('uses gray styling when warnings = 0', () => {
      const { container } = render(
        <PreviewSummaryCards {...defaultProps} warningCount={0} />
      );

      // Warnings card with 0 should use gray
      const warningsLabel = screen.getByText('Warnings');
      expect(warningsLabel.className).toContain('text-gray-600');
    });
  });
});
