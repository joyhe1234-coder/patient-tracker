import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { createRef } from 'react';
import AutoOpenSelectEditor from './AutoOpenSelectEditor';
import { createCellEditorParams } from '../../test-utils/agGridMocks';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Factory for AutoOpenSelectEditor props (extends ICellEditorParams with `values`)
const createEditorProps = (overrides: Record<string, unknown> = {}) =>
  createCellEditorParams({
    value: 'AWV',
    values: ['', 'AWV', 'Chronic DX', 'Quality', 'Screening'],
    ...overrides,
  });

describe('AutoOpenSelectEditor', () => {
  let stopEditing: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stopEditing = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders all provided option values', () => {
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor {...props} />);

      expect(screen.getByText('AWV')).toBeInTheDocument();
      expect(screen.getByText('Chronic DX')).toBeInTheDocument();
      expect(screen.getByText('Quality')).toBeInTheDocument();
      expect(screen.getByText('Screening')).toBeInTheDocument();
    });

    it('displays empty string as "(clear)"', () => {
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor {...props} />);

      expect(screen.getByText('(clear)')).toBeInTheDocument();
    });

    it('highlights the current value on mount', () => {
      const props = createEditorProps({ stopEditing, value: 'Quality' });
      render(<AutoOpenSelectEditor {...props} />);

      // The option matching the current value should have the 'highlighted' class
      const qualityOption = screen.getByText('Quality').closest('.auto-open-select-option');
      expect(qualityOption?.className).toContain('highlighted');
    });

    it('shows checkmark next to the current value', () => {
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor {...props} />);

      const checkmark = document.querySelector('.check-mark');
      expect(checkmark).toBeInTheDocument();
    });

    it('applies selected class to the current value', () => {
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor {...props} />);

      const awvOption = screen.getByText('AWV').closest('.auto-open-select-option');
      expect(awvOption?.className).toContain('selected');
    });

    it('applies clear-option class to the empty string option', () => {
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor {...props} />);

      const clearOption = screen.getByText('(clear)').closest('.auto-open-select-option');
      expect(clearOption?.className).toContain('clear-option');
    });
  });

  describe('AG Grid Interface', () => {
    it('getValue() returns selected value', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      expect(ref.current.getValue()).toBe('AWV');
    });

    it('isPopup() returns true', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      expect(ref.current.isPopup()).toBe(true);
    });

    it('isCancelAfterEnd() returns false', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      expect(ref.current.isCancelAfterEnd()).toBe(false);
    });
  });

  describe('Keyboard Navigation', () => {
    // NOTE: keyboard tests use fireEvent.keyDown (synchronous) rather than
    // userEvent.keyboard because the combination of fake timers and
    // userEvent's internal async scheduling causes 5-second timeouts.

    it('ArrowDown moves highlight to next option', () => {
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'ArrowDown' });

      // AWV is index 1, ArrowDown should move to index 2 (Chronic DX)
      const chronicOption = screen.getByText('Chronic DX').closest('.auto-open-select-option');
      expect(chronicOption?.className).toContain('highlighted');
    });

    it('ArrowUp moves highlight to previous option', () => {
      const props = createEditorProps({ stopEditing, value: 'Quality' });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'ArrowUp' });

      // Quality is index 3, ArrowUp should move to index 2 (Chronic DX)
      const chronicOption = screen.getByText('Chronic DX').closest('.auto-open-select-option');
      expect(chronicOption?.className).toContain('highlighted');
    });

    it('ArrowDown stops at last option (no wrap)', () => {
      const props = createEditorProps({ stopEditing, value: 'Screening' });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'ArrowDown' });

      // Screening is last (index 4), should stay at index 4
      const screeningOption = screen.getByText('Screening').closest('.auto-open-select-option');
      expect(screeningOption?.className).toContain('highlighted');
    });

    it('ArrowUp stops at first option (no wrap)', () => {
      const props = createEditorProps({ stopEditing, value: '' });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'ArrowUp' });

      // Empty is first (index 0), should stay at index 0
      const clearOption = screen.getByText('(clear)').closest('.auto-open-select-option');
      expect(clearOption?.className).toContain('highlighted');
    });

    it('Enter selects highlighted option and calls stopEditing', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      // Move to Chronic DX
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      // Press Enter
      fireEvent.keyDown(container, { key: 'Enter' });

      // Advance the setTimeout
      act(() => { vi.advanceTimersByTime(10); });

      expect(stopEditing).toHaveBeenCalledWith();
      expect(ref.current.getValue()).toBe('Chronic DX');
    });

    it('Escape calls stopEditing(true) to cancel', () => {
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'Escape' });

      expect(stopEditing).toHaveBeenCalledWith(true);
    });

    it('Tab selects highlighted option and calls stopEditing', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'Tab' });

      act(() => { vi.advanceTimersByTime(10); });

      expect(stopEditing).toHaveBeenCalledWith();
      expect(ref.current.getValue()).toBe('AWV');
    });

    it('type-ahead: pressing "q" jumps to first option starting with "q"', () => {
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor')!;
      fireEvent.keyDown(container, { key: 'q' });

      const qualityOption = screen.getByText('Quality').closest('.auto-open-select-option');
      expect(qualityOption?.className).toContain('highlighted');
    });
  });

  describe('Mouse Interaction', () => {
    it('mouseDown on option selects it and calls stopEditing', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor ref={ref} {...props} />);

      const screeningOption = screen.getByText('Screening');
      // Kept as fireEvent.mouseDown: the component uses onMouseDown (not onClick)
      // to select options, preventing blur-related issues in AG Grid editors.
      fireEvent.mouseDown(screeningOption);

      act(() => { vi.advanceTimersByTime(10); });

      expect(stopEditing).toHaveBeenCalledWith();
      expect(ref.current.getValue()).toBe('Screening');
    });

    it('mouseEnter on option highlights it', () => {
      const props = createEditorProps({ stopEditing, value: 'AWV' });
      render(<AutoOpenSelectEditor {...props} />);

      const qualityOption = screen.getByText('Quality').closest('.auto-open-select-option')!;
      fireEvent.mouseEnter(qualityOption);

      expect(qualityOption.className).toContain('highlighted');
    });
  });

  describe('Focus', () => {
    it('focuses the list container on mount', () => {
      const props = createEditorProps({ stopEditing });
      render(<AutoOpenSelectEditor {...props} />);

      const container = document.querySelector('.auto-open-select-editor');
      expect(container).toBe(document.activeElement);
    });
  });

  describe('Edge Cases', () => {
    it('handles value not in options list (defaults to index 0)', () => {
      const props = createEditorProps({ stopEditing, value: 'Unknown' });
      render(<AutoOpenSelectEditor {...props} />);

      // Should default to index 0 (clear option)
      const clearOption = screen.getByText('(clear)').closest('.auto-open-select-option');
      expect(clearOption?.className).toContain('highlighted');
    });

    it('handles null/undefined value', () => {
      const props = createEditorProps({ stopEditing, value: null });
      render(<AutoOpenSelectEditor {...props} />);

      // Should render without error
      expect(screen.getByText('AWV')).toBeInTheDocument();
    });
  });
});
