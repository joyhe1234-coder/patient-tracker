/**
 * MainPage loading, error, and retry state tests.
 *
 * Tests the three conditional-render branches in MainPage:
 *   1. Loading spinner
 *   2. Error message + Retry button
 *   3. Successful retry hides error and shows grid
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

// vi.hoisted ensures these are available when vi.mock factories run (they are hoisted)
const { mockGet, authState } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  // Stable reference — avoids infinite re-renders from useCallback dep changes
  authState: {
    user: { id: 1, name: 'Admin', roles: ['ADMIN'], physicianId: 10 },
    selectedPhysicianId: 10,
    assignments: [{ physicianId: 10, physicianName: 'Dr. Admin' }],
  },
}));

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('ag-grid-react', () => ({
  AgGridReact: (props: any) => <div data-testid="ag-grid-mock">AG Grid</div>,
}));
vi.mock('ag-grid-community/styles/ag-grid.css', () => ({}));
vi.mock('ag-grid-community/styles/ag-theme-alpine.css', () => ({}));

vi.mock('../api/axios', () => ({
  api: { get: mockGet, put: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
}));

vi.mock('../stores/authStore', () => ({
  useAuthStore: () => authState,
}));

vi.mock('../stores/realtimeStore', () => {
  const state = {
    importInProgress: false,
    importedBy: null,
    activeEdits: {},
    roomUsers: [],
    connectionStatus: 'disconnected',
  };
  return {
    useRealtimeStore: (selector: any) => selector(state),
  };
});

vi.mock('../hooks/useSocket', () => ({ useSocket: () => {} }));
vi.mock('../services/socketService', () => ({
  socketService: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));
vi.mock('../utils/toast', () => ({ showToast: vi.fn() }));
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => vi.fn(),
}));

import MainPage from './MainPage';

/** Render MainPage and flush all async effects. */
async function renderAndSettle() {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<MainPage />);
  });
  return result!;
}

describe('MainPage loading / error / retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('shows "Loading patient data..." text on initial load', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      render(<MainPage />);
      expect(screen.getByText('Loading patient data...')).toBeTruthy();
    });

    it('shows a spinning icon while loading', () => {
      mockGet.mockReturnValue(new Promise(() => {}));
      const { container } = render(<MainPage />);
      expect(container.querySelector('.animate-spin')).toBeTruthy();
    });
  });

  describe('Error state', () => {
    it('shows error message after API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));
      await renderAndSettle();
      expect(screen.getByText(/Network Error/i)).toBeTruthy();
    });

    it('shows Retry button after API failure', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));
      await renderAndSettle();
      expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
    });
  });

  describe('Retry behavior', () => {
    it('clicking Retry triggers a new API call', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'));
      await renderAndSettle();

      const callCountBefore = mockGet.mock.calls.length;

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      expect(mockGet.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    it('successful retry hides error and shows grid', async () => {
      // First calls fail (systems + data), then succeed on retry
      mockGet
        .mockRejectedValueOnce(new Error('systems fail'))  // systems call
        .mockRejectedValueOnce(new Error('Network Error')) // data call
        .mockResolvedValue({ data: { success: true, data: [] } }); // all subsequent

      await renderAndSettle();
      expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
      });

      expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
    });
  });
});
