import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConflictResolutionStep, type ConflictResolutionStepProps } from './ConflictResolutionStep';
import type { ColumnConflict, MergedSystemConfig } from '../../types/import-mapping';

// ---------------------------------------------------------------------------
// Mock the API module
// ---------------------------------------------------------------------------

vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import { api } from '../../api/axios';

// ---------------------------------------------------------------------------
// Mock ConflictBanner so we can assert non-admin rendering delegates to it
// ---------------------------------------------------------------------------

vi.mock('./ConflictBanner', () => ({
  ConflictBanner: ({ conflicts, systemName, onCancel, onCopyDetails }: any) => (
    <div data-testid="conflict-banner">
      <span data-testid="banner-conflict-count">{conflicts?.length ?? 0}</span>
      <span data-testid="banner-system-name">{systemName}</span>
      <button onClick={onCancel}>Banner Cancel</button>
      <button onClick={onCopyDetails}>Banner Copy</button>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

function makeConflict(
  overrides: Partial<ColumnConflict> & Pick<ColumnConflict, 'id' | 'type' | 'sourceHeader'>,
): ColumnConflict {
  return {
    severity: 'BLOCKING',
    category: 'column',
    configColumn: null,
    suggestions: [],
    resolution: null,
    message: `Conflict for ${overrides.sourceHeader}`,
    ...overrides,
  };
}

const newConflict = makeConflict({
  id: 'c1',
  type: 'NEW',
  sourceHeader: 'NewColumn',
  message: 'Column not found in configuration',
  suggestions: [
    { columnName: 'SuggestedCol', score: 0.85, targetType: 'MEASURE', measureInfo: { requestType: 'RT1', qualityMeasure: 'QM1' } },
  ],
});

const changedConflict = makeConflict({
  id: 'c2',
  type: 'CHANGED',
  sourceHeader: 'RenamedColumn',
  configColumn: 'OriginalName',
  message: 'Header changed from original mapping',
  suggestions: [
    { columnName: 'OriginalName', score: 0.9, targetType: 'MEASURE', measureInfo: { requestType: 'RT2', qualityMeasure: 'QM2' } },
  ],
});

const missingConflict = makeConflict({
  id: 'c3',
  type: 'MISSING',
  sourceHeader: 'MissingColumn',
  configColumn: 'MissingColumn',
  message: 'Expected column not found in file',
});

const duplicateConflict = makeConflict({
  id: 'c4',
  type: 'DUPLICATE',
  sourceHeader: 'Eye Exam Revised',
  configColumn: 'Eye Exam',
  message: 'Multiple columns match "Eye Exam"',
  severity: 'BLOCKING',
  suggestions: [
    { columnName: 'Eye Exam', score: 0.88, targetType: 'MEASURE', measureInfo: { requestType: 'Screening', qualityMeasure: 'Eye Exam' } },
  ],
});

const ambiguousConflict = makeConflict({
  id: 'c5',
  type: 'AMBIGUOUS',
  sourceHeader: 'Screening Result',
  configColumn: null,
  message: 'Matches multiple config columns within 5%',
  severity: 'BLOCKING',
  suggestions: [
    { columnName: 'Eye Exam', score: 0.85, targetType: 'MEASURE', measureInfo: { requestType: 'Screening', qualityMeasure: 'Eye Exam' } },
    { columnName: 'Colon Screening', score: 0.83, targetType: 'MEASURE', measureInfo: { requestType: 'Screening', qualityMeasure: 'Colon Screening' } },
  ],
});

const allConflicts: ColumnConflict[] = [newConflict, changedConflict, missingConflict];

const mockUpdatedMapping: MergedSystemConfig = {
  systemId: 'hill',
  systemName: 'Hill Healthcare',
  format: 'wide',
  patientColumns: [],
  measureColumns: [],
  dataColumns: [],
  skipColumns: [],
  actionMappings: [],
  skipActions: [],
  statusMapping: {},
  lastModifiedAt: null,
  lastModifiedBy: null,
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderStep(overrides: Partial<ConflictResolutionStepProps> = {}) {
  const defaultProps: ConflictResolutionStepProps = {
    conflicts: allConflicts,
    systemId: 'hill',
    isAdmin: true,
    onResolved: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  };
  return { ...render(<ConflictResolutionStep {...defaultProps} />), props: defaultProps };
}

/**
 * Resolve all conflicts by selecting the first available option in each
 * conflict row dropdown.
 */
async function resolveAllConflicts(user: ReturnType<typeof userEvent.setup>) {
  // NEW -> "Map to measure"
  const newSelect = screen.getByLabelText('Resolution for NewColumn');
  await user.selectOptions(newSelect, 'MAP_TO_MEASURE');

  // CHANGED -> "Accept suggestion"
  const changedSelect = screen.getByLabelText('Resolution for RenamedColumn');
  await user.selectOptions(changedSelect, 'ACCEPT_SUGGESTION');

  // MISSING -> "Keep mapping"
  const missingSelect = screen.getByLabelText('Resolution for MissingColumn');
  await user.selectOptions(missingSelect, 'KEEP');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConflictResolutionStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Admin view: conflict list with resolution dropdowns
  // -------------------------------------------------------------------------
  describe('Admin view: conflict list rendering', () => {
    it('renders a conflict row with dropdown for each conflict', () => {
      renderStep();

      // Each conflict should have a test-id row and a labelled dropdown
      for (const conflict of allConflicts) {
        expect(screen.getByTestId(`conflict-row-${conflict.id}`)).toBeInTheDocument();
        expect(screen.getByLabelText(`Resolution for ${conflict.sourceHeader}`)).toBeInTheDocument();
      }
    });

    it('renders color-coded count chips for each type', () => {
      renderStep();

      // One of each type in our test data
      expect(screen.getByText(/1.*new/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*renamed/i)).toBeInTheDocument();
      expect(screen.getByText(/1.*missing/i)).toBeInTheDocument();
    });

    it('renders the summary banner with system ID', () => {
      renderStep({ systemId: 'sutter' });

      expect(screen.getByText(/sutter/)).toBeInTheDocument();
    });

    it('renders suggestion badges with score percentages', () => {
      renderStep();

      // newConflict has a suggestion at 0.85 -> "85%"
      expect(screen.getByText('85%')).toBeInTheDocument();
      // changedConflict has a suggestion at 0.9 -> "90%"
      expect(screen.getByText('90%')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 2. Save button disabled when not all resolved
  // -------------------------------------------------------------------------
  it('disables "Save & Continue" when 0 of N conflicts are resolved', () => {
    renderStep();

    const saveButton = screen.getByRole('button', { name: /save.*continue/i });
    expect(saveButton).toBeDisabled();
  });

  it('keeps "Save & Continue" disabled when only some conflicts are resolved', async () => {
    const user = userEvent.setup();
    renderStep();

    // Resolve only the first conflict
    const newSelect = screen.getByLabelText('Resolution for NewColumn');
    await user.selectOptions(newSelect, 'MAP_TO_MEASURE');

    const saveButton = screen.getByRole('button', { name: /save.*continue/i });
    expect(saveButton).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // 3. Save button enabled when all resolved
  // -------------------------------------------------------------------------
  it('enables "Save & Continue" when all conflicts have a resolution selected', async () => {
    const user = userEvent.setup();
    renderStep();

    await resolveAllConflicts(user);

    const saveButton = screen.getByRole('button', { name: /save.*continue/i });
    expect(saveButton).toBeEnabled();
  });

  // -------------------------------------------------------------------------
  // 4. Save calls correct API endpoint with correct body
  // -------------------------------------------------------------------------
  it('calls POST /api/import/mappings/:systemId/resolve with correct body on save', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockUpdatedMapping },
    });

    const onResolved = vi.fn();
    renderStep({ systemId: 'hill', onResolved });

    await resolveAllConflicts(user);

    const saveButton = screen.getByRole('button', { name: /save.*continue/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledOnce();
    });

    const [url, body] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/import/mappings/hill/resolve');
    expect(body).toHaveProperty('resolutions');
    expect(body.resolutions).toHaveLength(3);

    // Verify each resolution includes the correct conflictId and sourceColumn
    const ids = body.resolutions.map((r: any) => r.conflictId);
    expect(ids).toContain('c1');
    expect(ids).toContain('c2');
    expect(ids).toContain('c3');

    // Verify resolution actions
    const resMap = Object.fromEntries(
      body.resolutions.map((r: any) => [r.conflictId, r.resolution]),
    );
    expect(resMap['c1'].action).toBe('MAP_TO_MEASURE');
    expect(resMap['c2'].action).toBe('ACCEPT_SUGGESTION');
    expect(resMap['c3'].action).toBe('KEEP');
  });

  // -------------------------------------------------------------------------
  // 5. onResolved called with updated mapping on success
  // -------------------------------------------------------------------------
  it('calls onResolved with the updated mapping on API success', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockUpdatedMapping },
    });

    const onResolved = vi.fn();
    renderStep({ onResolved });

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(onResolved).toHaveBeenCalledOnce();
    });
    expect(onResolved).toHaveBeenCalledWith(mockUpdatedMapping);
  });

  // -------------------------------------------------------------------------
  // 6. Cancel calls onCancel without API call
  // -------------------------------------------------------------------------
  it('"Cancel" button calls onCancel without making an API call', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderStep({ onCancel });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(api.post).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 7. Non-admin view renders ConflictBanner
  // -------------------------------------------------------------------------
  describe('Non-admin view', () => {
    it('renders ConflictBanner instead of resolution form when isAdmin=false', () => {
      renderStep({ isAdmin: false });

      // ConflictBanner mock is rendered
      expect(screen.getByTestId('conflict-banner')).toBeInTheDocument();
      expect(screen.getByTestId('banner-conflict-count')).toHaveTextContent('3');
      expect(screen.getByTestId('banner-system-name')).toHaveTextContent('hill');

      // Resolution form elements should NOT be present
      expect(screen.queryByRole('button', { name: /save.*continue/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('delegates onCancel to ConflictBanner', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();
      renderStep({ isAdmin: false, onCancel });

      await user.click(screen.getByRole('button', { name: 'Banner Cancel' }));

      expect(onCancel).toHaveBeenCalledOnce();
    });
  });

  // -------------------------------------------------------------------------
  // 8. Loading state during API call
  // -------------------------------------------------------------------------
  it('shows loading state while API call is in progress', async () => {
    const user = userEvent.setup();

    // Make api.post return a promise that never resolves (simulates in-flight)
    let resolvePost!: (value: any) => void;
    (api.post as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => { resolvePost = resolve; }),
    );

    renderStep();

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    // Should show "Saving..." text
    expect(screen.getByText('Saving...')).toBeInTheDocument();

    // Save button should be disabled during saving
    const saveButton = screen.getByRole('button', { name: /saving/i });
    expect(saveButton).toBeDisabled();

    // Cancel button should also be disabled during saving
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelButton).toBeDisabled();

    // Resolve the pending promise to clean up
    resolvePost({ data: { data: mockUpdatedMapping } });
  });

  // -------------------------------------------------------------------------
  // 9. Error message on API failure
  // -------------------------------------------------------------------------
  it('shows error message on API failure', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { error: { message: 'Conflict resolution failed: invalid mapping' } } },
    });

    renderStep();

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Conflict resolution failed: invalid mapping')).toBeInTheDocument();
  });

  it('shows fallback error message when API error has no message', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));

    renderStep();

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 10. Progress indicator updates
  // -------------------------------------------------------------------------
  it('updates progress text as conflicts are resolved', async () => {
    const user = userEvent.setup();
    renderStep();

    // Initially 0 of 3 (appears in both sr-only aria-live and visible span)
    const initial = screen.getAllByText('0 of 3 conflicts resolved');
    expect(initial).toHaveLength(2);

    // Resolve one
    const newSelect = screen.getByLabelText('Resolution for NewColumn');
    await user.selectOptions(newSelect, 'MAP_TO_MEASURE');

    const afterOne = screen.getAllByText('1 of 3 conflicts resolved');
    expect(afterOne).toHaveLength(2);

    // Resolve all
    const changedSelect = screen.getByLabelText('Resolution for RenamedColumn');
    await user.selectOptions(changedSelect, 'ACCEPT_SUGGESTION');

    const missingSelect = screen.getByLabelText('Resolution for MissingColumn');
    await user.selectOptions(missingSelect, 'KEEP');

    const afterAll = screen.getAllByText('3 of 3 conflicts resolved');
    expect(afterAll).toHaveLength(2);
    expect(screen.getByText('All resolved')).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 11. ACCEPT_SUGGESTION auto-populates suggestion data
  // -------------------------------------------------------------------------
  it('auto-populates targetMeasure when ACCEPT_SUGGESTION is selected for a CHANGED conflict', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockUpdatedMapping },
    });

    const onResolved = vi.fn();
    renderStep({ onResolved });

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledOnce();
    });

    const [, body] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
    const changedRes = body.resolutions.find((r: any) => r.conflictId === 'c2');
    expect(changedRes.resolution.action).toBe('ACCEPT_SUGGESTION');
    expect(changedRes.resolution.suggestionIndex).toBe(0);
    expect(changedRes.resolution.targetMeasure).toEqual({
      requestType: 'RT2',
      qualityMeasure: 'QM2',
    });
  });

  // -------------------------------------------------------------------------
  // 12. Progress bar ARIA attributes
  // -------------------------------------------------------------------------
  it('renders a progressbar with correct ARIA attributes', async () => {
    const user = userEvent.setup();
    renderStep();

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '0');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '3');

    // Resolve one
    await user.selectOptions(screen.getByLabelText('Resolution for NewColumn'), 'MAP_TO_MEASURE');

    expect(progressbar).toHaveAttribute('aria-valuenow', '1');
  });

  // -------------------------------------------------------------------------
  // 13. Error is cleared when a new resolution is selected
  // -------------------------------------------------------------------------
  it('clears error message when a new resolution is selected after failure', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
      response: { data: { error: { message: 'Server error' } } },
    });

    renderStep();

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });

    // Change a resolution -- error should be cleared
    await user.selectOptions(screen.getByLabelText('Resolution for NewColumn'), 'IGNORE');

    expect(screen.queryByText('Server error')).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 14. systemId is URL-encoded in the API call
  // -------------------------------------------------------------------------
  it('URL-encodes systemId in the API path', async () => {
    const user = userEvent.setup();
    (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { data: mockUpdatedMapping },
    });

    renderStep({ systemId: 'system with spaces' });

    await resolveAllConflicts(user);
    await user.click(screen.getByRole('button', { name: /save.*continue/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledOnce();
    });

    const [url] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/import/mappings/system%20with%20spaces/resolve');
  });

  // -------------------------------------------------------------------------
  // 15. DUPLICATE and AMBIGUOUS conflict resolution (GAP-01)
  // -------------------------------------------------------------------------
  describe('DUPLICATE and AMBIGUOUS conflict resolution (GAP-01)', () => {
    it('TC-CR-16: renders DUPLICATE resolution options ("Select this mapping", "Ignore others")', () => {
      renderStep({ conflicts: [duplicateConflict] });

      const select = screen.getByLabelText('Resolution for Eye Exam Revised');
      expect(select).toBeInTheDocument();

      // DUPLICATE options: "Select this mapping", "Ignore others"
      const options = within(select).getAllByRole('option');
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts).toContain('Select this mapping');
      expect(optionTexts).toContain('Ignore others');
    });

    it('TC-CR-17: renders AMBIGUOUS resolution options ("Select correct mapping")', () => {
      renderStep({ conflicts: [ambiguousConflict] });

      const select = screen.getByLabelText('Resolution for Screening Result');
      expect(select).toBeInTheDocument();

      const options = within(select).getAllByRole('option');
      const optionTexts = options.map(o => o.textContent);
      expect(optionTexts).toContain('Select correct mapping');
    });

    it('TC-CR-16b: DUPLICATE resolution saves with ACCEPT_SUGGESTION action', async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: mockUpdatedMapping },
      });

      const onResolved = vi.fn();
      renderStep({ conflicts: [duplicateConflict], onResolved });

      const select = screen.getByLabelText('Resolution for Eye Exam Revised');
      await user.selectOptions(select, 'ACCEPT_SUGGESTION');

      const saveButton = screen.getByRole('button', { name: /save.*continue/i });
      expect(saveButton).toBeEnabled();
      await user.click(saveButton);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledOnce();
      });

      const [, body] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
      const dupeRes = body.resolutions.find((r: any) => r.conflictId === 'c4');
      expect(dupeRes.resolution.action).toBe('ACCEPT_SUGGESTION');
    });
  });

  // -------------------------------------------------------------------------
  // 16. 409 optimistic locking error (GAP-10)
  // -------------------------------------------------------------------------
  describe('409 optimistic locking error (GAP-10)', () => {
    it('TC-CR-18: shows 409 error message', async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        response: { status: 409, data: { error: { message: 'Mapping has been modified by another user. Please refresh and try again.' } } },
      });

      renderStep();

      await resolveAllConflicts(user);
      await user.click(screen.getByRole('button', { name: /save.*continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
      expect(screen.getByText(/modified by another user/)).toBeInTheDocument();
    });

    it('TC-CR-18b: Save button re-enabled after 409 for retry', async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValueOnce({
        response: { status: 409, data: { error: { message: 'Mapping modified' } } },
      });

      renderStep();

      await resolveAllConflicts(user);
      await user.click(screen.getByRole('button', { name: /save.*continue/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // Save button should be re-enabled so user can retry
      const saveButton = screen.getByRole('button', { name: /save.*continue/i });
      expect(saveButton).toBeEnabled();
    });
  });

  // -------------------------------------------------------------------------
  // 17. Admin resolution change (GAP-35)
  // -------------------------------------------------------------------------
  describe('Admin resolution change (GAP-35)', () => {
    it('TC-CR-19: changing MAP_TO_MEASURE to IGNORE saves the final choice', async () => {
      const user = userEvent.setup();
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { data: mockUpdatedMapping },
      });

      const onResolved = vi.fn();
      renderStep({ onResolved });

      // First select MAP_TO_MEASURE for the NEW conflict
      const newSelect = screen.getByLabelText('Resolution for NewColumn');
      await user.selectOptions(newSelect, 'MAP_TO_MEASURE');

      // Then change to IGNORE
      await user.selectOptions(newSelect, 'IGNORE');

      // Resolve remaining conflicts
      const changedSelect = screen.getByLabelText('Resolution for RenamedColumn');
      await user.selectOptions(changedSelect, 'ACCEPT_SUGGESTION');
      const missingSelect = screen.getByLabelText('Resolution for MissingColumn');
      await user.selectOptions(missingSelect, 'KEEP');

      await user.click(screen.getByRole('button', { name: /save.*continue/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledOnce();
      });

      const [, body] = (api.post as ReturnType<typeof vi.fn>).mock.calls[0];
      const newRes = body.resolutions.find((r: any) => r.conflictId === 'c1');
      expect(newRes.resolution.action).toBe('IGNORE');
    });
  });

  // -------------------------------------------------------------------------
  // 18. Role-specific rendering (GAP-07)
  // -------------------------------------------------------------------------
  describe('Role-specific rendering (GAP-07)', () => {
    it('TC-NA-8: isAdmin=true shows resolution form, not banner', () => {
      renderStep({ isAdmin: true });

      // Admin should see the resolution form
      expect(screen.getByRole('button', { name: /save.*continue/i })).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Admin should NOT see the ConflictBanner
      expect(screen.queryByTestId('conflict-banner')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // 19. XSS protection regression tests (R14)
  // -------------------------------------------------------------------------
  describe('XSS protection', () => {
    it('renders <script> tag in sourceHeader as visible text, not executable', () => {
      const xssConflict = makeConflict({
        id: 'xss1',
        type: 'NEW',
        sourceHeader: '<script>alert("xss")</script>',
      });
      renderStep({ conflicts: [xssConflict] });

      expect(screen.getByText('<script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('renders img onerror payload in sourceHeader as escaped text', () => {
      const xssConflict = makeConflict({
        id: 'xss2',
        type: 'NEW',
        sourceHeader: '<img onerror=alert(1) src=x>',
      });
      renderStep({ conflicts: [xssConflict] });

      expect(screen.getByText('<img onerror=alert(1) src=x>')).toBeInTheDocument();
    });

    it('renders attribute injection payload in sourceHeader as escaped text', () => {
      const xssConflict = makeConflict({
        id: 'xss3',
        type: 'NEW',
        sourceHeader: '" onmouseover="alert(1)"',
      });
      renderStep({ conflicts: [xssConflict] });

      expect(screen.getByText('" onmouseover="alert(1)"')).toBeInTheDocument();
    });
  });
});
