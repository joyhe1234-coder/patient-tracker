# Task 1: Add search input UI to StatusFilterBar

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7

## Instructions

Modify `frontend/src/components/layout/StatusFilterBar.tsx` to add a search input:

1. **Add new props** to `StatusFilterBarProps`:
   - `searchText: string`
   - `onSearchChange: (text: string) => void`

2. **Add imports**: `Search` and `X` icons from `lucide-react`

3. **Add search input element** after the chip map (inside the existing flex container):
   - Use `ml-auto` to push search to the right end of the bar
   - Wrap in a `relative` div for icon positioning
   - Search icon (`Search`, size 16) positioned absolute left inside input
   - Input: `w-64 pl-8 pr-8 py-1 text-sm border border-gray-300 rounded-md`
   - Placeholder: `"Search by name..."`
   - `aria-label="Search patients by name"`
   - `value={searchText}`, `onChange` calls `onSearchChange(e.target.value)`
   - Clear button (`X`, size 16): positioned absolute right, only visible when `searchText` is non-empty
   - Clear button: `aria-label="Clear search"`, onClick calls `onSearchChange('')`

4. **Do NOT change** existing chip rendering or filter logic

## Leverage
- Existing component: `frontend/src/components/layout/StatusFilterBar.tsx`
- Icon pattern: `lucide-react` already used in Header.tsx, Toolbar, etc.

## Acceptance Criteria
- Search input renders in the filter bar to the right of status chips
- Search icon visible on the left of input
- Placeholder text "Search by name..." shown when empty
- Clear (X) button hidden when input is empty
- Clear (X) button visible when input has text
- Clicking clear calls onSearchChange('')
- Typing calls onSearchChange with current value
- aria-labels present on input and clear button
