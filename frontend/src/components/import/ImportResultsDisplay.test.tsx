import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImportResultsDisplay from './ImportResultsDisplay';

describe('ImportResultsDisplay', () => {
  const user = userEvent.setup();

  const baseResults = {
    mode: 'merge' as const,
    stats: { inserted: 5, updated: 3, deleted: 1, skipped: 2, bothKept: 1 },
    duration: 2500,
  };

  const defaultProps = {
    results: baseResults,
    onImportMore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success banner', () => {
    it('shows "Import Successful" when no errors', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Import Successful')).toBeInTheDocument();
    });

    it('shows "Import Completed with Warnings" when errors exist', () => {
      render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{
            ...baseResults,
            errors: [{ action: 'INSERT', memberName: 'Smith, John', qualityMeasure: 'AWV', error: 'Failed' }],
          }}
        />
      );

      expect(screen.getByText('Import Completed with Warnings')).toBeInTheDocument();
    });

    it('displays mode and duration', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      expect(screen.getByText(/Mode: MERGE/)).toBeInTheDocument();
      expect(screen.getByText(/Duration: 2\.5s/)).toBeInTheDocument();
    });

    it('displays REPLACE mode correctly', () => {
      render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{ ...baseResults, mode: 'replace' }}
        />
      );

      expect(screen.getByText(/Mode: REPLACE/)).toBeInTheDocument();
    });

    it('uses green styling for success', () => {
      const { container } = render(<ImportResultsDisplay {...defaultProps} />);

      const banner = container.querySelector('.bg-green-50');
      expect(banner).toBeInTheDocument();
    });

    it('uses yellow styling for warnings', () => {
      const { container } = render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{
            ...baseResults,
            errors: [{ action: 'INSERT', memberName: 'A', qualityMeasure: 'B', error: 'C' }],
          }}
        />
      );

      const banner = container.querySelector('.bg-yellow-50');
      expect(banner).toBeInTheDocument();
    });
  });

  describe('Stats cards', () => {
    it('renders all 5 stat counts', () => {
      const { container } = render(<ImportResultsDisplay {...defaultProps} />);

      // Use specific class selectors to distinguish duplicate numbers
      const inserted = container.querySelector('.text-green-700');
      expect(inserted?.textContent).toBe('5');
      const updated = container.querySelector('.text-blue-700');
      expect(updated?.textContent).toBe('3');
      const deleted = container.querySelector('.text-red-700');
      expect(deleted?.textContent).toBe('1');
      const skipped = container.querySelector('.text-gray-700');
      expect(skipped?.textContent).toBe('2');
      const bothKept = container.querySelector('.text-yellow-700');
      expect(bothKept?.textContent).toBe('1');
    });

    it('renders stat labels', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Inserted')).toBeInTheDocument();
      expect(screen.getByText('Updated')).toBeInTheDocument();
      expect(screen.getByText('Deleted')).toBeInTheDocument();
      expect(screen.getByText('Skipped')).toBeInTheDocument();
      expect(screen.getByText('Both Kept')).toBeInTheDocument();
    });

    it('shows zero stats correctly', () => {
      render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{
            ...baseResults,
            stats: { inserted: 0, updated: 0, deleted: 0, skipped: 0, bothKept: 0 },
          }}
        />
      );

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBe(5);
    });
  });

  describe('Error section', () => {
    it('does not render errors section when no errors', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      expect(screen.queryByText(/Errors/)).not.toBeInTheDocument();
    });

    it('renders errors with count header', () => {
      render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{
            ...baseResults,
            errors: [
              { action: 'INSERT', memberName: 'Smith, John', qualityMeasure: 'AWV', error: 'Duplicate key' },
              { action: 'UPDATE', memberName: 'Chen, David', qualityMeasure: 'BP Control', error: 'Not found' },
            ],
          }}
        />
      );

      expect(screen.getByText('Errors (2)')).toBeInTheDocument();
      expect(screen.getByText('Smith, John')).toBeInTheDocument();
      expect(screen.getByText('Duplicate key')).toBeInTheDocument();
      expect(screen.getByText('Chen, David')).toBeInTheDocument();
      expect(screen.getByText('Not found')).toBeInTheDocument();
    });

    it('renders empty errors array as success', () => {
      render(
        <ImportResultsDisplay
          {...defaultProps}
          results={{ ...baseResults, errors: [] }}
        />
      );

      expect(screen.getByText('Import Successful')).toBeInTheDocument();
      expect(screen.queryByText(/Errors/)).not.toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('renders Import More button', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Import More')).toBeInTheDocument();
    });

    it('calls onImportMore when button clicked', async () => {
      const onImportMore = vi.fn();
      render(<ImportResultsDisplay {...defaultProps} onImportMore={onImportMore} />);

      await user.click(screen.getByText('Import More'));

      expect(onImportMore).toHaveBeenCalledTimes(1);
    });

    it('renders Go to Patient Grid link', () => {
      render(<ImportResultsDisplay {...defaultProps} />);

      const link = screen.getByText('Go to Patient Grid');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', '/');
    });
  });
});
