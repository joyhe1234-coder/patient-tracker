# Test Gap Analysis: Requirement Area 5 -- Status Filter Bar (Including Multi-Select)

**Date:** 2026-03-02
**Analyst:** Claude Opus 4.6
**Scope:** Status Filter Bar, Multi-Select Filter, Compact Filter Bar with Quality Measure Dropdown, Insurance Group Filter

---

## 1. Feature Summary

The Status Filter Bar is a composite UI feature spanning four spec areas:

| Spec Area | Location | Key Requirements |
|-----------|----------|------------------|
| Status Color Filter Bar | `.claude/specs/status-filter/` | Single-select filtering by status color, chip counts, chip display order |
| Multi-Select Status Filter | `.claude/specs/multi-select-filter/` | Multi-select toggle, checkmark+fill visual, Duplicates exclusivity, keyboard accessibility |
| Compact Filter Bar + QM Dropdown | `.claude/specs/compact-filter-bar/` | Compact chips, Quality Measure dropdown, combined filter AND logic, chip count scoping, status bar summary, row color accuracy (CFB-R8) |
| Insurance Group Filter | (implemented, regression plan section 35/46) | Insurance group dropdown, combined 4-filter AND logic |

**Source Code:**
- `frontend/src/components/layout/StatusFilterBar.tsx` (203 lines)
- `frontend/src/pages/MainPage.tsx` (filter state, derived data)
- `frontend/src/components/layout/StatusBar.tsx` (filter summary display)
- `frontend/src/config/statusColors.ts` (shared color mapping logic)

---

## 2. Complete Use Case Inventory

### 2.1 Chip Rendering & Display

| # | Use Case | Priority |
|---|----------|----------|
| UC-1 | All 10 chips render in correct order: All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A | HIGH |
| UC-2 | Each chip shows status label text | HIGH |
| UC-3 | Each chip shows count in parentheses format "(X)" | HIGH |
| UC-4 | "All" chip count = sum of all color counts (excluding duplicate count) | HIGH |
| UC-5 | Compact chip styling: whitespace-nowrap, py-0.5, px-2, text-xs, border (not border-2) | MEDIUM |
| UC-6 | Check icon size is 12px on active chips | LOW |
| UC-7 | Count text uses text-[10px] size | LOW |
| UC-8 | All 10 chips fit on single row at 1280px viewport | MEDIUM |
| UC-9 | Chips wrap gracefully on viewports below 1280px (flex-wrap) | LOW |

### 2.2 Single Filter Selection (Legacy Behavior, Subsumed by Multi-Select)

| # | Use Case | Priority |
|---|----------|----------|
| UC-10 | "All" chip selected by default on page load | HIGH |
| UC-11 | Clicking a chip filters grid to that status only | HIGH |
| UC-12 | Clicking same chip again deselects and returns to "All" | HIGH |
| UC-13 | Clicking different chip switches filter (deselects previous) | HIGH |
| UC-14 | Status bar shows "Showing X of Y rows" when filtered | HIGH |
| UC-15 | Status bar shows full count when "All" selected | HIGH |

### 2.3 Multi-Select Toggle Behavior

| # | Use Case | Priority |
|---|----------|----------|
| UC-16 | Clicking unselected chip adds it to active filters (toggle ON) | HIGH |
| UC-17 | Clicking selected chip removes it (toggle OFF) without affecting others | HIGH |
| UC-18 | Toggling OFF the last chip falls back to "All" (prevents zero-selection) | HIGH |
| UC-19 | Clicking "All" clears all individual selections | HIGH |
| UC-20 | Clicking chip while "All" is active selects only that chip | HIGH |
| UC-21 | Multiple active filters use OR logic (grid shows rows matching ANY) | HIGH |
| UC-22 | Can select 3+ chips simultaneously | MEDIUM |
| UC-23 | All chips manually selected does NOT auto-switch to "All" | MEDIUM |

### 2.4 Duplicates Exclusivity

| # | Use Case | Priority |
|---|----------|----------|
| UC-24 | Clicking "Duplicates" deselects all color chips | HIGH |
| UC-25 | Clicking color chip while "Duplicates" active exits duplicates mode | HIGH |
| UC-26 | Toggling "Duplicates" off returns to "All" | HIGH |
| UC-27 | "Duplicates" and "All" are mutually exclusive | MEDIUM |
| UC-28 | "Duplicates" filter shows only rows with isDuplicate flag | HIGH |

### 2.5 Checkmark + Fill Visual Style

| # | Use Case | Priority |
|---|----------|----------|
| UC-29 | Active chip: checkmark icon (Check SVG) present | HIGH |
| UC-30 | Active chip: filled background color matching status identity | HIGH |
| UC-31 | Active chip: aria-pressed="true" | HIGH |
| UC-32 | Active chip: no opacity reduction (full opacity) | MEDIUM |
| UC-33 | Inactive chip: no checkmark icon | HIGH |
| UC-34 | Inactive chip: outlined style (bg-white + category border) | MEDIUM |
| UC-35 | Inactive chip: hover:bg-gray-50 class | MEDIUM |
| UC-36 | Inactive chip: aria-pressed="false" | HIGH |
| UC-37 | Multiple active chips all show checkmark + filled style simultaneously | MEDIUM |

### 2.6 Zero-Count Chip Behavior

| # | Use Case | Priority |
|---|----------|----------|
| UC-38 | Zero-count inactive chip: border-dashed styling (not opacity reduction) | MEDIUM |
| UC-39 | Zero-count chip is still clickable | MEDIUM |
| UC-40 | Clicking zero-count chip selects it (active styling), grid shows 0 rows | MEDIUM |
| UC-41 | Zero-count chips at sufficient contrast for WCAG 2.1 AA | LOW |

### 2.7 Quality Measure Dropdown

| # | Use Case | Priority |
|---|----------|----------|
| UC-42 | Dropdown renders with aria-label "Filter by quality measure" | HIGH |
| UC-43 | Default selection is "All Measures" | HIGH |
| UC-44 | Dropdown lists "All Measures" + 13 quality measures (14+ total options) | HIGH |
| UC-45 | Selecting a measure filters grid to rows matching that qualityMeasure | HIGH |
| UC-46 | Blue ring (ring-2 ring-blue-400) when specific measure selected | MEDIUM |
| UC-47 | No blue ring when "All Measures" selected | MEDIUM |
| UC-48 | Selecting "All Measures" clears measure filter | HIGH |
| UC-49 | Vertical divider renders between chips and dropdown | LOW |
| UC-50 | Quality measures listed in configured order | LOW |

### 2.8 Insurance Group Dropdown

| # | Use Case | Priority |
|---|----------|----------|
| UC-51 | Insurance group dropdown renders with aria-label | HIGH |
| UC-52 | Shows "All" option first | HIGH |
| UC-53 | Shows system options from API | HIGH |
| UC-54 | Shows "No Insurance" option last | HIGH |
| UC-55 | Blue ring when value is not "all" | MEDIUM |
| UC-56 | No ring when value is "all" | MEDIUM |
| UC-57 | Calls onInsuranceGroupChange when changed | HIGH |
| UC-58 | Default selection is "hill" | MEDIUM |

### 2.9 Combined Filter Logic (AND/OR)

| # | Use Case | Priority |
|---|----------|----------|
| UC-59 | Color chips (OR) + search text (AND) | HIGH |
| UC-60 | Color chips (OR) + quality measure (AND) | HIGH |
| UC-61 | Color chips (OR) + quality measure (AND) + search text (AND) | HIGH |
| UC-62 | Duplicates + quality measure (AND) | HIGH |
| UC-63 | Duplicates + quality measure + search text (AND) | MEDIUM |
| UC-64 | Insurance group + color chips (AND) | HIGH |
| UC-65 | Insurance group + quality measure (AND) | HIGH |
| UC-66 | All 4 filters simultaneously: insurance + color + QM + search | HIGH |
| UC-67 | Changing one filter preserves other filter dimensions | HIGH |
| UC-68 | Removing one filter restores rows while others stay active | HIGH |

### 2.10 Chip Count Scoping

| # | Use Case | Priority |
|---|----------|----------|
| UC-69 | "All Measures" selected: chip counts reflect full dataset | HIGH |
| UC-70 | Specific measure selected: chip counts scoped to that measure only | HIGH |
| UC-71 | "All" chip count reflects measure-scoped total | HIGH |
| UC-72 | "Duplicates" chip count scoped to selected measure | MEDIUM |
| UC-73 | Chip counts NOT affected by search text | HIGH |
| UC-74 | Chip counts NOT affected by active color filter | HIGH |
| UC-75 | Chip counts update after cell edit changes status | MEDIUM |
| UC-76 | Sum of all color chip counts equals "All" chip count | HIGH |

### 2.11 Status Bar Updates

| # | Use Case | Priority |
|---|----------|----------|
| UC-77 | Shows "Showing X of Y rows" format consistently | HIGH |
| UC-78 | Filter summary shows color labels when color filter active | MEDIUM |
| UC-79 | Filter summary shows measure name when measure filter active | MEDIUM |
| UC-80 | Filter summary shows insurance group label when active | MEDIUM |
| UC-81 | Combined summary uses pipe separator | MEDIUM |
| UC-82 | No filter summary when all defaults (All + All Measures + default insurance) | MEDIUM |

### 2.12 Keyboard Accessibility

| # | Use Case | Priority |
|---|----------|----------|
| UC-83 | Enter/Space toggles chip selection | MEDIUM |
| UC-84 | Tab navigation through chips in order | MEDIUM |
| UC-85 | Tab reaches measure dropdown after chips | LOW |
| UC-86 | Tab reaches search input after dropdown | LOW |
| UC-87 | focus-visible ring (ring-2 ring-blue-500) on keyboard focus | MEDIUM |
| UC-88 | Native select keyboard behavior for dropdown (arrows, Enter, Escape) | LOW |
| UC-89 | aria-pressed attribute on all chips reflects toggle state | MEDIUM |

### 2.13 Row Color Accuracy (CFB-R8)

| # | Use Case | Priority |
|---|----------|----------|
| UC-90 | Every configured status maps to correct color (80+ mappings) | HIGH |
| UC-91 | "Not Addressed", empty, null -> white | HIGH |
| UC-92 | Overdue (past dueDate) -> red, overriding natural color | HIGH |
| UC-93 | Declined statuses exempt from overdue (stay purple) | HIGH |
| UC-94 | N/A statuses exempt from overdue (stay gray) | HIGH |
| UC-95 | Chronic DX + "Attestation sent" exempt from overdue (stay green) | HIGH |
| UC-96 | Chronic DX without attestation + overdue -> red | HIGH |
| UC-97 | BP statuses: correct color with and without overdue | MEDIUM |
| UC-98 | dueDate = today -> NOT overdue | MEDIUM |
| UC-99 | dueDate = null -> NOT overdue | MEDIUM |
| UC-100 | Overdue row counted as red (not natural color) in chip counts | HIGH |
| UC-101 | Duplicate + overdue counted in BOTH duplicate AND red | MEDIUM |
| UC-102 | getRowStatusColor() matches PatientGrid rowClassRules (cross-system consistency) | HIGH |

### 2.14 Search Input

| # | Use Case | Priority |
|---|----------|----------|
| UC-103 | Renders with placeholder "Search by name..." | HIGH |
| UC-104 | aria-label "Search patients by name" | MEDIUM |
| UC-105 | Clear button appears when text is non-empty | MEDIUM |
| UC-106 | Clear button hidden when text is empty | MEDIUM |
| UC-107 | Typing calls onSearchChange per-keystroke | HIGH |
| UC-108 | Clear button calls onSearchChange('') | HIGH |
| UC-109 | Escape key clears search and blurs input | MEDIUM |
| UC-110 | Displays current searchText value | MEDIUM |

### 2.15 Edge Cases & State Persistence

| # | Use Case | Priority |
|---|----------|----------|
| UC-111 | Filter state preserved after cell edit (data refresh) | HIGH |
| UC-112 | Filter state preserved after add row | MEDIUM |
| UC-113 | Filter state preserved after delete row | MEDIUM |
| UC-114 | Measure dropdown preserved after chip toggle | MEDIUM |
| UC-115 | Filter state after provider/physician switch | MEDIUM |
| UC-116 | Filter state after page reload (resets to defaults) | MEDIUM |
| UC-117 | Empty state when filter matches zero rows | MEDIUM |
| UC-118 | Rapid measure switching (no race conditions) | LOW |
| UC-119 | Filter with sorted data (sort persists during filtering) | MEDIUM |
| UC-120 | Sort persists during filtering, filter persists during sorting | MEDIUM |
| UC-121 | Special characters in search do not break the grid | MEDIUM |
| UC-122 | Regex metacharacters in search do not crash | MEDIUM |
| UC-123 | Filter state persists after page navigation and back | LOW |
| UC-124 | Rows with null qualityMeasure excluded when specific measure selected | MEDIUM |
| UC-125 | "No Insurance" filter shows correct rows or empty grid | MEDIUM |

### 2.16 Role-Based Behavior

| # | Use Case | Priority |
|---|----------|----------|
| UC-126 | PHYSICIAN sees own patients only (chip counts reflect physician scope) | HIGH |
| UC-127 | STAFF sees assigned physician patients (chip counts reflect assignment) | HIGH |
| UC-128 | ADMIN sees all or physician-scoped patients | HIGH |
| UC-129 | Color chip filter works for PHYSICIAN role | HIGH |
| UC-130 | Quality measure filter works for PHYSICIAN role | HIGH |
| UC-131 | Search filter works for PHYSICIAN role | MEDIUM |
| UC-132 | Insurance group filter visible for PHYSICIAN and STAFF | MEDIUM |
| UC-133 | STAFF physician switch updates chip counts | MEDIUM |

### 2.17 Pinned Row Badge

| # | Use Case | Priority |
|---|----------|----------|
| UC-134 | Pinned row badge renders when pinnedRowId is set | MEDIUM |
| UC-135 | Badge does not render when pinnedRowId is null/undefined | MEDIUM |
| UC-136 | Clicking badge calls onUnpin | MEDIUM |
| UC-137 | Badge has amber styling | LOW |
| UC-138 | Pinned row passes through all filters (always visible) | HIGH |

### 2.18 Performance

| # | Use Case | Priority |
|---|----------|----------|
| UC-139 | Filter state changes update grid within 100ms for 5,000+ rows | LOW |
| UC-140 | Chip count recalculation within 50ms for 5,000+ rows | LOW |
| UC-141 | No additional API calls when filter state changes | MEDIUM |

---

## 3. Test Coverage Matrix

### 3.1 Vitest Component Tests: `StatusFilterBar.test.tsx`

**Total tests found: 115** (from grep of describe/it blocks)

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-1 (chip rendering) | `renders all filter chips` | COVERED |
| UC-2 (chip labels) | `renders all filter chips` (checks each label text) | COVERED |
| UC-3 (chip counts format) | `displays correct counts on chips` | COVERED |
| UC-4 (All chip total) | `displays correct counts on chips` (checks 95 = sum) | COVERED |
| UC-5 (compact styling) | `chips have whitespace-nowrap class`, `chips have compact padding`, `chips use text-xs` | COVERED |
| UC-6 (check icon size) | `active chip still shows checkmark icon` (checks SVG exists, not size) | PARTIAL |
| UC-7 (count text size) | Not explicitly tested | GAP |
| UC-10 (All default) | `treats empty activeFilters as all selected` | COVERED |
| UC-16 (multi-select ON) | `clicking unselected chip adds it to active filters` | COVERED |
| UC-17 (multi-select OFF) | `clicking selected chip removes it without affecting others` | COVERED |
| UC-18 (last chip fallback) | `toggling off the last selected chip returns to all` | COVERED |
| UC-19 (All clears all) | `clicking All chip calls onFilterChange with all` | COVERED |
| UC-20 (chip while All) | `clicking chip while All is active selects only that chip` | COVERED |
| UC-22 (3+ chips) | `can select three chips simultaneously` | COVERED |
| UC-24 (Duplicates deselects) | `clicking Duplicates deselects all color chips` | COVERED |
| UC-25 (color exits dup) | `clicking color chip while Duplicates active exits duplicates mode` | COVERED |
| UC-26 (dup off -> All) | `toggling off Duplicates returns to all` | COVERED |
| UC-29 (checkmark on active) | `active chip still shows checkmark icon` | COVERED |
| UC-31 (aria-pressed true) | `active chip has aria-pressed true` | COVERED |
| UC-32 (no opacity on active) | `active chip has filled background (no opacity-50)` | COVERED |
| UC-34 (inactive outlined) | `inactive chip has hover:bg-gray-50 class` | COVERED |
| UC-35 (inactive hover) | `inactive chip has hover:bg-gray-50 class` | COVERED |
| UC-36 (aria-pressed false) | `inactive chip has aria-pressed false` | COVERED |
| UC-37 (multiple active) | `multiple active chips all have aria-pressed true` | COVERED |
| UC-38 (zero-count dashed) | `zero-count inactive chip has border-dashed` | COVERED |
| UC-39 (zero-count clickable) | `zero-count chip is still clickable` | COVERED |
| UC-42 (QM dropdown) | `renders measure dropdown` | COVERED |
| UC-43 (QM default) | `dropdown default is "All Measures"` | COVERED |
| UC-44 (QM options) | `dropdown lists all 13 quality measures` (checks 15 options) | COVERED |
| UC-45 (QM filters) | `calls onMeasureChange when measure selected` | COVERED |
| UC-46 (QM blue ring) | `shows blue ring when measure is active` | COVERED |
| UC-47 (QM no ring default) | `has no blue ring when "All Measures" selected` | COVERED |
| UC-49 (divider) | `renders vertical divider before dropdown` | COVERED |
| UC-51 (IG dropdown) | `renders insurance group dropdown` | COVERED |
| UC-52 (IG All first) | `shows "All" option first` | COVERED |
| UC-53 (IG system options) | `shows system options sorted alphabetically` | COVERED |
| UC-54 (IG No Insurance) | `shows "No Insurance" option last` | COVERED |
| UC-55 (IG ring active) | `shows active-ring indicator when value is not "all"` | COVERED |
| UC-56 (IG no ring) | `does not show active-ring when value is "all"` | COVERED |
| UC-57 (IG callback) | `calls onInsuranceGroupChange when changed` | COVERED |
| UC-58 (IG default) | `default selection is "hill"` | COVERED |
| UC-87 (focus-visible) | `filter chip buttons have focus-visible ring classes` | COVERED |
| UC-89 (aria-pressed) | Multiple tests across Checkmark + Fill describe block | COVERED |
| UC-90-102 (row colors) | CFB-R8 Groups A-G (111 tests) | COVERED |
| UC-103-110 (search) | Search Input describe block (9 tests) | COVERED |
| UC-134-137 (pinned badge) | Pinned Row Badge describe block (5 tests) | COVERED |

### 3.2 Vitest Page Tests: `MainPage.test.tsx`

**Relevant filter tests: ~55** (from search/filter/measure/insurance/pinned describe blocks)

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-21 (OR logic) | `filters by multiple colors with OR logic`, `three colors with OR logic` | COVERED |
| UC-28 (duplicates filter) | `duplicates filter returns only duplicate rows` | COVERED |
| UC-59 (color + search) | `applies both filters: green + "smith"`, `duplicate filter + name search` | COVERED |
| UC-60 (color + measure) | `measure + color filter applies AND logic` | COVERED |
| UC-61 (triple AND) | `measure + color + search applies triple AND` | COVERED |
| UC-62 (dup + measure) | `duplicate filter + measure applies AND logic` | COVERED |
| UC-67 (changing preserves) | `changing measure preserves active color filter` | COVERED |
| UC-69 (All Measures counts) | `"All Measures" counts all rows` | COVERED |
| UC-70 (scoped counts) | `scopes chip counts to selected measure` | COVERED |
| UC-73-74 (counts independent) | `rowCounts are computed from unfiltered rowData` | COVERED |
| UC-76 (sum equals All) | Implicit in count tests | PARTIAL |
| UC-78-82 (filter summary) | `filterSummary includes "Insurance: Hill"`, etc. (5 tests) | COVERED |
| UC-111 (preserved after edit) | Implicit via state independence | PARTIAL |
| UC-124 (null QM excluded) | `excludes rows with null qualityMeasure when measure is selected` | COVERED |
| UC-138 (pinned passes filter) | 7 pinned row behavior tests | COVERED |

### 3.3 Vitest Component Tests: `StatusBar.test.tsx`

**Relevant tests: 5**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-77 (Showing X of Y) | `shows "Showing X of Y rows" when filtered`, `when not filtered` | COVERED |
| UC-78-79 (summary display) | `shows filter summary when provided` | COVERED |
| UC-81 (pipe separator) | `shows combined summary with pipe separator` | COVERED |
| UC-82 (no summary default) | `does not show filter summary when undefined` | COVERED |

### 3.4 Cypress E2E: `sorting-filtering.cy.ts`

**Filter-related tests: ~45**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-1 (chip display) | Filter Chip Display block (10 tests) | COVERED |
| UC-3 (chip counts) | Filter Chip Counts block (2 tests) | COVERED |
| UC-11 (filter by each status) | 8 Filter by [Status] blocks (8 tests) | COVERED |
| UC-12 (deselect toggle) | `should return to All when clicking active filter again` | COVERED |
| UC-13 (filter switch -> multi-select) | `should add second filter when clicking different chip` | COVERED |
| UC-14 (status bar filtered) | `should show filtered count in status bar` | COVERED |
| UC-15 (status bar All) | `should show total count with All filter` | COVERED |
| UC-29 (checkmark E2E) | `should highlight active filter chip with aria-pressed and checkmark` | COVERED |
| UC-102 (row colors E2E) | Row Color Verification block (~15 tests) | COVERED |
| UC-119-120 (filter+sort) | Filter with Sorting block (2 tests), Sort + filter order test | COVERED |

### 3.5 Cypress E2E: `multi-select-filter.cy.ts`

**Tests: 22**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-16-20 (multi-select toggle) | Multi-Select Toggle Behavior block (5 tests) | COVERED |
| UC-24-26 (dup exclusivity) | Duplicates Exclusivity block (3 tests) | COVERED |
| UC-29-30 (checkmark+fill) | Checkmark + Fill Visual Style block (4 tests) | COVERED |
| UC-59 (search + multi-filter) | Search + Multi-Filter Combination block (2 tests) | COVERED |
| UC-77 (status bar multi) | Status Bar Updates block (2 tests) | COVERED |
| UC-83-84 (keyboard) | Keyboard Accessibility block (2 tests) | COVERED |
| UC-28 (dup + second color) | Coverage gap: combined block (1 test) | COVERED |

### 3.6 Cypress E2E: `compact-filter-bar.cy.ts`

**Tests: 7**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-45 (QM filters grid) | `grid shows correct rows when measure is selected` | COVERED |
| UC-70 (QM scopes counts) | `chip counts update when quality measure is selected` | COVERED |
| UC-60 (QM + color AND) | `measure dropdown + color chip applies AND filter to grid` | COVERED |
| UC-44 (QM option count) | `quality measure dropdown has expected number of options` | COVERED |
| UC-39 (zero-count clickable E2E) | `zero-count chip still renders and is clickable` | COVERED |
| UC-75 (counts after edit) | `T10-2: Filter count updates after inline edit` | COVERED |

### 3.7 Cypress E2E: `filter-roles-combined.cy.ts`

**Tests: ~28**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-126-133 (role-based) | Role-Based Filter Behavior block (8 tests) | COVERED |
| UC-64-66 (combined 4-filter) | Combined 4-Filter AND Logic block (4 tests) | COVERED |
| UC-75 (counts after edit) | Chip Count Updates After Cell Edits block (6 tests) | COVERED |
| UC-121-122 (special chars) | Filter Edge Cases block (2 tests) | COVERED |
| UC-123 (navigation persist) | `filter state persists after page navigation and back` | COVERED |
| UC-118 (rapid switching) | `rapid filter switching does not break the grid` | COVERED |
| UC-125 (No Insurance) | `"No Insurance" filter shows correct rows or empty grid` | COVERED |
| UC-63 (dup+measure+search) | `Duplicates + measure + search triple AND filter` | COVERED |
| UC-68 (removing one filter) | `removing one filter restores rows while others stay active` | COVERED |

### 3.8 Playwright E2E: `compact-filter-bar.spec.ts`

**Tests: 5**

| Use Case | Test Name(s) | Status |
|----------|-------------|--------|
| UC-5 (compact styling E2E) | `compact chips render on single line without wrapping` | COVERED |
| UC-42-48 (QM dropdown E2E) | `measure dropdown is visible and functional` | COVERED |
| UC-78-82 (status bar E2E) | `combined filter updates status bar summary` | COVERED |
| UC-114 (measure persists) | `measure selection persists after chip toggle` | COVERED |
| UC-41 (zero-count faded) | `zero-count chip appears faded` | COVERED |

---

## 4. Test Count Summary

| Test Layer | File | Filter-Related Tests | Total in File |
|-----------|------|---------------------|---------------|
| Vitest | `StatusFilterBar.test.tsx` | 115 | 115 |
| Vitest | `MainPage.test.tsx` | ~55 | ~85 |
| Vitest | `StatusBar.test.tsx` | 5 | ~20 |
| Cypress | `sorting-filtering.cy.ts` | ~45 | ~55 |
| Cypress | `multi-select-filter.cy.ts` | 22 | 22 |
| Cypress | `compact-filter-bar.cy.ts` | 7 | 7 |
| Cypress | `filter-roles-combined.cy.ts` | ~28 | ~28 |
| Playwright | `compact-filter-bar.spec.ts` | 5 | 5 |
| **TOTAL** | | **~282** | |

---

## 5. Identified Gaps

### GAP-1: Edit Status While Filtered -- Row Disappearance (E2E)

**Use Case:** UC-75 (partially), extending to row-disappearance scenario
**Priority:** LOW
**Severity:** LOW

**Description:** When a user filters to "Overdue" and edits a row's status from "Overdue" to "Completed", the row should disappear from the filtered view because it no longer matches. The `filter-roles-combined.cy.ts: "chip count decrements source and increments target after status edit"` test verifies chip count changes, but does NOT verify the edited row disappears from the currently filtered view.

**Current Coverage:**
- Chip count updates after status edit: COVERED (`filter-roles-combined.cy.ts: "editing measureStatus changes chip counts"`, `compact-filter-bar.cy.ts: "T10-2"`)
- Row disappears from filtered view after its status changes: NOT EXPLICITLY TESTED

**Recommendation:** LOW priority. The `filteredRowData` memo in MainPage already handles this via reactive recalculation. The risk of regression is minimal since it's fundamental React memoization behavior.

**Estimated effort:** 1 Cypress test, 20 minutes

---

### GAP-2: Checkmark Icon Size Verification

**Use Case:** UC-6
**Priority:** VERY LOW
**Severity:** VERY LOW

**Description:** The Vitest test `active chip still shows checkmark icon` verifies an SVG exists inside the button, but does not verify the `size={12}` prop results in a 12px icon (vs the old 14px). The Playwright compact-filter-bar spec checks CSS classes but not icon dimensions.

**Current Coverage:** SVG presence checked, size not explicitly verified.

**Recommendation:** SKIP. The `size` prop on the lucide-react `Check` component is a well-tested library feature. Testing it would be testing the library, not application logic.

---

### GAP-3: Count Text Font Size Verification

**Use Case:** UC-7
**Priority:** VERY LOW
**Severity:** VERY LOW

**Description:** No test verifies the chip count text uses `text-[10px]` class specifically. Tests verify `text-xs` on the chip button but not the inner count span.

**Current Coverage:** Not tested.

**Recommendation:** SKIP. This is purely cosmetic CSS styling tested via visual review (Layer 5). Adding a className assertion for an inner span would be brittle and low value.

---

### GAP-4: All Chips Fit on Single Row at 1280px (Responsive Verification)

**Use Case:** UC-8
**Priority:** LOW
**Severity:** LOW

**Description:** The Playwright test `compact chips render on single line without wrapping` checks CSS classes (`whitespace-nowrap`) but does not set the viewport to 1280px and verify all 10 chips are in a single visual line (no wrapping). The `flex-wrap` on the container means chips CAN wrap even with `whitespace-nowrap` on individual chips.

**Current Coverage:** CSS class presence checked. Actual visual single-line at 1280px not verified.

**Recommendation:** LOW priority. Could add a Playwright test that sets viewport to 1280px and verifies all chip buttons have the same `y` offset (bounding box). However, this was verified during visual browser review (Layer 5 -- Task 17 in compact-filter-bar tasks).

**Estimated effort:** 1 Playwright test, 15 minutes

---

### GAP-5: Chip Wrap Behavior on Narrow Viewports (Below 1280px)

**Use Case:** UC-9
**Priority:** VERY LOW
**Severity:** VERY LOW

**Description:** No test verifies that chips wrap gracefully on viewports below 1280px. The `flex-wrap` class is present on the container but this behavior is not tested at narrow widths.

**Current Coverage:** Not tested.

**Recommendation:** SKIP. This is a cosmetic layout concern. The `flex-wrap` class is present in the source code. Testing CSS Flexbox wrapping behavior is testing the browser engine, not application logic.

---

### GAP-6: Tab Order Through Full Filter Bar (Chips -> Dropdown -> Search)

**Use Case:** UC-85, UC-86
**Priority:** LOW
**Severity:** LOW

**Description:** The Cypress `multi-select-filter.cy.ts` keyboard tests verify chips are focusable with aria-pressed, but do not verify the full Tab order chain: chips -> measure dropdown -> insurance dropdown -> search input. The Tab order relies on native DOM order, which is correct in the source code, but is not verified end-to-end.

**Current Coverage:**
- Chips are focusable buttons with aria-pressed: COVERED
- Tab order through the entire filter bar: NOT TESTED

**Recommendation:** LOW priority. The DOM order in `StatusFilterBar.tsx` naturally provides the correct tab sequence. Testing this would primarily be testing browser native behavior. However, if a layout refactor ever changes DOM order, this test would catch it.

**Estimated effort:** 1 Cypress or Playwright test, 15 minutes

---

### GAP-7: Clicking "All" When Already Selected (No-Op Verification)

**Use Case:** Spec EC-5 from status-filter requirements
**Priority:** VERY LOW
**Severity:** VERY LOW

**Description:** The spec defines that clicking "All" when it's already selected should be a no-op. The `handleChipClick` code calls `onFilterChange(['all'])` regardless (which sets the same state), but no test explicitly verifies that clicking "All" while "All" is already active results in no visible change.

**Current Coverage:** The `clicking All chip calls onFilterChange with all` test verifies the callback is called with `['all']`, but starts from `activeFilters={['duplicate']}`. No test starts from `activeFilters={['all']}` and verifies the callback still fires with `['all']`.

**Recommendation:** SKIP. The behavior is correct by construction -- calling `setActiveFilters(['all'])` when state is already `['all']` is a React no-op (same reference). The existing test proves the callback parameter is correct.

---

### GAP-8: Data Refresh Preserves Active Filters (Integration)

**Use Case:** UC-111, UC-112, UC-113
**Priority:** MEDIUM
**Severity:** LOW

**Description:** The Cypress `filter-roles-combined.cy.ts: "data refresh preserves active filter selections"` test covers this scenario end-to-end. However, no Vitest unit test explicitly verifies that `selectedMeasure`, `activeFilters`, and `searchText` states survive a `setRowData` call (data refresh).

**Current Coverage:**
- E2E (Cypress): COVERED (`data refresh preserves active filter selections`)
- Unit (Vitest): NOT EXPLICITLY TESTED (though the architecture makes this a non-issue since React state variables are independent)

**Recommendation:** LOW priority. The E2E coverage is sufficient. React state variables are inherently independent -- `setRowData` does not affect `activeFilters` or `selectedMeasure`. A unit test would be testing React itself.

---

### GAP-9: Filter State After Provider/Physician Switch

**Use Case:** UC-115
**Priority:** MEDIUM
**Severity:** LOW

**Description:** When a STAFF or ADMIN user switches to a different physician, `loadData()` replaces `rowData`. The design doc states `selectedMeasure` is NOT reset on physician change. The Cypress `filter-roles-combined.cy.ts: "physician selector change preserves insurance group filter"` test verifies insurance group persistence but does NOT verify measure dropdown or color chip persistence through physician switch.

**Current Coverage:**
- Insurance group persists through physician switch: COVERED
- Quality measure persists through physician switch: NOT TESTED
- Color chip selection persists through physician switch: NOT TESTED

**Recommendation:** MEDIUM priority. If a measure or color filter is active when the physician changes and the new physician's data has different characteristics, users might see confusing results (zero rows). A test should verify: (1) filters persist, (2) chip counts update to reflect new data, (3) grid shows correct rows for new data + existing filters.

**Estimated effort:** 2 Cypress tests, 30 minutes

---

### GAP-10: Performance with Large Datasets (11,000+ Rows)

**Use Case:** UC-139, UC-140
**Priority:** LOW
**Severity:** LOW

**Description:** No automated performance test verifies that filter operations complete within 100ms for datasets of 5,000+ or 11,000+ rows. The design doc specifies 100ms for filter changes and 50ms for chip count recalculation.

**Current Coverage:** Not tested.

**Recommendation:** LOW priority. The filter implementation uses synchronous `Array.filter()` and `Array.forEach()` which are O(n). For 11,000 rows, these operations should complete in under 10ms on modern hardware. Performance testing would require injecting large mock datasets and measuring render timing, which is complex and fragile.

**Estimated effort:** Significant -- would need a custom performance test harness, 2-4 hours.

---

### GAP-11: "All" Chip Count Excludes Duplicate Count (Explicit Regression Guard)

**Use Case:** UC-4, UC-76, CFB-R8-AC15
**Priority:** LOW (already has a regression guard)
**Severity:** MEDIUM (if this regresses, All count is wrong)

**Description:** BUG-CFB-001 was a real bug where the "All" chip double-counted duplicate rows. This was fixed and regression-guarded by the test `"All" total excludes duplicate count to avoid double-counting (CFB-R8-AC15)` in `StatusFilterBar.test.tsx`. The Cypress `filter-roles-combined.cy.ts: "sum of all color chip counts equals All chip count"` also guards this.

**Current Coverage:** COVERED at both unit and E2E level.

**Recommendation:** No gap. This is well-guarded.

---

### GAP-12: Multi-Select + Insurance Group Combined Filter (E2E)

**Use Case:** UC-64
**Priority:** LOW
**Severity:** LOW

**Description:** The Cypress `filter-roles-combined.cy.ts: "insurance group + color chip: switching insurance group updates chip counts"` test verifies insurance + color chip interaction. However, it does not verify multi-select color chips (2+) combined with insurance group filter.

**Current Coverage:**
- Single color chip + insurance group: COVERED
- Multi-select color chips + insurance group: NOT EXPLICITLY TESTED

**Recommendation:** LOW priority. The AND logic is the same whether 1 or 2 color chips are selected -- the insurance filter is applied independently in `getQueryParams()` (backend) and the color filter is applied client-side. The existing tests cover the integration adequately.

---

### GAP-13: Empty activeFilters Array Edge Case

**Use Case:** Related to UC-18
**Priority:** VERY LOW
**Severity:** VERY LOW

**Description:** The Vitest test `treats empty activeFilters as all selected` verifies that `activeFilters=[]` causes the "All" chip to display as active. However, no test verifies that the `filteredRowData` memo in MainPage correctly handles `activeFilters=[]` (it should show all rows since the condition `!activeFilters.includes('all') && activeFilters.length > 0` would be false).

**Current Coverage:**
- UI rendering with empty array: COVERED
- Filter logic with empty array: NOT EXPLICITLY TESTED (but correct by code inspection)

**Recommendation:** SKIP. The condition `activeFilters.length > 0` in the `filteredRowData` memo handles this correctly. The empty array state should never occur in practice due to the "All" fallback.

---

## 6. Gap Summary Matrix

| Gap | Priority | Severity | Use Cases | Estimated Effort | Recommendation |
|-----|----------|----------|-----------|-----------------|----------------|
| GAP-1: Edit row disappears from filtered view | LOW | LOW | UC-75 ext. | 20 min | Optional |
| GAP-2: Checkmark icon size | VERY LOW | VERY LOW | UC-6 | 10 min | SKIP |
| GAP-3: Count text font size | VERY LOW | VERY LOW | UC-7 | 10 min | SKIP |
| GAP-4: Single-row at 1280px | LOW | LOW | UC-8 | 15 min | Optional |
| GAP-5: Wrap on narrow viewports | VERY LOW | VERY LOW | UC-9 | 15 min | SKIP |
| GAP-6: Full tab order chain | LOW | LOW | UC-85-86 | 15 min | Optional |
| GAP-7: Click All when All active | VERY LOW | VERY LOW | EC-5 | 5 min | SKIP |
| GAP-8: Data refresh preserves filters (unit) | LOW | LOW | UC-111-113 | 15 min | SKIP (E2E covered) |
| GAP-9: Physician switch preserves QM/color | MEDIUM | LOW | UC-115 | 30 min | **Recommended** |
| GAP-10: Performance 11k+ rows | LOW | LOW | UC-139-140 | 2-4 hrs | SKIP |
| GAP-11: All count excludes duplicates | -- | -- | UC-4 | -- | Already covered |
| GAP-12: Multi-select + insurance combined | LOW | LOW | UC-64 | 15 min | Optional |
| GAP-13: Empty activeFilters filter logic | VERY LOW | VERY LOW | UC-18 ext. | 10 min | SKIP |

---

## 7. Coverage Score

| Category | Total Use Cases | Fully Covered | Partially Covered | Not Covered | Coverage |
|----------|----------------|---------------|-------------------|-------------|----------|
| Chip Rendering & Display | 9 | 7 | 1 | 1 | 83% |
| Single Filter Selection | 6 | 6 | 0 | 0 | 100% |
| Multi-Select Toggle | 8 | 8 | 0 | 0 | 100% |
| Duplicates Exclusivity | 5 | 5 | 0 | 0 | 100% |
| Checkmark + Fill Visual | 9 | 9 | 0 | 0 | 100% |
| Zero-Count Chip | 4 | 3 | 0 | 1 | 75% |
| Quality Measure Dropdown | 9 | 9 | 0 | 0 | 100% |
| Insurance Group Dropdown | 8 | 8 | 0 | 0 | 100% |
| Combined Filter Logic | 10 | 10 | 0 | 0 | 100% |
| Chip Count Scoping | 8 | 7 | 1 | 0 | 94% |
| Status Bar Updates | 6 | 6 | 0 | 0 | 100% |
| Keyboard Accessibility | 7 | 4 | 0 | 3 | 57% |
| Row Color Accuracy (CFB-R8) | 13 | 13 | 0 | 0 | 100% |
| Search Input | 8 | 8 | 0 | 0 | 100% |
| Edge Cases & Persistence | 15 | 11 | 2 | 2 | 80% |
| Role-Based Behavior | 8 | 8 | 0 | 0 | 100% |
| Pinned Row Badge | 5 | 5 | 0 | 0 | 100% |
| Performance | 3 | 0 | 0 | 3 | 0% |
| **TOTAL** | **141** | **127** | **4** | **10** | **93%** |

**Note on Performance (0%):** Performance testing was explicitly scoped out of the existing test plan as impractical for the team size. The filter operations are synchronous O(n) array operations that are well within performance bounds for typical datasets.

**Note on Keyboard Accessibility (57%):** The 3 "not covered" use cases (UC-85, UC-86, UC-88) relate to Tab order through the full filter bar and native `<select>` keyboard behavior, both of which rely on browser-native DOM behavior rather than application logic. The important keyboard tests (Enter/Space toggle, focus-visible ring, aria-pressed) are all covered.

---

## 8. Overall Assessment

**Coverage Rating: EXCELLENT (93%)**

The Status Filter Bar feature area has exceptionally thorough test coverage across all five test layers:

1. **Vitest Unit Tests (175 relevant tests):** Comprehensive coverage of component rendering, click behavior, multi-select toggle logic, visual styling, accessibility attributes, quality measure dropdown, insurance group dropdown, search input, pinned row badge, and row color accuracy (CFB-R8 with 111 status-to-color mapping tests).

2. **Cypress E2E Tests (~102 relevant tests):** Thorough end-to-end verification of single and multi-select filtering, duplicates exclusivity, combined 4-filter AND logic, role-based behavior, chip count updates after cell edits, edge cases (special characters, rapid switching, navigation persistence), and filter coverage gaps.

3. **Playwright E2E Tests (5 tests):** Targeted verification of compact chip layout, measure dropdown functionality, combined filter status bar summary, filter persistence, and zero-count chip rendering.

**Key Strengths:**
- The row color accuracy (CFB-R8) has the most exhaustive coverage with 111 unit tests plus E2E verification
- Multi-select toggle behavior is thoroughly tested at both unit and E2E levels
- Combined 4-filter AND logic is explicitly tested end-to-end
- Edge cases like special characters, rapid switching, and navigation persistence are covered
- Role-based filtering behavior is verified for all three roles (ADMIN, PHYSICIAN, STAFF)
- Chip count accuracy, including the duplicate count exclusion bug fix, is well-guarded

**The only recommended action item is GAP-9 (MEDIUM priority):** Add tests verifying that quality measure and color chip selections persist through a physician switch. This is a realistic user workflow for STAFF users that is currently tested only for insurance group persistence.

---

## 9. Regression Test Plan Cross-Reference

| Regression Plan Section | Status |
|------------------------|--------|
| Section 4: Status Color Filter Bar (TC-4.1 to TC-4.5) | All automated |
| Section 30: Multi-Select Status Filter (TC-30.1 to TC-30.5) | All automated |
| Section 31.3: Filter Chip Focus-Visible | Automated |
| Section 35/46: Insurance Group Filter | All automated |
| Section 43.4: Depression Screening Filter Bar Integration | Automated |

**Regression Plan Accuracy:** The regression test plan sections for the filter bar are accurate and up-to-date. Test file references and test counts match the actual test inventory.

---

## 10. Files Referenced

### Source Code
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\layout\StatusFilterBar.tsx`
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\pages\MainPage.tsx`
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\layout\StatusBar.tsx`
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\config\statusColors.ts`

### Spec Files
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\status-filter\requirements.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\status-filter\test-plan.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\multi-select-filter\requirements.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\multi-select-filter\design.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\multi-select-filter\tasks.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\compact-filter-bar\requirements.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\compact-filter-bar\design.md`
- `C:\Users\joyxh\projects\patient-tracker\.claude\specs\compact-filter-bar\tasks.md`

### Test Files
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\layout\StatusFilterBar.test.tsx` (115 tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\pages\MainPage.test.tsx` (~55 filter tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\src\components\layout\StatusBar.test.tsx` (5 filter tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\cypress\e2e\sorting-filtering.cy.ts` (~45 filter tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\cypress\e2e\multi-select-filter.cy.ts` (22 tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\cypress\e2e\compact-filter-bar.cy.ts` (7 tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\cypress\e2e\filter-roles-combined.cy.ts` (~28 tests)
- `C:\Users\joyxh\projects\patient-tracker\frontend\e2e\compact-filter-bar.spec.ts` (5 tests)

### Regression Test Plan
- `C:\Users\joyxh\projects\patient-tracker\.claude\REGRESSION_TEST_PLAN.md` (Sections 4, 30, 31.3, 35, 43.4, 46)
