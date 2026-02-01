import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import ImportPreviewPage from './ImportPreviewPage';

// Mock the API
vi.mock('../api/axios', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
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

const mockPreviewData = {
  previewId: 'test-preview-123',
  systemId: 'hill',
  mode: 'merge' as const,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  totalChanges: 5,
  summary: {
    inserts: 3,
    updates: 1,
    skips: 1,
    duplicates: 0,
    deletes: 0,
  },
  patients: {
    new: 2,
    existing: 1,
    total: 3,
  },
  changes: {
    total: 5,
    page: 1,
    limit: 50,
    items: [
      {
        action: 'INSERT' as const,
        memberName: 'John Smith',
        memberDob: '1965-01-15',
        requestType: 'Quality',
        qualityMeasure: 'Diabetic Eye Exam',
        oldStatus: null,
        newStatus: 'Diabetic eye exam completed',
        reason: 'New patient+measure combination',
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
        memberDob: '1958-07-08',
        requestType: 'Screening',
        qualityMeasure: 'Breast Cancer Screening',
        oldStatus: 'Screening test completed',
        newStatus: 'Screening test completed',
        reason: 'No change needed',
      },
    ],
  },
};

const renderPreviewPage = (previewId = 'test-preview-123') => {
  return render(
    <MemoryRouter initialEntries={[`/import/preview/${previewId}`]}>
      <Routes>
        <Route path="/import/preview/:previewId" element={<ImportPreviewPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('ImportPreviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner initially', () => {
      (api.get as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderPreviewPage();

      expect(screen.getByText('Loading preview...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error when preview not found', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Preview not found or expired' },
        },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('Preview Not Found')).toBeInTheDocument();
        expect(screen.getByText('Preview not found or expired')).toBeInTheDocument();
      });
    });

    it('shows Start New Import button on error', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Preview expired' },
        },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start New Import' })).toBeInTheDocument();
      });
    });

    it('navigates to /import when clicking Start New Import', async () => {
      (api.get as any).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Preview expired' },
        },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Start New Import' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Start New Import' }));

      expect(mockNavigate).toHaveBeenCalledWith('/import');
    });
  });

  describe('Preview Display', () => {
    beforeEach(() => {
      (api.get as any).mockResolvedValue({
        data: { success: true, data: mockPreviewData },
      });
    });

    it('shows page title', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });
    });

    it('shows import mode', async () => {
      renderPreviewPage();

      await waitFor(() => {
        // Wait for the page to load
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      // Mode is displayed (styled as uppercase via CSS but content is lowercase)
      expect(screen.getByText('merge')).toBeInTheDocument();
    });

    it('shows summary cards with correct counts', async () => {
      renderPreviewPage();

      await waitFor(() => {
        // Check for the Insert card with count 3
        const insertCard = screen.getByText('Insert').closest('button');
        expect(insertCard).toHaveTextContent('3');

        // Check for the Update card with count 1
        const updateCard = screen.getByText('Update').closest('button');
        expect(updateCard).toHaveTextContent('1');
      });
    });

    it('shows patient counts', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('New Patients:')).toBeInTheDocument();
        expect(screen.getByText('Existing Patients:')).toBeInTheDocument();
        expect(screen.getByText('Total Patients:')).toBeInTheDocument();
      });
    });

    it('shows changes table with data', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      });
    });

    it('shows action badges in table', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('INSERT')).toBeInTheDocument();
        expect(screen.getByText('UPDATE')).toBeInTheDocument();
        expect(screen.getByText('SKIP')).toBeInTheDocument();
      });
    });

    it('shows Cancel button', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });
    });

    it('shows Apply Changes button with correct count', async () => {
      renderPreviewPage();

      await waitFor(() => {
        // modifying = inserts + updates + duplicates + deletes = 3 + 1 + 0 + 0 = 4
        expect(screen.getByRole('button', { name: 'Apply 4 Changes' })).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      (api.get as any).mockResolvedValue({
        data: { success: true, data: mockPreviewData },
      });
    });

    it('filters by INSERT when clicking Insert card', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Click on Insert card (first summary card)
      const insertCard = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Insert')
      );
      await userEvent.click(insertCard!);

      // Should show only INSERT rows
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument(); // UPDATE
      expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument(); // SKIP
    });

    it('shows all changes when clicking Total card', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // First filter to INSERT
      const insertCard = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Insert')
      );
      await userEvent.click(insertCard!);

      // Then click Total to show all
      const totalCard = screen.getAllByRole('button').find(
        btn => btn.textContent?.includes('Total')
      );
      await userEvent.click(totalCard!);

      // Should show all rows
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });

  describe('Cancel Action', () => {
    beforeEach(() => {
      (api.get as any).mockResolvedValue({
        data: { success: true, data: mockPreviewData },
      });
      (api.delete as any).mockResolvedValue({ data: { success: true } });
    });

    it('deletes preview and navigates to /import on cancel', async () => {
      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(api.delete).toHaveBeenCalledWith('/import/preview/test-preview-123');
      expect(mockNavigate).toHaveBeenCalledWith('/import');
    });
  });

  describe('Execute Import', () => {
    beforeEach(() => {
      (api.get as any).mockResolvedValue({
        data: { success: true, data: mockPreviewData },
      });
    });

    it('shows loading state during execution', async () => {
      (api.post as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply 4 Changes' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Apply 4 Changes' }));

      expect(screen.getByText('Importing...')).toBeInTheDocument();
    });

    it('shows success screen after import', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            mode: 'merge',
            stats: {
              inserted: 3,
              updated: 1,
              deleted: 0,
              skipped: 1,
              bothKept: 0,
            },
            duration: 1500,
          },
        },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply 4 Changes' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Apply 4 Changes' }));

      await waitFor(() => {
        expect(screen.getByText('Import Successful')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // Inserted
        expect(screen.getByText('Go to Patient Grid')).toBeInTheDocument();
      });
    });

    it('shows error message when import fails', async () => {
      (api.post as any).mockRejectedValue(new Error('Database error'));

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply 4 Changes' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Apply 4 Changes' }));

      await waitFor(() => {
        expect(screen.getByText('Database error')).toBeInTheDocument();
      });
    });

    it('shows Import More button after successful import', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            mode: 'merge',
            stats: { inserted: 1, updated: 0, deleted: 0, skipped: 0, bothKept: 0 },
            duration: 500,
          },
        },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Apply 4 Changes' })).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: 'Apply 4 Changes' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Import More' })).toBeInTheDocument();
      });
    });
  });

  describe('Empty Changes', () => {
    it('disables Apply button when no modifying changes', async () => {
      const emptyPreview = {
        ...mockPreviewData,
        summary: {
          inserts: 0,
          updates: 0,
          skips: 5,
          duplicates: 0,
          deletes: 0,
        },
      };

      (api.get as any).mockResolvedValue({
        data: { success: true, data: emptyPreview },
      });

      renderPreviewPage();

      await waitFor(() => {
        const button = screen.getByRole('button', { name: 'Apply 0 Changes' });
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Warnings Display', () => {
    it('shows warnings section when warnings exist', async () => {
      const previewWithWarnings = {
        ...mockPreviewData,
        warnings: [
          {
            rowIndex: 2,
            field: 'measureStatus',
            message: 'Unknown status will be set to default',
            memberName: 'John Smith',
          },
          {
            rowIndex: 5,
            field: 'statusDate',
            message: 'Invalid date format, using current date',
            memberName: 'Jane Doe',
          },
        ],
      };

      (api.get as any).mockResolvedValue({
        data: { success: true, data: previewWithWarnings },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('2 Warnings Found')).toBeInTheDocument();
        expect(screen.getByText('Unknown status will be set to default')).toBeInTheDocument();
        expect(screen.getByText('Invalid date format, using current date')).toBeInTheDocument();
        expect(screen.getByText('Row 3')).toBeInTheDocument(); // rowIndex 2 + 1
        expect(screen.getByText('Row 6')).toBeInTheDocument(); // rowIndex 5 + 1
      });
    });

    it('does not show warnings section when no warnings', async () => {
      const previewWithNoWarnings = {
        ...mockPreviewData,
        warnings: [],
      };

      (api.get as any).mockResolvedValue({
        data: { success: true, data: previewWithNoWarnings },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('Import Preview')).toBeInTheDocument();
      });

      expect(screen.queryByText('Warnings Found')).not.toBeInTheDocument();
    });

    it('shows singular "Warning" when only one warning', async () => {
      const previewWithOneWarning = {
        ...mockPreviewData,
        warnings: [
          {
            rowIndex: 2,
            field: 'measureStatus',
            message: 'Unknown status will be set to default',
            memberName: 'John Smith',
          },
        ],
      };

      (api.get as any).mockResolvedValue({
        data: { success: true, data: previewWithOneWarning },
      });

      renderPreviewPage();

      await waitFor(() => {
        expect(screen.getByText('1 Warning Found')).toBeInTheDocument();
      });
    });
  });
});
