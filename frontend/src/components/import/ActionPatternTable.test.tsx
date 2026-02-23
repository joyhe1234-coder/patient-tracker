import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ActionPatternTable, type ActionPatternTableProps } from './ActionPatternTable';
import type {
  MergedActionMapping,
  QualityMeasureOption,
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

function makeActionMapping(overrides: Partial<MergedActionMapping> = {}): MergedActionMapping {
  return {
    pattern: '^eye\\s*exam',
    requestType: 'Quality',
    qualityMeasure: 'Diabetic Eye Exam',
    measureStatus: 'Not Addressed',
    isOverride: false,
    isActive: true,
    overrideId: null,
    ...overrides,
  };
}

const defaultActionMappings: MergedActionMapping[] = [
  makeActionMapping(),
  makeActionMapping({
    pattern: '^awv\\b',
    requestType: 'AWV',
    qualityMeasure: 'Annual Wellness Visit',
    measureStatus: 'AWV scheduled',
    isOverride: true,
  }),
];

const defaultSkipActions = ['Patient declined', 'No action needed'];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderTable(overrides: Partial<ActionPatternTableProps> = {}) {
  const defaultProps: ActionPatternTableProps = {
    actionMappings: defaultActionMappings,
    skipActions: defaultSkipActions,
    mode: 'view',
    qualityMeasures: mockQualityMeasures,
    ...overrides,
  };
  return render(<ActionPatternTable {...defaultProps} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActionPatternTable', () => {
  // ------- View Mode -------
  describe('view mode', () => {
    it('renders action patterns with pattern, requestType, and qualityMeasure columns', () => {
      renderTable();

      // Patterns rendered as <code>
      expect(screen.getByText('^eye\\s*exam')).toBeInTheDocument();
      expect(screen.getByText('^awv\\b')).toBeInTheDocument();

      // Request types as badges
      const requestTypeBadges = screen.getAllByText(/Quality|AWV/);
      expect(requestTypeBadges.length).toBeGreaterThanOrEqual(2);

      // Quality measures
      expect(screen.getByText('Diabetic Eye Exam')).toBeInTheDocument();
      expect(screen.getByText('Annual Wellness Visit')).toBeInTheDocument();

      // Measure statuses
      expect(screen.getByText('Not Addressed')).toBeInTheDocument();
      expect(screen.getByText('AWV scheduled')).toBeInTheDocument();
    });

    it('shows Override badge for override mappings and Default for seed mappings', () => {
      renderTable();

      expect(screen.getByText('Override')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('does not render text inputs or dropdowns in view mode', () => {
      renderTable({ mode: 'view' });

      // No text inputs for pattern editing
      expect(screen.queryByLabelText(/Pattern for row/)).not.toBeInTheDocument();

      // No request type dropdowns
      expect(screen.queryByLabelText(/Request type for row/)).not.toBeInTheDocument();

      // No quality measure dropdowns
      expect(screen.queryByLabelText(/Quality measure for row/)).not.toBeInTheDocument();
    });

    it('does not render remove buttons for skip actions in view mode', () => {
      renderTable({ mode: 'view' });

      expect(screen.queryByLabelText(/Remove skip action/)).not.toBeInTheDocument();
    });

    it('renders skip actions list', () => {
      renderTable();

      expect(screen.getByText('Patient declined')).toBeInTheDocument();
      expect(screen.getByText('No action needed')).toBeInTheDocument();
    });

    it('shows empty message when no action mappings exist', () => {
      renderTable({ actionMappings: [] });

      expect(screen.getByText('No action pattern mappings configured.')).toBeInTheDocument();
    });

    it('shows empty message when no skip actions exist', () => {
      renderTable({ skipActions: [] });

      expect(screen.getByText('No skip actions configured.')).toBeInTheDocument();
    });
  });

  // ------- Edit Mode -------
  describe('edit mode', () => {
    it('renders editable pattern input and dropdowns for each row', () => {
      renderTable({ mode: 'edit' });

      // Pattern inputs
      const patternInputs = screen.getAllByLabelText(/Pattern for row/);
      expect(patternInputs).toHaveLength(2);
      expect(patternInputs[0]).toHaveValue('^eye\\s*exam');
      expect(patternInputs[1]).toHaveValue('^awv\\b');

      // Request type dropdowns
      const rtSelects = screen.getAllByLabelText(/Request type for row/);
      expect(rtSelects).toHaveLength(2);

      // Quality measure dropdowns
      const qmSelects = screen.getAllByLabelText(/Quality measure for row/);
      expect(qmSelects).toHaveLength(2);
    });

    it('calls onActionChange when request type dropdown changes', async () => {
      const onActionChange = vi.fn();
      renderTable({
        mode: 'edit',
        actionMappings: [makeActionMapping()],
        onActionChange,
      });

      const rtSelect = screen.getByLabelText('Request type for row 1');
      await userEvent.selectOptions(rtSelect, 'AWV');

      expect(onActionChange).toHaveBeenCalledTimes(1);
      expect(onActionChange).toHaveBeenCalledWith(0, expect.objectContaining({
        pattern: '^eye\\s*exam',
        requestType: 'AWV',
        // Quality measure auto-resets to first available for the new request type
        qualityMeasure: 'Annual Wellness Visit',
      }));
    });

    it('calls onActionChange when quality measure dropdown changes', async () => {
      const onActionChange = vi.fn();
      renderTable({
        mode: 'edit',
        actionMappings: [makeActionMapping()],
        onActionChange,
      });

      const qmSelect = screen.getByLabelText('Quality measure for row 1');
      await userEvent.selectOptions(qmSelect, 'Hypertension Management');

      expect(onActionChange).toHaveBeenCalledTimes(1);
      expect(onActionChange).toHaveBeenCalledWith(0, expect.objectContaining({
        pattern: '^eye\\s*exam',
        requestType: 'Quality',
        qualityMeasure: 'Hypertension Management',
      }));
    });
  });

  // ------- Regex Validation -------
  describe('regex validation', () => {
    it('shows inline error for invalid regex pattern', () => {
      const onActionChange = vi.fn();
      renderTable({
        mode: 'edit',
        actionMappings: [makeActionMapping()],
        onActionChange,
      });

      const patternInput = screen.getByLabelText('Pattern for row 1');

      // Use fireEvent.change because userEvent.type interprets brackets as
      // keyboard modifier syntax, which is not what we want for regex input.
      fireEvent.change(patternInput, { target: { value: '[invalid(' } });

      // Should show error message
      expect(screen.getByText('Invalid regex')).toBeInTheDocument();

      // Input should be marked as invalid
      expect(patternInput).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears error when regex becomes valid', () => {
      const onActionChange = vi.fn();
      renderTable({
        mode: 'edit',
        actionMappings: [makeActionMapping()],
        onActionChange,
      });

      const patternInput = screen.getByLabelText('Pattern for row 1');

      // First, set an invalid regex to trigger the error
      fireEvent.change(patternInput, { target: { value: '[invalid(' } });
      expect(screen.getByText('Invalid regex')).toBeInTheDocument();
      expect(patternInput).toHaveAttribute('aria-invalid', 'true');

      // Now set a valid regex to clear the error
      fireEvent.change(patternInput, { target: { value: '^valid.*pattern$' } });

      // Error should be cleared
      expect(screen.queryByText('Invalid regex')).not.toBeInTheDocument();
      expect(screen.queryByText('Pattern is required')).not.toBeInTheDocument();
      expect(patternInput).toHaveAttribute('aria-invalid', 'false');
    });
  });

  // ------- Skip Actions -------
  describe('skip actions', () => {
    it('adds a new skip action when Add button is clicked', async () => {
      const onSkipActionAdd = vi.fn();
      renderTable({
        mode: 'edit',
        onSkipActionAdd,
      });

      const input = screen.getByLabelText('New skip action text');
      await userEvent.type(input, 'New skip text');

      const addBtn = screen.getByLabelText('Add skip action');
      await userEvent.click(addBtn);

      expect(onSkipActionAdd).toHaveBeenCalledTimes(1);
      expect(onSkipActionAdd).toHaveBeenCalledWith('New skip text');
    });

    it('adds a new skip action when Enter is pressed in the input', async () => {
      const onSkipActionAdd = vi.fn();
      renderTable({
        mode: 'edit',
        onSkipActionAdd,
      });

      const input = screen.getByLabelText('New skip action text');
      await userEvent.type(input, 'Enter skip text{Enter}');

      expect(onSkipActionAdd).toHaveBeenCalledTimes(1);
      expect(onSkipActionAdd).toHaveBeenCalledWith('Enter skip text');
    });

    it('does not add empty/whitespace-only skip action', async () => {
      const onSkipActionAdd = vi.fn();
      renderTable({
        mode: 'edit',
        onSkipActionAdd,
      });

      // Add button should be disabled when input is empty
      const addBtn = screen.getByLabelText('Add skip action');
      expect(addBtn).toBeDisabled();

      // Type spaces only, then click — button should still be disabled
      const input = screen.getByLabelText('New skip action text');
      await userEvent.type(input, '   ');
      // The trimmed value is empty, so button stays disabled
      expect(addBtn).toBeDisabled();
    });

    it('removes a skip action when Remove button is clicked', async () => {
      const onSkipActionRemove = vi.fn();
      renderTable({
        mode: 'edit',
        onSkipActionRemove,
      });

      const removeBtn = screen.getByLabelText('Remove skip action: Patient declined');
      await userEvent.click(removeBtn);

      expect(onSkipActionRemove).toHaveBeenCalledTimes(1);
      expect(onSkipActionRemove).toHaveBeenCalledWith('Patient declined');
    });

    it('clears the input after adding a skip action', async () => {
      const onSkipActionAdd = vi.fn();
      renderTable({
        mode: 'edit',
        onSkipActionAdd,
      });

      const input = screen.getByLabelText('New skip action text');
      await userEvent.type(input, 'Temp text');

      const addBtn = screen.getByLabelText('Add skip action');
      await userEvent.click(addBtn);

      // Input should be cleared
      expect(input).toHaveValue('');
    });
  });

  // ------- onChange callback -------
  describe('onChange callback', () => {
    it('fires onActionChange with updated pattern when pattern input changes', () => {
      const onActionChange = vi.fn();
      renderTable({
        mode: 'edit',
        actionMappings: [makeActionMapping()],
        onActionChange,
      });

      const patternInput = screen.getByLabelText('Pattern for row 1');

      // Use fireEvent.change because the component is controlled and
      // the mock callback doesn't propagate state back.
      fireEvent.change(patternInput, { target: { value: '^new-pattern$' } });

      expect(onActionChange).toHaveBeenCalledTimes(1);
      expect(onActionChange).toHaveBeenCalledWith(0, expect.objectContaining({
        pattern: '^new-pattern$',
        requestType: 'Quality',
        qualityMeasure: 'Diabetic Eye Exam',
        measureStatus: 'Not Addressed',
        isActive: true,
      }));
    });
  });
});
