/**
 * HillMeasureMapping Component Tests
 *
 * Tests for the Hill spreadsheet quality measure mapping page:
 * title rendering, table with 10 mapped measures, dropdown defaults,
 * dropdown change handler, and Export CSV functionality.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import HillMeasureMapping from './HillMeasureMapping';

describe('HillMeasureMapping', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<HillMeasureMapping />);
    expect(
      screen.getByText('Hill Spreadsheet Quality Measure Mapping'),
    ).toBeInTheDocument();
  });

  it('renders the Export CSV button', () => {
    render(<HillMeasureMapping />);
    expect(
      screen.getByRole('button', { name: /export csv/i }),
    ).toBeInTheDocument();
  });

  it('renders all 10 mapped quality measures in the table', () => {
    render(<HillMeasureMapping />);

    const expectedMeasures = [
      'Annual Wellness Visit',
      'Breast Cancer Screening',
      'Colon Cancer Screening',
      'Cervical Cancer Screening',
      'Diabetic Eye Exam',
      'Diabetes Control',
      'Diabetic Nephropathy',
      'GC/Chlamydia Screening',
      'Hypertension Management',
      'Vaccination',
    ];

    for (const measure of expectedMeasures) {
      expect(screen.getByText(measure)).toBeInTheDocument();
    }
  });

  it('renders table headers for all 4 columns', () => {
    render(<HillMeasureMapping />);

    expect(screen.getByText('Request Type')).toBeInTheDocument();
    expect(screen.getByText('Quality Measure')).toBeInTheDocument();
    // Headers use "→" — use getAllByText since "Compliant" appears in both headers
    const headers = screen.getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent);
    expect(headerTexts).toContain('Compliant → Map To');
    expect(headerTexts).toContain('Non Compliant → Map To');
  });

  it('sets compliant default to a "completed" status for AWV', () => {
    render(<HillMeasureMapping />);

    // AWV row: find the row, then the first select (compliant)
    const awvRow = screen.getByText('Annual Wellness Visit').closest('tr')!;
    const selects = within(awvRow).getAllByRole('combobox');

    // Compliant dropdown should default to the "completed" status
    expect(selects[0]).toHaveValue('AWV completed');
  });

  it('sets non-compliant default to "Not Addressed" for AWV', () => {
    render(<HillMeasureMapping />);

    const awvRow = screen.getByText('Annual Wellness Visit').closest('tr')!;
    const selects = within(awvRow).getAllByRole('combobox');

    // Non-compliant dropdown should default to "Not Addressed"
    expect(selects[1]).toHaveValue('Not Addressed');
  });

  it('updates compliant dropdown when user changes selection', async () => {
    render(<HillMeasureMapping />);

    const awvRow = screen.getByText('Annual Wellness Visit').closest('tr')!;
    const selects = within(awvRow).getAllByRole('combobox');

    // Change compliant from default to "AWV scheduled"
    await user.selectOptions(selects[0], 'AWV scheduled');
    expect(selects[0]).toHaveValue('AWV scheduled');
  });

  it('updates non-compliant dropdown when user changes selection', async () => {
    render(<HillMeasureMapping />);

    const awvRow = screen.getByText('Annual Wellness Visit').closest('tr')!;
    const selects = within(awvRow).getAllByRole('combobox');

    // Change non-compliant from "Not Addressed" to "Patient declined AWV"
    await user.selectOptions(selects[1], 'Patient declined AWV');
    expect(selects[1]).toHaveValue('Patient declined AWV');
  });
});
