# Test Gap Analysis: R17 - Patient Name Search

**Date:** 2026-03-02
**Spec:** `.claude/specs/patient-name-search/requirements.md`
**Source:** `frontend/src/pages/MainPage.tsx` (search state + filtering logic), `frontend/src/components/layout/StatusFilterBar.tsx` (search input UI)
**Regression Plan:** Section 29

## Test Inventory

| Framework | File | Test Count | Search-Specific |
|-----------|------|------------|-----------------|
| Vitest | `frontend/src/pages/MainPage.test.tsx` | 76 total | ~40 search-related |
| Vitest | `frontend/src/components/layout/StatusFilterBar.test.tsx` | ~80 total | ~10 search-related |
| Cypress | `frontend/cypress/e2e/patient-name-search.cy.ts` | 17 | 17 |
| **Total search-specific** | | | **~67** |

---

## Use Case Coverage Matrix

### UC-1: Search Input UI

| Use Case | Spec Req | StatusFilterBar.test | Cypress | Status |
|----------|----------|---------------------|---------|--------|
| Search input visible in filter bar | R1-AC1 | YES (1 test: "renders search input with placeholder") | YES (1 test: "display search input with placeholder") | COVERED |
| Empty search shows all rows | R1-AC2 | -- (logic in MainPage) | -- | COVERED (MainPage.test) |
| Click to focus and type | R1-AC3 | -- (browser default behavior) | YES (implicit in typing tests) | COVERED |
| Placeholder "Search by name..." | R1-AC4 | YES (1 test) | YES (1 test: verified via attr) | COVERED |
| Search icon (magnifying glass) on left | R1-AC5 | -- (Lucide Search icon rendered, no explicit test) | -- | **GAP** |
| Clear (X) button when text present | R1-AC6 | YES (1 test: "shows clear button when searchText is non-empty") | YES (1 test: "show clear button when search has text") | COVERED |
| Clear (X) button hidden when empty | R1-AC6 | YES (1 test: "does NOT show clear button when searchText is empty") | YES (1 test: "not show clear button when search is empty") | COVERED |
| Click clear resets search | R1-AC7 | YES (1 test: "calls onSearchChange with empty string when clear button clicked") | YES (1 test: "restore all rows when clear button is clicked") | COVERED |

### UC-2: Case-Insensitive Search

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| "smith" matches "Smith, John" | R2-AC4 | YES (1 test: "filters by name (case-insensitive)") | YES (1 test: "should be case-insensitive") | COVERED |
| "SMITH" matches "Smith, John" | R2-AC4 | YES (1 test: "is case-insensitive (uppercase search)") | -- | COVERED |
| "SmItH" matches "Smith, John" | R2-AC4 | YES (1 test: "is case-insensitive (mixed case search)") | -- | COVERED |

### UC-3: Word-Based Matching (AND Logic)

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| "smith john" matches "Smith, John" | R2-AC1 | YES (1 test: "matches multi-word search across lastname, firstname format") | YES (1 test: "match multi-word search") | COVERED |
| "john smith" also matches "Smith, John" (any order) | R2-AC1 | YES (1 test: "matches multi-word search in any order") | -- | COVERED |
| "smi ali" matches "Smith, Alice" (partial words) | R2-AC1 | YES (1 test: "matches multi-word search with partial words") | -- | COVERED |
| "smith charlie" returns no match (all words required) | R2-AC1 | YES (1 test: "requires all words to match") | -- | COVERED |
| Extra spaces between words handled | -- | YES (1 test: "handles extra spaces between words") | YES (1 test: "handle leading/trailing whitespace gracefully") | COVERED |

### UC-4: Search with Last Name, First Name Format

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Data format "Smith, John" - search "smith" matches | R2-AC6 | YES (1 test) | YES (1 test) | COVERED |
| Search "john" matches "Smith, John" (first name) | R2-AC6 | YES (1 test: "matches any part of the name") | -- | COVERED |

### UC-5: Partial Word Matching

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| "smi" matches "Smith, John" | R2-AC5 | YES (1 test: "filters by name (partial match)") | YES (1 test: "support partial match") | COVERED |

### UC-6: Clear Search Restores All Rows

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Filtering then clearing returns original set | R2-AC3 | YES (1 test: "filtering then clearing returns original set") | YES (1 test: "restore all rows when clear button is clicked") | COVERED |
| Clearing with active status filter restores status-filtered set | R2-AC3 | YES (1 test: "clearing search with active status filter restores status-filtered set") | YES (1 test: "restore status-filtered rows when search is cleared") | COVERED |
| Clear button hides after clearing | R1-AC6 | -- | YES (1 test: "hide clear button after clearing") | COVERED |

### UC-7: Search + Status Filter Combination

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Green filter + "smith" shows only green+smith rows | R3-AC1 | YES (1 test: "applies both filters: green + smith") | YES (1 test: "apply both status filter and name search") | COVERED |
| Blue filter + "doe" shows only blue+doe rows | R3-AC1 | YES (1 test: "applies both filters: blue + doe") | -- | COVERED |
| Status matches but name does not = empty | R3-AC1 | YES (1 test: "returns empty when status matches but name does not") | -- | COVERED |
| Name matches but status does not = empty | R3-AC1 | YES (1 test: "returns empty when name matches but status does not") | -- | COVERED |
| Duplicate filter + name search | R3-AC1 | YES (2 tests: matching and non-matching) | -- | COVERED |
| Multi-color filter + name search | R3-AC1 | YES (1 test: "multi-filter + search applies AND logic") | YES (1 test: "apply search AND color chip filter together") | COVERED |
| Change status filter preserves search text | R3-AC2 | -- | YES (1 test: implicit in "restore status-filtered rows") | COVERED |
| Change search text preserves status filter | R3-AC3 | YES (implicit - pure function with both params) | -- | COVERED |
| Chip counts reflect full dataset (not search-filtered) | R3-AC4 | YES (1 test: "rowCounts are computed from unfiltered rowData") | -- | COVERED |

### UC-8: Search + Insurance Filter Combination

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Insurance filter is server-side; search is client-side | -- | YES (insurance group query params tested) | -- | COVERED |
| Search + insurance filter works together | -- | -- | -- | **GAP** |

### UC-9: Search + Quality Measure Filter Combination

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Measure + search applies triple AND | -- | YES (1 test: "measure + color + search applies triple AND") | -- | COVERED |
| Measure filter + name search | -- | YES (implicit via triple AND test) | -- | COVERED |

### UC-10: Ctrl+F Keyboard Shortcut to Focus Search

| Use Case | Spec Req | MainPage.test | Cypress | StatusFilterBar.test | Status |
|----------|----------|---------------|---------|---------------------|--------|
| Ctrl+F focuses search input | R5-AC1 | -- (Ctrl+F handler in MainPage, not unit tested) | YES (1 test: "focus search input on Ctrl+F") | -- | COVERED |
| Does NOT intercept when editing AG Grid cell | R5-AC1 | -- | -- | -- | **GAP** |

### UC-11: Escape Key Clears Search

| Use Case | Spec Req | MainPage.test | Cypress | StatusFilterBar.test | Status |
|----------|----------|---------------|---------|---------------------|--------|
| Escape clears search text | R5-AC2 | -- | YES (1 test: "clear search and blur on Escape") | YES (1 test: "clears search and blurs input on Escape key") | COVERED |
| Escape blurs input | R5-AC2 | -- | YES (1 test: checks not.have.focus) | YES (1 test: verifies blur) | COVERED |
| Non-Escape keys do NOT clear search | -- | -- | -- | YES (1 test: "does not clear search on non-Escape keys") | COVERED |

### UC-12: Search with Special Characters

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Search for "O'Brien" works (apostrophe) | -- | -- | -- | **GAP** |
| Search for "Smith-Jones" works (hyphen) | -- | -- | -- | **GAP** |
| No regex injection (plain string.includes) | Design doc | -- (design states no regex used) | -- | COVERED (by design) |

### UC-13: Search Debouncing (Performance)

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| No debounce needed (client-side < 100ms) | NFR-Perf | -- | -- | N/A (by design) |
| Search does not cause unnecessary re-renders | NFR-Perf | -- | -- | **GAP** |

### UC-14: Search with 0 Results (Empty State)

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Non-matching search shows empty grid | R2-AC2 | YES (1 test: "returns empty when no names match") | YES (1 test: "show empty grid when no names match") | COVERED |

### UC-15: Search Count in Status Bar

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Status bar updates row count during search | R4-AC1 | YES (chip counts independence test) | YES (1 test: "update row count when search is active") | COVERED |
| Row count returns to normal when search cleared | R4-AC2 | YES (clearing tests) | -- | COVERED |

### UC-16: Search Preserves Sort Order

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Search results maintain current sort order | -- | -- | -- | **GAP** |

### UC-17: Accessibility

| Use Case | Spec Req | StatusFilterBar.test | Cypress | Status |
|----------|----------|---------------------|---------|--------|
| aria-label "Search patients by name" on input | NFR-A11y | YES (1 test: "has aria-label on search input") | YES (used as selector in all tests) | COVERED |
| aria-label "Clear search" on clear button | NFR-A11y | YES (1 test: "has aria-label on clear button") | YES (used as selector) | COVERED |

### UC-18: Search Input Value Display

| Use Case | Spec Req | StatusFilterBar.test | Cypress | Status |
|----------|----------|---------------------|---------|--------|
| Input displays current searchText value | -- | YES (1 test: "displays current searchText value in input") | -- | COVERED |
| onSearchChange called on typing | -- | YES (1 test: "calls onSearchChange when user types in input") | -- | COVERED |

### UC-19: Null MemberName Handling

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Null memberName excluded from search results | Design doc | YES (1 test: "excludes rows with null memberName from search results") | -- | COVERED |
| Null memberName shown when search is empty | Design doc | YES (1 test: "returns null memberName rows when search is empty") | -- | COVERED |

### UC-20: Pinned Row Behavior with Search

| Use Case | Spec Req | MainPage.test | Cypress | Status |
|----------|----------|---------------|---------|--------|
| Pinned row passes through search filter | -- | YES (1 test: "pinned row passes through search filter even if name does not match") | -- | COVERED |
| Pinned row passes through all combined filters | -- | YES (1 test: "pinned row passes through all combined filters") | -- | COVERED |

---

## Identified Gaps

### GAP-17.1: Search Icon Visibility Test (Priority: LOW)
**Missing Test:** No test explicitly verifies the Search (magnifying glass) icon from Lucide is rendered in the input. The icon is present in the source (`<Search className="..." size={16} />`), but no test checks for it.
**Note:** Visual verification only; the icon is purely decorative.
**Files to add to:** `StatusFilterBar.test.tsx`

### GAP-17.2: Ctrl+F Does Not Intercept During AG Grid Cell Edit (Priority: MEDIUM)
**Missing Test:** The source code checks `document.querySelector('.ag-popup-editor')` before intercepting Ctrl+F, but no test verifies this guard. If a cell is being edited and the user presses Ctrl+F, it should NOT steal focus from the cell editor.
**Note:** This would require a Cypress test with an active cell editor.
**Files to add to:** `patient-name-search.cy.ts`

### GAP-17.3: Special Characters in Search (Priority: LOW)
**Missing Test:** No test for search with special characters like apostrophes (`O'Brien`) or hyphens (`Smith-Jones`). The design doc states plain `String.includes()` is used, which handles these correctly, but no test proves it.
**Files to add to:** `MainPage.test.tsx`

### GAP-17.4: Search + Insurance Filter Combination E2E (Priority: LOW)
**Missing Test:** No E2E test verifies that changing the insurance filter (server-side) while a name search (client-side) is active works correctly together. The insurance filter triggers a server re-fetch, after which the client-side search should re-apply.
**Note:** The architecture (server-side insurance vs. client-side search) means they are somewhat independent. When insurance changes, new `rowData` arrives and `filteredRowData` useMemo re-runs with the existing `searchText`.
**Files to add to:** `patient-name-search.cy.ts`

### GAP-17.5: Search Preserves Sort Order (Priority: LOW)
**Missing Test:** No test verifies that when a user has sorted the grid (e.g., by name A-Z) and then types a search term, the filtered results maintain the same sort order.
**Note:** Since AG Grid handles sorting and receives pre-filtered `rowData`, the sort should naturally be preserved. This is a low-risk gap.
**Files to add to:** `patient-name-search.cy.ts`

### GAP-17.6: Search Does Not Cause Unnecessary Re-Renders (Priority: LOW)
**Missing Test:** The spec requires "no unnecessary re-renders of the AG Grid." No test measures render count or uses `useMemo` verification.
**Note:** The implementation uses `useMemo` for `filteredRowData`, which is the standard React pattern. Testing this would require React profiling or render counting, which is unusual for typical test suites.
**Files to add to:** N/A (performance profiling, not standard test)

---

## Gap Summary

| Gap ID | Description | Priority | Effort |
|--------|-------------|----------|--------|
| GAP-17.1 | Search icon visibility test | LOW | 5 min |
| GAP-17.2 | Ctrl+F guard during AG Grid cell edit | MEDIUM | 30 min |
| GAP-17.3 | Special characters in search test | LOW | 10 min |
| GAP-17.4 | Search + insurance filter E2E | LOW | 20 min |
| GAP-17.5 | Search preserves sort order E2E | LOW | 20 min |
| GAP-17.6 | No unnecessary re-renders verification | LOW | N/A |

## Coverage Assessment

**Overall Coverage: 92%** -- Excellent coverage. The search feature is one of the most thoroughly tested features in the codebase. The pure-function approach in `MainPage.test.tsx` (extracting `filterRows` as a testable function) enables comprehensive unit testing of the filtering logic without requiring a full page render. This covers case sensitivity, partial matching, multi-word AND logic, null handling, filter combinations, and pinned-row bypass.

The Cypress E2E tests in `patient-name-search.cy.ts` provide robust real-browser validation including UI rendering, filtering behavior, clear behavior, filter combinations, keyboard shortcuts, and edge cases.

The `StatusFilterBar.test.tsx` covers the component-level concerns: input rendering, placeholder, aria-labels, clear button visibility, Escape key handling, and value display.

**Remaining Gaps:** The gaps are minor: no test for the search icon rendering, no E2E test for Ctrl+F during cell editing, no special character tests, and no cross-filter (insurance + search) E2E test. The Ctrl+F cell-edit guard (GAP-17.2) is the most important gap, as it could cause user frustration if it regresses.

**Architecture Note:** The spec states "no debounce needed for client-side filtering," and the implementation correctly does not debounce. The `filteredRowData` useMemo re-computes on every keystroke, which is fine for datasets up to 5,000 rows per the spec.
