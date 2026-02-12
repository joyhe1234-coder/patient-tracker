import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import StatusDateRenderer from './StatusDateRenderer';

const createRendererParams = (overrides: Record<string, unknown> = {}) => ({
  value: null as string | null,
  data: { statusDatePrompt: 'Date Ordered', statusDate: null } as any,
  node: { setDataValue: vi.fn() } as any,
  column: {} as any,
  colDef: {} as any,
  api: {} as any,
  rowIndex: 0,
  getValue: vi.fn(),
  setValue: vi.fn(),
  formatValue: vi.fn(),
  refreshCell: vi.fn(),
  eGridCell: document.createElement('div'),
  eParentOfValue: document.createElement('div'),
  registerRowDragger: vi.fn(),
  ...overrides,
});

describe('StatusDateRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Filled Cell', () => {
    it('shows formatted date for filled cells', () => {
      const params = createRendererParams({ value: '2026-01-15T12:00:00.000Z' });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.getByText('1/15/2026')).toBeInTheDocument();
    });

    it('does not show Today button for filled cells', () => {
      const params = createRendererParams({ value: '2026-01-15T12:00:00.000Z' });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.queryByText('Today')).not.toBeInTheDocument();
    });

    it('does not show prompt text for filled cells', () => {
      const params = createRendererParams({ value: '2026-01-15T12:00:00.000Z' });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.queryByText('Date Ordered')).not.toBeInTheDocument();
    });
  });

  describe('Empty Cell with Prompt', () => {
    it('shows prompt text for empty cells', () => {
      const params = createRendererParams({ value: null });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.getByText('Date Ordered')).toBeInTheDocument();
    });

    it('shows Today button for empty cells', () => {
      const params = createRendererParams({ value: null });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('prompt text has correct CSS class', () => {
      const params = createRendererParams({ value: null });
      render(<StatusDateRenderer {...(params as any)} />);

      const prompt = screen.getByText('Date Ordered');
      expect(prompt.className).toContain('status-date-prompt');
    });

    it('Today button has correct CSS class', () => {
      const params = createRendererParams({ value: null });
      render(<StatusDateRenderer {...(params as any)} />);

      const btn = screen.getByText('Today');
      expect(btn.className).toContain('status-date-today-btn');
    });

    it('renders the wrapper div', () => {
      const params = createRendererParams({ value: null });
      render(<StatusDateRenderer {...(params as any)} />);

      const wrapper = document.querySelector('.status-date-renderer');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Today Button Click', () => {
    it('calls node.setDataValue with display-format date on click', () => {
      const setDataValue = vi.fn();
      const params = createRendererParams({
        value: null,
        node: { setDataValue },
      });
      render(<StatusDateRenderer {...(params as any)} />);

      fireEvent.click(screen.getByText('Today'));

      expect(setDataValue).toHaveBeenCalledTimes(1);
      // Should be M/D/YYYY format (display format), not ISO
      expect(setDataValue).toHaveBeenCalledWith('statusDate', expect.stringMatching(/^\d{1,2}\/\d{1,2}\/\d{4}$/));
    });

    it('sets today\'s date (not a hardcoded date)', () => {
      const setDataValue = vi.fn();
      const params = createRendererParams({
        value: null,
        node: { setDataValue },
      });
      render(<StatusDateRenderer {...(params as any)} />);

      fireEvent.click(screen.getByText('Today'));

      const now = new Date();
      const expected = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      expect(setDataValue).toHaveBeenCalledWith('statusDate', expected);
    });
  });

  describe('Empty Cell without Prompt', () => {
    it('renders nothing when no prompt text', () => {
      const params = createRendererParams({
        value: null,
        data: { statusDatePrompt: null, statusDate: null },
      });
      const { container } = render(<StatusDateRenderer {...(params as any)} />);

      expect(container.innerHTML).toBe('');
    });
  });

  describe('Different Prompt Texts', () => {
    it('shows "Date Completed" prompt', () => {
      const params = createRendererParams({
        value: null,
        data: { statusDatePrompt: 'Date Completed', statusDate: null },
      });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.getByText('Date Completed')).toBeInTheDocument();
    });

    it('shows "Date Declined" prompt', () => {
      const params = createRendererParams({
        value: null,
        data: { statusDatePrompt: 'Date Declined', statusDate: null },
      });
      render(<StatusDateRenderer {...(params as any)} />);

      expect(screen.getByText('Date Declined')).toBeInTheDocument();
    });
  });
});
