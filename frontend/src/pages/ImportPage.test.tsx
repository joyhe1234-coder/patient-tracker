import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ImportPage from './ImportPage';

// Mock the API
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock logger to silence console output during tests
vi.mock('../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock getApiErrorMessage to pass-through error messages
vi.mock('../utils/apiError', () => ({
  getApiErrorMessage: (err: unknown, fallback: string) => {
    if (err instanceof Error && err.message) return err.message;
    return fallback;
  },
}));

// Mock authStore for PHYSICIAN role auto-assign tests
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 10, email: 'smith@example.com', displayName: 'Dr. Smith', roles: ['ADMIN'] },
  }),
}));

import { api } from '../api/axios';

const mockPhysicians = [
  { id: 10, displayName: 'Dr. Smith, John', email: 'smith@example.com', roles: ['PHYSICIAN'] },
  { id: 20, displayName: 'Dr. Johnson, Mary', email: 'johnson@example.com', roles: ['PHYSICIAN'] },
];

const mockHillSheetsResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John'],
      totalSheets: 1,
      filteredSheets: 1,
      skippedSheets: [],
      invalidSheets: [],
    },
  },
};

const mockSutterSheetsResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John', 'Johnson, Mary'],
      totalSheets: 4,
      filteredSheets: 2,
      skippedSheets: ['Perf by Measure', 'CAR Report'],
      invalidSheets: [],
    },
  },
};

const mockSingleSheetResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John'],
      totalSheets: 2,
      filteredSheets: 1,
      skippedSheets: ['CAR Report'],
      invalidSheets: [],
    },
  },
};

const renderImportPage = () => {
  return render(
    <BrowserRouter>
      <ImportPage />
    </BrowserRouter>
  );
};

/**
 * Helper: Set up mocks for universal sheet selector flow.
 * After file upload, SheetSelector calls POST /import/sheets.
 * For Hill (single sheet), it auto-selects tab + physician.
 */
function setupHillMocks() {
  (api.get as any).mockResolvedValue({
    data: { success: true, data: mockPhysicians },
  });
  (api.post as any).mockResolvedValue(mockHillSheetsResponse);
}

/**
 * Helper: Wait for sheet selector to auto-select (single tab + physician match).
 * Must be called after file upload when using single-sheet mock.
 */
async function waitForSheetAutoSelect() {
  await waitFor(() => {
    expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
  });
  // Wait for auto-selection to enable the submit button
  await waitFor(() => {
    const submitButton = screen.getByRole('button', { name: 'Preview Import' });
    expect(submitButton).not.toBeDisabled();
  });
}

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: set up Hill mocks (physicians + single-sheet response)
    setupHillMocks();
  });

  describe('Rendering', () => {
    it('renders the page title', () => {
      renderImportPage();
      expect(screen.getByText('Import Patient Data')).toBeInTheDocument();
    });

    it('renders all three steps', () => {
      renderImportPage();
      expect(screen.getByText('Select Healthcare System')).toBeInTheDocument();
      expect(screen.getByText('Choose Import Mode')).toBeInTheDocument();
      expect(screen.getByText('Upload File')).toBeInTheDocument();
    });

    it('renders healthcare system dropdown with Hill Healthcare selected', () => {
      renderImportPage();
      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('hill');
    });

    it('renders import mode options', () => {
      renderImportPage();
      expect(screen.getByText('Replace All')).toBeInTheDocument();
      expect(screen.getByText('Merge (Recommended)')).toBeInTheDocument();
    });

    it('renders file upload area with max file size', () => {
      renderImportPage();
      expect(screen.getByText('Drag and drop your file here, or')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
      expect(screen.getByText(/Maximum file size: 10MB/)).toBeInTheDocument();
    });

    it('renders Preview Import button (disabled without file)', () => {
      renderImportPage();
      const button = screen.getByRole('button', { name: 'Preview Import' });
      expect(button).toBeInTheDocument();
      expect(button).toBeDisabled();
    });

    it('renders Cancel link', () => {
      renderImportPage();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders what happens next section', () => {
      renderImportPage();
      expect(screen.getByText('What happens next?')).toBeInTheDocument();
    });
  });

  describe('Import Mode Selection', () => {
    it('has Merge selected by default', () => {
      renderImportPage();
      const mergeRadio = screen.getByRole('radio', { name: /Merge/i });
      expect(mergeRadio).toBeChecked();
    });

    it('can select Replace All mode', async () => {
      renderImportPage();
      const replaceRadio = screen.getByRole('radio', { name: /Replace All/i });

      await userEvent.click(replaceRadio);

      expect(replaceRadio).toBeChecked();
    });

    it('shows warning text with icon for Replace All mode', () => {
      renderImportPage();
      expect(screen.getByText(/Warning:.*This will delete ALL existing patient data/)).toBeInTheDocument();
    });

    it('shows Merge as recommended', () => {
      renderImportPage();
      expect(screen.getByText(/Merge \(Recommended\)/)).toBeInTheDocument();
    });
  });

  describe('Replace All Warning', () => {
    it('shows warning modal when submitting with Replace All mode', async () => {
      renderImportPage();

      // Select Replace All mode
      const replaceRadio = screen.getByRole('radio', { name: /Replace All/i });
      await userEvent.click(replaceRadio);

      // Upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      // Wait for sheet auto-select (single tab for Hill)
      await waitForSheetAutoSelect();

      // Click Preview Import
      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      // Warning modal should appear
      expect(screen.getByText('Delete All Existing Data?')).toBeInTheDocument();
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
    });

    it('can cancel the warning modal', async () => {
      renderImportPage();

      // Select Replace All mode and upload file
      await userEvent.click(screen.getByRole('radio', { name: /Replace All/i }));
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

      await waitForSheetAutoSelect();

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Click Cancel in modal
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Modal should close
      expect(screen.queryByText('Delete All Existing Data?')).not.toBeInTheDocument();
    });

    it('proceeds with import when confirming Replace All warning', async () => {
      renderImportPage();

      // Select Replace All mode and upload file
      await userEvent.click(screen.getByRole('radio', { name: /Replace All/i }));
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

      await waitForSheetAutoSelect();

      // Now set up the preview POST response for the actual submit
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Click confirm button in modal
      await userEvent.click(screen.getByRole('button', { name: /Yes, Delete All/i }));

      // Should navigate to preview page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/patient-management/preview/test-preview-123');
      });
    });

    it('does not show warning modal for Merge mode', async () => {
      renderImportPage();

      // Merge is already default, just upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

      await waitForSheetAutoSelect();

      // Now set up the preview POST response for the actual submit
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Should NOT show warning modal
      expect(screen.queryByText('Delete All Existing Data?')).not.toBeInTheDocument();

      // Should navigate directly
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/patient-management/preview/test-preview-123');
      });
    });
  });

  describe('File Upload', () => {
    // Note: File type validation is hard to test in jsdom as userEvent.upload
    // behaves differently than the browser. This is tested in Cypress E2E tests.
    it.skip('shows error for invalid file type', async () => {
      renderImportPage();

      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/Please upload a CSV or Excel file/)).toBeInTheDocument();
      });
    });

    it('accepts CSV file', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(screen.getByText('test.csv')).toBeInTheDocument();
      expect(screen.queryByText('Please upload a CSV or Excel file')).not.toBeInTheDocument();
    });

    it('accepts Excel file', async () => {
      renderImportPage();

      const file = new File(['test'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(screen.getByText('test.xlsx')).toBeInTheDocument();
    });

    it('shows file size after upload', async () => {
      renderImportPage();

      const content = 'a'.repeat(1024); // 1 KB
      const file = new File([content], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      expect(screen.getByText(/1\.0 KB/)).toBeInTheDocument();
    });

    it('enables Preview Import button after sheet auto-select', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

      // With universal sheet selector, button is only enabled after sheet+physician selection
      await waitForSheetAutoSelect();

      const button = screen.getByRole('button', { name: 'Preview Import' });
      expect(button).not.toBeDisabled();
    });

    it('can remove uploaded file', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);
      expect(screen.getByText('test.csv')).toBeInTheDocument();

      // Find and click the remove button (X icon)
      const removeButton = screen.getByTitle('Remove file');
      await userEvent.click(removeButton);

      expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
      expect(screen.getByText('Drag and drop your file here, or')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('shows loading state during submission', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitForSheetAutoSelect();

      // Now set up a never-resolving mock for the preview POST
      (api.post as any).mockImplementation(() => new Promise(() => {}));

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('navigates to preview page on success', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitForSheetAutoSelect();

      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/patient-management/preview/test-preview-123');
      });
    });

    it('shows error message on API failure', async () => {
      // SheetSelector POST must succeed; preview POST returns API error
      let sheetsCallDone = false;
      (api.post as any).mockImplementation((url: string) => {
        if (!sheetsCallDone && url.includes('/import/sheets')) {
          sheetsCallDone = true;
          return Promise.resolve(mockHillSheetsResponse);
        }
        return Promise.resolve({
          data: {
            success: false,
            error: { message: 'Invalid file format' },
          },
        });
      });

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitForSheetAutoSelect();

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Invalid file format')).toBeInTheDocument();
      });
    });

    it('shows error message on network error', async () => {
      // SheetSelector POST must succeed; preview POST rejects with network error
      let sheetsCallDone = false;
      (api.post as any).mockImplementation((url: string) => {
        if (!sheetsCallDone && url.includes('/import/sheets')) {
          sheetsCallDone = true;
          return Promise.resolve(mockHillSheetsResponse);
        }
        return Promise.reject(new Error('Network error'));
      });

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitForSheetAutoSelect();

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('sends correct form data to API', async () => {
      renderImportPage();

      // Select Merge mode
      const mergeRadio = screen.getByRole('radio', { name: /Merge/i });
      await userEvent.click(mergeRadio);

      // Upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      await waitForSheetAutoSelect();

      // Set up preview response for submission
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-123' },
        },
      });

      // Submit
      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Find the preview POST call (not the sheets POST call)
      const postCalls = (api.post as any).mock.calls;
      const previewCall = postCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('/import/preview')
      );
      expect(previewCall).toBeDefined();

      // Check FormData contents
      const formData = previewCall[1] as FormData;
      expect(formData.get('systemId')).toBe('hill');
      expect(formData.get('mode')).toBe('merge');
      expect(formData.get('file')).toBeTruthy();
      // Sheet name is always included now
      expect(formData.get('sheetName')).toBe('Smith, John');
    });
  });

  describe('Sutter/SIP Integration', () => {
    // Helper: select Sutter in the healthcare system dropdown
    async function selectSutterSystem() {
      // The system dropdown is the first combobox
      const systemDropdown = screen.getAllByRole('combobox')[0];
      await userEvent.selectOptions(systemDropdown, 'sutter');
    }

    // Helper: upload a file
    async function uploadFile(filename = 'sutter-data.xlsx') {
      const file = new File(['test content'], filename, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);
      return file;
    }

    it('shows Sutter/SIP in healthcare system dropdown', () => {
      renderImportPage();

      expect(screen.getByText('Sutter/SIP')).toBeInTheDocument();
    });

    it('shows Hill Healthcare in healthcare system dropdown', () => {
      renderImportPage();

      expect(screen.getByText('Hill Healthcare')).toBeInTheDocument();
    });

    it('shows SheetSelector step after file upload when Sutter is selected', async () => {
      // Mock for Sutter multi-sheet response
      (api.post as any).mockResolvedValue(mockSutterSheetsResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      // Wait for the SheetSelector step to appear
      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });
    });

    it('shows SheetSelector step for Hill system too (universal)', async () => {
      renderImportPage();

      // Hill is default, just upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      // SheetSelector is now shown for all systems (universal)
      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });
    });

    it('adjusts step numbering for Sutter (extra step)', async () => {
      (api.post as any).mockResolvedValue(mockSutterSheetsResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });

      // Step 1: Healthcare System
      // Step 2: Import Mode
      // Step 3: Upload File
      // Step 4: Select Tab & Physician
      // Check that step numbers are present
      const stepBadges = screen.getAllByText(/^[1-4]$/);
      // At minimum, steps 1-4 should be shown
      expect(stepBadges.length).toBeGreaterThanOrEqual(4);
    });

    it('keeps submit button disabled until sheet and physician are selected', async () => {
      // Return sheets but don't auto-select (multiple sheets)
      (api.post as any).mockResolvedValue(mockSutterSheetsResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });

      // Submit should be disabled since no tab/physician selected yet
      const submitButton = screen.getByRole('button', { name: 'Preview Import' });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit after sheet and physician selection', async () => {
      // Single sheet auto-selects tab + auto-matches physician
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      // Wait for SheetSelector to auto-select single tab and auto-match physician
      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });

      // With single tab + auto-matched physician, the submit should become enabled
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Preview Import' });
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('includes sheetName in preview request form data for Sutter', async () => {
      // Single sheet so it auto-selects
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      // Wait for auto-selection
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Preview Import' });
        expect(submitButton).not.toBeDisabled();
      });

      // Now mock the preview POST response
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'sutter-preview-456' },
        },
      });

      // Click submit
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/patient-management/preview/sutter-preview-456');
      });

      // Find the preview POST call (not the sheets POST call)
      const postCalls = (api.post as any).mock.calls;
      const previewCall = postCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('/import/preview')
      );
      expect(previewCall).toBeDefined();

      // Check FormData includes sheetName
      const formData = previewCall[1] as FormData;
      expect(formData.get('sheetName')).toBe('Smith, John');
      expect(formData.get('systemId')).toBe('sutter');
    });

    it('includes physicianId in preview request URL for Sutter', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Preview Import' });
        expect(submitButton).not.toBeDisabled();
      });

      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'sutter-preview-789' },
        },
      });

      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });

      // Find the preview POST call
      const postCalls = (api.post as any).mock.calls;
      const previewCall = postCalls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('/import/preview')
      );
      expect(previewCall).toBeDefined();

      // URL should include physicianId query param
      expect(previewCall[0]).toContain('physicianId=10');
    });

    it('shows error when submitting Sutter without sheet selection', async () => {
      // Multiple sheets, so no auto-select
      (api.post as any).mockResolvedValue(mockSutterSheetsResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });

      // Try to submit without selecting tab - button should be disabled
      const submitButton = screen.getByRole('button', { name: 'Preview Import' });
      expect(submitButton).toBeDisabled();
    });

    it('resets sheet state when switching from Sutter to Hill', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderImportPage();

      // Select Sutter and upload file
      await selectSutterSystem();
      await uploadFile();

      await waitFor(() => {
        expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
      });

      // Now switch back to Hill - file is still uploaded so SheetSelector stays
      // but the sheet state should be reset
      const systemDropdown = screen.getAllByRole('combobox')[0];
      await userEvent.selectOptions(systemDropdown, 'hill');

      // SheetSelector is still shown (universal) but will re-fetch for Hill system
      // The step header should still be visible since file is still uploaded
      expect(screen.getByText('Select Tab & Physician')).toBeInTheDocument();
    });

    it('single-tab file pre-selects tab in SheetSelector', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderImportPage();

      await selectSutterSystem();
      await uploadFile();

      // With single tab, SheetSelector auto-selects and shows physician dropdown
      await waitFor(() => {
        expect(screen.getByText('Assign to Physician')).toBeInTheDocument();
      });
    });
  });
});
