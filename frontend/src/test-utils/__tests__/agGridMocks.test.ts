import { describe, it, expect, vi } from 'vitest';
import {
  createMockGridApi,
  createMockRowNode,
  createMockColumn,
  createCellEditorParams,
  createCellRendererParams,
  createValueFormatterParams,
  createValueGetterParams,
  createValueSetterParams,
  createCellValueChangedEvent,
} from '../agGridMocks';

describe('agGridMocks', () => {
  describe('createMockGridApi', () => {
    it('returns an object with callable mock methods', () => {
      const api = createMockGridApi();

      expect(typeof api.refreshCells).toBe('function');
      expect(typeof api.applyTransaction).toBe('function');
      expect(typeof api.getSelectedRows).toBe('function');

      // Calling a mock method should not throw
      api.refreshCells({});
      expect(api.refreshCells).toHaveBeenCalled();
    });

    it('applies overrides', () => {
      const customRefresh = vi.fn();
      const api = createMockGridApi({ refreshCells: customRefresh });

      api.refreshCells({});
      expect(customRefresh).toHaveBeenCalled();
    });
  });

  describe('createMockRowNode', () => {
    it('returns an object with setDataValue and setData as vi.fn()', () => {
      const node = createMockRowNode();

      expect(typeof node.setDataValue).toBe('function');
      expect(typeof node.setData).toBe('function');

      node.setDataValue('field', 'value');
      expect(node.setDataValue).toHaveBeenCalledWith('field', 'value');
    });

    it('applies overrides', () => {
      const node = createMockRowNode({ rowIndex: 5, id: '42' });

      expect(node.rowIndex).toBe(5);
      expect(node.id).toBe('42');
    });
  });

  describe('createMockColumn', () => {
    it('returns an object with callable getColId', () => {
      const col = createMockColumn();

      expect(typeof col.getColId).toBe('function');
      expect(col.getColId()).toBe('mockCol');
    });

    it('applies overrides', () => {
      const customGetColId = vi.fn(() => 'customCol');
      const col = createMockColumn({ getColId: customGetColId });

      expect(col.getColId()).toBe('customCol');
    });
  });

  describe('createCellEditorParams', () => {
    it('returns params with all required ICellEditorParams fields', () => {
      const params = createCellEditorParams();

      expect(params).toHaveProperty('value');
      expect(params).toHaveProperty('eventKey');
      expect(params).toHaveProperty('column');
      expect(params).toHaveProperty('colDef');
      expect(params).toHaveProperty('node');
      expect(params).toHaveProperty('data');
      expect(params).toHaveProperty('rowIndex');
      expect(params).toHaveProperty('api');
      expect(params).toHaveProperty('cellStartedEdit');
      expect(params).toHaveProperty('onKeyDown');
      expect(params).toHaveProperty('stopEditing');
      expect(params).toHaveProperty('eGridCell');
      expect(params).toHaveProperty('parseValue');
      expect(params).toHaveProperty('formatValue');
    });

    it('applies overrides correctly', () => {
      const customStop = vi.fn();
      const params = createCellEditorParams({
        value: 'test-value',
        stopEditing: customStop,
        rowIndex: 3,
      });

      expect(params.value).toBe('test-value');
      expect(params.stopEditing).toBe(customStop);
      expect(params.rowIndex).toBe(3);
    });

    it('stopEditing and onKeyDown are callable vi.fn()', () => {
      const params = createCellEditorParams();

      params.stopEditing();
      expect(params.stopEditing).toHaveBeenCalled();

      const event = new KeyboardEvent('keydown');
      params.onKeyDown(event);
      expect(params.onKeyDown).toHaveBeenCalledWith(event);
    });

    it('eGridCell is a real HTMLDivElement', () => {
      const params = createCellEditorParams();
      expect(params.eGridCell).toBeInstanceOf(HTMLDivElement);
    });

    it('accepts additional properties via Record<string, unknown>', () => {
      const params = createCellEditorParams({ values: ['A', 'B', 'C'] });
      expect((params as any).values).toEqual(['A', 'B', 'C']);
    });
  });

  describe('createCellRendererParams', () => {
    it('returns params with all required ICellRendererParams fields', () => {
      const params = createCellRendererParams();

      expect(params).toHaveProperty('value');
      expect(params).toHaveProperty('valueFormatted');
      expect(params).toHaveProperty('data');
      expect(params).toHaveProperty('node');
      expect(params).toHaveProperty('column');
      expect(params).toHaveProperty('colDef');
      expect(params).toHaveProperty('api');
      expect(params).toHaveProperty('eGridCell');
      expect(params).toHaveProperty('eParentOfValue');
      expect(params).toHaveProperty('registerRowDragger');
      expect(params).toHaveProperty('setTooltip');
    });

    it('applies overrides correctly', () => {
      const params = createCellRendererParams({
        value: 'rendered-value',
        valueFormatted: 'formatted',
        rowIndex: 7,
      });

      expect(params.value).toBe('rendered-value');
      expect(params.valueFormatted).toBe('formatted');
      expect(params.rowIndex).toBe(7);
    });

    it('setValue and getValue are callable vi.fn()', () => {
      const params = createCellRendererParams();

      params.setValue!('new');
      expect(params.setValue).toHaveBeenCalledWith('new');

      params.getValue!();
      expect(params.getValue).toHaveBeenCalled();
    });
  });

  describe('createValueFormatterParams', () => {
    it('returns params with required fields', () => {
      const params = createValueFormatterParams();

      expect(params).toHaveProperty('value');
      expect(params).toHaveProperty('data');
      expect(params).toHaveProperty('node');
      expect(params).toHaveProperty('column');
      expect(params).toHaveProperty('colDef');
      expect(params).toHaveProperty('api');
    });

    it('applies overrides', () => {
      const params = createValueFormatterParams({ value: 42 });
      expect(params.value).toBe(42);
    });
  });

  describe('createValueGetterParams', () => {
    it('returns params with required fields', () => {
      const params = createValueGetterParams();

      expect(params).toHaveProperty('data');
      expect(params).toHaveProperty('node');
      expect(params).toHaveProperty('column');
      expect(params).toHaveProperty('colDef');
      expect(params).toHaveProperty('api');
      expect(params).toHaveProperty('getValue');
    });

    it('applies overrides', () => {
      const customData = { name: 'test' };
      const params = createValueGetterParams({ data: customData });
      expect(params.data).toBe(customData);
    });
  });

  describe('createValueSetterParams', () => {
    it('returns params with required fields including oldValue and newValue', () => {
      const params = createValueSetterParams();

      expect(params).toHaveProperty('data');
      expect(params).toHaveProperty('node');
      expect(params).toHaveProperty('oldValue');
      expect(params).toHaveProperty('newValue');
    });

    it('applies overrides', () => {
      const params = createValueSetterParams({
        oldValue: 'old',
        newValue: 'new',
      });

      expect(params.oldValue).toBe('old');
      expect(params.newValue).toBe('new');
    });
  });

  describe('createCellValueChangedEvent', () => {
    it('returns event with all required CellValueChangedEvent fields', () => {
      const event = createCellValueChangedEvent();

      expect(event).toHaveProperty('type', 'cellValueChanged');
      expect(event).toHaveProperty('data');
      expect(event).toHaveProperty('node');
      expect(event).toHaveProperty('column');
      expect(event).toHaveProperty('colDef');
      expect(event).toHaveProperty('value');
      expect(event).toHaveProperty('oldValue');
      expect(event).toHaveProperty('newValue');
      expect(event).toHaveProperty('source');
      expect(event).toHaveProperty('rowIndex');
      expect(event).toHaveProperty('rowPinned');
      expect(event).toHaveProperty('api');
    });

    it('applies overrides', () => {
      const mockNode = createMockRowNode({ id: '99' });
      const event = createCellValueChangedEvent({
        oldValue: 'before',
        newValue: 'after',
        node: mockNode,
      });

      expect(event.oldValue).toBe('before');
      expect(event.newValue).toBe('after');
      expect(event.node).toBe(mockNode);
    });

    it('node methods are callable vi.fn()', () => {
      const event = createCellValueChangedEvent();

      event.node.setDataValue('field', 'value');
      expect(event.node.setDataValue).toHaveBeenCalledWith('field', 'value');

      event.node.setData({ test: true } as any);
      expect(event.node.setData).toHaveBeenCalled();
    });

    it('api methods are callable vi.fn()', () => {
      const event = createCellValueChangedEvent();

      event.api.refreshCells({});
      expect(event.api.refreshCells).toHaveBeenCalled();
    });
  });
});
