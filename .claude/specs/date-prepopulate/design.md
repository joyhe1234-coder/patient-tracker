# Design Document: Date Prepopulate (Status Date Auto-Fill on Edit)

## Overview

This feature adds automatic prepopulation of today's date when a user enters edit mode on an empty `statusDate` cell in the AG Grid. The implementation is entirely frontend, modifying the `statusDate` column definition in `PatientGrid.tsx` to use a custom cell editor that detects whether the cell was empty and, if so, fills the input with today's date with the text selected.

## Steering Document Alignment

### Technical Standards (tech.md)

- **Framework**: React 18 with TypeScript. No new dependencies.
- **AG Grid**: Uses the AG Grid Community cell editor API (`ICellEditorParams`, `ICellEditorComp`). Custom cell editor follows the same pattern as the existing `AutoOpenSelectEditor`.
- **State Management**: No global state changes. The feature is local to the cell editor component.
- **Styling**: Tailwind CSS utility classes for any new styling. Existing `index.css` patterns for AG Grid overrides.
- **Testing**: Vitest for component tests, Cypress for AG Grid E2E integration tests, MCP Playwright for visual review.
- **ESM**: Standard ESM imports/exports.

### Project Structure (structure.md)

All changes follow the existing directory layout and naming conventions:

| File | Convention Followed |
|------|-------------------|
| `frontend/src/components/grid/DateCellEditor.tsx` (new) | PascalCase component in `components/grid/` (alongside `AutoOpenSelectEditor.tsx`) |
| `frontend/src/components/grid/PatientGrid.tsx` (modify) | Add `cellEditor: DateCellEditor` to `statusDate` column def |
| `frontend/src/components/grid/DateCellEditor.test.tsx` (new) | Same name + `.test` pattern |
| `frontend/cypress/e2e/date-prepopulate.cy.ts` (new) | kebab-case + `.cy` pattern |

## Code Reuse Analysis

### Existing Components to Leverage

- **`AutoOpenSelectEditor`** (`frontend/src/components/grid/AutoOpenSelectEditor.tsx`): The custom cell editor pattern. `DateCellEditor` follows the same structure: `forwardRef` + `useImperativeHandle` exposing `getValue()`, `isPopup()`, and `isCancelAfterEnd()`. Key difference: `DateCellEditor` renders an `<input type="text">` instead of a dropdown list, and `isPopup()` returns `false` (inline editor).
- **`formatDateForEdit`** (`PatientGrid.tsx`, line 140-147): Formats an ISO date string to `M/D/YYYY` without leading zeros. Reused in `DateCellEditor` to format today's date.
- **`parseAndValidateDate`** (`PatientGrid.tsx`, line 161-238): Validates and parses a date input string to ISO format. Not directly used by `DateCellEditor` (that happens in the `valueSetter`), but its output format is what the editor produces.
- **`showDateFormatError`** (`PatientGrid.tsx`, line 241-243): Alerts on invalid date format. Called by the existing `valueSetter`, not by the editor.

### Integration Points

- **`PatientGrid.tsx` statusDate column def** (line 996-1050): The `statusDate` column currently uses the default AG Grid text cell editor (`agTextCellEditor`). This will be changed to use `DateCellEditor` as the `cellEditor`. The `valueGetter` and `valueSetter` remain unchanged -- they handle the conversion between ISO date strings and display format.
- **`onCellValueChanged` handler** (line 466-713): No changes needed. When `DateCellEditor` confirms a value, it flows through the existing `valueSetter` (which calls `parseAndValidateDate`) and then triggers `onCellValueChanged` for the auto-save.

## Architecture

### Component Interaction Flow

```
User double-clicks empty statusDate cell
    │
    ▼
AG Grid creates DateCellEditor instance
    │ params.value = '' (from valueGetter)
    │
    ▼
DateCellEditor.init()
    ├── value is empty → compute today = formatTodayDate()
    │   ├── Set input.value = today (e.g., "2/11/2026")
    │   └── Schedule input.select() (select all text)
    │
    └── value is not empty → use existing value
        └── Set input.value = params.value (e.g., "1/5/2026")
    │
    ▼
User interaction:
    ├── Tab/Enter → AG Grid calls getValue() → returns input.value
    │   └── valueSetter receives "2/11/2026" → parseAndValidateDate → ISO string
    │       └── onCellValueChanged fires → auto-save to backend
    │
    ├── Typing a digit → replaces selected text (browser native behavior)
    │   └── Continue editing → Tab/Enter to confirm
    │
    └── Escape → AG Grid calls isCancelAfterEnd() or cancels directly
        └── Cell reverts to empty (original value)
```

### Design Decision: Custom Cell Editor vs. ValueGetter Approach

**Option A (Chosen): Custom Cell Editor (`DateCellEditor`)**
- Create a new custom cell editor component that handles prepopulation in its initialization
- The editor controls the input value and selection state
- Clean separation: the editor is responsible for the "what to show when editing starts" logic

**Option B (Rejected): Modify ValueGetter**
- Change the `valueGetter` to return today's date when the field is empty
- Problem: This would change the displayed value in read mode (showing today's date in every empty cell), which is incorrect. The cell should show the prompt text ("Date Completed") when not editing, and only show today's date when entering edit mode.

**Option C (Rejected): Wrap agTextCellEditor**
- Use `cellEditorParams` to inject a default value
- Problem: AG Grid's `agTextCellEditor` does not support a "default value when empty" parameter. There is no clean way to inject this behavior without a custom editor.

**Rationale for Option A:** A custom cell editor is the idiomatic AG Grid approach for controlling editor initialization behavior. The `AutoOpenSelectEditor` already demonstrates this pattern in the codebase. The `DateCellEditor` is simpler (text input vs. dropdown list) and follows the same structure.

### Design Decision: Inline Editor vs. Popup Editor

**Chosen: Inline Editor (`isPopup() = false`)**
- The date input replaces the cell content in place, matching the existing text editing behavior for `statusDate`.
- The `AutoOpenSelectEditor` uses `isPopup() = true` because dropdown lists need to overlay the grid. The date input is a simple text field that fits within the cell.

### Design Decision: formatTodayDate Implementation

The editor needs to format today's date in `M/D/YYYY` format (no leading zeros). Rather than importing the existing `formatDateForEdit` (which takes an ISO string and creates a `Date` from it), the editor will have a simple inline function:

```typescript
const formatTodayDate = (): string => {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
};
```

This is simpler and avoids a round-trip through ISO string formatting. It uses the local timezone (which is correct -- "today" should be the user's local date).

## Component Design

### DateCellEditor

```typescript
// frontend/src/components/grid/DateCellEditor.tsx

interface DateCellEditorProps extends ICellEditorParams {
  // No additional props needed
}

const DateCellEditor = forwardRef<unknown, DateCellEditorProps>(
  ({ value }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const isPrepopulated = useRef(false);

    // Determine initial value
    const initialValue = useMemo(() => {
      if (!value || value === '') {
        isPrepopulated.current = true;
        const now = new Date();
        return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
      }
      return value;
    }, [value]);

    // AG Grid cell editor interface
    useImperativeHandle(ref, () => ({
      getValue() {
        return inputRef.current?.value || '';
      },
      isPopup() {
        return false; // inline editor
      },
      isCancelAfterEnd() {
        return false;
      },
    }));

    // Focus and select on mount
    useEffect(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();
        if (isPrepopulated.current) {
          input.select(); // Select all prepopulated text
        }
      }
    }, []);

    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={initialValue}
        className="date-cell-editor"
        style={{ width: '100%', height: '100%' }}
      />
    );
  }
);
```

### CSS

Minimal CSS needed. The editor input inherits AG Grid's cell editing styles. A single class for consistent sizing:

```css
/* In frontend/src/index.css */
.date-cell-editor {
  border: none;
  outline: none;
  padding: 0 4px;
  font-size: inherit;
  font-family: inherit;
  background: transparent;
}
```

### PatientGrid.tsx Changes

Only the `statusDate` column definition changes:

```typescript
// Before:
{
  field: 'statusDate',
  // ... (no cellEditor specified, uses default agTextCellEditor)
}

// After:
{
  field: 'statusDate',
  cellEditor: DateCellEditor,
  // ... (everything else unchanged)
}
```

One import is added:

```typescript
import DateCellEditor from './DateCellEditor';
```

## Data Flow

### Prepopulated Date Confirmed

```
1. User double-clicks empty statusDate cell
2. AG Grid creates DateCellEditor with params.value = ''
3. DateCellEditor detects empty → sets input to "2/11/2026", selects all
4. User presses Tab
5. AG Grid calls getValue() → returns "2/11/2026"
6. AG Grid calls valueSetter({ newValue: "2/11/2026", ... })
7. valueSetter calls parseAndValidateDate("2/11/2026") → "2026-02-11T12:00:00.000Z"
8. valueSetter sets data.statusDate = "2026-02-11T12:00:00.000Z", returns true
9. onCellValueChanged fires → PUT /api/data/:id with { statusDate: "2026-02-11T12:00:00.000Z" }
10. Backend recalculates dueDate, returns updated row
11. Grid updates row, refreshes colors
```

### Prepopulated Date Replaced

```
1. User double-clicks empty statusDate cell
2. DateCellEditor shows "2/11/2026" (selected)
3. User types "1" → selection is replaced → input shows "1"
4. User types "2/25/2026" → input shows "12/25/2026"
5. User presses Enter
6. AG Grid calls getValue() → returns "12/25/2026"
7. Same flow as above from step 6
```

### Existing Date Edited

```
1. User double-clicks statusDate cell containing "1/15/2026"
2. DateCellEditor receives params.value = "1/15/2026" (non-empty)
3. DateCellEditor sets input to "1/15/2026" (no selection, no prepopulation)
4. User modifies the date and presses Enter
5. Same flow as above from step 5
```

## Error Handling

No new error handling is needed. The existing `valueSetter` handles invalid date formats by calling `showDateFormatError()` and returning `false` (rejecting the change). This works identically whether the value came from a prepopulated default or manual entry.

## Testing Strategy

### Layer 2: Vitest Component Tests (`DateCellEditor.test.tsx`)

| Test Case | Description |
|-----------|-------------|
| Renders input element | Editor mounts with an `<input>` element |
| Prepopulates empty cell with today's date | When `value=''`, input shows today's date |
| Does not prepopulate non-empty cell | When `value='1/5/2026'`, input shows '1/5/2026' |
| Selects all text when prepopulated | When empty, `input.select()` is called |
| Does not select all for existing dates | When non-empty, `input.select()` is NOT called |
| getValue returns input value | `getValue()` returns current input text |
| isPopup returns false | Inline editor (not popup) |
| Formats date without leading zeros | Today's date uses `M/D/YYYY` (not `MM/DD/YYYY`) |

### Layer 2: Vitest Component Tests (`PatientGrid.test.tsx`)

| Test Case | Description |
|-----------|-------------|
| statusDate column uses DateCellEditor | Column def specifies `cellEditor: DateCellEditor` |

### Layer 4: Cypress E2E Tests (`date-prepopulate.cy.ts`)

| Test Case | Description |
|-----------|-------------|
| Empty statusDate shows today's date on edit | Double-click empty cell, verify input value |
| Tab confirms prepopulated date | Open empty cell, press Tab, verify saved |
| Enter confirms prepopulated date | Open empty cell, press Enter, verify saved |
| Typing replaces prepopulated date | Open empty cell, type "1/1/2025", verify input |
| Escape cancels prepopulated date | Open empty cell, press Escape, verify empty |
| Non-empty statusDate shows existing date | Double-click cell with date, verify no prepopulation |
| Prepopulated date triggers auto-save | Confirm prepopulated date, verify save indicator |

### Layer 5: MCP Playwright Visual Review

| Step | Description |
|------|-------------|
| 1 | Navigate to grid, find row with empty statusDate |
| 2 | Double-click the empty cell, screenshot showing prepopulated date |
| 3 | Press Enter, screenshot showing saved date |
| 4 | Verify row color updated (if applicable) |
| 5 | Double-click a cell with existing date, screenshot showing no prepopulation |

## Migration / Deployment Notes

- **No database changes**: Feature is entirely frontend.
- **No API changes**: The backend receives the same date format as before.
- **No configuration changes**: No new environment variables.
- **Backward compatibility**: Cells with existing dates behave identically to before. Only empty cells gain new behavior.
- **Rollback**: Revert the `cellEditor` property on the `statusDate` column def to remove the feature.

## Performance Considerations

- `new Date()` call is sub-microsecond.
- `input.select()` is a native DOM operation with no performance impact.
- No network requests are added. The existing auto-save pipeline handles persistence.
- The `DateCellEditor` component is lightweight (single `<input>` element, no state, no effects beyond initial focus/select).

## Security Considerations

- No new attack surface. The date value goes through the existing `parseAndValidateDate` function which validates format and range (1900-2100).
- No user input is rendered as HTML. The `<input>` element handles text natively.
- No new API endpoints or authentication changes.
