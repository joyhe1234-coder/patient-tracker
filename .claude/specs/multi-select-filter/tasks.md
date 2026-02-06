# Tasks: Multi-Select Status Filter

## Task 1: Update StatusFilterBar to multi-select with checkmark+fill visual ✅ COMPLETE

**Requirements:** AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.5, AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-5.3

**File:** `frontend/src/components/layout/StatusFilterBar.tsx`

**Leverage:** `StatusFilterBar.tsx` — `handleChipClick` at line 39, chip rendering at line 62, `STATUS_CATEGORIES` at line 17

**Changes:**
1. Add `Check` import from `lucide-react`
2. Replace `handleChipClick` with multi-select toggle logic:
   - "All" click → `['all']`
   - "Duplicates" click → exclusive toggle (`['duplicate']` or `['all']`)
   - Color chip click while "All"/"Duplicates" active → `[chip]`
   - Color chip toggle ON → `[...existing, chip]`
   - Color chip toggle OFF (not last) → `existing.filter(f => f !== chip)`
   - Last color chip toggle OFF → `['all']` (prevent zero-selection)
3. Update chip rendering:
   - Active: filled background (`category.bgColor`) + `<Check size={14} strokeWidth={3} />` + full opacity
   - Inactive: `bg-white` + category border + `opacity-50 hover:opacity-75` (no checkmark)
   - Add `aria-pressed={isActive}` to each button
   - Remove old `ring-2 ring-offset-1 ring-blue-500` active styling

**Acceptance Criteria:**
- Multi-select toggle works for all click scenarios (see design logic table)
- Active chips show checkmark icon + filled background color
- Inactive chips show outlined style at 50% opacity with hover at 75%
- "All" and "Duplicates" chips use same visual treatment
- `aria-pressed` reflects toggle state on all chips
- Zero-selection state impossible (always falls back to "All")

**Dependencies:** None

---

## Task 2: Update StatusFilterBar Vitest tests ✅ COMPLETE

**Requirements:** AC-1.1 through AC-3.4, AC-5.3 (unit test coverage)

**File:** `frontend/src/components/layout/StatusFilterBar.test.tsx`

**Leverage:** Existing 39 tests at `StatusFilterBar.test.tsx`

**Changes:**
1. Fix existing tests that assert `ring-2` → assert `aria-pressed="true"` or checkmark presence instead
2. Fix existing single-select click behavior tests → verify multi-select toggle behavior
3. Add new tests:
   - Toggle ON: clicking unselected chip calls `onFilterChange` with chip added
   - Toggle OFF: clicking selected chip calls `onFilterChange` with chip removed
   - Multi-select: clicking second chip preserves first chip in filters
   - Last chip off: toggling last chip calls `onFilterChange(['all'])`
   - "All" click: clears all individual selections
   - "All" active + click chip: deselects "All", selects only clicked chip
   - "Duplicates" exclusive: selecting "Duplicates" deselects color chips
   - Color chip while "Duplicates" active: deselects "Duplicates"
   - Checkmark icon present for active chips, absent for inactive
   - `aria-pressed="true"` for active, `aria-pressed="false"` for inactive
   - Hover class on inactive chips

**Acceptance Criteria:**
- All existing tests pass (modified as needed for new behavior)
- ~12 new test cases added
- No skipped tests

**Dependencies:** Task 1

---

## Task 3: Add MainPage multi-filter integration tests ✅ COMPLETE

**Requirements:** AC-1.6, AC-4.1, AC-4.2, AC-4.3 (verify existing behavior works with multi-select)

**File:** `frontend/src/pages/MainPage.test.tsx`

**Leverage:** Existing 20 tests at `MainPage.test.tsx`, `filteredRowData` useMemo at MainPage line 77

**Changes:**
Add new tests verifying the existing `filteredRowData` and `rowCounts` logic works with multi-select arrays:
1. Multi-filter OR logic: `activeFilters=['green','blue']` returns rows matching either color
2. Duplicates filter: `activeFilters=['duplicate']` returns only duplicate rows
3. Multi-filter + search AND logic: `activeFilters=['green','blue']` + `searchText='smith'` returns only matching rows
4. Chip counts from full dataset: `rowCounts` is computed from `rowData` not `filteredRowData`
5. Status bar count: `filteredRowData.length` reflects multi-filter result
6. Edge case — all chips manually selected: equivalent to showing all rows
7. Edge case — single chip: same result as old single-select
8. Edge case — empty results: multi-filter combination yielding zero rows

**Acceptance Criteria:**
- All existing MainPage tests still pass
- ~8 new test cases verifying multi-select integration
- AC-4.1, AC-4.2, AC-4.3 explicitly tested

**Dependencies:** Task 1

---

## Task 4: Write Cypress E2E tests for multi-select filtering ✅ COMPLETE

**Requirements:** AC-1.1 through AC-5.3 (end-to-end coverage)

**File:** `frontend/cypress/e2e/multi-select-filter.cy.ts` (new)

**Leverage:** `frontend/cypress/e2e/sorting-filtering.cy.ts` for chip interaction patterns, `frontend/cypress/support/commands.ts` for helpers

**Changes:**
Create E2E test file covering:
1. Select one chip → grid filters to that status color
2. Select second chip → grid shows rows for both colors (OR logic)
3. Toggle chip off → grid removes that color's rows
4. "All" click → grid shows all rows, all chips deselected
5. "Duplicates" click → only duplicates shown, color chips deselected
6. Color chip while "Duplicates" active → exits duplicates mode
7. Last chip off → "All" auto-activates, grid shows all rows
8. Checkmark icon visible on active chips, hidden on inactive
9. `aria-pressed` attribute correct on active/inactive chips
10. Search + multi-filter → grid shows intersection
11. Clear search while multi-filter active → shows all rows for active filters
12. Status bar shows correct "Showing X of Y" for multi-filter
13. Chip counts unchanged when filters active
14. Keyboard: Enter/Space toggles focused chip
15. Tab navigation through chips

**Acceptance Criteria:**
- ~15 E2E test cases
- All tests pass
- Tests run reliably (no flaky tests)

**Dependencies:** Task 1

---

## Task 5: Update documentation ✅ COMPLETE

**Requirements:** All

**Files:**
- `.claude/CHANGELOG.md`
- `.claude/TODO.md`
- `.claude/IMPLEMENTATION_STATUS.md`
- `.claude/REGRESSION_TEST_PLAN.md`
- `.claude/TESTING.md`

**Changes:**
1. CHANGELOG: Add multi-select filter entry with test counts
2. TODO: Update "Last Updated" date
3. IMPLEMENTATION_STATUS: Add feature to Phase 4, update test counts
4. REGRESSION_TEST_PLAN: Add test section for multi-select filter (TC-30.x)
5. TESTING: Add new test files, update counts

**Acceptance Criteria:**
- All docs updated and consistent with each other
- Test counts accurate
- CHANGELOG is source of truth

**Dependencies:** Tasks 2, 3, 4

---

## Execution Order

```
Task 1 → Tasks 2, 3, 4 (parallel) → Task 5
```

**Estimated total: ~35 new tests**
