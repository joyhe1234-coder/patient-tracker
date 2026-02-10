# Feature: Compact Filter Bar with Quality Measure Dropdown

## Introduction

Redesign the patient tracker filter bar to use compact chips and add a Quality Measure dropdown filter. The current filter chips are too large (text wraps on multi-word labels like "Not Addressed" and "In Progress", making them approximately 48px tall ovals). The redesign makes chips compact (approximately 24px tall, no text wrapping) and adds a Quality Measure dropdown so users can scope the grid to a single quality measure. No status dropdown is needed because the color chips already represent status categories.

### Alignment with Product Vision

The patient quality measure tracking system replaces an Excel-based workflow for medical offices. Excel supports both AutoFilter (by column values) and conditional formatting (by color). Currently the app has color-chip filtering (analogous to filtering by color) and name search, but lacks the ability to filter by quality measure -- which is the primary organizational axis of the data. Adding a Quality Measure dropdown completes the filtering capability set, letting clinical staff focus on one measure at a time (e.g., "show me all Diabetic Eye Exam patients that are overdue"). Making chips compact improves information density, reducing vertical space consumed by the filter bar and keeping more rows visible on screen.

## Requirements

> **Note:** This feature applies to all authenticated user roles (ADMIN, PHYSICIAN, STAFF). User stories use "user" to refer to any authenticated user.

### Requirement 1: Compact Chip Styling

**ID:** CFB-R1

**User Story:** As a user, I want the status filter chips to be compact and single-line, so that the filter bar takes up less vertical space and I can see more patient rows on screen.

**Acceptance Criteria:**

- CFB-R1-AC1: WHEN the filter bar renders, THEN each chip SHALL have `white-space: nowrap` applied so that chip label text never wraps to a second line.
- CFB-R1-AC2: WHEN the filter bar renders, THEN each chip SHALL have reduced vertical padding and font size such that the chip height is approximately 24px (down from the current approximately 48px).
- CFB-R1-AC3: WHEN a chip label contains a space (e.g., "Not Addressed", "In Progress"), THEN the label SHALL remain on a single line without truncation or ellipsis.
- CFB-R1-AC4: WHEN chips are rendered in the compact style, THEN the existing visual treatment SHALL be preserved: checkmark icon on selected chips, filled background when selected, outlined with reduced opacity when unselected, and count displayed in parentheses.
- CFB-R1-AC5: WHEN chips are rendered in the compact style, THEN all 10 chips (All, Duplicates, Not Addressed, Overdue, In Progress, Contacted, Completed, Declined, Resolved, N/A) SHALL fit on a single row without horizontal overflow on a viewport width of 1280px or wider.

### Requirement 2: Quality Measure Dropdown

**ID:** CFB-R2

**User Story:** As a user, I want a Quality Measure dropdown in the filter bar, so that I can filter the grid to show only patients for a specific quality measure.

**Acceptance Criteria:**

- CFB-R2-AC1: WHEN the filter bar renders, THEN a dropdown labeled "Measure" SHALL appear after the last color chip (N/A), separated from the chips by a vertical divider (1px gray line).
- CFB-R2-AC2: WHEN the dropdown is in its default state, THEN it SHALL display the text "All Measures" indicating no measure filter is applied.
- CFB-R2-AC3: WHEN the user clicks the dropdown, THEN it SHALL display a list of all quality measures populated from the existing configuration data (the same quality measures available in the grid's Quality Measure column).
- CFB-R2-AC4: WHEN the dropdown list is displayed, THEN the quality measures SHALL appear in their configured sort order, with "All Measures" as the first option.
- CFB-R2-AC5: WHEN the user selects a specific quality measure from the dropdown, THEN the grid SHALL filter to show only rows where the `qualityMeasure` field matches the selected value.
- CFB-R2-AC6: WHEN a specific quality measure is selected, THEN the dropdown SHALL display a blue border highlight (ring-2 ring-blue-500 or equivalent) to visually indicate an active measure filter.
- CFB-R2-AC7: WHEN the user selects "All Measures" from the dropdown, THEN the measure filter SHALL be cleared and all rows SHALL be shown (subject to other active filters).
- CFB-R2-AC8: WHEN "All Measures" is selected (default state), THEN the dropdown SHALL NOT have the blue border highlight.

### Requirement 3: Combined Filter Logic

**ID:** CFB-R3

**User Story:** As a user, I want the color chips, measure dropdown, and name search to work together with AND logic, so that I can precisely narrow down the patient list using multiple criteria simultaneously.

**Acceptance Criteria:**

- CFB-R3-AC1: WHEN multiple filter types are active (color chips, measure dropdown, and/or name search), THEN the grid SHALL show only rows matching ALL active filters simultaneously (AND logic).
- CFB-R3-AC2: WHEN a color chip filter AND a measure filter are both active, THEN a row SHALL appear only if its status color matches a selected chip AND its qualityMeasure matches the selected measure.
- CFB-R3-AC3: WHEN a color chip filter AND a measure filter AND a name search are all active, THEN a row SHALL appear only if it matches all three criteria.
- CFB-R3-AC4: WHEN the Duplicates chip is selected AND a measure filter is active, THEN the grid SHALL show only rows that are duplicates AND match the selected quality measure.
- CFB-R3-AC5: WHEN color chips use OR logic between selected chips (existing behavior), THEN the combined filter SHALL be: `(colorA OR colorB) AND measureMatch AND searchMatch`.
- CFB-R3-AC6: WHEN the user changes one filter dimension (e.g., selects a measure), THEN the other filter dimensions (e.g., selected color chips, search text) SHALL be preserved and the combined filter re-applied.

### Requirement 4: Chip Count Scoping by Measure

**ID:** CFB-R4

**User Story:** As a user, I want the chip counts to reflect the selected quality measure, so that I can see how many patients in that measure fall into each status category.

**Acceptance Criteria:**

- CFB-R4-AC1: WHEN "All Measures" is selected (default), THEN chip counts SHALL reflect the full dataset (current behavior unchanged).
- CFB-R4-AC2: WHEN a specific quality measure is selected, THEN each chip count SHALL be recalculated to reflect only rows matching that measure.
- CFB-R4-AC3: WHEN a specific quality measure is selected, THEN the "All" chip count SHALL show the total number of rows for that measure (not the overall total).
- CFB-R4-AC4: WHEN a specific quality measure is selected, THEN the "Duplicates" chip count SHALL show the number of duplicate rows for that measure only.
- CFB-R4-AC5: WHEN a chip has a count of zero (because no rows for the selected measure have that status color), THEN the chip SHALL be displayed at reduced opacity (30%) but SHALL remain clickable.
- CFB-R4-AC6: WHEN a zero-count chip is clicked, THEN it SHALL become selected (with normal active styling) and the grid SHALL show zero rows (empty state).
- CFB-R4-AC7: WHEN chip counts are scoped to a measure, THEN the counts SHALL NOT be further affected by the name search text (counts reflect the measure-scoped dataset, not the search-filtered dataset).

### Requirement 5: Status Bar Updates

**ID:** CFB-R5

**User Story:** As a user, I want the status bar to accurately reflect my combined filter state, so that I always know how many patients match my current view and which filters are active.

**Acceptance Criteria:**

- CFB-R5-AC1: WHEN any combination of filters is active, THEN the status bar SHALL display "Showing X of Y rows" where X is the number of rows passing all active filters and Y is the total number of rows in the dataset.
- CFB-R5-AC2: WHEN a color filter is active, THEN the status bar SHALL include the active color labels in a filter summary (e.g., "Color: In Progress, Overdue").
- CFB-R5-AC3: WHEN a measure filter is active, THEN the status bar SHALL include the measure name in the filter summary (e.g., "Measure: Diabetic Eye Exam").
- CFB-R5-AC4: WHEN both a color filter and a measure filter are active, THEN the filter summary SHALL show both, separated by a pipe or similar delimiter (e.g., "Color: In Progress | Measure: Diabetic Eye Exam").
- CFB-R5-AC5: WHEN "All" is the active color filter and "All Measures" is the active measure filter, THEN no filter summary text SHALL be displayed (only the row count).

### Requirement 6: Quality Measure Data Source

**ID:** CFB-R6

**User Story:** As a user, I want the measure dropdown to always show the correct list of quality measures, so that I can filter by any measure that exists in the system.

**Acceptance Criteria:**

- CFB-R6-AC1: WHEN the filter bar initializes, THEN the dropdown SHALL be populated with quality measures from the existing configuration data source (the same data used to populate the Quality Measure column dropdown in the grid).
- CFB-R6-AC2: WHEN the configuration data includes 13 quality measures, THEN the dropdown SHALL list all 13 measures plus the "All Measures" option (14 total options).
- CFB-R6-AC3: WHEN the dropdown is populated, THEN quality measures SHALL be listed in their configured sort order (matching the order in the `config_quality_measures` table).
- CFB-R6-AC4: WHEN the dropdown is populated, THEN each option SHALL display the quality measure label (e.g., "Annual Wellness Visit", "Diabetic Eye Exam") not the code.

### Requirement 7: Keyboard Accessibility

**ID:** CFB-R7

**User Story:** As a user who navigates by keyboard, I want to operate the measure dropdown and compact chips using keyboard controls, so that I can use filtering without a mouse.

**Acceptance Criteria:**

- CFB-R7-AC1: WHEN navigating with Tab key, THEN focus SHALL move through the chips in order and then to the measure dropdown, and then to the search input.
- CFB-R7-AC2: WHEN the measure dropdown has focus and the user presses Enter or Space, THEN the dropdown SHALL open.
- CFB-R7-AC3: WHEN the dropdown is open and the user presses Arrow Up/Down, THEN the highlight SHALL move between options.
- CFB-R7-AC4: WHEN the dropdown is open and the user presses Enter on a highlighted option, THEN that option SHALL be selected and the dropdown SHALL close.
- CFB-R7-AC5: WHEN the dropdown is open and the user presses Escape, THEN the dropdown SHALL close without changing the selection.
- CFB-R7-AC6: WHEN a chip has focus and user presses Enter or Space, THEN the chip SHALL toggle its selected state (existing behavior preserved).
- CFB-R7-AC7: The measure dropdown SHALL have an appropriate `aria-label` ("Filter by quality measure").

### Requirement 8: Row Color Accuracy and Chip Count Integrity

**ID:** CFB-R8

**User Story:** As a user, I want each patient row's color to accurately reflect its quality status (and overdue state), and I want the filter chip counts to exactly match the number of rows displayed in each color, so that I can trust the filter bar as a reliable summary of the data.

**Acceptance Criteria:**

#### Status-to-Color Mapping Completeness

- CFB-R8-AC1: WHEN a row has a `measureStatus` value from the `QUALITY_MEASURE_TO_STATUS` configuration, THEN `getRowStatusColor` SHALL return a deterministic color for that status (never fall through to white/default unexpectedly). Every configured status string SHALL map to exactly one color category.
- CFB-R8-AC2: WHEN a row has a `measureStatus` value of "Not Addressed" or an empty/null value, THEN `getRowStatusColor` SHALL return `white`.

#### Overdue (Red) Priority Rules

- CFB-R8-AC3: WHEN a row has a past `dueDate`, THEN overdue (red) SHALL take priority over the status-based color, EXCEPT for the following exemptions:
  - Declined statuses (purple): "Patient declined AWV", "Patient declined", "Patient declined screening", "Declined BP control", "Contraindicated" — these SHALL remain purple even when overdue.
  - N/A statuses (gray): "No longer applicable", "Screening unnecessary" — these SHALL remain gray even when overdue.
  - Chronic DX with "Attestation sent" in tracking1: "Chronic diagnosis resolved" or "Chronic diagnosis invalid" with tracking1="Attestation sent" — these SHALL remain green even when overdue.
- CFB-R8-AC4: WHEN a row has a green status (e.g., "AWV completed", "Blood pressure at goal") AND a past `dueDate`, THEN the row SHALL display as red (overdue). Completed statuses are NOT exempt from overdue — an overdue completed status indicates the measure needs to be redone for a new cycle.
- CFB-R8-AC5: WHEN a row has a blue status (e.g., "AWV scheduled", "Scheduled call back - BP not at goal", "Scheduled call back - BP at goal") AND a past `dueDate`, THEN the row SHALL display as red (overdue).
- CFB-R8-AC6: WHEN a row has a yellow status (e.g., "Patient called to schedule AWV") AND a past `dueDate`, THEN the row SHALL display as red (overdue).
- CFB-R8-AC7: WHEN a row has an orange status (e.g., "Chronic diagnosis resolved" without attestation sent) AND a past `dueDate`, THEN the row SHALL display as red (overdue).

#### Attestation Edge Cases (Chronic Diagnosis Code)

- CFB-R8-AC8: WHEN `measureStatus` is "Chronic diagnosis resolved" or "Chronic diagnosis invalid" AND `tracking1` is "Attestation sent", THEN the row SHALL display as green regardless of `dueDate`.
- CFB-R8-AC9: WHEN `measureStatus` is "Chronic diagnosis resolved" or "Chronic diagnosis invalid" AND `tracking1` is "Attestation not sent" (or null), THEN the row SHALL display as orange when not overdue, or red when overdue.

#### Blood Pressure Edge Cases (Hypertension Management)

- CFB-R8-AC10: WHEN `measureStatus` is "Blood pressure at goal", THEN the row SHALL display as green (no dueDate) or red (past dueDate).
- CFB-R8-AC11: WHEN `measureStatus` is "Scheduled call back - BP not at goal" or "Scheduled call back - BP at goal", THEN the row SHALL display as blue (no/future dueDate) or red (past dueDate). Note: "BP at goal" in this context means the patient's BP reading was at goal during a callback, but the case remains open (blue/in-progress), not to be confused with the completed status "Blood pressure at goal" (green).
- CFB-R8-AC12: WHEN `measureStatus` is "Declined BP control", THEN the row SHALL display as purple regardless of `dueDate` (exempt from overdue).

#### Chip Count Accuracy

- CFB-R8-AC13: WHEN a row is overdue (displays as red), THEN the chip count logic SHALL count that row under the `red` chip, NOT under its "natural" status color (e.g., a row with "AWV completed" + past dueDate SHALL be counted as red, not green).
- CFB-R8-AC14: WHEN a row is both a duplicate AND overdue, THEN the chip count logic SHALL count that row under BOTH the `duplicate` chip AND the `red` chip. The `duplicate` count is additive (reflects the isDuplicate flag independently of color).
- CFB-R8-AC15: WHEN the "All" chip displays a total count, THEN that count SHALL equal the sum of all status color counts (white + yellow + blue + green + purple + orange + gray + red), excluding the duplicate count to avoid double-counting (since duplicates are a subset of rows already counted in a status color).

#### Cross-System Consistency

- CFB-R8-AC16: The color returned by `getRowStatusColor()` in StatusFilterBar.tsx SHALL match the CSS class applied by `rowClassRules` in PatientGrid.tsx for all possible row states. Both systems use the same status-to-color arrays and the same overdue/attestation logic.

#### Boundary Date Handling

- CFB-R8-AC17: WHEN `dueDate` equals today's date (UTC midnight), THEN the row SHALL NOT be considered overdue (overdue requires dueDate strictly before today).
- CFB-R8-AC18: WHEN `dueDate` is null, THEN the row SHALL NOT be considered overdue regardless of status.

## Non-Functional Requirements

### Performance

- NFR-P1: Filter state changes (chip click, measure selection, search typing) SHALL update the grid within 100ms for datasets up to 5,000 rows.
- NFR-P2: Chip count recalculation when a measure is selected SHALL complete within 50ms for datasets up to 5,000 rows.
- NFR-P3: The measure dropdown SHALL NOT trigger any additional API calls. It SHALL use configuration data already loaded by the application (the same config data used for grid column dropdowns).
- NFR-P4: All filtering SHALL remain client-side on already-fetched data. No network requests SHALL be made when filter state changes.

### Usability

- NFR-U1: The compact chip design SHALL maintain sufficient touch target size for mouse and touchpad interaction (minimum 24px height, minimum 44px width per chip).
- NFR-U2: The vertical divider between chips and dropdown SHALL provide clear visual separation between the two filter mechanisms.
- NFR-U3: The transition from current to compact chips SHALL feel natural to existing users -- the same chip order, colors, labels, and interaction patterns are preserved.
- NFR-U4: The measure dropdown SHALL use native select element or a lightweight custom dropdown consistent with the application's existing Tailwind CSS styling.

### Reliability

- NFR-R1: Filter state SHALL always be valid -- the "All" fallback behavior when no chips are selected SHALL continue to work with the measure filter present.
- NFR-R2: The measure dropdown SHALL gracefully handle the case where configuration data has not yet loaded (show "All Measures" only until data arrives).
- NFR-R3: Filter state SHALL be preserved across data refreshes (cell edits, add row, delete row, duplicate row) -- both color chip selections and measure dropdown selection SHALL persist.

### Security

- NFR-S1: No security impact. The quality measure dropdown uses the same configuration data already fetched for the grid column dropdowns. No new API endpoints or data exposure are introduced.

### Accessibility

- NFR-A1: All chips SHALL maintain proper `aria-pressed` attribute reflecting their toggle state (existing behavior preserved).
- NFR-A2: The measure dropdown SHALL have an `aria-label` of "Filter by quality measure".
- NFR-A3: Color SHALL NOT be the only indicator of chip selection state (checkmark icon provides non-color signal -- existing behavior preserved).
- NFR-A4: Zero-count chips at 30% opacity SHALL still be perceivable (text must meet WCAG 2.1 AA contrast ratio of 4.5:1 against the background when at 30% opacity, or use a higher minimum opacity if needed).

## Edge Cases

### EC-1: Measure selected with no matching rows for a status color
**Scenario:** User selects "Annual Wellness Visit" measure, and there are no rows with "Declined" status for that measure.
**Expected:** The "Declined" chip shows count (0), displays at 30% opacity, remains clickable. Clicking it selects the chip (active styling), grid shows zero rows with empty state.

### EC-2: Measure filter active when data changes via cell edit
**Scenario:** User has "Diabetic Eye Exam" measure selected. They edit a row's quality measure from "Diabetic Eye Exam" to "Annual Wellness Visit".
**Expected:** The edited row disappears from the filtered view (no longer matches measure filter). All chip counts recalculate for the "Diabetic Eye Exam" scope. Status bar updates count.

### EC-3: Measure filter active when new row is added
**Scenario:** User has "Vaccination" measure selected. They add a new patient row (which starts with null requestType and null qualityMeasure).
**Expected:** The new row does NOT appear in the filtered view (null qualityMeasure does not match "Vaccination"). If user switches to "All Measures", the new row becomes visible.

### EC-4: Duplicates chip with measure filter
**Scenario:** User selects "Duplicates" chip and then selects "Colon Cancer Screening" measure.
**Expected:** Grid shows only rows that are both marked as duplicate AND have qualityMeasure = "Colon Cancer Screening". If no duplicates exist for that measure, grid shows empty state.

### EC-5: All chips manually selected with measure filter
**Scenario:** User selects every individual color chip (Not Addressed + Overdue + In Progress + Contacted + Completed + Declined + Resolved + N/A) while a measure filter is active.
**Expected:** Do NOT auto-switch to "All". All chips show checked. Grid shows all rows for the selected measure (equivalent to "All" but with all chips visually checked). This preserves existing multi-select behavior.

### EC-6: Name search with measure filter yielding zero results
**Scenario:** User has "Breast Cancer Screening" measure selected and types "xyz123" in the search box.
**Expected:** Grid shows zero rows (empty state). Chip counts still reflect the "Breast Cancer Screening" scope (not affected by search text). Status bar shows "Showing 0 of Y rows".

### EC-7: Data reload with active measure filter
**Scenario:** Data is refreshed (e.g., after cell edit triggers re-fetch or after add/delete row). Measure dropdown is set to "Hypertension Management".
**Expected:** The measure dropdown selection persists. Chip counts are recalculated from the fresh data scoped to "Hypertension Management". Grid re-filters with the same measure + color + search state.

### EC-8: Rows with null qualityMeasure
**Scenario:** Some rows have null qualityMeasure (e.g., newly added rows where the user has not yet selected a measure).
**Expected:** When "All Measures" is selected, these rows appear normally. When a specific measure is selected, these rows are excluded from the filtered view. These rows are included in chip counts only when "All Measures" is active.

### EC-9: Narrow viewport (below 1280px)
**Scenario:** User views the application on a screen narrower than 1280px.
**Expected:** The filter bar SHALL remain functional. Chips and dropdown MAY wrap to a second line if needed, but no elements SHALL be hidden or inaccessible. The vertical divider between chips and dropdown SHALL remain visible as a separator.

### EC-10: Filter bar state on page load
**Scenario:** User navigates to the main page.
**Expected:** The "All" chip is selected (existing default), "All Measures" is selected in the dropdown (default), and the search input is empty. No filter summary in status bar.

### EC-11: Rapid measure switching
**Scenario:** User quickly changes the measure dropdown selection multiple times in succession.
**Expected:** The grid and chip counts SHALL reflect the final selection. No stale intermediate state SHALL be visible. No race conditions or flicker.

## Assumptions and Constraints

### Assumptions

- ASM-1: The existing configuration data fetch (used for grid column dropdowns) loads all quality measures on page initialization. The measure dropdown will reuse this data rather than making a separate API call.
- ASM-2: The `qualityMeasure` field on each `GridRow` contains the quality measure label string (e.g., "Diabetic Eye Exam"), not a numeric ID. Filtering uses exact string matching against this field.
- ASM-3: The 13 quality measures are: Annual Wellness Visit, Diabetic Eye Exam, Diabetic Nephropathy, Hypertension Management, Diabetes Control, ACE/ARB in DM or CAD, Vaccination, GC/Chlamydia Screening, Breast Cancer Screening, Colon Cancer Screening, Cervical Cancer Screening, Chronic Diagnosis Code, Annual Serum K&Cr.
- ASM-4: The dropdown will use the quality measure labels from `dropdownConfig.ts` (client-side static data) or from the `/api/config/all` response, whichever is already available in the component tree.

### Constraints

- CON-1: The compact chip redesign must not change chip interaction behavior (multi-select toggle, Duplicates exclusivity, All fallback). Only visual sizing changes.
- CON-2: The measure dropdown filter is purely client-side. No backend changes are required.
- CON-3: The status-to-color mapping arrays exist in BOTH `PatientGrid.tsx` (rowClassRules) and `StatusFilterBar.tsx` (`getRowStatusColor`). This feature does not consolidate them but must not introduce inconsistency.
- CON-4: The measure dropdown must work with the existing `StatusFilterBar` component props interface, extended as needed.
- CON-5: Filter state is not persisted across page refreshes or sessions (consistent with existing chip and search behavior).

## Dependencies

### Depends On (Existing, Completed)
- **Multi-Select Status Filter** -- multi-select chip toggle behavior (completed, `.claude/specs/multi-select-filter/`)
- **Patient Name Search** -- search AND logic with filters (completed, `.claude/specs/patient-name-search/`)
- **Cascading Dropdown Configuration** -- quality measure list data (completed, `frontend/src/config/dropdownConfig.ts`)
- **Row Color System** -- `getRowStatusColor()` function for chip count calculation (completed, `StatusFilterBar.tsx`)

### Blocks
- None identified. This feature is a standalone UI enhancement.

## Integration Points

### Frontend Components Affected
| Component | File | Change Type |
|-----------|------|-------------|
| StatusFilterBar | `frontend/src/components/layout/StatusFilterBar.tsx` | Modify: compact chip CSS, add measure dropdown, update props interface |
| MainPage | `frontend/src/pages/MainPage.tsx` | Modify: add `selectedMeasure` state, update `filteredRowData` and `rowCounts` memos, pass new props to StatusFilterBar and StatusBar |
| StatusBar | `frontend/src/components/layout/StatusBar.tsx` | Modify: accept and display filter summary text |

### Backend
- No backend changes required. All filtering is client-side.

### Existing API Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| GET /api/config/all | Provides quality measure list (already fetched for grid dropdowns) |
| GET /api/data | Provides patient rows with `qualityMeasure` field (already fetched) |

## Technical Notes

### Quality Measure Values
The 13 quality measures (from `dropdownConfig.ts` and `config_quality_measures` table):

| Quality Measure | Request Type |
|----------------|--------------|
| Annual Wellness Visit | AWV |
| Chronic Diagnosis Code | Chronic DX |
| Diabetic Eye Exam | Quality |
| GC/Chlamydia Screening | Quality |
| Diabetic Nephropathy | Quality |
| Hypertension Management | Quality |
| ACE/ARB in DM or CAD | Quality |
| Vaccination | Quality |
| Diabetes Control | Quality |
| Annual Serum K&Cr | Quality |
| Breast Cancer Screening | Screening |
| Colon Cancer Screening | Screening |
| Cervical Cancer Screening | Screening |

### Filter Evaluation Order
The combined filter in `filteredRowData` should evaluate in this order:
1. Measure filter: `row.qualityMeasure === selectedMeasure` (skip if "All Measures")
2. Color filter: `activeFilters.includes(getRowStatusColor(row))` (skip if "All")
3. Name search: `row.memberName.includes(searchText)` (skip if empty)

All three are AND-combined. Color chips within a selection use OR logic.

### Chip Count Calculation
Current `rowCounts` memo iterates all `rowData`. With measure scoping:
- When measure is selected: iterate only rows where `row.qualityMeasure === selectedMeasure`
- When "All Measures": iterate all rows (current behavior)
- Search text does NOT affect chip counts (existing behavior, extended to measure-scoped counts)

---

## Bug Log (CFB-R8 Testing)

Bugs discovered and fixed during CFB-R8 row-color / chip-count validation testing.

### BUG-CFB-001: "All" chip count double-counts duplicate rows (FIXED)

**Severity:** Medium
**Found during:** Visual browser review (Task 17)
**Related AC:** CFB-R8-AC15

**Description:** The "All" chip's total count included the `duplicate` key from `rowCounts`, causing duplicates to be double-counted (once under their status color, once under `duplicate`). For example, with 95 color-counted rows and 5 duplicates, the "All" chip showed 100 instead of 95.

**Root cause:** `totalRows` computation summed all `rowCounts` entries except `'all'`, but did not exclude `'duplicate'`. Since duplicates are already counted in their respective color category (a duplicate green row is counted in `green`), including `duplicate` inflated the total.

**Fix:** Added `key !== 'duplicate'` to the filter in `StatusFilterBar.tsx`:
```typescript
const totalRows = useMemo(() => {
  return Object.entries(rowCounts)
    .filter(([key]) => key !== 'all' && key !== 'duplicate')
    .reduce((sum, [, count]) => sum + count, 0);
}, [rowCounts]);
```

**Verified by:** CFB-R8 Group F tests (chip counting accuracy), Vitest pass.

---

### BUG-CFB-002: Zero-count chips nearly invisible at opacity-30 (FIXED)

**Severity:** Low (Accessibility / WCAG)
**Found during:** Visual browser review (Task 17)
**Related AC:** NFR-A4

**Description:** Chips with zero matching rows rendered at `opacity-30`, making them nearly invisible against the gray filter bar background. While not a functional bug, it reduced discoverability and could fail WCAG 2.1 AA contrast requirements.

**Root cause:** The original opacity value of 0.30 was too low for the gray-on-gray color combination.

**Fix:** Raised zero-count chip opacity from `opacity-30` to `opacity-50` in `StatusFilterBar.tsx`, matching the same opacity used for non-zero inactive chips.

**Verified by:** Updated Vitest assertions, visual browser review confirmation.

---

### BUG-CFB-003: Test helper timezone boundary issue (FIXED — test-only)

**Severity:** Low (test infrastructure only, NOT a production bug)
**Found during:** CFB-R8 Group E boundary date tests
**Related AC:** CFB-R8-AC17

**Description:** The `getPastDate(1)` test helper created "yesterday" dates by subtracting from local time, then converting to ISO string. In timezones behind UTC (e.g., PST/UTC-8), a local date of Feb 8 at 10 PM would produce an ISO string with UTC date Feb 9. The production code's comparison of UTC due-date against local "today" (also Feb 9 in this scenario) would then see them as equal — not overdue — causing the "yesterday should be overdue" test to fail intermittently.

**Root cause:** Test helper used `new Date()` (local time) for date arithmetic but the ISO string encodes UTC time. The production code compares `dueDate.getUTCFullYear/Month/Date()` against `today.getFullYear/Month/Date()` (local), which is correct for date-only strings stored as UTC midnight, but test-generated dates with non-midnight UTC times could straddle the date boundary.

**Fix:** Changed both old and new test helpers to construct dates at UTC midnight relative to the local "today":
```typescript
const getPastDate = (daysAgo: number): string => {
  const d = new Date();
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  utc.setUTCDate(utc.getUTCDate() - daysAgo);
  return utc.toISOString();
};
```

**Note:** This is NOT a production bug. In production, due dates are stored as date-only strings (e.g., "2026-02-08") which `new Date()` parses as UTC midnight, so the UTC-vs-local comparison always works correctly.

**Verified by:** CFB-R8 Group E boundary tests pass consistently.

---

### No Further Bugs Found

All 181 StatusFilterBar tests pass, including:
- **Group A:** 49 status-to-color mapping tests (46 `it.each` + 3 edge cases) — all mappings correct
- **Group B:** 8 BP edge case tests — all BP statuses map to correct colors with overdue interactions
- **Group C:** 7 representative color + overdue tests — overdue priority correctly applies
- **Group D:** 12 Chronic DX attestation matrix tests — attestation sent correctly exempts from overdue
- **Group E:** 5 boundary date tests — today/yesterday/tomorrow/null all handled correctly
- **Group F:** 6 chip counting accuracy tests — counts are accurate including overdue+duplicate combos
- **Group G:** 24 cross-system consistency tests — `getRowStatusColor()` output matches PatientGrid `rowClassRules` logic for all representative rows

**Conclusion:** The `getRowStatusColor()` function correctly implements all ~80 status-to-color mappings, overdue priority rules, attestation exemptions, BP edge cases, and boundary date handling as specified in CFB-R8. The chip counting logic accurately reflects row colors. No inconsistencies found between StatusFilterBar and PatientGrid color systems.
