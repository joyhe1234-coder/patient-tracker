import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConflictBanner, type ConflictBannerProps } from './ConflictBanner';
import type { ColumnConflict } from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeConflict(
  overrides: Partial<ColumnConflict> & Pick<ColumnConflict, 'id' | 'type' | 'sourceHeader'>
): ColumnConflict {
  return {
    severity: 'BLOCKING',
    category: 'column',
    configColumn: null,
    suggestions: [],
    resolution: null,
    message: '',
    ...overrides,
  };
}

const newConflict1 = makeConflict({
  id: 'c1',
  type: 'NEW',
  sourceHeader: 'NewCol_A',
  message: 'Column not in configuration',
});

const newConflict2 = makeConflict({
  id: 'c2',
  type: 'NEW',
  sourceHeader: 'NewCol_B',
});

const changedConflict = makeConflict({
  id: 'c3',
  type: 'CHANGED',
  sourceHeader: 'RenamedCol',
  configColumn: 'OriginalName',
  message: 'Header changed',
});

const missingConflict1 = makeConflict({
  id: 'c4',
  type: 'MISSING',
  sourceHeader: 'MissingCol_X',
  configColumn: 'MissingCol_X',
  message: 'Expected column not found',
});

const missingConflict2 = makeConflict({
  id: 'c5',
  type: 'MISSING',
  sourceHeader: 'MissingCol_Y',
  configColumn: 'MissingCol_Y',
});

const missingConflict3 = makeConflict({
  id: 'c6',
  type: 'MISSING',
  sourceHeader: 'MissingCol_Z',
  configColumn: 'MissingCol_Z',
});

const allConflicts: ColumnConflict[] = [
  newConflict1,
  newConflict2,
  changedConflict,
  missingConflict1,
  missingConflict2,
  missingConflict3,
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderBanner(overrides: Partial<ConflictBannerProps> = {}) {
  const defaultProps: ConflictBannerProps = {
    conflicts: allConflicts,
    systemName: 'TestSystem',
    onCancel: vi.fn(),
    onCopyDetails: vi.fn(),
    ...overrides,
  };
  return render(<ConflictBanner {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConflictBanner', () => {
  describe('Visibility and ARIA', () => {
    it('renders with role="alert" attribute', () => {
      renderBanner();

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('returns null when conflicts array is empty', () => {
      const { container } = renderBanner({ conflicts: [] });

      expect(container.innerHTML).toBe('');
    });

    it('returns null when conflicts is undefined', () => {
      const { container } = renderBanner({
        conflicts: undefined as unknown as ColumnConflict[],
      });

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Count summary', () => {
    it('displays conflict count summary (X new, Y renamed, Z missing)', () => {
      renderBanner();

      // 2 new columns, 1 renamed column, 3 missing columns
      expect(
        screen.getByText('2 new columns, 1 renamed column, 3 missing columns')
      ).toBeInTheDocument();
    });

    it('uses singular form for single-count conflict types', () => {
      renderBanner({
        conflicts: [newConflict1, changedConflict, missingConflict1],
      });

      expect(
        screen.getByText('1 new column, 1 renamed column, 1 missing column')
      ).toBeInTheDocument();
    });
  });

  describe('Badge colors', () => {
    it('renders NEW conflicts with blue badge', () => {
      renderBanner();

      const badge = screen.getByText('New');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
    });

    it('renders CHANGED conflicts with amber badge', () => {
      renderBanner();

      const badge = screen.getByText('Renamed');
      expect(badge).toHaveClass('bg-amber-100', 'text-amber-800');
    });

    it('renders MISSING conflicts with red badge', () => {
      renderBanner();

      const badge = screen.getByText('Missing');
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Action buttons', () => {
    it('"Cancel" button calls onCancel prop', async () => {
      const onCancel = vi.fn();
      renderBanner({ onCancel });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('"Copy Details" button calls onCopyDetails prop', async () => {
      const onCopyDetails = vi.fn();
      renderBanner({ onCopyDetails });

      await userEvent.click(
        screen.getByRole('button', { name: /copy conflict details/i })
      );

      expect(onCopyDetails).toHaveBeenCalledOnce();
    });
  });

  describe('Read-only: no resolution controls', () => {
    it('does not render any dropdowns or comboboxes', () => {
      renderBanner();

      expect(screen.queryAllByRole('combobox')).toHaveLength(0);
      expect(screen.queryAllByRole('listbox')).toHaveLength(0);
    });

    it('does not render a "Save & Continue" button', () => {
      renderBanner();

      expect(
        screen.queryByRole('button', { name: /save.*continue/i })
      ).not.toBeInTheDocument();
    });

    it('conflict list items contain no interactive elements', () => {
      renderBanner();

      const alert = screen.getByRole('alert');
      const listItems = within(alert).getAllByRole('listitem');

      for (const li of listItems) {
        // No buttons, links, inputs, selects, or textareas inside list items
        expect(within(li).queryAllByRole('button')).toHaveLength(0);
        expect(within(li).queryAllByRole('link')).toHaveLength(0);
        expect(within(li).queryAllByRole('textbox')).toHaveLength(0);
        expect(within(li).queryAllByRole('combobox')).toHaveLength(0);
      }
    });
  });

  describe('Conflict details rendering', () => {
    it('displays system name in the instruction text', () => {
      renderBanner({ systemName: 'Acme Health' });

      expect(screen.getByText('Acme Health')).toBeInTheDocument();
    });

    it('shows source header names for each conflict', () => {
      renderBanner();

      expect(screen.getByText('NewCol_A')).toBeInTheDocument();
      expect(screen.getByText('NewCol_B')).toBeInTheDocument();
      expect(screen.getByText('RenamedCol')).toBeInTheDocument();
      expect(screen.getByText('MissingCol_X')).toBeInTheDocument();
    });

    it('shows configColumn with arrow for CHANGED conflicts', () => {
      renderBanner({ conflicts: [changedConflict] });

      // The arrow character is &rarr; which renders as \u2192
      expect(screen.getByText(/OriginalName/)).toBeInTheDocument();
    });

    it('shows group item counts in parentheses', () => {
      renderBanner();

      // NEW group has 2 items, CHANGED has 1, MISSING has 3
      expect(screen.getByText('(2)')).toBeInTheDocument();
      expect(screen.getByText('(1)')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });
});
