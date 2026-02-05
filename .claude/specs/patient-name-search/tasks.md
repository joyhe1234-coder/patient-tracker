# Implementation Plan: Patient Name Search

## Task Overview
Add client-side patient name search to the existing StatusFilterBar, extending the filteredRowData useMemo pattern in MainPage. Total: 5 coding tasks + 2 test tasks.

## Steering Document Compliance
- **structure.md**: Modifying existing components (StatusFilterBar.tsx, MainPage.tsx), tests follow naming conventions
- **tech.md**: React + TypeScript, Tailwind CSS, Lucide React icons, Vitest for components, Cypress for E2E

## Tasks

- [ ] 1. Add search input UI to StatusFilterBar component
  - File: `frontend/src/components/layout/StatusFilterBar.tsx`
  - Add new props: `searchText: string`, `onSearchChange: (text: string) => void`
  - Add search input element to the right side of the filter bar (after the chip map)
  - Use `ml-auto` to push search to the right end
  - Add Lucide `Search` icon inside input on the left side
  - Add Lucide `X` icon as clear button, visible only when `searchText` is non-empty
  - Input: `w-64`, placeholder "Search by name...", `aria-label="Search patients by name"`
  - Clear button: `aria-label="Clear search"`, calls `onSearchChange('')` on click
  - Style with Tailwind to match existing filter bar aesthetic (border, rounded, text-sm)
  - Purpose: Render the search UI in the existing filter bar
  - _Leverage: `frontend/src/components/layout/StatusFilterBar.tsx` (existing component layout)_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [ ] 2. Add search state and filtering logic to MainPage
  - File: `frontend/src/pages/MainPage.tsx`
  - Add `const [searchText, setSearchText] = useState('')`
  - Modify `filteredRowData` useMemo to apply name search after status filter:
    - If `searchText.trim()` is non-empty, filter rows where `row.memberName?.toLowerCase().includes(searchText.trim().toLowerCase())`
    - Add `searchText` to useMemo dependency array
  - Pass `searchText` and `onSearchChange={setSearchText}` to StatusFilterBar
  - Purpose: Wire search state and implement AND filtering logic
  - _Leverage: `frontend/src/pages/MainPage.tsx` (existing `filteredRowData` useMemo at line 73, `activeFilters` state pattern)_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2_

- [ ] 3. Add Ctrl+F keyboard shortcut to focus search input
  - Files: `frontend/src/pages/MainPage.tsx`, `frontend/src/components/layout/StatusFilterBar.tsx`
  - In StatusFilterBar: add `React.forwardRef` or accept an `inputRef` prop (ref to the input element)
  - In MainPage: create `searchInputRef = useRef<HTMLInputElement>(null)`
  - In MainPage: add `useEffect` with `keydown` event listener on `document`:
    - If `(e.ctrlKey || e.metaKey) && e.key === 'f'`: call `e.preventDefault()` and `searchInputRef.current?.focus()`
    - Only when no AG Grid cell is being edited (check `document.querySelector('.ag-popup-editor')` is null)
  - In StatusFilterBar: add `onKeyDown` handler on input: if `Escape`, clear text and blur
  - Purpose: Enable keyboard shortcuts for power users
  - _Leverage: `frontend/src/pages/MainPage.tsx` (existing useEffect patterns)_
  - _Requirements: 5.1, 5.2_

- [ ] 4. Write Vitest component tests for search functionality
  - Files: `frontend/src/components/layout/StatusFilterBar.test.tsx` (new or extend existing)
  - Test cases:
    - Renders search input with placeholder text "Search by name..."
    - Renders search icon (Search from lucide-react)
    - Does NOT show clear button when searchText is empty
    - Shows clear button when searchText is non-empty
    - Calls onSearchChange when user types in input
    - Calls onSearchChange('') when clear button is clicked
    - Has aria-label "Search patients by name" on input
    - Has aria-label "Clear search" on clear button
    - Escape key clears search text and blurs input
  - Purpose: Unit test the search UI component behavior
  - _Leverage: `frontend/src/components/layout/Header.test.tsx` (existing Vitest component test pattern)_
  - _Requirements: 1.1-1.7, 5.2_

- [ ] 5. Write Vitest tests for MainPage search filtering logic
  - File: `frontend/src/pages/MainPage.test.tsx` (new or extend existing)
  - Test the filtering logic in isolation (extract to a testable function if needed):
    - Empty search returns all rows
    - Search filters by memberName (case-insensitive, partial match)
    - Search + status filter applies AND logic
    - Null memberName rows are excluded from search results
    - Clearing search restores all rows
    - Row counts: filteredRowData.length reflects combined filters
    - Row counts: rowCounts (chip counts) reflect full unfiltered dataset
  - Purpose: Unit test the search + filter combination logic
  - _Leverage: `frontend/src/stores/authStore.test.ts` (existing Vitest test patterns with mocks)_
  - _Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.2_

- [ ] 6. Write Cypress E2E tests for search functionality
  - File: `frontend/cypress/e2e/patient-name-search.cy.ts` (new)
  - Test cases:
    - Search input is visible on main page
    - Typing in search box filters grid rows by patient name
    - Search is case-insensitive
    - Search supports partial match
    - Clear button appears when text is present
    - Clicking clear button restores all rows
    - Search combined with status color filter (AND logic)
    - Empty search shows all rows
    - Ctrl+F focuses the search input
    - Escape clears search and blurs input
  - Purpose: End-to-end validation of search feature in real browser
  - _Leverage: `frontend/cypress/e2e/sorting-filtering.cy.ts` (existing Cypress E2E patterns), `frontend/cypress/support/commands.ts` (custom AG Grid commands)_
  - _Requirements: All (1-5)_

- [ ] 7. Update documentation
  - Files: `.claude/CHANGELOG.md`, `.claude/IMPLEMENTATION_STATUS.md`, `.claude/TODO.md`, `.claude/REGRESSION_TEST_PLAN.md`
  - Add patient name search to CHANGELOG
  - Mark "Quick search/filter by patient name" as complete in TODO.md
  - Add feature to IMPLEMENTATION_STATUS.md
  - Add test cases to REGRESSION_TEST_PLAN.md
  - Purpose: Keep documentation in sync with implementation
  - _Requirements: All_
