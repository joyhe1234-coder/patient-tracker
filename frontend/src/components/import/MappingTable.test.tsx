import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MappingTable, type MappingTableProps } from './MappingTable';
import type {
  MergedColumnMapping,
  QualityMeasureOption,
  PatientFieldOption,
  FuzzySuggestion,
} from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockQualityMeasures: QualityMeasureOption[] = [
  { requestType: 'AWV', qualityMeasure: 'Annual Wellness Visit', label: 'Annual Wellness Visit' },
  { requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam', label: 'Diabetic Eye Exam' },
  { requestType: 'Quality', qualityMeasure: 'Hypertension Management', label: 'Hypertension Management' },
  { requestType: 'Screening', qualityMeasure: 'Breast Cancer Screening', label: 'Breast Cancer Screening' },
];

const mockPatientFields: PatientFieldOption[] = [
  { field: 'memberName', label: 'Member Name' },
  { field: 'memberDob', label: 'Date of Birth' },
  { field: 'memberId', label: 'Member ID' },
];

function makeMeasureMapping(overrides: Partial<MergedColumnMapping> = {}): MergedColumnMapping {
  return {
    sourceColumn: 'Eye Exam Status',
    targetType: 'MEASURE',
    targetField: null,
    requestType: 'Quality',
    qualityMeasure: 'Diabetic Eye Exam',
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

function makePatientMapping(overrides: Partial<MergedColumnMapping> = {}): MergedColumnMapping {
  return {
    sourceColumn: 'Patient Name',
    targetType: 'PATIENT',
    targetField: 'memberName',
    requestType: null,
    qualityMeasure: null,
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

function makeDataMapping(overrides: Partial<MergedColumnMapping> = {}): MergedColumnMapping {
  return {
    sourceColumn: 'Notes',
    targetType: 'DATA',
    targetField: null,
    requestType: null,
    qualityMeasure: null,
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

function makeIgnoredMapping(overrides: Partial<MergedColumnMapping> = {}): MergedColumnMapping {
  return {
    sourceColumn: 'Internal ID',
    targetType: 'IGNORED',
    targetField: null,
    requestType: null,
    qualityMeasure: null,
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

const defaultMappings: MergedColumnMapping[] = [
  makeMeasureMapping(),
  makePatientMapping(),
  makeDataMapping(),
  makeIgnoredMapping(),
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderTable(overrides: Partial<MappingTableProps> = {}) {
  const defaultProps: MappingTableProps = {
    mappings: defaultMappings,
    mode: 'view',
    qualityMeasures: mockQualityMeasures,
    patientFields: mockPatientFields,
    ...overrides,
  };
  return render(<MappingTable {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MappingTable', () => {
  // ------- View Mode -------
  describe('view mode', () => {
    it('renders sourceColumn, targetType badge, and target description for each mapping', () => {
      renderTable();

      // Source columns
      expect(screen.getByText('Eye Exam Status')).toBeInTheDocument();
      expect(screen.getByText('Patient Name')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Internal ID')).toBeInTheDocument();

      // Target type badges
      expect(screen.getByText('MEASURE')).toBeInTheDocument();
      expect(screen.getByText('PATIENT')).toBeInTheDocument();
      expect(screen.getByText('DATA')).toBeInTheDocument();
      expect(screen.getByText('IGNORED')).toBeInTheDocument();

      // Target descriptions
      expect(screen.getByText('Quality / Diabetic Eye Exam')).toBeInTheDocument();
      expect(screen.getByText('memberName')).toBeInTheDocument();
      expect(screen.getByText('Data column')).toBeInTheDocument();
      expect(screen.getByText('Ignored')).toBeInTheDocument();
    });

    it('does not render dropdowns or delete buttons in view mode', () => {
      renderTable({ mode: 'view' });

      // No select elements (dropdowns) in view mode
      expect(screen.queryAllByRole('combobox')).toHaveLength(0);

      // No delete buttons
      expect(screen.queryByLabelText(/Delete mapping/)).not.toBeInTheDocument();

      // No "Actions" column header
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });

    it('shows Override badge when isOverride is true', () => {
      renderTable({
        mappings: [makeMeasureMapping({ isOverride: true })],
      });

      // "Override" appears both in the column header and as a badge span.
      // Verify the badge span (bg-amber) exists inside the tbody.
      const tbody = screen.getAllByRole('rowgroup')[1]; // tbody is the second rowgroup
      expect(within(tbody).getByText('Override')).toBeInTheDocument();
    });

    it('shows empty state when mappings array is empty', () => {
      renderTable({ mappings: [] });

      expect(screen.getByText('No column mappings to display.')).toBeInTheDocument();
    });
  });

  // ------- Edit Mode -------
  describe('edit mode', () => {
    it('renders target type dropdown for each row', () => {
      renderTable({ mode: 'edit' });

      const targetTypeSelects = screen.getAllByLabelText(/Target type for/);
      expect(targetTypeSelects).toHaveLength(defaultMappings.length);
    });

    it('calls onMappingChange when target type dropdown changes', async () => {
      const onMappingChange = vi.fn();
      renderTable({
        mode: 'edit',
        mappings: [makeMeasureMapping()],
        onMappingChange,
      });

      const targetTypeSelect = screen.getByLabelText('Target type for Eye Exam Status');
      await userEvent.selectOptions(targetTypeSelect, 'PATIENT');

      expect(onMappingChange).toHaveBeenCalledWith('Eye Exam Status', expect.objectContaining({
        sourceColumn: 'Eye Exam Status',
        targetType: 'PATIENT',
        targetField: '',
      }));
    });

    it('renders request type and quality measure dropdowns for MEASURE mapping', async () => {
      const onMappingChange = vi.fn();
      renderTable({
        mode: 'edit',
        mappings: [makeMeasureMapping()],
        onMappingChange,
      });

      // Request type dropdown
      const rtSelect = screen.getByLabelText('Request type for Eye Exam Status');
      expect(rtSelect).toBeInTheDocument();
      expect(rtSelect).toHaveValue('Quality');

      // Quality measure dropdown (visible because requestType is set)
      const qmSelect = screen.getByLabelText('Quality measure for Eye Exam Status');
      expect(qmSelect).toBeInTheDocument();
      expect(qmSelect).toHaveValue('Diabetic Eye Exam');

      // Change quality measure
      await userEvent.selectOptions(qmSelect, 'Hypertension Management');

      expect(onMappingChange).toHaveBeenCalledWith('Eye Exam Status', expect.objectContaining({
        sourceColumn: 'Eye Exam Status',
        targetType: 'MEASURE',
        requestType: 'Quality',
        qualityMeasure: 'Hypertension Management',
      }));
    });

    it('shows Actions column header in edit mode', () => {
      renderTable({ mode: 'edit' });

      expect(screen.getByText('Actions')).toBeInTheDocument();
    });
  });

  // ------- PATIENT targetType -------
  describe('PATIENT targetType in edit mode', () => {
    it('renders patient field dropdown instead of measure dropdowns', () => {
      renderTable({
        mode: 'edit',
        mappings: [makePatientMapping()],
      });

      // Patient field dropdown should be present
      const pfSelect = screen.getByLabelText('Patient field for Patient Name');
      expect(pfSelect).toBeInTheDocument();
      expect(pfSelect).toHaveValue('memberName');

      // Measure dropdowns should NOT be present
      expect(screen.queryByLabelText(/Request type for/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/Quality measure for/)).not.toBeInTheDocument();
    });

    it('calls onMappingChange with targetField when patient field changes', async () => {
      const onMappingChange = vi.fn();
      renderTable({
        mode: 'edit',
        mappings: [makePatientMapping()],
        onMappingChange,
      });

      const pfSelect = screen.getByLabelText('Patient field for Patient Name');
      await userEvent.selectOptions(pfSelect, 'memberDob');

      expect(onMappingChange).toHaveBeenCalledWith('Patient Name', expect.objectContaining({
        sourceColumn: 'Patient Name',
        targetType: 'PATIENT',
        targetField: 'memberDob',
      }));
    });
  });

  // ------- Resolve Mode -------
  describe('resolve mode', () => {
    it('shows fuzzy match suggestion with score percentage badge', () => {
      const suggestions: Record<string, FuzzySuggestion[]> = {
        'Eye Exam Status': [
          {
            columnName: 'Diabetic Eye Exam Result',
            score: 0.85,
            targetType: 'MEASURE',
            measureInfo: { requestType: 'Quality', qualityMeasure: 'Diabetic Eye Exam' },
          },
        ],
      };

      renderTable({
        mode: 'resolve',
        mappings: [makeMeasureMapping()],
        suggestions,
      });

      // Best match label and column name
      expect(screen.getByText(/Best match:/)).toBeInTheDocument();
      expect(screen.getByText('Diabetic Eye Exam Result')).toBeInTheDocument();

      // Score badge — the percentage text appears both in the suggestion badge
      // and in the quality measure dropdown option, so we use getAllByText
      const scoreBadges = screen.getAllByText(/85% match/);
      expect(scoreBadges.length).toBeGreaterThanOrEqual(1);
    });

    it('applies green badge class for high score (>=0.8)', () => {
      const suggestions: Record<string, FuzzySuggestion[]> = {
        'Eye Exam Status': [
          { columnName: 'Eye Exam', score: 0.9, targetType: 'MEASURE' },
        ],
      };

      renderTable({
        mode: 'resolve',
        mappings: [makeMeasureMapping()],
        suggestions,
      });

      const badge = screen.getByText(/90% match/);
      expect(badge).toHaveClass('bg-green-100');
    });

    it('applies amber badge class for medium score (>=0.6, <0.8)', () => {
      const suggestions: Record<string, FuzzySuggestion[]> = {
        'Eye Exam Status': [
          { columnName: 'Eye Check', score: 0.65, targetType: 'MEASURE' },
        ],
      };

      renderTable({
        mode: 'resolve',
        mappings: [makeMeasureMapping()],
        suggestions,
      });

      const badge = screen.getByText(/65% match/);
      expect(badge).toHaveClass('bg-amber-100');
    });

    it('applies red badge class for low score (<0.6)', () => {
      const suggestions: Record<string, FuzzySuggestion[]> = {
        'Eye Exam Status': [
          { columnName: 'Something', score: 0.35, targetType: 'MEASURE' },
        ],
      };

      renderTable({
        mode: 'resolve',
        mappings: [makeMeasureMapping()],
        suggestions,
      });

      const badge = screen.getByText(/35% match/);
      expect(badge).toHaveClass('bg-red-100');
    });

    it('does not show suggestion when no suggestions exist for a column', () => {
      renderTable({
        mode: 'resolve',
        mappings: [makeMeasureMapping()],
        suggestions: {},
      });

      expect(screen.queryByText(/Best match:/)).not.toBeInTheDocument();
    });
  });

  // ------- Truncation -------
  describe('long column name truncation', () => {
    it('truncates names longer than 100 characters with ellipsis and full name in title', () => {
      const longName = 'A'.repeat(120);
      renderTable({
        mappings: [makeMeasureMapping({ sourceColumn: longName })],
      });

      // The text should be truncated to 100 chars + ellipsis
      const truncated = 'A'.repeat(100) + '\u2026';
      expect(screen.getByText(truncated)).toBeInTheDocument();

      // The title attribute should contain the full name
      const cell = screen.getByTitle(longName);
      expect(cell).toBeInTheDocument();
    });

    it('does not truncate names that are exactly 100 characters', () => {
      const exact100 = 'B'.repeat(100);
      renderTable({
        mappings: [makeMeasureMapping({ sourceColumn: exact100 })],
      });

      expect(screen.getByText(exact100)).toBeInTheDocument();
    });
  });

  // ------- XSS Protection -------
  describe('XSS protection', () => {
    it('renders <script> tag in sourceColumn as visible text, not executable', () => {
      renderTable({
        mappings: [makeMeasureMapping({ sourceColumn: '<script>alert("xss")</script>' })],
      });

      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('renders img onerror payload in sourceColumn as escaped text', () => {
      renderTable({
        mappings: [makeMeasureMapping({ sourceColumn: '<img onerror=alert(1) src=x>' })],
      });

      expect(screen.getByText('<img onerror=alert(1) src=x>')).toBeInTheDocument();
    });
  });

  // ------- Delete Button -------
  describe('delete button', () => {
    it('calls onDelete with correct sourceColumn when clicked', async () => {
      const onDelete = vi.fn();
      renderTable({
        mode: 'edit',
        mappings: [makeMeasureMapping({ sourceColumn: 'Col To Delete' })],
        onDelete,
      });

      const deleteBtn = screen.getByLabelText('Delete mapping for Col To Delete');
      await userEvent.click(deleteBtn);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith('Col To Delete');
    });

    it('renders a delete button for each row in edit mode', () => {
      renderTable({ mode: 'edit' });

      const deleteButtons = screen.getAllByLabelText(/Delete mapping for/);
      expect(deleteButtons).toHaveLength(defaultMappings.length);
    });
  });
});
