import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { ICellEditorParams } from 'ag-grid-community';

/**
 * Simple inline text editor for the statusDate column.
 * Shows the existing date value for editing. No prepopulation —
 * the "Today" button on the StatusDateRenderer handles quick-stamping.
 */
const DateCellEditor = forwardRef<unknown, ICellEditorParams>(
  ({ value }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);

    // AG Grid cell editor interface
    useImperativeHandle(ref, () => ({
      getValue() {
        return inputRef.current?.value || '';
      },
      isPopup() {
        return false;
      },
      isCancelAfterEnd() {
        return false;
      },
    }));

    // Focus on mount
    useEffect(() => {
      inputRef.current?.focus();
    }, []);

    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={value || ''}
        className="date-cell-editor"
        aria-label="Status Date"
      />
    );
  }
);

DateCellEditor.displayName = 'DateCellEditor';

export default DateCellEditor;
