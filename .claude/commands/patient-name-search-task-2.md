# Task 2: Add search state and filtering logic to MainPage

## Spec Reference
- Spec: `.claude/specs/patient-name-search/`
- Requirements: 2.1-2.6, 3.1-3.4, 4.1-4.2

## Instructions

Modify `frontend/src/pages/MainPage.tsx` to add search state and filtering:

1. **Add state**: `const [searchText, setSearchText] = useState('')`

2. **Modify `filteredRowData` useMemo** (currently at ~line 73):
   - Keep existing status color filter logic
   - After status filter, add name search filter:
   ```typescript
   const filteredRowData = useMemo(() => {
     let filtered = rowData;

     // Apply status color filter (existing logic)
     if (!activeFilters.includes('all') && activeFilters.length > 0) {
       filtered = filtered.filter((row) => {
         if (activeFilters.includes('duplicate')) return row.isDuplicate;
         const color = getRowStatusColor(row);
         return activeFilters.includes(color);
       });
     }

     // Apply name search filter (NEW)
     if (searchText.trim()) {
       const search = searchText.trim().toLowerCase();
       filtered = filtered.filter((row) =>
         row.memberName?.toLowerCase().includes(search)
       );
     }

     return filtered;
   }, [rowData, activeFilters, searchText]);
   ```

3. **Pass props to StatusFilterBar** (currently at ~line 293):
   ```tsx
   <StatusFilterBar
     activeFilters={activeFilters}
     onFilterChange={setActiveFilters}
     rowCounts={rowCounts}
     searchText={searchText}
     onSearchChange={setSearchText}
   />
   ```

4. **Do NOT change** `rowCounts` useMemo - chip counts must reflect full dataset

## Leverage
- Existing pattern: `filteredRowData` useMemo at line 73-87
- Existing state: `activeFilters` state at line 30

## Acceptance Criteria
- Empty search shows all rows (no name filtering)
- Typing filters rows by memberName (case-insensitive partial match)
- Search + status color filter uses AND logic (both must match)
- Clearing search restores rows (respecting active status filter)
- StatusBar row count reflects filtered count
- Status chip counts reflect FULL dataset (not affected by search)
- Null memberName rows excluded from search results (correct behavior)
