# Task 3: Add Ctrl+F keyboard shortcut to focus search input

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: 5.1, 5.2

## Instructions

Modify both `StatusFilterBar.tsx` and `MainPage.tsx` to add keyboard shortcuts:

### StatusFilterBar.tsx

1. **Accept an `inputRef` prop** for the search input:
   ```typescript
   interface StatusFilterBarProps {
     // ... existing props
     searchText: string;
     onSearchChange: (text: string) => void;
     searchInputRef?: React.RefObject<HTMLInputElement>;  // NEW
   }
   ```

2. **Attach ref to the search input**:
   ```tsx
   <input ref={searchInputRef} ... />
   ```

3. **Add onKeyDown handler** on the search input:
   - If `Escape` key: call `onSearchChange('')` and `e.currentTarget.blur()`

### MainPage.tsx

1. **Create ref**: `const searchInputRef = useRef<HTMLInputElement>(null)`

2. **Add useEffect** for global keyboard shortcut:
   ```typescript
   useEffect(() => {
     const handleKeyDown = (e: KeyboardEvent) => {
       // Ctrl+F or Cmd+F to focus search
       if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
         // Don't intercept if editing a cell
         if (document.querySelector('.ag-popup-editor')) return;
         e.preventDefault();
         searchInputRef.current?.focus();
       }
     };
     document.addEventListener('keydown', handleKeyDown);
     return () => document.removeEventListener('keydown', handleKeyDown);
   }, []);
   ```

3. **Pass ref to StatusFilterBar**:
   ```tsx
   <StatusFilterBar
     ...
     searchInputRef={searchInputRef}
   />
   ```

## Leverage
- Existing: `useEffect` patterns in MainPage.tsx
- Existing: `useRef` import already used in MainPage

## Acceptance Criteria
- Ctrl+F (or Cmd+F on Mac) focuses the search input
- Does NOT intercept Ctrl+F when editing a cell in AG Grid
- Escape key clears search text and blurs the input
- Browser default Ctrl+F prevented (our search takes over)
