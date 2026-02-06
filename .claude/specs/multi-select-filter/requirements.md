# Feature: Multi-Select Status Filter

## Introduction

Redesign the StatusFilterBar from single-select to multi-select behavior, allowing users to filter the patient grid by multiple status colors simultaneously. This enhances filtering flexibility, letting users view combinations like "all Completed + In Progress rows" in one view.

### Alignment with Product Vision

The patient quality measure tracking system replaces an Excel-based workflow. Excel allows multi-criteria filtering natively. Multi-select filtering brings the app closer to the Excel experience that clinical staff are familiar with, reducing friction and improving workflow efficiency.

## Requirements

> **Note:** This feature applies to all authenticated user roles (ADMIN, PHYSICIAN, STAFF). User stories use "user" to refer to any authenticated user.

### Requirement 1: Multi-Select Toggle Behavior

**User Story:** As a user, I want to select multiple status filter chips simultaneously, so that I can view patients across several status categories at once.

**Acceptance Criteria:**

- AC-1.1: WHEN user clicks an unselected status chip, THEN it is added to the active filters (toggled ON) without deselecting other active chips.
- AC-1.2: WHEN user clicks an already-selected status chip, THEN it is removed from the active filters (toggled OFF) without affecting other active chips.
- AC-1.3: WHEN the last individual status color chip is toggled OFF (and "Duplicates" is not active), THEN the "All" chip automatically becomes active (preventing zero-selection state).
- AC-1.4: WHEN user clicks the "All" chip, THEN all individual filter selections are cleared and "All" becomes the only active filter.
- AC-1.5: WHEN "All" is active and user clicks any individual chip, THEN "All" is deselected and only the clicked chip becomes active.
- AC-1.6: WHEN multiple chips are active, THEN the grid shows all rows matching ANY of the selected status colors (OR logic).

### Requirement 2: Checkmark + Fill Visual Style

**User Story:** As a user, I want the filter chips to clearly indicate which filters are active, so that I can quickly see my current filter state at a glance.

**Acceptance Criteria:**

- AC-2.1: WHEN a chip is selected, THEN it displays with a filled/solid background and a checkmark icon as the leading element.
- AC-2.2: WHEN a chip is unselected, THEN it displays with an outlined/bordered style and reduced opacity (no checkmark).
- AC-2.3: WHEN multiple chips are selected, THEN all selected chips show the checkmark + filled style simultaneously.
- AC-2.4: WHEN the "All" chip is active or inactive, THEN it uses the same visual treatment as other chips (checkmark + fill when active, outlined when inactive).
- AC-2.5: WHEN a chip is selected, THEN its filled background color matches its status color identity (e.g., green chip has green fill, blue chip has blue fill).
- AC-2.6: WHEN hovering over an unselected chip, THEN it shows a subtle hover effect (increased opacity or light background).

### Requirement 3: Duplicates Filter Exclusivity

**User Story:** As a user, I want the Duplicates filter to work independently from status color filters, so that I can either view duplicates OR filter by status color, but not confuse the two concepts.

**Acceptance Criteria:**

- AC-3.1: WHEN user selects the "Duplicates" chip, THEN all status color chips are deselected and only duplicates are shown.
- AC-3.2: WHEN user selects any status color chip while "Duplicates" is active, THEN "Duplicates" is deselected and the color filter becomes active.
- AC-3.3: WHEN the "Duplicates" chip is active, THEN it uses the same checkmark + fill visual treatment as other chips.
- AC-3.4: WHEN user selects "Duplicates" while "All" is active (or vice versa), THEN they are mutually exclusive (selecting one deselects the other).

### Requirement 4: Status Bar and Chip Count Behavior

**User Story:** As a user, I want the row counts and status bar to accurately reflect my multi-select filter state, so that I always know how many patients match my current view.

**Acceptance Criteria:**

- AC-4.1: WHEN multiple filters are active, THEN the status bar shows "Showing X of Y rows" where X is the combined count of rows matching any selected filter.
- AC-4.2: WHEN any combination of filters is active or inactive, THEN the count displayed on each chip always reflects the total rows for that status color from the full dataset (not affected by active filters).
- AC-4.3: WHEN search text is active alongside multi-select filters, THEN both filters apply with AND logic (row must match a selected status AND the search text).

### Requirement 5: Keyboard Accessibility

**User Story:** As a user who navigates by keyboard, I want to toggle filter chips using keyboard controls, so that I can use the multi-select filter without a mouse.

**Acceptance Criteria:**

- AC-5.1: WHEN a chip has focus and user presses Enter or Space, THEN the chip toggles its selected state (same as clicking).
- AC-5.2: WHEN navigating with Tab key, THEN focus moves through chips in order.
- AC-5.3: WHEN a chip's toggle state changes, THEN its `aria-pressed` attribute is updated to reflect the current state (`true` when selected, `false` when not).

## Non-Functional Requirements

### Performance
- Filter state changes should update the grid within 100ms (same as current single-select performance).
- No additional API calls needed - filtering remains client-side.

### Usability
- The checkmark + fill visual pattern should make multi-select capability immediately obvious without instruction.
- Transition from single-select to multi-select should feel natural to existing users.

### Reliability
- Filter state must always be valid (no zero-selection state possible due to AC-1.3 fallback to "All").
- Filter state is computed client-side from in-memory data; no network dependency for filter operations.

### Security
- No security impact: filtering is purely client-side UI behavior on already-fetched data. No additional API calls or data exposure.

### Accessibility
- All chips must maintain proper `aria-pressed` attribute reflecting their toggle state.
- Color is not the only indicator of selection state (checkmark icon provides non-color signal).

## Edge Cases

- **All chips manually selected**: If user selects every individual color chip, do NOT auto-switch to "All" - let user see all chips checked. Only "All" chip click resets.
- **Name search + multi-filter**: Both apply simultaneously. Search narrows within the multi-filter result set.
- **Empty results**: If the combination of selected filters yields zero rows, show the empty grid state (same as today).
- **Single chip selected**: Behavior appears identical to the old single-select mode (backwards compatible UX).
- **Data reload with active filters**: When data is refreshed (e.g., after cell edit, add row, delete row), the active filter selection is preserved and re-applied to the updated dataset.
- **Row status changes during filtering**: If an edit causes a row's status color to change (e.g., green → red), and that new color is not in the active filters, the row disappears from the filtered view. This is expected behavior consistent with current single-select filtering.

## Dependencies

- Patient Name Search feature (completed) - search + filter AND logic
- StatusFilterBar component (existing)
- MainPage filteredRowData useMemo (existing - already supports multi-select arrays)
