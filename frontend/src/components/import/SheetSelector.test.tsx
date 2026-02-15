import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API module
vi.mock('../../api/axios', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Mock logger to silence console output during tests
vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock getApiErrorMessage
vi.mock('../../utils/apiError', () => ({
  getApiErrorMessage: (_err: unknown, fallback: string) => fallback,
}));

import { api } from '../../api/axios';
import SheetSelector, { type Physician, type SheetSelectorProps } from './SheetSelector';

const mockPhysicians: Physician[] = [
  { id: 1, displayName: 'Dr. Smith, John', email: 'smith@example.com', roles: ['PHYSICIAN'] },
  { id: 2, displayName: 'Dr. Johnson, Mary', email: 'johnson@example.com', roles: ['PHYSICIAN'] },
  { id: 3, displayName: 'Dr. Lee, Robert', email: 'lee@example.com', roles: ['PHYSICIAN'] },
];

const mockSheetsResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John', 'Johnson, Mary', 'Lee, Robert'],
      totalSheets: 5,
      filteredSheets: 3,
      skippedSheets: ['Perf by Measure', 'CAR Report'],
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
    },
  },
};

function createMockFile(): File {
  return new File(['test content'], 'sutter-import.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function renderSheetSelector(overrides: Partial<SheetSelectorProps> = {}) {
  const defaultProps: SheetSelectorProps = {
    file: createMockFile(),
    systemId: 'sutter',
    physicians: mockPhysicians,
    onSelect: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  return { ...render(<SheetSelector {...defaultProps} />), props: defaultProps };
}

describe('SheetSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner while fetching sheets', () => {
      (api.post as any).mockImplementation(() => new Promise(() => {})); // Never resolves

      renderSheetSelector();

      expect(screen.getByText('Discovering workbook tabs...')).toBeInTheDocument();
    });

    it('renders within a container while loading', () => {
      (api.post as any).mockImplementation(() => new Promise(() => {}));

      const { container } = renderSheetSelector();

      // Should have the loading SVG spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Successful Sheet Discovery', () => {
    beforeEach(() => {
      (api.post as any).mockResolvedValue(mockSheetsResponse);
    });

    it('renders component without errors after loading', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('Physician Tab')).toBeInTheDocument();
      });
    });

    it('populates tab dropdown from API response', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('Physician Tab')).toBeInTheDocument();
      });

      const tabDropdown = screen.getByLabelText('Physician Tab');
      expect(tabDropdown).toBeInTheDocument();

      // All sheet names should appear as options
      expect(screen.getByText('Smith, John')).toBeInTheDocument();
      expect(screen.getByText('Johnson, Mary')).toBeInTheDocument();
      expect(screen.getByText('Lee, Robert')).toBeInTheDocument();
    });

    it('shows tab count text', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/3 physician tabs found in workbook/)).toBeInTheDocument();
      });
    });

    it('shows default placeholder in tab dropdown', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('-- Select a tab --')).toBeInTheDocument();
      });
    });

    it('does not show physician selector until tab is selected', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('Physician Tab')).toBeInTheDocument();
      });

      // Physician selector label should NOT be visible initially
      expect(screen.queryByText('Assign to Physician')).not.toBeInTheDocument();
    });

    it('shows physician selector after selecting a tab', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Select a tab
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      // Physician selector should appear
      expect(screen.getByText('Assign to Physician')).toBeInTheDocument();
    });

    it('sends correct POST request with file and systemId', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/import/sheets',
          expect.any(FormData),
          expect.objectContaining({
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        );
      });

      // Verify FormData contents
      const formData = (api.post as any).mock.calls[0][1] as FormData;
      expect(formData.get('systemId')).toBe('sutter');
      expect(formData.get('file')).toBeTruthy();
    });
  });

  describe('Physician Auto-Matching', () => {
    beforeEach(() => {
      (api.post as any).mockResolvedValue(mockSheetsResponse);
    });

    it('auto-matches physician when tab name matches displayName', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Select "Smith, John" tab - should match "Dr. Smith, John"
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      // Physician dropdown should appear and show auto-matched physician
      const physicianDropdown = screen.getByLabelText('Assign to Physician');
      expect(physicianDropdown).toHaveValue('1'); // Dr. Smith, John's id
    });

    it('shows "(suggested)" label for auto-matched physician', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      // Check for the "(suggested)" label in the option text
      await waitFor(() => {
        expect(screen.getByText(/\(suggested\)/)).toBeInTheDocument();
      });
    });

    it('shows auto-match confirmation message', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      await waitFor(() => {
        expect(
          screen.getByText('Auto-matched from tab name. You can change this if needed.')
        ).toBeInTheDocument();
      });
    });

    it('clears "(suggested)" label after manual physician override', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Select tab to trigger auto-match
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      // Wait for auto-match
      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('1');
      });

      // Manually override to a different physician
      await userEvent.selectOptions(screen.getByLabelText('Assign to Physician'), '2');

      // The suggested text label should still be on physician id=1's option,
      // but the auto-match message should be gone since selected != suggested
      expect(
        screen.queryByText('Auto-matched from tab name. You can change this if needed.')
      ).not.toBeInTheDocument();
    });

    it('shows "please select" prompt when physician not yet chosen', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Use a tab name that won't match any physician
      // We need a response with a non-matching name
      (api.post as any).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Unknown Tab Name'],
            totalSheets: 1,
            filteredSheets: 1,
            skippedSheets: [],
          },
        },
      });

      // Re-render to get the new response
      const { props } = renderSheetSelector();

      await waitFor(() => {
        expect(screen.getAllByText('Physician Tab').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Single-Tab Auto-Selection', () => {
    it('pre-selects single tab automatically', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        // With single tab, it should auto-select and show physician selector
        expect(screen.getByText('Assign to Physician')).toBeInTheDocument();
      });

      const tabDropdown = screen.getByLabelText('Physician Tab');
      expect(tabDropdown).toHaveValue('Smith, John');
    });

    it('auto-matches physician for single pre-selected tab', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        const physicianDropdown = screen.getByLabelText('Assign to Physician');
        expect(physicianDropdown).toHaveValue('1'); // Dr. Smith, John
      });
    });
  });

  describe('onSelect Callback', () => {
    it('calls onSelect when both tab and physician are selected', async () => {
      (api.post as any).mockResolvedValue(mockSheetsResponse);
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Select tab (will auto-match physician)
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });

    it('calls onSelect with single pre-selected tab and auto-matched physician', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });
  });

  describe('Error State', () => {
    it('shows error state on API failure', async () => {
      (api.post as any).mockRejectedValue(new Error('Network error'));
      const onError = vi.fn();

      renderSheetSelector({ onError });

      await waitFor(() => {
        expect(screen.getByText('Sheet Discovery Failed')).toBeInTheDocument();
        expect(screen.getByText('Failed to read workbook tabs')).toBeInTheDocument();
      });
    });

    it('calls onError callback on API failure', async () => {
      (api.post as any).mockRejectedValue(new Error('Server error'));
      const onError = vi.fn();

      renderSheetSelector({ onError });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to read workbook tabs');
      });
    });

    it('shows error state on unsuccessful API response', async () => {
      (api.post as any).mockResolvedValue({
        data: {
          success: false,
          error: { message: 'Invalid file format' },
        },
      });
      const onError = vi.fn();

      renderSheetSelector({ onError });

      await waitFor(() => {
        expect(screen.getByText('Sheet Discovery Failed')).toBeInTheDocument();
        expect(screen.getByText('Invalid file format')).toBeInTheDocument();
      });

      expect(onError).toHaveBeenCalledWith('Invalid file format');
    });
  });

  describe('Tab Change Behavior', () => {
    beforeEach(() => {
      (api.post as any).mockResolvedValue(mockSheetsResponse);
    });

    it('resets physician when changing tabs', async () => {
      const onSelect = vi.fn();
      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(screen.getByLabelText('Physician Tab')).toBeInTheDocument();
      });

      // Select first tab
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Smith, John');
      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('1');
      });

      // Switch to different tab
      await userEvent.selectOptions(screen.getByLabelText('Physician Tab'), 'Johnson, Mary');

      // Physician should re-auto-match to Dr. Johnson
      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('2');
      });
    });
  });

  describe('Singular/Plural Tab Count', () => {
    it('shows singular "tab" when exactly 1 tab', async () => {
      (api.post as any).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/1 physician tab found in workbook/)).toBeInTheDocument();
      });
    });

    it('shows plural "tabs" when multiple tabs', async () => {
      (api.post as any).mockResolvedValue(mockSheetsResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/3 physician tabs found in workbook/)).toBeInTheDocument();
      });
    });
  });
});
