# Requirements Document: Module 7 — Filtering & Search Comprehensive Test Plan

## Introduction

This specification consolidates all testable behaviors from five existing feature specs -- status-filter, multi-select-filter, compact-filter-bar, patient-name-search, and insurance-group -- into a unified, comprehensive test plan for Module 7: Filtering & Search. The goal is to map every testable behavior to acceptance criteria, identify coverage gaps versus current automated tests, and propose new test cases to fill those gaps. This is a test-only module; no production code changes are required.

### Current Test Inventory (Module 7 scope)

| Layer | File | Test Count | Coverage Area |
|-------|------|-----------|---------------|
| Vitest | `StatusFilterBar.test.tsx` | 115 | Chip rendering, multi-select toggle, checkmark/fill style, search input, QM dropdown, insurance dropdown, zero-count chips, compact styling, pinned row badge, `getRowStatusColor` mappings, CFB-R8 accuracy groups A-G |
| Vitest | `StatusBar.test.tsx` | 18 | Row count display, filter summary, connection status, presence indicator |
| Vitest | `MainPage.test.tsx` | 68 | `filterRows` logic (name search, status filter, multi-select OR, QM filter, combined AND, pinned row bypass, measure-scoped rowCounts, insurance group API/query/summary) |
| Cypress | `multi-select-filter.cy.ts` | 19 | Multi-select toggle, Duplicates exclusivity, checkmark style, search+multi-filter, status bar, keyboard a11y |
| Cypress | `patient-name-search.cy.ts` | 21 | Search UI, filtering behavior, clear, filter combo AND logic, status bar count, keyboard shortcuts |
| Cypress | `insurance-group-filter.cy.ts` | 13 | Dropdown rendering, visual indicators, filtering behavior, persistence/interaction |
| Cypress | `compact-filter-bar.cy.ts` | 4 | Grid row filtering by measure, chip count update, measure+color AND |
| Cypress | `sorting-filtering.cy.ts` | 63 | Status filter bar chips (display, counts, per-color filter, toggle, sort+filter, status bar) |
| Playwright | `compact-filter-bar.spec.ts` | 5 | Compact chip styling, measure dropdown, combined filtering |
| **TOTAL** | | **~326** | |

### Source Specifications

- `.claude/specs/status-filter/requirements.md` (AC-1 through AC-8, EC-1 through EC-5)
- `.claude/specs/multi-select-filter/requirements.md` (AC-1.1 through AC-5.3)
- `.claude/specs/compact-filter-bar/requirements.md` (CFB-R1 through CFB-R8)
- `.claude/specs/patient-name-search/requirements.md` (Req-1 through Req-5)
- `.claude/specs/insurance-group/requirements.md` (REQ-IG-1 through REQ-IG-8)

### Key Implementation Files

| Component | File | Role |
|-----------|------|------|
| StatusFilterBar | `frontend/src/components/layout/StatusFilterBar.tsx` | Color chips, QM dropdown, insurance group dropdown, search input |
| MainPage | `frontend/src/pages/MainPage.tsx` | Filter state (useState), filteredRowData (useMemo), rowCounts (useMemo), filterSummary (useMemo), API query params with insuranceGroup |
| StatusBar | `frontend/src/components/layout/StatusBar.tsx` | "Showing X of Y rows" + filter summary display |
| statusColors | `frontend/src/config/statusColors.ts` | `getRowStatusColor()`, color arrays, overdue logic |
| dropdownConfig | `frontend/src/config/dropdownConfig.ts` | `QUALITY_MEASURE_TO_STATUS`, measure options |

## Alignment with Product Vision

This test plan directly supports the product vision by ensuring the correctness of the filtering and search subsystem -- the primary mechanism for clinical staff to focus on specific patient subsets across the quality measure tracking grid. The filter bar provides "real-time compliance visibility" (product.md success metric) by allowing users to quickly isolate patients by status color, insurance group, quality measure, and name. Gaps in test coverage here represent risks to the core workflow where physicians and staff triage their patient lists daily.

---

## Requirements

### REQ-M7-1: Status Color Filter (Multi-Select Toggle)

**User Story:** As a QA engineer, I want every aspect of the status color chip filter verified -- rendering, multi-select toggle ON/OFF, Duplicates exclusivity, All reset, visual styling, aria attributes, and count badges -- so that no filter interaction regression can go undetected.

#### Acceptance Criteria

1. **AC-M7-1.1:** WHEN the filter bar renders, THEN 10 chips SHALL appear in this order: All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A.
2. **AC-M7-1.2:** WHEN any chip is rendered, THEN it SHALL display the status label and a count in parentheses in format "Label (X)".
3. **AC-M7-1.3:** WHEN the page loads, THEN the "All" chip SHALL be active (aria-pressed="true") and all other chips SHALL be inactive (aria-pressed="false").
4. **AC-M7-1.4:** WHEN user clicks an unselected status chip, THEN it SHALL be added to the active filters (toggled ON) without deselecting other active chips (multi-select OR logic).
5. **AC-M7-1.5:** WHEN user clicks an already-selected status chip, THEN it SHALL be removed from the active filters (toggled OFF) without affecting other active chips.
6. **AC-M7-1.6:** WHEN the last individual status color chip is toggled OFF (and Duplicates is not active), THEN the "All" chip SHALL automatically become active (preventing zero-selection state).
7. **AC-M7-1.7:** WHEN user clicks the "All" chip, THEN all individual filter selections SHALL be cleared and "All" SHALL become the only active filter.
8. **AC-M7-1.8:** WHEN "All" is active and user clicks any individual chip, THEN "All" SHALL be deselected and only the clicked chip SHALL become active.
9. **AC-M7-1.9:** WHEN user selects the "Duplicates" chip, THEN all status color chips SHALL be deselected and only duplicates SHALL be shown (exclusive mode).
10. **AC-M7-1.10:** WHEN user selects any status color chip while Duplicates is active, THEN Duplicates SHALL be deselected and the color filter SHALL become active.
11. **AC-M7-1.11:** WHEN Duplicates is toggled OFF, THEN the filter SHALL return to "All" (fallback).
12. **AC-M7-1.12:** WHEN multiple chips are active, THEN the grid SHALL show all rows matching ANY of the selected status colors (OR logic between chips).
13. **AC-M7-1.13:** WHEN a chip is selected, THEN it SHALL display with a filled background, the status color identity, and a checkmark (Check) icon as leading element.
14. **AC-M7-1.14:** WHEN a chip is unselected, THEN it SHALL display with a white background, bordered style, and no checkmark.
15. **AC-M7-1.15:** WHEN a chip has focus and user presses Enter or Space, THEN the chip SHALL toggle its selected state (keyboard accessibility).
16. **AC-M7-1.16:** WHEN navigating with Tab key, THEN focus SHALL move through chips in order.
17. **AC-M7-1.17:** WHEN a chip's toggle state changes, THEN its `aria-pressed` attribute SHALL be updated to reflect the current state ("true" when selected, "false" when not).

#### Coverage Gap Analysis (REQ-M7-1)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-1.1 | Combined multi-select + Duplicates exclusivity sequence not tested as a single E2E flow | Cypress tests Duplicates exclusivity and multi-select separately; no combined toggle sequence | Add Cypress test: select 2 color chips, then Duplicates (verify colors deselected), then color chip (verify Duplicates deselected), then toggle off last chip (verify All) |
| GAP-1.2 | Rapid chip clicking (multiple toggle events in quick succession) not tested | No test at any layer | Add Cypress test: click 5 chips rapidly, verify final state is correct without UI flicker |
| GAP-1.3 | Multi-select chip state after grid data changes (row added/deleted/edited) not tested | Only tested at Vitest mock level for static data | Add Cypress test: select 2 color filters, add a new row, verify filter selection preserved and counts update |

---

### REQ-M7-2: Chip Count Badges and Accuracy

**User Story:** As a QA engineer, I want chip count badges verified for accuracy across all filter dimensions (unfiltered, measure-scoped, after data changes), so that users can trust the count numbers displayed on each chip.

#### Acceptance Criteria

1. **AC-M7-2.1:** WHEN "All Measures" is selected, THEN each chip count SHALL reflect the total number of rows for that status color from the full dataset.
2. **AC-M7-2.2:** WHEN a specific quality measure is selected, THEN each chip count SHALL be recalculated to reflect only rows matching that measure.
3. **AC-M7-2.3:** WHEN a specific quality measure is selected, THEN the "All" chip count SHALL show the total number of rows for that measure (not the overall total).
4. **AC-M7-2.4:** WHEN name search text is active alongside filters, THEN chip counts SHALL NOT be affected by the search text (counts reflect the measure-scoped dataset, not the search-filtered dataset).
5. **AC-M7-2.5:** WHEN a row's status is edited causing its color to change, THEN chip counts SHALL update immediately to reflect the change.
6. **AC-M7-2.6:** WHEN a row is overdue (displays as red), THEN the chip count logic SHALL count that row under the "red" chip, NOT under its "natural" status color.
7. **AC-M7-2.7:** WHEN a row is both a duplicate AND overdue, THEN the chip count logic SHALL count that row under BOTH the "duplicate" chip AND the "red" chip.
8. **AC-M7-2.8:** WHEN the "All" chip displays a total count, THEN that count SHALL equal the sum of all status color counts (white + yellow + blue + green + purple + orange + gray + red), excluding the duplicate count to avoid double-counting.
9. **AC-M7-2.9:** WHEN a chip has a count of zero (because no rows have that status in the current measure scope), THEN the chip SHALL display with a dashed border style but SHALL remain clickable.
10. **AC-M7-2.10:** WHEN a zero-count chip is clicked, THEN it SHALL become selected (with active styling) and the grid SHALL show zero rows.

#### Coverage Gap Analysis (REQ-M7-2)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-2.1 | Chip counts accuracy when multiple filters are active simultaneously (color + measure) not tested E2E | Vitest tests `computeRowCounts` at mock level; Cypress `compact-filter-bar.cy.ts` has 1 chip-count test with measure | Add Cypress test: select specific measure, verify each chip count matches visible rows; select different measure, verify counts change |
| GAP-2.2 | Chip counts after row edit (status change) not tested E2E | Not automated at E2E layer | Add Cypress test: note chip counts, edit a row's status to change its color, verify source chip count decremented and target chip count incremented |
| GAP-2.3 | Chip counts after add/delete row not tested E2E | Not automated at E2E layer | Add Cypress test: note chip counts, add a new row, verify "Not Addressed" (white) chip increments; delete row, verify count decrements |
| GAP-2.4 | Zero-count chip behavior at E2E layer not tested | Only tested at Vitest (dashed border assertion); no Cypress test | Add Cypress test: select a measure where a specific color has zero rows, verify chip shows (0), click it, verify empty grid state |

---

### REQ-M7-3: Insurance Group Filter

**User Story:** As a QA engineer, I want the insurance group dropdown filter verified for rendering, default value, server-side filtering, visual indicators, and interaction with other filters, so that per-group filtering works correctly across all scenarios.

#### Acceptance Criteria

1. **AC-M7-3.1:** WHEN the filter bar renders, THEN an insurance group dropdown SHALL appear after the Quality Measure dropdown, with `aria-label="Filter by insurance group"`.
2. **AC-M7-3.2:** WHEN the dropdown is rendered, THEN options SHALL be in order: "All" first, then system names from `GET /api/import/systems` sorted alphabetically, then "No Insurance" last.
3. **AC-M7-3.3:** WHEN any authenticated user (ADMIN, PHYSICIAN, STAFF) loads the page, THEN the insurance group dropdown SHALL default to "Hill" (value `hill`).
4. **AC-M7-3.4:** WHEN the user selects a specific insurance group, THEN the system SHALL pass `insuranceGroup` as a query parameter to `GET /api/data` (server-side filtering).
5. **AC-M7-3.5:** WHEN the user selects "No Insurance", THEN the system SHALL pass `insuranceGroup=none` to `GET /api/data`.
6. **AC-M7-3.6:** WHEN the user selects "All", THEN the system SHALL omit the `insuranceGroup` query parameter (no filtering).
7. **AC-M7-3.7:** WHEN the insurance group filter is active (not "All"), THEN the dropdown SHALL have a blue ring/border highlight indicator.
8. **AC-M7-3.8:** WHEN the insurance group filter is "All", THEN the dropdown SHALL NOT have the blue ring highlight.
9. **AC-M7-3.9:** WHEN the insurance group filter changes, THEN status color chip counts SHALL update to reflect the newly fetched data.
10. **AC-M7-3.10:** WHEN the `GET /api/import/systems` endpoint fails, THEN the dropdown SHALL fall back to hardcoded options: "All", "Hill", "No Insurance".
11. **AC-M7-3.11:** WHEN the insurance group filter is changed, THEN the active color chip selections, measure dropdown selection, and search text SHALL be preserved.

#### Coverage Gap Analysis (REQ-M7-3)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-3.1 | Insurance group + color filter + name search triple-AND combination not tested E2E | Cypress tests insurance+measure combo but not with color+search | Add Cypress test: set insurance to Hill, select Completed chip, type a name, verify grid shows only matching rows |
| GAP-3.2 | Insurance group filter with "No Insurance" E2E not deeply tested | Cypress checks row count changes; no verification of actual row content | Add Cypress test: select "No Insurance", verify grid shows rows with null insuranceGroup (or empty grid if none exist) |
| GAP-3.3 | Insurance group dropdown fallback on API failure not tested E2E | Only tested at Vitest level (MainPage.test.tsx) | Add Playwright test: intercept `/api/import/systems` with error, verify dropdown shows fallback options |
| GAP-3.4 | Chip counts update after insurance group change not tested E2E | Not automated | Add Cypress test: note chip counts with "Hill" selected, switch to "All", verify chip counts change to reflect larger dataset |

---

### REQ-M7-4: Patient Name Search

**User Story:** As a QA engineer, I want the patient name search input verified for rendering, real-time filtering, case-insensitivity, partial matching, multi-word matching, clear behavior, keyboard shortcuts, and interaction with other filters, so that name-based patient lookup works in all scenarios.

#### Acceptance Criteria

1. **AC-M7-4.1:** WHEN the main page loads, THEN a search input SHALL appear in the filter bar with placeholder text "Search by name..." and a search icon (magnifying glass) on the left side.
2. **AC-M7-4.2:** WHEN the search input is empty, THEN no name filtering SHALL be applied and the clear (X) button SHALL NOT be visible.
3. **AC-M7-4.3:** WHEN the user types in the search input, THEN the grid SHALL filter to show only rows whose `memberName` contains the search text (case-insensitive, substring match).
4. **AC-M7-4.4:** WHEN the search text contains multiple words (space-separated), THEN ALL words SHALL match independently against the memberName (each word must be present somewhere in the name).
5. **AC-M7-4.5:** WHEN the search text matches zero patients, THEN the grid SHALL show an empty state (zero rows).
6. **AC-M7-4.6:** WHEN the user clears the search text (via clear button or manual deletion), THEN all rows SHALL be restored (respecting active color/measure/insurance filters).
7. **AC-M7-4.7:** WHEN the search input has text, THEN a clear (X) button SHALL appear on the right side.
8. **AC-M7-4.8:** WHEN the user clicks the clear button, THEN search text SHALL be cleared and all rows restored.
9. **AC-M7-4.9:** WHEN the user presses Ctrl+F (or Cmd+F on Mac) while not editing a cell, THEN the search input SHALL receive focus.
10. **AC-M7-4.10:** WHEN the search input is focused and the user presses Escape, THEN the search text SHALL be cleared and the input SHALL lose focus.
11. **AC-M7-4.11:** WHEN both a name search and status color filter are active, THEN rows SHALL pass BOTH criteria (AND logic).
12. **AC-M7-4.12:** The search input SHALL have `aria-label="Search patients by name"` and the clear button SHALL have `aria-label="Clear search"`.

#### Coverage Gap Analysis (REQ-M7-4)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-4.1 | Multi-word search ("williams robert") matching "Williams, Robert" not tested E2E | Vitest tests multi-word; no Cypress test | Add Cypress test: type "williams robert", verify row "Williams, Robert" appears (and rows without both words are hidden) |
| GAP-4.2 | Ctrl+F intercepted during AG Grid cell editing not tested | Vitest tests Ctrl+F focus; no test for popup-editor guard | Add Cypress test: enter cell edit mode (double-click), press Ctrl+F, verify search input does NOT receive focus (cell editor stays active) |
| GAP-4.3 | Search with extra whitespace (leading, trailing, between words) not tested E2E | Vitest tests whitespace trimming; no Cypress test | Add Cypress test: type " smith  john " (with extra spaces), verify filtering works correctly |
| GAP-4.4 | Search text preserved when color filter changes not tested E2E | Only tested at Vitest level | Add Cypress test: type a search term, click a color chip, verify search input still shows the term and combined filtering applies |

---

### REQ-M7-5: Quality Measure Filter

**User Story:** As a QA engineer, I want the quality measure dropdown filter verified for rendering, option list completeness, filtering behavior, visual indicator, and interaction with other filters, so that measure-based filtering works correctly for all 13+ quality measures.

#### Acceptance Criteria

1. **AC-M7-5.1:** WHEN the filter bar renders, THEN a dropdown labeled via `aria-label="Filter by quality measure"` SHALL appear after the last color chip, separated by a vertical divider.
2. **AC-M7-5.2:** WHEN the dropdown is in its default state, THEN it SHALL display "All Measures".
3. **AC-M7-5.3:** WHEN the dropdown is clicked, THEN it SHALL display "All Measures" plus all 14 quality measures from `QUALITY_MEASURE_TO_STATUS` configuration (including Depression Screening), sorted alphabetically.
4. **AC-M7-5.4:** WHEN the user selects a specific quality measure, THEN the grid SHALL filter to show only rows where `qualityMeasure` matches the selected value.
5. **AC-M7-5.5:** WHEN a specific quality measure is selected, THEN the dropdown SHALL display a blue border highlight (ring-2 ring-blue-400).
6. **AC-M7-5.6:** WHEN "All Measures" is selected (default), THEN the dropdown SHALL NOT have the blue border highlight.
7. **AC-M7-5.7:** WHEN a specific quality measure is selected, THEN chip counts SHALL be scoped to only rows matching that measure (measure-scoped counts).
8. **AC-M7-5.8:** WHEN the user selects "All Measures", THEN the measure filter SHALL be cleared and all rows SHALL be shown (subject to other active filters).
9. **AC-M7-5.9:** WHEN a measure filter is active AND color chips are selected, THEN a row SHALL appear only if its quality measure matches AND its status color matches one of the selected chips (AND + OR logic).

#### Coverage Gap Analysis (REQ-M7-5)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-5.1 | All 14 quality measures individually tested as filter options E2E | Cypress compact-filter-bar tests 1 measure; no comprehensive per-measure test | Add Cypress test: iterate through each of the 14 measures, select it, verify grid shows only matching rows and count matches chip total |
| GAP-5.2 | Measure filter with Duplicates chip combination not tested E2E | Vitest tests measure+duplicate AND logic; no Cypress test | Add Cypress test: select Duplicates chip, then select a specific measure, verify only duplicate rows for that measure appear |
| GAP-5.3 | Measure dropdown option count validation not tested E2E | Only Vitest tests option count | Add Cypress test: open measure dropdown, count options, verify 15 total (All Measures + 14 measures) |

---

### REQ-M7-6: Combined Filter Scenarios (Color + Insurance + Search + QM)

**User Story:** As a QA engineer, I want the interaction between all four filter dimensions tested simultaneously, so that complex real-world filter combinations produce correct results with proper AND/OR logic.

#### Acceptance Criteria

1. **AC-M7-6.1:** WHEN multiple filter types are active (color chips, measure dropdown, insurance group, and/or name search), THEN the grid SHALL show only rows matching ALL active filters simultaneously: `(colorA OR colorB) AND measureMatch AND insuranceGroupMatch AND searchMatch`.
2. **AC-M7-6.2:** WHEN the user changes one filter dimension, THEN all other filter dimensions SHALL be preserved and the combined filter re-applied.
3. **AC-M7-6.3:** WHEN color chips use OR logic between selected chips, THEN the combined filter SHALL be: `(colorA OR colorB) AND measureMatch AND searchMatch` (insurance group is server-side, already applied to the fetched dataset).
4. **AC-M7-6.4:** WHEN Duplicates chip is selected AND a measure filter is active AND search text is entered, THEN the grid SHALL show only rows that are duplicates AND match the quality measure AND match the search text.
5. **AC-M7-6.5:** WHEN all four filters are active AND the result set is zero rows, THEN the grid SHALL display an empty state and the status bar SHALL show "Showing 0 of Y rows".
6. **AC-M7-6.6:** WHEN a color filter AND a measure filter are both active, THEN the status bar filter summary SHALL include both (e.g., "Color: In Progress | Measure: Diabetic Eye Exam").
7. **AC-M7-6.7:** WHEN insurance group, color, and measure filters are all active, THEN the filter summary SHALL include all three (e.g., "Insurance: Hill | Color: Completed | Measure: AWV").
8. **AC-M7-6.8:** WHEN "All" color, "All Measures", and "All" insurance are selected with empty search, THEN no filter summary SHALL be displayed.

#### Coverage Gap Analysis (REQ-M7-6)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-6.1 | Triple-AND combination (color + measure + search) not tested E2E | Cypress has color+search and measure+color E2E tests but not all three combined | Add Cypress test: select Completed chip, select a measure, type a name, verify only rows matching all three appear |
| GAP-6.2 | Quadruple combination (insurance + color + measure + search) not tested at any layer | Not automated | Add Cypress test: set insurance to Hill (default), select Overdue chip, select a measure, type a name, verify grid shows correct subset |
| GAP-6.3 | Filter summary text with all four dimensions active not tested E2E | Vitest tests filterSummary for insurance+color, insurance+measure; no E2E for all four | Add Cypress test: activate insurance filter (non-All), color filter, measure filter, verify status bar shows combined summary |
| GAP-6.4 | Empty result set from combined filters not tested E2E | Vitest tests empty result from search+filter; no Cypress test for combined empty | Add Cypress test: apply restrictive combination that yields zero rows, verify empty grid + "Showing 0 of Y rows" in status bar |
| GAP-6.5 | Filter dimension preservation when changing one filter not tested as E2E sequence | Vitest tests individual preservation; Cypress tests insurance+measure persistence; no full sequence | Add Cypress test: set measure, then color, then search, then change insurance, verify all three prior filters still active |

---

### REQ-M7-7: Filter State Management

**User Story:** As a QA engineer, I want filter state lifecycle verified -- initialization, no persistence across navigation, reset behavior, and state validity constraints -- so that filter state is always predictable and correct.

#### Acceptance Criteria

1. **AC-M7-7.1:** WHEN the user navigates to the main page, THEN the "All" chip SHALL be selected, "All Measures" SHALL be the dropdown default, search input SHALL be empty, and insurance group SHALL default to "Hill".
2. **AC-M7-7.2:** WHEN the user navigates away from the main page and returns, THEN all filter state SHALL be reset to defaults (no persistence).
3. **AC-M7-7.3:** WHEN the user changes the physician selector in the header, THEN the insurance group filter SHALL be preserved (the two filters are independent).
4. **AC-M7-7.4:** WHEN the user changes the insurance group filter, THEN a new data fetch SHALL be triggered from the server (insuranceGroup query parameter changes).
5. **AC-M7-7.5:** WHEN data is refreshed (cell edit, add row, delete row, socket-based refresh), THEN the active filter selections (color chips, measure dropdown, search text) SHALL be preserved and re-applied to the updated dataset.
6. **AC-M7-7.6:** WHEN the user has a pinned row (from add/duplicate) AND changes any filter, THEN the pinned row badge SHALL be cleared (pinnedRowId set to null).
7. **AC-M7-7.7:** WHEN a pinned row exists, THEN it SHALL pass through ALL filter dimensions (color, measure, search) regardless of whether it matches the active filters, until the pin is cleared.

#### Coverage Gap Analysis (REQ-M7-7)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-7.1 | Filter state reset on navigation (away and back) not tested E2E | Not automated at any layer | Add Playwright test: set various filters, navigate to import page, navigate back to main page, verify all filters reset to defaults |
| GAP-7.2 | Physician selector change preserves insurance group filter not tested E2E | Vitest tests query param independence; no E2E test | Add Cypress test (ADMIN role): set insurance to "All", change physician selector, verify insurance dropdown still shows "All" |
| GAP-7.3 | Pinned row bypass of all filters simultaneously not tested E2E | Vitest tests pinned row bypass for each dimension; no E2E test | Add Cypress test: add a new row (creates pin), select a measure that does not match the new row, verify new row still visible with pinned badge |
| GAP-7.4 | Filter change clears pinned row badge not tested E2E | Vitest tests the callback wrapper; no E2E test | Add Cypress test: add a row (pinned badge appears), change color filter, verify pinned badge disappears |
| GAP-7.5 | Data refresh preserves filter state not tested E2E | Not automated | Add Cypress test: select measure + color filter, edit a cell (triggers data update), verify filter selections are preserved after update |
| GAP-7.6 | Sort order preserved when filter applied not tested E2E | sorting-filtering.cy.ts tests sort+filter independently but not preserved-order-after-filter-change | Add Cypress test: sort by column, apply color filter, verify filtered rows maintain the active sort order |

---

### REQ-M7-8: Status Bar Filter Display

**User Story:** As a QA engineer, I want the status bar's "Showing X of Y rows" and filter summary verified for all filter combinations, so that users always see accurate row counts and know which filters are active.

#### Acceptance Criteria

1. **AC-M7-8.1:** WHEN any combination of filters is active, THEN the status bar SHALL display "Showing X of Y rows" where X is the number of rows passing all active filters and Y is the total number of rows in the dataset.
2. **AC-M7-8.2:** WHEN a color filter is active, THEN the filter summary SHALL include the active color labels (e.g., "Color: In Progress, Overdue").
3. **AC-M7-8.3:** WHEN a measure filter is active, THEN the filter summary SHALL include the measure name (e.g., "Measure: Diabetic Eye Exam").
4. **AC-M7-8.4:** WHEN an insurance group filter is active (not "All"), THEN the filter summary SHALL include the insurance group (e.g., "Insurance: Hill").
5. **AC-M7-8.5:** WHEN "All" color, "All Measures", and "All" insurance are all selected, THEN no filter summary text SHALL be displayed (only the row count).
6. **AC-M7-8.6:** WHEN a color filter AND a measure filter AND an insurance filter are all active, THEN the filter summary SHALL show all three, separated by pipe delimiters (e.g., "Insurance: Hill | Color: Completed | Measure: AWV").
7. **AC-M7-8.7:** WHEN the user searches by name (search text is active), THEN the status bar row count (X) SHALL reflect the search-narrowed result set, but the search text SHALL NOT appear in the filter summary.

#### Coverage Gap Analysis (REQ-M7-8)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-8.1 | Triple-filter summary (insurance + color + measure) not tested E2E | Vitest tests individual and dual combinations; no E2E for triple | Add Cypress test: set insurance to non-All, select a color chip, select a measure, verify status bar shows all three in filter summary |
| GAP-8.2 | Status bar "Showing 0 of Y rows" with combined filters not tested E2E | Not automated | Add Cypress test: apply filters that yield zero results, verify status bar shows "Showing 0 of Y rows" |
| GAP-8.3 | Row count accuracy after search + color + measure combination not tested E2E | Cypress tests search+status and measure+color separately; no triple combo | Add Cypress test: apply color filter, measure filter, then search, verify status bar X count equals visible grid rows |

---

### REQ-M7-9: Compact Chip Styling

**User Story:** As a QA engineer, I want the compact chip styling (24px height, single-line, no-wrap) verified so that the filter bar is visually correct and does not overflow on standard viewports.

#### Acceptance Criteria

1. **AC-M7-9.1:** WHEN the filter bar renders, THEN each chip SHALL have `white-space: nowrap` so label text never wraps.
2. **AC-M7-9.2:** WHEN the filter bar renders, THEN each chip SHALL have compact padding (`py-0.5 px-2`) and `text-xs` font size.
3. **AC-M7-9.3:** WHEN a chip label contains a space (e.g., "Not Addressed", "In Progress"), THEN it SHALL remain on a single line without truncation.
4. **AC-M7-9.4:** WHEN chips are compact, THEN existing visual treatment SHALL be preserved: checkmark on selected, filled background when selected, bordered when unselected, count in parentheses.
5. **AC-M7-9.5:** WHEN all 10 chips plus dropdowns and search input render on a viewport of 1280px or wider, THEN no elements SHALL overflow or be hidden.

#### Coverage Gap Analysis (REQ-M7-9)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-9.1 | Narrow viewport (below 1280px) wrapping behavior not tested | Not automated at any layer | Add Playwright test: set viewport to 1024px wide, verify all chips and dropdowns are accessible (may wrap but not hidden) |
| GAP-9.2 | All 10 chips fitting on one row at 1280px not tested | Playwright compact-filter-bar.spec.ts exists but only tests styling classes, not layout | Add Playwright test: set viewport to 1280px, verify no horizontal overflow in filter bar |

---

### REQ-M7-10: Keyboard Accessibility

**User Story:** As a QA engineer, I want keyboard navigation and operation of all filter bar controls (chips, dropdowns, search) verified, so that users who navigate by keyboard can use all filtering features without a mouse.

#### Acceptance Criteria

1. **AC-M7-10.1:** WHEN navigating with Tab key, THEN focus SHALL move through chips in order, then to the measure dropdown, then to the insurance group dropdown, then to the search input.
2. **AC-M7-10.2:** WHEN a chip has focus and user presses Enter or Space, THEN the chip SHALL toggle its selected state.
3. **AC-M7-10.3:** WHEN the measure dropdown has focus and user presses Enter or Space, THEN it SHALL open.
4. **AC-M7-10.4:** WHEN the insurance group dropdown has focus and user interacts with arrow keys, THEN it SHALL navigate between options.
5. **AC-M7-10.5:** WHEN the search input is focused and user presses Escape, THEN search text SHALL be cleared and input SHALL blur.
6. **AC-M7-10.6:** All chips SHALL have `aria-pressed` attribute reflecting toggle state.
7. **AC-M7-10.7:** The measure dropdown SHALL have `aria-label="Filter by quality measure"`.
8. **AC-M7-10.8:** The insurance group dropdown SHALL have `aria-label="Filter by insurance group"`.
9. **AC-M7-10.9:** The search input SHALL have `aria-label="Search patients by name"`.
10. **AC-M7-10.10:** The clear search button SHALL have `aria-label="Clear search"`.

#### Coverage Gap Analysis (REQ-M7-10)

| Gap ID | Description | Current State | Proposed Test |
|--------|------------|---------------|---------------|
| GAP-10.1 | Full Tab order through all filter bar controls not tested E2E | Cypress tests chip focus; Vitest tests aria-labels; no full Tab sequence test | Add Playwright test: Tab through entire filter bar, verify focus order: chips -> measure dropdown -> insurance dropdown -> search input |
| GAP-10.2 | Keyboard operation of dropdowns (Enter, Arrow, Escape) not tested E2E | No E2E keyboard-only dropdown test | Add Playwright test: Tab to measure dropdown, press Enter to open, Arrow Down to select, Enter to confirm, verify measure filter applied |

---

## Non-Functional Requirements

### Performance

- **NFR-M7-1:** All Vitest test suites in this module (StatusFilterBar + MainPage filter tests) SHALL complete in under 10 seconds total.
- **NFR-M7-2:** Each individual Cypress E2E test SHALL complete in under 30 seconds (including grid load).
- **NFR-M7-3:** The full Cypress filtering suite SHALL complete in under 10 minutes across all filter-related files.
- **NFR-M7-4:** Filter state changes (chip click, measure selection, search typing) SHALL update the grid within 100ms for datasets up to 5,000 rows (client-side operations; verified by absence of visual delay in E2E tests).

### Reliability

- **NFR-M7-5:** Tests SHALL be deterministic -- no flaky tests due to timing, animation, or data ordering. All Cypress tests SHALL use `cy.waitForAgGrid()` or data-dependent waits, not arbitrary `cy.wait()` delays.
- **NFR-M7-6:** Tests SHALL use unique identifiers or data-driven assertions (e.g., read actual row count from chip, verify grid matches) rather than hardcoded expected counts that may drift with seed data changes.
- **NFR-M7-7:** Insurance group filter tests SHALL handle the asynchronous data fetch (server-side) and wait for the grid to update before making assertions.

### Maintainability

- **NFR-M7-8:** All new test cases SHALL follow existing patterns in their respective test files (e.g., `defaultCounts` fixture in StatusFilterBar.test.tsx, `filterRows()` helper in MainPage.test.tsx, `cy.waitForAgGrid()` in Cypress files).
- **NFR-M7-9:** Combined filter scenario tests SHALL be organized in a dedicated `describe('Combined Filter Scenarios')` block within existing Cypress files rather than creating a new file, unless additions exceed 50 tests.
- **NFR-M7-10:** Test data tables SHALL use parameterized patterns (`forEach`, `it.each`) where more than 3 similar assertions exist.

### Usability

- **NFR-M7-11:** All Cypress E2E tests SHALL be runnable with `--headed` for visual debugging per project conventions.
- **NFR-M7-12:** Test file organization SHALL follow existing naming conventions: `*.test.tsx` for Vitest, `*.cy.ts` for Cypress, `*.spec.ts` for Playwright.

### Security

- **NFR-M7-13:** No security impact. All tests exercise existing filtering behavior on already-fetched data or standard query parameter passing. No new API endpoints or data exposure.

---

## Integration Requirements

- **INT-M7-1:** New Vitest tests for StatusFilterBar behavior SHALL extend `StatusFilterBar.test.tsx` rather than creating a new file.
- **INT-M7-2:** New Vitest tests for filter logic (combined scenarios, measure-scoped counts) SHALL extend `MainPage.test.tsx`.
- **INT-M7-3:** New Cypress tests for combined filter scenarios SHALL be added to a new describe block in `sorting-filtering.cy.ts` or `multi-select-filter.cy.ts` if the additions are fewer than 30 tests. If more, create a new file `combined-filter-scenarios.cy.ts`.
- **INT-M7-4:** New Cypress tests for insurance group gaps SHALL extend `insurance-group-filter.cy.ts`.
- **INT-M7-5:** New Playwright tests for keyboard accessibility and navigation-based filter reset SHALL extend `compact-filter-bar.spec.ts` or be placed in a new `filter-accessibility.spec.ts`.
- **INT-M7-6:** All Cypress tests SHALL use existing custom commands: `cy.login`, `cy.waitForAgGrid`, `cy.addTestRow`, `cy.selectAgGridDropdown`, `cy.getAgGridCell`.
- **INT-M7-7:** All tests SHALL login as admin (`admin@gmail.com` / `welcome100`) unless specifically testing role-based filter behavior (e.g., STAFF physician selector + insurance group interaction).

---

## Assumptions and Constraints

### Assumptions

- **ASM-M7-1:** No production code changes are required for this module. All work is test-only (new tests + updates to existing test files).
- **ASM-M7-2:** The seeded test database contains patients across multiple quality measures, status colors, and insurance groups sufficient to exercise all filter combinations.
- **ASM-M7-3:** All identified coverage gaps are based on file analysis as of the current commit (6e5730a). Gaps may change if tests are added between now and implementation.
- **ASM-M7-4:** Cypress tests require the application to be running locally (`docker-compose up` or `npx vite dev --host` for frontend + backend).
- **ASM-M7-5:** The insurance group filter triggers a server-side re-fetch (`GET /api/data?insuranceGroup=...`), while all other filters (color, measure, search) are client-side on already-loaded data.
- **ASM-M7-6:** The 14 quality measures are: Annual Wellness Visit, Diabetic Eye Exam, Diabetic Nephropathy, Hypertension Management, Diabetes Control, ACE/ARB in DM or CAD, Vaccination, GC/Chlamydia Screening, Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening, Chronic Diagnosis Code, Annual Serum K&Cr, Depression Screening.
- **ASM-M7-7:** Filter state is held in `MainPage` via `useState` hooks: `activeFilters`, `searchText`, `selectedMeasure`, `selectedInsuranceGroup`. These reset on component unmount (navigation away).
- **ASM-M7-8:** The search filtering uses multi-word matching where each space-separated word must be present in the `memberName` (AND logic between words, substring match).

### Constraints

- **CON-M7-1:** AG Grid Community edition does not support native column-level filters. All filtering is implemented as external filtering via `StatusFilterBar` props and `filteredRowData` useMemo in `MainPage`.
- **CON-M7-2:** Insurance group is the only server-side filter; all others (color, measure, search) are client-side.
- **CON-M7-3:** Chip counts are scoped by the selected quality measure but NOT by the active color chips or search text. This is by design so users can see the full distribution within a measure scope.
- **CON-M7-4:** Filter state is not persisted across page refreshes or sessions. This is existing behavior and is not changing.
- **CON-M7-5:** Cypress has known issues with native `<select>` dropdowns for value verification. Tests should use `cy.get('select').should('have.value', 'x')` rather than trying to open the dropdown visually.
- **CON-M7-6:** The `getRowStatusColor()` function is the single source of truth for row color determination, shared between `StatusFilterBar` (for chip counts) and `PatientGrid` (for row CSS classes). Tests should reference this function where applicable.

---

## Edge Cases

- **EDGE-M7-1:** All chips manually selected with a measure filter active: Do NOT auto-switch to "All". All chips show checked. Grid shows all rows for the selected measure (equivalent to "All" but with all chips visually checked).
- **EDGE-M7-2:** Search text containing special regex characters (e.g., parentheses, dots, brackets): The `String.includes()` method used in production is not regex-based, so special characters are treated literally. Tests should verify this.
- **EDGE-M7-3:** Empty memberName (null): Rows with null memberName should be excluded from search results when a search term is active, but included when search is empty.
- **EDGE-M7-4:** Rows with null qualityMeasure: When a specific measure is selected, these rows are excluded. When "All Measures" is active, they are included in counts and filtering.
- **EDGE-M7-5:** Data reload with active filters: When data is refreshed (cell edit, add row, delete row, socket-based refresh), the active filter selections are preserved and re-applied to the updated dataset.
- **EDGE-M7-6:** Rapid measure switching: Quickly changing the measure dropdown multiple times in succession should result in the grid and chip counts reflecting the final selection with no stale state.
- **EDGE-M7-7:** Insurance group filter active during import: If an import completes while a specific insurance group is selected, newly imported patients from a different group will not appear until the user changes the filter.
- **EDGE-M7-8:** Chip with count changing from zero to non-zero after data edit: If a row is edited to a status that previously had zero rows, the chip count should increment and the dashed border should change to normal border styling.
- **EDGE-M7-9:** Pinned row (from add/duplicate) visible despite filter mismatch: A pinned row passes through all filter dimensions until the pin is cleared by user interaction (clicking unpin badge) or changing any filter.
- **EDGE-M7-10:** Filter summary text with multi-color selection: When multiple color chips are selected, the filter summary should list all active colors comma-separated (e.g., "Color: In Progress, Overdue").

---

## Proposed New Test Case Summary

### By Gap Priority

| Priority | Gap IDs | Test Layer | Est. New Tests | Description |
|----------|---------|------------|---------------:|-------------|
| HIGH | GAP-6.1, GAP-6.2, GAP-6.5 | Cypress | 3 | Triple-AND and quadruple combined filter scenarios, filter preservation sequence |
| HIGH | GAP-2.1, GAP-2.2, GAP-2.3 | Cypress | 3 | Chip count accuracy with measure scope, after edit, after add/delete |
| HIGH | GAP-7.1 | Playwright | 1 | Filter state reset on navigation away and back |
| HIGH | GAP-3.1, GAP-3.4 | Cypress | 2 | Insurance + color + search triple AND; chip counts update on insurance change |
| HIGH | GAP-8.1, GAP-8.3 | Cypress | 2 | Triple-filter summary; row count with combined filters |
| MEDIUM | GAP-1.1, GAP-1.2, GAP-1.3 | Cypress | 3 | Combined toggle sequence, rapid clicking, filter persistence after data change |
| MEDIUM | GAP-4.1, GAP-4.2, GAP-4.3, GAP-4.4 | Cypress | 4 | Multi-word search E2E, Ctrl+F guard, whitespace handling, search preserved on filter change |
| MEDIUM | GAP-5.1, GAP-5.2, GAP-5.3 | Cypress | 3 | Per-measure filter validation, Duplicates+measure combo, dropdown option count |
| MEDIUM | GAP-6.3, GAP-6.4 | Cypress | 2 | Full filter summary E2E, empty result combined filters |
| MEDIUM | GAP-7.2, GAP-7.3, GAP-7.4, GAP-7.5 | Cypress | 4 | Physician selector + insurance, pinned row bypass E2E, pin clear on filter, data refresh preserves filters |
| MEDIUM | GAP-2.4 | Cypress | 1 | Zero-count chip click E2E |
| MEDIUM | GAP-3.2, GAP-3.3 | Cypress/Playwright | 2 | "No Insurance" deep verification, API failure fallback E2E |
| LOW | GAP-8.2 | Cypress | 1 | Status bar "0 of Y" with combined filters |
| LOW | GAP-9.1, GAP-9.2 | Playwright | 2 | Narrow viewport wrapping, 1280px no-overflow |
| LOW | GAP-10.1, GAP-10.2 | Playwright | 2 | Full Tab order, keyboard-only dropdown operation |

### Totals

| Layer | Est. New Tests |
|-------|---------------:|
| Vitest (StatusFilterBar.test.tsx) | 0 (current 115 tests provide strong unit coverage) |
| Vitest (MainPage.test.tsx) | 0 (current 68 tests cover filter logic well) |
| Cypress (existing files: sorting-filtering, multi-select-filter, patient-name-search, insurance-group-filter, compact-filter-bar) | ~25 |
| Cypress (new: combined-filter-scenarios.cy.ts) | ~10 |
| Playwright (compact-filter-bar.spec.ts or new filter-accessibility.spec.ts) | ~5 |
| **GRAND TOTAL** | **~40** |

Post-implementation expected totals: ~326 existing + ~40 new = ~366 tests in Module 7 scope.

### Priority Breakdown

| Priority | Tests | Rationale |
|----------|------:|-----------|
| HIGH | 11 | Combined filter scenarios and chip count accuracy are the primary coverage gaps. These test real-world workflows (user applies multiple filters simultaneously) that currently have no E2E coverage. |
| MEDIUM | 19 | Individual filter dimension gaps (multi-word search E2E, per-measure validation, pinned row E2E, filter persistence) provide defense-in-depth for already-unit-tested logic. |
| LOW | 5 | Viewport layout, keyboard-only navigation, and zero-row edge case tests are lower risk but improve accessibility and responsive design confidence. |
