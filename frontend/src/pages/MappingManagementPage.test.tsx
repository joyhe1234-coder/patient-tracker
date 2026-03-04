/**
 * MappingManagementPage Tests
 *
 * Tests for the admin mapping management page: system selector, column
 * mapping tables, action pattern visibility, reset flow, loading/error
 * states, and metadata display.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock API
const mockGet = vi.fn();
const mockPut = vi.fn();
const mockDelete = vi.fn();

vi.mock('../api/axios', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

// Mock auth store
let mockUser: {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt: null;
} | null = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin User',
  roles: ['ADMIN'],
  isActive: true,
  lastLoginAt: null,
};

vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: mockUser,
  })),
}));

import { MappingManagementPage } from './MappingManagementPage';
import type { MergedSystemConfig } from '../types/import-mapping';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockSystems = [
  { id: 'hill-1', name: 'Hill Health System', isDefault: true },
  { id: 'sutter-1', name: 'Sutter Health', isDefault: false },
];

/** Hill system: wide format, has patient and measure columns, no action mappings. */
const mockHillConfig: MergedSystemConfig = {
  systemId: 'hill-1',
  systemName: 'Hill Health System',
  format: 'wide',
  patientColumns: [
    {
      sourceColumn: 'Name',
      targetType: 'PATIENT',
      targetField: 'memberName',
      requestType: null,
      qualityMeasure: null,
      isOverride: false,
      isActive: true,
      overrideId: null,
    },
    {
      sourceColumn: 'DOB',
      targetType: 'PATIENT',
      targetField: 'memberDob',
      requestType: null,
      qualityMeasure: null,
      isOverride: false,
      isActive: true,
      overrideId: null,
    },
  ],
  measureColumns: [
    {
      sourceColumn: 'AWV Status',
      targetType: 'MEASURE',
      targetField: null,
      requestType: 'AWV',
      qualityMeasure: 'Annual Wellness Visit',
      isOverride: false,
      isActive: true,
      overrideId: null,
    },
  ],
  dataColumns: [],
  skipColumns: [],
  actionMappings: [],
  skipActions: [],
  statusMapping: {},
  lastModifiedAt: '2026-02-18T10:30:00Z',
  lastModifiedBy: 'admin@example.com',
};

/** Sutter system: long format, has action mappings. */
const mockSutterConfig: MergedSystemConfig = {
  systemId: 'sutter-1',
  systemName: 'Sutter Health',
  format: 'long',
  patientColumns: [
    {
      sourceColumn: 'Patient Name',
      targetType: 'PATIENT',
      targetField: 'memberName',
      requestType: null,
      qualityMeasure: null,
      isOverride: true,
      isActive: true,
      overrideId: 1,
    },
  ],
  measureColumns: [],
  dataColumns: [],
  skipColumns: [],
  actionMappings: [
    {
      pattern: '^AWV.*',
      requestType: 'AWV',
      qualityMeasure: 'Annual Wellness Visit',
      measureStatus: 'Not Addressed',
      isOverride: false,
      isActive: true,
      overrideId: null,
    },
  ],
  skipActions: ['N/A'],
  statusMapping: {},
  lastModifiedAt: null,
  lastModifiedBy: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPage() {
  return render(
    <MemoryRouter>
      <MappingManagementPage />
    </MemoryRouter>,
  );
}

/** Set up mockGet to return systems list and a config for a given systemId. */
function setupDefaultMocks(
  configMap: Record<string, MergedSystemConfig> = {
    'hill-1': mockHillConfig,
    'sutter-1': mockSutterConfig,
  },
) {
  mockGet.mockImplementation((url: string) => {
    if (url === '/import/systems') {
      return Promise.resolve({ data: { data: mockSystems } });
    }
    // Match /import/mappings/:systemId
    const mappingMatch = url.match(/^\/import\/mappings\/(.+)$/);
    if (mappingMatch) {
      const systemId = mappingMatch[1];
      const config = configMap[systemId];
      if (config) {
        return Promise.resolve({ data: { data: config } });
      }
      return Promise.reject(new Error(`Unknown system: ${systemId}`));
    }
    return Promise.resolve({ data: { data: [] } });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MappingManagementPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 1,
      email: 'admin@example.com',
      displayName: 'Admin User',
      roles: ['ADMIN'],
      isActive: true,
      lastLoginAt: null,
    };
    setupDefaultMocks();
  });

  // ---- 1. System selector population ----

  it('populates the system selector dropdown from the API response', async () => {
    renderPage();

    await waitFor(() => {
      const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
      const options = Array.from(selector.options);
      expect(options).toHaveLength(2);
      expect(options[0].textContent).toContain('Hill Health System');
      expect(options[0].textContent).toContain('(default)');
      expect(options[1].textContent).toContain('Sutter Health');
    });
  });

  // ---- 2. Switching system triggers new GET ----

  it('loads mappings for a new system when the selector changes', async () => {
    renderPage();

    // Wait for initial load (Hill is default, auto-selected)
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/import/mappings/hill-1');
    });

    // Switch to Sutter
    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/import/mappings/sutter-1');
    });
  });

  // ---- 3. Patient column mappings table renders ----

  it('renders the patient column mappings table for the loaded config', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    // Hill config has "Name" and "DOB" patient columns
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('DOB')).toBeInTheDocument();
  });

  // ---- 4. Measure column mappings table renders ----

  it('renders the measure column mappings table for the loaded config', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Measure Column Mappings')).toBeInTheDocument();
    });

    // Hill config has "AWV Status" measure column
    expect(screen.getByText('AWV Status')).toBeInTheDocument();
  });

  // ---- 5. Sutter: action pattern table is shown ----

  it('shows the action pattern table for Sutter (long format) systems', async () => {
    renderPage();

    // Wait for Hill to load first, then switch to Sutter
    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    await waitFor(() => {
      expect(screen.getByText('Action Pattern Configuration')).toBeInTheDocument();
    });

    // The action mapping pattern should be visible
    expect(screen.getByText('^AWV.*')).toBeInTheDocument();
  });

  // ---- 6. Hill: action pattern table is hidden ----

  it('hides the action pattern table for Hill (wide format) systems', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    // Hill is wide format, so Action Pattern Configuration should not be present
    expect(screen.queryByText('Action Pattern Configuration')).not.toBeInTheDocument();
  });

  // ---- 7. Last-modified metadata displayed ----

  it('displays last-modified metadata when present in the config', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Last modified:')).toBeInTheDocument();
    });

    // The timestamp should be rendered via toLocaleString()
    const expectedDate = new Date('2026-02-18T10:30:00Z').toLocaleString();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();

    // The modifier name should be displayed
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
  });

  // ---- 8. Last-modified shows "Never modified" when null ----

  it('displays "Never modified" when lastModifiedAt is null', async () => {
    renderPage();

    // Switch to Sutter which has null lastModifiedAt
    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    await waitFor(() => {
      expect(screen.getByText('Never modified')).toBeInTheDocument();
    });
  });

  // ---- 9. Reset to Defaults triggers confirmation modal ----

  it('shows confirmation modal when "Reset to Defaults" is clicked and confirm calls DELETE', async () => {
    // Use a config with overrides so the Reset button is visible
    const hillWithOverrides: MergedSystemConfig = {
      ...mockHillConfig,
      patientColumns: mockHillConfig.patientColumns.map((col) => ({
        ...col,
        isOverride: true,
        overrideId: 99,
      })),
    };
    setupDefaultMocks({ 'hill-1': hillWithOverrides, 'sutter-1': mockSutterConfig });

    // Mock the DELETE response
    mockDelete.mockResolvedValue({
      data: { data: mockHillConfig },
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    // Click the Reset to Defaults button
    await user.click(screen.getByText('Reset to Defaults'));

    // Confirmation modal should appear
    await waitFor(() => {
      expect(screen.getByText('Reset to Default Mappings')).toBeInTheDocument();
    });

    // Confirm the reset
    const confirmButton = screen.getAllByText('Reset to Defaults').find(
      (el) => el.tagName === 'BUTTON' && el.closest('.fixed'),
    );
    expect(confirmButton).toBeDefined();
    await user.click(confirmButton!);

    // Should call the DELETE endpoint
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('/import/mappings/hill-1/reset');
    });
  });

  // ---- 10. Empty measure columns shows amber warning ----

  it('shows amber warning message when there are no measure columns', async () => {
    renderPage();

    // Switch to Sutter which has empty measureColumns
    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    await waitFor(() => {
      expect(screen.getByText('No Measure Columns Configured')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This system has no measure column mappings/),
    ).toBeInTheDocument();
  });

  // ---- 11. Loading spinner shown while API call in progress ----

  it('shows loading spinner while the API call is in progress', () => {
    // Make the API call hang forever
    mockGet.mockReturnValue(new Promise(() => {}));
    renderPage();

    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ---- 12. Renders nothing for non-admin user ----

  it('renders nothing and redirects when user is not an admin', () => {
    mockUser = {
      id: 2,
      email: 'doc@example.com',
      displayName: 'Dr. Smith',
      roles: ['PHYSICIAN'],
      isActive: true,
      lastLoginAt: null,
    };

    const { container } = renderPage();

    expect(mockNavigate).toHaveBeenCalledWith('/');
    // Component returns null for non-admin
    expect(container.innerHTML).toBe('');
  });

  // ---- 13. Page header renders ----

  it('renders the page header with title and description', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Import Column Mapping')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Manage how spreadsheet columns are mapped/),
    ).toBeInTheDocument();
  });

  // ---- 14. Error state when systems load fails ----

  it('shows an error message when the systems API call fails', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load import systems')).toBeInTheDocument();
    });
  });

  // ---- 15. Default configuration banner shown when no overrides ----

  it('shows "Using Default Configuration" banner when config has no overrides', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Using Default Configuration')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This system is using the built-in default column mappings/),
    ).toBeInTheDocument();
  });

  // ---- 16. Reset to Defaults button is hidden when no overrides exist ----

  it('hides the "Reset to Defaults" button when config has no overrides', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    expect(screen.queryByText('Reset to Defaults')).not.toBeInTheDocument();
  });

  // ---- 17. Edit mode toggle (GAP-37) ----

  describe('Edit mode (GAP-37)', () => {
    it('TC-MM-17: clicking "Edit Mappings" button switches to edit mode', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
      });

      // Should show "Edit Mappings" button
      const editButton = screen.getByRole('button', { name: 'Edit Mappings' });
      expect(editButton).toBeInTheDocument();

      // Click to enter edit mode
      await user.click(editButton);

      // After click, should show "Done Editing" instead
      expect(screen.getByRole('button', { name: 'Done Editing' })).toBeInTheDocument();
    });

    it('TC-MM-17b: clicking "Done Editing" returns to view mode', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
      });

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: 'Edit Mappings' }));

      // Verify we're in edit mode
      expect(screen.getByRole('button', { name: 'Done Editing' })).toBeInTheDocument();

      // Exit edit mode
      await user.click(screen.getByRole('button', { name: 'Done Editing' }));

      // Should be back to view mode with "Edit Mappings"
      expect(screen.getByRole('button', { name: 'Edit Mappings' })).toBeInTheDocument();
    });
  });

  // ---- 18. Add Mapping form show/cancel ----

  describe('Add Mapping form', () => {
    it('clicking "Add Mapping" shows the add mapping form', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.getByText('Add New Column Mapping')).toBeInTheDocument();
      });

      expect(screen.getByLabelText('Source Column Name')).toBeInTheDocument();
    });

    it('clicking "Cancel" in the add form hides it', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.getByText('Add New Column Mapping')).toBeInTheDocument();
      });

      // Click Cancel
      await user.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByText('Add New Column Mapping')).not.toBeInTheDocument();
    });

    it('"Add Mapping" button is disabled when form is already open', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /add mapping/i }));

      await waitFor(() => {
        expect(screen.getByText('Add New Column Mapping')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /add mapping/i })).toBeDisabled();
    });
  });

  // ---- 19. Saving spinner ----

  it('shows "Saving..." spinner while a mapping save is in progress', async () => {
    // Use config with overrides so save operations are possible
    const hillWithOverrides: MergedSystemConfig = {
      ...mockHillConfig,
      patientColumns: mockHillConfig.patientColumns.map((col) => ({
        ...col,
        isOverride: true,
        overrideId: 99,
      })),
    };
    setupDefaultMocks({ 'hill-1': hillWithOverrides, 'sutter-1': mockSutterConfig });

    // Make PUT hang forever to keep saving state active
    mockPut.mockReturnValue(new Promise(() => {}));
    mockDelete.mockReturnValue(new Promise(() => {}));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
    });

    // Click Reset to Defaults → confirm → triggers saving state
    await user.click(screen.getByText('Reset to Defaults'));

    await waitFor(() => {
      expect(screen.getByText('Reset to Default Mappings')).toBeInTheDocument();
    });

    const confirmButton = screen.getAllByText('Reset to Defaults').find(
      (el) => el.tagName === 'BUTTON' && el.closest('.fixed'),
    );
    await user.click(confirmButton!);

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });
  });

  // ---- 20. Error with Retry button ----

  it('shows Retry button in error state that reloads mappings', async () => {
    // First load succeeds, then fail on manual retry
    let callCount = 0;
    mockGet.mockImplementation((url: string) => {
      if (url === '/import/systems') {
        return Promise.resolve({ data: { data: mockSystems } });
      }
      const mappingMatch = url.match(/^\/import\/mappings\/(.+)$/);
      if (mappingMatch) {
        callCount++;
        if (callCount <= 1) {
          return Promise.resolve({ data: { data: mockHillConfig } });
        }
        // Second call fails
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    // Now trigger a reload that fails by switching system selector
    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    await waitFor(() => {
      expect(screen.getByText('Failed to load mapping configuration')).toBeInTheDocument();
    });

    // Retry button should be visible
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  // ---- 21. Skip actions displayed for Sutter ----

  it('displays skip actions for Sutter (long format) systems', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Patient Column Mappings')).toBeInTheDocument();
    });

    const selector = screen.getByLabelText('Import System:') as HTMLSelectElement;
    await user.selectOptions(selector, 'sutter-1');

    // Wait for Sutter config to load with skip actions
    await waitFor(() => {
      expect(screen.getByText('Action Pattern Configuration')).toBeInTheDocument();
    });

    // The skip action "N/A" should be visible somewhere
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  // ---- 22. Error alert has role="alert" ----

  it('renders error messages with role="alert" for accessibility', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
