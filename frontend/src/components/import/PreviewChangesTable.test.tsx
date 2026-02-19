import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PreviewChangesTable from './PreviewChangesTable';
import type { PreviewChangesTableProps } from './PreviewChangesTable';

const baseChanges = [
  {
    action: 'INSERT' as const,
    memberName: 'John Smith',
    memberDob: '1965-01-15',
    requestType: 'Quality',
    qualityMeasure: 'Diabetic Eye Exam',
    oldStatus: null,
    newStatus: 'Completed',
    reason: 'New patient+measure',
  },
  {
    action: 'UPDATE' as const,
    memberName: 'Jane Doe',
    memberDob: '1970-03-22',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    oldStatus: 'Not Addressed',
    newStatus: 'AWV completed',
    reason: 'Status upgrade',
  },
  {
    action: 'SKIP' as const,
    memberName: 'Bob Wilson',
    memberDob: null,
    requestType: 'Screening',
    qualityMeasure: 'Breast Cancer Screening',
    oldStatus: 'Completed',
    newStatus: 'Completed',
    reason: 'No change needed',
  },
];

const renderTable = (props: Partial<PreviewChangesTableProps> = {}) => {
  return render(
    <PreviewChangesTable
      changes={props.changes ?? baseChanges}
      activeFilter={props.activeFilter ?? 'all'}
      totalChanges={props.totalChanges ?? baseChanges.length}
      previewColumns={props.previewColumns}
    />
  );
};

describe('PreviewChangesTable', () => {
  describe('Base Columns', () => {
    it('renders all base column headers', () => {
      renderTable();

      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Quality Measure')).toBeInTheDocument();
      expect(screen.getByText('Old Status')).toBeInTheDocument();
      expect(screen.getByText('New Status')).toBeInTheDocument();
      expect(screen.getByText('Reason')).toBeInTheDocument();
    });

    it('renders change rows with patient data', () => {
      renderTable();

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('renders action badges with correct text', () => {
      renderTable();

      expect(screen.getByText('INSERT')).toBeInTheDocument();
      expect(screen.getByText('UPDATE')).toBeInTheDocument();
      expect(screen.getByText('SKIP')).toBeInTheDocument();
    });

    it('renders DOB below patient name when present', () => {
      renderTable();

      expect(screen.getByText('1965-01-15')).toBeInTheDocument();
      expect(screen.getByText('1970-03-22')).toBeInTheDocument();
    });

    it('shows dash for null old/new status', () => {
      renderTable();

      // INSERT row has null oldStatus → renders '-'
      // Count dashes in the table (multiple cells can have '-')
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders request type badges', () => {
      renderTable();

      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('AWV')).toBeInTheDocument();
      expect(screen.getByText('Screening')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows all changes when filter is "all"', () => {
      renderTable({ activeFilter: 'all' });

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('filters to INSERT only', () => {
      renderTable({ activeFilter: 'INSERT' });

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('filters to UPDATE only', () => {
      renderTable({ activeFilter: 'UPDATE' });

      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    });

    it('shows empty message when filter matches no rows', () => {
      renderTable({ activeFilter: 'DELETE' });

      expect(screen.getByText('No changes match the selected filter.')).toBeInTheDocument();
    });
  });

  describe('Dynamic Preview Columns', () => {
    const previewColumns = [
      { field: 'statusDate', label: 'Status Date', source: 'Measure Details' },
      { field: 'sourceActionText', label: 'Possible Actions Needed', source: 'Possible Actions Needed' },
    ];

    const changesWithExtra = baseChanges.map((c, i) => ({
      ...c,
      extraColumns: i === 0
        ? { statusDate: '2024-01-15', sourceActionText: 'Schedule follow-up' }
        : i === 1
          ? { statusDate: '2024-02-20', sourceActionText: null }
          : undefined,
    }));

    it('renders dynamic column headers from previewColumns', () => {
      renderTable({ previewColumns, changes: changesWithExtra });

      expect(screen.getByText('Status Date')).toBeInTheDocument();
      expect(screen.getByText('Possible Actions Needed')).toBeInTheDocument();
    });

    it('renders extraColumns data in dynamic cells', () => {
      renderTable({ previewColumns, changes: changesWithExtra });

      expect(screen.getByText('2024-01-15')).toBeInTheDocument();
      expect(screen.getByText('Schedule follow-up')).toBeInTheDocument();
      expect(screen.getByText('2024-02-20')).toBeInTheDocument();
    });

    it('shows dash for null or missing extraColumns values', () => {
      renderTable({ previewColumns, changes: changesWithExtra });

      // Row 1 (UPDATE): sourceActionText is null → '-'
      // Row 2 (SKIP): no extraColumns at all → '-' for both columns
      const dashes = screen.getAllByText('-');
      // At least 3 dashes for missing extra column values (null action text + 2 from SKIP row)
      // plus any from null base column values
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });

    it('does not render extra columns when previewColumns is undefined', () => {
      renderTable({ changes: changesWithExtra });

      expect(screen.queryByText('Status Date')).not.toBeInTheDocument();
      expect(screen.queryByText('Possible Actions Needed')).not.toBeInTheDocument();
    });

    it('does not render extra columns when previewColumns is empty', () => {
      renderTable({ previewColumns: [], changes: changesWithExtra });

      expect(screen.queryByText('Status Date')).not.toBeInTheDocument();
      expect(screen.queryByText('Possible Actions Needed')).not.toBeInTheDocument();
    });

    it('empty state has correct colSpan with extra columns', () => {
      renderTable({
        previewColumns,
        changes: [],
        activeFilter: 'all',
        totalChanges: 0,
      });

      // 7 base columns + 2 extra = 9
      const emptyCell = screen.getByText('No changes match the selected filter.').closest('td');
      expect(emptyCell).toHaveAttribute('colspan', '9');
    });
  });

  describe('Overflow Indicator', () => {
    it('shows overflow message when totalChanges > 50', () => {
      renderTable({ totalChanges: 100 });

      expect(screen.getByText(/Showing first 50 changes/)).toBeInTheDocument();
    });

    it('does not show overflow message when totalChanges <= 50', () => {
      renderTable({ totalChanges: 50 });

      expect(screen.queryByText(/Showing first 50 changes/)).not.toBeInTheDocument();
    });
  });

  describe('Action Color Badges', () => {
    it('applies green color for INSERT action', () => {
      renderTable({ activeFilter: 'INSERT' });

      const badge = screen.getByText('INSERT');
      expect(badge.className).toContain('bg-green-100');
    });

    it('applies blue color for UPDATE action', () => {
      renderTable({ activeFilter: 'UPDATE' });

      const badge = screen.getByText('UPDATE');
      expect(badge.className).toContain('bg-blue-100');
    });

    it('applies green color for "completed" new status', () => {
      const completedChanges = [{
        ...baseChanges[0],
        newStatus: 'AWV completed',
      }];
      renderTable({ changes: completedChanges });

      const statusBadge = screen.getByText('AWV completed');
      expect(statusBadge.className).toContain('bg-green-100');
    });
  });
});
