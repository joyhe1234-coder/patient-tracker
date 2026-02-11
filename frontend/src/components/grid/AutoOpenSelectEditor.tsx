import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

interface AutoOpenSelectEditorProps extends ICellEditorParams {
  values: string[];
}

const AutoOpenSelectEditor = forwardRef<unknown, AutoOpenSelectEditorProps>(
  ({ value, values, stopEditing }, ref) => {
    const [selectedValue, setSelectedValue] = useState<string>(value || '');
    const [highlightIndex, setHighlightIndex] = useState<number>(() => {
      const idx = values.indexOf(value || '');
      return idx >= 0 ? idx : 0;
    });
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // AG Grid cell editor interface
    useImperativeHandle(ref, () => ({
      getValue() {
        return selectedValue;
      },
      isPopup() {
        return true;
      },
      isCancelAfterEnd() {
        return false;
      },
    }));

    // Focus the list on mount
    useEffect(() => {
      listRef.current?.focus();
    }, []);

    // Scroll highlighted item into view
    useEffect(() => {
      itemRefs.current[highlightIndex]?.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex]);

    const handleSelect = useCallback((val: string) => {
      setSelectedValue(val);
      // Let AG Grid know we're done — value is picked up via getValue()
      setTimeout(() => stopEditing(), 0);
    }, [stopEditing]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightIndex(prev => Math.min(prev + 1, values.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          handleSelect(values[highlightIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          stopEditing(true); // cancel — revert to original
          break;
        case 'Tab':
          e.preventDefault();
          handleSelect(values[highlightIndex]);
          break;
        default:
          // Type-ahead: jump to first option starting with pressed key
          if (e.key.length === 1) {
            const key = e.key.toLowerCase();
            const idx = values.findIndex(v => v.toLowerCase().startsWith(key));
            if (idx >= 0) {
              setHighlightIndex(idx);
            }
          }
          break;
      }
    }, [values, highlightIndex, handleSelect, stopEditing]);

    return (
      <div
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="auto-open-select-editor"
      >
        {values.map((option, idx) => (
          <div
            key={option}
            ref={el => { itemRefs.current[idx] = el; }}
            className={`auto-open-select-option${idx === highlightIndex ? ' highlighted' : ''}${option === selectedValue ? ' selected' : ''}${option === '' ? ' clear-option' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault(); // prevent blur
              handleSelect(option);
            }}
            onMouseEnter={() => setHighlightIndex(idx)}
          >
            {option === '' ? (
              <span className="clear-label">(clear)</span>
            ) : (
              <>
                {option === value && <span className="check-mark">&#10003; </span>}
                {option}
              </>
            )}
          </div>
        ))}
      </div>
    );
  }
);

AutoOpenSelectEditor.displayName = 'AutoOpenSelectEditor';

export default AutoOpenSelectEditor;
