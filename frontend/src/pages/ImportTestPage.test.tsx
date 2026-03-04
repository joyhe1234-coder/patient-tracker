/**
 * ImportTestPage Component Tests
 *
 * Tests for the dev/admin import diagnostic page: title, file upload,
 * button disabled states, loading states, error display, mode toggle,
 * API calls for parse/transform/validate/preview, and tab navigation.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock API
const mockPost = vi.fn();
vi.mock('../api/axios', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import ImportTestPage from './ImportTestPage';

describe('ImportTestPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<ImportTestPage />);
    expect(screen.getByText('Import Test Page')).toBeInTheDocument();
  });

  it('renders the Upload File section', () => {
    render(<ImportTestPage />);
    expect(screen.getByText('Upload File')).toBeInTheDocument();
  });

  it('renders file input that accepts csv and xlsx', () => {
    render(<ImportTestPage />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toBe('.csv,.xlsx,.xls');
  });

  it('disables all action buttons when no file is selected', () => {
    render(<ImportTestPage />);

    expect(screen.getByRole('button', { name: 'Parse' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Transform' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Validate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview Import' })).toBeDisabled();
  });

  it('enables action buttons after a file is selected', async () => {
    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    await user.upload(fileInput, testFile);

    expect(screen.getByRole('button', { name: 'Parse' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Transform' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Validate' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview Import' })).not.toBeDisabled();
  });

  it('displays selected file name and size after upload', async () => {
    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const content = 'a'.repeat(2048); // 2 KB
    const testFile = new File([content], 'patients.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await user.upload(fileInput, testFile);

    expect(screen.getByText(/Selected: patients\.xlsx/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it('renders the import mode selector with Merge and Replace options', () => {
    render(<ImportTestPage />);

    const modeSelect = screen.getByRole('combobox');
    expect(modeSelect).toBeInTheDocument();
    expect(screen.getByText('Merge Mode')).toBeInTheDocument();
    expect(screen.getByText('Replace All')).toBeInTheDocument();
  });

  it('calls parse API when Parse button is clicked', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          fileName: 'test.csv',
          fileType: 'csv',
          totalRows: 5,
          headers: ['Name', 'DOB'],
          columnValidation: { valid: true, missing: [] },
          previewRows: [],
        },
      },
    });

    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByRole('button', { name: 'Parse' }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/import/parse',
        expect.any(FormData),
        expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
      );
    });
  });

  it('shows error message when API call fails', async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: { message: 'Invalid file format' } } },
    });

    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByRole('button', { name: 'Parse' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid file format')).toBeInTheDocument();
    });
  });

  it('does not show tab navigation when no results exist', () => {
    render(<ImportTestPage />);

    expect(screen.queryByText('Parse Results')).not.toBeInTheDocument();
    expect(screen.queryByText('Transform Results')).not.toBeInTheDocument();
  });

  it('shows tab navigation after a successful parse', async () => {
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          fileName: 'test.csv',
          fileType: 'csv',
          totalRows: 5,
          headers: ['Name', 'DOB'],
          columnValidation: { valid: true, missing: [] },
          previewRows: [],
        },
      },
    });

    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByRole('button', { name: 'Parse' }));

    // "Parse Results" appears as both tab button and h2 heading
    await waitFor(() => {
      const matches = screen.getAllByText('Parse Results');
      expect(matches.length).toBeGreaterThanOrEqual(2); // tab button + section heading
    });
  });

  it('clears previous results when a new file is selected', async () => {
    // First, do a successful parse
    mockPost.mockResolvedValue({
      data: {
        success: true,
        data: {
          fileName: 'test.csv',
          fileType: 'csv',
          totalRows: 5,
          headers: ['Name', 'DOB'],
          columnValidation: { valid: true, missing: [] },
          previewRows: [],
        },
      },
    });

    render(<ImportTestPage />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['test'], 'test.csv', { type: 'text/csv' });
    await user.upload(fileInput, testFile);
    await user.click(screen.getByRole('button', { name: 'Parse' }));

    // Wait for results to appear
    await waitFor(() => {
      expect(screen.getAllByText('Parse Results').length).toBeGreaterThanOrEqual(2);
    });

    // Select a new file — results should clear (only 0 or maybe initial tab state)
    const newFile = new File(['new'], 'new.csv', { type: 'text/csv' });
    await user.upload(fileInput, newFile);

    // The tab nav and results section should be gone — no "Parse Results" anywhere
    expect(screen.queryAllByText('Parse Results')).toHaveLength(0);
  });
});
