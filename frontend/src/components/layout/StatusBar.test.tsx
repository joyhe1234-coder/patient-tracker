/**
 * StatusBar Tests
 *
 * Tests for the StatusBar component: row count display, filter summary,
 * connection status indicator, and presence indicator.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the realtimeStore
vi.mock('../../stores/realtimeStore', () => ({
  useRealtimeStore: vi.fn(),
}));

import StatusBar from './StatusBar';
import { useRealtimeStore } from '../../stores/realtimeStore';

describe('StatusBar', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: connected, no other users
    vi.mocked(useRealtimeStore).mockImplementation((selector: any) => {
      const state = {
        connectionStatus: 'connected',
        roomUsers: [],
      };
      return selector(state);
    });
  });

  describe('Row Count', () => {
    it('shows "Showing X of Y rows" when filtered', () => {
      render(<StatusBar rowCount={25} totalRowCount={100} />);
      expect(screen.getByText('Showing 25 of 100 rows')).toBeInTheDocument();
    });

    it('shows "Showing X of X rows" when not filtered (consistent format)', () => {
      render(<StatusBar rowCount={100} totalRowCount={100} />);
      expect(screen.getByText('Showing 100 of 100 rows')).toBeInTheDocument();
    });

    it('shows "Showing X of X rows" when totalRowCount is undefined', () => {
      render(<StatusBar rowCount={50} />);
      expect(screen.getByText('Showing 50 of 50 rows')).toBeInTheDocument();
    });

    it('formats large numbers with locale separators', () => {
      render(<StatusBar rowCount={1500} totalRowCount={10000} />);
      expect(screen.getByText(/Showing 1,500 of 10,000 rows/)).toBeInTheDocument();
    });

    it('shows zero rows correctly', () => {
      render(<StatusBar rowCount={0} totalRowCount={100} />);
      expect(screen.getByText('Showing 0 of 100 rows')).toBeInTheDocument();
    });
  });

  describe('Filter Summary', () => {
    it('shows filter summary when provided', () => {
      render(<StatusBar rowCount={25} totalRowCount={100} filterSummary="Color: In Progress | Measure: Diabetic Eye Exam" />);
      expect(screen.getByText('Color: In Progress | Measure: Diabetic Eye Exam')).toBeInTheDocument();
    });

    it('does not show filter summary when undefined', () => {
      render(<StatusBar rowCount={100} totalRowCount={100} />);
      expect(screen.queryByText(/Color:|Measure:/)).not.toBeInTheDocument();
    });

    it('shows combined summary with pipe separator', () => {
      render(<StatusBar rowCount={8} totalRowCount={220} filterSummary="Color: Completed | Measure: AWV" />);
      expect(screen.getByText('Color: Completed | Measure: AWV')).toBeInTheDocument();
    });
  });

  describe('Connection Status', () => {
    it('shows green "Connected" when status is connected', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'connected', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).toContain('bg-green-500');
    });

    it('shows yellow "Reconnecting..." when status is reconnecting', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'reconnecting', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).toContain('bg-yellow-500');
    });

    it('shows red "Disconnected" when status is disconnected', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'disconnected', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).toContain('bg-red-500');
    });

    it('shows gray "Offline mode" when status is offline', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'offline', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('Offline mode')).toBeInTheDocument();
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).toContain('bg-gray-400');
    });

    it('shows no indicator when status is connecting', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'connecting', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.queryByTestId('connection-dot')).not.toBeInTheDocument();
    });
  });

  describe('Presence Indicator', () => {
    it('shows presence indicator when roomUsers has entries', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({
          connectionStatus: 'connected',
          roomUsers: [{ id: 1, displayName: 'Dr. Smith' }],
        })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('1 other online')).toBeInTheDocument();
    });

    it('pluralizes "others" for multiple users', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({
          connectionStatus: 'connected',
          roomUsers: [
            { id: 1, displayName: 'Dr. Smith' },
            { id: 2, displayName: 'Nurse Jones' },
          ],
        })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.getByText('2 others online')).toBeInTheDocument();
    });

    it('hides presence indicator when roomUsers is empty', () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({ connectionStatus: 'connected', roomUsers: [] })
      );

      render(<StatusBar rowCount={10} />);

      expect(screen.queryByTestId('presence-indicator')).not.toBeInTheDocument();
    });

    it('shows tooltip with user names on hover', async () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({
          connectionStatus: 'connected',
          roomUsers: [
            { id: 1, displayName: 'Dr. Smith' },
            { id: 2, displayName: 'Nurse Jones' },
          ],
        })
      );

      render(<StatusBar rowCount={10} />);

      const indicator = screen.getByTestId('presence-indicator');
      await user.hover(indicator);

      expect(screen.getByTestId('presence-tooltip')).toBeInTheDocument();
      expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
      expect(screen.getByText('Nurse Jones')).toBeInTheDocument();
    });

    it('hides tooltip on mouse leave', async () => {
      vi.mocked(useRealtimeStore).mockImplementation((selector: any) =>
        selector({
          connectionStatus: 'connected',
          roomUsers: [{ id: 1, displayName: 'Dr. Smith' }],
        })
      );

      render(<StatusBar rowCount={10} />);

      const indicator = screen.getByTestId('presence-indicator');
      await user.hover(indicator);
      expect(screen.getByTestId('presence-tooltip')).toBeInTheDocument();

      await user.unhover(indicator);
      expect(screen.queryByTestId('presence-tooltip')).not.toBeInTheDocument();
    });
  });
});
