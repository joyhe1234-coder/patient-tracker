import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UnmappedActionsBanner, {
  type UnmappedAction,
  type UnmappedActionsBannerProps,
} from './UnmappedActionsBanner';

const mockUnmappedActions: UnmappedAction[] = [
  { action: 'Schedule follow-up cardiac catheterization', count: 15 },
  { action: 'Order sleep study referral', count: 8 },
  { action: 'Initiate pulmonary rehab program', count: 3 },
];

function renderBanner(overrides: Partial<UnmappedActionsBannerProps> = {}) {
  const defaultProps: UnmappedActionsBannerProps = {
    unmappedActions: mockUnmappedActions,
    ...overrides,
  };
  return render(<UnmappedActionsBanner {...defaultProps} />);
}

describe('UnmappedActionsBanner', () => {
  describe('Visibility', () => {
    it('renders when unmappedActions array is present and non-empty', () => {
      renderBanner();

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('returns null when unmappedActions is empty array', () => {
      const { container } = renderBanner({ unmappedActions: [] });

      expect(container.innerHTML).toBe('');
    });

    it('returns null when unmappedActions is undefined', () => {
      const { container } = renderBanner({
        unmappedActions: undefined as unknown as UnmappedAction[],
      });

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Summary Text', () => {
    it('shows correct total skipped rows count', () => {
      // 15 + 8 + 3 = 26
      renderBanner();

      expect(screen.getByText(/26 rows skipped/)).toBeInTheDocument();
    });

    it('shows correct action type count', () => {
      renderBanner();

      expect(screen.getByText(/3 action types/)).toBeInTheDocument();
    });

    it('shows singular "row" when exactly 1 row skipped', () => {
      renderBanner({
        unmappedActions: [{ action: 'Some action', count: 1 }],
      });

      expect(screen.getByText(/1 row skipped/)).toBeInTheDocument();
    });

    it('shows singular "action type" when exactly 1 action type', () => {
      renderBanner({
        unmappedActions: [{ action: 'Some action', count: 5 }],
      });

      expect(screen.getByText(/1 action type\)/)).toBeInTheDocument();
    });

    it('shows explanatory text about excluded rows', () => {
      renderBanner();

      expect(
        screen.getByText(
          /These rows contain action text that does not match any configured quality measure mapping/
        )
      ).toBeInTheDocument();
    });
  });

  describe('ARIA role', () => {
    it('has role="status" on the container', () => {
      renderBanner();

      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Details', () => {
    it('shows "Show details" button initially', () => {
      renderBanner();

      expect(screen.getByText('Show details')).toBeInTheDocument();
    });

    it('does not show details table initially', () => {
      renderBanner();

      expect(screen.queryByText('Action Text')).not.toBeInTheDocument();
      expect(screen.queryByText('Rows')).not.toBeInTheDocument();
    });

    it('toggles to expanded state on click', async () => {
      renderBanner();

      const toggleButton = screen.getByText('Show details');
      await userEvent.click(toggleButton);

      // Should show table headers
      expect(screen.getByText('Action Text')).toBeInTheDocument();
      expect(screen.getByText('Rows')).toBeInTheDocument();

      // Button text should change
      expect(screen.getByText('Hide details')).toBeInTheDocument();
    });

    it('collapses back on second click', async () => {
      renderBanner();

      const toggleButton = screen.getByText('Show details');
      await userEvent.click(toggleButton);

      // Now collapse
      await userEvent.click(screen.getByText('Hide details'));

      // Details should be hidden again
      expect(screen.queryByText('Action Text')).not.toBeInTheDocument();
      expect(screen.getByText('Show details')).toBeInTheDocument();
    });

    it('has aria-expanded=false initially', () => {
      renderBanner();

      const button = screen.getByText('Show details');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });

    it('toggles aria-expanded to true when expanded', async () => {
      renderBanner();

      const button = screen.getByText('Show details');
      await userEvent.click(button);

      expect(screen.getByText('Hide details')).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Details Table Content', () => {
    it('displays action texts and counts correctly', async () => {
      renderBanner();

      // Expand details
      await userEvent.click(screen.getByText('Show details'));

      // Verify all action texts are shown
      expect(
        screen.getByText('Schedule follow-up cardiac catheterization')
      ).toBeInTheDocument();
      expect(screen.getByText('Order sleep study referral')).toBeInTheDocument();
      expect(screen.getByText('Initiate pulmonary rehab program')).toBeInTheDocument();

      // Verify counts are shown
      expect(screen.getByText('15')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('renders correct number of table rows', async () => {
      renderBanner();

      await userEvent.click(screen.getByText('Show details'));

      // Table should have header row + 3 data rows
      const rows = screen.getAllByRole('row');
      // 1 header row + 3 data rows = 4
      expect(rows).toHaveLength(4);
    });
  });
});
