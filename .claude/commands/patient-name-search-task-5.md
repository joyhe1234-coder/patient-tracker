# Task 5: Write Vitest tests for MainPage search filtering logic

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.2

## Instructions

Create `frontend/src/pages/MainPage.test.tsx` or add to existing test file.

Since MainPage has many dependencies (API calls, AG Grid, auth store), consider testing the filtering logic by either:

**Option A (Preferred):** Extract the filtering logic into a pure function and test it directly:
```typescript
// In a test helper or inline
function filterRows(rows: GridRow[], activeFilters: StatusColor[], searchText: string): GridRow[] {
  // Same logic as filteredRowData useMemo
}
```

**Option B:** Render MainPage with mocked dependencies and test through the UI.

### Test Cases

1. **Empty search returns all rows**: Pass empty searchText, verify all rows returned
2. **Search filters by name (case-insensitive)**: "smith" matches "John Smith"
3. **Search filters by name (partial match)**: "smi" matches "John Smith"
4. **Search matches any part of name**: "john" matches "John Smith"
5. **Search with no matches returns empty**: "xyz123" returns no rows
6. **Null memberName excluded**: Row with `memberName: null` not included in search results
7. **Search + status filter (AND logic)**: Active green filter + search "smith" → only green rows matching "smith"
8. **Clearing search restores rows**: Set searchText then clear → all rows return
9. **Chip counts reflect full dataset**: rowCounts computed from unfiltered rowData, not affected by search
10. **Whitespace-only search treated as empty**: "   " (spaces) shows all rows

Run: `cd frontend && npx vitest run src/pages/MainPage.test.tsx`

## Leverage
- Test patterns: `frontend/src/stores/authStore.test.ts`
- Filter logic: `frontend/src/components/layout/StatusFilterBar.tsx` (getRowStatusColor)
- Grid types: `frontend/src/components/grid/PatientGrid.tsx` (GridRow type)

## Acceptance Criteria
- All tests pass
- At least 8 test cases covering filtering logic
- Tests cover: empty search, case-insensitive, partial match, AND logic, null handling, whitespace
