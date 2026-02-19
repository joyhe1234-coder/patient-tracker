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

// Mock auth store - mutable state for per-test role configuration
let mockAuthUser: {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt: string | null;
} | null = null;

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({ user: mockAuthUser }),
}));

import { api } from '../../api/axios';
import SheetSelector, { type Physician, type SheetSelectorProps } from './SheetSelector';

// ---- Test Data ----

const mockPhysicians: Physician[] = [
  { id: 1, displayName: 'Dr. Smith, John', email: 'smith@example.com', roles: ['PHYSICIAN'] },
  { id: 2, displayName: 'Dr. Johnson, Mary', email: 'johnson@example.com', roles: ['PHYSICIAN'] },
  { id: 3, displayName: 'Dr. Lee, Robert', email: 'lee@example.com', roles: ['PHYSICIAN'] },
];

const mockMultiSheetResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John', 'Johnson, Mary', 'Lee, Robert'],
      totalSheets: 5,
      filteredSheets: 3,
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
      totalSheets: 3,
      filteredSheets: 1,
      skippedSheets: ['CAR Report'],
      invalidSheets: [],
    },
  },
};

const mockResponseWithInvalidSheets = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John', 'Johnson, Mary'],
      totalSheets: 5,
      filteredSheets: 2,
      skippedSheets: ['Perf by Measure'],
      invalidSheets: [
        { name: 'Summary', reason: 'No MemberID column found' },
        { name: 'CAR Report', reason: 'Missing Date of Birth column' },
      ],
    },
  },
};

const mockSingleSheetWithInvalidResponse = {
  data: {
    success: true,
    data: {
      sheets: ['Smith, John'],
      totalSheets: 4,
      filteredSheets: 1,
      skippedSheets: [],
      invalidSheets: [
        { name: 'Summary', reason: 'No MemberID column found' },
        { name: 'CAR Report', reason: 'Missing Date of Birth column' },
        { name: 'Pivot Table', reason: 'No data rows found' },
      ],
    },
  },
};

// ---- Helpers ----

function createMockFile(): File {
  return new File(['test content'], 'sutter-import.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function setAuthUser(role: 'PHYSICIAN' | 'STAFF' | 'ADMIN', id = 1) {
  mockAuthUser = {
    id,
    email: `${role.toLowerCase()}@example.com`,
    displayName: role === 'PHYSICIAN' ? 'Dr. Smith, John' : `${role} User`,
    roles: [role],
    isActive: true,
    lastLoginAt: null,
  };
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

// ---- Tests ----

describe('SheetSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to STAFF role (shows all UI elements)
    setAuthUser('STAFF', 10);
  });

  // ================================================================
  // Loading State
  // ================================================================
  describe('Loading State', () => {
    it('shows loading spinner while fetching sheets', () => {
      (api.post as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

      renderSheetSelector();

      expect(screen.getByText('Discovering workbook tabs...')).toBeInTheDocument();
    });

    it('renders animated spinner SVG while loading', () => {
      (api.post as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));

      const { container } = renderSheetSelector();

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  // ================================================================
  // Error State
  // ================================================================
  describe('Error State', () => {
    it('shows error alert on API rejection', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
      const onError = vi.fn();

      renderSheetSelector({ onError });

      await waitFor(() => {
        expect(screen.getByText('Sheet Discovery Failed')).toBeInTheDocument();
        expect(screen.getByText('Failed to read workbook tabs')).toBeInTheDocument();
      });
    });

    it('calls onError callback on API failure', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Server error'));
      const onError = vi.fn();

      renderSheetSelector({ onError });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('Failed to read workbook tabs');
      });
    });

    it('shows error from unsuccessful API response', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
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

    it('has role="alert" on the error container', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('fail'));

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // API Call
  // ================================================================
  describe('API Request', () => {
    it('sends POST to /import/sheets with file and systemId in FormData', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);

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

      const formData = (api.post as ReturnType<typeof vi.fn>).mock.calls[0][1] as FormData;
      expect(formData.get('systemId')).toBe('sutter');
      expect(formData.get('file')).toBeTruthy();
    });
  });

  // ================================================================
  // Task 27: Single Tab vs Multi Tab Display
  // ================================================================
  describe('Single Tab Display (Task 27)', () => {
    beforeEach(() => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);
    });

    it('renders static text instead of dropdown when exactly one sheet', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing from:/)).toBeInTheDocument();
      });

      // Should show the tab name in the static text
      expect(screen.getByText(/Importing from: Smith, John/)).toBeInTheDocument();

      // Should NOT render a select dropdown for the sheet
      expect(screen.queryByText('-- Select a tab --')).not.toBeInTheDocument();
    });

    it('auto-selects the single sheet without user interaction', async () => {
      const onSelect = vi.fn();
      renderSheetSelector({ onSelect });

      // Should auto-select and trigger physician auto-match, then call onSelect
      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', expect.any(Number));
      });
    });

    it('shows "1 valid tab" singular count', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/1 valid tab found in workbook/)).toBeInTheDocument();
      });
    });

    it('shows physician selector immediately for auto-selected single tab', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('Assign to Physician')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple Tabs Display (Task 27)', () => {
    beforeEach(() => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);
    });

    it('renders a select dropdown when multiple sheets exist', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      const dropdown = screen.getByLabelText('Import Tab');
      expect(dropdown.tagName).toBe('SELECT');
    });

    it('populates dropdown with all sheet names', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      expect(screen.getByText('Smith, John')).toBeInTheDocument();
      expect(screen.getByText('Johnson, Mary')).toBeInTheDocument();
      expect(screen.getByText('Lee, Robert')).toBeInTheDocument();
    });

    it('shows default placeholder option', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText('-- Select a tab --')).toBeInTheDocument();
      });
    });

    it('shows plural "tabs" in count text', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/3 valid tabs found in workbook/)).toBeInTheDocument();
      });
    });

    it('does not show physician selector until a tab is selected', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      expect(screen.queryByText('Assign to Physician')).not.toBeInTheDocument();
    });

    it('shows physician selector after selecting a tab', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      expect(screen.getByText('Assign to Physician')).toBeInTheDocument();
    });

    it('does not render "Importing from:" text for multiple tabs', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      expect(screen.queryByText(/Importing from:/)).not.toBeInTheDocument();
    });
  });

  // ================================================================
  // Task 28: Physician Assignment by Role
  // ================================================================
  describe('PHYSICIAN Role Auto-Assignment (Task 28)', () => {
    beforeEach(() => {
      // Set the auth user to PHYSICIAN with id=1 matching mockPhysicians[0]
      setAuthUser('PHYSICIAN', 1);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);
    });

    it('does not render physician dropdown for PHYSICIAN role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing from:/)).toBeInTheDocument();
      });

      // Should show auto-assigned text, not a dropdown
      expect(screen.queryByLabelText('Assign to Physician')).not.toBeInTheDocument();
      expect(screen.queryByText('-- Select a physician --')).not.toBeInTheDocument();
    });

    it('shows "Importing for: {name}" text for PHYSICIAN role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing for: Dr. Smith, John/)).toBeInTheDocument();
      });
    });

    it('auto-assigns physician ID and calls onSelect for PHYSICIAN role', async () => {
      const onSelect = vi.fn();
      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });

    it('auto-assigns PHYSICIAN role with multi-tab response too', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      // Select a tab
      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      // Should show auto-assigned text, not a dropdown
      await waitFor(() => {
        expect(screen.getByText(/Importing for: Dr. Smith, John/)).toBeInTheDocument();
      });
      expect(screen.queryByLabelText('Assign to Physician')).not.toBeInTheDocument();
    });
  });

  describe('STAFF Role Physician Dropdown (Task 28)', () => {
    beforeEach(() => {
      setAuthUser('STAFF', 10);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);
    });

    it('shows physician dropdown for STAFF role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      expect(screen.getByLabelText('Assign to Physician')).toBeInTheDocument();
      const physicianDropdown = screen.getByLabelText('Assign to Physician');
      expect(physicianDropdown.tagName).toBe('SELECT');
    });

    it('does not show "Importing for:" text for STAFF role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      expect(screen.queryByText(/Importing for:/)).not.toBeInTheDocument();
    });

    it('shows "please select" prompt when no physician chosen', async () => {
      // Use a response with a tab name that will not match any physician
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Unknown Tab', 'Another Tab'],
            totalSheets: 2,
            filteredSheets: 2,
            skippedSheets: [],
            invalidSheets: [],
          },
        },
      });

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Unknown Tab');

      expect(
        screen.getByText('Please select a physician to continue.')
      ).toBeInTheDocument();
    });
  });

  describe('ADMIN Role Physician Dropdown (Task 28)', () => {
    beforeEach(() => {
      setAuthUser('ADMIN', 10);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);
    });

    it('shows physician dropdown for ADMIN role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      expect(screen.getByLabelText('Assign to Physician')).toBeInTheDocument();
      const physicianDropdown = screen.getByLabelText('Assign to Physician');
      expect(physicianDropdown.tagName).toBe('SELECT');
    });

    it('does not show "Importing for:" text for ADMIN role', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      expect(screen.queryByText(/Importing for:/)).not.toBeInTheDocument();
    });
  });

  // ================================================================
  // Physician Auto-Matching (STAFF/ADMIN)
  // ================================================================
  describe('Physician Auto-Matching', () => {
    beforeEach(() => {
      setAuthUser('STAFF', 10);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);
    });

    it('auto-matches physician when tab name matches displayName', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      const physicianDropdown = screen.getByLabelText('Assign to Physician');
      expect(physicianDropdown).toHaveValue('1'); // Dr. Smith, John's id
    });

    it('shows "(suggested)" label for auto-matched physician', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      await waitFor(() => {
        expect(screen.getByText(/\(suggested\)/)).toBeInTheDocument();
      });
    });

    it('shows auto-match confirmation message', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      await waitFor(() => {
        expect(
          screen.getByText('Auto-matched from tab name. You can change this if needed.')
        ).toBeInTheDocument();
      });
    });

    it('hides auto-match message after manual physician override', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('1');
      });

      // Override to a different physician
      await userEvent.selectOptions(screen.getByLabelText('Assign to Physician'), '2');

      expect(
        screen.queryByText('Auto-matched from tab name. You can change this if needed.')
      ).not.toBeInTheDocument();
    });

    it('auto-matches physician for single pre-selected tab', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        const physicianDropdown = screen.getByLabelText('Assign to Physician');
        expect(physicianDropdown).toHaveValue('1'); // Dr. Smith, John
      });
    });

    it('re-auto-matches physician when switching tabs', async () => {
      const onSelect = vi.fn();
      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      // Select first tab
      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');
      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('1');
      });

      // Switch to different tab
      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Johnson, Mary');

      await waitFor(() => {
        expect(screen.getByLabelText('Assign to Physician')).toHaveValue('2');
      });
    });
  });

  // ================================================================
  // Task 29: Invalid Sheets Display
  // ================================================================
  describe('Invalid Sheets Note (Task 29)', () => {
    beforeEach(() => {
      setAuthUser('STAFF', 10);
    });

    it('shows invalid sheets note when invalidSheets are present', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      expect(
        screen.getByText(/2 tabs excluded: missing required import columns/)
      ).toBeInTheDocument();
    });

    it('does not show invalid sheets note when invalidSheets is empty', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('does not show invalid sheets note when invalidSheets is not in response', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Tab1'],
            totalSheets: 1,
            filteredSheets: 1,
            skippedSheets: [],
            // invalidSheets intentionally omitted
          },
        },
      });

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing from:/)).toBeInTheDocument();
      });

      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('uses singular "tab" when exactly 1 invalid sheet', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Smith, John', 'Johnson, Mary'],
            totalSheets: 3,
            filteredSheets: 2,
            skippedSheets: [],
            invalidSheets: [{ name: 'Summary', reason: 'No MemberID column found' }],
          },
        },
      });

      renderSheetSelector();

      await waitFor(() => {
        expect(
          screen.getByText(/1 tab excluded: missing required import columns/)
        ).toBeInTheDocument();
      });
    });

    it('uses plural "tabs" when multiple invalid sheets', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);

      renderSheetSelector();

      await waitFor(() => {
        expect(
          screen.getByText(/2 tabs excluded: missing required import columns/)
        ).toBeInTheDocument();
      });
    });

    it('details are collapsed by default', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      // Individual sheet names should NOT be visible
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
      expect(screen.queryByText('No MemberID column found')).not.toBeInTheDocument();
    });

    it('expands to show details when clicked', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggleButton = screen.getByText(/tabs excluded/);
      await userEvent.click(toggleButton);

      // Should now show individual invalid sheet details
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText(/No MemberID column found/)).toBeInTheDocument();
      expect(screen.getByText('CAR Report')).toBeInTheDocument();
      expect(screen.getByText(/Missing Date of Birth column/)).toBeInTheDocument();
    });

    it('collapses details on second click', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggleButton = screen.getByText(/tabs excluded/);

      // Expand
      await userEvent.click(toggleButton);
      expect(screen.getByText('Summary')).toBeInTheDocument();

      // Collapse
      await userEvent.click(toggleButton);
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });

    it('shows all invalid sheet names and reasons in expanded view', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetWithInvalidResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/3 tabs excluded/)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText(/3 tabs excluded/));

      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText(/No MemberID column found/)).toBeInTheDocument();
      expect(screen.getByText('CAR Report')).toBeInTheDocument();
      expect(screen.getByText(/Missing Date of Birth column/)).toBeInTheDocument();
      expect(screen.getByText('Pivot Table')).toBeInTheDocument();
      expect(screen.getByText(/No data rows found/)).toBeInTheDocument();
    });
  });

  describe('Invalid Sheets Keyboard Accessibility (Task 29)', () => {
    beforeEach(() => {
      setAuthUser('STAFF', 10);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponseWithInvalidSheets);
    });

    it('toggle is a button element', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);
      expect(toggle.tagName).toBe('BUTTON');
    });

    it('has aria-expanded="false" when collapsed', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('has aria-expanded="true" when expanded', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);
      await userEvent.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles aria-expanded back to "false" on collapse', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);

      // Expand
      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      await userEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('can be toggled with Enter key', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);
      toggle.focus();

      // Simulate Enter keypress using userEvent keyboard
      await userEvent.keyboard('{Enter}');

      // Details should be visible
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('can be toggled with Space key', async () => {
      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByRole('note')).toBeInTheDocument();
      });

      const toggle = screen.getByText(/tabs excluded/);
      toggle.focus();

      await userEvent.keyboard(' ');

      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // ================================================================
  // onSelect Callback
  // ================================================================
  describe('onSelect Callback', () => {
    beforeEach(() => {
      setAuthUser('STAFF', 10);
    });

    it('calls onSelect when both tab and physician are selected (multi-tab)', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      // Select tab (will auto-match physician)
      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Smith, John');

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });

    it('calls onSelect with single pre-selected tab and auto-matched physician', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });

    it('calls onSelect for PHYSICIAN role with auto-assigned physician', async () => {
      setAuthUser('PHYSICIAN', 1);
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Smith, John', 1);
      });
    });

    it('does not call onSelect until physician is selected', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Unknown Tab', 'Another Tab'],
            totalSheets: 2,
            filteredSheets: 2,
            skippedSheets: [],
            invalidSheets: [],
          },
        },
      });
      const onSelect = vi.fn();

      renderSheetSelector({ onSelect });

      await waitFor(() => {
        expect(screen.getByLabelText('Import Tab')).toBeInTheDocument();
      });

      // Select a tab that does not match any physician
      await userEvent.selectOptions(screen.getByLabelText('Import Tab'), 'Unknown Tab');

      // onSelect should NOT have been called since no physician is matched
      expect(onSelect).not.toHaveBeenCalled();

      // Now manually select a physician
      await userEvent.selectOptions(screen.getByLabelText('Assign to Physician'), '3');

      await waitFor(() => {
        expect(onSelect).toHaveBeenCalledWith('Unknown Tab', 3);
      });
    });
  });

  // ================================================================
  // Tab Count Text
  // ================================================================
  describe('Tab Count Text', () => {
    it('shows singular "tab" for exactly 1 sheet', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/1 valid tab found in workbook/)).toBeInTheDocument();
      });
    });

    it('shows plural "tabs" for multiple sheets', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockMultiSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/3 valid tabs found in workbook/)).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // Edge Cases
  // ================================================================
  describe('Edge Cases', () => {
    it('handles response with no invalid sheets key gracefully', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: {
          success: true,
          data: {
            sheets: ['Tab A'],
            totalSheets: 1,
            filteredSheets: 1,
            skippedSheets: [],
            // invalidSheets not present in response
          },
        },
      });

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing from: Tab A/)).toBeInTheDocument();
      });

      // Should not crash and invalid note should not appear
      expect(screen.queryByRole('note')).not.toBeInTheDocument();
    });

    it('handles empty physicians list without crashing', async () => {
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector({ physicians: [] });

      await waitFor(() => {
        expect(screen.getByText(/Importing from: Smith, John/)).toBeInTheDocument();
      });
    });

    it('ADMIN+PHYSICIAN dual role shows physician dropdown (not auto-assigned)', async () => {
      // User with both ADMIN and PHYSICIAN roles should get the dropdown
      mockAuthUser = {
        id: 1,
        email: 'admin-phy@example.com',
        displayName: 'Ko Admin-Phy',
        roles: ['ADMIN', 'PHYSICIAN'],
        isActive: true,
        lastLoginAt: null,
      };
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        expect(screen.getByText(/Importing from: Smith, John/)).toBeInTheDocument();
      });

      // Should show physician dropdown (ADMIN behavior), NOT "Importing for:" text
      expect(screen.getByLabelText('Assign to Physician')).toBeInTheDocument();
      expect(screen.queryByText(/Importing for:/)).not.toBeInTheDocument();
    });

    it('PHYSICIAN role falls back to user displayName when not in physicians list', async () => {
      setAuthUser('PHYSICIAN', 999); // ID not in mockPhysicians
      mockAuthUser!.displayName = 'Dr. Unknown';
      (api.post as ReturnType<typeof vi.fn>).mockResolvedValue(mockSingleSheetResponse);

      renderSheetSelector();

      await waitFor(() => {
        // Should still show the tab text
        expect(screen.getByText(/Importing from: Smith, John/)).toBeInTheDocument();
      });

      // The physician name fallback should use user's displayName
      await waitFor(() => {
        expect(screen.getByText(/Importing for: Dr. Unknown/)).toBeInTheDocument();
      });
    });
  });
});
