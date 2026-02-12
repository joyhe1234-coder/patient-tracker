import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { createRef } from 'react';
import DateCellEditor from './DateCellEditor';

const createEditorProps = (overrides: Record<string, unknown> = {}) => ({
  value: '',
  eventKey: null,
  charPress: null,
  column: {} as any,
  colDef: {} as any,
  node: {} as any,
  data: {} as any,
  rowIndex: 0,
  api: {} as any,
  cellStartedEdit: true,
  onKeyDown: vi.fn(),
  stopEditing: vi.fn(),
  eGridCell: document.createElement('div'),
  parseValue: vi.fn(),
  formatValue: vi.fn(),
  ...overrides,
});

describe('DateCellEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders an input element', () => {
      const props = createEditorProps();
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor');
      expect(input).toBeInTheDocument();
      expect(input?.tagName).toBe('INPUT');
    });

    it('shows existing date value', () => {
      const props = createEditorProps({ value: '1/15/2026' });
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor') as HTMLInputElement;
      expect(input.value).toBe('1/15/2026');
    });

    it('shows empty string when value is empty', () => {
      const props = createEditorProps({ value: '' });
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('shows empty string when value is null', () => {
      const props = createEditorProps({ value: null });
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor') as HTMLInputElement;
      expect(input.value).toBe('');
    });

    it('has aria-label for accessibility', () => {
      const props = createEditorProps();
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor');
      expect(input?.getAttribute('aria-label')).toBe('Status Date');
    });
  });

  describe('AG Grid Interface', () => {
    it('getValue() returns current input value', () => {
      const ref = createRef<any>();
      const props = createEditorProps({ value: '1/15/2026' });
      render(<DateCellEditor ref={ref} {...(props as any)} />);

      expect(ref.current.getValue()).toBe('1/15/2026');
    });

    it('isPopup() returns false (inline editor)', () => {
      const ref = createRef<any>();
      const props = createEditorProps();
      render(<DateCellEditor ref={ref} {...(props as any)} />);

      expect(ref.current.isPopup()).toBe(false);
    });

    it('isCancelAfterEnd() returns false', () => {
      const ref = createRef<any>();
      const props = createEditorProps();
      render(<DateCellEditor ref={ref} {...(props as any)} />);

      expect(ref.current.isCancelAfterEnd()).toBe(false);
    });
  });

  describe('Focus', () => {
    it('input receives focus on mount', () => {
      const props = createEditorProps();
      render(<DateCellEditor {...(props as any)} />);

      const input = document.querySelector('.date-cell-editor');
      expect(input).toBe(document.activeElement);
    });
  });
});
