# Excel-like UI Requirements

> **Document:** EXCEL_UI_REQUIREMENTS.md
> **Status:** FINAL
> **Referenced from:** [requirements.md](./requirements.md) Section 7

---

This document defines all Excel-like behaviors that the application must support to provide a familiar spreadsheet user experience.

## Table of Contents

- [7.1 Auto-Save Behavior](#71-auto-save-behavior)
- [7.2 Data Formatting](#72-data-formatting)
- [7.3 Keyboard Navigation](#73-keyboard-navigation)
- [7.4 Copy and Paste](#74-copy-and-paste)
- [7.5 Undo and Redo](#75-undo-and-redo)
- [7.6 Row Operations](#76-row-operations)
- [7.7 Column Operations](#77-column-operations)
- [7.8 Find and Replace](#78-find-and-replace)
- [7.9 Context Menu](#79-context-menu-right-click)
- [7.10 Visual Feedback](#710-visual-feedback)
- [7.11 Auto-Complete](#711-auto-complete--type-ahead)
- [7.12 Freeze Panes](#712-freeze-panes)
- [7.13 Toolbar Actions](#713-toolbar-actions)
- [7.14 Status Bar](#714-status-bar)
- [7.15 Unsaved Changes Warning](#715-unsaved-changes-warning)
- [7.16 Cell Validation](#716-cell-validation-visual-feedback)
- [7.17 Fill Handle](#717-fill-handle-auto-fill)
- [7.18 Row Reordering](#718-drag-and-drop-row-reordering)
- [7.19 Zoom Controls](#719-zoom-controls)
- [7.20 Go To Dialog](#720-go-to-dialog-ctrlg)
- [7.21 Alternating Row Colors](#721-alternating-row-colors-zebra-stripes)
- [7.22 Sticky Header](#722-sticky-header)
- [7.23 Change History](#723-change-history--audit-trail)
- [7.24 Spell Check](#724-spell-check)
- [7.25 Print Support](#725-print-support)
- [7.26 Cell Comments](#726-cell-commentsnotes)
- [7.27 Text Wrapping](#727-text-wrapping)
- [7.28 Duplicate Highlighting](#728-duplicate-highlighting)
- [7.29 Address Formatting](#729-address-auto-formatting)
- [7.30 Paste Special](#730-paste-special-options)
- [7.31 Required Field Indicators](#731-required-field-indicators)
- [7.32 Dropdown Indicators](#732-data-validation-dropdown-indicators)
- [7.33 Number Formatting](#733-number-formatting)
- [7.34 Selection Summary](#734-selection-summary-in-status-bar)
- [7.35 Quick Filter Bar](#735-quick-filter-bar)

---

## 7.1 Auto-Save Behavior

### Immediate Save on Cell Exit
```typescript
// When user finishes editing a cell, data is saved immediately
const onCellValueChanged = async (event: CellValueChangedEvent) => {
  const { data, colDef, newValue, oldValue } = event;
  
  // Don't save if value hasn't changed
  if (newValue === oldValue) return;
  
  // Show saving indicator
  setSaveStatus('saving');
  
  try {
    // Save to backend immediately
    await api.updateRow(data.id, { [colDef.field]: newValue });
    
    // Show saved confirmation briefly
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
    
  } catch (error) {
    // Revert to old value on error
    event.node.setDataValue(colDef.field, oldValue);
    showError('Failed to save changes');
    setSaveStatus('error');
  }
};
```

### Save Status Indicator
| Status | Display | Color |
|--------|---------|-------|
| Idle | No indicator | - |
| Saving | "Saving..." with spinner | Yellow |
| Saved | "✓ Saved" | Green |
| Error | "⚠ Save failed" | Red |

### Debounced Save for Text Fields
```typescript
// For text fields, debounce saves to avoid excessive API calls
const debouncedSave = useMemo(
  () => debounce(async (id: number, field: string, value: string) => {
    await api.updateRow(id, { [field]: value });
  }, 500),
  []
);
```

## 7.2 Data Formatting

### Phone Number Auto-Formatting

**Input Formats Accepted:**
| User Input | Formatted Output |
|------------|------------------|
| `5551234567` | `(555) 123-4567` |
| `555-123-4567` | `(555) 123-4567` |
| `555.123.4567` | `(555) 123-4567` |
| `555 123 4567` | `(555) 123-4567` |
| `+1 555 123 4567` | `(555) 123-4567` |
| `1-555-123-4567` | `(555) 123-4567` |

**Implementation:**
```typescript
// utils/formatting.ts
export function formatPhoneNumber(value: string | null): string {
  if (!value) return '';
  
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // Remove leading 1 if present (US country code)
  const normalized = digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
  
  // Format as (XXX) XXX-XXXX
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
  }
  
  // Return as-is if not valid 10 digits
  return value;
}

export function parsePhoneNumber(value: string): string {
  // Store normalized digits only
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
}

export function validatePhoneNumber(value: string): { valid: boolean; error?: string } {
  const digits = value.replace(/\D/g, '');
  const normalized = digits.startsWith('1') && digits.length === 11 
    ? digits.slice(1) 
    : digits;
  
  if (normalized.length === 0) {
    return { valid: true }; // Empty is allowed
  }
  
  if (normalized.length !== 10) {
    return { valid: false, error: 'Phone number must be 10 digits' };
  }
  
  return { valid: true };
}
```

### Date Auto-Formatting

**Input Formats Accepted:**
| User Input | Parsed As |
|------------|-----------|
| `1/5/1960` | `01/05/1960` |
| `01/05/1960` | `01/05/1960` |
| `1-5-1960` | `01/05/1960` |
| `01-05-1960` | `01/05/1960` |
| `1.5.1960` | `01/05/1960` |
| `1/5/60` | `01/05/1960` (assumes 1900s for year > 25) |
| `1/5/25` | `01/05/2025` (assumes 2000s for year <= 25) |
| `Jan 5, 1960` | `01/05/1960` |
| `January 5, 1960` | `01/05/1960` |
| `1960-01-05` | `01/05/1960` (ISO format) |

**Display Format:** `MM/DD/YYYY`

**Implementation:**
```typescript
// utils/formatting.ts
import { parse, format, isValid } from 'date-fns';

const DATE_FORMATS = [
  'M/d/yyyy',
  'MM/dd/yyyy',
  'M-d-yyyy',
  'MM-dd-yyyy',
  'M.d.yyyy',
  'MM.dd.yyyy',
  'M/d/yy',
  'MM/dd/yy',
  'MMM d, yyyy',
  'MMMM d, yyyy',
  'yyyy-MM-dd',
];

export function parseDate(value: string): Date | null {
  if (!value) return null;
  
  // Try each format
  for (const fmt of DATE_FORMATS) {
    const parsed = parse(value, fmt, new Date());
    if (isValid(parsed)) {
      // Handle 2-digit year
      if (parsed.getFullYear() < 100) {
        const year = parsed.getFullYear();
        parsed.setFullYear(year > 25 ? 1900 + year : 2000 + year);
      }
      return parsed;
    }
  }
  
  return null;
}

export function formatDate(value: Date | string | null): string {
  if (!value) return '';
  
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!isValid(date)) return '';
  
  return format(date, 'MM/dd/yyyy');
}

export function validateDate(value: string, options?: {
  minDate?: Date;
  maxDate?: Date;
  allowFuture?: boolean;
}): { valid: boolean; error?: string } {
  const date = parseDate(value);
  
  if (!date) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (options?.minDate && date < options.minDate) {
    return { valid: false, error: `Date cannot be before ${formatDate(options.minDate)}` };
  }
  
  if (options?.maxDate && date > options.maxDate) {
    return { valid: false, error: `Date cannot be after ${formatDate(options.maxDate)}` };
  }
  
  if (options?.allowFuture === false && date > new Date()) {
    return { valid: false, error: 'Date cannot be in the future' };
  }
  
  return { valid: true };
}
```

### Date Field Validation Rules

| Field | Future Dates Allowed | Min Date | Max Date |
|-------|---------------------|----------|----------|
| Member DOB | No | 1900-01-01 | Today |
| Status Date (completed) | No | 1900-01-01 | Today |
| Status Date (scheduled) | Yes | Today | +2 years |
| Due Date | Yes | Today | +2 years |

## 7.3 Keyboard Navigation

### Cell Navigation
| Key | Action |
|-----|--------|
| `Tab` | Move to next cell (right), wrap to next row |
| `Shift + Tab` | Move to previous cell (left), wrap to previous row |
| `Enter` | Confirm edit and move down |
| `Shift + Enter` | Confirm edit and move up |
| `Arrow Keys` | Move in direction (when not editing) |
| `Home` | Move to first cell in row |
| `End` | Move to last cell in row |
| `Ctrl + Home` | Move to first cell (A1) |
| `Ctrl + End` | Move to last cell with data |
| `Page Up` | Scroll up one page |
| `Page Down` | Scroll down one page |

### Editing
| Key | Action |
|-----|--------|
| `F2` | Enter edit mode on selected cell |
| `Enter` | Enter edit mode OR confirm edit |
| `Escape` | Cancel edit, revert to original value |
| `Delete` | Clear cell contents |
| `Backspace` | Clear cell and enter edit mode |
| Any character | Start editing with that character |

### Selection
| Key | Action |
|-----|--------|
| `Shift + Arrow` | Extend selection |
| `Shift + Click` | Select range from current to clicked cell |
| `Ctrl + Click` | Add cell to selection (multi-select) |
| `Ctrl + A` | Select all cells |
| `Ctrl + Shift + End` | Select from current to last cell |

### Implementation:
```typescript
// AG Grid keyboard navigation config
const gridOptions: GridOptions = {
  navigateToNextCell: (params) => {
    const { key, previousCellPosition, nextCellPosition } = params;
    
    // Custom Tab behavior - skip non-editable cells
    if (key === 'Tab') {
      let next = nextCellPosition;
      while (next && !isCellEditable(next)) {
        next = getNextCell(next, params.backwards);
      }
      return next;
    }
    
    return nextCellPosition;
  },
  
  tabToNextCell: (params) => {
    // Move to next editable cell
    return findNextEditableCell(params.previousCellPosition, params.backwards);
  },
  
  enterNavigatesVertically: true,
  enterNavigatesVerticallyAfterEdit: true,
  
  // Enable keyboard navigation
  suppressKeyboardEvent: (params) => {
    // Don't suppress standard navigation keys
    return false;
  }
};
```

## 7.4 Copy and Paste

### Single Cell Copy/Paste
| Action | Behavior |
|--------|----------|
| `Ctrl + C` | Copy selected cell value to clipboard |
| `Ctrl + V` | Paste clipboard value into selected cell |
| `Ctrl + X` | Cut (copy and clear) selected cell |

### Range Copy/Paste
| Action | Behavior |
|--------|----------|
| `Ctrl + C` on range | Copy all selected cells (tab-separated) |
| `Ctrl + V` on range | Paste starting from selected cell |

### Paste Behavior Rules
1. **Single cell to single cell**: Direct paste
2. **Single cell to range**: Fill all selected cells with same value
3. **Range to single cell**: Paste starting from selected cell, expand as needed
4. **Range to range**: 
   - If same size: Direct paste
   - If different size: Paste starting from top-left of selection

### Paste Validation
```typescript
const handlePaste = async (event: CellEvent) => {
  const clipboardData = event.clipboardData.getData('text');
  const rows = clipboardData.split('\n').map(row => row.split('\t'));
  
  const validationErrors: string[] = [];
  const formattedData: any[][] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const formattedRow = [];
    for (let j = 0; j < rows[i].length; j++) {
      const targetColumn = getColumnAtIndex(event.column.colId, j);
      const value = rows[i][j];
      
      // Validate and format based on column type
      const { formatted, error } = validateAndFormat(targetColumn, value);
      
      if (error) {
        validationErrors.push(`Row ${i + 1}, Col ${j + 1}: ${error}`);
      }
      
      formattedRow.push(formatted);
    }
    formattedData.push(formattedRow);
  }
  
  if (validationErrors.length > 0) {
    showWarning(`Some values were adjusted:\n${validationErrors.join('\n')}`);
  }
  
  // Apply formatted data
  applyPastedData(formattedData, event.rowIndex, event.column.colId);
};
```

### Clipboard Format (Export)
When copying, format values for readability:
- Dates: `MM/DD/YYYY`
- Phone: `(555) 123-4567`
- Booleans: `Yes` / `No`

## 7.5 Undo and Redo

### Undo/Redo Stack
```typescript
// stores/undoStore.ts
interface UndoState {
  undoStack: CellChange[];
  redoStack: CellChange[];
  maxStackSize: number; // Default: 50
}

interface CellChange {
  id: number;           // Row ID
  field: string;        // Column field name
  oldValue: any;        // Previous value
  newValue: any;        // New value
  timestamp: Date;      // When change was made
}

const useUndoStore = create<UndoState>((set, get) => ({
  undoStack: [],
  redoStack: [],
  maxStackSize: 50,
  
  pushChange: (change: CellChange) => {
    set((state) => ({
      undoStack: [...state.undoStack, change].slice(-state.maxStackSize),
      redoStack: [] // Clear redo stack on new change
    }));
  },
  
  undo: async () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;
    
    const change = undoStack[undoStack.length - 1];
    
    // Revert the change
    await api.updateRow(change.id, { [change.field]: change.oldValue });
    
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, change]
    }));
  },
  
  redo: async () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;
    
    const change = redoStack[redoStack.length - 1];
    
    // Reapply the change
    await api.updateRow(change.id, { [change.field]: change.newValue });
    
    set((state) => ({
      redoStack: state.redoStack.slice(0, -1),
      undoStack: [...state.undoStack, change]
    }));
  },
  
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
}));
```

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `Ctrl + Z` | Undo last change |
| `Ctrl + Y` | Redo last undone change |
| `Ctrl + Shift + Z` | Redo (alternative) |

### Undo Scope
- Undo is **per-session** (clears on page refresh)
- Undo is **per-user** (only your own changes)
- Maximum 50 changes in undo stack

## 7.6 Row Operations

### Adding Rows
| Action | Method |
|--------|--------|
| Click "+ Add Row" button | Add blank row at bottom |
| `Ctrl + Shift + +` | Insert row above current |
| Right-click → "Insert Row Above" | Insert row above current |
| Right-click → "Insert Row Below" | Insert row below current |

### Deleting Rows
| Action | Method |
|--------|--------|
| Select row → Press `Delete` | Delete with confirmation |
| Right-click → "Delete Row" | Delete with confirmation |
| `Ctrl + -` | Delete current row with confirmation |

### Row Deletion Confirmation
```typescript
const handleDeleteRow = async (rowId: number) => {
  const confirmed = await showConfirmDialog({
    title: 'Delete Row',
    message: 'Are you sure you want to delete this row? This action cannot be undone.',
    confirmText: 'Delete',
    confirmColor: 'red'
  });
  
  if (confirmed) {
    await api.deleteRow(rowId);
  }
};
```

### Duplicate Row
| Action | Method |
|--------|--------|
| Right-click → "Duplicate Row" | Create copy below current row |
| `Ctrl + D` | Duplicate current row |

## 7.7 Column Operations

### Column Resizing
- Drag column border to resize
- Double-click column border to auto-fit width
- Minimum column width: 50px
- Maximum column width: 500px

### Column Reordering
- Drag column header to reorder
- First 5 columns (Request Type → Address) are locked in position

### Column Visibility
- Click eye icon in toolbar to show/hide columns
- Member Info (DOB, Phone, Address) hidden by default (toggle available)
- Column visibility persists in local storage

### Column Sorting
| Action | Behavior |
|--------|----------|
| Click header | Sort ascending |
| Click header again | Sort descending |
| Click header again | Clear sort |
| `Shift + Click` | Add to multi-sort |

### Column Filtering
| Action | Behavior |
|--------|----------|
| Click filter icon | Open filter popup |
| Type in filter | Filter as you type |
| Select from list | Filter by specific values |
| Clear filter | Show all rows |

```typescript
// Filter configuration
const defaultColDef: ColDef = {
  filter: true,
  filterParams: {
    buttons: ['reset', 'apply'],
    closeOnApply: true,
  },
  sortable: true,
  resizable: true,
};
```

## 7.8 Find and Replace

### Find Dialog (`Ctrl + F`)
```typescript
interface FindOptions {
  searchText: string;
  matchCase: boolean;
  matchWholeCell: boolean;
  searchIn: 'all' | 'column' | 'selection';
  column?: string; // If searchIn === 'column'
}
```

### Replace Dialog (`Ctrl + H`)
```typescript
interface ReplaceOptions extends FindOptions {
  replaceText: string;
}
```

### Find/Replace Actions
| Button | Action |
|--------|--------|
| Find Next | Highlight and scroll to next match |
| Find Previous | Highlight and scroll to previous match |
| Replace | Replace current match and find next |
| Replace All | Replace all matches (with confirmation) |

### Implementation:
```typescript
const findInGrid = (options: FindOptions): CellPosition[] => {
  const matches: CellPosition[] = [];
  
  gridApi.forEachNode((node) => {
    const columns = options.searchIn === 'column' 
      ? [options.column]
      : gridApi.getColumnDefs().map(c => c.field);
    
    columns.forEach(colId => {
      const value = String(node.data[colId] || '');
      const searchValue = options.matchCase 
        ? options.searchText 
        : options.searchText.toLowerCase();
      const cellValue = options.matchCase 
        ? value 
        : value.toLowerCase();
      
      const matches = options.matchWholeCell
        ? cellValue === searchValue
        : cellValue.includes(searchValue);
      
      if (matches) {
        matches.push({ rowIndex: node.rowIndex, colId });
      }
    });
  });
  
  return matches;
};
```

## 7.9 Context Menu (Right-Click)

### Cell Context Menu
```
┌─────────────────────────┐
│ Cut              Ctrl+X │
│ Copy             Ctrl+C │
│ Paste            Ctrl+V │
├─────────────────────────┤
│ Insert Row Above        │
│ Insert Row Below        │
│ Duplicate Row    Ctrl+D │
│ Delete Row              │
├─────────────────────────┤
│ Clear Cell              │
│ Clear Row               │
├─────────────────────────┤
│ Filter by this value    │
│ Sort Ascending          │
│ Sort Descending         │
└─────────────────────────┘
```

### Implementation:
```typescript
const getContextMenuItems = (params: GetContextMenuItemsParams): MenuItem[] => {
  const { node, column, value } = params;
  
  return [
    {
      name: 'Cut',
      shortcut: 'Ctrl+X',
      action: () => cutCell(node, column),
      icon: '<i class="fa fa-cut"></i>',
    },
    {
      name: 'Copy',
      shortcut: 'Ctrl+C',
      action: () => copyCell(node, column),
      icon: '<i class="fa fa-copy"></i>',
    },
    {
      name: 'Paste',
      shortcut: 'Ctrl+V',
      action: () => pasteCell(node, column),
      icon: '<i class="fa fa-paste"></i>',
      disabled: !hasClipboardData(),
    },
    'separator',
    {
      name: 'Insert Row Above',
      action: () => insertRowAbove(node.rowIndex),
    },
    {
      name: 'Insert Row Below',
      action: () => insertRowBelow(node.rowIndex),
    },
    {
      name: 'Duplicate Row',
      shortcut: 'Ctrl+D',
      action: () => duplicateRow(node),
    },
    {
      name: 'Delete Row',
      action: () => deleteRow(node),
      cssClasses: ['text-red-600'],
    },
    'separator',
    {
      name: 'Filter by this value',
      action: () => filterByValue(column, value),
    },
    {
      name: 'Sort Ascending',
      action: () => sortColumn(column, 'asc'),
    },
    {
      name: 'Sort Descending',
      action: () => sortColumn(column, 'desc'),
    },
  ];
};
```

## 7.10 Visual Feedback

### Cell Edit Indicators
| State | Visual |
|-------|--------|
| Being edited | Yellow border, white background |
| Recently saved | Brief green flash |
| Save failed | Red border, error tooltip |
| Invalid value | Red border, validation message |

### Row Indicators
| State | Visual |
|-------|--------|
| Selected | Blue highlight |
| Being edited by you | Light yellow background |
| Recently added | Brief green highlight |
| Marked for deletion | Strikethrough, red tint |

### Dirty Cell Indicator
```typescript
// Show asterisk or dot for unsaved changes
const cellRenderer = (params: ICellRendererParams) => {
  const isDirty = pendingChanges.has(`${params.data.id}-${params.colDef.field}`);
  
  return (
    <div className="flex items-center">
      <span>{params.value}</span>
      {isDirty && <span className="text-yellow-500 ml-1">●</span>}
    </div>
  );
};
```

## 7.11 Auto-Complete / Type-Ahead

### For Text Fields
```typescript
// Auto-complete for Member Name based on existing patients
const memberNameEditor: ICellEditorParams = {
  cellEditor: 'agTextCellEditor',
  cellEditorParams: {
    useFormatter: true,
  },
  // Show suggestions from existing patients
  cellEditorPopup: true,
  cellEditorPopupPosition: 'under',
};

// Get suggestions
const getMemberNameSuggestions = (searchText: string): string[] => {
  const allNames = gridApi.getRenderedNodes()
    .map(node => node.data.memberName)
    .filter(Boolean);
  
  const unique = [...new Set(allNames)];
  
  return unique
    .filter(name => name.toLowerCase().includes(searchText.toLowerCase()))
    .slice(0, 10);
};
```

### For Dropdown Fields
- Type to filter dropdown options
- First match is highlighted
- Enter to select highlighted option

## 7.12 Freeze Panes

### Pinned Columns
The first 5 columns are pinned (frozen) by default:
1. Request Type
2. Member Name
3. Member DOB
4. Member Telephone
5. Member Home Address

```typescript
const columnDefs: ColDef[] = [
  { field: 'requestType', pinned: 'left' },
  { field: 'memberName', pinned: 'left' },
  { field: 'memberDob', pinned: 'left' },
  { field: 'memberTelephone', pinned: 'left' },
  { field: 'memberAddress', pinned: 'left' },
  // ... rest of columns scroll horizontally
];
```

### Toggle Freeze
- Right-click column header → "Pin Left" / "Pin Right" / "Unpin"
- Or drag column to pinned area

## 7.13 Toolbar Actions

### Toolbar Buttons
```
┌────────────────────────────────────────────────────────────────────┐
│ [+ Add Row] [Undo] [Redo] │ [Find] │ [Import] [Export] │ [Columns] │
└────────────────────────────────────────────────────────────────────┘
```

| Button | Shortcut | Action |
|--------|----------|--------|
| + Add Row | - | Add new blank row |
| Undo | Ctrl+Z | Undo last change |
| Redo | Ctrl+Y | Redo last undone change |
| Find | Ctrl+F | Open find dialog |
| Import | - | Open CSV import dialog |
| Export | - | Export to CSV |
| Columns | - | Show/hide column picker |

## 7.14 Status Bar

### Status Bar Information
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Rows: 1,234 │ Selected: 5 │ Sum: 45 │ Avg: 9 │ ✓ Saved │ Editor: John │
└─────────────────────────────────────────────────────────────────────────┘
```

| Section | Description |
|---------|-------------|
| Rows | Total number of rows |
| Selected | Number of selected cells/rows |
| Sum | Sum of selected numeric cells |
| Avg | Average of selected numeric cells |
| Save Status | Current save state |
| Editor | Current editor name (if editing) |

## 7.15 Unsaved Changes Warning

### Before Navigation/Refresh
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasPendingChanges()) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

### Before Logout
```typescript
const handleLogout = async () => {
  if (hasPendingChanges()) {
    const confirmed = await showConfirmDialog({
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. Save before logging out?',
      buttons: ['Save & Logout', 'Logout Without Saving', 'Cancel']
    });
    
    if (confirmed === 'Save & Logout') {
      await saveAllPendingChanges();
    } else if (confirmed === 'Cancel') {
      return;
    }
  }
  
  await logout();
};
```

## 7.16 Cell Validation Visual Feedback

### Validation States
| State | Visual Indicator |
|-------|------------------|
| Valid | Normal cell appearance |
| Invalid | Red border, red background tint |
| Warning | Yellow border, yellow background tint |
| Required Empty | Dotted red border |

### Error Tooltip
```typescript
// Show validation error on hover
const cellRenderer = (params: ICellRendererParams) => {
  const validation = validateCell(params.colDef.field, params.value);
  
  return (
    <div 
      className={cn(
        'cell-content',
        !validation.valid && 'border-red-500 bg-red-50',
        validation.warning && 'border-yellow-500 bg-yellow-50'
      )}
      title={validation.error || validation.warning}
    >
      {params.value}
      {!validation.valid && (
        <span className="text-red-500 ml-1">⚠</span>
      )}
    </div>
  );
};
```

### Inline Validation Messages
```typescript
// Show validation message below cell when editing
const cellEditor = (params: ICellEditorParams) => {
  const [value, setValue] = useState(params.value);
  const [error, setError] = useState<string | null>(null);
  
  const handleChange = (newValue: string) => {
    setValue(newValue);
    const validation = validateCell(params.colDef.field, newValue);
    setError(validation.error || null);
  };
  
  return (
    <div className="cell-editor">
      <input value={value} onChange={e => handleChange(e.target.value)} />
      {error && (
        <div className="text-red-500 text-xs mt-1">{error}</div>
      )}
    </div>
  );
};
```

## 7.17 Fill Handle (Auto-Fill)

### Drag to Fill
- Small square handle appears at bottom-right corner of selected cell
- Drag handle down/up to fill adjacent cells
- Fill behavior depends on data type

### Fill Patterns
| Data Type | Fill Behavior |
|-----------|---------------|
| Text | Copy same value |
| Date | Increment by 1 day |
| Number | Copy same value (or increment if pattern detected) |
| Dropdown | Copy same value |

### Implementation
```typescript
const handleFillDrag = (
  sourceCell: CellPosition,
  targetRange: CellRange,
  direction: 'down' | 'up' | 'right' | 'left'
) => {
  const sourceValue = getCellValue(sourceCell);
  const sourceDate = parseDate(sourceValue);
  
  targetRange.forEach((cell, index) => {
    let fillValue = sourceValue;
    
    // Increment dates
    if (sourceDate && isDateColumn(cell.colId)) {
      const increment = direction === 'down' || direction === 'right' ? index + 1 : -(index + 1);
      fillValue = formatDate(addDays(sourceDate, increment));
    }
    
    setCellValue(cell, fillValue);
  });
};
```

### Fill Options Dialog
After drag-fill, show small popup with options:
- Copy Cells
- Fill Series (for dates)
- Fill Formatting Only
- Fill Without Formatting

## 7.18 Drag and Drop Row Reordering

### Enable Row Dragging
```typescript
const columnDefs: ColDef[] = [
  {
    headerName: '',
    field: 'rowDrag',
    rowDrag: true,
    width: 30,
    suppressMenu: true,
    cellClass: 'cursor-grab'
  },
  // ... other columns
];

const gridOptions: GridOptions = {
  rowDragManaged: true,
  animateRows: true,
  onRowDragEnd: async (event) => {
    const { node, overNode } = event;
    
    // Calculate new order
    const newOrder = calculateNewOrder(node, overNode);
    
    // Save new order to backend
    await api.reorderRow(node.data.id, newOrder);
  }
};
```

### Visual Feedback During Drag
- Dragged row shows with shadow/elevation
- Drop target row highlighted with blue line
- Invalid drop targets shown with red indicator

## 7.19 Zoom Controls

### Zoom Levels
| Level | Display |
|-------|---------|
| 50% | Compact view |
| 75% | Small |
| 100% | Normal (default) |
| 125% | Large |
| 150% | Extra large |

### Zoom Controls
```typescript
const ZoomControls = () => {
  const [zoom, setZoom] = useLocalStorage('gridZoom', 100);
  
  return (
    <div className="zoom-controls">
      <button onClick={() => setZoom(Math.max(50, zoom - 25))}>−</button>
      <span>{zoom}%</span>
      <button onClick={() => setZoom(Math.min(150, zoom + 25))}>+</button>
    </div>
  );
};

// Apply zoom to grid
const gridStyle = {
  fontSize: `${zoom}%`,
  '--ag-row-height': `${Math.round(32 * zoom / 100)}px`,
};
```

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl + +` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset to 100% |

## 7.20 Go To Dialog (Ctrl+G)

### Go To Row
```typescript
interface GoToDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGoTo: (rowNumber: number) => void;
}

const GoToDialog = ({ isOpen, onClose, onGoTo }: GoToDialogProps) => {
  const [rowNumber, setRowNumber] = useState('');
  
  const handleSubmit = () => {
    const row = parseInt(rowNumber, 10);
    if (row > 0 && row <= totalRows) {
      onGoTo(row - 1); // Convert to 0-indexed
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Go To Row</DialogTitle>
      <DialogContent>
        <input
          type="number"
          min="1"
          max={totalRows}
          value={rowNumber}
          onChange={e => setRowNumber(e.target.value)}
          placeholder={`1 - ${totalRows}`}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit}>Go</Button>
      </DialogActions>
    </Dialog>
  );
};
```

### Go To Patient
- Search by patient name
- Jump to first row for that patient

## 7.21 Alternating Row Colors (Zebra Stripes)

### Row Styling
```typescript
const gridOptions: GridOptions = {
  getRowClass: (params) => {
    return params.rowIndex % 2 === 0 ? 'row-even' : 'row-odd';
  }
};

// CSS
.row-even {
  background-color: #FFFFFF;
}

.row-odd {
  background-color: #F9FAFB; /* Light gray */
}

// Note: Conditional formatting (color coding) takes priority over zebra stripes
```

### Toggle Option
- User preference to enable/disable zebra stripes
- Stored in local storage

## 7.22 Sticky Header

### Header Behavior
- Column headers remain visible when scrolling vertically
- Pinned columns remain visible when scrolling horizontally

```typescript
const gridOptions: GridOptions = {
  suppressColumnVirtualisation: false,
  suppressRowVirtualisation: false,
  // Headers are sticky by default in AG Grid
  headerHeight: 40,
  floatingFiltersHeight: 35,
};
```

## 7.23 Change History / Audit Trail

### View Change History
```typescript
interface ChangeHistoryEntry {
  id: number;
  rowId: number;
  field: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changedAt: Date;
}

// Show history for a specific row
const RowHistoryDialog = ({ rowId }: { rowId: number }) => {
  const [history, setHistory] = useState<ChangeHistoryEntry[]>([]);
  
  useEffect(() => {
    api.getRowHistory(rowId).then(setHistory);
  }, [rowId]);
  
  return (
    <Dialog>
      <DialogTitle>Change History</DialogTitle>
      <DialogContent>
        <table>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Field</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Changed By</th>
            </tr>
          </thead>
          <tbody>
            {history.map(entry => (
              <tr key={entry.id}>
                <td>{formatDateTime(entry.changedAt)}</td>
                <td>{entry.field}</td>
                <td>{entry.oldValue}</td>
                <td>{entry.newValue}</td>
                <td>{entry.changedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </DialogContent>
    </Dialog>
  );
};
```

### Access History
- Right-click row → "View History"
- Shows last 50 changes for that row

## 7.24 Spell Check

### Enable Spell Check
```typescript
// Enable browser spell check for text fields
const textCellEditor: ColDef = {
  cellEditor: 'agTextCellEditor',
  cellEditorParams: {
    inputProps: {
      spellCheck: true,
    }
  }
};

// For notes field - multi-line with spell check
const notesCellEditor: ColDef = {
  cellEditor: 'agLargeTextCellEditor',
  cellEditorParams: {
    maxLength: 500,
    rows: 5,
    cols: 50,
  },
  cellEditorPopup: true,
};
```

### Spell Check Fields
| Field | Spell Check |
|-------|-------------|
| Member Name | Yes |
| Member Address | Yes |
| Notes | Yes |
| Tracking fields (text) | Yes |
| Dropdowns | No |
| Dates | No |

## 7.25 Print Support

### Print Options
```typescript
interface PrintOptions {
  columns: 'all' | 'visible';
  rows: 'all' | 'selected' | 'filtered';
  orientation: 'portrait' | 'landscape';
  includeHeader: boolean;
  includeFooter: boolean;
  fitToPage: boolean;
}
```

### Print Preview
```typescript
const handlePrint = () => {
  // Generate print-friendly HTML
  const printContent = generatePrintContent({
    columns: 'visible',
    rows: 'filtered',
    orientation: 'landscape',
  });
  
  // Open print dialog
  const printWindow = window.open('', '_blank');
  printWindow.document.write(printContent);
  printWindow.document.close();
  printWindow.print();
};
```

### Export to PDF
```typescript
const handleExportPDF = async () => {
  const pdfContent = await api.exportPDF({
    columns: 'visible',
    rows: 'all',
    orientation: 'landscape',
  });
  
  downloadFile(pdfContent, 'patient-tracker.pdf', 'application/pdf');
};
```

## 7.26 Cell Comments/Notes

### Add Comment to Cell
```typescript
interface CellComment {
  rowId: number;
  field: string;
  comment: string;
  author: string;
  createdAt: Date;
}

// Visual indicator for cells with comments
const cellRenderer = (params: ICellRendererParams) => {
  const hasComment = cellComments.has(`${params.data.id}-${params.colDef.field}`);
  
  return (
    <div className="relative">
      {params.value}
      {hasComment && (
        <div className="absolute top-0 right-0 w-0 h-0 
          border-t-8 border-t-red-500 
          border-l-8 border-l-transparent" 
        />
      )}
    </div>
  );
};
```

### Comment Actions
- Right-click → "Add Comment"
- Right-click → "View Comment"
- Right-click → "Delete Comment"
- Comments visible in hover tooltip

## 7.27 Text Wrapping

### Enable Text Wrapping for Notes
```typescript
const columnDefs: ColDef[] = [
  {
    field: 'notes',
    headerName: 'Notes',
    wrapText: true,
    autoHeight: true,
    cellStyle: {
      whiteSpace: 'normal',
      lineHeight: '1.4',
    },
    minWidth: 200,
    maxWidth: 500,
  }
];
```

### Row Height Adjustment
- Rows auto-expand to fit wrapped content
- Maximum row height: 150px
- Overflow shows "..." with expand option

## 7.28 Duplicate Highlighting

### Visual Indicator for Duplicates
```typescript
const getRowStyle = (params: RowClassParams): RowStyle | undefined => {
  // Check if this is a duplicate entry
  if (params.data?.isDuplicate) {
    return {
      backgroundColor: '#FEF3C7', // Light yellow
      borderLeft: '4px solid #F59E0B', // Orange left border
    };
  }
  
  // Check for potential duplicate (same patient + measure)
  if (isPotentialDuplicate(params.data)) {
    return {
      backgroundColor: '#FEF9C3', // Very light yellow
    };
  }
  
  return undefined;
};
```

### Duplicate Detection
```typescript
const checkForDuplicates = (data: GridRow[]): Map<number, number[]> => {
  const duplicateMap = new Map<number, number[]>();
  
  // Group by patient + quality measure
  const groups = groupBy(data, row => 
    `${row.memberName}-${row.memberDob}-${row.qualityMeasure}`
  );
  
  // Mark groups with more than 1 entry
  Object.entries(groups).forEach(([key, rows]) => {
    if (rows.length > 1) {
      rows.forEach(row => {
        duplicateMap.set(row.id, rows.map(r => r.id));
      });
    }
  });
  
  return duplicateMap;
};
```

## 7.29 Address Auto-Formatting

### Address Normalization
```typescript
export function formatAddress(value: string): string {
  if (!value) return '';
  
  let formatted = value.trim();
  
  // Normalize common abbreviations
  const abbreviations: Record<string, string> = {
    'street': 'St',
    'avenue': 'Ave',
    'boulevard': 'Blvd',
    'drive': 'Dr',
    'lane': 'Ln',
    'road': 'Rd',
    'court': 'Ct',
    'circle': 'Cir',
    'apartment': 'Apt',
    'suite': 'Ste',
  };
  
  // Apply abbreviations (case insensitive)
  Object.entries(abbreviations).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    formatted = formatted.replace(regex, abbr);
  });
  
  // Title case street names
  formatted = formatted.replace(/\b\w/g, char => char.toUpperCase());
  
  // Uppercase state abbreviations
  formatted = formatted.replace(/\b([A-Za-z]{2})\s+(\d{5}(-\d{4})?)\b/, 
    (_, state, zip) => `${state.toUpperCase()} ${zip}`
  );
  
  return formatted;
}
```

### Address Input Examples
| User Input | Formatted Output |
|------------|------------------|
| `123 main street` | `123 Main St` |
| `456 oak avenue apt 2` | `456 Oak Ave Apt 2` |
| `789 elm blvd, anytown ca 90210` | `789 Elm Blvd, Anytown CA 90210` |

## 7.30 Paste Special Options

### Paste Special Dialog (Ctrl+Shift+V)
```typescript
interface PasteSpecialOptions {
  pasteType: 'all' | 'values' | 'formatting';
  skipBlanks: boolean;
  transpose: boolean;
}

const PasteSpecialDialog = () => {
  const [options, setOptions] = useState<PasteSpecialOptions>({
    pasteType: 'all',
    skipBlanks: false,
    transpose: false,
  });
  
  return (
    <Dialog>
      <DialogTitle>Paste Special</DialogTitle>
      <DialogContent>
        <RadioGroup 
          value={options.pasteType}
          onChange={e => setOptions({...options, pasteType: e.target.value})}
        >
          <Radio value="all" label="All" />
          <Radio value="values" label="Values only" />
          <Radio value="formatting" label="Formatting only" />
        </RadioGroup>
        
        <Checkbox 
          checked={options.skipBlanks}
          onChange={e => setOptions({...options, skipBlanks: e.target.checked})}
          label="Skip blanks"
        />
        
        <Checkbox 
          checked={options.transpose}
          onChange={e => setOptions({...options, transpose: e.target.checked})}
          label="Transpose"
        />
      </DialogContent>
    </Dialog>
  );
};
```

## 7.31 Required Field Indicators

### Visual Indicator
```typescript
// Show asterisk in header for required columns
const columnDefs: ColDef[] = [
  {
    field: 'memberName',
    headerName: 'Member Name *',
    headerClass: 'required-field',
  },
  {
    field: 'memberDob',
    headerName: 'Member DOB *',
    headerClass: 'required-field',
  },
  {
    field: 'requestType',
    headerName: 'Request Type *',
    headerClass: 'required-field',
  },
  // ...
];

// CSS
.required-field {
  color: #1F2937;
}
.required-field::after {
  content: '';
  color: #EF4444;
}
```

### Empty Required Field Styling
```typescript
const getCellClass = (params: CellClassParams): string => {
  const isRequired = ['memberName', 'memberDob', 'requestType'].includes(params.colDef.field);
  const isEmpty = !params.value || params.value.trim() === '';
  
  if (isRequired && isEmpty) {
    return 'required-empty'; // Red dotted border
  }
  
  return '';
};
```

## 7.32 Data Validation Dropdown Indicators

### Show Dropdown Arrow
```typescript
// Visual indicator for cells with dropdown options
const cellRenderer = (params: ICellRendererParams) => {
  const hasDropdown = isDropdownColumn(params.colDef.field, params.data);
  
  return (
    <div className="flex items-center justify-between">
      <span>{params.value}</span>
      {hasDropdown && (
        <ChevronDownIcon className="w-4 h-4 text-gray-400" />
      )}
    </div>
  );
};
```

## 7.33 Number Formatting

### Numeric Field Formatting
```typescript
// Format HgbA1c values
export function formatHgbA1c(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '';
  
  // Always show one decimal place
  return num.toFixed(1);
}

// Format Time Interval (days)
export function formatDays(value: number): string {
  if (!value) return '';
  
  return `${value} day${value !== 1 ? 's' : ''}`;
}
```

### Column Configuration
```typescript
{
  field: 'timeIntervalDays',
  headerName: 'Time Interval',
  valueFormatter: (params) => formatDays(params.value),
  cellClass: 'text-right',
}
```

## 7.34 Selection Summary in Status Bar

### Selection Calculations
```typescript
const SelectionSummary = () => {
  const selectedCells = useGridSelection();
  
  const summary = useMemo(() => {
    const numericValues = selectedCells
      .map(cell => parseFloat(cell.value))
      .filter(v => !isNaN(v));
    
    if (numericValues.length === 0) {
      return null;
    }
    
    return {
      count: numericValues.length,
      sum: numericValues.reduce((a, b) => a + b, 0),
      average: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
    };
  }, [selectedCells]);
  
  if (!summary) {
    return <span>Selected: {selectedCells.length}</span>;
  }
  
  return (
    <div className="flex gap-4">
      <span>Count: {summary.count}</span>
      <span>Sum: {summary.sum.toFixed(2)}</span>
      <span>Avg: {summary.average.toFixed(2)}</span>
      <span>Min: {summary.min}</span>
      <span>Max: {summary.max}</span>
    </div>
  );
};
```

## 7.35 Quick Filter Bar

### Filter All Columns
```typescript
const QuickFilterBar = () => {
  const [filterText, setFilterText] = useState('');
  
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(e.target.value);
    gridApi.setQuickFilter(e.target.value);
  };
  
  return (
    <div className="quick-filter">
      <SearchIcon className="w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Quick filter... (searches all columns)"
        value={filterText}
        onChange={handleFilterChange}
        className="flex-1"
      />
      {filterText && (
        <button onClick={() => { setFilterText(''); gridApi.setQuickFilter(''); }}>
          <XIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
```

## 7.36 Column Quick Actions

### Column Header Context Menu
```
┌─────────────────────────┐
│ Sort Ascending          │
│ Sort Descending         │
│ Clear Sort              │
├─────────────────────────┤
│ Pin to Left             │
│ Pin to Right            │
│ Unpin                   │
├─────────────────────────┤
│ Auto-size this column   │
│ Auto-size all columns   │
├─────────────────────────┤
│ Hide Column             │
│ Show All Columns        │
├─────────────────────────┤
│ Filter by...            │
│ Clear Filter            │
└─────────────────────────┘
```

## 7.37 Data Validation on Entry

### Real-time Validation
```typescript
const validateOnEntry = (field: string, value: any, rowData: any): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  switch (field) {
    case 'memberDob':
      const dob = parseDate(value);
      if (!dob) {
        errors.push('Invalid date format');
      } else if (dob > new Date()) {
        errors.push('Date of birth cannot be in the future');
      } else if (dob < new Date('1900-01-01')) {
        errors.push('Date of birth seems too old');
      }
      break;
      
    case 'memberTelephone':
      const digits = value.replace(/\D/g, '');
      if (digits.length > 0 && digits.length !== 10 && digits.length !== 11) {
        errors.push('Phone number must be 10 digits');
      }
      break;
      
    case 'tracking1':
      // Validate HgbA1c value if applicable
      if (rowData.qualityMeasure === 'Diabetes Control') {
        const hgba1c = parseFloat(value);
        if (isNaN(hgba1c)) {
          errors.push('HgbA1c must be a number');
        } else if (hgba1c < 3 || hgba1c > 20) {
          warnings.push('HgbA1c value seems unusual (expected 3-20)');
        }
      }
      break;
      
    case 'statusDate':
      const statusDate = parseDate(value);
      if (statusDate && statusDate > new Date()) {
        // Only warn for future dates on non-scheduled statuses
        if (!rowData.measureStatus?.toLowerCase().includes('scheduled')) {
          warnings.push('Date is in the future');
        }
      }
      break;
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings 
  };
};
```

### Validation Feedback Timing
| Event | Validation Timing |
|-------|-------------------|
| On keystroke | Debounced (300ms) |
| On blur (exit cell) | Immediate |
| On paste | Before applying |
| On import | Before saving |

---

