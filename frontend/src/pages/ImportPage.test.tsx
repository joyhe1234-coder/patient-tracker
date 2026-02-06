import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ImportPage from './ImportPage';

// Mock the API
vi.mock('../api/axios', () => ({
  api: {
    post: vi.fn(),
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

import { api } from '../api/axios';

const renderImportPage = () => {
  return render(
    <BrowserRouter>
      <ImportPage />
    </BrowserRouter>
  );
};

describe('ImportPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Click Cancel in modal
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      // Modal should close
      expect(screen.queryByText('Delete All Existing Data?')).not.toBeInTheDocument();
    });

    it('proceeds with import when confirming Replace All warning', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      renderImportPage();

      // Select Replace All mode and upload file
      await userEvent.click(screen.getByRole('radio', { name: /Replace All/i }));
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Click confirm button in modal
      await userEvent.click(screen.getByRole('button', { name: /Yes, Delete All/i }));

      // Should navigate to preview page
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/import/preview/test-preview-123');
      });
    });

    it('does not show warning modal for Merge mode', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      renderImportPage();

      // Merge is already default, just upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      await userEvent.upload(document.querySelector('input[type="file"]') as HTMLInputElement, file);

      // Click Preview Import
      await userEvent.click(screen.getByRole('button', { name: 'Preview Import' }));

      // Should NOT show warning modal
      expect(screen.queryByText('Delete All Existing Data?')).not.toBeInTheDocument();

      // Should navigate directly
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/import/preview/test-preview-123');
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

    it('enables Preview Import button after file upload', async () => {
      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;

      await userEvent.upload(input, file);

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
      (api.post as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('navigates to preview page on success', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-preview-123' },
        },
      });

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/import/preview/test-preview-123');
      });
    });

    it('shows error message on API failure', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Invalid file format' },
        },
      });

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Invalid file format')).toBeInTheDocument();
      });
    });

    it('shows error message on network error', async () => {
      (api.post as any).mockRejectedValue(new Error('Network error'));

      renderImportPage();

      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('sends correct form data to API', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: { previewId: 'test-123' },
        },
      });

      renderImportPage();

      // Select Merge mode
      const mergeRadio = screen.getByRole('radio', { name: /Merge/i });
      await userEvent.click(mergeRadio);

      // Upload file
      const file = new File(['name,dob'], 'test.csv', { type: 'text/csv' });
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(input, file);

      // Submit
      const button = screen.getByRole('button', { name: 'Preview Import' });
      await userEvent.click(button);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/import/preview',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
      });

      // Check FormData contents
      const formData = (api.post as any).mock.calls[0][1] as FormData;
      expect(formData.get('systemId')).toBe('hill');
      expect(formData.get('mode')).toBe('merge');
      expect(formData.get('file')).toBeTruthy();
    });
  });
});
