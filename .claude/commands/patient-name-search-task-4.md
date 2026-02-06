# Task 4: Write Vitest component tests for search UI

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: 1.1-1.7, 5.2

## Instructions

Create or extend `frontend/src/components/layout/StatusFilterBar.test.tsx`:

1. **Import dependencies**:
   ```typescript
   import { render, screen, fireEvent } from '@testing-library/react';
   import { describe, it, expect, vi } from 'vitest';
   import StatusFilterBar from './StatusFilterBar';
   ```

2. **Create default test props**:
   ```typescript
   const defaultProps = {
     activeFilters: ['all'] as StatusColor[],
     onFilterChange: vi.fn(),
     rowCounts: { all: 0, duplicate: 0, white: 10, yellow: 5, blue: 3, green: 8, purple: 2, orange: 1, gray: 1, red: 0 },
     searchText: '',
     onSearchChange: vi.fn(),
   };
   ```

3. **Write test cases**:
   - Renders search input with placeholder "Search by name..."
   - Renders search icon (magnifying glass)
   - Does NOT show clear button when searchText is empty
   - Shows clear button when searchText is non-empty (pass `searchText="smith"`)
   - Calls onSearchChange when user types in input (fireEvent.change)
   - Calls onSearchChange('') when clear button is clicked
   - Has aria-label "Search patients by name" on input
   - Has aria-label "Clear search" on clear button
   - Escape key in input calls onSearchChange('') (fireEvent.keyDown with Escape)
   - Existing status chips still render correctly (regression check)

4. **Run tests**: `cd frontend && npx vitest run src/components/layout/StatusFilterBar.test.tsx`

## Leverage
- Test pattern: `frontend/src/components/layout/Header.test.tsx`
- Component: `frontend/src/components/layout/StatusFilterBar.tsx`

## Acceptance Criteria
- All tests pass
- At least 9 test cases covering UI rendering, interaction, and accessibility
- No existing tests broken
