import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock child tab components to keep tests focused on PatientManagementPage logic
vi.mock('./ImportPage', () => ({
  ImportTabContent: () => <div data-testid="import-tab-content">Import Tab Content</div>,
}));

vi.mock('./PatientAssignmentPage', () => ({
  ReassignTabContent: ({ isActive }: { isActive: boolean }) => (
    <div data-testid="reassign-tab-content" data-active={isActive}>
      Reassign Tab Content
    </div>
  ),
}));

vi.mock('./BulkOperationsTab', () => ({
  BulkOperationsTab: ({ isActive }: { isActive: boolean }) => (
    <div data-testid="bulk-ops-tab-content" data-active={isActive}>
      Bulk Operations Tab Content
    </div>
  ),
}));

// Mock authStore — default ADMIN user, overridden per test as needed
const mockUseAuthStore = vi.fn();
vi.mock('../stores/authStore', () => ({
  useAuthStore: (...args: unknown[]) => mockUseAuthStore(...args),
}));

import PatientManagementPage from './PatientManagementPage';

function makeUser(roles: string[]) {
  return {
    id: 1,
    email: 'test@example.com',
    displayName: 'Test User',
    roles,
  };
}

function renderPage(initialEntries: string[] = ['/patient-management']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <PatientManagementPage />
    </MemoryRouter>
  );
}

describe('PatientManagementPage', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN']) });
  });

  describe('Page structure', () => {
    it('renders page heading "Patient Management"', () => {
      renderPage();
      expect(screen.getByText('Patient Management')).toBeInTheDocument();
    });

    it('renders the page icon', () => {
      renderPage();
      // ClipboardList icon is inside a blue container
      const iconContainer = screen.getByText('Patient Management').closest('div')?.querySelector('.bg-blue-100');
      expect(iconContainer).toBeTruthy();
    });
  });

  describe('Tab visibility by role', () => {
    it('ADMIN sees both "Import Patients" and "Reassign Patients" tabs', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN']) });
      renderPage();

      expect(screen.getByText('Import Patients')).toBeInTheDocument();
      expect(screen.getByText('Reassign Patients')).toBeInTheDocument();
    });

    it('STAFF sees only "Import Patients" tab', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage();

      expect(screen.getByText('Import Patients')).toBeInTheDocument();
      expect(screen.queryByText('Reassign Patients')).not.toBeInTheDocument();
    });

    it('PHYSICIAN sees only "Import Patients" tab', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['PHYSICIAN']) });
      renderPage();

      expect(screen.getByText('Import Patients')).toBeInTheDocument();
      expect(screen.queryByText('Reassign Patients')).not.toBeInTheDocument();
    });

    it('ADMIN+PHYSICIAN sees both "Import Patients" and "Reassign Patients" tabs', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN', 'PHYSICIAN']) });
      renderPage();

      expect(screen.getByText('Import Patients')).toBeInTheDocument();
      expect(screen.getByText('Reassign Patients')).toBeInTheDocument();
    });
  });

  describe('Default tab behavior', () => {
    it('renders Import tab by default (no query param)', () => {
      renderPage();

      // Import tab content should be visible
      const importContent = screen.getByTestId('import-tab-content');
      expect(importContent.closest('.tab-visible')).toBeTruthy();
    });

    it('Import tab is styled as active by default', () => {
      renderPage();

      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600', 'text-blue-600');
    });
  });

  describe('Tab switching', () => {
    it('clicking "Reassign Patients" tab shows reassign content', async () => {
      renderPage();

      await user.click(screen.getByText('Reassign Patients'));

      const reassignContent = screen.getByTestId('reassign-tab-content');
      expect(reassignContent.closest('.tab-visible')).toBeTruthy();

      const importContent = screen.getByTestId('import-tab-content');
      expect(importContent.closest('.tab-hidden')).toBeTruthy();
    });

    it('clicking "Import Patients" tab after switching shows import content', async () => {
      renderPage();

      // Switch to Reassign
      await user.click(screen.getByText('Reassign Patients'));
      // Switch back to Import
      await user.click(screen.getByText('Import Patients'));

      const importContent = screen.getByTestId('import-tab-content');
      expect(importContent.closest('.tab-visible')).toBeTruthy();
    });

    it('passes isActive=true to ReassignTabContent when Reassign tab is active', async () => {
      renderPage();

      await user.click(screen.getByText('Reassign Patients'));

      const reassignContent = screen.getByTestId('reassign-tab-content');
      expect(reassignContent).toHaveAttribute('data-active', 'true');
    });

    it('passes isActive=false to ReassignTabContent when Import tab is active', () => {
      renderPage();

      const reassignContent = screen.getByTestId('reassign-tab-content');
      expect(reassignContent).toHaveAttribute('data-active', 'false');
    });
  });

  describe('URL param handling', () => {
    it('?tab=reassign activates Reassign tab for ADMIN', () => {
      renderPage(['/patient-management?tab=reassign']);

      const reassignTab = screen.getByText('Reassign Patients');
      expect(reassignTab).toHaveClass('border-b-2', 'border-blue-600');

      const reassignContent = screen.getByTestId('reassign-tab-content');
      expect(reassignContent.closest('.tab-visible')).toBeTruthy();
    });

    it('?tab=reassign falls back to Import for STAFF', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage(['/patient-management?tab=reassign']);

      // Reassign tab should not exist
      expect(screen.queryByText('Reassign Patients')).not.toBeInTheDocument();

      // Import should be active
      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600');
    });

    it('?tab=reassign falls back to Import for PHYSICIAN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['PHYSICIAN']) });
      renderPage(['/patient-management?tab=reassign']);

      expect(screen.queryByText('Reassign Patients')).not.toBeInTheDocument();

      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600');
    });

    it('?tab=invalid falls back to Import tab', () => {
      renderPage(['/patient-management?tab=invalid']);

      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600');
    });

    it('?tab=reassign activates Reassign tab for ADMIN+PHYSICIAN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN', 'PHYSICIAN']) });
      renderPage(['/patient-management?tab=reassign']);

      const reassignTab = screen.getByText('Reassign Patients');
      expect(reassignTab).toHaveClass('border-b-2', 'border-blue-600');
    });
  });

  describe('Tab content mounting', () => {
    it('Import tab content is always rendered (for state preservation)', () => {
      renderPage();
      expect(screen.getByTestId('import-tab-content')).toBeInTheDocument();
    });

    it('Reassign tab content is rendered for ADMIN (for state preservation)', () => {
      renderPage();
      expect(screen.getByTestId('reassign-tab-content')).toBeInTheDocument();
    });

    it('Reassign tab content is NOT rendered for non-ADMIN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage();
      expect(screen.queryByTestId('reassign-tab-content')).not.toBeInTheDocument();
    });

    it('Reassign tab content is rendered for ADMIN+PHYSICIAN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN', 'PHYSICIAN']) });
      renderPage();
      expect(screen.getByTestId('reassign-tab-content')).toBeInTheDocument();
    });
  });

  describe('Bulk Operations tab', () => {
    // Tab visibility
    it('ADMIN sees "Bulk Operations" tab', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['ADMIN']) });
      renderPage();

      expect(screen.getByText('Bulk Operations')).toBeInTheDocument();
    });

    it('STAFF does NOT see "Bulk Operations" tab', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage();

      expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();
    });

    it('PHYSICIAN does NOT see "Bulk Operations" tab', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['PHYSICIAN']) });
      renderPage();

      expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();
    });

    // URL params
    it('?tab=bulk-ops activates Bulk Operations tab for ADMIN', () => {
      renderPage(['/patient-management?tab=bulk-ops']);

      const bulkOpsTab = screen.getByText('Bulk Operations');
      expect(bulkOpsTab).toHaveClass('border-b-2', 'border-blue-600');

      const bulkOpsContent = screen.getByTestId('bulk-ops-tab-content');
      expect(bulkOpsContent.closest('.tab-visible')).toBeTruthy();
    });

    it('?tab=bulk-ops falls back to Import for STAFF', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage(['/patient-management?tab=bulk-ops']);

      expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();

      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600');
    });

    it('?tab=bulk-ops falls back to Import for PHYSICIAN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['PHYSICIAN']) });
      renderPage(['/patient-management?tab=bulk-ops']);

      expect(screen.queryByText('Bulk Operations')).not.toBeInTheDocument();

      const importTab = screen.getByText('Import Patients');
      expect(importTab).toHaveClass('border-b-2', 'border-blue-600');
    });

    // Tab switching
    it('clicking "Bulk Operations" tab shows bulk-ops content', async () => {
      renderPage();

      await user.click(screen.getByText('Bulk Operations'));

      const bulkOpsContent = screen.getByTestId('bulk-ops-tab-content');
      expect(bulkOpsContent.closest('.tab-visible')).toBeTruthy();

      const importContent = screen.getByTestId('import-tab-content');
      expect(importContent.closest('.tab-hidden')).toBeTruthy();
    });

    it('passes isActive=true to BulkOperationsTab when tab is active', async () => {
      renderPage();

      await user.click(screen.getByText('Bulk Operations'));

      const bulkOpsContent = screen.getByTestId('bulk-ops-tab-content');
      expect(bulkOpsContent).toHaveAttribute('data-active', 'true');
    });

    it('passes isActive=false to BulkOperationsTab when Import tab is active', () => {
      renderPage();

      const bulkOpsContent = screen.getByTestId('bulk-ops-tab-content');
      expect(bulkOpsContent).toHaveAttribute('data-active', 'false');
    });

    // Tab content mounting
    it('Bulk Operations tab content is rendered for ADMIN', () => {
      renderPage();
      expect(screen.getByTestId('bulk-ops-tab-content')).toBeInTheDocument();
    });

    it('Bulk Operations tab content is NOT rendered for non-ADMIN', () => {
      mockUseAuthStore.mockReturnValue({ user: makeUser(['STAFF']) });
      renderPage();
      expect(screen.queryByTestId('bulk-ops-tab-content')).not.toBeInTheDocument();
    });

    // Document title
    it('sets document.title to "Patient Management - Bulk Operations" when tab is bulk-ops', () => {
      renderPage(['/patient-management?tab=bulk-ops']);

      expect(document.title).toBe('Patient Management - Bulk Operations');
    });
  });
});
